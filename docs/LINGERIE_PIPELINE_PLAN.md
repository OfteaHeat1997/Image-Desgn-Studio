# 🩱 UniStudio — Pipeline de Lencería

**Para: Unistyles (Curaçao) — Brasieres & Pantys**
**Última actualización: 2026-04-20**

---

## Estado actual (commit `73a47a5` + fix pending)

El flujo de la card **"Lencería y Ropa"** (AI Agent) ya ejecuta los 5 pasos y no trona por timeouts ni por content policy. Todavía hay un defecto en el paso 1 (aislar prenda) — en revisión con un fix pendiente por deploy.

### Lo que funciona

| Paso | Módulo | Proveedor actual | Costo |
|---|---|---|---|
| 1. Aislar prenda | `bg-remove` con `removeSubject:true` | Grounded SAM (Replicate) + Sharp composite + upload a fal | ~$0.01 |
| 2. Crear modelo IA | `model-create` | SeedDream 4.5 (fal.ai, `enable_safety_checker:false`) con seed compartido entre ángulos | $0.055 |
| 3. Poner ropa en modelo | `tryon` | Kolors v1.5 (fal.ai) — forzado por `garmentType` | $0.02 |
| 4. Mejorar | `enhance` | Sharp local | $0 |
| 5. Escalar resolución | `upscale` | Real-ESRGAN / Clarity | $0.02-$0.05 |

**Total por imagen:** ~$0.10-0.15

### Lo que todavía falla / está pendiente

Ver sección **"Pendientes"** más abajo.

---

## Por qué no usamos Flux / FASHN / IDM-VTON para lencería

| Proveedor | Bloquea lencería | Motivo |
|---|---|---|
| **FASHN v1.6** | Sí — siempre | Entrenado sin intimacy por política |
| **IDM-VTON** | A veces | Filtro de Replicate activo |
| **Flux Kontext Pro** | Sí — muy estricto | E005 content policy, no se puede desactivar |
| **Gemini (todos)** | Sí — siempre | Google bloquea ropa íntima |
| **Kolors v1.5 (fal.ai)** | No | Diseñado para moda comercial |
| **SeedDream 4.5 (fal.ai)** | No | Filtro desactivable con `enable_safety_checker:false` |

---

## Flujo técnico (commit actual)

```
FOTO ORIGINAL (modelo con brasier puesto)
         |
         v
[PASO 0] /api/upload → fal storage → HTTP URL pública
  Evita enviar la imagen como data URL en el body (Vercel limita a 4.5MB)
         |
         v
[PASO 1] /api/bg-remove (removeSubject:true, garmentType:"bra")
  grounded_sam (Grounding DINO + SAM) → máscara B/W de SOLO la prenda
  Sharp compone máscara como alpha sobre imagen original
  Upload resultado a fal storage → URL pública
  Elige la máscara con purity ≥ 0.9 (B/W puro) para evitar la imagen anotada de debug
         |
         v
[PASO 2] /api/model-create (seed compartido)
  SeedDream 4.5 con prompt "woman wearing simple beige athletic crop top and matching shorts"
  Retry automático con prompt safer si falla content policy
  Seed reutilizado entre ángulos del mismo pipeline
         |
         v
[PASO 3] /api/tryon (provider:kolors, garmentType:bra/panty/lingerie)
  fal-ai/kling/v1-5/kolors-virtual-try-on
  Inputs: human_image_url (modelo IA), garment_image_url (prenda aislada)
         |
         v
[PASO 4] /api/enhance (Sharp local)
         |
         v
[PASO 5] /api/upscale (opcional, $0.02-0.05)
```

---

## Pendientes (fases siguientes)

### Fase B — Reutilización de modelo (prioridad alta)

**Objetivo:** generar la modelo IA UNA vez por referencia y reutilizarla para todos los colores/poses. Ahorra $0.055 × N.

**Plan:**
- Al crear una modelo con SeedDream, guardar en `AiModel` (tabla Prisma ya existe) con:
  - `seed`, `prompt`, `previewUrl`, params (gender, skinTone, etc.)
  - Tag `referenceNumber` cuando se procese inventario de una ref
- API `/api/ai-models?referenceNumber=...` para listar
- UI: card "Mis modelos" en `AiAgentPanel` → seleccionar modelo guardada → el pipeline salta `model-create`

**Status:** no implementado (la tabla existe, el ruteo no).

### Fase C — Diferenciar brasier vs panty

Actualmente la card "Lencería y Ropa" trata ambos como un único flow. E-commerce los vende por separado.

