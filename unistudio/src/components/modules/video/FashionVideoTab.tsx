"use client";

import React from "react";
import {
  Footprints,
  User,
  BookOpen,
  Scan,
  MapPin,
  Heart,
  RefreshCw,
  Upload,
  Info,
  Wind,
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
  RefreshCw,
  Wind,
};

interface FashionVideoTabProps {
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  backImageFile?: File | null;
  onBackImageUpload?: (file: File) => void;
}

export function FashionVideoTab({
  selectedPreset,
  onPresetChange,
  customPrompt,
  onCustomPromptChange,
  backImageFile,
  onBackImageUpload,
}: FashionVideoTabProps) {
  const isLingerie360 = selectedPreset === "lingerie-360";

  const handleBackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onBackImageUpload) onBackImageUpload(file);
  };

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
                <span className="text-[10px] font-medium text-gray-300 leading-tight">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lingerie 360 — visual instruction panel */}
      {isLingerie360 && (
        <div className="bg-amber-50/10 border border-amber-500/30 rounded-lg p-3 mt-2">
          <p className="text-amber-300 text-xs font-medium mb-2">
            Cómo preparar las fotos:
          </p>
          <div className="flex gap-4 mb-2">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/10 rounded-lg flex items-center justify-center text-2xl border border-amber-500/20">
                👕
              </div>
              <p className="text-[10px] text-amber-400 mt-1">Foto 1: Frente</p>
            </div>
            <div className="text-center text-amber-500/60 self-center text-xl">→</div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/10 rounded-lg flex items-center justify-center text-2xl border border-amber-500/20">
                👔
              </div>
              <p className="text-[10px] text-amber-400 mt-1">Foto 2: Espalda</p>
            </div>
          </div>
          <p className="text-[10px] text-amber-400/70">
            Ambas fotos en fondo blanco, misma distancia y ángulo
          </p>
        </div>
      )}

      {/* Lingerie 360 — back image upload */}
      {isLingerie360 && (
        <div className="space-y-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-3">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-accent" />
            <span className="text-[11px] font-semibold text-accent">
              Frente + Espalda
            </span>
          </div>
          <p className="text-[10px] text-gray-400">
            Sube la imagen de la <span className="text-gray-200 font-medium">espalda</span> de la prenda. La imagen frontal se toma del canvas principal.
          </p>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-accent/40 bg-surface-light p-3 transition-colors hover:border-accent/70">
            <Upload className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-400">
              {backImageFile ? backImageFile.name : "Subir imagen de espalda"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleBackFileChange}
              className="hidden"
            />
          </label>

          <div className="flex items-start gap-1.5">
            <Info className="h-3 w-3 shrink-0 text-gray-500 mt-0.5" />
            <p className="text-[10px] text-gray-500">
              El video usara ambas imagenes con una transicion suave: frente (2s) → espalda (2s). Recomendado: Kling 2.6 para mejor calidad.
            </p>
          </div>
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
          placeholder="Describe el estilo del video de moda..."
          rows={3}
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
        />
      </div>
    </div>
  );
}
