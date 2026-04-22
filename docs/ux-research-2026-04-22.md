# UX Research — AI Fashion Photography & Virtual Try-On

**Fecha:** 2026-04-22
**Objetivo:** encontrar los patrones de control y UX que las herramientas del mercado resolvieron bien, para aplicarlos al pipeline de UniStudio y darle a la usuaria (no técnica, ecommerce de lencería) control fino sobre cada paso.

---

## 1. Resumen ejecutivo (5 insights clave)

1. **Casi ninguna competencia expone un STOP real mid-step o overrides manuales por paso.** Runway y Midjourney sí (parámetro `--stop N%` de Midjourney, botón "Cancel" tras 30 min en Runway). Herramientas consumer de fashion (FASHN, Botika, Photoroom) corren como caja negra. **Si UniStudio agrega pause/cancel real, sería diferenciador legítimo.**
2. **El multi-ángulo YA es un patrón resuelto** — pero la mayoría exige subir fotos reales de frontal/espalda/lado. **Botika explícitamente acepta "front, back, or both" como flat-lay y preserva cada ángulo.** La intuición de la usuaria es correcta: el estándar es **"usar la foto real cuando la tenés; solo inferir cuando no la tenés"**.
3. **El batch por colores ES feature explícita** en FASHN (1-4 variaciones por request, mismo seed) y ZMO (matriz de plantillas: 30 prendas × 3 poses × 2 tonos × 1 fondo = 180 outputs en ~40 min). Agrupar "1 prenda × N colores" como 1 job agrupado es estándar en herramientas de escala catálogo.
4. **Toggles de Calidad vs Velocidad son la norma**. FASHN expone `performance | balanced | quality`. Casi toda competencia tiene al menos un slider. El skip/continue binario de UniStudio es inusualmente restrictivo.
5. **Metadata / role-tagging por imagen es estándar en todo DAM serio** (Cloudinary structured metadata, Bynder custom metadata models, variant-image-grouping en Shopify/Adobe Commerce). El pedido de "etiquetar esta foto como espalda" es literalmente table-stakes en DAM land.

---

## 2. Tool-by-tool

### 2.1 FASHN.AI
Proveedor actual de try-on de UniStudio. Virtual try-on v1.6, model creation, product-to-model, model swap, background edit.

**Controles por paso:** `garment_photo_type` (model/flat-lay/auto), `mode` (performance | balanced | quality), `cover_feet` y `adjust_hands` toggles, `num_samples` (1-4 variaciones en UNA llamada), `seed` reproducible. v1.6 varía generación 5-17s según mode.

**Multi-ángulo:** Acepta flat-lay, ghost-mannequin, o on-model — pero NO tiene slot "back-view input" en el endpoint tryon. Hay que llamar el endpoint por cada ángulo con su referencia.

**Stop/cancel:** No documentado. Pricing créditos ($0.10/crédito, top-up mínimo 100). Sin refund documentado por falla.

**Patrón a robar:** `num_samples` (1-4 en 1 request) → usuaria ve 4 candidatos y elige — mucho mejor que "try, fail, try again".

Fuentes: fashn.ai/products/api, docs.fashn.ai/api-reference/tryon-v1-6

### 2.2 Pebblely
Background generation para packshots. Fashion soportado pero no el foco.

**Controles:** Theme selector (40+ presets), free-text background description, "generate unlimited variations".

**Multi-ángulo:** No es foco. Trata cada imagen como independiente.

**Stop/cancel:** No documentado.

**Pricing:** Basic $19/mo = 500 img, Pro $39/mo = 2,000 img.

**Patrón a robar:** Library de fondos con nombres (studio, café, beach) — mucho más amigable que prompt libre para usuaria no técnica.

### 2.3 Flair.ai
AI product photography con canvas drag-and-drop, 3D props, colaboración real-time.

**Controles:** Canvas drag-and-drop (el más granular de todos) — usuaria posiciona productos, luces, props, templates a mano.

**Multi-ángulo:** Fashion fit clothing onto AI models preservando patterns/logos, pero sin workflow dedicado a back view.

**Pricing:** $8–$138/mo (anual).

**Patrón a robar:** Canvas drag-and-drop es lo más "designer-friendly". La usuaria mantiene control directo en lugar de ceder todo a la IA.

### 2.4 Botika — **LA CLAVE PARA EL PAIN #4**
1,000+ fashion brands, app de Shopify, flat-lay-to-on-model como workflow core.

**Controles:** Library de estilos pre-seleccionados, library de back-poses, **multi-view upload** (feature killer), SKU-batch ("colecciones enteras, múltiples SKUs, poses, backgrounds en 1 run").

