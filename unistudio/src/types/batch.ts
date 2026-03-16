// =============================================================================
// Batch Processing Types - UniStudio
// =============================================================================

import type { ApiProvider } from './api';

/** A single step in a processing pipeline */
export interface PipelineStep {
  id: string;
  operation: string;       // e.g. 'bg-remove', 'enhance', 'upscale', 'shadow', 'resize'
  provider: ApiProvider;
  params: Record<string, unknown>;
  enabled: boolean;
}

/** A reusable processing pipeline composed of ordered steps */
export interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
  preset: string;          // e.g. 'ecommerce-standard', 'social-media', 'custom'
}

/** Status of a batch job */
export type BatchJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

/** Result of processing a single image through the pipeline */
export interface BatchResult {
  imageId: string;
  originalUrl: string;
  processedUrl: string | null;
  stepsCompleted: number;
  cost: number;            // cost in dollars (e.g. 0.05 = five cents)
  error: string | null;
}

/** A batch processing job that runs a pipeline across multiple images */
export interface BatchJob {
  id: string;
  pipeline: Pipeline;
  images: string[];         // array of image URLs or data URLs
  status: BatchJobStatus;
  progress: number;         // 0 to 100
  results: BatchResult[];
  totalCost: number;        // accumulated cost in dollars
  createdAt: number;        // Unix timestamp
  completedAt: number | null;
}
