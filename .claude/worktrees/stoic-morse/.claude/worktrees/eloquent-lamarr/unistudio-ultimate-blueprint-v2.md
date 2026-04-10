claude# UniStudio — The Ultimate AI Product Photography Platform
## Complete Implementation Blueprint v2.0
### For AI-Assisted Development: Every Detail, Every API, Every Step

---

> **PURPOSE OF THIS DOCUMENT:** This blueprint is designed to be handed directly to an AI coding assistant (Claude Code, Cursor, etc.) so it can build the entire UniStudio application with minimal human intervention. The human developer only needs to: (1) create API accounts and get keys, (2) run the commands, and (3) connect the API keys in the `.env` file. Everything else — every file, every function, every integration — is specified here step by step.

> **BUDGET CONTEXT:** This is for Unistyles (a lingerie/beauty e-commerce brand in Curaçao) with ~300-400 products. Target API budget: €15-100/month. The app must work locally first, with SaaS potential later.

---

## TABLE OF CONTENTS

1. Project Overview and Vision
2. Technical Architecture
3. Project Setup — Step by Step
4. Database Schema
5. Module 1: Background Removal
6. Module 2: AI Background Generation
7. Module 3: Image Enhancement and Upscaling
8. Module 4: AI Shadows and Lighting
9. Module 5: Inpainting and Object Editing
10. Module 6: Outpainting and Canvas Extension
11. Module 7: Virtual Fashion Models and Try-On
12. Module 8: AI Model Creation and Management
13. Module 9: Ghost Mannequin and Flat Lay
14. Module 10: Jewelry and Accessories Try-On
15. Module 11: Image-to-Video Generation
16. Module 12: Batch Processing Engine
17. Module 13: Brand Kit and Consistency
18. Module 14: Marketplace Compliance
19. Module 15: Smart Editor Canvas
20. Module 16: AI Prompt Assistant
21. Implementation Phases
22. API Cost Calculator
23. Environment Variables Reference
24. Deployment Guide

---

## 1. PROJECT OVERVIEW AND VISION

### What is UniStudio?

