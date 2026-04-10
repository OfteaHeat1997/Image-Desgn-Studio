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
    const key = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
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

const FAL_STORAGE_URL = 'https://fal.ai/api/storage/upload/url';

/**
 * Upload a Buffer to fal.ai storage and return a public HTTP URL.
 */
export async function uploadToFalStorage(
  buffer: Buffer,
  contentType: string,
  fileName: string = 'upload.bin',
): Promise<string> {
  const url = `${FAL_STORAGE_URL}?file_name=${encodeURIComponent(fileName)}&content_type=${encodeURIComponent(contentType)}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Key ${getApiKey()}`,
      'Content-Type': contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown');
    throw new FalApiError(
      `fal.ai storage upload failed (${response.status}): ${text}`,
      'UPLOAD_FAILED',
    );
  }

  const data = await response.json();
  const resultUrl = data.url ?? data.file_url ?? data.access_url;
  if (!resultUrl) {
    throw new FalApiError('fal.ai storage upload returned no URL', 'UPLOAD_FAILED');
  }
  return resultUrl;
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
