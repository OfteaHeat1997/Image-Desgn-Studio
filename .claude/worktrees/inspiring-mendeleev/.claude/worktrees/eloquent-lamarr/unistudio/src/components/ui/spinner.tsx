"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Optional label text displayed below the spinner */
  label?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Style maps                                                         */
/* ------------------------------------------------------------------ */

const sizeStyles: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-3",
};

const labelSizes: Record<SpinnerSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Spinner({ size = "md", label, className }: SpinnerProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2", className)}
      role="status"
      aria-label={label ?? "Loading"}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-accent border-t-transparent",
          sizeStyles[size],
        )}
      />
      {label && (
        <span className={cn("text-gray-400", labelSizes[size])}>{label}</span>
      )}
    </div>
  );
}

export default Spinner;
