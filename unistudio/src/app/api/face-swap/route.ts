// =============================================================================
// Face-Swap API Route - UniStudio
// POST: Reemplaza la cara en `targetImage` por la cara de `sourceImage`.
// Usa cdingram/face-swap en Replicate (rápido ~5s, barato ~$0.003/swap).
//
// Caso de uso principal: la usuaria tiene una foto real de su producto con una
// modelo de catálogo (Leonisa / Unistyles) y no quiere / no puede licenciar
// esa cara. Generamos una modelo IA (paso "model" del pipeline) y hacemos
// face-swap solo de la cara, dejando el resto de la foto (cuerpo, prenda,
// pose, iluminación) tal cual. Preserva el producto al 100%.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { proxyReplicateUrl } from '@/lib/utils/image';

// cdingram/face-swap — v1 model, estable y rápido. Input: input_image (target,
// donde cambiamos la cara) + swap_image (source, de donde tomamos la cara).
const FACE_SWAP_MODEL =
  'cdingram/face-swap:d1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71d3a32';

// Costo aproximado del modelo en Replicate (verificar periódicamente).
const FACE_SWAP_COST = 0.003;

// Face-swap termina en <10s típicamente, pero si Replicate está congestionado
// puede colgarse — subimos a 120s para permitir cold start.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetImage, sourceImage } = body as {
      targetImage?: string;  // URL o dataURL de la foto a modificar
      sourceImage?: string;  // URL o dataURL de donde sacar la cara
    };

    if (!targetImage) {
      return NextResponse.json(
        { success: false, error: 'targetImage es requerido (la foto donde querés cambiar la cara).' },
        { status: 400 },
      );
    }
    if (!sourceImage) {
      return NextResponse.json(
        { success: false, error: 'sourceImage es requerido (la foto con la cara nueva).' },
        { status: 400 },
      );
    }

    console.log('[face-swap] target:', targetImage.slice(0, 80), '| source:', sourceImage.slice(0, 80));

    const output = await runModel(FACE_SWAP_MODEL, {
      input_image: targetImage,
      swap_image: sourceImage,
    });

    const url = await extractOutputUrl(output);

    return NextResponse.json({
      success: true,
      data: {
        url: proxyReplicateUrl(url),
      },
      cost: FACE_SWAP_COST,
    });
  } catch (error) {
    console.error('[API /face-swap] Error:', error);
    const msg = error instanceof Error ? error.message : 'face-swap failed';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}
