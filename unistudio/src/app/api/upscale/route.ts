// =============================================================================
// Image Upscale API Route - UniStudio
// POST: Accepts JSON { imageUrl, provider, scale, faceEnhance?, prompt?, softFail? }
// Routes to appropriate upscale model via Replicate.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { saveJob } from '@/lib/db/persist';
import { proxyReplicateUrl } from '@/lib/utils/image';
import sharp from 'sharp';

/**
 * Real-ESRGAN OOMs on the OUTPUT tensor, not the input.
 *
 * The previous version capped the INPUT at 2M px, which at scale 2 asks the GPU
 * for an 8M px output — the model then tries to allocate ~5.7 GiB in one block
 * and dies with "CUDA out of memory" on Replicate's shared 14.6 GiB GPUs. That
 * is exactly the error the jewelry pipeline was hitting on every run.
 *
 * So the budget is expressed on the OUTPUT and the input cap is derived from
 * the requested scale: scale 2 → 1M px in, scale 4 → 250k px in.
 */
const MAX_OUTPUT_PIXELS = 4_000_000;

/** Detects the OOM / oversize family of upstream errors so we can retry smaller. */
function isCapacityError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('out of memory') ||
    msg.includes('cuda') ||
    msg.includes('greater than the max size') ||
    msg.includes('too large')
  );
}

// Provider cost estimates in dollars
const PROVIDER_COSTS: Record<string, number> = {
  'real-esrgan': 0.02,
  clarity: 0.05,
  'aura-sr': 0.03,
  supir: 0.10, // SUPIR-v0Q en L40S — restauración real de fotos degradadas
};

/**
 * Downscale `imageUrl` so that width * height <= maxPixels, returning a data URL.
 * Returns the original URL untouched when it already fits.
 */
async function fitToPixelBudget(imageUrl: string, maxPixels: number): Promise<string> {
  let buffer: Buffer;
  if (imageUrl.startsWith('data:')) {
    const base64 = imageUrl.split(',')[1];
    buffer = Buffer.from(base64, 'base64');
  } else {
    const { replicateHeaders } = await import('@/lib/utils/image');
    const res = await fetch(imageUrl, { headers: replicateHeaders(imageUrl) });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  }

  const metadata = await sharp(buffer).metadata();
  const w = metadata.width ?? 0;
  const h = metadata.height ?? 0;
  const totalPixels = w * h;

  if (totalPixels > 0 && totalPixels <= maxPixels) return imageUrl;

  const ratio = Math.sqrt(maxPixels / Math.max(totalPixels, 1));
  const newW = Math.max(64, Math.floor(w * ratio));
  const newH = Math.max(64, Math.floor(h * ratio));

  const resized = await sharp(buffer)
    .resize(newW, newH, { fit: 'inside' })
    .png()
    .toBuffer();

  return `data:image/png;base64,${resized.toString('base64')}`;
}

/**
 * Run Real-ESRGAN with a shrinking input budget. Each attempt halves the input
 * pixel budget, so a piece that OOMs at 1M px gets a second chance at 500k
 * instead of taking the whole pipeline down with it.
 */
async function runRealEsrgan(
  imageUrl: string,
  scale: 2 | 4,
  faceEnhance: boolean,
): Promise<string> {
  let budget = Math.floor(MAX_OUTPUT_PIXELS / (scale * scale));
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const safeUrl = await fitToPixelBudget(imageUrl, budget);
      const output = await runModel(
        'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
        { image: safeUrl, scale, face_enhance: faceEnhance },
      );
      return await extractOutputUrl(output);
    } catch (err) {
      lastError = err;
      if (!isCapacityError(err)) throw err;
      budget = Math.floor(budget / 2);
      console.warn(
        `[API /upscale] real-esrgan capacity error, retrying with ${budget}px budget`,
      );
    }
  }
  throw lastError;
}

/** Clarity upscaler — used as the automatic fallback when Real-ESRGAN gives up. */
async function runClarity(imageUrl: string, scale: 2 | 4, prompt?: string): Promise<string> {
  // resemblance=0.85 keeps output faithful to original; creativity=0.25 avoids hallucination
  const input: Record<string, string | number | boolean> = {
    image: imageUrl,
    scale_factor: scale,
    resemblance: 0.85,
    creativity: 0.25,
    output_format: 'png',
  };
  if (prompt) input.prompt = prompt;
  const output = await runModel(
    'philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e',
    input,
  );
  return await extractOutputUrl(output);
}

/**
 * SUPIR-v0Q — restauración real de fotos MUY degradadas (pixeladas, borrosas,
 * baja resolución). A diferencia de real-esrgan (super-resolución fiel pero que
 * no recupera detalle perdido) y clarity (que deforma el producto), SUPIR
 * reconstruye textura y nitidez de forma semántica, ideal para el paso 1 del
 * pipeline de estáticos cuando la foto original de la vendedora es mala.
 *
 * Usa la variante v0Q (sin LLaVA) que corre en L40S ~39s — cabe en el
 * maxDuration de 120s de esta ruta. Prompts orientados a producto para que
 * respete la etiqueta y no invente objetos.
 *
 * El input se limita al presupuesto de pixeles como los demás para no reventar
 * la GPU. SUPIR es el más caro (~$0.10) por eso es opt-in, no el default.
 */
