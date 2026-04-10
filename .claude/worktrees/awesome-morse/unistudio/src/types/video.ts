// =============================================================================
// Video Production Suite Types - UniStudio
// =============================================================================

// -----------------------------------------------------------------------------
// Video Categories & Modes
// -----------------------------------------------------------------------------

export type VideoCategory = 'product' | 'fashion' | 'avatar';
export type VideoMode = 'manual' | 'auto';

// -----------------------------------------------------------------------------
// Provider Definitions
// -----------------------------------------------------------------------------

export type VideoProviderKey =
  | 'kenburns'
  | 'ltx-video'
  | 'wan-2.2-fast'
  | 'wan-2.5'
  | 'wan-2.1'
  | 'kling-2.6'
  | 'minimax-hailuo';

export type AvatarProviderKey =
  | 'wav2lip'
  | 'musetalk'
  | 'sadtalker'
  | 'liveportrait'
  | 'hedra-free';

export type TtsProviderKey = 'edge-tts' | 'google-tts';

export type VideoBackend = 'replicate' | 'fal';

export interface VideoProviderConfig {
  key: VideoProviderKey;
  name: string;
  backend: VideoBackend | 'client';
  model: string;
  costPerVideo?: number;
  costPerSecond?: number;
  maxDuration: number;
  supportedAspectRatios: string[];
  quality: 'draft' | 'standard' | 'premium';
  categories: VideoCategory[];
  description: string;
}

export interface AvatarProviderConfig {
  key: AvatarProviderKey;
  name: string;
  backend: VideoBackend | 'hedra';
  model: string;
  costPerVideo: number;
  quality: string;
  description: string;
  features: string[];
}

export interface TtsProviderConfig {
  key: TtsProviderKey;
  name: string;
  costPerRequest: number;
  languages: string[];
  description: string;
  requiresApiKey: boolean;
}

// -----------------------------------------------------------------------------
// Motion Presets
// -----------------------------------------------------------------------------

export interface VideoPreset {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  category: VideoCategory;
  icon: string;
  recommended?: VideoProviderKey[];
}

// -----------------------------------------------------------------------------
// Video Generation Options
// -----------------------------------------------------------------------------

export interface VideoGenerateOptions {
  imageUrl: string;
  provider: VideoProviderKey;
  preset?: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  category: VideoCategory;
  mode: VideoMode;
}

export interface VideoGenerateResult {
  url: string;
  provider: VideoProviderKey;
  duration: number;
  cost: number;
  aspectRatio: string;
}

// -----------------------------------------------------------------------------
// Avatar / Talking Head
// -----------------------------------------------------------------------------

export interface AvatarGenerateOptions {
  avatarImageUrl: string;
  provider: AvatarProviderKey;
  script: string;
  ttsProvider: TtsProviderKey;
  voice: string;
  language: string;
  audioUrl?: string;
}

export interface AvatarGenerateResult {
  videoUrl: string;
  audioUrl: string;
  provider: AvatarProviderKey;
  cost: number;
  duration: number;
}

// -----------------------------------------------------------------------------
// TTS
// -----------------------------------------------------------------------------

export interface TtsGenerateOptions {
  text: string;
  provider: TtsProviderKey;
  voice: string;
  language: string;
  speed?: number;
}

export interface TtsGenerateResult {
  audioUrl: string;
  duration: number;
  cost: number;
}

// -----------------------------------------------------------------------------
// Ad Creator
// -----------------------------------------------------------------------------

export type AdFormat =
  | 'instagram-reel'
  | 'tiktok'
  | 'facebook-ad'
  | 'facebook-marketplace'
  | 'youtube-short'
  | 'instagram-story'
  | 'pinterest-pin';

export interface AdTemplate {
  id: AdFormat;
  name: string;
  aspectRatio: string;
  width: number;
  height: number;
  maxDuration: number;
  description: string;
}

export interface AdCreateOptions {
  imageUrl: string;
  template: AdFormat;
  headline: string;
  cta: string;
  description?: string;
  brandKitId?: string;
  videoProvider: VideoProviderKey;
  autoPrompt?: string;
}

export interface AdCreateResult {
  videoUrl: string;
  template: AdFormat;
  cost: number;
}

// -----------------------------------------------------------------------------
// AI Enhancement (Auto Mode)
// -----------------------------------------------------------------------------

export interface AiEnhancement {
  enhancedPrompt: string;
  recommendedProvider: VideoProviderKey | AvatarProviderKey;
  recommendedDuration: number;
  estimatedCost: number;
  script?: string;
  caption?: string;
  reasoning: string;
  method: 'claude' | 'local' | 'local-fallback';
}

// -----------------------------------------------------------------------------
// Video Store State
// -----------------------------------------------------------------------------

export interface VideoProject {
  id: string;
  name: string;
  category: VideoCategory;
  sourceImageUrl: string;
  resultVideoUrl?: string;
  provider: VideoProviderKey | AvatarProviderKey;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  cost: number;
  createdAt: string;
  options: VideoGenerateOptions | AvatarGenerateOptions | AdCreateOptions;
}

export interface VideoStoreState {
  // Mode
  mode: VideoMode;
  setMode: (mode: VideoMode) => void;

  // Active tab
  activeTab: VideoCategory;
  setActiveTab: (tab: VideoCategory) => void;

  // Video generation
  selectedProvider: VideoProviderKey;
  setSelectedProvider: (provider: VideoProviderKey) => void;
  selectedPreset: string;
  setSelectedPreset: (preset: string) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  duration: number;
  setDuration: (duration: number) => void;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;

  // Avatar
  avatarProvider: AvatarProviderKey;
  setAvatarProvider: (provider: AvatarProviderKey) => void;
  ttsProvider: TtsProviderKey;
  setTtsProvider: (provider: TtsProviderKey) => void;
  script: string;
  setScript: (script: string) => void;
  voice: string;
  setVoice: (voice: string) => void;
  language: string;
  setLanguage: (language: string) => void;

  // AI Enhancement (Auto Mode)
  aiEnhancement: AiEnhancement | null;
  setAiEnhancement: (enhancement: AiEnhancement | null) => void;
  isEnhancing: boolean;
  setIsEnhancing: (enhancing: boolean) => void;
  autoStep: string | null;
  setAutoStep: (step: string | null) => void;

  // Processing
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  videoResult: string | null;
  setVideoResult: (url: string | null) => void;

  // History
  projects: VideoProject[];
  addProject: (project: VideoProject) => void;

  // Reset
  reset: () => void;
}
