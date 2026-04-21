# Commit 10+ Roadmap — Dashboard redesign + mobile + deferred audits

**Creado:** 2026-04-21 al final de commit 9.
**Estado actual:** `main` en `9f1b0eb`. Producción debería estar deployada.
**Regla suprema del usuario:** "mejorar no dañar" — no romper lo que funciona, mejorar la UX. Cada cambio se verifica antes de pushear.

---

## Por qué este README existe

La sesión que creó commits 1–9 llegó al 90% de contexto. La usuaria aprobó **Opción C: redesign completo del dashboard + mobile-first sweep** (5-6h estimadas) pero no hay contexto para hacerlo en la misma sesión. Este doc es la mano al próximo turno.

---

## Qué ya funciona (NO romper)

Después de commit 9 (`9f1b0eb`), la app tiene:

- **3 pipelines canónicos funcionando**: `/pipelines/lingerie`, `/pipelines/static-product`, `/pipelines/jewelry`
- **/agent** como router puro (upload opcional + grid 14 categorías → redirect)
- **/batch** con `startAutoMode` que redirige a pipelines via `cat.pipeline`
- **/api/inventory/scan** con 11 categorías, cada una con `pipeline` + `pipelineParams`
- **Sidebar** con entradas para los 3 pipelines + stubbed AiAgentPanel en `/editor?module=ai-agent`
- **Homepage** con 4 quick-action cards (agente / batch / pipeline lencería / pipeline estáticos / pipeline joyería / brand-kit)
- **gallery-store** con IndexedDB tier-2 backup (commit 9)
- **editor autoSaveResult** con retry 3× + toast (commit 9)
- **Env vars** todas con `.trim()` (commit 9)

Verificación antes de empezar commit 10:
```bash
git -C /mnt/c/Users/maria/Documents/GitHub/Image-Desgn-Studio log --oneline -3
# Debería mostrar 9f1b0eb como HEAD
npx --prefix unistudio tsc --noEmit 2>&1 | grep -v "__tests__\|jest\|validator.ts"
# Debería estar vacío
```

---

## OPCIÓN C — Plan detallado (lo que aprobó la usuaria)

### Parte 1: Redesign del dashboard (`unistudio/src/app/page.tsx`)

**Layout actual (a reemplazar):**
- Hero con "Unistyles Curacao · AI Photo Studio"
- 4 tarjetas cuadradas de quick action
- Grid de "Todos los Módulos" con muchas cards pequeñas

**Layout propuesto:**

```
┌────────────────────────────────────────────────────────────────┐
│ HERO                                                           │
│   Unistyles Studio                                             │
│   Fotos de catálogo IA · lista para e-commerce en minutos      │
│   [Subí una foto] → detecta categoría y abre pipeline          │
│   (ESTE CTA va al /agent page con upload)                      │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ LOS 3 PIPELINES (cards grandes con preview)                    │
│   ┌──────────────┬──────────────┬──────────────┐               │
│   │ LENCERÍA     │ ESTÁTICOS    │ JOYERÍA      │               │
│   │ [preview img]│ [preview img]│ [preview img]│               │
│   │ 164 productos│ 240 productos│ 82 productos │               │
│   │ bra/panty/   │ perfumes/    │ aretes/      │               │
│   │ shapewear    │ cremas/bloq. │ cadenas/etc  │               │
│   │ $0.15/foto   │ $0.01/foto   │ $0.23/pieza  │               │
│   │ [Abrir →]    │ [Abrir →]    │ [Abrir →]    │               │
│   └──────────────┴──────────────┴──────────────┘               │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ ÚLTIMOS RESULTADOS (patrón gallery compacto)                   │
│   [thumb] [thumb] [thumb] [thumb] [thumb]          [Ver todo]  │
│   (lee de gallery-store.images.slice(0, 8))                    │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ HERRAMIENTAS (sección compacta, no grid enorme)                │
│   [Batch Masivo] [Kit de Marca] [Galería] [Editor manual]      │
│   [Workflows guide] [Architecture]                             │
└────────────────────────────────────────────────────────────────┘
```

**Archivos a tocar:**
- `unistudio/src/app/page.tsx` — reescritura completa (~200 líneas)
- Importar `useGalleryStore` para "Últimos resultados"
- Reusar los cards/componentes existentes de `/gallery` como ejemplo de estilo

**Preview images para las cards de pipelines:**
Usar imágenes reales de `frontend/public/images/`:
- Lencería: `frontend/public/images/bra/*.jpg` (una imagen de referencia)
- Estáticos: `frontend/public/images/perfumes/*.jpg`
- Joyería: `frontend/public/images/Accesorrios/CATALOGADOS/Aretes/*.jpg`

O crear 3 SVGs ilustrativos en `unistudio/public/pipeline-previews/`.

### Parte 2: Mobile-first responsive sweep

**Breakpoints Tailwind (ya configurados por default):**
- `sm:` ≥ 640px (landscape phone)
- `md:` ≥ 768px (tablet)
- `lg:` ≥ 1024px (desktop)
- `xl:` ≥ 1280px

**Páginas que necesitan auditoría mobile:**

