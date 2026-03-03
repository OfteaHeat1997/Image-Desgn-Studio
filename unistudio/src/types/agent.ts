// =============================================================================
// AI Agent Types - UniStudio
// =============================================================================

/** The 3 AI agents */
export type AgentType = 'ecommerce' | 'modelo' | 'social';

/** Modules the agent can orchestrate */
export type AgentModule =
  | 'bg-remove'
  | 'bg-generate'
  | 'enhance'
  | 'shadows'
  | 'outpaint'
  | 'upscale'
  | 'tryon'
  | 'model-create'
  | 'inpaint'
  | 'video'
  | 'ad-create'
  | 'jewelry-tryon';

/** Product categories for Unistyles inventory */
export type ProductCategory =
  | 'lingerie'
  | 'perfume'
  | 'earrings'
  | 'rings'
  | 'necklace'
  | 'bracelet'
  | 'watch'
  | 'sunglasses'
  | 'general';

/** Social content types */
export type SocialContentType =
  | 'hero'
  | 'category'
  | 'ig-reel'
  | 'tiktok'
  | 'ig-story'
  | 'product-video'
  | 'avatar';

/** Budget tiers */
export type BudgetTier = 'free' | 'economic' | 'premium';

// -----------------------------------------------------------------------------
// Pipeline Plan
// -----------------------------------------------------------------------------

export interface PipelineStep {
  id: string;
  module: AgentModule;
  label: string;
  params: Record<string, unknown>;
  estimatedCost: number;
  reasoning: string;
}

export interface AgentPlan {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
  steps: PipelineStep[];
  totalEstimatedCost: number;
  estimatedDuration: string;
}

// -----------------------------------------------------------------------------
// Pipeline Execution
// -----------------------------------------------------------------------------

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface StepExecution {
  stepId: string;
  status: StepStatus;
  resultUrl: string | null;
  error: string | null;
  actualCost: number;
  startedAt: number | null;
  completedAt: number | null;
}

export type PipelineStatus = 'idle' | 'planning' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PipelineExecution {
  planId: string;
  status: PipelineStatus;
  steps: StepExecution[];
  currentStepIndex: number;
  totalCost: number;
}

// -----------------------------------------------------------------------------
// API Request / Response
// -----------------------------------------------------------------------------

export interface AgentPlanRequest {
  agentType: AgentType;
  description: string;
  productCategory: ProductCategory;
  imageCount: number;
  contentType?: SocialContentType;
  budget?: BudgetTier;
  preferences?: {
    gender?: string;
    skinTone?: string;
    bodyType?: string;
    pose?: string;
    ageRange?: string;
  };
}

export interface AgentPlanResponse {
  success: boolean;
  data: {
    plan: AgentPlan;
    method: 'ai' | 'fallback';
  } | null;
  cost: number;
  error?: string;
}
