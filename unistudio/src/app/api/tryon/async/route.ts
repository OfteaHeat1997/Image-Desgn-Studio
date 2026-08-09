// =============================================================================
// Try-on ASÍNCRONO — para proveedores que tardan más que el límite de Vercel
//
// POR QUÉ EXISTE: Leffa es el único proveedor verificado que RESPETA la silueta
// real del producto (escote, cobertura, paneles de malla) en vez de redibujarla
// como hace SeedDream. Pero tarda ~236s medidos, y la ruta /api/tryon corre
// dentro de una función de Vercel limitada a 300s: con arranque en frío + red se
// pasaba y devolvía FUNCTION_INVOCATION_TIMEOUT. Subir maxDuration no sirve — el
// plan de esta cuenta no admite más de 300s (probado: con 800 Vercel descarta el
// valor y aplica el default de 60s, que rompe TODO el Paso 2).
//
// La solución correcta es no esperar dentro de la función:
//   POST /api/tryon/async  → encola en fal y devuelve request_id al instante
//   GET  /api/tryon/async  → consulta estado; cuando termina devuelve la imagen
// El cliente consulta cada pocos segundos. Ninguna llamada dura más de unos
// segundos, así que el límite de Vercel deja de importar.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { submitFal, getFalStatus, ensureFalAccessibleUrl } from '@/lib/api/fal';
import { getUwearAvatarAsset } from '@/lib/api/uwear';
import { withApiErrorHandler, requireFields } from '@/lib/api/route-helpers';

/** Mapea nuestras categorías a las de Leffa. */
function leffaGarmentType(category: string): string {
  if (category === 'bottoms') return 'lower_body';
  if (category === 'one-pieces' || category === 'dresses') return 'dresses';
  return 'upper_body';
}

export const POST = withApiErrorHandler('tryon-async', async (request: NextRequest) => {
  const body = (await request.json()) as {
    modelImage?: string;
    garmentImage?: string;
    category?: string;
    /** true = Foto Espalda: usar la vista trasera real del avatar como modelo. */
    backView?: boolean;
  };
  const missing = requireFields(body as Record<string, unknown>, ['modelImage', 'garmentImage']);
  if (missing) return missing;

  // FOTO ESPALDA. El paso estaba mal disenado de raiz: pedia a model-create una
  // modelo "de espaldas" y le pegaba la prenda con un try-on. Pero SeedDream
  // ignora el back-view y devuelve OTRA persona DE FRENTE, y un try-on no puede
  // rotar a nadie — si recibe una modelo de frente, devuelve una foto de frente.
  // Por eso fallaba igual con Leffa y con Uwear: el proveedor nunca fue el
  // problema, la imagen de entrada lo era.
  //
  // Los avatares de Uwear ya traen la vista trasera lista (asset_role
  // "full_body_back") del MISMO avatar. Usarla como imagen de la modelo vuelve el
  // paso determinista: misma mujer, espalda real, sin generar nada. Combinada con
  // la foto REAL de la espalda del producto que sube la usuaria, el try-on por fin
  // tiene las dos entradas correctas.
  let modelImage = body.modelImage!;
  if (body.backView) {
    const avatarId = Number(process.env.UWEAR_AVATAR_ID?.trim() || 21663);
    const backUrl = await getUwearAvatarAsset(avatarId, 'full_body_back');
    if (backUrl) {
      modelImage = backUrl;
      console.log(`[tryon-async] Foto Espalda: usando full_body_back del avatar ${avatarId}`);
    } else {
      console.warn('[tryon-async] no se pudo leer full_body_back del avatar — sigo con la modelo recibida');
    }
  }

  const humanImageUrl = await ensureFalAccessibleUrl(modelImage);
  const garmentImageUrl = await ensureFalAccessibleUrl(body.garmentImage!);

  const queued = await submitFal('fal-ai/leffa/virtual-tryon', {
    human_image_url: humanImageUrl,
    garment_image_url: garmentImageUrl,
    garment_type: leffaGarmentType(body.category ?? 'tops'),
  });

  return NextResponse.json({
    success: true,
    data: {
      requestId: queued.request_id,
      statusUrl: queued.status_url,
      responseUrl: queued.response_url,
      provider: 'leffa',
    },
  });
});

export const GET = withApiErrorHandler('tryon-async', async (request: NextRequest) => {
  const statusUrl = request.nextUrl.searchParams.get('statusUrl');
  const responseUrl = request.nextUrl.searchParams.get('responseUrl');
  if (!statusUrl) {
    return NextResponse.json({ success: false, error: 'Falta statusUrl.' }, { status: 400 });
  }

  const status = await getFalStatus(statusUrl);

  if (status.status === 'COMPLETED') {
    const target = status.response_url ?? responseUrl;
    if (!target) {
      return NextResponse.json({ success: false, error: 'Trabajo completado pero sin URL de resultado.' });
    }
    const res = await fetch(target, {
      headers: { Authorization: `Key ${process.env.FAL_KEY?.trim() ?? ''}` },
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return NextResponse.json({ success: false, error: `No se pudo leer el resultado (${res.status}): ${t.slice(0, 200)}` });
    }
    const result = (await res.json()) as { images?: Array<{ url?: string }>; image?: { url?: string } };
    const url = result?.images?.[0]?.url ?? result?.image?.url;
    if (!url) {
      return NextResponse.json({ success: false, error: 'El proveedor terminó pero no devolvió imagen.' });
    }
    return NextResponse.json({
      success: true,
      data: { done: true, url, provider: 'leffa', cost: 0.04 },
    });
  }

  return NextResponse.json({
    success: true,
    data: { done: false, status: status.status, provider: 'leffa' },
  });
});
