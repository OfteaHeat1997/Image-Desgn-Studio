"use client";

import React from "react";
import * as RadixSlider from "@radix-ui/react-slider";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SliderProps {
  /** Current value (controlled) */
  value?: number[];
  /** Default value (uncontrolled) */
  defaultValue?: number[];
  /** Called when value changes */
  onValueChange?: (value: number[]) => void;
  /** Called when user finishes dragging */
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Label text displayed above the slider */
  label?: string;
  /** Show numeric value next to label */
  showValue?: boolean;
  /** Format function for displayed value */
  formatValue?: (value: number) => string;
  /** Show min/max labels below the track */
  showMinMax?: boolean;
  disabled?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Slider({
  value,
  defaultValue = [50],
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  formatValue,
  showMinMax = false,
  disabled = false,
  className,
}: SliderProps) {
  const displayValue = value ?? defaultValue;
  const formatted = formatValue
    ? formatValue(displayValue[0])
    : String(displayValue[0]);

  return (
    <div className={cn("w-full", className)}>
      {/* Label row */}
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between">
          {label && (
            <label className="text-sm font-medium text-gray-300">{label}</label>
          )}
          {showValue && (
            <span className="text-sm tabular-nums text-gray-400">{formatted}</span>
          )}
        </div>
      )}

      {/* Slider */}
      <RadixSlider.Root
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          disabled && "pointer-events-none opacity-50",
        )}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      >
        <RadixSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-light">
          <RadixSlider.Range className="absolute h-full rounded-full bg-accent" />
        </RadixSlider.Track>

        <RadixSlider.Thumb
          className={cn(
            "block h-4 w-4 rounded-full border-2 border-accent bg-surface",
            "shadow-md transition-colors",
            "hover:bg-surface-light",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          )}
          aria-label={label}
        />
      </RadixSlider.Root>

      {/* Min/Max labels */}
      {showMinMax && (
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {formatValue ? formatValue(min) : min}
          </span>
          <span className="text-xs text-gray-500">
            {formatValue ? formatValue(max) : max}
          </span>
        </div>
      )}
    </div>
  );
}

export default Slider;
