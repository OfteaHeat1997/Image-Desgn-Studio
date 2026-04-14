// =============================================================================
// Client-side upload helper — eliminates repeated upload boilerplate in 9+ panels
// =============================================================================

import { compressForUpload } from "@/lib/utils/compress-image";

/**
 * Uploads a File to /api/upload and returns the hosted URL.
 * Automatically compresses images > 3.5MB to avoid Vercel's 4.5MB body limit.
 * Replaces the 5-line FormData + fetch + error check pattern
 * that was copy-pasted in every module panel.
 *
 * Usage:
 *   const imageUrl = await uploadImage(file);
 */
export async function uploadImage(file: File): Promise<string> {
  const compressed = await compressForUpload(file);
  const formData = new FormData();
  formData.append("file", compressed);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || "Error al subir la imagen.");
  }

  return data.data.url;
}
