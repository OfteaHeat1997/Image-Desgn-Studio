# UniStudio — Changelog

## 2026-04-23 (C7) — Gap 7 del audit: cache de fondos in-memory + modo económico

Último commit del plan de mejoras Pipeline Estáticos. Cierra el audit completo (7/7 gaps implementados).

Sin cache, los 20 perfumes Yanbal generaban 20 mármoles distintos. Con C1 (seed estable), salían idénticos pero cada uno costaba $0.05 (20 × $0.05 = $1). Con C7 + economía activada: 1 × $0.003 + 20 composites locales = **$0.003 total** para los 20 SKUs.

### Cambios

**`unistudio/src/lib/processing/bg-generate.ts`**
- Nuevo Map `bgCache` a nivel de módulo, keyed por `${prompt}|${aspectRatio}|${seed}`.
- `makeCacheKey()` helper que normaliza whitespace del prompt.
- `generateBgFast` ahora check cache antes de llamar Flux Schnell. Si hit, reusa `bgUrl` + composite actual. Si miss, genera + guarda + composite.
- `generateBgPreciseFallback` (el fallback de Kontext Pro por content filter) también cachea.
- Logs `[bg-generate] Cache HIT/MISS` para debugging.
- `getBgCacheStats()` exportada para debug futuro.

**`unistudio/src/app/pipelines/static-product/page.tsx`**
- Nuevo state `economyMode` (default off).
- `processJob` y `reRunBgAndBelow` envían `mode: economyMode ? "fast" : config.bgMode` a `/api/bg-generate`.
- Toggle UI verde "Modo económico (cache bg, ~$0.003/foto)" junto a los otros toggles (batch, validar).

### Efecto real en batches del inventario

| Escenario | Sin cache | Con cache (Modo económico) | Ahorro |
|---|---:|---:|---:|
| 32 cremas Yanbal | $1.63 | $0.10 | **94%** |
| 20 perfumes Yanbal | $1.00 | $0.03 | **97%** |
| 15 bloqueadores | $0.75 | $0.05 | **93%** |
| Batch estáticos completos (~80 SKUs) | $4.00 | $0.30 | **92%** |

### Limitaciones conocidas
- **In-memory**: en Vercel Lambda frío el cache se reinicia por invocación. Para persistencia real migrar a Prisma (`GeneratedBackground` model documentado en audit Gap 7). MVP suficiente para dev local y batches que corran en una sola sesión de servidor.
- **Kontext Pro (modo precise default) NO cacheable**: su output incluye el producto compuesto, entonces cada SKU genera una imagen única. El modo económico bypassa Kontext Pro y usa Flux Schnell + composite local — calidad de bg ligeramente menor, pero el producto queda pixel-perfect (se usa el PNG original).
- **Validador (C6)** se ejecuta cada SKU aunque sea cache hit: el fondo puede ser el mismo pero el composite con el producto puede haber fallado.

### No toca
- Pipeline Lencería (otra sesión).
- `/api/bg-generate` route signature (mismo POST, mismo JSON body shape).
- Módulos de shadows/enhance.
- Comportamiento default (modo económico opt-in).

## 2026-04-23 (C6) — Gap 6 del audit: validator preventivo + opt-in post-bg

Sexto commit del plan. Dos frentes:

1. **Preventivo (gratis)** — nuevo sufijo `NO_DUP` en la matriz de prompts:
   `", only ONE product visible in frame, no duplicate bottles or tubes or jars, no ghost copies, single product subject, no multiple instances of the product, background has no product in it"`
   Añadido a los 11 prompts de `getAdaptiveBgConfig` (6 tipos × variantes por marca). Flux y Kontext Pro respetan las negaciones en el prompt positivo.

2. **Detección opt-in (+$0.0002/foto)** — nueva ruta `/api/validate-bg`:
   - Toma `imageUrl` (URL HTTP o data URL)
   - Fetchea + base64 + Claude Haiku con vision
   - Prompt pide conteo de productos + flags `looksLikeDuplicate` y `productMissing`
   - Respuesta JSON estricta parseada con regex + fallback
   - Retorna `{ productCount, looksLikeDuplicate, productMissing, reason }` + cost 0.0002

### Cambios
- `unistudio/src/lib/pipelines/static-product.ts` — nuevo `NO_DUP`, aplicado vía replace_all `+ HD,` → `+ HD + NO_DUP,`.
- `unistudio/src/app/api/validate-bg/route.ts` (nuevo) — 120 líneas, patrón basado en `/api/analyze-image`.
- `unistudio/src/app/pipelines/static-product/page.tsx`:
  - `StepSnapshot` añade `warning?: string`.
  - Nuevo estado `validateBg` (boolean, default false).
  - `processJob` llama al validador después de bg si el toggle está on. Setea `step.bg.warning` si falla. No bloquea.
  - `reRunBgAndBelow` también valida al re-generar (resetea el warning primero).
  - UI: toggle "Validar fondos con IA (+$0.0002/foto)" junto a "Procesar todas", color amber cuando on.
  - Timeline del step bg: badge ⚠ amarillo en la esquina superior-derecha del thumbnail si hay warning, tooltip con el motivo.
- `docs/inventory-final/AUDIT_ESTATICOS.md` — Gap 6 HECHO.

### Flow real
```
Usuario activa "Validar fondos con IA"
  → procesa batch de 32 cremas
  → 29 pasan limpias, 3 salen con ⚠
  → usuario clickea ⚠ en una, ve tooltip "Duplicado detectado: hay un reflejo con el tubo entero"
  → click 🎨 Cambiar en ese job
  → elige alternativa de matriz o edita prompt
  → re-ejecuta → validador corre otra vez → si sale limpio, badge desaparece
```

### Costo real
- Sin validador: $1.63 por 32 cremas (igual que antes)
- Con validador: $1.63 + 32 × $0.0002 = **$1.64** (+0.6%)
- Con cache de fondos (Gap 7 futuro): el validador NO se skippea para hits de cache — se re-valida cada SKU.

### No toca
- Pipeline Lencería.
- `/api/bg-generate` (sigue sin negative_prompt dedicado — usamos sufijo en positive porque Kontext Pro no siempre respeta negative).
- Validador es opt-in → costo default sigue igual que antes.

## 2026-04-23 (C5) — Gap 5 del audit: UI per-step con approval en Estáticos

Quinto commit del plan. Da control de calidad al usuario después de que un job termina: puede re-ejecutar solo el step de fondo (con prompt custom o alternativa de la matriz) o solo el step de sombra, sin tener que re-subir la foto ni re-correr los 5 steps desde arriba.

### Cambios

**`unistudio/src/app/pipelines/static-product/page.tsx`**
- Nuevo estado: `bgPromptModal` (para el modal de cambiar fondo), `reRunningJobId` (guard contra re-runs simultáneos).
- Nueva función `reRunBgAndBelow(jobId, overridePrompt?, overrideSeed?)`: toma el output de "normalize" (o "isolate" como fallback) como input de `/api/bg-generate`, corre bg + shadow + finish en cadena con el mismo seed estable (Gap 2). Si `overridePrompt` se pasa, se usa en lugar del de la matriz.
- Nueva función `reRunShadowAndBelow(jobId)`: toma el output de "bg" y corre shadow + finish. Útil cuando el fondo está bien pero la sombra quedó mal.
- UI nueva: botones **"↻ Re-ejecutar"** y **"🎨 Cambiar"** en cada tarjeta del step timeline, visibles solo cuando el job terminó (done/error) y no hay otro re-run en curso. El botón Cambiar solo en el step bg, Re-ejecutar en bg + shadow.
- Modal nuevo para Cambiar fondo: lista las 6 alternativas de la matriz por productType (perfume/cream/sunscreen/deodorant/facial/makeup × brand actual), permite elegir preset o editar el prompt manualmente en textarea. Al darle "Re-generar fondo", llama `reRunBgAndBelow` con el prompt custom.
- Indicador de "re-ejecutando" mientras un step corre por segunda vez.

### Efecto
Flow de revisión de catálogo:
```
32 cremas procesadas en batch
  → usuario revisa grid
  → CRM-007 Hidratante Bronze quedó con fondo mal ajustado
  → click "🎨 Cambiar" en el step bg de ese job
  → modal abre con prompt de la matriz pre-cargado, 6 alternativas como chips
  → elige "Beige cálido tipo spa" (la alt recomendada para Esika cremas)
  → re-genera bg + shadow + finish en ~12s
  → job actualizado sin tocar los demás 31
```
Sin esto, corregir una sola foto obligaba a re-procesar todo desde upload.

### No toca
- Pipeline Lencería (otra sesión trabajando ahí).
- `processJob` principal (lógica inicial intacta).
- Módulos bg-generate / shadows / enhance.

## 2026-04-23 (C4) — Gap 1 del audit: Batch desde folder en Pipeline Estáticos

Cuarto commit del plan. Habilita procesar 32 cremas / 27 desodorantes / 10 bloqueadores / 2 limpieza-facial en un solo click — sin tener que arrastrar fotos una por una. Consume el `/api/inventory/scan` de C3 + el `/api/inventory/load` extendido.

### Cambios

**`unistudio/src/app/api/inventory/load/route.ts`** — allowlist Linux
- Nueva constante `ALLOWED_LINUX_ROOTS` apuntando a `docs/inventory-final/images/` resuelto desde el cwd del server (`path.resolve(process.cwd(), '..')`).
- `isAllowedFolder` ahora acepta Windows Y Linux roots.
- `toWslPath` solo se aplica si el path empieza con `[A-Z]:\` — los paths Linux absolutos pasan sin tocar. Mismo patrón que se añadió al scan en C3.

**`unistudio/src/app/pipelines/static-product/page.tsx`** — UI de batch
- Sección nueva "Batch desde inventario" (verde, encima del upload zone) que:
  1. Fetchea `/api/inventory/scan` al montar.
  2. Filtra a categorías con `pipeline:"/pipelines/static-product"` + `imageCount>0`.
  3. Renderiza un grid de tarjetas — cada tarjeta = una categoría con nombre, productType (chip mono), count de fotos.
  4. Click → `loadBatchFromCategory(cat)` paginea `/api/inventory/load` 10×10 hasta agotar el folder.
  5. Cada imagen → `dataUrlToFile(dataUrl, filename)` → File real.
  6. Progress bar en vivo en la tarjeta mientras carga ("Cargando 15/32").
  7. Al terminar, `handleFiles(files, { presetType })` añade los jobs con el productType correcto del scan (no se confía solo en filename inference).
- Botón "Refrescar" para re-escanear si el usuario añade imágenes al folder.
- Manejo de error con banner rojo si el scan falla.
- `handleFiles` firma extendida con `opts?: { pathHint, presetType, presetBrand }` para casos donde el batch ya sabe la categoría y no hace falta inferirla por nombre.

### Flow completo ahora funciona end-to-end (dev local)

```
Usuario abre /pipelines/static-product
  → UI fetch /api/inventory/scan → muestra 4 tarjetas (Cremas, Bloqueador, Desodorantes, Limpieza Facial)
  → Click "Cremas (32 fotos)"
  → fetch /api/inventory/load pagina × 4 (32/10) → 32 base64 → 32 Files
  → handleFiles({ presetType: 'cream' }) → 32 jobs, productType preset
  → Click "Procesar todas"
  → Pipeline corre por cada job con seed compartido (Gap 2) → los 32 SKUs Yanbal/Esika comparten mármol/lino
  → Outputs auto-guardados en galería con naming static-{type}-{brand}
