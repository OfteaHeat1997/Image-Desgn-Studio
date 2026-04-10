// =============================================================================
// Marketplace Compliance Checker - UniStudio
// Validates images against platform-specific requirements.
// =============================================================================

import { MARKETPLACE_REQUIREMENTS } from '@/lib/utils/constants';
import type { ComplianceResult, ComplianceIssue, ComplianceFix } from '@/types/brand';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Parse an aspect ratio string like "1:1" or "4:3" into a numeric ratio.
 */
function parseAspectRatio(ratio: string): number {
  const parts = ratio.split(':');
  if (parts.length !== 2) return 1;
  const w = parseFloat(parts[0]);
  const h = parseFloat(parts[1]);
  if (isNaN(w) || isNaN(h) || h === 0) return 1;
  return w / h;
}

/**
 * Normalize a hex color to a consistent lowercase 6-character format.
 */
function normalizeHex(color: string): string {
  let hex = color.trim().toLowerCase();
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${hex}`;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Check whether an image meets a platform's marketplace compliance requirements.
 *
 * Validates image dimensions, aspect ratio (within 5% tolerance by default),
 * background color, file size, and format against the specified platform's rules.
 *
 * @param imageWidth - Image width in pixels.
 * @param imageHeight - Image height in pixels.
 * @param fileSize - File size in bytes.
 * @param format - MIME type of the image (e.g. "image/jpeg").
 * @param platform - Target marketplace platform (e.g. "amazon", "shopify").
 * @param bgColor - Optional detected background color as hex (e.g. "#ffffff").
 * @returns A `ComplianceResult` with pass/fail status, issues, and suggested fixes.
 *
 * @example
 * ```ts
 * const result = checkCompliance(800, 800, 2_000_000, 'image/jpeg', 'amazon', '#ffffff');
 * if (!result.passed) {
 *   console.log('Issues:', result.issues);
 *   console.log('Fixes:', result.fixes);
 * }
 * ```
 */
export function checkCompliance(
  imageWidth: number,
  imageHeight: number,
  fileSize: number,
  format: string,
  platform: string,
  bgColor?: string,
): ComplianceResult {
  const spec = MARKETPLACE_REQUIREMENTS[platform];

  if (!spec) {
    return {
      passed: true,
      issues: [],
      fixes: [],
    };
  }

  const issues: ComplianceIssue[] = [];
  const fixes: ComplianceFix[] = [];

  // -------------------------------------------------------------------------
  // Check minimum width
  // -------------------------------------------------------------------------
  if (imageWidth < spec.minWidth) {
    issues.push({
      rule: 'min-width',
      message: `Image width (${imageWidth}px) is below the minimum required (${spec.minWidth}px) for ${platform}.`,
      severity: 'error',
      currentValue: `${imageWidth}px`,
      expectedValue: `>= ${spec.minWidth}px`,
    });
    fixes.push({
      issue: 'min-width',
      action: 'upscale',
      description: `Upscale the image to at least ${spec.minWidth}px wide.`,
      autoFixAvailable: true,
    });
  }

  // -------------------------------------------------------------------------
  // Check minimum height
  // -------------------------------------------------------------------------
  if (imageHeight < spec.minHeight) {
    issues.push({
      rule: 'min-height',
      message: `Image height (${imageHeight}px) is below the minimum required (${spec.minHeight}px) for ${platform}.`,
      severity: 'error',
      currentValue: `${imageHeight}px`,
      expectedValue: `>= ${spec.minHeight}px`,
    });
    fixes.push({
      issue: 'min-height',
      action: 'upscale',
      description: `Upscale the image to at least ${spec.minHeight}px tall.`,
      autoFixAvailable: true,
    });
  }

  // -------------------------------------------------------------------------
  // Check aspect ratio (within 5% tolerance)
  // -------------------------------------------------------------------------
  const ASPECT_TOLERANCE = 0.05;
  const expectedRatio = parseAspectRatio(spec.aspectRatio);
  const actualRatio = imageHeight > 0 ? imageWidth / imageHeight : 0;
  const ratioDiff = Math.abs(actualRatio - expectedRatio) / expectedRatio;

  if (ratioDiff > ASPECT_TOLERANCE) {
    issues.push({
      rule: 'aspect-ratio',
      message: `Image aspect ratio (${actualRatio.toFixed(2)}) does not match the required ${spec.aspectRatio} (${expectedRatio.toFixed(2)}) for ${platform}. Difference: ${(ratioDiff * 100).toFixed(1)}%.`,
      severity: 'error',
      currentValue: `${actualRatio.toFixed(2)} (${imageWidth}x${imageHeight})`,
      expectedValue: `${spec.aspectRatio} (${expectedRatio.toFixed(2)})`,
    });
    fixes.push({
      issue: 'aspect-ratio',
      action: 'outpaint',
      description: `Use outpainting to extend the image to match the ${spec.aspectRatio} aspect ratio.`,
      autoFixAvailable: true,
    });
  }

  // -------------------------------------------------------------------------
  // Check background color (if the platform requires it)
  // -------------------------------------------------------------------------
  if (spec.bgColor && bgColor) {
    const normalizedExpected = normalizeHex(spec.bgColor);
    const normalizedActual = normalizeHex(bgColor);

    if (normalizedExpected !== normalizedActual) {
      issues.push({
        rule: 'bg-color',
        message: `Background color (${normalizedActual}) does not match the required color (${normalizedExpected}) for ${platform}.`,
        severity: 'error',
        currentValue: normalizedActual,
        expectedValue: normalizedExpected,
      });
      fixes.push({
        issue: 'bg-color',
        action: 'bg_remove_white',
        description: `Remove the current background and replace it with ${normalizedExpected}.`,
        autoFixAvailable: true,
      });
    }
  } else if (spec.bgColor && !bgColor) {
    issues.push({
      rule: 'bg-color',
      message: `${platform} requires a ${spec.bgColor} background, but no background color was detected.`,
      severity: 'warning',
      currentValue: 'unknown',
      expectedValue: spec.bgColor,
    });
    fixes.push({
      issue: 'bg-color',
      action: 'bg_remove_white',
      description: `Remove the current background and replace it with ${spec.bgColor}.`,
      autoFixAvailable: true,
    });
  }

  // -------------------------------------------------------------------------
  // Check file size
  // -------------------------------------------------------------------------
  if (fileSize > spec.maxFileSize) {
    const maxMB = (spec.maxFileSize / (1024 * 1024)).toFixed(0);
    const currentMB = (fileSize / (1024 * 1024)).toFixed(1);

    issues.push({
      rule: 'file-size',
      message: `File size (${currentMB} MB) exceeds the maximum allowed (${maxMB} MB) for ${platform}.`,
      severity: 'error',
      currentValue: `${currentMB} MB`,
      expectedValue: `<= ${maxMB} MB`,
    });
    fixes.push({
      issue: 'file-size',
      action: 'compress',
      description: `Compress the image to reduce file size below ${maxMB} MB.`,
      autoFixAvailable: true,
    });
  }

  // -------------------------------------------------------------------------
  // Check format
  // -------------------------------------------------------------------------
  if (!spec.formats.includes(format)) {
    issues.push({
      rule: 'format',
      message: `Image format (${format}) is not supported by ${platform}. Accepted formats: ${spec.formats.join(', ')}.`,
      severity: 'error',
      currentValue: format,
      expectedValue: spec.formats.join(', '),
    });
    fixes.push({
      issue: 'format',
      action: 'convert_format',
      description: `Convert the image to one of the accepted formats: ${spec.formats.join(', ')}.`,
      autoFixAvailable: true,
    });
  }

  return {
    passed: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    fixes,
  };
}
