// =============================================================================
// Brand Store - UniStudio
// Manages brand kit configuration and export templates.
// =============================================================================

import { create } from 'zustand';
import type {
  BrandKit,
  BrandColors,
  BrandFonts,
  WatermarkConfig,
  ComplianceRule,
  MarketplacePlatform,
} from '@/types/brand';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** An export template targeting a specific platform or custom size */
export interface ExportTemplate {
  id: string;
  name: string;
  platform: MarketplacePlatform | 'custom';
  width: number;
  height: number;
  format: 'png' | 'jpg' | 'webp';
  quality: number;                // 0-100
  applyBrandWatermark: boolean;
  complianceRule: ComplianceRule | null;
}

// -----------------------------------------------------------------------------
// Default Brand Kit
// -----------------------------------------------------------------------------

const DEFAULT_BRAND_KIT: BrandKit = {
  id: '',
  userId: '',
  name: 'Default Brand',
  colors: {
    primary: '#000000',
    secondary: '#ffffff',
    accent: '#3b82f6',
    background: '#f5f5f5',
  },
  fonts: {
    primary: 'Inter',
    secondary: 'Inter',
  },
  logoUrl: '',
  watermark: {
    enabled: false,
    position: 'bottom-right',
    opacity: 0.3,
    size: 15,
    imageUrl: '',
  },
  defaultBgStyle: 'studio-white',
  defaultEnhancePreset: 'product-clean',
};

// -----------------------------------------------------------------------------
// State & Actions Interface
// -----------------------------------------------------------------------------

interface BrandStoreState {
  // State
  brandKit: BrandKit;
  templates: ExportTemplate[];

  // Brand kit actions
  updateBrandKit: (updates: Partial<BrandKit>) => void;
  updateBrandColors: (colors: Partial<BrandColors>) => void;
  updateBrandFonts: (fonts: Partial<BrandFonts>) => void;
  updateWatermark: (watermark: Partial<WatermarkConfig>) => void;
  resetBrandKit: () => void;

  // Template actions
  addTemplate: (template: ExportTemplate) => void;
  updateTemplate: (templateId: string, updates: Partial<Omit<ExportTemplate, 'id'>>) => void;
  removeTemplate: (templateId: string) => void;
  getTemplatesForPlatform: (platform: MarketplacePlatform) => ExportTemplate[];
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useBrandStore = create<BrandStoreState>()((set, get) => ({
  // -- Initial state ----------------------------------------------------------
  brandKit: DEFAULT_BRAND_KIT,
  templates: [],

  // -- Brand kit actions ------------------------------------------------------

  updateBrandKit: (updates) => {
    set((state) => ({
      brandKit: { ...state.brandKit, ...updates },
    }));
  },

  updateBrandColors: (colors) => {
    set((state) => ({
      brandKit: {
        ...state.brandKit,
        colors: { ...state.brandKit.colors, ...colors },
      },
    }));
  },

  updateBrandFonts: (fonts) => {
    set((state) => ({
      brandKit: {
        ...state.brandKit,
        fonts: { ...state.brandKit.fonts, ...fonts },
      },
    }));
  },

  updateWatermark: (watermark) => {
    set((state) => ({
      brandKit: {
        ...state.brandKit,
        watermark: { ...state.brandKit.watermark, ...watermark },
      },
    }));
  },

  resetBrandKit: () => {
    set({ brandKit: { ...DEFAULT_BRAND_KIT } });
  },

  // -- Template actions -------------------------------------------------------

  addTemplate: (template) => {
    set((state) => ({
      templates: [...state.templates, template],
    }));
  },

  updateTemplate: (templateId, updates) => {
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === templateId ? { ...t, ...updates } : t
      ),
    }));
  },

  removeTemplate: (templateId) => {
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== templateId),
    }));
  },

  getTemplatesForPlatform: (platform) => {
    return get().templates.filter((t) => t.platform === platform);
  },
}));
