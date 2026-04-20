# Pipeline Joyería

> Para: Unistyles (Curaçao) — **82 productos** (aretes, cadenas, anillos, pulseras, topos, candongas, sets)

**Última actualización:** 2026-04-20
**Estado:** Implementado (MVP) — commit 4 del ciclo. Matriz de sub-tipos en `src/lib/pipelines/jewelry.ts`, página orquesta los módulos desde el cliente. Upscale Real-ESRGAN 2x siempre (obligatorio para detalle de joyería). Foto en modelo + video son opcionales.
**Ruta API:** No tiene ruta propia — la página llama a `/api/bg-remove`, `/api/upscale`, `/api/bg-generate`, `/api/model-create`, `/api/jewelry-tryon`, `/api/video` directamente.
**Página UI:** `/pipelines/jewelry`

---

## Qué hace

Toma una foto de una pieza de joyería (aislada o con fondo raw del taller/estudio casero) y produce un set completo de catálogo para e-commerce:

1. **Foto "estante"** — pieza sobre fondo lujoso (terciopelo, mármol, cuero, seda) apropiado al sub-tipo.
2. **Foto "en modelo"** — pieza colocada en la parte correcta del cuerpo de una modelo IA (orejas para aretes, cuello para cadenas, etc.).
3. **Foto "detalle"** — crop 1:1 cerrado para zoom en e-commerce.
4. **Video "producto"** — Ken Burns 360° sobre la foto de estante, 5s, 1:1.

Todo esto por SKU, con auto-detección del sub-tipo desde el folder de origen.

---

## Sub-tipos soportados

El pipeline rutea según `subType` detectado del folder o por Claude Vision:

| subType | Inventory folder | Modelo IA muestra | jewelry-tryon posición |
|---|---|---|---|
| `earrings` | `Accesorrios/CATALOGADOS/Aretes/` | Modelo frontal mostrando orejas | Orejas |
| `studs` (topos) | Aretes subset | Modelo frontal close-up | Orejas (ajuste close-up) |
| `hoops` (candongas) | Aretes subset | Modelo frontal/lateral | Orejas |
| `necklace` (cadenas) | `Accesorrios/CATALOGADOS/Collares/` | Modelo frontal busto mostrando cuello | Cuello |
| `ring` | `Accesorrios/CATALOGADOS/Anillos/` | Mano de modelo en pose elegante | Dedo |
| `bracelet` | `Accesorrios/CATALOGADOS/Pulseras/` | Muñeca de modelo | Muñeca |
| `set` | `Accesorrios/CATALOGADOS/Sets/` | Modelo torso mostrando combo (cadena + aretes) | Cuello + orejas |

---

## Flow técnico (7 steps)

```
FOTO ORIGINAL (joyería sobre fondo variable)
         |
         v
[PASO 0] /api/upload → URL pública
         |
         v
[PASO 1] /api/analyze-image (o folder path)
  Detecta: subType, material (dorado/plateado/acero), hasStones, dominantColor
         |
         v
[PASO 2] /api/bg-remove (Replicate rembg o grounded_sam para piezas pequeñas)
  Pieza aislada sobre transparente
  Para topos/anillos pequeños → grounded_sam con prompt "earring stud" / "ring"
         |
         v
[PASO 3] /api/upscale (Real-ESRGAN 2x)
  Joyería necesita detalle de piedras, grabado, brillo metálico
  SIEMPRE upscale en este pipeline — no es opcional
         |
         v
[PASO 4] 3 generaciones en paralelo:

  [4a] FOTO ESTANTE
       /api/bg-generate con preset por subType:
         - earrings/studs/hoops → terciopelo negro con iluminación cálida
         - necklace → busto cuero marrón con reflejo dorado
         - ring → cojín seda crema con sombra suave
         - bracelet → base madera oscura con grano visible
         - set → tabla mármol blanco (piezas acomodadas juntas)
       /api/shadows contact + ambient
       /api/enhance (saturación +10%, brillo metálico +5%)

  [4b] FOTO MODELO
       /api/model-create SeedDream (si no hay modelo guardada)
         Prompts por subType:
           - earrings → "beautiful woman portrait, ear visible, clean background"
           - necklace → "woman bust portrait, neckline visible"
           - ring → "elegant hand pose, detailed fingers"
           - bracelet → "woman wrist in soft light"
       /api/jewelry-tryon colocando la pieza aislada en la posición correcta
       /api/enhance

  [4c] FOTO DETALLE
       Crop 1:1 cerrado sobre la foto de estante (40% del centro)
       /api/enhance (sharpening +15%)

         |
         v
[PASO 5] /api/video (Ken Burns, gratis)
  Sobre la foto de estante → zoom lento + rotación sutil → 5s, 1:1
         |
         v
OUTPUTS por SKU: estante.jpg, modelo.jpg, detalle.jpg, video.mp4
```

---

## Proveedores elegidos

