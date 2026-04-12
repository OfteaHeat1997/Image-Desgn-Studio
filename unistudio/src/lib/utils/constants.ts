// =============================================================================
// App Constants - UniStudio
// Centralized constants for the entire application.
// =============================================================================

// -----------------------------------------------------------------------------
// App identity
// -----------------------------------------------------------------------------

export const APP_NAME = 'UniStudio';

// -----------------------------------------------------------------------------
// File constraints
// -----------------------------------------------------------------------------

/** Maximum allowed file size in bytes (50 MB) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Supported image MIME types for upload */
export const SUPPORTED_FORMATS = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

// -----------------------------------------------------------------------------
// AI Model IDs — update these when new model versions are released
// -----------------------------------------------------------------------------

/** Claude Haiku — used for planning, analysis, cheap tasks */
export const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';

/** Claude Sonnet — used for creative prompts, complex reasoning */
export const CLAUDE_SONNET = 'claude-sonnet-4-20250514';

// -----------------------------------------------------------------------------
// API Cost Map (USD per operation)
// Keys are formatted as "{operation}:{provider}" or "{operation}:{model}"
// -----------------------------------------------------------------------------

export const API_COSTS: Record<string, number> = {
  // Background removal
  'bg-remove:browser': 0,
  'bg-remove:replicate': 0.01,

  // Background generation
  'bg-generate:schnell': 0.003,
  'bg-generate:dev': 0.03,
  'bg-generate:kontext-pro': 0.055,

  // Enhancement
  'enhance:browser': 0,

  // Upscale
  'upscale:real-esrgan-2x': 0.005,
  'upscale:real-esrgan-4x': 0.01,
  'upscale:clarity': 0.05,

  // Shadow & relighting
  'shadow:free': 0,
  'shadow:ic-light': 0.02,
  'shadow:kontext': 0.055,

  // Inpainting
  'inpaint:fill-dev': 0.003,
  'inpaint:fill-pro': 0.03,

  // Outpainting
  'outpaint:fill-dev': 0.005,
  'outpaint:kontext': 0.055,

  // Virtual try-on
  'tryon:idm-vton': 0.02,
  'tryon:kolors': 0.015,
  'tryon:fashn': 0.05,

  // Background removal (local)
  'bg-remove:withoutbg': 0,

  // AI model creation
  'model-create:replicate': 0.055,

  // Video generation (legacy)
  'video:wan': 0.04,
  'video:kling-5s': 0.35,
  'video:kenburns': 0,

  // Video Studio providers
  'video:ltx-video': 0.04,
  'video:wan-2.2-fast': 0.05,
  'video:wan-2.5-5s': 0.25,
  'video:wan-2.1': 0.04,
  'video:kling-2.6-5s': 0.35,
  'video:minimax-hailuo-5s': 0.40,

  // Avatar / Talking Head
  'avatar:wav2lip': 0.005,
  'avatar:musetalk': 0.04,
  'avatar:sadtalker': 0.08,
  'avatar:liveportrait': 0.09,
  'avatar:hedra-free': 0,

  // TTS
  'tts:edge-tts': 0,
  'tts:google-tts': 0,

  // Ad Creator (uses video provider costs)
  'ad-create:base': 0,

  // Prompt generation
  'prompt:haiku': 0.001,
  'prompt:sonnet': 0.003,
};

// -----------------------------------------------------------------------------
// Marketplace Requirements
// Platform-specific image specifications for compliance checking.
// -----------------------------------------------------------------------------

export interface MarketplaceSpec {
  minWidth: number;
  minHeight: number;
  aspectRatio: string;
  bgColor: string | null;
  maxFileSize: number;
  formats: string[];
}

export const MARKETPLACE_REQUIREMENTS: Record<string, MarketplaceSpec> = {
  amazon: {
    minWidth: 1000,
    minHeight: 1000,
    aspectRatio: '1:1',
    bgColor: '#ffffff',
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    formats: ['image/jpeg', 'image/png', 'image/gif', 'image/tiff'],
  },
  shopify: {
    minWidth: 800,
    minHeight: 800,
    aspectRatio: '1:1',
    bgColor: null, // no requirement
    maxFileSize: 20 * 1024 * 1024, // 20 MB
    formats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  instagram: {
    minWidth: 1080,
    minHeight: 1080,
    aspectRatio: '1:1',
    bgColor: null,
    maxFileSize: 30 * 1024 * 1024, // 30 MB
    formats: ['image/jpeg', 'image/png'],
  },
  etsy: {
    minWidth: 2000,
    minHeight: 2000,
    aspectRatio: '4:3',
    bgColor: null,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    formats: ['image/jpeg', 'image/png', 'image/gif'],
  },
  ebay: {
    minWidth: 500,
    minHeight: 500,
    aspectRatio: '1:1',
    bgColor: '#ffffff',
    maxFileSize: 12 * 1024 * 1024, // 12 MB
    formats: ['image/jpeg', 'image/png'],
  },
  tiktok: {
    minWidth: 720,
    minHeight: 720,
    aspectRatio: '1:1',
    bgColor: null,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    formats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  pinterest: {
    minWidth: 1000,
    minHeight: 1500,
    aspectRatio: '2:3',
    bgColor: null,
    maxFileSize: 20 * 1024 * 1024, // 20 MB
    formats: ['image/jpeg', 'image/png', 'image/webp'],
  },
  poshmark: {
    minWidth: 880,
    minHeight: 880,
    aspectRatio: '1:1',
    bgColor: null,
    maxFileSize: 15 * 1024 * 1024, // 15 MB
    formats: ['image/jpeg', 'image/png'],
  },
  depop: {
    minWidth: 750,
    minHeight: 750,
    aspectRatio: '1:1',
    bgColor: null,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    formats: ['image/jpeg', 'image/png'],
  },
};
