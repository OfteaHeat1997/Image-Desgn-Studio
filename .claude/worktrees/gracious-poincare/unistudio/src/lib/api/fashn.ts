// =============================================================================
// FASHN API Client - Premium Virtual Try-On
// Mirrors the replicate.ts pattern (error class, async run + poll).
// =============================================================================

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class FashnError extends Error {
  code: string;
  cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'FashnError';
    this.code = code;
    this.cause = cause;
  }
}

export class FashnApiError extends Error {
  code: string;
  cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'FashnApiError';
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
    const key = process.env.FASHN_API_KEY;
    if (!key) {
      throw new FashnApiError(
        'FASHN_API_KEY environment variable is not set',
        'AUTH_MISSING',
      );
    }
    _apiKey = key;
  }
  return _apiKey;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FashnCategory =
  | 'tops'
  | 'bottoms'
  | 'one-pieces'
  | 'auto';

export interface FashnRunInput {
  model_image: string;
  garment_image: string;
  category: FashnCategory;
}

export interface FashnErrorDetail {
  name: string;
  message: string;
}

export interface FashnStatusResponse {
  id: string;
  status: 'starting' | 'in_queue' | 'processing' | 'completed' | 'failed';
  output: string[] | null;
  error: FashnErrorDetail | null;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

const FASHN_BASE_URL = 'https://api.fashn.ai/v1';

/**
 * Start a FASHN try-on prediction.
 *
 * @param input - The run input (model image, garment image, category).
 * @returns The prediction ID.
 */
export async function runFashn(input: FashnRunInput): Promise<string> {
  try {
    const response = await fetch(`${FASHN_BASE_URL}/run`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model_name: 'tryon-v1.6',
        inputs: input,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown');
      throw new FashnApiError(
        `FASHN API returned ${response.status}: ${text}`,
        'RUN_FAILED',
      );
    }

    const data = await response.json();
    const id = data.id ?? data.prediction_id;
    if (!id) {
      throw new FashnApiError(
        'FASHN prediction was created but no ID was returned',
        'NO_PREDICTION_ID',
      );
    }
    return id;
  } catch (error) {
    if (error instanceof FashnApiError) throw error;
    throw new FashnApiError(
      `Failed to start FASHN prediction: ${error instanceof Error ? error.message : String(error)}`,
      'RUN_FAILED',
      error,
    );
  }
}

/**
 * Get the current status of a FASHN prediction.
 *
 * @param id - The prediction ID returned by {@link runFashn}.
 * @returns The status response including output when completed.
 */
export async function getFashnStatus(id: string): Promise<FashnStatusResponse> {
  try {
    const response = await fetch(`${FASHN_BASE_URL}/status/${id}`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown');
      throw new FashnApiError(
        `FASHN status check returned ${response.status}: ${text}`,
        'STATUS_FAILED',
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof FashnApiError) throw error;
    throw new FashnApiError(
      `Failed to get FASHN status for "${id}": ${error instanceof Error ? error.message : String(error)}`,
      'STATUS_FAILED',
      error,
    );
  }
}

/**
 * Poll a FASHN prediction until it reaches a terminal state.
 *
 * @param id       - The prediction ID to poll.
 * @param interval - Polling interval in milliseconds (default: 3000).
 * @returns The completed status response.
 */
export async function pollFashn(
  id: string,
  interval: number = 3000,
): Promise<FashnStatusResponse> {
  const MAX_POLLS = 60;
  let pollCount = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (pollCount >= MAX_POLLS) {
      throw new FashnError('FASHN processing timeout after 3 minutes', 'timeout');
    }

    const status = await getFashnStatus(id);
    pollCount += 1;

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed') {
      const errorMsg = status.error?.message ?? 'unknown error';
      throw new FashnApiError(
        `FASHN prediction "${id}" failed: ${errorMsg}`,
        'PREDICTION_FAILED',
      );
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
