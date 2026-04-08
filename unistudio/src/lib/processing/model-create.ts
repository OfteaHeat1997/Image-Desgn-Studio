// =============================================================================
// AI Model Creation Processing Module
// =============================================================================

import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import type { ModelCreateOptions } from '@/types/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelOptionSet {
  label: string;
  values: string[];
}

// ---------------------------------------------------------------------------
// Model Options
// ---------------------------------------------------------------------------

export const MODEL_OPTIONS: Record<string, ModelOptionSet> = {
  gender: {
    label: 'Gender',
    values: ['male', 'female', 'non-binary'],
  },
  ageRange: {
    label: 'Age Range',
    values: ['18-25', '26-35', '36-45', '46-55', '56+'],
  },
  skinTone: {
    label: 'Skin Tone',
    values: ['light', 'medium-light', 'medium', 'medium-dark', 'dark'],
  },
  bodyType: {
    label: 'Body Type',
    values: ['slim', 'average', 'athletic', 'plus-size'],
  },
  pose: {
    label: 'Pose',
    values: ['standing', 'back-view', 'side-left', 'side-right', 'three-quarter', 'walking', 'sitting', 'dynamic', 'casual', 'arms-up', 'hands-hips'],
  },
  expression: {
    label: 'Expression',
    values: ['neutral', 'smile', 'serious', 'confident', 'relaxed'],
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function ageRangeToDescription(ageRange: string): string {
  const map: Record<string, string> = {
    '18-25': 'young adult in their early twenties',
    '26-35': 'adult in their late twenties to early thirties',
    '36-45': 'adult in their late thirties to early forties',
    '46-55': 'mature adult in their late forties to early fifties',
    '56+': 'mature adult in their late fifties or older',
  };
  return map[ageRange] || `person aged ${ageRange}`;
}

function skinToneToDescription(skinTone: string): string {
  const map: Record<string, string> = {
    light: 'light/fair skin tone',
    'medium-light': 'medium-light skin tone',
    medium: 'medium skin tone',
    'medium-dark': 'medium-dark skin tone',
    dark: 'dark/deep skin tone',
  };
  return map[skinTone] || `${skinTone} skin tone`;
}

function bodyTypeToDescription(bodyType: string): string {
  const map: Record<string, string> = {
    slim: 'slim build',
    average: 'average build',
    athletic: 'athletic build',
    'plus-size': 'plus-size/curvy build',
  };
  return map[bodyType] || `${bodyType} build`;
}

function poseToDescription(pose: string): string {
  const map: Record<string, string> = {
    standing: 'standing naturally facing the camera, full frontal view',
    'back-view': 'standing with back turned to camera, showing the back, looking slightly over shoulder',
    'side-left': 'standing in left profile view, side angle showing silhouette',
    'side-right': 'standing in right profile view, side angle showing silhouette',
    'three-quarter': 'in a three-quarter view pose, body slightly turned',
    walking: 'walking confidently, mid-stride',
    sitting: 'sitting comfortably on a chair or stool',
    dynamic: 'in a dynamic energetic pose',
    casual: 'in a relaxed casual pose',
    'arms-up': 'standing with one arm raised above head, showing torso',
    'hands-hips': 'standing with hands on hips, power pose',
  };
  return map[pose] || pose;
}

function expressionToDescription(expression: string): string {
  const map: Record<string, string> = {
    neutral: 'neutral relaxed expression',
    smile: 'warm natural smile',
    serious: 'serious confident expression',
    confident: 'confident powerful expression',
    relaxed: 'relaxed easygoing expression',
  };
  return map[expression] || `${expression} expression`;
}

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

/**
 * Construct a detailed text prompt from model creation options.
 * Produces a professional fashion photography prompt suitable for AI model generation.
 *
 * @param options - The model creation configuration.
 * @returns A detailed text prompt string.
 */
export function buildModelPrompt(options: ModelCreateOptions): string {
  const parts: string[] = [];

  // Core description
  parts.push('Professional fashion model photograph,');
  parts.push(`${options.gender} ${ageRangeToDescription(options.ageRange)},`);
  parts.push(`${skinToneToDescription(options.skinTone)},`);
  parts.push(`${bodyTypeToDescription(options.bodyType)},`);

  // Hair
  if (options.hairStyle) {
    parts.push(`${options.hairStyle} hair,`);
  }

  // Pose and expression
  parts.push(`${poseToDescription(options.pose)},`);
  parts.push(`${expressionToDescription(options.expression)},`);

  // Background
  if (options.background) {
    parts.push(`${options.background} background,`);
  } else {
    parts.push('clean studio background,');
  }

  // Quality modifiers
  parts.push(
    'high fashion photography, professional lighting, sharp focus, editorial quality, full body shot, high resolution, 8k',
  );

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Model Creation via Replicate (Flux Kontext Pro)
// ---------------------------------------------------------------------------

/**
 * Create an AI fashion model from a text prompt using Flux Kontext Pro on Replicate.
 *
 * @param prompt - Detailed text description of the desired model appearance.
 * @returns URL of the generated model image.
 */
export async function createModel(
  prompt: string,
): Promise<string> {
  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    prompt,
    aspect_ratio: '3:4',
  });

  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Face-to-Model via Replicate (Flux Kontext Pro)
// ---------------------------------------------------------------------------

/**
 * Generate a full-body AI model from a face image using Flux Kontext Pro on Replicate.
 *
 * @param faceImageUrl - URL or base64 of the face reference image.
 * @param options      - Additional options (e.g. pose, body type preferences).
 * @returns URL of the generated full-body model image.
 */
export async function faceToModel(
  faceImageUrl: string,
  options: Record<string, any> = {},
): Promise<string> {
  const prompt = options.prompt || 'Generate a full-body professional fashion model based on this face, standing naturally, clean studio background, high fashion photography, sharp focus, editorial quality';

  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: faceImageUrl,
    prompt,
    aspect_ratio: '3:4',
  });

  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Model Swap via Replicate (Flux Kontext Pro)
// ---------------------------------------------------------------------------

/**
 * Swap the model in an existing product image with a new AI-generated model.
 *
 * @param imageUrl       - URL or base64 of the source image containing the original model.
 * @param newModelPrompt - Text description for the new model to swap in.
 * @returns URL of the image with the swapped model.
 */
export async function modelSwap(
  imageUrl: string,
  newModelPrompt: string,
): Promise<string> {
  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: imageUrl,
    prompt: newModelPrompt,
  });

  return await extractOutputUrl(output);
}
