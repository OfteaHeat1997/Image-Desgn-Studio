// =============================================================================
// Shadows & Lighting Processing Module
// =============================================================================

import sharp from 'sharp';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DropShadowOptions {
  offsetX: number;  // pixels, positive = right
  offsetY: number;  // pixels, positive = down
  blur: number;     // gaussian blur radius in pixels (0-100)
  opacity: number;  // 0.0 to 1.0
  color: string;    // hex color (e.g. '#000000')
}

export interface ContactShadowOptions {
  spread: number;   // horizontal spread as fraction of image width (0.1-1.0)
  opacity: number;  // 0.0 to 1.0
  blur: number;     // gaussian blur radius in pixels (0-100)
}

export interface ReflectionOptions {
  opacity: number;  // 0.0 to 1.0
  blur: number;     // gaussian blur radius in pixels (0-50)
  height: number;   // reflection height as fraction of original (0.1-1.0)
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

/**
 * Parse a hex color string to RGB values (0-255).
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// ---------------------------------------------------------------------------
// Drop Shadow
// ---------------------------------------------------------------------------

/**
 * Add a drop shadow behind the product image.
 *
 * Creates an expanded canvas, renders the shadow (offset + blur), then
 * composites the original image on top.
 *
 * @param imageBuffer - The source image buffer (should have transparent background).
 * @param options     - Shadow configuration.
 * @returns A Buffer containing the image with drop shadow (PNG).
 */
export async function addDropShadow(
  imageBuffer: Buffer,
  options: DropShadowOptions,
): Promise<Buffer> {
  const { offsetX, offsetY, blur, opacity, color } = options;
  const { r, g, b } = parseHexColor(color);

  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 512;
  const height = meta.height || 512;

  // Expand the canvas to accommodate shadow offset and blur
  const padding = Math.ceil(blur * 2) + Math.max(Math.abs(offsetX), Math.abs(offsetY));
  const canvasWidth = width + padding * 2;
  const canvasHeight = height + padding * 2;

  // Create the shadow layer: extract alpha from original, tint with shadow color
  const alphaChannel = await sharp(imageBuffer)
    .ensureAlpha()
    .extractChannel(3)
    .toBuffer();

  // Create a colored shadow from the alpha mask
  const shadowLayer = await sharp(alphaChannel)
    .joinChannel([
      // Create a 3-channel tinted image from the alpha
      alphaChannel, alphaChannel,
    ])
    .toColorspace('b-w')
    .tint({ r, g, b })
    .ensureAlpha()
    .toBuffer();

  // Apply opacity to shadow
  const shadowWithOpacity = await sharp(shadowLayer)
    .composite([
      {
        input: Buffer.from([0, 0, 0, Math.round(opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      },
    ])
    .toBuffer();

  // Apply blur to shadow
  const blurredShadow = blur > 0
    ? await sharp(shadowWithOpacity)
        .blur(Math.max(0.3, blur))
        .toBuffer()
    : shadowWithOpacity;

  // Create the final canvas
  const canvas = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  return canvas
    .composite([
      // Shadow layer (offset from center)
      {
        input: blurredShadow,
        left: padding + offsetX,
        top: padding + offsetY,
      },
      // Original image (centered)
      {
        input: imageBuffer,
        left: padding,
        top: padding,
      },
    ])
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Contact Shadow
// ---------------------------------------------------------------------------

/**
 * Add an elliptical contact shadow below the product.
 *
 * Creates an SVG ellipse shadow, blurs it, and composites it beneath
 * the product image.
 *
 * @param imageBuffer - The source image buffer.
 * @param options     - Shadow configuration.
 * @returns A Buffer containing the image with contact shadow (PNG).
 */
export async function addContactShadow(
  imageBuffer: Buffer,
  options: ContactShadowOptions,
): Promise<Buffer> {
  const { spread, opacity, blur } = options;

  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 512;
  const height = meta.height || 512;

  // Calculate shadow dimensions
  const shadowWidth = Math.round(width * Math.min(1, Math.max(0.1, spread)));
  const shadowHeight = Math.round(shadowWidth * 0.15); // Flatten for contact effect
  const shadowPadding = Math.ceil(blur * 2) + shadowHeight;

  const canvasWidth = width;
  const canvasHeight = height + shadowPadding;

  // Create elliptical shadow as SVG
  const cx = Math.round(canvasWidth / 2);
  const cy = canvasHeight - Math.round(shadowPadding / 2);
  const rx = Math.round(shadowWidth / 2);
  const ry = Math.round(shadowHeight / 2);
  const alphaHex = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');

  const shadowSvg = Buffer.from(
    `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000000${alphaHex}" />
    </svg>`,
  );

  // Blur the shadow SVG
  let shadowBuffer = await sharp(shadowSvg).png().toBuffer();
  if (blur > 0) {
    shadowBuffer = await sharp(shadowBuffer)
      .blur(Math.max(0.3, blur))
      .png()
      .toBuffer();
  }

  // Create transparent canvas and composite shadow + image
  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      // Shadow ellipse
      { input: shadowBuffer, left: 0, top: 0 },
      // Original image at the top
      { input: imageBuffer, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Reflection
// ---------------------------------------------------------------------------

/**
 * Add a reflection effect below the product.
 *
 * Flips the image vertically, applies a gradient fade, and composites
 * it below the original.
 *
 * @param imageBuffer - The source image buffer.
 * @param options     - Reflection configuration.
 * @returns A Buffer containing the image with reflection (PNG).
 */
export async function addReflection(
  imageBuffer: Buffer,
  options: ReflectionOptions,
): Promise<Buffer> {
  const { opacity, blur: reflectionBlur, height: heightFraction } = options;

  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 512;
  const height = meta.height || 512;

  const reflectionHeight = Math.round(height * Math.min(1, Math.max(0.1, heightFraction)));

  // Create flipped version
  const flipped = await sharp(imageBuffer)
    .flip() // vertical flip
    .resize(width, reflectionHeight, { fit: 'cover', position: 'top' })
    .toBuffer();

  // Create gradient mask for fade effect (top = opaque, bottom = transparent)
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

  // Apply gradient mask to flipped image
  let reflection = await sharp(flipped)
    .ensureAlpha()
    .composite([
      {
        input: gradientMask,
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  // Apply optional blur
  if (reflectionBlur > 0) {
    reflection = await sharp(reflection)
      .blur(Math.max(0.3, reflectionBlur))
      .png()
      .toBuffer();
  }

  // Compose final canvas: original on top, reflection below with a small gap
  const gap = 4;
  const totalHeight = height + gap + reflectionHeight;

  return sharp({
    create: {
      width,
      height: totalHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: imageBuffer, left: 0, top: 0 },
      { input: reflection, left: 0, top: height + gap },
    ])
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// AI Relighting: IC-Light via Replicate
// ---------------------------------------------------------------------------

/**
 * Relight a product image using IC-Light on Replicate.
 * Uses diffusion-based relighting with a text prompt describing the desired lighting.
 *
 * @param imageUrl       - A publicly accessible URL of the product image.
 * @param lightingPrompt - Text description of the desired lighting (e.g. "warm golden hour sunlight from the left").
 * @returns URL of the relit image.
 */
export async function relightIcLight(
  imageUrl: string,
  lightingPrompt: string,
): Promise<string> {
  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: imageUrl,
    prompt: lightingPrompt + ' Keep the product exactly the same, only change the lighting and shadows.',
    output_format: 'png',
  });

  return extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// AI Relighting: Flux Kontext Pro
// ---------------------------------------------------------------------------

/**
 * Relight a product image using Flux Kontext Pro on Replicate.
 * Uses instruction-based editing to change the lighting while preserving the product.
 *
 * @param imageUrl             - A publicly accessible URL of the product image.
 * @param lightingDescription  - Text instruction describing the lighting change.
 * @returns URL of the relit image.
 */
export async function relightKontext(
  imageUrl: string,
  lightingDescription: string,
): Promise<string> {
  const prompt = `Change the lighting to: ${lightingDescription}. Keep the product/subject EXACTLY the same. Only modify the lighting, shadows, and reflections.`;

  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: imageUrl,
    prompt,
    output_format: 'png',
  });

  return extractOutputUrl(output);
}
