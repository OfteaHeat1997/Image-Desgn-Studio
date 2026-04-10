// =============================================================================
// TTS API Route - UniStudio
// POST: Generates speech audio from text using Edge TTS (free) or Google TTS.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateTts } from '@/lib/video/tts';
import { checkOrigin, checkRateLimit, getClientIp } from '@/lib/utils/rate-limit';
import type { TtsProviderKey } from '@/types/video';

export async function POST(request: NextRequest) {
  // Auth check
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Rate limit: 20 requests/hour
  const ip = getClientIp(request);
  if (!checkRateLimit(ip, 20)) {
    return NextResponse.json({ success: false, error: 'Demasiadas solicitudes. Intenta en una hora.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const {
      text,
      provider = 'edge-tts',
      voice = 'es-MX-DaliaNeural',
      language = 'es',
      speed = 1.0,
    } = body as {
      text: string;
      provider?: TtsProviderKey;
      voice?: string;
      language?: string;
      speed?: number;
    };

    if (!text?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el campo "text".' },
        { status: 400 },
      );
    }

    if (text.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'El texto no puede superar 1000 caracteres.' },
        { status: 400 },
      );
    }

    if (typeof speed !== 'number' || speed < 0.5 || speed > 2.0) {
      return NextResponse.json(
        { success: false, error: '"speed" debe ser un numero entre 0.5 y 2.0.' },
        { status: 400 },
      );
    }

    const result = await generateTts(text, provider, voice, language, speed);

    return NextResponse.json({
      success: true,
      data: result,
      cost: result.cost,
    });
  } catch (error) {
    console.error('[API /tts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error procesando la solicitud. Intenta de nuevo.',
      },
      { status: 500 },
    );
  }
}
