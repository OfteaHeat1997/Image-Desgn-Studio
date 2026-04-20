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
import { saveJob } from '@/lib/db/persist';
import { withApiErrorHandler, requireFields } from '@/lib/api/route-helpers';
import { proxyReplicateUrl } from '@/lib/utils/image';
import { CLAUDE_HAIKU } from '@/lib/utils/constants';

const PROVIDER_COSTS: Record<string, number> = {
  replicate: 0.01,
  browser: 0,
  withoutbg: 0,
};

// Cost of the garment isolation path (Claude Vision bbox + rembg)
const ISOLATE_COST = 0.012;

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Ask Claude Vision for the bounding box of the product garment in pixels.
 * Uses e-commerce-friendly framing so the request isn't flagged as sensitive.
 * Falls back to the centered 60% of the image if Claude is unavailable.
 */
async function getGarmentBbox(
  base64: string,
  mimeType: string,
  garmentType: string | null,
  width: number,
  height: number,
): Promise<BBox> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return {
      x: Math.round(width * 0.2),
      y: Math.round(height * 0.2),
      width: Math.round(width * 0.6),
      height: Math.round(height * 0.6),
    };
  }

  const productWord =
    garmentType && garmentType !== 'other' ? garmentType : 'product';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_HAIKU,
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mimeType, data: base64 },
              },
              {
                type: 'text',
                text:
                  `This is an e-commerce catalog photo (${width}x${height} pixels). Return ONLY valid JSON with the pixel bounding box of the ${productWord} product shown (ignore any person/model who may be wearing it — return the box around the product item itself): ` +
                  `{"x": number, "y": number, "width": number, "height": number}. ` +
                  `Coordinates are in pixels, origin top-left. Be tight but include the full item.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`vision ${res.status}`);
    const data = await res.json();
    const text: string | undefined = data.content?.[0]?.text;
    const match = text?.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json');
    const parsed = JSON.parse(match[0]) as Partial<BBox>;
    const x = Math.max(0, Math.round(parsed.x ?? 0));
    const y = Math.max(0, Math.round(parsed.y ?? 0));
    const w = Math.min(width - x, Math.round(parsed.width ?? width));
    const h = Math.min(height - y, Math.round(parsed.height ?? height));
    if (w < 10 || h < 10) throw new Error('degenerate bbox');
    return { x, y, width: w, height: h };
  } catch (err) {
    console.warn('[bg-remove:isolate] bbox vision failed, using center crop:', err);
    return {
      x: Math.round(width * 0.2),
      y: Math.round(height * 0.2),
      width: Math.round(width * 0.6),
      height: Math.round(height * 0.6),
    };
  }
}

/**
 * Isolate a garment from a photo that may contain a model/person.
 * Replicate's Flux Kontext Pro has non-disableable content moderation that
 * rejects lingerie (E005), so we avoid it entirely: Claude Vision gives us a
 * bbox around the product, Sharp crops to that region, then standard rembg
 * strips the remaining background. No moderated endpoints touched.
 */
async function isolateGarment(
  imageUrl: string,
  garmentType: string | null,
): Promise<string> {
  // Load the image as a buffer
  let inputBuffer: Buffer;
  let mimeType = 'image/jpeg';
  if (imageUrl.startsWith('data:')) {
    const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('Invalid data URI');
    mimeType = m[1];
    inputBuffer = Buffer.from(m[2], 'base64');
  } else {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`fetch input ${res.status}`);
    mimeType = res.headers.get('content-type') || 'image/jpeg';
    inputBuffer = Buffer.from(await res.arrayBuffer());
  }

  // Re-encode to JPEG at a sane size so Vision + rembg are fast and stable
  const prepared = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
  const meta = await sharp(prepared).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error('Could not read image dimensions');

  // 1) bbox around the garment (Vision, or fallback to center crop)
  const base64 = prepared.toString('base64');
  const bbox = await getGarmentBbox(base64, 'image/jpeg', garmentType, width, height);

  // 2) crop with ~10% padding, clamped to the image
  const padX = Math.round(bbox.width * 0.1);
  const padY = Math.round(bbox.height * 0.1);
  const left = Math.max(0, bbox.x - padX);
  const top = Math.max(0, bbox.y - padY);
  const cropW = Math.min(width - left, bbox.width + 2 * padX);
  const cropH = Math.min(height - top, bbox.height + 2 * padY);
  const croppedBuffer = await sharp(prepared)
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toBuffer();

  // 3) rembg (no content moderation) strips the remaining bg → PNG cutout
  const cropDataUrl = `data:image/png;base64,${croppedBuffer.toString('base64')}`;
  return await removeBgReplicate(cropDataUrl);
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
