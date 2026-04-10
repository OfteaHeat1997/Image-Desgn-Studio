// =============================================================================
// withoutBG Docker Client - Local Background Removal
// Connects to a locally running withoutbg/app:latest Docker container.
// =============================================================================

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class WithoutBgApiError extends Error {
  code: string;
  cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'WithoutBgApiError';
    this.code = code;
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  return process.env.WITHOUTBG_URL || 'http://localhost:8000';
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Check if the withoutBG Docker container is running and healthy.
 * Returns `true` if the container responds within 3 seconds, `false` otherwise.
 * Never throws.
 */
export async function isWithoutBgHealthy(): Promise<boolean> {
  // Skip health check entirely if no URL is configured (avoids 3s timeout on Vercel)
  if (!process.env.WITHOUTBG_URL) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${getBaseUrl()}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Background removal
// ---------------------------------------------------------------------------

/**
 * Remove background from an image using the local withoutBG Docker container.
 *
 * @param imageBuffer - Raw image bytes to process.
 * @param filename    - Optional filename hint for the multipart form.
 * @returns A Buffer containing the resulting PNG with transparent background.
 */
export async function removeBackgroundWithoutBg(
  imageBuffer: Buffer,
  filename: string = 'image.png',
): Promise<Buffer> {
  const baseUrl = getBaseUrl();

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
    formData.append('file', blob, filename);

    const response = await fetch(`${baseUrl}/api/remove-background`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown');
      throw new WithoutBgApiError(
        `withoutBG returned ${response.status}: ${text}`,
        'REMOVE_FAILED',
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error instanceof WithoutBgApiError) throw error;
    throw new WithoutBgApiError(
      `Failed to remove background via withoutBG: ${error instanceof Error ? error.message : String(error)}`,
      'REMOVE_FAILED',
      error,
    );
  }
}
