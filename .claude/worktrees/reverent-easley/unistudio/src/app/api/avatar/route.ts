// =============================================================================
// Avatar API Route - UniStudio
// POST: Generates talking-head videos using SadTalker, Wav2Lip, MuseTalk, etc.
// Pipeline: TTS → Audio → Avatar Engine → Video
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateAvatar } from '@/lib/processing/avatar';
import { generateTts } from '@/lib/video/tts';
import { AVATAR_PROVIDERS, TTS_PROVIDERS } from '@/lib/video/providers';
import { saveJob } from '@/lib/db/persist';
import type { AvatarProviderKey, TtsProviderKey } from '@/types/video';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      avatarImageUrl,
      provider = 'sadtalker',
      script,
      ttsProvider = 'edge-tts',
      voice = 'es-MX-DaliaNeural',
      language = 'es',
      audioUrl: providedAudioUrl,
    } = body as {
      avatarImageUrl: string;
      provider?: AvatarProviderKey;
      script: string;
      ttsProvider?: TtsProviderKey;
      voice?: string;
      language?: string;
      audioUrl?: string;
    };

    if (!avatarImageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "avatarImageUrl".' },
        { status: 400 },
      );
    }

    if (!script?.trim() && !providedAudioUrl) {
      return NextResponse.json(
        { success: false, error: 'Provide a "script" or "audioUrl".' },
        { status: 400 },
      );
    }

    // Step 1: Generate audio from text (or use provided audio)
    let audioUrl = providedAudioUrl;
    let ttsCost = 0;

    if (!audioUrl && script?.trim()) {
      const ttsResult = await generateTts(script, ttsProvider, voice, language);
      audioUrl = ttsResult.audioUrl;
      ttsCost = ttsResult.cost;
    }

    if (!audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate audio.' },
        { status: 500 },
      );
    }

    // Step 2: Generate avatar video
    const result = await generateAvatar(avatarImageUrl, audioUrl, provider, script);

    const totalCost = result.cost + ttsCost;

    // Save job to DB
    await saveJob({
      operation: 'avatar',
      provider,
      model: AVATAR_PROVIDERS[provider]?.model,
      inputParams: {
        avatarImageUrl,
        provider,
        ttsProvider,
        voice,
        language,
        scriptLength: script?.length ?? 0,
      },
      outputUrl: result.videoUrl,
      cost: totalCost,
    });

    return NextResponse.json({
      success: true,
      data: {
        videoUrl: result.videoUrl,
        audioUrl: result.audioUrl,
        provider: result.provider,
        duration: result.duration,
      },
      cost: totalCost,
    });
  } catch (error) {
    console.error('[API /avatar] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Avatar generation failed.',
      },
      { status: 500 },
    );
  }
}
