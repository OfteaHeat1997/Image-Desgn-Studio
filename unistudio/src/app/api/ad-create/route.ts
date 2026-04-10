// =============================================================================
// Ad Creator API Route - UniStudio
// POST: Creates social media ad videos from product images.
// Pipeline: Build prompt from template → Generate video → Return URL
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { saveJob } from '@/lib/db/persist';
import { buildAdPrompt, AD_TEMPLATES, getRecommendedDuration } from '@/lib/processing/ad-compose';
import { VIDEO_PROVIDERS, getProviderCost } from '@/lib/video/providers';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { runFal, extractFalVideoUrl } from '@/lib/api/fal';
import type { AdFormat, VideoProviderKey } from '@/types/video';

export async function POST(request: NextRequest) {

  try {
    const body = await request.json();
    const {
      imageUrl,
      template,
      headline = '',
      cta = '',
      description = '',
      videoProvider = 'wan-2.2-fast',
      brandKitId,
      autoPrompt,
    } = body as {
      imageUrl: string;
      template: AdFormat;
      headline?: string;
      cta?: string;
      description?: string;
      videoProvider?: VideoProviderKey;
      brandKitId?: string;
      autoPrompt?: string;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    if (!template || !AD_TEMPLATES[template]) {
      return NextResponse.json(
        { success: false, error: `Invalid template "${template}". Use: ${Object.keys(AD_TEMPLATES).join(', ')}` },
        { status: 400 },
      );
    }

    const adTemplate = AD_TEMPLATES[template];
    const duration = getRecommendedDuration(template);
    const provider = VIDEO_PROVIDERS[videoProvider];

    if (!provider) {
      return NextResponse.json(
        { success: false, error: `Unknown video provider "${videoProvider}".` },
        { status: 400 },
      );
    }

    // Build prompt
    const prompt = buildAdPrompt({
      imageUrl,
      template,
      headline,
      cta,
      description,
      brandKitId,
      videoProvider,
      autoPrompt,
    });

    // Generate video based on provider backend
    let resultUrl: string;

    if (provider.backend === 'fal') {
      // Use correct input param name per provider
      const isKling = videoProvider === 'kling-2.6';
      const falInput: Record<string, unknown> = {
        [isKling ? 'start_image_url' : 'image_url']: imageUrl,
        prompt,
        ...(videoProvider === 'wan-2.5' && { duration: String(duration), resolution: '480p' }),
        ...(isKling && { duration: String(duration) }),
        ...(videoProvider === 'minimax-hailuo' && { prompt_optimizer: true }),
      };
      const output = await runFal(provider.model, falInput);
      resultUrl = extractFalVideoUrl(output);
    } else if (provider.backend === 'replicate') {
      const output = await runModel(provider.model, {
        image: imageUrl,
        prompt,
        num_frames: duration >= 10 ? 161 : 81,
      });
      resultUrl = await extractOutputUrl(output);
    } else {
      // kenburns — return the image with config for client-side animation
      resultUrl = imageUrl;
    }

    const cost = getProviderCost(provider, duration);

    // Save job
    await saveJob({
      operation: 'ad-create',
      provider: videoProvider,
      model: provider.model,
      inputParams: { imageUrl, template, headline, cta, description, duration },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: {
        videoUrl: resultUrl,
        template,
        aspectRatio: adTemplate.aspectRatio,
        duration,
      },
      cost,
    });
  } catch (error) {
    console.error('[API /ad-create] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error procesando la solicitud. Intenta de nuevo.',
      },
      { status: 500 },
    );
  }
}
