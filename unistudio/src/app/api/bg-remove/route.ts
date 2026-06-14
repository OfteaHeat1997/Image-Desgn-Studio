// =============================================================================
// Background Removal API Route - UniStudio
// POST: Accepts JSON { imageUrl, provider, options? }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import {
  removeBgReplicate,
  removeBgWithoutBg,
} from '@/lib/processing/bg-remove';
import { isWithoutBgHealthy } from '@/lib/api/withoutbg';
import {
  runModel,
  extractOutputUrl,
  ensureHttpUrl,
} from '@/lib/api/replicate';
import { uploadToFalStorage } from '@/lib/api/fal';
import { saveJob } from '@/lib/db/persist';
import { withApiErrorHandler, requireFields } from '@/lib/api/route-helpers';
import { modelToGhost } from '@/lib/processing/ghost-mannequin';
import { proxyReplicateUrl, replicateHeaders } from '@/lib/utils/image';
import { CLAUDE_HAIKU, CLAUDE_SONNET } from '@/lib/utils/constants';

const PROVIDER_COSTS: Record<string, number> = {
  replicate: 0.01,
  browser: 0,
  withoutbg: 0,
};

// Cost of the garment isolation path (grounded_sam + local compositing)
const ISOLATE_COST = 0.01;

/**
 * Valida si un recorte TODAVÍA tiene una persona/modelo (SeedDream a veces no la
 * quita y devuelve la imagen casi igual). Usa Claude Vision (Haiku). Devuelve:
 *   true  = hay una persona visible (recorte malo → reintentar)
 *   false = producto solo (recorte bueno)
 *   null  = no se pudo validar (sin API key / error) → el caller acepta el result
 */
async function ghostStillHasPerson(imageUrl: string): Promise<boolean | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  try {
    let mediaType = 'image/png';
    let base64: string;
    if (imageUrl.startsWith('data:')) {
      const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return null;
      mediaType = m[1];
      base64 = m[2];
    } else {
      const r = await fetch(imageUrl, { headers: replicateHeaders(imageUrl) });
      if (!r.ok) return null;
      mediaType = r.headers.get('content-type') || 'image/png';
      base64 = Buffer.from(await r.arrayBuffer()).toString('base64');
    }
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: CLAUDE_HAIKU,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: 'Is there a visible human PERSON or MODEL (face, skin, arms, torso, legs) in this image? This should be a product-only photo of a garment with NO person. Answer ONLY "yes" or "no".' },
          ],
        }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data?.content?.[0]?.text ?? '').toLowerCase();
    if (text.includes('yes')) return true;
    if (text.includes('no')) return false;
    return null;
  } catch {
    return null;
  }
}

/** Descarga una imagen (http o data URL) a base64 para mandarla a Claude Vision. */
async function fetchImageAsBase64(
  imageUrl: string,
): Promise<{ mediaType: string; data: string } | null> {
  try {
    if (imageUrl.startsWith('data:')) {
      const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return null;
      return { mediaType: m[1], data: m[2] };
    }
    const r = await fetch(imageUrl, { headers: replicateHeaders(imageUrl) });
    if (!r.ok) return null;
    const mediaType = r.headers.get('content-type') || 'image/png';
    const data = Buffer.from(await r.arrayBuffer()).toString('base64');
    return { mediaType, data };
  } catch {
    return null;
  }
}

/**
 * GUARDIA DE FIDELIDAD (Claude Vision / Sonnet). Compara el resultado del ghost
 * contra el producto REAL (foto original) y verifica que sea la MISMA prenda —
 * mismo cierre (ganchos vs zipper), mismos tirantes, misma malla, mismo corte —
 * SIN persona y SIN detalles inventados. Devuelve:
 *   true  = fiel (mostrar)
 *   false = alucinó / inventó / hay persona (descartar y reintentar)
 *   null  = no se pudo validar (sin API key) → el caller acepta el resultado
 */