| Archivo | Issue actual | Fix |
|---|---|---|
| `src/app/page.tsx` | Grid `md:grid-cols-2` puede no stackear bien en phone | Usar `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| `src/app/agent/page.tsx` | Grid de 14 categorías posiblemente mal en móvil | `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` ya está OK, revisar que los textos no overflowen |
| `src/app/pipelines/lingerie/page.tsx` | Layout `lg:grid-cols-[1fr_360px]` asume desktop; en móvil el sidebar derecho debería pasar arriba o abajo | Cambiar a `grid-cols-1 lg:grid-cols-[1fr_360px]` + en mobile el sidebar va abajo con `order-2` |
| `src/app/pipelines/static-product/page.tsx` | Dos selects side-by-side (`sm:grid-cols-2`) OK | Solo verificar que job cards no overflowen |
| `src/app/pipelines/jewelry/page.tsx` | Grid `sm:grid-cols-3` en controls, OK | Verificar result cards en móvil |
| `src/app/batch/page.tsx` | Layout complejo con sidebar de inventory — crítico para móvil | Collapsible sidebar en mobile; toggle con botón |
| `src/app/editor/page.tsx` | Canvas + panels laterales — **muy desktop-focused** | Mobile: sidebar se vuelve drawer; canvas full-width; panels stackeados o como modal |
| `src/components/editor/ModuleSidebar.tsx` | Sidebar fijo izquierda 260-300px | Mobile: hamburger menu + slide-in |
| `src/app/gallery/page.tsx` | Grid adaptativo probablemente ya OK | Verificar |

**Convención a aplicar en todo:**
- Container widths: `max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-6xl mx-auto px-4`
- Font sizes: `text-sm sm:text-base` para títulos
- Padding: `p-3 sm:p-5`
- Grids: siempre arrancar con `grid-cols-1` y escalar

**Sidebar mobile (crítico — impacta toda la experiencia del editor):**
En `ModuleSidebar.tsx`:
- Detectar `window.innerWidth < 768` o usar media query
- Mobile: `fixed` + `transform: translate-x-[-100%]` cuando cerrado
- Botón hamburger top-left para abrir (en editor header)
- Overlay oscuro cuando abierto
- Cierra al seleccionar módulo

### Parte 3: Componente reusable para pipeline preview cards

Crear `unistudio/src/components/dashboard/PipelineCard.tsx`:

```tsx
interface PipelineCardProps {
  title: string;
  subtitle: string;
  productCount: number;
  productTypes: string;
  costPerItem: string;
  previewImageUrl: string;
  href: string;
  accentColor: "violet" | "amber" | "yellow";
}
```

Mantener consistencia visual con el tema dark (#09090B + #C5A47E gold accent — del README root).

---

## Checklist "mejorar no dañar"

Antes de cada commit, verificar:

- [ ] Las 3 páginas de pipeline siguen funcionando (upload + process)
- [ ] /agent redirige correctamente a los pipelines
- [ ] /batch auto-mode redirige via `cat.pipeline`
- [ ] Sidebar sigue mostrando las 3 entries + módulos sueltos
- [ ] Imports no rotos: `grep -r "AgentChat\|getCatalogoPipeline\|getCambiarModeloPipeline" unistudio/src/` → 0 active references
- [ ] `tsc --noEmit` limpio (filtrando jest + validator.ts)
- [ ] `npm run lint` sin nuevos errores (opcional pero recomendado)
- [ ] El dashboard refactored NO remueve funcionalidad — solo reorganiza
- [ ] Mobile: probar en Chrome DevTools con viewport iPhone SE (375×667) — todo se ve decente

**NUNCA tocar:**
- `src/stores/*.ts` (a menos que sea bug fix explícito)
- `src/lib/api/{replicate,fal,fashn,withoutbg}.ts` (providers — sensibles)
- `src/lib/pipelines/*.ts` (matrices adaptativas — probadas)
- `prisma/schema.prisma` (DB schema)
- `src/app/api/*/route.ts` (a menos que sea fix del audit)

---

## Deferred audits (NO scope de commit 10, pero documentado para después)

### High priority (commit 11 candidate) — 4-6h

| # | Qué | Archivo | Por qué |
|---|---|---|---|
| H1 | Manual-mode event listener timeout | `pipelines/lingerie/page.tsx:745-759` | Memory leak si se cierra tab durante manual mode |
| H2 | Jewelry upscale hard-fail | `pipelines/jewelry/page.tsx:243-249` | Actualmente soft-fail silencioso; jewelry sin upscale se ve mal |
| H3 | Soft-fail notifications al usuario | `pipelines/static-product/page.tsx:283, 298` + jewelry modelo/video | Jobs terminan "done" con outputs faltantes sin aviso |
| H4 | Contradicción en prompt Claude Haiku | `api/ai-agent/plan/route.ts:637 vs 639` | "modelo NO use bg-remove" vs "lingerie MUST use bg-remove" |
| H5 | Timeout en `/api/analyze-image` desde /agent | `app/agent/page.tsx:234-254` | UI congelada si API cuelga |
| H6 | Inventory scan: distinguir error vs empty | `app/batch/page.tsx:244-255` | Silent fail sin distinción |

### Data-loss follow-ups (commit 11 candidate) — 2-4h

| # | Qué | Archivo |
|---|---|---|
| D1 | Cross-session AI model reuse | `api/ai-models/route.ts` GET (aceptar `?referenceNumber=X`) + `pipelines/lingerie/page.tsx` useEffect lookup + `api/model-create` save con `referenceNumber` |
| D2 | Brand Kit DB↔localStorage timestamp merge | `stores/brand-store.ts:105-142` |
| D3 | Cost tracking a DB (hoy solo localStorage) | `stores/settings-store.ts:131-144` + nueva tabla `CostHistory` |
| D4 | FAL storage retention policy docs | `api/upload/route.ts:93-99` |

### Structural (commit 12 candidate) — 6-8h

| # | Qué |
|---|---|
| S1 | Extraer garment types a `src/lib/constants/garment-types.ts` (hoy duplicados en 3 lugares: lingerie page, plan route, bg-remove route) |
| S2 | Response shape consistency (todas las rutas devolver `data.url`) |
| S3 | Delete `useAgentPipeline` hook (1081 líneas sin consumers runtime) |
| S4 | Update `docs/architecture.md`, `docs/guia-completa.md`, `docs/UX_UI_GUIDE.md` — referencias stale a código borrado |

### Competitive-analysis features (commits 13+) — 30-40h total

Priorizados por impacto × esfuerzo para Unistyles:

| # | Feature | Pipeline | Esfuerzo | Impacto económico |
|---|---|---|---|---|
| F1 | Color variant swap | Lencería | 4-6h | 💰💰💰 (multiplica catálogo 5-10x) |
| F2 | Multi-format export simultáneo (1:1 + 4:5 + 9:16 + 16:9) | Los 3 | 3-4h | Ahorro tiempo manual enorme |
| F3 | Macro close-up automático | Joyería | 2h | Conversión joyería +50% según benchmarks |
| F4 | Material-aware prompts (oro/plata/acero) | Joyería | 1h | Calidad visual |
| F5 | Multi-angle desde 1 foto (front/back/side/lifestyle) | Lencería | 6-8h | Estándar Leonisa |
| F6 | Seasonal themes (Navidad/DíaMadre/Verano) | Estáticos | 2-3h | Campañas oportunas |
| F7 | Brand Kit auto (logo/watermark en output) | Los 3 | 3h | Brand consistency |
| F8 | Template saving ("mi look Yanbal") | Los 3 | 4-6h | Rapidez recurrente |
| F9 | Text overlays con módulo `infographic` | Estáticos | 2h | Features destacadas |
| F10 | Lifestyle scenes (mano sosteniendo, flat-lay) | Estáticos | 2-3h | Engagement ads |

---

## Security + backend + UX audit findings (commits 1-9)

Ya resueltos ✓:
- 0 vulnerabilidades de seguridad encontradas
- 0 errores UX/UI funcionales (antes del redesign de commit 10)
- Env vars con `.trim()` — fixed commit 9
- autoSaveResult con retry — fixed commit 9
- gallery-store IDB fallback — fixed commit 9
- AiAgentPanel type mismatch (Vercel build) — fixed commit 9

Findings no resueltos listados arriba en "Deferred audits".

---

## Reglas del usuario (memoria persistente — honrarlas siempre)

De `~/.claude/projects/-mnt-c-Users-maria-Documents-GitHub-Image-Desgn-Studio/memory/MEMORY.md`:

1. **Always push to GitHub** — commit + push después de cada cambio
2. **No concurrent deploys** — chequear `.next/lock`, `pgrep next build`, `pgrep vercel` antes de buildear
3. **Changelog + docs stay current** — cada code change actualiza CHANGELOG.md + docs relevantes
4. **No concurrent builds** — igual que deploys
5. **Verify before claiming done** — log verificado con ls/git log/git status
6. **No duplicate pipelines** — los 3 canónicos son Lingerie/Static/Jewelry; pipeline nuevo borra duplicados en el mismo commit
7. **Modules first, pipelines compose** — los módulos son la base; fix módulos primero, pipelines reusan

Plus reglas nuevas escuchadas en esta sesión:
- **Mejorar no dañar** — cada cambio mejora UX sin romper funcionalidad existente
- **Dashboard debe usar patrones de video/foto history existentes** (referencia a `/gallery` como inspiración)
- **Mobile + web** — todo debe funcionar en los dos

---

## Comandos útiles para la próxima sesión

```bash
# Ver estado actual
git -C /mnt/c/Users/maria/Documents/GitHub/Image-Desgn-Studio log --oneline -5

