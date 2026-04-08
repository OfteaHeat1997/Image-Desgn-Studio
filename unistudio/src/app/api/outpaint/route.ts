// =============================================================================
// Outpainting API Route - UniStudio
// POST: Accepts JSON { imageUrl, platform?, targetAspectRatio?, prompt?, provider? }
// Smart outpainting based on platform specs or manual aspect ratio.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { saveJob } from '@/lib/db/persist';

// Platform aspect ratio specifications
const PLATFORM_SPECS: Record<string, { aspectRatio: string; description: string }> = {
  amazon: { aspectRatio: '1:1', description: 'Amazon product listing (square)' },
  shopify: { aspectRatio: '1:1', description: 'Shopify product page (square)' },
  instagram: { aspectRatio: '1:1', description: 'Instagram feed post (square)' },
  'instagram-story': { aspectRatio: '9:16', description: 'Instagram Story (vertical)' },
  'instagram-landscape': { aspectRatio: '1.91:1', description: 'Instagram landscape post' },
  tiktok: { aspectRatio: '9:16', description: 'TikTok (vertical)' },
  pinterest: { aspectRatio: '2:3', description: 'Pinterest pin (vertical)' },
  facebook: { aspectRatio: '1.91:1', description: 'Facebook post (landscape)' },
  'facebook-story': { aspectRatio: '9:16', description: 'Facebook Story (vertical)' },
  twitter: { aspectRatio: '16:9', description: 'Twitter/X post (widescreen)' },
  etsy: { aspectRatio: '4:3', description: 'Etsy listing (landscape)' },
  ebay: { aspectRatio: '1:1', description: 'eBay listing (square)' },
  poshmark: { aspectRatio: '1:1', description: 'Poshmark listing (square)' },
  depop: { aspectRatio: '1:1', description: 'Depop listing (square)' },
};

// Cost estimates in dollars
const PROVIDER_COSTS: Record<string, number> = {
  kontext: 0.05,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      platform,
      targetAspectRatio,
      prompt,
      provider = 'kontext',
    } = body as {
      imageUrl: string;
      platform?: string;
      targetAspectRatio?: string;
      prompt?: string;
      provider?: string;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    // Determine target aspect ratio
    let aspectRatio: string;
    let platformDescription: string | undefined;

    if (platform && PLATFORM_SPECS[platform]) {
      const spec = PLATFORM_SPECS[platform];
      aspectRatio = spec.aspectRatio;
      platformDescription = spec.description;
    } else if (targetAspectRatio) {
      if (!/^\d+(\.\d+)?:\d+(\.\d+)?$/.test(targetAspectRatio)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid "targetAspectRatio" format. Expected "W:H" (e.g. "16:9", "1:1", "1.91:1").',
          },
          { status: 400 },
        );
      }
      aspectRatio = targetAspectRatio;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide either "platform" or "targetAspectRatio". Supported platforms: ' +
            Object.keys(PLATFORM_SPECS).join(', '),
        },
        { status: 400 },
      );
    }

    let resultUrl: string;
    const cost = PROVIDER_COSTS[provider] ?? 0.05;

    // Build outpainting prompt
    const outpaintPrompt = prompt ||
      'Extend the image naturally, maintaining consistent lighting, perspective, and style. ' +
      'Fill the extended area with appropriate background content that matches the original scene.';

    // Use Flux Kontext Pro — the only provider that supports aspect_ratio-based outpainting.
    // (flux-fill-dev requires a mask image which we can't generate server-side)
    const fullPrompt = `Extend this image to ${aspectRatio} aspect ratio. ${outpaintPrompt}`;
    const output = await runModel('black-forest-labs/flux-kontext-pro', {
      input_image: imageUrl,
      prompt: fullPrompt,
      aspect_ratio: aspectRatio,
    });
    resultUrl = await extractOutputUrl(output);

    await saveJob({
      operation: 'outpaint',
      provider: provider || 'kontext',
      inputParams: { imageUrl, platform, targetAspectRatio, prompt, aspectRatio },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: resultUrl,
        aspectRatio,
        platform: platform || null,
        platformDescription: platformDescription || null,
        cost,
      },
    });
  } catch (error) {
    console.error('[API /outpaint] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during outpainting.',
      },
      { status: 500 },
    );
  }
}
