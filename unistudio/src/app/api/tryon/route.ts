// =============================================================================
// Virtual Try-On API Route - UniStudio
// POST: Accepts JSON { modelImage, garmentImage, category, garmentType?, provider? }
// Routes to IDM-VTON, Kolors, or auto-selects the best provider.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl, ensureHttpUrl } from '@/lib/api/replicate';
import { runFashn, pollFashn } from '@/lib/api/fashn';
import { runFal, ensureFalAccessibleUrl } from '@/lib/api/fal';
import {
  createUwearClothingItem,
  createUwearGeneration,
  pollUwearGeneration,
  UWEAR_MODEL_SLUGS,
} from '@/lib/api/uwear';
import { saveJob } from '@/lib/db/persist';
import { proxyReplicateUrl } from '@/lib/utils/image';
import { toIdmVtonCategory, toFashnCategory } from '@/lib/utils/tryon-categories';
import { flattenToWhite } from '@/lib/processing/image-prep';

// Cost estimates in dollars
const PROVIDER_COSTS: Record<string, number> = {
  'idm-vton': 0.02,
  fashn: 0.05,
  kolors: 0.02,
  seedream: 0.03,
  leffa: 0.04,
  uwear: 0.2,
};

// Human-readable noun per garment type — used in the SeedDream edit prompt so
// the model knows what it is replacing. Color is intentionally NOT here: prompts
// must stay color-agnostic (products come in any colorway).
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
  tops: 'top',
  bottoms: 'bottom garment',
  'one-pieces': 'one-piece garment',
  dresses: 'dress',
};

// Garment types that should prefer IDM-VTON (better for delicate/revealing garments)
const IDM_VTON_PREFERRED_TYPES = new Set([
  'lingerie',
  'swimwear',
  'underwear',
  'bikini',
  'bodysuit',
  'intimate',
]);

// ---------------------------------------------------------------------------
// Provider-specific try-on functions
// ---------------------------------------------------------------------------

async function tryOnIdmVton(
  modelImage: string,
  garmentImage: string,
  category: string,
  garmentDescription?: string,
): Promise<string> {
  const garmentDes = garmentDescription || `${category} garment`;
  const output = await runModel(
    'cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985',
    {
      human_img: modelImage,
      garm_img: garmentImage,
      garment_des: garmentDes,
      category: toIdmVtonCategory(category),
      is_checked: true,
      is_checked_crop: false,
      denoise_steps: 30,
      seed: -1,
    },
  );
  return await extractOutputUrl(output);
}

async function tryOnFashn(
  modelImage: string,
  garmentImage: string,
  category: string,
  mode?: 'performance' | 'balanced' | 'quality',
): Promise<string> {
  const id = await runFashn({
    model_image: modelImage,
    garment_image: garmentImage,
    category: toFashnCategory(category),
    mode,
  });
  const result = await pollFashn(id);
  if (result.output && result.output.length > 0) return result.output[0];
  throw new Error('FASHN prediction completed but returned no output');
}

