// =============================================================================
// Uwear / provider key diagnostic - UniStudio
// GET /api/uwear-check → reports whether UWEAR_API_KEY (and other provider keys)
// are present and, for Uwear, whether the key is ACCEPTED (live call status).
//
// Diagnostic only — does NOT return the key value (only its length). Safe to hit
// from the browser. Remove once the Uwear auth issue is resolved.
// =============================================================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uwearKey = process.env.UWEAR_API_KEY?.trim();
  const result: Record<string, unknown> = {
    replicate_key_present: !!process.env.REPLICATE_API_TOKEN?.trim(),
    fal_key_present: !!process.env.FAL_KEY?.trim(),
    uwear_key_present: !!uwearKey,
    uwear_key_length: uwearKey ? uwearKey.length : 0,
  };

  if (uwearKey) {
    // Lightweight authenticated GET to confirm the key is accepted.
    // 200 → key OK. 401 → key rejected (wrong/inactive). Other → see body.
    try {
      const res = await fetch('https://api.uwear.ai/clothing-items?items_per_page=1', {
        method: 'GET',
        headers: { Authorization: `Bearer ${uwearKey}` },
      });
      const body = await res.text().catch(() => '');
      result.uwear_call_status = res.status;
      result.uwear_call_ok = res.ok;
      result.uwear_call_body = body.slice(0, 300);
    } catch (e) {
      result.uwear_call_error = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(result, { status: 200 });
}
