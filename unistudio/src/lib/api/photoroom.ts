// =============================================================================
// Photoroom API client - UniStudio
//
// Photoroom Image Editing API "Ghost Mannequin" (Plus plan). Toma una foto de la
// prenda (incluso SOBRE MODELO), quita la persona/maniquí y reconstruye el interior
// oculto para dejar el producto flotando en 3D (invisible mannequin) sobre fondo
// blanco — preservando la tela visible (no es un editor generativo libre como
// SeedDream; está acotado a reconstruir solo lo oculto).
//
// Endpoint:  POST https://image-api.photoroom.com/v2/edit  (multipart/form-data)
// Auth:      header x-api-key
// Ghost:     campo  ghostMannequin.mode = ai.auto
// Respuesta: imagen binaria (image/png)
//
// La key se lee de PHOTOROOM_API_KEY y se .trim() (igual gotcha que fal/replicate).
// Plan/sandbox: https://www.photoroom.com/api — el sandbox da ~1000 llamadas/mes
// gratis para probar (las imágenes de sandbox salen con marca de agua).
// =============================================================================

import sharp from 'sharp';

const PHOTOROOM_EDIT_URL = 'https://image-api.photoroom.com/v2/edit';

/**
 * Realza el BRILLO del satén en el resultado de Photoroom. Photoroom re-ilumina la
 * prenda y aplana los reflejos → el satén sale "soso". Subimos un poco el contraste
 * (los reflejos brillantes resaltan sobre el negro = look glossy) y afilamos suave.
 * Es un retoque global y reversible; los números se pueden ajustar si queda muy/poco.
 *   linear(a,b): out = a*in + b. a=1.18 sube contraste; b=-16 mantiene los negros.
 */
async function enhanceSatinSheen(png: Buffer): Promise<Buffer> {
  try {
    return await sharp(png)
      // MUY suave: el contraste fuerte + sharpen hacían que el satén pareciera PLÁSTICO
      // (reflejos duros). Ahora apenas un toque de contraste, SIN sharpen, para no
      // endurecer los reflejos. Casi como el Photoroom crudo (que ya estaba bien).
      .linear(1.06, -5)
      .png()
      .toBuffer();
  } catch {
    // Si el realce falla por lo que sea, devolvemos el PNG original de Photoroom.
    return png;
  }
}

/**
 * Read + trim the Photoroom API key.
 *
 * MODO SANDBOX: Photoroom no usa una key aparte ni otro endpoint — se le pone el
 * prefijo `sandbox_` a la MISMA key. Da 1.000 llamadas gratis por mes (máx 100 por
 * día) contra el Image Editing API (/v2/edit), que es donde vive ghostMannequin.
 * Los resultados salen CON MARCA DE AGUA, así que sirve para probar, no para
 * publicar. Importa porque el plan de la usuaria es una prueba de 10 imágenes/mes:
 * sin sandbox, cada tanteo del Paso 1 le gastaba una de esas 10.
 */
function getPhotoroomKey(sandbox = false): string {
  const key = process.env.PHOTOROOM_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'PHOTOROOM_API_KEY no está configurada. Agregala en Vercel (Environment Variables) ' +
      'para usar el método Photoroom Ghost Mannequin. (Sandbox gratis en photoroom.com/api).',
    );
  }
  // Idempotente: si la key ya viene con el prefijo puesto, no lo duplicamos.
  if (sandbox) return key.startsWith('sandbox_') ? key : `sandbox_${key}`;
  return key.startsWith('sandbox_') ? key.slice('sandbox_'.length) : key;
}

/** Descarga la imagen de entrada a un Buffer (http(s) o data URL). */
async function toBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('data:')) {
    const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('data URL inválida para Photoroom');
    return Buffer.from(m[2], 'base64');
  }
  const r = await fetch(imageUrl);
  if (!r.ok) {
    throw new Error(`No se pudo descargar la imagen para Photoroom (HTTP ${r.status}).`);
  }
  return Buffer.from(await r.arrayBuffer());
}

/**
 * Ghost-mannequin de Photoroom. Sube la foto (prenda sobre modelo) y devuelve el
 * PNG del producto flotando 3D sobre fondo blanco. Devuelve el Buffer de la imagen
 * resultante; el caller la persiste (ej. fal storage) y la usa downstream.
 *
 * Si Photoroom rechaza la imagen por su filtro de contenido (lencería), tira un
 * error con el cuerpo de respuesta para diagnosticar — el caller cae al método
 * siguiente.
 */