# Ver commits del pipeline rewrite
git -C /mnt/c/Users/maria/Documents/GitHub/Image-Desgn-Studio log --oneline b27ce7a..9f1b0eb

# Typecheck (filtrar ruido de tests + stale validator)
cd /mnt/c/Users/maria/Documents/GitHub/Image-Desgn-Studio/unistudio && npx --no-install tsc --noEmit 2>&1 | grep -v "__tests__\|jest\|validator.ts"

# Verificar imports colgados
grep -r "AgentChat\|getCatalogoPipeline\|getCambiarModeloPipeline" unistudio/src/ 2>/dev/null

# Inventory scan categories (todas deberían tener `.pipeline` set)
grep -A1 '"id":' unistudio/src/app/api/inventory/scan/route.ts | head -40
```

---

## Mensaje a mi yo futuro

Si estás retomando esto: la base está sólida. Los 3 pipelines funcionan, el backend está limpio (0 vulns), el type check pasa. Commit 9 estabilizó todo.

Lo que viene es **visual + mobile**, NO estructural. Resistí la tentación de refactorizar: la usuaria dijo literalmente "mejorar no dañar". Si un archivo te tienta a reescribirlo, preguntate: ¿esto mejora UX? Si no, no lo toques.

Prioridad absoluta al arrancar: leer este doc entero + ejecutar los comandos de "Ver estado actual" + confirmar con la usuaria cuál de Parte 1 (dashboard) o Parte 2 (mobile) arranca primero. Si vas bien de contexto, hacer ambas. Si no, Parte 2 primero (mobile es más alto impacto para su caso — probablemente usa celular para ver resultados mientras trabaja desde Curaçao).

---

# 🔬 RESEARCH — Proyectos similares + patrones a adoptar

La usuaria pidió deep analysis de otros proyectos AI automation similares. Resumen de lo que existe + patrones para adoptar:

## Competidores comerciales (ya compilados en commit 9 competitive analysis)

| Herramienta | Patrón clave aprovechable para UniStudio |
|---|---|
| **Photoroom** ($15-30/mo) | Mobile-first + "preview antes de aplicar" en cada paso — copiar UX de "show-what-will-happen" |
| **Pebblely** ($29/mo) | Librería curada de "escenas" con preview visual — reemplazar matriz hardcoded por UI de "elegir escena" |
| **Claid.ai** ($24/mo) | API-first con webhooks para progreso — permite integrar con Shopify sin frontend |
| **Flair.ai** ($30-99/mo) | "AI brief" — user escribe "quiero perfume con vibe playa" y AI arma prompt. LLM pasa el brief a un composer |
| **Booth.ai** ($50+/mo) | Template saving + batch consistency "mi look Yanbal" |
| **FASHN.ai v1.6** | Arquitectura de try-on — separar MODEL layer de GARMENT layer (ya hacemos con isolate + tryon) |
| **Draft** (jewelry-specific) | Macro close-ups automáticos + variantes de material (oro/plata/acero). Pattern crítico para joyería |
| **CreatorKit** | Export bundle multi-format (1:1 + 4:5 + 9:16 en 1 click) |

## Proyectos open-source relevantes (patrones arquitecturales)

### 1. **ComfyUI** (github.com/comfyanonymous/ComfyUI) — el referente de node-based
**Patrón:** canvas visual donde cada node es un paso (bg-remove, upscale, model-create), conectás outputs→inputs, preview por node. El usuario no-técnico VE el flujo.
**Aplicar a UniStudio:** el editor/plan view de lencería (STEP_DEFS) + panel de pasos podría ser un canvas tipo React Flow. La usuaria ya dijo que quiere ver cada paso. **Refactor target:** usar `@xyflow/react` (está declarado en package.json pero se borró en commit 1143bab — reinstalarlo si se adopta este patrón).

### 2. **InvokeAI** (github.com/invoke-ai/InvokeAI) — pattern gallery + workflows
**Patrón:** galería como first-class citizen, cada imagen tiene "metadata sticky" (el pipeline que la produjo, params), se puede "re-run" desde la galería.
**Aplicar:** `/gallery` debería mostrar el pipeline + params de cada resultado, con botón "Generar otra con mismos ajustes".

### 3. **Diffusers Web UI / Automatic1111** — "Send to..." pattern
**Patrón:** Result → "Send to inpaint" / "Send to img2img". User itera sin re-upload.
**Aplicar:** en cada resultado de los pipelines, botón "Usar como input" que manda la imagen al módulo de inpaint/enhance/etc. sin re-subir.

### 4. **Luma AI / Kling** — video progressive preview
**Patrón:** mientras el video renderiza, muestran low-res preview actualizando, y el resultado HD viene al final.
**Aplicar:** pedir a fal/Replicate formato de preview incremental, o simular con placeholder animado durante los 30s que tarda.

### 5. **n8n / Zapier / Make.com** — workflow automation pattern
**Patrón:** cada step es un "trigger" + "action" con error branches (qué pasa si falla). Visualmente claro.
**Aplicar:** en los pipelines, mostrar qué hace cada step si falla (skip, retry, abort) como decisión visible al usuario.

## Repositorios específicos de AI product photography

1. **lllyasviel/Fooocus** — UX simplificada sobre SD, "AI decides the rest". Inspiración para el AI Agent router del commit 7.
2. **bmaltais/kohya_ss** — training pipelines con checkpoints visibles. Pattern: "save intermediate artifacts".
3. **Mikubill/sd-webui-controlnet** — pose/edge/depth conditioning. Relevante si querés agregar "mantener la pose de la foto original" en try-on.

## Arquitectura de referencia (los mejores hacen esto)

Pattern común a todos los SaaS exitosos:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INPUT LAYER                                              │
│    Upload + categorization (auto or manual)                 │
│    → inventory auto-scan (UniStudio YA hace esto)           │
├─────────────────────────────────────────────────────────────┤
│ 2. PLANNING LAYER                                           │
│    AI decides the pipeline based on input + brief           │
│    Shows PREVIEW of steps before executing                  │
│    User can edit/skip steps (manual mode)                   │
│    → UniStudio lo tiene en lingerie, falta en static+jewelry│
├─────────────────────────────────────────────────────────────┤
│ 3. EXECUTION LAYER                                          │
│    Steps run with live preview per step                     │
│    Each step result is a checkpoint (can retry from there)  │
│    Cost tracked per step + accumulated                      │
│    → UniStudio lo tiene en lingerie, falta en static+jewelry│
├─────────────────────────────────────────────────────────────┤
│ 4. POST-PROCESSING LAYER                                    │
│    Multi-format export (1:1 + 4:5 + 9:16 + 16:9)            │
│    Brand Kit auto-apply (logo + watermark)                  │
│    Compliance check (Amazon, Shopify, Meta)                 │
│    → Los tres módulos EXISTEN pero no están wired a los     │
│      pipelines. Commit 12+ target.                          │
├─────────────────────────────────────────────────────────────┤
│ 5. GALLERY/PERSISTENCE LAYER                                │
│    Metadata sticky (pipeline + params + cost + timestamp)   │
│    Re-run from gallery                                      │
│    Analytics (which look performs best)                     │
│    → UniStudio gallery-store tier-2 IDB OK (commit 9).      │
│      Falta metadata sticky + re-run.                        │
└─────────────────────────────────────────────────────────────┘
```