async function ghostMatchesProduct(
  referenceUrl: string,
  resultUrl: string,
  garmentType: string | null,
  hint?: string,
): Promise<boolean | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  try {
    const ref = await fetchImageAsBase64(referenceUrl);
    const out = await fetchImageAsBase64(resultUrl);
    if (!ref || !out) return null;
    const noun = garmentType ?? 'garment';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: CLAUDE_SONNET,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `IMAGE 1 is the REAL ${noun} (it may be worn by a model — look ONLY at the garment itself):` },
            { type: 'image', source: { type: 'base64', media_type: ref.mediaType, data: ref.data } },
            { type: 'text', text: `IMAGE 2 is an AI-generated product photo that must show the SAME ${noun} with NO person:` },
            { type: 'image', source: { type: 'base64', media_type: out.mediaType, data: out.data } },
            { type: 'text', text: `Compare IMAGE 2 to the real ${noun} in IMAGE 1.${hint ? ' Real construction: ' + hint + '.' : ''} IMAGE 2 PASSES only if ALL are true: (a) FRONT CLOSURE matches EXACTLY — if IMAGE 1 has a vertical column of hook-and-eye clasps (or a zipper/buttons) down the center front, IMAGE 2 MUST clearly show that same closure; a smooth/plain front with no closure is a FAIL; (b) SIDE PANELS match — if IMAGE 1 has sheer MESH panels on the sides/underarm, IMAGE 2 MUST show those same mesh panels; plain solid sides with no mesh is a FAIL; (c) same strap width and style, same cut and silhouette; (d) fabric looks like REAL photographed cloth with natural satin sheen — NOT plastic, rubbery, cartoonish, CGI or doll-like; (e) ONE single front product — NOT two mannequins, NOT a front+back collage; (f) NO visible human person, face or skin. Answer ONLY "yes" if ALL of (a)(b)(c)(d)(e)(f) pass, or "no" if ANY one fails.` },
          ],
        }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data?.content?.[0]?.text ?? '').toLowerCase();
    if (text.includes('yes')) return true;
    if (text.includes('no')) return false;
    return null;
  } catch {
    return null;
  }
}

/**
 * Negative mask prompt for grounded_sam — regions to SUBTRACT from the garment
 * mask. We intentionally vary this by garment type.
 *
 * BUG ENCONTRADO (2026-06-14): la lista incluía `body,torso,waist` — pero el bra
 * está JUSTO sobre el torso/cuerpo. grounded_sam restaba esas regiones y borraba
 * el bra mismo → máscara vacía → "no se pudo recortar". Ahora restamos SOLO lo que
 * claramente NO es la prenda (piel expuesta, cara, pelo, brazos, hombros, cuello,
 * fondo). NO restamos torso/body/waist porque contienen la prenda.
 */
function garmentNegativePrompt(garmentType: string | null): string {
  // MÍNIMO a propósito: antes restábamos skin/shoulder/neck/arm — pero en un bra
  // deportivo los tirantes van sobre los hombros y el escote toca el cuello, así que
  // esas restas EROSIONABAN la máscara hasta dejarla vacía → "no se pudo recortar".
  // Ahora solo restamos el FONDO (nunca solapa la prenda). Grounding DINO ya acota la
  // caja a la prenda, así que no necesitamos restar piel/hombros.
  const base = 'background';
  // Panties van bajo en cadera → muslo/pierna no solapan, ayudan a limpiar bordes.
  return garmentType === 'panty' ? `${base},thigh,leg` : base;
}

/**
 * Map our internal garmentType values to the exact text prompt that
 * grounded_sam (Grounding DINO under the hood) responds to best.
 */
function garmentTypeToPrompt(garmentType: string | null): string {
  switch (garmentType) {
    case 'bra':
      // Grounding DINO responds better to a richer vocabulary — catches
      // soft bras, sports bras, wireless, bralettes, and nude/skin-tone
      // pieces that the single word "bra" sometimes misses.
      return 'bra,bralette,sports bra,wireless bra,soft bra,lingerie top,chest garment';
    case 'lingerie':
    case 'bodysuit':
      return 'bra,bralette,lingerie top,bodysuit,one-piece lingerie';
    case 'panty':
      return 'panty,underwear bottom,briefs,thong,bikini bottom';
    case 'set':
      return 'lingerie set,bra and panty,bra,panty';
    case 'swimwear':
      return 'swimsuit,bikini,swim top,swim bottom';
    case 'shapewear':
      return 'shapewear,bodysuit,compression garment';
    default:
      return 'garment,clothing,product';
  }
}

