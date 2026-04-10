// =============================================================================
// Batch Queue - UniStudio
// Simple in-memory queue for batch processing jobs.
// No external dependencies like Redis - suitable for MVP / single-process.
// =============================================================================

import type { BatchJob, BatchJobStatus, BatchResult } from '@/types/batch';
import { nanoid } from 'nanoid';
import { API_COSTS } from '@/lib/utils/constants';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface QueueProgressEvent {
  jobId: string;
  imageIndex: number;
  totalImages: number;
  stepIndex: number;
  totalSteps: number;
  status: BatchJobStatus;
  error?: string;
  result?: BatchResult;
}

// -----------------------------------------------------------------------------
// BatchQueue Class
// -----------------------------------------------------------------------------

/**
 * A simple in-memory batch processing queue.
 *
 * Jobs are added to a FIFO queue and processed one at a time. The `processQueue`
 * method is an async generator that yields progress events as images are processed.
 *
 * This is suitable for single-process / MVP deployments. For production, replace
 * with a Redis-backed queue or similar distributed job system.
 *
 * @example
 * ```ts
 * const queue = new BatchQueue();
 *
 * queue.addToQueue(myBatchJob);
 *
 * for await (const event of queue.processQueue()) {
 *   console.log(`Job ${event.jobId}: image ${event.imageIndex + 1}/${event.totalImages}`);
 * }
 * ```
 */
export class BatchQueue {
  private queue: BatchJob[] = [];
  private processing: BatchJob | null = null;
  private completed: BatchJob[] = [];
  private failed: BatchJob[] = [];

  /**
   * Add a batch job to the end of the queue.
   *
   * @param job - The batch job to enqueue.
   */
  addToQueue(job: BatchJob): void {
    const queuedJob: BatchJob = {
      ...job,
      status: 'queued',
      progress: 0,
      results: [],
      totalCost: 0,
    };
    this.queue.push(queuedJob);
  }

  /**
   * Process all queued jobs, yielding progress events as an async generator.
   *
   * Jobs are processed in FIFO order. For each job, images are processed
   * sequentially through the pipeline steps. A `QueueProgressEvent` is
   * yielded after each image is processed (or fails).
   */
  async *processQueue(): AsyncGenerator<QueueProgressEvent> {
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.processing = { ...job, status: 'processing' };

      const pipeline = job.pipeline;
      const enabledSteps = pipeline.steps.filter((s) => s.enabled);
      const totalImages = job.images.length;
      const totalSteps = enabledSteps.length;

      const results: BatchResult[] = [];
      let jobFailed = false;

      for (let imgIdx = 0; imgIdx < totalImages; imgIdx++) {
        let currentUrl = job.images[imgIdx];
        let imageCost = 0;
        let stepsCompleted = 0;
        let imageError: string | null = null;

        for (let stepIdx = 0; stepIdx < enabledSteps.length; stepIdx++) {
          const step = enabledSteps[stepIdx];

          try {
            const response = await fetch(`/api/${step.operation}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageUrl: currentUrl,
                provider: step.provider,
                ...step.params,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                (errorData as Record<string, string>).error ??
                  `Step "${step.operation}" failed (${response.status})`,
              );
            }

            const data = await response.json();
            currentUrl = data.url ?? data.outputUrl ?? currentUrl;

            // Calculate step cost
            const model = (step.params as Record<string, unknown>).model as string | undefined;
            const key1 = model ? `${step.operation}:${model}` : null;
            const key2 = `${step.operation}:${step.provider}`;
            const stepCost = data.cost ?? (key1 ? API_COSTS[key1] : undefined) ?? API_COSTS[key2] ?? 0;
            imageCost += stepCost;
            stepsCompleted++;
          } catch (err) {
            imageError = err instanceof Error ? err.message : String(err);
            break;
          }
        }

        const batchResult: BatchResult = {
          imageId: nanoid(),
          originalUrl: job.images[imgIdx],
          processedUrl: imageError ? null : currentUrl,
          stepsCompleted,
          cost: imageCost,
          error: imageError,
        };

        results.push(batchResult);

        if (imageError) {
          jobFailed = true;
        }

        // Update processing job state
        this.processing = {
          ...this.processing!,
          results: [...results],
          totalCost: results.reduce((sum, r) => sum + r.cost, 0),
          progress: Math.round(((imgIdx + 1) / totalImages) * 100),
        };

        // Yield a progress event
        yield {
          jobId: job.id,
          imageIndex: imgIdx,
          totalImages,
          stepIndex: stepsCompleted,
          totalSteps,
          status: imageError ? 'failed' : 'processing',
          error: imageError ?? undefined,
          result: batchResult,
        };
      }

      // Finalize the job
      const finalJob: BatchJob = {
        ...this.processing!,
        status: jobFailed ? 'failed' : 'completed',
        progress: 100,
        completedAt: Date.now(),
      };

      if (jobFailed) {
        this.failed.push(finalJob);
      } else {
        this.completed.push(finalJob);
      }

      this.processing = null;

      // Yield final event for the job
      yield {
        jobId: job.id,
        imageIndex: totalImages - 1,
        totalImages,
        stepIndex: totalSteps,
        totalSteps,
        status: jobFailed ? 'failed' : 'completed',
      };
    }
  }

  /**
   * Get the current queue status counts.
   *
   * @returns An object with counts for pending, processing, completed, and failed jobs.
   */
  getQueueStatus(): QueueStatus {
    return {
      pending: this.queue.length,
      processing: this.processing ? 1 : 0,
      completed: this.completed.length,
      failed: this.failed.length,
    };
  }
}
