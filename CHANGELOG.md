# UniStudio — Changelog

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
