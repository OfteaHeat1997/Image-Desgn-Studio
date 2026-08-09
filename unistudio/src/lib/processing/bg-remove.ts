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

  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Server-side: BiRefNet (fal.ai) — el mejor para joyería
// ---------------------------------------------------------------------------

/**
 * Remove background using BiRefNet on fal.ai.
 *
 * POR QUÉ ESTE Y NO rembg PARA JOYERÍA
 * ------------------------------------
 * Medido el 2026-08-09 sobre la foto real de un rosario (cadena de bolitas +
 * crucifijo + medalla, sobre pedestales blancos y fondo negro). Resultados:
 *
 *   BiRefNet        1.8 s  → rosario completo, cadena entera, crucifijo y
 *                            medalla CON su textura y grabado. Ganador.
 *   Grounded SAM   78.9 s  → agarra la cadena pero blanquea crucifijo y medalla
 *   Bria RMBG 2.0   4.0 s  → conserva los pedestales: no aísla nada
 *   rembg           8.4 s  → conserva toda la escena: no aísla nada
 *   WithoutBG       6.1 s  → cayó al mismo resultado que rembg
 *   remove.bg          —   → HTTP 400 leyendo la imagen
 *
 * Bria gana el benchmark GENERAL (90% vs 85% de BiRefNet) pero pierde en este
 * caso: la calidad del borde depende del tipo de imagen, no del promedio. Por
 * eso la elección está medida y no copiada de un ranking.
 *
 * Funciona tan bien porque corre DESPUÉS de /api/photo-clean: sin los textos
 * encima, el sujeto queda inequívoco.
 *
 * @param imageUrl - data URL o URL pública de la imagen.
 * @returns URL de la imagen con fondo transparente.
 */
export async function removeBgBirefnet(imageUrl: string): Promise<string> {
  const { runFal } = await import('@/lib/api/fal');
  const output = await runFal('fal-ai/birefnet/v2', {
    image_url: imageUrl,
    // "General Use (Heavy)" es el checkpoint más preciso en bordes finos —
    // que en joyería es literalmente el producto (eslabones, aros, cadena).
    model: 'General Use (Heavy)',
    output_format: 'png',
  });

  const url = output?.image?.url ?? output?.images?.[0]?.url ?? output?.url;
  if (typeof url !== 'string') {
    throw new Error('BiRefNet no devolvió una URL de imagen.');
  }
  return url;
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
  const { replicateHeaders } = await import('@/lib/utils/image');
  const response = await fetch(resultUrl, { headers: replicateHeaders(resultUrl) });
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

// Note: Client-side post-processing (solid bg, blur bg) is implemented
// directly in BgRemovePanel.tsx using browser APIs (OffscreenCanvas).
