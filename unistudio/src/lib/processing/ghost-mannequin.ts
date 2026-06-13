// =============================================================================
// Ghost Mannequin Processing Module - UniStudio
// =============================================================================

import sharp from 'sharp';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { runFal, ensureFalAccessibleUrl } from '@/lib/api/fal';

// ---------------------------------------------------------------------------
// Cost constants
// ---------------------------------------------------------------------------

export const GHOST_MANNEQUIN_COSTS: Record<string, number> = {
  'remove-mannequin': 0.05,
  'flat-to-model': 0.08,
  'model-to-flat': 0.05,
  'model-to-ghost': 0.04,
};

// Garment types that bypass Flux Kontext (content filter) and route to
// SeedDream edit on fal.ai. Kept in sync with model-create/tryon route.
const LINGERIE_TYPES = new Set([
  'lingerie', 'bra', 'panty', 'shapewear', 'bodysuit', 'swimwear', 'bikini',
  'underwear', 'intimate', 'faja', 'fajas',
]);

// Human-readable noun per garment type — used in prompts so the model knows
// what to isolate. Color is intentionally NOT in here (prompts must work for
// any color: red, black, white, printed, etc).
const GARMENT_NOUN: Record<string, string> = {
  lingerie: 'lingerie piece',
  bra: 'bra',
  panty: 'panties',
  panties: 'panties',
  shapewear: 'shapewear garment',
  faja: 'shapewear garment',
  fajas: 'shapewear garment',
  bodysuit: 'bodysuit',
  swimwear: 'swimwear piece',
  bikini: 'bikini piece',
  underwear: 'underwear piece',
  intimate: 'intimate garment',
  tops: 'top garment',
  bottoms: 'bottom garment',
  dresses: 'dress',
  outerwear: 'outerwear piece',
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

  return await extractOutputUrl(output);
}

/**
 * Flatten a data-URL image to white background JPEG for IDM-VTON compatibility.
 * Transparent PNGs cause IDM-VTON to crash with NoneType errors.
 */
async function flattenForTryOn(imageUrl: string): Promise<string> {
  if (!imageUrl.startsWith('data:')) return imageUrl;

  const base64Match = imageUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!base64Match) return imageUrl;

  const inputBuffer = Buffer.from(base64Match[1], 'base64');
  const jpegBuffer = await sharp(inputBuffer)
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 85 })
    .toBuffer();

  return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
}

/**
 * Convert a flat-lay garment image into an on-model look via virtual try-on.
 * Uses IDM-VTON on Replicate to dress the supplied model image with the garment.
 * Falls back to Flux Kontext Pro if IDM-VTON fails.
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
  // Flatten transparent images to white bg for IDM-VTON compatibility
  const flatGarment = await flattenForTryOn(garmentUrl);
  const flatModel = await flattenForTryOn(modelUrl);

  try {
    const output = await runModel('cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985', {
      human_img: flatModel,
      garm_img: flatGarment,
      category,
      garment_des: `${category} garment, professional fashion photography`,
      is_checked: true,
      is_checked_crop: false,
      denoise_steps: 30,
      seed: -1,
    });
    return await extractOutputUrl(output);
  } catch (idmErr) {
    // Fallback: use Kontext Pro instruction-based approach
    console.warn('[ghost-mannequin] IDM-VTON failed, falling back to Kontext:', idmErr instanceof Error ? idmErr.message : idmErr);
    const output = await runModel('black-forest-labs/flux-kontext-pro', {
      input_image: flatModel,
      prompt: `Dress this person in the ${category} garment. Make it look like they are wearing a ${category} clothing item. ` +
        'Keep the same person, face, pose, and background. Professional e-commerce catalog photography, SFW.',
    });
    return await extractOutputUrl(output);
  }
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

  return await extractOutputUrl(output);
}

/**
 * Remove the person from an on-model photo and leave the garment floating with
 * 3D hollow-mannequin / ghost effect. For lingerie categories (bra, panty,
 * shapewear, bodysuit, swimwear) uses SeedDream edit on fal.ai — the only
 * provider that does not trip content filters on intimate apparel. Otherwise
 * tries Flux Kontext Pro first. Falls back down the cascade on failure.
 *
 * Prompts are COLOR-AGNOSTIC — they reference only the garment type, so the
 * result keeps whatever color/pattern/fabric the source had.
 */