UniStudio is a self-hosted Next.js web application that combines EVERY feature from the top AI product photography platforms (Photoroom, Claid AI, Pebblely, FASHN, remove.bg) into ONE unified tool. It uses a smart mix of free browser-based processing (runs in the user's browser, zero cost), free open-source models (self-hosted or via free tiers), and pay-per-use APIs (pennies per image, only when premium quality is needed).

### Competitor Pricing vs UniStudio

Photoroom Pro costs $7.50-39/month and gives you BG removal, basic AI backgrounds, limited virtual models. Claid AI Pro costs $9-49/month for enhancement, upscaling, AI backgrounds but no try-on. Pebblely Pro costs $19-67/month for lifestyle scenes only with no virtual models. FASHN charges $0.075/image for virtual try-on only without background tools. remove.bg charges $0.20/HD image for background removal only. All combined these cost $100-200+/month and still provide an incomplete feature set. UniStudio self-built costs only $3-15/month in API fees and includes ALL 16 modules with unlimited use.

### The 16 Modules

1. Background Removal — Remove any background, preserve fine details (hair, lace, transparency)
2. AI Background Generation — Generate studio, lifestyle, nature, luxury scenes with AI
3. Image Enhancement and Upscaling — Auto-enhance colors/exposure plus upscale to 4K
4. AI Shadows and Lighting — Add realistic shadows, reflections, and relight images
5. Inpainting and Object Editing — Remove objects, change colors, fix details with AI
6. Outpainting and Canvas Extension — Extend images in any direction for different aspect ratios
7. Virtual Fashion Models and Try-On — Put garments on AI models from flat-lay/mannequin photos
8. AI Model Creation — Generate diverse AI fashion models (age, body type, skin tone, pose)
9. Ghost Mannequin and Flat Lay — Remove mannequin body, convert between flat lay and on-model
10. Jewelry and Accessories Try-On — Render earrings, necklaces, rings, sunglasses on models
11. Image-to-Video — Convert product photos into animated marketing videos
12. Batch Processing — Process hundreds of images with chained operations in one click
13. Brand Kit and Consistency — Enforce brand colors, logos, typography across all images
14. Marketplace Compliance — Auto-format for Amazon, Shopify, Instagram, Etsy, TikTok Shop
15. Smart Editor Canvas — Layers, crop, resize, text, shapes — a mini Photoshop in the browser
16. AI Prompt Assistant — Natural language to optimized AI prompts for better generations

---

## 2. TECHNICAL ARCHITECTURE

### Stack Decision (with Reasoning)

FRONTEND: Next.js 14+ (App Router) + React 18+ + TypeScript
STYLING: Tailwind CSS 3.4+
STATE: Zustand (lightweight, no boilerplate)
CANVAS EDITOR: Fabric.js 6+ (most mature canvas library)
IMAGE PROCESSING: Sharp (server-side, Node.js native) plus Browser Canvas API (client-side, free) plus @imgly/background-removal (WASM, runs in browser)
BACKEND: Next.js API Routes (serverless functions)
DATABASE: Supabase (PostgreSQL + Auth + Storage)
FILE STORAGE: Supabase Storage (free 1GB) then Cloudflare R2 (free 10GB, S3-compatible)
QUEUE SYSTEM: Upstash Redis (serverless, free tier 10K commands/day)
HOSTING: Vercel (free tier 100GB bandwidth)
PAYMENTS: Stripe (for future SaaS)
ANALYTICS: PostHog (free self-hosted) or Plausible
API PROVIDERS: Replicate (600+ models, pay-per-use), fal.ai (faster inference, pay-per-use), FASHN (best virtual try-on), withoutBG (cheapest BG removal API), Black Forest Labs (Flux direct API)

### Why This Stack?

Next.js 14+ App Router provides Server Components to reduce bundle size, API routes eliminate the need for a separate backend, and ISR enables fast pages. Supabase gives free PostgreSQL plus Row Level Security plus built-in Auth plus file storage — one service replaces 3-4 separate services. Replicate offers 600+ AI models with a single API key where you pay only for what you use with no monthly minimums. fal.ai is the fastest inference engine (up to 4x faster than Replicate for some models) with 600+ models and competitive pricing. Sharp is the fastest Node.js image processing library handling resize, crop, format conversion, and color adjustment at native speed. Fabric.js is the most battle-tested HTML5 canvas library supporting layers, groups, filters, and serialization.

### Folder Structure

The project structure follows Next.js App Router conventions:

unistudio/
  .env.local (API keys — NEVER commit this)
  .env.example (Template for API keys)
  next.config.js
  tailwind.config.ts
  tsconfig.json
  package.json
  
  public/
    fonts/
    icons/
    templates/ (Pre-built background templates organized by studio, lifestyle, nature, luxury)
  
  src/
    app/ (Next.js App Router)
      layout.tsx (Root layout with providers)
      page.tsx (Dashboard / home)
      globals.css
      (auth)/ (login and register pages)
      editor/page.tsx (Main editor workspace)
      batch/page.tsx (Batch processing)
      gallery/page.tsx (Image gallery/history)
      brand-kit/page.tsx (Brand settings)
      api/ (API Routes for each module: bg-remove, bg-generate, enhance, upscale, shadows, inpaint, outpaint, tryon, model-create, ghost-mannequin, jewelry-tryon, video, batch, prompt, upload, webhook)
    
    components/
      ui/ (Reusable UI: Button, Modal, Slider, etc.)
      editor/ (Canvas.tsx, Toolbar.tsx, LayersPanel.tsx, PropertiesPanel.tsx, HistoryPanel.tsx)
      modules/ (BgRemovePanel.tsx, BgGeneratePanel.tsx, EnhancePanel.tsx, ShadowsPanel.tsx, InpaintPanel.tsx, OutpaintPanel.tsx, TryOnPanel.tsx, ModelCreatePanel.tsx, VideoPanel.tsx, CompliancePanel.tsx)
      batch/ (BatchUploader.tsx, PipelineBuilder.tsx, BatchProgress.tsx)
    
    lib/
      api/ (replicate.ts, fal.ts, fashn.ts, withoutbg.ts, flux.ts)
      processing/ (bg-remove.ts, bg-generate.ts, enhance.ts, upscale.ts, shadows.ts, inpaint.ts, outpaint.ts, tryon.ts, model-create.ts, video.ts, sharp-utils.ts)
      canvas/ (editor.ts, tools.ts, filters.ts, export.ts)
      batch/ (pipeline.ts, queue.ts, worker.ts)
      brand/ (brand-kit.ts, compliance.ts)
      db/ (supabase.ts, queries.ts)
      utils/ (image.ts, prompts.ts, constants.ts, cost-tracker.ts)
    
    hooks/ (useEditor.ts, useImageProcessing.ts, useBatchProcessing.ts, useApiCost.ts)
    stores/ (editor-store.ts, batch-store.ts, brand-store.ts, settings-store.ts)
    types/ (editor.ts, api.ts, batch.ts, brand.ts)

---

## 3. PROJECT SETUP — STEP BY STEP

### Step 1: Create Next.js Project

Run: npx create-next-app@latest unistudio --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
Then: cd unistudio

### Step 2: Install ALL Dependencies

Core UI: npm install zustand fabric @types/fabric lucide-react clsx tailwind-merge @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-slider @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-switch @radix-ui/react-select @radix-ui/react-popover

Image Processing: npm install sharp @imgly/background-removal browser-image-compression file-saver jszip @types/file-saver

API Clients: npm install replicate fal-client

Database and Auth: npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

Queue and Background Jobs: npm install @upstash/redis @upstash/qstash

Utilities: npm install nanoid date-fns mime-types uuid @types/uuid @types/mime-types

Video (for browser-based effects): npm install @ffmpeg/ffmpeg @ffmpeg/util

Dev dependencies: npm install -D @types/node prettier eslint-config-prettier

### Step 3: Environment Variables

Create .env.local with these variables:

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=UniStudio

Supabase — sign up at https://supabase.com:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

Replicate (600+ models) — sign up at https://replicate.com, get API token from account settings. Pay per prediction $0.003-$0.50 per image:
REPLICATE_API_TOKEN=r8_your_token_here

fal.ai (faster inference alternative) — sign up at https://fal.ai, get API key from dashboard:
FAL_KEY=your_fal_key_here

FASHN (best virtual try-on, model creation) — sign up at https://fashn.ai, $0.075/image:
FASHN_API_KEY=your_fashn_key_here

withoutBG (cheapest background removal API) — sign up at https://withoutbg.com, 50 free credits, from 0.05 EUR per image:
WITHOUTBG_API_KEY=your_withoutbg_key_here

Black Forest Labs / Flux (direct API for image generation/editing) — sign up at https://api.bfl.ml, $0.04-$0.08/image:
BFL_API_KEY=your_bfl_key_here

Optional remove.bg (premium background removal) — https://www.remove.bg/api, 50 free credits, $0.20/HD:
REMOVE_BG_API_KEY=your_removebg_key_here

Optional Claude for Prompt Assistant — https://console.anthropic.com:
ANTHROPIC_API_KEY=your_anthropic_key_here

Upstash Redis for queue — https://upstash.com, free tier 10K commands/day:
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

Cloudflare R2 for large-scale storage (optional) — free 10GB:
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=unistudio

### Step 4: Configure next.config.js

Set experimental serverActions bodySizeLimit to 50mb. Add remote image patterns for replicate.delivery, fal.media, supabase.co, and cdn.fashn.ai. Configure webpack fallback for fs and path (required for @imgly/background-removal WASM).

### Step 5: Configure tailwind.config.ts

Extend colors with brand pink palette (50 through 900 with 500 being #ec4899 as primary Unistyles brand pink) and surface dark colors (DEFAULT #1a1a2e, light #222240, lighter #2a2a4a). Add shimmer and pulse-slow animations.

---

## 4. DATABASE SCHEMA

Run in Supabase SQL editor. Creates these tables:

profiles — extends Supabase Auth users with full_name, avatar_url, brand_name, plan (free/starter/pro/business), credits_used, credits_limit, api_costs_total

projects — collections of images with user_id, name, description

images — original uploads plus processed versions with original_url, processed_url, thumbnail_url, filename, dimensions, file_size, mime_type, status (uploaded/processing/completed/failed), metadata JSONB

processing_jobs — tracks every AI operation with operation type, provider, model, input_params JSONB, output_url, status, error_message, cost_usd, processing_time_ms

batch_jobs — batch processing records with pipeline JSONB, total/completed/failed image counts, total_cost_usd

brand_kits — brand settings with primary/secondary/accent/background colors, fonts, logo_url, watermark settings, default_bg_style

ai_models — saved FASHN model references with gender, age_range, skin_tone, body_type, pose, metadata

prompt_templates — saved prompts by category (background, lifestyle, model, video) with name, prompt, negative_prompt, preview_url, is_public flag

All tables have Row Level Security enabled with policies ensuring users can only access their own data. Public templates are visible to all. A trigger automatically creates a profile and brand kit when a new user signs up.

---

## 5. MODULE 1: BACKGROUND REMOVAL

### Technology Tiers

Free (Browser): @imgly/background-removal runs as WASM in the user's browser. Costs $0. Quality 4/5 stars. Speed 3-8 seconds. Best for most products with solid backgrounds.

Budget API: withoutBG Pro API at 0.05 EUR per image. Quality 5/5. Speed 1-2 seconds. Best for high-volume processing with fine details like hair and lace.

Premium API: Replicate BRIA RMBG-2.0 at approximately $0.01 per image. Quality 5/5. Speed 2-4 seconds. Best for hair, fur, and transparent materials.

Ultra Premium: remove.bg HD at $0.20 per image. Quality 5/5. Speed 1-3 seconds. Professional retouching level.

### Implementation Details

The bg-remove.ts module exports a BgRemoveOptions interface with provider selection (browser/withoutbg/replicate/removebg), quality level (fast/balanced/quality), output type (transparent/color/blur), optional backgroundColor hex for color output, blurAmount 0-100 for blur output, edgeRefinement flag, and preserveShadow flag.

Browser-based removal uses @imgly/background-removal with Config specifying model size (small for fast, medium for quality) and output format as image/png. The result blob can then be processed for colored backgrounds using OffscreenCanvas (draw fill color then composite transparent image) or blurred backgrounds using OffscreenCanvas (draw original with CSS blur filter then composite sharp foreground).

withoutBG API uses a POST to https://api.withoutbg.com/v1.0/remove-background with the X-API-Key header and image as multipart form data. Returns the result as a buffer.

Replicate integration uses the replicate npm package with cjwbw/rembg model or the higher quality lucataco/remove-bg model (BRIA RMBG 2.0). Both accept an image URL input.

The API route at /api/bg-remove accepts POST with multipart FormData containing image file and provider string. Routes to appropriate provider, returns JSON with success flag, imageUrl, cost, and provider used.

The UI component BgRemovePanel.tsx provides provider selection with visual cards showing cost and description for each tier, output type toggle (transparent/color/blur), color picker with hex input and quick presets (#ffffff, #f5f5f5, #000000, #fdf2f8, #eff6ff), and a process button with loading state.

---

## 6. MODULE 2: AI BACKGROUND GENERATION

### Technology Options

Flux Schnell on Replicate costs $0.003 per image. Quality 3/5. Speed 1-2 seconds. Best for fast previews and iterations.

Flux Dev on Replicate or fal.ai costs $0.025-0.03 per image. Quality 4/5. Speed 4-8 seconds. Good quality backgrounds.

Flux Kontext Pro on Replicate or BFL direct costs $0.04-0.055 per image. Quality 5/5. Speed 5-7 seconds. BEST option for editing existing images and changing backgrounds precisely.

Flux Kontext Max on BFL costs $0.08 per image. Quality 5+/5. Speed 7-10 seconds. Maximum quality with typography support.

Seedream 4.5 by ByteDance on Replicate costs approximately $0.02. Quality 5/5. Speed 3-5 seconds. Excellent photorealistic product shots.

Ideogram v3 on Replicate costs approximately $0.04. Quality 4/5. Speed 5 seconds. Best when you need text rendered in images.

### Two Modes

PRECISE MODE: Product stays pixel-perfect exact. Remove product background, then place on generated background. Uses Flux Kontext Pro which sends the product image plus a text prompt to change ONLY the background. Perfect for catalog consistency.

CREATIVE MODE: AI re-imagines entire scene including product placement. Product may be slightly different as it is an AI interpretation. Uses Flux Dev or Flux Pro with text-to-image using product description. Perfect for lifestyle marketing images.

### 20+ Background Style Presets

Each preset has an optimized prompt and negative prompt:

Studio styles: studio-white (clean white seamless backdrop, soft even lighting), studio-gray (elegant medium gray, soft gradient lighting), studio-gradient (smooth gradient, professional lighting)

Lifestyle styles: lifestyle-living-room (cozy modern living room, natural daylight, wooden coffee table), lifestyle-bedroom (elegant bedroom, soft morning light, white linen), lifestyle-bathroom (luxurious modern bathroom, marble countertop, spa-like)

Nature styles: nature-garden (beautiful garden, soft sunlight, green plants), nature-beach (tropical beach, golden hour, turquoise ocean), nature-forest (enchanted forest, dappled sunlight, moss)

Luxury styles: luxury-marble (white marble with gold veining), luxury-velvet (rich dark velvet, dramatic spotlight), luxury-gold (opulent gold and champagne, art deco)

Seasonal styles: seasonal-christmas (festive, warm bokeh lights, pine branches), seasonal-summer (bright, tropical, citrus fruits), seasonal-valentines (romantic pink and red, rose petals)

Minimalist styles: minimalist-clean (ultra-clean, single shadow, negative space), minimalist-pastel (soft pastel gradient, dreamy)

Beauty styles: beauty-spa (luxury spa, smooth stones, bamboo, orchid), beauty-vanity (elegant vanity table, soft mirror, crystal), beauty-floral (fresh floral arrangement, pink roses, eucalyptus)

Custom: user provides their own prompt.

### Precise Mode Implementation

Uses Replicate's Flux Kontext Pro model (black-forest-labs/flux-kontext-pro). Sends the product image URL plus instruction prompt formatted as "Change only the background to: [style prompt]. Keep the product/subject EXACTLY the same, preserve every detail, color, and texture of the product. Only replace the background." With guidance_scale 2.8, configurable aspect_ratio and num_outputs.

### Creative Mode Implementation

Uses Replicate's Flux Dev model (black-forest-labs/flux-dev). Constructs full prompt as "Professional e-commerce product photography of [product description]. [style prompt]. [custom prompt]. High quality, photorealistic, 8K detail, commercial photography." With guidance 3.5, configurable aspect_ratio and num_outputs.

### Fast Mode Implementation

Uses Flux Schnell (black-forest-labs/flux-schnell) at just $0.003 per image for rapid iteration.

### Composite Function

For precise mode, a compositeProductOnBackground function uses Sharp to combine a transparent product image onto a generated background. Downloads both images, calculates scaled dimensions based on position parameters (x, y, scale defaults to center at 80% size), resizes the product, then composites onto the background.

---

## 7. MODULE 3: IMAGE ENHANCEMENT AND UPSCALING

### Enhancement Features (ALL FREE with Sharp)

Auto White Balance: Sharp recomb matrix with tint maps for warm (R:1.05 G:1.0 B:0.95), cool (R:0.95 G:1.0 B:1.05), daylight (neutral), tungsten (R:0.9 G:0.95 B:1.1).

Brightness and Contrast: Sharp linear transform with brightness multiplier and contrast multiplier derived from -100 to +100 range values.

Saturation: Sharp modulate with saturation factor from -100 to +100 range.

Sharpening: Sharp unsharp mask with sigma calculated from 0-100 sharpness value (sigma = 0.5 + sharpness/100 * 2).

Noise Reduction: Sharp median filter with kernel size 3-7 based on noise reduction strength.

### Enhancement Presets

auto: brightness +5, contrast +10, saturation +5, sharpness 30, exposure +0.2, auto white balance
ecommerce: brightness +10, contrast +15, saturation +10, sharpness 40, exposure +0.3, daylight
fashion: brightness 0, contrast +5, saturation -10, sharpness 20, exposure +0.1, warm
beauty: brightness +10, contrast -5, saturation +5, sharpness 15, exposure +0.2, warm, vibrance +15
luxury: brightness -5, contrast +25, saturation +15, sharpness 35, exposure 0, warm
natural: brightness 0, contrast +5, saturation 0, sharpness 20, exposure 0, auto
bright-airy: brightness +20, contrast -10, saturation -15, sharpness 10, exposure +0.5, cool
dark-moody: brightness -15, contrast +20, saturation +10, sharpness 25, exposure -0.3, warm
vintage: brightness +5, contrast -5, saturation -20, sharpness 10, exposure +0.1, warm
crisp-clean: brightness +5, contrast +20, saturation 0, sharpness 60, exposure +0.1, daylight, noise reduction 30

### Upscaling Options

UpscalerJS runs in browser via WASM. Costs $0. Up to 4x. Quality 3/5.
Real-ESRGAN on Replicate costs $0.005 for 2x or $0.01 for 4x. Quality 4/5. Uses nightmareai/real-esrgan model with face_enhance option via GFPGAN.
Clarity Upscaler on Replicate costs approximately $0.05. Up to 16x. Quality 5+/5. Uses philz1337x/clarity-upscaler with prompt-guided enhancement.
Aura SR v2 on fal.ai costs approximately $0.01 for 4x. Quality 5/5. Fast processing.

---

## 8. MODULE 4: AI SHADOWS AND LIGHTING

### Three Tiers

Tier 1 FREE — Programmatic Shadows with Sharp/Canvas:

Drop Shadow: Creates shadow layer by blurring the alpha channel of the product image, making it black, applying opacity, then compositing shadow offset below the product on a padded canvas.

Contact Shadow: Creates an elliptical shadow at the bottom of the product using an SVG radial gradient, composited below the product.

Reflection: Flips the product vertically, applies fade gradient and blur, composites below.

Tier 2 — AI Shadow/Relight with IC-Light via Replicate ($0.02):

Uses lllyasviel/ic-light model. Accepts product image plus lighting description prompt. Examples: "soft natural daylight from left", "dramatic studio spotlight from above", "warm golden hour sunset", "cool blue neon light". Runs 25 steps with cfg_scale 2.0.

Tier 3 — AI Relight with Flux Kontext ($0.055):

Uses flux-kontext-pro to change lighting via text instruction: "Change the lighting to: [description]. Keep the subject and background exactly the same, only change the direction, color, and intensity of the lighting."

### Lighting Presets

studio-soft: Soft even studio lighting from all directions, no harsh shadows
studio-dramatic: Dramatic side lighting with strong shadow on one side
natural-daylight: Bright natural daylight from large window on the left
golden-hour: Warm golden hour sunset lighting, long soft shadows
blue-hour: Cool blue twilight lighting
spotlight: Single bright spotlight from above, dark background
ring-light: Even ring light illumination, no shadows on face
backlit: Bright backlighting creating glowing halo effect
neon: Colorful neon lighting, pink and blue tones
candlelight: Warm soft candlelight, intimate atmosphere

---

## 9. MODULE 5: INPAINTING AND OBJECT EDITING

### Technology Options

Flux Fill Pro on Replicate at $0.03 per image. Quality 5/5. Best overall inpainting. Requires image plus mask (black=keep, white=replace) plus prompt.

Flux Fill Dev on Replicate at $0.003. Quality 4/5. Budget inpainting.

Flux Kontext Pro on Replicate at $0.055. Quality 5/5. Text-guided edits WITHOUT needing a mask — just describe the change in natural language.

### Common Product Photography Inpainting Presets

remove-tag: Remove the clothing tag/label, replace with clean fabric matching surrounding texture
remove-wrinkles: Smooth out all fabric wrinkles, make garment look perfectly pressed
remove-person-bg: Remove person in background, replace with clean continuation
fix-stain: Remove stain/mark, replace with clean matching fabric
change-color-red/blue/black/white: Change product color while keeping all details identical
add-texture: Add subtle texture detail matching surrounding material
remove-reflection: Remove unwanted reflection/glare, replace with clean surface

---

## 10. MODULE 6: OUTPAINTING AND CANVAS EXTENSION

### Smart Outpaint

Uses Flux Kontext Pro to extend images for different aspect ratios. Send image plus prompt "Extend the image naturally, continuing the existing background seamlessly" plus target aspect_ratio.

### Platform-Specific Outpainting Presets

amazon: 1:1 ratio, 2000x2000, white #FFFFFF background
shopify: 1:1 ratio, 2048x2048, white background
instagram-feed: 1:1 ratio, 1080x1080
instagram-post: 4:5 ratio, 1080x1350
instagram-story: 9:16 ratio, 1080x1920
tiktok: 9:16 ratio, 1080x1920
pinterest: 2:3 ratio, 1000x1500
etsy: 4:3 ratio, 2000x1500, white background
ebay: 1:1 ratio, 1600x1600, white background
facebook-ad: 1:1 ratio, 1200x1200
youtube-thumb: 16:9 ratio, 1280x720
banner: 3:1 ratio, 1500x500

---

## 11. MODULE 7: VIRTUAL FASHION MODELS AND TRY-ON

### CRITICAL NOTE FOR UNISTYLES

FASHN explicitly excludes lingerie and swimwear from their training data. For lingerie products (Unistyles core business), use IDM-VTON or CatVTON on Replicate instead. For non-lingerie items (beauty, accessories), FASHN provides the best quality.

### Technology Comparison

FASHN Try-On v1.6 via FASHN API costs $0.075 per image. Resolution 576x864. Speed 5-17 seconds. Lingerie support: NO (excluded from training). Best quality for supported garments.

IDM-VTON via Replicate costs $0.02. Resolution 768x1024. Speed 10-20 seconds. Lingerie support: YES (open-source, no restrictions). Good for all garment types.

CatVTON via Replicate costs $0.02. Resolution 768x1024. Speed 15-25 seconds. Lingerie support: YES. Alternative open-source option.

Kolors Virtual Try-On via Replicate costs $0.015. Resolution 768x1024. Speed 8-15 seconds. Lingerie support: YES.

### FASHN Integration

POST to https://api.fashn.ai/v1/run with Authorization Bearer header. Body includes model_image URL, garment_image URL, category (tops/bottoms/one-pieces), mode (quality/balanced/speed), and options for nsfw_filter, adjust_hands, restore_background, restore_clothes, garment_photo_type (auto/flat-lay/model/mannequin). Returns prediction ID that must be polled at /v1/status/{id} every 2 seconds until completed or failed.

### IDM-VTON Integration

Uses Replicate model cuuupid/idm-vton. Input requires human_img URL, garm_img URL, garment_des description, is_checked true, denoise_steps 30.

### Smart Router

The smartTryOn function automatically routes lingerie and swimwear to IDM-VTON and everything else to FASHN for best quality. Falls back to IDM-VTON if FASHN is not specified.

---

## 12. MODULE 8: AI MODEL CREATION AND MANAGEMENT

### FASHN Endpoints

Model Create at $0.075 generates a new AI model from text description. Face to Model at $0.075 transforms any face photo into a full fashion model. Model Variation at $0.05 generates variations of an existing model with different pose or angle. Model Swap at $0.075 replaces the model in a photo while keeping product, pose, and lighting. Consistent Models with LoRA training enables reusing the same model identity across all products.

### Model Creation Options

Gender: female, male, non-binary
Age range: 18-25, 25-35, 35-45, 45-55, 55+
Skin tone: light, medium-light, medium, medium-dark, dark
Body type: slim, athletic, average, curvy, plus-size
Pose: standing-front, standing-side, standing-3/4, walking, sitting, casual
Expression: neutral, smile, serious, confident, relaxed
Plus optional hair style, background, and additional styling description.

The buildModelPrompt function constructs a detailed prompt from these options for FASHN's model creation endpoint.

---

## 13. MODULE 9: GHOST MANNEQUIN AND FLAT LAY

Ghost Mannequin uses Flux Kontext inpainting to remove the mannequin body, instructing the AI to "Remove the mannequin body completely. Show only the garment floating naturally as if on an invisible form."

Flat Lay to On-Model creates or selects an AI model then uses the try-on system to put the flat-lay garment on the model.

On-Model to Flat Lay extracts the garment from a model photo and generates a flat-lay version.

---

## 14. MODULE 10: JEWELRY AND ACCESSORIES TRY-ON

Uses Flux Kontext Pro for text-guided placement of jewelry on model images. Each accessory type has a specialized prompt:

earrings: "Add these earrings to the model, hanging naturally from the earlobes. Preserve metallic reflections and gem sparkle."
necklace: "Place this necklace around the model neck, draping naturally. Preserve metallic shine and gem transparency."
ring: "Place this ring on the model ring finger, reflecting light naturally."
bracelet: "Add this bracelet to the model wrist, positioned naturally."
sunglasses: "Place these sunglasses on the model face, positioned correctly on the nose bridge."
watch: "Place this watch on the model left wrist, positioned naturally."

---

## 15. MODULE 11: IMAGE-TO-VIDEO GENERATION

### Technology Comparison (February 2026)

Wan 2.1 on Replicate costs approximately $0.04 per 5-second clip. Resolution 720p-1080p. No audio. Cheapest good quality option.

Wan 2.6 on fal.ai costs approximately $0.05 per second. Resolution 1080p. No audio. Best value open-source.

Kling 2.6 on fal.ai or direct costs approximately $0.07 per second. Resolution 1080p. Has audio generation. Best for combined audio plus video.

Kling 3.0 on fal.ai costs approximately $0.10 per second. Duration 3-15 seconds. Resolution 1080p. Has audio. Multi-shot sequences with subject consistency.

FASHN Video via FASHN API costs 1+ credits. Duration 5 seconds. Resolution 576x864. Fashion-specific motion.

Runway Gen-4 costs approximately $0.25 per second. Duration 10 seconds. Resolution 4K. Best character consistency.

Luma Ray3 on fal.ai costs approximately $0.15 per second. Duration 5-10 seconds. Resolution 4K HDR. Best physics simulation.

FFmpeg Ken Burns (local) costs $0. Any duration. Any resolution. Simple zoom and pan effects.

### Video Motion Types

product-rotate: Product slowly rotates 360 degrees, smooth professional rotation
product-zoom: Smooth cinematic zoom into product revealing details
camera-orbit: Camera slowly orbits around product
lifestyle-action: Product being used naturally in lifestyle setting
fashion-walk: Fashion model walks confidently toward camera
reveal: Dramatic product reveal from blur/shadow
unboxing: Simulated elegant unboxing experience
custom: User-defined motion via prompt

### Implementation

Wan 2.1 integration uses Replicate with image URL, prompt, 41 frames for 5 seconds or 81 frames for 10 seconds, guidance_scale 5.0, 30 inference steps.

Kling 2.6 integration uses fal.ai's fal-ai/kling-video/v1.6/pro/image-to-video endpoint with image_url, prompt, duration (5 or 10), and aspect_ratio.

Free Ken Burns effect uses browser Canvas API plus MediaRecorder to create zoom/pan animations without any API cost.

---

## 16. MODULE 12: BATCH PROCESSING ENGINE

### Pipeline Structure

A pipeline is an ordered list of steps. Each step has an operation type, provider, parameters, and enabled flag. Operations include bg_remove, bg_generate, enhance, upscale, shadow, resize, format_convert, watermark, compliance_check, tryon, inpaint, outpaint.

### Pre-Built Pipeline Presets

Quick Clean (Free): browser BG removal, solid white background, Sharp ecommerce enhancement, resize to 2000x2000

Amazon Ready: withoutBG removal, solid white background, Sharp ecommerce enhancement, contact shadow, resize to 2000x2000, Amazon compliance check

Instagram Lifestyle: withoutBG removal, Flux Dev lifestyle-living-room background, IC-Light natural daylight shadow, Sharp fashion enhancement, resize to 1080x1350

Full Production (Premium): withoutBG removal, Sharp ecommerce enhancement, Real-ESRGAN 2x upscale, Flux Kontext studio-white background, contact shadow, resize to 2000x2000, optional watermark

### Batch Processing Flow

The /api/batch route accepts POST with imageUrls array and pipeline object. Creates a batch job ID, then processes each image through the pipeline sequentially. Each step calls the appropriate module function. Tracks completed vs failed images, accumulates total cost, returns comprehensive results with original and processed URLs for each image.

---

## 17. MODULE 13: BRAND KIT AND CONSISTENCY

### Features

Brand Colors: primary, secondary, accent, background — auto-applied to backgrounds and overlays
Logo Library: upload multiple versions (color, white, black, icon-only)
Typography: primary and secondary fonts for text overlays
Default Styles: set default background style, enhancement preset, shadow type per product category
Watermark: auto-apply to all exports with configurable position (9 positions), opacity (0-1), size
Template Library: save and reuse successful background/style combinations

---

## 18. MODULE 14: MARKETPLACE COMPLIANCE

### Platform Requirements (Updated February 2026)

Amazon: minimum 1600x1600, 1:1 ratio, pure white #FFFFFF background, max 10MB, JPEG/PNG
Shopify: 2048x2048 recommended, 1:1, any background, max 20MB, JPEG/PNG/GIF
Instagram Shop: 1080x1080, 1:1 or 4:5, any background, max 30MB, JPEG/PNG
Etsy: 2000x2000, various ratios, any background, max 10MB, JPEG/PNG/GIF
eBay: 1600x1600, 1:1, white preferred, max 12MB, JPEG/PNG
TikTok Shop: 1200x1600, 3:4, white background, max 5MB, JPEG/PNG
Pinterest: 1000x1500, 2:3, any background, max 20MB, JPEG/PNG
Poshmark: 1200x1200, 1:1, clean background, max 15MB, JPEG/PNG
Depop: 1080x1080, 1:1, any background, max 10MB, JPEG/PNG

### Auto-Compliance Check

The checkCompliance function validates image dimensions against platform minimums, aspect ratio tolerance (within 0.05), background color requirements, file size limits, and format. Returns a passed boolean, array of issues found, and array of suggested fixes (upscale, outpaint, bg_remove_white, compress).

---

## 19. MODULE 15: SMART EDITOR CANVAS

Built with Fabric.js 6+. Features include layers panel with reorder/show/hide/lock/rename/opacity per layer, selection tools for multi-select and grouping, transform controls for move/resize/rotate/flip/skew, crop tool with free crop and aspect ratio lock, text tool with font/size/color/alignment, shape tools for rectangle/circle/line/arrow, brush and eraser for mask painting used in inpainting, per-layer brightness/contrast/saturation filters, scroll-to-zoom and middle-click-to-pan navigation, undo/redo with 50+ step history, and export to PNG/JPG/WebP with quality control.

The UniStudioEditor class wraps Fabric.js Canvas with methods for addImage (with asBackground option), export to blob, undo/redo via JSON serialization history, and all standard canvas operations.

---

## 20. MODULE 16: AI PROMPT ASSISTANT

Uses Claude API (or GPT-4o Mini as cheaper alternative) to convert simple user descriptions into optimized AI prompts. The generateOptimizedPrompt function accepts a simple description plus context (productType, targetPlatform, brandStyle, desiredMood) and asks Claude to write an optimized prompt including lighting details, camera angle, composition, texture details, color palette, and mood in under 100 words.

---

## 21. IMPLEMENTATION PHASES

### Phase 1: MVP Core (Weeks 1-3) — $0 API Cost

Project setup with Next.js, Tailwind, Supabase. File upload with drag-and-drop multi-file support. Background removal using browser WASM (@imgly/background-removal). Solid color background replacement via Canvas API. Basic enhancement pipeline with Sharp (brightness, contrast, saturation, sharpness). Image resize with platform presets. PNG/JPG/WebP export with quality control. Simple batch processing up to 50 images. ZIP download of batch results. Before/after comparison slider. Basic UI layout with sidebar, canvas area, and properties panel.

### Phase 2: AI Studio (Weeks 4-6) — First API Costs

AI Background Generation with Flux Schnell for fast and Flux Dev for quality. Flux Kontext Pro integration for precise background editing. 20+ background style presets with preview thumbnails. Custom prompt input for backgrounds. AI Shadows with programmatic generation plus IC-Light for relighting. Inpainting with brush tool (paint mask then AI fills). Object removal with Flux Kontext (text-guided). Outpainting for aspect ratio conversion. Platform preset outpainting for Instagram, Pinterest, TikTok. Enhancement presets (ecommerce, fashion, beauty, luxury, etc.). Upscaling with Real-ESRGAN 2x and 4x. AI Prompt Assistant with Claude API. Cost tracker showing API spend per operation.

### Phase 3: Fashion Studio (Weeks 7-9) — Premium Features

FASHN Try-On v1.6 integration for non-lingerie garments. IDM-VTON integration for lingerie and swimwear (Unistyles core products). AI Model Creation with FASHN Model Create. Face to Model with FASHN. Model Swap with FASHN. Model Gallery to save and reuse AI models. Ghost Mannequin removal. Flat Lay to On-Model conversion. Jewelry try-on for earrings, necklaces, rings. Multi-garment styling (top plus bottom on same model). Consistent model identity across products.

### Phase 4: Video and Scale (Weeks 10-12) — Full Platform

Image-to-Video with Wan 2.1 for budget option. Image-to-Video with Kling 2.6 for premium plus audio. Free Ken Burns video effects (zoom/pan). Video prompt templates. Advanced batch pipeline builder. Drag-and-drop pipeline reordering. Pipeline presets (Quick Clean, Amazon Ready, Instagram Lifestyle, Full Production). Parallel batch processing. Batch progress tracking with live updates. Error handling and retry logic.

### Phase 5: Polish and Launch (Weeks 13-16) — Production Ready

Supabase Auth with email/password plus Google OAuth. User dashboard with usage statistics. Brand Kit management UI. Marketplace compliance checker. Image gallery with search and filtering. Project organization with folders/collections. Full Fabric.js canvas editor with layers, text, shapes. Responsive design for desktop plus tablet. Performance optimization with lazy loading and caching. Error monitoring with Sentry. Deploy to Vercel. Optional Stripe integration for SaaS billing. Optional API for external developers.

---

## 22. API COST CALCULATOR

### Cost per Operation (Actual API Pricing, February 2026)

Background Removal: FREE with @imgly WASM, or 0.05 EUR with withoutBG, or $0.20 with remove.bg
AI Background (Fast): $0.003 with Flux Schnell
AI Background (Quality): $0.03 with Flux Dev, or $0.055 with Flux Kontext Pro, or $0.08 with Flux Kontext Max
Enhancement: $0 with Sharp (always free)
Upscale 2x: $0 with UpscalerJS, or $0.005 with Real-ESRGAN, or $0.05 with Clarity
Upscale 4x: $0.01 with Real-ESRGAN, or $0.05 with Clarity
AI Shadow/Relight: $0 with Canvas CSS, or $0.02 with IC-Light, or $0.055 with Flux Kontext
Inpainting: $0.003 with Flux Fill Dev, or $0.03 with Flux Fill Pro
Outpainting: $0.005 with Flux Fill Dev, or $0.055 with Flux Kontext
Virtual Try-On: $0.015 with Kolors, or $0.02 with IDM-VTON, or $0.075 with FASHN
Model Creation: $0.075 with FASHN
Ghost Mannequin: $0.055 with Flux Kontext
Jewelry Try-On: $0.055 with Flux Kontext
Image-to-Video: $0 with Ken Burns, or $0.04 with Wan 2.1 for 5 seconds, or $0.35 with Kling 2.6 for 5 seconds
Prompt Assistant: $0.001 with Claude Haiku, or $0.003 with Claude Sonnet

### Unistyles Budget Scenarios (300 Products)

Scenario A Maximum Free ($0 total): BG removal with @imgly WASM, white backgrounds with Canvas API, enhancement with Sharp, resize with Sharp. Total $0.

Scenario B Smart Budget (approximately $20 total): BG removal 300 images with withoutBG = $15. AI backgrounds for 100 hero products with Flux Dev = $3. Enhancement with Sharp = $0. Upscale 100 images with Real-ESRGAN = $0.50. Try-on 50 lingerie items with IDM-VTON = $1. Videos for 10 hero products with Wan 2.1 = $0.40. Total approximately $20.

Scenario C Premium Quality (approximately $46 total): BG removal 300 with withoutBG = $15. AI backgrounds 300 with Flux Kontext Pro = $16.50. Enhancement with Sharp = $0. Upscale 300 with Real-ESRGAN = $3. Shadows for 200 with IC-Light = $4. Try-on 100 items with IDM-VTON ($2) plus FASHN ($3.75) = $5.75. Model creation 5 models with FASHN = $0.375. Videos for 30 products with Wan 2.1 = $1.20. Total approximately $46.

---

## 23. ENVIRONMENT VARIABLES REFERENCE

### How to Get Each API Key

1. Replicate: Go to https://replicate.com then sign up with GitHub then Account Settings then API Tokens then Create Token
2. fal.ai: Go to https://fal.ai then sign up then Dashboard then API Keys then Create
3. FASHN: Go to https://fashn.ai then sign up then Developer Dashboard then API Keys
4. withoutBG: Go to https://withoutbg.com then sign up then Dashboard then API Key (50 free credits included)
5. Black Forest Labs (Flux direct): Go to https://api.bfl.ml then sign up then Get API Key
6. remove.bg (optional): Go to https://www.remove.bg/api then sign up then Get API Key (50 free credits)
7. Anthropic (Claude): Go to https://console.anthropic.com then sign up then API Keys
8. Supabase: Go to https://supabase.com then Create Project then Settings then API then get URL plus Keys
9. Upstash Redis: Go to https://upstash.com then Create Database then get REST URL plus Token

---

## 24. DEPLOYMENT GUIDE

### Deploy to Vercel

Push to GitHub with git init, git add, git commit, git remote add origin, git push. Then go to https://vercel.com, Import project, Select repo, Add ALL environment variables from .env.local, Deploy. Optionally set up custom domain in Vercel Dashboard under Project Settings then Domains.

### Post-Deployment Checklist

Verify all environment variables are set in Vercel. Confirm Supabase URL and Keys are configured. Test each API connection individually. Test background removal in browser mode. Test AI background generation with Replicate. Test file upload and download flow. Check batch processing works end to end. Verify marketplace compliance presets produce correct outputs. Test on mobile and tablet viewports. Set up error monitoring with Sentry or Vercel Analytics.

---

## SUMMARY

UniStudio is the ONLY platform that combines ALL 16 modules into one. No competitor offers everything. Photoroom has no jewelry try-on, no video, limited batch. Claid AI has no virtual try-on, no model creation. Pebblely has no try-on, no ghost mannequin, no video. FASHN has no background tools, no enhancement, no batch. remove.bg only does one thing.

For Unistyles specifically: Process all 300+ products with professional AI editing. Virtual try-on for lingerie using IDM-VTON (works where FASHN does not). Generate lifestyle and studio backgrounds for all products. Create marketing videos for TikTok and Instagram. Auto-format for every marketplace. Total budget from $0 with free tools to $50-80 for premium quality.

This document contains everything needed. Hand it to any AI coding assistant and it will build the entire application. You only connect the API keys.

---

Document Version: 2.0
Created: February 2026
Author: Pau and Claude — for UniStudio
Designed to be handed to any AI coding assistant for autonomous implementation
