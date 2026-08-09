// =============================================================================
// Macro Crop Processing Module - UniStudio
// =============================================================================
// Produces the "detail shot" of a product: a tight zoom on the most substantial
// part of the piece (the pendant of a necklace, the stone of a ring, the links
// of a chain), rendered over a presentation background.
//
// WHY THIS IS NOT AN AI CALL
// --------------------------
// A detail shot exists to prove to the buyer that the clasp, the links and the
// stone setting are really like that. An AI-generated macro invents that detail
// — which is the single worst failure mode for jewelry, because it is the one
// shot the customer zooms into before paying. So this module crops REAL pixels
// out of the isolated product with sharp, and only resamples them.
//
// Cost: $0 (pure sharp, runs on the Node.js runtime).
// =============================================================================

import sharp from 'sharp';
import { urlToBuffer } from '@/lib/utils/image';

export type MacroBackground = 'velvet-black' | 'soft-white' | 'warm-gray' | 'transparent';

export interface MacroCropOptions {
  /** How tight the crop is. 2 = the crop covers half the piece in each axis. */
  zoom?: number;
  /** Output aspect ratio. */
  aspectRatio?: '1:1' | '4:5' | '3:2';
  /** Presentation background composited behind the crop. */
  background?: MacroBackground;
  /** Longest output edge in pixels. */
  outputSize?: number;
}

const ASPECT: Record<NonNullable<MacroCropOptions['aspectRatio']>, [number, number]> = {
  '1:1': [1, 1],
  '4:5': [4, 5],
  '3:2': [3, 2],
};

/**
 * Alpha-density grid used to locate the crop. 64x64 is coarse enough to be
 * essentially free and fine enough to tell a pendant from an empty chain span.
 */
const GRID = 64;

/**
 * Finds the window of the alpha map with the most opaque pixels — i.e. the
 * densest, most substantial part of the piece. For a necklace shot flat this
 * reliably lands on the pendant rather than on a thin run of chain.
 *
 * TIE-BREAKING MATTERS. A piece smaller than the window makes every window that
 * fully contains it score identically, so a naive scan returns the top-left one
 * and the piece ends up shoved into a corner of the detail shot. Ties are
 * therefore broken toward the window whose centre sits closest to the centre of
 * mass of the subject, which is what actually centres the piece.
 *
 * Returns fractional coordinates (0..1) of the window's top-left corner.
 */
function densestWindow(
  alpha: Uint8Array,
  gridW: number,
  gridH: number,
  winW: number,
  winH: number,
): { x: number; y: number } {
  // Integral image so every candidate window is an O(1) lookup. Without it a
  // 64x64 grid with a 32x32 window is ~1M adds per call, which is wasteful for
  // something that runs on every piece.
  const integral = new Float64Array((gridW + 1) * (gridH + 1));
  for (let y = 0; y < gridH; y++) {
    let rowSum = 0;
    for (let x = 0; x < gridW; x++) {
      rowSum += alpha[y * gridW + x];
      integral[(y + 1) * (gridW + 1) + (x + 1)] =
        integral[y * (gridW + 1) + (x + 1)] + rowSum;
    }
  }

  const windowSum = (x: number, y: number): number =>
    integral[(y + winH) * (gridW + 1) + (x + winW)] -
    integral[y * (gridW + 1) + (x + winW)] -
    integral[(y + winH) * (gridW + 1) + x] +
    integral[y * (gridW + 1) + x];

  // Centre of mass of the subject, used only to break ties.
  let massX = 0;
  let massY = 0;
  let mass = 0;
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const a = alpha[y * gridW + x];
      if (a === 0) continue;
      massX += x * a;
      massY += y * a;
      mass += a;
    }
  }
  const centroidX = mass > 0 ? massX / mass : gridW / 2;
  const centroidY = mass > 0 ? massY / mass : gridH / 2;

  let bestX = Math.round((gridW - winW) / 2);
  let bestY = Math.round((gridH - winH) / 2);
  let best = -1;
  let bestDist = Infinity;
  for (let y = 0; y + winH <= gridH; y++) {
    for (let x = 0; x + winW <= gridW; x++) {
      const sum = windowSum(x, y);
      if (sum < best) continue;
      const dx = x + winW / 2 - centroidX;
      const dy = y + winH / 2 - centroidY;
      const dist = dx * dx + dy * dy;
      if (sum > best || dist < bestDist) {
        best = sum;
        bestDist = dist;
        bestX = x;
        bestY = y;
      }
    }
  }

  return { x: bestX / gridW, y: bestY / gridH };
}

