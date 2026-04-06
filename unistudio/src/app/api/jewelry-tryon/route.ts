// =============================================================================
// Jewelry / Accessory Virtual Try-On API Route - UniStudio
// POST: Accepts FormData { jewelryFile, modelImage, type, metalType?, finish? }
//    OR JSON { modelImage, jewelryImage, type, metalType?, finish? }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { applyJewelry, JEWELRY_COSTS } from '@/lib/processing/jewelry';
import { saveJob } from '@/lib/db/persist';

const VALID_TYPES = ['earrings', 'necklace', 'ring', 'bracelet', 'sunglasses', 'watch'];

export async function POST(request: NextRequest) {
  try {
    let modelImage: string;
    let jewelryImage: string;
    let type: string;
    let metalType: string | undefined;
    let finish: string | undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // ---- FormData mode (preferred — avoids huge JSON bodies) ----
      const formData = await request.formData();
      const jewelryFile = formData.get('jewelryFile') as File | null;
      modelImage = formData.get('modelImage') as string || '';
      type = formData.get('type') as string || '';
      metalType = (formData.get('metalType') as string) || undefined;
      finish = (formData.get('finish') as string) || undefined;

      if (!jewelryFile) {
        return NextResponse.json(
          { success: false, error: 'Missing jewelryFile in form data.' },
          { status: 400 },
        );
      }

      // Convert file to data URL for processing
      const buffer = Buffer.from(await jewelryFile.arrayBuffer());
      const mime = jewelryFile.type || 'image/png';
      jewelryImage = `data:${mime};base64,${buffer.toString('base64')}`;
    } else {
      // ---- JSON mode (legacy, for smaller payloads) ----
      const body = await request.json();
      modelImage = body.modelImage || '';
      jewelryImage = body.jewelryImage || '';
      type = body.type || '';
      metalType = body.metalType;
      finish = body.finish;
    }

    if (!modelImage) {
      return NextResponse.json(
        { success: false, error: 'Missing modelImage.' },
        { status: 400 },
      );
    }
    if (!jewelryImage) {
      return NextResponse.json(
        { success: false, error: 'Missing jewelryImage.' },
        { status: 400 },
      );
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type "${type}". Use: ${VALID_TYPES.join(', ')}.` },
        { status: 400 },
      );
    }

    const cost = JEWELRY_COSTS[type] ?? 0.05;
    const resultUrl = await applyJewelry(modelImage, jewelryImage, type, { metalType, finish });

    await saveJob({
      operation: 'jewelry-tryon',
      provider: 'flux-kontext-pro',
      inputParams: { type, metalType, finish },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: { url: resultUrl, type, cost },
    });
  } catch (error) {
    console.error('[API /jewelry-tryon] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error en prueba de joyeria.',
      },
      { status: 500 },
    );
  }
}
