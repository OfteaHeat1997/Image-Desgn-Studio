// =============================================================================
// Prompt Templates API Route - UniStudio
// GET: Returns all saved prompt templates.
// POST: Saves a new prompt template.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPromptTemplates, savePromptTemplate } from '@/lib/db/queries';

export async function GET() {
  try {
    const templates = await getPromptTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('[API /prompt-templates GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch prompt templates.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, name, prompt, negativePrompt, previewUrl, isPublic } = body as {
      category: string;
      name: string;
      prompt: string;
      negativePrompt?: string;
      previewUrl?: string;
      isPublic?: boolean;
    };

    if (!category || !name || !prompt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: category, name, prompt.' },
        { status: 400 },
      );
    }

    const template = await savePromptTemplate({
      category,
      name,
      prompt,
      negativePrompt: negativePrompt || '',
      previewUrl: previewUrl || '',
      isPublic: isPublic ?? false,
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('[API /prompt-templates POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save prompt template.',
      },
      { status: 500 },
    );
  }
}
