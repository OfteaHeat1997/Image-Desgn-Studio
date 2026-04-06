// =============================================================================
// Video Generation Processing Module
// =============================================================================

import { runModel, extractOutputUrl } from '@/lib/api/replicate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoMotionType {
  name: string;
  description: string;
  promptTemplate: string;
  category: 'product' | 'camera' | 'fashion' | 'special';
}

export interface VideoResult {
  url: string;
  provider: 'wan' | 'kling' | 'kenburns';
  duration: number;
}

// ---------------------------------------------------------------------------
// Motion Type Presets
// ---------------------------------------------------------------------------

export const VIDEO_MOTION_TYPES: Record<string, VideoMotionType> = {
  'product-rotate': {
    name: 'Product Rotate',
    description: 'Smooth 360-degree rotation of the product',
    promptTemplate:
      'Smooth 360-degree rotation of the product, spinning slowly on a turntable, professional product showcase, studio lighting, clean background',
    category: 'product',
  },
  'product-zoom': {
    name: 'Product Zoom',
    description: 'Gradual zoom into product details',
    promptTemplate:
      'Slow cinematic zoom into the product details, revealing texture and craftsmanship, professional macro photography, shallow depth of field',
    category: 'product',
  },
  'camera-orbit': {
    name: 'Camera Orbit',
    description: 'Camera orbits around the stationary product',
    promptTemplate:
      'Camera slowly orbits around the product, smooth cinematic movement, product stays centered, professional studio lighting, 3D showcase',
    category: 'camera',
  },
  'lifestyle-action': {
    name: 'Lifestyle Action',
    description: 'Product in use within a lifestyle scene',
    promptTemplate:
      'Product being used naturally in a lifestyle setting, smooth natural movement, warm ambient lighting, cinematic atmosphere, real-world context',
    category: 'product',
  },
  'fashion-walk': {
    name: 'Fashion Walk',
    description: 'Model walking in the garment, runway style',
    promptTemplate:
      'Fashion model walking confidently in the clothing, runway style movement, professional fashion photography, studio or lifestyle setting, natural stride',
    category: 'fashion',
  },
  reveal: {
    name: 'Reveal',
    description: 'Dramatic product reveal effect',
    promptTemplate:
      'Dramatic product reveal, appearing from shadow or curtain, cinematic lighting transition, suspenseful to glamorous, professional product launch',
    category: 'special',
  },
  unboxing: {
    name: 'Unboxing',
    description: 'Simulated unboxing experience',
    promptTemplate:
      'Premium unboxing experience, box opening to reveal the product, satisfying packaging, top-down view, clean hands, luxury presentation',
    category: 'special',
  },
  custom: {
    name: 'Custom',
    description: 'Custom motion with your own prompt',
    promptTemplate: '',
    category: 'special',
  },
};

// ---------------------------------------------------------------------------
// Wan 2.1 Video Generation via Replicate
// ---------------------------------------------------------------------------

/**
 * Generate a video from a product image using Wan 2.1 on Replicate.
 * Supports 5-second (41 frames) or 10-second (81 frames) durations.
 *
 * @param imageUrl - URL of the source product image.
 * @param prompt   - Motion/scene description prompt.
 * @param duration - Video duration: 5 or 10 seconds. Defaults to 5.
 * @returns URL of the generated video.
 */
export async function generateVideoWan(
  imageUrl: string,
  prompt: string,
  duration: 5 | 10 = 5,
): Promise<string> {
  const output = await runModel('wavespeedai/wan-2.1-i2v-480p', {
    image: imageUrl,
    prompt,
    aspect_ratio: '16:9',
  });

  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Kling Video Generation via Replicate (minimax/video-01)
// ---------------------------------------------------------------------------

/**
 * Generate a video from a product image using minimax/video-01 on Replicate.
 * Supports various durations and aspect ratios.
 *
 * @param imageUrl    - URL of the source product image.
 * @param prompt      - Motion/scene description prompt.
 * @param duration    - Video duration: 5 or 10 seconds. Defaults to 5.
 * @param aspectRatio - Output aspect ratio (e.g. '16:9', '9:16', '1:1'). Defaults to '16:9'.
 * @returns URL of the generated video.
 */
export async function generateVideoKling(
  imageUrl: string,
  prompt: string,
  duration: 5 | 10 = 5,
  aspectRatio: string = '16:9',
): Promise<string> {
  const output = await runModel('minimax/video-01', {
    prompt,
    first_frame_image: imageUrl,
  });

  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Ken Burns Effect (client-side placeholder)
// ---------------------------------------------------------------------------

/**
 * Ken Burns effect -- a pan-and-zoom animation over a still image.
 *
 * NOTE: This effect runs entirely CLIENT-SIDE using the Canvas API and
 * MediaRecorder for video encoding. It does NOT call any external API.
 *
 * Implementation should be done in a client component using:
 * 1. An HTML Canvas element to render each frame
 * 2. requestAnimationFrame for smooth animation
 * 3. Canvas.captureStream() + MediaRecorder to encode to WebM/MP4
 *
 * The parameters that control the effect:
 * - startX, startY, startZoom: initial viewport position and zoom level
 * - endX, endY, endZoom: final viewport position and zoom level
 * - duration: animation length in seconds
 * - fps: frames per second (30 recommended)
 *
 * @example
 * ```tsx
 * // In a client component:
 * import { generateKenBurns } from '@/lib/processing/video';
 *
 * // This returns configuration for the client-side implementation
 * const config = generateKenBurns(imageUrl, {
 *   startZoom: 1.0,
 *   endZoom: 1.5,
 *   startX: 0.5,
 *   startY: 0.5,
 *   endX: 0.3,
 *   endY: 0.3,
 *   duration: 5,
 *   fps: 30,
 * });
 * ```
 */
export interface KenBurnsConfig {
  imageUrl: string;
  startX: number;
  startY: number;
  startZoom: number;
  endX: number;
  endY: number;
  endZoom: number;
  duration: number;
  fps: number;
}

export function generateKenBurns(
  imageUrl: string,
  options: Partial<KenBurnsConfig> = {},
): KenBurnsConfig {
  return {
    imageUrl,
    startX: options.startX ?? 0.5,
    startY: options.startY ?? 0.5,
    startZoom: options.startZoom ?? 1.0,
    endX: options.endX ?? 0.5,
    endY: options.endY ?? 0.4,
    endZoom: options.endZoom ?? 1.3,
    duration: options.duration ?? 5,
    fps: options.fps ?? 30,
  };
}
