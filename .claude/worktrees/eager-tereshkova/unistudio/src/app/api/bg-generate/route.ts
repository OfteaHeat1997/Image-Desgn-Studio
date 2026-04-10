// =============================================================================
// Background Generation API Route - UniStudio
// POST: Accepts JSON with mode, style, and optional parameters.
// Routes to precise (Kontext Pro), creative (Flux Dev), or fast (Schnell).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  generateBgPrecise,
  generateBgCreative,
  generateBgFast,
  BACKGROUND_PRESETS,
} from '@/lib/processing/bg-generate';
import { ensureHttpUrl } from '@/lib/api/replicate';
import { saveJob } from '@/lib/db/persist';

// Cost estimates in dollars per generation
const MODE_COSTS: Record<string, number> = {
  precise: 0.05, // Kontext Pro
  creative: 0.03, // Flux Dev
  fast: 0.003, // Flux Schnell
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      mode,
      style,
      customPrompt,
      aspectRatio = '1:1',
      productDescription,
    } = body as {
      imageUrl?: string;
      mode: 'precise' | 'creative' | 'fast';
      style: string;
      customPrompt?: string;
      aspectRatio?: string;
      productDescription?: string;
    };

    if (!mode) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "mode". Use "precise", "creative", or "fast".' },
        { status: 400 },
      );
    }

    if (!style) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "style".' },
        { status: 400 },
      );
    }

    let resultUrl: string;
    const cost = MODE_COSTS[mode] ?? 0;

    // Convert data URLs to Replicate HTTP URLs to avoid payload size limits
    let httpImageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:')) {
      httpImageUrl = await ensureHttpUrl(imageUrl);
    }

    switch (mode) {
      case 'precise': {
        if (!httpImageUrl) {
          return NextResponse.json(
            {
              success: false,
              error: 'Precise mode requires "imageUrl" - the original product image to keep intact.',
            },
            { status: 400 },
          );
        }
        resultUrl = await generateBgPrecise(httpImageUrl, style, customPrompt, aspectRatio);
        break;
      }

      case 'creative': {
        if (!productDescription) {
          return NextResponse.json(
            {
              success: false,
              error: 'Creative mode requires "productDescription" to generate the full scene.',
            },
            { status: 400 },
          );
        }
        resultUrl = await generateBgCreative(productDescription, style, customPrompt, aspectRatio);
        break;
      }

      case 'fast': {
        const preset = BACKGROUND_PRESETS[style];
        const prompt = customPrompt || preset?.prompt || style;
        resultUrl = await generateBgFast(prompt, aspectRatio);
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported mode "${mode}". Use "precise", "creative", or "fast".`,
          },
          { status: 400 },
        );
    }

    await saveJob({
      operation: 'bg-generate',
      provider: mode,
      inputParams: { imageUrl, mode, style, customPrompt, aspectRatio, productDescription },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: { url: resultUrl, mode, style },
      cost,
    });
  } catch (error) {
    console.error('[API /bg-generate] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during background generation.',
      },
      { status: 500 },
    );
  }
}
