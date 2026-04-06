// =============================================================================
// AI Model Creation API Route - UniStudio
// POST: Accepts JSON with ModelCreateOptions (gender, ageRange, skinTone, etc.)
// Builds a prompt and generates an AI fashion model using Flux Kontext Pro.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
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

// Map skin tone IDs to safe descriptive terms
const SKIN_TONE_MAP: Record<string, string> = {
  light: 'fair complexion',
  'medium-light': 'light olive complexion',
  medium: 'warm tan complexion',
  'medium-dark': 'rich brown complexion',
  dark: 'deep brown complexion',
};

// Map body type IDs to safe, editorial descriptors
const BODY_TYPE_MAP: Record<string, string> = {
  slim: 'slender build',
  athletic: 'athletic build',
  average: 'average build',
  curvy: 'full-figured build',
  'plus-size': 'plus-size build',
};

function buildModelPrompt(options: ModelCreateOptions): string {
  const parts: string[] = [];

  // Use "professional e-commerce model" framing to avoid content filters
  const genderWord = options.gender === 'female' ? 'woman' : options.gender === 'male' ? 'man' : 'person';
  parts.push(`Professional e-commerce catalog photo of a ${genderWord}`);
  parts.push(`in her ${options.ageRange.replace('-', 's to ')}s`);

  if (options.ethnicity) {
    parts.push(`${options.ethnicity} ethnicity`);
  }

  // Use mapped descriptors instead of raw values
  const skinDesc = SKIN_TONE_MAP[options.skinTone] || `${options.skinTone} skin tone`;
  parts.push(`with ${skinDesc}`);
  const bodyDesc = BODY_TYPE_MAP[options.bodyType] || `${options.bodyType} body type`;
  parts.push(`${bodyDesc}`);

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

  // Clothing — always specify something appropriate
  if (options.clothing) {
    parts.push(`wearing ${options.clothing}`);
  } else {
    parts.push('wearing a professional casual outfit');
  }

  // Background
  if (options.background) {
    parts.push(`against a ${options.background} background`);
  } else {
    parts.push('against a clean studio white background');
  }

  // Quality modifiers — emphasize commercial/catalog context
  parts.push(
    'Professional commercial catalog photography, full body shot, high resolution, soft studio lighting, sharp focus, e-commerce product listing style, editorial fashion magazine quality, fully clothed, tasteful, SFW',
  );

  // Custom details
  if (options.customDetails) {
    parts.push(options.customDetails);
  }

  return parts.join(', ') + '.';
}

// Retry with a simpler/safer prompt if the first attempt gets flagged
function buildSafeRetryPrompt(options: ModelCreateOptions): string {
  const genderWord = options.gender === 'female' ? 'woman' : options.gender === 'male' ? 'man' : 'person';
  const skinDesc = SKIN_TONE_MAP[options.skinTone] || options.skinTone;
  return `E-commerce catalog photo of a professional ${genderWord} model with ${skinDesc}, ${options.pose} pose, ${options.expression} expression, wearing a casual business outfit, clean white studio background, commercial product photography, high resolution, SFW.`;
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

/**
 * Flatten a data-URL image onto a white background (strips transparency).
 * IDM-VTON and other try-on models fail on transparent PNGs.
 * Returns a JPEG data URL.
 */
async function flattenToWhiteBg(dataUrl: string): Promise<string> {
  // Only process data URLs — HTTP URLs are assumed to already be opaque
  if (!dataUrl.startsWith('data:')) return dataUrl;

  const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!base64Match) return dataUrl;

  const inputBuffer = Buffer.from(base64Match[1], 'base64');
  const jpegBuffer = await sharp(inputBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 90 })
    .toBuffer();

  return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
}

async function tryIdmVton(
  modelImageUrl: string,
  garmentImageUrl: string,
  category: string,
): Promise<string> {
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
  return extractOutputUrl(output);
}

