// =============================================================================
// Image Enhancement Processing Module
// =============================================================================

import sharp from 'sharp';
import type { EnhanceOptions } from '@/types/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnhancePreset {
  name: string;
  description: string;
  brightness: number;     // -100 to 100
  contrast: number;       // -100 to 100
  saturation: number;     // -100 to 100
  sharpness: number;      // 0 to 100
  exposure: number;       // -100 to 100
  whiteBalance: number;   // 2000 to 10000 (Kelvin)
  noiseReduction: number; // 0 to 100
  vibrance: number;       // -100 to 100
}

export type WhiteBalanceMode = 'warm' | 'cool' | 'daylight' | 'tungsten';

// ---------------------------------------------------------------------------
// Enhancement Presets
// ---------------------------------------------------------------------------

export const ENHANCE_PRESETS: Record<string, EnhancePreset> = {
  auto: {
    name: 'Auto',
    description: 'Balanced automatic enhancement for general product photos',
    brightness: 8,
    contrast: 12,
    saturation: 8,
    sharpness: 25,
    exposure: 5,
    whiteBalance: 5500,
    noiseReduction: 0,
    vibrance: 8,
  },
  ecommerce: {
    name: 'E-Commerce',
    description: 'Clean and bright for online marketplaces',
    brightness: 12,
    contrast: 15,
    saturation: 8,
    sharpness: 30,
    exposure: 8,
    whiteBalance: 5500,
    noiseReduction: 0,
    vibrance: 8,
  },
  fashion: {
    name: 'Fashion',
    description: 'Vibrant and eye-catching for fashion products',
    brightness: 8,
    contrast: 18,
    saturation: 15,
    sharpness: 25,
    exposure: 5,
    whiteBalance: 5200,
    noiseReduction: 0,
    vibrance: 15,
  },
  beauty: {
    name: 'Beauty',
    description: 'Soft and flattering for cosmetics and skincare',
    brightness: 8,
    contrast: 8,
    saturation: 10,
    sharpness: 15,
    exposure: 8,
    whiteBalance: 5800,
    noiseReduction: 5,
    vibrance: 10,
  },
  luxury: {
    name: 'Luxury',
    description: 'Rich and dramatic for high-end products',
    brightness: 0,
    contrast: 22,
    saturation: 12,
    sharpness: 30,
    exposure: -5,
    whiteBalance: 5000,
    noiseReduction: 0,
    vibrance: 12,
  },
  natural: {
    name: 'Natural',
    description: 'Minimal enhancement preserving original appearance',
    brightness: 2,
    contrast: 5,
    saturation: 0,
    sharpness: 15,
    exposure: 2,
    whiteBalance: 5500,
    noiseReduction: 10,
    vibrance: 5,
  },
  'bright-airy': {
    name: 'Bright & Airy',
    description: 'Light and ethereal for lifestyle photography',
    brightness: 18,
    contrast: -5,
    saturation: -5,
    sharpness: 15,
    exposure: 12,
    whiteBalance: 6000,
    noiseReduction: 0,
    vibrance: 5,
  },
  'dark-moody': {
    name: 'Dark & Moody',
    description: 'Deep shadows and rich tones for dramatic effect',
    brightness: -12,
    contrast: 25,
    saturation: 10,
    sharpness: 25,
    exposure: -10,
    whiteBalance: 4500,
    noiseReduction: 0,
    vibrance: 8,
  },
  vintage: {
    name: 'Vintage',
    description: 'Warm retro tones with subtle fading',
    brightness: 5,
    contrast: -8,
    saturation: -12,
    sharpness: 10,
    exposure: 5,
    whiteBalance: 6500,
    noiseReduction: 0,
    vibrance: -8,
  },
  'crisp-clean': {
    name: 'Crisp & Clean',
    description: 'Maximum sharpness and clarity for detail-oriented products',
    brightness: 5,
    contrast: 12,
    saturation: 5,
    sharpness: 45,
    exposure: 5,
    whiteBalance: 5500,
    noiseReduction: 0,
    vibrance: 8,
  },
  // Alias: product-clean maps to ecommerce settings (used by agent pipelines)
  'product-clean': {
    name: 'Producto Limpio',
    description: 'Clean product photo for e-commerce catalogs',
    brightness: 8,
    contrast: 10,
    saturation: 5,
    sharpness: 25,
    exposure: 5,
    whiteBalance: 5800,
    noiseReduction: 10,
    vibrance: 5,
  },
};

// ---------------------------------------------------------------------------
// White Balance Recomb Matrices
// ---------------------------------------------------------------------------

/**
 * Recomb matrices for white balance adjustment via Sharp.
 * Each matrix is a 3x3 transformation applied to [R, G, B] channels.
 * Values approximate the visual effect of different color temperatures.
 */
