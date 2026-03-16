# UniStudio — Developer Guide

**AI-Powered Product Photography Platform for Unistyles**

> Replaces $200+/month in SaaS tools (Photoroom, Claid, Pebblely, FASHN, remove.bg) with ONE unified platform costing $3-15/month in API fees.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys (see Environment Variables below)

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to database (first time only)
npx prisma db push

# 5. Run dev server
npm run dev
# Open http://localhost:3000
```

### Health Check

After starting, visit `http://localhost:3000/api/health` to verify:
- All required env vars are set
- Database connection works
- Optional services are available

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REPLICATE_API_TOKEN` | Yes | Replicate API — image processing, model creation, try-on, etc. |
| `FAL_KEY` | Yes | fal.ai API — video generation (LTX, Wan 2.5, Kling, Minimax) |
| `ANTHROPIC_API_KEY` | Optional | Claude Haiku — AI agent planning + image analysis |
| `FASHN_API_KEY` | Optional | FASHN v1.6 — premium virtual try-on |
| `HEDRA_API_KEY` | Optional | Hedra — premium avatar generation |
| `GOOGLE_TTS_KEY` | Optional | Google Cloud TTS (free tier) |
| `WITHOUTBG_URL` | Optional | Self-hosted background removal Docker URL |
| `UPSTASH_REDIS_REST_URL` | Optional | Redis caching |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Redis auth token |
| `CLOUDFLARE_R2_*` | Optional | R2 object storage (5 vars: endpoint, access key, secret, bucket, public URL) |

---

## Architecture

### Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React + TypeScript | 19.2.3 |
| Styling | Tailwind CSS + Radix UI | 4.x |
| State | Zustand (6 stores, 3 persisted) | 5.0.11 |
| Database | Prisma + PostgreSQL | 7.4.1 |
| Canvas | Fabric.js | 7.2.0 |
| Image Processing | Sharp | 0.34.5 |
| AI Image APIs | Replicate (pay-per-use) | 1.4.0 |
| AI Video APIs | fal.ai (pay-per-use) | 1.2.1 |
| AI Planning | Claude Haiku (Anthropic API) | — |
| TTS | node-edge-tts (free) + Google Cloud | 1.2.10 |

### Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Project overview, module cards, workflow guide |
| `/editor` | Main Editor | Left sidebar (modules) + center canvas + right sidebar (layers) |
| `/agent` | AI Agent | Standalone 3-step AI agent workflow |
| `/batch` | Batch Processing | Multi-image pipeline processing |
| `/brand-kit` | Brand Kit | Brand identity management |
| `/gallery` | Gallery | All processed images with history |
| `/docs` | Documentation | Interactive file explorer for project structure |
| `/workflows` | Workflows | Visual step-by-step product photography guide |

### Theme

- **Background**: `#09090B` (near black)
- **Gold accent**: `#C5A47E` (luxury gold)
- **All UI text**: Spanish

---

## Project Structure

