// =============================================================================
// Background Removal API Route - UniStudio
// POST: Accepts JSON { imageUrl, provider, options? }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import {
  removeBgReplicate,
  removeBgWithoutBg,
} from '@/lib/processing/bg-remove';
import { isWithoutBgHealthy } from '@/lib/api/withoutbg';
import {
  runModel,
  extractOutputUrl,
  ensureHttpUrl,
} from '@/lib/api/replicate';
import { saveJob } from '@/lib/db/persist';
import { withApiErrorHandler, requireFields } from '@/lib/api/route-helpers';
import { proxyReplicateUrl, replicateHeaders } from '@/lib/utils/image';

const PROVIDER_COSTS: Record<string, number> = {
  replicate: 0.01,
  browser: 0,
  withoutbg: 0,
};

// Cost of the garment isolation path (grounded_sam + local compositing)
const ISOLATE_COST = 0.01;

/**
 * Map our internal garmentType values to the exact text prompt that
 * grounded_sam (Grounding DINO under the hood) responds to best.
 */
function garmentTypeToPrompt(garmentType: string | null): string {
  switch (garmentType) {
    case 'bra':
    case 'lingerie':
    case 'bodysuit':
      return 'bra,bralette,lingerie top';
    case 'panty':
      return 'panty,underwear bottom';
    case 'set':
      return 'lingerie set,bra,panty';
    case 'swimwear':
      return 'swimsuit,bikini';
    case 'shapewear':
      return 'shapewear,bodysuit';
    default:
      return 'garment,clothing';
  }
}

/**
 * Isolate a garment from a photo that may contain a model/person.
 *
 * Why not Kontext Pro or rembg?
 *   - Flux Kontext Pro (Replicate) rejects lingerie with error E005 — content
 *     moderation cannot be disabled.
 *   - Standard rembg keeps the PERSON as the foreground and removes the
 *     background, so the model's body stays in the output and only the scene
 *     disappears. We want the exact opposite.
 *
 * What we do instead:
 *   1. schananas/grounded_sam — Grounding DINO finds the garment by text
 *      prompt ("bra", "panty", etc.), SAM returns a pixel-perfect mask.
 *   2. Sharp applies that mask to the original image via dest-in compositing,
 *      producing a transparent PNG with ONLY the garment pixels visible.
 * No content-moderated endpoints involved. Cost ~$0.01 per run.
 */
async function isolateGarment(
  imageUrl: string,
  garmentType: string | null,
): Promise<string> {
  // Load the image as a buffer so we can both ship it to the segmentation
  // model (needs an HTTP URL) and keep the pixel data locally for masking.
  let inputBuffer: Buffer;
  if (imageUrl.startsWith('data:')) {
    const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('Invalid data URI');
    inputBuffer = Buffer.from(m[2], 'base64');
  } else {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`fetch input ${res.status}`);
    inputBuffer = Buffer.from(await res.arrayBuffer());
  }

  // Normalize the input: rotate via EXIF, cap at 1600px, re-encode as PNG so
  // the mask aligns pixel-for-pixel with what we send to the model.
  const prepared = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const meta = await sharp(prepared).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error('Could not read image dimensions');

  const maskPrompt = garmentTypeToPrompt(garmentType);
  console.log(`[bg-remove:isolate] running grounded_sam prompt="${maskPrompt}" size=${width}x${height}`);

  // Upload the prepared PNG so Replicate can fetch it by URL
  const preparedDataUrl = `data:image/png;base64,${prepared.toString('base64')}`;
  const httpInput = await ensureHttpUrl(preparedDataUrl);

  // schananas/grounded_sam returns [annotated, neg_annotated, mask, inverted_mask].
  // Index 2 is the clean B/W mask (white = garment, black = everything else).
  const output = await runModel(
    'schananas/grounded_sam:ee871c19efb1941f55f66a3d7d960428c8a5afcb77449547fe8e5a3ab9ebc21c',
    {
      image: httpInput,
      mask_prompt: maskPrompt,
      negative_mask_prompt: 'skin,body,face,hair,arm,shoulder,neck,torso,background',
      adjustment_factor: 0,
    },
  );

  // Output can be an iterator, array, or list of urls — handle all shapes.
  const outArr: string[] = Array.isArray(output)
    ? output.map((o) => (typeof o === 'string' ? o : (o?.url?.() ?? o?.href ?? ''))).filter(Boolean)
    : [await extractOutputUrl(output)];
  if (outArr.length < 3) {
    throw new Error(`grounded_sam returned unexpected output (${outArr.length} items)`);
  }
  const maskUrl = outArr[2];
  console.log(`[bg-remove:isolate] mask url=${maskUrl.slice(0, 80)}`);

  // Download the mask
  const maskResp = await fetch(maskUrl, { headers: replicateHeaders(maskUrl) });
  if (!maskResp.ok) throw new Error(`mask download ${maskResp.status}`);
  const maskBuffer = Buffer.from(await maskResp.arrayBuffer());

  // The mask comes back at the model's processing resolution — resize it to
  // match our prepared image before compositing.
  const resizedMask = await sharp(maskBuffer)
    .resize(width, height, { fit: 'fill' })
    .grayscale()
    .toColorspace('b-w')
    .png()
    .toBuffer();

  // Compose: prepared RGB + mask as alpha → PNG with only the garment visible.
  const isolated = await sharp(prepared)
    .ensureAlpha()
    .joinChannel(await sharp(resizedMask).raw().toBuffer(), {
      raw: { width, height, channels: 1 },
    })
    .png()
    .toBuffer();

  // Return as data URL — Kolors etc. will re-upload it to fal storage as HTTP.
  const dataUrl = `data:image/png;base64,${isolated.toString('base64')}`;
  console.log(`[bg-remove:isolate] done (${(isolated.length / 1024).toFixed(0)} KB)`);
  return dataUrl;
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
      provider: 'grounded-sam-isolate',
      inputParams: { imageUrl, removeSubject: true, garmentType },
      outputUrl: resultUrl,
      cost: ISOLATE_COST,
    });
    return NextResponse.json({
      success: true,
      data: { url: proxyReplicateUrl(resultUrl), provider: 'grounded-sam-isolate' },
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
