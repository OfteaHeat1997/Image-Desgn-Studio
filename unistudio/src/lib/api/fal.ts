// =============================================================================
// fal.ai API Client - UniStudio
// Pay-per-use video generation. Mirrors the replicate.ts / fashn.ts pattern.
// =============================================================================

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class FalApiError extends Error {
  code: string;
  cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'FalApiError';
    this.code = code;
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

let _apiKey: string | null = null;

function getApiKey(): string {
  if (!_apiKey) {
    const key = (process.env.FAL_KEY ?? process.env.FAL_API_KEY)?.trim();
    if (!key) {
      throw new FalApiError(
        'FAL_KEY environment variable is not set. Get one at https://fal.ai/dashboard/keys',
        'AUTH_MISSING',
      );
    }
    _apiKey = key;
  }
  return _apiKey;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Key ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FalQueueResponse {
  request_id: string;
  status: string;
  response_url: string;
  status_url: string;
  cancel_url: string;
}

export interface FalStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  response_url?: string;
  logs?: Array<{ message: string; timestamp: string }>;
}

export interface FalVideoResult {
  video: { url: string; content_type: string };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

const FAL_BASE_URL = 'https://queue.fal.run';

/**
 * Submit a video generation job to fal.ai (async queue).
 *
 * @param modelId - The fal.ai model endpoint (e.g. "fal-ai/ltx-video/image-to-video")
 * @param input   - Model-specific input parameters.
 * @returns Queue response with request_id and status URLs.
 */
export async function submitFal(
  modelId: string,
  input: Record<string, unknown>,
): Promise<FalQueueResponse> {
  try {
    const response = await fetch(`${FAL_BASE_URL}/${modelId}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown');
      throw new FalApiError(
        `fal.ai API returned ${response.status}: ${text}`,
        'SUBMIT_FAILED',
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof FalApiError) throw error;
    throw new FalApiError(
      `Failed to submit fal.ai job: ${error instanceof Error ? error.message : String(error)}`,
      'SUBMIT_FAILED',
      error,
    );
  }
}

/**
 * Check the status of a queued fal.ai job.
 */
export async function getFalStatus(statusUrl: string): Promise<FalStatusResponse> {
  try {
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown');
      throw new FalApiError(
        `fal.ai status check returned ${response.status}: ${text}`,
        'STATUS_FAILED',
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof FalApiError) throw error;
    throw new FalApiError(
      `Failed to get fal.ai status: ${error instanceof Error ? error.message : String(error)}`,
      'STATUS_FAILED',
      error,
    );
  }
}

/**
 * Fetch the result of a completed fal.ai job.
 */
export async function getFalResult(responseUrl: string): Promise<any> {
  try {
    const response = await fetch(responseUrl, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown');
      throw new FalApiError(
        `fal.ai result fetch returned ${response.status}: ${text}`,
        'RESULT_FAILED',
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof FalApiError) throw error;
    throw new FalApiError(
      `Failed to get fal.ai result: ${error instanceof Error ? error.message : String(error)}`,
      'RESULT_FAILED',
      error,
    );
  }
}

/**
 * Submit and poll until completion (synchronous workflow).
 *
 * @param modelId  - The fal.ai model endpoint.
 * @param input    - Model-specific input parameters.
 * @param interval - Polling interval in ms (default: 3000).
 * @returns The model output.
 */
export async function runFal(
  modelId: string,
  input: Record<string, unknown>,
  interval: number = 3000,
): Promise<any> {
  const queue = await submitFal(modelId, input);
  const MAX_POLLS = 100; // ~5 minutes at 3s interval

  for (let i = 0; i < MAX_POLLS; i++) {
    const status = await getFalStatus(queue.status_url);

    if (status.status === 'COMPLETED') {
      const responseUrl = status.response_url ?? queue.response_url;
      return getFalResult(responseUrl);
    }

    if (status.status === 'FAILED') {
      const lastLog = status.logs?.slice(-1)[0]?.message ?? '';
      throw new FalApiError(
        `fal.ai job failed (${queue.request_id})${lastLog ? `: ${lastLog}` : ''}`,
        'JOB_FAILED',
      );
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new FalApiError(
    `fal.ai job timed out after ${MAX_POLLS} polls: ${queue.request_id}`,
    'POLL_TIMEOUT',
  );
}

// ---------------------------------------------------------------------------
// File upload — convert data URLs to fal.ai storage HTTP URLs
// ---------------------------------------------------------------------------

// Current fal.ai storage endpoint. The old /api/storage/upload/url on fal.ai
// has been removed and now returns their marketing page, so any PUT there
// fails with 404. The /storage/upload/initiate flow on rest.alpha.fal.ai is
// the documented two-step process: (1) POST to initiate to get a signed
// URL + the eventual public file URL, (2) PUT the bytes to the signed URL.
const FAL_STORAGE_INITIATE_URL = 'https://rest.alpha.fal.ai/storage/upload/initiate';

interface FalUploadInitiateResponse {
  upload_url: string;
  file_url: string;
}

/**
 * Upload a Buffer to fal.ai storage and return a public HTTP URL.
 */
export async function uploadToFalStorage(
  buffer: Buffer,
  contentType: string,
  fileName: string = 'upload.bin',
): Promise<string> {
  // Step 1: initiate — exchange (file_name, content_type) for a signed upload
  // URL and the final public file URL.
  const initiateRes = await fetch(FAL_STORAGE_INITIATE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Key ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content_type: contentType, file_name: fileName }),
  });

  if (!initiateRes.ok) {
    const text = await initiateRes.text().catch(() => 'unknown');
    throw new FalApiError(
      `fal.ai storage initiate failed (${initiateRes.status}): ${text.slice(0, 200)}`,
      'UPLOAD_FAILED',
    );
  }

  const initiate = (await initiateRes.json()) as FalUploadInitiateResponse;
  if (!initiate.upload_url || !initiate.file_url) {
    throw new FalApiError(
      `fal.ai storage initiate returned unexpected shape: ${JSON.stringify(initiate).slice(0, 200)}`,
      'UPLOAD_FAILED',
    );
  }

  // Step 2: PUT the bytes to the signed URL (no auth header — the URL is
  // pre-signed and adding Authorization would break it).
  const uploadRes = await fetch(initiate.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: new Uint8Array(buffer),
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => 'unknown');
    throw new FalApiError(
      `fal.ai storage PUT failed (${uploadRes.status}): ${text.slice(0, 200)}`,
      'UPLOAD_FAILED',
    );
  }

  return initiate.file_url;
}

/**
 * Ensure a URL is an HTTP URL accessible by fal.ai models.
 * If the URL is a data URI, uploads it to fal.ai storage first.
 */
export async function ensureFalHttpUrl(url: string): Promise<string> {
  if (!url) throw new FalApiError('Empty URL provided', 'INVALID_URL');
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new FalApiError('Invalid data URI format', 'INVALID_DATA_URI');
    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1]?.replace('+xml', '') ?? 'bin';
    return uploadToFalStorage(buffer, mimeType, `upload.${ext}`);
  }

  throw new FalApiError(`Unsupported URL scheme: ${url.slice(0, 30)}...`, 'INVALID_URL');
}

/**
 * Validate a Buffer is a real image by checking the first bytes (magic bytes
 * / file signature). Detecta JPEG, PNG, GIF, WebP, BMP, HEIC. Rechaza JSON,
 * HTML, buffers vacíos, y cualquier formato que Kolors/Wan no sepa decodificar.
 *
 * Previa: ensureFalAccessibleUrl descargaba un Replicate /v1/files/{id} URL
 * (que devuelve JSON metadata con Bearer auth) y subía esos bytes a fal.media
 * con extensión .jpeg → Kolors intentaba decodificar JSON como JPEG → 422.
 */
function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // GIF: "GIF87a" o "GIF89a"
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
  // WebP: "RIFF"..."WEBP"
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true;
  // BMP: "BM"
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return true;
  // HEIC/HEIF: "ftyp" at offset 4
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return true;
  return false;
}

/**
 * Derivar extensión+content-type correctos a partir de los magic bytes del
 * buffer, ignorando el content-type del header (que a veces miente — Replicate
 * devuelve application/json incluso cuando nosotros queremos imagen).
 */
function detectImageMime(buffer: Buffer): { contentType: string; ext: string } {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { contentType: 'image/jpeg', ext: 'jpg' };
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return { contentType: 'image/png', ext: 'png' };
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return { contentType: 'image/gif', ext: 'gif' };
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return { contentType: 'image/webp', ext: 'webp' };
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return { contentType: 'image/bmp', ext: 'bmp' };
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return { contentType: 'image/heic', ext: 'heic' };
  return { contentType: 'application/octet-stream', ext: 'bin' };
}

/**
 * Ensure a URL is accessible by fal.ai models.
 * Handles three cases:
 *   1. data: URIs → uploaded to fal.ai storage
 *   2. Private Replicate file URLs (api.replicate.com/v1/files/...) → downloaded with
 *      REPLICATE_API_TOKEN auth and re-uploaded to fal.ai storage
 *   3. Any other HTTP URL → returned as-is (assumed publicly accessible)
 */
export async function ensureFalAccessibleUrl(url: string): Promise<string> {
  if (!url) throw new FalApiError('Empty URL provided', 'INVALID_URL');

  // data: URI → upload to fal storage
  if (url.startsWith('data:')) {
    return ensureFalHttpUrl(url);
  }

  // Private Replicate file URL → download with auth and re-upload to fal storage.
  // Replicate /v1/files/{id} devuelve JSON metadata (no bytes) — hay que seguir
  // el campo url/urls.get del JSON para llegar a los bytes reales.
  if (url.includes('api.replicate.com/v1/files/')) {
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      throw new FalApiError(
        'REPLICATE_API_TOKEN is not set — cannot download private Replicate file',
        'AUTH_MISSING',
      );
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${replicateToken}` },
    });
    if (!response.ok) {
      throw new FalApiError(
        `Failed to download private Replicate file (${response.status}): ${url}`,
        'DOWNLOAD_FAILED',
      );
    }
    const headerContentType = response.headers.get('content-type') || '';
    let buffer = Buffer.from(await response.arrayBuffer());

    // Si Replicate devolvió JSON metadata (caso común en /v1/files/{id}),
    // extraer la URL real de bytes y re-fetchear.
    if (headerContentType.includes('application/json') || !isValidImageBuffer(buffer)) {
      try {
        const json = JSON.parse(buffer.toString('utf-8'));
        const realUrl: string | undefined =
          json?.url || json?.urls?.get || json?.download_url || json?.output;
        if (typeof realUrl === 'string' && realUrl.startsWith('http') && realUrl !== url) {
          const realResponse = await fetch(realUrl, {
            headers: realUrl.includes('api.replicate.com') || realUrl.includes('replicate.delivery')
              ? { Authorization: `Bearer ${replicateToken}` }
              : undefined,
          });
          if (realResponse.ok) {
            buffer = Buffer.from(await realResponse.arrayBuffer());
          }
        }
      } catch {
        // Si el parse falla, cae en la validación de magic bytes abajo
      }
    }

    // Validación crítica: si después de todo buffer no es imagen, throw.
    // Subir JSON con extensión .jpeg genera 422 image_load_error downstream.
    if (!isValidImageBuffer(buffer)) {
      throw new FalApiError(
        `Replicate URL returned non-image content after follow. URL: ${url}. First 120 bytes: ${buffer.toString('utf-8').slice(0, 120)}`,
        'DOWNLOAD_NOT_IMAGE',
      );
    }

    const { contentType, ext } = detectImageMime(buffer);
    return uploadToFalStorage(buffer, contentType, `replicate-upload.${ext}`);
  }

  // Any other HTTP URL → assume publicly accessible
  return url;
}

// ---------------------------------------------------------------------------
// Output extraction
// ---------------------------------------------------------------------------

/**
 * Extract a video URL from fal.ai output.
 * Handles common output shapes: { video: { url } }, { output: { url } }, etc.
 */
export function extractFalVideoUrl(output: any): string {
  // { video: { url: "..." } }
  if (output?.video?.url) return output.video.url;
  // { output: { url: "..." } } or { output: "..." }
  if (output?.output?.url) return output.output.url;
  if (typeof output?.output === 'string') return output.output;
  // { url: "..." }
  if (typeof output?.url === 'string') return output.url;
  // Array output
  if (Array.isArray(output) && output[0]?.url) return output[0].url;

  throw new FalApiError(
    'Unable to extract video URL from fal.ai output',
    'EXTRACT_FAILED',
  );
}
