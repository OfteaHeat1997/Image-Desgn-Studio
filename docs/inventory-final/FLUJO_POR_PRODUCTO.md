# Flujo por tipo de producto — Pipeline Estáticos

> **Qué es esto:** el mismo nivel de detalle que `docs/pipelines/lingerie.md`, pero enfocado a cada uno de los 6 tipos estáticos. Para cada tipo: input esperado, 5 pasos del flow, proveedor por paso, prompts concretos, output esperado, errores comunes, costo.
>
> **Base:** `unistudio/src/lib/pipelines/static-product.ts` (matriz ya implementada) + `docs/pipelines/static-product.md` (flow ideal)
>
> **Creado:** 2026-04-23

---

## Flow común (antes de ramificar por tipo)

```
FOTO ORIGINAL del producto (celular o cámara, con fondo real raw)
         |
         v
[PASO 0] /api/upload → fal storage → URL pública     (costo $0)
         |
         v
[PASO 1] /api/analyze-image (Claude Vision Sonnet)  (costo ~$0.001)
  retorna: { productType, brand, packaging, colorDominant }
  ⚠ Si folder origen es conocido, forzar productType desde folder (Gap 4 audit)
         |
         v
[PASO 2] /api/bg-remove (browser WASM @imgly)        (costo $0)
  producto aislado sobre transparente PNG
         |
         v
[PASO 3] /api/enhance preset "product-normalize"     (costo $0)
  resize + center a canvas 2000×2000, padding estándar
         |
         v
[RAMIFICACIÓN por productType] — ver abajo
         |
         v
[PASO 5] /api/shadows (Sharp local, tipo según matriz) (costo $0)
         |
         v
[PASO 6] /api/enhance final (contraste/saturación)   (costo $0)
         |
         v
OUTPUT: output/static/{productType}/{brand}/{sku}.jpg (1:1 2000×2000)
        + variantes 16:9 (wide) y 9:16 (vertical) si se piden
```

---

## 🧴 Flow: PERFUME (Colonia)

**Inputs esperados:**
- Foto frontal de botella sobre superficie
- SKU formato `COL-XX##` (CY/ES/LB/YB/AV)
- Brand: cyzone | esika | lbel | yanbal | avon

**Matriz de fondo (ya implementada):**

| Brand | Prompt bg-generate | Shadow | Modo | Estética |
|---|---|---|---|---|
| esika, yanbal, lbel | "luxury perfume bottle on polished cream marble surface with subtle veining, soft warm golden gradient lighting from side, visible glass refraction and crystal-clear reflections on the marble, shallow depth of field with bokeh, Sephora flagship store aesthetic" | reflection | precise (Flux Pro) | Sephora/Ulta |
| cyzone | "vibrant coral-to-lilac gradient background with soft pastel bokeh highlights, youthful modern aesthetic with clean geometry, professional fragrance commercial photography, fresh and dynamic" | drop | precise | Teen/juvenil |
| avon (fallback) | "clean warm beige studio background with soft natural daylight from the left, subtle linen texture visible, minimal elegant commercial product photography" | drop | precise | Beige minimalista |

**Seed sugerido (gap 2):**
- perfume+esika → seed 4201
- perfume+yanbal → seed 4202
- perfume+lbel → seed 4203
- perfume+cyzone → seed 4204
- perfume+avon → seed 4205

**Output:** `output/static/perfume/{brand}/{COL-XX##}.jpg`
**Costo por SKU:** ~$0.051
**Costo cache hit (mismo brand):** ~$0.01

**Errores frecuentes:**
- Botella translúcida pierde definición en bg-remove WASM → fallback a Replicate rembg
- Reflejo sobre mármol sale duplicado → agregar `negative_prompt: "two bottles, duplicate reflection, multiple products"`

---

## 🧴 Flow: CREMA

