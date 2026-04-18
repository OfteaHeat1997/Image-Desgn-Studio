// =============================================================================
// Background Removal API Route - UniStudio
// POST: Accepts JSON { imageUrl, provider, options? }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  removeBgReplicate,
  removeBgWithoutBg,
} from '@/lib/processing/bg-remove';
import { isWithoutBgHealthy } from '@/lib/api/withoutbg';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { saveJob } from '@/lib/db/persist';
import { withApiErrorHandler, requireFields } from '@/lib/api/route-helpers';
import { proxyReplicateUrl } from '@/lib/utils/image';

const PROVIDER_COSTS: Record<string, number> = {
  replicate: 0.01,
  browser: 0,
  withoutbg: 0,
};

// Cost of the Kontext-based subject removal (garment isolation) path
const ISOLATE_COST = 0.055;

/**
 * Isolate a garment from a photo that may contain a model/person.
 * Uses Flux Kontext Pro to surgically remove the person and keep only the
 * garment on a clean white background. Then runs standard bg-remove so the
 * downstream try-on has a clean cutout with transparency.
 */
async function isolateGarment(
  imageUrl: string,
  garmentType: string | null,
): Promise<string> {
  const garmentWord = garmentType && garmentType !== 'other' ? garmentType : 'garment';
  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    prompt:
      `Isolate only the ${garmentWord} in this photo. Remove the person completely — no body, no skin, no hair, no face. Keep ONLY the ${garmentWord} itself, centered, on a pure clean white background. Professional product catalog photo, flat-lay style, preserve the exact shape, color, fabric, lace detail, and texture of the ${garmentWord}.`,
    input_image: imageUrl,
    aspect_ratio: '3:4',
  });
  const kontextUrl = await extractOutputUrl(output);
  // Post-process: remove the white background so we end up with a PNG cutout
  try {
    return await removeBgReplicate(kontextUrl);
  } catch {
    // If the second pass fails (rare), return the Kontext result as-is —
    // Kolors can still accept an HTTP URL with a white background.
    return kontextUrl;
  }
}

export const POST = withApiErrorHandler('bg-remove', async (request: NextRequest) => {
  const body = await request.json();
  const { imageUrl, provider, removeSubject, garmentType, options } = body as {
    imageUrl: string;
    provider: 'browser' | 'replicate' | 'withoutbg';
    removeSubject?: boolean;
    garmentType?: string | null;
    options?: Record<string, unknown>;
  };

  console.log(
    `[API /bg-remove] Provider: "${provider}", removeSubject: ${!!removeSubject}, ` +
    `imageUrl length: ${imageUrl?.length ?? 0}`,
  );

  const validationError = requireFields(body, ['imageUrl', 'provider']);
  if (validationError) return validationError;

  // Subject removal path: isolate ONLY the garment, drop the model entirely.
  // Used by the lingerie pipeline when the input photo contains a person wearing
  // the garment — so the subsequent try-on receives just the prenda.
  if (removeSubject) {
    const resultUrl = await isolateGarment(imageUrl, garmentType ?? null);
    await saveJob({
      operation: 'bg-remove',
      provider: 'kontext-isolate',
      inputParams: { imageUrl, removeSubject: true, garmentType },
      outputUrl: resultUrl,
      cost: ISOLATE_COST,
    });
    return NextResponse.json({
      success: true,
      data: { url: proxyReplicateUrl(resultUrl), provider: 'kontext-isolate' },
      cost: ISOLATE_COST,
    });
  }

  // Browser-based processing cannot run on the server
  if (provider === 'browser') {
    return NextResponse.json(
      {
        success: false,
        error:
          'Browser-based background removal runs client-side only. Use @imgly/background-removal directly in the browser.',
      },
      { status: 400 },
    );
  }

  let resultUrl: string;
  const cost = PROVIDER_COSTS[provider] ?? 0;

  switch (provider) {
    case 'replicate': {
      resultUrl = await removeBgReplicate(imageUrl);
      break;
    }

    case 'withoutbg': {
      const healthy = await isWithoutBgHealthy();
      if (!healthy) {
        // Auto-fallback to Replicate when Docker is not available
        console.log('[API /bg-remove] withoutBG not available, falling back to Replicate');
        resultUrl = await removeBgReplicate(imageUrl);
        break;
      }
      resultUrl = await removeBgWithoutBg(imageUrl);
      break;
    }

    default:
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported provider "${provider}". Use "replicate", "withoutbg", or "browser".`,
        },
        { status: 400 },
      );
  }

  await saveJob({
    operation: 'bg-remove',
    provider,
    inputParams: { imageUrl },
    outputUrl: resultUrl,
    cost,
  });

  return NextResponse.json({
    success: true,
    data: { url: proxyReplicateUrl(resultUrl), provider },
    cost,
  });
});
