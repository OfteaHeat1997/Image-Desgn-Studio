// =============================================================================
// Virtual Try-On API Route - UniStudio
// POST: Accepts JSON { modelImage, garmentImage, category, garmentType?, provider? }
// Routes to IDM-VTON, Kolors, or auto-selects the best provider.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl, ensureHttpUrl } from '@/lib/api/replicate';
import { runFashn, pollFashn } from '@/lib/api/fashn';
import type { FashnCategory } from '@/lib/api/fashn';
import { saveJob } from '@/lib/db/persist';

// Cost estimates in dollars
const PROVIDER_COSTS: Record<string, number> = {
  'idm-vton': 0.02,
  fashn: 0.05,
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

// Map any category format to IDM-VTON's expected values
function toIdmVtonCategory(cat: string): string {
  const map: Record<string, string> = {
    tops: 'upper_body',
    'upper-body': 'upper_body',
    upper_body: 'upper_body',
    bottoms: 'lower_body',
    'lower-body': 'lower_body',
    lower_body: 'lower_body',
    dresses: 'dresses',
    'one-pieces': 'dresses',
    'full-body': 'dresses',
  };
  return map[cat] ?? 'upper_body';
}

async function tryOnIdmVton(
  modelImage: string,
  garmentImage: string,
  category: string,
): Promise<string> {
  const output = await runModel(
    'cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985',
    {
      human_img: modelImage,
      garm_img: garmentImage,
      category: toIdmVtonCategory(category),
      is_checked: true,
      is_checked_crop: false,
      denoise_steps: 30,
      seed: -1,
    },
  );
  return await extractOutputUrl(output);
}

// Map internal categories to FASHN categories
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
    default:
      return 'auto';
  }
}

async function tryOnFashn(
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
  if (result.output && result.output.length > 0) return result.output[0];
  throw new Error('FASHN prediction completed but returned no output');
}

// Smart routing: picks the best provider based on garment type
async function smartTryOn(
  modelImage: string,
  garmentImage: string,
  category: string,
  garmentType?: string,
): Promise<{ url: string; provider: string }> {
  const isIntimate = garmentType ? IDM_VTON_PREFERRED_TYPES.has(garmentType) : false;

  // For intimate/lingerie garments, always use IDM-VTON (best for delicate garments)
  if (isIntimate) {
    const url = await tryOnIdmVton(modelImage, garmentImage, category);
    return { url, provider: 'idm-vton' };
  }

  // Prefer FASHN when API key is configured (highest quality for non-intimate)
  if (process.env.FASHN_API_KEY) {
    const url = await tryOnFashn(modelImage, garmentImage, category);
    return { url, provider: 'fashn' };
  }

  // Default to IDM-VTON
  const url = await tryOnIdmVton(modelImage, garmentImage, category);
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
      provider = 'auto',
    } = body as {
      modelImage: string;
      garmentImage: string;
      category: string;
      garmentType?: string;
      provider?: 'idm-vton' | 'fashn' | 'auto';
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

    let resultUrl: string;
    let usedProvider: string;

    if (provider === 'auto' || !provider) {
      const result = await smartTryOn(httpModelImage, httpGarmentImage, category, garmentType);
      resultUrl = result.url;
      usedProvider = result.provider;
    } else {
      usedProvider = provider;
      switch (provider) {
        case 'idm-vton':
          resultUrl = await tryOnIdmVton(httpModelImage, httpGarmentImage, category);
          break;
        case 'fashn':
          resultUrl = await tryOnFashn(httpModelImage, httpGarmentImage, category);
          break;
        default:
          return NextResponse.json(
            {
              success: false,
              error: `Proveedor "${provider}" no soportado. Usa "fashn", "idm-vton", o "auto".`,
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
        url: resultUrl,
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
