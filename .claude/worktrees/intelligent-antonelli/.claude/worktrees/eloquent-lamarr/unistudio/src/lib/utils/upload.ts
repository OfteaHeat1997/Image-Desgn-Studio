// =============================================================================
// Client-side upload helper — eliminates repeated upload boilerplate in 9+ panels
// =============================================================================

/**
 * Uploads a File to /api/upload and returns the hosted URL.
 * Replaces the 5-line FormData + fetch + error check pattern
 * that was copy-pasted in every module panel.
 *
 * Usage:
 *   const imageUrl = await uploadImage(file);
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || "Error al subir la imagen.");
  }

  return data.data.url;
}
