// =============================================================================
// Outpainting API Route - UniStudio
// POST: Accepts JSON { imageUrl, platform?, targetAspectRatio?, prompt?, provider? }
// Smart outpainting based on platform specs or manual aspect ratio.
//
// Two modes:
//   1. Kontext mode (default) — aspect ratio based, Kontext Pro. Rechaza lencería.
//   2. Direction mode — { imageUrl, direction:'down'|'up'|'left'|'right',
//      expandRatio, prompt, negativePrompt }. Construye canvas + máscara con
//      Sharp y corre flux-fill-pro (permisivo con lencería). Usado por el
//      pipeline de lencería en photoFullBody (extiende el tryon hacia abajo
//      para mostrar piernas + panty sin regenerar la modelo).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { uploadToFalStorage } from '@/lib/api/fal';
import { saveJob } from '@/lib/db/persist';
import { proxyReplicateUrl } from '@/lib/utils/image';

type Direction = 'down' | 'up' | 'left' | 'right';

async function extendCanvasAndMask(
  imageBuffer: Buffer,
  direction: Direction,
  expandRatio: number,
): Promise<{ extendedUrl: string; maskUrl: string }> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error('Could not read image dimensions');

  const extraH = direction === 'down' || direction === 'up' ? Math.round(height * expandRatio) : 0;
  const extraW = direction === 'left' || direction === 'right' ? Math.round(width * expandRatio) : 0;
  const newWidth = width + extraW;
  const newHeight = height + extraH;

  const padTop = direction === 'up' ? extraH : 0;
  const padBottom = direction === 'down' ? extraH : 0;
  const padLeft = direction === 'left' ? extraW : 0;
  const padRight = direction === 'right' ? extraW : 0;

  // Extended canvas: original image padded with neutral gray (flux-fill-pro
  // fills the masked region — color of padding doesn't matter much, gray is
  // the safest neutral that doesn't bleed colors into the result).
  const extendedBuffer = await sharp(imageBuffer)
    .extend({
      top: padTop,
      bottom: padBottom,
      left: padLeft,
      right: padRight,
      background: { r: 127, g: 127, b: 127, alpha: 1 },
    })
    .png()
    .toBuffer();

  // Mask: white where we want inpaint to fill, black where to preserve.
  const maskBlack = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
  const maskBuffer = await sharp({
    create: {
      width: newWidth,
      height: newHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: maskBlack, left: padLeft, top: padTop }])
    .png()
    .toBuffer();

  const [extendedUrl, maskUrl] = await Promise.all([
    uploadToFalStorage(extendedBuffer, 'image/png', 'outpaint-extended.png'),
    uploadToFalStorage(maskBuffer, 'image/png', 'outpaint-mask.png'),
  ]);
  return { extendedUrl, maskUrl };
}

// Platform aspect ratio specifications
const PLATFORM_SPECS: Record<string, { aspectRatio: string; description: string }> = {
  amazon: { aspectRatio: '1:1', description: 'Amazon product listing (square)' },
  shopify: { aspectRatio: '1:1', description: 'Shopify product page (square)' },
  instagram: { aspectRatio: '1:1', description: 'Instagram feed post (square)' },
  'instagram-story': { aspectRatio: '9:16', description: 'Instagram Story (vertical)' },
  'instagram-landscape': { aspectRatio: '1.91:1', description: 'Instagram landscape post' },
  tiktok: { aspectRatio: '9:16', description: 'TikTok (vertical)' },
  pinterest: { aspectRatio: '2:3', description: 'Pinterest pin (vertical)' },
  facebook: { aspectRatio: '1.91:1', description: 'Facebook post (landscape)' },
  'facebook-story': { aspectRatio: '9:16', description: 'Facebook Story (vertical)' },
  twitter: { aspectRatio: '16:9', description: 'Twitter/X post (widescreen)' },
  etsy: { aspectRatio: '4:3', description: 'Etsy listing (landscape)' },
  ebay: { aspectRatio: '1:1', description: 'eBay listing (square)' },
  poshmark: { aspectRatio: '1:1', description: 'Poshmark listing (square)' },
  depop: { aspectRatio: '1:1', description: 'Depop listing (square)' },
};