async function tryKolors(
  modelImageUrl: string,
  garmentImageUrl: string,
): Promise<string> {
  const output = await runModel('kolors/kolors-virtual-try-on', {
    human_image: modelImageUrl,
    garment_image: garmentImageUrl,
  });
  return extractOutputUrl(output);
}

async function applyGarment(
  modelImageUrl: string,
  garmentImageUrl: string,
  category: string,
  garmentType?: string,
): Promise<{ url: string; provider: string; cost: number }> {
  // Flatten transparent PNGs to white background — try-on models need opaque images
  const flatGarment = await flattenToWhiteBg(garmentImageUrl);

  console.log('[model-create] applyGarment — model:', modelImageUrl.slice(0, 80), 'garment length:', flatGarment.length);

  const isIntimate = garmentType ? IDM_VTON_PREFERRED_TYPES.has(garmentType) : false;

  // Try FASHN first when available (better quality for most garments)
  if (process.env.FASHN_API_KEY && !isIntimate) {
    try {
      const id = await runFashn({
        model_image: modelImageUrl,
        garment_image: flatGarment,
        category: toFashnCategory(category),
      });
      const result = await pollFashn(id);
      if (result.output && result.output.length > 0) {
        return { url: result.output[0], provider: 'fashn', cost: TRYON_COSTS['fashn'] };
      }
    } catch (fashnErr) {
      console.warn('[model-create] FASHN failed, falling back to IDM-VTON:', fashnErr instanceof Error ? fashnErr.message : fashnErr);
    }
  }

  // Try IDM-VTON
  try {
    const url = await tryIdmVton(modelImageUrl, flatGarment, category);
    return { url, provider: 'idm-vton', cost: TRYON_COSTS['idm-vton'] };
  } catch (idmErr) {
    console.warn('[model-create] IDM-VTON failed, trying Kolors:', idmErr instanceof Error ? idmErr.message : idmErr);
  }

  // Last resort: Kolors
  try {
    const url = await tryKolors(modelImageUrl, flatGarment);
    return { url, provider: 'kolors', cost: TRYON_COSTS['idm-vton'] };
  } catch (kolorsErr) {
    throw new Error(
      `Todos los proveedores de Virtual Try-On fallaron. Intenta con otra imagen de prenda. ` +
      `(${kolorsErr instanceof Error ? kolorsErr.message : String(kolorsErr)})`,
    );
  }
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
    // Retry with safer prompt if content filter triggers
    let baseModelUrl: string;
    let usedPrompt = prompt;
    try {
      const output = await runModel('black-forest-labs/flux-kontext-pro', {
        prompt,
        aspect_ratio: '3:4',
      });
      baseModelUrl = extractOutputUrl(output);
    } catch (firstErr) {
      const errMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      if (errMsg.includes('flagged as sensitive') || errMsg.includes('E005')) {
        console.warn('[model-create] Content filter triggered, retrying with safe prompt...');
        usedPrompt = buildSafeRetryPrompt({
          gender, ageRange, skinTone, bodyType, pose, expression,
          hairStyle, hairColor, background, ethnicity, height,
        });
        const retryOutput = await runModel('black-forest-labs/flux-kontext-pro', {
          prompt: usedPrompt,
          aspect_ratio: '3:4',
        });
        baseModelUrl = extractOutputUrl(retryOutput);
      } else {
        throw firstErr;
      }
    }
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
      inputParams: { gender, ageRange, skinTone, bodyType, pose, expression, prompt: usedPrompt, garmentImage: !!garmentImage },
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
      metadata: { expression, hairStyle, hairColor, background, clothing, ethnicity, height, prompt: usedPrompt, garmentApplied: !!garmentImage },
    });

    return NextResponse.json({
      success: true,
      data: {
        url: finalUrl,
        baseModelUrl: garmentImage ? baseModelUrl : undefined,
        prompt: usedPrompt,
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
