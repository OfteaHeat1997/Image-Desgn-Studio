// =============================================================================
// Save Result API Route - UniStudio
// Saves processing results to the database.
// POST: Accepts { imageUrl, module, filename?, metadata? }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { saveJob } from '@/lib/db/persist';

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

    // Save to database as a processing job
    await saveJob({
      operation: module || 'general',
      provider: 'save-result',
      inputParams: { filename, ...metadata },
      outputUrl: imageUrl,
      cost: 0,
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseName = filename
      ? filename.replace(/\.[^.]+$/, '')
      : 'result';
    const outputFilename = `${baseName}_${timestamp}.png`;

    return NextResponse.json({
      success: true,
      data: {
        filename: outputFilename,
        url: imageUrl,
        savedToDb: true,
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
