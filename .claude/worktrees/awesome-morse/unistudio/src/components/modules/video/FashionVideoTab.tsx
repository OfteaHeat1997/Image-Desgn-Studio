"use client";

import React from "react";
import {
  Footprints,
  User,
  BookOpen,
  Scan,
  MapPin,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { FASHION_PRESETS } from "@/lib/video/presets";

const PRESET_ICONS: Record<string, React.ElementType> = {
  Footprints,
  User,
  BookOpen,
  Scan,
  MapPin,
  Heart,
};

interface FashionVideoTabProps {
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
}

export function FashionVideoTab({
  selectedPreset,
  onPresetChange,
  customPrompt,
  onCustomPromptChange,
}: FashionVideoTabProps) {
  return (
    <div className="space-y-4">
      {/* Preset grid */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Estilo de Moda
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {FASHION_PRESETS.map((preset) => {
            const Icon = PRESET_ICONS[preset.icon] ?? Footprints;
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
                    selectedPreset === preset.id ? "text-accent-light" : "text-gray-500",
                  )}
                />
                <span className="text-[10px] font-medium text-gray-300">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom prompt */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          Prompt personalizado
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="Describe el estilo del video de moda..."
          rows={3}
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
        />
      </div>
    </div>
  );
}