// Cost estimates in dollars
const PROVIDER_COSTS: Record<string, number> = {
  kontext: 0.05,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      platform,
      targetAspectRatio,
      prompt,
      negativePrompt,
      provider = 'kontext',
      direction,
      expandRatio,
    } = body as {
      imageUrl: string;
      platform?: string;
      targetAspectRatio?: string;
      prompt?: string;
      negativePrompt?: string;
      provider?: string;
      direction?: Direction;
      expandRatio?: number;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------------
    // Direction-based outpaint with flux-fill-pro (for lingerie pipeline)
    // ---------------------------------------------------------------
    if (direction && (provider === 'flux-fill-pro' || provider === 'kontext-rejects-lingerie-use-fluxfillpro')) {
      if (!['down', 'up', 'left', 'right'].includes(direction)) {
        return NextResponse.json(
          { success: false, error: `Invalid direction "${direction}". Use down/up/left/right.` },
          { status: 400 },
        );
      }
      const ratio = typeof expandRatio === 'number' && expandRatio > 0 && expandRatio <= 2 ? expandRatio : 0.65;

      // Load input image as buffer
      let inputBuffer: Buffer;
      if (imageUrl.startsWith('data:')) {
        const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) throw new Error('Invalid data URI');
        inputBuffer = Buffer.from(m[2], 'base64');
      } else {
        const r = await fetch(imageUrl);
        if (!r.ok) throw new Error(`fetch input ${r.status}`);
        inputBuffer = Buffer.from(await r.arrayBuffer());
      }

      const { extendedUrl, maskUrl } = await extendCanvasAndMask(inputBuffer, direction, ratio);

      const fillPrompt = prompt || 'Continue the photograph naturally, maintaining consistent lighting and style.';
      const negative = negativePrompt || 'different person, different body, different skin, harsh shadows, low quality, plastic skin';

      const fillProInput: Record<string, unknown> = {
        image: extendedUrl,
        mask: maskUrl,
        prompt: fillPrompt,
        negative_prompt: negative,
      };
      const output = await runModel('black-forest-labs/flux-fill-pro', fillProInput);
      const resultUrl: string = await extractOutputUrl(output);

      await saveJob({
        operation: 'outpaint',
        provider: 'flux-fill-pro',
        inputParams: { imageUrl, direction, expandRatio: ratio, prompt: fillPrompt },
        outputUrl: resultUrl,
        cost: 0.05,
      });

      return NextResponse.json({
        success: true,
        data: {
          url: proxyReplicateUrl(resultUrl),
          provider: 'flux-fill-pro',
          direction,
          expandRatio: ratio,
          cost: 0.05,
        },
      });
    }

    // Determine target aspect ratio
    let aspectRatio: string;
    let platformDescription: string | undefined;

    if (platform && PLATFORM_SPECS[platform]) {
      const spec = PLATFORM_SPECS[platform];
      aspectRatio = spec.aspectRatio;
      platformDescription = spec.description;
    } else if (targetAspectRatio) {
      if (!/^\d+(\.\d+)?:\d+(\.\d+)?$/.test(targetAspectRatio)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid "targetAspectRatio" format. Expected "W:H" (e.g. "16:9", "1:1", "1.91:1").',
          },
          { status: 400 },
        );
      }
      // Validate numeric bounds to prevent absurd values crashing the GPU
      const [wStr, hStr] = targetAspectRatio.split(':');
      const w = parseFloat(wStr);
      const h = parseFloat(hStr);
      if (w <= 0 || h <= 0 || w > 100 || h > 100) {
        return NextResponse.json(
          {
            success: false,
            error: 'Aspect ratio components must be between 0.1 and 100 (e.g. "16:9", "1.91:1").',
          },
          { status: 400 },
        );
      }
      aspectRatio = targetAspectRatio;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide either "platform" or "targetAspectRatio". Supported platforms: ' +
            Object.keys(PLATFORM_SPECS).join(', '),
        },
        { status: 400 },
      );
    }

    const cost = PROVIDER_COSTS[provider] ?? 0.05;

    // Build outpainting prompt
    const outpaintPrompt = prompt ||
      'Extend the image naturally, maintaining consistent lighting, perspective, and style. ' +
      'Fill the extended area with appropriate background content that matches the original scene.';

    // Use Flux Kontext Pro — the only provider that supports aspect_ratio-based outpainting.
    // (flux-fill-dev requires a mask image which we can't generate server-side)
    const fullPrompt = `Extend this image to ${aspectRatio} aspect ratio. ${outpaintPrompt}`;
    const output = await runModel('black-forest-labs/flux-kontext-pro', {
      input_image: imageUrl,
      prompt: fullPrompt,
      aspect_ratio: aspectRatio,
    });
    const resultUrl: string = await extractOutputUrl(output);

    await saveJob({
      operation: 'outpaint',
      provider: provider || 'kontext',
      inputParams: { imageUrl, platform, targetAspectRatio, prompt, aspectRatio },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: proxyReplicateUrl(resultUrl),
        aspectRatio,
        platform: platform || null,
        platformDescription: platformDescription || null,
        cost,
      },
    });
  } catch (error) {
    console.error('[API /outpaint] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during outpainting.',
      },
      { status: 500 },
    );
  }
}