**Inputs esperados:**
- Envase (tubo, bote, jar, pump dispenser)
- SKU `CRM-###`
- Brand: avon | cyzone | esika | lbel | salome | yanbal

**Matriz (ya implementada):**

| Brand | Prompt | Shadow | Modo | Estética |
|---|---|---|---|---|
| yanbal, lbel | "pristine white Carrara marble surface with subtle gray veining, soft mirror-like reflection beneath the product, diffused daylight from left, clean spa aesthetic, La Mer flagship product photography" | reflection | precise | La Mer / SK-II |
| esika, cyzone | "warm beige linen texture background with visible fabric weave, soft diffused lighting from above-left, cozy spa aesthetic, professional skincare commercial photography" | contact | precise | Nivea/Olay spa |
| avon, salome (fallback) | "neutral warm cream background with subtle linen texture, soft studio lighting, clean commercial skincare product photography, elegant minimalism" | contact | precise | Crema neutro |

**Seeds sugeridos:**
- cream+yanbal → 5201, cream+lbel → 5202, cream+esika → 5203, cream+cyzone → 5204, cream+avon → 5205, cream+salome → 5206

**Output:** `output/static/cream/{brand}/{CRM-###}.jpg`

**Caso especial — Hot Body Gel (CRM-031 Salome, otros):**
- Prompts de "warming / heat" pueden triggear content filter en algunos modelos
- Usar variante: "warm toned body gel tube on plain white background, minimal spa aesthetic" (sin palabras "hot" / "heat" / "warming")
- Si sigue fallando, forzar fallback a SeedDream edit (mismo patrón que Ghost Mannequin lencería)

**Riesgo:** 20 cremas Yanbal = el catálogo más grande. Sin seed compartido (gap 2), las 20 salen con fondos ligeramente distintos → catálogo ve desprolijo.

---

## ☀️ Flow: BLOQUEADOR

**Inputs esperados:**
- Envase (spray, tubo, compacto, dispenser)
- SKU `BLQ-###`
- Brand: esika | lbel | yanbal (12 de 15 son Yanbal)

**Matriz (única para todas las marcas):**

| Prompt | Shadow | Modo |
|---|---|---|
| "defocused warm sandy beach background with golden-hour sun flare, soft turquoise ocean blur in the distance, shallow depth of field, summer sun-protection commercial photography, Coppertone campaign aesthetic" | drop | precise |

**Seed sugerido:** 6201 (único, no hay ramificación por marca)

**Subtipo crítico:** compactos Yanbal (Total Block Compact Beige Claro/Oscuro/Nude) — tienen forma de polvera, NO de spray. El pipeline debería detectar `packaging:"compact"` y ajustar:
- Shadow más duro (compact tiene peso)
- Fondo ligeramente más saturado para contrastar colores beige/nude del compact

**Output:** `output/static/sunscreen/{brand}/{BLQ-###}.jpg`

**Errores frecuentes:**
- Flare del sol se superpone al producto → negative_prompt: "sun flare on product, bokeh on product"
- Fondo playa muy genérico → aumentar specificity: "Caribbean golden sand, palm tree blur in distance, morning golden hour"

---

## 🧴 Flow: DESODORANTE

**Inputs esperados:**
- Envase (stick, roll-on, aerosol, talco box)
- SKU `DES-###` o `TAL-###` (talcos)
- Brand: yanbal (14) | esika (11) | otros

**Matriz (única):**

| Prompt | Shadow | Modo |
|---|---|---|
| "smooth cool gray-to-silver gradient background with soft top lighting, subtle studio vignette, clean commercial product photography with no distractions, modern minimal aesthetic" | contact | precise |

**Seed sugerido:** 7201

**⚠ Issue crítico (gap 4 del audit):** imágenes compartidas con perfumes
- `DORSAY.jpg`, `GAIA.jpg`, `OHM.jpg`, `OSADIA.jpg`, `ZENTRO.jpg` existen como perfumes **y** desodorantes
- Si se sube sin contexto, la matriz defaultea a perfume (por el nombre de la marca)
- **Forzar `productType:deodorant` desde el folder `desodorantes/` ANTES de llamar la matriz**

