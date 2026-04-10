"use client";

import React from "react";
import { Select } from "@/components/ui/select";
import type { VideoProviderKey, VideoCategory } from "@/types/video";
import { VIDEO_PROVIDERS, getProvidersForCategory, getProviderCost } from "@/lib/video/providers";
import { formatCost } from "@/lib/video/cost";

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
  duration,
}: VideoProviderSelectProps) {
  const providers = getProvidersForCategory(category);

  const options = providers.map((p) => {
    const cost = getProviderCost(p, duration);
    const costStr = formatCost(cost);
    const qualityLabel =
      p.quality === "draft"
        ? "borrador"
        : p.quality === "standard"
          ? "standard"
          : "premium";
    return {
      value: p.key,
      label: `${p.name} · ${costStr} (${qualityLabel})`,
    };
  });

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
