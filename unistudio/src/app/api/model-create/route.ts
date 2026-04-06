// =============================================================================
// AI Model Creation API Route - UniStudio
// POST: Accepts JSON with ModelCreateOptions (gender, ageRange, skinTone, etc.)
// Builds a prompt and generates an AI fashion model using Flux Kontext Pro.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { runFashn, pollFashn } from '@/lib/api/fashn';
import type { FashnCategory } from '@/lib/api/fashn';
import { saveJob } from '@/lib/db/persist';
import { saveAiModel } from '@/lib/db/queries';

// Cost estimates in dollars
const MODEL_GEN_COST = 0.055;
const TRYON_COSTS: Record<string, number> = {
  'idm-vton': 0.02,
  fashn: 0.05,
};

// Garment types that prefer IDM-VTON
const IDM_VTON_PREFERRED_TYPES = new Set([
  'lingerie', 'swimwear', 'underwear', 'bikini', 'bodysuit', 'intimate',
]);

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

interface ModelCreateOptions {
  gender: string;
  ageRange: string;
  skinTone: string;
  bodyType: string;
  pose: string;
  expression: string;
  hairStyle?: string;
  hairColor?: string;
  background?: string;
  clothing?: string;
  ethnicity?: string;
  height?: string;
  customDetails?: string;
}

function buildModelPrompt(options: ModelCreateOptions): string {
  const parts: string[] = [];

  // Core demographics
  parts.push(`A ${options.gender} fashion model`);
  parts.push(`aged ${options.ageRange}`);

  if (options.ethnicity) {
    parts.push(`${options.ethnicity} ethnicity`);
  }

  parts.push(`with ${options.skinTone} skin tone`);
  parts.push(`and ${options.bodyType} body type`);

  // Physical appearance
  if (options.height) {
    parts.push(`${options.height} height`);
  }

  if (options.hairStyle) {
    const hairDesc = options.hairColor
      ? `${options.hairColor} ${options.hairStyle} hair`
      : `${options.hairStyle} hair`;
    parts.push(`with ${hairDesc}`);
  }

  // Pose and expression
  parts.push(`in a ${options.pose} pose`);
  parts.push(`with a ${options.expression} expression`);

  // Clothing if specified
  if (options.clothing) {
    parts.push(`wearing ${options.clothing}`);
  }

  // Background
  if (options.background) {
    parts.push(`against a ${options.background} background`);
  } else {
    parts.push('against a clean studio white background');
  }

  // Quality modifiers
  parts.push(
    'Professional fashion photography, full body shot, high resolution, studio lighting, sharp focus, commercial quality, editorial look',
  );

  // Custom details
  if (options.customDetails) {
    parts.push(options.customDetails);
  }

  return parts.join(', ') + '.';
}

// ---------------------------------------------------------------------------
// Try-on helpers (used when garment image is provided)
// ---------------------------------------------------------------------------

function toIdmVtonCategory(cat: string): string {
  const map: Record<string, string> = {
    tops: 'upper_body',
    'upper-body': 'upper_body',
    upper_body: 'upper_body',
    bottoms: 'lower_body',
    'lower-body': 'lower_body',
    lower_body: 'lower_body',
    dresses: 'dresses',
    'one-pieces': 'dresses',
    'full-body': 'dresses',
  };
  return map[cat] ?? 'upper_body';
}

function toFashnCategory(category: string): FashnCategory {
  switch (category) {
    case 'dresses':
    case 'one-pieces':
      return 'one-pieces';
    case 'outerwear':
    case 'tops':
      return 'tops';
    case 'bottoms':
      return 'bottoms';
    default:
      return 'auto';
  }
}

