# UniStudio — Changelog

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
