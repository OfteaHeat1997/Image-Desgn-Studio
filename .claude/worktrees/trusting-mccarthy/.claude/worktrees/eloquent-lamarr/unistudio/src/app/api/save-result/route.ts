// =============================================================================
// Save Result API Route - UniStudio
// Automatically saves every processed image to the local output folder.
// POST: Accepts { imageUrl, module, filename?, metadata? }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'output');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, module, filename, metadata } = body as {
      imageUrl: string;
      module: string;
      filename?: string;
      metadata?: Record<string, unknown>;
    };

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing imageUrl' },
        { status: 400 },
      );
    }

    // Create output directory and module subfolder
    const moduleDir = path.join(OUTPUT_DIR, module || 'general');
    await mkdir(moduleDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseName = filename
      ? filename.replace(/\.[^.]+$/, '') // strip extension
      : 'result';
    const outputFilename = `${baseName}_${timestamp}.png`;
    const outputPath = path.join(moduleDir, outputFilename);

    // Download/convert the image to a buffer
    let imageBuffer: Buffer;

    if (imageUrl.startsWith('data:')) {
      // Data URL — decode base64
      const base64Data = imageUrl.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (imageUrl.startsWith('blob:')) {
      // Blob URLs can't be fetched server-side — client should send data URL
      return NextResponse.json(
        { success: false, error: 'Cannot save blob URLs server-side. Send as data URL.' },
        { status: 400 },
      );
    } else {
      // HTTP(S) URL — download
      const res = await fetch(imageUrl);
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: `Failed to download image: ${res.status}` },
          { status: 500 },
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    // Save the image
    await writeFile(outputPath, imageBuffer);

    // Save metadata JSON alongside the image
    const metaPath = outputPath.replace(/\.png$/, '.json');
    const metaData = {
      filename: outputFilename,
      module: module || 'general',
      originalFilename: filename || 'unknown',
      savedAt: new Date().toISOString(),
      size: imageBuffer.length,
      ...metadata,
    };
    await writeFile(metaPath, JSON.stringify(metaData, null, 2));

    console.log(`[save-result] Saved: ${outputPath} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);

    return NextResponse.json({
      success: true,
      data: {
        path: outputPath,
        filename: outputFilename,
        size: imageBuffer.length,
      },
    });
  } catch (error) {
    console.error('[API /save-result] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save result',
      },
      { status: 500 },
    );
  }
}
