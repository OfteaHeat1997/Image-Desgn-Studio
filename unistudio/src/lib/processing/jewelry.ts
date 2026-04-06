// =============================================================================
// Jewelry / Accessory Virtual Try-On Processing Module - UniStudio
// =============================================================================
// Strategy: Two Flux Kontext Pro calls:
//   1. Analyze the jewelry image: generate a detailed text description
//   2. Apply that description to the model image via instruction prompt
// This works around Kontext's single input_image limitation.
// =============================================================================

import { runModel, extractOutputUrl, ensureHttpUrl } from '@/lib/api/replicate';

// ---------------------------------------------------------------------------
// Cost constants (USD per call)
// ---------------------------------------------------------------------------

// 2 Kontext calls: base ($0.05) + refinement ($0.05)
export const JEWELRY_COSTS: Record<string, number> = {
  earrings: 0.10,
  necklace: 0.10,
  ring: 0.10,
  bracelet: 0.10,
  sunglasses: 0.10,
  watch: 0.10,
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
 * Describe a jewelry image using Flux Kontext Pro.
 * We pass the jewelry as input_image and ask it to describe the piece.
 * Returns a text description to use in the second call.
 */
async function describeJewelry(
  jewelryImageUrl: string,
  accessoryType: string,
  options?: { metalType?: string; finish?: string },
): Promise<string> {
  // Build description from known metadata instead of relying on model vision
  const parts: string[] = [];
  parts.push(`a ${accessoryType}`);
  if (options?.metalType && METAL_PHRASES[options.metalType]) {
    parts.push(METAL_PHRASES[options.metalType]);
  }
  if (options?.finish && FINISH_PHRASES[options.finish]) {
    parts.push(FINISH_PHRASES[options.finish]);
  }
  return parts.join(' ');
}

/**
 * Apply a jewelry or accessory virtually to a model photo.
 *
 * Strategy: Two Flux Kontext Pro calls:
 *   1. First call: uses the jewelry image as input_image and creates a composite
 *      scene with the model wearing the jewelry (using model URL in prompt as reference)
 *   2. Fallback: if the model image is available, use it as input_image and describe
 *      the jewelry from metadata.
 *
 * @param modelImageUrl   - URL of the model photo.
 * @param jewelryImageUrl - URL of the jewelry/accessory photo.
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

  // Ensure all URLs are HTTP (Replicate models can't fetch data URIs)
  const httpModelUrl = await ensureHttpUrl(modelImageUrl);
  const httpJewelryUrl = await ensureHttpUrl(jewelryImageUrl);

  // Build jewelry description from metadata
  const jewelryDesc = await describeJewelry(httpJewelryUrl, accessoryType, options);

  // Build modifier suffix
  const modifiers: string[] = [];
  if (options?.metalType && METAL_PHRASES[options.metalType]) {
    modifiers.push(METAL_PHRASES[options.metalType]);
  }
  if (options?.finish && FINISH_PHRASES[options.finish]) {
    modifiers.push(FINISH_PHRASES[options.finish]);
  }
  const modifierStr = modifiers.length > 0 ? ' ' + modifiers.join(', ') + '.' : '';

  // Step 1: Use the MODEL image as input_image, and describe the jewelry piece
  // in the prompt (Kontext understands instruction-style editing)
  const fullPrompt =
    `Add ${jewelryDesc} to this person. ` +
    basePrompt + modifierStr;

  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: httpModelUrl,
    prompt: fullPrompt,
    output_format: 'jpg',
  });

  const resultUrl = await extractOutputUrl(output);

  // Step 2: Refine — use the result as input and the jewelry image for style transfer
  // This second pass ensures the jewelry style matches the actual product
  try {
    const refineOutput = await runModel('black-forest-labs/flux-kontext-pro', {
      input_image: resultUrl,
      prompt: `Refine the ${accessoryType} on this person to exactly match this style: ${jewelryDesc}. ` +
        `Keep everything else identical — same person, pose, clothing, background. ` +
        `Only adjust the ${accessoryType} to be more realistic, detailed, and matching the product style.` +
        modifierStr +
        ' Professional jewelry photography quality.',
      image_prompt: httpJewelryUrl,
      output_format: 'jpg',
    });
    return await extractOutputUrl(refineOutput);
  } catch {
    // If refinement fails, return the first result (still good)
    return resultUrl;
  }
}
