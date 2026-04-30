// =============================================================================
// Identity Check — verifica que el producto del output sea el MISMO del input
// =============================================================================
// Después de cada paso generativo, comparamos input vs output con Claude Haiku
// Vision. Si el producto cambió (forma, color, etiqueta, material), marcamos
// el output como inválido y se ofrece reintentar.
//
// Costo ~$0.0005 por check. Cache por par (inputHash, outputHash).
// =============================================================================

import { CLAUDE_HAIKU } from '@/lib/utils/constants';
import type { ProductCategory } from '@/lib/processing/product-features';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();

export interface IdentityCheckResult {
  /** true si la IA juzga que es el mismo producto físico */
  same: boolean;
  /** confianza 0-1 */
  confidence: number;
  /** explicación corta en español */
  reason: string;
  /** específicas que cambiaron, si las hay */
  changes: string[];
}

const COMPARE_PROMPTS: Record<ProductCategory, string> = {
  lingerie: `Compara la prenda íntima del INPUT con la del OUTPUT.
¿Es la MISMA prenda física? (mismo tipo, mismo color, mismos tirantes, misma textura, mismos detalles)

Responde SOLO JSON:
{
  "same": true|false,
  "confidence": 0.0-1.0,
  "reason": "explicación corta en español",
  "changes": ["lista de cambios específicos si hay, ej 'tirantes finos -> gruesos', 'beige -> mint'"]
}`,

  'static-product': `Compara el producto del INPUT (frasco/envase) con el del OUTPUT.
¿Es el MISMO producto físico? (misma forma del frasco, misma etiqueta, mismo color, misma tapa, misma marca)

Responde SOLO JSON:
{
  "same": true|false,
  "confidence": 0.0-1.0,
  "reason": "explicación corta en español",
  "changes": ["lista de cambios específicos si hay, ej 'frasco cuadrado -> redondo', 'etiqueta cambió'"]
}`,

  jewelry: `Compara la joya del INPUT con la del OUTPUT.
¿Es la MISMA joya física? (mismo tipo, mismo material/color, mismas piedras, mismos grabados, misma forma)

Responde SOLO JSON:
{
  "same": true|false,
  "confidence": 0.0-1.0,
  "reason": "explicación corta en español",
  "changes": ["lista de cambios específicos si hay, ej 'oro -> plata', 'piedras desaparecieron'"]
}`,
};

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const m = url.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return null;
      return { mimeType: m[1], data: m[2] };
    }
    const { replicateHeaders } = await import('@/lib/utils/image');
    const res = await fetch(url, { headers: replicateHeaders(url) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      mimeType: res.headers.get('content-type') ?? 'image/jpeg',
      data: buf.toString('base64'),
    };
  } catch {
    return null;
  }
}

export async function checkProductIdentity(
  inputUrl: string,
  outputUrl: string,
  category: ProductCategory,
): Promise<IdentityCheckResult | null> {
  if (!ANTHROPIC_API_KEY) return null;

  const [inputImg, outputImg] = await Promise.all([
    urlToBase64(inputUrl),
    urlToBase64(outputUrl),
  ]);
  if (!inputImg || !outputImg) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_HAIKU,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'INPUT (foto original que subió la usuaria):' },
              {
                type: 'image',
                source: { type: 'base64', media_type: inputImg.mimeType, data: inputImg.data },
              },
              { type: 'text', text: 'OUTPUT (resultado del pipeline):' },
              {
                type: 'image',
                source: { type: 'base64', media_type: outputImg.mimeType, data: outputImg.data },
              },
              { type: 'text', text: COMPARE_PROMPTS[category] },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error('[identity-check] API error:', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      same: parsed.same === true,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reason: String(parsed.reason ?? ''),
      changes: Array.isArray(parsed.changes) ? parsed.changes.map(String) : [],
    };
  } catch (err) {
    console.error('[identity-check] failed:', err);
    return null;
  }
}
