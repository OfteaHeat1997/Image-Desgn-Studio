"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import type { VideoProviderKey, VideoCategory } from "@/types/video";
import { VIDEO_PROVIDERS, getProvidersForCategory } from "@/lib/video/providers";

// Spanish display name + description for each provider
const PROVIDER_INFO: Record<VideoProviderKey, { name: string; desc: string }> = {
  kenburns: {
    name: "Animación Gratis (sin IA)",
    desc: "Solo zoom y paneo básico. No genera movimiento real. Para previews rápidos.",
  },
  "ltx-video": {
    name: "Básico — $0.04",
    desc: "Movimiento básico, puede verse artificial. Para probar ideas antes de invertir.",
  },
  "wan-2.1": {
    name: "Estándar — $0.04",
    desc: "Buena calidad general. Funciona bien para la mayoría de productos.",
  },
  "wan-2.2-fast": {
    name: "Estándar Plus — $0.05",
    desc: "Rápido y confiable. Mejor relación calidad-precio para catálogo.",
  },
  "wan-2.5": {
    name: "Avanzado — $0.05/s",
    desc: "Alta calidad de movimiento. Para productos donde el detalle importa.",
  },
  "kling-2.6": {
    name: "Premium — $0.07/s",
    desc: "Calidad cinematográfica. Para hero sections y contenido destacado.",
  },
  "minimax-hailuo": {
    name: "Ultra — $0.08/s",
    desc: "La mejor calidad disponible. Para videos de campaña y anuncios premium.",
  },
};

interface VideoProviderSelectProps {
  category: VideoCategory;
  value: VideoProviderKey;
  onChange: (provider: VideoProviderKey) => void;
  duration: number;
}

export function VideoProviderSelect({
  category,
  value,
  onChange,
}: VideoProviderSelectProps) {
  const providers = getProvidersForCategory(category);

  // If current value isn't valid for this category, fall back to first
  const currentProvider = VIDEO_PROVIDERS[value];
  const isValid = currentProvider?.categories.includes(category);
  const activeValue: VideoProviderKey = isValid ? value : (providers[0]?.key ?? value);

  return (
    <div className="w-full space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">Proveedor</label>
      <div className="space-y-1">
        {providers.map((p) => {
          const info = PROVIDER_INFO[p.key];
          const isSelected = activeValue === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.key)}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left transition-all",
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover hover:bg-surface-lighter/50",
              )}
            >
              <span
                className={cn(
                  "block text-[11px] font-semibold leading-tight",
                  isSelected ? "text-accent-light" : "text-gray-200",
                )}
              >
                {info?.name ?? p.name}
              </span>
              {info?.desc && (
                <span className="mt-0.5 block text-[10px] leading-tight text-gray-500">
                  {info.desc}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
