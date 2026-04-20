// =============================================================================
// AI Model Creation API Route - UniStudio
// POST: Accepts JSON with ModelCreateOptions (gender, ageRange, skinTone, etc.)
// Builds a prompt and generates an AI fashion model using Flux Kontext Pro.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { runFashn, pollFashn } from '@/lib/api/fashn';
import { runFal } from '@/lib/api/fal';
import { saveJob } from '@/lib/db/persist';
import { proxyReplicateUrl } from '@/lib/utils/image';
import { saveAiModel } from '@/lib/db/queries';
import { toIdmVtonCategory, toFashnCategory } from '@/lib/utils/tryon-categories';

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

// Garment types that use SeedDream (no content filter) for base model generation
const LINGERIE_CATEGORIES = new Set(['lingerie', 'bra', 'panty', 'shapewear', 'bodysuit', 'swimwear']);

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

  // Pose and expression — map pose IDs to detailed descriptions
  const POSE_PROMPTS: Record<string, string> = {
    standing: 'standing naturally facing the camera, full frontal view',
    'back-view': 'standing with back turned to the camera, showing the back of the outfit, looking slightly over shoulder',
    'side-left': 'standing in left profile view, side angle showing the silhouette',
    'side-right': 'standing in right profile view, side angle showing the silhouette',
    'three-quarter': 'in a three-quarter view angle, body slightly turned',
    walking: 'walking confidently towards camera, mid-stride',
    sitting: 'sitting gracefully on a stool',
    dynamic: 'in a dynamic energetic pose with movement',
    casual: 'in a relaxed casual pose, natural and effortless',
    'arms-up': 'standing with one arm raised above head, showing full torso and underarm area',
    'hands-hips': 'standing confidently with hands on hips, power pose',
  };
  const poseDesc = POSE_PROMPTS[options.pose] || `in a ${options.pose} pose`;
  parts.push(poseDesc);
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
  const SAFE_POSE_MAP: Record<string, string> = {
    standing: 'standing facing camera',
    'back-view': 'standing with back to camera, looking over shoulder',
    'side-left': 'left profile view',
    'side-right': 'right profile view',
    'three-quarter': 'three-quarter angle view',
    walking: 'walking pose',
    sitting: 'sitting on stool',
    dynamic: 'dynamic pose',
    casual: 'casual relaxed pose',
    'arms-up': 'standing with arm raised',
    'hands-hips': 'hands on hips pose',
  };
  const poseDesc = SAFE_POSE_MAP[options.pose] || options.pose;
  return `E-commerce catalog photo of a professional ${genderWord} model with ${skinDesc}, ${poseDesc}, ${options.expression} expression, wearing a casual business outfit, clean white studio background, commercial product photography, high resolution, SFW.`;
}

// ---------------------------------------------------------------------------
// Try-on helpers (used when garment image is provided)
// ---------------------------------------------------------------------------

/**
 * Prepare garment image for try-on: flatten transparency to white bg,
 * resize to max 1024px, compress as JPEG. Returns a data URL.
 */
async function prepareGarmentImage(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl;

  const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!base64Match) return dataUrl;

  const inputBuffer = Buffer.from(base64Match[1], 'base64');
  const jpegBuffer = await sharp(inputBuffer)
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 85 })
    .toBuffer();

  console.log(`[model-create] garment prepared: ${(jpegBuffer.length / 1024).toFixed(0)}KB`);
  return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
}

/**
 * Apply garment to model using Virtual Try-On.
 * Cascade: FASHN → IDM-VTON → Kontext (prompt-based fallback).
 */
