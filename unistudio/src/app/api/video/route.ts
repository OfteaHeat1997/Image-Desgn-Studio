// =============================================================================
// Video Generation API Route - UniStudio (Video Studio)
// POST: Accepts JSON with multi-provider support (fal.ai + Replicate)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl, ReplicateApiError } from '@/lib/api/replicate';
import { runFal, extractFalVideoUrl, ensureFalAccessibleUrl, FalApiError } from '@/lib/api/fal';
import { saveJob } from '@/lib/db/persist';
import { proxyReplicateUrl } from '@/lib/utils/image';
import { VIDEO_PROVIDERS, getProviderCost } from '@/lib/video/providers';
import { getPresetById } from '@/lib/video/presets';
import type { VideoProviderKey, VideoCategory, VideoMode } from '@/types/video';

// Video generation can take 2-5 minutes for AI providers
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      falImageUrl,
      provider: providerKey = 'wan-2.2-fast',
      preset,
      prompt: userPrompt,
      duration = 5,
      aspectRatio = '16:9',
      category = 'product',
      mode = 'manual',
      // Legacy fields for backward compat
      motionType,
    } = body as {
      imageUrl: string;
      falImageUrl?: string | null;
      provider?: VideoProviderKey;
      preset?: string;
      prompt?: string;
      duration?: number;
      aspectRatio?: string;
      category?: VideoCategory;
      mode?: VideoMode;
      motionType?: string;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    // Validate duration
    if (typeof duration !== 'number' || duration < 1 || duration > 30) {
      return NextResponse.json(
        { success: false, error: 'Duration must be a number between 1 and 30 seconds.' },
        { status: 400 },
      );
    }

    // Validate prompt length
    if (userPrompt && userPrompt.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'El prompt no puede superar 1000 caracteres.' },
        { status: 400 },
      );
    }

    // Validate aspectRatio format
    const validAspectRatios = ['16:9', '9:16', '1:1', '4:3', '3:4'];
    if (!validAspectRatios.includes(aspectRatio)) {
      return NextResponse.json(
        { success: false, error: `Invalid aspectRatio "${aspectRatio}". Valid: ${validAspectRatios.join(', ')}` },
        { status: 400 },
      );
    }

    // Resolve provider config
    const provider = VIDEO_PROVIDERS[providerKey];
    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown provider "${providerKey}". Available: ${Object.keys(VIDEO_PROVIDERS).join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Pre-flight API key check — fail fast with 503 instead of crashing inside the provider call
    if (provider.backend === 'replicate' && !process.env.REPLICATE_API_TOKEN?.trim()) {
      console.error('[API /video] REPLICATE_API_TOKEN is not set');
      return NextResponse.json(
        { success: false, error: 'El servicio de video (Replicate) no está configurado. Contacta al administrador.' },
        { status: 503 },
      );
    }
    if (provider.backend === 'fal' && !(process.env.FAL_KEY ?? process.env.FAL_API_KEY)?.trim()) {
      console.error('[API /video] FAL_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'El servicio de video (fal.ai) no está configurado. Contacta al administrador.' },
        { status: 503 },
      );
    }

    // Build the motion prompt
    const presetConfig = preset ? getPresetById(preset) : null;
    const motionPrompt = presetConfig?.promptTemplate ?? '';

    const fullPrompt = userPrompt
      ? userPrompt + (motionPrompt ? `. ${motionPrompt}` : '')
      : motionPrompt || 'Product video showcase. Professional commercial quality, smooth motion, high production value.';

    let resultUrl: string;
    const cost = getProviderCost(provider, duration);

    // Resolve the image URL for each backend:
    // - fal.ai: use falImageUrl (pre-uploaded to fal CDN during initial upload) if available,
    //   otherwise fall back to ensureFalAccessibleUrl (handles data URIs + private Replicate URLs)
    // - Replicate: imageUrl is already the Replicate file URL from the upload step
    let httpImageUrl = imageUrl;
    if (provider.backend === 'fal') {
      httpImageUrl = falImageUrl || await ensureFalAccessibleUrl(imageUrl);
    }

    switch (provider.backend) {
      case 'fal': {
        let falInput: Record<string, unknown>;

        if (providerKey === 'ltx-video' || providerKey === 'kenburns') {
          falInput = {
            image_url: httpImageUrl,
            prompt: fullPrompt,
          };
        } else if (providerKey === 'wan-2.5') {
          falInput = {
            image_url: httpImageUrl,
            prompt: fullPrompt,
            duration: Math.min(duration, 10),
            resolution: '480p',
          };
        } else if (providerKey === 'kling-2.6') {
          falInput = {
            start_image_url: httpImageUrl,
            prompt: fullPrompt,
            duration: String(Math.min(duration, 10)),
          };
        } else if (providerKey === 'minimax-hailuo') {
          falInput = {
            image_url: httpImageUrl,
            prompt: fullPrompt,
            prompt_optimizer: true,
          };
        } else {
          falInput = {
            image_url: httpImageUrl,
            prompt: fullPrompt,
          };
        }

        const output = await runFal(provider.model, falInput);
        resultUrl = extractFalVideoUrl(output);
        break;
      }

      case 'replicate': {
        if (providerKey === 'wan-2.1') {
          // Wan 2.1 — uses aspect_ratio, no num_frames
          const output = await runModel(provider.model, {
            image: httpImageUrl,
            prompt: fullPrompt,
            negative_prompt: 'duplicate, split screen, double image, morphing, distorted, blurry, low quality, watermark, deformed',
            aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
          });
          resultUrl = await extractOutputUrl(output);
        } else if (providerKey === 'wan-2.2-fast') {
          // Wan 2.2 Fast — 16fps, minimum 81 frames (~5s)
          const numFrames = Math.max(81, Math.round(duration * 16));
          const output = await runModel(provider.model, {
            image: httpImageUrl,
            prompt: fullPrompt,
            negative_prompt: 'duplicate, split screen, double image, morphing, distorted, blurry, low quality, watermark, text overlay, deformed',
            num_frames: numFrames,
            guidance_scale: 3.0,
          });
          resultUrl = await extractOutputUrl(output);
        } else {
          const output = await runModel(provider.model, {
            image: httpImageUrl,
            prompt: fullPrompt,
          });
          resultUrl = await extractOutputUrl(output);
        }
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported backend "${provider.backend}".` },
          { status: 400 },
        );
    }

    // Save job to database
    await saveJob({
      operation: 'video',
      provider: providerKey,
      model: provider.model,
      inputParams: {
        imageUrl,
        preset,
        motionType: motionType ?? preset,
        duration,
        aspectRatio,
        category,
        mode,
        prompt: userPrompt,
      },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: proxyReplicateUrl(resultUrl),
        provider: providerKey,
        duration,
        aspectRatio,
        category,
        // Legacy compat
        motionType: motionType ?? preset,
      },
      cost,
    });
  } catch (error) {
    // Always log the full error with stack for server-side debugging
    console.error('[API /video] Unhandled error:', error instanceof Error ? error.stack ?? error.message : error);

    // Missing API key → 503 Service Unavailable
    if (
      (error instanceof ReplicateApiError || error instanceof FalApiError) &&
      (error as { code?: string }).code === 'AUTH_MISSING'
    ) {
      return NextResponse.json(
        { success: false, error: 'Servicio de video no configurado. Contacta al administrador.' },
        { status: 503 },
      );
    }

    // Rate limit → 429
    if (
      (error instanceof ReplicateApiError || error instanceof FalApiError) &&
      (error as { code?: string }).code === 'RATE_LIMITED'
    ) {
      return NextResponse.json(
        { success: false, error: 'Límite de solicitudes alcanzado. Espera un momento e intenta de nuevo.' },
        { status: 429 },
      );
    }

    // Provider-side error (model failed, timeout, bad output) → 502 Bad Gateway
    if (error instanceof ReplicateApiError || error instanceof FalApiError) {
      return NextResponse.json(
        { success: false, error: `El proveedor de video falló: ${(error as Error).message}` },
        { status: 502 },
      );
    }

    // Unexpected server crash → 500
    return NextResponse.json(
      { success: false, error: 'Error procesando la solicitud. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
