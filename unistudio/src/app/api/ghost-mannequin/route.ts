// =============================================================================
// Ghost Mannequin API Route - UniStudio
// POST: Accepts JSON { imageUrl, operation }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { saveJob } from '@/lib/db/persist';
import {
  removeMannequin,
  flatToModel,
  modelToFlat,
  GHOST_MANNEQUIN_COSTS,
} from '@/lib/processing/ghost-mannequin';
import { withApiErrorHandler, requireFields } from '@/lib/api/route-helpers';
import { proxyReplicateUrl } from '@/lib/utils/image';

export const POST = withApiErrorHandler('ghost-mannequin', async (request: NextRequest) => {
  const body = await request.json();
  const {
    imageUrl,
    operation,
    modelImage,
    category = 'tops',
  } = body as {
    imageUrl: string;
    operation: 'remove-mannequin' | 'flat-to-model' | 'model-to-flat';
    modelImage?: string;
    category?: string;
  };

  const validationError = requireFields(body, ['imageUrl', 'operation']);
  if (validationError) return validationError;

  let resultUrl: string;
  const cost = GHOST_MANNEQUIN_COSTS[operation] ?? 0.05;

  switch (operation) {
    case 'remove-mannequin': {
      resultUrl = await removeMannequin(imageUrl);
      break;
    }

    case 'flat-to-model': {
      if (!modelImage) {
        return NextResponse.json(
          { success: false, error: 'flat-to-model operation requires a "modelImage" field.' },
          { status: 400 },
        );
      }
      resultUrl = await flatToModel(imageUrl, modelImage, category);
      break;
    }

    case 'model-to-flat': {
      resultUrl = await modelToFlat(imageUrl);
      break;
    }

    default:
      return NextResponse.json(
        { success: false, error: `Unsupported operation "${operation}". Use "remove-mannequin", "flat-to-model", or "model-to-flat".` },
        { status: 400 },
      );
  }

  await saveJob({
    operation: `ghost-mannequin:${operation}`,
    provider: operation === 'flat-to-model' ? 'idm-vton' : 'flux-kontext-pro',
    inputParams: { imageUrl, operation, modelImage, category },
    outputUrl: resultUrl,
    cost,
  });

  return NextResponse.json({
    success: true,
    data: { url: proxyReplicateUrl(resultUrl), operation, cost },
    cost,
  });
});
