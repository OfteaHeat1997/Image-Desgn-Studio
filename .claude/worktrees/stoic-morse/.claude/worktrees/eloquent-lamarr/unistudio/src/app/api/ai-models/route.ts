// =============================================================================
// AI Models API Route - UniStudio
// GET: Returns all saved AI models from the database.
// =============================================================================

import { NextResponse } from 'next/server';
import { getAiModels } from '@/lib/db/queries';

export async function GET() {
  try {
    const models = await getAiModels();
    return NextResponse.json({ success: true, data: models });
  } catch (error) {
    console.error('[API /ai-models] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch AI models.',
      },
      { status: 500 },
    );
  }
}
