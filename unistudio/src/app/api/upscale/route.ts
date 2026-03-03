// =============================================================================
// Image Upscale API Route - UniStudio
// POST: Accepts JSON { imageUrl, provider, scale, faceEnhance?, prompt? }
// Routes to appropriate upscale model via Replicate.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { saveJob } from '@/lib/db/persist';

// Provider cost estimates in dollars
const PROVIDER_COSTS: Record<string, number> = {
  'real-esrgan': 0.02,
  clarity: 0.05,
  'aura-sr': 0.03,
};

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
        // Real-ESRGAN via Replicate
        const output = await runModel(
          'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
          {
            image: imageUrl,
            scale,
            face_enhance: faceEnhance,
          },
        );
        resultUrl = extractOutputUrl(output);
        break;
      }

      case 'clarity': {
        // Clarity upscaler via Replicate (prompt-guided)
        const input: Record<string, any> = {
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
        resultUrl = extractOutputUrl(output);
        break;
      }

      case 'aura-sr': {
        // AuraSR via Replicate (fofr/aura-sr)
        const output = await runModel('fofr/aura-sr', {
          image: imageUrl,
        });
        resultUrl = extractOutputUrl(output);
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
