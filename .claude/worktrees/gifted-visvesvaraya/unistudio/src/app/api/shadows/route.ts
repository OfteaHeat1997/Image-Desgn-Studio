// =============================================================================
// Shadow Generation API Route - UniStudio
// POST: Accepts JSON or FormData for programmatic or AI-based shadow generation.
// All shadow logic lives in @/lib/processing/shadows — this route just routes.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { addDropShadow, addContactShadow, addReflection, relightIcLight, relightKontext } from '@/lib/processing/shadows';
import { urlToBuffer, bufferToDataUrl } from '@/lib/utils/image';
import { saveJob } from '@/lib/db/persist';
import { withApiErrorHandler } from '@/lib/api/route-helpers';

async function compressIfNeeded(buf: Buffer): Promise<{ buffer: Buffer; mime: string }> {
  if (buf.length <= 3 * 1024 * 1024) return { buffer: buf, mime: 'image/png' };
  const compressed = Buffer.from(await sharp(buf).jpeg({ quality: 90 }).toBuffer());
  return { buffer: compressed, mime: 'image/jpeg' };
}

// Cost estimates in dollars
const SHADOW_COSTS: Record<string, number> = {
  drop: 0,
  contact: 0,
  reflection: 0,
  'ai-relight': 0.04,
  'ai-kontext': 0.05,
};

// Shadow preset prompts for AI modes
const SHADOW_PRESETS: Record<string, string> = {
  'soft-front': 'Soft, even front lighting on a product. Professional e-commerce product photography with diffused shadows.',
  'left-key': 'Strong key light from the left side creating defined directional shadows on the right.',
  'right-key': 'Strong key light from the right side creating defined directional shadows on the left.',
  'top-down': 'Overhead top-down lighting with shadows directly below the product. Clean professional look.',
  'rim-light': 'Backlit product with rim lighting creating a glowing edge and soft frontal shadows.',
  'golden-hour': 'Warm golden hour sunlight with a slight warm tint. Product appears in late afternoon light with soft warm shadows.',
  'dramatic': 'Dramatic high-contrast studio lighting with deep shadows and bright highlights. Fashion photography look.',
  'studio': 'Professional multi-light studio setup with fill lights. Clean commercial product photography.',
};

// ---------------------------------------------------------------------------
// Helper: resolve image buffer from URL
// ---------------------------------------------------------------------------

async function resolveBuffer(imageUrl: string | undefined, imageBuffer: Buffer | undefined): Promise<Buffer | null> {
  if (imageBuffer) return imageBuffer;
  if (imageUrl) return urlToBuffer(imageUrl);
  return null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const POST = withApiErrorHandler('shadows', async (request: NextRequest) => {
  const contentType = request.headers.get('content-type') || '';

  let imageUrl: string | undefined;
  let imageBuffer: Buffer | undefined;
  let shadowType: string;
  let params: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any -- dynamic JSON params
  let preset: string | undefined;
  let prompt: string | undefined;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const paramsStr = formData.get('params') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided in form data.' }, { status: 400 });
    }

    imageBuffer = Buffer.from(await file.arrayBuffer());

    if (!paramsStr) {
      return NextResponse.json({ success: false, error: 'Missing "params" field with shadow configuration.' }, { status: 400 });
    }

    try {
      const parsed = JSON.parse(paramsStr);
      shadowType = parsed.type;
      params = parsed;
      preset = parsed.preset;
      prompt = parsed.prompt;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON in "params" field.' }, { status: 400 });
    }
  } else {
    const body = await request.json();
    imageUrl = body.imageUrl;
    shadowType = body.type;
    params = body.params || body;
    preset = body.preset;
    prompt = body.prompt;

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Missing "imageUrl" in JSON body or "file" in form data.' }, { status: 400 });
    }
  }

  if (!shadowType) {
    return NextResponse.json(
      { success: false, error: 'Missing "type" field. Use "drop", "contact", "reflection", "ai-relight", or "ai-kontext".' },
      { status: 400 },
    );
  }

  const cost = SHADOW_COSTS[shadowType] ?? 0;
  let resultUrl: string;

  switch (shadowType) {
    case 'drop': {
      const buffer = await resolveBuffer(imageUrl, imageBuffer);
      if (!buffer) return NextResponse.json({ success: false, error: 'Image data required for drop shadow.' }, { status: 400 });
      const result = await addDropShadow(buffer, {
        offsetX: params.offsetX ?? 5,
        offsetY: params.offsetY ?? 10,
        blur: params.blur ?? 15,
        spread: params.spread ?? 0,
        color: params.color ?? '#000000',
        opacity: params.opacity ?? 0.3,
      });
      const drop = await compressIfNeeded(result);
      resultUrl = bufferToDataUrl(drop.buffer, drop.mime);
      break;
    }

    case 'contact': {
      const buffer = await resolveBuffer(imageUrl, imageBuffer);
      if (!buffer) return NextResponse.json({ success: false, error: 'Image data required for contact shadow.' }, { status: 400 });
      const result = await addContactShadow(buffer, {
        blur: params.blur ?? 20,
        opacity: params.opacity ?? 0.4,
        distance: params.distance ?? 5,
        color: params.color ?? '#000000',
      });
      const contact = await compressIfNeeded(result);
      resultUrl = bufferToDataUrl(contact.buffer, contact.mime);
      break;
    }

    case 'reflection': {
      const buffer = await resolveBuffer(imageUrl, imageBuffer);
      if (!buffer) return NextResponse.json({ success: false, error: 'Image data required for reflection.' }, { status: 400 });
      const result = await addReflection(buffer, {
        opacity: params.opacity ?? 0.3,
        blur: params.blur ?? 5,
        fade: params.fade ?? 0.5,
      });
      const refl = await compressIfNeeded(result);
      resultUrl = bufferToDataUrl(refl.buffer, refl.mime);
      break;
    }

    case 'ai-relight': {
      if (!imageUrl && imageBuffer) {
        imageUrl = bufferToDataUrl(imageBuffer, 'image/png');
      }
      if (!imageUrl) {
        return NextResponse.json({ success: false, error: 'Image URL required for AI relighting.' }, { status: 400 });
      }
      const relightPromptText = preset
        ? SHADOW_PRESETS[preset] || preset
        : prompt || 'Professional product photography with soft diffused studio lighting and natural shadows.';

      resultUrl = await relightIcLight(imageUrl, relightPromptText);
      break;
    }

    case 'ai-kontext': {
      if (!imageUrl && imageBuffer) {
        imageUrl = bufferToDataUrl(imageBuffer, 'image/png');
      }
      if (!imageUrl) {
        return NextResponse.json({ success: false, error: 'Image URL required for AI relighting.' }, { status: 400 });
      }
      const kontextPromptText = preset
        ? SHADOW_PRESETS[preset] || preset
        : prompt || 'Add natural, professional product photography shadows and lighting. Keep the product exactly the same.';

      resultUrl = await relightKontext(imageUrl, kontextPromptText);
      break;
    }

    default:
      return NextResponse.json(
        { success: false, error: `Unsupported shadow type "${shadowType}". Use "drop", "contact", "reflection", "ai-relight", or "ai-kontext".` },
        { status: 400 },
      );
  }

  await saveJob({
    operation: 'shadows',
    provider: shadowType,
    inputParams: { imageUrl, shadowType, preset, prompt },
    outputUrl: resultUrl,
    cost,
  });

  return NextResponse.json({
    success: true,
    data: { url: resultUrl, type: shadowType },
    cost,
  });
});