async function applyGarment(
  modelImageUrl: string,
  garmentImageUrl: string,
  category: string,
  garmentType?: string,
): Promise<{ url: string; provider: string; cost: number }> {
  const flatGarment = await prepareGarmentImage(garmentImageUrl);
  const isIntimate = garmentType ? IDM_VTON_PREFERRED_TYPES.has(garmentType) : false;

  console.log('[model-create] applyGarment — model:', modelImageUrl.slice(0, 80), '| garment chars:', flatGarment.length, '| intimate:', isIntimate);

  // Provider 1: FASHN (best quality for non-intimate)
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
      console.warn('[model-create] FASHN failed:', fashnErr instanceof Error ? fashnErr.message : fashnErr);
    }
  }

  // Provider 2: IDM-VTON
  try {
    const output = await runModel(
      'cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985',
      {
        human_img: modelImageUrl,
        garm_img: flatGarment,
        category: toIdmVtonCategory(category),
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: 30,
        seed: -1,
      },
    );
    const url = await extractOutputUrl(output);
    return { url, provider: 'idm-vton', cost: TRYON_COSTS['idm-vton'] };
  } catch (idmErr) {
    console.warn('[model-create] IDM-VTON failed:', idmErr instanceof Error ? idmErr.message : idmErr);
  }

  // Provider 3 (fallback): Flux Kontext Pro img2img — use the base model image
  // as input and prompt it to wear the garment. Less accurate but very reliable.
  try {
    console.log('[model-create] Falling back to Kontext Pro img2img approach');
    const garmentDesc = garmentType && IDM_VTON_PREFERRED_TYPES.has(garmentType)
      ? 'the lingerie garment from the reference photo'
      : 'the clothing item from the reference photo';
    const output = await runModel('black-forest-labs/flux-kontext-pro', {
      prompt: `Make this person wear ${garmentDesc}. Keep the same person, face, pose, and background. Only change the clothing to match the provided garment. Professional e-commerce catalog photo, studio lighting, SFW, tasteful commercial photography.`,
      input_image: modelImageUrl,
      aspect_ratio: '3:4',
    });
    const url = await extractOutputUrl(output);
    return { url, provider: 'kontext-fallback', cost: MODEL_GEN_COST };
  } catch (kontextErr) {
    throw new Error(
      `No se pudo aplicar la prenda al modelo. Intenta con otra imagen o sin prenda. ` +
      `(${kontextErr instanceof Error ? kontextErr.message : String(kontextErr)})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

// AI model generation can take 1-3 minutes
export const maxDuration = 300;

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
      seed,
    } = body as ModelCreateOptions & {
      garmentImage?: string;
      garmentCategory?: string;
      garmentType?: string;
      seed?: number;
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

    const isLingerie = LINGERIE_CATEGORIES.has(garmentType || '');

    // When garment provided OR when this is a lingerie flow, generate the model
    // in a neutral minimal base so the subsequent try-on has a clean canvas.
    // Without this, the default prompt adds "casual outfit" and Kolors ends up
    // layering the user's garment on top of a blazer/pants, producing garbage.
    //
    // IMPORTANT: this string is inserted into the prompt WITHOUT a leading
    // "wearing" (buildModelPrompt adds that). Avoid trigger words like "nude",
    // "minimal base layer", "seamless", etc. — ByteDance's partner content
    // checker (used by SeedDream on fal.ai) flags them even when the actual
    // SFW safety checker is disabled.
    const promptClothing = (garmentImage || isLingerie)
      ? 'a simple beige athletic crop top and matching beige athletic shorts, plain activewear, solid color, suitable base for virtual try-on'
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

    // Step 1: Generate base model
    // For lingerie categories, use SeedDream on fal.ai (no content filter)
    // Otherwise use Flux Kontext Pro with retry on content filter
    let baseModelUrl: string;
    let usedPrompt = prompt;

    if (isLingerie) {
      const effectiveSeed = typeof seed === 'number' ? seed : Math.floor(Math.random() * 999999);
      console.log(`[model-create] Lingerie detected — using SeedDream (seed=${effectiveSeed})`);
      try {
        const falResult = await runFal('fal-ai/bytedance/seedream/v4.5/text-to-image', {
          prompt,
          image_size: 'portrait_4_3',
          enable_safety_checker: false,
          seed: effectiveSeed,
          num_images: 1,
        });
        baseModelUrl = falResult.images[0].url;
      } catch (firstErr) {
        const errMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
        // ByteDance's partner content checker ignores enable_safety_checker and
        // flags words like "nude", "seamless", "base layer", etc. Retry with a
        // minimal neutral prompt that describes only the model + activewear.
        if (errMsg.includes('content_policy_violation') || errMsg.includes('partner_validation_failed') || errMsg.includes('flagged')) {
          console.warn('[model-create] SeedDream content checker fired — retrying with safer prompt');
          const genderWord = gender === 'female' ? 'woman' : gender === 'male' ? 'man' : 'person';
          const safePrompt = `E-commerce catalog photo of a ${genderWord} wearing a simple beige athletic crop top and matching shorts, standing facing the camera, clean white studio background, professional fashion photography, full body visible.`;
          const falResult = await runFal('fal-ai/bytedance/seedream/v4.5/text-to-image', {
            prompt: safePrompt,
            image_size: 'portrait_4_3',
            enable_safety_checker: false,
            seed: effectiveSeed,
            num_images: 1,
          });
          baseModelUrl = falResult.images[0].url;
          usedPrompt = safePrompt;
        } else {
          throw firstErr;
        }
      }
    } else {
      try {
        const output = await runModel('black-forest-labs/flux-kontext-pro', {
          prompt,
          aspect_ratio: '3:4',
        });
        baseModelUrl = await extractOutputUrl(output);
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
          baseModelUrl = await extractOutputUrl(retryOutput);
        } else {
          throw firstErr;
        }
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
        url: proxyReplicateUrl(finalUrl),
        baseModelUrl: garmentImage ? proxyReplicateUrl(baseModelUrl) : undefined,
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
