# Pipeline Estáticos

> Para: Unistyles (Curaçao) — **240 productos** (146 perfumes + 49 cremas + 28 desodorantes + 11 bloqueador + 6 facial + maquillaje futuro)

**Última actualización:** 2026-04-20
**Estado:** Implementado (MVP) — commit 3 del ciclo. Matriz de fondo adaptativo en `src/lib/pipelines/static-product.ts`, página orquesta los módulos desde el cliente.
**Ruta API:** No tiene ruta propia — la página llama a `/api/bg-remove`, `/api/enhance`, `/api/bg-generate`, `/api/shadows` directamente (mismo patrón que Lencería, permite per-step UI).
**Página UI:** `/pipelines/static-product`

---

## Qué hace

Toma una foto de un producto estático (envase sobre una superficie), lo aísla, decide un fondo apropiado según el tipo y marca del producto, lo recompone con fondo + sombra + enhance, y genera outputs consistentes entre todos los productos de la misma categoría/marca para un catálogo cohesivo.

**Qué no hace:** No crea modelos IA. No hace try-on. El producto es el único sujeto de la foto.

---

## Diferenciador crítico: fondo adaptativo

A diferencia de un pipeline genérico "bg-remove + white bg", este pipeline **decide el fondo según el producto** usando Claude Haiku con una matriz de defaults si no hay API key.

### Matriz de decisión de fondo

