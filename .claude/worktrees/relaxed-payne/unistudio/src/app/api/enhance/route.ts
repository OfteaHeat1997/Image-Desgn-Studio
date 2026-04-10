// =============================================================================
// Image Enhancement API Route - UniStudio
// POST: Accepts FormData with 'file' OR JSON with 'imageUrl'.
// Uses sharp for local image enhancement. Cost: $0.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { saveJob } from '@/lib/db/persist';
import { enhanceImage, enhanceWithPreset, ENHANCE_PRESETS } from '@/lib/processing/enhance';
import type { EnhanceOptions } from '@/types/api';

// ---------------------------------------------------------------------------
// Helper: resolve image buffer from FormData file or JSON imageUrl
// ---------------------------------------------------------------------------

async function resolveImageBuffer(
  request: NextRequest,
): Promise<{ buffer: Buffer; optionsStr: string | null; presetName: string | null }> {
  const contentType = request.headers.get('content-type') ?? '';

  // --- JSON body (from batch route or agent pipeline) ---
  if (contentType.includes('application/json')) {
    const body = await request.json();
    const { imageUrl, preset, options } = body as {
      imageUrl?: string;
      preset?: string;
      options?: EnhanceOptions | string;
    };

    if (!imageUrl) {
      throw new Error('Missing "imageUrl" in JSON body.');
    }

    let buffer: Buffer;
    if (imageUrl.startsWith('data:')) {
      // data URL → extract base64 portion
      const base64 = imageUrl.split(',')[1];
      buffer = Buffer.from(base64, 'base64');
    } else {
      // HTTP URL → fetch
      const { replicateHeaders } = await import('@/lib/utils/image');
      const res = await fetch(imageUrl, { headers: replicateHeaders(imageUrl) });
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
      buffer = Buffer.from(await res.arrayBuffer());
    }

    const optionsStr = typeof options === 'string' ? options : options ? JSON.stringify(options) : null;
    return { buffer, optionsStr, presetName: preset ?? null };
  }

  // --- FormData body (from editor panel) ---
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    throw new Error('No file provided. Include a "file" field in the form data or send JSON with "imageUrl".');
  }

  const arrayBuffer = await file.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    optionsStr: formData.get('options') as string | null,
    presetName: formData.get('preset') as string | null,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { buffer, optionsStr, presetName } = await resolveImageBuffer(request);

    // Apply enhancement
    let enhancedBuffer: Buffer;

    if (presetName && ENHANCE_PRESETS[presetName]) {
      // Use the named preset from the processing lib
      enhancedBuffer = await enhanceWithPreset(buffer, presetName);
    } else if (optionsStr) {
      // Parse custom options from the panel
      let options: EnhanceOptions;
      try {
        options = JSON.parse(optionsStr) as EnhanceOptions;
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON in "options" field.' },
          { status: 400 },
        );
      }
      enhancedBuffer = await enhanceImage(buffer, options);
    } else {
      // Default to auto preset
      enhancedBuffer = await enhanceWithPreset(buffer, 'auto');
    }

    // Optimize large outputs to stay within Vercel's 4.5MB response limit
    const MAX_BUFFER_SIZE = 3 * 1024 * 1024;
    let outputBuffer: Buffer = enhancedBuffer;
    let outputMime = 'image/png';
    if (enhancedBuffer.length > MAX_BUFFER_SIZE) {
      outputBuffer = Buffer.from(await sharp(enhancedBuffer).jpeg({ quality: 90 }).toBuffer());
      outputMime = 'image/jpeg';
    }

    // Convert to base64 data URL
    const base64 = outputBuffer.toString('base64');
    const dataUrl = `data:${outputMime};base64,${base64}`;

    // Get output metadata
    const metadata = await sharp(outputBuffer).metadata();

    await saveJob({
      operation: 'enhance',
      provider: 'sharp',
      inputParams: { preset: presetName || 'custom' },
      outputUrl: dataUrl,
      cost: 0,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: dataUrl,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        fileSize: enhancedBuffer.length,
        preset: presetName || 'custom',
        cost: 0,
      },
    });
  } catch (error) {
    console.error('[API /enhance] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during image enhancement.',
      },
      { status: 500 },
    );
  }
}
