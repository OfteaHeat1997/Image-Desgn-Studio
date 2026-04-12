"use client";

import React, { useState } from "react";
import {
  RotateCw,
  ZoomIn,
  Orbit,
  Sparkles,
  PackageOpen,
  Clapperboard,
  Cloud,
  Droplets,
  Wind,
  Flame,
  Star,
  Gem,
  Layers,
  Waves,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PRODUCT_PRESETS } from "@/lib/video/presets";

const PRESET_ICONS: Record<string, React.ElementType> = {
  RotateCw,
  ZoomIn,
  Orbit,
  Sparkles,
  PackageOpen,
  Clapperboard,
  Cloud,
  Droplets,
  Wind,
  Flame,
  Star,
  Gem,
  Layers,
  Waves,
  User,
};

// Group presets for display
const PRESET_GROUPS = [
  {
    label: "General",
    ids: [
      "product-rotate",
      "product-zoom",
      "camera-orbit",
      "product-reveal",
      "product-unboxing",
      "product-lifestyle",
      "product-float",
      "product-splash",
    ],
  },
  {
    label: "Perfumeria",
    ids: [
      "fragrance-spin",
      "fragrance-reveal",
      "fragrance-luxury-spin",
      "fragrance-mist",
      "fragrance-gift-reveal",
    ],
  },
  {
    label: "Joyeria",
    ids: [
      "jewelry-sparkle",
      "jewelry-float",
      "jewelry-light-sweep",
      "jewelry-chain-drop",
      "jewelry-on-model",
    ],
  },
  {
    label: "Skincare",
    ids: [
      "skincare-texture",
      "skincare-splash",
      "skincare-application",
      "skincare-water-fresh",
      "skincare-ingredients",
    ],
  },
];

// Fragrance preset IDs that should show brand selector
const FRAGRANCE_PRESET_IDS = new Set([
  "fragrance-spin",
  "fragrance-reveal",
  "fragrance-luxury-spin",
  "fragrance-mist",
  "fragrance-gift-reveal",
]);

const FRAGRANCE_BRANDS = [
  {
    id: "esika",
    label: "Esika",
    modifier: ", bold gold accents, confident modern aesthetic, Esika beauty brand",
  },
  {
    id: "cyzone",
    label: "Cyzone",
    modifier: ", young colorful energetic, vibrant youthful style, Cyzone cosmetics",
  },
  {
    id: "yanbal",
    label: "Yanbal",
    modifier: ", elegant white premium, sophisticated luxury, Yanbal beauty",
  },
  {
    id: "lbel",
    label: "L'Bel",
    modifier: ", French luxury sophisticated, haute couture aesthetic, L'Bel Paris",
  },
  {
    id: "avon",
    label: "Avon",
    modifier: ", accessible warm friendly, classic beauty, Avon cosmetics",
  },
];

interface ProductVideoTabProps {
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
}

export function ProductVideoTab({
  selectedPreset,
  onPresetChange,
  customPrompt,
  onCustomPromptChange,
}: ProductVideoTabProps) {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const isFragrancePreset = FRAGRANCE_PRESET_IDS.has(selectedPreset);

  const handlePresetChange = (presetId: string) => {
    onPresetChange(presetId);
    // Clear brand when switching away from fragrance
    if (!FRAGRANCE_PRESET_IDS.has(presetId)) {
      setSelectedBrand(null);
    }
  };

  const handleBrandSelect = (brandId: string) => {
    const brand = FRAGRANCE_BRANDS.find((b) => b.id === brandId);
    if (!brand) return;

    if (selectedBrand === brandId) {
      // Deselect
      setSelectedBrand(null);
      onCustomPromptChange("");
    } else {
      setSelectedBrand(brandId);
      const preset = PRODUCT_PRESETS.find((p) => p.id === selectedPreset);
      const basePrompt = preset?.promptTemplate ?? "";
      onCustomPromptChange(basePrompt + brand.modifier);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preset grid grouped by category */}
      <div className="space-y-3">
        <label className="block text-xs font-medium text-gray-400">
          Movimiento
        </label>
        {PRESET_GROUPS.map((group) => {
          const groupPresets = PRODUCT_PRESETS.filter((p) =>
            group.ids.includes(p.id)
          );
          if (groupPresets.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {groupPresets.map((preset) => {
                  const Icon = PRESET_ICONS[preset.icon] ?? Sparkles;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetChange(preset.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
                        selectedPreset === preset.id
                          ? "border-accent bg-accent/10"
                          : "border-surface-lighter bg-surface-light hover:border-surface-hover",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 mt-0.5",
                          selectedPreset === preset.id
                            ? "text-accent-light"
                            : "text-gray-500",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-[10px] font-medium text-gray-300 leading-tight">
                          {preset.name}
                        </span>
                        <span className="mt-0.5 block text-[9px] leading-tight text-gray-500 line-clamp-2">
                          {preset.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Brand selector — shown when a fragrance preset is active */}
      {isFragrancePreset && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
            Marca de Fragancia
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FRAGRANCE_BRANDS.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleBrandSelect(brand.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all",
                  selectedBrand === brand.id
                    ? "border-purple-400 bg-purple-500/20 text-purple-300"
                    : "border-surface-lighter bg-surface-light text-gray-400 hover:border-purple-400/50 hover:text-gray-200",
                )}
              >
                {brand.label}
              </button>
            ))}
          </div>
          {selectedBrand && (
            <p className="text-[10px] text-purple-400/80">
              Estilo {FRAGRANCE_BRANDS.find((b) => b.id === selectedBrand)?.label} aplicado al prompt
            </p>
          )}
        </div>
      )}

      {/* Custom prompt */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          Prompt personalizado
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="Describe el movimiento que deseas..."
          rows={3}
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
        />
      </div>
    </div>
  );
}