async function tryOnKolors(
  modelImage: string,
  garmentImage: string,
): Promise<string> {
  // Pre-flatten the garment image to a white-background JPEG. Kolors
  // hallucinates a generic mint tank-top when it receives a transparent PNG —
  // the flat JPEG anchors it to the actual garment shape & color. Gated
  // behind LINGERIE_FLATTEN so it can be disabled if it ever causes regression.
  const flattenEnabled = process.env.LINGERIE_FLATTEN !== '0';
  let prepGarment = garmentImage;
  if (flattenEnabled) {
    try {
      prepGarment = await flattenToWhite(garmentImage);
    } catch (err) {
      console.warn('[tryon:kolors] flattenToWhite failed, using original garment URL:', err);
    }
  }

  // Log diagnóstico: capturar URLs antes y después de ensureFalAccessibleUrl.
  // Mantener hasta que confirmemos que no hay más 422 image_load_error en producción.
  console.log('[tryon:kolors] input URLs', {
    modelImage: modelImage.slice(0, 120),
    garmentImage: garmentImage.slice(0, 120),
    modelIsData: modelImage.startsWith('data:'),
    garmentIsData: garmentImage.startsWith('data:'),
    flattened: prepGarment !== garmentImage,
  });
  const humanImageUrl = await ensureFalAccessibleUrl(modelImage);
  const garmentImageUrl = await ensureFalAccessibleUrl(prepGarment);
  console.log('[tryon:kolors] resolved fal URLs', {
    human_image_url: humanImageUrl.slice(0, 120),
    garment_image_url: garmentImageUrl.slice(0, 120),
  });
  try {
    const result = await runFal('fal-ai/kling/v1-5/kolors-virtual-try-on', {
      human_image_url: humanImageUrl,
      garment_image_url: garmentImageUrl,
    });
    return result.image.url;
  } catch (err) {
    console.error('[tryon:kolors] runFal failed', {
      human_image_url: humanImageUrl,
      garment_image_url: garmentImageUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Virtual try-on using Leffa on fal.ai — `fal-ai/leffa/virtual-tryon`.
 *
 * Leffa (CVPR 2025) learns flow fields in attention to preserve fine garment
 * texture/detail. Unlike SeedDream (a generative editor that re-draws and tends
 * to "normalize" an atypical product into a category prior), Leffa is a true
 * try-on: it WARPS the actual garment pixels onto the person, so it doesn't
 * reinvent the product. Trained on standard apparel (upper/lower/dresses), so a
 * bra maps to garment_type "upper_body" — results on lingerie are hit-or-miss
 * but it's a genuinely different approach to test against SeedDream.
 *
 * Uses the existing FAL_KEY (no new account). No content-filter flag exposed.
 *
 * @param modelImage   - URL of the person/model image.
 * @param garmentImage - URL of the isolated garment image.
 * @param category     - tops | bottoms | dresses | one-pieces (mapped to Leffa).
 * @returns URL of the try-on result image.
 */
async function tryOnLeffa(
  modelImage: string,
  garmentImage: string,
  category: string,
): Promise<string> {
  // Flatten the (often transparent) isolated garment to a white-bg JPEG. Like
  // Kolors, a true VTON model anchors better to a solid garment image than to a
  // transparent PNG. Gated behind LINGERIE_FLATTEN to match Kolors behaviour.
  let prepGarment = garmentImage;
  if (process.env.LINGERIE_FLATTEN !== '0') {
    try {
      prepGarment = await flattenToWhite(garmentImage);
    } catch (err) {
      console.warn('[tryon:leffa] flattenToWhite failed, using original garment URL:', err);
    }
  }

  // Leffa garment_type: upper_body | lower_body | dresses. Bras/tops → upper_body.
  const garmentType =
    category === 'bottoms'
      ? 'lower_body'
      : category === 'one-pieces' || category === 'dresses'
        ? 'dresses'
        : 'upper_body';

  const humanImageUrl = await ensureFalAccessibleUrl(modelImage);
  const garmentImageUrl = await ensureFalAccessibleUrl(prepGarment);

  const result = await runFal('fal-ai/leffa/virtual-tryon', {
    human_image_url: humanImageUrl,
    garment_image_url: garmentImageUrl,
    garment_type: garmentType,
  });

  // fal try-on models vary in output shape — handle both { images:[{url}] } and { image:{url} }.
  const url = result?.images?.[0]?.url ?? result?.image?.url;
  if (!url) throw new Error('Leffa try-on completed but returned no image');
  return url;
}

/**
 * Virtual try-on using Uwear.ai — a dedicated fashion-photography platform.
 *
 * Unlike the fal/Replicate models, Uwear GENERATES its own model (virtual model
 * by default) wearing a "clothing item" we register from the garment image. It
 * explicitly supports lingerie/intimates (no content block like FASHN) via
 * SeedDream 4.5 (default, `seedream-v4-5`) and Qwen Intimate (`qwen-rapid-aio-v23`,
 * needs a verified workspace). Model slug is overridable via UWEAR_MODEL_SLUG.
 *
 * NOTE: Uwear ignores the AI `modelImage` — it casts its own model. For
 * multi-view consistency you would create a Uwear avatar and reuse avatar_id;
 * this first integration uses a virtual model per call. Best fidelity comes from
 * feeding the ORIGINAL product photo as the garment (Uwear does its own bg
 * removal + AI-vision description). Requires UWEAR_API_KEY.
 *
 * @param garmentImage        - URL of the garment (front) image to register.
 * @param category            - tops | bottoms | dresses | one-pieces.
 * @param garmentType         - specific type, used for the prompt noun.
 * @param garmentDescription  - real construction (closure/cups/straps) to anchor fidelity.
 * @returns URL of the generated try-on image.
 */
async function tryOnUwear(
  garmentImage: string,
  category: string,
  garmentType?: string,
  garmentDescription?: string,
  scenePrompt?: string,
  garmentBackUrl?: string,
): Promise<string> {
  const modelSlug = process.env.UWEAR_MODEL_SLUG?.trim() || UWEAR_MODEL_SLUGS.seedream;
  const isQwen = modelSlug.startsWith('qwen');
  const noun = GARMENT_NOUN[(garmentType ?? '').toLowerCase()] ?? 'garment';

  // Register the garment as a Uwear clothing item. The garment image must be an
  // http URL Uwear can fetch (ensured by the route before calling).
  // We intentionally do NOT pass our own description: with remove_background,
  // Uwear runs its OWN AI vision on the real photo (which clearly shows the
  // hook-and-eye closure). Sending a Claude-Vision description risked biasing it
  // (e.g. mislabeling the closure as a zipper) and damaging fidelity.
  const clothingItemId = await createUwearClothingItem({
    name: `${noun} ${Date.now()}`,
    frontUrl: garmentImage,
    // Real back photo of the same REF (if the user tagged one) → Uwear nails the
    // closure, band and racerback from the actual product, not a guess.
    backUrl: garmentBackUrl,
    processingMode: 'remove_background',
  });

  // Prompt describes the MODEL/scene, NOT the garment anatomy (Uwear captures
  // that from the clothing item). Color-agnostic per project rule. We still add
  // a fidelity reminder so it keeps the exact closure/straps.
  const prompt =
    `Photorealistic e-commerce catalog photo of a female model wearing the ${noun}, ` +
    `standing front view, clean white studio background, soft even studio lighting, sharp focus. ` +
    `Keep the ${noun} exactly as provided — same closure, straps, band, cups and construction; do not redesign it.` +
    // Art direction (look del shoot) inyectado desde el pipeline.
    (scenePrompt?.trim() ? ` Art direction: ${scenePrompt.trim()}` : '');

  // Qwen Intimate only supports 768X1024 / 1024X1280 and 1 ref; SeedDream supports 2K + aspect ratios.
  const generationId = await createUwearGeneration({
    clothingItemId,
    modelSlug,
    prompt,
    numImages: 1,
    camera: 'auto',
    aspectRatio: isQwen ? undefined : '3:4',
    resolution: isQwen ? '1024X1280' : '2K',
    avatarId: null,
  });

  return await pollUwearGeneration(generationId);
}

/**
 * Virtual try-on using SeedDream v4 edit on fal.ai.
 *
 * This is NOT a try-on model — it is an instruction-driven multi-image EDITOR.
 * We feed it BOTH the model photo and the isolated garment as references and
 * instruct it to dress the person in that exact garment. Because it edits the
 * existing person instead of synthesizing a garment from a category prior, it
 * preserves the real product (lace, mesh, straps, trim, seams, cut) far better
 * than Kolors/FASHN, which "repaint" a generic look-alike.
 *
 * SeedDream has NO content filter (enable_safety_checker:false), so unlike FASHN
 * (blocks lingerie) and Flux Kontext (E005), it actually runs on bras/panties.
 * Same model already proven in the ghost-mannequin step.
 *
 * @param modelImage   - URL of the person/model image (first reference).
 * @param garmentImage - URL of the isolated garment image (second reference).
 * @param garmentType  - Specific garment type, used to pick the prompt noun.
 * @returns URL of the try-on result image.
 */
async function tryOnSeedDream(
  modelImage: string,
  garmentImage: string,
  garmentType?: string,
  garmentDescription?: string,
  scenePrompt?: string,
): Promise<string> {
  const noun = GARMENT_NOUN[(garmentType ?? '').toLowerCase()] ?? 'garment';

  // Construcción real leída por Claude Vision (cierre, copas, tirantes, etc).
  // Anclar el modelo a ESTO es lo que evita que invente un zipper o costuras.
  const spec = garmentDescription?.trim()
    ? `The real construction of this ${noun} (preserve EXACTLY, do not contradict): ${garmentDescription.trim()}. `
    : '';

  // Order matters: image_urls[0] = person to edit, image_urls[1] = product ref.
  // Prompt stays color-agnostic per project rule — never hardcode a color.
  const prompt =
    `Dress the person in the first image with the exact ${noun} shown in the second image. ` +
    `Keep the person's face, hair, body, skin tone, pose and the background completely unchanged. ` +
    `Replace only their ${noun} with the ${noun} from the second image, matching its exact ` +
    `color, pattern, lace, mesh, straps, trim, seams, cut and construction details precisely. ` +
    `Do not redesign, simplify, or recolor the garment. Keep it identical to the reference. ` +
    spec +
    // Anti-hallucination: el modelo inventa un zipper central y costuras de copa
    // que no existen. Prohibirlo explícitamente y anclar al cierre real.
    `CRITICAL: do NOT add a zipper, hooks, clasps, buttons, panels, or any seam that is ` +
    `not present in the reference ${noun}. Keep the exact closure type shown in the ` +
    `reference (if it has hook-and-eye clasps, keep hook-and-eye — never a zipper) and ` +
    `keep the cups exactly as in the reference with no invented center seam or line. ` +
    `Photorealistic fashion e-commerce photography, studio lighting, sharp focus.` +
    // Art direction (look del shoot) inyectado desde el pipeline. Describe escena/luz,
    // NO la prenda — la prenda ya está anclada arriba al producto real.
    (scenePrompt?.trim() ? ` Art direction: ${scenePrompt.trim()}` : '');

  const humanImageUrl = await ensureFalAccessibleUrl(modelImage);
  const garmentImageUrl = await ensureFalAccessibleUrl(garmentImage);

  const result = await runFal('fal-ai/bytedance/seedream/v4/edit', {
    prompt,
    image_urls: [humanImageUrl, garmentImageUrl],
    image_size: 'portrait_16_9',
    num_images: 1,
    enable_safety_checker: false,
  });

  const url = result?.images?.[0]?.url;
  if (!url) throw new Error('SeedDream edit completed but returned no image');
  return url;
}

// Smart routing: picks the best provider based on garment type
async function smartTryOn(
  modelImage: string,
  garmentImage: string,
  category: string,
  garmentType?: string,
  garmentDescription?: string,
  fashnMode?: 'performance' | 'balanced' | 'quality',
  scenePrompt?: string,
): Promise<{ url: string; provider: string }> {
  const isIntimate = garmentType ? IDM_VTON_PREFERRED_TYPES.has(garmentType) : false;

  // For intimates: try SeedDream v4 edit FIRST. It is a multi-image instruction
  // editor (person + garment as references) that preserves the real product —
  // lace, mesh, straps, trim, cut — far better than Kolors, which repaints a
  // generic look-alike. SeedDream has no content filter so it actually runs on
  // bras/panties; FASHN blocks lingerie (wasted ~17s before falling back) and
  // Flux Kontext returns E005, so neither is in this path. Fall back to Kolors
  // only when SeedDream fails.
  if (isIntimate) {
    try {
      const url = await tryOnSeedDream(modelImage, garmentImage, garmentType, garmentDescription, scenePrompt);
      return { url, provider: 'seedream' };
    } catch (err) {
      console.warn(
        '[tryon] SeedDream failed for intimate garment, falling back to Kolors:',
        err instanceof Error ? err.message : err,
      );
    }
    const url = await tryOnKolors(modelImage, garmentImage);
    return { url, provider: 'kolors' };
  }

  // Non-intimates: prefer FASHN when API key is configured (highest quality)
  if (process.env.FASHN_API_KEY) {
    try {
      const url = await tryOnFashn(modelImage, garmentImage, category, fashnMode);
      return { url, provider: 'fashn' };
    } catch (err) {
      console.warn('[tryon] FASHN failed, falling back to IDM-VTON:', err instanceof Error ? err.message : err);
    }
  }

  // Default to IDM-VTON (also fallback if FASHN fails)
  const url = await tryOnIdmVton(modelImage, garmentImage, category, garmentDescription);
  return { url, provider: 'idm-vton' };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      modelImage,
      garmentImage,
      category,
      garmentType,
      garmentDescription,
      provider = 'auto',
      forceProvider = false,
      fashnMode,
      scenePrompt,
      garmentBackUrl,
    } = body as {
      modelImage: string;
      garmentImage: string;
      category: string;
      garmentType?: string;
      garmentDescription?: string;
      provider?: 'idm-vton' | 'fashn' | 'kolors' | 'seedream' | 'leffa' | 'uwear' | 'auto';
      // Cuando true, la usuaria eligió el proveedor a mano (para testear) y la
      // ruta lo respeta tal cual — NO aplica el override automático kolors→auto.
      forceProvider?: boolean;
      // P1-3: FASHN v1.6 mode (performance/balanced/quality). Solo aplica a
      // FASHN; Kolors e IDM-VTON lo ignoran silenciosamente.
      fashnMode?: 'performance' | 'balanced' | 'quality';
      // Art direction (look del shoot) inyectado al prompt de SeedDream/Uwear.
      // Otros proveedores (warp-based) lo ignoran.
      scenePrompt?: string;
      // Foto real de espalda del producto. Solo la usa Uwear (clothing_item_back_url).
      garmentBackUrl?: string;
    };

    if (!modelImage) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "modelImage".' },
        { status: 400 },
      );
    }

    if (!garmentImage) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "garmentImage".' },
        { status: 400 },
      );
    }

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field "category" (e.g. "tops", "bottoms", "dresses", "one-pieces").',
        },
        { status: 400 },
      );
    }

    // Ensure both images are HTTP URLs (IDM-VTON/Kolors can't process data URIs)
    const httpModelImage = await ensureHttpUrl(modelImage);
    const httpGarmentImage = await ensureHttpUrl(garmentImage);

    // For intimates with provider="auto", smartTryOn handles FASHN-first +
    // Kolors fallback. Only force Kolors if the user explicitly picked it OR
    // FASHN_API_KEY is missing. This unblocks the "bra changes shape" bug —
    // Kolors alone hallucinates generic tank-tops; FASHN preserves the
    // product silhouette much better.
    const isIntimateRequest =
      garmentType === 'lingerie' ||
      garmentType === 'swimwear' ||
      garmentType === 'bra' ||
      garmentType === 'panty' ||
      garmentType === 'shapewear' ||
      garmentType === 'underwear' ||
      garmentType === 'intimate' ||
      garmentType === 'bikini' ||
      garmentType === 'bodysuit';

    let effectiveProvider: 'idm-vton' | 'fashn' | 'kolors' | 'seedream' | 'leffa' | 'uwear' | 'auto' = provider;
    if (forceProvider && provider !== 'auto') {
      // La usuaria forzó este proveedor a mano (testing) → respetarlo tal cual,
      // sin el override automático de abajo. Así puede comparar SeedDream vs
      // Kolors vs FASHN y leer el badge para saber cuál corrió de verdad.
      effectiveProvider = provider;
    } else if (isIntimateRequest && (provider === 'auto' || provider === 'kolors')) {
      // Lencería sin forzar → siempre a smartTryOn, que prueba SeedDream v4 edit
      // primero (preserva el producto real) y cae a Kolors si falla. La página
      // manda provider="kolors" por default; lo mandamos a "auto" para que
      // SeedDream tenga el primer turno. No depende de FASHN_API_KEY: FASHN
      // bloquea lencería y ya no está en este camino.
      effectiveProvider = 'auto';
    }

    let resultUrl: string;
    let usedProvider: string;

    if (effectiveProvider === 'auto' || !effectiveProvider) {
      const result = await smartTryOn(httpModelImage, httpGarmentImage, category, garmentType, garmentDescription, fashnMode, scenePrompt);
      resultUrl = result.url;
      usedProvider = result.provider;
    } else {
      usedProvider = effectiveProvider;
      switch (effectiveProvider) {
        case 'idm-vton':
          resultUrl = await tryOnIdmVton(httpModelImage, httpGarmentImage, category, garmentDescription);
          break;
        case 'fashn':
          resultUrl = await tryOnFashn(httpModelImage, httpGarmentImage, category, fashnMode);
          break;
        case 'kolors':
          resultUrl = await tryOnKolors(httpModelImage, httpGarmentImage);
          break;
        case 'seedream':
          resultUrl = await tryOnSeedDream(httpModelImage, httpGarmentImage, garmentType, garmentDescription, scenePrompt);
          break;
        case 'leffa':
          resultUrl = await tryOnLeffa(httpModelImage, httpGarmentImage, category);
          break;
        case 'uwear':
          // Uwear casts its own model → it ignores httpModelImage and uses the
          // garment image(s) to register a clothing item, then generates a model.
          // Pass the real front + (optional) back photo for max fidelity.
          resultUrl = await tryOnUwear(httpGarmentImage, category, garmentType, garmentDescription, scenePrompt, garmentBackUrl);
          break;
        default:
          return NextResponse.json(
            {
              success: false,
              error: `Proveedor "${effectiveProvider}" no soportado. Usa "seedream", "leffa", "uwear", "fashn", "idm-vton", "kolors", o "auto".`,
            },
            { status: 400 },
          );
      }
    }

    const cost = PROVIDER_COSTS[usedProvider] ?? 0;

    await saveJob({
      operation: 'tryon',
      provider: usedProvider,
      inputParams: { modelImage, garmentImage, category, garmentType },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: proxyReplicateUrl(resultUrl),
        provider: usedProvider,
        category,
        garmentType: garmentType || null,
        cost,
      },
    });
  } catch (error) {
    console.error('[API /tryon] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during virtual try-on.',
      },
      { status: 500 },
    );
  }
}
