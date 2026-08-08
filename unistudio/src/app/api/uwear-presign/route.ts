// =============================================================================
// DIAGNÓSTICO — flujo nuevo de Uwear para registrar una prenda
//
// Uwear cambió su API: POST /clothing-item con multipart devuelve 415 pidiendo
// JSON con assets[].asset_url subidos antes por /clothing-item/presigned-upload.
// Eso rompía TODO el camino Uwear del pipeline de lencería — smartTryOn lo
// intenta primero para íntimos y al fallar caía en silencio a SeedDream, que
// redibuja el producto: la usuaria elegía Uwear y le salía SeedDream.
//
// Uwear no publica documentación accesible. Esta ruta recorre el flujo completo
// (presign → subida a S3 → POST /clothing-item con varias formas de body) y
// devuelve las respuestas crudas, para escribir el cliente definitivo sin
// adivinar y sin gastar ciclos de deploy de a uno.
//
// GET /api/uwear-presign?imageUrl=<url-publica-de-la-prenda>
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

const UWEAR_BASE_URL = 'https://api.uwear.ai';

function key(): string {
  const k = process.env.UWEAR_API_KEY?.trim();
  if (!k) throw new Error('UWEAR_API_KEY no está configurada.');
  return k;
}

export async function GET(request: NextRequest) {
  const imageUrl =
    request.nextUrl.searchParams.get('imageUrl') ??
    'https://v3b.fal.media/files/b/0aa58f7a/4Qi-7AjuSadtWdDmiAjl7_bh-negro-original.png';

  const steps: Record<string, unknown> = {};

  try {
    // ---- 1. presign -------------------------------------------------------
    const presignRes = await fetch(`${UWEAR_BASE_URL}/clothing-item/presigned-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_name: 'front.jpg', content_type: 'image/jpeg' }),
    });
    const presignText = await presignRes.text();
    steps.presign = { status: presignRes.status, body: presignText.slice(0, 2000) };
    if (!presignRes.ok) return NextResponse.json({ success: false, steps });

    const presign = JSON.parse(presignText) as {
      upload_url: string;
      method?: string;
      fields?: Record<string, string>;
      file_url?: string;
    };

    // ---- 2. subir el archivo a S3 con la policy firmada --------------------
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      steps.download = { error: `No se pudo bajar la imagen (${imgRes.status})` };
      return NextResponse.json({ success: false, steps });
    }
    const bytes = Buffer.from(await imgRes.arrayBuffer());

    const form = new FormData();
    for (const [k2, v] of Object.entries(presign.fields ?? {})) form.append(k2, v);
    form.append('file', new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }), 'front.jpg');

    const upRes = await fetch(presign.upload_url, { method: 'POST', body: form });
    const upText = await upRes.text().catch(() => '');
    steps.s3upload = { status: upRes.status, body: upText.slice(0, 400) };

    // URL final del asset: la que devuelva el presign, o upload_url + key.
    const assetUrl =
      presign.file_url ??
      `${presign.upload_url.replace(/\/$/, '')}/${presign.fields?.key ?? ''}`;
    steps.assetUrl = assetUrl;

    // ---- 3. probar formas de body para POST /clothing-item ----------------
    // La API pide asset_kind + asset_view pero no dice los valores válidos.
    // Probamos los candidatos razonables; el 422 de un enum suele listar los
    // permitidos, así que con una pasada alcanza para cerrar el contrato.
    const KINDS = ['photo', 'image', 'garment', 'clothing', 'product', 'main'];
    const candidates: Array<{ label: string; body: unknown }> = KINDS.map((kind) => ({
      label: `asset_kind=${kind}, asset_view=front`,
      body: {
        clothing_item_name: 'diag bra',
        clothing_processing_mode: 'remove_background',
        assets: [{ asset_url: assetUrl, asset_kind: kind, asset_view: 'front' }],
      },
    }));

    const tries = [];
    for (const c of candidates) {
      const r = await fetch(`${UWEAR_BASE_URL}/clothing-item`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(c.body),
      });
      const t = await r.text().catch(() => '');
      tries.push({ label: c.label, status: r.status, body: t.slice(0, 600) });
      if (r.ok) break; // ya encontramos la forma buena
    }
    steps.clothingItem = tries;

    return NextResponse.json({ success: true, steps });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e), steps },
      { status: 500 },
    );
  }
}
