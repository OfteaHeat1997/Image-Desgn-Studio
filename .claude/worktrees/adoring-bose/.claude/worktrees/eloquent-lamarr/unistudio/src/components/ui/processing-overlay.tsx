"use client";

import React from "react";
import { Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ProcessingOverlayProps {
  /** Whether to show the overlay */
  visible: boolean;
  /** Current step description in Spanish */
  statusText?: string;
  /** Progress percentage 0-100 */
  progress?: number;
  /** Optional cancel handler */
  onCancel?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ProcessingOverlay({
  visible,
  statusText,
  progress,
  onCancel,
}: ProcessingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3">
      {/* Spinner + status */}
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent-light shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-200">
            {statusText || "Procesando con IA..."}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            No cierres esta ventana
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {progress !== undefined && progress > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lighter">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-right text-[9px] tabular-nums text-gray-500">
            {Math.round(progress)}%
          </p>
        </div>
      )}

      {/* Cancel */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-md border border-surface-lighter bg-surface-light px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:text-gray-300 hover:bg-surface-hover transition-colors"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}

export default ProcessingOverlay;
