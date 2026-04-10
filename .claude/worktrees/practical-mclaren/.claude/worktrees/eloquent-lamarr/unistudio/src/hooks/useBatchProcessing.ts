'use client';

// =============================================================================
// useBatchProcessing Hook - UniStudio
// Manages batch processing of multiple images through a pipeline.
// =============================================================================

import { useState, useCallback, useRef } from 'react';
import type { Pipeline, BatchJob, BatchResult } from '@/types/batch';
import { nanoid } from 'nanoid';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface BatchProgress {
  /** Total number of images in the batch. */
  totalImages: number;
  /** Number of images that have been processed so far. */
  completedImages: number;
  /** Index of the current pipeline step for the current image (0-based). */
  currentStep: number;
  /** Total number of steps in the pipeline. */
  totalSteps: number;
  /** Overall progress as a percentage (0-100). */
  percent: number;
}

interface UseBatchProcessingReturn {
  /** All batch jobs (current and historical). */
  jobs: BatchJob[];
  /** Start processing a batch of files through a pipeline. */
  startBatch: (files: File[], pipeline: Pipeline) => Promise<void>;
  /** Cancel the currently running batch. */
  cancelBatch: () => void;
  /** Current batch progress info. */
  progress: BatchProgress;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

/**
 * Hook for batch-processing multiple images through a pipeline of steps.
 *
 * Processes files sequentially, calling `/api/upload` then each pipeline step
 * in order for every image.
 *
 * @example
 * ```tsx
 * const { startBatch, cancelBatch, progress, jobs } = useBatchProcessing();
 *
 * async function handleBatch(files: File[]) {
 *   await startBatch(files, myPipeline);
 * }
 * ```
 */
export function useBatchProcessing(): UseBatchProcessingReturn {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [progress, setProgress] = useState<BatchProgress>({
    totalImages: 0,
    completedImages: 0,
    currentStep: 0,
    totalSteps: 0,
    percent: 0,
  });

  const cancelledRef = useRef(false);

  const cancelBatch = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const startBatch = useCallback(
    async (files: File[], pipeline: Pipeline) => {
      cancelledRef.current = false;

      const enabledSteps = pipeline.steps.filter((s) => s.enabled);
      const totalImages = files.length;
      const totalSteps = enabledSteps.length;

      // Create the batch job
      const batchJob: BatchJob = {
        id: nanoid(),
        pipeline,
        images: [],
        status: 'processing',
        progress: 0,
        results: [],
        totalCost: 0,
        createdAt: Date.now(),
        completedAt: null,
      };

      setJobs((prev) => [...prev, batchJob]);

      setProgress({
        totalImages,
        completedImages: 0,
        currentStep: 0,
        totalSteps,
        percent: 0,
      });

      const results: BatchResult[] = [];

      for (let imgIdx = 0; imgIdx < files.length; imgIdx++) {
        if (cancelledRef.current) {
          // Mark job as cancelled
          setJobs((prev) =>
            prev.map((j) =>
              j.id === batchJob.id
                ? { ...j, status: 'cancelled', completedAt: Date.now() }
                : j,
            ),
          );
          break;
        }

        const file = files[imgIdx];
        let currentUrl = '';
        let imageCost = 0;
        let stepsCompleted = 0;
        let hasError: string | null = null;

        try {
          // Upload the image
          const formData = new FormData();
          formData.append('file', file);

          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${uploadRes.status}`);
          }

          const uploadData = await uploadRes.json();
          currentUrl = uploadData.url;

          // Process through each enabled pipeline step
          for (let stepIdx = 0; stepIdx < enabledSteps.length; stepIdx++) {
            if (cancelledRef.current) break;

            const step = enabledSteps[stepIdx];

            setProgress({
              totalImages,
              completedImages: imgIdx,
              currentStep: stepIdx,
              totalSteps,
              percent: Math.round(
                ((imgIdx * totalSteps + stepIdx) / (totalImages * totalSteps)) *
                  100,
              ),
            });

            const processRes = await fetch(`/api/${step.operation}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageUrl: currentUrl,
                provider: step.provider,
                ...step.params,
              }),
            });

            if (!processRes.ok) {
              const errorData = await processRes.json().catch(() => ({}));
              throw new Error(
                errorData.error ?? `Step "${step.operation}" failed: ${processRes.status}`,
              );
            }

            const processData = await processRes.json();
            currentUrl = processData.url ?? processData.outputUrl ?? currentUrl;
            imageCost += processData.cost ?? 0;
            stepsCompleted++;
          }
        } catch (err) {
          hasError = err instanceof Error ? err.message : String(err);
        }

        const batchResult: BatchResult = {
          imageId: nanoid(),
          originalUrl: '', // Will be set by upload
          processedUrl: hasError ? null : currentUrl,
          stepsCompleted,
          cost: imageCost,
          error: hasError,
        };

        results.push(batchResult);

        // Update job in state
        setJobs((prev) =>
          prev.map((j) =>
            j.id === batchJob.id
              ? {
                  ...j,
                  results: [...results],
                  totalCost: results.reduce((sum, r) => sum + r.cost, 0),
                  progress: Math.round(((imgIdx + 1) / totalImages) * 100),
                }
              : j,
          ),
        );

        setProgress({
          totalImages,
          completedImages: imgIdx + 1,
          currentStep: totalSteps,
          totalSteps,
          percent: Math.round(((imgIdx + 1) / totalImages) * 100),
        });
      }

      // Mark job as completed
      if (!cancelledRef.current) {
        const hasFailed = results.some((r) => r.error !== null);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === batchJob.id
              ? {
                  ...j,
                  status: hasFailed ? 'failed' : 'completed',
                  progress: 100,
                  completedAt: Date.now(),
                }
              : j,
          ),
        );
      }
    },
    [],
  );

  return {
    jobs,
    startBatch,
    cancelBatch,
    progress,
  };
}
