// =============================================================================
// Brand Kit Utilities - UniStudio
// Apply watermarks and generate brand-consistent backgrounds.
// =============================================================================

import type { BrandKit } from '@/types/brand';
import sharp from 'sharp';

// -----------------------------------------------------------------------------
// Watermark application
// -----------------------------------------------------------------------------

/**
 * Apply a watermark from the brand kit to an image buffer.
 *
 * Downloads the watermark image from `brandKit.watermark.imageUrl`, resizes it
 * according to `brandKit.watermark.size` (as a percentage of the base image width),
 * applies the configured opacity, and composites it onto the base image at the
 * configured position.
 *
 * @param imageBuffer - The base image as a Buffer (any format sharp supports).
 * @param brandKit - The brand kit configuration containing watermark settings.
 * @returns A new Buffer with the watermark applied (PNG format).
 *
 * @example
 * ```ts
 * import { applyWatermark } from '@/lib/brand/brand-kit';
 *
 * const result = await applyWatermark(originalBuffer, myBrandKit);
 * ```
 */
export async function applyWatermark(
  imageBuffer: Buffer,
  brandKit: BrandKit,
): Promise<Buffer> {
  const { watermark } = brandKit;

  // If watermark is disabled or no image URL, return original
  if (!watermark.enabled || !watermark.imageUrl) {
    return imageBuffer;
  }

  // Get the base image metadata for sizing calculations
  const baseImage = sharp(imageBuffer);
  const metadata = await baseImage.metadata();
  const baseWidth = metadata.width ?? 1024;
  const baseHeight = metadata.height ?? 1024;

  // Fetch the watermark image
  const watermarkResponse = await fetch(watermark.imageUrl);
  if (!watermarkResponse.ok) {
    console.warn(
      `[applyWatermark] Failed to fetch watermark image: ${watermarkResponse.status}`,
    );
    return imageBuffer;
  }
  const watermarkArrayBuffer = await watermarkResponse.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let watermarkBuffer: any = Buffer.from(watermarkArrayBuffer);

  // Resize watermark to the configured percentage of base image width
  const watermarkWidth = Math.round(baseWidth * (watermark.size / 100));
  watermarkBuffer = await sharp(watermarkBuffer)
    .resize(watermarkWidth, null, { fit: 'inside', withoutEnlargement: false })
    .ensureAlpha()
    .toBuffer();

  // Apply opacity to the watermark
  if (watermark.opacity < 1) {
    // Use linear to scale alpha channel
    const opacity = Math.max(0, Math.min(1, watermark.opacity));
    watermarkBuffer = await sharp(watermarkBuffer)
      .composite([
        {
          input: Buffer.from([0, 0, 0, Math.round(opacity * 255)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in',
        },
      ])
      .toBuffer();
  }

  // Get watermark dimensions after resize
  const wmMeta = await sharp(watermarkBuffer).metadata();
  const wmWidth = wmMeta.width ?? watermarkWidth;
  const wmHeight = wmMeta.height ?? watermarkWidth;

  // Calculate position based on watermark.position
  const padding = Math.round(baseWidth * 0.02); // 2% padding from edges
  let left: number;
  let top: number;

  switch (watermark.position) {
    case 'top-left':
      left = padding;
      top = padding;
      break;
    case 'top-center':
      left = Math.round((baseWidth - wmWidth) / 2);
      top = padding;
      break;
    case 'top-right':
      left = baseWidth - wmWidth - padding;
      top = padding;
      break;
    case 'center':
      left = Math.round((baseWidth - wmWidth) / 2);
      top = Math.round((baseHeight - wmHeight) / 2);
      break;
    case 'bottom-left':
      left = padding;
      top = baseHeight - wmHeight - padding;
      break;
    case 'bottom-center':
      left = Math.round((baseWidth - wmWidth) / 2);
      top = baseHeight - wmHeight - padding;
      break;
    case 'bottom-right':
    default:
      left = baseWidth - wmWidth - padding;
      top = baseHeight - wmHeight - padding;
      break;
  }

  // Ensure non-negative positions
  left = Math.max(0, left);
  top = Math.max(0, top);

  // Composite watermark onto the base image
  const result = await sharp(imageBuffer)
    .composite([
      {
        input: watermarkBuffer,
        left,
        top,
        blend: 'over',
      },
    ])
    .png()
    .toBuffer();

  return result;
}

// -----------------------------------------------------------------------------
// Brand-consistent background prompt generation
// -----------------------------------------------------------------------------

/**
 * Generate a background prompt incorporating the brand kit's colors and style.
 *
 * Uses the brand's primary, secondary, and accent colors along with the
 * default background style to create a prompt for AI background generation.
 *
 * @param brandKit - The brand kit configuration.
 * @returns A prompt string suitable for AI background generation.
 *
 * @example
 * ```ts
 * const prompt = generateBrandedBackground(myBrandKit);
 * // "Professional product photography background in brand colors (#000000 primary, #ffffff secondary, #3b82f6 accent), studio-white style, ..."
 * ```
 */
export function generateBrandedBackground(brandKit: BrandKit): string {
  const { colors, defaultBgStyle } = brandKit;

  const colorDescription = `brand colors (${colors.primary} primary, ${colors.secondary} secondary, ${colors.accent} accent)`;

  const styleDescriptions: Record<string, string> = {
    'studio-white':
      'clean white studio backdrop with professional lighting',
    'studio-gray':
      'neutral gray studio backdrop with even diffused lighting',
    'studio-black':
      'premium dark studio backdrop with dramatic rim lighting',
    'brand-gradient':
      `smooth gradient using brand colors from ${colors.primary} to ${colors.secondary}`,
    'outdoor-natural':
      'natural outdoor setting with soft golden hour lighting',
    'minimal-modern':
      'minimalist modern setting with clean lines and neutral tones',
  };

  const styleDesc =
    styleDescriptions[defaultBgStyle] ?? defaultBgStyle ?? 'professional studio lighting';

  return `Professional product photography background in ${colorDescription}, ${styleDesc}, commercial quality, high resolution, color accurate, consistent with brand identity`;
}
