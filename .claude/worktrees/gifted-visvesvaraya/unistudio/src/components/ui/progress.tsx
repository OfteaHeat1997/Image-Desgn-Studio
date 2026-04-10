"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProgressProps {
  /** Progress value 0-100 */
  value: number;
  /** Label text shown above the bar */
  label?: string;
  /** Show the percentage number */
  showPercentage?: boolean;
  /** Height of the progress track */
  size?: "sm" | "md" | "lg";
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Style maps                                                         */
/* ------------------------------------------------------------------ */

const trackSizes: Record<string, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Progress({
  value,
  label,
  showPercentage = true,
  size = "md",
  className,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      {/* Label row */}
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-gray-300">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm tabular-nums text-gray-400">
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-surface-light",
          trackSizes[size],
        )}
      >
        {/* Fill */}
        <div
          className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default Progress;
