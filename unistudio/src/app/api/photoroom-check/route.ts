// =============================================================================
// Photoroom key diagnostic - UniStudio
// GET /api/photoroom-check → reports whether PHOTOROOM_API_KEY is present and, if so,
// whether Photoroom ACCEPTS the key (live call status to /v2/edit with a tiny image).
//
// Diagnostic only — does NOT return the key value (only its length). Safe to hit
// from the browser. Interpretación:
//   key_present:false        → falta agregar PHOTOROOM_API_KEY en Vercel.
//   call_status:200          → key OK y Photoroom respondió (conectado ✓).
//   call_status:401/403      → key inválida o rechazada.
//   call_status:402          → la key es válida pero necesita plan pago / créditos.
//   call_body con "content"  → posible filtro de contenido (revisar con foto real).
// =============================================================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PNG blanco 2x2 (mínimo) solo para confirmar que la key es aceptada por la API.
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEUlEQVR4nGP8//8/AwYwYsQAAFraBAGFcRgYAAAAAElFTkSuQmCC';

export async function GET() {
  const key = process.env.PHOTOROOM_API_KEY?.trim();
  const result: Record<string, unknown> = {
    photoroom_key_present: !!key,
    photoroom_key_length: key ? key.length : 0,
  };

  if (key) {
    try {
      const form = new FormData();
      form.append(
        'imageFile',
        new Blob([new Uint8Array(Buffer.from(TINY_PNG_B64, 'base64'))], { type: 'image/png' }),
        'test.png',
      );
      form.append('ghostMannequin.mode', 'ai.auto');
      form.append('background.color', 'FFFFFF');

      const res = await fetch('https://image-api.photoroom.com/v2/edit', {
        method: 'POST',
        headers: { 'x-api-key': key, Accept: 'image/png, application/json' },
        body: form,
      });
      result.photoroom_call_status = res.status;
      result.photoroom_call_ok = res.ok;
      const ct = res.headers.get('content-type') || '';
      result.photoroom_content_type = ct;
      // Si devolvió imagen, la key funciona; si devolvió JSON/texto, mostramos el motivo.
      if (ct.includes('application/json') || ct.includes('text')) {
        const body = await res.text().catch(() => '');
        result.photoroom_call_body = body.slice(0, 400);
      } else {
        result.photoroom_call_body = '(devolvió imagen — key conectada ✓)';
      }
    } catch (e) {
      result.photoroom_call_error = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(result, { status: 200 });
}
