"use client";

import React from "react";
import { CheckCircle, ArrowRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Suggestion {
  label: string;
  module: string;
}

interface ResultBannerProps {
  /** Whether to show the banner */
  visible: boolean;
  /** Cost charged for the operation */
  cost?: number;
  /** Next-step suggestions */
  suggestions?: Suggestion[];
  /** Navigate to another module */
  onNavigate?: (module: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Default suggestions based on common workflows                       */
/* ------------------------------------------------------------------ */

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { label: "Agregar sombras", module: "shadows" },
  { label: "Extender para Instagram", module: "outpaint" },
  { label: "Crear video", module: "video" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ResultBanner({
  visible,
  cost,
  suggestions = DEFAULT_SUGGESTIONS,
  onNavigate,
}: ResultBannerProps) {
  if (!visible) return null;

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/8 p-3 space-y-2.5">
      {/* Success header */}
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
        <span className="text-xs font-semibold text-emerald-300">
          Procesado con exito
        </span>
        {cost !== undefined && cost > 0 && (
          <span className="ml-auto text-[10px] tabular-nums text-emerald-400/70">
            -${cost.toFixed(3)}
          </span>
        )}
      </div>

      {/* Suggestions */}
      {onNavigate && suggestions.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">
            Que hacer ahora
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.module}
                type="button"
                onClick={() => onNavigate(s.module)}
                className="flex items-center gap-1 rounded-md border border-surface-lighter bg-surface-light px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200 hover:border-accent/30 transition-colors"
              >
                {s.label}
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultBanner;
