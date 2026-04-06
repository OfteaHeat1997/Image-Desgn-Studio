// =============================================================================
// Jewelry / Accessory Virtual Try-On Processing Module - UniStudio
// =============================================================================
// Strategy: Flux Kontext Pro with image_prompt for style reference.
// The jewelry image is passed as image_prompt so the AI copies the EXACT
// product design, not a generic version.
// =============================================================================

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
// Placement prompts — tell the AI WHERE to put the jewelry and HOW
// These focus on placement, not design (the image_prompt handles design)
// ---------------------------------------------------------------------------

const PLACEMENT_PROMPTS: Record<string, string> = {
  earrings:
    'Add the EXACT jewelry piece shown in the reference image as earrings on this person. ' +
    'Place them hanging naturally from both earlobes. ' +
    'Copy the exact design, material, color, shape, and style from the reference image — do NOT invent a different design. ' +
    'Match the lighting, shadows, and reflections to the photo. ' +
    'Keep the person, face, hair, clothing, and background completely unchanged.',

  necklace:
    'Add the EXACT jewelry piece shown in the reference image as a necklace on this person. ' +
    'Drape it naturally around the neck and chest area, following the neckline. ' +
    'Copy the exact chain style, thickness, color, material, pendant, and design from the reference — do NOT invent a different necklace. ' +
    'The chain links, clasp style, and overall look must match the product photo exactly. ' +
    'Match lighting and reflections to the scene. ' +
    'Keep the person, face, clothing, and background completely unchanged.',

  ring:
    'Add the EXACT jewelry piece shown in the reference image as a ring on this person\'s ring finger. ' +
    'Copy the exact design, gemstone, metal color, band width, and style from the reference — do NOT invent a different ring. ' +
    'The ring should fit naturally on the finger with correct perspective and shadows. ' +
    'Keep everything else completely unchanged.',

  bracelet:
    'Add the EXACT jewelry piece shown in the reference image as a bracelet on this person\'s wrist. ' +
    'Copy the exact chain style, width, color, material, and clasp from the reference — do NOT invent a different bracelet. ' +
    'The bracelet should sit naturally on the wrist with correct perspective. ' +
    'Match lighting and reflections. Keep everything else unchanged.',

  sunglasses:
    'Add the EXACT eyewear shown in the reference image as sunglasses on this person\'s face. ' +
    'Copy the exact frame shape, color, lens tint, and design from the reference — do NOT invent different sunglasses. ' +
    'Place them naturally on the nose bridge with correct perspective. ' +
    'Keep everything else unchanged.',

  watch:
    'Add the EXACT watch shown in the reference image on this person\'s wrist. ' +
    'Copy the exact face design, band style, color, material, and dial from the reference — do NOT invent a different watch. ' +
    'The watch should sit naturally on the wrist with correct perspective and reflections. ' +
    'Keep everything else unchanged.',
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
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Apply a jewelry or accessory virtually to a model photo.
 *
 * Uses Flux Kontext Pro with image_prompt to reference the ACTUAL jewelry product.
 * This ensures the AI copies the exact design instead of inventing a generic one.
 *
 * @param modelImageUrl   - URL of the model photo (person to wear the jewelry).
 * @param jewelryImageUrl - URL of the jewelry/accessory product photo.
 * @param accessoryType   - One of: earrings, necklace, ring, bracelet, sunglasses, watch.
 * @param options         - Optional metal type and finish modifiers.
 * @returns URL of the generated result image.
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

  // Ensure all URLs are HTTP (Replicate models can't fetch data URIs)
  const httpModelUrl = await ensureHttpUrl(modelImageUrl);
  const httpJewelryUrl = await ensureHttpUrl(jewelryImageUrl);

  // Build modifier hints
  const modifiers: string[] = [];
  if (options?.metalType && METAL_PHRASES[options.metalType]) {
    modifiers.push(METAL_PHRASES[options.metalType]);
  }
  if (options?.finish && FINISH_PHRASES[options.finish]) {
    modifiers.push(FINISH_PHRASES[options.finish]);
  }
  const modifierStr = modifiers.length > 0 ? ' ' + modifiers.join(' ') : '';

  // Single call with image_prompt: the jewelry product image is the STYLE REFERENCE
  // The model image is the input_image (what to edit)
  // This way the AI sees the actual product and copies its exact design
  const fullPrompt = placementPrompt + modifierStr +
    ' Professional jewelry photography quality, photorealistic, high detail, 8K.';

  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: httpModelUrl,
    image_prompt: httpJewelryUrl,
    prompt: fullPrompt,
    image_prompt_strength: 0.45,
    output_format: 'jpg',
  });

  return await extractOutputUrl(output);
}
