// =============================================================================
// Virtual Try-On API Route - UniStudio
// POST: Accepts JSON { modelImage, garmentImage, category, garmentType?, provider? }
// Routes to IDM-VTON, Kolors, or auto-selects the best provider.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl, ensureHttpUrl } from '@/lib/api/replicate';
import { runFashn, pollFashn } from '@/lib/api/fashn';
import { saveJob } from '@/lib/db/persist';
import { proxyReplicateUrl } from '@/lib/utils/image';
import { toIdmVtonCategory, toFashnCategory } from '@/lib/utils/tryon-categories';

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
  garmentDescription?: string,
): Promise<{ url: string; provider: string }> {
  const isIntimate = garmentType ? IDM_VTON_PREFERRED_TYPES.has(garmentType) : false;

  // For intimate/lingerie garments, always use IDM-VTON (best for delicate garments)
  if (isIntimate) {
    const url = await tryOnIdmVton(modelImage, garmentImage, category, garmentDescription);
    return { url, provider: 'idm-vton' };
  }

  // Prefer FASHN when API key is configured (highest quality for non-intimate)
  if (process.env.FASHN_API_KEY) {
    try {
      const url = await tryOnFashn(modelImage, garmentImage, category);
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
    } = body as {
      modelImage: string;
      garmentImage: string;
      category: string;
      garmentType?: string;
      garmentDescription?: string;
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
      const result = await smartTryOn(httpModelImage, httpGarmentImage, category, garmentType, garmentDescription);
      resultUrl = result.url;
      usedProvider = result.provider;
    } else {
      usedProvider = provider;
      switch (provider) {
        case 'idm-vton':
          resultUrl = await tryOnIdmVton(httpModelImage, httpGarmentImage, category, garmentDescription);
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
