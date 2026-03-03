// =============================================================================
// Batch Processing API Route - UniStudio
// POST: Accepts JSON { imageUrls, pipeline: { steps: PipelineStep[] } }
// Processes each image through the pipeline steps sequentially.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineStep {
  id: string;
  operation: string;
  provider: string;
  params: Record<string, unknown>;
  enabled: boolean;
}

interface BatchResult {
  imageId: string;
  originalUrl: string;
  processedUrl: string | null;
  stepsCompleted: number;
  cost: number;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Internal route URL builder
// ---------------------------------------------------------------------------

function getInternalUrl(path: string): string {
  // In development, use localhost. In production, use the app's URL.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  return `${baseUrl}${path}`;
}

// ---------------------------------------------------------------------------
// Operation cost estimates (in dollars)
// ---------------------------------------------------------------------------

const OPERATION_COSTS: Record<string, number> = {
  'bg-remove': 0.02,
  'bg-generate': 0.05,
  enhance: 0,
  upscale: 0.03,
  shadows: 0,
  inpaint: 0.05,
  outpaint: 0.05,
};

// ---------------------------------------------------------------------------
// Process a single step for a single image
// ---------------------------------------------------------------------------

async function processStep(
  imageUrl: string,
  step: PipelineStep,
): Promise<{ url: string; cost: number }> {
  const { operation, provider, params } = step;

  let apiPath: string;
  let requestBody: Record<string, unknown>;

  switch (operation) {
    case 'bg-remove':
      apiPath = '/api/bg-remove';
      requestBody = { imageUrl, provider, ...params };
      break;

    case 'bg-generate':
      apiPath = '/api/bg-generate';
      requestBody = { imageUrl, ...params };
      break;

    case 'enhance':
      // Enhancement via URL approach - download and re-upload would be needed
      // For batch, we pass the URL and let the enhance endpoint handle it
      apiPath = '/api/enhance';
      requestBody = { imageUrl, provider, ...params };
      break;

    case 'upscale':
      apiPath = '/api/upscale';
      requestBody = { imageUrl, provider, ...params };
      break;

    case 'shadows':
      apiPath = '/api/shadows';
      requestBody = { imageUrl, ...params };
      break;

    case 'inpaint':
      apiPath = '/api/inpaint';
      requestBody = { imageUrl, provider, ...params };
      break;

    case 'outpaint':
      apiPath = '/api/outpaint';
      requestBody = { imageUrl, provider, ...params };
      break;

    default:
      throw new Error(`Unsupported batch operation: ${operation}`);
  }

  // Call the internal API endpoint
  const response = await fetch(getInternalUrl(apiPath), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || `Step "${operation}" failed`);
  }

  const outputUrl = result.data?.url || result.data?.processedUrl;
  if (!outputUrl) {
    throw new Error(`Step "${operation}" did not return a result URL`);
  }

  return {
    url: outputUrl,
    cost: result.cost ?? OPERATION_COSTS[operation] ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Process a single image through the entire pipeline
// ---------------------------------------------------------------------------

async function processImage(
  imageUrl: string,
  steps: PipelineStep[],
  index: number,
): Promise<BatchResult> {
  let currentUrl = imageUrl;
  let totalCost = 0;
  let stepsCompleted = 0;

  try {
    const enabledSteps = steps.filter((s) => s.enabled);

    for (const step of enabledSteps) {
      const { url, cost } = await processStep(currentUrl, step);
      currentUrl = url;
      totalCost += cost;
      stepsCompleted++;
    }

    return {
      imageId: `image-${index}`,
      originalUrl: imageUrl,
      processedUrl: currentUrl,
      stepsCompleted,
      cost: totalCost,
      error: null,
    };
  } catch (error) {
    return {
      imageId: `image-${index}`,
      originalUrl: imageUrl,
      processedUrl: stepsCompleted > 0 ? currentUrl : null,
      stepsCompleted,
      cost: totalCost,
      error: error instanceof Error ? error.message : 'Unknown error during batch processing',
    };
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrls, pipeline } = body as {
      imageUrls: string[];
      pipeline: { steps: PipelineStep[] };
    };

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty "imageUrls" array.' },
        { status: 400 },
      );
    }

    if (!pipeline || !pipeline.steps || !Array.isArray(pipeline.steps)) {
      return NextResponse.json(
        { success: false, error: 'Missing "pipeline" with "steps" array.' },
        { status: 400 },
      );
    }

    const enabledSteps = pipeline.steps.filter((s) => s.enabled);
    if (enabledSteps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No enabled steps in the pipeline.' },
        { status: 400 },
      );
    }

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 50;
    if (imageUrls.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch size (${imageUrls.length}) exceeds the maximum of ${MAX_BATCH_SIZE} images.`,
        },
        { status: 400 },
      );
    }

    // Process all images (sequentially to avoid overwhelming APIs)
    const results: BatchResult[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const result = await processImage(imageUrls[i], pipeline.steps, i);
      results.push(result);
    }

    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const successCount = results.filter((r) => r.error === null).length;
    const failCount = results.filter((r) => r.error !== null).length;

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total: imageUrls.length,
          succeeded: successCount,
          failed: failCount,
          stepsPerImage: enabledSteps.length,
        },
      },
      cost: totalCost,
    });
  } catch (error) {
    console.error('[API /batch] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during batch processing.',
      },
      { status: 500 },
    );
  }
}
