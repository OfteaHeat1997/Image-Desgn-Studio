// =============================================================================
// Photo Clean API Route - UniStudio
// POST: Accepts JSON { imageUrl, extraInstruction?, aspectRatio? }
// Removes text / price / watermark overlays while keeping everything else.
// Used as step 1 of the jewelry pipeline; reusable by static-product for
// supplier photos that arrive with price stickers.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cleanPhoto } from '@/lib/processing/photo-clean';
import { proxyReplicateUrl } from '@/lib/utils/image';
import { saveJob } from '@/lib/db/persist';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, extraInstruction, aspectRatio } = body as {
      imageUrl?: string;
      extraInstruction?: string;
      aspectRatio?: string;
    };

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    const result = await cleanPhoto(imageUrl, { extraInstruction, aspectRatio });

    await saveJob({
      operation: 'photo-clean',
      provider: 'flux-kontext-pro',
      inputParams: { imageUrl, extraInstruction, aspectRatio },
      outputUrl: result.url,
      cost: result.cost,
    });

    return NextResponse.json({
      success: true,
      data: { url: proxyReplicateUrl(result.url), provider: 'flux-kontext-pro' },
      cost: result.cost,
    });
  } catch (error) {
    console.error('[API /photo-clean] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado al limpiar la foto.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