export const WHITE_BALANCE_MAPS: Record<WhiteBalanceMode, number[][]> = {
  warm: [
    [1.2, 0.0, 0.0],
    [0.0, 1.05, 0.0],
    [0.0, 0.0, 0.85],
  ],
  cool: [
    [0.85, 0.0, 0.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.2],
  ],
  daylight: [
    [1.0, 0.0, 0.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.0],
  ],
  tungsten: [
    [1.3, 0.0, 0.0],
    [0.0, 1.05, 0.0],
    [0.0, 0.0, 0.7],
  ],
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Kelvin white balance value to a recomb matrix.
 * Lower values are warmer (more red), higher values are cooler (more blue).
 *
 * @param kelvin - Color temperature in Kelvin (2000-10000).
 * @returns A 3x3 recomb matrix.
 */
function kelvinToRecombMatrix(kelvin: number): number[][] {
  // Normalize kelvin to a -1 to 1 range where 5500 is neutral
  const normalized = (kelvin - 5500) / 4500; // -1 (warm) to +1 (cool)

  if (normalized < 0) {
    // Warm: interpolate between tungsten and daylight
    const t = Math.abs(normalized);
    return [
      [1.0 + t * 0.3, 0.0, 0.0],
      [0.0, 1.0 + t * 0.05, 0.0],
      [0.0, 0.0, 1.0 - t * 0.3],
    ];
  } else {
    // Cool: interpolate between daylight and cool
    const t = normalized;
    return [
      [1.0 - t * 0.15, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 1.0 + t * 0.2],
    ];
  }
}

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// Main enhancement function
// ---------------------------------------------------------------------------

/**
 * Apply a comprehensive set of image enhancements using Sharp.
 *
 * Processing order:
 * 1. Noise reduction (median filter)
 * 2. White balance (recomb matrix)
 * 3. Brightness & saturation (modulate)
 * 4. Contrast & exposure (linear transform)
 * 5. Sharpness (unsharp mask)
 *
 * @param imageBuffer - Raw image bytes.
 * @param options     - Enhancement parameters.
 * @returns A Buffer containing the enhanced image (PNG).
 */
export async function enhanceImage(
  imageBuffer: Buffer,
  options: EnhanceOptions,
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer);

  // 1. Noise reduction — use gentle gaussian blur for low values,
  // only use median filter for aggressive noise reduction (>50)
  if (options.noiseReduction > 0) {
    if (options.noiseReduction > 50) {
      // Heavy noise: median filter (size 3 only — larger sizes cause cartoon effect)
      pipeline = pipeline.median(3);
    } else if (options.noiseReduction > 10) {
      // Light-moderate noise: gentle gaussian blur preserves detail better
      const sigma = 0.3 + (options.noiseReduction / 100) * 0.7;
      pipeline = pipeline.blur(clamp(sigma, 0.3, 1.0));
    }
    // noiseReduction <= 10: skip — too subtle to matter
  }

  // 2. White balance via recomb matrix
  if (options.whiteBalance && options.whiteBalance !== 5500) {
    const matrix = kelvinToRecombMatrix(
      clamp(options.whiteBalance, 2000, 10000),
    );
    pipeline = pipeline.recomb(matrix as [
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ]);
  }

  // 3. Brightness & saturation via modulate
  // brightness: Sharp expects a multiplier (1 = no change)
  // Convert from -100..100 to approximately 0.5..1.5
  const brightnessFactor = 1 + (options.brightness / 100) * 0.5;
  // Exposure contributes to brightness additively
  const exposureFactor = 1 + (options.exposure / 100) * 0.3;
  const combinedBrightness = brightnessFactor * exposureFactor;

  // saturation: Sharp expects a multiplier (1 = no change)
  // Convert from -100..100 to approximately 0..2
  // Vibrance adds subtle saturation boost
  const saturationBase = 1 + (options.saturation / 100);
  const vibranceContribution = (options.vibrance / 100) * 0.3;
  const combinedSaturation = Math.max(0, saturationBase + vibranceContribution);

  pipeline = pipeline.modulate({
    brightness: clamp(combinedBrightness, 0.2, 3.0),
    saturation: clamp(combinedSaturation, 0, 3.0),
  });

  // 4. Contrast & exposure via linear transform
  // linear(a, b) applies: output = a * input + b
  // contrast: multiply factor
  // Convert from -100..100 to approximately 0.5..1.5
  if (options.contrast !== 0) {
    const contrastFactor = 1 + (options.contrast / 100) * 0.5;
    // Offset to keep midtones stable: b = 128 * (1 - a)
    const offset = 128 * (1 - contrastFactor);
    pipeline = pipeline.linear(
      clamp(contrastFactor, 0.3, 2.5),
      clamp(offset, -200, 200),
    );
  }

  // 5. Sharpness via unsharp mask (subtle — avoid cartoon halos)
  if (options.sharpness > 0) {
    // Keep sigma low to avoid harsh edges
    const sigma = 0.5 + (options.sharpness / 100) * 1.0;
    // Higher flat/jagged thresholds = less sharpening in smooth/edge areas
    const flat = Math.max(3, 10 - (options.sharpness / 100) * 5);
    const jagged = Math.max(2, 8 - (options.sharpness / 100) * 4);

    pipeline = pipeline.sharpen(
      clamp(sigma, 0.5, 1.5),
      clamp(flat, 3, 10),
      clamp(jagged, 2, 8),
    );
  }

  return pipeline.png().toBuffer();
}

// ---------------------------------------------------------------------------
// Preset-based enhancement
// ---------------------------------------------------------------------------

/**
 * Enhance an image using a named preset.
 *
 * @param imageBuffer - Raw image bytes.
 * @param presetName  - Key from ENHANCE_PRESETS (e.g. 'auto', 'ecommerce', 'fashion').
 * @returns A Buffer containing the enhanced image (PNG).
 * @throws If the preset name is not found.
 */
export async function enhanceWithPreset(
  imageBuffer: Buffer,
  presetName: string,
): Promise<Buffer> {
  const preset = ENHANCE_PRESETS[presetName];
  if (!preset) {
    const available = Object.keys(ENHANCE_PRESETS).join(', ');
    throw new Error(
      `Unknown enhancement preset "${presetName}". Available: ${available}`,
    );
  }

  const options: EnhanceOptions = {
    brightness: preset.brightness,
    contrast: preset.contrast,
    saturation: preset.saturation,
    sharpness: preset.sharpness,
    exposure: preset.exposure,
    whiteBalance: preset.whiteBalance,
    noiseReduction: preset.noiseReduction,
    vibrance: preset.vibrance,
    preset: presetName,
  };

  return enhanceImage(imageBuffer, options);
}
