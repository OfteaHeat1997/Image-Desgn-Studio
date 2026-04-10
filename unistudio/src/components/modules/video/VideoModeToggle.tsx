"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import type { VideoMode } from "@/types/video";

interface VideoModeToggleProps {
  mode: VideoMode;
  onModeChange: (mode: VideoMode) => void;
}

export function VideoModeToggle({ mode, onModeChange }: VideoModeToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-light p-1">
      <button
        type="button"
        onClick={() => onModeChange("manual")}
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
          mode === "manual"
            ? "bg-accent/15 text-accent-light shadow-sm"
            : "text-gray-400 hover:text-gray-200",
        )}
      >
        Manual
      </button>
      <button
        type="button"
        onClick={() => onModeChange("auto")}
        className={cn(
          "relative flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
          mode === "auto"
            ? "bg-accent/15 text-accent-light shadow-sm"
            : "text-gray-400 hover:text-gray-200",
        )}
      >
        Auto
        <span
          className={cn(
            "ml-1 inline-flex items-center rounded-sm px-1 py-px text-[10px] font-bold leading-none",
            mode === "auto"
              ? "bg-accent/25 text-accent"
              : "bg-gray-600/30 text-gray-500",
          )}
        >
          IA
        </span>
      </button>
    </div>
  );
}
