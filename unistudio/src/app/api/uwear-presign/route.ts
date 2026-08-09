// =============================================================================
// DIAGNÓSTICO — encontrar host + auth correctos de la API de Uwear
//
// La key es la correcta: creada en platform.uwear.ai/api/keys, activa, con
// creditos. Funciona con GET https://api.uwear.ai/clothing-items (devuelve las
// prendas de la cuenta). Pero:
//   POST https://api.uwear.ai/clothing-item        → 422, pide assets[] con
//        asset_kind/asset_view (enums no documentados)
//   POST https://api.uwear.ai/api/v1/clothing-item → 404, y es el path que dice
//        la especificacion OpenAPI oficial
//
// Hipotesis a descartar: (a) el host real es otro (platform.uwear.ai), (b) la API
// externa espera otra cabecera de auth (x-api-key en vez de Bearer).
//
// Importa porque Uwear falla dentro de un try/catch en smartTryOn: el error se
// traga y corre SeedDream, que REDIBUJA el producto de la usuaria.
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

// Confirmado: el UNICO endpoint que existe es POST https://api.uwear.ai/clothing-item
// con Bearer, y exige assets[]. Los enums no estan documentados, pero la cuenta ya
// tiene prendas creadas desde la web de Uwear: leer una devuelve sus assets con los
// valores REALES de asset_kind/asset_view.
const READ_PATHS = [
  'https://api.uwear.ai/clothing-items?items_per_page=1',
  'https://api.uwear.ai/clothing-item/325429',
  'https://api.uwear.ai/clothing-items/325429',
];

export async function GET() {
  const k = process.env.UWEAR_API_KEY?.trim();
  if (!k) {
    return NextResponse.json({ success: false, error: 'UWEAR_API_KEY no configurada' }, { status: 500 });
  }

  const authVariants: Array<[string, Record<string, string>]> = [
    ['Bearer', { Authorization: `Bearer ${k}` }],
    ['x-api-key', { 'x-api-key': k }],
  ];

  const results = [];
  for (const url of READ_PATHS) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${k}` } });
      const text = await res.text().catch(() => '');
      results.push({ url, auth: 'Bearer', status: res.status, body: text.slice(0, 3000) });
    } catch (e) {
      results.push({ url, auth: 'Bearer', status: 0, body: e instanceof Error ? e.message : String(e) });
    }
  }
  void BODY; void authVariants;
  return NextResponse.json({ success: true, found: null, results });
}
