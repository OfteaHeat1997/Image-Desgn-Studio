"use client";

import React from "react";
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
};

// Group presets for display
const PRESET_GROUPS = [
  { label: "General", ids: ["product-rotate", "product-zoom", "camera-orbit", "product-reveal", "product-unboxing", "product-lifestyle", "product-float", "product-splash"] },
  { label: "Perfumeria", ids: ["fragrance-spin", "fragrance-reveal"] },
  { label: "Joyeria", ids: ["jewelry-sparkle", "jewelry-float"] },
  { label: "Skincare", ids: ["skincare-texture", "skincare-splash"] },
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
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {groupPresets.map((preset) => {
                  const Icon = PRESET_ICONS[preset.icon] ?? Sparkles;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onPresetChange(preset.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
                        selectedPreset === preset.id
                          ? "border-accent bg-accent/10"
                          : "border-surface-lighter bg-surface-light hover:border-surface-hover",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedPreset === preset.id
                            ? "text-accent-light"
                            : "text-gray-500",
                        )}
                      />
                      <span className="text-[10px] font-medium text-gray-300 leading-tight">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

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