**Subtipo talco:**
- `TAL-###` (Talco Fantasia, Talco Xtreme) debería usar fondo ligeramente más suave: "pastel powder background with fine talc particle dust suggestion"
- No está implementado en la matriz actual — talco usa mismo prompt que desodorante stick. Mejora #8 del audit.

**Output:** `output/static/deodorant/{brand}/{DES-###}.jpg`

---

## 🧼 Flow: LIMPIEZA FACIAL

**Inputs esperados:**
- Envase (bottle pump, tube, serum dropper)
- SKU `LF-XX##` (ES/LB)
- Brand: esika | lbel

**Matriz (única):**

| Prompt | Shadow | Modo |
|---|---|---|
| "clean white-to-pale-blue spa background with suggestion of water droplets and subtle reflections, fresh clinical skincare aesthetic, La Roche-Posay pharmacy commercial photography, luminous and pure" | reflection | precise |

**Seed sugerido:** 8201

**Output:** `output/static/facial/{brand}/{LF-XX##}.jpg`

**Estado de inputs:** solo 2 de 6 tienen foto. 4 SKUs no procesables (LF-LB01, LF-LB03, LF-LB04, LF-ES02) hasta que se fotografíen.

---

## 💄 Flow: MAQUILLAJE (futuro)

**Inputs esperados:**
- Labial, base, sombras, brochas, polvos
- No hay docx actualizado ni zip — todavía sin SKU en este update

**Matriz (ya implementada, esperando productos):**

| Prompt | Shadow | Modo |
|---|---|---|
| "dramatic matte black background with soft rim lighting from the side creating a rich shadow falloff, subtle spotlight on the product, luxury cosmetics editorial photography, high contrast, MAC flagship aesthetic, glossy and bold" | drop | precise |

**Seed sugerido:** 9201

**Output:** `output/static/makeup/{brand}/{MKP-###}.jpg`

**Nota:** El Excel de `docs/inventory.md` menciona 19 productos de maquillaje que existen en inventario pero no en el website. Si tu mamá/hermana los rescatan, este flow los cubre.

---

## Resumen por costo

| Tipo | $/SKU primer run | $/SKU con cache (gap 7) | SKUs a procesar |
|---|---:|---:|---:|
| Perfume | 0.051 | 0.01 | 139 |
| Crema | 0.051 | 0.01 | 52 |
| Bloqueador | 0.051 | 0.01 | 15 (10 con foto) |
| Desodorante | 0.051 | 0.01 | ~28 |
| Limpieza facial | 0.051 | 0.01 | 6 (2 con foto) |
| Maquillaje | 0.051 | 0.01 | futuro |
| **TOTAL estáticos (primer run)** | — | — | **~240 × $0.051 = $12.24** |
| **TOTAL estáticos (con cache bg)** | — | — | **~$4.80** |

Con el cache implementado (gap 7), procesar TODO el catálogo estático cuesta menos que un almuerzo.

---

## Regla Pipeline ↔ Módulo para estos flows

Cada vez que se ajuste un prompt en `static-product.ts` (ej: añadir `productType:talco`):
1. Actualizar `unistudio/src/lib/pipelines/static-product.ts` — la matriz
2. Actualizar `docs/pipelines/static-product.md` — la doc del pipeline
3. Actualizar este archivo (`FLUJO_POR_PRODUCTO.md`) — el flow detallado
4. Si se agrega un nuevo preset a `/api/bg-generate`, actualizar `unistudio/src/app/api/bg-generate/route.ts` + `docs/modules/README.md`

**Todo en el mismo commit.** Es la regla del repo (`CLAUDE.md` sección "Pipeline ↔ módulo sync rule").
