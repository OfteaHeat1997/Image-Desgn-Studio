// =============================================================================
// Identity Check API Route
// POST: Compares input vs output via Claude Haiku Vision and reports whether
// the product changed during pipeline processing. Used as a post-procesamiento
// validator across all 3 pipelines (lingerie, static-product, jewelry).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkProductIdentity } from '@/lib/processing/identity-check';
import type { ProductCategory } from '@/lib/processing/product-features';

export const maxDuration = 60;

const VALID_CATEGORIES: ProductCategory[] = ['lingerie', 'static-product', 'jewelry'];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      inputUrl?: string;
      outputUrl?: string;
      category?: string;
    };

    if (!body.inputUrl || !body.outputUrl) {
      return NextResponse.json(
        { success: false, error: 'inputUrl y outputUrl son requeridos.' },
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

    const result = await checkProductIdentity(body.inputUrl, body.outputUrl, category);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Identity check falló. Verifica ANTHROPIC_API_KEY y que las URLs sean accesibles.',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      cost: 0.0005,
    });
  } catch (error) {
    console.error('[API /identity-check] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado.',
      },
      { status: 500 },
    );
  }
}
