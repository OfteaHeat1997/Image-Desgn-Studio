// =============================================================================
// Jewelry / Accessory Virtual Try-On Processing Module - UniStudio
// =============================================================================
// Strategy: Create a side-by-side composite (model | jewelry product) and use
// Flux Kontext Pro to place the EXACT jewelry from the right onto the person
// on the left. This ensures the AI copies the real product design.
// =============================================================================

import sharp from 'sharp';
import { runModel, extractOutputUrl, ensureHttpUrl } from '@/lib/api/replicate';

// ---------------------------------------------------------------------------
// Cost constants (USD per call)
// ---------------------------------------------------------------------------

export const JEWELRY_COSTS: Record<string, number> = {
  earrings: 0.05,
  necklace: 0.05,
  ring: 0.05,
  bracelet: 0.05,
  sunglasses: 0.05,
  watch: 0.05,
};

// ---------------------------------------------------------------------------
// Placement prompts — reference "the jewelry product shown on the RIGHT side"
// ---------------------------------------------------------------------------

const PLACEMENT_PROMPTS: Record<string, string> = {
  earrings:
    'Look at the jewelry product photo on the RIGHT side of this image. ' +
    'The person on the LEFT is now wearing that exact pair of earrings on both earlobes. ' +
    'Show the full person naturally with the earrings placed correctly. ' +
    'Copy the exact design, shape, material, color, and gemstones from the product reference. ' +
    'Match lighting and reflections to the person\'s photo. Keep face, hair, and clothing unchanged.',

  necklace:
    'Look at the jewelry product photo on the RIGHT side of this image. ' +
    'The person on the LEFT is now wearing that exact necklace around their neck. ' +
    'Show the full person naturally with the necklace draped correctly along the neckline. ' +
    'Copy the exact chain style, pendant, material, and thickness from the product reference. ' +
    'Match lighting and reflections. Keep the person unchanged.',

  ring:
    'Look at the jewelry product photo on the RIGHT side of this image. ' +
    'The hand on the LEFT is now wearing that exact ring on the ring finger. ' +
    'Show the hand naturally with the ring placed correctly. ' +
    'Copy the exact design, gemstone, band, and metal color from the product reference. ' +
    'Match lighting and perspective. Keep everything else unchanged.',

  bracelet:
    'Look at the jewelry product photo on the RIGHT side of this image. ' +
    'The wrist on the LEFT is now wearing that exact bracelet. ' +
    'Show the wrist naturally with the bracelet placed correctly. ' +
    'Copy the exact chain style, width, clasp, and material from the product reference. ' +
    'Match lighting and reflections. Keep everything else unchanged.',

  sunglasses:
    'Look at the eyewear product photo on the RIGHT side of this image. ' +
    'The person on the LEFT is now wearing those exact sunglasses on their face. ' +
    'Show the full person naturally with the sunglasses placed on the nose bridge. ' +
    'Copy the exact frame shape, color, and lens tint from the product reference. ' +
    'Keep everything else unchanged.',

  watch:
    'Look at the watch product photo on the RIGHT side of this image. ' +
    'The wrist on the LEFT is now wearing that exact watch. ' +
    'Show the wrist naturally with the watch placed correctly. ' +
    'Copy the exact face design, band style, color, and material from the product reference. ' +
    'Match lighting and reflections. Keep everything else unchanged.',
};

// ---------------------------------------------------------------------------
// Exhibidor (display stand) prompts — per accessory type
// ---------------------------------------------------------------------------

const EXHIBIDOR_PROMPTS: Record<string, string> = {
  earrings:
    'This exact jewelry piece elegantly displayed hanging from an elegant T-bar earring display stand, ' +
    'professional commercial photography, soft diffused studio lighting, clean white marble surface, ' +
    'photorealistic, sharp focus, 8K detail, luxury brand advertising style',
  necklace:
    'This exact jewelry piece elegantly displayed draped on a sleek velvet bust necklace display, ' +
    'professional commercial photography, soft diffused studio lighting, clean white marble surface, ' +
    'photorealistic, sharp focus, 8K detail, luxury brand advertising style',
  ring:
    'This exact jewelry piece elegantly displayed placed on a minimalist ring holder stand, ' +
    'professional commercial photography, soft diffused studio lighting, clean white marble surface, ' +
    'photorealistic, sharp focus, 8K detail, luxury brand advertising style',
  bracelet:
    'This exact jewelry piece elegantly displayed resting on a curved bracelet display cushion, ' +
    'professional commercial photography, soft diffused studio lighting, clean white marble surface, ' +
    'photorealistic, sharp focus, 8K detail, luxury brand advertising style',
  sunglasses:
    'This exact eyewear piece elegantly displayed placed on a clean eyewear display stand, ' +
    'professional commercial photography, soft diffused studio lighting, clean white marble surface, ' +
    'photorealistic, sharp focus, 8K detail, luxury brand advertising style',
  watch:
    'This exact watch elegantly displayed on a premium watch winder stand, ' +
    'professional commercial photography, soft diffused studio lighting, clean white marble surface, ' +
    'photorealistic, sharp focus, 8K detail, luxury brand advertising style',
};

// ---------------------------------------------------------------------------
// Flotante (floating) prompt — same for all types
// ---------------------------------------------------------------------------

const FLOTANTE_PROMPT =
  'This exact jewelry piece floating and levitating gracefully in mid-air, ' +
  'dramatic cinematic lighting with golden highlights, dark luxury gradient background, ' +
  'magical floating effect with soft shadow below, sparkling light particles around it, ' +
  'product photography, photorealistic, ultra high detail';

// ---------------------------------------------------------------------------
// Metal/finish modifier phrases
// ---------------------------------------------------------------------------

