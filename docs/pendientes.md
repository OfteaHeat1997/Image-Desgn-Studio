# Pendientes y estado del proyecto

> Este archivo guarda el contexto de las conversaciones con Claude para que no se pierda al cerrar un chat. Cada sesión nueva puede leer este archivo y arrancar donde quedó la anterior.
>
> **Última actualización:** 2026-04-21

---

## Respuesta sobre subir 1 o 3 fotos del producto

**Hoy: 1 sola foto.** Los modelos que usamos (Kolors para tryon, SeedDream para modelo) solo aceptan una imagen de prenda como referencia. Subir 3 no mejora el resultado — se usaría solo la primera.

### La mejor foto que podés subir

- Bra frontal, centrado, ocupa la mayor parte del encuadre
- Modelo real, maniquí o bra plano sobre fondo blanco — cualquiera funciona
- Fondo simple (no patrones) — facilita que `grounded_sam` aísle la prenda
- 1024 px o más de ancho

### Lo que la IA hace hoy con 1 foto

- ✅ Copia fiel del frente del bra (color, corte, copa, tirantes)
- ⚠️ **Espalda:** la IA la "inventa" plausible — si tu bra tiene un detalle raro atrás (cierre decorativo, cruce de tirantes especial), **NO lo va a preservar exacto**
- ⚠️ **Textura:** se infiere del frente — si la tela tiene una trama visible solo en foto macro, se pierde

> Para preservar detalles del back/textura en el futuro: es un módulo nuevo (Flux PuLID o IP-Adapter con multi-reference). Está anotado como **Phase 2f** más abajo.

---

## ✅ Shipped (ya está en producción)

| # | Item | Commit | Verificación |
|---|---|---|---|
| 1 | Tryon 422 image_load_error | `1e63a40` | Confirmado por la usuaria |
| 2 | Video 360° bug (usaba modelo en vez de prenda) | `2b268a5` | Deployado — falta test |
| 3 | ModelThumb onError fallback | `2b268a5` | Deployado — falta test |
| 4 | CHANGELOG del fix 1 | `6a3230a` | Sí |
| 5 | Phase 2a: 4 fotos por producto (hero + espalda + cuerpo completo + prenda sola, misma identidad vía seed) | `deeebeb` | Deployado — falta test |

---

## 🔴 Pendientes de desarrollo

| # | Fase | Qué incluye | Estimado | Bloqueado por |
|---|---|---|---|---|
| 6 | **Phase 2d — Pantys + Shapewear** (próximo) | Characterization específica: pantys (corte bikini/hipster/thong/high-waist, largo pierna), shapewear (zona cintura/abdomen/full, nivel compresión) | ~3h | OK después de confirmar 2a |
| 7 | **Phase 2b — Callout images** | Imágenes con zoom + texto + flechas ("High Coverage", "Underwire") tipo screenshots 5, 9, 11 de Leonisa | ~4h | Respuesta sobre texto auto vs manual |
| 8 | **Phase 2c — Video lifestyle con captions** | Video tipo "girl-to-mirror" con burbujas de texto (screenshots 1, 2, 3 de Leonisa) | ~8h | Prioridad — es caro y complejo |
| 9 | **Phase 2e — UX per-step** | Modal grande al click, botón Download y Save-to-gallery por paso, agrupación REF+color en picker | ~3h | Ninguno |
| 10 | **Phase 2f — Multi-reference garment** (nuevo) | Subir 3 fotos (frente/espalda/detalle) y preservar detalles del back/textura reales | ~6h | OK — nice-to-have, no bloqueante |
| 11 | **Phase 3 — Hero homepage section** | Video lifestyle vertical + overlay tipo Leonisa (solo si se quiere) | ~6h | Confirmar si se quiere o no |

---

## ❓ Preguntas abiertas para la usuaria

1. **Callouts (Phase 2b):** ¿texto auto-generado con Claude leyendo features de la prenda, o dropdowns manuales fijos ("Alta cobertura", "Sin costuras") elegidos manualmente?
2. **Logo de marca:** ¿hay logo propio para el overlay en "prenda sola", o usamos texto plano con número de REF?
3. **Fondo de hero:** ¿beige/crema cálido estilo Leonisa, o blanco estudio limpio como hoy?
4. **Hero homepage (Phase 3):** ¿la app tiene que generar este tipo de video también, o era solo referencia visual? Si sí: ¿1 por colección (SS26) o 1 por producto destacado?
5. **Hero texto/CTA:** ¿quemado dentro del video para postear en redes, o en capa HTML sobre el video para la web del ecommerce?
6. **Multi-foto (Phase 2f):** ¿interesa poder subir 3 fotos por producto para mejor fidelidad de back/textura, o con 1 frontal alcanza?

