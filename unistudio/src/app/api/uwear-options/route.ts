// =============================================================================
// Uwear options diagnostic - UniStudio
// GET /api/uwear-options → descubre los endpoints reales de Uwear para listar
// Art Directions y Avatars (la doc de Uwear bloquea la lectura automática, así que
// probamos varios paths candidatos con TU key y reportamos cuál responde 200).
//
// ADITIVO y de solo-lectura: NO toca el pipeline. Solo nos da los IDs reales para
// después cablear el selector de Art Direction / Avatar en el Paso 2 con confianza.
// Borrar cuando ya tengamos los endpoints confirmados.
// =============================================================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE = 'https://api.uwear.ai';

// Paths candidatos para listar (probamos todos y reportamos el que funcione).
const CANDIDATES = [
  '/art-directions?items_per_page=50',
  '/art_directions?items_per_page=50',
  '/art-directions',
  '/avatars?items_per_page=50',
  '/avatars',
  '/models?items_per_page=50',
];

async function probe(path: string, key: string) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
    });
    const body = await res.text().catch(() => '');
    return { path, status: res.status, ok: res.ok, body: body.slice(0, 600) };
  } catch (e) {
    return { path, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const key = process.env.UWEAR_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ uwear_key_present: false }, { status: 200 });
  }
  const results = await Promise.all(CANDIDATES.map((p) => probe(p, key)));
  return NextResponse.json(
    { uwear_key_present: true, probes: results },
    { status: 200 },
  );
}
