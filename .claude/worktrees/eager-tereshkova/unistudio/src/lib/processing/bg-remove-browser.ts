// =============================================================================
// Client-side Background Removal (runs entirely in the browser, FREE)
// Uses @imgly/background-removal — no API calls, no cost.
// =============================================================================

/**
 * Remove background entirely in the browser using @imgly/background-removal.
 *
 * @param imageFile - The File object from an <input> or drag-and-drop.
 * @returns A Blob containing the transparent-background PNG.
 */
export async function removeBgBrowser(imageFile: File): Promise<Blob> {
  // Dynamic import so it never gets bundled in server code
  const { removeBackground } = await import('@imgly/background-removal');

  const result = await removeBackground(imageFile, {
    model: 'isnet_fp16',
    output: {
      format: 'image/png',
    },
  });

  // removeBackground returns an ImageData or Blob depending on the version
  if (result instanceof Blob) {
    return result;
  }

  // Fallback: if ImageData is returned, convert to Blob via OffscreenCanvas
  const imageData = result as ImageData;
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create OffscreenCanvas 2D context');
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}
