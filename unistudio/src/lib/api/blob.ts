// =============================================================================
// Vercel Blob storage helper - UniStudio
// Sube archivos a Vercel Blob (almacenamiento de objetos) y devuelve una URL
// pública y DURABLE. Antes las imágenes se guardaban como base64 dentro de la
// base de datos, lo que la llenaba (512MB) rapidísimo. Ahora el archivo vive en
// Blob y en la DB solo queda la URL (unos bytes).
//
// Degrada con gracia: si no hay BLOB_READ_WRITE_TOKEN configurado, devuelve null
// y el llamador cae a las URLs de fal/replicate o, en último caso, al data URL.
// =============================================================================

import { put } from '@vercel/blob';

/** true si el token de Vercel Blob está configurado en el entorno. */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Sube un buffer a Vercel Blob y devuelve la URL pública durable.
 * Devuelve null si Blob no está configurado o si la subida falla (nunca lanza).
 */
export async function uploadToBlob(
  buffer: Buffer,
  contentType: string,
  filename: string,
): Promise<string | null> {
  if (!isBlobConfigured()) return null;
  try {
    const ext = contentType.split('/')[1] ?? 'jpg';
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || `upload.${ext}`;
    const key = `uploads/${safeName}`;
    const { url } = await put(key, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true, // evita colisiones de nombre
    });
    return url;
  } catch (err) {
    console.warn('[blob] upload failed:', err);
    return null;
  }
}