**Multi-ángulo — el finding crítico:** Botika explícitamente acepta "front, back, or both" flat-lay uploads y "turns flat lays or mannequin shots — front, back, or both — into fully styled on-model images". **NO inventa el back desde el front** — pide que subas un back flat-lay y lo usa como ground truth.

**Stop/cancel:** No documentado públicamente. Integración con Shopify sugiere batch queue management.

**Pricing:** 8 créditos gratis; desde $22/mo. 1 crédito = 1 foto, 5 créditos = 1 video.

**Patrón a robar:** **"Upload frontal Y espalda como flat-lays, generá con ambos como referencia".** Es el patrón #1 que UniStudio debe adoptar.

Fuentes: botika.com, botika.com/products, apps.shopify.com/botika

### 2.5 ZMO.ai
v3.0 agregó pipeline de virtual try-on + modo batch para catálogos.

**Controles:** Body type, skin tone, pose preset, model + background free-text. Batch matrix: subís carpeta, definís template (ej. 3 poses × 2 tonos × 1 fondo) y llena la matriz.

**Multi-ángulo:** No explícito front/back/side; más sobre poses. Success rate ~70% en inputs bien iluminados.

**Pricing:** Starter ~$29/mo; Enterprise $799/mo (400 créditos + 80 modelos).

**Patrón a robar:** "Template matrix" (definir ejes, sistema llena combinatoria) mapea 1:1 al pain #7 — "1 REF × M colores agrupado".

### 2.6 Pixelcut
Mobile-first, 70M+ users. No fashion-specializado.

**Controles:** BG removal, object erase, templates, AI photoshoot, 4K upscale, shadow effects, color adjust, batch editing. Editor direct-manipulation.

**Multi-ángulo:** No hay soporte específico.

**Pricing:** Free tier, Pro $4.99/mo annual.

**Patrón a robar:** Preview side-by-side before/after en cada operación + undo stack. Usuaria no técnica puede experimentar sabiendo que siempre puede volver.

### 2.7 Photoroom
"Only AI product photography tool designed specifically for commerce resellers". Fashion ecommerce strong.

**Controles:** Virtual Models tool — elegís model, background, pose, dimensions. **"Saved Virtual Models"**: guardás una modelo y la reusás across products. Batch mode hasta 100 imágenes con groupable sections.

**Multi-ángulo:** Try-on images pero no workflow dedicado a back/side.

**Pricing:** Free trial; Pro $9.99/mo (unlimited exports, batch 50); Business/API arriba.

**Patrón a robar:** **Saved Virtual Models** — usuaria elige modelo 1 vez, la reaplica en todo el catálogo. Resuelve el problema de consistencia (misma modelo across SKUs) Y es reusable.

### 2.8 Caimera.ai
Close catalog-focused competitor (en lugar de "CatalogAI/Mirage/Aiutopia" que no se encontraron como productos reales).

**Controles:** Ghost Mannequin, Flatlay-to-Catalog, Model Swap, Recolor, Background Swap, Upload & Edit, Sketch-to-Image. Lock-in para lighting preset, background family, color grading. Pro incluye "human fixes for garment details, hands, toes, inconsistencies" — admite limites de IA y ofrece repair path.

**Multi-ángulo:** No destacado como feature distinta.

**Pricing:** Créditos.

**Patrón a robar:** **Brand-lock presets con nombre** — usuaria define una vez: lighting = moody studio, palette = warm neutrals, y todo output futuro obedece. Enorme para usuarias no técnicas que no quieren re-decidir cada gen.

---

## 3. Patrones UX transversales

### 3.1 Metadata / role-tagging (Bynder, Cloudinary, Canto)

Cloudinary soporta 3 tipos: **tags** (labels flat), **contextual metadata** (key-value por asset), **structured metadata** (fields globales — ej. "view_angle" enum front/back/side). Bynder tiene custom metadata models con auto-tagging IA.

**Traducción a UniStudio:** el pedido "etiquetar esta foto como espalda" es literalmente **un field structured-metadata con enum**. Es tierra resuelta — solo hay que: dropdown por asset `view_angle ∈ {front, back, side_left, side_right, detail, flat-lay}` persistido en la store.

### 3.2 Pause/stop/step-back (Midjourney, Runway, ComfyUI)

- **Midjourney:** `--stop N%` (corta renderización al 50%, 75%, etc.) + reaccionar con ❌ para cancel.
- **Runway:** botón "Cancel" tras 30 min (sin refund). Refund flow vía chat.
- **ComfyUI:** nodos `PauseWorkflowNode`, `ImagePreviewPause` (pausa, muestra preview, usuaria elige Continue/Cancel). Queue UI con Running + Waiting lanes.

**Patrón canónico:** (1) toda generación cancelable desde queue panel; (2) preview-before-commit es un step-type que bloquea hasta aprobar; (3) % de diffusion early-stop ahorra costo.

