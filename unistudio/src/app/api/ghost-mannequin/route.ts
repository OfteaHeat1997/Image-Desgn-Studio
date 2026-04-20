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
  modelToGhost,
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
    garmentType,
  } = body as {
    imageUrl: string;
    operation: 'remove-mannequin' | 'flat-to-model' | 'model-to-flat' | 'model-to-ghost';
    modelImage?: string;
    category?: string;
    garmentType?: string;
  };

  const validationError = requireFields(body, ['imageUrl', 'operation']);
  if (validationError) return validationError;

  let resultUrl: string;
  let usedProvider = 'flux-kontext-pro';
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
      usedProvider = 'idm-vton';
      break;
    }

    case 'model-to-flat': {
      resultUrl = await modelToFlat(imageUrl);
      break;
    }

    case 'model-to-ghost': {
      const result = await modelToGhost(imageUrl, garmentType);
      resultUrl = result.url;
      usedProvider = result.provider;
      break;
    }

    default:
      return NextResponse.json(
        { success: false, error: `Unsupported operation "${operation}". Use "remove-mannequin", "flat-to-model", "model-to-flat", or "model-to-ghost".` },
        { status: 400 },
      );
  }

  await saveJob({
    operation: `ghost-mannequin:${operation}`,
    provider: usedProvider,
    inputParams: { imageUrl, operation, modelImage, category, garmentType },
    outputUrl: resultUrl,
    cost,
  });

  return NextResponse.json({
    success: true,
    data: { url: proxyReplicateUrl(resultUrl), operation, cost, provider: usedProvider },
    cost,
  });
});
