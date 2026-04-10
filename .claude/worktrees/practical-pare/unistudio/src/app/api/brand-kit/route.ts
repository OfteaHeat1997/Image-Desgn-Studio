// =============================================================================
// Brand Kit API Route - UniStudio
// GET: Returns the saved brand kit from the database.
// PUT: Updates or creates a brand kit.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getBrandKit, updateBrandKit } from '@/lib/db/queries';

export async function GET() {
  try {
    const kit = await getBrandKit();
    return NextResponse.json({ success: true, data: kit });
  } catch (error) {
    console.error('[API /brand-kit GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch brand kit.',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const kit = await updateBrandKit(body);
    return NextResponse.json({ success: true, data: kit });
  } catch (error) {
    console.error('[API /brand-kit PUT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update brand kit.',
      },
      { status: 500 },
    );
  }
}
