// =============================================================================
// API Types - UniStudio
// =============================================================================

/** Supported API providers */
export type ApiProvider =
  | 'replicate'
  | 'browser'
  | 'withoutbg'
  | 'fal';

// -----------------------------------------------------------------------------
// Background Removal
// -----------------------------------------------------------------------------

export type BgRemoveQuality = 'fast' | 'balanced' | 'quality';
export type BgOutputType = 'transparent' | 'color' | 'blur';

export interface BgRemoveOptions {
  provider: ApiProvider;
  quality: BgRemoveQuality;
  outputType: BgOutputType;
  backgroundColor: string;   // hex color, used when outputType is 'color'
  blurAmount: number;         // 0-100, used when outputType is 'blur'
  edgeRefinement: boolean;
  preserveShadow: boolean;
}

// -----------------------------------------------------------------------------
// Background Generation
// -----------------------------------------------------------------------------

export type BgGenerateMode = 'precise' | 'creative' | 'fast';

export interface BgGenerateOptions {
  mode: BgGenerateMode;
  stylePreset: string;        // e.g. 'studio-white', 'outdoor-natural', 'gradient'
  customPrompt: string;
  aspectRatio: string;        // e.g. '1:1', '4:3', '16:9'
  numOutputs: number;         // 1-4
  productDescription: string;
}

// -----------------------------------------------------------------------------
// Image Enhancement
// -----------------------------------------------------------------------------

export interface EnhanceOptions {
  brightness: number;     // -100 to 100
  contrast: number;       // -100 to 100
  saturation: number;     // -100 to 100
  sharpness: number;      // 0 to 100
  exposure: number;       // -100 to 100
  whiteBalance: number;   // 2000 to 10000 (Kelvin)
  noiseReduction: number; // 0 to 100
  vibrance: number;       // -100 to 100
  preset: string;         // e.g. 'auto', 'product-clean', 'warm-lifestyle', 'cool-modern'
}

// -----------------------------------------------------------------------------
// Upscale
// -----------------------------------------------------------------------------

export type UpscaleScale = 2 | 4;

export interface UpscaleOptions {
  provider: ApiProvider;
  scale: UpscaleScale;
  faceEnhance: boolean;
}

// -----------------------------------------------------------------------------
// Shadow Generation
// -----------------------------------------------------------------------------

export type ShadowType = 'drop' | 'contact' | 'reflection' | 'ai-relight' | 'ai-kontext';

export interface DropShadowParams {
  offsetX: number;       // pixels
  offsetY: number;       // pixels
  blur: number;          // 0-100
  spread: number;        // 0-100
  color: string;         // hex
  opacity: number;       // 0 to 1
}

export interface ContactShadowParams {
  blur: number;          // 0-100
  opacity: number;       // 0 to 1
  distance: number;      // 0-100
  color: string;         // hex
}

export interface ReflectionShadowParams {
  opacity: number;       // 0 to 1
  blur: number;          // 0-100
  distance: number;      // 0-100
  fade: number;          // 0 to 1
}

export interface AiRelightParams {
  lightDirection: string;  // e.g. 'top-left', 'center', 'bottom-right'
  intensity: number;       // 0-100
  warmth: number;          // -100 to 100
  prompt: string;
}

export interface AiKontextParams {
  prompt: string;
  referenceImage: string;  // URL or data URL
  strength: number;        // 0 to 1
}

export type ShadowParams =
  | DropShadowParams
  | ContactShadowParams
  | ReflectionShadowParams
  | AiRelightParams
  | AiKontextParams;

export interface ShadowOptions {
  type: ShadowType;
  provider: ApiProvider;
  dropShadow?: DropShadowParams;
  contactShadow?: ContactShadowParams;
  reflection?: ReflectionShadowParams;
  aiRelight?: AiRelightParams;
  aiKontext?: AiKontextParams;
}

// -----------------------------------------------------------------------------
// Inpainting
// -----------------------------------------------------------------------------

export interface InpaintOptions {
  provider: ApiProvider;
  mask: string;              // mask image as data URL or URL
  prompt: string;
  negativePrompt: string;
  preset: string;            // e.g. 'product-fix', 'seamless-fill', 'texture-match'
}

// -----------------------------------------------------------------------------
// Outpainting
// -----------------------------------------------------------------------------

export type OutpaintDirection = 'left' | 'right' | 'top' | 'bottom' | 'all';

export interface OutpaintOptions {
  provider: ApiProvider;
  direction: OutpaintDirection;
  targetAspectRatio: string; // e.g. '16:9', '4:3'
  prompt: string;
}

// -----------------------------------------------------------------------------
// Virtual Try-On
// -----------------------------------------------------------------------------

export type TryOnProvider = 'idm-vton' | 'kolors' | 'fashn';
export type GarmentCategory = 'tops' | 'bottoms' | 'one-pieces' | 'dresses' | 'outerwear' | 'full-body';

export interface TryOnOptions {
  provider: TryOnProvider;
  garmentCategory: GarmentCategory;
  modelImage: string;        // model/person image URL or data URL
  garmentImage: string;      // garment image URL or data URL
  adjustFit: boolean;
  restoreBackground: boolean;
  restoreClothes: boolean;
  longTopCoverage: boolean;
  coverFeet: boolean;
  flatLay: boolean;
  numOutputs: number;        // 1-4
  seed: number | null;       // null for random
}

// -----------------------------------------------------------------------------
// AI Model Creation
// -----------------------------------------------------------------------------

export type ModelGender = 'male' | 'female' | 'non-binary';
export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '56+';
export type SkinTone = 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark';
export type BodyType = 'slim' | 'average' | 'athletic' | 'plus-size';
export type ModelPose = 'standing' | 'sitting' | 'walking' | 'dynamic' | 'custom';
export type ModelExpression = 'neutral' | 'smile' | 'serious' | 'confident' | 'relaxed';

export interface ModelCreateOptions {
  gender: ModelGender;
  ageRange: AgeRange;
  skinTone: SkinTone;
  bodyType: BodyType;
  pose: ModelPose;
  expression: ModelExpression;
  hairStyle: string;        // free-form description
  background: string;       // scene description or color
}

// -----------------------------------------------------------------------------
// Video Generation (legacy types — see types/video.ts for Video Studio types)
// -----------------------------------------------------------------------------

export type VideoProvider = 'wan' | 'kling' | 'kenburns' | 'wan-2.2-fast' | 'wan-2.5' | 'ltx-video' | 'kling-2.6' | 'minimax-hailuo';
export type MotionType = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'rotate' | 'orbit' | 'custom';

export interface VideoOptions {
  provider: VideoProvider;
  motionType: MotionType;
  duration: number;          // seconds, e.g. 3, 5, 10
  prompt: string;
}

// -----------------------------------------------------------------------------
// Avatar / Talking Head
// -----------------------------------------------------------------------------

export type AvatarProvider = 'sadtalker' | 'wav2lip' | 'musetalk' | 'liveportrait' | 'hedra-free';

export interface AvatarOptions {
  provider: AvatarProvider;
  script: string;
  voice: string;
  language: string;
}

// -----------------------------------------------------------------------------
// Generic API Response
// -----------------------------------------------------------------------------

export interface ApiError {
  code: string;              // e.g. 'RATE_LIMIT', 'INVALID_INPUT', 'PROVIDER_ERROR'
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  cost: number;              // cost in dollars (e.g. 0.05 = five cents)
}
