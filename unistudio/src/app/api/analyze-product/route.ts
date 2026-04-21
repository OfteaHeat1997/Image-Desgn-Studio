// =============================================================================
// Analyze Product API Route - UniStudio
// POST: Takes multiple product photos (frontal + optional back/detail/flat),
// asks Claude Vision to read them together, and returns a structured ProductSpec
// that downstream steps (photoBack, photoFullBody, tryon) can inject into their
// generation prompts to preserve real product details instead of inventing them.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { CLAUDE_SONNET } from '@/lib/utils/constants';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();

type PhotoRole = 'frontal' | 'back' | 'detail' | 'flat';

interface IncomingPhoto {
  dataUrl: string;
  role: PhotoRole;
}

export interface ProductSpec {
  color: {
    primary: string;
    secondary: string | null;
  };
  material: string;
  texture: string;
  garment: {
    type: string;
    cup: string | null;
    strapStyle: string | null;
    frontClosure: string | null;
    backClosure: string | null;
    band: string | null;
    padding: string | null;
    underwire: string | null;
    details: string | null;
  };
  notes: string;
}

const EMPTY_SPEC: ProductSpec = {
  color: { primary: '', secondary: null },
  material: '',
  texture: '',
  garment: {
    type: '',
    cup: null,
    strapStyle: null,
    frontClosure: null,
    backClosure: null,
    band: null,
    padding: null,
    underwire: null,
    details: null,
  },
  notes: '',
};

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

// 5 MB — Claude API image limit per source
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'ANTHROPIC_API_KEY no configurada en el servidor.' },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      photos?: IncomingPhoto[];
      productType?: string;
    };

    const photos = Array.isArray(body.photos) ? body.photos : [];
    if (photos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos una foto.' },
        { status: 400 },
      );
    }

    // Validate + decode each photo (must be data URL). Reject oversized images
    // early so Claude doesn't timeout parsing 20MB base64 strings.
    const parsed: { mimeType: string; data: string; role: PhotoRole }[] = [];
    for (const p of photos) {
      if (!p || typeof p.dataUrl !== 'string') continue;
      const decoded = parseDataUrl(p.dataUrl);
      if (!decoded) {
        return NextResponse.json(
          { success: false, error: 'Formato de foto inválido. Se esperaba data URL base64.' },
          { status: 400 },
        );
      }
      const sizeBytes = (decoded.data.length * 3) / 4;
      if (sizeBytes > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: `Foto "${p.role}" pesa más de 5MB. Reducila antes de analizarla.`,
          },
          { status: 400 },
        );
      }
      parsed.push({ ...decoded, role: p.role });
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ninguna foto válida en el request.' },
        { status: 400 },
      );
    }

    // Build the Claude message. Each image is preceded by a text tag saying its
    // role (frontal / back / detail / flat), so Claude knows which angle to use
    // for which field.
    const userContent: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    > = [];

    userContent.push({
      type: 'text',
      text:
        'Vas a analizar fotos de una prenda (lencería). Cada foto viene etiquetada con su rol (frontal / back / detail / flat). ' +
        'Usá TODAS las fotos para extraer características reales del producto. Si un campo no se ve en ninguna foto, ponelo como null. ' +
        'NO inventes detalles que no puedas ver.',
    });

    for (const p of parsed) {
      userContent.push({ type: 'text', text: `Foto: ${p.role}` });
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: p.mimeType, data: p.data },
      });
    }

    userContent.push({
      type: 'text',
      text: `Devuelve SOLO JSON, sin explicación. Esquema exacto:
{
  "color": { "primary": string, "secondary": string | null },
  "material": string,               // ej: "satén elastizado", "algodón", "encaje floral"
  "texture": string,                // ej: "lisa con brillo suave", "trama de puntos", "bordado en relieve"
  "garment": {
    "type": string,                  // ej: "bra deportivo", "bra push-up", "panty hipster"
    "cup": string | null,            // ej: "preformada con costura en V", "sin costura"
    "strapStyle": string | null,     // ej: "anchos ajustables", "finos cruzados", "racerback"
    "frontClosure": string | null,   // ej: "sin cierre", "5 ganchos centrales", "cremallera"
    "backClosure": string | null,    // ej: "3 ganchos y gancho", "banda elástica sin cierre"
    "band": string | null,           // ej: "ancha de 5cm", "delgada de 1cm"
    "padding": string | null,        // ej: "padding removible", "sin padding"
    "underwire": string | null,      // ej: "con varilla", "sin varilla"
    "details": string | null         // encaje, bordados, transparencias, detalles decorativos
  },
  "notes": string                    // notas libres sobre el producto (2-3 frases max)
}

Respuesta en español. JSON válido parseable, sin markdown fences.`,
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_SONNET,
        max_tokens: 1024,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[analyze-product] Claude API error:', res.status, errText);
      return NextResponse.json(
        {
          success: false,
          error: `Claude Vision falló (${res.status}). ${errText.slice(0, 200)}`,
        },
        { status: 502 },
      );
    }

    const data = await res.json();
    const text: string | undefined = data.content?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Claude devolvió respuesta vacía.' },
        { status: 502 },
      );
    }

    // Extract JSON — Claude sometimes wraps in ```json fences despite the
    // instruction, so strip them defensively.
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[analyze-product] No JSON in response:', text.slice(0, 500));
      return NextResponse.json(
        { success: false, error: 'Claude no devolvió JSON parseable.' },
        { status: 502 },
      );
    }

    let spec: ProductSpec;
    try {
      const raw = JSON.parse(jsonMatch[0]);
      // Merge with EMPTY_SPEC to guarantee all expected keys exist, even if
      // Claude skipped some. Frontend relies on fields being present.
      spec = {
        color: {
          primary: String(raw?.color?.primary ?? ''),
          secondary: raw?.color?.secondary ?? null,
        },
        material: String(raw?.material ?? ''),
        texture: String(raw?.texture ?? ''),
        garment: {
          type: String(raw?.garment?.type ?? ''),
          cup: raw?.garment?.cup ?? null,
          strapStyle: raw?.garment?.strapStyle ?? null,
          frontClosure: raw?.garment?.frontClosure ?? null,
          backClosure: raw?.garment?.backClosure ?? null,
          band: raw?.garment?.band ?? null,
          padding: raw?.garment?.padding ?? null,
          underwire: raw?.garment?.underwire ?? null,
          details: raw?.garment?.details ?? null,
        },
        notes: String(raw?.notes ?? ''),
      };
    } catch (parseErr) {
      console.error('[analyze-product] JSON parse failed:', parseErr, jsonMatch[0].slice(0, 300));
      return NextResponse.json(
        { success: false, error: 'Claude devolvió JSON inválido.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { productSpec: spec, photosAnalyzed: parsed.length },
      cost: 0.01,
    });
  } catch (error) {
    console.error('[API /analyze-product] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado.',
        emptySpec: EMPTY_SPEC,
      },
      { status: 500 },
    );
  }
}
