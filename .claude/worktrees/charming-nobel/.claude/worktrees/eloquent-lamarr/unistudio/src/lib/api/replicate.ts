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
 */
export function extractOutputUrl(output: any): string {
  if (typeof output === 'string') return output;
  if (Array.isArray(output) && output.length > 0) return extractOutputUrl(output[0]);
  if (output && typeof output === 'object') {
    // Replicate FileOutput has .url() as a method, not a property
    if (typeof output.url === 'function') return output.url().href;
    if ('url' in output && typeof output.url === 'string') return output.url;
    // FileOutput also has toString() that returns the URL
    const str = String(output);
    if (str.startsWith('http')) return str;
  }
  throw new Error('Unable to extract URL from Replicate model output');
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

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
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
  } catch (error) {
    if (error instanceof ReplicateApiError) throw error;
    throw new ReplicateApiError(
      `Error while polling prediction "${id}": ${error instanceof Error ? error.message : String(error)}`,
      'POLL_FAILED',
      error,
    );
  }
}
