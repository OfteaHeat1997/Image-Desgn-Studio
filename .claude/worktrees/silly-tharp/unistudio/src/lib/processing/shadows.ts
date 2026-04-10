// =============================================================================
// Shadows & Lighting Processing Module
// Single source of truth for all shadow operations.
// Used by: /api/shadows/route.ts
// =============================================================================

import sharp from 'sharp';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DropShadowOptions {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread?: number;
  color: string;
  opacity: number;
}

export interface ContactShadowOptions {
  blur: number;
  opacity: number;
  distance: number;
  color: string;
}

export interface ReflectionOptions {
  opacity: number;
  blur: number;
  distance?: number;
  fade: number;
}

export interface LightingPreset {
  name: string;
  description: string;
  prompt: string;
  category: 'studio' | 'natural' | 'dramatic' | 'special';
}

// ---------------------------------------------------------------------------
// Lighting Presets
// ---------------------------------------------------------------------------

export const LIGHTING_PRESETS: Record<string, LightingPreset> = {
  'studio-soft': {
    name: 'Studio Soft',
    description: 'Soft, diffused studio lighting with minimal shadows',
    prompt: 'soft diffused studio lighting, even illumination, gentle shadows, professional product photography lighting, softbox lighting',
    category: 'studio',
  },
  'studio-dramatic': {
    name: 'Studio Dramatic',
    description: 'High-contrast studio lighting with strong shadows',
    prompt: 'dramatic studio lighting, strong directional light, deep shadows, high contrast, chiaroscuro, professional photography',
    category: 'studio',
  },
  'natural-daylight': {
    name: 'Natural Daylight',
    description: 'Bright, clean natural daylight',
    prompt: 'natural daylight illumination, bright and clean lighting, window light, soft natural shadows, daytime indoor lighting',
    category: 'natural',
  },
  'golden-hour': {
    name: 'Golden Hour',
    description: 'Warm golden sunset lighting',
    prompt: 'golden hour warm sunlight, amber glow, long soft shadows, sunset lighting, warm color temperature, romantic atmosphere',
    category: 'natural',
  },
  'blue-hour': {
    name: 'Blue Hour',
    description: 'Cool blue twilight lighting',
    prompt: 'blue hour cool lighting, twilight atmosphere, soft blue tones, calm and serene, dusk illumination, cool color temperature',
    category: 'natural',
  },
  spotlight: {
    name: 'Spotlight',
    description: 'Focused spotlight with dark surroundings',
    prompt: 'focused spotlight illumination, dark background, pool of light, dramatic product spotlight, theatrical lighting, vignette',
    category: 'dramatic',
  },
  'ring-light': {
    name: 'Ring Light',
    description: 'Even ring light illumination popular in beauty photography',
    prompt: 'ring light illumination, circular catchlights, even frontal lighting, beauty photography lighting, no harsh shadows',
    category: 'studio',
  },
  backlit: {
    name: 'Backlit',
    description: 'Silhouette-style backlighting with rim glow',
    prompt: 'backlit illumination, rim lighting, glowing edges, halo effect, light behind subject, silhouette glow, dramatic backlight',
    category: 'dramatic',
  },
  neon: {
    name: 'Neon',
    description: 'Colorful neon-style lighting with vibrant colors',
    prompt: 'neon lighting, vibrant colored lights, pink blue purple neon glow, cyberpunk atmosphere, colorful reflections, urban night',
    category: 'special',
  },
  candlelight: {
    name: 'Candlelight',
    description: 'Warm, flickering candlelight ambiance',
    prompt: 'warm candlelight illumination, flickering flame, soft warm glow, intimate atmosphere, orange warm tones, cozy lighting',
    category: 'special',
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.substring(0, 2), 16) || 0,
    g: parseInt(cleaned.substring(2, 4), 16) || 0,
    b: parseInt(cleaned.substring(4, 6), 16) || 0,
  };
}

// ---------------------------------------------------------------------------
// Drop Shadow
// ---------------------------------------------------------------------------

