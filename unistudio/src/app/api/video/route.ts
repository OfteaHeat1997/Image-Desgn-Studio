// =============================================================================
// Video Generation API Route - UniStudio (Video Studio)
// POST: Accepts JSON with multi-provider support (fal.ai + Replicate + Ken Burns)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl, ensureHttpUrl } from '@/lib/api/replicate';
import { runFal, extractFalVideoUrl, ensureFalHttpUrl } from '@/lib/api/fal';
import { saveJob } from '@/lib/db/persist';
import { VIDEO_PROVIDERS, getProviderCost } from '@/lib/video/providers';
import { getPresetById } from '@/lib/video/presets';
import type { VideoProviderKey, VideoCategory, VideoMode } from '@/types/video';

// Video generation can take 2-5 minutes depending on provider
export const maxDuration = 300;

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

    // Build the motion prompt
    const presetConfig = preset ? getPresetById(preset) : null;
    const motionPrompt = presetConfig?.promptTemplate ?? '';

    const fullPrompt = userPrompt
      ? userPrompt + (motionPrompt ? `. ${motionPrompt}` : '')
      : motionPrompt || 'Product video showcase. Professional commercial quality, smooth motion, high production value.';

    let resultUrl: string;
    const cost = getProviderCost(provider, duration);

    // Convert data URLs to HTTP URLs so AI providers can access them.
    let httpImageUrl = imageUrl;
    if (imageUrl.startsWith('data:')) {
      if (provider.backend === 'fal') {
        httpImageUrl = await ensureFalHttpUrl(imageUrl);
      } else if (provider.backend === 'replicate') {
        httpImageUrl = await ensureHttpUrl(imageUrl);
      }
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
            duration: String(Math.min(duration, 10)),
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
            aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
          });
          resultUrl = await extractOutputUrl(output);
        } else if (providerKey === 'wan-2.2-fast') {
          // Wan 2.2 Fast — minimum 81 frames, max 5s
          const output = await runModel(provider.model, {
            image: httpImageUrl,
            prompt: fullPrompt,
            num_frames: 81,
            guidance_scale: 5.0,
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

      case 'client': {
        // Ken Burns — return config for client-side CSS animation
        resultUrl = imageUrl;
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
        url: resultUrl,
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
    console.error('[API /video] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during video generation.',
      },
      { status: 500 },
    );
  }
}
