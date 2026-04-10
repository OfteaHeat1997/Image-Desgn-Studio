# UniStudio Deep Analysis: AI Agent & Full Platform Improvement Plan

**Date**: March 2026 (last updated March 23, 2026)
**Scope**: Complete codebase analysis of 29 API routes, 19 module panels, 16 processing modules, 6 stores, 7 video providers, 5 avatar providers, and the AI Agent system.
**Phase 1 Status**: COMPLETED (11 fixes — March 3, 2026)
**Phase 2 Status**: COMPLETED (4 fixes — March 3, 2026)
**Phase 3 Status**: Panels complete, UX polish remaining

---

## TABLE OF CONTENTS

1. [Current Architecture Assessment](#1-current-architecture-assessment)
2. [AI Agent Critical Gaps](#2-ai-agent-critical-gaps)
3. [Missing Capabilities](#3-missing-capabilities-the-agent-doesnt-know-about)
4. [The Perfect AI Agent: What It Should Know & Do](#4-the-perfect-ai-agent)
5. [Module-by-Module Intelligence Matrix](#5-module-intelligence-matrix)
6. [Pipeline Chains: When/Why/How](#6-pipeline-chains)
7. [UX/UI Improvements Needed](#7-uxui-improvements)
8. [Cost Optimization Strategy](#8-cost-optimization)
9. [E-Commerce Platform Standards](#9-e-commerce-platform-standards)
10. [Prioritized Implementation Roadmap](#10-implementation-roadmap)

---

## 1. CURRENT ARCHITECTURE ASSESSMENT

### What Exists (18 Modules)

```
FONDOS (Backgrounds)           MEJORA (Enhancement)         EDICION (Editing)
 1. BG Remove (3 providers)     3. Enhance (10 presets)      5. Inpaint (3 providers)
 2. BG Generate (27 presets)    4. Shadows (5 types)         6. Outpaint (14 platforms)
                                8. Upscale (3 providers)     15. Smart Editor

MODELOS (Models)               CONTENIDO (Content)          AUTOMATIZACION
 7. Try-On (3 providers)        11. Video Studio (7+5)       16. AI Prompt Assistant
 9. Model Create                12. Batch Processing*        17. Ad Creator (7 templates)
 10. Ghost Mannequin            13. Brand Kit*               18. AI Agent (3 agents)
 14. Jewelry Try-On             19. Marketplace Compliance

 * = All panels now implemented (BatchProcessPanel, BrandKitPanel, UpscalePanel added in Phase 1-2)
```

### Current AI Agent Architecture

```
USER INPUT                    PLANNING                      EXECUTION
+------------------+    +-------------------+    +------------------------+
| Agent Type       |    | Claude Haiku      |    | Sequential Pipeline    |
| Product Category |--->| (or fallback      |--->| Step 1 -> Step 2 -> ...|
| Budget Tier      |    |  templates)       |    | via useAgentPipeline   |
| Description      |    | Returns: steps[]  |    | hook                   |
| Preferences      |    +-------------------+    +------------------------+
+------------------+           |                          |
                               v                          v
                    AgentPlan {steps, cost}     StepContext {currentUrl,
                                                garmentUrl, modelUrl}
```

### Strengths

1. **3-agent design** maps well to real e-commerce workflows (product shots, model shots, social content)
2. **StepContext pattern** elegantly handles branching data flow (garmentUrl preserved for tryon)
3. **Graceful degradation** -- Claude planning falls back to local templates
4. **Free-first approach** -- every module has a $0 option
5. **Category-aware intelligence** -- perfume gets reflection shadows, jewelry routes to jewelry-tryon
6. **Cost tracking** is excellent -- every API call logged with actual cost
7. **Spanish UI** consistently across all 16 panels

### Critical Weaknesses

1. **The agent is DUMB** -- it only chains pre-defined sequences. It cannot:
   - Analyze the input image to decide what it needs
   - Detect watermarks, bad lighting, low resolution, wrong backgrounds
   - Adapt its plan based on intermediate results
   - Retry with different parameters if quality is poor
   - Handle multiple images in a batch

2. **No quality feedback loops** -- steps execute blindly without checking results
3. **No image analysis** -- the agent doesn't know what's IN the image
4. **No watermark removal** -- a critical gap for Unistyles' real inventory
5. **No parallel execution** -- bg-remove + model-create could run simultaneously
6. **Free tier is broken** -- Modelo and Social Avatar produce useless results at $0
7. **No plan editing** -- users can't add/remove/reorder steps
8. **Budget validation missing** -- Claude's plans aren't validated against budget constraints

---

## 2. AI AGENT CRITICAL GAPS

### Gap 1: No Image Analysis (THE BIGGEST GAP)

The agent receives an image but has NO IDEA what's in it. It should analyze:

| What to Detect | Why It Matters | How to Fix |
|---|---|---|
| **Watermarks/logos** | Must remove before any processing | Add Florence-2 or YOLO detection step |
| **Background type** | Already white? Don't waste $ on bg-remove | Sharp metadata + edge detection |
| **Resolution** | Low-res? Add upscale step | `sharp.metadata()` -- width/height check |
| **Lighting quality** | Dark/overexposed? Add enhance step | Histogram analysis via sharp |
| **Product category** | Auto-detect lingerie vs perfume vs jewelry | Vision model classification |
| **Has mannequin?** | Route to ghost-mannequin module | Vision model detection |
| **Image format** | HEIC? Convert first | File type detection |
| **Color accuracy** | Over-saturated? Under-saturated? | Color space analysis |

**Implementation**: Add a `POST /api/analyze-image` route that uses Claude Vision (or a cheaper vision model) to analyze the input image and return structured data about what the agent should do.

### Gap 2: No Quality Validation Between Steps

Current: Step 1 finishes -> Step 2 starts immediately (no quality check).

Should be:
```
Step 1 (bg-remove) finishes
  -> Quality check: Are edges clean? Is the product fully preserved?
     -> YES: proceed to Step 2
     -> NO: retry with different provider or flag for human review
```

**Quality checks per module**:
- **bg-remove**: Edge quality (no halo artifacts), product completeness (nothing cut off)
- **bg-generate**: Product preservation (product unchanged), background coherence
- **enhance**: Color accuracy (not over-saturated), no artifacts introduced
- **shadows**: Natural appearance, correct light direction
- **tryon**: Garment fits naturally, no distortion, skin tone matches
- **upscale**: No hallucinated details, text still readable
- **video**: No flickering, product visible throughout

### Gap 3: No Watermark Removal Pipeline

Unistyles has real product images with watermarks from suppliers. The pipeline needs:

```
1. Detect watermark region (Florence-2 / YOLO / manual mask)
2. Generate inpainting mask from detection
3. Run LaMa/Flux Fill inpainting to reconstruct the region
4. Validate result (watermark fully removed, no artifacts)
```

**Models available on Replicate**:
- `bria/eraser` -- clean object removal
- `bria/genfill` -- generative fill
- `black-forest-labs/flux-fill-pro` -- already integrated in inpaint module
- `black-forest-labs/flux-kontext-pro` -- already integrated, instruction-based

**Recommendation**: Add as Module 19 "Watermark Removal" with auto-detect + manual mask modes.

### Gap 4: No Intelligent Prompt Construction

The agent uses generic prompts. It should construct prompts based on:

```
Product: Perfume bottle, gold cap, "Chanel No. 5" label
Category: perfume
Target: Instagram feed post

GENERATED PROMPTS:
- bg-generate: "Luxury marble surface with soft golden bokeh lights,
  elegant minimalist setting, professional product photography,
  warm ambient lighting, high-end cosmetics advertising"

- shadows: "Soft reflection on polished marble surface, warm studio
  lighting from upper-left, subtle golden ambient glow"

- video: "Slow elegant 360-degree rotation, camera gently orbits
  the perfume bottle, dramatic studio lighting with golden accents,
  luxury cosmetics commercial feel, smooth cinematic motion"
```

Each product category needs different prompt patterns:
- **Lingerie**: Soft, elegant, body-positive, tasteful
- **Perfume**: Luxury, reflective surfaces, dramatic lighting
- **Jewelry**: Macro detail, metallic reflections, clean backgrounds
- **General fashion**: Editorial, lifestyle, trend-forward

### Gap 5: No Batch Intelligence

The agent processes ONE image. For e-commerce, you need CONSISTENCY across dozens of SKUs:

```
Batch Agent Mode:
1. Upload 20 product photos
2. Agent analyzes ALL of them, groups by category
3. Plans ONE pipeline per category (not per image)
4. Applies consistent settings across the group:
   - Same background style
   - Same shadow type and direction
   - Same enhancement preset
   - Same aspect ratio and dimensions
5. Generates ALL results with uniform look
```

### Gap 6: No Learning from User Preferences

The agent starts from scratch every time. It should:
- Remember which providers the user prefers
- Learn from previous successful runs (what pipeline worked for lingerie?)
- Store "brand presets" (Unistyles always wants gold accent, white background, drop shadow)
- Apply Brand Kit colors/fonts automatically to generated content

---

## 3. MISSING CAPABILITIES THE AGENT DOESN'T KNOW ABOUT

### 3.1 Watermark/Logo Removal (NEW MODULE NEEDED)

| Feature | Implementation |
|---|---|
| Auto-detect watermarks | Claude Vision / Florence-2 |
| Manual mask drawing | Canvas mask tool (Fabric.js) |
| LaMa inpainting | IOPaint API or Replicate `bria/eraser` |
| Flux Fill inpainting | Already have `flux-fill-pro` in inpaint module |
| Instruction-based | Already have Kontext in inpaint module |
| Legal disclaimer | UI warning about copyright compliance |

### 3.2 Color Correction / White Balance (ENHANCE MODULE EXPANSION)

Current enhance module has white balance BUT the agent never uses it intelligently. Add:
- Auto white balance detection (is image too warm? too cool?)
- Color consistency across batch (match all SKUs to a reference)
- Product color accuracy verification

### 3.3 Perspective Correction

Product photos often have perspective distortion. Add:
- Auto-detection of tilted products
- Perspective transform via sharp/canvas
- Crop-to-product auto-framing

### 3.4 Multi-Accessory Application

Current jewelry module applies ONE accessory per call. For a complete look:
- Earrings + Necklace + Bracelet in one pipeline
- Layer multiple calls with cumulative results

### 3.5 Image Comparison Slider (UX)

No before/after comparison exists. Add `img-comparison-slider` (3KB, zero deps):
- Draggable slider between original and processed
- Per-step comparison in agent results
- Gallery comparison view

### 3.6 Batch Processing Panel — IMPLEMENTED

`BatchProcessPanel.tsx` now exists and wires to `batch-store.ts` + `/api/batch`.

### 3.7 Brand Kit Panel — IMPLEMENTED

`BrandKitPanel.tsx` now exists and wires to `brand-store.ts` + `/api/brand-kit`.

### 3.8 Upscale Panel — IMPLEMENTED

`UpscalePanel.tsx` now exists with 3 provider options + scale selector.

---

## 4. THE PERFECT AI AGENT: WHAT IT SHOULD KNOW & DO

### 4.1 Image Analysis Phase (NEW)

Before planning, the agent should analyze the input:

```typescript
interface ImageAnalysis {
  // Basic metadata
  width: number;
  height: number;
  format: string;
  fileSize: number;

  // Content analysis (via Claude Vision or similar)
  productCategory: ProductCategory;      // auto-detected
  hasWatermark: boolean;                 // detect watermarks/logos
  watermarkRegion?: BoundingBox;         // where is the watermark
  hasMannequin: boolean;                 // ghost mannequin needed?
  backgroundType: 'white' | 'colored' | 'lifestyle' | 'studio' | 'messy';
  lightingQuality: 'good' | 'poor' | 'overexposed' | 'underexposed';
  productPosition: 'centered' | 'off-center' | 'cropped';
  hasTag: boolean;                       // price tag visible?
  hasReflection: boolean;               // unwanted reflections?
  isLowResolution: boolean;             // needs upscaling?
  colorAccuracy: 'good' | 'oversaturated' | 'desaturated' | 'wrong-wb';

  // Recommendations
  suggestedSteps: AgentModule[];         // what this image needs
  suggestedBudget: BudgetTier;          // min budget for good results
  warnings: string[];                    // issues detected
}
```

### 4.2 Smart Planning Phase (IMPROVED)

The planning should consider the analysis:

```
IF hasWatermark -> add watermark-remove step FIRST
IF backgroundType !== 'white' AND target is marketplace -> add bg-remove
IF isLowResolution -> add upscale step (at the END)
IF lightingQuality === 'poor' -> add AI relight step
IF hasTag -> add inpaint step to remove tag
IF hasReflection -> add inpaint step to remove reflection
IF hasMannequin -> route to ghost-mannequin module
IF colorAccuracy !== 'good' -> add enhance step with color correction
```

### 4.3 Intelligent Provider Selection

The agent should pick providers based on input characteristics:

```
BG REMOVAL:
- Simple product on solid bg -> browser (free, fast)
- Complex product (glass, hair, transparency) -> replicate rembg ($0.004)
- Batch of 50+ images -> withoutbg Docker (free, fast, consistent)

BACKGROUND GENERATION:
- Marketplace (needs pure white) -> local sharp (free)
- Social media (lifestyle) -> Flux Kontext Pro ($0.05, best quality)
- Quick preview -> Flux Schnell ($0.003, draft quality)

VIDEO:
- Product showcase, budget -> Ken Burns (free)
- Social media ad -> Wan 2.2 Fast ($0.05, good quality)
- Premium hero content -> Kling 2.6 ($0.70 for 10s, best quality)

TRY-ON:
- Lingerie/swimwear -> IDM-VTON (best for intimate apparel)
- General clothing -> FASHN v1.6 (highest quality if API key set)
- Quick preview -> Kolors (fastest, cheapest at $0.015)

UPSCALE:
- General product -> Real-ESRGAN ($0.02, reliable)
- With faces -> Real-ESRGAN + GFPGAN face enhance
- Maximum detail -> Clarity Upscaler ($0.05-0.10, AI detail generation)
```

### 4.4 Quality Feedback Loop (NEW)

After each step, run validation:

```typescript
interface StepValidation {
  passed: boolean;
  score: number;        // 0-100 quality score
  issues: string[];     // what's wrong
  suggestion: string;   // how to fix
  canAutoFix: boolean;  // can retry automatically
}
```

Example validation rules:
```
AFTER bg-remove:
  - Check alpha channel exists (not just a white background)
  - Check product edges (no halo, no missing parts)
  - Check file size (transparent PNG should be smaller than original)

AFTER bg-generate:
  - Compare product region to original (SSIM > 0.95 = product preserved)
  - Check background consistency (no artifacts, coherent scene)

AFTER enhance:
  - Check histogram (not clipped highlights/shadows)
  - Check color temperature matches target

AFTER tryon:
  - Check body proportions (not distorted)
  - Check garment alignment (not floating or misplaced)
  - Check skin tone consistency
```

### 4.5 Parallel Execution (NEW)

Independent steps should run concurrently:

```
E-Commerce Pipeline (optimized):
  PARALLEL: [bg-remove] + [analyze-image]
  SEQUENTIAL: enhance -> shadows -> outpaint

Modelo Pipeline (optimized):
  PARALLEL: [bg-remove (garment)] + [model-create (AI model)]
  SEQUENTIAL: tryon (needs both results) -> enhance

Social Pipeline (optimized):
  PARALLEL: [bg-remove] + [bg-generate prompt optimization]
  SEQUENTIAL: bg-generate -> enhance -> outpaint -> video -> ad-create
```

This would cut Modelo pipeline time by ~50% (model-create takes ~8s and can run while bg-remove runs).

---

## 5. MODULE INTELLIGENCE MATRIX

### What the Agent Must Know About Each Module

| Module | When to Use | Input Requirements | Output Type | Cost Range | Quality Notes |
|---|---|---|---|---|---|
| **Watermark Remove** | Image has watermarks, logos, text overlays | Image + mask or auto-detect | Clean image | $0.03-0.05 | Use Flux Fill for text, Kontext for logos |
| **BG Remove** | Need transparent product, prep for bg-generate | Any product photo | Transparent PNG | $0-0.004 | Browser=slow but free, Replicate=fast |
| **BG Generate** | Need new background (marketplace=white, social=lifestyle) | Transparent product + style preset | Product on new bg | $0-0.05 | Precise mode preserves product exactly |
| **Enhance** | Color/brightness/contrast adjustment needed | Any image | Enhanced image | $0 always | Use after bg-generate, before shadows |
| **Shadows** | Product looks flat, needs grounding | Transparent or product image | Image with shadows | $0-0.05 | Perfume=reflection, lingerie=contact, general=drop |
| **Inpaint** | Remove defects, tags, stains, change colors | Image + mask or text instruction | Fixed image | $0.03-0.05 | Kontext=no mask needed, Flux Fill=mask required |
| **Outpaint** | Extend image for different platform dimensions | Image + target aspect ratio | Extended image | $0.05 | Use platform presets for correct sizes |
| **Upscale** | Image is low resolution (<1000px) | Any image | 2x-4x larger image | $0.02-0.10 | ALWAYS last step (upscale final result) |
| **Try-On** | Put garment on AI model | Garment image + model image | Model wearing garment | $0.015-0.15 | IDM-VTON for lingerie, FASHN for general |
| **Model Create** | Need AI fashion model (no real model available) | Text description + preferences | Full-body model photo | $0.05 | Specify gender, age, skin tone, body type, pose |
| **Ghost Mannequin** | Product on mannequin needs hollow effect | On-mannequin photo | Hollow/3D product view | $0.05-0.08 | OR convert flat lay <-> on-model |
| **Jewelry Try-On** | Put accessories on model | Accessory image + model image | Model wearing accessory | $0.05 | Prompt-based, may not match exact design |
| **Video** | Need product video for social/ads | Still image + prompt | 3-15s video | $0-0.80 | Ken Burns=free, Kling=premium |
| **Avatar** | Need talking-head presenter | Face image + script text | Talking video | $0.005-0.09 | Edge TTS for free audio |
| **Ad Create** | Need platform-formatted social ad | Product image + template | Video ad | $0.04-0.35 | 7 platform templates |

### Decision Tree: Which Module When?

```
INPUT: Raw product photo

HAS WATERMARK?
  YES -> Watermark Remove -> continue
  NO -> continue

GOAL: E-Commerce listing photo
  -> BG Remove (transparent)
  -> BG Generate (platform-appropriate bg)
  -> Enhance (auto preset)
  -> Shadows (category-appropriate)
  -> Outpaint (platform dimensions)
  -> [IF low-res] Upscale
  -> Compliance Check

GOAL: Model wearing product (lingerie/clothing)
  -> BG Remove (isolate garment)
  -> Model Create (matching demographics)
  -> [PARALLEL with model-create]
  -> Try-On (dress the model)
  -> Enhance
  -> BG Generate (lifestyle bg)
  -> [IF low-res] Upscale

GOAL: Model wearing accessories (jewelry/sunglasses)
  -> BG Remove (isolate accessory)
  -> Model Create (matching demographics)
  -> Jewelry Try-On (apply accessory)
  -> Enhance
  -> [IF multiple accessories] Jewelry Try-On again
  -> BG Generate

GOAL: Social media content (video)
  -> BG Remove
  -> BG Generate (lifestyle bg)
  -> Enhance
  -> Outpaint (platform dimensions)
  -> Video (AI motion)
  -> Ad Create (add text/CTA)

GOAL: Product on mannequin -> clean product shot
  -> Ghost Mannequin (remove mannequin)
  -> Enhance
  -> Shadows
  -> Outpaint

GOAL: Flat lay photo -> on-model photo
  -> BG Remove (isolate from flat lay)
  -> Model Create
  -> Ghost Mannequin (flat-to-model)
  -> Enhance
  -> BG Generate
```

---

## 6. PIPELINE CHAINS: COMPLETE REFERENCE

### E-Commerce Agent Pipelines

```
BASIC (Free): bg-remove(browser) -> enhance(auto) -> shadows(drop,free)
Cost: $0.00 | Time: ~15s | Quality: 6/10

STANDARD (Economic): bg-remove(replicate) -> enhance(ecommerce) -> shadows(contact) -> outpaint(platform)
Cost: ~$0.06 | Time: ~25s | Quality: 8/10

PREMIUM: bg-remove(replicate) -> bg-generate(kontext-pro) -> enhance(luxury) -> shadows(ai-relight) -> outpaint(kontext) -> upscale(clarity)
Cost: ~$0.25 | Time: ~60s | Quality: 10/10

WITH WATERMARK: watermark-remove -> bg-remove -> bg-generate -> enhance -> shadows -> outpaint
Cost: ~$0.20 | Time: ~45s | Quality: 9/10

WITH DEFECTS: watermark-remove -> inpaint(fix-stain/tag) -> bg-remove -> bg-generate -> enhance -> shadows
Cost: ~$0.25 | Time: ~50s | Quality: 9/10
```

### Modelo Agent Pipelines

```
BASIC (Free): bg-remove(browser) -> enhance(fashion)
Cost: $0.00 | Time: ~15s | Quality: 3/10 (NO model, NO tryon - USELESS)

STANDARD: bg-remove(replicate) -> model-create -> tryon(idm-vton) -> enhance(fashion)
Cost: ~$0.10 | Time: ~35s | Quality: 8/10

PREMIUM: bg-remove(replicate) -> model-create -> tryon(fashn) -> enhance(luxury) -> bg-generate(lifestyle) -> outpaint(instagram) -> upscale(real-esrgan)
Cost: ~$0.25 | Time: ~55s | Quality: 10/10

JEWELRY: bg-remove -> model-create -> jewelry-tryon(earrings) -> jewelry-tryon(necklace) -> enhance -> bg-generate
Cost: ~$0.20 | Time: ~45s | Quality: 8/10

GHOST MANNEQUIN: ghost-mannequin(remove) -> enhance -> shadows(reflection) -> outpaint(amazon)
Cost: ~$0.10 | Time: ~30s | Quality: 8/10
```

### Social Agent Pipelines

```
HERO IMAGE: bg-remove -> bg-generate(lifestyle) -> enhance(luxury) -> outpaint(instagram-feed)
Cost: ~$0.10 | Time: ~30s | Quality: 9/10

PRODUCT VIDEO: bg-remove -> enhance -> video(wan-2.2-fast) -> ad-create(ig-reel)
Cost: ~$0.10 | Time: ~45s | Quality: 8/10

AVATAR: model-create -> avatar(sadtalker) + tts(edge-tts)
Cost: ~$0.13 | Time: ~40s | Quality: 8/10

FULL AD: bg-remove -> bg-generate -> enhance -> outpaint(9:16) -> video(kling) -> ad-create(tiktok)
Cost: ~$0.50 | Time: ~90s | Quality: 10/10

STORY: bg-remove -> bg-generate(dramatic) -> enhance -> outpaint(instagram-story)
Cost: ~$0.10 | Time: ~30s | Quality: 9/10
```

---

## 7. UX/UI IMPROVEMENTS NEEDED

### 7.1 Before/After Comparison Slider (HIGH PRIORITY)

Currently NO visual comparison exists. Add `img-comparison-slider`:

```
Install: npm install img-comparison-slider
Size: ~3KB minified, zero dependencies
Works with: React, vanilla JS, web components
```

Where to add:
- Agent results phase (compare step-by-step results)
- Every module panel (compare before/after)
- Gallery view (compare original vs processed)

### 7.2 ~~Missing Panels~~ — ALL BUILT

All three panels (BatchProcessPanel, BrandKitPanel, UpscalePanel) have been implemented.

### 7.3 Agent Plan Editor (MEDIUM PRIORITY)

Users should be able to:
- Remove steps they don't want
- Reorder steps (drag and drop)
- Add additional steps from a module picker
- Adjust step parameters before execution
- See estimated cost update in real-time

### 7.4 ~~Agent Results Download~~ — DONE (Phase 1, Fix 9)

"Descargar" button added next to "Usar en Editor" in results phase.

### 7.5 ~~Cost Confirmation Dialog~~ — DONE (Phase 1, Fix 6)

Amber confirmation dialog shows before executing any paid pipeline ($0.01+) with per-step cost breakdown.

### 7.6 Live Canvas Preview for Smart Editor (LOW PRIORITY)

Current: all changes require clicking "Apply".
Ideal: real-time preview using CSS filters for adjust tab.

### 7.7 Inpaint Mask Mode (MEDIUM PRIORITY)

Marked "PRONTO" in the UI. Essential for precise editing. Use Fabric.js brush tool to draw masks directly on the canvas.

### 7.8 ~~Image Upload Preview in Agent Panel~~ — DONE (Phase 1, Fix 8)

Thumbnail preview with filename, dimensions, format, and file size shown during input phase. Image analysis results (warnings, recommendations) also displayed.

---

## 8. COST OPTIMIZATION STRATEGY

### Provider Selection by Budget Tier

```
GRATIS ($0):
  bg-remove: browser (WASM)
  enhance: always free (sharp)
  shadows: drop/contact/reflection (sharp)
  video: Ken Burns (CSS)
  tts: Edge TTS (free)

ECONOMICO (<$0.15):
  bg-remove: replicate rembg ($0.004)
  bg-generate: Flux Schnell ($0.003) or Kontext Pro ($0.05)
  enhance: free
  shadows: free (programmatic) or AI relight ($0.04)
  outpaint: Kontext Pro ($0.05)
  tryon: Kolors ($0.015) or IDM-VTON ($0.02)
  model-create: Kontext Pro ($0.05)
  video: LTX-Video ($0.04) or Wan 2.2 Fast ($0.05)

PREMIUM (best quality):
  bg-remove: replicate ($0.004)
  bg-generate: Kontext Pro ($0.05) with custom prompt
  enhance: luxury preset (free)
  shadows: AI relight ($0.05)
  outpaint: Kontext Pro ($0.05)
  tryon: FASHN v1.6 ($0.05-0.15)
  model-create: Kontext Pro ($0.05)
  upscale: Clarity ($0.05-0.10)
  video: Kling 2.6 Pro ($0.07/sec)
```

### Flux Kontext Pro Optimization

Kontext Pro is used by 7+ modules at $0.05/call. In a full pipeline, this adds up:
- bg-generate ($0.05) + outpaint ($0.05) + model-create ($0.05) + shadows ($0.05) = $0.20 just for Kontext

**Optimization**: Use cheaper alternatives where quality difference is minimal:
- bg-generate: Flux Schnell for previews ($0.003)
- outpaint: Flux Fill Dev ($0.025) for standard quality
- shadows: programmatic shadows ($0) when possible

### Batch Cost Savings

For 20 product photos through the E-Commerce pipeline:
```
Individual: 20 x $0.06 = $1.20 (standard)
Optimized batch:
  - bg-remove (Docker/withoutBG): $0.00 x 20 = $0.00
  - enhance (sharp): $0.00 x 20 = $0.00
  - shadows (programmatic): $0.00 x 20 = $0.00
  - outpaint (Kontext): $0.05 x 20 = $1.00
  Total: $1.00 (saved $0.20 by using free local processing)
```

---

## 9. E-COMMERCE PLATFORM STANDARDS

### Image Requirements by Platform

| Platform | Min Size | Recommended | Max Size | Aspect Ratio | Background | Format |
|---|---|---|---|---|---|---|
| Amazon | 1000x1000 | 2000+ longest | 10000 longest | 1:1 (3:4 alt) | Pure white #FFFFFF | JPEG/PNG |
| Shopify | 800x800 | 2048x2048 | 5000x5000 (20MB) | 1:1 | Any (white preferred) | JPEG/PNG/WebP |
| Instagram Feed | 1080x1080 | 1080x1350 | -- | 1:1 or 4:5 | Any | JPEG/PNG |
| Instagram Story | 1080x1920 | 1080x1920 | -- | 9:16 | Any | JPEG/PNG |
| TikTok Shop | 1080x1080 | 1080x1920 | -- | 1:1 or 9:16 | White preferred | JPEG/PNG |
| Pinterest | 1000x1500 | 1000x1500 | -- | 2:3 | Any | JPEG/PNG |
| Facebook Marketplace | 1080x1080 | 1080x1080 | -- | 1:1 | White preferred | JPEG |
| eBay | 500x500 | 1600x1600 | -- | 1:1 | White preferred | JPEG/PNG |
| Etsy | 2000x2000 | 2000x2000 | -- | 1:1 (4:3 alt) | Lifestyle OK | JPEG/PNG |
| Walmart | 1000x1000 | 2000x2000 | -- | 1:1 | Pure white #FFFFFF | JPEG |

### Video Requirements by Platform

| Platform | Max Length | Optimal | Aspect Ratio | Resolution |
|---|---|---|---|---|
| Instagram Reels | 3 min | 60-90s | 9:16 | 1080x1920 |
| TikTok | 60 min | 15-30s | 9:16 | 1080x1920 |
| YouTube Shorts | 3 min | 30-60s | 9:16 | 1080x1920 |
| Facebook Ad | 240 min | 6-15s | 1:1 or 16:9 | 1080x1080 or 1920x1080 |
| Product Page | No limit | 30-60s | 16:9 or 1:1 | 1920x1080 or 1080x1080 |

### Luxury Photography Standards (Unistyles)

For Unistyles' lingerie and beauty products, the luxury standard requires:

1. **Lighting**: Clean, intelligent, soft diffused light. No harsh shadows or hot spots.
2. **Backgrounds**: Pure white for marketplace, soft gradient/marble for brand website, lifestyle for social.
3. **Color accuracy**: Products must match real-world appearance exactly. No over-processing.
4. **Consistency**: Same background, lighting, shadow, and positioning across ALL products in a category.
5. **Shadows**: Subtle and natural. Contact shadows for lingerie, reflection shadows for perfume/glass, drop shadows for general.
6. **Resolution**: Minimum 2000px on longest side for zoom capability.
7. **Aspect ratio**: 1:1 for marketplace, 4:5 for Instagram, 9:16 for stories/reels.

---

## 10. IMPLEMENTATION ROADMAP (PRIORITIZED)

### Phase 1: Fix Critical Agent Issues -- COMPLETED (March 2026)

All 11 fixes implemented and tested:

1. **Add image analysis step** (`/api/analyze-image`) -- DONE
   - Created `POST /api/analyze-image` route (29th API route)
   - Sharp metadata + histogram analysis (free, always available)
   - Claude Vision (Haiku) for watermark/text detection (~$0.001, optional)
   - Returns `ImageAnalysis` with suggestedSteps[], warnings[], minBudgetNeeded
   - Added `ImageAnalysis` interface to `src/types/agent.ts`

2. **Fix broken free tier** -- DONE
   - Added amber warning cards in AiAgentPanel for Modelo/Social free tier
   - Warnings explain that model creation and avatar require paid tier
   - Per-agent-type `FREE_TIER_WARNINGS` constant

3. **Add budget validation on Claude's plans** -- DONE
   - Server-side module validation (rejects invalid module names from Claude)
   - Budget enforcement: economic <$0.20, free =$0
   - Falls back to template if Claude's plan exceeds budget
   - Recalculates totalEstimatedCost from actual steps (doesn't trust Claude's math)

4. **Add cost confirmation dialog** -- DONE
   - Shows before execution for paid pipelines
   - Per-step cost breakdown with module names
   - "Confirmar y Ejecutar" button required before proceeding

5. **Fix retry cost accumulation bug** -- DONE
   - `retryFromStep()` now recalculates totalCost with `steps.reduce()` from completed steps
   - No longer adds costs on top of stale total from failed attempts

6. **Add blob URL cleanup** -- DONE
   - `blobUrlsRef` tracks all `URL.createObjectURL()` calls
   - `reset()` revokes all tracked blob URLs
   - Prevents memory leaks in long agent sessions

7. **Fix handleRetry stale state bug** -- DONE
   - Used returned result from `retryFromStep()` instead of stale React closure state
   - `if (result?.status === "completed")` instead of `if (execution?.status === "completed")`

8. **Add image preview in agent input** -- DONE
   - Thumbnail preview with filename and file size shown during input phase

9. **Add download button in agent results** -- DONE
   - "Descargar" button using `document.createElement("a")` download pattern

10. **Fix dead code** -- DONE
    - `IDM_VTON_PREFERRED_TYPES` now used in smart routing (tryon/route.ts)
    - `FASHN_API_KEY` added to health check optional vars

11. **Full-width visual step results** -- DONE (user-requested)
    - Replaced tiny 24x24 thumbnails with full-width `aspect-[16/10] object-contain` previews
    - Module emoji icons and "Gratis" badges in step headers
    - Click-to-zoom fullscreen preview modal overlay
    - Centered spinner with pulsing label for running steps
    - Failed step errors shown inline

**Files modified in Phase 1:**
- `src/types/agent.ts` (added ImageAnalysis interface)
- `src/app/api/analyze-image/route.ts` (CREATED — 416 lines)
- `src/app/api/ai-agent/plan/route.ts` (budget + module validation)
- `src/components/modules/AiAgentPanel.tsx` (major UX overhaul — now 971 lines)
- `src/hooks/useAgentPipeline.ts` (retry fix + blob cleanup — now 623 lines)
- `src/app/api/tryon/route.ts` (IDM_VTON smart routing)
- `src/app/api/health/route.ts` (FASHN_API_KEY added)

### Phase 2: Smart Agent Improvements -- COMPLETED (March 2026)

7. ~~**Watermark removal module**~~ -- DONE via auto-injection
   - Agent auto-detects watermarks via `/api/analyze-image` (Claude Vision)
   - Auto-injects `inpaint` step with Kontext provider as FIRST step
   - Both Claude planner and fallback templates handle watermark injection
   - Uses existing inpaint module (no separate module needed)

8. ~~**Parallel step execution**~~ -- DONE
   - `findParallelGroups()` detects independent steps (model-create doesn't need currentUrl)
   - `execute()` uses `Promise.all()` for parallel groups
   - Modelo pipeline: bg-remove + model-create run simultaneously (~5s saved)

9. ~~**Quality validation between steps**~~ -- DONE
   - `validateStepResult()` checks after each step: URL valid, blob readable, size > 100 bytes, correct MIME type
   - Fails the step if result is empty/corrupt (prevents garbage flowing downstream)
   - Non-blocking warnings stored alongside results

10. **Intelligent prompt construction** -- PARTIALLY DONE
    - Claude planner receives image analysis context and adapts prompts
    - Fallback templates auto-adjust based on analysis (skip bg-remove, add enhance, add upscale)
    - Still needs: per-category rich prompt templates, brand kit integration

11. ~~**Plan editor UI**~~ -- DONE
    - Move up/down buttons (ChevronUp/ChevronDown) on each step
    - Delete step button (Trash2, disabled when only 1 step remains)
    - "Agregar paso" button with 2-column module picker (all 12 modules)
    - Cost recalculates in real-time
    - `editedPlan` state layer preserves user modifications

### Phase 3: UX Polish (Remaining Items)

12. ~~**Build BatchProcessPanel.tsx**~~ — DONE
13. ~~**Build BrandKitPanel.tsx**~~ — DONE
14. ~~**Build UpscalePanel.tsx**~~ — DONE

15. **Add before/after comparison slider**
    - Install `img-comparison-slider`
    - Add to all module panels
    - Add to agent results view
    - Add to gallery

16. **Implement inpaint mask mode**
    - Fabric.js brush tool for drawing masks on canvas
    - Send mask as data URL to Flux Fill Pro/Dev

17. **Fix outpaint provider illusion** (both options use same model)

18. **Fix batch + enhance incompatibility** (enhance API uses FormData, batch sends JSON)

### Phase 4: Advanced Agent Intelligence (3-4 weeks)

17. **Multi-image batch agent**
    - Upload multiple images, agent processes all with consistency
    - Category-aware grouping
    - Consistent settings across the batch

18. **Brand-aware processing**
    - Agent reads Brand Kit and applies colors/fonts/watermark
    - Consistent styling across all outputs
    - Brand compliance checking

19. **Learning from history**
    - Track which pipelines produce the best results
    - Suggest proven configurations for similar product types
    - "Use same settings as last time" option

20. **Advanced video pipelines**
    - Multi-clip composition (product + model + text)
    - Music/sound integration
    - Platform-optimized export (TikTok vertical, YouTube horizontal)

### Phase 5: Production Hardening (2 weeks)

21. **Per-step timeout** (2-3 minutes max per API call)
22. **Request caching** (5-minute TTL for identical plan requests)
23. **Rate limiting** on planning endpoint
24. **Progress streaming** for long operations (SSE or polling)
25. **Fix batch + enhance incompatibility** (enhance API uses FormData, batch sends JSON)
26. **Fix outpaint provider illusion** (both options use same model)
27. ~~**Add FASHN_API_KEY to health check**~~ -- DONE in Phase 1
28. ~~**Clean up dead code** (IDM_VTON_PREFERRED_TYPES)~~ -- DONE in Phase 1

---

## APPENDIX: COMPLETE FILE INVENTORY

### Processing Modules (16 files)
```
src/lib/processing/
  bg-remove.ts          - 3 providers (browser, replicate, withoutbg)
  bg-remove-browser.ts  - Client-side WASM bg removal
  bg-generate.ts        - 3 modes (precise, creative, fast) + 27 presets
  enhance.ts            - 10 presets, 8 params, pure sharp ($0)
  inpaint.ts            - 3 providers + 10 presets
  outpaint.ts           - 12 platform presets
  shadows.ts            - 5 types (3 free, 2 AI)
  tryon.ts              - 3 providers + smart routing
  upscale.ts            - 3 providers (2x/4x)
  video.ts              - 3 functions (wan, kling, kenburns)
  model-create.ts       - AI model generation
  avatar.ts             - 5 avatar providers + TTS
  ad-compose.ts         - 7 ad templates (prompt only, no processing)
  jewelry.ts            - 6 accessory types
  ghost-mannequin.ts    - 3 operations
  sharp-utils.ts        - Resize, crop, watermark, format convert
```

### API Routes (29 routes)
```
src/app/api/
  analyze-image/route.ts     bg-remove/route.ts        bg-generate/route.ts
  enhance/route.ts           shadows/route.ts           inpaint/route.ts
  outpaint/route.ts          tryon/route.ts             model-create/route.ts
  ghost-mannequin/route.ts   jewelry-tryon/route.ts     video/route.ts
  avatar/route.ts            tts/route.ts               video-enhance/route.ts
  ad-create/route.ts         upscale/route.ts           batch/route.ts
  brand-kit/route.ts         upload/route.ts            save-result/route.ts
  health/route.ts            db/history/route.ts        ai-agent/plan/route.ts
  ai-models/route.ts         prompt/route.ts            prompt-templates/route.ts
  inventory/scan/route.ts    inventory/load/route.ts
```

### Stores (6 Zustand stores)
```
src/stores/
  editor-store.ts    - Layers, undo/redo, zoom, canvas
  video-store.ts     - Video studio state (persisted)
  batch-store.ts     - Batch jobs + pipeline presets
  gallery-store.ts   - Image gallery (persisted)
  brand-store.ts     - Brand kit + export templates
  settings-store.ts  - API keys, costs, preferences (persisted)
```

### Module Panels (19 implemented — ALL BUILT)
```
src/components/modules/
  BgRemovePanel.tsx (617 lines)     BgGeneratePanel.tsx (476)
  EnhancePanel.tsx (315)            ShadowsPanel.tsx (540)
  InpaintPanel.tsx (249)            OutpaintPanel.tsx (354)
  TryOnPanel.tsx (470)              ModelCreatePanel.tsx (279)
  GhostMannequinPanel.tsx (300)     JewelryTryOnPanel.tsx (236)
  VideoPanel.tsx (749)              AdCreatorPanel.tsx (395)
  CompliancePanel.tsx (667)         SmartEditorPanel.tsx (507)
  AiPromptPanel.tsx (542)           AiAgentPanel.tsx (1,245) [Phase 1+2 overhaul]
  BatchProcessPanel.tsx (623)       BrandKitPanel.tsx
  UpscalePanel.tsx
```

### Video System (5 files)
```
src/lib/video/
  providers.ts   - 7 video + 5 avatar + 2 TTS providers
  presets.ts     - 18 motion presets
  cost.ts        - Cost calculations + formatting
  tts.ts         - Edge TTS + Google TTS (server-only)
  tts-voices.ts  - 13 voices, 5 languages (client-safe)
```

### Cost Summary (ALL modules)
```
FREE:         enhance, shadows(drop/contact/reflection), ken-burns, edge-tts,
              bg-remove(browser/docker), ad-compose, sharp-utils, compliance

$0.003-0.01:  bg-remove(replicate), bg-generate(fast)
$0.02-0.03:   upscale(esrgan/aura), tryon(kolors/idm-vton), inpaint(flux-fill-dev)
$0.04-0.05:   bg-generate(precise), model-create, tryon(fashn), outpaint,
              shadows(ai), inpaint(pro/kontext), jewelry, ghost-mannequin,
              video(ltx/wan), avatar(musetalk)
$0.05-0.10:   upscale(clarity), avatar(sadtalker/liveportrait)
$0.35-0.80:   video(kling 5-10s), video(minimax 5-6s)
```
