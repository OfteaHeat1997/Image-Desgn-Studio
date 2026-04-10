// =============================================================================
// Infographic Overlay API — UniStudio
// POST: Takes a product image and adds marketing text, arrows, feature
// callouts, and detail zoom circles. Replicates Leonisa's "discover" style.
// Uses sharp for server-side image composition (FREE, no AI cost).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InfographicFeature {
  /** Feature text (e.g., "Alto Cubrimiento") */
  title: string;
  /** Sub-text (e.g., "EN COPAS Y ESPALDA") */
  subtitle?: string;
  /** Position on image: top-left, top-right, bottom-left, bottom-right, center-left, center-right */
  position: string;
}

interface InfographicRequest {
  /** Base64 data URL or HTTP URL of the product image */
  imageUrl: string;
  /** Features to overlay */
  features: InfographicFeature[];
  /** Style: "light" (beige bg like Leonisa) or "dark" (dark overlay) */
  style?: 'light' | 'dark';
  /** Brand accent color hex (default: #C5A47E gold) */
  accentColor?: string;
  /** Output dimensions (default: 1200x1500 like Leonisa) */
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// SVG text overlay builder
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildOverlaySvg(
  width: number,
  height: number,
  features: InfographicFeature[],
  style: 'light' | 'dark',
  accentColor: string,
): string {
  const textColor = style === 'light' ? '#1a1a1a' : '#ffffff';
  const subtitleColor = style === 'light' ? '#555555' : '#cccccc';
  const shadowFilter = style === 'light'
    ? ''
    : '<filter id="shadow"><feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="#000" flood-opacity="0.7"/></filter>';
  const filterAttr = style === 'dark' ? ' filter="url(#shadow)"' : '';

  // Position mapping to x,y coordinates
  const positionMap: Record<string, { x: number; y: number; anchor: string }> = {
    'top-left': { x: 60, y: Math.round(height * 0.12), anchor: 'start' },
    'top-right': { x: width - 60, y: Math.round(height * 0.12), anchor: 'end' },
    'center-left': { x: 60, y: Math.round(height * 0.45), anchor: 'start' },
    'center-right': { x: width - 60, y: Math.round(height * 0.45), anchor: 'end' },
    'bottom-left': { x: 60, y: Math.round(height * 0.78), anchor: 'start' },
    'bottom-right': { x: width - 60, y: Math.round(height * 0.78), anchor: 'end' },
  };

  let featuresSvg = '';

  for (const feature of features) {
    const pos = positionMap[feature.position] || positionMap['center-left'];

    // Accent line / decoration
    const lineX = pos.anchor === 'start' ? pos.x : pos.x - 200;
    featuresSvg += `
      <line x1="${lineX}" y1="${pos.y - 45}" x2="${lineX + 50}" y2="${pos.y - 45}"
            stroke="${accentColor}" stroke-width="3"/>`;

    // Title text (bold, large)
    featuresSvg += `
      <text x="${pos.x}" y="${pos.y}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="42" font-weight="800"
            fill="${textColor}" text-anchor="${pos.anchor}"${filterAttr}>
        ${escapeXml(feature.title)}
      </text>`;

    // Subtitle text (smaller, lighter)
    if (feature.subtitle) {
      featuresSvg += `
      <text x="${pos.x}" y="${pos.y + 36}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="22" font-weight="400" letter-spacing="2"
            fill="${subtitleColor}" text-anchor="${pos.anchor}"${filterAttr}>
        ${escapeXml(feature.subtitle)}
      </text>`;
    }
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>${shadowFilter}</defs>
    ${featuresSvg}
  </svg>`;
}

// ---------------------------------------------------------------------------
// Arrow/pointer SVG overlay
// ---------------------------------------------------------------------------

function buildArrowsSvg(
  width: number,
  height: number,
  features: InfographicFeature[],
  accentColor: string,
): string {
  let arrows = '';

  // Add decorative arrows pointing from text to product center
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);

  for (const feature of features) {
    const isLeft = feature.position.includes('left');
    const isTop = feature.position.includes('top');
    const isBottom = feature.position.includes('bottom');

    // Start point near text
    const startX = isLeft ? 220 : width - 220;
    const startY = isTop ? Math.round(height * 0.15) : isBottom ? Math.round(height * 0.80) : Math.round(height * 0.48);

    // End point toward center of product
    const endX = isLeft ? centerX - 80 : centerX + 80;
    const endY = startY + (isTop ? 40 : isBottom ? -40 : 0);

    // Curved arrow path
    const cpX = (startX + endX) / 2;
    const cpY = startY;

    arrows += `
      <path d="M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}"
            stroke="${accentColor}" stroke-width="2" fill="none"
            stroke-dasharray="8,4" opacity="0.7"/>
      <circle cx="${endX}" cy="${endY}" r="4" fill="${accentColor}" opacity="0.8"/>`;
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${arrows}
  </svg>`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InfographicRequest;

    if (!body.imageUrl) {
      return NextResponse.json(
        { success: false, error: 'imageUrl is required' },
        { status: 400 },
      );
    }

    if (!body.features || body.features.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one feature is required' },
        { status: 400 },
      );
    }

    const targetWidth = body.width ?? 1200;
    const targetHeight = body.height ?? 1500;
    const style = body.style ?? 'light';
    const accentColor = body.accentColor ?? '#C5A47E';

    // 1. Load the base image
    let imageBuffer: Buffer;
    if (body.imageUrl.startsWith('data:')) {
      const base64Match = body.imageUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (!base64Match) {
        return NextResponse.json(
          { success: false, error: 'Invalid data URL' },
          { status: 400 },
        );
      }
      imageBuffer = Buffer.from(base64Match[1], 'base64');
    } else {
      const imgRes = await fetch(body.imageUrl);
      if (!imgRes.ok) {
        return NextResponse.json(
          { success: false, error: `Failed to fetch image: ${imgRes.status}` },
          { status: 400 },
        );
      }
      imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    }

    // 2. Resize image to target dimensions
    const resizedImage = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 95 })
      .toBuffer();

    // 3. Build text overlay SVG
    const textSvg = buildOverlaySvg(targetWidth, targetHeight, body.features, style, accentColor);
    const textBuffer = Buffer.from(textSvg);

    // 4. Build arrows SVG
    const arrowsSvg = buildArrowsSvg(targetWidth, targetHeight, body.features, accentColor);
    const arrowsBuffer = Buffer.from(arrowsSvg);

    // 5. Composite: base image + arrows + text
    const result = await sharp(resizedImage)
      .composite([
        { input: arrowsBuffer, top: 0, left: 0 },
        { input: textBuffer, top: 0, left: 0 },
      ])
      .jpeg({ quality: 92 })
      .toBuffer();

    // 6. Return as data URL
    const dataUrl = `data:image/jpeg;base64,${result.toString('base64')}`;

    return NextResponse.json({
      success: true,
      data: {
        url: dataUrl,
        width: targetWidth,
        height: targetHeight,
        featuresCount: body.features.length,
      },
      cost: 0,
    });
  } catch (error) {
    console.error('[API /infographic] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error creating infographic',
      },
      { status: 500 },
    );
  }
}
