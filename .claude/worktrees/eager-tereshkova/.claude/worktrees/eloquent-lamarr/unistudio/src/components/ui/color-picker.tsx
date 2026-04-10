"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ColorPickerProps {
  /** Current hex colour value (e.g. "#ec4899") */
  value?: string;
  /** Called when the colour changes */
  onChange?: (hex: string) => void;
  /** Label text above the picker */
  label?: string;
  /** Custom preset swatches (defaults to built-in set) */
  presets?: string[];
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_PRESETS = [
  "#ffffff",
  "#f5f5f5",
  "#000000",
  "#fdf2f8",
  "#eff6ff",
  "#f0fdf4",
  "#fefce8",
];

const HEX_REGEX = /^#?([0-9a-fA-F]{0,6})$/;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ColorPicker({
  value = "#ffffff",
  onChange,
  label,
  presets = DEFAULT_PRESETS,
  className,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(() =>
    value.startsWith("#") ? value.slice(1) : value,
  );

  /** Normalise a raw string to a # prefixed hex or return null */
  const normalise = (raw: string): string | null => {
    const clean = raw.replace(/^#/, "").toLowerCase();
    if (/^[0-9a-f]{6}$/.test(clean)) return `#${clean}`;
    if (/^[0-9a-f]{3}$/.test(clean)) {
      const expanded = clean
        .split("")
        .map((c) => c + c)
        .join("");
      return `#${expanded}`;
    }
    return null;
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (!HEX_REGEX.test(raw)) return; // ignore invalid chars
      setInputValue(raw.replace(/^#/, ""));
      const hex = normalise(raw);
      if (hex) onChange?.(hex);
    },
    [onChange],
  );

  const handlePresetClick = useCallback(
    (hex: string) => {
      setInputValue(hex.replace(/^#/, ""));
      onChange?.(hex);
    },
    [onChange],
  );

  const previewColour = normalise(inputValue) ?? value;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}

      {/* Preset swatches */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {presets.map((colour) => (
          <button
            key={colour}
            type="button"
            onClick={() => handlePresetClick(colour)}
            className={cn(
              "h-7 w-7 rounded-md border-2 transition-all",
              previewColour.toLowerCase() === colour.toLowerCase()
                ? "border-accent scale-110"
                : "border-surface-lighter hover:border-surface-hover",
            )}
            style={{ backgroundColor: colour }}
            title={colour}
            aria-label={`Select colour ${colour}`}
          />
        ))}
      </div>

      {/* Hex input with preview swatch */}
      <div className="flex items-center gap-2">
        {/* Preview swatch */}
        <div
          className="h-9 w-9 shrink-0 rounded-lg border border-surface-lighter"
          style={{ backgroundColor: previewColour }}
        />

        {/* Input */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            #
          </span>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            maxLength={6}
            className={cn(
              "h-9 w-full rounded-lg border border-surface-lighter bg-surface-light pl-7 pr-3 text-sm text-gray-200",
              "placeholder:text-gray-500",
              "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
              "transition-colors",
            )}
            placeholder="ffffff"
          />
        </div>
      </div>
    </div>
  );
}

export default ColorPicker;
