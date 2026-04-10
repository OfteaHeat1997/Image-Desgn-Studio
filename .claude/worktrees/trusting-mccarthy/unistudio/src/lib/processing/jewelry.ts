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
    'Now place that EXACT pair of earrings on the person shown on the LEFT side. ' +
    'Hang them naturally from both earlobes. ' +
    'Copy the exact design, shape, material, color, gemstones, and every detail from the product photo. ' +
    'The result should show ONLY the left person wearing the earrings — crop out the right reference image. ' +
    'Match lighting and reflections to the person\'s photo. Keep face, hair, clothing unchanged.',

  necklace:
    'Look at the jewelry product photo on the RIGHT side of this image. ' +
    'Now place that EXACT necklace on the person shown on the LEFT side. ' +
    'Drape it naturally around the neck following the neckline. ' +
    'Copy the exact chain style, pendant, material, thickness, and every detail from the product photo. ' +
    'The result should show ONLY the left person wearing the necklace — crop out the right reference. ' +
    'Match lighting and reflections. Keep the person unchanged.',

  ring:
    'Look at the jewelry product photo on the RIGHT side of this image. ' +
    'Now place that EXACT ring on the ring finger of the hand shown on the LEFT side. ' +
    'Copy the exact design, gemstone, band, metal color, and every detail from the product photo. ' +
    'The result should show ONLY the left hand with the ring — crop out the right reference. ' +
    'Match lighting and perspective. Keep everything else unchanged.',

  bracelet:
    'Look at the jewelry product photo on the RIGHT side of this image. ' +
    'Now place that EXACT bracelet on the wrist shown on the LEFT side. ' +
    'Copy the exact chain style, width, clasp, material, and every detail from the product photo. ' +
    'The result should show ONLY the left wrist with the bracelet — crop out the right reference. ' +
    'Match lighting and reflections. Keep everything else unchanged.',

  sunglasses:
    'Look at the eyewear product photo on the RIGHT side of this image. ' +
    'Now place those EXACT sunglasses on the person shown on the LEFT side. ' +
    'Copy the exact frame shape, color, lens tint, and design from the product photo. ' +
    'The result should show ONLY the left person wearing the sunglasses — crop out the right reference. ' +
    'Place naturally on the nose bridge. Keep everything else unchanged.',

  watch:
    'Look at the watch product photo on the RIGHT side of this image. ' +
    'Now place that EXACT watch on the wrist shown on the LEFT side. ' +
    'Copy the exact face design, band style, color, material, and every detail from the product photo. ' +
    'The result should show ONLY the left wrist with the watch — crop out the right reference. ' +
    'Match lighting and reflections. Keep everything else unchanged.',
};

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
