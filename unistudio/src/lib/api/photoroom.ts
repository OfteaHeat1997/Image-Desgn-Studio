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
      .linear(1.18, -16)
      .modulate({ brightness: 1.02 })
      .sharpen({ sigma: 0.6 })
      .png()
      .toBuffer();
  } catch {
    // Si el realce falla por lo que sea, devolvemos el PNG original de Photoroom.
    return png;
  }
}

/** Read + trim the Photoroom API key. */
function getPhotoroomKey(): string {
  const key = process.env.PHOTOROOM_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'PHOTOROOM_API_KEY no está configurada. Agregala en Vercel (Environment Variables) ' +
      'para usar el método Photoroom Ghost Mannequin. (Sandbox gratis en photoroom.com/api).',
    );
  }
  return key;
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
export async function ghostMannequinPhotoroom(imageUrl: string): Promise<Buffer> {
  const imageBuffer = await toBuffer(imageUrl);

  const form = new FormData();
  // Campo de imagen para upload directo (multipart).
  form.append('imageFile', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'input.jpg');
  // Activar el efecto ghost mannequin (quita modelo/maniquí + reconstruye interior).
  form.append('ghostMannequin.mode', 'ai.auto');
  // Fondo blanco para ecommerce.
  form.append('background.color', 'FFFFFF');
  // Mantener el producto completo, sin recortar (padding 0, encuadre del objeto).
  form.append('padding', '0.05');

  const res = await fetch(PHOTOROOM_EDIT_URL, {
    method: 'POST',
    headers: {
      'x-api-key': getPhotoroomKey(),
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
