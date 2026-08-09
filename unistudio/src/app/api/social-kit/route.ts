// =============================================================================
// Social Kit API Route - UniStudio
// POST: { imageUrls[], background?, secondsPerSlide?, transitionSeconds?, includeReel? }
// Devuelve el carrusel 1080x1350 y el reel 1080x1920 listos para Instagram.
// Usado por el paso "Redes" del pipeline de joyería; reutilizable por los otros.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { buildSocialKit } from '@/lib/processing/social-kit';
import { saveJob } from '@/lib/db/persist';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrls, background, secondsPerSlide, transitionSeconds, includeReel } = body as {
      imageUrls?: unknown;
      background?: 'white' | 'black' | 'warm-gray';
      secondsPerSlide?: number;
      transitionSeconds?: number;
      includeReel?: boolean;
    };

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrls" (non-empty array).' },
        { status: 400 },
      );
    }
    if (!imageUrls.every((u) => typeof u === 'string' && u.length > 0)) {
      return NextResponse.json(
        { success: false, error: '"imageUrls" must contain non-empty strings.' },
        { status: 400 },
      );
    }
    // Instagram admite hasta 10 slides por carrusel.
    if (imageUrls.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Instagram admite hasta 10 slides por carrusel.' },
        { status: 400 },
      );
    }

    const result = await buildSocialKit(imageUrls as string[], {
      background,
      secondsPerSlide,
      transitionSeconds,
      includeReel,
    });

    await saveJob({
      operation: 'social-kit',
      provider: 'sharp+ffmpeg',
      inputParams: { count: imageUrls.length, background, includeReel },
      outputUrl: '(data-urls)',
      cost: 0,
    });

    return NextResponse.json({
      success: true,
      data: {
        carousel: result.carousel,
        reel: result.reel,
        reelError: result.reelError,
        carouselSize: { width: 1080, height: 1350 },
        reelSize: { width: 1080, height: 1920 },
      },
      cost: 0,
    });
  } catch (error) {
    console.error('[API /social-kit] Error:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado al armar el kit de redes.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
