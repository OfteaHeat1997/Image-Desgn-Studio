// =============================================================================
// AI Models API Route - UniStudio
// GET: Returns saved AI models from the database.
// Optional filter: ?referenceNumber=REF-71332 — only models tagged to that Unistyles
// reference. Enables the lingerie pipeline to reuse a model across sessions instead
// of regenerating ($0.055 saved per extra color/angle of the same reference).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAiModels } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const referenceNumber = request.nextUrl.searchParams.get('referenceNumber')?.trim() || null;
    const all = await getAiModels();
    const models = referenceNumber
      ? all.filter((m) => {
          const meta = m.metadata as Record<string, unknown> | null;
          return meta?.referenceNumber === referenceNumber;
        })
      : all;
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
