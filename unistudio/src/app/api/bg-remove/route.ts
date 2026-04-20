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

  // schananas/grounded_sam returns four images. Different runs can return
  // them in different container shapes (array, AsyncIterable, object with
  // urls keyed by name). We fetch each candidate, check which one is
  // actually a B/W mask with enough white pixels (the garment area), and
  // fall back to plain rembg if nothing qualifies.
  const rawOutput = await runModel(
    'schananas/grounded_sam:ee871c19efb1941f55f66a3d7d960428c8a5afcb77449547fe8e5a3ab9ebc21c',
    {
      image: httpInput,
      mask_prompt: maskPrompt,
      negative_mask_prompt: 'skin,body,face,hair,arm,shoulder,neck,torso,waist,background',
      adjustment_factor: 0,
    },
  );

  // Normalize the output shape into a flat array of URL strings
  async function toUrlArray(out: unknown): Promise<string[]> {
    if (!out) return [];
    if (typeof out === 'string') return [out];
    if (Array.isArray(out)) {
      const urls: string[] = [];
      for (const item of out) {
        if (typeof item === 'string') urls.push(item);
        else if (item && typeof item === 'object') {
          const maybeUrl = (item as { url?: unknown }).url;
          if (typeof maybeUrl === 'function') urls.push(String((maybeUrl as () => unknown)()));
          else if (typeof maybeUrl === 'string') urls.push(maybeUrl);
          else {
            const href = (item as { href?: string }).href;
            if (typeof href === 'string') urls.push(href);
          }
        }
      }
      return urls;
    }
    if (typeof out === 'object') {
      const asObj = out as Record<string, unknown>;
      const preferred = ['mask', 'inverted_mask', 'annotated_picture_mask', 'neg_annotated_picture_mask'];
      const urls: string[] = [];
      for (const key of preferred) {
        const v = asObj[key];
        if (typeof v === 'string') urls.push(v);
      }
      if (urls.length) return urls;
    }
    try {
      const single = await extractOutputUrl(out);
      if (single) return [single];
    } catch {
      /* ignore */
    }
    return [];
  }

  const urls = await toUrlArray(rawOutput);
  console.log(`[bg-remove:isolate] grounded_sam returned ${urls.length} urls: ${urls.map(u => u.slice(0, 60)).join(' | ')}`);

  // Helper: download + verify mask. Score = fraction of white pixels (garment coverage).
  async function tryMask(url: string, label: string): Promise<{ buffer: Buffer; score: number } | null> {
    try {
      const resp = await fetch(url, { headers: replicateHeaders(url) });
      if (!resp.ok) return null;
      const buf = Buffer.from(await resp.arrayBuffer());
      const gray = await sharp(buf).resize(width, height, { fit: 'fill' }).grayscale().raw().toBuffer();
      let white = 0;
      for (let i = 0; i < gray.length; i++) if (gray[i] > 128) white++;
      const score = white / gray.length;
      console.log(`[bg-remove:isolate] candidate ${label} score=${score.toFixed(3)}`);
      return { buffer: gray, score };
    } catch (err) {
      console.warn(`[bg-remove:isolate] candidate ${label} failed:`, err);
      return null;
    }
  }

  // Score every candidate and pick the one with plausible garment coverage.
  // Range 0.5%–75% covers both close-up bra shots (small mask) and full-body
  // outfits. Below 0.5% means the model found nothing; above 75% almost
  // always means we got an inverted or debug image by mistake.
  let bestMask: Buffer | null = null;
  let bestScore = 0;
  const candidates: Array<{ buffer: Buffer; score: number; idx: number }> = [];
  for (let i = 0; i < Math.min(urls.length, 4); i++) {
    const candidate = await tryMask(urls[i], `idx${i}`);
    if (!candidate) continue;
    candidates.push({ ...candidate, idx: i });
    const inRange = candidate.score >= 0.005 && candidate.score <= 0.75;
    if (inRange && candidate.score > bestScore) {
      bestMask = candidate.buffer;
      bestScore = candidate.score;
    }
  }

  // If nothing scored in range but we DID get masks, try the one with the
  // smallest non-zero coverage — it's likely the real garment mask, just
  // tiny. Better than falling back to rembg which keeps the model.
  if (!bestMask && candidates.length) {
    const nonZero = candidates
      .filter((c) => c.score > 0.001 && c.score < 0.9)
      .sort((a, b) => a.score - b.score)[0];
    if (nonZero) {
      console.warn(
        `[bg-remove:isolate] no mask in primary range, using smallest non-zero: idx${nonZero.idx} score=${nonZero.score.toFixed(4)}`,
      );
      bestMask = nonZero.buffer;
      bestScore = nonZero.score;
    }
  }

  if (!bestMask) {
    console.warn('[bg-remove:isolate] no usable mask from grounded_sam — falling back to rembg on whole image');
    return await removeBgReplicate(preparedDataUrl);
  }

  console.log(`[bg-remove:isolate] using mask with coverage=${bestScore.toFixed(3)}`);

  // Compose: prepared RGB + mask as alpha → PNG with only the garment visible.
  const isolated = await sharp(prepared)
    .ensureAlpha()
    .joinChannel(bestMask, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();

  // Upload the result to Replicate file hosting so downstream routes receive
  // an https:// URL instead of a multi-megabyte data URI (that was causing
  // /api/save-result to fail with 413 Request Body Too Large).
  const resultDataUrl = `data:image/png;base64,${isolated.toString('base64')}`;
  const httpResultUrl = await ensureHttpUrl(resultDataUrl);
  console.log(`[bg-remove:isolate] done (${(isolated.length / 1024).toFixed(0)} KB) -> ${httpResultUrl.slice(0, 80)}`);
  return httpResultUrl;
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
