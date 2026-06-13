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
[PASO 3] /api/tryon (provider:auto → SeedDream edit, garmentType:bra|panty|shapewear)
  PRIMARIO: fal-ai/bytedance/seedream/v4/edit — editor multi-imagen.
    image_urls: [modelo IA (paso 2), prenda aislada (paso 1)]
    Prompt: "viste a esta persona con la prenda EXACTA de la 2ª imagen,
    preservando encaje/tirantes/cortes; no rediseñar ni recolorear".
    enable_safety_checker:false → no bloquea lencería. Preserva el producto
    real mucho mejor que Kolors (edita en vez de re-pintar genérico).
  BACKUP: fal-ai/kling/v1-5/kolors-virtual-try-on (si SeedDream falla)
    Category routing: tops (bra) / bottoms (panty) / one-pieces (shapewear)
  El badge en la UI muestra el proveedor real: verde=seedream, ámbar=kolors.
         |
         v
[PASO 3b] /api/inpaint (provider:flux-fill-pro) — texturePreserve
  Kolors regenera la prenda en superficie satinada/plástica genérica.
  Este step inpaintea la zona del bra para restaurar la textura real.
   - máscara: /api/bg-remove con returnMaskOnly:true (grounded_sam B/W)
   - inpaint: flux-fill-pro con prompt que incluye ProductSpec.material
     extraído por Claude Vision en analyze-product (ej "satén elastizado").
  Output reemplaza el tryon result para downstream (modelVideo, photoFullBody).

[PASO 3c] /api/outpaint (provider:flux-fill-pro, direction:'down') — photoFullBody
  Extiende el canvas del tryon (o texturePreserve) hacia abajo +65% para
  agregar piernas + panty nude SIN regenerar la modelo. Garantiza misma cara
  y mismo bra real porque solo agrega canvas vacío y deja que flux-fill-pro
  rellene la zona inpaint con prompt anclado al upper body. Sin model-create
  ni tryon adicionales — sale $0.05 en vez de $0.075 de la implementación
  anterior, que regeneraba la modelo (con bug de identidad distinta entre
  tryon y full-body).
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
| tryon (primario) | **SeedDream v4 edit** (fal.ai) | Editor multi-imagen (modelo + prenda como referencias). Edita en vez de sintetizar desde un prior de categoría → preserva el producto REAL (encaje, malla, tirantes, broche, corte). `enable_safety_checker:false` → no bloquea lencería (igual que en el ghost). Es lo que Kolors no puede: no "re-pinta" una prenda genérica. |
| tryon (backup) | **Kolors v1.5** (fal.ai) | Fallback si SeedDream falla. Rápido y diseñado para moda comercial, pero tiende a inventar prendas genéricas en lencería compleja. |
| tryon (alternativo, opt-in) | **Leffa** (`fal-ai/leffa/virtual-tryon`) | Proveedor seleccionable a mano para A/B cuando SeedDream "normaliza" un producto atípico (ej. bra de soporte sin aro). Leffa (CVPR 2025) **warpea la prenda real** sobre la modelo en vez de re-dibujarla → no la reinventa desde un prior de categoría. Usa la FAL_KEY existente, sin filtro de contenido expuesto. Entrenado en apparel estándar (upper/lower/dresses): un bra mapea a `garment_type:"upper_body"`, resultados en lencería son hit-or-miss pero es un enfoque genuinamente distinto. $0.04. |
| ~~tryon FASHN~~ | **NO** para lencería | FASHN v1.6 bloquea lencería siempre (política) → desperdiciaba ~17s antes de caer. Solo se usa en no-íntimos. IDM-VTON: filtro Replicate intermitente. |
| upscale | Real-ESRGAN / Clarity | Estándar, no tiene bloqueos. |
| video modelo | **Kling 2.6 Pro** (fal-ai/kling-video/v2.6/pro/image-to-video) | wan-2.2-fast generaba personas con look de muñeco (skin waxy, micro-expresiones erráticas, hair sin física). Kling 2.6 Pro preserva identidad facial entre frames y produce movimiento humano natural, apto para catálogo de moda. |
| video producto (360°) | **wan-2.2-fast** con `num_frames:81 guidance_scale:3.0 negative_prompt` | Sin humano en el frame → la calidad standard es suficiente. Ahorra $0.30 por video vs upgradear a Kling. |
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
| `/api/tryon` (SeedDream v4 edit, primario) | $0.03 — **$0.02 si cae a Kolors backup** |
| `/api/inpaint` (flux-fill-pro, texturePreserve opcional) | ~$0.05 |
| `/api/outpaint` (flux-fill-pro, photoFullBody) | $0.05 |
| `/api/enhance` (Sharp) | $0 |
| `/api/upscale` (opcional) | $0.02–$0.05 |
| Video producto 360° (wan-2.2-fast) | $0.05 |
| Video modelo (Kling 2.6 Pro, $0.07/s × 5s) | $0.35 |
| Video flat-lay (Ken Burns) | $0 |
| **Total 1 referencia, 1 color, 1 pose — con texturePreserve + upscale + ambos videos** | **~$0.51** |
| **Total reusando modelo ya guardada (segunda pasada)** | **~$0.46** |
| **Sin video modelo (catálogo solo fotos)** | **~$0.16** |

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
| **Paso 1 (Aislar) devuelve OTRO producto** (push-up genérico en vez del bra de soporte real) | grounded_sam falló y cayó al fallback **regenerativo SeedDream**, que inventa la prenda. Falla porque el `negative_mask_prompt` traía `torso,waist` → en bras de cobertura completa / shapewear / bodysuit el producto ocupa el torso, el detector lo suprimía y no encontraba máscara | El negative prompt ahora es por `garmentType`: para prendas que cubren torso (bra/shapewear/bodysuit/lingerie/set/swimwear) NO se suprime `torso/waist/body`. Solo `panty` los mantiene (ver `garmentNegativePrompt` en `bg-remove/route.ts`) |
| Paso 2 falla con content policy | SeedDream filter no desactivado o prompt demasiado explícito | Usar prompt "simple beige swim top and matching briefs" — NO usar "bikini" ni "nude" |
| Paso 3 pega la prenda en el lugar incorrecto del cuerpo | `garmentType` mal detectado → category incorrecta en Kolors | Validar `garmentType` antes de llamar tryon; forzar desde UI si hace falta |
| Timeout en paso 1 | grounded_sam + composite > 60s en Hobby | `vercel.json` ya tiene 300s para `/api/bg-remove` |
| 413 al guardar resultado | Payload > 4.5MB en body | Usar `/api/upload` primero, guardar URL — no data URI |
| Video duplica el producto | wan-2.2-fast sin `negative_prompt` | Pasar `negative_prompt: "duplicate, repeating, clone, multiple bodies"` + `guidance_scale: 3.0` |
| Foto Espalda muestra un bra distinto al original | Kolors recibió la vista FRONTAL como garment ref y "inventó" la espalda | El step ahora se SALTA con warning si no hay foto etiquetada "espalda". Subí la foto trasera real y reintentá. |