export async function modelToGhost(
  imageUrl: string,
  garmentType?: string,
  backImageUrl?: string,
): Promise<{ url: string; provider: string }> {
  const normalizedType = (garmentType ?? '').toLowerCase();
  const isLingerie = LINGERIE_TYPES.has(normalizedType);
  const noun = GARMENT_NOUN[normalizedType] ?? 'garment';
  const hasBack = !!backImageUrl;

  // Prompt emphasizes: remove person entirely, keep product exactly, hollow 3D
  // effect. Color intentionally unspecified so any colorway survives.
  const ghostPrompt =
    (hasBack
      ? `You are given TWO reference photos of the SAME ${noun}: the first is the FRONT ` +
        `view, the second is the BACK view. Use BOTH to reconstruct the garment accurately. `
      : '') +
    `Isolate only the ${noun} and remove the person completely. ` +
    `The ${noun} should float on a pure white background with a 3D invisible-mannequin ` +
    `hollow-man effect — visible natural garment shape and interior fabric where the ` +
    `body was, as if worn by an invisible person. ` +
    (hasBack
      ? `Reproduce the back details (racerback straps, back mesh panels, band) correctly ` +
        `from the BACK reference — do NOT erase or flatten the back. `
      : '') +
    `Preserve the exact same color, pattern, texture, fabric, and construction details ` +
    `of the ${noun}. Do not change the color. ` +
    // Anti-hallucination GENÉRICO (no hardcodear el tipo de cierre — debe servir para
    // CUALQUIER producto: ganchos, zipper, botones, sin cierre). La fuente de verdad es
    // la FOTO de referencia, no una descripción fija. SeedDream tiende a inventar cierres.
    `CRITICAL: preserve the EXACT closure shown in the reference photo, whatever it is — ` +
    `a column of hook-and-eye clasps, a zipper, buttons, or none. Do NOT change, add, ` +
    `remove or invent any closure: if the reference shows hook-and-eye clasps keep them as ` +
    `hook-and-eye; if it shows a zipper keep the zipper. Reproduce the closure, straps, ` +
    `mesh panels, seams and cup shape one-to-one with the reference — no invented center ` +
    `lines or details. Match the original stitching and construction exactly. ` +
    `Professional e-commerce product photography, studio lighting, sharp focus.`;

  // --- Primary provider for lingerie: SeedDream edit on fal.ai (no filter)
  if (isLingerie) {
    try {
      const httpUrl = await ensureFalAccessibleUrl(imageUrl);
      // Pasar AMBAS fotos (frente + espalda) como referencia para que SeedDream
      // reconstruya bien la espalda y no la borre/invente.
      const imageUrls = [httpUrl];
      if (backImageUrl) {
        try {
          imageUrls.push(await ensureFalAccessibleUrl(backImageUrl));
        } catch (e) {
          console.warn('[ghost] no se pudo preparar la foto de espalda:', e instanceof Error ? e.message : e);
        }
      }
      const falResult = await runFal('fal-ai/bytedance/seedream/v4/edit', {
        prompt: ghostPrompt,
        image_urls: imageUrls,
        image_size: 'square_hd',
        num_images: 1,
        enable_safety_checker: false,
      });
      const url = falResult?.images?.[0]?.url;
      if (url) return { url, provider: 'seedream-edit' };
    } catch (seedErr) {
      console.warn(
        '[ghost-mannequin] SeedDream edit failed, falling back to Kontext:',
        seedErr instanceof Error ? seedErr.message : seedErr,
      );
    }
  }

  // --- Fallback: Flux Kontext Pro (works for non-intimate apparel)
  try {
    const output = await runModel('black-forest-labs/flux-kontext-pro', {
      input_image: imageUrl,
      prompt: ghostPrompt,
      aspect_ratio: '1:1',
    });
    const url = await extractOutputUrl(output);
    return { url, provider: 'flux-kontext-pro' };
  } catch (kontextErr) {
    // Last-resort for lingerie when both failed: retry SeedDream once more
    // without any fancy pre-prompt. This sometimes slips through when the
    // first attempt was flagged for an unrelated reason.
    if (isLingerie) {
      const httpUrl = await ensureFalAccessibleUrl(imageUrl);
      const falResult = await runFal('fal-ai/bytedance/seedream/v4/edit', {
        prompt: `Show only the ${noun} from the photo on a plain white background, ` +
          `hollow 3D product shape, no person, same color as original. ` +
          `Reproduce the exact closure and seams — do NOT add a zipper, hooks, or any ` +
          `seam that is not in the original; keep the cups exactly as shown.`,
        image_urls: [httpUrl],
        image_size: 'square_hd',
        num_images: 1,
        enable_safety_checker: false,
      });
      const url = falResult?.images?.[0]?.url;
      if (url) return { url, provider: 'seedream-edit-retry' };
    }
    throw new Error(
      `No se pudo quitar la modelo. (${kontextErr instanceof Error ? kontextErr.message : String(kontextErr)})`,
    );
  }
}
