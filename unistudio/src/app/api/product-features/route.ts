// =============================================================================
// Product Features API Route — UniStudio
// POST: Analyzes a SINGLE product photo and returns category-specific features
// extracted from THIS exact photo (not class-level templates). Used as the
// "paso 0" of every pipeline (lingerie, static-product, jewelry) so subsequent
// generation steps can inject the per-photo features into their prompts and
// preserve the exact product instead of inventing a generic version.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeProductFeatures,
  type ProductCategory,
} from '@/lib/processing/product-features';

export const maxDuration = 60;

const VALID_CATEGORIES: ProductCategory[] = ['lingerie', 'static-product', 'jewelry'];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      imageUrl?: string;
      category?: string;
    };

    if (!body.imageUrl) {
      return NextResponse.json(
        { success: false, error: 'imageUrl es requerido.' },
        { status: 400 },
      );
    }

    const category = body.category as ProductCategory | undefined;
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `category debe ser una de: ${VALID_CATEGORIES.join(', ')}.`,
        },
        { status: 400 },
      );
    }

    const result = await analyzeProductFeatures({ url: body.imageUrl }, category);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Análisis de producto falló. Verifica ANTHROPIC_API_KEY y que la imagen sea accesible.',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.features,
      cost: result.cost,
      cached: result.cached,
    });
  } catch (error) {
    console.error('[API /product-features] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado.',
      },
      { status: 500 },
    );
  }
}
