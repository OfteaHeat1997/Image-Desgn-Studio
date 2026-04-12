// =============================================================================
// Brand & Compliance Types - UniStudio
// =============================================================================

/** Position for watermark placement */
export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/** Watermark configuration */
export interface WatermarkConfig {
  enabled: boolean;
  position: WatermarkPosition;
  opacity: number;       // 0 to 1
  size: number;          // percentage of canvas width, 1-100
  imageUrl: string;      // watermark image URL
}

/** Brand color palette */
export interface BrandColors {
  primary: string;       // hex
  secondary: string;     // hex
  accent: string;        // hex
  background: string;    // hex
}

/** Brand font pair */
export interface BrandFonts {
  primary: string;       // font family name
  secondary: string;     // font family name
}

/** A complete brand kit for consistent product photography */
export interface BrandKit {
  id: string;
  userId: string;
  name: string;
  colors: BrandColors;
  fonts: BrandFonts;
  logoUrl: string;
  watermark: WatermarkConfig;
  defaultBgStyle: string;          // e.g. 'studio-white', 'brand-gradient'
  defaultEnhancePreset: string;    // e.g. 'product-clean', 'warm-lifestyle'
  defaultShadowType?: string;      // e.g. 'contact', 'drop', 'reflection'
}

// -----------------------------------------------------------------------------
// Marketplace Compliance
// -----------------------------------------------------------------------------

/** Supported marketplace / social platforms */
export type MarketplacePlatform =
  | 'amazon'
  | 'shopify'
  | 'instagram'
  | 'etsy'
  | 'ebay'
  | 'tiktok'
  | 'pinterest'
  | 'poshmark'
  | 'depop';

/** A compliance rule for a specific marketplace */
export interface ComplianceRule {
  platform: MarketplacePlatform;
  minWidth: number;                // pixels
  minHeight: number;               // pixels
  aspectRatio: string;             // e.g. '1:1', '4:3'
  aspectRatioTolerance: number;    // percentage tolerance, e.g. 0.05 = 5%
  bgColor: string | null;          // required bg color (hex) or null if any
  maxFileSize: number;             // bytes
  formats: string[];               // e.g. ['jpg', 'png']
}

/** Severity level for a compliance issue */
export type ComplianceIssueSeverity = 'error' | 'warning' | 'info';

/** A single compliance issue found during validation */
export interface ComplianceIssue {
  rule: string;                    // e.g. 'min-width', 'aspect-ratio', 'bg-color'
  message: string;
  severity: ComplianceIssueSeverity;
  currentValue: string;
  expectedValue: string;
}

/** A suggested fix for a compliance issue */
export interface ComplianceFix {
  issue: string;                   // references ComplianceIssue.rule
  action: string;                  // e.g. 'resize', 'change-background', 'convert-format'
  description: string;
  autoFixAvailable: boolean;
}

/** The result of validating an image against marketplace compliance rules */
export interface ComplianceResult {
  passed: boolean;
  issues: ComplianceIssue[];
  fixes: ComplianceFix[];
}
