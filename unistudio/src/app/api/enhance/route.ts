// =============================================================================
// Image Enhancement API Route - UniStudio
// POST: Accepts FormData with 'file' and 'options' (JSON string or preset name).
// Uses sharp for local image enhancement. Cost: $0.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { saveJob } from '@/lib/db/persist';
import { enhanceImage, enhanceWithPreset, ENHANCE_PRESETS } from '@/lib/processing/enhance';
import type { EnhanceOptions } from '@/types/api';

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const optionsStr = formData.get('options') as string | null;
    const presetName = formData.get('preset') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided. Include a "file" field in the form data.' },
        { status: 400 },
      );
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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

    // Convert to base64 data URL
    const base64 = enhancedBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    // Get output metadata
    const metadata = await sharp(enhancedBuffer).metadata();

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