UniStudio cubre 1 + parte de 2+3 (solo en lingerie). Gaps grandes: 4 (post-processing), 5 (re-run desde gallery).

## Recomendaciones priorizadas (después de arreglar el bug de aislar)

1. **Adoptar el pattern ComfyUI a nivel UX** (no código) — mostrar el pipeline como cadena visible con nodes clickeables. Puede ser un `<StepGraph>` simple sin react-flow, inspirado en el concepto. **Esfuerzo: 3-4h**.
2. **Multi-format export bundle** (commit F2 del competitive analysis) — 1 solo extra paso al final que llama outpaint 3 veces. **2-3h**.
3. **Brand Kit auto-apply** (commit F7) — agregar watermark/logo como último paso opcional en los 3 pipelines. El módulo BrandKit ya existe. **3h**.
4. **"Send to..." pattern** — botón "Usar como input en otro pipeline" en cada resultado. **2h**.
5. **Gallery metadata sticky + re-run** — guardar pipeline + params + inputs en ProcessingJob, botón "Generar otra igual". **3-4h**.

## Fuentes útiles (para deep research en próxima sesión)

- https://github.com/comfyanonymous/ComfyUI/wiki (workflows documentados)
- https://huggingface.co/spaces?category=image-to-image (space gallery — ver qué hace cada uno)
- Reddit r/StableDiffusion — best practices comunitarias
- https://fal.ai/models (actualizar lista de providers cada 3 meses — modelos nuevos salen seguido)
- Paper: "Realistic E-commerce Product Photography via Controllable Diffusion" (2024) — pattern de scene composition

---

# 🚨 PRIORIDAD #-1 — Lo que la usuaria pidió y NO pude completar (contexto al límite)

## A.0) CRÍTICO — Multi-ángulo estilo Leonisa (lo borré por error en commit 8)

### Lo que había antes y la usuaria pidió recuperar

En el commit 8 `f8f081a` borré `getCatalogoPipeline()` del plan/route.ts porque parecía duplicado del pipeline de Lencería. **Era un error.** Esa función generaba el SET COMPLETO de fotos por referencia que Leonisa (y todo e-commerce serio de lencería) produce:

- **Foto frontal** (3/4 frente, modelo mirando cámara)
- **Foto espalda** (3/4 espalda, muestra detalle trasero del bra — tirantes, broche)
- **Foto lateral** (perfil, muestra forma y soporte)
- **Foto lifestyle** (pose más relajada, contexto ambiental)
- Opcional: 2 infografías con texto sobre features (copas, aro, compresión)

Para cada REFERENCE → los 4 ángulos. Multiplicado por colores/tallas de la REF.

### Estándar Leonisa / competencia

Referencia a buscar en próxima sesión: leonisa.com, savagex.com, victoria's secret, ThirdLove. Todas muestran:
- 4-6 fotos por SKU (front, back, 3/4, side, lifestyle, detail crop)
- Consistencia de modelo entre poses (mismo cuerpo/cara en toda la referencia)
- Consistencia de fondo blanco estudio con lighting uniforme
- Tallas y colores variantes reusan la modelo (no regenerar cara)

### Implementación propuesta (próxima sesión)

**En `/pipelines/lingerie/page.tsx`:** después de crear modelo (step 3) y antes de videos, generar **4 try-ons en paralelo** con diferentes poses:
- `pose: "upper-body front-facing, confident smile"`
- `pose: "back view, 3/4 turn, showing shoulders and back strap"`
- `pose: "side profile, arms relaxed at sides"`
- `pose: "lifestyle, casual pose, natural lighting, clean background"`

La MISMA modelo IA (reuso vía sharedModelUrl + seed) vestida con la MISMA prenda aislada, en 4 poses. Resultado: 4 fotos listas para publicar.

