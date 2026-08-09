// =============================================================================
// Macro Crop API Route - UniStudio
// POST: Accepts JSON { imageUrl, zoom?, aspectRatio?, background?, outputSize? }
// Returns a tight detail/zoom shot cropped from the REAL pixels of the product.
// Used by the jewelry pipeline for the "Detalle macro" step; reusable by the
// static-product pipeline for texture close-ups.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { macroCrop, type MacroBackground } from '@/lib/processing/macro-crop';
import { saveJob } from '@/lib/db/persist';

const VALID_BACKGROUNDS: MacroBackground[] = [
  'velvet-black',
  'soft-white',
  'warm-gray',
  'transparent',
];
const VALID_ASPECTS = ['1:1', '4:5', '3:2'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, zoom, aspectRatio, background, outputSize, region } = body as {
      imageUrl?: string;
      zoom?: number;
      aspectRatio?: (typeof VALID_ASPECTS)[number];
      background?: MacroBackground;
      outputSize?: number;
      region?: { x: number; y: number; w: number; h: number };
    };

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    if (background && !VALID_BACKGROUNDS.includes(background)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid background "${background}". Use: ${VALID_BACKGROUNDS.join(', ')}.`,
        },
        { status: 400 },
      );
    }

    if (aspectRatio && !VALID_ASPECTS.includes(aspectRatio)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid aspectRatio "${aspectRatio}". Use: ${VALID_ASPECTS.join(', ')}.`,
        },
        { status: 400 },
      );
    }

    const result = await macroCrop(imageUrl, { zoom, aspectRatio, background, outputSize, region });

    await saveJob({
      operation: 'macro-crop',
      provider: 'sharp',
      inputParams: { imageUrl, zoom, aspectRatio, background, outputSize },
      outputUrl: '(data-url)',
      cost: 0,
    });

    return NextResponse.json({
      success: true,
      data: { url: result.dataUrl, crop: result.crop },
      cost: 0,
    });
  } catch (error) {
    console.error('[API /macro-crop] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado al recortar el detalle.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
