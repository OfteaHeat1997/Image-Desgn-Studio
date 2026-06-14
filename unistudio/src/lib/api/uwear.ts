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
 * Fetch an image (http(s) or data URL) into a Blob on OUR server, so we can upload
 * the raw bytes to Uwear. Uwear's own fetch of our temporary URLs (fal/replicate/
 * proxy) can fail with "Could not download file from URL (upstream returned 401)"
 * — expired or auth-protected links. Relaying bytes avoids that entirely.
 */
async function fetchImageBlob(url: string): Promise<Blob> {
  if (url.startsWith('data:')) {
    const m = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('data URL inválida para Uwear');
    return new Blob([Buffer.from(m[2], 'base64')], { type: m[1] || 'image/jpeg' });
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `No se pudo descargar la imagen para Uwear (HTTP ${res.status}). ` +
      `Probablemente la foto expiró — re-subila y reprocesá.`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return new Blob([buf], { type: res.headers.get('content-type') || 'image/jpeg' });
}

/**
 * Register a clothing item from product image URL(s). Returns clothing_item_id.
 * We download the image(s) server-side and upload the BYTES (photo_file /
 * back_photo_file) instead of passing URLs — Uwear can't always fetch our temp URLs.
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
  form.append('photo_file', await fetchImageBlob(params.frontUrl), 'front.jpg');
  if (params.backUrl) {
    form.append('back_photo_file', await fetchImageBlob(params.backUrl), 'back.jpg');
  }
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
  form.append('photo_file', await fetchImageBlob(params.frontUrl), 'front.jpg');
  if (params.backUrl) {
    form.append('back_photo_file', await fetchImageBlob(params.backUrl), 'back.jpg');
  }
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

/**
 * Faithful product isolate via Uwear's `remove_background` processing. A diferencia
 * de `generate_flat_lay` (que devolvía "Flat lay failed" con varios bras), este modo
 * extrae el PRODUCTO REAL quitando fondo + modelo — 100% de fidelidad, NO regenera
 * ni inventa la prenda. Front (+ opcional back) para que Uwear reconstruya la pieza
 * real. Devuelve la URL de la imagen producto-solo hospedada por Uwear.
 */
export async function isolateProductWithUwear(params: {
  name: string;
  frontUrl: string;
  backUrl?: string;
}): Promise<string> {
  const form = new FormData();
  form.append('clothing_item_name', params.name);
  form.append('photo_file', await fetchImageBlob(params.frontUrl), 'front.jpg');
  if (params.backUrl) {
    form.append('back_photo_file', await fetchImageBlob(params.backUrl), 'back.jpg');
  }
  // remove_background: extrae la prenda real (no flat_lay, que fallaba con bras).
  form.append('clothing_processing_mode', 'remove_background');

  const res = await fetch(`${UWEAR_BASE_URL}/clothing-item`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Uwear remove-bg /clothing-item ${res.status}: ${txt.slice(0, 400)}`);
  }
  const json = (await res.json()) as { clothing_item_url?: string; clothing_item_id?: number };
  if (!json?.clothing_item_url) {
    throw new Error('Uwear remove-bg: respuesta sin clothing_item_url (no se pudo extraer el producto)');
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
  if (params.artDirectionId !== undefined && params.artDirectionId !== null) body.art_direction_id = params.artDirectionId;

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

/** Nouns por tipo de prenda para el prompt (color-agnóstico). */
const UWEAR_GHOST_NOUN: Record<string, string> = {
  bra: 'bra', lingerie: 'lingerie piece', panty: 'panties', shapewear: 'shapewear garment',
  faja: 'shapewear garment', bodysuit: 'bodysuit', swimwear: 'swimwear piece',
  bikini: 'bikini piece', set: 'lingerie set',
};

/**
 * GHOST-MANNEQUIN del PRODUCTO vía Uwear (plataforma especializada en moda):
 *   1. Registra tu prenda REAL (frente + espalda) como clothing item → Uwear corre
 *      su propia visión y la preserva fiel (ganchos, malla, banda, tirantes).
 *   2. Genera una foto PRODUCTO-SOLO estilo ghost/maniquí invisible — SIN persona —
 *      en 3D sobre fondo blanco. Usa SeedDream (flexible para packshots de producto).
 * Es lo que la usuaria pidió: Uwear borra la modelo y deja el producto en 3D fiel.
 * Devuelve la URL hospedada por Uwear (expira ~4h → el caller debe persistirla).
 */
export async function generateUwearGhostProduct(params: {
  frontUrl: string;
  backUrl?: string;
  garmentType?: string | null;
}): Promise<string> {
  const noun = UWEAR_GHOST_NOUN[(params.garmentType ?? '').toLowerCase()] ?? 'garment';
  // SeedDream: a diferencia de Qwen Intimate (fuerza una modelo), permite packshot
  // de producto sin persona. Se puede sobreescribir con UWEAR_GHOST_SLUG en Vercel.
  const modelSlug = process.env.UWEAR_GHOST_SLUG?.trim() || UWEAR_MODEL_SLUGS.seedream;

  const clothingItemId = await createUwearClothingItem({
    name: `ghost-${noun} ${Date.now()}`,
    frontUrl: params.frontUrl,
    backUrl: params.backUrl,
    processingMode: 'remove_background',
  });

  const prompt =
    `Professional e-commerce GHOST MANNEQUIN product photo of the ${noun}: the garment ` +
    `shown in 3D as if worn by a COMPLETELY INVISIBLE mannequin — natural filled volume, ` +
    `straps and band holding their shape, hollow neckline. ABSOLUTELY NO human model, NO ` +
    `person, NO body, NO skin, NO face — only the ${noun} itself floating on a pure white ` +
    `studio background, front view, soft even lighting, sharp focus. Keep the ${noun} EXACTLY ` +
    `as provided — same closure, straps, band, cups, mesh panels and construction; do not ` +
    `redesign, add or remove any detail.`;

  const generationId = await createUwearGeneration({
    clothingItemId,
    modelSlug,
    prompt,
    numImages: 1,
    camera: 'auto',
    aspectRatio: '3:4',
    resolution: '2K',
    avatarId: null,
  });

  return await pollUwearGeneration(generationId);
}