### Cost estimado por REF

| Step | Veces | Costo |
|---|---|---|
| Aislar prenda | 1 | $0.01 |
| Crear modelo IA | 1 (reusada) | $0.055 |
| Try-on (frontal) | 1 | $0.02 |
| Try-on (espalda) | 1 | $0.02 |
| Try-on (lateral) | 1 | $0.02 |
| Try-on (lifestyle) | 1 | $0.02 |
| Video 360° | 1 | gratis (kenburns) |
| Video modelo combo | 1 | $0.05 (wan-2.2-fast) |
| Video textura zoom | 1 | gratis (kenburns) |
| **Total por REF** | | **~$0.195** |

Para una REF con 3 colores que reusa modelo: **$0.195 × 3 = $0.585 por REF completa**. Mejor: la usuaria tiene ahora 4 fotos + 2 videos profesionales por color.

### Código de referencia para resucitar

El código exacto de multi-ángulo está en git: `git show f8f081a^ -- unistudio/src/app/api/ai-agent/plan/route.ts | grep -A 100 getCatalogoPipeline`. Ese fue el delete commit. Se puede recuperar la lógica y portarla al lingerie page.

---

## A) Rework flow del Pipeline Lencería (reportado 2026-04-21)

Texto literal: "el bra funciona perfectamente ahora el flujo pero... nesecito es hacer el video 3d rotacion despues crear a la modelo con el bra puesto... despues ya tenemos a modelo con el bra puesto entonces se hace un video tipo ella con unos keams mostrando o unos pantys del mismo color modelando pude ser y otro video mostra textura detalles especificas zoom in zoom out como un video profesional"

**Flow actual:** Aislar → Fondo Profesional → Crear Modelo → Tryon → Video Producto → Video Modelo

**Flow que PIDIÓ:**
1. Aislar (prenda sola, ghost 3D) — ✓ ya funciona con SeedDream fallback
2. **Video 1 — Rotación 360°** de la prenda aislada (antes de modelo)
3. Crear Modelo IA
4. Tryon (vestir modelo con prenda)
5. **Video 2 — Modelo con combo**: modelo vistiendo el bra + un jean o panty del mismo color, modelando
6. **Video 3 — Textura/detalle**: zoom in/out sobre la prenda mostrando textura, construcción, detalles específicos, "como un video profesional"

**Cambios requeridos en `src/app/pipelines/lingerie/page.tsx`:**
- REORDER `STEP_DEFS` para que video rotación 360° vaya antes de crear modelo
- ELIMINAR el paso "Fondo Profesional" (ya no lo quiere)
- AGREGAR nuevo paso "Video textura/detalle" al final con prompt específico para Ken Burns zoom
- Para Video 2 (modelo con combo): modificar el prompt de wan-2.2-fast para pedir explícitamente "modelo con bra y jeans del mismo color, posando, mostrando la combinación"

## B) UI mejoras urgentes

Texto literal: "ui no esta bien no veo botones de edit, zoom in, download, botones esenciales... analiza qué botones esenciales necesito para UI y el usuario tenga todo en la mano"

**Botones/features que la usuaria pidió explícitamente:**
1. **Edit** — editar una imagen resultado (¿mandar al editor?)
2. **Zoom in** (click en thumbnail → abre full-size / modal con zoom)
3. **Download** — ya existe en algunos resultados pero no en todos los step cards
4. "Todo en la mano" — no tener que buscar

**Dónde agregarlos:**
- En cada step card del timeline: botones Download + Zoom
- En el resultado final de cada pipeline: Edit + Download + Compartir
- Al hover sobre cualquier thumbnail: botones aparecen
- Modal de preview full-size clickeable desde cualquier imagen

## C) Verificar que imágenes SE ESTÉN guardando en /gallery

La usuaria preguntó: "espero que las imagenes se esten guardando en gallery". Necesita verificación. Flujo actual:
- `/editor/page.tsx` llama a `autoSaveResult()` que fue arreglado con retry + toast en commit 9
- PERO los pipelines (`/pipelines/lingerie`, `/pipelines/static-product`, `/pipelines/jewelry`) **NO llaman a autoSaveResult** — sus resultados solo quedan en `job.resultUrl` en memoria + localStorage de gallery-store cuando se descarga
- **Fix:** agregar `addToGallery({ ... })` en cada pipeline cuando `job.status === "done"` para que el resultado aparezca en `/gallery` sin necesidad de descargar
- Revisar `src/stores/gallery-store.ts` → función `addImage` o `addImages`

---

# ✅ SHIPPED en esta sesión (commits ae88990 → 898bf11) — 12 commits consecutivos

Actualizado: agregar d385532 (SeedDream fallback para ghost extraction) y 898bf11 (fix 422 proxyReplicateUrl con fal.media).

La sesión de commit 9 continuó arreglando después del primer handoff. Progreso final:

| Commit | Qué | Estado |
|---|---|---|
| `ae88990` | Step timeline live en static-product | ✓ |
| `7a4a8dd` | Step timeline live en jewelry | ✓ |
| `64779e1` | H2 jewelry upscale hard-fail + H4 AI Agent prompt + H5 analyze-image timeout + H6 inventory error UI | ✓ |
| `8d75735` | D1 cross-session AI model reuse (ahorro $0.055/color) | ✓ |
| `774d3ca` | HD quality: Flux Pro + prompts 8K en 15 configs | ✓ |
| `fabee23` | CHANGELOG con la ola | ✓ |
| `b0f2a7b` | H1 manual-mode timeout + S1 garment-types a constants/ | ✓ |

## Gaps restantes después de esta sesión

### Prioridad alta (próxima sesión):
- **S3** — Borrar `src/hooks/useAgentPipeline.ts` (1081 líneas, 0 consumers runtime). Solo quedan strings en workflows/docs/architecture pages. Cuando se borre, actualizar esas referencias también.
- **Bug aislar en lencería** — VERIFICAR si `9f1b0eb` lo arregló. Si sigue fallando, inspeccionar `/api/bg-remove` Network tab + logs Vercel Functions.
- **F7 Brand Kit auto-apply** — agregar watermark/logo al final de cada pipeline. Brand store ya existe en `src/stores/brand-store.ts`. Modulo brand-kit/watermark existe.

