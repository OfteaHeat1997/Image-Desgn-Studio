// =============================================================================
// Background Removal API Route - UniStudio
// POST: Accepts JSON { imageUrl, provider, options? }
// Routes to the appropriate background removal provider.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  removeBgReplicate,
  removeBgWithoutBg,
} from '@/lib/processing/bg-remove';
import { isWithoutBgHealthy } from '@/lib/api/withoutbg';
import { saveJob } from '@/lib/db/persist';

// Provider cost estimates in dollars
const PROVIDER_COSTS: Record<string, number> = {
  replicate: 0.01,
  browser: 0,
  withoutbg: 0,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, provider, options } = body as {
      imageUrl: string;
      provider: 'browser' | 'replicate' | 'withoutbg';
      options?: Record<string, unknown>;
    };

    console.log(`[API /bg-remove] Provider: "${provider}", imageUrl length: ${imageUrl?.length ?? 0}`);

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "imageUrl".' },
        { status: 400 },
      );
    }

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "provider".' },
        { status: 400 },
      );
    }

    // Browser-based processing cannot run on the server
    if (provider === 'browser') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Browser-based background removal runs client-side only. Use @imgly/background-removal directly in the browser.',
        },
        { status: 400 },
      );
    }

    let resultUrl: string;
    const cost = PROVIDER_COSTS[provider] ?? 0;

    switch (provider) {
      case 'replicate': {
        resultUrl = await removeBgReplicate(imageUrl);
        break;
      }

      case 'withoutbg': {
        const healthy = await isWithoutBgHealthy();
        if (!healthy) {
          return NextResponse.json(
            {
              success: false,
              error:
                'withoutBG Docker container is not running. Start it with: docker run -p 8000:80 withoutbg/app:latest',
            },
            { status: 503 },
          );
        }
        resultUrl = await removeBgWithoutBg(imageUrl);
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported provider "${provider}". Use "replicate", "withoutbg", or "browser".`,
          },
          { status: 400 },
        );
    }

    await saveJob({
      operation: 'bg-remove',
      provider,
      inputParams: { imageUrl },
      outputUrl: resultUrl,
      cost,
    });

    return NextResponse.json({
      success: true,
      data: { url: resultUrl, provider },
      cost,
    });
  } catch (error) {
    console.error('[API /bg-remove] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during background removal.',
      },
      { status: 500 },
    );
  }
}
