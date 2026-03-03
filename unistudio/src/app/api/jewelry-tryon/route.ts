// =============================================================================
// Jewelry / Accessory Virtual Try-On API Route - UniStudio
// POST: Accepts JSON { modelImage, jewelryImage, type, metalType?, finish? }
// Uses Flux Kontext Pro via Replicate (through the jewelry processing lib).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { applyJewelry, JEWELRY_COSTS } from '@/lib/processing/jewelry';
import { saveJob } from '@/lib/db/persist';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      modelImage,
      jewelryImage,
      type,
      metalType,
      finish,
    } = body as {
      modelImage: string;
      jewelryImage: string;
      type: 'earrings' | 'necklace' | 'ring' | 'bracelet' | 'sunglasses' | 'watch';
      metalType?: string;
      finish?: string;
    };

    if (!modelImage) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "modelImage".' },
        { status: 400 },
      );
    }

    if (!jewelryImage) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "jewelryImage".' },
        { status: 400 },
      );
    }

    if (!type) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required field "type". Use "earrings", "necklace", "ring", "bracelet", "sunglasses", or "watch".',
        },
        { status: 400 },
      );
    }

    const validTypes = ['earrings', 'necklace', 'ring', 'bracelet', 'sunglasses', 'watch'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported accessory type "${type}". Use "earrings", "necklace", "ring", "bracelet", "sunglasses", or "watch".`,
        },
        { status: 400 },
      );
    }

    const cost = JEWELRY_COSTS[type] ?? 0.05;

    const resultUrl = await applyJewelry(modelImage, jewelryImage, type, {
      metalType,
      finish,
    });

    await saveJob({
      operation: 'jewelry-tryon',
      provider: 'flux-kontext-pro',
      inputParams: { modelImage, jewelryImage, type, metalType, finish },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: resultUrl,
        type,
        cost,
      },
    });
  } catch (error) {
    console.error('[API /jewelry-tryon] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred during jewelry try-on.',
      },
      { status: 500 },
    );
  }
}
