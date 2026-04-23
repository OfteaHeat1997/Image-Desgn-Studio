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

// Modelo de face-swap en Replicate. Configurable por env var FACE_SWAP_MODEL
// para permitir probar distintos (cdingram/face-swap, lucataco/faceswap,
// yan-ops/face_swap, etc.) sin tocar código. El hash exacto de cada versión
// hay que copiarlo desde https://replicate.com/<owner>/<model>/api — los
// ejemplos abajo son plantillas, NO usar tal cual en producción sin verificar.
//
// Default: `cdingram/face-swap` sin hash. Replicate lo resuelve a latest pero
// SI el modelo requiere hash explícito (la mayoría de community models) va a
// tirar error. En ese caso, setear FACE_SWAP_MODEL con el hash real.
const FACE_SWAP_MODEL = process.env.FACE_SWAP_MODEL?.trim() || 'cdingram/face-swap';

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

    // Param names dependen del modelo exacto en Replicate. cdingram/face-swap
    // usa input_image + swap_image. Otros modelos pueden usar target_image +
    // source_image, o face + target. Si el modelo tira "invalid input", hay
    // que verificar los param names en https://replicate.com/<model>/api.
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
    const rawMsg = error instanceof Error ? error.message : 'face-swap failed';
    // Si el modelo no existe en Replicate (404) o el hash está mal, traducir a
    // mensaje amigable para que la usuaria sepa que no es fallo de su foto.
    const isModelIssue = /not found|invalid version|no such model|404/i.test(rawMsg);
    const friendly = isModelIssue
      ? `El modelo de face-swap "${FACE_SWAP_MODEL}" no está disponible en Replicate. Seteá la env var FACE_SWAP_MODEL con un hash válido (formato: owner/name:sha256hash) o usá otro modo de generación.`
      : rawMsg;
    return NextResponse.json(
      { success: false, error: friendly },
      { status: 500 },
    );
  }
}