---

## 🧪 Tests de la usuaria pendientes

| Fase | Cómo testear | Qué esperar |
|---|---|---|
| **Phase 2a** | Subir bra a `/pipelines/lingerie`, dejar los 7 steps activos, automático | 4 fotos: frontal (como antes) + espalda (misma modelo de atrás) + cuerpo completo (misma modelo + shaper) + prenda sola |
| **Video 360° fix** | Mismo run | El Video 360° ahora muestra SOLO el bra rotando (no a la modelo) |
| **ModelThumb** | Abrir picker de modelos reusables | Si alguna preview no carga, sale placeholder checkerboard + nombre en vez de icono roto |

---

## 🎯 Orden propuesto

1. Usuaria testea Phase 2a (2 min de deploy + 2 min de test con una foto)
2. Confirma ✅ o ❌
3. Si ✅ → arranca Phase 2d (pantys + shapewear) inmediatamente
4. Si ❌ → manda screenshot y se fixea antes de seguir

---

## Notas de la sesión 2026-04-21

- Error visto en mobile: `Failed to fetch` en el paso "Crear Modelo IA" del pipeline de lencería. Este mensaje proviene del navegador cuando `fetch()` falla a nivel de red (no respuesta del servidor). Causas típicas: conexión móvil intermitente, timeout del edge, o conexión cortada a mitad de request. La UI ya muestra un mensaje amigable en español ("No pudimos generar la modelo IA. Reintentá o probá con otras configuraciones.") con el detalle técnico oculto bajo "Ver detalle técnico".

### Iteración 1 de Phase 2f (multi-foto + comprensión del producto) — en branch `claude/multi-photo-producto`

**Problema que resuelve:** la IA reinterpretaba el producto en cada paso (color ligeramente distinto, broche inventado, textura perdida). La usuaria reportó que para ecommerce esto es **fatal** — el cliente recibiría un producto distinto a la foto.

**Shipped en esta iteración:**

1. **Nuevo endpoint `/api/analyze-product`** — acepta 1-4 fotos (frontal obligatoria + espalda/detalle/flat opcionales) y usa Claude Vision (Sonnet) para extraer una ficha técnica estructurada: color primario/secundario, tela, textura, tipo de prenda, copa, tirantes, broche frontal/trasero, banda, padding, varilla, detalles, notas libres. Costo ~$0.01 por análisis.
2. **Auto-análisis al iniciar pipeline** — antes del primer step se corre `analyzeProductPhotos` sobre la foto frontal. Si falla, el pipeline continúa sin ficha (comportamiento legacy).
3. **ProductSpecPanel editable** — panel colapsable arriba de los StepCards. La usuaria ve exactamente qué entendió Claude y puede corregir cualquier campo (ej: si Claude dijo "negro" pero era "gris oscuro").
4. **Fix bug shaper shorts** — el prompt de `photoFullBody` mezclaba "nude seamless shaper shorts" en el campo `background`, que `/api/model-create` embutía en "against a X background" produciendo una frase maltrecha que SeedDream interpretaba como pantalones marrones. Ahora el background queda limpio ("plain white studio background, clean minimalist") y los briefs beige del prompt base de lingerie hacen el trabajo.

**Pendiente iteración 2 (después de que la usuaria mande el folder de fotos):**

- **UI de subida múltiple** — actualmente el análisis solo usa la foto frontal. Falta UI para adjuntar 2-4 fotos extra con role picker (espalda/detalle/flat) y pasarlas todas a `/api/analyze-product`.
- **Inyección de la ficha en prompts** — hoy la ficha se muestra pero no se usa para generar. Iter 2: pasar `specToCustomDetails(spec)` al campo `customDetails` de `/api/model-create` en `photoBack`/`photoFullBody` para que la IA preserve color/textura reales.

**Pendiente iteración 3:**

- Cuando el usuario sube foto de espalda real, usar esa foto directamente como referencia de prenda en el paso `photoBack` (en vez de reconstruir desde la frontal).
- Idem cuerpo completo.

---

## Sesión 2026-04-22 — Research UX + plan P0

**Ver reporte completo:** `docs/ux-research-2026-04-22.md`

Research de 8 herramientas (FASHN, Botika, Pebblely, Flair, ZMO, Pixelcut, Photoroom, Caimera) + DAM metadata + pause/stop/step-back patterns + AI provenance.

