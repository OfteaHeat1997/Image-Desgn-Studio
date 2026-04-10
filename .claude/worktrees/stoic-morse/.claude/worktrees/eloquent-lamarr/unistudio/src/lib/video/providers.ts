// =============================================================================
// Video Provider Registry - UniStudio
// Unified registry for all video generation providers (fal.ai + Replicate).
// =============================================================================

import type {
  VideoProviderConfig,
  VideoProviderKey,
  AvatarProviderConfig,
  AvatarProviderKey,
  TtsProviderConfig,
  TtsProviderKey,
  VideoCategory,
} from '@/types/video';

// ---------------------------------------------------------------------------
// Video Generation Providers
// ---------------------------------------------------------------------------

export const VIDEO_PROVIDERS: Record<VideoProviderKey, VideoProviderConfig> = {
  kenburns: {
    key: 'kenburns',
    name: 'Ken Burns',
    backend: 'client',
    model: 'client-side-css',
    costPerVideo: 0,
    maxDuration: 15,
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3'],
    quality: 'draft',
    categories: ['product', 'fashion'],
    description: 'Zoom/pan simple gratis (client-side)',
  },
  'ltx-video': {
    key: 'ltx-video',
    name: 'LTX-Video',
    backend: 'fal',
    model: 'fal-ai/ltx-video/image-to-video',
    costPerVideo: 0.04,
    maxDuration: 5,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    quality: 'draft',
    categories: ['product'],
    description: 'Previews ultra-baratos ($0.04/video)',
  },
  'wan-2.2-fast': {
    key: 'wan-2.2-fast',
    name: 'Wan 2.2 Fast',
    backend: 'replicate',
    model: 'wan-video/wan-2.2-i2v-fast',
    costPerVideo: 0.05,
    maxDuration: 5,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    quality: 'standard',
    categories: ['product', 'fashion'],
    description: 'Videos de producto rapidos ($0.05)',
  },
  'wan-2.5': {
    key: 'wan-2.5',
    name: 'Wan 2.5',
    backend: 'fal',
    model: 'fal-ai/wan-25-preview/image-to-video',
    costPerSecond: 0.05,
    maxDuration: 10,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    quality: 'standard',
    categories: ['product', 'fashion'],
    description: 'Videos standard ($0.05/seg)',
  },
  'wan-2.1': {
    key: 'wan-2.1',
    name: 'Wan 2.1',
    backend: 'replicate',
    model: 'wavespeedai/wan-2.1-i2v-480p',
    costPerVideo: 0.04,
    maxDuration: 10,
    supportedAspectRatios: ['16:9'],
    quality: 'standard',
    categories: ['product'],
    description: 'Videos de producto clasico ($0.04)',
  },
  'kling-2.6': {
    key: 'kling-2.6',
    name: 'Kling 2.6 Pro',
    backend: 'fal',
    model: 'fal-ai/kling-video/v2.6/pro/image-to-video',
    costPerSecond: 0.07,
    maxDuration: 10,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    quality: 'premium',
    categories: ['product', 'fashion'],
    description: 'Mejor calidad producto/moda ($0.07/seg)',
  },
  'minimax-hailuo': {
    key: 'minimax-hailuo',
    name: 'Minimax Hailuo',
    backend: 'fal',
    model: 'fal-ai/minimax/video-01/image-to-video',
    costPerSecond: 0.08,
    maxDuration: 6,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    quality: 'premium',
    categories: ['product', 'fashion'],
    description: 'Batch ads premium ($0.08/seg)',
  },
};

// ---------------------------------------------------------------------------
// Avatar Providers
// ---------------------------------------------------------------------------

export const AVATAR_PROVIDERS: Record<AvatarProviderKey, AvatarProviderConfig> = {
  wav2lip: {
    key: 'wav2lip',
    name: 'Wav2Lip',
    backend: 'replicate',
    model: 'devxpy/cog-wav2lip:8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef',
    costPerVideo: 0.005,
    quality: 'Lip-sync bueno, cara estatica',
    description: 'Budget lip-sync',
    features: ['lip-sync'],
  },
  musetalk: {
    key: 'musetalk',
    name: 'MuseTalk',
    backend: 'fal',
    model: 'fal-ai/musetalk',
    costPerVideo: 0.04,
    quality: 'Real-time lip sync',
    description: 'Lip-sync medio',
    features: ['lip-sync', 'real-time'],
  },
  sadtalker: {
    key: 'sadtalker',
    name: 'SadTalker',
    backend: 'replicate',
    model: 'cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3',
    costPerVideo: 0.08,
    quality: 'Movimiento 3D + expresiones',
    description: 'Talking heads completos',
    features: ['lip-sync', '3d-movement', 'expressions'],
  },
  liveportrait: {
    key: 'liveportrait',
    name: 'LivePortrait',
    backend: 'replicate',
    model: 'fofr/live-portrait:067dd98cc3e5cb396c4a9efb4bba3eec6c4a9d271211325c477518fc6485e146',
    costPerVideo: 0.09,
    quality: 'Transferencia de expresiones',
    description: 'Reenactment',
    features: ['expression-transfer', 'reenactment'],
  },
  'hedra-free': {
    key: 'hedra-free',
    name: 'Hedra Free',
    backend: 'hedra',
    model: 'hedra-character-1',
    costPerVideo: 0,
    quality: 'Lip-sync 9/10',
    description: 'Premium gratis (22 videos/mes)',
    features: ['lip-sync', 'premium-quality'],
  },
};

// ---------------------------------------------------------------------------
// TTS Providers
// ---------------------------------------------------------------------------

export const TTS_PROVIDERS: Record<TtsProviderKey, TtsProviderConfig> = {
  'edge-tts': {
    key: 'edge-tts',
    name: 'Edge TTS',
    costPerRequest: 0,
    languages: ['es', 'en', 'fr', 'de', 'pt', 'nl', 'it', 'ja', 'ko', 'zh'],
    description: 'Microsoft Edge TTS — gratis, sin API key',
    requiresApiKey: false,
  },
  'google-tts': {
    key: 'google-tts',
    name: 'Google Cloud TTS',
    costPerRequest: 0,
    languages: ['es', 'en', 'fr', 'de', 'pt', 'nl', 'it', 'ja', 'ko', 'zh'],
    description: 'Google Cloud TTS — 4M chars/mes gratis',
    requiresApiKey: true,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get providers available for a specific video category */
export function getProvidersForCategory(category: VideoCategory): VideoProviderConfig[] {
  return Object.values(VIDEO_PROVIDERS).filter(
    (p) => p.categories.includes(category),
  );
}

/** Get cheapest provider that supports a given category */
export function getCheapestProvider(
  category: VideoCategory,
  duration: number = 5,
): VideoProviderConfig {
  const providers = getProvidersForCategory(category);
  return providers.reduce((cheapest, p) => {
    const costA = getProviderCost(cheapest, duration);
    const costB = getProviderCost(p, duration);
    return costB < costA ? p : cheapest;
  });
}

/** Calculate the cost for a provider given a duration */
export function getProviderCost(
  provider: VideoProviderConfig,
  duration: number,
): number {
  if (provider.costPerVideo !== undefined) return provider.costPerVideo;
  if (provider.costPerSecond !== undefined) return provider.costPerSecond * duration;
  return 0;
}