export async function ghostMannequinPhotoroom(
  imageUrl: string,
  sandbox = false,
  /**
   * Descripción real del producto (la que saca Claude Vision: material, cierre,
   * copas, banda, paneles de malla). Va al parámetro `ghostMannequin.prompt`,
   * documentado como "text prompt to guide the generation style".
   *
   * Por qué importa: Photoroom recibe UNA sola foto (su API no acepta una segunda
   * imagen del interior — confirmado en su documentación), así que el interior que
   * se ve por el escote y el acabado de la tela los INVENTA. Con un bra de espalda
   * de malla y satén brillante, eso salía como un interior liso y negro mate. El
   * prompt es la única palanca que tenemos para anclarlo al producto real.
   */
  productPrompt?: string,
): Promise<Buffer> {
  const imageBuffer = await toBuffer(imageUrl);

  const form = new FormData();
  // Campo de imagen para upload directo (multipart).
  form.append('imageFile', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'input.jpg');
  // Activar el efecto ghost mannequin (quita modelo/maniquí + reconstruye interior).
  form.append('ghostMannequin.mode', 'ai.auto');
  if (productPrompt?.trim()) {
    form.append('ghostMannequin.prompt', productPrompt.trim());
  }
  // Encuadre fijo. Sin esto el default es SQUARE_HD y el ángulo del ghost variaba
  // entre corridas (a veces frontal, a veces 3/4), lo que rompe la consistencia
  // del catálogo. Vertical 4:3 es el encuadre de producto de ecommerce.
  form.append('ghostMannequin.size', 'PORTRAIT_HD_4_3');
  // Fondo blanco para ecommerce.
  form.append('background.color', 'FFFFFF');
  // Mantener el producto completo, sin recortar (padding 0, encuadre del objeto).
  form.append('padding', '0.05');

  const res = await fetch(PHOTOROOM_EDIT_URL, {
    method: 'POST',
    headers: {
      'x-api-key': getPhotoroomKey(sandbox),
      Accept: 'image/png, application/json',
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Photoroom /v2/edit ${res.status}: ${txt.slice(0, 400)}`);
  }

  const png = Buffer.from(await res.arrayBuffer());
  // Realzar el brillo del satén (Photoroom lo aplana). Retoque suave y ajustable.
  return await enhanceSatinSheen(png);
}

// =============================================================================
// STATIC PRODUCT — cut-out + fondo + sombra en UNA sola llamada ("los dos de una")
//
// A diferencia de ghost-mannequin (que es para prendas sobre modelo), acá el
// producto es un objeto rígido (perfume, crema, frasco, tubo). Photoroom hace en
// una sola pasada del endpoint /v2/edit: recorta el producto, le pone fondo
// (blanco puro o una escena por prompt) y — opcionalmente — le agrega una sombra
// de IA. Eso reemplaza los 2-3 pasos de Sharp/Flux del pipeline de estáticos.
//
// NO se aplica enhanceSatinSheen: ese realce es específico de la lencería de
// satén; en un frasco de perfume endurecería reflejos que no queremos tocar.
// =============================================================================

/** Sombra de IA de Photoroom para el pipeline de estáticos. */
export type PhotoroomStaticShadow = 'none' | 'soft' | 'floating';

export interface StaticProductPhotoroomOptions {
  /**
   * Fondo del resultado:
   *   'white'            → fondo blanco puro (#FFFFFF), listo para marketplace.
   *   { prompt: string } → escena generada a partir del prompt (mesa de mármol,
   *                        vanity, playa…). Va al campo `background.prompt`.
   */
  background: 'white' | { prompt: string };
  /**
   * Sombra de IA. 'soft' = sombra de contacto suave; 'floating' = sombra de
   * objeto flotando. 'none' (default) omite el campo → sin sombra añadida.
   */
  shadow?: PhotoroomStaticShadow;
  /**
   * Tamaño de salida. Photoroom expone presets de size, pero para el endpoint
   * base de /v2/edit el encuadre 1:1 se logra de forma más confiable con
   * `padding` + fondo. Por eso el default es OMITIR el campo y confiar en el
   * padding (evita un 400 si el preset no aplica al edit base). Si el caller
   * pasa un `size` explícito (ej. 'SQUARE_HD') se envía tal cual.
   */
  size?: string;
  /** Padding alrededor del producto (fracción). Default 0.05, igual que ghost. */
  padding?: number;
  /**
   * SANDBOX: default TRUE para las rutas NUEVAS de estáticos.
   *
   * El plan de la usuaria es una prueba y el fondo/sombra de IA son de pago y
   * queman cuota. Por eso estas rutas nuevas arrancan en sandbox (gratis, con
   * marca de agua) salvo que el request mande explícitamente `sandbox: false`.
   */
  sandbox?: boolean;
}

/**
 * Recorta + fondo + sombra de un producto estático en UNA sola llamada a
 * Photoroom /v2/edit. Devuelve el Buffer del PNG; el caller lo persiste (data
 * URL / storage) igual que los otros proveedores del pipeline.
 *
 * Construye el FormData con el MISMO patrón que ghostMannequinPhotoroom
 * (imageFile Blob, header x-api-key, Accept 'image/png, application/json') y
 * lanza con el cuerpo de la respuesta si Photoroom rechaza.
 */
export async function editStaticProductPhotoroom(
  imageUrl: string,
  opts: StaticProductPhotoroomOptions,
): Promise<Buffer> {
  const imageBuffer = await toBuffer(imageUrl);

  const form = new FormData();
  // Campo de imagen para upload directo (multipart), igual que ghost mannequin.
  form.append('imageFile', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'input.jpg');

  // Fondo: blanco puro (marketplace) o escena por prompt.
  if (opts.background === 'white') {
    form.append('background.color', 'FFFFFF');
  } else {
    form.append('background.prompt', opts.background.prompt);
  }

  // Sombra de IA (opcional). 'none' → no se añade el campo.
  if (opts.shadow && opts.shadow !== 'none') {
    form.append('shadow.mode', opts.shadow === 'floating' ? 'ai.floating' : 'ai.soft');
  }

  // Size sólo si el caller lo pide explícito (ver comentario en la interfaz).
  if (opts.size) {
    form.append('size', opts.size);
  }

  // Padding: encuadre del objeto con margen. Default 0.05.
  form.append('padding', String(opts.padding ?? 0.05));

  // SANDBOX por defecto TRUE para estas rutas nuevas de estáticos: sólo se
  // desactiva si el request manda explícitamente sandbox:false.
  const sandbox = opts.sandbox ?? true;

  const res = await fetch(PHOTOROOM_EDIT_URL, {
    method: 'POST',
    headers: {
      'x-api-key': getPhotoroomKey(sandbox),
      Accept: 'image/png, application/json',
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Photoroom /v2/edit (static) ${res.status}: ${txt.slice(0, 400)}`);
  }

  // Sin enhanceSatinSheen: ese realce es de la lencería de satén, no aplica a
  // frascos/tubos rígidos. Devolvemos el PNG crudo de Photoroom.
  return Buffer.from(await res.arrayBuffer());
}

/** Poses de Virtual Model que expone Photoroom (12 presets). */
export type PhotoroomPose = 'standing' | 'seated' | 'crossedarms' | 'back' | 'random';

export interface VirtualModelOptions {
  /** Preset de modelo (avery, sam, taylor, jackson, ava…). MISMO preset = MISMA
   *  modelo en todo el catálogo, sin depender de un seed que se rompe. */
  modelPreset?: string;
  /** Preset de escena. 'studio' es el fondo limpio de ecommerce. */
  scenePreset?: string;
  /** Pose. 'back' resuelve la Foto Espalda, que hoy es un hack de 2 llamadas. */
  pose?: PhotoroomPose;
  /** Modo prueba: prefijo sandbox_ → gratis y con marca de agua. */
  sandbox?: boolean;
}

/**
 * VIRTUAL MODEL de Photoroom: toma la foto de la PRENDA y devuelve una modelo
 * generada usándola. Cubre en UNA llamada lo que hoy son dos pasos separados
 * (model-create + tryon) y, fijando `modelPreset`, garantiza la misma modelo en
 * todo el catálogo — algo que con SeedDream forzamos con un seed compartido que
 * se rompe seguido.
 *
 * NO documentado: si acepta lencería/intimates. FASHN las bloquea, por eso el
 * pipeline terminó en SeedDream. Por eso esta función existe primero para
 * PROBARLA en sandbox (gratis) con varios colores antes de decidir pagar el plan.
 *
 * Salida 1K por defecto; 2K/4K requieren Enterprise.
 */
export async function virtualModelPhotoroom(
  garmentImageUrl: string,
  opts: VirtualModelOptions = {},
): Promise<Buffer> {
  const imageBuffer = await toBuffer(garmentImageUrl);

  const form = new FormData();
  form.append('imageFile', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'garment.jpg');
  form.append('virtualModel.mode', 'ai.auto');
  form.append('virtualModel.model.preset.name', opts.modelPreset ?? 'ava');
  form.append('virtualModel.scene.preset.name', opts.scenePreset ?? 'studio');
  form.append('virtualModel.pose', opts.pose ?? 'standing');

  const res = await fetch(PHOTOROOM_EDIT_URL, {
    method: 'POST',
    headers: {
      'x-api-key': getPhotoroomKey(opts.sandbox),
      Accept: 'image/png, application/json',
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Photoroom virtualModel ${res.status}: ${txt.slice(0, 400)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}