async function applyGarment(
  modelImageUrl: string,
  garmentImageUrl: string,
  category: string,
  garmentType?: string,
): Promise<{ url: string; provider: string; cost: number }> {
  const isIntimate = garmentType ? IDM_VTON_PREFERRED_TYPES.has(garmentType) : false;

  // For intimate/lingerie garments, always use IDM-VTON
  if (isIntimate || !process.env.FASHN_API_KEY) {
    const output = await runModel(
      'cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985',
      {
        human_img: modelImageUrl,
        garm_img: garmentImageUrl,
        category: toIdmVtonCategory(category),
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: 30,
        seed: -1,
      },
    );
    return { url: extractOutputUrl(output), provider: 'idm-vton', cost: TRYON_COSTS['idm-vton'] };
  }

  // FASHN when available
  const id = await runFashn({
    model_image: modelImageUrl,
    garment_image: garmentImageUrl,
    category: toFashnCategory(category),
  });
  const result = await pollFashn(id);
  if (result.output && result.output.length > 0) {
    return { url: result.output[0], provider: 'fashn', cost: TRYON_COSTS['fashn'] };
  }
  throw new Error('FASHN prediction completed but returned no output');
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gender,
      ageRange,
      skinTone,
      bodyType,
      pose,
      expression,
      hairStyle,
      hairColor,
      background,
      clothing,
      ethnicity,
      height,
      customDetails,
      garmentImage,
      garmentCategory,
      garmentType,
    } = body as ModelCreateOptions & {
      garmentImage?: string;
      garmentCategory?: string;
      garmentType?: string;
    };

    // Validate required fields
    if (!gender) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "gender".' },
        { status: 400 },
      );
    }
    if (!ageRange) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "ageRange".' },
        { status: 400 },
      );
    }
    if (!skinTone) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "skinTone".' },
        { status: 400 },
      );
    }
    if (!bodyType) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "bodyType".' },
        { status: 400 },
      );
    }
    if (!pose) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "pose".' },
        { status: 400 },
      );
    }
    if (!expression) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "expression".' },
        { status: 400 },
      );
    }

    // When garment provided, generate model wearing minimal clothing for better try-on
    const promptClothing = garmentImage
      ? 'wearing a plain white fitted tank top and neutral shorts'
      : clothing;

    // Build the prompt
    const prompt = buildModelPrompt({
      gender,
      ageRange,
      skinTone,
      bodyType,
      pose,
      expression,
      hairStyle,
      hairColor,
      background,
      clothing: promptClothing,
      ethnicity,
      height,
      customDetails,
    });

    // Step 1: Generate base model using Flux Kontext Pro
    const output = await runModel('black-forest-labs/flux-kontext-pro', {
      prompt,
      aspect_ratio: '3:4',
    });

    const baseModelUrl = extractOutputUrl(output);
    let totalCost = MODEL_GEN_COST;

    // Step 2: If garment image provided, apply it via Virtual Try-On
    let finalUrl = baseModelUrl;
    let tryonProvider: string | null = null;

    if (garmentImage) {
      const tryonResult = await applyGarment(
        baseModelUrl,
        garmentImage,
        garmentCategory || 'tops',
        garmentType,
      );
      finalUrl = tryonResult.url;
      tryonProvider = tryonResult.provider;
      totalCost += tryonResult.cost;
    }

    // Save processing job
    await saveJob({
      operation: 'model-create',
      provider: tryonProvider ? `flux-kontext-pro+${tryonProvider}` : 'flux-kontext-pro',
      model: 'black-forest-labs/flux-kontext-pro',
      inputParams: { gender, ageRange, skinTone, bodyType, pose, expression, prompt, garmentImage: !!garmentImage },
      outputUrl: finalUrl,
      cost: totalCost,
    });

    // Save to AI models library
    const savedModel = await saveAiModel({
      name: `${gender} model – ${ageRange}, ${skinTone}`,
      provider: 'replicate',
      modelId: 'black-forest-labs/flux-kontext-pro',
      gender,
      ageRange,
      skinTone,
      bodyType,
      pose,
      previewUrl: finalUrl,
      metadata: { expression, hairStyle, hairColor, background, clothing, ethnicity, height, prompt, garmentApplied: !!garmentImage },
    });

    return NextResponse.json({
      success: true,
      data: {
        url: finalUrl,
        baseModelUrl: garmentImage ? baseModelUrl : undefined,
        prompt,
        cost: totalCost,
        tryonProvider,
        modelId: savedModel?.id ?? null,
        options: {
          gender,
          ageRange,
          skinTone,
          bodyType,
          pose,
          expression,
        },
      },
    });
  } catch (error) {
    console.error('[API /model-create] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during AI model creation.',
      },
      { status: 500 },
    );
  }
}
