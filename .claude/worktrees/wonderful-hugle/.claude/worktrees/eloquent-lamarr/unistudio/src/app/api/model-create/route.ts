// =============================================================================
// AI Model Creation API Route - UniStudio
// POST: Accepts JSON with ModelCreateOptions (gender, ageRange, skinTone, etc.)
// Builds a prompt and generates an AI fashion model using Flux Kontext Pro.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { saveJob } from '@/lib/db/persist';
import { saveAiModel } from '@/lib/db/queries';

// Cost estimate in dollars
const COST = 0.055;

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
    } = body as ModelCreateOptions;

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
      clothing,
      ethnicity,
      height,
      customDetails,
    });

    // Generate model using Flux Kontext Pro via Replicate
    const output = await runModel('black-forest-labs/flux-kontext-pro', {
      prompt,
      aspect_ratio: '3:4',
    });

    let resultUrl: string;
    resultUrl = extractOutputUrl(output);

    // Save processing job
    await saveJob({
      operation: 'model-create',
      provider: 'flux-kontext-pro',
      model: 'black-forest-labs/flux-kontext-pro',
      inputParams: { gender, ageRange, skinTone, bodyType, pose, expression, prompt },
      outputUrl: resultUrl,
      cost: COST,
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
      previewUrl: resultUrl,
      metadata: { expression, hairStyle, hairColor, background, clothing, ethnicity, height, prompt },
    });

    return NextResponse.json({
      success: true,
      data: {
        url: resultUrl,
        prompt,
        cost: COST,
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
