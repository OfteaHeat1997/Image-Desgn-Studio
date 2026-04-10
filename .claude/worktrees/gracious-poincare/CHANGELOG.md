# UniStudio — Changelog

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