```
src/
├── app/
│   ├── api/                    # 28 API route directories (32 endpoints)
│   │   ├── analyze-image/      # Image analysis (Sharp + Claude Vision)
│   │   ├── ai-agent/plan/      # AI pipeline planning (Claude Haiku)
│   │   ├── ai-models/          # AI model registry CRUD
│   │   ├── ad-create/          # Ad template generation
│   │   ├── avatar/             # Talking-head avatar (5 providers)
│   │   ├── batch/              # Batch processing pipeline
│   │   ├── bg-generate/        # Background generation (3 modes)
│   │   ├── bg-remove/          # Background removal (3 providers)
│   │   ├── brand-kit/          # Brand kit CRUD
│   │   ├── db/history/         # Processing history from DB
│   │   ├── enhance/            # Color/brightness/contrast (Sharp)
│   │   ├── ghost-mannequin/    # Mannequin remove/flat-to-model
│   │   ├── health/             # System health check
│   │   ├── inpaint/            # Watermark/defect removal (3 providers)
│   │   ├── inventory/          # Product catalog (scan + load)
│   │   ├── jewelry-tryon/      # Jewelry virtual try-on
│   │   ├── model-create/       # AI fashion model generation
│   │   ├── outpaint/           # Image extension (14 platforms)
│   │   ├── prompt/             # AI prompt generation
│   │   ├── prompt-templates/   # Prompt template CRUD
│   │   ├── save-result/        # Save processed image
│   │   ├── shadows/            # Shadow generation (5 types)
│   │   ├── tryon/              # Virtual try-on (3 providers)
│   │   ├── tts/                # Text-to-speech
│   │   ├── upload/             # Image upload handler
│   │   ├── upscale/            # Image upscaling (3 providers)
│   │   ├── video/              # Video generation (7 providers)
│   │   └── video-enhance/      # Video post-processing
│   ├── page.tsx                # Dashboard
│   ├── editor/page.tsx         # Main editor
│   ├── agent/page.tsx          # Standalone AI agent
│   ├── batch/page.tsx          # Batch processing
│   ├── brand-kit/page.tsx      # Brand kit
│   ├── gallery/page.tsx        # Gallery
│   ├── docs/page.tsx           # Interactive project docs
│   └── workflows/page.tsx      # Visual workflow guide
│
├── components/
│   ├── modules/                # 19 module panels
│   │   ├── AiAgentPanel.tsx       # AI Agent (971 lines) — 3 agents, 4 phases
│   │   ├── AiPromptPanel.tsx      # AI Prompt Assistant
│   │   ├── AdCreatorPanel.tsx     # Ad Creator (7 templates)
│   │   ├── BgGeneratePanel.tsx    # Background Generation
│   │   ├── BgRemovePanel.tsx      # Background Removal
│   │   ├── CompliancePanel.tsx    # Marketplace Compliance
│   │   ├── EnhancePanel.tsx       # Image Enhancement
│   │   ├── GhostMannequinPanel.tsx # Ghost Mannequin
│   │   ├── InpaintPanel.tsx       # Inpainting
│   │   ├── JewelryTryOnPanel.tsx  # Jewelry Try-On
│   │   ├── ModelCreatePanel.tsx   # AI Model Creation
│   │   ├── OutpaintPanel.tsx      # Outpainting
│   │   ├── ShadowsPanel.tsx       # Shadow Generation
│   │   ├── SmartEditorPanel.tsx   # Smart Editor
│   │   ├── TryOnPanel.tsx         # Virtual Try-On
│   │   ├── UpscalePanel.tsx       # Image Upscaling (3 providers)
│   │   ├── BatchProcessPanel.tsx  # Batch Processing Pipeline
│   │   ├── BrandKitPanel.tsx      # Brand Kit (sidebar summary)
│   │   └── VideoPanel.tsx         # Video Studio (749 lines)
│   ├── editor/                 # Editor layout
│   │   ├── ModuleSidebar.tsx      # Left icon nav (categorized modules)
│   │   ├── Toolbar.tsx            # Top bar (undo/redo/zoom/export)
│   │   ├── Canvas.tsx             # Center canvas (Fabric.js)
│   │   └── RightSidebar.tsx       # Right panel (layers/properties)
│   └── ui/                     # Shared UI components
│       ├── toast.tsx              # Toast notification container
│       ├── result-banner.tsx      # Success banner with cost + suggestions
│       ├── processing-overlay.tsx # Reusable progress overlay
│       ├── empty-state.tsx        # Upload prompt when no image
│       └── ... (Radix UI wrappers)
│
├── hooks/
│   ├── useAgentPipeline.ts     # Agent execution engine (623 lines)
│   ├── useEditor.ts            # Editor state/actions
│   ├── useImageProcessing.ts   # Per-module processing
│   ├── useBatchProcessing.ts   # Batch pipeline
│   ├── useApiCost.ts           # Cost tracking
│   └── use-toast.ts            # Toast store (Zustand)
│
├── lib/
│   ├── api/                    # External API clients
│   │   ├── replicate.ts           # Replicate: runModel() + extractOutputUrl()
│   │   ├── fal.ts                 # fal.ai: submitFal() + pollFal()
│   │   ├── fashn.ts               # FASHN: runFashn() + pollFashn()
│   │   └── withoutbg.ts           # WithoutBG Docker client
│   ├── processing/             # 16 processing modules
│   │   ├── bg-remove.ts           # 3 providers (browser/replicate/withoutbg)
│   │   ├── bg-remove-browser.ts   # Client-side WASM removal
│   │   ├── bg-generate.ts         # 3 modes + 27 presets
│   │   ├── enhance.ts             # 10 presets, 8 params (Sharp, $0)
│   │   ├── shadows.ts             # 5 types (3 free, 2 AI)
│   │   ├── inpaint.ts             # 3 providers + 10 presets
│   │   ├── outpaint.ts            # 14 platform presets
│   │   ├── tryon.ts               # 3 providers + smart routing
│   │   ├── model-create.ts        # AI model generation
│   │   ├── ghost-mannequin.ts     # 3 operations
│   │   ├── jewelry.ts             # 6 accessory types
│   │   ├── upscale.ts             # 3 providers (2x/4x)
│   │   ├── video.ts               # Video processing
│   │   ├── avatar.ts              # 5 avatar providers + TTS
│   │   ├── ad-compose.ts          # 7 ad templates
│   │   └── sharp-utils.ts         # Resize, crop, watermark, convert
│   ├── video/                  # Video system
│   │   ├── providers.ts           # 7 video + 5 avatar + 2 TTS providers
│   │   ├── presets.ts             # 18 motion presets
│   │   ├── cost.ts                # Cost calculations
│   │   ├── tts.ts                 # TTS engine (server-only)
│   │   └── tts-voices.ts          # Voice definitions (client-safe)
│   ├── batch/                  # Batch system
│   │   ├── pipeline.ts            # Processing pipeline
│   │   └── queue.ts               # Job queue
│   ├── brand/                  # Brand management
│   │   ├── brand-kit.ts           # Brand kit utilities
│   │   └── compliance.ts         # Marketplace compliance rules
│   ├── db/                     # Database utilities
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── persist.ts             # saveJob() helper
│   │   └── queries.ts             # Common DB queries
│   └── utils/                  # General utilities
│       ├── cn.ts                  # classname merging
│       ├── constants.ts           # App constants
│       ├── cost-tracker.ts        # Cost tracking utilities
│       ├── image.ts               # Image helpers
│       └── prompts.ts             # Prompt templates
│
├── stores/                     # 6 Zustand stores
│   ├── editor-store.ts            # Layers, undo/redo, zoom, canvas
│   ├── video-store.ts             # Video studio state (persisted)
│   ├── batch-store.ts             # Batch jobs + pipeline presets
│   ├── gallery-store.ts           # Image gallery (persisted)
│   ├── brand-store.ts             # Brand kit + export templates
│   └── settings-store.ts         # API keys, costs, preferences (persisted)
│
└── types/                      # TypeScript types
    ├── api.ts                     # API request/response types
    ├── video.ts                   # Video provider/preset types
    └── agent.ts                   # Agent types + ImageAnalysis
```