### Prioridad media:
- **F2 Multi-format export** — generar 1:1 + 4:5 + 9:16 en el mismo run llamando `/api/outpaint` 2 veces extra sobre el resultado final. ~2h.
- **F3 Macro close-up automático** en joyería — crop + upscale 4x del detalle central. ~1h.
- **S2 Response shape consistency** — todas las rutas devolver `data.url` uniforme.
- **S4 Actualizar docs stale** — `docs/architecture.md`, `docs/guia-completa.md`, `docs/UX_UI_GUIDE.md` tienen referencias a código borrado.

### Features nice-to-have:
- F1 Color variant swap en lencería (reusa modelo + swap color prenda, $0.02 por variante)
- F5 Multi-angle desde 1 foto (front/back/side/lifestyle)
- F6 Seasonal themes (Navidad/DíaMadre/Verano)
- F8 Template saving ("mi look Yanbal")
- F9 Text overlays con módulo infographic
- F10 Lifestyle scenes (mano sosteniendo perfume, flat-lay)

### Data persistence deferred:
- D2 Brand Kit DB↔localStorage timestamp merge
- D3 Cost tracker a DB
- D4 FAL storage retention docs

---

# 🔴 BUG REPORT URGENTE — Aislar Producto falla en producción (2026-04-21, screenshot enviado)

La usuaria reportó con screenshot (`/mnt/c/Users/maria/Downloads/Screenshot 2026-04-21 004944.png`) que en `/pipelines/lingerie` el paso 1 "Aislar Producto" devuelve Error sin imagen. Los demás pasos quedan pendientes.

**Posible causa 1:** Vercel estuvo fallando el build desde commit 8 hasta que commit 9 (`9f1b0eb`) lo arregló (2026-04-21 ~00:45). Si la screenshot fue ANTES del redeploy, era versión vieja. Primera cosa a probar: hard reload + retest.

**Posible causa 2:** el `/api/bg-remove` con `removeSubject:true` + `garmentType:"bra"` puede estar fallando por:
- `grounded_sam` model de Replicate caído o reasignado (ver `schananas/grounded_sam:ee871c19...`)
- Input URL demasiado grande (payload limit de Vercel 4.5MB)
- Env var `REPLICATE_API_TOKEN` con `\n` al final (debería estar arreglado con .trim() en commit 9, pero health/route.ts aún chequea)

**Debug steps para próxima sesión:**
1. Abrir `/api/health` en prod — ¿muestra Replicate "connected"?
2. Abrir DevTools Network en `/pipelines/lingerie` — ver response exacto de `/api/bg-remove` cuando falla (status code + error message)
3. Revisar logs de Vercel Functions para `/api/bg-remove` — qué error devuelve grounded_sam
4. Si grounded_sam está caído, el fallback en `src/lib/processing/bg-remove.ts` (Claude Vision + rembg) debería activarse — verificar que esa cascade funciona
5. Probar con imagen más chica (<1MB) para descartar payload limit

**Archivos a inspeccionar:**
- `unistudio/src/app/api/bg-remove/route.ts` — handler
- `unistudio/src/lib/processing/bg-remove.ts` — lógica de isolateGarment + grounded_sam
- `unistudio/src/app/pipelines/lingerie/page.tsx:448-460` — donde se hace el fetch a bg-remove

---

# 🚨 PRIORIDAD #0 — REGRESIÓN UX en static-product + jewelry (reportada 2026-04-21)

**Texto exacto de la usuaria:** "pipeline estatico horible todo mal todos los avances que hicimos en los otros viejos pipeline lo borraste y esto está peor que antes. No estoy viendo live qué pasó. Procesó, hizo, puso, la foto se ve horrible, el fondo no se ve realístico, no se ve HD. No supe cuánto costó, no supe qué pasó, no supe cuánto gasté."

## Qué rompí (y por qué)

Commit 2 (`/catalog-pipeline` → `/pipelines/lingerie`) fue RENAME con `cp` — preservó el 98% del UI rico de catalog-pipeline (StepCard en vivo, antes/después, costo por paso, progress visible, manual/auto mode).

Commits 3 y 4 (**static-product** y **jewelry**) los **escribí desde cero con UX minimal**: `UploadZone`, select dropdowns, un botón "Procesar todas", un `StatusPill` chiquito, y un grid de resultados al final. **NO tienen:**

- ❌ Step cards visibles con preview de cada paso
- ❌ Antes/después por paso
- ❌ Live updates durante ejecución (la usuaria solo ve "done" al final)
- ❌ Costo por paso + costo acumulado visible
- ❌ Modo manual (aprobar/saltar/rehacer cada paso)
- ❌ Preview de qué va a pasar antes de ejecutar
- ❌ Output HD/premium (usa `style: "custom"` que puede estar cayendo a fallback genérico del route)

Comparado al `lingerie` que tiene ~1350 líneas de UX rico, los otros dos son ~500 líneas de formulario simple.

## Regla violada

`feedback_no_duplicate_pipelines.md` dice explícitamente: "Merge, no borrado — ver qué funciona bien y rescatarlo". Se violó al construir desde cero en lugar de copiar+adaptar la estructura de `/pipelines/lingerie`.

## Fix propuesto para la próxima sesión

**Approach:** copiar la estructura de UI de `/pipelines/lingerie/page.tsx` a los otros dos, adaptando solo la lógica de steps. NO reescribir desde cero.

### Pasos concretos

1. **Leer `/pipelines/lingerie/page.tsx` completo** — identificar:
   - `StepCard` component (líneas ~179-366)
   - `STEP_DEFS` array (líneas ~77-84)
   - Estado `jobs[]` con `steps[]` por job
   - Lógica de `runStep(step, inputUrl, ...)` que devuelve `{ resultUrl, cost }`
   - Manual mode con event listener + botones accept/skip/rerun
   - Progress tracker + cost accumulator visibles
   - `StatusBadge` + `ImageThumb` helpers

2. **Refactorizar `/pipelines/static-product/page.tsx`:**
   - Mantener la lib (`src/lib/pipelines/static-product.ts`) como está — el adaptive bg matrix ES bueno
   - Reemplazar la UI minimalista por el patrón de lingerie:
     - STEP_DEFS para los 6 pasos: isolate, normalize, adaptive-bg, shadow, enhance-final (con iconos + labels en español)
     - StepCard por cada paso mostrando input/output thumbnails
     - Costo por step + acumulado (ej: bg-remove $0.01, bg-generate $0.05 en precise mode, shadows gratis, enhance gratis → total $0.06 por foto)
     - Manual mode toggle
   - Fix de calidad: verificar que `bg-generate` con `mode: "precise"` + `customPrompt` está usando Flux Pro (no fallback). Probar en `/api/bg-generate/route.ts` qué hace con `style: "custom"`.

