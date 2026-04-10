// =============================================================================
// Jewelry / Accessory Virtual Try-On API Route - UniStudio
// POST: Accepts JSON { modelImage, jewelryImage, type, metalType?, finish? }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { applyJewelry, JEWELRY_COSTS } from '@/lib/processing/jewelry';
import { saveJob } from '@/lib/db/persist';
import { withApiErrorHandler, requireFields } from '@/lib/api/route-helpers';

const VALID_TYPES = ['earrings', 'necklace', 'ring', 'bracelet', 'sunglasses', 'watch'];

export const POST = withApiErrorHandler('jewelry-tryon', async (request: NextRequest) => {
  const body = await request.json();
  const { modelImage, jewelryImage, type, metalType, finish } = body as {
    modelImage: string;
    jewelryImage: string;
    type: 'earrings' | 'necklace' | 'ring' | 'bracelet' | 'sunglasses' | 'watch';
    metalType?: string;
    finish?: string;
  };

  const validationError = requireFields(body, ['modelImage', 'jewelryImage', 'type']);
  if (validationError) return validationError;

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { success: false, error: `Unsupported accessory type "${type}". Use: ${VALID_TYPES.join(', ')}.` },
      { status: 400 },
    );
  }

  const cost = JEWELRY_COSTS[type] ?? 0.05;
  const resultUrl = await applyJewelry(modelImage, jewelryImage, type, { metalType, finish });

  await saveJob({
    operation: 'jewelry-tryon',
    provider: 'flux-kontext-pro',
    inputParams: { modelImage, jewelryImage, type, metalType, finish },
    outputUrl: resultUrl,
    cost,
  });

  return NextResponse.json({
    success: true,
    data: { url: resultUrl, type, cost },
  });
});