export async function addDropShadow(
  imageBuffer: Buffer,
  options: DropShadowOptions,
): Promise<Buffer> {
  const { offsetX, offsetY, blur, opacity, color } = options;
  const { r, g, b } = parseHexColor(color);

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  const blurPad = Math.ceil(blur * 0.5);
  const padding = blurPad + Math.max(Math.abs(offsetX), Math.abs(offsetY));
  const canvasWidth = width + padding * 2;
  const canvasHeight = height + padding * 2;

  // Extract alpha → shadow alpha
  const alphaMask = await sharp(imageBuffer)
    .ensureAlpha()
    .extractChannel(3)
    .linear(opacity, 0)
    .toBuffer();

  // Shadow: solid color + alpha mask
  const shadowLayer = await sharp({
    create: { width, height, channels: 3, background: { r, g, b } },
  })
    .joinChannel(alphaMask)
    .png()
    .toBuffer();

  // Blur
  const blurredShadow = blur > 0
    ? await sharp(shadowLayer).blur(Math.max(0.3, blur)).png().toBuffer()
    : shadowLayer;

  // Composite: shadow behind, original on top
  return sharp({
    create: { width: canvasWidth, height: canvasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: blurredShadow, left: Math.max(0, padding + offsetX), top: Math.max(0, padding + offsetY) },
      { input: imageBuffer, left: padding, top: padding },
    ])
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Contact Shadow
// ---------------------------------------------------------------------------

export async function addContactShadow(
  imageBuffer: Buffer,
  options: ContactShadowOptions,
): Promise<Buffer> {
  const { blur, opacity, distance, color } = options;
  const { r, g, b } = parseHexColor(color);

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  const spreadFrac = Math.max(0.3, distance / 100);
  const shadowWidth = Math.round(width * spreadFrac);
  const shadowHeight = Math.round(shadowWidth * 0.12);
  const gap = Math.round(shadowHeight * 0.5);
  const canvasHeight = height + shadowHeight + gap;

  const cx = Math.round(width / 2);
  const cy = height + Math.round(gap / 2);
  const rx = Math.round(shadowWidth / 2);
  const ry = Math.round(shadowHeight / 2);
  const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0');

  const shadowSvg = Buffer.from(
    `<svg width="${width}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}${alphaHex}" />
    </svg>`,
  );

  let shadowBuffer = await sharp(shadowSvg).png().toBuffer();
  if (blur > 0) {
    shadowBuffer = await sharp(shadowBuffer).blur(Math.max(0.3, blur)).png().toBuffer();
  }

  return sharp({
    create: { width, height: canvasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadowBuffer, left: 0, top: 0 },
      { input: imageBuffer, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Reflection
// ---------------------------------------------------------------------------

export async function addReflection(
  imageBuffer: Buffer,
  options: ReflectionOptions,
): Promise<Buffer> {
  const { opacity, blur, fade } = options;

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  const reflectionHeight = Math.round(height * Math.max(0.1, 1 - fade));

  // Flip vertically and crop
  const flipped = await sharp(imageBuffer)
    .flip()
    .resize(width, reflectionHeight, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  // Gradient mask: opaque at top, transparent at bottom
  const gradientSvg = Buffer.from(
    `<svg width="${width}" height="${reflectionHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="${opacity}" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${reflectionHeight}" fill="url(#fade)" />
    </svg>`,
  );
  const gradientMask = await sharp(gradientSvg).png().toBuffer();

  // Apply mask
  let reflection = await sharp(flipped)
    .ensureAlpha()
    .composite([{ input: gradientMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Optional blur
  if (blur > 0) {
    reflection = await sharp(reflection).blur(Math.max(0.3, blur)).png().toBuffer();
  }

  // Compose: original + reflection below
  const gap = 4;
  const canvasHeight = height + gap + reflectionHeight;

  return sharp({
    create: { width, height: canvasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: imageBuffer, left: 0, top: 0 },
      { input: reflection, left: 0, top: height + gap },
    ])
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// AI Relighting — IC-Light (dedicated relighting model)
// ---------------------------------------------------------------------------

/**
 * Relight an image using the IC-Light model, a dedicated relighting specialist.
 * Better at physically-accurate lighting changes than general-purpose models.
 * Cost: ~$0.04 via Replicate.
 */
export async function relightIcLight(
  imageUrl: string,
  lightingPrompt: string,
): Promise<string> {
  const output = await runModel(
    'zsxkib/ic-light:d41bcb1066bb350981ef938837b1f84e28f8d0f2da8619821fa18e3af1a3f790',
    {
      prompt: lightingPrompt,
      image: imageUrl,
      steps: 25,
      cfg_scale: 2.0,
      light_source: 'None',
      highres_scale: 1.5,
      lowres_denoise: 0.95,
      highres_denoise: 0.5,
      bg_source: 'None',
    },
  );
  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// AI Relighting — Flux Kontext Pro (instruction-based)
// ---------------------------------------------------------------------------

/**
 * Relight an image using Flux Kontext Pro with instruction-based prompting.
 * More flexible for creative lighting changes, less physically-accurate.
 * Cost: ~$0.05 via Replicate.
 */
export async function relightKontext(
  imageUrl: string,
  lightingPrompt: string,
): Promise<string> {
  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: imageUrl,
    prompt: lightingPrompt + ' Keep the product exactly the same, only change the lighting and shadows.',
    output_format: 'png',
  });
  return await extractOutputUrl(output);
}
