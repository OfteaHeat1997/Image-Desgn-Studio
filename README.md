# UniStudio — AI Product Photography Platform

**For Unistyles** (Lingerie & Beauty E-Commerce, Curacao)

> Turn raw product photos into luxury, professional e-commerce images and videos — automatically.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.4.1-2D3748)](https://prisma.io/)

---

## What Is This?

UniStudio is a self-hosted Next.js web app that replaces $200+/month in SaaS tools (Photoroom, Claid, Pebblely, FASHN, remove.bg) with **ONE unified platform** costing $3-15/month in API fees.

### Key Numbers

| Metric | Count |
|--------|-------|
| Lines of code | 37,114 |
| Source files | 150 (62 TSX + 87 TS + 1 CSS) |
| Module panels | 19 + 5 video sub-components |
| API routes | 29 endpoints across 28 directories |
| Zustand stores | 6 (3 persisted to localStorage) |
| Prisma models | 7 |
| Pages | 10 |

---

## Quick Start

```bash
cd unistudio
cp .env.example .env.local   # Add your API keys
npm install
npx prisma generate
npx prisma db push           # Create database tables
npm run dev                   # http://localhost:3000
```

After starting, visit `http://localhost:3000/api/health` to verify all services are connected.

---

## Documentation

| Document | Purpose |
|---|---|
| **[Developer Setup](./unistudio/README.md)** | Quick start, env vars, build & deploy |
| **[Architecture & API Reference](./docs/architecture.md)** | Project structure, 29 API routes, DB schema, video system, key patterns |
| **[Guia Completa (ES)](./docs/guia-completa.md)** | Full project explanation in Spanish (beginner-friendly) |
| **[AI Agent Analysis](./docs/ai-agent-analysis.md)** | Deep analysis + improvement roadmap (Phase 1+2 complete) |
| **[Product Inventory](./docs/inventory.md)** | Complete Unistyles product catalog (486 products, 9 categories) |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React + TypeScript | 19.2.3 + 5.x |
| Styling | Tailwind CSS + Radix UI | 4.x |
| State | Zustand (6 stores, 3 persisted) | 5.0.11 |
| Database | Prisma + PostgreSQL | 7.4.1 |
| Canvas | Fabric.js | 7.2.0 |
| Image Processing | Sharp | 0.34.5 |
| AI Image APIs | Replicate (pay-per-use) | 1.4.0 |
| AI Video APIs | fal.ai (pay-per-use) | 1.2.1 |
| AI Planning | Claude Haiku (Anthropic API) | — |
| TTS | node-edge-tts (free) + Google Cloud | 1.2.10 |
| Workflow Diagrams | @xyflow/react | 12.10.1 |

---

## 18 Modules

| # | Module | Cost | What It Does |
|---|---|---|---|
| 1 | BG Remove | $0-0.004 | Remove backgrounds (browser WASM / Replicate / Docker) |
| 2 | BG Generate | $0-0.05 | Generate new backgrounds (27 presets, 3 modes) |
| 3 | Enhance | $0 | Color/brightness/contrast (10 presets, pure Sharp) |
| 4 | Shadows | $0-0.05 | Drop/contact/reflection shadows + AI relighting |
| 5 | Inpaint | $0.03-0.05 | Remove watermarks, tags, stains, change colors |
| 6 | Outpaint | $0.05 | Extend images for 14 platform formats |
| 7 | Try-On | $0.015-0.15 | Virtual try-on (IDM-VTON / Kolors / FASHN) |
| 8 | Model Create | $0.05 | Generate AI fashion models (gender/age/skin/pose) |
| 9 | Ghost Mannequin | $0.05-0.08 | Remove mannequin / flat-to-model / model-to-flat |
| 10 | Jewelry Try-On | $0.05 | Apply earrings, necklaces, rings, bracelets, watches |
| 11 | Video Studio | $0-0.80 | 7 video + 5 avatar + 2 TTS providers |
| 12 | Batch Processing | varies | Process multiple images through configurable pipeline |
| 13 | Brand Kit | $0 | Colors, fonts, logo, watermark, export templates |
| 14 | Marketplace Compliance | $0 | Check 9 platform requirements + auto-fix |
| 15 | Smart Editor | $0 | Adjust/transform/text/crop (all client-side via Fabric.js) |
| 16 | AI Prompt Assistant | $0-0.003 | 4 AI-generated photo concepts per product |
| 17 | Ad Creator | $0.04-0.35 | 7 social media ad templates (IG, TikTok, FB, YT, Pinterest) |
| 18 | AI Agent | $0-0.25+ | 3 autonomous agents (E-Commerce, Modelo, Social) |

---

## AI Agent (Module 18)

The AI Agent orchestrates all other modules automatically:

- **E-Commerce Agent**: Raw photo -> professional product listing
- **Modelo Agent**: Garment -> AI model wearing it (copyright-free)
- **Social Agent**: Product -> videos, banners, ads for social media

### Smart Features (Phase 1+2 Complete)

- **Image Analysis**: Auto-detects watermarks, bad lighting, low resolution, background type (Sharp + Claude Vision)
- **Watermark Auto-Removal**: Detected watermarks trigger automatic inpaint step before processing
- **Adaptive Planning**: Claude sees image analysis and builds smarter plans
- **Plan Editor**: Users can add/remove/reorder steps and adjust parameters before execution
- **Parallel Execution**: Independent steps (bg-remove + model-create) run simultaneously
- **Quality Validation**: Each step's output validated before flowing to next step
- **Visual Results**: Full-width step previews with click-to-zoom during execution
- **Budget Validation**: Cost confirmation dialog before executing paid steps
- **3 Budget Tiers**: Gratis ($0), Economico (<$0.20), Premium (best quality)

```
Pipeline: Upload -> Auto Analysis -> AI Planning (Claude Haiku) -> Plan Editor -> Parallel Execution -> Quality Validation -> Visual Results
```

---

## Pages

| Path | Description |
|---|---|
| `/` | Dashboard — module cards, workflow guide, hero section |
| `/editor` | Main editor — canvas + module panels + layers sidebar |
| `/agent` | Standalone AI Agent — simplified 3-step workflow |
| `/batch` | Batch processing — process multiple images at once |
| `/brand-kit` | Brand identity — colors, fonts, logo, watermark |
| `/gallery` | Processing history — browse, compare, re-download |
| `/docs` | Interactive file explorer — project structure documentation |
| `/workflows` | Visual workflow guide — step-by-step product photography |
| `/architecture` | Interactive architecture diagram — system overview |

---

## Project Structure

```
unistudio/
  src/
    app/
      api/              # 29 API routes across 28 directories
        analyze-image/   # Image analysis for agent intelligence
        ai-agent/plan/   # AI pipeline planning (Claude Haiku)
        bg-remove/       # Background removal (3 providers)
        bg-generate/     # Background generation (3 modes)
        video/           # Video generation (7 providers)
        avatar/          # Talking-head avatars (5 providers)
        ... (22 more)
      page.tsx           # Dashboard
      editor/page.tsx    # Main editor
      agent/page.tsx     # Standalone AI agent
      architecture/      # Architecture diagram page
    components/
      modules/           # 19 module panels
      editor/            # Editor layout (sidebar, toolbar, canvas)
      ui/                # 20+ shared UI components (toast, modal, etc.)
      video/             # 6 video sub-components
      dashboard/         # AgentChat component
    hooks/               # 7 custom hooks
      useAgentPipeline.ts  # Agent execution engine (801 lines)
      use-toast.ts         # Toast notification system (Zustand)
    lib/
      api/               # 5 API clients (Replicate, fal.ai, FASHN, withoutBG, route-helpers)
      processing/        # 16 processing modules
      video/             # Video providers, presets, TTS, costs (5 files)
      db/                # Prisma client, queries, persistence (3 files)
      batch/             # Pipeline + queue (2 files)
      brand/             # Brand kit + compliance (2 files)
      utils/             # cn, constants, cost-tracker, image, prompts (6 files)
    stores/              # 6 Zustand stores
    types/               # 6 TypeScript type files (api, video, agent, batch, brand, editor)
  prisma/
    schema.prisma        # 7 models (Project, Image, ProcessingJob, BrandKit, AiModel, VideoProject, PromptTemplate)
```

---

## Current Status (March 2026)

### What's Complete
- All 18 modules implemented with API routes and processing logic
- All 19 module panels have UI (16 original + UpscalePanel, BatchProcessPanel, BrandKitPanel)
- AI Agent Phase 1 (11 fixes): image analysis, budget validation, visual results, cost confirmation, retry fixes, blob cleanup
- AI Agent Phase 2 (4 fixes): watermark auto-removal, parallel execution, quality validation, plan editor UI
- All UI text in Spanish
- Luxury dark theme (#09090B background, #C5A47E gold accent)
- Zero TODO/FIXME comments in codebase
- All imports valid, no broken references

### Known Gaps
- Outpaint: both provider options route to same flux-kontext-pro model
- Batch + enhance incompatibility: batch route sends JSON but enhance API expects FormData
- No dedicated watermark removal module (uses inpaint + Kontext as workaround)
- No auth/rate limiting (single-user tool by design)
- Intelligent prompt construction partially done (needs per-category rich templates)
- No before/after comparison slider in module panels
- No inpaint mask drawing mode (Fabric.js brush)

### Future Roadmap (Phase 3-5)
See [AI Agent Analysis](./docs/ai-agent-analysis.md) for the complete roadmap:
- **Phase 3**: Before/after slider, inpaint mask mode, UX polish
- **Phase 4**: Multi-image batch agent, brand-aware processing, learning from history
- **Phase 5**: Timeouts, caching, rate limiting, progress streaming

---

## API Keys Needed

| Key | Required | For What | Get It |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection | Local Docker or cloud |
| `REPLICATE_API_TOKEN` | Yes | All AI image processing | [replicate.com](https://replicate.com) |
| `FAL_KEY` | Yes | Video generation (LTX, Wan 2.5, Kling, Minimax) | [fal.ai](https://fal.ai) |
| `ANTHROPIC_API_KEY` | Optional | AI planning (Claude Haiku) + image analysis | [console.anthropic.com](https://console.anthropic.com) |
| `FASHN_API_KEY` | Optional | Premium virtual try-on (FASHN v1.6) | [fashn.ai](https://fashn.ai) |
| `HEDRA_API_KEY` | Optional | Premium avatar generation | [hedra.com](https://hedra.com) |
| `GOOGLE_TTS_KEY` | Optional | Google Cloud TTS | [cloud.google.com](https://cloud.google.com) |
| `WITHOUTBG_URL` | Optional | Self-hosted BG removal Docker | Self-hosted |
| `UPSTASH_REDIS_REST_URL` | Optional | Redis caching | [upstash.com](https://upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Redis auth token | [upstash.com](https://upstash.com) |

---

## Cost Summary

```
FREE:         enhance, shadows(drop/contact/reflection), ken-burns video, edge-tts,
              bg-remove(browser/docker), compliance, smart-editor, brand-kit

$0.003-0.01:  bg-remove(replicate), bg-generate(fast), prompt-assist
$0.02-0.03:   upscale(esrgan/aura), tryon(kolors/idm-vton), inpaint(flux-fill-dev)
$0.04-0.05:   bg-generate(precise), model-create, tryon(fashn), outpaint,
              shadows(ai-relight), inpaint(pro/kontext), jewelry, ghost-mannequin,
              video(ltx/wan), avatar(musetalk)
$0.05-0.10:   upscale(clarity), avatar(sadtalker/liveportrait)
$0.35-0.80:   video(kling 5-10s), video(minimax 5-6s)
```

---

## License

Private project for Unistyles, Curacao.