| Step | Proveedor | Por qué |
|---|---|---|
| analyze-image | Claude Vision | Detecta subType/material/piedras con alta precisión |
| bg-remove | Replicate rembg (piezas grandes) o grounded_sam (piezas pequeñas <10% del frame) | Piezas pequeñas sobre fondos complejos necesitan Grounding DINO |
| upscale | **Real-ESRGAN 2x** | Mejor preservación de detalle metálico que Clarity para joyería |
| bg-generate (estante) | Flux Pro (Precise mode) | Los fondos de lujo requieren iluminación realista — Schnell no lo logra |
| model-create | SeedDream 4.5 | Consistente con pipeline Lencería; permite reuso de modelos |
| jewelry-tryon | Flux Kontext Pro (módulo existente `/api/jewelry-tryon`) | Composición precisa por edición condicionada |
| shadows | Sharp (contact) + AI relight para premium | Joyería brilla, la sombra correcta es crítica |
| video | Ken Burns | Gratis y suficiente para flat-lay rotacional |

---

## Reutilización de modelo IA

Igual que Lencería, el pipeline guarda modelos IA en tabla `AiModel` con tag por sub-tipo:

- `modelKind:jewelry-portrait` para aretes/cadenas/sets
- `modelKind:jewelry-hand` para anillos/pulseras

La primera foto de una campaña genera la modelo; las siguientes reusan. Ahorro: $0.055 × (N-1) fotos.

---

## Costos estimados

| Step | Costo |
|---|---|
| `/api/upload` | $0 |
| `/api/analyze-image` | $0.001 |
| `/api/bg-remove` | $0.01 |
| `/api/upscale` Real-ESRGAN 2x | $0.02 |
| `/api/bg-generate` Flux Pro (estante) | $0.05 |
| `/api/model-create` SeedDream | $0.055 (reusable) |
| `/api/jewelry-tryon` Kontext Pro | $0.05 |
| `/api/shadows` Sharp + AI relight | $0.04 |
| `/api/enhance` final | $0 |
| `/api/video` Ken Burns | $0 |
| **Total por SKU, primera pasada (con modelo nueva)** | **~$0.23** |
| **Total por SKU, reusando modelo guardada** | **~$0.17** |

---

## Batch desde folder de inventario

```
images/Accesorrios/CATALOGADOS/Aretes/      → subType:earrings (17 files)
images/Accesorrios/CATALOGADOS/Collares/    → subType:necklace (21 files)
images/Accesorrios/CATALOGADOS/Pulseras/    → subType:bracelet (15 files)
images/Accesorrios/CATALOGADOS/Anillos/     → subType:ring (2 files)
images/Accesorrios/CATALOGADOS/Sets/        → subType:set (17 files)
```

Output: `output/jewelry/{subType}/{sku}/{estante|modelo|detalle|video}.{jpg|mp4}`.

---

## Troubleshooting

| Síntoma | Causa | Fix |
|---|---|---|
| Paso 2 pierde piedras pequeñas en bg-remove | rembg no detecta detalles <2% del frame | Cambiar a grounded_sam con prompt del sub-tipo |
| Pieza aparece borrosa en paso 4a (estante) | Upscale insuficiente o Flux Pro no respeta composición | Upscale 4x en vez de 2x; agregar pieza aislada como `reference_image` al bg-generate |
| Anillo en mano sale del dedo equivocado | jewelry-tryon no sabe qué dedo | Prompt explícito "ring on ring finger, left hand" en jewelry-tryon |
| Cadena se ve cortada en el cuello | Modelo IA tiene el busto muy cerca del frame | Ajustar prompt model-create: "upper body portrait with full neckline visible" |
| Sets se ven desordenados | No se está ordenando las piezas antes de bg-generate | Layout pre-compuesto en Sharp (aretes arriba, cadena centro) antes de pasar a bg-generate |
| Video sale estático sin rotación | Ken Burns solo hace zoom lineal | Implementar zoom + pan leve o usar wan-2.2-fast |

---

## Módulos que este pipeline orquesta

| Módulo | Ruta | Uso |
|---|---|---|
| `upload` | `/api/upload` | Pre-upload |
| `analyze-image` | `/api/analyze-image` | Detectar subType |
| `bg-remove` | `/api/bg-remove` | Aislar pieza |
| `upscale` | `/api/upscale` | Real-ESRGAN 2x obligatorio |
| `bg-generate` | `/api/bg-generate` | Fondo de estante por sub-tipo |
| `model-create` | `/api/model-create` | SeedDream con prompt por sub-tipo |
| `jewelry-tryon` | `/api/jewelry-tryon` | Posición correcta según sub-tipo |
| `shadows` | `/api/shadows` | Contact + AI relight |
| `enhance` | `/api/enhance` | Preset jewelry |
| `video` | `/api/video` | Ken Burns 360° |
| `ai-models` | `/api/ai-models` | Reuso de modelos IA |

Es el pipeline que más módulos orquesta (11). Eso es normal — joyería requiere más composición visual que lencería o estáticos.