---

## 29 API Routes Reference

### Image Processing

| Route | Method | Input | Output | Cost |
|---|---|---|---|---|
| `/api/bg-remove` | POST | FormData (file) or JSON (imageUrl) | Transparent PNG URL | $0-0.004 |
| `/api/bg-generate` | POST | JSON (imageUrl, preset, mode) | Image with new background | $0-0.05 |
| `/api/enhance` | POST | FormData (file) or JSON (imageUrl, preset) | Enhanced image data URL | $0 |
| `/api/shadows` | POST | JSON (imageUrl, type, params) | Image with shadows | $0-0.05 |
| `/api/inpaint` | POST | JSON (imageUrl, prompt, mask?, provider) | Inpainted image URL | $0.03-0.05 |
| `/api/outpaint` | POST | JSON (imageUrl, platform, aspectRatio) | Extended image URL | $0.05 |
| `/api/upscale` | POST | JSON (imageUrl, scale, provider) | Upscaled image URL | $0.02-0.10 |

### Models & Try-On

| Route | Method | Input | Output | Cost |
|---|---|---|---|---|
| `/api/model-create` | POST | JSON (gender, age, skinTone, bodyType, pose) | AI model image URL | $0.05 |
| `/api/tryon` | POST | JSON (modelImage, garmentImage, category, provider?) | Try-on result URL | $0.015-0.15 |
| `/api/ghost-mannequin` | POST | JSON (imageUrl, operation) | Processed image URL | $0.05-0.08 |
| `/api/jewelry-tryon` | POST | JSON (modelImage, accessoryImage, type) | Try-on result URL | $0.05 |
| `/api/ai-models` | GET/POST | GET: list models, POST: create model entry | Model data | $0 |