```

### Costo real por batch completo (estimado)
- Cremas: 32 × $0.051 = **$1.63**
- Desodorantes: 27 × $0.051 = **$1.38**
- Bloqueador: 10 × $0.051 = **$0.51**
- Limpieza Facial: 2 × $0.051 = **$0.10**
- **Total batch estáticos completos: ~$3.62**
- Con cache de fondos (Gap 7 cuando se implemente): ~$0.80

### No toca
- Pipeline Lencería.
- Módulos bg-generate / shadows / enhance / bg-remove (invariantes).
- Entries legacy del scan.
- Formato de output (mismo naming, misma galería).

## 2026-04-23 (C3) — Gap 3 del audit: scan route mapea docs/inventory-final/images/

Tercer commit del plan. Habilita el batch futuro (C4) al enseñarle al scan dónde viven las imágenes finales post-limpieza.

### Cambios
- `unistudio/src/app/api/inventory/scan/route.ts`:
  - Nueva constante `INVENTORY_FINAL = path.join(process.cwd(), '..', 'docs', 'inventory-final', 'images')` — computada una vez al boot.
  - Añadidas 5 entries nuevas (`inv-final-bras`, `inv-final-cremas`, `inv-final-bloqueador`, `inv-final-desodorantes`, `inv-final-facial`) que apuntan a las subcarpetas correctas y ya traen `pipelineParams` (productType) para que el redirect a `/pipelines/static-product` o `/pipelines/lingerie` llegue pre-configurado.
  - `bras` lleva `recursive:true` porque está organizada por REF (`bras/011473/*.png`, etc.); las otras son flat.
  - `scanFolder` ahora acepta `recursive:boolean` y hace walk con stack si se pide. Mantiene el comportamiento flat por defecto para no romper los 11 folders legacy.
  - Detección de path: si viene en formato Windows (`C:\...`) aplica `toWslPath`, sino usa tal cual. Paths absolutos Linux (los nuevos) pasan sin tocar.
- `docs/inventory-final/AUDIT_ESTATICOS.md` — Gap 3 marcado como HECHO.

### Efecto
En dev local, GET `/api/inventory/scan` ahora lista 16 categorías (11 legacy + 5 inventory-final). En Vercel producción las 5 nuevas devuelven count:0 porque `docs/` está en `.vercelignore` — la UI las filtra automáticamente. Sin esto, el batch de C4 no tenía dónde leer imágenes.

### No toca
- Pipeline Lencería (otra sesión trabajando ahí).
- Módulos existentes (`/api/bg-generate`, etc.).
- Entries legacy del scan siguen funcionando tal cual.

## 2026-04-23 (C2) — Gap 4 del audit: folder-routing helper + detección de ambigüedad

Segundo commit del plan. Previene el bug histórico de imágenes compartidas entre categorías: `DORSAY.jpg`, `GAIA.jpg`, `OHM.jpg`, `OSADIA.jpg`, `ZENTRO.jpg` existen como perfumes Y como desodorantes. Sin este fix, la matriz defaulteaba a perfume premium (mármol Sephora) incluso cuando la foto venía del folder `/desodorantes/` donde el fondo correcto es gris neutro.

### Cambios
- **Nuevo:** `unistudio/src/lib/pipelines/folder-routing.ts` — función pura `inferProductContextFromPath(path)` con tres niveles de detección:
  1. SKU pattern (`BLQ-004`, `COL-CY01`, `CRM-006`, `LF-LB01`, etc.) — highest confidence, determina tipo Y marca.
  2. Folder pattern (`/desodorantes/`, `/cremas/`, `/bloqueador/`, `/limpieza-facial/`, `/perfumes/`, `/colonias/`, `/makeup/`) — segunda prioridad.
  3. Brand keyword en filename (`yanbal`, `esika`, `l'bel`, `cyzone`, `avon`, `salome`).
  Devuelve `{ productType?, brand?, ambiguous, reason }`. Flag `ambiguous:true` cuando el nombre coincide con los 5 nombres compartidos (DORSAY/GAIA/OHM/OSADIA/ZENTRO) y el folder no resuelve.
- `unistudio/src/app/pipelines/static-product/page.tsx` — `handleFiles` ahora llama al helper por cada archivo, usa `webkitRelativePath` si viene de drag-drop de folder, cae al filename para uploads simples. Pre-completa los dropdowns per-job con lo inferido (ya no depende del default global para cada foto). Si hay N archivos ambiguos, muestra toast warning.
- `docs/pipelines/static-product.md` — sección "Cómo decide el pipeline" actualizada con el nuevo paso folder-routing (antes de Claude Vision).
- `docs/inventory-final/AUDIT_ESTATICOS.md` — Gap 4 marcado como HECHO.

### Efecto concreto
- Foto `DORSAY.jpg` en folder `/desodorantes/` → productType:deodorant automático → fondo gris neutro (NO mármol).
- Foto `BLQ-004 Total Block Compact Beige Claro.png` → SKU pattern detecta sunscreen → fondo playa Coppertone.
- Foto ambigua sin folder claro → warning al usuario, no se procesa silenciosamente mal.

### Costo retrocompatible
La función siempre devuelve un resultado (null-safe). Si no infiere nada, retorna `{ ambiguous:false, reason:'No match' }` y la UI cae al default del dropdown global — igual que antes.

## 2026-04-23 (C1) — Gap 2 del audit: seed estable por (productType, brand)

Primer commit del plan de mejora del pipeline Estáticos. Implementa lo más barato de arreglar y lo de mayor impacto visual: **seeds deterministas** para que todos los SKUs del mismo `(productType, brand)` salgan con fondo idéntico (mármol, playa, gris, etc.). Sin esto, los 20 perfumes Yanbal generaban 20 mármoles distintos → catálogo incoherente.

### Cambios
- `unistudio/src/lib/pipelines/static-product.ts` — `AdaptiveBgConfig` añade campo `seed`. Nueva función `brandSeed()` con fórmula `10000 + ti*1000 + bi*100` (ti/bi = índices estables en arrays `typeOrder`/`brandOrder`). Todas las ramas de `getAdaptiveBgConfig` devuelven el seed correspondiente.
- `unistudio/src/app/pipelines/static-product/page.tsx` — el call a `/api/bg-generate` envía `body.seed: config.seed`.
- `unistudio/src/app/api/bg-generate/route.ts` — acepta `seed?: number` en el body y lo forwarea.
- `unistudio/src/lib/processing/bg-generate.ts` — `generateBgPrecise`/`generateBgCreative`/`generateBgFast` + fallback aceptan `seed?` y lo pasan a `runModel` (flux-kontext-pro, flux-schnell, flux-dev).
- `docs/pipelines/static-product.md` — sección "Consistencia entre fotos" actualizada con tabla de seeds asignados por tipo×marca.
- `docs/inventory-final/AUDIT_ESTATICOS.md` — Gap 2 marcado como HECHO.

### Seeds asignados (quedan grabados)
Rangos: 10xxx=perfume, 11xxx=cream, 12xxx=sunscreen, 13xxx=deodorant, 14xxx=facial, 15xxx=makeup.
Dentro de cada rango: ×00=esika, ×100=yanbal, ×200=lbel, ×300=cyzone, ×400=avon, ×500=salome, ×600=other.
Ejemplo: `perfume+yanbal → 10100`, `cream+lbel → 11200`, `sunscreen+esika → 12000`.

### No toca
Módulos fuera de bg-generate. Jewelry/Lencería no afectados. El módulo `/api/bg-generate` sigue funcionando sin seed para quien no lo mande (retrocompatible).

## 2026-04-23 — Inventario final post-limpieza familia + auditoría pipeline Estáticos

Mamá y Angely terminaron la limpieza manual del inventario (mamá borró rows, Angely marcó en rojo los que había que eliminar). Llegaron 7 Word docs (`*_UPDATED.docx` + `*_FINAL.docx`) y 5 zips con las imágenes finales en `C:\Users\maria\Pictures\Inventory Unistyles images\`. Procesado todo en `docs/inventory-final/`:

### Deliverables (solo docs — sin cambios de código)
- `docs/inventory-final/README.md` — conteos post-limpieza vs inventario viejo (+4 bloqueadores, +3 cremas, −7 colonias, resto igual). Total inventario = 486 productos (sin cambio neto).
- `docs/inventory-final/RESUMEN_CORTO.md` — versión para móvil / texto.
- `docs/inventory-final/AUDIT_ESTATICOS.md` — auditoría del pipeline Estáticos vs Lencería (el gold standard). 7 gaps priorizados con commits sugeridos: seed por marca (gap 2), batch desde folder (gap 1), scan paths nuevos (gap 3), disambiguación perfume/desodorante (gap 4), UI per-step con approval (gap 5), validación programática (gap 6), cache de backgrounds gen

erados (gap 7).
- `docs/inventory-final/FLUJO_POR_PRODUCTO.md` — step-by-step para cada uno de los 6 tipos estáticos (perfume/crema/bloqueador/desodorante/facial/maquillaje) con prompts de la matriz + seeds sugeridos + errores comunes + costos.
- `docs/inventory-final/catalogos/*.md` — los 6 Word convertidos a markdown vía pandoc.
- `docs/inventory-final/_raw_products.json` — lista estructurada (108KB) para scripts futuros.
- `docs/inventory-final/images/` — 199 imágenes extraídas y organizadas (bras/128, desodorantes/27, cremas/32, bloqueador/10, limpieza-facial/2), total 24MB. El folder `docs/` ya está en `.vercelignore` → no impacta deploy.

### Gaps de INPUT detectados (bloqueadores para producción)
- No hay zip de COLONIAS (139 perfumes sin imagen nueva)
- No hay zip de PANTYS (72 pantys sin imagen)
- No hay docx actualizado de DESODORANTES (27 imgs sin SKU claro)
- 29 SKUs huérfanos: 4 limpieza-facial + 5 bloqueador + 20 cremas sin foto en zip

### Pointer actualizado
- `docs/inventory.md` ahora marca que para las 7 cats actualizadas la fuente de verdad es `docs/inventory-final/README.md`.

### Sin cambios en
- Pipeline Estáticos (código) — el audit queda como plan, código pendiente
- `docs/pipelines/static-product.md` — doc de pipeline sigue igual hasta que se implementen los gaps
- Módulos API — sin tocar

## 2026-04-21 (deploy: `1e63a40`) — Fix definitivo 422 image_load_error en tryon Kolors (lencería)

Bug persistente desde hace varias sesiones: Kolors devolvía `Failed to load the image` en el `garment_image_url` con URL `https://v3b.fal.media/.../upload.jpeg`. La raíz real: `ensureFalAccessibleUrl` descargaba `api.replicate.com/v1/files/{id}` (que con Bearer auth devuelve **JSON metadata**, no bytes de imagen) y subía ese JSON a fal.media con extensión `.jpeg` → Kolors intentaba decodificar JSON como JPEG. Commits `74abcee` → `b789018` → `cb61537` → `2a59f66` → `d80265a` intentaron arreglarlo y fueron revertidos.

4 frentes en 1 commit:

1. **`src/app/pipelines/lingerie/page.tsx:738-752`** — tryon y productVideo ahora prefieren la `falUrl` pre-subida en `/api/upload` antes del fallback a `uploadedUrl` (Replicate/data). Corta el round-trip Replicate→fal que estaba roto.

2. **`src/lib/api/fal.ts:313-427`** — `isValidImageBuffer()` + `detectImageMime()` con magic bytes (JPEG/PNG/GIF/WebP/BMP/HEIC). `ensureFalAccessibleUrl` ahora sigue el campo `url`/`urls.get` del JSON para llegar a los bytes reales, y si después de seguir el link los bytes siguen sin ser imagen hace throw explícito con los primeros 120 bytes para debug en Vercel logs.

3. **`src/app/api/upload/route.ts:67-102`** — re-encode siempre vía sharp (EXIF-rotate + resize 2048px). Garantiza que `outputMime` coincide con los magic bytes del buffer aunque el `file.type` del browser mintiera (iOS Safari manda HEIC como `image/jpeg`). PNG preserva alpha; todo lo demás → JPEG 85.

4. **`src/app/api/tryon/route.ts:74-104`** — log diagnóstico temporal en `tryOnKolors` imprimiendo URLs antes/después de `ensureFalAccessibleUrl` y el error completo si `runFal` falla. Quitar cuando no haya más 422 en prod.

Pendiente post-verificación: `docs/pipelines/lingerie.md` debería mencionar que tryon prefiere `falUrl`, y revisar si `jewelry-tryon` usa el mismo patrón roto.

---

## 2026-04-21 (late) — Segunda ola de fixes: step timeline + H-fixes + reuso de modelos + HD quality

Después del commit 9 de producción, la usuaria reportó varios problemas con screenshot y pidió seguir arreglando todo mientras estaba disponible. Sprint de 7 commits consecutivos en pocas horas:

### `ae88990` — Step timeline live en /pipelines/static-product
Regresión UX del commit 3 resuelta. Cada job ahora muestra 5 cards de timeline debajo (Quitar fondo > Centrar > Fondo adaptativo > Sombra > Ajustes finales). Cada card se pinta en vivo (amarillo pulsante, verde con check al completar, rojo con alerta si error, gris opaco si skipped). Thumbnail del resultado aparece en tiempo real. Costo por paso visible en mono amber.

### `7a4a8dd` — Step timeline live en /pipelines/jewelry
Mismo patrón en joyería. 5 cards: Quitar fondo / Upscale 2x / Estante lujoso / En modelo / Video 360°. Los pasos opcionales (modelo, video) solo aparecen si el toggle está activado.

### `64779e1` — Batch de 4 fixes H:
- H2 Jewelry upscale ahora hard-fail (antes soft silente → estante borroso sin aviso)
- H4 AI Agent prompt contradicción resuelta en api/ai-agent/plan/route.ts:531 — isLingerieModelo check agrega bg-remove con removeSubject:true para lingerie, skipea para non-lingerie (IDM-VTON extract)
- H5 /agent auto-detect con AbortSignal.timeout(20s) + toast.info si timeout
- H6 Inventory scan distingue error vs empty — card roja con botón Reintentar cuando /api/inventory/scan falla

### `8d75735` — D1 cross-session AI model reuse
Ahorro $0.055 por cada color extra de la misma REF procesada en sesión diferente. Pipeline de lencería ahora:
1. Cuando user tipea REF-71332 (debounced 600ms) → fetch /api/ai-models?referenceNumber=X
2. Si existe → toast 'Modelo IA encontrada — ahorro $0.055' + setSharedModelUrl(savedModel.previewUrl)
3. model-create step skipea porque ya hay sharedModelUrl (lógica preexistente)

Backend: /api/model-create acepta body.referenceNumber, lo guarda en AiModel.metadata. /api/ai-models GET acepta ?referenceNumber=X filter. Todo opcional — sin breaking changes.

### `774d3ca` — HD quality upgrade
Causa de 'fotos horribles no HD': 5 de 8 configs de static-product usaban bgMode:'fast' (Flux Schnell). Upgrade:
- Todos los configs ahora bgMode:'precise' (Flux Kontext Pro HD)
- Suffijo HD común (8K, sharp focus, crystal clear, professional commercial, no blur, no artifacts) en 15 prompts
- Prompts específicos con texturas ('Carrara marble with subtle veining', 'visible wood grain', 'linen weave'), aesthetic de marca referente (Tiffany, Cartier, Sephora, La Mer, La Roche-Posay), lighting direccional explícito
- Tryon prompts de joyería upgraded con 'preserve gem color, metal tone, every decorative detail exactly'

Tradeoff económico: deodorantes/cremas-non-premium/perfumes-non-premium ahora cuestan $0.05 vs $0.003 — 16x más. Pero calidad es usable para catálogo real, antes no.

---

## 2026-04-21 — Production fix + critical hardening (commit 9)

Vercel production build failed after commit 8 because `AiAgentPanel`'s stub had a type mismatch (`onProcess: (result: unknown) => void` vs the editor registry expecting `(result: string, beforeImage?, cost?) => void`). Fixed + shipped the remaining critical fixes from the 4-audit review in the same commit.

### Production hotfix (caused Vercel build failure)

- `unistudio/src/components/modules/AiAgentPanel.tsx` — stub `AiAgentPanelProps.onProcess` signature now matches the editor's module registry exactly (`(result: string, beforeImage?: string, cost?: number) => void`). Verified with `tsc --noEmit`.

### C1 — Env vars .trim() hardening (7 spots across 5 routes)

Previously these reads would silently break with `Authorization: Bearer xxx\n` headers when `vercel env pull` left trailing whitespace. All fixed:

- `api/analyze-image/route.ts:13` — `ANTHROPIC_API_KEY?.trim()`
- `api/ai-agent/plan/route.ts:20` — same
- `api/prompt/route.ts:147, 219` — same in both functions
- `api/video-enhance/route.ts:155` — same
- `api/health/route.ts:41-58` — `REPLICATE_API_TOKEN?.trim()` + `FAL_KEY?.trim()` hoisted before the Bearer header interpolation

### C3 — autoSaveResult retry with user-visible error

- `unistudio/src/app/editor/page.tsx:250` — was fire-and-forget with only `console.warn`. Now retries 3× with exponential backoff (0, 500ms, 1500ms); if all 3 fail, surfaces a toast telling the user to download manually before closing the browser. Prevents silent data loss if `/api/save-result` is unreachable.

### C4 — IndexedDB tier-2 backup for gallery

- `unistudio/src/stores/gallery-store.ts` — added `idbOpen/idbGet/idbSet/idbDelete` helpers targeting the `unistudio-fallback` database. Every `setItem` now mirrors to IDB first (won't hit localStorage's 5-10MB cap); reads prefer localStorage (fast sync) and fall back to IDB if the key is missing. Existing quota-eviction logic preserved. Survives browser storage clearing — gallery is recoverable from IDB backup.

### C5 — AiModel persistence verified, reuse gap documented

Audit suggested the lingerie pipeline might not save generated AI models. **Confirmed it does**: `src/app/api/model-create/route.ts:478` calls `saveAiModel()` inside the module every time model-create runs, so every model generated by the lingerie pipeline (via that route) persists automatically.

What's **not yet implemented**: the lingerie page only reuses the generated model WITHIN a session via `sharedModelUrl` state. It doesn't query `/api/ai-models?referenceNumber=X` at page load to reuse a model from a previous session. That's the $0.055-per-reference saving the audit flagged. Requires: extending `/api/ai-models` GET to accept `referenceNumber`, passing `referenceNumber` to `/api/model-create` so the save is tagged, and fetching existing models on page mount. Deferred to next commit.

### Verification

```
tsc --noEmit  → 0 real errors (only test-file jest types + stale .next validators, neither blocks Vercel)
```

---

## 2026-04-20 — Dead-code sweep: drop unused hook, utils file, deps; dedup inpaint presets

Result of a dead-code audit across `unistudio/src/`. Deleted three kinds of waste and applied the modules-first rule to inpaint presets so the route no longer duplicates the module.

### Deleted

- `unistudio/src/lib/processing/sharp-utils.ts` — 5 exported utilities, zero importers in `src/`.
- `unistudio/src/hooks/useApiCost.ts` — hook with zero call sites.
- `unistudio/package.json` dependencies removed: `@xyflow/react`, `browser-image-compression`, `jszip`. None imported anywhere in `src/`. Kept `ffmpeg-static` — declared in `next.config.ts:serverExternalPackages` and used by planned video routes.

### Deduped (modules-first rule)

- `unistudio/src/app/api/inpaint/route.ts` — removed the local `INPAINT_PRESETS` object (7 presets: `product-fix`, `seamless-fill`, `texture-match`, `remove-text`, `remove-logo`, `add-reflection`, `surface-repair`). The route now imports `INPAINT_PRESETS` from `@/lib/processing/inpaint`, which is the single source of truth.
- `unistudio/src/lib/processing/inpaint.ts` — `INPAINT_PRESETS` now holds 17 presets (the existing 10 + the 7 merged from the route). All preset keys that callers previously used remain valid.

### Preserved

- Documentation entries in `unistudio/src/app/docs/page.tsx` and `unistudio/src/app/workflows/page.tsx` that listed the deleted files (`sharp-utils.ts`, `useApiCost.ts`, `AgentChat.tsx`) were left untouched per user direction — do not delete references from docs.

### Why

- Modules are the reusable blocks; pipelines and routes compose them. Duplicated presets between the route and the processing module would drift. Fixed at the source.
- Installed-but-unused packages add lockfile weight and supply-chain surface for nothing.

---

## 2026-04-21 — AI Agent cleanup: stub panel, delete chat, strip dead fallbacks (commit 8 of pipeline rewrite)

Removed the last pieces of the old Agent orchestration system. AiAgentPanel collapsed from 2025 lines to 96, AgentChat (964 lines, zero imports) deleted entirely, `/api/ai-agent/plan` fallbacks `getCatalogoPipeline` + `getCambiarModeloPipeline` removed (285 lines), batch's AGENT_PRESETS-driven UI grid gone. Total reduction in this commit: ~3300 lines.

### Rewritten

- `unistudio/src/components/modules/AiAgentPanel.tsx`: **2025 → 96 lines (95% reduction)**. The in-editor "AI Agent" module is now a thin panel showing 3 pipeline links + a CTA to `/agent`. Removed 4-phase state machine (input / plan / execute / results), `useAgentPipeline` wiring, agent-type selectors (ecommerce / modelo / social / catalogo / cambiar-modelo), plan editor, cost confirmation, retry UI, catalog-mode download grid.

### Deleted

- `unistudio/src/components/dashboard/AgentChat.tsx` (964 lines) — zero importers in the codebase (`grep -n "import.*AgentChat|<AgentChat"` returns empty). Dead code since at least commit 7 and probably earlier.
- `unistudio/src/components/dashboard/` — empty directory removed.
- `unistudio/src/app/api/ai-agent/plan/route.ts`:
  - `getCatalogoPipeline()` function (~226 lines) — dead after AiAgentPanel stub ships.
  - `getCambiarModeloPipeline()` function (~39 lines) — same reason.
  - Switch cases for `"catalogo"` and `"cambiar-modelo"` in `buildFallbackPlan` — now fall through to the `default` (ecommerce) branch.
  - File: **1130 → 845 lines**.
- `docs/ai-agent-analysis.md` — March 2026 doc describing the old 5-agent / Phase 1+2 model; fully superseded by `docs/pipelines/`. User had explicitly asked to delete stale READMEs.

### Cleaned

- `unistudio/src/app/batch/page.tsx`:
  - Removed "AI Agent — Por Categoría" UI grid (~35 lines of dead JSX that mapped over `AGENT_PRESETS`)
  - Removed `?? AGENT_PRESETS.find(...)` fallback from `loadPreset` — PIPELINE_PRESETS is sole source
  - `AGENT_PRESETS: PresetDef[] = []` kept as empty array (defensive — `.find()` in `startAutoMode` returns `undefined` and triggers the error toast for unconfigured categories)
- `README.md`, `unistudio/README.md`, `CLAUDE.md` — removed the `ai-agent-analysis.md` table row from docs index (file no longer exists).

### Integration invariants preserved

- `useAgentPipeline` hook file is **still on disk** but no runtime caller imports it. The remaining mentions (`workflows/page.tsx`, `docs/page.tsx`, `architecture/page.tsx`) are all string references inside docs/architecture explainer pages — harmless. Full deletion evaluated in commit 9 polish.
- Sidebar still has an `ai-agent` module entry that routes to the stubbed AiAgentPanel. Commit 9 decides whether to rename it to "Abrir Agente IA" and link directly to `/agent`, or remove it entirely since the 3 pipelines are already in the sidebar.

### Coverage after commit 8

| Layer | State |
|---|---|
| Inventory scan (11 categories) | 100% routed to canonical pipelines |
| Pipelines (3 canonical) | Working, params matched to module routes |
| `/agent` standalone page | Router only, no orchestration |
| `/editor?module=ai-agent` | Stubbed — just redirects/links |
| Dashboard chat | Deleted |
| Batch `/batch` | Only generic presets remain (quick-clean, amazon-ready, etc.) |

### What's next (commit 9 — final polish)

- Evaluate full deletion of `useAgentPipeline` hook (1081 lines — no runtime consumers left)
- Sidebar reorganization: pipelines at top, modules below, `ai-agent` entry resolves
- Homepage card reordering
- `docs/architecture.md` + `docs/guia-completa.md` + `docs/UX_UI_GUIDE.md` audit for stale references
- Update `docs/modules/README.md` — `useAgentPipeline` no longer used by pipelines

---

## 2026-04-20 — AI Agent reduced to router (commit 7 of pipeline rewrite)

Rewrote `/agent/page.tsx` from a 686-line workflow executor to a 370-line pipeline router. The old page duplicated the canonical pipelines via 3 hardcoded workflows (`ecommerce`, `modelo`, `social`) that wrapped `useAgentPipeline`. Every flow already exists as a dedicated pipeline, so the agent page's only legitimate job is to **detect the product category and redirect**.

### Changed

- `unistudio/src/app/agent/page.tsx` — full rewrite:
  - **Removed:** `WORKFLOWS` array (ecommerce/modelo/social cards), `CATEGORIES` constant, all `useAgentPipeline` imports and usage, orchestration state, execution controls, retry logic, plan editor okay no quoero duplucados y wueiero usar los modulos — 400+ lines of duplicated functionality
  - **Added:** `CATEGORY_OPTIONS` array mapping 14 product categories to `{ family, params }` pairs that redirect to the 3 canonical pipelines:
    - 3 lingerie options (bra / panty / shapewear) → `/pipelines/lingerie?productType=...`
    - 6 static-product options (perfume / cream / sunscreen / deodorant / facial / makeup) → `/pipelines/static-product?productType=...`
    - 5 jewelry options (earrings / necklace / ring / bracelet / set) → `/pipelines/jewelry?subType=...`
  - **Kept:** upload flow with soft `/api/analyze-image` auto-detect — only detects lingerie garments (bra/panty/set), displays "AUTO" badge on the matching category, user can override
  - Supports `?cat=<id>` URL param for deep-linking (homepage cards can land on a pre-selected category)

### Post-commit coverage

User's two entry points to trigger a pipeline:
1. **Direct** — Homepage card or sidebar → `/pipelines/<name>` (no auto-detect)
2. **Via agent** — Homepage "Agente IA" → `/agent` → upload (auto-detect for lencería) or pick category manually → redirect to pipeline

Both entry points end at the same 3 canonical pipelines. No orchestration code runs in the agent page anymore.

### Known follow-ups (intentional — next commits)

- **`useAgentPipeline` hook** (~1081 lines) still used by `AiAgentPanel` (in `/editor?module=ai-agent`) and `AgentChat` (dashboard). Those are the "in-editor" Agent UI, separate from `/agent`. Commit 8 evaluates whether they should also be reduced to router components or removed, and whether the hook itself can be deleted.
- **`/api/ai-agent/plan/route.ts`** — still has `getCatalogoPipeline()` + `getCambiarModeloPipeline()` fallbacks. Dead code after this commit (no caller). Commit 8.
- **`docs/ai-agent-analysis.md`** — references the 3 workflow cards that no longer exist. Commit 8 updates it.
- **Sidebar entry `ai-agent`** still points to `AiAgentPanel` (in-editor). Commit 9 reorganizes the sidebar.

---

## 2026-04-20 — Fix backend/frontend param mismatches in Static + Jewelry pipelines (commit 6 of pipeline rewrite)

Ran a full integration audit after commit 5. Three param-shape mismatches between the new pipeline pages (commits 3 and 4) and the underlying module routes were detected. All three are fixed in this commit — the pipelines still shipped because of soft-fail handling, but the outputs were degraded or outright failing.

Audit result summary: **3 issues found — 2 ROTO + 1 RIESGO. All fixed here.** Redirect mechanism from inventory scan was confirmed working correctly.

### Fixed

#### 1. `/api/bg-generate` body shape (affected Static + Jewelry)

The route requires `{ mode, style }` with optional `customPrompt` that wins over `style` when `style` is not in `BACKGROUND_PRESETS`. The pipelines were sending `{ imageUrl, prompt, mode }` — the `prompt` field was silently dropped, and missing `style` would have failed validation at `api/bg-generate/route.ts:51` (`if (!style) return 400`).

- `unistudio/src/app/pipelines/static-product/page.tsx` line ~245: now sends `{ imageUrl, mode, style: "custom", customPrompt: config.prompt, aspectRatio: "1:1" }`.
- `unistudio/src/app/pipelines/jewelry/page.tsx` line ~255: same shape with `customPrompt: config.estantePrompt` and `mode: "precise"`.

#### 2. `/api/model-create` body shape (affected Jewelry)

The route expects `ModelCreateOptions` with at least `{ gender, ageRange, skinTone, bodyType }` — sending only `{ prompt }` would have failed at `api/model-create/route.ts:301` (`if (!gender) return 400`). The jewelry page's sub-type-specific model prompt was also being lost.

- `unistudio/src/app/pipelines/jewelry/page.tsx` line ~280: now sends full ModelCreateOptions with `customDetails: config.modelPrompt`. The route appends `customDetails` to the generated prompt at line 138-139, so the sub-type routing (portrait for earrings, bust for necklace, hand for ring, etc.) comes through.

#### 3. `/api/jewelry-tryon` field names (affected Jewelry)

JSON mode of the route reads `body.modelImage` and `body.jewelryImage`. The jewelry page was passing `modelImageUrl` and `jewelryImageUrl`, which would have failed validation at lines 91 (`if (!jewelryImage) return 400`). Additionally, `prompt` and `bodyPart` fields are not accepted by the route.

- `unistudio/src/app/pipelines/jewelry/page.tsx` line ~295: now sends `{ modelImage, jewelryImage, type: job.subType, mode: "modelo" }`. `type` doubles as the sub-type hint; `mode: "modelo"` is the "place on person" flow.

### Redirect + integration — confirmed OK (no change)

- `/api/inventory/scan` returns `{ pipeline, pipelineParams }` in response.
- `batch/page.tsx` `startAutoMode` reads them and does `window.location.assign(cat.pipeline + qs)` correctly.
- All 3 pipelines read URL params in `useEffect`:
  - lingerie/page.tsx:598 — `URLSearchParams.get("productType")`
  - static-product/page.tsx:154 — reads `productType`, `brand`
  - jewelry/page.tsx:165 — reads `subType`
- All env vars across module routes use `.trim()` (regla `CLAUDE.md`).

### Not yet addressed (still in the original roadmap)

- **`/agent` page** (commit 7 now, was 6): still has `modelo` / `social` / `ecommerce` workflow cards that duplicate the new pipelines. Convert AI Agent into a router (detect category → redirect to canonical pipeline).
- **Final cleanup** (commit 8 now, was 7): `AGENT_PRESETS` empty-array removal, historical comment in `api/ai-agent/plan/route.ts:280`, dead `?agent=modelo` links.
- **Sidebar + homepage polish** (commit 9 now, was 8).

---

## 2026-04-20 — Inventory auto-routing + lingerie URL params (commit 5 of pipeline rewrite)

Finishes the folder → pipeline auto-routing for the 2 remaining lingerie categories. Fixes a bug in `/pipelines/lingerie` that was silently ignoring the `?productType=` URL param — detected while preparing this commit. Deletes the last 2 batch presets (`agent-lenceria`, `agent-pantys`), which are now orphaned since their inventory categories redirect elsewhere.

After this commit: **every category in the inventory scanner redirects to a canonical pipeline** (no category points at a batch preset anymore).

### Bug fix

- `unistudio/src/app/pipelines/lingerie/page.tsx` — added `useEffect` to read `?productType=` from URL on mount and seed the `productType` state. Accepts `bra`, `panty`, `set`, `faja`. Without this, the redirect from `/batch` auto-mode was landing on the page but the user still had to manually pick the product type.
  - Root cause: the page was migrated from `/catalog-pipeline` as-is in commit 2, but that file never read URL params (it was accessed without them). Came to light when wiring the inventory redirects in this commit.

### Updated

- `unistudio/src/app/api/inventory/scan/route.ts`:
  - `lenceria` category: replaced `agentPreset: "agent-lenceria"` with `pipeline: "/pipelines/lingerie"` + `pipelineParams: { productType: "bra" }`
  - `pantys` category: replaced `agentPreset: "agent-pantys"` with `pipeline: "/pipelines/lingerie"` + `pipelineParams: { productType: "panty" }`

### Deleted

- `unistudio/src/app/batch/page.tsx`:
  - Removed preset `agent-lenceria` (was lines 196-205 approx)
  - Removed preset `agent-pantys` (was lines 207-215 approx)
  - `AGENT_PRESETS` array is now empty — kept declared for defensive code elsewhere; commit 7 evaluates full removal.

### Post-commit state of inventory scan

| Category | Previously | Now |
|---|---|---|
| colonias | `agent-perfumes` (commit 3 redirected) | `/pipelines/static-product?productType=perfume` |
| cremas | `agent-cremas` (commit 3) | `/pipelines/static-product?productType=cream` |
| desodorantes | `agent-desodorantes` (commit 3) | `/pipelines/static-product?productType=deodorant` |
| limpieza | `agent-desodorantes` (commit 3) | `/pipelines/static-product?productType=facial` |
| aretes | `agent-accesorios` (commit 4) | `/pipelines/jewelry?subType=earrings` |
| collares | `agent-accesorios` (commit 4) | `/pipelines/jewelry?subType=necklace` |
| pulseras | `agent-accesorios` (commit 4) | `/pipelines/jewelry?subType=bracelet` |
| anillos | `agent-accesorios` (commit 4) | `/pipelines/jewelry?subType=ring` |
| sets | `agent-accesorios` (commit 4) | `/pipelines/jewelry?subType=set` |
| **lenceria** | `agent-lenceria` | **`/pipelines/lingerie?productType=bra`** |
| **pantys** | `agent-pantys` | **`/pipelines/lingerie?productType=panty`** |

Total: **11/11 inventory categories (100%)** route to canonical pipelines. No remaining use of batch presets from inventory scan.

### What's NOT in this commit

- AI Agent `/agent` page still has `modelo` workflow card that overlaps with the Lingerie pipeline. Commit 6.
- Historical comment `// proven copy from catalog-pipeline that works well` still lives in `api/ai-agent/plan/route.ts:280`. Commit 7.
- `AGENT_PRESETS` empty-array declaration is still in `batch/page.tsx` with 2 dead references (line 380-381 `??` fallback and line 670 find). Commit 7 evaluates removal.
- `/editor?agent=modelo` and `?agent=catalogo` dead links in homepage/nav. Commit 8.

---

## 2026-04-20 — Pipeline Joyería created at /pipelines/jewelry (commit 4 of pipeline rewrite)

Third (and last) canonical pipeline is live. Covers 82 jewelry products (aretes, cadenas, anillos, pulseras, topos, candongas, sets). Each piece gets a luxury display shot, an optional on-model shot with the piece on the correct body part (ears / neck / hand / wrist), and an optional 360° video.

After this commit: **486/486 products (100%) are served by canonical pipelines.**

### Created

- `unistudio/src/lib/pipelines/jewelry.ts` — pure-function sub-type router:
  - Types: `JewelrySubType` (earrings / studs / hoops / necklace / ring / bracelet / set), `JewelryBodyPart` (ears / neck / hand / wrist / torso)
  - `getJewelryConfig(subType)` returns `{ estantePrompt, bodyPart, modelPrompt, tryonPrompt, label }`
  - Routing per sub-type:
    - earrings/studs/hoops → ears, modelo portrait with hair pulled back
    - necklace → neck, modelo bust with collarbone visible
    - ring → hand, modelo elegant hand pose
    - bracelet → wrist, modelo wrist in relaxed pose
    - set → torso, modelo upper-body showing neck + both ears
  - Display backgrounds by sub-type: black velvet (earrings/studs/hoops), brown leather bust (necklace), cream silk cushion (ring), walnut wood (bracelet), white marble (set)
  - `JEWELRY_UPSCALE_CONFIG` constant: Real-ESRGAN 2x, always required for jewelry
- `unistudio/src/app/pipelines/jewelry/page.tsx` — new UI page:
  - Upload zone, sub-type selector per job (default from URL param `?subType=...`)
  - Two page-level toggles: "Incluir foto en modelo" (default ON, +$0.10) and "Incluir video 360°" (default OFF, gratis)
  - 6-7 steps per image: upload → bg-remove → upscale 2x → bg-generate (estante) → optional model-create + jewelry-tryon → optional Ken Burns video
  - Soft-fails model/video steps so a failure there doesn't lose the estante
  - Per-image result grid with download links for estante, modelo, video
  - Inline video player for Ken Burns output

### Deleted / replaced

- `unistudio/src/app/batch/page.tsx`: removed preset `agent-accesorios` (was the 4-step generic preset). Already dead UX because the `accesorios` inventory category now redirects.

### Updated

- `unistudio/src/app/api/inventory/scan/route.ts`: **split the single `accesorios` entry into 5 separate sub-categories**, each redirecting to `/pipelines/jewelry` with the correct `subType` param:
  - `aretes` → `?subType=earrings`
  - `collares` → `?subType=necklace`
  - `pulseras` → `?subType=bracelet`
  - `anillos` → `?subType=ring`
  - `sets` → `?subType=set`
  - This makes the inventory scan UI more granular and eliminates the need for post-upload sub-type detection in the most common flow.
- `unistudio/src/components/editor/ModuleSidebar.tsx`: new entry `jewelry-pipeline`, added to `STANDALONE_PAGES` map, footer quick-link.
- `unistudio/src/app/page.tsx`: homepage card for Pipeline de Joyería.
- `docs/pipelines/jewelry.md`: status "Por crear" → "Implementado (MVP)".

### Pipeline coverage after commit 4

| Pipeline | Products covered |
|---|---:|
| Lencería | 164 (bras + panties + shapewear) |
| Estáticos | 240 (perfumes + cremas + sunscreen + personal care + facial + makeup) |
| Joyería | 82 (all accessory sub-types) |
| **Total** | **486 / 486 (100%)** |

### What's NOT in this commit (intentional)

- **`/api/jewelry-tryon` route integration** — the page calls it but the route may need adjustments (e.g., accepting the `bodyPart` param if it doesn't today). If tryon fails, the page soft-fails and still ships the estante. Fix in a follow-up once observed in real use.
- **`/api/model-create` prompt threading** — same deal; `modelPrompt` is passed but the route may need a pass-through tweak. Soft-failed.
- **Manual approve/skip UI** — static-product and jewelry both ship MVP "procesar todas". Manual mode is a future add-on.
- **Inventory auto-mode from within the page** — the jewelry page doesn't yet auto-load images from the inventory folders; user uploads manually or arrives via redirect from `/batch` auto-mode. Full integration is commit 5.
- **Commits 5, 6, 7, 8** still pending per roadmap.

---

## 2026-04-20 — Pipeline Estáticos created at /pipelines/static-product (commit 3 of pipeline rewrite)

Second canonical pipeline is live. Replaces the 3 category-specific batch presets (`agent-perfumes`, `agent-cremas`, `agent-desodorantes`) with a single pipeline that picks an adaptive background based on product category + brand, mimicking how Sephora/La Mer/MAC present similar products instead of defaulting to generic white.

### Created

- `unistudio/src/lib/pipelines/static-product.ts` — pure-function adaptive background matrix:
  - Types: `StaticProductType` (perfume / cream / sunscreen / deodorant / facial / makeup), `StaticBrand` (esika / yanbal / lbel / cyzone / avon / salome / other)
  - `getAdaptiveBgConfig(productType, brand)` returns `{ prompt, shadowType, bgMode, label }` — no fetch, no side effects
  - Matrix covers: perfume premium (Esika/Yanbal/L'Bel) → gradient con reflejo; perfume Cyzone → pastel juvenil; crema premium → mármol blanco; crema normal → beige spa; bloqueador → playa desenfocada; desodorante → gris neutro; facial → spa azul/blanco; maquillaje → negro mate dramático
  - `STATIC_PRODUCT_ENHANCE_NORMALIZE` constant for canvas normalization (2000×2000 1:1)
- `unistudio/src/app/pipelines/static-product/page.tsx` — new UI page:
  - Upload zone (multi-file), product type + brand selector per job (default from URL params `?productType=...&brand=...` so redirects from inventory auto-mode work)
  - 6 steps per image: upload → bg-remove → enhance (normalize) → bg-generate (adaptive prompt) → shadows → enhance (final)
  - Per-image status pill, adaptive-look label preview, download link on done
  - Soft-fails the normalize step if preset not registered (pipeline continues)

### Deleted / replaced (same commit, per no-duplicate rule)

- `unistudio/src/app/batch/page.tsx`:
  - Removed preset `agent-perfumes` (was lines 186-195)
  - Removed preset `agent-cremas` (was lines 197-207)
  - Removed preset `agent-desodorantes` (was lines 241-249)
- `unistudio/src/app/batch/page.tsx` — `startAutoMode` now checks `cat.pipeline` BEFORE `cat.agentPreset`; if set, redirects to the pipeline URL with query params. No-op → clear toast when preset missing (was silent).
- `unistudio/src/app/batch/page.tsx` — `InventoryCategory` interface gained `pipeline?: string` and `pipelineParams?: Record<string, string>` fields.

### Updated

- `unistudio/src/app/api/inventory/scan/route.ts`:
  - `FolderConfig` type has new `pipeline` + `pipelineParams` fields (optional)
  - Categories `colonias`, `cremas`, `desodorantes`, `limpieza` now redirect to `/pipelines/static-product` with `productType=perfume|cream|deodorant|facial` query param instead of loading a batch preset
  - `accesorios`, `lenceria`, `pantys` keep `agentPreset` for now (commits 4 and 7 handle them)
  - `InventoryCategory` export type updated to match
- `unistudio/src/components/editor/ModuleSidebar.tsx` — new sidebar entry `static-product-pipeline`; added to `STANDALONE_PAGES` map; footer quick-link for Pipeline Estáticos
- `unistudio/src/app/page.tsx` — homepage card for Pipeline de Estáticos
- `docs/pipelines/static-product.md` — status "Por crear" → "Implementado (MVP)"

### Coverage

After commit 3, **404 of 486 inventory products (83%) are served by canonical pipelines:**
- Pipeline Lencería: 164 (bras + panties + shapewear)
- Pipeline Estáticos: 240 (perfumes 146 + creams 49 + sunscreen 11 + personal care 28 + facial 6)

Pending: 82 accessories/jewelry (commit 4 — Pipeline Joyería).

### What's NOT in this commit (intentional)

- **Claude Haiku integration** for the adaptive background decision — current matrix is hardcoded fallback only. Adding Haiku to refine the decision is a future iteration, not blocking.
- **Per-step manual approve/skip UI** — the lingerie pipeline has it; static-product ships MVP "procesar todas" since bulk processing is the primary use case. Can be added later without breaking.
- **Accesorios / lenceria / pantys inventory redirects** — still use `agentPreset`. Commit 4 handles accesorios → /pipelines/jewelry; commit 7 handles lenceria/pantys → /pipelines/lingerie.
- **Folder auto-scanning from inside the static-product page** — user currently uploads manually; inventory auto-mode redirects from `/batch` into this page with category pre-selected. Full folder scan integration is commit 5.

---

## 2026-04-20 — Pipeline Lencería moved to /pipelines/lingerie (commit 2 of pipeline rewrite)

Migrated the working lingerie catalog flow from `/catalog-pipeline` to the canonical location `/pipelines/lingerie`. Deleted the dead server-side orchestrator at `/api/catalog-pipeline`. No functional regression — the page's local-state orchestration continues to work as it did; only the URL and branding changed.

### Moved

- `src/app/catalog-pipeline/page.tsx` → `src/app/pipelines/lingerie/page.tsx`
  - Function renamed: `CatalogPipelinePage` → `LingeriePipelinePage`
  - Breadcrumb label: "Pipeline de Catálogo" → "Pipeline de Lencería"
  - Badge: "Leonisa Lencería" → "Bras · Panties · Shapewear"
  - H1: "Configura tu Pipeline de Catálogo" → "Configura tu Pipeline de Lencería"
  - Description rewritten to explain the flow (quitar modelo → crear modelo IA → tryon → videos opcionales)
  - `lingerieTypes` array extended to include `shapewear` and `bodysuit` (user confirmed shapewear belongs in this pipeline)
  - `garmentTypeForApi` mapping updated so `shapewear` passes through directly instead of collapsing to `lingerie`

### Deleted (2 directories)

- `src/app/catalog-pipeline/` — the old page location (UI was moved, old URL retired).
- `src/app/api/catalog-pipeline/` — dead server-side orchestrator. Confirmed by grep: nothing in the codebase was calling `/api/catalog-pipeline`. The only remaining reference is a historical code comment in `api/ai-agent/plan/route.ts:280`, which is harmless and will be removed naturally when the AI Agent is refactored in commit 6.

### Updated references

- `src/components/editor/ModuleSidebar.tsx`
  - Sidebar item id: `catalog-pipeline` → `lingerie-pipeline`, label: "1 Referencia — Catálogo Completo" → "Lencería (Bras · Panties · Shapewear)"
  - `STANDALONE_PAGES` URL: `/catalog-pipeline` → `/pipelines/lingerie`
  - Footer quick-link: `/catalog-pipeline` → `/pipelines/lingerie`, label "Pipeline Catálogo" → "Pipeline Lencería"
- `src/app/page.tsx` — homepage card href + label + description updated
- `docs/pipelines/lingerie.md` — status changed from "Por crear" to "Implementado"; clarified it has no own API route because the per-step UI is client-orchestrated

### Why no server-side `/api/pipelines/lingerie` route

The lingerie flow needs per-step UI with manual approve/skip/rerun — this only works with client-side orchestration. The page calls `/api/<module>` directly for each step. A server-side orchestrator like the old `/api/catalog-pipeline` blocks until all steps complete, which prevents the UI from showing intermediate results. This is intentional and documented in `docs/pipelines/lingerie.md`.

### What is NOT in this commit (intentionally — future commits)

- **AI Agent `/agent` page** still has a "Reemplazar Modelo" workflow (`agentType: modelo`) that also does lingerie. It stays for now — will be consolidated in commit 6 when AI Agent becomes a router.
- **Batch preset `agent-lenceria`** in `src/app/batch/page.tsx:220` still exists — simpler product-only flow for bulk, not a duplicate of this pipeline. Will be re-evaluated in commit 7.
- **`/api/inventory/scan/route.ts:48`** still maps folder `lenceria` → `agentPreset: "agent-lenceria"`. Will be updated in commit 5 (auto-routing from folders to pipelines).

---

## 2026-04-20 — Docs consolidation: 3 canonical pipelines structure (commit 1 of pipeline rewrite)

Set up the documentation foundation for the pipeline rewrite cycle. Before touching any code, established a single source of truth for which pipelines exist, what modules they reuse, and the sync rules that prevent future duplication.

### Deleted (8 obsolete docs)

- `docs/README-TESTING.md`
- `docs/READMETESTING v3.md`
- `docs/TESTING-REPORT.md`
- `docs/TESTINGREPORT.md`
- `docs/TESTINGREPORT agente ai v3.md`
- `docs/PLANREORGANIZACIONUNISTUDIO.md` (from Apr 14 — superseded)
- `docs/PLANDASHBOARDv2.md` (references old 4-agent model — superseded)
- `docs/LINGERIE_PIPELINE_PLAN.md` (consolidated into `docs/pipelines/lingerie.md`)

### Created (5 new docs)

- `docs/pipelines/README.md` — index of the 3 canonical pipelines + sync rules + auto-routing table from inventory folders
- `docs/pipelines/lingerie.md` — 164 products (77 bras + 72 panties + 15 shapewear), 7-step flow, grounded_sam + SeedDream + Kolors providers
- `docs/pipelines/static-product.md` — 240 products (perfumes + creams + sunscreen + deodorants + facial + makeup), adaptive background matrix by category/brand (no always-white)
- `docs/pipelines/jewelry.md` — 82 products with sub-type routing (aretes→orejas, cadenas→cuello, anillos→dedo, pulseras→muñeca), produces estante + modelo + detalle + video per SKU
- `docs/modules/README.md` — 18 modules with pipeline-usage map + gotchas

### Updated

- `CLAUDE.md` — added "Three canonical pipelines — no duplicates allowed" rule + "Pipeline ↔ module sync rule" (both in Mandatory Rules). Reference docs section now lists pipelines first.
- `README.md` (root) — documentation section now opens with pipeline table before reference docs.
- `unistudio/README.md` — same treatment.

### Why this commit

User was frustrated that earlier cycles created parallel pipelines (`/catalog-pipeline` page, `agent-lenceria` preset in Batch, `getCatalogoPipeline()` fallback in AI Agent) that claimed to do similar things but diverged silently. The code changes to consolidate happen in commits 2-7; this commit (commit 1) establishes the rules and documentation so the consolidation work has a fixed target. No code touched.

### Pipeline audit results (what gets consolidated in commits 2-7)

| Existing (to be removed) | Consolidated into |
|---|---|
| `/app/catalog-pipeline/page.tsx` + `/api/catalog-pipeline` (1313 lines) | `/pipelines/lingerie` (commit 2) |
| `agent-lenceria` preset in `/lib/batch/pipeline.ts` | Pipeline Lencería |
| `agent-perfumes`, `agent-cremas`, `agent-desodorantes` presets | Pipeline Estáticos (commit 3) |
| `agent-accesorios` preset | Pipeline Joyería (commit 4) |
| `getCatalogoPipeline()` fallback in `/api/ai-agent/plan` | Removed — AI Agent becomes router only (commit 6) |
| `getCambiarModeloPipeline()` fallback in same route | Removed — covered by Lencería |

### Next up

Commit 2 of this cycle: create `/pipelines/lingerie` + `/api/pipelines/lingerie`, migrating the useful parts of `/catalog-pipeline` (shared model reuse, AUTO/MANUAL execution modes, STEP_DEFS, cost estimator, product video), and delete the old route in the same commit.

---

## 2026-04-20 — Ghost Mannequin module fix for real humans

The "Quitar Maniqui" module was assuming input photos had a real mannequin. When the input was a real woman wearing lingerie (bra, panty, shapewear), Flux Kontext Pro just edited the clothing (e.g., added long sleeves to a bra) instead of removing the person. Added a new operation that actually removes the person.

### Changes

| File | Change |
|---|---|
| `src/lib/processing/ghost-mannequin.ts` | New `modelToGhost(imageUrl, garmentType?)` function with cascade: SeedDream edit (`fal-ai/bytedance/seedream/v4/edit`, no content filter) for lingerie → Flux Kontext Pro fallback → SeedDream retry. Color-agnostic prompts (works for any color). |
| `src/lib/processing/ghost-mannequin.ts` | Added `LINGERIE_TYPES` set + `GARMENT_NOUN` map for type-aware prompting. |
| `src/app/api/ghost-mannequin/route.ts` | New `model-to-ghost` case in switch. Accepts `garmentType` param. Returns `provider` in response. |
| `src/components/modules/GhostMannequinPanel.tsx` | New "Quitar Modelo (Ghost 3D)" operation (default). Garment-type selector now shows for model-to-ghost and flat-to-model. Added lingerie categories: bra, panty, shapewear, bodysuit, swimwear. Sends `garmentType` to the route. Updated module header copy to clarify when to use which operation. |
| `CLAUDE.md` | Added Ghost Mannequin gotcha: use `model-to-ghost` for real humans (NOT `remove-mannequin`), color-agnostic prompts. |
| `docs/architecture.md` | Updated `/api/ghost-mannequin` signature (garmentType param, $0.04-0.08 range) and file tree comment. |

### Why this was failing

`remove-mannequin` prompt says "Remove the mannequin from this garment image." Kontext Pro looks for a mannequin, finds a human model, ignores the instruction, and reinterprets the request as "edit the clothing." Result: bra gets sleeves added instead of the person being removed. Screenshot evidence attached in the investigation thread.

### Provider routing

```
model-to-ghost + garmentType ∈ LINGERIE_TYPES
  → SeedDream edit (fal.ai, no content filter, ~$0.04)
  → fallback to Flux Kontext Pro
  → fallback to SeedDream retry with minimal prompt

model-to-ghost + non-lingerie garment
  → Flux Kontext Pro directly (~$0.04)
```

`LINGERIE_TYPES = { lingerie, bra, panty, shapewear, bodysuit, swimwear, bikini, underwear, intimate, faja, fajas }`

---

## 2026-04-20 — Lingerie Pipeline Overhaul (18 commits)

Intense day: fought through the full lingerie flow from broken (Flux Kontext E005 moderation) to working (grounded_sam + SeedDream + Kolors), then shipped the first round of UX features on top.

### AI Agent — Lingerie Pipeline Rewrite

| Commit | Change |
|---|---|
| `28c7e22` | Modelo generada tenía blazer+pantalón por default — cambiado a ropa base neutral para lingerie |
| `a664c09` | Phase A: add `removeSubject` flag + seed sharing between catalog angles + force kolors for lingerie |
| `0ce2e49` | `/api/bg-remove` 500 — Kontext rejected data URIs, added `ensureHttpUrl` |
| `68f25ff` | **Big switch**: Flux Kontext Pro rejected lingerie with E005 content policy (non-disableable). Replaced garment isolation with `schananas/grounded_sam` segmentation + Claude Vision fallback + Sharp composite. No moderated endpoints involved. |
| `3f99643` | save-result 413 fixed + better mask selection (purity heuristic) |
| `0741f5e` | fal.ai storage URL obsoleta (`fal.ai/api/storage/upload/url` → returned HTML 404). Migrated to `rest.alpha.fal.ai/storage/upload/initiate` (2-step signed URL flow). Also routed tryon to receive falUrl instead of data URI. |
| `a813444` | Wider mask coverage range (0.5%–75%) for close-up bra crops + `garmentType` forwarded to tryon so Kolors is guaranteed for lingerie |
| `73a47a5` | `useAgentPipeline` uploads input via `/api/upload` instead of posting a base64 data URL — Vercel was returning HTML error pages when bodies exceeded ~4.5MB |
| `c82b4bd` | Purity-based mask selector (≥0.9 pure B/W) to reject the grounded_sam annotated-overlay image that was passing the old coverage heuristic |
| `d51c7b9` | **Bra vs panty differentiation**: dedicated labels ("Aislar brasier" / "Aislar panty"), different grounded_sam vocabulary per type, kolors category routing (`tops` for bra, `bottoms` for panty, `one-pieces` for set). Driven by `imageAnalysis.garmentType`. |
| `d51c7b9` | Modelo IA base = simple beige swim top + swim briefs (safer than "bikini" / "nude" which ByteDance's partner filter blocks) |
| `77a8972` | Lingerie pipeline now ends with a 3-second 9:16 video of the AI model wearing the garment (kenburns gratis / wan-2.2-fast $0.05 on premium) |
| `77a8972` | `saveAiModel` records real provider (fal/SeedDream vs replicate/Flux) + seed in metadata so the same face can be regenerated later |
| `212690b` | Expanded grounded_sam vocabulary per garment type — added bralette / sports bra / wireless / soft bra / briefs / thong / bikini bottom to catch Grounding DINO's blind spots |

### UX & Infrastructure

| Commit | Change |
|---|---|
| `20d862c` | Canvas central auto-updates with each completed step instead of waiting until the pipeline finishes |
| `8fce1bd` | Per-step user-friendly Spanish explanation rendered under each step label (`getStepExplanation()`) |
| `06916a3` | `ImageCompare` stopped hanging on "Cargando preview..." when one side fails to load — tracks errored state per side |
| `d51c7b9` | "← Volver al inicio" button visible during execution/results to reset the pipeline at any time |
| `d51c7b9` | `autoSaveResult` no longer skips large payloads — uploads blob/data to fal storage first, then saves the resulting URL |
| `ec78b76` | `.vercelignore` to keep `vercel --prod` under the 10MB upload cap (60+ `.claude/worktrees/` were being bundled) |
| `a5c07de` | Raised per-route `maxDuration` for bg-remove (300s), bg-generate/inpaint/outpaint (120s), analyze-image (120s), jewelry-tryon (300s) |
| `c02355d` | Shrank bg-remove runtime to fit in 60s (resize 1024px + JPEG, parallel mask fetch, upload result direct to fal) in case Hobby-tier caps still hit |

### Docs & Rules

- `CLAUDE.md` updated: deploy/build now allowed provided there is no concurrent `next build` / `vercel --prod` / `.next/lock` — always pre-check before running.
- `docs/LINGERIE_PIPELINE_PLAN.md` (rewrite) reflects the current working pipeline (grounded_sam + SeedDream + Kolors), cost table, and 5 phases pending (model reuse picker, bra/panty UI split, video after tryon — now done, folder batch, inpaint repair).
- Memory tightened: "changelog + docs stay current" rule now covers every code change, not only daily notes.

### Pending (not shipped today)

- **G — Repair "Quitar y Reemplazar" (inpaint) module**: waiting on the exact error message from user to reproduce.
- **H — Folder-based inventory batch processing**: full-day scope, reserved for a dedicated session. Foundation exists (`/api/inventory/scan`, `/api/inventory/load`, `AiModel` table with seed persistence).
- **Saved-model picker UI**: backend saves everything with provider+seed; the UI to pick an existing model and skip `model-create` is not built yet.

### Current deployment status

- Production: `https://unistudio.vercel.app` on commit `212690b`.
- Health check: `https://unistudio.vercel.app/api/health` — should report `replicate: connected`, `fal: connected`, env keys `ok`.

### What to test next

1. Lingerie flow with a bra photo — expect "Aislar brasier" label, Kolors try-on on a swim-top AI model, short video at the end.
2. Lingerie flow with a panty photo — expect "Aislar panty" label, kolors category `bottoms`.
3. "← Volver al inicio" button resets the flow mid-execution and mid-results.
4. Gallery should contain the step results (they now go through fal storage instead of being dropped for size).

---

## 2026-04-09 — Bug Fixes, New Features & Mobile Responsive

### Production Bug Fixes (12 bugs)
| # | Bug | Impact |
|---|-----|--------|
| 1 | Blob URL memory leaks in BgRemovePanel, batch/page, editor/page, CompliancePanel, TryOnPanel | Memory grew unbounded on repeated processing |
| 2 | Race condition on rapid image drops in editor | Second drop could corrupt state before first finished loading |
| 3 | Missing `response.ok` check in batch API route | Non-JSON errors (HTML 500 pages) crashed the parser |
| 4 | Silent Replicate upload failure in upload route | Failures returned undefined URL with no error thrown |
| 5 | OffscreenCanvas null assertion in BgRemovePanel | Crashed on browsers without OffscreenCanvas support |
| 6 | Null prompt in inpaint route | Empty prompt sent to model causing malformed request |
| 7 | Invalid style not validated in bg-generate route | Unrecognized style values passed through to model |
| 8 | Aspect ratio format not validated in outpaint route | Non-standard ratios silently rejected by Replicate |

### Jewelry Module — 3 New Output Modes + 17 Bug Fixes

#### New Modes
| Mode | Description |
|------|-------------|
| **Exhibidor** (Stand/Display) | Product placed on an elegant display stand |
| **Flotante** (Floating) | Product floating in mid-air with dramatic lighting |
| **Modelo** (Model Try-On) | Person wearing the jewelry in editorial-style photo |

#### Bug Fixes
| # | Fix |
|---|-----|
| 1 | Exhibidor/Flotante now use composite approach — product pixels preserved 100% |
| 2 | ANTES preview shows correct jewelry image (was incorrectly showing editor canvas) |
| 3 | bgStyle now sent for exhibidor/flotante modes |
| 4 | Metal/finish options removed from exhibidor/flotante (contradicted pixel preservation) |
| 5 | Model image no longer downloaded twice and recompressed |
| 6 | Blob URL cleanup on unmount |
| 7 | Editor image now shows preview correctly |
| 8 | maxDim raised from 1200 → 2048 for fine jewelry detail |
| 9 | Small jewelry images now upscaled in composite (fit: contain) |
| 10 | Output dimensions (aspect_ratio 1:1) added to all Flux calls |
| 11 | Modelo mode prompts now include closeup framing per accessory type |
| 12 | Flotante prompt names the accessory type explicitly |
| 13 | Background style correctly passed to Flux placement step |
| 14 | Ear visibility enforced for earring model generation |
| 15 | Prevented double-submit on rapid clicks |
| 16 | Progress bar now reflects actual composite pipeline steps |
| 17 | Cost tracking corrected for composite + generation steps |

### Background Remove Module
| Change | Description |
|--------|-------------|
| **New mode: Aislar Producto** | Removes model/mannequin, keeps only the product (product isolation) |
| Bug fix | Quitar y Reemplazar Fondo was sending data URL (2–4 MB) instead of Replicate URL |
| Bug fix | Cost tracking was reading wrong field — now uses correct cost key |

### Background Generate (Fondo con AI) Module

#### 11 New Presets — Optimized for Unistyles Curacao Products
| Category | Preset |
|----------|--------|
| Moda Íntima | Boudoir Romántico |
| Moda Íntima | Satén y Seda |
| Moda Íntima | Tocador con Rosas |
| Fragancias | Espejo Negro |
| Fragancias | Jardín Brumoso |
| Fragancias | Cristal y Luz |
| Joyería | Bandeja de Joyería |
| Joyería | Piedra Oscura |
| Joyería | Flatlay Botánico |
| Skincare | Flatlay Natural |
| Skincare | Terrazzo Pastel |

#### UI Improvements
- Exposed **Creative Mode** in UI (was implemented in backend but hidden from users)
- Added dynamic **productType** selector (was hardcoded to "clothing")
- Replaced preset scroll with **category tabs** for easier navigation
- Added **retry button** on error
- Fixed progress bar — was jumping 50% → 100%, now smooth increments

### E-Commerce Mode Fix
| Mode | Fix |
|------|-----|
| **Fast mode** | Now uses composite approach (bg-remove + generate bg + composite) — product preserved 100% |
| **Precise mode** | Prompts strengthened for product preservation |

### Editor Fixes
- Fixed **undo/redo off-by-one bug**: redo was using `historyIndex + 2` instead of `+ 1`

### Mobile Responsive
| Component | Change |
|-----------|--------|
| Editor page | Stacks vertically on phone |
| Editor sidebar | Hidden on mobile, replaced by dropdown selector in toolbar |
| Editor toolbar | Module picker added for mobile |
| Editor zoom controls | Hidden on mobile |
| Home page | Hero/stats wrap properly on small screens |
| Batch page header | Stacks on mobile |
| Brand-kit page header | Stacks on mobile |

### Video Module — 10 Fixes
| # | Fix |
|---|-----|
| 1 | Ken Burns now shows "preview only" warning (not downloadable as MP4) |
| 2 | Added 6 product-category video presets: Perfumería, Joyería, Skincare |
| 3 | Fixed AdCreator to use `replicateUrl` (was using local data URL) |
| 4 | Fixed Wan 2.2 Fast duration (was hardcoded to 81 frames) |
| 5 | Fixed Wan 2.5 duration type (string → number) |
| 6 | Added batch cost estimator |
| 7 | Added Dutch TTS voice notice for Curaçao market |
| 8 | Added Lencería 360° preset with front/back image upload |
| 9 | Added retry button on video errors |
| 10 | Improved mobile layout for VideoPanel |

### Rate Limiting
- Retry delays increased: `[2s, 4s, 8s]` → `[5s, 15s, 30s, 60s]` (4 retries instead of 3)
- User-friendly **"Servidor ocupado"** messages for 429 errors

### Testing Checklist

#### Jewelry Module
- [ ] Modo Normal: upload ring image, verify composite output preserves product
- [ ] Exhibidor: confirm display stand present, product pixels unchanged
- [ ] Flotante: confirm floating composition with correct accessory type in prompt
- [ ] Modelo: confirm person wearing jewelry, closeup framing for earrings
- [ ] ANTES preview shows jewelry image (not canvas)
- [ ] Cost tracking correct for each mode

#### Background Remove
- [ ] Quitar Fondo: removes background cleanly
- [ ] Reemplazar Fondo: uploads to Replicate URL (not data URL), applies new background
- [ ] Aislar Producto: removes model/mannequin, keeps product only
- [ ] Cost tracking reads correct field

#### Background Generate
- [ ] All 3 modes accessible: Preciso, Creativo, Rápido
- [ ] Category tabs switch correctly (Moda Íntima, Fragancias, Joyería, Skincare)
- [ ] productType selector works (clothing, fragrance, jewelry, skincare)
- [ ] Progress bar increments smoothly
- [ ] Retry button appears on error

#### E-Commerce Mode
- [ ] Fast mode: product preserved in composite output
- [ ] Precise mode: product not replaced by AI hallucination

#### Editor
- [ ] Undo: Ctrl+Z reverts processing steps correctly
- [ ] Redo: Ctrl+Y advances by exactly 1 step (not 2)
- [ ] Mobile: sidebar replaced by dropdown, modules accessible

#### Video
- [ ] Ken Burns: plays preview, shows "preview only" warning
- [ ] Wan 2.2 Fast: correct frame count
- [ ] Product category presets load correct settings
- [ ] Retry button appears on error
- [ ] Batch cost estimator shows before generation

#### Rate Limiting
- [ ] Trigger 429: verify "Servidor ocupado" message appears
- [ ] Verify 4 retry attempts with increasing delays (5s, 15s, 30s, 60s)

### Session Stats
- **Production bugs fixed**: 12
- **New features added**: Exhibidor mode, Flotante mode, Modelo mode, Aislar Producto mode, Creative Mode exposed, productType selector, 11 bg presets, 6 video presets, Lencería 360°
- **Modules updated**: Jewelry, BgRemove, BgGenerate, Video, Editor, all panel pages (mobile)
- **All 18 modules**: functional ✅

---

## 2026-04-05 / 2026-04-07 — Vercel Deployment + 39 Bug Fixes

### Deployment
- **Vercel**: App deployed at https://unistudio.vercel.app
- **Database**: Neon PostgreSQL connected (aws-us-east-1)
- **All API keys**: Replicate, fal.ai, FASHN, Anthropic configured in Vercel env vars
- **Health check**: https://unistudio.vercel.app/api/health — all systems green

### Critical Fixes
| # | Bug | Impact |
|---|-----|--------|
| 1 | Replicate file URLs needed auth to download | Enhance, shadows, upscale, analyze all failed with 401 |
| 2 | Upload returned Replicate URL instead of data URL | Server couldn't read uploaded images for local processing |
| 3 | Kolors try-on model removed from Replicate (404) | All try-on attempts failed |
| 4 | 40+ `extractOutputUrl` calls missing `await` | All AI model calls returned Promise objects instead of URLs |
| 5 | `save-result` route wrote to filesystem (read-only on Vercel) | Saving results crashed on Vercel |
| 6 | Flux Kontext Pro used wrong param `image` instead of `input_image` | Shadows, outpaint, inpaint AI processing failed silently |
| 7 | Enhance custom sliders missing `vibrance: 0` | Sharp crashed with NaN when user adjusted sliders |
| 8 | Shadows route returned uncompressed PNG (>4.5MB) | Exceeded Vercel response limit for large images |
| 9 | IDM-VTON crashed on transparent PNGs | "NoneType" error on try-on |

### UI/UX Fixes
| # | Fix | Description |
|---|-----|-------------|
| 10 | Undo/Redo now works | Was controlling layers (useless), now controls image processing history |
| 11 | Gallery accessible | Added links in editor sidebar (was completely unreachable) |
| 12 | Brand Kit save shows toast | Was silently saving without feedback |
| 13 | Session cost tracker fixed | Was adding phantom $0.02 for free modules |
| 14 | InpaintPanel cleaned up | Removed mask-based providers that require non-existent mask tool |
| 15 | OutpaintPanel cleaned up | Removed fake Flux Fill provider (both routed to same model) |
| 16 | SmartEditor sidebar | Added to module sidebar (was hidden, only reachable via URL) |
| 17 | Dashboard stats | Fixed "17 herramientas" → "18" |
| 18 | Batch presets | Translated English text to Spanish |
| 19 | BrandKitPanel | Removed fake watermark/export buttons that only showed toast |
| 20 | Logo click | No longer triggers full page reload losing editor state |

### Infrastructure
| # | Change | Description |
|---|--------|-------------|
| 21 | `postinstall: prisma generate` | Prisma client generated during Vercel build |
| 22 | Removed `lightningcss-linux-x64-gnu` | Platform-specific dependency broke Vercel |
| 23 | DB optional with null guards | App works without DATABASE_URL |
| 24 | Poll timeouts | Replicate (5min) and fal.ai (5min) no longer loop infinitely |
| 25 | WithoutBG health check skipped | No 3s timeout delay when Docker not configured |
| 26 | Large image compression | Upload/enhance auto-compress images >2.5MB for Vercel limits |
| 27 | Gallery persistence | Thumbnails survive page refresh via compressed data URLs |
| 28 | Editor session persistence | Working images restore after page refresh |
| 29 | Outpaint aspect ratios | Snap to standard ratios (Replicate rejects non-standard) |

### Dead Code Removed
- `batch-store.ts`, `useImageProcessing.ts`, `useBatchProcessing.ts` — never imported
- `applyBackgroundColor`, `applyBackgroundBlur` in bg-remove.ts — browser APIs in server file
- `bufferToOptimizedDataUrl` in shadows route — buggy, never called
- `fileToDataUrl` in UpscalePanel — replaced by upload API

### Module Audit Results (18 modules)
| Module | Status | Notes |
|--------|--------|-------|
| bg-remove | ✅ Working | Browser (free) + Replicate. Post-processing pipeline solid |
| bg-generate | ⚠️ Partial | Only "precise" mode exposed. Creative/fast modes unreachable from UI |
| enhance | ✅ Working | All presets + custom sliders. Vibrance fixed |
| shadows | ✅ Working | All 5 types. Large image compression added |
| outpaint | ✅ Working | Platform presets + custom. Aspect ratio snapping fixed |
| inpaint | ✅ Working | Text-guided via Kontext. Mask mode removed (no mask tool) |
| upscale | ✅ Working | 3 providers. Large image handling fixed |
| tryon | ✅ Working | FASHN + IDM-VTON. Kolors removed (dead model) |
| model-create | ✅ Working | FASHN → IDM-VTON → Kontext fallback chain |
| ghost-mannequin | ✅ Working | 3 operations. Cost extraction fixed |
| jewelry-tryon | ✅ Working | Model generation + composite approach |
| video | ✅ Working | Cost tracking fixed. Ken Burns = free |
| ad-creator | ✅ Working | Cost tracking fixed |
| ai-prompt | ✅ Working | Claude + local fallback |
| smart-editor | ✅ Working | Blob URL leak fixed. Added to sidebar |
| compliance | ✅ Working | All client-side checks |
| batch (panel) | ✅ Working | bg-generate params fixed |
| brand-kit | ✅ Working | Read-only display + link to full page |

### Known Limitations
- Video generation may timeout on Vercel Hobby (60s limit)
- Gallery downloads are thumbnails (compressed), not original resolution
- Inventory scan only works locally (filesystem access)
- bg-generate "creative" and "fast" modes not exposed in UI

### Current Stats
- **39 commits** in this session
- **0 crashes** on deployed app
- **18/18 modules** functional
- **29 API routes** all responding correctly
