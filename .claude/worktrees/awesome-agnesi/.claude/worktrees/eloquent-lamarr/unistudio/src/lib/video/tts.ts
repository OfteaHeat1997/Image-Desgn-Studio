// =============================================================================
// Text-to-Speech Generation - UniStudio (SERVER-ONLY)
// Edge TTS (free, no API key) + Google Cloud TTS (free tier).
// For client-safe voice/language data, import from ./tts-voices.ts instead.
// =============================================================================

// NOTE: This module uses node-edge-tts which requires Node.js runtime.
// Only import in server contexts (API routes). For client components,
// use tts-voices.ts for voice/language data.
import type { TtsProviderKey, TtsGenerateResult } from '@/types/video';

// Re-export client-safe data for convenience in server contexts
export { EDGE_TTS_VOICES, TTS_LANGUAGES, getVoicesForLanguage } from './tts-voices';
export type { TtsVoice } from './tts-voices';

// ---------------------------------------------------------------------------
// TTS Generation (Server-side — called via API route)
// ---------------------------------------------------------------------------

/**
 * Generate speech audio using Edge TTS (node-edge-tts package).
 * Writes to a temp file, reads back as buffer.
 */
export async function generateEdgeTts(
  text: string,
  voice: string,
  speed: number = 1.0,
): Promise<{ audioBuffer: Buffer; duration: number }> {
  const { EdgeTTS } = await import('node-edge-tts');
  const { tmpdir } = await import('os');
  const { join } = await import('path');
  const { readFile, unlink } = await import('fs/promises');
  const { randomUUID } = await import('crypto');

  const rateStr = speed === 1.0 ? '+0%' : `${speed > 1 ? '+' : ''}${Math.round((speed - 1) * 100)}%`;

  const tts = new EdgeTTS({ voice, rate: rateStr });

  const tmpPath = join(tmpdir(), `unistudio-tts-${randomUUID()}.mp3`);

  try {
    await tts.ttsPromise(text, tmpPath);
    const audioBuffer = await readFile(tmpPath);

    // Rough duration estimate: ~150 words/min in speech
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = (wordCount / 150) * 60 / speed;

    return { audioBuffer, duration: estimatedDuration };
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

/**
 * Generate speech audio using Google Cloud TTS (free tier: 4M chars/month).
 */
export async function generateGoogleTts(
  text: string,
  voice: string,
  language: string,
): Promise<{ audioBuffer: Buffer; duration: number }> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_TTS_API_KEY not configured. Use Edge TTS instead (free).');
  }

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: language === 'es' ? 'es-US' : language,
          name: voice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
        },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text().catch(() => 'unknown');
    throw new Error(`Google TTS error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const audioBuffer = Buffer.from(data.audioContent, 'base64');

  const wordCount = text.split(/\s+/).length;
  const estimatedDuration = (wordCount / 150) * 60;

  return { audioBuffer, duration: estimatedDuration };
}

/**
 * Unified TTS generation dispatcher.
 */
export async function generateTts(
  text: string,
  provider: TtsProviderKey,
  voice: string,
  language: string,
  speed: number = 1.0,
): Promise<TtsGenerateResult> {
  switch (provider) {
    case 'edge-tts': {
      const result = await generateEdgeTts(text, voice, speed);
      return {
        audioUrl: `data:audio/mp3;base64,${result.audioBuffer.toString('base64')}`,
        duration: result.duration,
        cost: 0,
      };
    }
    case 'google-tts': {
      const result = await generateGoogleTts(text, voice, language);
      return {
        audioUrl: `data:audio/mp3;base64,${result.audioBuffer.toString('base64')}`,
        duration: result.duration,
        cost: 0,
      };
    }
    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}
