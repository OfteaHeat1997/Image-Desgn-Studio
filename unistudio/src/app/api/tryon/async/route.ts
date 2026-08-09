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
import sharp from 'sharp';
import { submitFal, getFalStatus, ensureFalAccessibleUrl, uploadToFalStorage } from '@/lib/api/fal';
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
  // Con backView la modelo la pone el servidor (asset full_body_back del avatar
  // de Uwear), asi que modelImage no solo es opcional: es que la que mande el
  // cliente se DESCARTA. Exigirla obligaba a la pagina a generar una modelo de
  // $0.055 y ~40s para tirarla a la basura en la linea siguiente.
  const required = body.backView ? ['garmentImage'] : ['modelImage', 'garmentImage'];
  const missing = requireFields(body as Record<string, unknown>, required);
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
  let modelImage = body.modelImage ?? '';
  if (body.backView) {
    const avatarId = Number(process.env.UWEAR_AVATAR_ID?.trim() || 21663);
    const backUrl = await getUwearAvatarAsset(avatarId, 'full_body_back');
    if (backUrl) {
      // El avatar SOLO tiene la espalda en 'full_body_back' (no existe un
      // 'upper_body_back'), asi que la modelo salia de cuerpo entero y lejos: el
      // broche y la banda —que son el motivo de esta foto— quedaban ilegibles.
      // Recortamos al torso ANTES del try-on para que Leffa trabaje sobre un
      // encuadre cercano y el resultado sea un 3/4 de espalda con el detalle
      // visible. Si el recorte falla, seguimos con la foto entera.
      try {
        const buf = Buffer.from(await (await fetch(backUrl)).arrayBuffer());
        const meta = await sharp(buf).metadata();
        const w = meta.width ?? 0;
        const h = meta.height ?? 0;
        if (w && h) {
          // ENCUADRE VERTICAL, NO SOLO RECORTE SUPERIOR.
          //
          // Antes se tomaba el 42% superior a ANCHO COMPLETO. El limite vertical
          // es correcto y hay que conservarlo: con 55% el encuadre llegaba a la
          // cadera y salia la modelo desnuda de la cintura para abajo, porque el
          // avatar de espalda no siempre trae prenda inferior y el warp de Leffa
          // termina de borrarla. Eso no puede llegar a un catalogo.
          //
          // El problema era el ANCHO. Un recorte ancho y bajo deja a la modelo
          // chiquita en el centro, y Leffa lo devuelve con bandas blancas arriba
          // y abajo al encajarlo en su aspecto de salida. El broche y la banda
          // —el motivo entero de esta foto— quedaban ilegibles.
          //
          // Ahora se recorta una ventana VERTICAL 3:4 centrada en el torso: mismo
          // techo de seguridad, pero la espalda ocupa el cuadro.
          const top = Math.round(h * 0.06); // apenas por encima de la cabeza
          const cropH = Math.min(Math.round(h * 0.40), h - top);
          const cropW = Math.min(w, Math.round(cropH * 0.75)); // retrato 3:4
          const left = Math.max(0, Math.round((w - cropW) / 2));
          const cropped = await sharp(buf)
            .extract({ left, top, width: cropW, height: cropH })
            .png()
            .toBuffer();
          modelImage = await uploadToFalStorage(cropped, 'image/png', 'avatar-back-torso.png');
          console.log(`[tryon-async] Foto Espalda: full_body_back del avatar ${avatarId} recortado a ventana 3:4 del torso`);
        } else {
          modelImage = backUrl;
        }
      } catch (e) {
        console.warn('[tryon-async] no se pudo recortar la espalda del avatar, uso la foto entera:', e instanceof Error ? e.message : e);
        modelImage = backUrl;
      }
    } else {
      console.warn('[tryon-async] no se pudo leer full_body_back del avatar — sigo con la modelo recibida');
    }
  }

  // Sin backView el cliente ya no manda modelImage, asi que si el asset del
  // avatar no se pudo leer nos quedamos sin nada. Fallar con un mensaje que diga
  // que hacer es mejor que mandar una cadena vacia a fal y recibir un 422 opaco.
  if (!modelImage) {
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo obtener la vista trasera del avatar de Uwear. Revisá UWEAR_API_KEY y UWEAR_AVATAR_ID.',
      },
      { status: 502 },
    );
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

    // QUITAR EL ACOLCHADO BLANCO DE LEFFA.
    //
    // Leffa encaja su salida en un aspecto fijo y rellena el sobrante con BLANCO
    // SOLIDO. Esas bandas quedan DENTRO del archivo, asi que la Foto Espalda se
    // veia distinta a todas las demas: franja blanca arriba, la foto real (fondo
    // gris de estudio) en una banda del medio, franja blanca abajo. Al lado de
    // las fotos de Uwear —gris parejo de borde a borde— cantaba.
    //
    // Recortar el borde uniforme es determinista: sharp mide el color de los
    // bordes y corta solo lo que es macizo. Si no hay acolchado no hace nada, y
    // si el recorte falla devolvemos la imagen tal cual — nunca perdemos el
    // resultado por intentar emprolijarlo.
    let finalUrl = url;
    try {
      const imgRes = await fetch(url);
      if (imgRes.ok) {
        const raw = Buffer.from(await imgRes.arrayBuffer());
        const trimmed = await sharp(raw).trim({ threshold: 12 }).png().toBuffer();
        const before = await sharp(raw).metadata();
        const after = await sharp(trimmed).metadata();
        // Solo subimos si realmente se recorto algo; asi evitamos una subida
        // inutil en el caso normal.
        if (after.height && before.height && after.height < before.height - 8) {
          finalUrl = await uploadToFalStorage(trimmed, 'image/png', 'back-trimmed.png');
          console.log(`[tryon-async] acolchado blanco recortado: ${before.width}x${before.height} → ${after.width}x${after.height}`);
        }
      }
    } catch (e) {
      console.warn('[tryon-async] no se pudo recortar el acolchado, devuelvo la imagen original:', e instanceof Error ? e.message : e);
    }

    return NextResponse.json({
      success: true,
      data: { done: true, url: finalUrl, provider: 'leffa', cost: 0.04 },
    });
  }

  return NextResponse.json({
    success: true,
    data: { done: false, status: status.status, provider: 'leffa' },
  });
});