### Video & Audio

| Route | Method | Input | Output | Cost |
|---|---|---|---|---|
| `/api/video` | POST | JSON (imageUrl, prompt, provider, params) | Video URL | $0-0.80 |
| `/api/avatar` | POST | JSON (faceImage, audioUrl/script, provider) | Avatar video URL | $0.005-0.09 |
| `/api/tts` | POST | JSON (text, voice, provider) | Audio URL | $0 |
| `/api/video-enhance` | POST | JSON (videoUrl, params) | Enhanced video URL | varies |
| `/api/ad-create` | POST | JSON (imageUrl, template, headline, cta) | Ad video URL | $0.04-0.35 |

### AI & Intelligence

| Route | Method | Input | Output | Cost |
|---|---|---|---|---|
| `/api/analyze-image` | POST | FormData (file) or JSON (imageUrl) | ImageAnalysis object | $0-0.001 |
| `/api/ai-agent/plan` | POST | JSON (agentType, category, budget, desc) | AgentPlan (steps[]) | $0-0.003 |
| `/api/prompt` | POST | JSON (category, style, platform) | 4 prompt suggestions | $0-0.003 |
| `/api/prompt-templates` | GET/POST | Template CRUD | Template data | $0 |

### Data & Storage

| Route | Method | Input | Output | Cost |
|---|---|---|---|---|
| `/api/upload` | POST | FormData (file) | Upload URL | $0 |
| `/api/save-result` | POST | JSON (imageUrl, metadata) | Saved record | $0 |
| `/api/db/history` | GET | Query params | Processing history | $0 |
| `/api/batch` | POST | JSON (images[], pipeline) | Batch job status | varies |
| `/api/brand-kit` | GET/POST/PUT | Brand kit CRUD | Brand kit data | $0 |
| `/api/inventory/scan` | POST | JSON (directory) | Scanned products | $0 |
| `/api/inventory/load` | GET | Query params | Product catalog | $0 |
| `/api/health` | GET | — | System status JSON | $0 |

---

## Database Schema (Prisma)

7 models in `prisma/schema.prisma`:

| Model | Purpose | Key Fields |
|---|---|---|
| **Project** | Parent container for images | name, description, thumbnailUrl |
| **Image** | Processed image record | originalUrl, processedUrl, width, height, fileSize |
| **ProcessingJob** | Job tracking + cost | operation, provider, status, cost, processingTime |
| **BrandKit** | Brand identity | colors, fonts, logoUrl, watermark, defaultBgStyle |
| **AiModel** | AI model registry | gender, ageRange, skinTone, bodyType, pose |
| **VideoProject** | Video generation tracking | provider, status, cost, duration, aspectRatio |
| **PromptTemplate** | Prompt library | category, prompt, negativePrompt, isPublic |

---

## AI Agent System

### How It Works

```
1. INPUT PHASE      2. ANALYSIS         3. PLANNING          4. EXECUTION
┌──────────────┐   ┌──────────────┐   ┌──────────────┐    ┌──────────────┐
│ Upload image │-->│ /api/analyze │-->│ /api/ai-agent│--->│ Sequential   │
│ Pick agent   │   │ -image       │   │ /plan        │    │ API calls    │
│ Set budget   │   │ Sharp+Vision │   │ Claude Haiku │    │ via useAgent │
│ Describe     │   │ -> analysis  │   │ -> steps[]   │    │ Pipeline     │
└──────────────┘   └──────────────┘   └──────────────┘    └──────────────┘
                                                                │
                                                                v
                                                          5. RESULTS
                                                          ┌──────────────┐
                                                          │ Visual steps │
                                                          │ Cost summary │
                                                          │ Download     │
                                                          │ Use in canvas│
                                                          └──────────────┘
```