3. **Refactorizar `/pipelines/jewelry/page.tsx`:**
   - Mismo approach que static
   - STEP_DEFS: upload, isolate, upscale (obligatorio), estante, modelo (opcional), video (opcional)
   - Toggle de model/video permanece pero integrado a la step view
   - Mostrar los 3 outputs con preview grande + before/after slider

### Archivos NO tocar

- `src/lib/pipelines/static-product.ts` — matrix adaptativo está bien
- `src/lib/pipelines/jewelry.ts` — sub-type routing está bien
- `src/app/pipelines/lingerie/page.tsx` — este ES el template a copiar, funciona

### Fix de calidad HD (bug secundario pero importante)

La usuaria dice "la foto se ve horrible, el fondo no se ve realístico, no se ve HD". Auditar en `src/app/api/bg-generate/route.ts`:

1. ¿`style: "custom"` realmente hace fall-through a `customPrompt` con `mode: "precise"`?
2. ¿`mode: "precise"` invoca Flux Pro o cae a Flux Schnell por algún fallback?
3. ¿El output es HD (2048x2048+) o baja res?
4. ¿El prompt adaptativo de la matriz produce resultados decentes o es demasiado genérico?

Posibles causas de baja calidad:
- El prompt generado es demasiado corto/simple → Flux no tiene suficiente dirección
- `mode: "fast"` se usa por error cuando debería ser "precise"
- El imageUrl enviado es una data URL muy grande y el proveedor la redimensiona
- El aspectRatio "1:1" no es el mejor para productos verticales (perfumes)

### Tiempo estimado con context fresco

**4-6h** (copiar+adaptar es más rápido que escribir desde cero cuando tenés el template).

### ✅ Work-in-progress ya iniciado en `static-product/page.tsx` (commit pendiente)

La sesión de commit 9 empezó a instrumentar el step-tracking antes de quedarse sin contexto. Ya está en el archivo:

- Types nuevos: `StepKey` = "isolate" | "normalize" | "bg" | "shadow" | "finish"
- Type `StepSnapshot` con `{ resultUrl?, cost, status, error? }`
- Const `INITIAL_STEPS` (5 steps en estado "idle")
- Const `STEP_META` con label + icon emoji + costHint por step
- Job interface extendida con `steps: Record<StepKey, StepSnapshot>`
- Helper `updateStep(id, key, patch)` ya agregado al componente
- `handleFiles` ya incluye `steps: { ...INITIAL_STEPS }` al crear Jobs

**Lo que FALTA wire-up (próxima sesión):**

1. **Llamar `updateStep` dentro de cada paso de `processJob`:**
   ```ts
   // Al inicio del paso bg-remove:
   updateStep(job.id, "isolate", { status: "running" });
   // Después de recibir el resultado:
   updateStep(job.id, "isolate", {
     status: "done",
     resultUrl: bgData.data.url || bgData.data.imageUrl,
     cost: bgData.cost ?? 0.01,
   });
   // Si falla:
   updateStep(job.id, "isolate", { status: "error", error: message });
   ```
   Replicar para: `normalize` (paso 3), `bg` (paso 4), `shadow` (paso 5), `finish` (paso 6).
   El upload y el bg-remove se consideran paso "isolate" juntos (primer step visible).

2. **Agregar render de timeline de steps** en la tarjeta del job (después del preview, antes del status pill final). Pattern:
   ```tsx
   <div className="flex items-center gap-1 mt-2">
     {(Object.keys(STEP_META) as StepKey[]).map((key) => {
       const step = job.steps[key];
       const meta = STEP_META[key];
       return (
         <div key={key} className={cn(
           "flex-1 min-w-0 p-2 rounded text-xs border",
           step.status === "done" && "bg-emerald-500/10 border-emerald-500/30",
           step.status === "running" && "bg-amber-500/10 border-amber-500/30 animate-pulse",
           step.status === "error" && "bg-red-500/10 border-red-500/30",
           step.status === "idle" && "bg-white/[0.02] border-white/10",
         )}>
           <div className="flex items-center gap-1">
             <span>{meta.icon}</span>
             <span className="truncate">{meta.label}</span>
           </div>
           {step.resultUrl && (
             <img src={step.resultUrl} alt={meta.label}
                  className="mt-1 w-full h-12 object-contain rounded bg-black" />
           )}
           <div className="mt-1 text-[10px] text-gray-400">
             {step.status === "done" && `✓ $${step.cost.toFixed(3)}`}
             {step.status === "running" && "..."}
             {step.status === "idle" && meta.costHint}
             {step.status === "error" && "Error"}
           </div>
         </div>
       );
     })}
   </div>
   ```

3. **Replicar todo en `/pipelines/jewelry/page.tsx`** con las keys jewelry-specific (isolate, upscale, estante, modelo, video).

4. **Emojis en UI:** la usuaria confirmó implícitamente que OK para visuals ("como app de niños"). Usarlos libremente en step icons, status indicators, tooltips. NO poner emojis en código/commits/docs (regla previa `3743cba Kill all emojis`).

### Resultado esperado tras el fix

- Subir foto de perfume → ver los 6 pasos en cards grandes
- Cada paso se procesa en vivo, aparece el resultado al lado del input
- Usuaria puede rehacer cualquier paso si no le gusta
- Costo total visible en tiempo real
- Resultado final en HD con fondo adaptativo realístico

---

# NORTE UX — instrucción directa de la usuaria (2026-04-21, fin commit 9)

**Texto exacto:** "quiero que te enfoques en la experiencia, que en los módulos pueda ver cada paso, todo se pueda editar, optimizar, sea visual, importantísimo se vean los cambios. Necesito que todo sea interactivo. Mi user son personas que no manejan en absoluto tecnología pero quiero usar esta app para entender fácil y que se pueda ver todo los procesos visualmente. Que sea botón interactivo que explique ejemplo. Hablo por ejemplo CSS, no lo sé, como visuales. Ejemplo como si fuera un app de niños, algo así."

## Qué significa esto en la práctica

**Target user: NO técnico.** Paula vende a clientes finales (no devs). La app tiene que ser como Canva para niños — cada acción obvia, cada cambio visible al instante, cada botón se explica solo.

### 10 principios de diseño (honrar en cualquier commit futuro)

