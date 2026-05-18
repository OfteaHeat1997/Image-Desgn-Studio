# Pipeline Lencería

> Para: Unistyles (Curaçao) — **164 productos** (77 bras + 72 panties + 15 shapewear)

**Última actualización:** 2026-04-20
**Estado:** Implementado — migrado desde `/catalog-pipeline` (commit 2 del ciclo, merge preservando la orquestación local que ya funcionaba)
**Ruta API:** No tiene ruta propia — la página orquesta los módulos directamente desde el cliente (`fetch('/api/<modulo>')`). Es intencional: permite per-step UI con aprobación manual.
**Página UI:** `/pipelines/lingerie`

---

## Qué hace (y qué NO hace)

**Hace:** Toma una foto con una modelo vistiendo lencería, QUITA la modelo (deja solo la prenda flotando), crea una modelo IA nueva con licencia libre, y viste la nueva modelo con la prenda. Opcionalmente genera video de la modelo o flat-lay de la prenda.

**NO hace:** No es "quitar fondo" tradicional. El flow crítico es `removeSubject:true` → se quita el SUJETO HUMANO, no el fondo. Esto es lo que lo diferencia del pipeline Estáticos.

---

## Flow técnico (7 steps)

```
FOTO ORIGINAL (modelo vistiendo bra/panty/shapewear)
         |
         v
[PASO 0] /api/upload → fal storage → URL pública
  Evita el límite de Vercel de 4.5MB en body
         |
         v
[PASO 1] /api/bg-remove (removeSubject:true, garmentType:"bra"|"panty"|"shapewear")
  grounded_sam (Grounding DINO + SAM) → máscara B/W de SOLO la prenda
  Sharp compone máscara como alpha → prenda aislada sobre fondo transparente
  Upload resultado a fal storage
  Selector de máscara: purity ≥ 0.9 (B/W puro) para rechazar imagen anotada de debug
         |
         v
[PASO 2] /api/model-create (seed compartido entre ángulos/colores del mismo SKU)
  SeedDream 4.5 con prompt "woman wearing simple beige swim top and matching briefs"
  enable_safety_checker: false (desactivable en SeedDream)
  Retry automático con prompt safer si content policy falla
  Si ya existe modelo guardada para esta referencia (tabla AiModel) → skip este step
         |
         v
[PASO 3] /api/tryon (provider:kolors, garmentType:bra|panty|shapewear)
  fal-ai/kling/v1-5/kolors-virtual-try-on
  Category routing: tops (bra) / bottoms (panty) / one-pieces (shapewear)
  Inputs: human_image_url (modelo IA del paso 2), garment_image_url (prenda aislada del paso 1)
         |
         v
[PASO 4] /api/enhance (Sharp local, gratis)
  Contraste + nitidez + saturación
         |
         v
[PASO 5] /api/upscale (opcional, Real-ESRGAN 2x o Clarity)
         |
         v
[PASO 6] Video final (en paralelo — opcional)
  (6a) Video modelo: wan-2.2-fast 3s 9:16 ($0.05) o Ken Burns zoom 9:16 (gratis)
  (6b) Video flat-lay: Ken Burns 360° 3s 1:1 sobre prenda aislada (gratis)
         |
         v
RESULTADOS guardados en galería con naming: REF-{sku}-{color}-{ángulo}.jpg + .mp4
```

---

## Proveedores elegidos y por qué

| Step | Proveedor | Por qué este y no otro |
|---|---|---|
| bg-remove (aislamiento) | **grounded_sam** (Replicate, schananas) | Grounding DINO detecta "bra"/"panty" como objeto y SAM segmenta. Flux Kontext Pro rechaza lencería con error E005 (content policy no desactivable). |
| model-create | **SeedDream 4.5** (fal.ai) | Único modelo de fotografía que permite `enable_safety_checker: false`. Flux/Gemini bloquean cualquier generación con ropa íntima. |
| tryon | **Kolors v1.5** (fal.ai) | Diseñado para moda comercial. FASHN v1.6 bloquea lencería siempre (política). IDM-VTON a veces funciona pero Replicate tiene filtro activo. |
| upscale | Real-ESRGAN / Clarity | Estándar, no tiene bloqueos. |
| video modelo | **wan-2.2-fast** con `num_frames:81 guidance_scale:3.0 negative_prompt` | Sin estos parámetros, duplica el producto en el frame. |
| video flat-lay | **Ken Burns** | Gratis, suficiente para flat-lay estático con zoom. |

**Proveedores explícitamente prohibidos para este pipeline:**
- FASHN v1.6 — bloquea lencería siempre
- Flux Kontext Pro — E005 content policy
- Gemini (cualquier versión) — Google bloquea ropa íntima
- IDM-VTON — filtro Replicate intermitente

---

## Diferenciación bra vs panty vs shapewear

El pipeline rutea según `garmentType` detectado por `analyze-image` (Claude Vision) o declarado desde el folder de origen:

| garmentType | Grounding DINO prompt | Kolors category | Output folder |
|---|---|---|---|
| `bra` | "bra, bralette, sports bra, wireless bra, soft bra, push-up bra" | `tops` | `output/lingerie/bra/{sku}/` |
| `panty` | "panty, underwear, briefs, thong, bikini bottom, hipster, boy short" | `bottoms` | `output/lingerie/panty/{sku}/` |
| `shapewear` | "shapewear, shaper panty, bodysuit, shaper, sculpting garment" | `one-pieces` | `output/lingerie/shapewear/{sku}/` |
| `set` | Ambos (bra + panty) en paralelo | Dos pipelines concurrentes | `output/lingerie/set/{sku}/` |