### 3 Agent Types

| Agent | Purpose | Typical Pipeline |
|---|---|---|
| **E-Commerce** | Raw photo → professional product listing | bg-remove → bg-generate → enhance → shadows → outpaint |
| **Modelo** | Garment → AI model wearing it | bg-remove → model-create → tryon → enhance → bg-generate |
| **Social** | Product → videos, banners, ads | bg-remove → bg-generate → enhance → outpaint → video → ad-create |

### Budget Tiers

| Tier | Limit | What's Available |
|---|---|---|
| **Gratis** | $0.00 | Browser bg-remove, Sharp enhance, CSS shadows, Ken Burns video |
| **Economico** | <$0.20 | Replicate bg-remove, Flux bg-generate, IDM-VTON try-on |
| **Premium** | Unlimited | Best providers for everything (FASHN, Kling, Clarity, AI relight) |

### StepContext Pattern

The pipeline passes context between steps:
- `currentUrl`: The latest processed image URL (updated after each step)
- `garmentUrl`: Preserved from bg-remove for use in tryon/jewelry-tryon
- `modelUrl`: Set by model-create, used by tryon/jewelry-tryon

---

## Video System

### 7 Video Providers

| Provider | Cost | Duration | Quality | Backend |
|---|---|---|---|---|
| Ken Burns | $0 (free) | 5-15s | Basic zoom/pan | CSS animation |
| LTX-Video | $0.04 | 5s | Good | fal.ai |
| Wan 2.2 Fast | $0.05 | 3-5s | Good | Replicate |
| Wan 2.5 | $0.05-0.10 | 3-5s | Very good | fal.ai |
| Wan 2.1 | $0.05 | 3-5s | Good | Replicate |
| Kling 2.6 | $0.07/sec | 5-10s | Excellent | fal.ai |
| Minimax Hailuo | $0.35-0.80 | 5-6s | Excellent | fal.ai |

### 5 Avatar Providers

| Provider | Cost | Quality | Backend |
|---|---|---|---|
| Wav2Lip | $0.005 | Basic lip sync | Replicate |
| MuseTalk | $0.04 | Good lip sync | Replicate |
| SadTalker | $0.08 | Full face animation | Replicate |
| LivePortrait | $0.09 | Best quality | Replicate |
| Hedra Free | $0 (limited) | Good | Hedra API |

### TTS (Text-to-Speech)

| Provider | Cost | Voices | Languages |
|---|---|---|---|
| Edge TTS | $0 (free) | 13 voices | 5 languages (ES, EN, FR, NL, PAP) |
| Google Cloud TTS | $0 (free tier) | Many | All |

---

## Key Patterns

### API Client Pattern

All external APIs follow the same submit/poll or sync pattern:

```typescript
// Replicate (sync)
const output = await runModel('owner/model', { ...params });
const url = extractOutputUrl(output);

// fal.ai (queue-based)
const requestId = await submitFal('fal-ai/model', { ...params });
const result = await pollFal(requestId);

// FASHN (submit/poll)
const id = await runFashn({ ...params });
const result = await pollFashn(id);
```

### Replicate Model Naming

```
Official models:    owner/name              (e.g., wan-video/wan-2.2-i2v-fast)
Community models:   owner/name:sha256hash   (MUST include hash, otherwise 404)
```

### Toast Notifications

```typescript
import { toast } from "@/hooks/use-toast";
toast.success("Operacion exitosa");
toast.error("Error al procesar");
toast.info("Procesando imagen...");
```

### Zustand Store Persistence

3 stores persist to localStorage: `video-store`, `gallery-store`, `settings-store`.

---

## Current Status (March 2026)

- All 18 modules implemented with API routes and processing logic
- All 19 module panels have UI (16 original + UpscalePanel, BatchProcessPanel, BrandKitPanel)
- AI Agent Phase 1+2 complete: image analysis, budget validation, visual results, cost confirmation
- All UI text in Spanish
- 28 API route directories (32 endpoints) operational
- Luxury dark theme throughout
