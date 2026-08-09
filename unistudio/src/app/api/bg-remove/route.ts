// =============================================================================
// Background Removal API Route - UniStudio
// POST: Accepts JSON { imageUrl, provider, options? }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import {
  removeBgReplicate,
  removeBgWithoutBg,
  removeBgBirefnet,
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
import { ghostMannequinPhotoroom } from '@/lib/api/photoroom';
import { proxyReplicateUrl, replicateHeaders } from '@/lib/utils/image';
import { CLAUDE_HAIKU, CLAUDE_SONNET } from '@/lib/utils/constants';

const PROVIDER_COSTS: Record<string, number> = {
  replicate: 0.01,
  browser: 0,
  withoutbg: 0,
  // BiRefNet (fal). El mejor medido para joyeria — ver removeBgBirefnet().
  birefnet: 0.01,
};

// Cost of the garment isolation path (grounded_sam + local compositing)
const ISOLATE_COST = 0.01;

/**
 * Circuit breaker de Photoroom. El efecto Ghost Mannequin vive en el plan Plus
 * (de pago): sin suscripción activa la API responde 401/402/403 para TODAS las
 * imágenes, siempre. Sin este breaker un batch de 6 fotos pagaba 6 round-trips
 * inútiles (subir la imagen + esperar el rechazo) antes de caer al recorte real
 * cada vez. Al primer rechazo por plan/credenciales lo damos por no disponible
 * durante el resto de la vida del proceso y vamos directo al método que sí anda.
 * Se resetea solo cuando Vercel recicla la lambda (o al reiniciar `npm run dev`),
 * así que si contratás el plan no hay que tocar nada.
 */
let photoroomUnavailable = false;

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
            { type: 'text', text: `Compare IMAGE 2 to the real ${noun} in IMAGE 1.${hint ? ' Real construction: ' + hint + '.' : ''} IMAGE 2 PASSES only if ALL are true: (a) FRONT CLOSURE matches EXACTLY — if IMAGE 1 has a vertical column of hook-and-eye clasps (or a zipper/buttons) down the center front, IMAGE 2 MUST clearly show that same closure; a smooth/plain front with no closure is a FAIL; (b) SIDE PANELS match — if IMAGE 1 has sheer MESH panels on the sides/underarm, IMAGE 2 MUST show those same mesh panels; plain solid sides with no mesh is a FAIL; (c) OVERALL SHAPE matches — same cup style (soft/wireless/unstructured vs molded/push-up), same coverage and silhouette and proportions, same strap width; turning a soft full-coverage ${noun} into a molded push-up look is a FAIL; (d) fabric looks like REAL photographed cloth with natural satin sheen — NOT plastic, rubbery, cartoonish, CGI or doll-like; (e) ONE single front product — NOT two mannequins, NOT a front+back collage; (f) NO visible human person, face or skin. Answer ONLY "yes" if ALL of (a)(b)(c)(d)(e)(f) pass, or "no" if ANY one fails.` },
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
function garmentNegativePrompt(garmentType: string | null, override?: string): string {
  // Utileria nombrada por Vision (cilindro, pedestal, bandeja...). Se suma a la
  // base para que la mascara la reste.
  if (override && override.trim()) return `background,${override.trim()}`;
  // MÍNIMO a propósito: antes restábamos skin/shoulder/neck/arm — pero en un bra
  // deportivo los tirantes van sobre los hombros y el escote toca el cuello, así que
  // esas restas EROSIONABAN la máscara hasta dejarla vacía → "no se pudo recortar".
  // Ahora solo restamos el FONDO (nunca solapa la prenda). Grounding DINO ya acota la
  // caja a la prenda, así que no necesitamos restar piel/hombros.
  const base = 'background';
  // Panties van bajo en cadera → muslo/pierna no solapan, ayudan a limpiar bordes.
  if (garmentType === 'panty') return `${base},thigh,leg`;

  // Joyería: lo que contamina la máscara no es piel sino el ATREZO. Las fotos de
  // taller llegan con la pieza sobre pedestales, bandejas y tarjetas, y con
  // precio/marca de agua encima. Nada de eso solapa la pieza, así que restarlo
  // limpia los bordes sin erosionar la cadena.
  const JEWELRY_TYPES = new Set([
    'necklace', 'rosary', 'earrings', 'studs', 'hoops', 'ring', 'bracelet',
  ]);
  if (garmentType && JEWELRY_TYPES.has(garmentType)) {
    return `${base},display stand,pedestal,riser,podium,tray,display card,box,text,watermark,price tag,label`;
  }

  return base;
}

