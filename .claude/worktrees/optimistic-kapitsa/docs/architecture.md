# UniStudio — Architecture & API Reference

> Detailed technical reference for developers. For project overview see [README](../README.md).
> For beginner-friendly guide in Spanish see [Guia Completa](./guia-completa.md).

---

## Project Structure

```
src/
├── app/
│   ├── api/                    # 29 API routes across 28 directories
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
│   ├── architecture/page.tsx   # Interactive architecture diagram
│   ├── batch/page.tsx          # Batch processing
│   ├── brand-kit/page.tsx      # Brand kit
│   ├── docs/page.tsx           # Interactive project docs
│   ├── gallery/page.tsx        # Gallery
│   └── workflows/page.tsx      # Visual workflow guide
│
├── components/
│   ├── modules/                # 19 module panels
│   │   ├── AiAgentPanel.tsx       # AI Agent (1,245 lines) — 3 agents, 4 phases, plan editor
│   │   ├── AiPromptPanel.tsx      # AI Prompt Assistant
│   │   ├── AdCreatorPanel.tsx     # Ad Creator (7 templates)
│   │   ├── BatchProcessPanel.tsx  # Batch Processing Pipeline
│   │   ├── BgGeneratePanel.tsx    # Background Generation
│   │   ├── BgRemovePanel.tsx      # Background Removal
│   │   ├── BrandKitPanel.tsx      # Brand Kit (sidebar summary)
│   │   ├── CompliancePanel.tsx    # Marketplace Compliance
│   │   ├── EnhancePanel.tsx       # Image Enhancement
│   │   ├── GhostMannequinPanel.tsx # Ghost Mannequin
│   │   ├── InpaintPanel.tsx       # Inpainting
│   │   ├── JewelryTryOnPanel.tsx  # Jewelry Try-On
│   │   ├── ModelCreatePanel.tsx   # AI Model Creation
│   │   ├── OutpaintPanel.tsx      # Outpainting
│   │   ├── ShadowsPanel.tsx       # Shadow Generation
│   │   ├── SmartEditorPanel.tsx   # Smart Editor (Fabric.js)
│   │   ├── TryOnPanel.tsx         # Virtual Try-On
│   │   ├── UpscalePanel.tsx       # Image Upscaling (3 providers)
│   │   └── VideoPanel.tsx         # Video Studio (749 lines)
│   ├── video/                  # Video sub-components
│   │   ├── AvatarVideoTab.tsx, FashionVideoTab.tsx, ProductVideoTab.tsx
│   │   ├── VideoModeToggle.tsx, VideoPreview.tsx, VideoProviderSelect.tsx
│   ├── editor/                 # Editor layout
│   │   ├── ModuleSidebar.tsx      # Left icon nav (categorized modules)
│   │   ├── Toolbar.tsx            # Top bar (undo/redo/zoom/export)
│   │   ├── LayersPanel.tsx, PropertiesPanel.tsx
│   │   └── ShadowsGuidePanel.tsx, TryOnGuidePanel.tsx
│   ├── dashboard/AgentChat.tsx # Chat interface (949 lines)
│   └── ui/                     # 20+ shared UI components
│       ├── toast.tsx, result-banner.tsx, processing-overlay.tsx
│       ├── empty-state.tsx, module-header.tsx, error-card.tsx
│       ├── image-compare.tsx, modal.tsx, dropzone.tsx, color-picker.tsx
│       └── button, card, badge, tabs, slider, select, switch, spinner, progress, tooltip
│
├── hooks/                      # 7 custom hooks
│   ├── useAgentPipeline.ts        # Agent execution engine (801 lines)
│   ├── useEditor.ts, useImageProcessing.ts, useBatchProcessing.ts
│   ├── useApiCost.ts, useProcessingState.ts
│   └── use-toast.ts               # Toast store (Zustand)
│
├── lib/
│   ├── api/                    # External API clients
│   │   ├── replicate.ts           # runModel() + extractOutputUrl()
│   │   ├── fal.ts                 # submitFal() + pollFal()
│   │   ├── fashn.ts               # runFashn() + pollFashn()
│   │   ├── withoutbg.ts           # WithoutBG Docker client
│   │   └── route-helpers.ts       # Shared API response formatting
│   ├── processing/             # 16 processing modules
│   │   ├── bg-remove.ts, bg-remove-browser.ts, bg-generate.ts
│   │   ├── enhance.ts, shadows.ts, inpaint.ts, outpaint.ts
│   │   ├── tryon.ts, upscale.ts, model-create.ts
│   │   ├── ghost-mannequin.ts, jewelry.ts
│   │   ├── video.ts, avatar.ts, ad-compose.ts
│   │   └── sharp-utils.ts
│   ├── video/                  # Video system
│   │   ├── providers.ts           # 7 video + 5 avatar + 2 TTS providers
│   │   ├── presets.ts, cost.ts, tts.ts, tts-voices.ts
│   ├── batch/pipeline.ts, queue.ts
│   ├── brand/brand-kit.ts, compliance.ts
│   ├── db/prisma.ts, persist.ts, queries.ts
│   └── utils/cn.ts, constants.ts, cost-tracker.ts, image.ts, prompts.ts, upload.ts
│
├── stores/                     # 6 Zustand stores
│   ├── editor-store.ts, video-store.ts, batch-store.ts
│   ├── gallery-store.ts, brand-store.ts, settings-store.ts
│
└── types/                      # 6 TypeScript type files
    ├── api.ts, video.ts, agent.ts, batch.ts, brand.ts, editor.ts
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
| `/api/ai-agent/plan` | POST | JSON (agentType, category, budget, desc, imageAnalysis?) | AgentPlan (steps[]) | $0-0.003 |
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

```
1. INPUT PHASE      2. ANALYSIS         3. PLANNING          4. PLAN EDIT         5. EXECUTION
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    ┌──────────────┐
│ Upload image │-->│ /api/analyze │-->│ /api/ai-agent│-->│ Add/remove/  │--->│ Parallel +   │
│ Pick agent   │   │ -image       │   │ /plan        │   │ reorder steps│    │ Sequential   │
│ Set budget   │   │ Sharp+Vision │   │ Claude Haiku │   │ Adjust params│    │ API calls    │
│ Describe     │   │ -> analysis  │   │ -> steps[]   │   │ -> edited[]  │    │ via pipeline │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘    └──────────────┘
                                                                                    │
                                                                                    v
                                                                              6. RESULTS
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
| **E-Commerce** | Raw photo -> professional listing | bg-remove -> bg-generate -> enhance -> shadows -> outpaint |
| **Modelo** | Garment -> AI model wearing it | bg-remove + model-create (parallel) -> tryon -> enhance -> bg-generate |
| **Social** | Product -> videos, banners, ads | bg-remove -> bg-generate -> enhance -> outpaint -> video -> ad-create |

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
```

### Zustand Store Persistence

3 stores persist to localStorage: `video-store`, `gallery-store`, `settings-store`.

### Server-Only Modules

`tts.ts` uses `node-edge-tts` (WebSocket/Node APIs) — import ONLY in server-side code (API routes). Use `tts-voices.ts` for client-side voice constants.
