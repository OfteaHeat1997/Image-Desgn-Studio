// =============================================================================
// DIAGNÓSTICO — leer la especificación OpenAPI de Uwear
//
// Uwear cambió POST /clothing-item: el multipart viejo devuelve 415 y el body
// JSON ahora exige `assets: [{asset_url, asset_kind, asset_view}]`. Los valores
// válidos de ClothingItemAssetKind no están en la documentación pública y
// adivinarlos fue una pérdida de tiempo.
//
// api.uwear.ai es FastAPI, así que publica /openapi.json — pero pide auth. Esta
// ruta la trae con la key y devuelve SOLO los enums y el schema del endpoint,
// que es lo que hace falta para escribir el cliente correcto de una vez.
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

  try {
    const res = await fetch(`${UWEAR_BASE_URL}/openapi.json`, {
      headers: { Authorization: `Bearer ${k}` },
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return NextResponse.json({ success: false, status: res.status, body: t.slice(0, 500) });
    }
    const spec = (await res.json()) as {
      components?: { schemas?: Record<string, unknown> };
      paths?: Record<string, unknown>;
    };
    const schemas = spec.components?.schemas ?? {};

    // Todo schema cuyo nombre huela a asset/kind/view, más el body del endpoint.
    const relevant: Record<string, unknown> = {};
    for (const [name, def] of Object.entries(schemas)) {
      if (/asset|kind|view|clothingitem/i.test(name)) relevant[name] = def;
    }

    return NextResponse.json({
      success: true,
      schemaNames: Object.keys(schemas),
      relevant,
      clothingItemPath: spec.paths?.['/clothing-item'],
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
