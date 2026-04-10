// =============================================================================
// Jewelry / Accessory Virtual Try-On API Route - UniStudio
// POST: Accepts FormData { jewelryFile, modelImage, type, metalType?, finish? }
//    OR JSON { modelImage, jewelryImage, type, metalType?, finish? }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { applyJewelry, applyJewelryDisplay, JEWELRY_COSTS } from '@/lib/processing/jewelry';
import { saveJob } from '@/lib/db/persist';

const VALID_TYPES = ['earrings', 'necklace', 'ring', 'bracelet', 'sunglasses', 'watch'];
const VALID_MODES = ['exhibidor', 'flotante', 'modelo'];

export async function POST(request: NextRequest) {
  try {
    let modelImage: string = '';
    let jewelryImage: string;
    let type: string;
    let mode: string = 'modelo';
    let metalType: string | undefined;
    let finish: string | undefined;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // ---- FormData mode (preferred — avoids huge JSON bodies) ----
      const formData = await request.formData();
      const jewelryFile = formData.get('jewelryFile') as File | null;
      const modelFile = formData.get('modelFile') as File | null;
      modelImage = formData.get('modelImage') as string || '';
      type = formData.get('type') as string || '';
      mode = (formData.get('mode') as string) || 'modelo';
      metalType = (formData.get('metalType') as string) || undefined;
      finish = (formData.get('finish') as string) || undefined;

      if (!jewelryFile) {
        return NextResponse.json(
          { success: false, error: 'Missing jewelryFile in form data.' },
          { status: 400 },
        );
      }

      // Convert jewelry file to data URL
      const jBuffer = Buffer.from(await jewelryFile.arrayBuffer());
      const jMime = jewelryFile.type || 'image/png';
      jewelryImage = `data:${jMime};base64,${jBuffer.toString('base64')}`;

      // Convert model file to data URL if provided
      if (modelFile) {
        const mBuffer = Buffer.from(await modelFile.arrayBuffer());
        const mMime = modelFile.type || 'image/jpeg';
        modelImage = `data:${mMime};base64,${mBuffer.toString('base64')}`;
      }
    } else {
      // ---- JSON mode (legacy, for smaller payloads) ----
      const body = await request.json();
      modelImage = body.modelImage || '';
      jewelryImage = body.jewelryImage || '';
      type = body.type || '';
      mode = body.mode || 'modelo';
      metalType = body.metalType;
      finish = body.finish;
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
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { success: false, error: `Invalid mode "${mode}". Use: ${VALID_MODES.join(', ')}.` },
        { status: 400 },
      );
    }

    // Modelo mode requires a model image
    if (mode === 'modelo' && !modelImage) {
      return NextResponse.json(
        { success: false, error: 'Missing modelImage for modelo mode.' },
        { status: 400 },
      );
    }

    const cost = JEWELRY_COSTS[type] ?? 0.05;
    let resultUrl: string;

    if (mode === 'exhibidor' || mode === 'flotante') {
      resultUrl = await applyJewelryDisplay(jewelryImage, type, mode, { metalType, finish });
    } else {
      resultUrl = await applyJewelry(modelImage, jewelryImage, type, { metalType, finish });
    }

    await saveJob({
      operation: 'jewelry-tryon',
      provider: 'flux-kontext-pro',
      inputParams: { type, mode, metalType, finish },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: { url: resultUrl, type, mode, cost },
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
