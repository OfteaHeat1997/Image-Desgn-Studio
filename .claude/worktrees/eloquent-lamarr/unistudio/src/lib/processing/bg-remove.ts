// =============================================================================
// Background Removal Processing Module
// =============================================================================

import sharp from 'sharp';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { removeBackgroundWithoutBg } from '@/lib/api/withoutbg';
import { bufferToDataUrl, urlToBuffer } from '@/lib/utils/image';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BgRemoveResult {
  blob?: Blob;
  buffer?: Buffer;
  url?: string;
}

// ---------------------------------------------------------------------------
// Client-side: @imgly/background-removal (runs in the browser)
// See bg-remove-browser.ts for the client-safe version.
// This file imports sharp so it CANNOT be used from client components.
// ---------------------------------------------------------------------------

// Re-export for server-side code that needs the browser function signature
export { removeBgBrowser } from './bg-remove-browser';

// ---------------------------------------------------------------------------
// Server-side: Replicate rembg
// ---------------------------------------------------------------------------

/**
 * Remove background using Replicate's rembg model.
 *
 * @param imageUrl - A publicly accessible URL of the source image.
 * @returns A URL to the resulting transparent-background image.
 */
export async function removeBgReplicate(imageUrl: string): Promise<string> {
  const output = await runModel(
    'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
    { image: imageUrl },
  );

  return extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Server-side: withoutBG Docker (free local background removal)
// ---------------------------------------------------------------------------

/**
 * Remove background using the local withoutBG Docker container.
 *
 * @param imageUrl - A data URL or publicly accessible URL of the source image.
 * @returns A data URL of the resulting transparent-background PNG.
 */
export async function removeBgWithoutBg(imageUrl: string): Promise<string> {
  // Convert input to Buffer
  let buffer: Buffer;
  if (imageUrl.startsWith('data:')) {
    const base64Data = imageUrl.split(',')[1];
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    buffer = await urlToBuffer(imageUrl);
  }

  const resultBuffer = await removeBackgroundWithoutBg(buffer);
  return bufferToDataUrl(resultBuffer, 'image/png');
}

// ---------------------------------------------------------------------------
// Server-side: Buffer-based background removal via Replicate
// ---------------------------------------------------------------------------

/**
 * Remove background from a raw image buffer using Replicate's rembg.
 *
 * @param imageBuffer - Raw image bytes.
 * @returns A Buffer containing the transparent-background PNG.
 */
export async function removeBgBuffer(
  imageBuffer: Buffer,
): Promise<Buffer> {
  // Convert buffer to a data URL so Replicate can accept it
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64}`;

  const resultUrl = await removeBgReplicate(dataUrl);

  // Download the result back as a buffer
  const response = await fetch(resultUrl);
  if (!response.ok) {
    throw new Error(`Failed to download rembg result: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Remove background and return as base64 string (without data URL prefix).
 */
export async function removeBgBase64(
  imageBuffer: Buffer,
): Promise<string> {
  const resultBuffer = await removeBgBuffer(imageBuffer);
  return resultBuffer.toString('base64');
}

// ---------------------------------------------------------------------------
// Server-side: Alpha Channel extraction
// ---------------------------------------------------------------------------

/**
 * Get the alpha channel mask using rembg + sharp.
 * Returns a Buffer containing the grayscale PNG mask.
 */
export async function getAlphaMask(
  imageBuffer: Buffer,
): Promise<Buffer> {
  // First remove background to get a transparent image
  const transparentBuffer = await removeBgBuffer(imageBuffer);

  // Extract the alpha channel as a grayscale image
  return sharp(transparentBuffer)
    .extractChannel(3)
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Post-processing: apply solid background color
// ---------------------------------------------------------------------------

/**
 * Composite a transparent image onto a solid color background.
 * Runs client-side using OffscreenCanvas.
 *
 * @param transparentImageBlob - A Blob of the transparent-background PNG.
 * @param color - A CSS-compatible color string (hex, rgb, named color, etc.).
 * @returns A Blob containing the composited PNG.
 */
export async function applyBackgroundColor(
  transparentImageBlob: Blob,
  color: string,
): Promise<Blob> {
  const bitmap = await createImageBitmap(transparentImageBlob);
  const { width, height } = bitmap;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create OffscreenCanvas 2D context');
  }

  // Draw solid background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  // Draw the transparent image on top
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/png' });
}

// ---------------------------------------------------------------------------
// Post-processing: blurred original background
// ---------------------------------------------------------------------------

/**
 * Composite a sharp foreground (from transparency) over a blurred version
 * of the original image. Runs client-side using OffscreenCanvas.
 *
 * @param originalBlob    - The original image (before background removal).
 * @param transparentBlob - The transparent-background version (foreground only).
 * @param blurAmount      - Gaussian blur radius in pixels (0-100).
 * @returns A Blob containing the composited PNG.
 */
export async function applyBackgroundBlur(
  originalBlob: Blob,
  transparentBlob: Blob,
  blurAmount: number,
): Promise<Blob> {
  const [originalBitmap, transparentBitmap] = await Promise.all([
    createImageBitmap(originalBlob),
    createImageBitmap(transparentBlob),
  ]);

  const { width, height } = originalBitmap;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create OffscreenCanvas 2D context');
  }

  // Draw blurred original as background
  ctx.filter = `blur(${Math.max(0, Math.min(100, blurAmount))}px)`;
  ctx.drawImage(originalBitmap, 0, 0, width, height);

  // Reset filter and draw sharp foreground on top
  ctx.filter = 'none';
  ctx.drawImage(transparentBitmap, 0, 0, width, height);

  originalBitmap.close();
  transparentBitmap.close();

  return canvas.convertToBlob({ type: 'image/png' });
}
