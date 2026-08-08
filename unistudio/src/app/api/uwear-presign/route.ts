// =============================================================================
// DIAGNÓSTICO — Uwear /clothing-item/presigned-upload
//
// Por qué existe: Uwear cambió su API. POST /clothing-item con multipart ahora
// devuelve 415 con el mensaje "The clothing item endpoint expects a JSON body
// with assets. Upload local files through /clothing-item/presigned-upload first,
// then pass the returned file_url in assets[].asset_url."
//
// Eso rompía TODO el camino Uwear del pipeline de lencería: smartTryOn lo intenta
// primero para íntimos y, al fallar, caía en silencio a SeedDream — que redibuja
// el producto. La usuaria elegía Uwear y le salía SeedDream sin explicación.
//
// Uwear no publica documentación accesible, así que esta ruta prueba varias
// formas de body contra el endpoint y devuelve las respuestas crudas para
// descubrir el contrato real.
//
// GET /api/uwear-presign
// =============================================================================

import { NextResponse } from 'next/server';

const UWEAR_BASE_URL = 'https://api.uwear.ai';

function key(): string {
  const k = process.env.UWEAR_API_KEY?.trim();
  if (!k) throw new Error('UWEAR_API_KEY no está configurada.');
  return k;
}

async function probe(label: string, body: unknown) {
  try {
    const res = await fetch(`${UWEAR_BASE_URL}/clothing-item/presigned-upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text().catch(() => '');
    return { label, status: res.status, body: text.slice(0, 800) };
  } catch (e) {
    return { label, status: 0, body: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  try {
    const results = await Promise.all([
      probe('vacio', {}),
      probe('file_name+content_type', { file_name: 'front.jpg', content_type: 'image/jpeg' }),
      probe('filename+contentType', { filename: 'front.jpg', contentType: 'image/jpeg' }),
      probe('file_name solo', { file_name: 'front.jpg' }),
      probe('files[]', { files: [{ file_name: 'front.jpg', content_type: 'image/jpeg' }] }),
      probe('extension', { extension: 'jpg' }),
    ]);
    return NextResponse.json({ success: true, results });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
