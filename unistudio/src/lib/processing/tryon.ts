// =============================================================================
// Virtual Try-On Processing Module
// =============================================================================

import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { runFashn, pollFashn } from '@/lib/api/fashn';
import type { FashnCategory } from '@/lib/api/fashn';
import type { GarmentCategory } from '@/types/api';

// Re-export so existing consumers don't break
export type { GarmentCategory };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GarmentType =
  | 'shirt'
  | 'blouse'
  | 't-shirt'
  | 'sweater'
  | 'jacket'
  | 'coat'
  | 'pants'
  | 'jeans'
  | 'skirt'
  | 'shorts'
  | 'dress'
  | 'jumpsuit'
  | 'swimwear'
  | 'lingerie'
  | 'activewear'
  | 'other';

export interface TryOnResult {
  url: string;
  provider: 'idm-vton' | 'kolors' | 'fashn';
}

// ---------------------------------------------------------------------------
// IDM-VTON via Replicate
// ---------------------------------------------------------------------------

/**
 * Virtual try-on using IDM-VTON on Replicate.
 * Excellent for lingerie, swimwear, and detailed garments.
 * Uses higher denoise steps for better quality.
 *
 * @param modelImage         - URL of the person/model image.
 * @param garmentImage       - URL of the garment image.
 * @param garmentDescription - Text description of the garment for better fitting.
 * @returns URL of the try-on result image.
 */
export async function tryOnIdmVton(
  modelImage: string,
  garmentImage: string,
  garmentDescription: string,
): Promise<string> {
  const output = await runModel('cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985', {
    human_img: modelImage,
    garm_img: garmentImage,
    garment_des: garmentDescription,
    is_checked: true,
    is_checked_crop: false,
    denoise_steps: 30,
    seed: -1,
  });

  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Kolors Virtual Try-On via Replicate
// ---------------------------------------------------------------------------

/**
 * Virtual try-on using Kolors on Replicate.
 * Fast and high-quality try-on with good color preservation.
 *
 * @param modelImage   - URL of the person/model image.
 * @param garmentImage - URL of the garment image.
 * @returns URL of the try-on result image.
 */
export async function tryOnKolors(
  modelImage: string,
  garmentImage: string,
): Promise<string> {
  const output = await runModel('kolors/kolors-virtual-try-on', {
    human_image: modelImage,
    garment_image: garmentImage,
  });

  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// FASHN v1.6 (Premium try-on)
// ---------------------------------------------------------------------------

/**
 * Map internal garment categories to FASHN-compatible categories.
 */
function toFashnCategory(category: string): FashnCategory {
  switch (category) {
    case 'dresses':
    case 'one-pieces':
      return 'one-pieces';
    case 'outerwear':
    case 'tops':
      return 'tops';
    case 'bottoms':
      return 'bottoms';
    case 'full-body':
    default:
      return 'auto';
  }
}

/**
 * Virtual try-on using FASHN tryon-v1.6.
 * Premium quality, 864x1296 output resolution.
 *
 * @param modelImage   - URL of the person/model image.
 * @param garmentImage - URL of the garment image.
 * @param category     - Internal garment category.
 * @returns URL of the try-on result image.
 */
export async function tryOnFashn(
  modelImage: string,
  garmentImage: string,
  category: string,
): Promise<string> {
  const id = await runFashn({
    model_image: modelImage,
    garment_image: garmentImage,
    category: toFashnCategory(category),
  });

  const result = await pollFashn(id);

  if (result.output && result.output.length > 0) {
    return result.output[0];
  }
  throw new Error('FASHN prediction completed but returned no output');
}

// ---------------------------------------------------------------------------
// Smart Try-On (auto-routing)
// ---------------------------------------------------------------------------

/**
 * Intelligently routes the try-on request to the best provider based on
 * garment category and type. Defaults to IDM-VTON for all garment types.
 *
 * @param modelImage   - URL or base64 of the person/model image.
 * @param garmentImage - URL or base64 of the garment image.
 * @param category     - Garment category (e.g. 'tops', 'bottoms', 'one-pieces').
 * @param garmentType  - Specific garment type for routing decisions.
 * @returns URL of the try-on result image.
 */
export async function smartTryOn(
  modelImage: string,
  garmentImage: string,
  category: string,
  garmentType: string,
): Promise<string> {
  // Prefer FASHN when API key is configured (highest quality)
  if (process.env.FASHN_API_KEY) {
    return tryOnFashn(modelImage, garmentImage, category);
  }

  const description = `${garmentType} garment, ${category} category, professional fashion photography`;
  return tryOnIdmVton(modelImage, garmentImage, description);
}