---

## Costos reales (abril 2026)

| Step | Costo |
|---|---|
| `/api/upload` | $0 |
| `/api/bg-remove` (grounded_sam + composite) | ~$0.01 |
| `/api/model-create` (SeedDream 4.5) | $0.055 — **$0 si reusa modelo guardada** |
| `/api/tryon` (Kolors v1.5) | $0.02 |
| `/api/enhance` (Sharp) | $0 |
| `/api/upscale` (opcional) | $0.02–$0.05 |
| Video modelo (wan-2.2-fast opcional) | $0.05 |
| Video flat-lay (Ken Burns) | $0 |
| **Total 1 referencia, 1 color, 1 pose — con upscale + videos** | **~$0.15** |
| **Total reusando modelo ya guardada (segunda pasada)** | **~$0.09** |

---

## Reutilización de modelo IA

Tabla Prisma `AiModel` ya existe. El pipeline:
1. Al generar con SeedDream, guarda `{ seed, prompt, previewUrl, gender, skinTone, bodyType, ageRange, referenceNumber }`.
2. Al procesar una nueva foto con la misma `referenceNumber`, consulta `/api/ai-models?referenceNumber=X` y reusa la modelo existente (skip `/api/model-create`).
3. UI: card "Mis modelos" en `/pipelines/lingerie` permite seleccionar modelo guardada manualmente.

**Ahorro:** $0.055 × (cantidad de colores/poses adicionales por SKU).

---

## Batch desde folder de inventario

El pipeline escanea `images/bra/REF-{sku}/{color}/{angle}.jpg` vía `/api/inventory/scan` y procesa todos los archivos del folder con la misma modelo IA (una sola generación de modelo, N tryons).

Naming output: `output/lingerie/bra/REF-{sku}/{color}-{angle}-AI.jpg`.

---

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| Paso 1 devuelve imagen con anotaciones/overlay | Selector de máscara eligió la imagen de debug de grounded_sam | Subir threshold de purity B/W a ≥0.9 (ya implementado) |
| Paso 2 falla con content policy | SeedDream filter no desactivado o prompt demasiado explícito | Usar prompt "simple beige swim top and matching briefs" — NO usar "bikini" ni "nude" |
| Paso 3 pega la prenda en el lugar incorrecto del cuerpo | `garmentType` mal detectado → category incorrecta en Kolors | Validar `garmentType` antes de llamar tryon; forzar desde UI si hace falta |
| Timeout en paso 1 | grounded_sam + composite > 60s en Hobby | `vercel.json` ya tiene 300s para `/api/bg-remove` |
| 413 al guardar resultado | Payload > 4.5MB en body | Usar `/api/upload` primero, guardar URL — no data URI |
| Video duplica el producto | wan-2.2-fast sin `negative_prompt` | Pasar `negative_prompt: "duplicate, repeating, clone, multiple bodies"` + `guidance_scale: 3.0` |
| Foto Espalda muestra un bra distinto al original | Kolors recibió la vista FRONTAL como garment ref y "inventó" la espalda | El step ahora se SALTA con warning si no hay foto etiquetada "espalda". Subí la foto trasera real y reintentá. |

---

## photoBack — Requiere foto de espalda real

El step `photoBack` **NO inventa la vista trasera del bra**. Si no subís una foto del producto desde atrás (etiqueta `"espalda"` en el setup), el step se salta con un banner amber en la UI que pide subir la foto y reintentar.

**Razón:** Kolors es virtual try-on, no entiende "rotar la prenda 180°". Si le pasáramos la vista frontal como garment reference, generaría un bra distinto al producto real (broche al frente vs atrás varían entre modelos, el cruce de tirantes puede ser distinto, la banda puede tener detalles propios). Eso producía resultados falsos para el catálogo.

**Cómo se detecta:** el filename ya se mapea automáticamente — `bh negro patras 011473.png` → angle `espalda`. Si quedó mal etiquetada, podés corregir el ángulo desde el dropdown debajo de cada foto en el setup. Una vez la foto está en el job (mismo `referenceKey`) con angle `espalda`, `photoBack` la usa como `backGarmentUrl` y Kolors la respeta píxel a píxel.

**Skip silencioso, no error:** el job NO falla globalmente por `photoBack` skipeado. El resto del pipeline (`tryon`, `photoFullBody`, `productVideo`, `modelVideo`) sigue corriendo normal.

---

## Módulos que este pipeline orquesta

| Módulo | Ruta | Uso |
|---|---|---|
| `bg-remove` | `/api/bg-remove` | `removeSubject:true` + `garmentType` |
| `model-create` | `/api/model-create` | SeedDream 4.5 con seed compartido |
| `tryon` | `/api/tryon` | Forzar `provider:kolors` |
| `enhance` | `/api/enhance` | Preset lingerie |
| `upscale` | `/api/upscale` | Opcional |
| `video` | `/api/video` | wan-2.2-fast o kenburns |
| `ai-models` | `/api/ai-models` | Persistencia de modelo reusable |
| `upload` | `/api/upload` | Pre-upload para esquivar límite de body |

Cambiar un proveedor en este pipeline obliga a actualizar el módulo correspondiente Y esta doc en el mismo commit (regla #3 del índice de pipelines).
