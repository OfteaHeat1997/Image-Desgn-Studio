// =============================================================================
// Image Upscaling Processing Module
// =============================================================================

import { runModel, extractOutputUrl } from '@/lib/api/replicate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpscaleResult {
  url: string;
  scale: number;
  provider: 'real-esrgan' | 'clarity' | 'aura-sr';
}

// ---------------------------------------------------------------------------
// Real-ESRGAN via Replicate
// ---------------------------------------------------------------------------

/**
 * Upscale an image using Real-ESRGAN on Replicate.
 * Excellent for general-purpose super-resolution with optional face enhancement.
 *
 * @param imageUrl     - A publicly accessible URL of the source image.
 * @param scale        - Upscale factor: 2x or 4x.
 * @param faceEnhance  - Whether to apply face enhancement (GFPGAN). Defaults to false.
 * @returns URL of the upscaled image.
 */
export async function upscaleRealEsrgan(
  imageUrl: string,
  scale: 2 | 4 = 4,
  faceEnhance: boolean = false,
): Promise<string> {
  const output = await runModel(
    'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
    {
      image: imageUrl,
      scale,
      face_enhance: faceEnhance,
    },
  );

  return extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Clarity Upscaler via Replicate (prompt-guided)
// ---------------------------------------------------------------------------

/**
 * Upscale an image using the Clarity Upscaler on Replicate.
 * Supports prompt-guided enhancement for better detail restoration.
 *
 * @param imageUrl - A publicly accessible URL of the source image.
 * @param scale    - Upscale factor (typically 2-4).
 * @param prompt   - Optional text prompt to guide the upscaling process.
 * @returns URL of the upscaled image.
 */
export async function upscaleClarity(
  imageUrl: string,
  scale: number = 2,
  prompt?: string,
): Promise<string> {
  const input: Record<string, any> = {
    image: imageUrl,
    scale_factor: scale,
    resemblance: 0.6,
    creativity: 0.35,
    output_format: 'png',
  };

  if (prompt) {
    input.prompt = prompt;
  }

  const output = await runModel('philz1337x/clarity-upscaler', input);

  return extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Aura SR via Replicate (4x upscale)
// ---------------------------------------------------------------------------

/**
 * Upscale an image 4x using Aura SR on Replicate.
 * Fast and high-quality super-resolution without prompting.
 *
 * @param imageUrl - A publicly accessible URL of the source image.
 * @returns URL of the 4x upscaled image.
 */
export async function upscaleAuraSr(imageUrl: string): Promise<string> {
  const output = await runModel('fofr/aura-sr', {
    image: imageUrl,
  });

  return extractOutputUrl(output);
}
