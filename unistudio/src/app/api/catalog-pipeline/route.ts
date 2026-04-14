// =============================================================================
// Catalog Pipeline API Route - UniStudio
// POST: Orchestrates the full e-commerce content pipeline for one image.
// Runs up to 6 steps: isolate → background → model → tryon → productVideo → modelVideo
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { saveJob } from '@/lib/db/persist';

export const maxDuration = 300;

interface ModelConfig {
  gender: string;
  ageRange: string;
  skinTone: string;
  bodyType: string;
}

interface PipelineRequest {
  imageUrl: string;
  falImageUrl?: string;
  steps: string[];
  modelConfig?: ModelConfig;
  productType?: string;
  sharedModelUrl?: string; // pre-generated model to reuse across images
}

async function callInternal(path: string, body: Record<string, unknown>): Promise<{ success: boolean; data?: { url: string; [key: string]: unknown }; error?: string; cost?: number }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.length > 200 ? text.slice(0, 200) : text || `HTTP ${res.status}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PipelineRequest;
    const { imageUrl, falImageUrl, steps, modelConfig, productType, sharedModelUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'imageUrl is required' }, { status: 400 });
    }
    if (!steps || steps.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one step is required' }, { status: 400 });
    }

    const results: Record<string, string> = {};
    let totalCost = 0;

    // Step 1: Isolate product (background removal)
    if (steps.includes('isolate')) {
      console.log('[catalog-pipeline] Step 1: isolate');
      const res = await callInternal('/api/bg-remove', {
        imageUrl,
        provider: 'replicate',
      });
      if (!res.success || !res.data?.url) {
        return NextResponse.json({ success: false, error: `Step "isolate" failed: ${res.error || 'Unknown error'}`, step: 'isolate' }, { status: 500 });
      }
      results.isolated = res.data.url;
      totalCost += res.cost ?? 0;
    }

    // Step 2: Professional background
    if (steps.includes('background')) {
      console.log('[catalog-pipeline] Step 2: background');
      const inputUrl = results.isolated || imageUrl;
      const res = await callInternal('/api/bg-generate', {
        imageUrl: inputUrl,
        mode: 'fast',
        style: 'studio-white',
        aspectRatio: '1:1',
      });
      if (!res.success || !res.data?.url) {
        return NextResponse.json({ success: false, error: `Step "background" failed: ${res.error || 'Unknown error'}`, step: 'background' }, { status: 500 });
      }
      results.background = res.data.url;
      totalCost += res.cost ?? 0;
    }

    // Step 3: Generate AI model (only if not provided via sharedModelUrl)
    if (steps.includes('model') && modelConfig) {
      if (sharedModelUrl) {
        console.log('[catalog-pipeline] Step 3: model (reusing shared)');
        results.modelImage = sharedModelUrl;
      } else {
        console.log('[catalog-pipeline] Step 3: model (generating new)');
        const pose = productType === 'bra' ? 'upper-body front-facing' : 'full-body front-facing';
        const res = await callInternal('/api/model-create', {
          gender: modelConfig.gender,
          ageRange: modelConfig.ageRange,
          skinTone: modelConfig.skinTone,
          bodyType: modelConfig.bodyType,
          pose,
          expression: 'confident natural',
          background: 'plain white studio background',
          clothing: productType === 'bra' || productType === 'panty' || productType === 'set'
            ? 'wearing coordinated neutral lingerie, tasteful and professional'
            : 'wearing neutral fitted clothing',
        });
        if (!res.success || !res.data?.url) {
          return NextResponse.json({ success: false, error: `Step "model" failed: ${res.error || 'Unknown error'}`, step: 'model' }, { status: 500 });
        }
        results.modelImage = res.data.url;
        totalCost += res.cost ?? 0;
      }
    }

    // Step 4: Virtual try-on
    if (steps.includes('tryon') && results.modelImage) {
      console.log('[catalog-pipeline] Step 4: tryon');
      const garmentUrl = results.isolated || imageUrl;
      const category = productType === 'bra' || productType === 'set' ? 'upper_body' : 'lower_body';
      const res = await callInternal('/api/tryon', {
        modelImage: results.modelImage,
        garmentImage: garmentUrl,
        category,
        garmentType: 'lingerie',
      });
      if (!res.success || !res.data?.url) {
        return NextResponse.json({ success: false, error: `Step "tryon" failed: ${res.error || 'Unknown error'}`, step: 'tryon' }, { status: 500 });
      }
      results.tryOn = res.data.url;
      totalCost += res.cost ?? 0;
    }

    // Step 5: Product video (360° rotation)
    if (steps.includes('productVideo')) {
      console.log('[catalog-pipeline] Step 5: productVideo');
      const inputUrl = results.isolated || imageUrl;
      const res = await callInternal('/api/video', {
        imageUrl: inputUrl,
        falImageUrl,
        provider: 'wan-2.2-fast',
        duration: 5,
        aspectRatio: '1:1',
        prompt: 'Smooth slow 360 degree rotation of this lingerie garment on pure white background, professional product photography, clean studio lighting, commercial quality',
      });
      if (!res.success || !res.data?.url) {
        return NextResponse.json({ success: false, error: `Step "productVideo" failed: ${res.error || 'Unknown error'}`, step: 'productVideo' }, { status: 500 });
      }
      results.productVideo = res.data.url;
      totalCost += res.cost ?? 0;
    }

    // Step 6: Model video (movement)
    if (steps.includes('modelVideo') && results.tryOn) {
      console.log('[catalog-pipeline] Step 6: modelVideo');
      const res = await callInternal('/api/video', {
        imageUrl: results.tryOn,
        falImageUrl,
        provider: 'wan-2.2-fast',
        duration: 5,
        aspectRatio: '9:16',
        prompt: 'Fashion model wearing lingerie, subtle natural movement, confident elegant pose, soft studio lighting, editorial fashion photography, professional commercial quality',
      });
      if (!res.success || !res.data?.url) {
        return NextResponse.json({ success: false, error: `Step "modelVideo" failed: ${res.error || 'Unknown error'}`, step: 'modelVideo' }, { status: 500 });
      }
      results.modelVideo = res.data.url;
      totalCost += res.cost ?? 0;
    }

    // Save job to history
    await saveJob({
      operation: 'catalog-pipeline',
      provider: 'multi',
      inputParams: { steps, productType, modelConfig },
      outputUrl: results.tryOn || results.background || results.isolated || imageUrl,
      cost: totalCost,
    });

    return NextResponse.json({ success: true, data: results, cost: totalCost });
  } catch (error) {
    console.error('[API /catalog-pipeline] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
