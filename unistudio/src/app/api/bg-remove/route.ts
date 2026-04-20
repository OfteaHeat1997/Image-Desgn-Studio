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
import { uploadToFalStorage } from '@/lib/api/fal';
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

  // Normalize the input: rotate via EXIF, cap at 1024px (smaller = faster
  // grounded_sam inference), re-encode as JPEG for a lighter upload.
  const prepared = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  const meta = await sharp(prepared).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error('Could not read image dimensions');

  const maskPrompt = garmentTypeToPrompt(garmentType);
  console.log(`[bg-remove:isolate] running grounded_sam prompt="${maskPrompt}" size=${width}x${height}`);

  // Upload the prepared JPEG so Replicate can fetch it by URL
  const preparedDataUrl = `data:image/jpeg;base64,${prepared.toString('base64')}`;
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

  // Helper: download + verify mask. Returns both coverage (fraction of white
  // pixels — garment area) and purity (fraction of pixels that are near-black
  // or near-white — how "mask-like" it is). A real SAM mask is ~99% pure
  // black/white; the annotated debug overlay has labels + colored bbox lines
  // over the original photo and scores low on purity.
  async function tryMask(
    url: string,
    label: string,
  ): Promise<{ buffer: Buffer; coverage: number; purity: number } | null> {
    try {
      const resp = await fetch(url, { headers: replicateHeaders(url) });
      if (!resp.ok) return null;
      const buf = Buffer.from(await resp.arrayBuffer());
      const gray = await sharp(buf).resize(width, height, { fit: 'fill' }).grayscale().raw().toBuffer();
      let white = 0;
      let pure = 0;
      for (let i = 0; i < gray.length; i++) {
        if (gray[i] > 128) white++;
        if (gray[i] < 20 || gray[i] > 235) pure++;
      }
      const coverage = white / gray.length;
      const purity = pure / gray.length;
      console.log(
        `[bg-remove:isolate] candidate ${label} coverage=${coverage.toFixed(3)} purity=${purity.toFixed(3)}`,
      );
      return { buffer: gray, coverage, purity };
    } catch (err) {
      console.warn(`[bg-remove:isolate] candidate ${label} failed:`, err);
      return null;
    }
  }

  // Download + score all candidates in parallel
  const maxCandidates = Math.min(urls.length, 4);
  const settled = await Promise.all(
    Array.from({ length: maxCandidates }, (_, i) => tryMask(urls[i], `idx${i}`)),
  );
  const candidates: Array<{
    buffer: Buffer;
    coverage: number;
    purity: number;
    idx: number;
  }> = [];
  for (let i = 0; i < settled.length; i++) {
    const candidate = settled[i];
    if (candidate) candidates.push({ ...candidate, idx: i });
  }

  // Pick the mask. Real SAM masks are ~99% pure black/white; annotated
  // debug overlays (with bounding boxes drawn on the source photo) score
  // below ~0.5 purity. Require purity >= 0.9 AND plausible coverage
  // (0.3%–80%). Without purity, the old heuristic kept picking the
  // annotated image because a high-contrast photo has many "white" pixels.
  let bestMask: Buffer | null = null;
  let bestCoverage = 0;
  for (const candidate of candidates) {
    const isMaskLike = candidate.purity >= 0.9;
    const inRange = candidate.coverage >= 0.003 && candidate.coverage <= 0.8;
    // Prefer the mask with the largest plausible coverage among mask-like
    // candidates — grounded_sam sometimes returns two valid masks
    // (foreground + refined); bigger one is usually cleaner.
    if (isMaskLike && inRange && candidate.coverage > bestCoverage) {
      bestMask = candidate.buffer;
      bestCoverage = candidate.coverage;
    }
  }

  // No mask passed purity: try the candidate with the HIGHEST purity as long
  // as it's still reasonably high (>=0.75) — sometimes JPEG compression
  // drags purity down. Better than the annotated overlay.
  if (!bestMask && candidates.length) {
    const byPurity = [...candidates]
      .filter((c) => c.purity >= 0.75 && c.coverage >= 0.001 && c.coverage <= 0.9)
      .sort((a, b) => b.purity - a.purity)[0];
    if (byPurity) {
      console.warn(
        `[bg-remove:isolate] no high-purity mask, using top purity candidate idx${byPurity.idx} purity=${byPurity.purity.toFixed(3)}`,
      );
      bestMask = byPurity.buffer;
      bestCoverage = byPurity.coverage;
    }
  }

  if (!bestMask) {
    console.warn('[bg-remove:isolate] no usable mask from grounded_sam — falling back to rembg on whole image');
    return await removeBgReplicate(preparedDataUrl);
  }

  console.log(`[bg-remove:isolate] using mask coverage=${bestCoverage.toFixed(3)}`);

  // Compose: prepared RGB + mask as alpha → PNG with only the garment visible.
  const isolated = await sharp(prepared)
    .ensureAlpha()
    .joinChannel(bestMask, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();

  // Upload the result directly to fal storage — it's where Kolors needs to
  // read the URL from anyway, and it's faster than uploading to Replicate
  // and re-uploading later. Falls back to Replicate if fal upload fails.
  try {
    const falUrl = await uploadToFalStorage(isolated, 'image/png', 'isolated.png');
    console.log(`[bg-remove:isolate] done (${(isolated.length / 1024).toFixed(0)} KB) -> ${falUrl.slice(0, 80)} [fal]`);
    return falUrl;
  } catch (err) {
    console.warn('[bg-remove:isolate] fal upload failed, falling back to Replicate:', err);
    const resultDataUrl = `data:image/png;base64,${isolated.toString('base64')}`;
    const httpResultUrl = await ensureHttpUrl(resultDataUrl);
    console.log(`[bg-remove:isolate] done (${(isolated.length / 1024).toFixed(0)} KB) -> ${httpResultUrl.slice(0, 80)} [replicate]`);
    return httpResultUrl;
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
