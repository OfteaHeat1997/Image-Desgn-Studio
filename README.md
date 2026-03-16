# UniStudio - AI Product Photography Platform

**For Unistyles** (Lingerie & Beauty E-Commerce, Curacao)

> Turn raw product photos into luxury, professional e-commerce images and videos — automatically.

---

## What Is This?

UniStudio is a self-hosted Next.js web app that replaces $200+/month in SaaS tools (Photoroom, Claid, Pebblely, FASHN, remove.bg) with ONE unified platform costing $3-15/month in API fees.

## Quick Start

```bash
cd unistudio
cp .env.example .env.local   # Add your API keys
npm install
npx prisma generate
npx prisma db push           # Create database tables
npm run dev                   # http://localhost:3000
```

## Documentation

| Document | Purpose |
|---|---|
| [Blueprint v2](./unistudio-ultimate-blueprint-v2.md) | Original architecture plan (outdated — 16 modules, historical reference only) |
| [Developer Guide](./unistudio/README.md) | Setup, env vars, architecture, all API routes |
| [Inventory](./INVENTORY.md) | Complete Unistyles product catalog (486 products, 9 categories) |
| [AI Agent Analysis](./ANALYSIS-AI-AGENT-IMPROVEMENT.md) | Deep analysis + improvement roadmap |

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + custom dark luxury theme
- **State**: Zustand 5 (6 stores, 3 persisted to localStorage)
- **Database**: Prisma 7 + PostgreSQL (no Supabase)
- **Canvas**: Fabric.js 7
- **AI Backends**: Replicate (pay-per-use) + fal.ai (pay-per-use)
- **AI Planning**: Claude Haiku (via Anthropic API)
- **TTS**: Edge TTS (free) + Google Cloud TTS (free tier)

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
| 15 | Smart Editor | $0 | Adjust/transform/text/crop (all client-side) |
| 16 | AI Prompt Assistant | $0-0.003 | 4 AI-generated photo concepts per product |
| 17 | Ad Creator | $0.04-0.35 | 7 social media ad templates |
| 18 | AI Agent | $0-0.25+ | 3 autonomous agents (E-Commerce, Modelo, Social) |

## AI Agent (Module 18)

The AI Agent orchestrates all other modules automatically:

- **E-Commerce Agent**: Raw photo -> professional product listing
- **Modelo Agent**: Garment -> AI model wearing it (copyright-free)
- **Social Agent**: Product -> videos, banners, ads for social media

### Smart Features

- **Image Analysis**: Auto-detects watermarks, bad lighting, low resolution, background type (Sharp + Claude Vision)
- **Watermark Auto-Removal**: Detected watermarks trigger automatic inpaint step before processing
- **Adaptive Planning**: Claude sees image analysis and builds smarter plans (skips bg-remove if already transparent, adds enhance if bad lighting)
- **Parallel Execution**: Independent steps (bg-remove + model-create) run simultaneously
- **Quality Validation**: Each step's output is validated before flowing to the next step
- **Visual Results**: Full-width step previews with click-to-zoom during execution
- **Budget Validation**: Cost confirmation dialog before executing paid steps

Pipeline: `Image Upload -> Auto Analysis -> AI Planning (Claude Haiku) -> Parallel Execution -> Quality Validation -> Visual Results`

## Pages

| Path | Description |
|---|---|
| `/` | Dashboard — all modules, workflow guide, hero section |
| `/editor` | Main editor — canvas + module panels + layers sidebar |
| `/agent` | Standalone AI Agent — simplified 3-step workflow |
| `/batch` | Batch processing — process multiple images at once |
| `/brand-kit` | Brand identity — colors, fonts, logo, watermark |
| `/gallery` | Processing history — browse, compare, re-download |
| `/docs` | Interactive file explorer — project structure documentation |
| `/workflows` | Visual workflow guide — step-by-step product photography |

## Project Structure

```
unistudio/
  src/
    app/
      api/              # 29 API route directories (33 endpoints)
        analyze-image/   # Image analysis for agent intelligence
        ai-agent/plan/   # AI pipeline planning
        bg-remove/       # Background removal
        bg-generate/     # Background generation
        video/           # Video generation (7 providers)
        avatar/          # Talking-head avatars (5 providers)
        ... (22 more)
      page.tsx           # Dashboard
      editor/page.tsx    # Main editor
      agent/page.tsx     # Standalone AI agent
    components/
      modules/           # 19 module panels
      editor/            # Editor layout (sidebar, toolbar, canvas)
      ui/                # Shared UI components
    hooks/
      useAgentPipeline.ts  # Agent execution engine
      use-toast.ts         # Toast notification system
    lib/
      api/               # API clients (Replicate, fal.ai, FASHN, withoutBG)
      processing/        # 16 processing modules
      video/             # Video providers, presets, TTS, costs
    stores/              # 6 Zustand stores
    types/               # TypeScript types (api, video, agent)
  prisma/
    schema.prisma        # 7 models (Project, Image, ProcessingJob, etc.)
```

## Current Status (March 2026)

- All 18 modules implemented with API routes and processing logic
- All 19 module panels have UI (16 original + UpscalePanel, BatchProcessPanel, BrandKitPanel)
- AI Agent Phase 1+2 complete:
  - Image analysis on upload (watermarks, lighting, resolution, background)
  - Smart planning (Claude sees analysis, auto-adapts plans)
  - Auto watermark removal (inpaint injected when detected)
  - Parallel execution (bg-remove + model-create)
  - Quality validation between steps
  - Full-width visual results with click-to-zoom
  - Budget validation + cost confirmation
- All UI text in Spanish
- Luxury dark theme (#09090B background, #C5A47E gold accent)

## API Keys Needed

| Key | Required | For What |
|---|---|---|
| `REPLICATE_API_TOKEN` | Yes | All AI image processing |
| `FAL_KEY` | Yes | Video generation (LTX, Wan 2.5, Kling, Minimax) |
| `ANTHROPIC_API_KEY` | Optional | AI planning (Claude Haiku) + image analysis |
| `FASHN_API_KEY` | Optional | Premium virtual try-on |
| `HEDRA_API_KEY` | Optional | Premium avatar generation |
| `GOOGLE_TTS_KEY` | Optional | Google Cloud TTS |
| `DATABASE_URL` | Yes | PostgreSQL connection |
