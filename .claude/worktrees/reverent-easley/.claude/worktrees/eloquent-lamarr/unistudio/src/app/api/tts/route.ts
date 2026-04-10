// =============================================================================
// TTS API Route - UniStudio
// POST: Generates speech audio from text using Edge TTS (free) or Google TTS.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateTts } from '@/lib/video/tts';
import type { TtsProviderKey } from '@/types/video';

export async function POST(request: NextRequest) {
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
        { success: false, error: 'Missing required field "text".' },
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
        error: error instanceof Error ? error.message : 'TTS generation failed.',
      },
      { status: 500 },
    );
  }
}
