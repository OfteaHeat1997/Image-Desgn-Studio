// =============================================================================
// DIAGNÓSTICO — Photoroom Virtual Model
//
// Existe para responder UNA pregunta que la documentación de Photoroom no
// contesta: ¿su Virtual Model acepta LENCERÍA, o la bloquea como hizo FASHN?
// De esa respuesta depende si conviene pagar el plan Plus (€100/mes) o seguir
// generando la modelo con SeedDream en fal.
//
// Corre en modo SANDBOX por default (prefijo sandbox_ en la key): 1.000 llamadas
// gratis al mes que NO gastan la cuota del plan. El resultado sale con marca de
// agua — sirve para decidir, no para publicar.
//
// GET /api/photoroom-virtualmodel?imageUrl=<url-prenda>&pose=standing&sandbox=1
//   pose:  standing | seated | crossedarms | back | random
//   model: preset de modelo (default 'ava') — el MISMO preset da la MISMA modelo
//   scene: preset de escena (default 'studio')
//   sandbox=0 para gastar cuota real (solo para la foto final)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { virtualModelPhotoroom, type PhotoroomPose } from '@/lib/api/photoroom';
import { uploadToFalStorage } from '@/lib/api/fal';

const POSES: PhotoroomPose[] = ['standing', 'seated', 'crossedarms', 'back', 'random'];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const imageUrl = sp.get('imageUrl');
  if (!imageUrl) {
    return NextResponse.json(
      { success: false, error: 'Falta imageUrl (URL pública de la prenda).' },
      { status: 400 },
    );
  }

  const poseParam = (sp.get('pose') ?? 'standing') as PhotoroomPose;
  const pose = POSES.includes(poseParam) ? poseParam : 'standing';
  const sandbox = sp.get('sandbox') !== '0';

  try {
    const png = await virtualModelPhotoroom(imageUrl, {
      modelPreset: sp.get('model') ?? 'ava',
      scenePreset: sp.get('scene') ?? 'studio',
      pose,
      sandbox,
    });
    // Persistir en fal para poder mirar el resultado por URL estable.
    const url = await uploadToFalStorage(png, 'image/png', 'virtualmodel.png');
    return NextResponse.json({
      success: true,
      accepted: true,
      sandbox,
      pose,
      model: sp.get('model') ?? 'ava',
      scene: sp.get('scene') ?? 'studio',
      url,
      bytes: png.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Distinguir "me rechazó la lencería" de "se rompió otra cosa" — es
    // justamente lo que queremos saber.
    const looksLikeContentBlock = /content|moderation|policy|nsfw|not allowed|unsupported|inappropriate/i.test(message);
    return NextResponse.json({
      success: false,
      accepted: false,
      sandbox,
      pose,
      likelyContentBlock: looksLikeContentBlock,
      error: message,
    });
  }
}
