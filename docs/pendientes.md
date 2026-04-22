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

### P1 pendiente (siguiente sesión)

- Isolate-sharing por REF: si 3 jobs tienen mismo REF pero distinto color, correr `isolate` una sola vez y reusar la estructura (requiere lift state por REF)
- Multi-sample para step `tryon` (hoy solo photoBack/photoFullBody — tryon usa sharedModel fijo + Kolors determinístico, necesita approach distinto)
- P1-1: Provider switcher (Kolors→FASHN→Kling) en retry
- P1-3: Quality/Speed toggle por step (FASHN mode)
- P1-4: Saved models/backgrounds presets (estilo Photoroom Virtual Model)