### 3.3 Provenance AI en ecommerce

EU AI Act Article 50 aplica desde agosto 2026 — toda imagen IA a consumidores puede requerir marca de procedencia machine-readable. Estándares: **C2PA Content Credentials**, **SynthID** (watermark invisible Google). Adopción pobre: 36% con watermark machine-readable, 16% con disclosure visible.

**Para UniStudio:** un panel de provenance por imagen ("Generada por: bg-remove (WithoutBG) → model-create (FASHN v1.6) → tryon (FASHN v1.6) → multi-angle (SeedDream)") es (a) documentación empoderadora que fixea pain #5, y (b) future-proof para compliance EU.

---

## 4. Recomendaciones priorizadas para UniStudio

### P0 — shippear en las próximas 2 semanas

| # | Feature | Qué hace | Tool de referencia | Complejidad | Impacto |
|---|---|---|---|---|---|
| **P0-1** | Per-image role/angle tagging | Enum `viewAngle` por foto: `frontal/espalda/lado/detalle/flat-lay/referencia`. Dropdown en cada image card. Persist en gallery-store. | Cloudinary structured metadata; Botika multi-view | S | **Muy alto** — desbloquea P0-2 |
| **P0-2** | Use-real-back-photo mode | Cuando corre "generar espalda", primero busca en galería una foto tagged `espalda` del mismo producto. Si existe, úsala directamente. Si no, fallback a inferencia con warning. | **Botika** (feature killer) | M | **Máximo** — fixea pain #1 de la usuaria |
| **P0-3** | Stop button por step | Botón "Detener" visible en cada step en curso. Cancela el fetch (AbortController) y marca job como cancelled. Downstream halts hasta que usuaria elija Reintentar/Saltar/Editar parámetros. | ComfyUI queue panel + ImagePreviewPause | S-M | **Muy alto** — fixea pain #3 |
| **P0-4** | Tooltip docs por step | Ícono "i" en cada step card. Popover: qué hace este step, qué proveedor usa, costo estimado, duración típica, qué puede fallar, link a docs/pipelines. | Caimera brand-locks + AI transparency | S | Alto — fixea pain #5, construye trust |

### P1 — shippear en el mes

| # | Feature | Qué hace | Ref | Complejidad | Impacto |
|---|---|---|---|---|---|
| **P1-1** | Provider switcher + retry with diff provider | Dropdown "Reintentar con" en step fallado. Preserva inputs, manda a módulo alternativo (Kolors→FASHN→Kling). | FASHN mode + Runway retry | M | Alto |
| **P1-2** | Colorway matrix batch | "Nueva serie": 1 prenda + N swatches → 1 job por color con model-create, bg-remove, scene COMPARTIDOS. Grupo colapsable con N children. | ZMO matrix + FASHN num_samples | M-L | **Muy alto** — ahorro de tiempo masivo |
| **P1-3** | Quality/Speed mode por step | Toggle 3-estados: `Rápido/Balanceado/Alta calidad`. Mapea a provider's quality knob. Muestra tiempo + créditos estimados. | FASHN mode | S | Medio-alto |
| **P1-4** | Saved brand/model presets | "Mi modelo preferido", "Mi fondo preferido", "Mi iluminación". Templates guardables y reusables across productos. | Photoroom Virtual Model + Caimera | M | Alto |

### P2 — nice-to-have

| # | Feature | Por qué |
|---|---|---|
| P2-1 | Preview-and-approve checkpoints (opt-in) | ComfyUI ImagePreviewPause pattern |
| P2-2 | Provenance panel por output (opcional C2PA) | Compliance EU AI Act + transparencia |
| P2-3 | Percent-of-diffusion early-stop | Midjourney `--stop N%` |
| P2-4 | Badge proveedor + medidor costo en tiempo real | Trust + transparencia |

---

## 5. Los 3 movimientos de mayor ROI

1. **P0-1 + P0-2 juntos** (tagging + use-real-back-photo) — EL fix del pain #1. ~2 días de trabajo.
2. **P0-3 (Stop button)** — barato, boost enorme de control percibido, stop jobs que corren mal.
3. **P1-2 (Colorway matrix)** — el que más tiempo ahorra en el workflow real. N jobs → 1 job agrupado.

Todo lo demás es pulido incremental alrededor de estos 3.

---

## Limites de la investigación

No se pudo acceder a UIs en vivo de FASHN/Pebblely/Flair/Botika/Photoroom. Los findings están basados en docs públicas, help-center, reviews independientes (Rewarx, Photta, SaaSworthy, WearView, G2, Claid) y blogs de cada vendor. "CatalogAI", "Mirage AI" (fashion), "Aiutopia" no resolvieron a productos reales; Caimera.ai sustituyó como competidor catalog-focused más cercano.
