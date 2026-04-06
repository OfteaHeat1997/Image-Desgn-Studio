// =============================================================================
// Jewelry / Accessory Virtual Try-On Processing Module - UniStudio
// =============================================================================
// Uses Flux Kontext Pro via Replicate.
// Flux Kontext Pro accepts a single `input_image` and an instruction-style
// `prompt`. It does NOT support a `reference_image` parameter.
// The jewelry description is therefore embedded into the text prompt so the
// model knows what accessory to place and where.
// =============================================================================

import { runModel, extractOutputUrl } from '@/lib/api/replicate';

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
// Prompt templates per accessory type
// ---------------------------------------------------------------------------

export const ACCESSORY_PROMPTS: Record<string, string> = {
  earrings:
    'Add a pair of elegant earrings to the model\'s ears. ' +
    'The earrings should hang naturally from the earlobes, match the lighting and perspective of the photo, ' +
    'and look completely realistic as if the model is actually wearing them. ' +
    'The earrings should be stylish and complement the model\'s look. ' +
    'Maintain the model\'s face, hair, and overall appearance exactly — only add the earrings. ' +
    'Professional jewelry photography quality, high detail.',

  necklace:
    'Add an elegant necklace to the model\'s neck area. ' +
    'The necklace should drape naturally around the neck and chest, matching the lighting and skin tone. ' +
    'Make it look completely realistic as if the model is wearing it. ' +
    'Include a delicate chain and a tasteful pendant that suits the model\'s style. ' +
    'Maintain the model\'s appearance and clothing exactly — only add the necklace. ' +
    'Professional jewelry photography quality, high detail.',

  ring:
    'Add a stylish ring to the ring finger of the model\'s visible hand. ' +
    'The ring should fit naturally on the finger, matching the lighting, skin tone, and hand position. ' +
    'Make it look completely realistic with proper perspective and shadows. ' +
    'The ring should be elegant, with a metallic band and a small gemstone. ' +
    'Maintain the model\'s hand and overall appearance exactly — only add the ring. ' +
    'Professional jewelry photography quality, high detail.',

  bracelet:
    'Add an elegant bracelet to the model\'s wrist. ' +
    'The bracelet should sit naturally on the wrist, matching the lighting and skin tone. ' +
    'Make it look completely realistic as if the model is wearing it. ' +
    'The bracelet should be stylish with a classic chain or band design. ' +
    'Maintain the model\'s arm and overall appearance exactly — only add the bracelet. ' +
    'Professional jewelry photography quality, high detail.',

  sunglasses:
    'Add a pair of stylish sunglasses to the model\'s face. ' +
    'The sunglasses should sit naturally on the nose bridge, balanced on the ears, matching the face shape, angle, and lighting. ' +
    'Make it look completely realistic with correct lens reflections and frame shadows. ' +
    'The sunglasses should have a fashionable frame design with tinted lenses. ' +
    'Maintain the model\'s face and overall appearance exactly — only add the sunglasses. ' +
    'Professional fashion photography quality, high detail.',

  watch:
    'Add a luxury wristwatch to the model\'s wrist. ' +
    'The watch should sit naturally on the wrist, matching the lighting, skin tone, and arm position. ' +
    'Make it look completely realistic as if the model is wearing it, with correct perspective and reflections. ' +
    'The watch should have an elegant face and a matching band (metal or leather). ' +
    'Maintain the model\'s arm and overall appearance exactly — only add the watch. ' +
    'Professional product photography quality, high detail.',
};

// ---------------------------------------------------------------------------
// Metal/finish modifier phrases
// ---------------------------------------------------------------------------

const METAL_PHRASES: Record<string, string> = {
  gold: 'in polished gold metal',
  silver: 'in polished silver metal',
  'rose-gold': 'in rose gold metal',
  platinum: 'in platinum metal',
  'yellow-gold': 'in yellow gold metal',
  'white-gold': 'in white gold metal',
};

const FINISH_PHRASES: Record<string, string> = {
  polished: 'with a high-polish mirror finish',
  matte: 'with a brushed matte finish',
  brushed: 'with a brushed satin finish',
  hammered: 'with a hammered textured finish',
  oxidized: 'with an oxidized antique finish',
};

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Apply a jewelry or accessory virtually to a model photo using
 * Flux Kontext Pro on Replicate.
 *
 * @param modelImageUrl   - Publicly accessible URL of the model photo.
 * @param jewelryImageUrl - Publicly accessible URL of the jewelry/accessory photo.
 *                          NOTE: Flux Kontext Pro does not natively accept a second
 *                          reference image; the jewelry image URL is included in the
 *                          prompt as context. For best results, pass the model image
 *                          as `modelImageUrl` and describe the jewelry item in
 *                          `options` or rely on the accessory-type prompt.
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
  const basePrompt = ACCESSORY_PROMPTS[accessoryType];
  if (!basePrompt) {
    throw new Error(
      `Unsupported accessory type "${accessoryType}". ` +
      'Use one of: earrings, necklace, ring, bracelet, sunglasses, watch.',
    );
  }

  // Build optional modifier suffix
  const modifiers: string[] = [];
  if (options?.metalType && METAL_PHRASES[options.metalType]) {
    modifiers.push(METAL_PHRASES[options.metalType]);
  }
  if (options?.finish && FINISH_PHRASES[options.finish]) {
    modifiers.push(FINISH_PHRASES[options.finish]);
  }

  // Incorporate the jewelry image URL as context in the prompt so the model
  // has a reference signal. Flux Kontext Pro is an instruction-following model;
  // mentioning the reference image URL in the prompt is a soft hint.
  const referenceHint =
    `Use the accessory visible at ${jewelryImageUrl} as visual reference for the style, design, and material. `;

  const fullPrompt = referenceHint + basePrompt +
    (modifiers.length > 0 ? ' ' + modifiers.join(', ') + '.' : '');

  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: modelImageUrl,
    prompt: fullPrompt,
    output_format: 'jpg',
  });

  return await extractOutputUrl(output);
}