const METAL_PHRASES: Record<string, string> = {
  gold: 'The metal is polished gold.',
  silver: 'The metal is polished silver.',
  'rose-gold': 'The metal is rose gold.',
  platinum: 'The metal is platinum.',
  'yellow-gold': 'The metal is yellow gold.',
  'white-gold': 'The metal is white gold.',
};

const FINISH_PHRASES: Record<string, string> = {
  polished: 'High-polish mirror finish.',
  matte: 'Brushed matte finish.',
  brushed: 'Brushed satin finish.',
  hammered: 'Hammered textured finish.',
  oxidized: 'Oxidized antique finish.',
};

// ---------------------------------------------------------------------------
// Composite image creation
// ---------------------------------------------------------------------------

/**
 * Create a side-by-side composite: [model | jewelry product]
 * Both images are resized to the same height and placed next to each other.
 * Returns a data URL of the composite.
 */
async function createComposite(
  modelImageUrl: string,
  jewelryImageUrl: string,
): Promise<string> {
  // Download both images
  const [modelBuf, jewelryBuf] = await Promise.all([
    fetchImageBuffer(modelImageUrl),
    fetchImageBuffer(jewelryImageUrl),
  ]);

  // Resize both to a standard height (1024px) while maintaining aspect ratios
  const targetHeight = 1024;

  const modelResized = await sharp(modelBuf)
    .resize({ height: targetHeight, fit: 'inside' })
    .png()
    .toBuffer();

  const jewelryResized = await sharp(jewelryBuf)
    .resize({ height: targetHeight, fit: 'inside' })
    .png()
    .toBuffer();

  // Get dimensions after resize
  const modelMeta = await sharp(modelResized).metadata();
  const jewelryMeta = await sharp(jewelryResized).metadata();

  const mw = modelMeta.width || 768;
  const mh = modelMeta.height || 1024;
  const jw = jewelryMeta.width || 512;
  const jh = jewelryMeta.height || 1024;

  // Separator width
  const sep = 4;
  const totalWidth = mw + sep + jw;
  const totalHeight = Math.max(mh, jh);

  // Create composite with white separator bar
  const composite = await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: modelResized, top: Math.round((totalHeight - mh) / 2), left: 0 },
      { input: jewelryResized, top: Math.round((totalHeight - jh) / 2), left: mw + sep },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return `data:image/jpeg;base64,${composite.toString('base64')}`;
}

/**
 * Download an image from URL or decode a data URL, returning a Buffer.
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) throw new Error('Invalid data URI');
    return Buffer.from(match[1], 'base64');
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Apply jewelry virtually by creating a composite reference image.
 *
 * 1. Creates a side-by-side composite: [model photo | jewelry product photo]
 * 2. Uploads the composite to Replicate
 * 3. Uses Flux Kontext Pro with a prompt that says "place the jewelry from the
 *    RIGHT side onto the person on the LEFT side"
 *
 * This way the AI can SEE the actual product and copy its exact design.
 */
export async function applyJewelry(
  modelImageUrl: string,
  jewelryImageUrl: string,
  accessoryType: string,
  options?: { metalType?: string; finish?: string },
): Promise<string> {
  const placementPrompt = PLACEMENT_PROMPTS[accessoryType];
  if (!placementPrompt) {
    throw new Error(
      `Unsupported accessory type "${accessoryType}". ` +
      'Use one of: earrings, necklace, ring, bracelet, sunglasses, watch.',
    );
  }

  // Build modifier hints
  const modifiers: string[] = [];
  if (options?.metalType && METAL_PHRASES[options.metalType]) {
    modifiers.push(METAL_PHRASES[options.metalType]);
  }
  if (options?.finish && FINISH_PHRASES[options.finish]) {
    modifiers.push(FINISH_PHRASES[options.finish]);
  }
  const modifierStr = modifiers.length > 0 ? ' ' + modifiers.join(' ') : '';

  // Create composite image: [model | jewelry product]
  const compositeDataUrl = await createComposite(modelImageUrl, jewelryImageUrl);

  // Upload composite to Replicate for processing
  const compositeHttpUrl = await ensureHttpUrl(compositeDataUrl);

  // Build the full prompt
  const fullPrompt = placementPrompt + modifierStr +
    ' Professional jewelry photography quality, photorealistic, high detail.';

  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: compositeHttpUrl,
    prompt: fullPrompt,
    output_format: 'jpg',
  });

  return await extractOutputUrl(output);
}

/**
 * Apply a display or floating effect to a jewelry image (no model needed).
 * Used for "exhibidor" and "flotante" modes.
 *
 * Sends ONLY the jewelry image to Flux Kontext Pro with a product photography prompt.
 */
export async function applyJewelryDisplay(
  jewelryImageUrl: string,
  accessoryType: string,
  mode: 'exhibidor' | 'flotante',
  options?: { metalType?: string; finish?: string },
): Promise<string> {
  let prompt: string;

  if (mode === 'flotante') {
    prompt = FLOTANTE_PROMPT;
  } else {
    prompt = EXHIBIDOR_PROMPTS[accessoryType] || EXHIBIDOR_PROMPTS['necklace'];
  }

  // Add metal/finish modifiers
  const modifiers: string[] = [];
  if (options?.metalType && METAL_PHRASES[options.metalType]) {
    modifiers.push(METAL_PHRASES[options.metalType]);
  }
  if (options?.finish && FINISH_PHRASES[options.finish]) {
    modifiers.push(FINISH_PHRASES[options.finish]);
  }
  if (modifiers.length > 0) {
    prompt += ' ' + modifiers.join(' ');
  }

  const jewelryHttpUrl = await ensureHttpUrl(jewelryImageUrl);

  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: jewelryHttpUrl,
    prompt,
    output_format: 'jpg',
  });

  return await extractOutputUrl(output);
}
