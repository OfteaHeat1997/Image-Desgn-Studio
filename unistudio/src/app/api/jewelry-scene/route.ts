// =============================================================================
// Jewelry Scene API Route - UniStudio
// POST: { productUrl, backdropPrompt, aspectRatio?, productScale?, shadow? }
// Genera el decorado con IA y compone encima los PIXELES REALES del recorte, de
// modo que la joya no pueda cambiar. Usado por el paso "Escena de lujo".
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { composeJewelryScene } from '@/lib/processing/jewelry-scene';
import { saveJob } from '@/lib/db/persist';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productUrl, backdropPrompt, aspectRatio, productScale, shadow, solidBackground, surface } = body as {
      productUrl?: string;
      backdropPrompt?: string;
      aspectRatio?: '1:1' | '4:5' | '3:4';
      productScale?: number;
      shadow?: boolean;
      solidBackground?: string;
      surface?: 'luxury';
    };

    if (!productUrl || typeof productUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field "productUrl".' },
        { status: 400 },
      );
    }
    if (!solidBackground && surface !== 'luxury' && (!backdropPrompt || typeof backdropPrompt !== 'string')) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "backdropPrompt".' },
        { status: 400 },
      );
    }

    const result = await composeJewelryScene(productUrl, {
      backdropPrompt: backdropPrompt ?? '',
      solidBackground,
      surface,
      aspectRatio,
      productScale,
      shadow,
    });

    await saveJob({
      operation: 'jewelry-scene',
      provider: 'flux-schnell + sharp',
      inputParams: { backdropPrompt, aspectRatio, productScale },
      outputUrl: '(data-url)',
      cost: result.cost,
    });

    return NextResponse.json({
      success: true,
      data: { url: result.dataUrl, provider: 'flux-schnell + sharp' },
      cost: result.cost,
    });
  } catch (error) {
    console.error('[API /jewelry-scene] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado al componer la escena.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
