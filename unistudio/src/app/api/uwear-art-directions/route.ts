// =============================================================================
// Uwear Art Directions list - UniStudio
// GET /api/uwear-art-directions → lista las Art Directions de la cuenta Uwear
// (presets de mood/iluminación/color que dan el look editorial), para el selector
// del Paso 2. Solo-lectura — no genera nada ni cobra.
//
// Si no hay UWEAR_API_KEY o Uwear falla, devuelve lista vacía (la UI simplemente no
// muestra opciones) → NUNCA rompe el pipeline.
// =============================================================================

import { NextResponse } from 'next/server';
import { listUwearArtDirections } from '@/lib/api/uwear';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const artDirections = await listUwearArtDirections();
    return NextResponse.json({ artDirections }, { status: 200 });
  } catch (e) {
    // Degradación elegante: lista vacía + el motivo (no rompe nada).
    return NextResponse.json(
      { artDirections: [], error: e instanceof Error ? e.message : String(e) },
      { status: 200 },
    );
  }
}