**Plan:**
- `analyze-image` ya detecta `garmentType: 'bra' | 'panty' | 'set'` (ver `src/types/agent.ts:75`)
- En `ai-agent/plan/route.ts`, rama por garmentType:
  - `bra` → prompt de grounded_sam "bra,bralette", categoría kolors "tops"
  - `panty` → prompt "panty,underwear bottom", categoría kolors "bottoms"
  - `set` → 2 pipelines en paralelo

**Status:** parcial — `garmentTypeToPrompt()` en bg-remove ya diferencia, pero el plan no se ramifica.

### Fase D — Videos finales (después del tryon)

**Plan:**
- Tras el tryon exitoso, agregar 2 steps en paralelo:
  - Video modelo posando (wan-2.2-fast, ~$0.05, 9:16)
  - Video flat-lay 360° del brasier aislado (kenburns, $0, 1:1)
- Guardar ambos en galería con nombre `REF-{ref}-{color}-modelo.mp4` y `REF-{ref}-{color}-flatlay.mp4`

**Status:** no implementado. `wan-2.2-fast` y `kenburns` ya existen como providers en `src/app/api/video/route.ts`.

### Fase E — Batch desde folder de inventario

**Objetivo:** escanear una carpeta de productos (ej: `/inventory/REF-123/black/front.jpg`) y procesar todo en lote.

**Plan:**
- `/api/inventory/scan` ya existe — enriquecer para parsear convención `/REF/color/pose.jpg`
- Nueva página `/batch-lingerie` con lista de items del folder + botón "procesar todo"
- Usa el modelo guardado de Fase B (un solo crear-modelo por REF, múltiples tryons)
- Resultados escritos a `/output/REF-123/black/front-AI.png`

**Status:** no implementado. Las rutas base existen (`/api/inventory/scan`, `/api/inventory/load`).

### Fase F — Modelo en bikini base (no activewear)

Actualmente el prompt genera modelo con `"simple beige athletic crop top and matching shorts"`. Tu plan original pedía **bikini beige** como ropa base porque es más parecido al lienzo final (Kolors tiene menos conflicto con el top cuando ya hay una prenda ajustada tipo bikini).

**Riesgo:** la palabra "bikini" puede disparar content policy de ByteDance/fal. Probar con alternativas: "simple beige two-piece athletic set", "plain beige bralette and briefs".

**Status:** no implementado.

### Fase G — Arreglar "Quitar y Reemplazar" (inpaint)

Tu reporte dice que el módulo no funciona. No está investigado todavía — necesito:
- Descripción del error exacto (screenshot / error message)
- Pasos para reproducir

---

## Bugs cerrados durante abril 2026

| Commit | Bug |
|---|---|
| `1a5442f` | Add SeedDream + Kolors routing (cimientos) |
| `28c7e22` | Modelo generada con blazer en vez de ropa base neutral |
| `a664c09` | Añadir `removeSubject:true` al primer paso + seed compartido |
| `ec78b76` | `.vercelignore` (deploy fallaba por 10MB) |
| `d102977` + `4611a53` | TS errors bloqueando build de Vercel |
| `0ce2e49` | `/api/bg-remove` 500 porque Kontext rechazaba data URIs |
| `68f25ff` | Kontext tiraba E005 para lencería (reemplazado por Vision+rembg) |
| `3f99643` | 413 save-result + mala selección de máscara |
| `8fce1bd` | Reemplazo final por grounded_sam + explicaciones por paso |
| `20d862c` | Canvas central se auto-actualiza con cada paso |
| `a664c09` + `a813444` | Forzar kolors para lencería + purge pipeline |
| `0741f5e` | URL de fal storage obsoleta (404 HTML) |
| `c02355d` | Speedup bg-remove para caber en 60s |
| `73a47a5` | Subir input a `/api/upload` en vez de data URL (Vercel 4.5MB) |
| **pending** | Selector de máscara: purity B/W ≥ 0.9 para evitar imagen anotada de debug |

---

## Costos reales observados (abril 2026)

| Paso | Costo por imagen |
|---|---|
| `/api/upload` | $0 (local + fal storage free tier) |
| `/api/bg-remove` (removeSubject) | ~$0.01 (grounded_sam) |
| `/api/model-create` (SeedDream) | $0.055 |
| `/api/tryon` (kolors) | $0.02 |
| `/api/enhance` | $0 |
| `/api/upscale` | $0.02-$0.05 |
| **Total 1 ref, 1 color, 1 pose** | **~$0.11-$0.14** |
