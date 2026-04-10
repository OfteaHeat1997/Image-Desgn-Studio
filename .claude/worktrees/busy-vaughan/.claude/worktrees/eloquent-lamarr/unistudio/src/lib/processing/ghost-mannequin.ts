// =============================================================================
// Ghost Mannequin Processing Module - UniStudio
// =============================================================================

import { runModel, extractOutputUrl } from '@/lib/api/replicate';

// ---------------------------------------------------------------------------
// Cost constants
// ---------------------------------------------------------------------------

export const GHOST_MANNEQUIN_COSTS: Record<string, number> = {
  'remove-mannequin': 0.05,
  'flat-to-model': 0.08,
  'model-to-flat': 0.05,
};

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const PROMPTS = {
  'remove-mannequin':
    'Remove the mannequin/ghost mannequin completely from this garment image. ' +
    'Create a clean hollow/invisible mannequin effect showing the garment as if it is floating ' +
    'with natural 3D shape. The inside of the garment should be visible where the mannequin was. ' +
    'Keep the garment fabric, color, and details exactly the same. Clean professional ecommerce product photography.',

  'model-to-flat':
    'Convert this on-model clothing photo to a flat lay product image. ' +
    'Show the garment laid flat on a clean white background from a top-down perspective. ' +
    'Maintain the exact same garment with all its details, color, texture, and design. ' +
    'Professional ecommerce flat lay photography style, neatly arranged, no wrinkles.',
};

// ---------------------------------------------------------------------------
// Exported processing functions
// ---------------------------------------------------------------------------

/**
 * Remove the mannequin from a garment image and create the hollow 3D effect.
 * Uses Flux Kontext Pro to edit out the mannequin via a text instruction.
 *
 * @param imageUrl - URL of the garment-on-mannequin image.
 * @returns URL of the resulting hollow-mannequin product image.
 */
export async function removeMannequin(imageUrl: string): Promise<string> {
  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: imageUrl,
    prompt: PROMPTS['remove-mannequin'],
  });

  return extractOutputUrl(output);
}

/**
 * Convert a flat-lay garment image into an on-model look via virtual try-on.
 * Uses IDM-VTON on Replicate to dress the supplied model image with the garment.
 *
 * @param garmentUrl - URL of the flat-lay garment image.
 * @param modelUrl   - URL of the model/person image to dress.
 * @param category   - Garment category: 'tops' | 'bottoms' | 'dresses'.
 * @returns URL of the on-model result image.
 */
export async function flatToModel(
  garmentUrl: string,
  modelUrl: string,
  category: string,
): Promise<string> {
  const output = await runModel('cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985', {
    human_img: modelUrl,
    garm_img: garmentUrl,
    category,
    garment_des: `${category} garment, professional fashion photography`,
    is_checked: true,
    is_checked_crop: false,
    denoise_steps: 30,
    seed: -1,
  });

  return extractOutputUrl(output);
}

/**
 * Convert an on-model garment photo into a flat-lay product image.
 * Uses Flux Kontext Pro with a layout instruction.
 *
 * @param imageUrl - URL of the on-model photo.
 * @returns URL of the flat-lay result image.
 */
export async function modelToFlat(imageUrl: string): Promise<string> {
  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: imageUrl,
    prompt: PROMPTS['model-to-flat'],
  });

  return extractOutputUrl(output);
}
