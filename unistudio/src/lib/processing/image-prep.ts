// =============================================================================
// Image Preparation Helpers
// =============================================================================
// Shared image preprocessing utilities used across pipelines (lingerie,
// static-product, jewelry) before feeding images into try-on / generation
// providers that fail in non-obvious ways on transparent PNGs.
// =============================================================================

import sharp from 'sharp';
import { replicateHeaders } from '@/lib/utils/image';

// ---------------------------------------------------------------------------
// flattenToWhite — collapse alpha to a white background
// ---------------------------------------------------------------------------
// Why this exists:
// - IDM-VTON crashes with NoneType errors when fed a transparent PNG.
// - Kolors does NOT crash, but hallucinates a generic mint tank-top when the
//   alpha channel is non-zero — confirmed in production for ref 011841.
// - Sending a flat JPEG (no alpha) on white background reliably anchors both
//   providers to the actual garment shape.
// ---------------------------------------------------------------------------

export interface FlattenOptions {
  /** Max output dimension; preserves aspect, does not enlarge. Default 1024. */
  maxSize?: number;
  /** JPEG quality 1–100. Default 90. */
  quality?: number;
}

/**
 * Decode a data URL or fetch an HTTP URL into a Buffer of image bytes.
 */
async function urlToImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const m = url.match(/^data:[^;]+;base64,(.+)$/);
    if (!m) throw new Error('Invalid data URL');
    return Buffer.from(m[1], 'base64');
  }
  const res = await fetch(url, { headers: replicateHeaders(url) });
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url.slice(0, 120)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Flatten any input image (data URL or HTTP) to a white-background JPEG data URL.
 * Output is a data URL so callers can hand it to providers that accept either
 * data URLs or HTTP URLs (e.g. fal's ensureFalAccessibleUrl will upload it).
 *
 * Idempotent: re-running on already-flat input is safe (just adds a re-encode).
 */
export async function flattenToWhite(
  url: string,
  options: FlattenOptions = {},
): Promise<string> {
  const { maxSize = 1024, quality = 90 } = options;

  const inputBuffer = await urlToImageBuffer(url);

  const outputBuffer = await sharp(inputBuffer)
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality })
    .toBuffer();

  return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
}

/**
 * Sample the dominant RGB of an image — useful for detecting when bg-remove
 * left a strong color cast (e.g. green pixels around the masked garment).
 */
export async function dominantRgb(url: string): Promise<{ r: number; g: number; b: number } | null> {
  try {
    const buffer = await urlToImageBuffer(url);
    const stats = await sharp(buffer).stats();
    const channels = stats.channels.slice(0, 3);
    if (channels.length < 3) return null;
    return {
      r: Math.round(channels[0].mean),
      g: Math.round(channels[1].mean),
      b: Math.round(channels[2].mean),
    };
  } catch {
    return null;
  }
}
