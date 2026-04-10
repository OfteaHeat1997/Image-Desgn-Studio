// =============================================================================
// AI Agent Types - UniStudio
// =============================================================================

/** The 4 AI agents */
export type AgentType = 'ecommerce' | 'modelo' | 'social' | 'catalogo';

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
  | 'jewelry-tryon'
  | 'ghost-mannequin'
  | 'infographic';

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
// Image Analysis (pre-planning intelligence)
// -----------------------------------------------------------------------------

export interface ImageAnalysis {
  /** Basic metadata */
  width: number;
  height: number;
  format: string;
  fileSize: number;
  aspectRatio: string;

  /** Content analysis */
  isLowResolution: boolean;
  needsUpscale: boolean;
  backgroundType: 'white' | 'solid-color' | 'complex' | 'transparent' | 'unknown';
  hasWatermark: boolean;
  hasText: boolean;
  lightingQuality: 'good' | 'dark' | 'overexposed' | 'uneven';
  colorBalance: 'good' | 'warm' | 'cool' | 'oversaturated' | 'desaturated';

  /** Recommendations for the agent */
  suggestedSteps: AgentModule[];
  warnings: string[];
  minBudgetNeeded: BudgetTier;
}

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
  inputUrl: string | null;
  resultUrl: string | null;
  error: string | null;
  actualCost: number;
  startedAt: number | null;
  completedAt: number | null;
}

export type PipelineStatus = 'idle' | 'planning' | 'running' | 'completed' | 'failed' | 'cancelled';

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
  /** Image analysis results — informs smarter planning */
  imageAnalysis?: ImageAnalysis;
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
