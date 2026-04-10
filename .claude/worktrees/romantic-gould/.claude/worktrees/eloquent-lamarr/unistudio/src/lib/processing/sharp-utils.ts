// =============================================================================
// Sharp Utility Functions
// =============================================================================

import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageFormat = 'png' | 'jpg' | 'webp';

export type FitStrategy = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

/**
 * Resize an image to specified dimensions using Sharp.
 *
 * @param buffer - Source image buffer.
 * @param width  - Target width in pixels.
 * @param height - Target height in pixels.
 * @param fit    - Resize strategy. Defaults to 'inside' (preserve aspect ratio, fit within bounds).
 * @returns Resized image as a Buffer (PNG).
 */
export async function resizeImage(
  buffer: Buffer,
  width: number,
  height: number,
  fit: FitStrategy = 'inside',
): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, height, {
      fit,
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Format Conversion
// ---------------------------------------------------------------------------

/**
 * Convert an image to a specified format with optional quality setting.
 *
 * @param buffer  - Source image buffer.
 * @param format  - Target format: 'png', 'jpg', or 'webp'.
 * @param quality - Output quality (1-100). Applies to jpg and webp. Defaults to 90.
 * @returns Converted image as a Buffer.
 */
export async function convertFormat(
  buffer: Buffer,
  format: ImageFormat,
  quality: number = 90,
): Promise<Buffer> {
  const clampedQuality = Math.max(1, Math.min(100, quality));

  switch (format) {
    case 'png':
      return sharp(buffer)
        .png({ compressionLevel: Math.round((100 - clampedQuality) / 11) })
        .toBuffer();

    case 'jpg':
      return sharp(buffer)
        .jpeg({ quality: clampedQuality, mozjpeg: true })
        .toBuffer();

    case 'webp':
      return sharp(buffer)
        .webp({ quality: clampedQuality })
        .toBuffer();

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/**
 * Retrieve metadata for an image buffer.
 *
 * @param buffer - Source image buffer.
 * @returns Sharp metadata object containing width, height, format, channels, etc.
 */
export async function getImageMetadata(
  buffer: Buffer,
): Promise<sharp.Metadata> {
  return sharp(buffer).metadata();
}

// ---------------------------------------------------------------------------
// Watermark
// ---------------------------------------------------------------------------

/**
 * Add a watermark image onto a source image at a specified position.
 *
 * @param imageBuffer     - Source image buffer.
 * @param watermarkBuffer - Watermark image buffer (should have transparency).
 * @param position        - Watermark placement position. Defaults to 'bottom-right'.
 * @param opacity         - Watermark opacity (0.0 to 1.0). Defaults to 0.5.
 * @param size            - Watermark size as fraction of image width (0.0 to 1.0). Defaults to 0.2.
 * @returns Image buffer with watermark applied (PNG).
 */
export async function addWatermark(
  imageBuffer: Buffer,
  watermarkBuffer: Buffer,
  position: WatermarkPosition = 'bottom-right',
  opacity: number = 0.5,
  size: number = 0.2,
): Promise<Buffer> {
  const imageMeta = await sharp(imageBuffer).metadata();
  const imageWidth = imageMeta.width || 1024;
  const imageHeight = imageMeta.height || 1024;

  // Resize watermark relative to image width
  const targetWatermarkWidth = Math.round(imageWidth * Math.min(1, Math.max(0.01, size)));
  let resizedWatermark = await sharp(watermarkBuffer)
    .resize(targetWatermarkWidth, undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();

  // Apply opacity if less than 1
  if (opacity < 1) {
    const alphaValue = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
    resizedWatermark = await sharp(resizedWatermark)
      .ensureAlpha()
      .composite([
        {
          input: Buffer.from([255, 255, 255, alphaValue]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();
  }

  // Get watermark dimensions after resize
  const wmMeta = await sharp(resizedWatermark).metadata();
  const wmWidth = wmMeta.width || targetWatermarkWidth;
  const wmHeight = wmMeta.height || targetWatermarkWidth;

  // Calculate position with 2% padding from edges
  const padding = Math.round(imageWidth * 0.02);
  const { left, top } = calculateWatermarkPosition(
    imageWidth,
    imageHeight,
    wmWidth,
    wmHeight,
    position,
    padding,
  );

  return sharp(imageBuffer)
    .composite([
      {
        input: resizedWatermark,
        left,
        top,
      },
    ])
    .png()
    .toBuffer();
}

/**
 * Calculate the top-left coordinates for placing a watermark.
 */
function calculateWatermarkPosition(
  imageWidth: number,
  imageHeight: number,
  wmWidth: number,
  wmHeight: number,
  position: WatermarkPosition,
  padding: number,
): { left: number; top: number } {
  let left: number;
  let top: number;

  // Horizontal positioning
  if (position.includes('left')) {
    left = padding;
  } else if (position.includes('right')) {
    left = imageWidth - wmWidth - padding;
  } else {
    // center
    left = Math.round((imageWidth - wmWidth) / 2);
  }

  // Vertical positioning
  if (position.startsWith('top')) {
    top = padding;
  } else if (position.startsWith('bottom')) {
    top = imageHeight - wmHeight - padding;
  } else {
    // center
    top = Math.round((imageHeight - wmHeight) / 2);
  }

  return { left: Math.max(0, left), top: Math.max(0, top) };
}

// ---------------------------------------------------------------------------
// Crop
// ---------------------------------------------------------------------------

/**
 * Crop a rectangular region from an image.
 *
 * @param buffer - Source image buffer.
 * @param left   - Left edge of the crop area in pixels.
 * @param top    - Top edge of the crop area in pixels.
 * @param width  - Width of the crop area in pixels.
 * @param height - Height of the crop area in pixels.
 * @returns Cropped image as a Buffer (PNG).
 */
export async function cropImage(
  buffer: Buffer,
  left: number,
  top: number,
  width: number,
  height: number,
): Promise<Buffer> {
  // Validate inputs
  if (width <= 0 || height <= 0) {
    throw new Error('Crop dimensions must be positive');
  }
  if (left < 0 || top < 0) {
    throw new Error('Crop position must be non-negative');
  }

  // Ensure crop region doesn't exceed image bounds
  const meta = await sharp(buffer).metadata();
  const imgWidth = meta.width || 0;
  const imgHeight = meta.height || 0;

  const clampedLeft = Math.min(left, Math.max(0, imgWidth - 1));
  const clampedTop = Math.min(top, Math.max(0, imgHeight - 1));
  const clampedWidth = Math.min(width, imgWidth - clampedLeft);
  const clampedHeight = Math.min(height, imgHeight - clampedTop);

  if (clampedWidth <= 0 || clampedHeight <= 0) {
    throw new Error(
      `Crop region (${left}, ${top}, ${width}x${height}) is outside image bounds (${imgWidth}x${imgHeight})`,
    );
  }

  return sharp(buffer)
    .extract({
      left: clampedLeft,
      top: clampedTop,
      width: clampedWidth,
      height: clampedHeight,
    })
    .png()
    .toBuffer();
}