async function runSupir(imageUrl: string, scale: 2 | 4): Promise<string> {
  const safeUrl = await fitToPixelBudget(
    imageUrl,
    Math.floor(MAX_OUTPUT_PIXELS / (scale * scale)),
  );
  const output = await runModel(
    'cjwbw/supir-v0q:ede69f6a5ae7d09f769d683347325b08d2f83a93d136ed89747941205e0a71da',
    {
      image: safeUrl,
      upscale: scale,
      // Prompts de producto: pedimos nitidez y etiqueta legible, prohibimos que
      // invente objetos o deforme el frasco.
      a_prompt:
        'high quality professional product photography, sharp focus, crystal clear readable label text, clean detailed packaging, studio lighting, photo-realistic',
      n_prompt:
        'blurry, low quality, low resolution, distorted, deformed product, warped bottle, extra objects, duplicate product, text artifacts, watermark, cartoon, painting, oversmoothed',
      // Conservador para no alucinar: menos creatividad, más fidelidad al input.
      s_cfg: 4.0,
      s_stage2: 1.0,
    },
  );
  return await extractOutputUrl(output);
}

export async function POST(request: NextRequest) {
  // Hoisted so the catch block can honour softFail and echo the original image.
  let softFail = false;
  let originalUrl = '';

  try {
    const body = await request.json();
    const {
      imageUrl,
      provider,
      scale = 2,
      faceEnhance = false,
      prompt,
    } = body as {
      imageUrl: string;
      provider: 'real-esrgan' | 'clarity' | 'aura-sr' | 'supir';
      scale?: 2 | 4;
      faceEnhance?: boolean;
      prompt?: string;
      /**
       * When true, an unrecoverable upscale returns 200 with
       * { success: true, data.url = original, data.skipped = true } instead of a
       * 500. Callers that treat the upscale as a nice-to-have (jewelry pipeline)
       * set this so a GPU hiccup never kills the downstream steps.
       */
      softFail?: boolean;
    };

    // Capture into the hoisted vars so the catch block can honour soft-fail.
    softFail = body?.softFail === true;
    originalUrl = imageUrl;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "provider". Use "real-esrgan", "clarity", "aura-sr", or "supir".' },
        { status: 400 },
      );
    }

    if (scale !== 2 && scale !== 4) {
      return NextResponse.json(
        { success: false, error: '"scale" must be 2 or 4.' },
        { status: 400 },
      );
    }

    let resultUrl: string;
    let usedProvider: string = provider;
    let cost = PROVIDER_COSTS[provider] ?? 0;

    switch (provider) {
      case 'real-esrgan': {
        try {
          resultUrl = await runRealEsrgan(imageUrl, scale, faceEnhance);
        } catch (err) {
          if (!isCapacityError(err)) throw err;
          // Real-ESRGAN exhausted its retries. Clarity runs on a different
          // backend and handles bigger frames, so try it before giving up.
          console.warn('[API /upscale] real-esrgan exhausted, falling back to clarity');
          resultUrl = await runClarity(imageUrl, scale, prompt);
          usedProvider = 'clarity';
          cost = PROVIDER_COSTS.clarity;
        }
        break;
      }

      case 'clarity': {
        resultUrl = await runClarity(imageUrl, scale, prompt);
        break;
      }

      case 'aura-sr': {
        const safeUrl = await fitToPixelBudget(
          imageUrl,
          Math.floor(MAX_OUTPUT_PIXELS / (scale * scale)),
        );
        const output = await runModel('fofr/aura-sr', { image: safeUrl });
        resultUrl = await extractOutputUrl(output);
        break;
      }

      case 'supir': {
        // Restauración fuerte. Si SUPIR falla (GPU llena, timeout), caemos a
        // real-esrgan que es fiel y rápido, para no dejar el paso sin HD.
        try {
          resultUrl = await runSupir(imageUrl, scale);
        } catch (err) {
          console.warn('[API /upscale] supir falló, cayendo a real-esrgan:', err);
          resultUrl = await runRealEsrgan(imageUrl, scale, faceEnhance);
          usedProvider = 'real-esrgan';
          cost = PROVIDER_COSTS['real-esrgan'];
        }
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported provider "${provider}". Use "real-esrgan", "clarity", "aura-sr", or "supir".`,
          },
          { status: 400 },
        );
    }

    await saveJob({
      operation: 'upscale',
      provider: usedProvider,
      inputParams: { imageUrl, scale, faceEnhance, prompt },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: { url: proxyReplicateUrl(resultUrl), provider: usedProvider, scale },
      cost,
    });
  } catch (error) {
    console.error('[API /upscale] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado al escalar.';

    const userMsg = isCapacityError(error)
      ? 'La imagen es demasiado grande para la GPU incluso tras reducirla. Probá con una foto más chica.'
      : msg;

    // Soft-fail callers (jewelry pipeline) get the ORIGINAL image back with a
    // 200 + skipped flag, so a GPU hiccup degrades the sharpness of one step
    // instead of taking every downstream step down with it.
    if (softFail && originalUrl) {
      return NextResponse.json({
        success: true,
        data: { url: originalUrl, provider: 'none', scale: 1, skipped: true, reason: userMsg },
        cost: 0,
      });
    }

    return NextResponse.json({ success: false, error: userMsg }, { status: 500 });
  }
}
