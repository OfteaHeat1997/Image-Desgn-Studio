// =============================================================================
// Inpainting API Route - UniStudio
// POST: Accepts JSON { imageUrl, maskUrl?, prompt, provider, preset? }
// Routes to Flux Fill Pro, Flux Fill Dev, or Flux Kontext for inpainting.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { saveJob } from '@/lib/db/persist';
import { proxyReplicateUrl } from '@/lib/utils/image';

// Inpainting presets with specialized prompts
const INPAINT_PRESETS: Record<string, { prompt: string; negativePrompt: string }> = {
  'product-fix': {
    prompt: 'Clean, seamless product surface. Fix imperfections while maintaining original material texture and color. Professional product photography quality.',
    negativePrompt: 'blurry, distorted, different color, different material, low quality',
  },
  'seamless-fill': {
    prompt: 'Fill the area seamlessly with the surrounding content. Match texture, color, lighting, and perspective perfectly. Natural and undetectable.',
    negativePrompt: 'visible seam, different texture, mismatched lighting, obvious edit',
  },
  'texture-match': {
    prompt: 'Extend and match the existing texture pattern exactly. Maintain consistent grain, weave, or material appearance throughout.',
    negativePrompt: 'different pattern, wrong texture, misaligned, blurry, warped',
  },
  'remove-text': {
    prompt: 'Remove all text, labels, and markings from this area. Fill with the underlying surface material seamlessly.',
    negativePrompt: 'text, letters, numbers, symbols, watermark, label',
  },
  'remove-logo': {
    prompt: 'Remove the logo/branding from this area. Replace with clean, matching surface material.',
    negativePrompt: 'logo, brand, text, watermark, emblem',
  },
  'add-reflection': {
    prompt: 'Add a subtle, realistic reflection to the surface beneath the product. Match the lighting angle and product shape.',
    negativePrompt: 'unrealistic, too strong, wrong angle, distorted reflection',
  },
  'surface-repair': {
    prompt: 'Repair scratches, dents, and damage. Restore to pristine condition while keeping material authentic.',
    negativePrompt: 'scratch, dent, damage, stain, imperfection',
  },
};

// Cost estimates in dollars
const PROVIDER_COSTS: Record<string, number> = {
  'flux-fill-pro': 0.05,
  'flux-fill-dev': 0.03,
  kontext: 0.05,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      maskUrl,
      prompt: rawPrompt,
      provider,
      preset,
    } = body as {
      imageUrl: string;
      maskUrl?: string;
      prompt: string;
      provider: 'flux-fill-pro' | 'flux-fill-dev' | 'kontext';
      preset?: string;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field "provider". Use "flux-fill-pro", "flux-fill-dev", or "kontext".',
        },
        { status: 400 },
      );
    }

    // Resolve prompt from preset or use raw prompt
    let prompt: string;
    let negativePrompt: string = '';

    if (preset && INPAINT_PRESETS[preset]) {
      const presetConfig = INPAINT_PRESETS[preset];
      prompt = rawPrompt
        ? `${rawPrompt}. ${presetConfig.prompt}`
        : presetConfig.prompt;
      negativePrompt = presetConfig.negativePrompt;
    } else {
      prompt = rawPrompt ?? '';
      if (!prompt) {
        return NextResponse.json(
          { success: false, error: 'Missing "prompt" or valid "preset".' },
          { status: 400 },
        );
      }
    }

    let resultUrl: string;
    const cost = PROVIDER_COSTS[provider] ?? 0;

    switch (provider) {
      case 'flux-fill-pro': {
        if (!maskUrl) {
          return NextResponse.json(
            { success: false, error: 'Flux Fill Pro requires a "maskUrl" for the inpainting mask.' },
            { status: 400 },
          );
        }
        const fillProInput: Record<string, unknown> = {
          image: imageUrl,
          mask: maskUrl,
          prompt,
        };
        if (negativePrompt) fillProInput.negative_prompt = negativePrompt;
        const output = await runModel('black-forest-labs/flux-fill-pro', fillProInput);
        resultUrl = await extractOutputUrl(output);
        break;
      }

      case 'flux-fill-dev': {
        if (!maskUrl) {
          return NextResponse.json(
            { success: false, error: 'Flux Fill Dev requires a "maskUrl" for the inpainting mask.' },
            { status: 400 },
          );
        }
        const fillDevInput: Record<string, unknown> = {
          image: imageUrl,
          mask: maskUrl,
          prompt,
        };
        if (negativePrompt) fillDevInput.negative_prompt = negativePrompt;
        const output = await runModel('black-forest-labs/flux-fill-dev', fillDevInput);
        resultUrl = await extractOutputUrl(output);
        break;
      }

      case 'kontext': {
        // Kontext uses instruction-based editing (no mask needed)
        const output = await runModel('black-forest-labs/flux-kontext-pro', {
          input_image: imageUrl,
          prompt,
        });
        resultUrl = await extractOutputUrl(output);
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported provider "${provider}". Use "flux-fill-pro", "flux-fill-dev", or "kontext".`,
          },
          { status: 400 },
        );
    }

    await saveJob({
      operation: 'inpaint',
      provider,
      inputParams: { imageUrl, maskUrl, prompt, preset },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: proxyReplicateUrl(resultUrl),
        provider,
        preset: preset || null,
        cost,
      },
    });
  } catch (error) {
    console.error('[API /inpaint] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during inpainting.',
      },
      { status: 500 },
    );
  }
}
