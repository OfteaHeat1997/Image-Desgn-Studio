// =============================================================================
// Pipeline Execution - UniStudio
// Predefined pipeline presets and the core pipeline executor.
// =============================================================================

import type { Pipeline, PipelineStep } from '@/types/batch';
import { API_COSTS } from '@/lib/utils/constants';

// -----------------------------------------------------------------------------
// Pipeline Presets
// -----------------------------------------------------------------------------

/**
 * Pre-built pipeline presets for common product photography workflows.
 */
export const PIPELINE_PRESETS: Record<string, Pipeline> = {
  'quick-clean': {
    id: 'preset-quick-clean',
    name: 'Quick Clean',
    preset: 'quick-clean',
    steps: [
      {
        id: 'step-bg-remove',
        operation: 'bg-remove',
        provider: 'browser',
        params: { quality: 'balanced' },
        enabled: true,
      },
      {
        id: 'step-enhance',
        operation: 'enhance',
        provider: 'browser',
        params: { preset: 'product-clean' },
        enabled: true,
      },
    ],
  },

  'amazon-ready': {
    id: 'preset-amazon-ready',
    name: 'Amazon Ready',
    preset: 'amazon-ready',
    steps: [
      {
        id: 'step-bg-remove',
        operation: 'bg-remove',
        provider: 'replicate',
        params: { quality: 'quality', outputType: 'color', backgroundColor: '#ffffff' },
        enabled: true,
      },
      {
        id: 'step-enhance',
        operation: 'enhance',
        provider: 'browser',
        params: { preset: 'product-clean' },
        enabled: true,
      },
      {
        id: 'step-shadow',
        operation: 'shadow',
        provider: 'browser',
        params: { type: 'contact', opacity: 0.3, blur: 15 },
        enabled: true,
      },
      {
        id: 'step-upscale',
        operation: 'upscale',
        provider: 'replicate',
        params: { scale: 2, model: 'real-esrgan-2x' },
        enabled: true,
      },
    ],
  },

  'instagram-lifestyle': {
    id: 'preset-instagram-lifestyle',
    name: 'Instagram Lifestyle',
    preset: 'instagram-lifestyle',
    steps: [
      {
        id: 'step-bg-remove',
        operation: 'bg-remove',
        provider: 'replicate',
        params: { quality: 'quality' },
        enabled: true,
      },
      {
        id: 'step-bg-generate',
        operation: 'bg-generate',
        provider: 'replicate',
        params: {
          mode: 'creative',
          stylePreset: 'indoor-lifestyle',
          customPrompt: 'cozy lifestyle setting, warm ambient lighting',
        },
        enabled: true,
      },
      {
        id: 'step-enhance',
        operation: 'enhance',
        provider: 'browser',
        params: { preset: 'warm-lifestyle' },
        enabled: true,
      },
      {
        id: 'step-shadow',
        operation: 'shadow',
        provider: 'replicate',
        params: { type: 'ai-relight', model: 'ic-light' },
        enabled: true,
      },
    ],
  },

  'full-production': {
    id: 'preset-full-production',
    name: 'Full Production',
    preset: 'full-production',
    steps: [
      {
        id: 'step-bg-remove',
        operation: 'bg-remove',
        provider: 'replicate',
        params: { quality: 'quality', edgeRefinement: true },
        enabled: true,
      },
      {
        id: 'step-enhance',
        operation: 'enhance',
        provider: 'browser',
        params: { preset: 'product-clean', sharpness: 30 },
        enabled: true,
      },
      {
        id: 'step-bg-generate',
        operation: 'bg-generate',
        provider: 'replicate',
        params: {
          mode: 'precise',
          stylePreset: 'studio-white',
        },
        enabled: true,
      },
      {
        id: 'step-shadow',
        operation: 'shadow',
        provider: 'replicate',
        params: { type: 'ai-relight', model: 'ic-light', intensity: 60 },
        enabled: true,
      },
      {
        id: 'step-upscale',
        operation: 'upscale',
        provider: 'replicate',
        params: { scale: 4, model: 'real-esrgan-4x' },
        enabled: true,
      },
    ],
  },
};