**Hallazgo clave:** Botika (1,000+ marcas fashion) **ya resolvió el pain #1** — la usuaria sube frontal Y espalda como flat-lays, Botika usa AMBAS como referencia, **NO inventa la espalda**. Eso es estándar de industria y lo que hay que implementar acá.

### Plan P0 (shipping en esta sesión)

| # | Feature | Estado | Commit |
|---|---|---|---|
| P0-1 | `viewAngle` enum por foto + dropdown en cada card + auto-detect desde filename | ✅ Shipped | `43731d3` |
| P0-2 | Cuando existe foto tagged `espalda`, usar directo en step photoBack | ✅ Shipped | `9844942` |
| P0-3 | Stop button por step en curso (AbortController) | ✅ Shipped | `9844942` |
| P0-4 | Tooltip "i" por step con docs (proveedor, costo, duración, falla típica) | ✅ Shipped | `93225a1` |

**Cómo testear el P0 completo:**

1. **Subí 2 fotos del mismo bra**: una frontal y una de espalda. Los nombres con "delante"/"patras"/"espalda"/"back" hacen el auto-detect. Si no matchea, usá el dropdown debajo de cada foto para corregir el ángulo.
2. Fijate que aparezca el banner violeta: **"✓ Foto de espalda detectada — se va a usar como referencia real"**.
3. Apretá **Iniciar Pipeline** y esperá a que llegue al paso "Foto Espalda".
4. Cuando corra photoBack, el resultado debería usar la foto de espalda REAL como referencia (no inventar) → broche, banda y tirantes se preservan.
5. En cualquier step en curso, probá el botón rojo **Detener**: cancela el request en vuelo y marca el paso como "Saltado — Detenido por la usuaria".
6. En cualquier step, tocá el ícono **i** al lado del título: se despliega panel con qué hace, qué proveedor usa, costo, duración, fallas típicas y tips.

### Modo de Generación (shipped commit `1a95065`)

Nuevo selector en setup con 3 opciones:

| Modo | Cuándo usarlo | Costo | Shipped |
|---|---|---|---|
| **Modelo IA + Try-on** (default) | Seguro, legalmente limpio, funciona sin fotos extra | ~$0.15/producto | ✅ |
| **Cambiar cara sobre foto real** (face-swap) | Cuando la usuaria tiene fotos reales del producto con modelo y quiere producto 100% idéntico, cambiando solo la cara por IA | ~$0.01/producto | ✅ |
| **4 variantes — elegí la mejor** (multi-sample) | Máximo control, elegís entre 4 candidatos en photoBack y photoFullBody | ~$0.60/producto | ✅ Shipped commit `5aa7b1e` |

**Face-swap details:**
- Nueva ruta `/api/face-swap` con `cdingram/face-swap` (Replicate)
- Se aplica en tryon/photoBack/photoFullBody cuando existe foto real con ángulo tagged
- Fallback automático a modo default si no hay foto real para una vista
- Toast info avisa cuando cae al fallback

### Colorway matrix (shipped commit `1ddc69f`)

- Detección de 15 colores desde filename (beige/negro/blanco/gris/verde/rojo/rosa/azul/morado/amarillo/naranja/marrón/dorado/plateado/turquesa) + sinónimos
- Badge color swatch + nombre en cada foto
- Resumen arriba de la grilla: "N productos detectados: REF X (M colores) · REF Y (P colores)"
- Grilla ordenada por (REF, color) para visibilidad
- sharedModelUrl ya se reusa entre jobs del mismo batch (legacy) → modelo IA se paga UNA vez por batch aunque haya 10 colores

### Provider switcher en retry (shipped commit `2d98353`)

- Dropdown "Proveedor" aparece en el error panel de tryon/photoBack/photoFullBody
- 4 opciones: Auto / Kolors (default lencería) / FASHN v1.6 (alta calidad) / IDM-VTON (backup)
- Botón cambia a "Reintentar con FASHN v1.6" cuando la usuaria eligió algo distinto a Auto
- El override queda persistido en `step.providerOverride` y se pasa a `/api/tryon` en el siguiente rerun

### P1-3 Quality toggle FASHN (shipped commit `4044938`)

- Toggle `Rápido / Balanceado / Alta calidad` en el setup (con duración estimada por cada uno)
- Se pasa como `fashnMode` al `/api/tryon` → inyectado dentro de `inputs.mode` del FASHN API v1.6
- Solo afecta cuando el tryon usa FASHN. Kolors/IDM-VTON lo ignoran
- Combinable con provider switcher: "Reintentar con FASHN v1.6" + modo Alta calidad = preservación máxima de textura