| Categoría | Marca (si aplica) | Fondo base | Sombra | Estética |
|---|---|---|---|---|
| Perfume | Esika / Yanbal / L'Bel (premium) | Gradient suave beige→dorado con reflejo en superficie | Hard shadow para sentir peso del vidrio | Estándar Sephora/Ulta |
| Perfume | Cyzone (teen) | Fondo liso color vibrante (coral, lila, turquesa) con bokeh sutil | Soft shadow | Coherente con branding juvenil |
| Perfume | Avon | Beige cálido minimalista | Soft shadow | Clásico/casero |
| Crema | Hidratante corporal (Yanbal Ccori/Seda/Totalist) | Beige cálido con textura spa (lino sugerido) | Contact + soft | Estándar Nivea/Olay |
| Crema | Anti-age (Esika Renacer / L'Bel Totalist Avocado / Yanbal Triple Acción) | Mármol blanco premium con reflejo | Hard contact + highlight | Estándar La Mer/SK-II |
| Crema | Hot body gel (Avon/Salome) | Fondo rojo suave degradado | Soft shadow | Llamativa/energética |
| Bloqueador | Esika/Yanbal/L'Bel | Arena/playa desenfocada | Soft ambient | Estándar Coppertone |
| Desodorante | Todos | Degradado gris neutro o azul frío | Contact shadow plano | Product shot clean |
| Talco | Esika | Fondo polvo/pastel blanco con textura | Soft shadow | Coherente con producto talco |
| Limpieza facial | L'Bel / Esika | Azul/blanco spa, gota de agua sugerida | Soft + reflejo | Estándar La Roche-Posay |
| Maquillaje | Todos | Negro mate dramático o rosa polvo con glitter sutil | Hard shadow con rim light | Estándar MAC/Maybelline |

### Cómo decide el pipeline

```
FOTO → analyze-image (Claude Vision)
        retorna: { productType, brand, packaging, colorDominant }
         |
         v
Claude Haiku con la matriz + el análisis
        retorna: { bgPrompt, shadowType, enhancePreset, aspectRatios }
         |
         v
bg-generate usa bgPrompt
shadows usa shadowType
enhance usa enhancePreset
```

Si `ANTHROPIC_API_KEY` no está disponible, el pipeline cae a la matriz hardcoded (categoría+marca → preset directo), sin Claude.

---

## Flow técnico (5 steps)

```
FOTO ORIGINAL (producto con fondo raw / o ya aislado)
         |
         v
[PASO 0] /api/upload → URL pública
         |
         v
[PASO 1] /api/analyze-image
  Detecta: productType, brand, packaging (spray/bottle/tube/jar/compact), colorDominant
         |
         v
[PASO 2] /api/bg-remove (browser WASM o Replicate según calidad)
  Producto aislado sobre transparente
         |
         v
[PASO 3] /api/enhance (normalizar)
  - Resize a canvas 1:1 estándar (2000x2000)
  - Centrar con padding consistente entre fotos del mismo SKU
  - Corregir rotación si el envase está torcido
         |
         v
[PASO 4] /api/bg-generate con prompt decidido por matriz o Claude
  Fast mode (Flux Schnell, $0.003) para desodorantes/talcos
  Precise mode (Flux Pro, $0.05) para cremas anti-age / perfumes premium
         |
         v
[PASO 5] /api/shadows + /api/enhance (final)
  Contact shadow o drop shadow según matriz
  Enhance color pop por categoría
         |
         v
OUTPUTS: main.jpg (1:1 2000x2000), wide.jpg (16:9), vertical.jpg (9:16 Instagram Stories)
```

---

## Proveedores elegidos

| Step | Proveedor | Por qué |
|---|---|---|
| analyze-image | Claude Vision (Sonnet) | Clasificación de producto + detección de marca fiable |
| bg-remove | Browser WASM (@imgly/background-removal) o Replicate rembg | Productos rígidos con bordes definidos son fáciles — WASM es gratis |
| enhance (normalizar) | Sharp local | Resize/crop/center — gratis |
| bg-generate | Flux Schnell (fast) o Flux Pro (precise) via Replicate | Schnell es 10x más barato y suficiente para fondos simples |
| shadows | Sharp local (contact/drop) o Replicate AI relight (Flux) | Sharp gratis para fondos simples; AI relight para premium (mármol con reflejo real) |

**Proveedores prohibidos para este pipeline:**
- Cualquier modelo que espere humano como input (SeedDream modo foto, Kolors, FASHN, IDM-VTON). Aquí NO hay humanos.
- Modelos con content filter innecesariamente estricto — los productos son inofensivos.

---

## Consistencia entre fotos del mismo catálogo

Problema conocido del inventory: DORSAY.jpg, GAIA.jpg, OHM.jpg, ZENTRO.jpg se comparten entre perfumes y desodorantes. El pipeline resuelve esto:

1. **Naming por SKU único:** `output/static/{productType}/{brand}/{sku}.jpg` — nunca por nombre de producto, siempre por SKU.
2. **Seed compartido por marca:** todas las fotos de perfumes Yanbal usan el mismo `seed` en `bg-generate` para que el fondo dorado sea IDÉNTICO entre productos. Esto produce un catálogo visual cohesivo.
3. **Template de canvas compartido:** mismo 2000x2000, mismo padding, mismo punto de sombra. El producto cambia, el resto es idéntico.

---

## Costos estimados

| Step | Costo |
|---|---|
| `/api/upload` | $0 |
| `/api/analyze-image` | $0.001 (Claude Vision) |
| `/api/bg-remove` (WASM browser) | $0 |
| `/api/enhance` (resize/center) | $0 |
| `/api/bg-generate` (Flux Schnell) | $0.003 |
| `/api/bg-generate` (Flux Pro, premium) | $0.05 |
| `/api/shadows` (Sharp) | $0 |
| `/api/enhance` (final) | $0 |
| **Total por producto estándar** | **~$0.004** |
| **Total por producto premium (mármol, reflejo real)** | **~$0.051** |

---

## Batch desde folder de inventario

El pipeline lee folders estructurados:

```
images/perfumes/               → productType:perfume, bgPreset:premium-gradient
images/catalogo  cremas/       → productType:cream, bgPreset según marca
images/CATALOGO BLOQUEADOR/    → productType:sunscreen, bgPreset:beach
images/DESODORANTES_HD/        → productType:deodorant, bgPreset:neutral-gradient
images/limpieza facial/        → productType:facial, bgPreset:spa-blue
images/makeup/ (futuro)        → productType:makeup, bgPreset:dramatic-matte
```

Output naming: `output/static/{productType}/{brand}/{sku}.jpg`.

---

## Troubleshooting

| Síntoma | Causa | Fix |
|---|---|---|
| Fondo se ve genérico/plano | Matriz no matchea bien la marca | Agregar regla en matriz o mejorar prompt Claude Haiku |
| Producto descentrado entre fotos del mismo SKU | `enhance` no normaliza padding | Forzar canvas 2000x2000 con centro del producto calculado vía bbox |
| Mismo producto da fondos distintos entre runs | No se está usando `seed` compartido en `bg-generate` | Agrupar por marca y forzar seed estable |
| Desodorantes salen con vibe de perfume | La matriz defaultea a "premium" para marcas como Esika | Rama explícita por `productType:deodorant` ANTES de la marca |
| Bloqueador queda en fondo blanco, no playa | Fast mode de bg-generate no maneja escenarios complejos | Forzar Precise mode para `productType:sunscreen` |

---

## Módulos que este pipeline orquesta

| Módulo | Ruta | Uso |
|---|---|---|
| `upload` | `/api/upload` | Pre-upload |
| `analyze-image` | `/api/analyze-image` | Detectar productType + brand + packaging |
| `bg-remove` | `/api/bg-remove` | Aislar envase (browser WASM por defecto) |
| `enhance` | `/api/enhance` | Normalizar canvas + centrar + final color pop |
| `bg-generate` | `/api/bg-generate` | Fondo según matriz / Claude Haiku |
| `shadows` | `/api/shadows` | Contact o drop según matriz |

Ningún módulo se llama "pipeline-static-product" — se reusa lo que ya existe. Si falta un preset en `bg-generate`, se agrega al módulo, no al pipeline.