// -----------------------------------------------------------------------------
// Cost estimation
// -----------------------------------------------------------------------------

/**
 * Estimate the cost of running a pipeline on a single image.
 *
 * @param pipeline - The pipeline to estimate.
 * @returns The estimated total cost in USD.
 */
export function estimatePipelineCost(pipeline: Pipeline): number {
  let total = 0;

  for (const step of pipeline.steps) {
    if (!step.enabled) continue;

    // Try operation:model first, then operation:provider
    const model = (step.params as Record<string, unknown>).model as string | undefined;
    const key1 = model ? `${step.operation}:${model}` : null;
    const key2 = `${step.operation}:${step.provider}`;

    const cost = (key1 ? API_COSTS[key1] : undefined) ?? API_COSTS[key2] ?? 0;
    total += cost;
  }

  return total;
}

// -----------------------------------------------------------------------------
// Pipeline execution
// -----------------------------------------------------------------------------

/**
 * Execute a processing pipeline on an image, step by step.
 *
 * Calls the API endpoint for each enabled step, passing the result of each
 * step as input to the next. Reports progress through an optional callback.
 *
 * @param imageBuffer - The initial image as a Buffer.
 * @param imageUrl - The URL of the uploaded image (used by API endpoints).
 * @param pipeline - The pipeline configuration to execute.
 * @param onProgress - Optional callback invoked after each step completes.
 * @returns The final processed image buffer, total cost, and list of completed step names.
 *
 * @example
 * ```ts
 * const { result, cost, steps } = await executePipeline(
 *   buffer,
 *   'https://storage.example.com/image.png',
 *   PIPELINE_PRESETS['amazon-ready'],
 *   (step, total) => console.log(`Step ${step}/${total}`),
 * );
 * ```
 */
export async function executePipeline(
  imageBuffer: Buffer,
  imageUrl: string,
  pipeline: Pipeline,
  onProgress?: (step: number, total: number) => void,
): Promise<{ result: Buffer; cost: number; steps: string[] }> {
  const enabledSteps = pipeline.steps.filter((s) => s.enabled);
  const totalSteps = enabledSteps.length;
  let currentUrl = imageUrl;
  let currentBuffer = imageBuffer;
  let totalCost = 0;
  const completedSteps: string[] = [];

  for (let i = 0; i < enabledSteps.length; i++) {
    const step = enabledSteps[i];

    // Call the processing API endpoint
    const response = await fetch(`/api/${step.operation}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: currentUrl,
        provider: step.provider,
        ...step.params,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Pipeline step "${step.operation}" failed: ${
          (errorData as Record<string, string>).error ?? response.statusText
        }`,
      );
    }

    const responseData = await response.json();

    // Update current URL for the next step
    const nextUrl = responseData.url ?? responseData.outputUrl;
    if (nextUrl) {
      currentUrl = nextUrl;

      // Fetch the result buffer for downstream use
      const bufferRes = await fetch(currentUrl);
      if (bufferRes.ok) {
        const ab = await bufferRes.arrayBuffer();
        currentBuffer = Buffer.from(ab);
      }
    }

    // Track cost
    const model = (step.params as Record<string, unknown>).model as string | undefined;
    const costKey1 = model ? `${step.operation}:${model}` : null;
    const costKey2 = `${step.operation}:${step.provider}`;
    const stepCost =
      responseData.cost ?? (costKey1 ? API_COSTS[costKey1] : undefined) ?? API_COSTS[costKey2] ?? 0;
    totalCost += stepCost;

    completedSteps.push(step.operation);

    // Report progress
    if (onProgress) {
      onProgress(i + 1, totalSteps);
    }
  }

  return {
    result: currentBuffer,
    cost: totalCost,
    steps: completedSteps,
  };
}
