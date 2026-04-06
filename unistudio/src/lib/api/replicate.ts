import Replicate from 'replicate';

// ---------------------------------------------------------------------------
// Singleton Replicate client
// ---------------------------------------------------------------------------

let _client: Replicate | null = null;

function getClient(): Replicate {
  if (!_client) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new ReplicateApiError(
        'REPLICATE_API_TOKEN environment variable is not set',
        'AUTH_MISSING',
      );
    }
    _client = new Replicate({ auth: token });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class ReplicateApiError extends Error {
  code: string;
  cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'ReplicateApiError';
    this.code = code;
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Extract a URL string from Replicate model output.
 * Handles all output shapes: plain string, array, FileOutput (with .url() method),
 * or plain object with .url property.
 *
 * IMPORTANT: If the URL is an api.replicate.com/v1/files/ URL (authenticated,
 * no CORS), we convert it to a base64 data URL so the browser can display it.
 */
export async function extractOutputUrl(output: any): Promise<string> {
  let url: string | null = null;

  if (typeof output === 'string') {
    url = output;
  } else if (Array.isArray(output) && output.length > 0) {
    return await extractOutputUrl(output[0]);
  } else if (output && typeof output === 'object') {
    // Replicate FileOutput has .url() as a method, not a property
    if (typeof output.url === 'function') {
      url = output.url().href;
    } else if ('url' in output && typeof output.url === 'string') {
      url = output.url;
    } else {
      // FileOutput also has toString() that returns the URL
      const str = String(output);
      if (str.startsWith('http')) url = str;
    }
  }

  if (!url) throw new Error('Unable to extract URL from Replicate model output');

  // api.replicate.com/v1/files/ URLs require auth and have no CORS headers.
  // Convert them to data URLs server-side so the browser can display them.
  if (url.includes('api.replicate.com/v1/files/')) {
    return replicateFileToDataUrl(url);
  }

  return url;
}

/**
 * Download a Replicate authenticated file URL and convert to a data URL.
 * This is needed because api.replicate.com/v1/files/ URLs don't have CORS
 * headers and require the API token — browsers can't access them directly.
 */
async function replicateFileToDataUrl(fileUrl: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  const res = await fetch(fileUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new ReplicateApiError(
      `Failed to download Replicate file: ${res.status} ${res.statusText}`,
      'FILE_DOWNLOAD_FAILED',
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/png';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

/**
 * Ensure an image URL is an HTTP URL accessible by Replicate models.
 * If the URL is a data URI, uploads it to Replicate's file hosting first.
 * HTTP/HTTPS URLs are returned as-is.
 */
export async function ensureHttpUrl(url: string): Promise<string> {
  if (!url) throw new ReplicateApiError('Empty URL provided', 'INVALID_URL');

  // Already an HTTP URL — return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Data URI — upload to Replicate file hosting
  if (url.startsWith('data:')) {
    const client = getClient();
    // Convert data URI to a File-like Blob
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new ReplicateApiError('Invalid data URI format', 'INVALID_DATA_URI');
    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: mimeType });
    const ext = mimeType.split('/')[1] ?? 'png';
    const file = new File([blob], `upload.${ext}`, { type: mimeType });

    const fileOutput = await client.files.create(file);
    // The Replicate files API returns an object with urls.get
    if (fileOutput && fileOutput.urls && fileOutput.urls.get) {
      return fileOutput.urls.get;
    }
    throw new ReplicateApiError('Failed to upload file to Replicate', 'UPLOAD_FAILED');
  }

  throw new ReplicateApiError(`Unsupported URL scheme: ${url.slice(0, 30)}...`, 'INVALID_URL');
}

/**
 * Run a Replicate model synchronously and wait for the result.
 *
 * @param modelId - The model identifier in `owner/name` or `owner/name:version` format.
 * @param input   - Key/value input parameters expected by the model.
 * @returns The model output (shape depends on the model).
 *
 * @example
 * ```ts
 * const output = await runModel('stability-ai/sdxl', { prompt: 'a cat' });
 * ```
 */
export async function runModel(
  modelId: string,
  input: Record<string, any>,
  _retries = 3,
): Promise<any> {
  const client = getClient();

  for (let attempt = 0; attempt <= _retries; attempt++) {
    try {
      const output = await client.run(modelId as `${string}/${string}`, {
        input,
      });
      return output;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const is429 = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('throttled');

      if (is429 && attempt < _retries) {
        // Wait before retrying (exponential: 2s, 4s, 8s)
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`[replicate] 429 rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${_retries})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (error instanceof ReplicateApiError) throw error;
      throw new ReplicateApiError(
        `Failed to run model "${modelId}": ${msg}`,
        is429 ? 'RATE_LIMITED' : 'RUN_FAILED',
        error,
      );
    }
  }

  throw new ReplicateApiError(
    `Failed to run model "${modelId}" after ${_retries} retries`,
    'MAX_RETRIES',
  );
}

/**
 * Start a Replicate prediction asynchronously and return the prediction ID.
 * Use {@link getPrediction} or {@link pollPrediction} to retrieve the result later.
 *
 * @param modelId - The model identifier in `owner/name:version` format (version required).
 * @param input   - Key/value input parameters expected by the model.
 * @returns The prediction ID that can be used to poll for results.
 */
export async function runModelAsync(
  modelId: string,
  input: Record<string, any>,
): Promise<string> {
  try {
    const client = getClient();

    // Extract version from modelId (owner/name:version)
    const [model, version] = modelId.split(':');
    if (!version) {
      throw new ReplicateApiError(
        'modelId must include a version when using runModelAsync (e.g. "owner/name:abc123")',
        'INVALID_MODEL_ID',
      );
    }

    const prediction = await client.predictions.create({
      version,
      input,
    });

    if (!prediction.id) {
      throw new ReplicateApiError(
        'Prediction was created but no ID was returned',
        'NO_PREDICTION_ID',
      );
    }

    return prediction.id;
  } catch (error) {
    if (error instanceof ReplicateApiError) throw error;
    throw new ReplicateApiError(
      `Failed to start async prediction for "${modelId}": ${error instanceof Error ? error.message : String(error)}`,
      'ASYNC_RUN_FAILED',
      error,
    );
  }
}

/**
 * Retrieve the current status and (if available) result of a prediction.
 *
 * @param id - The prediction ID returned by {@link runModelAsync}.
 * @returns The full prediction object including `status`, `output`, `error`, etc.
 */
export async function getPrediction(id: string): Promise<any> {
  try {
    const client = getClient();
    const prediction = await client.predictions.get(id);
    return prediction;
  } catch (error) {
    if (error instanceof ReplicateApiError) throw error;
    throw new ReplicateApiError(
      `Failed to get prediction "${id}": ${error instanceof Error ? error.message : String(error)}`,
      'GET_FAILED',
      error,
    );
  }
}

/**
 * Poll a prediction until it reaches a terminal state (`succeeded`, `failed`, or `canceled`).
 *
 * @param id       - The prediction ID to poll.
 * @param interval - Polling interval in milliseconds (default: 2000).
 * @returns The completed prediction object.
 * @throws {ReplicateApiError} If the prediction fails or is canceled.
 */
export async function pollPrediction(
  id: string,
  interval: number = 2000,
): Promise<any> {
  const terminalStatuses = new Set(['succeeded', 'failed', 'canceled']);
  const MAX_POLLS = 150; // ~5 minutes at 2s interval

  try {
    for (let i = 0; i < MAX_POLLS; i++) {
      const prediction = await getPrediction(id);

      if (terminalStatuses.has(prediction.status)) {
        if (prediction.status === 'failed') {
          throw new ReplicateApiError(
            `Prediction "${id}" failed: ${prediction.error ?? 'unknown error'}`,
            'PREDICTION_FAILED',
          );
        }
        if (prediction.status === 'canceled') {
          throw new ReplicateApiError(
            `Prediction "${id}" was canceled`,
            'PREDICTION_CANCELED',
          );
        }
        return prediction;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new ReplicateApiError(
      `Prediction "${id}" timed out after ${MAX_POLLS} polls`,
      'POLL_TIMEOUT',
    );
  } catch (error) {
    if (error instanceof ReplicateApiError) throw error;
    throw new ReplicateApiError(
      `Error while polling prediction "${id}": ${error instanceof Error ? error.message : String(error)}`,
      'POLL_FAILED',
      error,
    );
  }
}
