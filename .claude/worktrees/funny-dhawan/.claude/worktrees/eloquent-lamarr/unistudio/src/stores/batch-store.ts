// =============================================================================
// Batch Processing Store - UniStudio
// Manages batch jobs, pipelines, and pipeline presets.
// =============================================================================

import { create } from 'zustand';
import type {
  BatchJob,
  BatchJobStatus,
  BatchResult,
  Pipeline,
  PipelineStep,
} from '@/types/batch';

// -----------------------------------------------------------------------------
// Built-in Pipeline Presets
// -----------------------------------------------------------------------------

const PIPELINE_PRESETS: Pipeline[] = [
  {
    id: 'preset-ecommerce',
    name: 'E-Commerce Standard',
    steps: [],
    preset: 'ecommerce-standard',
  },
  {
    id: 'preset-social',
    name: 'Social Media Ready',
    steps: [],
    preset: 'social-media',
  },
  {
    id: 'preset-marketplace',
    name: 'Marketplace Listing',
    steps: [],
    preset: 'marketplace-listing',
  },
];

// -----------------------------------------------------------------------------
// State & Actions Interface
// -----------------------------------------------------------------------------

interface BatchStoreState {
  // State
  jobs: BatchJob[];
  currentPipeline: Pipeline | null;
  pipelinePresets: Pipeline[];

  // Job actions
  addJob: (job: BatchJob) => void;
  updateJob: (jobId: string, updates: Partial<Omit<BatchJob, 'id'>>) => void;
  updateJobStatus: (jobId: string, status: BatchJobStatus) => void;
  updateJobProgress: (jobId: string, progress: number) => void;
  addJobResult: (jobId: string, result: BatchResult) => void;
  removeJob: (jobId: string) => void;
  clearCompletedJobs: () => void;

  // Pipeline actions
  setPipeline: (pipeline: Pipeline | null) => void;
  addStep: (step: PipelineStep) => void;
  removeStep: (stepId: string) => void;
  updateStep: (stepId: string, updates: Partial<Omit<PipelineStep, 'id'>>) => void;
  toggleStep: (stepId: string) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;

  // Preset actions
  savePipelineAsPreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  removePreset: (presetId: string) => void;
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useBatchStore = create<BatchStoreState>()((set, get) => ({
  // -- Initial state ----------------------------------------------------------
  jobs: [],
  currentPipeline: null,
  pipelinePresets: PIPELINE_PRESETS,

  // -- Job actions ------------------------------------------------------------

  addJob: (job) => {
    set((state) => ({
      jobs: [...state.jobs, job],
    }));
  },

  updateJob: (jobId, updates) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, ...updates } : j
      ),
    }));
  },

  updateJobStatus: (jobId, status) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status,
              completedAt:
                status === 'completed' || status === 'failed'
                  ? Date.now()
                  : j.completedAt,
            }
          : j
      ),
    }));
  },

  updateJobProgress: (jobId, progress) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, progress: Math.max(0, Math.min(100, progress)) } : j
      ),
    }));
  },

  addJobResult: (jobId, result) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              results: [...j.results, result],
              totalCost: j.totalCost + result.cost,
            }
          : j
      ),
    }));
  },

  removeJob: (jobId) => {
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== jobId),
    }));
  },

  clearCompletedJobs: () => {
    set((state) => ({
      jobs: state.jobs.filter(
        (j) => j.status !== 'completed' && j.status !== 'failed' && j.status !== 'cancelled'
      ),
    }));
  },

  // -- Pipeline actions -------------------------------------------------------

  setPipeline: (pipeline) => {
    set({ currentPipeline: pipeline });
  },

  addStep: (step) => {
    const { currentPipeline } = get();
    if (!currentPipeline) return;
    set({
      currentPipeline: {
        ...currentPipeline,
        steps: [...currentPipeline.steps, step],
      },
    });
  },

  removeStep: (stepId) => {
    const { currentPipeline } = get();
    if (!currentPipeline) return;
    set({
      currentPipeline: {
        ...currentPipeline,
        steps: currentPipeline.steps.filter((s) => s.id !== stepId),
      },
    });
  },

  updateStep: (stepId, updates) => {
    const { currentPipeline } = get();
    if (!currentPipeline) return;
    set({
      currentPipeline: {
        ...currentPipeline,
        steps: currentPipeline.steps.map((s) =>
          s.id === stepId ? { ...s, ...updates } : s
        ),
      },
    });
  },

  toggleStep: (stepId) => {
    const { currentPipeline } = get();
    if (!currentPipeline) return;
    set({
      currentPipeline: {
        ...currentPipeline,
        steps: currentPipeline.steps.map((s) =>
          s.id === stepId ? { ...s, enabled: !s.enabled } : s
        ),
      },
    });
  },

  reorderSteps: (fromIndex, toIndex) => {
    const { currentPipeline } = get();
    if (!currentPipeline) return;

    const steps = [...currentPipeline.steps];
    if (
      fromIndex < 0 ||
      fromIndex >= steps.length ||
      toIndex < 0 ||
      toIndex >= steps.length
    ) {
      return;
    }

    const [moved] = steps.splice(fromIndex, 1);
    steps.splice(toIndex, 0, moved);

    set({
      currentPipeline: {
        ...currentPipeline,
        steps,
      },
    });
  },

  // -- Preset actions ---------------------------------------------------------

  savePipelineAsPreset: (name) => {
    const { currentPipeline, pipelinePresets } = get();
    if (!currentPipeline) return;

    const preset: Pipeline = {
      ...currentPipeline,
      id: `preset-${Date.now()}`,
      name,
      preset: 'custom',
    };

    set({
      pipelinePresets: [...pipelinePresets, preset],
    });
  },

  loadPreset: (presetId) => {
    const { pipelinePresets } = get();
    const preset = pipelinePresets.find((p) => p.id === presetId);
    if (!preset) return;

    // Create a new pipeline instance from the preset
    set({
      currentPipeline: {
        ...preset,
        id: `pipeline-${Date.now()}`,
        steps: preset.steps.map((s) => ({ ...s })),
      },
    });
  },

  removePreset: (presetId) => {
    set((state) => ({
      pipelinePresets: state.pipelinePresets.filter((p) => p.id !== presetId),
    }));
  },
}));