### Pre-upload paralelo (shipped commit `b8ff9ff`)

Fix: antes del loop del pipeline se suben TODAS las fotos en paralelo (`Promise.all`). Antes del fix, face-swap en job A no podía ver `uploadedUrl` de job B porque B no había corrido su processJob. Ahora las fotos están todas subidas antes del primer step, y `findMatchingPhoto` encuentra sus URLs.

### UX Polish Bundle (shipped commits `eb147e8`, `ed83826`, `7335da4`, `bac9d38`)

- **ImageLightbox modal**: click en cualquier resultado o variante → full-screen con descargar, ←/→ navegación, tabra de thumbs, botón "Usar variante N", ESC para cerrar
- **Botón Descargar** directo en cada step card (al lado de Aceptar y continuar)
- **Botón Descargar todos** en completion summary (dispara downloads con 200ms delay)
- **Progress bar live** con cost counter: "3/7 · $0.15 / ~$0.35" en header del job
- **Smart fallback** cuando photoFullBody/photoBack fallan: usa foto real tagged en vez de error rojo
- **Persistencia de settings** en localStorage: modo, calidad, tipo, REF, modelConfig sobreviven refresh
- **Badge "detectada" rediseñado**: pill emerald compacta "✓ Espalda real lista"
- **Fix ReferenceError**: freshJob no existía en catch scope; ahora se reconstruye desde `job`

### Persistencia completa (shipped commits `7335da4` + `43f2050`)

- Settings (modo, calidad, tipo, REF, modelConfig) en `lingerie:pipeline:settings:v1`
- Jobs (fotos, ángulos, colores, ficha técnica, resultados por step) en `lingerie:pipeline:jobs:v1`
- Refresh de la página preserva TODO el trabajo
- Jobs restaurados tienen `file=null` (los File objects no serializan) → no se pueden re-analizar con Claude Vision pero sí re-correr pipeline si ya tienen uploadedUrl

### Gallery auto-save (shipped commit `3c663de`)

Cada resultado final (tryon, photoBack, photoFullBody, videos) se guarda automáticamente al gallery-store persistente. Visible en `/gallery` entre sesiones. 3 pipelines canónicos ahora consistentes.

### Undo/Redo + Reset (shipped commit `d0935ef`)

- History stack de jobs (20 snapshots máx) + redo stack, tracked en refs (no state)
- `pushHistory()` se llama antes de cada acción destructiva: add/remove/cambio ángulo/reset
- Ctrl+Z (Cmd+Z en Mac) → undo; Ctrl+Shift+Z o Ctrl+Y → redo
- Listeners ignoran si el foco está en input/textarea (no pisa undo nativo en campos)
- Botones visibles Deshacer/Rehacer en el heading de la sección Fotos
- "Comenzar de nuevo" rojo: confirm dialog + limpia jobs in memory + localStorage jobs key + sharedModel/Seed, mantiene settings
- Toast "Deshecho"/"Rehecho" para feedback

### Per-job bodyType automático (shipped commit `9d2b6ca`)

Cuando una foto tiene talla detectada (ej "38B" → curvy, "32A" → slim), el pipeline usa ESE bodyType para ESE job en vez del global. Batches mixtos (32B + 38B + 42D) generan modelos IA con cuerpos apropiados automáticamente.

### Saved model presets — renombrar inline (shipped commit `e6c5eae`)

Click en el nombre de una modelo IA en el picker → editar → Enter/blur → se guarda en la DB. Antes: "female model – 26-35, medium (bra)". Ahora: "Karen" o "Ana".

### Keyboard shortcuts help (shipped commit `c5edc67`)

Tecla `?` o `/` → modal con tabla de atajos (Ctrl+Z, ←→, C, Esc).

### Comparar con original side-by-side (shipped commit `03e5ff8`)

En el lightbox: botón "Comparar con original" o tecla C → split 50/50 Original vs Resultado.

### P2 pendiente (siguiente sesión)

- Face-swap en producción (env var FACE_SWAP_MODEL con hash real de Replicate)
- Multi-sample para step `tryon` (hoy solo photoBack/photoFullBody)
- Undo en pipeline run (hoy solo funciona en setup)
- Per-talla model identity lock: fotos de la misma REF+talla deberían COMPARTIR exactamente la misma modelo IA (misma cara) aunque el bodyType varíe entre tallas