---

## photoFullBody — Outpainting sobre tryon (no regeneración)

El step `photoFullBody` ahora **extiende el canvas del tryon hacia abajo con outpaint flux-fill-pro** en vez de regenerar la modelo con un seed compartido. Es un cambio de estrategia importante:

**Bug previo (corregido):** la implementación anterior corría `model-create(seed=X)` + `Kolors(modelo nueva, prenda)` para photoFullBody. Dos problemas combinados:
1. **No era full body.** SeedDream con un prompt cargado de detalles de prenda ignoraba el "full body" → mismo crop 3/4 que el tryon.
2. **No era la misma modelo.** "Mismo seed = misma identidad" es falso en SeedDream — el seed solo controla el ruido inicial; cambiar el prompt produce personas distintas.

**Solución actual:** extender el canvas del resultado del tryon (o de texturePreserve si corrió) hacia abajo un 65% con `direction:'down'` en `/api/outpaint`. El servidor arma el canvas extendido + máscara con Sharp, y llama a flux-fill-pro vía Replicate (que no rechaza lencería como Kontext Pro). El upper body (cara, pelo, bra, torso) se preserva píxel-idéntico; solo se inpaintea la región nueva (piernas + briefs nude + fondo continuo).

**Dependencia explícita:** `photoFullBody` ahora requiere `tryon` completado. Si solo está el isolate, el step se salta con mensaje claro. Si `texturePreserve` corrió, se prefiere ese como base (la textura corregida se mantiene en el resultado).

**Costo:** baja de $0.075 a $0.05 por foto (un solo round-trip Replicate).

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
| `tryon` | `/api/tryon` | `provider:auto` → SeedDream v4 edit primario, Kolors backup |
| `enhance` | `/api/enhance` | Preset lingerie |
| `upscale` | `/api/upscale` | Opcional |
| `video` | `/api/video` | wan-2.2-fast o kenburns |
| `ai-models` | `/api/ai-models` | Persistencia de modelo reusable |
| `upload` | `/api/upload` | Pre-upload para esquivar límite de body |

Cambiar un proveedor en este pipeline obliga a actualizar el módulo correspondiente Y esta doc en el mismo commit (regla #3 del índice de pipelines).
