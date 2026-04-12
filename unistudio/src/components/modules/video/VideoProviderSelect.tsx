"use client";

import React from "react";
import { Select } from "@/components/ui/select";
import type { VideoProviderKey, VideoCategory } from "@/types/video";
import { VIDEO_PROVIDERS, getProvidersForCategory } from "@/lib/video/providers";

// Spanish display names for each provider
const PROVIDER_SPANISH_NAMES: Record<VideoProviderKey, string> = {
  kenburns: "Animación Gratis (sin IA)",
  "ltx-video": "Básico — Rápido y económico ($0.04)",
  "wan-2.1": "Estándar — Buena calidad ($0.04)",
  "wan-2.2-fast": "Estándar Plus — Rápido ($0.05)",
  "wan-2.5": "Avanzado — Alta calidad ($0.05/s)",
  "kling-2.6": "Premium — Calidad cinematográfica ($0.07/s)",
  "minimax-hailuo": "Ultra — Máxima calidad ($0.08/s)",
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

  const options = providers.map((p) => ({
    value: p.key,
    label: PROVIDER_SPANISH_NAMES[p.key] ?? p.name,
  }));

  // If current value isn't in this category, select first option
  const currentProvider = VIDEO_PROVIDERS[value];
  const isValid = currentProvider?.categories.includes(category);

  return (
    <Select
      label="Proveedor"
      value={isValid ? value : options[0]?.value ?? value}
      onValueChange={(v) => onChange(v as VideoProviderKey)}
      options={options}
    />
  );
}
