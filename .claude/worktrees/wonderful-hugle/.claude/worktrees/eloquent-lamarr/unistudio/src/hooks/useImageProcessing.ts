'use client';

// =============================================================================
// useImageProcessing Hook - UniStudio
// Handles uploading an image and calling a processing API endpoint, with
// progress tracking and error handling.
// =============================================================================

import { useState, useCallback } from 'react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ProcessingResult {
  url: string;
  cost: number;
  [key: string]: unknown;
}

interface UseImageProcessingReturn {
  /** Call to process an image through a specific operation. */
  processImage: (
    operation: string,
    imageFile: File,
    options?: Record<string, unknown>,
  ) => Promise<ProcessingResult | null>;
  /** Whether a processing operation is currently in progress. */
  isProcessing: boolean;
  /** Current progress percentage (0-100). */
  progress: number;
  /** The result of the last successful processing operation. */
  result: ProcessingResult | null;
  /** The error message from the last failed operation, if any. */
  error: string | null;
  /** Reset state back to initial idle values. */
  reset: () => void;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

/**
 * Hook for processing images through the UniStudio API pipeline.
 *
 * Handles the two-step process:
 * 1. Upload the image to `/api/upload`
 * 2. Call the appropriate `/api/{operation}` endpoint with the uploaded URL
 *
 * @example
 * ```tsx
 * const { processImage, isProcessing, progress, result, error } = useImageProcessing();
 *
 * async function handleBgRemove(file: File) {
 *   const result = await processImage('bg-remove', file, { provider: 'replicate' });
 *   if (result) console.log('Processed image URL:', result.url);
 * }
 * ```
 */
export function useImageProcessing(): UseImageProcessingReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const processImage = useCallback(
    async (
      operation: string,
      imageFile: File,
      options: Record<string, unknown> = {},
    ): Promise<ProcessingResult | null> => {
      setIsProcessing(true);
      setProgress(0);
      setResult(null);
      setError(null);

      try {
        // Step 1: Upload the image
        setProgress(10);

        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadError = await uploadRes.json().catch(() => ({}));
          throw new Error(
            uploadError.error ?? `Upload failed with status ${uploadRes.status}`,
          );
        }

        const uploadData = await uploadRes.json();
        const imageUrl: string = uploadData.url;

        setProgress(30);

        // Step 2: Call the processing endpoint
        const processRes = await fetch(`/api/${operation}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl,
            ...options,
          }),
        });

        setProgress(70);

        if (!processRes.ok) {
          const processError = await processRes.json().catch(() => ({}));
          throw new Error(
            processError.error ??
              `Processing failed with status ${processRes.status}`,
          );
        }

        const processData = await processRes.json();

        setProgress(100);

        const processingResult: ProcessingResult = {
          url: processData.url ?? processData.outputUrl ?? '',
          cost: processData.cost ?? 0,
          ...processData,
        };

        setResult(processingResult);
        setIsProcessing(false);

        return processingResult;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
        setIsProcessing(false);
        setProgress(0);
        return null;
      }
    },
    [],
  );

  return {
    processImage,
    isProcessing,
    progress,
    result,
    error,
    reset,
  };
}