/** Flat presentation backgrounds. Kept subtle so the metal stays the subject. */
const BACKGROUNDS: Record<Exclude<MacroBackground, 'transparent'>, { r: number; g: number; b: number }> = {
  'velvet-black': { r: 18, g: 17, b: 20 },
  'soft-white': { r: 246, g: 245, b: 243 },
  'warm-gray': { r: 58, g: 54, b: 50 },
};

export interface MacroCropResult {
  /** PNG data URL of the finished detail shot. */
  dataUrl: string;
  /** Crop rectangle actually used, in source pixels — surfaced for debugging. */
  crop: { left: number; top: number; width: number; height: number };
}

/**
 * Crop a tight detail shot out of an isolated product image.
 *
 * Expects (but does not require) a transparent PNG — the alpha channel is what
 * locates the piece. A flattened JPEG still works: it falls back to a centered
 * crop, which is the same thing a photographer would do without a subject mask.
 */
export async function macroCrop(
  imageUrl: string,
  options: MacroCropOptions = {},
): Promise<MacroCropResult> {
  const zoom = Math.min(Math.max(options.zoom ?? 2.2, 1.2), 5);
  const [arW, arH] = ASPECT[options.aspectRatio ?? '1:1'];
  const background = options.background ?? 'velvet-black';
  const outputSize = Math.min(Math.max(options.outputSize ?? 1400, 512), 2400);

  const sourceBuffer = await urlToBuffer(imageUrl);

  // Trim the transparent margin first: an isolated PNG is mostly empty canvas,
  // and cropping relative to the untrimmed frame would zoom into nothing.
  // trim() throws on fully-uniform images, so failure just means "no margin".
  let working: Buffer;
  try {
    working = await sharp(sourceBuffer).trim({ threshold: 2 }).png().toBuffer();
  } catch {
    working = await sharp(sourceBuffer).png().toBuffer();
  }

  const meta = await sharp(working).metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  if (srcW === 0 || srcH === 0) {
    throw new Error('No se pudo leer el tamaño de la imagen para el recorte macro.');
  }

  // Crop box: same aspect as the output, sized by the zoom factor against the
  // shorter edge so a wide flat-lay necklace does not get a sliver of a crop.
  const base = Math.min(srcW, srcH) / zoom;
  let cropW = Math.round(base * (arW >= arH ? arW / arH : 1));
  let cropH = Math.round(base * (arH > arW ? arH / arW : 1));
  cropW = Math.min(cropW, srcW);
  cropH = Math.min(cropH, srcH);

  // Locate the crop on the densest part of the subject.
  let originX = (srcW - cropW) / 2 / Math.max(srcW - cropW, 1);
  let originY = (srcH - cropH) / 2 / Math.max(srcH - cropH, 1);

  if (meta.hasAlpha) {
    const alphaRaw = await sharp(working)
      .extractChannel('alpha')
      .resize(GRID, GRID, { fit: 'fill' })
      .raw()
      .toBuffer();

    const winW = Math.max(1, Math.round((cropW / srcW) * GRID));
    const winH = Math.max(1, Math.round((cropH / srcH) * GRID));
    const found = densestWindow(new Uint8Array(alphaRaw), GRID, GRID, winW, winH);
    // densestWindow returns the window origin as a fraction of the whole grid;
    // renormalise it against the scrollable range so it never overflows.
    const rangeX = 1 - cropW / srcW;
    const rangeY = 1 - cropH / srcH;
    originX = rangeX > 0 ? Math.min(found.x / rangeX, 1) : 0;
    originY = rangeY > 0 ? Math.min(found.y / rangeY, 1) : 0;
  }

  const left = Math.round(originX * (srcW - cropW));
  const top = Math.round(originY * (srcH - cropH));

  const crop = {
    left: Math.max(0, Math.min(left, srcW - cropW)),
    top: Math.max(0, Math.min(top, srcH - cropH)),
    width: cropW,
    height: cropH,
  };

  // Render the crop at output size. lanczos3 is the sharpest resampler sharp
  // offers, which matters because this shot exists to show fine detail.
  const outW = arW >= arH ? outputSize : Math.round((outputSize * arW) / arH);
  const outH = arH > arW ? outputSize : Math.round((outputSize * arH) / arW);

  const rendered = await sharp(working)
    .extract(crop)
    .resize(outW, outH, { fit: 'fill', kernel: 'lanczos3' })
    .sharpen({ sigma: 0.6 })
    .png()
    .toBuffer();

  if (background === 'transparent') {
    return { dataUrl: `data:image/png;base64,${rendered.toString('base64')}`, crop };
  }

  const flattened = await sharp({
    create: {
      width: outW,
      height: outH,
      channels: 3,
      background: BACKGROUNDS[background],
    },
  })
    .composite([{ input: rendered, left: 0, top: 0 }])
    .png()
    .toBuffer();

  return { dataUrl: `data:image/png;base64,${flattened.toString('base64')}`, crop };
}
