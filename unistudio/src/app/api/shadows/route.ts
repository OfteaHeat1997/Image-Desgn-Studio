// =============================================================================
// Shadow Generation API Route - UniStudio
// POST: Accepts JSON or FormData for programmatic or AI-based shadow generation.
// - Programmatic (drop/contact/reflection): uses sharp to composite shadows
// - AI shadows (ai-relight/ai-kontext): uses Replicate
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { urlToBuffer, bufferToDataUrl } from '@/lib/utils/image';
import { saveJob } from '@/lib/db/persist';

// Cost estimates in dollars
const SHADOW_COSTS: Record<string, number> = {
  drop: 0,
  contact: 0,
  reflection: 0,
  'ai-relight': 0.04,
  'ai-kontext': 0.05,
};

// Shadow preset prompts for AI modes (keys match frontend LIGHTING_PRESETS IDs)
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
// Programmatic shadow helpers
// ---------------------------------------------------------------------------

async function addDropShadow(
  imageBuffer: Buffer,
  params: {
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: string;
    opacity: number;
  },
): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  // Parse hex color to RGB
  const hex = params.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  // Minimal padding: just enough for the offset + a bit for blur bleed
  const blurPad = Math.ceil(params.blur * 0.5);
  const padding = blurPad + Math.max(Math.abs(params.offsetX), Math.abs(params.offsetY));
  const canvasWidth = width + padding * 2;
  const canvasHeight = height + padding * 2;

  // 1) Extract alpha channel, scale by opacity → this becomes the shadow's alpha
  const alphaMask = await sharp(imageBuffer)
    .ensureAlpha()
    .extractChannel(3)
    .linear(params.opacity, 0) // scale: 255 * opacity
    .toBuffer();

  // 2) Create shadow: solid RGB color + alpha mask joined as 4th channel
  const shadowLayer = await sharp({
    create: { width, height, channels: 3, background: { r, g, b } },
  })
    .joinChannel(alphaMask)
    .png()
    .toBuffer();

  // 3) Apply blur to shadow
  const blurredShadow = params.blur > 0
    ? await sharp(shadowLayer).blur(Math.max(0.3, params.blur)).png().toBuffer()
    : shadowLayer;

  // 4) Composite: shadow offset behind, original on top
  const result = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: blurredShadow,
        left: Math.max(0, padding + params.offsetX),
        top: Math.max(0, padding + params.offsetY),
      },
      {
        input: imageBuffer,
        left: padding,
        top: padding,
      },
    ])
    .png()
    .toBuffer();

  return result;
}

