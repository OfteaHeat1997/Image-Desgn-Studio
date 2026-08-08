// =============================================================================
// DIAGNÓSTICO — encontrar el endpoint real de creación de prenda en Uwear
//
// Uwear cambió su API y el camino que usa el pipeline dejó de funcionar. Estado:
//   POST https://api.uwear.ai/clothing-item        → 415/422 (pide assets[] con
//        asset_kind/asset_view, enums NO documentados; probé 6 valores, todos mal)
//   POST https://api.uwear.ai/clothing-items       → 405 (no acepta POST)
//   POST https://api.uwear.ai/api/v1/clothing-item → 404 en un intento previo
//
// PERO su especificación OpenAPI (docs.dev.uwear.ai/openapi.json) dice que el
// endpoint externo ES `POST /api/v1/clothing-item` sobre `https://api.uwear.ai`,
// con body `{clothing_item_name, external_clothing_item_url, ...}` — sin assets.
// Esta ruta prueba esa combinación EXACTA y algunas variantes de path, para
// distinguir si el 404 fue un error de construcción de URL o si el endpoint
// realmente no existe en producción.
//
// Importa porque Uwear falla dentro de un try/catch en smartTryOn: el error se
// traga y corre SeedDream, que REDIBUJA el producto. Ese catch silencioso ocultó
// el problema durante meses.
//
// GET /api/uwear-presign
// =============================================================================

import { NextResponse } from 'next/server';

const BODY = {
  clothing_item_name: 'diag bra 011473',
  external_clothing_item_url:
    'https://v3b.fal.media/files/b/0aa58f7a/4Qi-7AjuSadtWdDmiAjl7_bh-negro-original.png',
  use_image_enhancement: true,
};

const PATHS = [
  'https://api.uwear.ai/api/v1/clothing-item',
  'https://api.uwear.ai/api/v1/clothing-items',
  'https://api.uwear.ai/v1/clothing-item',
  'https://api.uwear.ai/external/clothing-item',
  'https://api.uwear.ai/api/clothing-item',
];

export async function GET() {
  const k = process.env.UWEAR_API_KEY?.trim();
  if (!k) {
    return NextResponse.json({ success: false, error: 'UWEAR_API_KEY no configurada' }, { status: 500 });
  }

  const results = [];
  for (const url of PATHS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(BODY),
      });
      const text = await res.text().catch(() => '');
      results.push({ url, status: res.status, body: text.slice(0, 400) });
      if (res.ok) break; // encontrado
    } catch (e) {
      results.push({ url, status: 0, body: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ success: true, results });
}
