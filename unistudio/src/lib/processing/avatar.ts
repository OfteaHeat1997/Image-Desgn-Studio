// =============================================================================
// Avatar / Talking Head Processing Module - UniStudio
// Generates talking-head videos using SadTalker, Wav2Lip, MuseTalk via
// Replicate / fal.ai — all pay-per-use.
// =============================================================================

import { runModel, extractOutputUrl, ensureHttpUrl } from '@/lib/api/replicate';
import { runFal, extractFalVideoUrl, ensureFalAccessibleUrl } from '@/lib/api/fal';
import type { AvatarProviderKey, AvatarGenerateResult } from '@/types/video';
import { AVATAR_PROVIDERS } from '@/lib/video/providers';

// ---------------------------------------------------------------------------
// SadTalker via Replicate ($0.08/video)
// Full 3D head movement + expressions + lip sync
// ---------------------------------------------------------------------------

async function generateSadTalker(
  imageUrl: string,
  audioUrl: string,
): Promise<string> {
  const output = await runModel(
    AVATAR_PROVIDERS.sadtalker.model,
    {
      source_image: imageUrl,
      driven_audio: audioUrl,
      enhancer: 'gfpgan',
      preprocess: 'crop',
      still_mode: false,
    },
  );
  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Wav2Lip via Replicate ($0.005/video)
// Budget lip-sync — face stays static, just lip movement
// ---------------------------------------------------------------------------

async function generateWav2Lip(
  imageUrl: string,
  audioUrl: string,
): Promise<string> {
  const output = await runModel(
    AVATAR_PROVIDERS.wav2lip.model,
    {
      face: imageUrl,
      audio: audioUrl,
      fps: 25,
      pads: '0 10 0 0',
      smooth: true,
      resize_factor: 1,
    },
  );
  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// MuseTalk via fal.ai ($0.04/video)
// Real-time lip sync with good quality
// ---------------------------------------------------------------------------

async function generateMuseTalk(
  imageUrl: string,
  audioUrl: string,
): Promise<string> {
  // MuseTalk expects source_video_url + audio_url
  // For a static image, we pass it as source_video_url (fal may handle stills)
  const output = await runFal(
    AVATAR_PROVIDERS.musetalk.model,
    {
      source_video_url: imageUrl,
      audio_url: audioUrl,
    },
  );
  return extractFalVideoUrl(output);
}

// ---------------------------------------------------------------------------
// LivePortrait via Replicate ($0.09/video)
// Expression transfer / reenactment
// ---------------------------------------------------------------------------

async function generateLivePortrait(
  imageUrl: string,
  audioUrl: string,
): Promise<string> {
  const output = await runModel(
    AVATAR_PROVIDERS.liveportrait.model,
    {
      image: imageUrl,
      driving_audio: audioUrl,
    },
  );
  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Hedra Free Tier (GRATIS, ~22 videos/month)
// ---------------------------------------------------------------------------

async function generateHedra(
  imageUrl: string,
  audioUrl: string,
  text: string,
): Promise<string> {
  const apiKey = process.env.HEDRA_API_KEY;
  if (!apiKey) {
    throw new Error('El proveedor de avatar seleccionado no está disponible.');
  }

  // Hedra API: upload audio, then create character video
  const createRes = await fetch('https://mercury.dev.dream-ai.com/api/v1/characters', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      avatar_image: imageUrl,
      audio_source: audioUrl,
      text,
      aspect_ratio: '1:1',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text().catch(() => 'unknown');
    throw new Error(`Hedra API error ${createRes.status}: ${err}`);
  }

  const data = await createRes.json();
  const jobId = data.job_id ?? data.id;

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusRes = await fetch(
      `https://mercury.dev.dream-ai.com/api/v1/characters/${jobId}`,
      { headers: { 'X-API-Key': apiKey } },
    );
    const statusData = await statusRes.json();

    if (statusData.status === 'completed' && statusData.video_url) {
      return statusData.video_url;
    }
    if (statusData.status === 'failed') {
      throw new Error(`Hedra generation failed: ${statusData.error ?? 'unknown'}`);
    }
  }

  throw new Error('Hedra generation timed out after 5 minutes');
}

// ---------------------------------------------------------------------------
// Unified Avatar Generation
// ---------------------------------------------------------------------------

export async function generateAvatar(
  imageUrl: string,
  audioUrl: string,
  provider: AvatarProviderKey,
  script?: string,
): Promise<AvatarGenerateResult> {
  const providerConfig = AVATAR_PROVIDERS[provider];
  if (!providerConfig) throw new Error(`Unknown avatar provider: ${provider}`);

  // Convert data URLs (from TTS / upload) to HTTP URLs for the target backend.
  // TTS returns base64 data URLs; AI models need HTTP URLs.
  const isFal = providerConfig.backend === 'fal';
  const httpImageUrl = isFal
    ? await ensureFalAccessibleUrl(imageUrl)
    : (imageUrl.startsWith('data:') ? await ensureHttpUrl(imageUrl) : imageUrl);
  const httpAudioUrl = audioUrl.startsWith('data:')
    ? (isFal ? await ensureFalAccessibleUrl(audioUrl) : await ensureHttpUrl(audioUrl))
    : audioUrl;

  const startTime = Date.now();
  let videoUrl: string;

  switch (provider) {
    case 'sadtalker':
      videoUrl = await generateSadTalker(httpImageUrl, httpAudioUrl);
      break;
    case 'wav2lip':
      videoUrl = await generateWav2Lip(httpImageUrl, httpAudioUrl);
      break;
    case 'musetalk': {
      // MuseTalk requires a video input, not a static image
      const isImageInput = /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(httpImageUrl) || httpImageUrl.startsWith('data:image/');
      if (isImageInput) {
        throw new Error('MuseTalk requiere un video como entrada. Usa SadTalker o Wav2Lip.');
      }
      videoUrl = await generateMuseTalk(httpImageUrl, httpAudioUrl);
      break;
    }
    case 'liveportrait':
      videoUrl = await generateLivePortrait(httpImageUrl, httpAudioUrl);
      break;
    case 'hedra-free':
      videoUrl = await generateHedra(httpImageUrl, httpAudioUrl, script ?? '');
      break;
    default:
      throw new Error(`Unsupported avatar provider: ${provider}`);
  }

  const duration = (Date.now() - startTime) / 1000;

  return {
    videoUrl,
    audioUrl,
    provider,
    cost: providerConfig.costPerVideo,
    duration,
  };
}
