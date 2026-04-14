// =============================================================================
// Video Generation API Route - UniStudio (Video Studio)
// POST: Accepts JSON with multi-provider support (fal.ai + Replicate + Ken Burns)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpegPath from 'ffmpeg-static';
import { runModel, extractOutputUrl, ensureHttpUrl, ReplicateApiError } from '@/lib/api/replicate';
import { runFal, extractFalVideoUrl, ensureFalHttpUrl, uploadToFalStorage, FalApiError } from '@/lib/api/fal';
import { saveJob } from '@/lib/db/persist';
import { proxyReplicateUrl } from '@/lib/utils/image';
import { VIDEO_PROVIDERS, getProviderCost } from '@/lib/video/providers';
import { getPresetById } from '@/lib/video/presets';
import type { VideoProviderKey, VideoCategory, VideoMode } from '@/types/video';

// Video generation can take 2-5 minutes for AI providers; 60s covers FFmpeg Ken Burns
export const maxDuration = 300;

/**
 * Download any image URL (or decode a data URI) and re-upload it to fal.ai
 * storage so that fal models can access it via a public CDN URL.
 *
 * Replicate delivery URLs (replicate.delivery) are private / short-lived and
 * cause a 422 "Unable to download image" error when passed directly to fal.ai.
 */
async function reuploadToFalStorage(url: string): Promise<string> {
  // data: URIs — delegate to existing helper
  if (url.startsWith('data:')) {
    return ensureFalHttpUrl(url);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download image for fal.ai re-upload: ${response.status} ${response.statusText}`,
    );
  }
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = contentType.split('/')[1]?.split(';')[0]?.replace('+xml', '') ?? 'jpg';
  return uploadToFalStorage(buffer, contentType, `input.${ext}`);
}

// ---------------------------------------------------------------------------
// Ken Burns — real MP4 via FFmpeg zoompan filter
// ---------------------------------------------------------------------------

type KenBurnsMotion = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';

async function generateKenBurns(
  imageUrl: string,
  durationSec: number,
  aspectRatio: string,
  motion: KenBurnsMotion = 'zoom-in',
): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new Error('FFmpeg binary no encontrado. Contacta al administrador.');
  }

  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `kb-input-${Date.now()}.jpg`);
  const outputPath = path.join(tempDir, `kb-output-${Date.now()}.mp4`);

  // Download image to temp file
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) {
    throw new Error(`No se pudo descargar la imagen: ${imgResponse.status} ${imgResponse.statusText}`);
  }
  const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
  fs.writeFileSync(inputPath, imgBuffer);

  // Output dimensions based on aspect ratio
  const dimensions =
    aspectRatio === '9:16' ? '1080x1920' :
    aspectRatio === '1:1'  ? '1080x1080' :
    aspectRatio === '4:3'  ? '1440x1080' :
    '1920x1080'; // 16:9 default

  const fps = 25;
  const totalFrames = durationSec * fps;

  // Build zoompan expression for each motion type
  // `on` is the frame number (1-based) in zoompan
  let zoompanExpr: string;
  switch (motion) {
    case 'zoom-in':
      zoompanExpr = `zoompan=z='min(zoom+0.0015,1.3)':d=${totalFrames}:s=${dimensions}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
      break;
    case 'zoom-out':
      zoompanExpr = `zoompan=z='if(lte(zoom,1.0),1.3,zoom-0.0015)':d=${totalFrames}:s=${dimensions}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
      break;
    case 'pan-left':
      zoompanExpr = `zoompan=z=1.2:d=${totalFrames}:s=${dimensions}:x='iw-iw/zoom-(on/${totalFrames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)'`;
      break;
    case 'pan-right':
      zoompanExpr = `zoompan=z=1.2:d=${totalFrames}:s=${dimensions}:x='(on/${totalFrames})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)'`;
      break;
  }

  // Scale input to at least output dimensions before zoompan (so filter has enough pixels)
  const vf = `scale=${dimensions}:force_original_aspect_ratio=increase,crop=${dimensions},${zoompanExpr}`;

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, [
      '-loop', '1',
      '-i', inputPath,
      '-vf', vf,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '26',
      '-pix_fmt', 'yuv420p',
      '-t', String(durationSec),
      '-r', String(fps),
      '-y', outputPath,
    ]);

    const stderrLines: string[] = [];
    proc.stderr?.on('data', (chunk: Buffer) => stderrLines.push(chunk.toString()));

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const tail = stderrLines.slice(-10).join('');
        reject(new Error(`FFmpeg terminó con código ${code}: ${tail}`));
      }
    });
    proc.on('error', (err) => reject(new Error(`No se pudo iniciar FFmpeg: ${err.message}`)));
  });

  const outputBuffer = fs.readFileSync(outputPath);

  // Cleanup temp files
  try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
  try { fs.unlinkSync(outputPath); } catch { /* ignore */ }

  return outputBuffer;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
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

    // Ensure the image URL is accessible by the chosen backend.
    // fal.ai requires a public CDN URL — data URIs and Replicate delivery URLs
    // (private/short-lived) must be re-uploaded to fal.ai storage first.
    let httpImageUrl = imageUrl;
    if (provider.backend === 'fal') {
      const isDataUrl = imageUrl.startsWith('data:');
      const isReplicateUrl = /replicate\.delivery/.test(imageUrl);
      if (isDataUrl || isReplicateUrl) {
        httpImageUrl = await reuploadToFalStorage(imageUrl);
      }
    } else if (provider.backend === 'replicate' && imageUrl.startsWith('data:')) {
      httpImageUrl = await ensureHttpUrl(imageUrl);
    }

    switch (provider.backend) {
      case 'fal': {
        let falInput: Record<string, unknown>;

        if (providerKey === 'ltx-video') {
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

      case 'ffmpeg': {
        // Ken Burns — generate real MP4 with FFmpeg zoompan filter
        const motion = (motionType as KenBurnsMotion) || 'zoom-in';

        // Ensure we have an accessible HTTP URL for the image download
        let kenBurnsImageUrl = imageUrl;
        if (imageUrl.startsWith('data:')) {
          // Upload to fal storage to get a downloadable URL
          const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const buffer = Buffer.from(match[2], 'base64');
            kenBurnsImageUrl = await uploadToFalStorage(buffer, mimeType, 'input.jpg');
          }
        }

        const videoBuffer = await generateKenBurns(kenBurnsImageUrl, duration, aspectRatio, motion);

        // Upload to fal.ai storage for a clean public URL, fall back to base64 data URI
        try {
          resultUrl = await uploadToFalStorage(videoBuffer, 'video/mp4', `kenburns-${Date.now()}.mp4`);
        } catch (uploadErr) {
          console.warn('[API /video] fal storage upload failed, falling back to base64:', uploadErr);
          resultUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
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
