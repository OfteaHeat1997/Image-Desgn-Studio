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
  /** Prompt del DECORADO (sin la joya). Ignorado si viene `solidBackground`. */
  backdropPrompt: string;
  /**
   * 'luxury' dibuja el barrido de estudio en vez de generarlo. Es el modo por
   * defecto del paso 4 desde que Flux devolvia cartulinas grises.
   */
  surface?: 'luxury';
  /**
   * Color plano de fondo en hex. Cuando viene, NO se genera nada con IA: se pinta
   * el lienzo de ese color y se compone el producto encima.
   *
   * Es lo que necesita el packshot de catálogo. Generarlo con Kontext hacía que
   * REDIBUJARA la pieza: con una cadena de dije chico y lejano, el modelo
   * "mejoraba" la foto engrosando la cadena y agrandando el colgante, porque el
   * prompt pide que el producto ocupe espacio suficiente. El resultado era otro
   * producto. Pintando el fondo y componiendo, la pieza es imposible de alterar,
   * cuesta $0 y sale en menos de un segundo.
   */
  solidBackground?: string;
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
  //
  //    Dos cosas hay que prohibir a mano, medidas contra resultados reales:
  //
  //    a) LA CARTULINA. Pedir "una superficie con props" hace que Flux pinte una
  //       TARJETA GRIS rectangular en el centro, con su propia sombra. Como la
  //       joya se pega justo ahi, el resultado es la pieza sobre un recuadro
  //       gris — indistinguible de un error de recorte. Prohibir "pedestal" no
  //       alcanzaba: una cartulina plana no es un pedestal. Hay que exigir UNA
  //       superficie continua y nombrar las formas que se cuelan.
  //
  //    b) EL PROP QUE CRUZA. "Nothing in the center" es demasiado debil: en la
  //       prueba de la espiga, Flux la puso atravesando el cuadro justo donde va
  //       el collar. Los props van confinados a los bordes; el tercio central
  //       queda vacio, que es donde se compone la pieza.
  const backdropPrompt =
    `${options.backdropPrompt}. ` +
    `ONE single continuous uniform surface filling the entire frame, seamless, edge to edge. ` +
    `NO card, NO sheet of paper, NO board, NO mat, NO placard, NO panel, NO tile, NO slab, ` +
    `NO rectangle or square of a different colour laid on the surface, NO frame, NO border, ` +
    `NO pedestal, NO podium, NO riser, NO plinth, NO tray, NO stand, NO display block. ` +
    `Any prop stays at the outer edges and corners only; the middle third of the frame is ` +
    `completely empty surface — nothing crosses it, nothing overlaps it. ` +
    `Empty scene, no jewelry, no product, no accessories, ` +
    `professional product photography backdrop, no text, no watermark`;

/**
 * Superficie de lujo CONSTRUIDA, no generada.
 *
 * POR QUE NO LA PINTA FLUX
 * ------------------------
 * Pedirle a un generador "una superficie elegante" devuelve, una de cada tantas
 * veces, una CARTULINA gris rectangular en el centro del cuadro — con su propia
 * sombra, y con los props apoyados encima. Como la joya se compone justo ahi,
 * el resultado es la pieza sobre un recuadro gris que parece un error de
 * recorte. Se puede prohibir por prompt, y se prohibio, pero un prompt es una
 * sugerencia: vuelve cuando quiere, y "cuando quiere" incluye el peor momento.
 *
 * Un barrido de estudio no necesita inventiva: es un degradado calido con un
 * charco de luz y una vineta. Eso se dibuja. Sale igual siempre, en
 * milisegundos y sin costo, y no puede aparecer nada que no hayamos puesto.
 */
