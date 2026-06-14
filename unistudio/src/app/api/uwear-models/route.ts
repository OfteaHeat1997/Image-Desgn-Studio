// =============================================================================
// Uwear models diagnostic - UniStudio
// GET /api/uwear-models → lista los modelos de Uwear (slug + displayName + ratings)
// para confirmar el slug EXACTO de "Qwen Intimate" (el de lencería). La app usa
// 'qwen-rapid-aio-v23' y puede estar mal → por eso el try-on de Uwear cae a SeedDream
// (modelo reusable). Solo-lectura, no genera nada.
// =============================================================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.UWEAR_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ uwear_key_present: false }, { status: 200 });
  }
  try {
    const res = await fetch('https://api.uwear.ai/models?items_per_page=100', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return NextResponse.json({ status: res.status, body: txt.slice(0, 400) }, { status: 200 });
    }
    const json = (await res.json()) as { models?: Array<Record<string, unknown>> };
    // Devolvemos solo lo útil para identificar el slug correcto.
    const models = (json.models ?? []).map((m) => ({
      slug: m.slug,
      displayName: m.displayName,
      category: m.category,
      isDefault: m.isDefault,
      requiresVerifiedCompany: m.requiresVerifiedCompany,
      realism: (m.uiMeta as { ratings?: { realism?: number } } | undefined)?.ratings?.realism,
    }));
    return NextResponse.json({ uwear_key_present: true, models }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 200 });
  }
}
