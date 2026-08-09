// =============================================================================
// Photo Clean Processing Module - UniStudio
// =============================================================================
// Borra textos, precios, títulos y marcas de agua de una foto de proveedor,
// DEJANDO todo lo demás intacto: el producto, el exhibidor, la luz, las sombras
// y el encuadre.
//
// POR QUÉ ES UN PASO PROPIO Y NO "QUITAR FONDO"
// ---------------------------------------------
// Las fotos que llegan del taller ya suelen estar bien tomadas — la pieza sobre
// pedestales blancos, luz cuidada — y lo único que estorba es el texto que le
// pusieron encima para WhatsApp (nombre, precio, marca de agua). Tratar eso como
// "quitar fondo" es el error: un removedor de fondo o conserva todo (rembg dejó
// los pedestales intactos) o se lleva el exhibidor que justamente queríamos
// conservar. Son dos operaciones distintas.
//
// Con esto, el resultado de este paso YA es una foto publicable, sin generar
// ninguna escena nueva.
// =============================================================================

import { runModel, extractOutputUrl, ensureHttpUrl } from '@/lib/api/replicate';

/** Costo por llamada (Flux Kontext Pro en Replicate). */
export const PHOTO_CLEAN_COST = 0.04;

/**
 * Instrucción de borrado.
 *
 * Medido contra la foto real de un rosario (2026-08-09). Se probaron dos
 * redacciones: la corta ("Erase all text… keep everything else identical")
 * dejó una MANCHA GRIS donde estaba el título — borró el texto pero no
 * reconstruyó el fondo. La que ganó es esta: pide explícitamente reconstruir lo
 * que había detrás y encuadra la tarea como retoque, no como rediseño.
 *
 * El bloque CRITICAL no es decorativo: sin él, Kontext reencuadra la pieza y
 * llega a redibujar partes (en una prueba convirtió una medalla religiosa en un
 * broche de langosta).
 */
const CLEAN_PROMPT =
  'Remove every text overlay, caption, price tag, letter and watermark from this photo. ' +
  'Erase the words and reconstruct whatever was behind them so the surface looks continuous and untouched. ' +
  'CRITICAL: this is a retouching task, not a redesign. Do NOT move, resize, restyle or redraw the product. ' +
  'Do NOT change the product, the display stands, the lighting, the shadows, the background colour or the framing. ' +
  'Every pixel that is not text must stay exactly as it is. Output the same photo with the text cleanly gone.';

export interface PhotoCleanResult {
  url: string;
  cost: number;
}

/**
 * Limpia textos y marcas de agua de una foto conservando todo lo demás.
 *
 * `aspectRatio` va en 'match_input_image' por defecto: recortar a 1:1 aquí
 * perdería parte del encuadre original, y este paso existe justamente para NO
 * alterar la foto más allá del texto.
 */
export async function cleanPhoto(
  imageUrl: string,
  options: { extraInstruction?: string; aspectRatio?: string } = {},
): Promise<PhotoCleanResult> {
  const httpUrl = await ensureHttpUrl(imageUrl);

  const prompt = options.extraInstruction
    ? `${CLEAN_PROMPT} ${options.extraInstruction}`
    : CLEAN_PROMPT;

  // Flux Kontext Pro usa `input_image` (NO `image`) y NO acepta `output_format`.
  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: httpUrl,
    prompt,
    aspect_ratio: options.aspectRatio ?? 'match_input_image',
  });

  return { url: await extractOutputUrl(output), cost: PHOTO_CLEAN_COST };
}
