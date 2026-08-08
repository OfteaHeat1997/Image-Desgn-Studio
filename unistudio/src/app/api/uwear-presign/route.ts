// =============================================================================
// DIAGNÓSTICO — estructura real de una prenda de Uwear
//
// POST /clothing-item con multipart devuelve 415 y con nuestro JSON devuelve 422
// pidiendo `assets[]` con `asset_kind` y `asset_view`. Los valores válidos de esos
// enums no están en la documentación pública y adivinarlos no funcionó (probé
// photo/image/garment/clothing/product/main: todos rechazados). La ruta
// documentada /api/v1/clothing-item devuelve 404 en producción — es del entorno
// dev.
//
// Ese 415/422 rompe TODO el camino Uwear del pipeline de lencería: smartTryOn lo
// intenta primero para íntimos y, al fallar, cae en silencio a SeedDream, que
// redibuja el producto. La usuaria elige Uwear y le sale SeedDream.
//
// La cuenta ya tiene 13 prendas cargadas desde la web de Uwear. Leer una y mirar
// sus assets da los valores reales sin adivinar.
//
// GET /api/uwear-presign
// =============================================================================

import { NextResponse } from 'next/server';

const UWEAR_BASE_URL = 'https://api.uwear.ai';

export async function GET() {
  const k = process.env.UWEAR_API_KEY?.trim();
  if (!k) {
    return NextResponse.json({ success: false, error: 'UWEAR_API_KEY no configurada' }, { status: 500 });
  }
  const auth = { Authorization: `Bearer ${k}` };

  try {
    const listRes = await fetch(`${UWEAR_BASE_URL}/clothing-item?page=1`, { headers: auth });
    const listText = await listRes.text();
    let id: number | undefined;
    try {
      const parsed = JSON.parse(listText) as { data?: Array<{ clothing_item_id?: number }> };
      id = parsed.data?.[0]?.clothing_item_id;
    } catch { /* se reporta crudo abajo */ }

    let detail: unknown = null;
    if (id) {
      const detRes = await fetch(`${UWEAR_BASE_URL}/clothing-item/${id}`, { headers: auth });
      detail = { status: detRes.status, body: (await detRes.text()).slice(0, 4000) };
    }

    return NextResponse.json({
      success: true,
      listStatus: listRes.status,
      firstId: id,
      // El primer item de la lista suele traer ya los assets embebidos.
      listSample: listText.slice(0, 2500),
      detail,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
