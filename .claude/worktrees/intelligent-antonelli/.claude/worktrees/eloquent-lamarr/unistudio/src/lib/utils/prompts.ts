// =============================================================================
// Prompt Utilities - UniStudio
// Helpers for building and optimizing prompts for AI image generation.
// =============================================================================

// -----------------------------------------------------------------------------
// Background scene presets
// -----------------------------------------------------------------------------

const BG_PRESETS: Record<string, string> = {
  'studio-white':
    'Clean white studio background, professional product photography lighting, soft shadows, gradient white backdrop',
  'studio-gray':
    'Neutral gray studio background, professional product photography, even diffused lighting',
  'studio-black':
    'Dark black studio background, dramatic product photography lighting, rim lighting, sleek and premium feel',
  'outdoor-natural':
    'Natural outdoor setting, soft golden hour sunlight, blurred greenery bokeh background, organic and fresh',
  'outdoor-urban':
    'Modern urban street setting, concrete and glass architecture, natural city lighting, contemporary vibe',
  'indoor-lifestyle':
    'Cozy indoor lifestyle setting, warm ambient lighting, tasteful home decor, inviting atmosphere',
  'indoor-minimal':
    'Minimalist interior, clean lines, neutral tones, Scandinavian design aesthetic, natural window light',
  'marble-surface':
    'Elegant marble surface, luxury product photography, soft reflections, premium feel, studio lighting',
  'wooden-surface':
    'Warm wooden table surface, rustic organic feel, natural materials, soft overhead lighting',
  'gradient-warm':
    'Smooth warm gradient background, peach to golden tones, soft studio lighting, modern product display',
  'gradient-cool':
    'Smooth cool gradient background, blue to lavender tones, soft studio lighting, modern product display',
  'holiday-christmas':
    'Festive Christmas setting, pine branches, warm bokeh lights, red and gold accents, cozy holiday atmosphere',
  'holiday-valentine':
    'Romantic Valentine setting, soft pink tones, rose petals, heart-shaped bokeh, elegant and romantic',
  'seasonal-summer':
    'Bright summer setting, tropical leaves, sunlight and shadows, vibrant and energetic, beach vibes',
  'seasonal-autumn':
    'Warm autumn setting, fall leaves, golden tones, soft warm lighting, rustic and cozy',
};

/**
 * Build a complete background generation prompt from a preset name,
 * optionally appending a custom addition.
 *
 * @param preset - One of the preset keys (e.g. "studio-white", "outdoor-natural").
 * @param customAddition - Additional prompt text to append.
 * @returns The full prompt string.
 *
 * @example
 * ```ts
 * buildBgPrompt('studio-white');
 * // "Clean white studio background, professional product photography lighting, soft shadows, gradient white backdrop"
 *
 * buildBgPrompt('outdoor-natural', 'with a river in the background');
 * // "Natural outdoor setting, ... with a river in the background"
 * ```
 */
export function buildBgPrompt(preset: string, customAddition?: string): string {
  const base = BG_PRESETS[preset] ?? preset;
  if (customAddition) {
    return `${base}, ${customAddition}`;
  }
  return base;
}

// -----------------------------------------------------------------------------
// Virtual try-on prompts
// -----------------------------------------------------------------------------

const TRYON_STYLES: Record<string, string> = {
  casual: 'casual everyday style, relaxed fit, natural pose',
  formal: 'formal professional style, tailored fit, elegant pose',
  streetwear: 'streetwear urban style, trendy fit, confident pose',
  athletic: 'athletic sportswear style, performance fit, dynamic pose',
  luxury: 'luxury high-fashion style, premium materials, editorial pose',
  vintage: 'vintage retro style, classic fit, timeless pose',
};

/**
 * Build a virtual try-on prompt from garment type and optional style.
 *
 * @param garmentType - The type of garment (e.g. "t-shirt", "dress", "jacket").
 * @param style - An optional style key or custom style description.
 * @returns The prompt string for the try-on model.
 */
export function buildTryOnPrompt(garmentType: string, style?: string): string {
  const styleDesc = style ? (TRYON_STYLES[style] ?? style) : 'natural and realistic fit';
  return `A person wearing a ${garmentType}, ${styleDesc}, high quality fashion photography, full body visible, realistic fabric draping and texture`;
}

// -----------------------------------------------------------------------------
// Video generation prompts
// -----------------------------------------------------------------------------

const MOTION_DESCRIPTIONS: Record<string, string> = {
  'zoom-in': 'smooth cinematic zoom in, gradually revealing product details',
  'zoom-out': 'smooth cinematic zoom out, revealing the full scene from a close-up',
  'pan-left': 'smooth horizontal pan from right to left, showcasing the product from different angles',
  'pan-right': 'smooth horizontal pan from left to right, showcasing the product from different angles',
  rotate: 'smooth 360-degree rotation around the product, turntable style product showcase',
  orbit: 'cinematic orbit around the product, dynamic camera movement revealing all sides',
  float: 'gentle floating motion, product slowly levitating with subtle rotation',
  parallax: 'subtle parallax depth effect, foreground and background moving at different speeds',
};

/**
 * Build a video generation prompt from a motion type and optional product description.
 *
 * @param motionType - The type of camera motion (e.g. "zoom-in", "rotate", "orbit").
 * @param productDescription - Optional description of the product for context.
 * @returns The prompt string for the video generation model.
 */
export function buildVideoPrompt(
  motionType: string,
  productDescription?: string,
): string {
  const motion = MOTION_DESCRIPTIONS[motionType] ?? motionType;
  const productContext = productDescription
    ? `Product: ${productDescription}. `
    : '';
  return `${productContext}${motion}, professional commercial video, high production quality, smooth motion, 4K quality`;
}

// -----------------------------------------------------------------------------
// Prompt optimization
// -----------------------------------------------------------------------------

const QUALITY_BOOSTERS = [
  'professional product photography',
  '8K resolution',
  'commercial quality',
  'sharp focus',
  'high detail',
  'studio lighting',
  'color accurate',
  'photorealistic',
];

/**
 * Optimize a simple description by adding professional quality boosters.
 * Useful for turning a basic user prompt into a more effective AI prompt.
 *
 * @param simpleDescription - The user's basic description (e.g. "red shoes on a table").
 * @returns An enhanced prompt with quality modifiers appended.
 *
 * @example
 * ```ts
 * optimizePrompt('red shoes on a wooden table');
 * // "red shoes on a wooden table, professional product photography, 8K resolution, commercial quality, sharp focus, high detail, studio lighting, color accurate, photorealistic"
 * ```
 */
export function optimizePrompt(simpleDescription: string): string {
  const trimmed = simpleDescription.trim();
  if (!trimmed) return QUALITY_BOOSTERS.join(', ');
  return `${trimmed}, ${QUALITY_BOOSTERS.join(', ')}`;
}
