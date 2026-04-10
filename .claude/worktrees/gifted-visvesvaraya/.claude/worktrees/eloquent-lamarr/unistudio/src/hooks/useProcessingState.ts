// =============================================================================
// useProcessingState — shared hook for all module panels
// Replaces the identical isProcessing/errorMsg/statusText pattern in 11+ panels
// =============================================================================

"use client";

import { useState, useCallback } from "react";

interface ProcessingState {
  /** Whether a processing operation is running */
  isProcessing: boolean;
  /** Error message to display, or null */
  errorMsg: string | null;
  /** Status text for progress display */
  statusText: string;
  /** Clear the error message */
  clearError: () => void;
  /** Set error manually */
  setError: (msg: string) => void;
  /**
   * Run an async processing function with automatic state management.
   * Sets isProcessing=true, clears errors, calls your function,
   * and handles errors + cleanup automatically.
   *
   * Usage:
   *   await run(async (setStatus) => {
   *     setStatus("Subiendo imagen...");
   *     const url = await uploadImage(file);
   *     setStatus("Procesando...");
   *     const result = await processImage(url);
   *     onProcess(result);
   *   });
   */
  run: (fn: (setStatus: (status: string) => void) => Promise<void>) => Promise<void>;
}

export function useProcessingState(): ProcessingState {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const clearError = useCallback(() => setErrorMsg(null), []);
  const setError = useCallback((msg: string) => setErrorMsg(msg), []);

  const run = useCallback(
    async (fn: (setStatus: (status: string) => void) => Promise<void>) => {
      setIsProcessing(true);
      setErrorMsg(null);
      setStatusText("Iniciando...");

      try {
        await fn(setStatusText);
      } catch (error) {
        console.error("Processing error:", error);
        setErrorMsg(
          error instanceof Error ? error.message : "Error desconocido al procesar.",
        );
      } finally {
        setIsProcessing(false);
        // Clear status text after a short delay
        setTimeout(() => setStatusText(""), 3000);
      }
    },
    [],
  );

  return { isProcessing, errorMsg, statusText, clearError, setError, run };
}
