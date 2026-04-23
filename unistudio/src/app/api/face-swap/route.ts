// =============================================================================
// Face-Swap API Route - UniStudio
// POST: Reemplaza la cara en `targetImage` por la cara de `sourceImage`.
//
// Estrategia dual-provider:
//   1. fal.ai (face-swap) — usa FAL_KEY que ya está configurada
//   2. Replicate (cdingram/face-swap) — fallback si fal falla
//
// Así face-swap funciona en producción SIN necesitar env var nueva.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runFal } from '@/lib/api/fal';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { proxyReplicateUrl } from '@/lib/utils/image';

const FACE_SWAP_COST = 0.003;

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetImage, sourceImage } = body as {
      targetImage?: string;
      sourceImage?: string;
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

    let resultUrl: string;

    // Provider 1: fal.ai — usa FAL_KEY que ya está configurada para
    // SeedDream y Kolors. El modelo fal-ai/face-swap toma source_image
    // (la cara a copiar) y target_image (donde ponerla).
    try {
      console.log('[face-swap] intentando fal.ai...');
      const falResult = await runFal('fal-ai/face-swap', {
        source_image_url: sourceImage,
        target_image_url: targetImage,
      });
      // fal face-swap devuelve { image: { url } } o { images: [{ url }] }
      resultUrl = falResult?.image?.url ?? falResult?.images?.[0]?.url;
      if (!resultUrl) throw new Error('fal.ai face-swap no devolvió URL');
      console.log('[face-swap] fal.ai OK:', resultUrl.slice(0, 80));
    } catch (falErr) {
      console.warn('[face-swap] fal.ai falló:', falErr instanceof Error ? falErr.message : falErr);

      // Provider 2: Replicate — fallback. Necesita FACE_SWAP_MODEL env o
      // el default 'cdingram/face-swap' (sin hash, puede fallar en community models).
      const replicateModel = process.env.FACE_SWAP_MODEL?.trim() || 'cdingram/face-swap';
      try {
        console.log(`[face-swap] intentando Replicate (${replicateModel})...`);
        const output = await runModel(replicateModel, {
          input_image: targetImage,
          swap_image: sourceImage,
        });
        resultUrl = await extractOutputUrl(output);
        console.log('[face-swap] Replicate OK:', resultUrl.slice(0, 80));
      } catch (repErr) {
        const falMsg = falErr instanceof Error ? falErr.message : String(falErr);
        const repMsg = repErr instanceof Error ? repErr.message : String(repErr);
        throw new Error(
          `Face-swap falló con ambos proveedores.\n` +
          `fal.ai: ${falMsg}\n` +
          `Replicate (${replicateModel}): ${repMsg}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        url: proxyReplicateUrl(resultUrl),
      },
      cost: FACE_SWAP_COST,
    });
  } catch (error) {
    console.error('[API /face-swap] Error:', error);
    const rawMsg = error instanceof Error ? error.message : 'face-swap failed';
    return NextResponse.json(
      { success: false, error: rawMsg },
      { status: 500 },
    );
  }
}