async function addContactShadow(
  imageBuffer: Buffer,
  params: {
    blur: number;
    opacity: number;
    distance: number;
    color: string;
  },
): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  const hex = params.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  // Create an SVG ellipse shadow at the bottom of the product
  const spreadFrac = Math.max(0.3, params.distance / 100);
  const shadowWidth = Math.round(width * spreadFrac);
  const shadowHeight = Math.round(shadowWidth * 0.12);
  const gap = Math.round(shadowHeight * 0.5);
  const canvasHeight = height + shadowHeight + gap;

  const cx = Math.round(width / 2);
  const cy = height + Math.round(gap / 2);
  const rx = Math.round(shadowWidth / 2);
  const ry = Math.round(shadowHeight / 2);
  const alphaHex = Math.round(params.opacity * 255).toString(16).padStart(2, '0');

  const shadowSvg = Buffer.from(
    `<svg width="${width}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${params.color}${alphaHex}" />
    </svg>`,
  );

  let shadowBuffer = await sharp(shadowSvg).png().toBuffer();
  if (params.blur > 0) {
    shadowBuffer = await sharp(shadowBuffer)
      .blur(Math.max(0.3, params.blur))
      .png()
      .toBuffer();
  }

  return sharp({
    create: {
      width,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: shadowBuffer, left: 0, top: 0 },
      { input: imageBuffer, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function addReflection(
  imageBuffer: Buffer,
  params: {
    opacity: number;
    blur: number;
    distance: number;
    fade: number;
  },
): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  // Reflection height based on fade (fade=0.5 means 50% height reflection)
  const reflectionHeight = Math.round(height * Math.max(0.1, 1 - params.fade));

  // 1) Flip vertically and crop to reflection height
  const flipped = await sharp(imageBuffer)
    .flip()
    .resize(width, reflectionHeight, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  // 2) Create gradient mask: opaque at top, transparent at bottom (fade effect)
  const gradientSvg = Buffer.from(
    `<svg width="${width}" height="${reflectionHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="${params.opacity}" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${reflectionHeight}" fill="url(#fade)" />
    </svg>`,
  );
  const gradientMask = await sharp(gradientSvg).png().toBuffer();

  // 3) Apply gradient mask to flipped image (fades out toward bottom)
  let reflection = await sharp(flipped)
    .ensureAlpha()
    .composite([{ input: gradientMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 4) Apply blur if requested
  if (params.blur > 0) {
    reflection = await sharp(reflection)
      .blur(Math.max(0.3, params.blur))
      .png()
      .toBuffer();
  }

  // 5) Compose: original on top, faded reflection below with small gap
  const gap = 4;
  const canvasHeight = height + gap + reflectionHeight;

  return sharp({
    create: {
      width,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: imageBuffer, left: 0, top: 0 },
      { input: reflection, left: 0, top: height + gap },
    ])
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let imageUrl: string | undefined;
    let imageBuffer: Buffer | undefined;
    let shadowType: string;
    let params: Record<string, any> = {};
    let provider: string | undefined;
    let preset: string | undefined;
    let prompt: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      // FormData-based request (for programmatic shadows with file upload)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const paramsStr = formData.get('params') as string | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided in form data.' },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);

      if (paramsStr) {
        try {
          const parsed = JSON.parse(paramsStr);
          shadowType = parsed.type;
          params = parsed;
          provider = parsed.provider;
          preset = parsed.preset;
          prompt = parsed.prompt;
        } catch {
          return NextResponse.json(
            { success: false, error: 'Invalid JSON in "params" field.' },
            { status: 400 },
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Missing "params" field with shadow configuration.' },
          { status: 400 },
        );
      }
    } else {
      // JSON-based request (for AI shadows or URL-based images)
      const body = await request.json();
      imageUrl = body.imageUrl;
      shadowType = body.type;
      params = body.params || body;
      provider = body.provider;
      preset = body.preset;
      prompt = body.prompt;

      if (!imageUrl && !imageBuffer) {
        return NextResponse.json(
          { success: false, error: 'Missing "imageUrl" in JSON body or "file" in form data.' },
          { status: 400 },
        );
      }
    }

    if (!shadowType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing "type" field. Use "drop", "contact", "reflection", "ai-relight", or "ai-kontext".',
        },
        { status: 400 },
      );
    }

    const cost = SHADOW_COSTS[shadowType] ?? 0;
    let resultUrl: string;

    switch (shadowType) {
      case 'drop': {
        if (!imageBuffer && imageUrl) {
          imageBuffer = await urlToBuffer(imageUrl);
        }
        if (!imageBuffer) {
          return NextResponse.json(
            { success: false, error: 'Image data required for drop shadow.' },
            { status: 400 },
          );
        }
        const result = await addDropShadow(imageBuffer, {
          offsetX: params.offsetX ?? 5,
          offsetY: params.offsetY ?? 10,
          blur: params.blur ?? 15,
          spread: params.spread ?? 0,
          color: params.color ?? '#000000',
          opacity: params.opacity ?? 0.3,
        });
        resultUrl = bufferToDataUrl(result, 'image/png');
        break;
      }

      case 'contact': {
        if (!imageBuffer && imageUrl) {
          imageBuffer = await urlToBuffer(imageUrl);
        }
        if (!imageBuffer) {
          return NextResponse.json(
            { success: false, error: 'Image data required for contact shadow.' },
            { status: 400 },
          );
        }
        const result = await addContactShadow(imageBuffer, {
          blur: params.blur ?? 20,
          opacity: params.opacity ?? 0.4,
          distance: params.distance ?? 5,
          color: params.color ?? '#000000',
        });
        resultUrl = bufferToDataUrl(result, 'image/png');
        break;
      }

      case 'reflection': {
        if (!imageBuffer && imageUrl) {
          imageBuffer = await urlToBuffer(imageUrl);
        }
        if (!imageBuffer) {
          return NextResponse.json(
            { success: false, error: 'Image data required for reflection.' },
            { status: 400 },
          );
        }
        const result = await addReflection(imageBuffer, {
          opacity: params.opacity ?? 0.3,
          blur: params.blur ?? 5,
          distance: params.distance ?? 2,
          fade: params.fade ?? 0.5,
        });
        resultUrl = bufferToDataUrl(result, 'image/png');
        break;
      }

      case 'ai-relight': {
        if (!imageUrl && imageBuffer) {
          imageUrl = bufferToDataUrl(imageBuffer, 'image/png');
        }
        if (!imageUrl) {
          return NextResponse.json(
            { success: false, error: 'Image URL required for AI relighting.' },
            { status: 400 },
          );
        }
        const relightPrompt = preset
          ? SHADOW_PRESETS[preset] || preset
          : prompt || 'Add natural, professional product photography shadows and lighting. Keep the product exactly the same.';

        const output = await runModel(
          'black-forest-labs/flux-kontext-pro',
          {
            image: imageUrl,
            prompt: relightPrompt + ' Keep the product exactly the same, only change the lighting and shadows.',
            output_format: 'png',
          },
        );
        resultUrl = extractOutputUrl(output);
        break;
      }

      case 'ai-kontext': {
        if (!imageUrl && imageBuffer) {
          imageUrl = bufferToDataUrl(imageBuffer, 'image/png');
        }
        if (!imageUrl) {
          return NextResponse.json(
            { success: false, error: 'Image URL required for AI Kontext shadows.' },
            { status: 400 },
          );
        }
        const kontextPrompt = preset
          ? SHADOW_PRESETS[preset] || preset
          : prompt || 'Add realistic product shadows and professional studio lighting to this product image.';

        const output = await runModel('black-forest-labs/flux-kontext-pro', {
          image: imageUrl,
          prompt: kontextPrompt,
          output_format: 'png',
        });
        resultUrl = extractOutputUrl(output);
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported shadow type "${shadowType}". Use "drop", "contact", "reflection", "ai-relight", or "ai-kontext".`,
          },
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
  } catch (error) {
    console.error('[API /shadows] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during shadow generation.',
      },
      { status: 500 },
    );
  }
}