/**
 * Map our internal garmentType values to the exact text prompt that
 * grounded_sam (Grounding DINO under the hood) responds to best.
 */
function garmentTypeToPrompt(garmentType: string | null, override?: string): string {
  // Vocabulario dirigido por Vision. Gana sobre la tabla fija: la tabla solo
  // sabe de tipos, Vision mira ESTA foto y nombra las partes reales.
  if (override && override.trim()) return override.trim();
  switch (garmentType) {
    case 'bra':
      // Grounding DINO responds better to a richer vocabulary — catches
      // soft bras, sports bras, wireless, bralettes, and nude/skin-tone
      // pieces that the single word "bra" sometimes misses.
      // Se agregan los TIRANTES explicitamente: Grounding DINO segmentaba el
      // cuerpo del bra pero recortaba los breteles (quedaba un mordisco en el
      // hombro), porque ninguna palabra del prompt los nombraba.
      return 'bra,bralette,sports bra,wireless bra,soft bra,lingerie top,chest garment,bra straps,shoulder straps,straps';
    case 'lingerie':
    case 'bodysuit':
      return 'bra,bralette,lingerie top,bodysuit,one-piece lingerie,straps,shoulder straps';
    case 'panty':
      return 'panty,underwear bottom,briefs,thong,bikini bottom';
    case 'set':
      return 'lingerie set,bra and panty,bra,panty';
    case 'swimwear':
      return 'swimsuit,bikini,swim top,swim bottom';
    case 'shapewear':
      return 'shapewear,bodysuit,compression garment';

    // ---- Joyería -----------------------------------------------------------
    // Grounding DINO necesita nombrar CADA parte de la pieza, no solo la
    // categoría. Con joyería el error clásico es que agarra el colgante (objeto
    // compacto y contrastado) y suelta la cadena, porque ninguna palabra del
    // prompt nombra los eslabones. Verificado con el rosario: rembg devolvía la
    // foto casi intacta y el macro terminaba mostrando solo la cruz.
    case 'necklace':
      return 'necklace,chain,chain links,pendant,charm,clasp,jewelry';
    case 'rosary':
      // El rosario es una cadena de cuentas: sin 'beads' / 'bead chain' el
      // modelo trata cada bolita como ruido y se queda con el crucifijo.
      return 'rosary,rosary beads,bead chain,beaded necklace,beads,chain,chain links,crucifix,cross pendant,religious medal,medallion,jewelry';
    case 'earrings':
    case 'studs':
    case 'hoops':
      return 'earrings,pair of earrings,earring,stud earring,hoop earring,ear hook,jewelry';
    case 'ring':
      return 'ring,finger ring,band,gemstone setting,jewelry';
    case 'bracelet':
      return 'bracelet,chain bracelet,bangle,chain links,clasp,charm,jewelry';
    case 'set':
      return 'jewelry set,necklace,chain,chain links,pendant,earrings,bracelet,jewelry';

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
  // Vocabulario dirigido por Claude Vision para ESTA foto. Sin esto la
  // segmentacion usa la tabla fija por tipo, que no sabe distinguir el producto
  // de la utileria del taller: con una pulsera apoyada en un cilindro blanco se
  // queda con los dos.
  subjectPrompt?: string,
  propPrompt?: string,
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

  const maskPrompt = garmentTypeToPrompt(garmentType, subjectPrompt);
  const negPrompt = garmentNegativePrompt(garmentType, propPrompt);
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
        negative_mask_prompt: negPrompt,
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

  // UNION DE MASCARAS DEL MISMO PRODUCTO. grounded_sam devuelve 4 candidatas y
  // antes se usaba UNA sola: si a esa le faltaba un bretel, el recorte salia
  // mordido (reportado por la usuaria: al bra le faltaba el tirante derecho).
  // Las otras candidatas suelen cubrir justo lo que a la elegida le falta.
  //
  // Solo se unen las que son del MISMO objeto: cobertura entre 0.5x y 2x de la
  // elegida. Sin ese rango entraria tambien la mascara de cuerpo entero
  // (coverage ~0.9 en las fotos con modelo) y volveria la persona al recorte.
  if (bestMask) {
    const lo = bestCoverage * 0.5;
    const hi = bestCoverage * 2;
    let merged = 0;
    for (const c of candidates) {
      if (c.buffer === bestMask) continue;
      if (c.purity < 0.9) continue;
      if (c.coverage < lo || c.coverage > hi) continue;
      if (c.buffer.length !== bestMask.length) continue;
      for (let i = 0; i < bestMask.length; i++) {
        if (c.buffer[i] > bestMask[i]) bestMask[i] = c.buffer[i];
      }
      merged++;
    }
    if (merged > 0) console.log(`[bg-remove:isolate] union de ${merged} mascara(s) extra para tapar huecos`);
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
    // COLOR APAGADO (reportado 2026-08-08: "el color no sale vivo"). El recorte se
    // componía sobre `prepared`, que es la foto re-encodeada a JPEG q90 y limitada a
    // 1024px — pensada para que grounded_sam infiera rápido, NO para ser el resultado
    // final. En satén negro los degradados y reflejos son justo lo que el JPEG tira
    // primero, así que la prenda salía chata. `prepared` sigue alimentando la
    // segmentación; el recorte final ahora se compone sobre la foto ORIGINAL, y la
    // máscara se escala a esa resolución.
    // MISMO redimensionado que `prepared` (así la máscara calza exacto, sin
    // reescalarla), pero PNG sin pérdida en vez de JPEG q90, y con el alfa quitado
    // AL ESCRIBIR: si el buffer conserva su canal alfa, joinChannel agrega un 5º
    // canal que sharp descarta al guardar el PNG — el recorte no se aplica y vuelve
    // la foto entera con la modelo. Sin alfa, el canal que unimos queda como alfa real.
    const originalHQ = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .png()
      .toBuffer();
    const ow = width;
    const oh = height;
    const maskFull = bestMask;

    // 1) recorte transparente fiel, a resolución original.
    //    removeAlpha() y NO ensureAlpha(): `prepared` era JPEG (3 canales) así que
    //    ensureAlpha+joinChannel daba RGBA correcto, pero la foto ORIGINAL suele ser
    //    PNG que YA trae alfa → ensureAlpha no hacía nada y joinChannel agregaba un
    //    5º canal que sharp descarta al escribir el PNG: el recorte no se aplicaba y
    //    volvía la foto entera con la modelo. Quitando el alfa primero, el canal que
    //    unimos siempre queda como alfa real.
    const cutout = await sharp(originalHQ)
      .joinChannel(maskFull, { raw: { width: ow, height: oh, channels: 1 } })
      .png()
      .toBuffer();
    // 2) componer sobre fondo BLANCO + el MISMO realce sutil de satén que ya se le
    //    aplicaba al resultado de Photoroom (enhanceSatinSheen en lib/api/photoroom.ts).
    //    Estaba solo en ese camino, así que el recorte real se veía más apagado al
    //    lado del ghost. linear(1.06,-5): apenas contraste, sin sharpen — el realce
    //    fuerte hacía ver el satén de plástico (ver commit 1df5a57). Sobre el blanco
    //    no tiene efecto visible (255 satura igual).
    isolated = await sharp({
      create: { width: ow, height: oh, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .composite([{ input: cutout }])
      .linear(1.06, -5)
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
  const { imageUrl, provider, removeSubject, garmentType, returnMaskOnly, garmentDescription, isolateMethod, subjectPrompt, propPrompt, options } = body as {
    imageUrl: string;
    provider: 'browser' | 'replicate' | 'withoutbg' | 'birefnet';
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
    isolateMethod?: 'photoroom' | 'photoroom-sandbox' | 'grounded-sam' | 'ghost' | 'auto';
    /** Palabras que nombran el producto (Vision). Sobrescriben la tabla por tipo. */
    subjectPrompt?: string;
    /** Palabras que nombran la utileria a restar (Vision). */
    propPrompt?: string;
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
      const maskUrl = await isolateGarment(imageUrl, garmentType ?? null, true, subjectPrompt, propPrompt);
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
    const MAX_GHOST_ATTEMPTS = 3;

    // grounded_sam: recorte de pixeles REALES (fiel). usedProvider claro.
    // Capturamos el error REAL para poder mostrarlo (la usuaria necesita ver por
    // qué falla, no el mensaje genérico).
    let groundedSamError = '';
    // grounded_sam es NO-DETERMINISTA: Grounding DINO + SAM devuelven 4 máscaras
    // candidatas que cambian entre corridas, y isolateGarment las filtra por
    // coverage/purity. La MISMA foto puede fallar en un intento y salir perfecta
    // en el siguiente. Aun así corría UNA sola vez — mientras el ghost tenía 3
    // reintentos y la subida a fal otros 3. Un único mal sorteo dejaba a la
    // usuaria sin el camino gratuito y la empujaba a gastar cuota de Photoroom.
    // 2 intentos cubren la mayoría de los fallos por azar sin alargar de más
    // (cada uno ~15-20s) ni arriesgar el timeout de 300s de Vercel.
    const MAX_SAM_ATTEMPTS = 2;
    const tryGroundedSam = async (): Promise<boolean> => {
      for (let attempt = 1; attempt <= MAX_SAM_ATTEMPTS; attempt++) {
        try {
          resultUrl = await isolateGarment(imageUrl, garmentType ?? null, false, subjectPrompt, propPrompt);
          usedProvider = 'grounded-sam-isolate';
          if (attempt > 1) console.log(`[bg-remove:removeSubject] grounded_sam OK en el intento ${attempt}`);
          return true;
        } catch (err) {
          groundedSamError = err instanceof Error ? err.message : String(err);
          console.warn(`[bg-remove:removeSubject] grounded_sam intento ${attempt}/${MAX_SAM_ATTEMPTS} falló (${groundedSamError})`);
        }
      }
      return false;
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
      for (let attempt = 1; attempt <= MAX_GHOST_ATTEMPTS; attempt++) {
        try {
          // EXACTO como ayer: ghost desde TU FOTO original (imageUrl), solo el frente
          // (back = undefined). Así salió la imagen buena. El combo (recorte como input)
          // empeoraba la forma → revertido.
          const ghost = await modelToGhost(imageUrl, garmentType ?? undefined, undefined, garmentDescription);
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
      console.warn('[bg-remove:removeSubject] el ghost no pasó el control de fidelidad en 3 intentos — recorte real fiel');
      return false;
    };

    const rembgLastResort = async () => {
      console.warn('[bg-remove:removeSubject] cayendo a rembg-last-resort (deja la modelo → hard-fail en pipeline)');
      resultUrl = await removeBgReplicate(imageUrl);
      usedProvider = 'rembg-last-resort';
    };

    // PHOTOROOM Ghost Mannequin API: servicio dedicado que quita la modelo y deja el
    // producto flotando 3D sobre blanco, preservando la tela visible (no es un editor
    // generativo libre). Es el método recomendado tras la investigación. Si la key no
    // está, o Photoroom filtra la lencería, tira error → el caller cae al siguiente.
    let photoroomError = '';
    const tryPhotoroom = async (sandbox = false): Promise<boolean> => {
      // Sin key configurada no hay nada que intentar: evitamos el round-trip y
      // arrancamos directo por el recorte real, que sí funciona con las keys de
      // fal/Replicate que ya están puestas.
      if (!process.env.PHOTOROOM_API_KEY?.trim()) {
        console.log('[bg-remove:removeSubject] sin PHOTOROOM_API_KEY — directo al recorte real');
        return false;
      }
      if (photoroomUnavailable && !sandbox) {
        console.log('[bg-remove:removeSubject] Photoroom ya rechazó por plan en este proceso — salteando');
        return false;
      }
      try {
        // Anclar el ghost al producto REAL. Photoroom recibe una sola foto, así
        // que el interior que se ve por el escote y el acabado de la tela los
        // inventa: con este bra devolvía interior liso y satén mate, cuando el
        // real tiene espalda de malla transparente y brillo satinado. El prompt
        // es la única palanca disponible (su API no acepta una segunda imagen
        // del interior — confirmado en su documentación).
        // Orden = prioridad: el ghost es generativo y reinterpreta lo que no se le
        // ancla, así que lo que va primero es lo que NO se puede perder.
        //
        // La primera versión de este prompt pedía "mostrá el panel interior de la
        // espalda por el escote". Resultado: recuperó el brillo del satén pero
        // abrió el escote en V y se comió los ganchos del frente — que son la
        // firma del producto. Esa instrucción se elimina: Photoroom recibe UNA
        // sola foto y el interior no está en ella, así que pedirlo solo lo empuja
        // a agrandar la abertura para dibujar algo ahí.
        // Orden = prioridad: el ghost es generativo y reinterpreta todo lo que no
        // se le ancla, así que lo que NO se puede perder va primero.
        //
        // AGNÓSTICO AL PRODUCTO — regla del proyecto y requisito real: el catálogo
        // tiene ~490 variantes con cierres distintos (ganchos al frente, broche
        // atrás, zipper, sin cierre), escotes distintos y telas distintas. Una
        // versión anterior de este prompt decía literalmente "hook-and-eye clasps":
        // servía para un bra y le habría inventado ganchos a los otros 76. Acá se
        // describen CATEGORÍAS ("el cierre que sea", "la tela que sea") y los
        // detalles concretos llegan por garmentDescription, que Claude Vision saca
        // de CADA foto.
        const ghostPrompt = [
          'ghost mannequin product photo, invisible mannequin, STRAIGHT FRONT VIEW ONLY',
          // La ficha del producto ahora se arma con TODAS las vistas (frontal +
          // espalda), asi que puede describir la construccion de atras: malla,
          // cruce de tirantes, broche. Sin esta aclaracion Photoroom tomaba esos
          // datos como lo que debia renderizar y devolvia la prenda DE ESPALDAS
          // aunque la foto de entrada fuera frontal. La ficha es CONTEXTO de como
          // esta construida la prenda, no la vista a dibujar.
          'The description below may mention how the BACK is built (mesh, strap crossing, closure). ' +
            'That is context only — do NOT render the back. Show the garment from the FRONT, as in the input photo',
          'CRITICAL: reproduce the garment EXACTLY as photographed. Keep whatever closure it has (hooks, clasps, zipper, buttons, or none) in the same place, same type and same size — never add, remove, move or substitute a closure',
          'Keep the exact original neckline shape, height and coverage — do NOT deepen it and do NOT change its cut',
          'Keep the exact fabric finish: if it is satin, silk or glossy keep its bright specular highlights and reflective sheen; if it is matte or cotton keep it matte. Never change the material look',
          'Keep any sheer, mesh, lace or contrast panels exactly where they are, with the same size and transparency',
          'Keep the strap width, band width and overall silhouette identical to the photo',
          garmentDescription?.trim() ? `The real garment: ${garmentDescription.trim()}` : '',
        ]
          .filter(Boolean)
          .join('. ');
        const png = await ghostMannequinPhotoroom(imageUrl, sandbox, ghostPrompt);
        // Persistir en fal para downstream estable (la pipeline espera una URL).
        const candidateUrl = await uploadToFalStorage(png, 'image/png', 'photoroom-ghost.png');

        // GUARDIA DE FIDELIDAD TAMBIÉN EN PHOTOROOM (hueco detectado 2026-08-08 por
        // la usuaria). ghostMatchesProduct solo corría en el camino del ghost
        // generativo; el resultado de Photoroom se aceptaba SIN validar. Por eso
        // pasó sin aviso un bra de satén devuelto en negro MATE: Photoroom
        // re-ilumina la prenda y le borra los reflejos, y el chequeo (d) del
        // guardia —"tela real con brillo satinado natural"— nunca llegó a correr.
        //
        // Importa sobre todo en producción por lotes: revisar 490 resultados a ojo
        // no es viable. Acá el guardia devuelve `false` y el caller cae al recorte
        // real, que preserva los píxeles (y con ellos el brillo). Si no hay
        // ANTHROPIC_API_KEY devuelve null → aceptamos, como en el otro camino.
        // El guardia AVISA pero NO descarta. Cuando descartaba (primera versión de
        // este cambio) el caller caía a grounded_sam, y el recorte real sale peor
        // que el Photoroom rechazado: plano y a veces mordido en un tirante. O sea,
        // el "control de calidad" empeoraba la imagen que veía la usuaria.
        //
        // Photoroom re-ilumina y aplana el satén, así que su resultado casi siempre
        // falla el chequeo (d) del guardia (brillo satinado natural) aunque la forma,
        // el cierre y la malla estén perfectos. Rechazar por eso es tirar la mejor
        // imagen disponible. Se registra en el log y el provider queda marcado para
        // que la usuaria pueda revisar, pero la imagen se entrega.
        const faithful = await ghostMatchesProduct(imageUrl, candidateUrl, garmentType ?? null, garmentDescription);
        if (faithful === false) {
          console.warn('[bg-remove:removeSubject] AVISO: Photoroom no pasó el control de fidelidad (probablemente el satén quedó mate) — se entrega igual porque el recorte real sale peor');
        }

        resultUrl = candidateUrl;
        usedProvider = 'photoroom-ghost-mannequin';
        console.log('[bg-remove:removeSubject] Photoroom ghost-mannequin OK' + (faithful === null ? ' (sin validar: falta ANTHROPIC_API_KEY)' : ' ✓ validado'));
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // 401/402/403 = key inválida o plan sin Ghost Mannequin. Eso NO se
        // arregla reintentando con otra foto → apagamos Photoroom para el resto
        // del proceso. Otros errores (timeout, filtro de contenido puntual) sí
        // pueden ser específicos de una imagen, así que esos no lo apagan.
        if (/Photoroom \/v2\/edit (401|402|403)\b/.test(msg) || msg.includes('PHOTOROOM_API_KEY no está configurada')) {
          if (!sandbox) photoroomUnavailable = true;
          console.warn('[bg-remove:removeSubject] Photoroom rechazó por plan/credenciales — desactivado para el resto del proceso');
        }
        console.warn(`[bg-remove:removeSubject] Photoroom falló (${msg})`);
        // EL ERROR REAL SE PERDIA ACA. La funcion solo devolvia false y el caller
        // imprimia un texto ADIVINADO ("causa tipica: cuota agotada o la key no
        // tiene Ghost Mannequin"). Verificado el 2026-08-09 contra produccion:
        // esas dos causas eran FALSAS —la cuota estaba bien y la key si tiene
        // Ghost Mannequin— asi que el mensaje mandaba a buscar el problema al
        // lugar equivocado y tapaba el motivo verdadero. Es el mismo patron de
        // sustitucion silenciosa que ya nos costo semanas en el Paso 2: un texto
        // inventado leido como si fuera un diagnostico.
        photoroomError = msg;
        return false;
      }
    };

    // PLAN aprobado: ghost pulido con GUARDIA Claude Vision por default. El guardia
    // rechaza alucinaciones y reintenta; si tras 4 intentos ninguna pasa, cae al
    // recorte REAL fiel (plano, nunca inventa). NUNCA muestra una alucinación ni queda
    // en error.
    // EL SELECTOR MANDA. Antes cada metodo caia en silencio a otro cuando fallaba,
    // asi que los CUATRO caminos terminaban en grounded_sam: la usuaria elegia
    // cosas distintas y veia siempre la misma imagen, sin enterarse de cual habia
    // corrido. Ese mismo patron de sustitucion silenciosa oculto durante meses que
    // Uwear estaba roto en el Paso 2 (elegia Uwear, corria SeedDream), y llevo a
    // ajustar prompts en la capa equivocada.
    //
    // Ahora: si elegis un metodo, se usa ESE. Si falla, se devuelve el error REAL
    // nombrando el metodo — nunca una imagen de otro proveedor haciendose pasar por
    // el elegido. 'auto' sigue siendo el unico que encadena, porque eso es lo que
    // significa.
    if (method === 'photoroom' || method === 'photoroom-sandbox') {
      const sandbox = method === 'photoroom-sandbox';
      if (!(await tryPhotoroom(sandbox))) {
        return NextResponse.json({
          success: false,
          // El error REAL primero, sin adornos. Las "causas tipicas" que habia
          // aca eran una conjetura y resultaron falsas al verificarlas.
          error:
            `Photoroom${sandbox ? ' (modo prueba)' : ''} no pudo procesar esta foto` +
            `${photoroomError ? `: ${photoroomError}` : '.'} ` +
            `Podés elegir "Recorte real" en el selector de Método — es gratis y no depende de Photoroom.`,
        });
      }
    } else if (method === 'grounded-sam') {
      if (!(await tryGroundedSam())) {
        return NextResponse.json({
          success: false,
          error:
            `El recorte real no encontro la prenda en esta foto` +
            `${groundedSamError ? ` (${groundedSamError})` : ''}. ` +
            `Dale "Rehacer" — es no-determinista y suele salir al segundo intento. ` +
            `Si vuelve a fallar, probá con una foto donde la prenda se vea completa.`,
        });
      }
    } else if (method === 'ghost') {
      if (!(await tryGhost())) {
        return NextResponse.json({
          success: false,
          error:
            'El ghost 3D no paso el control de fidelidad: lo que genero no coincide con tu producto real. ' +
            'Elegi "Recorte real" (usa los pixeles de tu foto, nunca inventa) o dale "Rehacer".',
        });
      }
    } else {
      // 'auto' — el UNICO que encadena, y avisa cual corrio via data.provider.
      if (!(await tryPhotoroom())) {
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

    case 'birefnet': {
      // Recorte fino: conserva cadenas, aros y grabados. Si fal falla, caemos a
      // rembg para no dejar al pipeline sin recorte — pero el resultado sera
      // peor, asi que se registra el proveedor real que corrio.
      try {
        resultUrl = await removeBgBirefnet(imageUrl);
      } catch (err) {
        console.warn('[API /bg-remove] birefnet failed, falling back to rembg:', err);
        resultUrl = await removeBgReplicate(imageUrl);
      }
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
