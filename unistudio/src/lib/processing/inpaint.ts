// =============================================================================
// Inpainting Processing Module
// =============================================================================

import { runModel, extractOutputUrl } from '@/lib/api/replicate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InpaintPreset {
  name: string;
  description: string;
  prompt: string;
  negativePrompt: string;
}

// ---------------------------------------------------------------------------
// Inpainting Presets
// ---------------------------------------------------------------------------

export const INPAINT_PRESETS: Record<string, InpaintPreset> = {
  'remove-tag': {
    name: 'Remove Tag/Label',
    description: 'Remove price tags, labels, or stickers from the product',
    prompt: 'clean smooth surface, matching surrounding texture and color, seamless continuation of the product material, no tags, no labels, no stickers',
    negativePrompt: 'text, label, sticker, tag, price tag, barcode, watermark, logo',
  },
  'remove-wrinkles': {
    name: 'Remove Wrinkles',
    description: 'Smooth out wrinkles and creases in fabric or materials',
    prompt: 'smooth unwrinkled fabric, clean pressed surface, perfectly flat and smooth material, no creases, no folds, professional product photo',
    negativePrompt: 'wrinkles, creases, folds, crumpled, messy, rumpled',
  },
  'remove-person-bg': {
    name: 'Remove Person/Background',
    description: 'Remove unwanted people or background elements',
    prompt: 'clean empty background, seamless fill matching surrounding area, natural continuation, no people, no distracting elements',
    negativePrompt: 'person, people, face, hand, body, figure, silhouette',
  },
  'fix-stain': {
    name: 'Fix Stain/Blemish',
    description: 'Remove stains, marks, or blemishes from the product',
    prompt: 'clean pristine surface, matching surrounding texture and color, no stains, no marks, no blemishes, perfect condition, unblemished product',
    negativePrompt: 'stain, mark, blemish, spot, discoloration, dirt, scratch, damage',
  },
  'change-color-red': {
    name: 'Change Color to Red',
    description: 'Change the selected area to red',
    prompt: 'rich vibrant red color, same material and texture, consistent lighting, natural red shade',
    negativePrompt: 'faded, washed out, unrealistic, different material, different texture',
  },
  'change-color-blue': {
    name: 'Change Color to Blue',
    description: 'Change the selected area to blue',
    prompt: 'rich vibrant blue color, same material and texture, consistent lighting, natural blue shade',
    negativePrompt: 'faded, washed out, unrealistic, different material, different texture',
  },
  'change-color-black': {
    name: 'Change Color to Black',
    description: 'Change the selected area to black',
    prompt: 'deep solid black color, same material and texture, consistent lighting, natural black shade, matte or matching finish',
    negativePrompt: 'gray, faded, washed out, unrealistic, different material, different texture',
  },
  'change-color-white': {
    name: 'Change Color to White',
    description: 'Change the selected area to white',
    prompt: 'clean bright white color, same material and texture, consistent lighting, natural white shade, pure white',
    negativePrompt: 'yellow, gray, off-white, faded, unrealistic, different material, different texture',
  },
  'add-texture': {
    name: 'Add Texture',
    description: 'Add or enhance texture in the selected area',
    prompt: 'rich detailed texture, natural material feel, consistent with surrounding area, high quality surface detail, tactile and realistic',
    negativePrompt: 'flat, smooth, featureless, unrealistic, plastic, artificial',
  },
  'remove-reflection': {
    name: 'Remove Reflection',
    description: 'Remove unwanted reflections from glass or shiny surfaces',
    prompt: 'clear surface without reflections, clean glass or metal, no unwanted mirror effects, matching surrounding area, natural transparent or opaque surface',
    negativePrompt: 'reflection, mirror, glare, lens flare, bright spot, light artifact',
  },
};

// ---------------------------------------------------------------------------
// Flux Fill Pro (highest quality inpainting)
// ---------------------------------------------------------------------------

/**
 * Inpaint a region of an image using Flux Fill Pro on Replicate.
 * Highest quality inpainting with excellent prompt adherence.
 *
 * @param imageUrl - URL of the source image.
 * @param maskUrl  - URL of the mask image (white = area to inpaint, black = preserve).
 * @param prompt   - Text description of what to generate in the masked region.
 * @returns URL of the inpainted image.
 */
export async function inpaintFluxPro(
  imageUrl: string,
  maskUrl: string,
  prompt: string,
): Promise<string> {
  const output = await runModel('black-forest-labs/flux-fill-pro', {
    image: imageUrl,
    mask: maskUrl,
    prompt,
  });

  return extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Flux Fill Dev (faster, more affordable inpainting)
// ---------------------------------------------------------------------------

/**
 * Inpaint a region of an image using Flux Fill Dev on Replicate.
 * Faster and more affordable than Pro, still high quality.
 *
 * @param imageUrl - URL of the source image.
 * @param maskUrl  - URL of the mask image (white = area to inpaint, black = preserve).
 * @param prompt   - Text description of what to generate in the masked region.
 * @returns URL of the inpainted image.
 */
export async function inpaintFluxDev(
  imageUrl: string,
  maskUrl: string,
  prompt: string,
): Promise<string> {
  const output = await runModel('black-forest-labs/flux-fill-dev', {
    image: imageUrl,
    mask: maskUrl,
    prompt,
  });

  return extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Kontext Edit (instruction-based, no mask needed)
// ---------------------------------------------------------------------------

/**
 * Edit an image using Flux Kontext Pro with a text instruction.
 * No mask is required -- the model understands what to edit from the instruction.
 *
 * @param imageUrl        - URL of the source image.
 * @param editInstruction - Natural language instruction describing the edit
 *                          (e.g. "Remove the price tag from the shirt",
 *                           "Change the shoe color to red").
 * @returns URL of the edited image.
 */
export async function editKontext(
  imageUrl: string,
  editInstruction: string,
): Promise<string> {
  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: imageUrl,
    prompt: editInstruction,
  });

  return extractOutputUrl(output);
}
