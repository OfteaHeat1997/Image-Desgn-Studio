// =============================================================================
// Image Utilities - UniStudio
// Client-side and server-side helpers for image conversion, dimensions, and
// file management.
// =============================================================================

// -----------------------------------------------------------------------------
// Client-side utilities (browser only)
// -----------------------------------------------------------------------------

/**
 * Convert a File object to a base64 data URL string.
 *
 * @param file - The File to convert.
 * @returns A promise resolving to the base64 data URL (e.g. "data:image/png;base64,...").
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return a string'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a base64 data URL string to a Blob.
 *
 * @param base64 - The base64 data URL (with or without the "data:..." prefix).
 * @param mimeType - The MIME type for the resulting Blob.
 * @returns A Blob containing the decoded binary data.
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  // Strip the data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteString = atob(base64Data);
  const byteArray = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }

  return new Blob([byteArray], { type: mimeType });
}

/**
 * Convert a Blob to a File object.
 *
 * @param blob - The source Blob.
 * @param filename - The desired filename for the resulting File.
 * @returns A File wrapping the Blob with the given filename.
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/**
 * Fetch a URL and return its contents as a Node.js Buffer.
 * This is intended for server-side use only (API routes, Server Actions).
 *
 * @param url - The URL to fetch.
 * @returns A promise resolving to a Buffer of the response body.
 */
/**
 * Build fetch headers for image URLs. Replicate file API URLs
 * (api.replicate.com/v1/files/*) require Bearer token authentication.
 */
export function replicateHeaders(url: string): Record<string, string> {
  if (url.includes('api.replicate.com') && process.env.REPLICATE_API_TOKEN) {
    return { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` };
  }
  return {};
}

export async function urlToBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, { headers: replicateHeaders(url) });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL "${url}": ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Convert a Node.js Buffer to a base64 data URL string.
 * This is intended for server-side use only.
 *
 * @param buffer - The Buffer to convert.
 * @param mimeType - The MIME type for the data URL (e.g. "image/png").
 * @returns A data URL string (e.g. "data:image/png;base64,...").
 */
export function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Get the dimensions (width and height) of an image File.
 * Uses the browser's Image element to load and measure the image.
 *
 * @param file - The image File to measure.
 * @returns A promise resolving to `{ width, height }` in pixels.
 */
export function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for dimension measurement'));
    };

    img.src = url;
  });
}

// -----------------------------------------------------------------------------
// Formatting utilities
// -----------------------------------------------------------------------------

/**
 * Format a file size in bytes to a human-readable string.
 *
 * @param bytes - The file size in bytes.
 * @returns A formatted string like "1.5 MB", "320 KB", or "45 B".
 *
 * @example
 * ```ts
 * formatFileSize(1572864);  // "1.5 MB"
 * formatFileSize(1024);     // "1.0 KB"
 * formatFileSize(500);      // "500 B"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  // Show decimal only for KB and above
  if (i === 0) return `${bytes} B`;
  return `${size.toFixed(1)} ${units[i]}`;
}

/**
 * Generate a new filename by adding a suffix before the file extension.
 *
 * @param original - The original filename (e.g. "product.jpg").
 * @param suffix - The suffix to add (e.g. "nobg").
 * @returns The modified filename (e.g. "product-nobg.jpg").
 *
 * @example
 * ```ts
 * generateFilename('photo.png', 'enhanced');  // "photo-enhanced.png"
 * generateFilename('image', 'upscaled');       // "image-upscaled"
 * ```
 */
export function generateFilename(original: string, suffix: string): string {
  const lastDot = original.lastIndexOf('.');

  if (lastDot === -1) {
    // No extension
    return `${original}-${suffix}`;
  }

  const name = original.slice(0, lastDot);
  const ext = original.slice(lastDot);
  return `${name}-${suffix}${ext}`;
}

/**
 * Trigger a browser download for an image at the given URL.
 * Creates a temporary anchor element to initiate the download.
 *
 * @param url - The image URL (can be a data URL, blob URL, or remote URL).
 * @param filename - The desired filename for the downloaded file.
 */
export function downloadImage(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Clean up after a short delay to ensure the download starts
  setTimeout(() => {
    document.body.removeChild(link);
    // Revoke blob URLs to free memory
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }, 100);
}