1. **Cada paso de un pipeline tiene que verse en vivo** — no más "procesando..." opaco. Muestra thumbnails de ANTES y DESPUÉS mientras corre.
2. **Botones con preview hover** — al pasar el mouse, muestra ejemplo visual de lo que hace (miniatura animada).
3. **Tooltips con ejemplo, no solo texto** — un arete sobre terciopelo negro, no "estante de terciopelo negro".
4. **Slider before/after en cada resultado** — se ve el input a la izquierda, el output a la derecha, drag para comparar.
5. **Iconos grandes + palabras en español simple** — "Quitar fondo" no "bg-remove", "Poner en modelo" no "try-on".
6. **Colores + emojis contextuales** — cada módulo con su paleta (lencería rosa/violeta, joyería dorado, perfumes beige). Iconos literales: 🩱 para lencería, 💎 para joyería, 🧴 para perfumes. (La usuaria ya removió emojis del código en un commit anterior, pero los quiere PARA UI visual — confirmar con ella si los emojis inline son OK).
7. **Progreso visible con animación** — step 2 de 6, barra de progreso llenándose, check verde cuando completa.
8. **"¿Qué va a pasar?" preview antes de ejecutar** — muestra los 6 pasos con iconos + costo de cada uno, así el usuario sabe qué va a suceder.
9. **Errors en castellano humano** — no "HTTP 500", sino "No pude conectar con la IA de fondos. ¿Querés reintentar?". Pattern: `humanizeError()` ya existe en `src/lib/utils/humanize-error.ts`, usarlo en todos los toast.
10. **Deshacer fácil** — cada paso debería tener "rehacer" o "saltar" visible. Ya existe en lingerie page pero necesita ser más prominente.

### Patrones de UI a implementar/extender

- **Step card con 3 zonas visibles**: [Input thumbnail] → [Iconito del paso + nombre en español] → [Output thumbnail con botón download + rehacer]
- **Hero CTA en cada pipeline**: "Subí tu foto de brassiere aquí" con drag-zone gigante + ícono animado de cámara, no "Arrastra archivos"
- **Progress tracker arriba**: 6 dots con icono de cada paso, el actual pulsa, los previos en verde, los futuros en gris
- **Panel de "Configurar antes de empezar"**: solo 2-3 campos visibles (tipo de producto, marca, modelo opcional), todo lo demás como "Ajustes avanzados" colapsable
- **Resultado final = pantalla grande**: grilla de todos los outputs (estante/modelo/video) con botón "Descargar todo" enorme + share buttons
- **Onboarding first-time**: la primera vez que alguien entra a un pipeline, overlay paso a paso con tooltips animados explicando cada zona de la UI

### Componentes reusables nuevos a crear (commit 10+)

Ninguno existe todavía. Candidatos (basar en shadcn/ui o crear custom):

| Componente | Dónde | Reemplaza |
|---|---|---|
| `<BeforeAfterSlider>` | Results de cada pipeline + gallery | Que no hay — usuaria pidió esto explícitamente |
| `<StepProgressBar steps={[...]} current={n}>` | Top de cada pipeline page | Los step-cards sueltos actuales |
| `<UploadHero>` | Start de cada pipeline | UploadZone actual (muy chiquita) |
| `<HoverPreviewButton>` | Sidebar + category grids | Botones actuales sin preview |
| `<CostBadge amount={0.15} tier="economic">` | Cada step definido | Texto "$0.15" suelto |
| `<ResultGrid outputs={{estante, modelo, video}}>` | Final de jewelry/lingerie pipeline | ResultCard sueltos actuales |
| `<ExplainTooltip example={<img/>}>` | Cada botón no-obvio | Los `title=` attributes actuales |

### Comportamientos interactivos esperados

- **Hover en un step futuro**: muestra tooltip "Este paso va a poner el bra en una modelo IA" con mini GIF/imagen de ejemplo.
- **Click en un step completado**: abre modal con el resultado full-size + "Rehacer este paso" + "Descargar".
- **Drag en foto cargada**: permite reordenar orden de procesamiento (en batch).
- **Shift+click en categorías**: selecciona varias (para batch).
- **Escape**: cierra cualquier modal o menú.
- **Cmd/Ctrl+Z**: deshace último paso (ya existe en editor, extender a pipelines).

### Mobile-first implicaciones

Esto amplifica la necesidad de mobile del plan original:
- Los step cards tienen que apilarse verticalmente en móvil
- El slider before/after tiene que funcionar con touch (no solo mouse)
- Los tooltips se convierten en tap-to-expand en lugar de hover
- El upload zone cubre toda la pantalla en móvil
- El progress bar se vuelve vertical en pantallas estrechas

## Reorden de prioridades para commit 10

**Parte 1 (antes era "dashboard redesign"): AHORA ES LA INTERACTIVIDAD VISUAL**

Reordenar así:
1. `<BeforeAfterSlider>` — el componente más pedido, reusable en gallery + los 3 pipelines
2. `<StepProgressBar>` — visible al top de cada pipeline, muestra paso por paso
3. Humanizar todos los toast con `humanizeError()`
4. Tooltips con ejemplo visual en sidebar + categorías
5. Dashboard redesign (lo que era Parte 1 original)
6. Mobile responsive sweep (lo que era Parte 2 original)

**Tiempo estimado con este ángulo: 8-12h** (más que las 5-6h originales porque agrega componentes reusables).

## Cómo evitar romper nada mientras agregamos interactividad

- **NUEVOS componentes** en `src/components/ui/` (before-after-slider, step-progress, etc.) — aditivos, no modifican nada existente
- **Integrar los componentes nuevos en las páginas existentes** reemplazando bloques UI pequeños (no re-escribir páginas enteras)
- Ejemplo: en `pipelines/lingerie/page.tsx`, reemplazar SOLO el render de step cards actuales con el nuevo `<StepProgressBar>`. El resto de la página queda igual.
- Cada commit del ciclo 10 toca 1 componente + la integración mínima para probarlo en 1 sola página. Luego extender a las otras.

## Métrica de éxito (cómo sabemos que mejoró)

Si una persona que NUNCA usó la app puede:
- Entrar al dashboard → entender qué pipeline usar en 5 segundos ✓
- Subir una foto sin leer instrucciones ✓
- Ver QUÉ va a pasar antes de apretar "empezar" ✓
- Ver cada paso ejecutándose con feedback visual ✓
- Comparar antes/después con un slider sin explicación ✓
- Descargar el resultado sin buscar el botón ✓

Entonces cumplimos "app para niños". Antes de cerrar commit 10, probar el flujo completo con esa checklist.