async function buildLuxurySurface(W: number, H: number): Promise<Buffer> {
  // Marfil hacia champagne: la paleta de la marca. Nunca blanco puro, que apaga
  // el dorado del PVD.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="sweep" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stop-color="#F7F3EC"/>
        <stop offset="55%" stop-color="#EDE4D6"/>
        <stop offset="100%" stop-color="#DFD2BE"/>
      </linearGradient>
      <radialGradient id="pool" cx="50%" cy="42%" r="62%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
        <stop offset="60%" stop-color="#FFFFFF" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vig" cx="50%" cy="48%" r="76%">
        <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#3A2E1E" stop-opacity="0.26"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#sweep)"/>
    <rect width="100%" height="100%" fill="url(#pool)"/>
    <rect width="100%" height="100%" fill="url(#vig)"/>
  </svg>`;
  // El ruido finisimo evita el banding del degradado, que en pantalla grande se
  // ve como escalones y delata que el fondo es sintetico.
  return sharp(Buffer.from(svg)).png().blur(0.4).toBuffer();
}

  // Fondo plano: sin IA, sin costo, 100% determinista. Es lo que usa el packshot.
  let bgBuf: Buffer;
  if (options.surface === 'luxury') {
    bgBuf = await buildLuxurySurface(W, H);
  } else if (options.solidBackground) {
    const hex = options.solidBackground.replace('#', '');
    bgBuf = await sharp({
      create: {
        width: W,
        height: H,
        channels: 3,
        background: {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        },
      },
    })
      .png()
      .toBuffer();
  } else {
    const bgOut = await runModel('black-forest-labs/flux-schnell', {
      prompt: backdropPrompt,
      aspect_ratio: options.aspectRatio ?? '4:5',
      num_outputs: 1,
    });
    bgBuf = await urlToBuffer(await extractOutputUrl(bgOut));
  }

  const productBuf = await urlToBuffer(productUrl);

  // El recorte TIENE que traer canal alfa. Si llega aplanado (p. ej. si pasó por
  // un proxy que lo reencodeó a JPEG), componerlo pega un rectángulo opaco sobre
  // la escena en vez de la silueta — se ve como un recuadro gris alrededor de la
  // pieza. Se avisa en el log para poder distinguirlo de un problema de prompt.
  const productMeta = await sharp(productBuf).metadata();

  // NO ALCANZA con preguntar si EXISTE canal alfa: el proxy de imagenes
  // reencodea el PNG y devuelve un alfa presente pero COMPLETAMENTE OPACO. En
  // ese caso la silueta se pierde igual, y como la sombra se calcula a partir
  // del alfa, terminaba pintando un RECTANGULO negro al 42% sobre el decorado —
  // el cuadrado gris que aparecia detras de la pieza. Hay que mirar si el alfa
  // se USA, no si esta.
  let alphaIsFlat = !productMeta.hasAlpha;
  if (productMeta.hasAlpha) {
    const stats = await sharp(productBuf).stats();
    const alphaCh = stats.channels[stats.channels.length - 1];
    // Si el minimo del canal alfa es 255, no hay un solo pixel transparente.
    alphaIsFlat = (alphaCh?.min ?? 255) >= 250;
  }

  let productSource = productBuf;
  if (alphaIsFlat) {
    // El recorte llegó APLANADO (el proxy de imágenes lo reencodea y se come el
    // canal alfa). Sin alfa, componer pega el RECTÁNGULO entero sobre la escena
    // — el recuadro gris alrededor de la pieza que se veía en producción.
    // Se reconstruye la transparencia quitando el fondo uniforme desde los
    // bordes: es exactamente lo que hace `trim`, pero devolviendo alfa.
    console.warn('[jewelry-scene] recorte sin alfa: reconstruyendo transparencia desde el borde');
    const { data, info } = await sharp(productBuf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Color de referencia: la esquina superior izquierda, que en un recorte
    // aplanado es siempre fondo.
    const [br, bg, bb] = [data[0], data[1], data[2]];
    const TOL = 26;
    for (let i = 0; i < data.length; i += info.channels) {
      if (
        Math.abs(data[i] - br) <= TOL &&
        Math.abs(data[i + 1] - bg) <= TOL &&
        Math.abs(data[i + 2] - bb) <= TOL
      ) {
        data[i + 3] = 0;
      }
    }
    productSource = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
  }

  // 2. El recorte, recortado a su contenido real: un PNG aislado suele traer
  //    mucho margen transparente, y sin quitarlo la pieza queda diminuta.
  let trimmed: Buffer;
  try {
    trimmed = await sharp(productSource).trim({ threshold: 2 }).png().toBuffer();
  } catch {
    trimmed = await sharp(productSource).png().toBuffer();
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
    // LA SOMBRA, BIEN HECHA.
    //
    // Aca vivia el recuadro gris que arruinaba los pasos 3 y 4, y no era ni
    // Flux ni el canal alfa del recorte: era esto.
    //
    // La version anterior sacaba el alfa de la pieza con `extractChannel` y lo
    // usaba como mascara con `blend: 'dest-in'`. El detalle fatal es que
    // `dest-in` recorta segun el ALFA de la mascara, no segun su luminancia — y
    // `extractChannel('alpha')` devuelve una imagen GRIS, sin canal alfa, o sea
    // opaca de punta a punta. Resultado: no recortaba nada y la sombra salia
    // como el RECTANGULO negro completo al 42%, del tamaño exacto de la caja de
    // la pieza. Medido: 136 de brillo dentro contra 225 afuera.
    //
    // La forma correcta es no usar mascara: se construye un lienzo negro y el
    // alfa difuminado de la pieza SE LE ADJUNTA como canal alfa. Asi la sombra
    // tiene, por construccion, la silueta de la joya.
    // El lienzo lleva MARGEN. Sin el, el desenfoque choca contra el borde de la
    // caja de la pieza y la sombra sale con un corte recto arriba y a los lados
    // — otra vez un rectangulo, mas sutil pero igual de delator.
    const PAD = 60;
    const sw = pw + PAD * 2;
    const sh = ph + PAD * 2;

    // El margen NO se hace con `extend`: pasarle un color a una imagen de un
    // solo canal la promueve a tres, y entonces el `joinChannel` de abajo lee el
    // buffer crudo como si fuera de uno — que fue exactamente lo que dibujo dos
    // rayas negras verticales en la prueba.
    //
    // En su lugar la silueta se pega sobre un lienzo negro ya del tamaño final.
    // El negro es alfa 0 cuando se convierte en canal alfa, o sea: margen
    // transparente, que es lo que hace falta para que el desenfoque no choque
    // contra el borde y salga cortado.
    const alphaPng = await sharp(product).extractChannel('alpha').png().toBuffer();

    // DOS ETAPAS, a proposito. Encadenar `.blur()` despues de `.composite()` en
    // la MISMA instancia de sharp no difumina lo compuesto: sharp tiene su
    // propio orden interno de operaciones y aplica el desenfoque ANTES de pegar
    // las capas. La sombra salia con borde duro — medido, el perfil pasaba de 0
    // a 76 y volvia a 0 de golpe, sin penumbra. Difuminando en una etapa
    // separada el perfil sube y baja gradualmente, que es lo que hace que se lea
    // como sombra y no como una calcomania gris.
    const padded = await sharp({
      create: { width: sw, height: sh, channels: 3, background: 'black' },
    })
      .composite([{ input: alphaPng, left: PAD, top: PAD }])
      .greyscale()
      .png()
      .toBuffer();

    const silhouette = await sharp(padded)
      // Desenfoque generoso: una joya apoyada proyecta sombra difusa.
      .blur(34)
      // 0.30 de opacidad maxima: sombra de contacto, no mancha. Sobre marfil,
      // mas oscuro que esto se lee como suciedad.
      .linear(0.3, 0)
      .removeAlpha()
      .toColourspace('b-w')
      .raw()
      .toBuffer();

    const shadow = await sharp({
      create: { width: sw, height: sh, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .joinChannel(silhouette, { raw: { width: sw, height: sh, channels: 1 } })
      .png()
      .toBuffer();

    layers.push({ input: shadow, left: left - PAD, top: top - PAD + Math.round(ph * 0.03) });
  }

  layers.push({ input: product, left, top });

  const composed = await sharp(bgBuf)
    .resize(W, H, { fit: 'cover' })
    .composite(layers)
    .jpeg({ quality: 93 })
    .toBuffer();

  return {
    dataUrl: `data:image/jpeg;base64,${composed.toString('base64')}`,
    cost: options.solidBackground || options.surface === 'luxury' ? 0 : JEWELRY_SCENE_COST,
  };
}