/**
 * Isolate a garment from a photo that may contain a model/person.
 *
 * Why not Kontext Pro or rembg?
 *   - Flux Kontext Pro (Replicate) rejects lingerie with error E005 — content
 *     moderation cannot be disabled.
 *   - Standard rembg keeps the PERSON as the foreground and removes the
 *     background, so the model's body stays in the output and only the scene
 *     disappears. We want the exact opposite.
 *
 * What we do instead:
 *   1. schananas/grounded_sam — Grounding DINO finds the garment by text
 *      prompt ("bra", "panty", etc.), SAM returns a pixel-perfect mask.
 *   2. Sharp applies that mask to the original image via dest-in compositing,
 *      producing a transparent PNG with ONLY the garment pixels visible.
 * No content-moderated endpoints involved. Cost ~$0.01 per run.
 */
async function isolateGarment(
  imageUrl: string,
  garmentType: string | null,
  returnMaskOnly = false,
): Promise<string> {
  // Load the image as a buffer so we can both ship it to the segmentation
  // model (needs an HTTP URL) and keep the pixel data locally for masking.
  let inputBuffer: Buffer;
  if (imageUrl.startsWith('data:')) {
    const m = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('Invalid data URI');
    inputBuffer = Buffer.from(m[2], 'base64');
  } else {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`fetch input ${res.status}`);
    inputBuffer = Buffer.from(await res.arrayBuffer());
  }

  // Normalize the input: rotate via EXIF, cap at 1024px (smaller = faster
  // grounded_sam inference), re-encode as JPEG for a lighter upload.
  const prepared = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  const meta = await sharp(prepared).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error('Could not read image dimensions');

  const maskPrompt = garmentTypeToPrompt(garmentType);
  const negPrompt = garmentNegativePrompt(garmentType);
  console.log(`[bg-remove:isolate] running grounded_sam prompt="${maskPrompt}" neg="${negPrompt}" size=${width}x${height}`);

  // Upload the prepared JPEG so Replicate can fetch it by URL
  const preparedDataUrl = `data:image/jpeg;base64,${prepared.toString('base64')}`;
  const httpInput = await ensureHttpUrl(preparedDataUrl);

  // schananas/grounded_sam returns four images. Different runs can return
  // them in different container shapes (array, AsyncIterable, object with
  // urls keyed by name). We fetch each candidate, check which one is
  // actually a B/W mask with enough white pixels (the garment area), and
  // fall back to plain rembg if nothing qualifies.
  //
  // HARD FAILURE FALLBACK: if grounded_sam itself throws (model 404, auth error,
  // rate limit, timeout), we catch that here and also fall back to rembg so the
  // lingerie pipeline doesn't die entirely. User gets background removed but model
  // stays — not ideal but better than a blank error.
  let rawOutput: unknown;
  try {
    rawOutput = await runModel(
      'schananas/grounded_sam:ee871c19efb1941f55f66a3d7d960428c8a5afcb77449547fe8e5a3ab9ebc21c',
      {
        image: httpInput,
        mask_prompt: maskPrompt,
        negative_mask_prompt: garmentNegativePrompt(garmentType),
        adjustment_factor: 0,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // NO caer a rembg acá: rembg deja a la MODELO (quita solo el fondo) → catálogo
    // con persona en vez de prenda. Lanzamos para que el route caiga al Uwear flat-lay
    // (producto-solo fiel) o, sin key, al hard-fail honesto.
    console.warn(`[bg-remove:isolate] grounded_sam threw (${msg}) — throwing so caller uses Uwear flat-lay`);
    throw new Error(`grounded_sam falló: ${msg}`);
  }

  // Normalize the output shape into a flat array of URL strings
  async function toUrlArray(out: unknown): Promise<string[]> {
    if (!out) return [];
    if (typeof out === 'string') return [out];
    if (Array.isArray(out)) {
      const urls: string[] = [];
      for (const item of out) {
        if (typeof item === 'string') urls.push(item);
        else if (item && typeof item === 'object') {
          const maybeUrl = (item as { url?: unknown }).url;
          if (typeof maybeUrl === 'function') urls.push(String((maybeUrl as () => unknown)()));
          else if (typeof maybeUrl === 'string') urls.push(maybeUrl);
          else {
            const href = (item as { href?: string }).href;
            if (typeof href === 'string') urls.push(href);
          }
        }
      }
      return urls;
    }
    if (typeof out === 'object') {
      const asObj = out as Record<string, unknown>;
      const preferred = ['mask', 'inverted_mask', 'annotated_picture_mask', 'neg_annotated_picture_mask'];
      const urls: string[] = [];
      for (const key of preferred) {
        const v = asObj[key];
        if (typeof v === 'string') urls.push(v);
      }
      if (urls.length) return urls;
    }
    try {
      const single = await extractOutputUrl(out);
      if (single) return [single];
    } catch {
      /* ignore */
    }
    return [];
  }

  const urls = await toUrlArray(rawOutput);
  console.log(`[bg-remove:isolate] grounded_sam returned ${urls.length} urls: ${urls.map(u => u.slice(0, 60)).join(' | ')}`);

  // Helper: download + verify mask. Returns both coverage (fraction of white
  // pixels — garment area) and purity (fraction of pixels that are near-black
  // or near-white — how "mask-like" it is). A real SAM mask is ~99% pure
  // black/white; the annotated debug overlay has labels + colored bbox lines
  // over the original photo and scores low on purity.
  async function tryMask(
    url: string,
    label: string,
  ): Promise<{ buffer: Buffer; coverage: number; purity: number } | null> {
    try {
      const resp = await fetch(url, { headers: replicateHeaders(url) });
      if (!resp.ok) return null;
      const buf = Buffer.from(await resp.arrayBuffer());
      const gray = await sharp(buf).resize(width, height, { fit: 'fill' }).grayscale().raw().toBuffer();
      let white = 0;
      let pure = 0;
      for (let i = 0; i < gray.length; i++) {
        if (gray[i] > 128) white++;
        if (gray[i] < 20 || gray[i] > 235) pure++;
      }
      const coverage = white / gray.length;
      const purity = pure / gray.length;
      console.log(
        `[bg-remove:isolate] candidate ${label} coverage=${coverage.toFixed(3)} purity=${purity.toFixed(3)}`,
      );
      return { buffer: gray, coverage, purity };
    } catch (err) {
      console.warn(`[bg-remove:isolate] candidate ${label} failed:`, err);
      return null;
    }
  }

  // Download + score all candidates in parallel
  const maxCandidates = Math.min(urls.length, 4);
  const settled = await Promise.all(
    Array.from({ length: maxCandidates }, (_, i) => tryMask(urls[i], `idx${i}`)),
  );
  const candidates: Array<{
    buffer: Buffer;
    coverage: number;
    purity: number;
    idx: number;
  }> = [];
  for (let i = 0; i < settled.length; i++) {
    const candidate = settled[i];
    if (candidate) candidates.push({ ...candidate, idx: i });
  }

  // Pick the mask. Real SAM masks are ~99% pure black/white; annotated
  // debug overlays (with bounding boxes drawn on the source photo) score
  // below ~0.5 purity. Require purity >= 0.9 AND plausible coverage
  // (0.3%–80%). Without purity, the old heuristic kept picking the
  // annotated image because a high-contrast photo has many "white" pixels.
  let bestMask: Buffer | null = null;
  let bestCoverage = 0;
  for (const candidate of candidates) {
    const isMaskLike = candidate.purity >= 0.9;
    const inRange = candidate.coverage >= 0.003 && candidate.coverage <= 0.8;
    // Prefer the mask with the largest plausible coverage among mask-like
    // candidates — grounded_sam sometimes returns two valid masks
    // (foreground + refined); bigger one is usually cleaner.
    if (isMaskLike && inRange && candidate.coverage > bestCoverage) {
      bestMask = candidate.buffer;
      bestCoverage = candidate.coverage;
    }
  }

  // No mask passed purity: try the candidate with the HIGHEST purity. Bajamos el
  // umbral a 0.55 (antes 0.75): las fotos CON modelo (prenda oscura sobre cuerpo,
  // JPEG) dan máscaras válidas pero menos "puras", y se rechazaban → "no se pudo
  // recortar". Los overlays anotados (con bounding boxes) puntúan ~0.3-0.5, así
  // que 0.55 sigue descartándolos pero acepta la máscara real borderline.
  if (!bestMask && candidates.length) {
    const byPurity = [...candidates]
      .filter((c) => c.purity >= 0.55 && c.coverage >= 0.001 && c.coverage <= 0.95)
      .sort((a, b) => b.purity - a.purity)[0];
    if (byPurity) {
      console.warn(
        `[bg-remove:isolate] no high-purity mask, using top purity candidate idx${byPurity.idx} purity=${byPurity.purity.toFixed(3)}`,
      );
      bestMask = byPurity.buffer;
      bestCoverage = byPurity.coverage;
    }
  }

  if (!bestMask) {
    // NO caer a rembg: dejaría a la modelo. Lanzamos para que el route use Uwear
    // flat-lay (producto-solo) o el hard-fail honesto. rembg solo deja a la persona.
    console.warn('[bg-remove:isolate] no usable mask from grounded_sam — throwing so caller uses Uwear flat-lay');
    throw new Error('grounded_sam no produjo una máscara usable de la prenda');
  }

  console.log(`[bg-remove:isolate] using mask coverage=${bestCoverage.toFixed(3)}`);

  // returnMaskOnly: usado por texturePreserve (lingerie pipeline). En vez de
  // componer la prenda aislada, devolvemos la máscara B/W cruda como PNG
  // grayscale — necesaria para inpaintear con flux-fill-pro la zona del bra
  // sobre el resultado del tryon.
  //
  // Recorte normal: (1) generamos el recorte transparente (lo que YA funcionaba:
  // joinChannel de la máscara como alpha) y (2) lo componemos sobre un lienzo BLANCO
  // con composite (operación robusta) → la usuaria lo quiere sobre blanco.
  let isolated: Buffer;
  if (returnMaskOnly) {
    isolated = await sharp(bestMask, { raw: { width, height, channels: 1 } })
      .png()
      .toBuffer();
  } else {
    // 1) recorte transparente fiel (versión probada)
    const cutout = await sharp(prepared)
      .ensureAlpha()
      .joinChannel(bestMask, { raw: { width, height, channels: 1 } })
      .png()
      .toBuffer();
    // 2) componer el recorte sobre fondo BLANCO
    isolated = await sharp({
      create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .composite([{ input: cutout }])
      .png()
      .toBuffer();
  }

  // Upload the result directly to fal storage — Kolors/Wan se alimentan de fal.
  // Retry 3× antes de fallar. NO caer a Replicate — las URLs api.replicate.com/v1/files/*
  // devuelven JSON metadata en vez de binario, causan 422/404 downstream en tryon.
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const falUrl = await uploadToFalStorage(isolated, 'image/png', 'isolated.png');
      console.log(`[bg-remove:isolate] done attempt ${attempt} (${(isolated.length / 1024).toFixed(0)} KB) -> ${falUrl.slice(0, 80)} [fal]`);
      return falUrl;
    } catch (err) {
      lastErr = err;
      console.warn(`[bg-remove:isolate] fal upload attempt ${attempt}/3 failed:`, err instanceof Error ? err.message : err);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  // Si 3 intentos de fal fallan, throw — el caller cae a rembg-last-resort en el
  // route handler (la pipeline lencería lo detecta y hard-failea con mensaje claro).
  throw new Error(`fal upload failed 3 times: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

export const POST = withApiErrorHandler('bg-remove', async (request: NextRequest) => {
  const body = await request.json();
  const { imageUrl, provider, removeSubject, garmentType, returnMaskOnly, garmentDescription, isolateMethod, options } = body as {
    imageUrl: string;
    provider: 'browser' | 'replicate' | 'withoutbg';
    removeSubject?: boolean;
    garmentType?: string | null;
    returnMaskOnly?: boolean;
    // Foto de espalda real del MISMO producto — referencia de construcción para
    // Uwear y el ghost (reconstruir banda/tirantes fiel). Antes se IGNORABA acá.
    backImageUrl?: string;
    // Spec de construcción (Claude Vision) — se pasa al ghost para que no invente
    // el cierre (ej dibujar zipper donde hay ganchos).
    garmentDescription?: string;
    // Método de recorte: 'grounded-sam' (recorte real fiel, DEFAULT) | 'ghost'
    // (SeedDream 3D regenera) | 'auto' (real → ghost → rembg).
    isolateMethod?: 'grounded-sam' | 'ghost' | 'auto';
    options?: Record<string, unknown>;
  };

  console.log(
    `[API /bg-remove] Provider: "${provider}", removeSubject: ${!!removeSubject}, ` +
    `imageUrl length: ${imageUrl?.length ?? 0}`,
  );

  const validationError = requireFields(body, ['imageUrl', 'provider']);
  if (validationError) return validationError;

  // Subject removal path: isolate ONLY the garment, drop the model entirely.
  // Used by the lingerie pipeline when the input photo contains a person wearing
  // the garment — so the subsequent try-on receives just the prenda.
  //
  // Cascada de 2 niveles. SeedDream ghost (regenerativo) ELIMINADO del cascade:
  // estaba como nivel intermedio (re-agregado 2026-06-10, commit 595c2df) e
  // INVENTABA un bra distinto al real cuando grounded_sam fallaba — exactamente la
  // regresión que la usuaria ya había arreglado el 2026-05-18 (commit f1e4a59) y
  // que volvió a contaminar el catálogo. Segmentación (recorta pixeles reales) sí;
  // regeneración (dibuja un producto nuevo) NO.
  //   1. grounded_sam (Grounding DINO + SAM) — segmentación precisa del producto
  //      REAL, $0.01, rápida. Cuando agarra, es pixel-perfect.
  //   2. rembg plano — último recurso. Conserva la modelo en foreground. La
  //      pipeline lencería detecta 'rembg-last-resort' y hard-failea con mensaje
  //      claro pidiendo reintentar con otra foto (o usar Uwear con la foto real).
  //      NUNCA inventa el producto → error honesto, no catálogo falso.
  if (removeSubject) {
    let resultUrl = '';
    let usedProvider = 'grounded-sam-isolate';

    // returnMaskOnly: bypass del fallback SeedDream/rembg. La máscara solo se
    // saca del primer step (grounded_sam) — los fallbacks producen una imagen
    // compuesta, no una máscara, así que no aplican. Si grounded_sam falla,
    // fallamos hacia arriba con error claro.
    if (returnMaskOnly) {
      const maskUrl = await isolateGarment(imageUrl, garmentType ?? null, true);
      await saveJob({
        operation: 'bg-remove',
        provider: 'grounded-sam-mask',
        inputParams: { imageUrl, removeSubject: true, garmentType, returnMaskOnly: true },
        outputUrl: maskUrl,
        cost: ISOLATE_COST,
      });
      return NextResponse.json({
        success: true,
        data: { url: maskUrl, maskUrl, provider: 'grounded-sam-mask' },
        cost: ISOLATE_COST,
      });
    }

    // regenerated: true cuando el resultado lo produjo el ghost (SeedDream regenera
    // el producto). Lo lee la pipeline para avisarle a la usuaria "se regeneró con
    // IA, revisá" antes de mandarlo al catálogo. false = recorte real fiel.
    let regenerated = false;

    // Método de recorte (lo elige la usuaria en Paso 1). Default: 'auto' — FIDELIDAD
    // PRIMERO. La usuaria exige el producto REAL (no inventado): probamos Uwear
    // (extrae la prenda real, 100% fiel, NO regenera) → grounded_sam (pixeles reales)
    // → ghost 3D (regenera, último recurso "lindo" con aviso) → rembg. NUNCA error.
    //   'grounded-sam' / 'auto' → Uwear fiel → recorte real → ghost 3D → rembg.
    //   'ghost'                 → ghost 3D primero → Uwear → recorte real → rembg.
    const method = isolateMethod ?? 'auto';
    const MAX_GHOST_ATTEMPTS = 4;

    // grounded_sam: recorte de pixeles REALES (fiel). usedProvider claro.
    // Capturamos el error REAL para poder mostrarlo (la usuaria necesita ver por
    // qué falla, no el mensaje genérico).
    let groundedSamError = '';
    const tryGroundedSam = async (): Promise<boolean> => {
      try {
        resultUrl = await isolateGarment(imageUrl, garmentType ?? null);
        usedProvider = 'grounded-sam-isolate';
        return true;
      } catch (err) {
        groundedSamError = err instanceof Error ? err.message : String(err);
        console.warn(`[bg-remove:removeSubject] grounded_sam falló (${groundedSamError})`);
        return false;
      }
    };

    // ghost (SeedDream 3D, regenera) CON GUARDIA CLAUDE VISION. Tras cada tirada:
    //   1. ghostStillHasPerson → ¿quedó una persona? si sí, reintenta.
    //   2. ghostMatchesProduct → ¿es FIEL al producto real (cierre/tirantes/malla,
    //      sin inventar)? si NO, reintenta.
    // Solo devuelve true si una tirada pasa AMBOS guardias. Si en MAX_GHOST_ATTEMPTS
    // ninguna pasa, devuelve FALSE → el caller cae al recorte real fiel (NUNCA
    // mostramos una alucinación). Si no hay ANTHROPIC_API_KEY, los guardias devuelven
    // null y aceptamos la 1ª tirada (sin validación posible).
    const tryGhost = async (): Promise<boolean> => {
      // COMBO: el ghost parte del RECORTE LIMPIO de tu producto, NO de la foto con la
      // modelo. En la foto con modelo los brazos tapan la malla lateral, así que el
      // ghost la imagina/borra. Con el recorte limpio ve ganchos+malla y los COPIA.
      // El recorte se calcula UNA sola vez y se reusa en todos los reintentos.
      let ghostInput = imageUrl;
      try {
        ghostInput = await isolateGarment(imageUrl, garmentType ?? null);
        console.log('[bg-remove:removeSubject] combo: ghost desde el recorte real (no la foto con modelo)');
      } catch (cutErr) {
        console.warn(`[bg-remove:removeSubject] recorte para combo falló (${cutErr instanceof Error ? cutErr.message : cutErr}) — ghost desde la foto original`);
      }
      for (let attempt = 1; attempt <= MAX_GHOST_ATTEMPTS; attempt++) {
        try {
          // back = undefined: una sola foto frontal (pasar la espalda hacía 2 maniquíes).
          const ghost = await modelToGhost(ghostInput, garmentType ?? undefined, undefined, garmentDescription);
          const hasModel = await ghostStillHasPerson(ghost.url);
          if (hasModel === true) {
            console.warn(`[bg-remove:removeSubject] ghost intento ${attempt}/${MAX_GHOST_ATTEMPTS}: hay una persona — reintento`);
            continue;
          }
          const faithful = await ghostMatchesProduct(imageUrl, ghost.url, garmentType ?? null, garmentDescription);
          if (faithful === false) {
            console.warn(`[bg-remove:removeSubject] ghost intento ${attempt}/${MAX_GHOST_ATTEMPTS}: NO coincide con el producto (alucinó) — reintento`);
            continue;
          }
          // faithful === true (pasó) o null (sin key → aceptamos)
          resultUrl = ghost.url;
          usedProvider = `ghost-validado (${ghost.provider})`;
          regenerated = true;
          console.log(`[bg-remove:removeSubject] ghost intento ${attempt}: pasó el control de fidelidad ✓`);
          return true;
        } catch (e) {
          console.warn(`[bg-remove:removeSubject] ghost intento ${attempt} falló (${e instanceof Error ? e.message : e})`);
        }
      }
      // Ninguna tirada pasó el control → NO mostramos alucinación; caemos al recorte fiel.
      console.warn('[bg-remove:removeSubject] el ghost no pasó el control de fidelidad en 4 intentos — recorte real fiel');
      return false;
    };

    const rembgLastResort = async () => {
      console.warn('[bg-remove:removeSubject] cayendo a rembg-last-resort (deja la modelo → hard-fail en pipeline)');
      resultUrl = await removeBgReplicate(imageUrl);
      usedProvider = 'rembg-last-resort';
    };

    // PLAN aprobado: ghost pulido con GUARDIA Claude Vision por default. El guardia
    // rechaza alucinaciones y reintenta; si tras 4 intentos ninguna pasa, cae al
    // recorte REAL fiel (plano, nunca inventa). NUNCA muestra una alucinación ni queda
    // en error.
    if (method === 'grounded-sam') {
      // Modo recorte real explícito: solo píxeles reales (plano, textura exacta).
      if (!(await tryGroundedSam())) await rembgLastResort();
    } else {
      // DEFAULT: ghost VALIDADO — apunta al look profesional FIEL (como funcionó ayer).
      // El guardia Claude Vision rechaza tiradas con textura de muñeco, estructura
      // distinta, collage front+atrás o persona, y reintenta. Si ninguna pasa en 4
      // intentos → recorte real fiel → último recurso rembg.
      if (!(await tryGhost())) {
        if (!(await tryGroundedSam())) await rembgLastResort();
      }
    }

    await saveJob({
      operation: 'bg-remove',
      provider: usedProvider,
      inputParams: { imageUrl, removeSubject: true, garmentType },
      outputUrl: resultUrl,
      cost: ISOLATE_COST,
    });
    // proxyReplicateUrl solo se usa si el URL resultado ES de Replicate. SeedDream
    // devuelve URLs de fal.media que NO deben envolverse — hacerlo las corrompe
    // y tryon recibe un .json en lugar de imagen (422 image_load_error).
    const isReplicateUrl = resultUrl.includes('replicate.delivery') || resultUrl.includes('replicate.com');
    const outputUrl = isReplicateUrl ? proxyReplicateUrl(resultUrl) : resultUrl;
    return NextResponse.json({
      success: true,
      data: { url: outputUrl, provider: usedProvider, regenerated },
      cost: ISOLATE_COST,
    });
  }

  // Browser-based processing cannot run on the server
  if (provider === 'browser') {
    return NextResponse.json(
      {
        success: false,
        error:
          'Browser-based background removal runs client-side only. Use @imgly/background-removal directly in the browser.',
      },
      { status: 400 },
    );
  }

  let resultUrl: string;
  const cost = PROVIDER_COSTS[provider] ?? 0;

  switch (provider) {
    case 'replicate': {
      resultUrl = await removeBgReplicate(imageUrl);
      break;
    }

    case 'withoutbg': {
      const healthy = await isWithoutBgHealthy();
      if (!healthy) {
        // Auto-fallback to Replicate when Docker is not available
        console.log('[API /bg-remove] withoutBG not available, falling back to Replicate');
        resultUrl = await removeBgReplicate(imageUrl);
        break;
      }
      resultUrl = await removeBgWithoutBg(imageUrl);
      break;
    }

    default:
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported provider "${provider}". Use "replicate", "withoutbg", or "browser".`,
        },
        { status: 400 },
      );
  }

  await saveJob({
    operation: 'bg-remove',
    provider,
    inputParams: { imageUrl },
    outputUrl: resultUrl,
    cost,
  });

  return NextResponse.json({
    success: true,
    data: { url: proxyReplicateUrl(resultUrl), provider },
    cost,
  });
});
