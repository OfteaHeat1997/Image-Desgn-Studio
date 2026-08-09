// =============================================================================
// Jewelry Prompts API Route - UniStudio
// POST: { imageUrl, features? }
// Claude Vision mira la foto y escribe el prompt de cada paso del pipeline.
// Si falla, devuelve success:false y el pipeline cae a las plantillas por
// sub-tipo — nunca bloquea.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  directJewelryPrompts,
  findMacroRegion,
  ART_DIRECTOR_COST,
} from '@/lib/processing/jewelry-art-director';
import { saveJob } from '@/lib/db/persist';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, features, mode } = body as {
      imageUrl?: string;
      features?: unknown;
      /** 'macro-region' pide solo el rectangulo a acercar, sobre la pieza aislada. */
      mode?: 'prompts' | 'macro-region';
    };

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    if (mode === 'macro-region') {
      const found = await findMacroRegion(imageUrl);
      if (!found) {
        return NextResponse.json(
          { success: false, error: 'No se pudo elegir la region del macro.' },
          { status: 502 },
        );
      }
      return NextResponse.json({ success: true, data: found, cost: ART_DIRECTOR_COST });
    }

    const prompts = await directJewelryPrompts(imageUrl, features);
    if (!prompts) {
      return NextResponse.json(
        { success: false, error: 'No se pudo dirigir los prompts para esta foto.' },
        { status: 502 },
      );
    }

    await saveJob({
      operation: 'jewelry-prompts',
      provider: 'claude-sonnet-vision',
      inputParams: { imageUrl },
      outputUrl: '(prompts)',
      cost: ART_DIRECTOR_COST,
    });

    return NextResponse.json({ success: true, data: prompts, cost: ART_DIRECTOR_COST });
  } catch (error) {
    console.error('[API /jewelry-prompts] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
