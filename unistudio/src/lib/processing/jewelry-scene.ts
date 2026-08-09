// =============================================================================
// Jewelry Scene — escena de lujo SIN que la IA toque el producto
// =============================================================================
// EL PROBLEMA QUE RESUELVE
// -----------------------
// Los pasos 1 a 3 respetaban la pieza porque casi no la tocan: limpiar borra
// texto, recortar no genera nada y el packshot la pone sobre blanco liso. Del
// paso 4 en adelante, en cambio, Kontext tiene que REDIBUJAR la joya dentro de
// una escena compleja — y ahí la reinterpreta. Medido sobre el rosario:
// duplicaba el crucifijo, perdía la medalla, cambiaba el tamaño y la separación
// de las cuentas, y le agregaba circonias que no tiene.
//
// Ningún prompt arregla eso del todo, porque el modelo está GENERANDO la joya
// cada vez.
//
// LA SOLUCIÓN
// -----------
// Invertir el orden: la IA genera SOLO el decorado (sin producto), y encima se
// pegan los píxeles REALES del recorte con sharp. La pieza no puede cambiar
// porque nunca entra al modelo de imagen. Es el mismo principio por el que el
// detalle macro sí respeta el producto.
//
//   antes:  recorte + prompt -> Kontext redibuja todo      -> cambia la pieza
//   ahora:  prompt -> Kontext genera el decorado vacío
//                  -> sharp pega el recorte real encima     -> imposible que cambie
//
// El costo de esto es que la joya no recibe la luz de la escena. Se compensa con
// una sombra de contacto sintética debajo, que es lo que delata un recorte pegado.
// =============================================================================

import sharp from 'sharp';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { urlToBuffer } from '@/lib/utils/image';

export const JEWELRY_SCENE_COST = 0.04;

export interface JewelrySceneOptions {
  /** Prompt del DECORADO (sin la joya). */
  backdropPrompt: string;
  /** Proporción de salida. 4:5 por defecto — es el formato de Instagram. */
  aspectRatio?: '1:1' | '4:5' | '3:4';
  /** Qué fracción del lienzo ocupa la pieza. 0.62 deja espacio negativo. */
  productScale?: number;
  /** Sombra de contacto bajo la pieza, para que no se vea pegada. */
  shadow?: boolean;
}

const CANVAS: Record<NonNullable<JewelrySceneOptions['aspectRatio']>, [number, number]> = {
  '1:1': [1200, 1200],
  '4:5': [1080, 1350],
  '3:4': [1080, 1440],
};

/**
 * Genera el decorado y compone encima el recorte real del producto.
 *
 * @param productUrl PNG con fondo transparente (salida del paso "Recortar").
 */
export async function composeJewelryScene(
  productUrl: string,
  options: JewelrySceneOptions,
): Promise<{ dataUrl: string; cost: number }> {
  const [W, H] = CANVAS[options.aspectRatio ?? '4:5'];
  const scale = Math.min(Math.max(options.productScale ?? 0.62, 0.25), 0.9);

  // 1. Decorado SIN producto. Flux Schnell alcanza y es barato: no tiene que
  //    preservar nada, solo pintar una superficie con luz. Se refuerza el
  //    "sin joya" porque el modelo tiende a rellenar el centro vacío.
  const backdropPrompt =
    `${options.backdropPrompt}. Empty scene, no jewelry, no product, no accessories, ` +
    `nothing in the center of the frame, professional product photography backdrop, ` +
    `no text, no watermark`;

  const bgOut = await runModel('black-forest-labs/flux-schnell', {
    prompt: backdropPrompt,
    aspect_ratio: options.aspectRatio ?? '4:5',
    num_outputs: 1,
  });
  const bgUrl = await extractOutputUrl(bgOut);

  const [bgBuf, productBuf] = await Promise.all([
    urlToBuffer(bgUrl),
    urlToBuffer(productUrl),
  ]);

  // El recorte TIENE que traer canal alfa. Si llega aplanado (p. ej. si pasó por
  // un proxy que lo reencodeó a JPEG), componerlo pega un rectángulo opaco sobre
  // la escena en vez de la silueta — se ve como un recuadro gris alrededor de la
  // pieza. Se avisa en el log para poder distinguirlo de un problema de prompt.
  const productMeta = await sharp(productBuf).metadata();
  if (!productMeta.hasAlpha) {
    console.warn(
      '[jewelry-scene] el recorte llegó SIN transparencia: la pieza se va a pegar como rectángulo. ' +
        'Revisar que la URL del paso "Recortar" no pase por un reencode.',
    );
  }

  // 2. El recorte, recortado a su contenido real: un PNG aislado suele traer
  //    mucho margen transparente, y sin quitarlo la pieza queda diminuta.
  let trimmed: Buffer;
  try {
    trimmed = await sharp(productBuf).trim({ threshold: 2 }).png().toBuffer();
  } catch {
    trimmed = await sharp(productBuf).png().toBuffer();
  }

  const product = await sharp(trimmed)
    .resize(Math.round(W * scale), Math.round(H * scale), {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const pm = await sharp(product).metadata();
  const pw = pm.width ?? Math.round(W * scale);
  const ph = pm.height ?? Math.round(H * scale);
  const left = Math.round((W - pw) / 2);
  // Ligeramente por debajo del centro óptico: una pieza centrada exacta se ve
  // caída en un lienzo vertical.
  const top = Math.round((H - ph) * 0.46);

  const layers: sharp.OverlayOptions[] = [];

  // 3. Sombra de contacto. Sin ella el recorte se ve calcado sobre el fondo.
  if (options.shadow !== false) {
    const shadow = await sharp(product)
      .extractChannel('alpha')
      .blur(18)
      .toBuffer()
      .then((mask) =>
        sharp({
          create: {
            width: pw,
            height: ph,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0.42 },
          },
        })
          .composite([{ input: mask, blend: 'dest-in' }])
          .png()
          .toBuffer(),
      );
    layers.push({ input: shadow, left, top: top + Math.round(ph * 0.035) });
  }

  layers.push({ input: product, left, top });

  const composed = await sharp(bgBuf)
    .resize(W, H, { fit: 'cover' })
    .composite(layers)
    .jpeg({ quality: 93 })
    .toBuffer();

  return {
    dataUrl: `data:image/jpeg;base64,${composed.toString('base64')}`,
    cost: JEWELRY_SCENE_COST,
  };
}
