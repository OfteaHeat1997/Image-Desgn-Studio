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
  compositeOnSolidColor,
  BACKGROUND_PRESETS,
} from '@/lib/processing/bg-generate';
import { ensureHttpUrl } from '@/lib/api/replicate';
import { saveJob } from '@/lib/db/persist';
import { proxyReplicateUrl } from '@/lib/utils/image';

// Cost estimates in dollars per generation
const MODE_COSTS: Record<string, number> = {
  precise: 0.05, // Kontext Pro
  creative: 0.03, // Flux Dev
  fast: 0.003, // Flux Schnell
  solid: 0,     // Sharp-only composite onto a solid color, no model call
};

// Styles that bypass Flux entirely and composite onto a solid color via Sharp.
// Used by the static-product pipeline for marketplace/ecommerce white bg
// (Amazon/MercadoLibre require true #FFFFFF, which Flux cannot guarantee).
const SOLID_COLOR_STYLES: Record<string, string> = {
  'pure-white': '#FFFFFF',
  'pure-black': '#000000',
  'pure-gray': '#808080',
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
      seed,
    } = body as {
      imageUrl?: string;
      mode: 'precise' | 'creative' | 'fast';
      style: string;
      customPrompt?: string;
      aspectRatio?: string;
      productDescription?: string;
      /**
       * Optional deterministic seed. Pipeline Estáticos lo usa para que todos
       * los SKUs del mismo (productType, brand) compartan fondo idéntico.
       * Forwarded to Flux models via runModel.
       */
      seed?: number;
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

    // Accept the style if it's:
    //   1. A known BACKGROUND_PRESETS key (Flux preset prompts), OR
    //   2. A SOLID_COLOR_STYLES key (sharp composite, no IA), OR
    //   3. The caller provided a customPrompt (free-form Flux generation).
    // Otherwise reject with the full list of accepted values.
    if (!BACKGROUND_PRESETS[style] && !SOLID_COLOR_STYLES[style] && !customPrompt) {
      const validStyles = [
        ...Object.keys(SOLID_COLOR_STYLES),
        ...Object.keys(BACKGROUND_PRESETS),
      ];
      return NextResponse.json(
        {
          success: false,
          error: `Unknown style "${style}" and no "customPrompt" provided. Use one of: ${validStyles.join(', ')}.`,
        },
        { status: 400 },
      );
    }

    let resultUrl: string;
    let cost = MODE_COSTS[mode] ?? 0;

    // Convert data URLs to Replicate HTTP URLs to avoid payload size limits
    let httpImageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:')) {
      httpImageUrl = await ensureHttpUrl(imageUrl);
    }

    // Solid-color shortcut: bypass Flux entirely. The bg-remove + Sharp
    // composite path guarantees product pixel-perfect AND background hex-exact.
    if (SOLID_COLOR_STYLES[style]) {
      if (!httpImageUrl) {
        return NextResponse.json(
          { success: false, error: `Style "${style}" requires "imageUrl".` },
          { status: 400 },
        );
      }
      const hexColor = SOLID_COLOR_STYLES[style];
      resultUrl = await compositeOnSolidColor(httpImageUrl, hexColor, aspectRatio);
      cost = MODE_COSTS.solid;
      await saveJob({
        operation: 'bg-generate',
        provider: 'solid',
        inputParams: { imageUrl, mode, style, hexColor, aspectRatio },
        outputUrl: resultUrl,
        cost,
      });
      return NextResponse.json({
        success: true,
        data: { url: proxyReplicateUrl(resultUrl), mode: 'solid', style },
        cost,
      });
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
        resultUrl = await generateBgPrecise(httpImageUrl, style, customPrompt, aspectRatio, seed);
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
        resultUrl = await generateBgCreative(productDescription, style, customPrompt, aspectRatio, seed);
        break;
      }

      case 'fast': {
        const preset = BACKGROUND_PRESETS[style];
        const prompt = customPrompt || preset?.prompt || style;
        // Pass httpImageUrl so the product is composited onto the generated background
        resultUrl = await generateBgFast(prompt, aspectRatio, httpImageUrl, seed);
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
      data: { url: proxyReplicateUrl(resultUrl), mode, style },
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
