// =============================================================================
// Uwear.ai API client - UniStudio
//
// Uwear is a dedicated fashion-photography platform built for ecommerce. Unlike
// the fal/Replicate try-on models, Uwear CREATES its own model (virtual or saved
// avatar) wearing a "clothing item" you register from front (+ optional back)
// product images. It explicitly supports lingerie/intimates (no content block
// like FASHN) via the SeedDream 4.5 and Qwen Intimate models.
//
// Flow used by the try-on provider:
//   1. POST /clothing-item  → register the garment (front [+back]) → clothing_item_id
//   2. POST /generation     → generate a model wearing it (model_slug, prompt, ...)
//   3. GET  /generation/{id}→ poll until status "Done" → generation_results[].url
//
// Docs reference: UWEAR.md (agent-ready API reference). Base URL + Bearer auth.
// API key is read from UWEAR_API_KEY and .trim()'d (vercel env pull appends \n —
// same gotcha as the fal/replicate/fashn clients).
// =============================================================================

const UWEAR_BASE_URL = 'https://api.uwear.ai';

/** Read + trim the Uwear API key. Trailing \n from `vercel env pull` causes 401s. */
function getUwearKey(): string {
  const key = process.env.UWEAR_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'UWEAR_API_KEY no está configurada. Agregала en Vercel (Environment Variables) para usar el proveedor Uwear.',
    );
  }
  return key;
}

function authHeader(): Record<string, string> {
  return { Authorization: `Bearer ${getUwearKey()}` };
}

/** Model slugs from the Uwear catalog. SeedDream 4.5 is available to all; Qwen
 *  Intimate requires a verified workspace (manual approval). */
export const UWEAR_MODEL_SLUGS = {
  seedream: 'seedream-v4-5',
  qwenIntimate: 'qwen-rapid-aio-v23',
} as const;

/**
 * Register a clothing item from product image URL(s). Returns clothing_item_id.
 * `clothing_item_url` accepts an http(s) URL or a base64 data URL; we pass http
 * URLs (large base64 in a form field is discouraged by the API).
 *
 * clothing_processing_mode:
 *   - 'none'              store as-is (use when you pass an already-clean image)
 *   - 'remove_background' Uwear strips the bg + auto-writes an AI-vision description
 *   - 'generate_flat_lay' Uwear builds a clean flat-lay
 */
export async function createUwearClothingItem(params: {
  name: string;
  frontUrl: string;
  backUrl?: string;
  description?: string;
  descriptionBack?: string;
  processingMode?: 'none' | 'remove_background' | 'generate_flat_lay';
}): Promise<number> {
  const form = new FormData();
  form.append('clothing_item_name', params.name);
  form.append('clothing_item_url', params.frontUrl);
  if (params.backUrl) form.append('clothing_item_back_url', params.backUrl);
  if (params.description) form.append('description', params.description);
  if (params.descriptionBack) form.append('description_back', params.descriptionBack);
  // Default to remove_background: it cleans the garment AND auto-generates the
  // AI-vision description, which improves try-on fidelity.
  form.append('clothing_processing_mode', params.processingMode ?? 'remove_background');

  // NOTE: do not set Content-Type — fetch sets the multipart boundary itself.
  const res = await fetch(`${UWEAR_BASE_URL}/clothing-item`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Uwear /clothing-item ${res.status}: ${txt.slice(0, 400)}`);
  }
  const json = (await res.json()) as { clothing_item_id?: number };
  if (typeof json?.clothing_item_id !== 'number') {
    throw new Error('Uwear /clothing-item: respuesta sin clothing_item_id');
  }
  return json.clothing_item_id;
}

/**
 * Generate a clean flat-lay (product-only) image from a garment photo via Uwear's
 * `generate_flat_lay` processing, and return the Uwear-hosted flat-lay URL.
 *
 * Used as a FAITHFUL "isolate" for the 360 product video when grounded_sam can't
 * cut the product. Uwear is fidelity-focused (extracts the real product), so this
 * is far better than the old regenerative SeedDream ghost. Front (+optional back).
 */
export async function generateUwearFlatLay(params: {
  name: string;
  frontUrl: string;
  backUrl?: string;
}): Promise<string> {
  const form = new FormData();
  form.append('clothing_item_name', params.name);
  form.append('clothing_item_url', params.frontUrl);
  if (params.backUrl) form.append('clothing_item_back_url', params.backUrl);
  form.append('clothing_processing_mode', 'generate_flat_lay');

  const res = await fetch(`${UWEAR_BASE_URL}/clothing-item`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Uwear flat-lay /clothing-item ${res.status}: ${txt.slice(0, 400)}`);
  }
  const json = (await res.json()) as { clothing_item_url?: string };
  if (!json?.clothing_item_url) {
    throw new Error('Uwear flat-lay: respuesta sin clothing_item_url');
  }
  return json.clothing_item_url;
}

/** Create a generation job. Returns generation_id (poll it for the result). */
export async function createUwearGeneration(params: {
  clothingItemId: number;
  modelSlug: string;
  prompt: string;
  numImages?: number;
  camera?: string;
  aspectRatio?: string;
  resolution?: string;
  avatarId?: number | null;
  artDirectionId?: number | null;
}): Promise<number> {
  const body: Record<string, unknown> = {
    clothing_item_id: params.clothingItemId,
    model_slug: params.modelSlug,
    use_case: 'generate',
    prompt: params.prompt,
    num_images: params.numImages ?? 1,
    camera: params.camera ?? 'auto',
    avatar_id: params.avatarId ?? null,
    enhance_user_prompt: true,
  };
  if (params.aspectRatio) body.aspect_ratio = params.aspectRatio;
  if (params.resolution) body.resolution = params.resolution;
  if (params.artDirectionId != null) body.art_direction_id = params.artDirectionId;

  const res = await fetch(`${UWEAR_BASE_URL}/generation`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Uwear /generation ${res.status}: ${txt.slice(0, 400)}`);
  }
  const json = (await res.json()) as { generation_id?: number };
  if (typeof json?.generation_id !== 'number') {
    throw new Error('Uwear /generation: respuesta sin generation_id');
  }
  return json.generation_id;
}

/**
 * Poll GET /generation/{id} until status is "Done" (returns the first result
 * image URL) or "Error"/timeout (throws). Generated URLs expire in ~4h, so the
 * caller should persist the result.
 */
export async function pollUwearGeneration(
  generationId: number,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 270_000;
  const intervalMs = opts.intervalMs ?? 4_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${UWEAR_BASE_URL}/generation/${generationId}`, {
      headers: authHeader(),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        status?: string;
        generation_results?: Array<{ url?: string; available?: boolean }>;
      };
      if (json?.status === 'Done') {
        const url = json.generation_results?.find((r) => r?.url)?.url;
        if (url) return url;
        throw new Error('Uwear: generación "Done" pero sin generation_results con url.');
      }
      if (json?.status === 'Error') {
        throw new Error('Uwear: la generación falló (status Error).');
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Uwear: la generación no completó dentro del tiempo límite.');
}
