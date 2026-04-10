"use client";

import React from "react";

interface ErrorCardProps {
  message: string | null;
  onDismiss: () => void;
}

/**
 * Shared error display card used across all module panels.
 * Replaces the identical error UI copy-pasted in 10+ panels.
 */
export function ErrorCard({ message, onDismiss }: ErrorCardProps) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
      <span className="text-red-400 text-xs shrink-0">Error:</span>
      <p className="text-xs text-red-300">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto text-red-400 hover:text-red-300 text-xs shrink-0"
      >
        &times;
      </button>
    </div>
  );
}
