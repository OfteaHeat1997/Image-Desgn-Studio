// =============================================================================
// Brand Store - UniStudio
// Manages brand kit configuration and export templates.
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  defaultEnhancePreset: 'ecommerce',
};

// -----------------------------------------------------------------------------
// State & Actions Interface
// -----------------------------------------------------------------------------

interface BrandStoreState {
  // State
  brandKit: BrandKit;
  templates: ExportTemplate[];
  isLoading: boolean;
  isApiAvailable: boolean;

  // Brand kit actions
  fetchBrandKit: () => Promise<void>;
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

export const useBrandStore = create<BrandStoreState>()(
  persist(
  (set, get) => ({
  // -- Initial state ----------------------------------------------------------
  brandKit: DEFAULT_BRAND_KIT,
  templates: [],
  isLoading: false,
  isApiAvailable: true,

  // -- API fetch --------------------------------------------------------------

  fetchBrandKit: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/brand-kit');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        set((state) => ({
          isLoading: false,
          isApiAvailable: true,
          brandKit: {
            ...state.brandKit,
            ...(d.colors && { colors: d.colors }),
            ...(d.fonts && { fonts: d.fonts }),
            ...(d.logo_url !== undefined && { logoUrl: d.logo_url ?? '' }),
            ...(d.watermark && {
              watermark: {
                enabled: d.watermark.enabled ?? false,
                position: d.watermark.position ?? 'bottom-right',
                // API persists opacity as 0-100; store uses 0-1
                opacity: (d.watermark.opacity ?? 30) / 100,
                size: d.watermark.size ?? 15,
                imageUrl: d.watermark.imageUrl ?? '',
              },
            }),
            ...(d.default_bg_style && { defaultBgStyle: d.default_bg_style }),
            ...(d.default_enhance_preset && { defaultEnhancePreset: d.default_enhance_preset }),
          },
        }));
      } else {
        // API returned no data — keep localStorage data as fallback
        set({ isLoading: false, isApiAvailable: false });
      }
    } catch {
      // Network error or DB unavailable — keep localStorage data as fallback
      set({ isLoading: false, isApiAvailable: false });
    }
  },

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
}),
  {
    name: 'unistudio-brand-kit',
    partialize: (state) => ({
      brandKit: {
        ...state.brandKit,
        // Don't persist large base64 images — they'll be re-fetched from API or re-uploaded
        logoUrl: state.brandKit.logoUrl?.startsWith('data:') ? '' : state.brandKit.logoUrl,
        watermark: {
          ...state.brandKit.watermark,
          imageUrl: state.brandKit.watermark.imageUrl?.startsWith('data:') ? '' : state.brandKit.watermark.imageUrl,
        },
      },
      templates: state.templates,
      // Don't persist transient state
      // isLoading, isApiAvailable are excluded
    }),
  },
));
