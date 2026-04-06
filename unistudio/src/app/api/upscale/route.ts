// =============================================================================
// Image Upscale API Route - UniStudio
// POST: Accepts JSON { imageUrl, provider, scale, faceEnhance?, prompt? }
// Routes to appropriate upscale model via Replicate.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { saveJob } from '@/lib/db/persist';
import sharp from 'sharp';

// Real-ESRGAN GPU limit is ~2,096,704 pixels. Use 2M as safe max.
const MAX_PIXELS = 2_000_000;

// Provider cost estimates in dollars
const PROVIDER_COSTS: Record<string, number> = {
  'real-esrgan': 0.02,
  clarity: 0.05,
  'aura-sr': 0.03,
};

/**
 * If the image exceeds MAX_PIXELS, resize it down and return a data URL.
 * Otherwise, return the original URL unchanged.
 */
async function ensureFitsGpu(imageUrl: string): Promise<string> {
  // Fetch image buffer
  let buffer: Buffer;
  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.split(',')[1];
    buffer = Buffer.from(base64, 'base64');
  } else {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  }

  const metadata = await sharp(buffer).metadata();
  const w = metadata.width ?? 0;
  const h = metadata.height ?? 0;
  const totalPixels = w * h;

  if (totalPixels <= MAX_PIXELS) return imageUrl;

  // Calculate new dimensions that fit under MAX_PIXELS, preserving aspect ratio
  const scale = Math.sqrt(MAX_PIXELS / totalPixels);
  const newW = Math.floor(w * scale);
  const newH = Math.floor(h * scale);

  const resized = await sharp(buffer)
    .resize(newW, newH, { fit: 'inside' })
    .png()
    .toBuffer();

  return `data:image/png;base64,${resized.toString('base64')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      provider,
      scale = 2,
      faceEnhance = false,
      prompt,
    } = body as {
      imageUrl: string;
      provider: 'real-esrgan' | 'clarity' | 'aura-sr';
      scale?: 2 | 4;
      faceEnhance?: boolean;
      prompt?: string;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "provider". Use "real-esrgan", "clarity", or "aura-sr".' },
        { status: 400 },
      );
    }

    let resultUrl: string;
    const cost = PROVIDER_COSTS[provider] ?? 0;

    switch (provider) {
      case 'real-esrgan': {
        // Real-ESRGAN has a GPU pixel limit (~2M). Resize large images first.
        const safeUrl = await ensureFitsGpu(imageUrl);
        const output = await runModel(
          'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
          {
            image: safeUrl,
            scale,
            face_enhance: faceEnhance,
          },
        );
        resultUrl = await extractOutputUrl(output);
        break;
      }

      case 'clarity': {
        // Clarity upscaler via Replicate (prompt-guided)
        const input: Record<string, string | number | boolean> = {
          image: imageUrl,
          scale_factor: scale,
          resemblance: 0.6,
          creativity: 0.35,
          output_format: 'png',
        };
        if (prompt) {
          input.prompt = prompt;
        }
        const output = await runModel(
          'philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e',
          input,
        );
        resultUrl = await extractOutputUrl(output);
        break;
      }

      case 'aura-sr': {
        // AuraSR also has GPU limits — resize large images first
        const safeUrl = await ensureFitsGpu(imageUrl);
        const output = await runModel('fofr/aura-sr', {
          image: safeUrl,
        });
        resultUrl = await extractOutputUrl(output);
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported provider "${provider}". Use "real-esrgan", "clarity", or "aura-sr".`,
          },
          { status: 400 },
        );
    }

    await saveJob({
      operation: 'upscale',
      provider,
      inputParams: { imageUrl, scale, faceEnhance, prompt },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: { url: resultUrl, provider, scale },
      cost,
    });
  } catch (error) {
    console.error('[API /upscale] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during upscaling.',
      },
      { status: 500 },
    );
  }
}
