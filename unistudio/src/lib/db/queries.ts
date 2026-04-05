// =============================================================================
// Database Queries - UniStudio
// Typed query functions using Prisma. Single-user, no auth.
// =============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

// When prisma is null (no DATABASE_URL), all queries gracefully return empty/null.
// Each function guards with `if (!prisma)` before using `db`.
const db = prisma as NonNullable<typeof prisma>;

// -----------------------------------------------------------------------------
// Types (matching DB table shapes)
// -----------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: string;
  project_id: string;
  original_url: string;
  processed_url: string | null;
  filename: string;
  width: number;
  height: number;
  file_size: number;
  mime_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessingJobRecord {
  id: string;
  image_id: string | null;
  operation: string;
  provider: string;
  model: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input_params: Record<string, unknown>;
  output_url: string | null;
  error: string | null;
  cost: number;
  processing_time: number | null;
  created_at: string;
  updated_at: string;
}

export interface BrandKitRecord {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  logo_url: string | null;
  watermark: {
    enabled: boolean;
    position: string;
    opacity: number;
    size: number;
    imageUrl: string;
  } | null;
  default_bg_style: string | null;
  default_enhance_preset: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiModelRecord {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  gender: string;
  age_range: string;
  skin_tone: string;
  body_type: string;
  pose: string;
  preview_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PromptTemplateRecord {
  id: string;
  category: string;
  name: string;
  prompt: string;
  negative_prompt: string | null;
  preview_url: string | null;
  is_public: boolean;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Helper: convert Prisma record to snake_case interface
// -----------------------------------------------------------------------------

function toDateStr(d: Date): string {
  return d.toISOString();
}

function mapProject(r: {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Project {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    thumbnail_url: r.thumbnailUrl,
    created_at: toDateStr(r.createdAt),
    updated_at: toDateStr(r.updatedAt),
  };
}

function mapImage(r: {
  id: string;
  projectId: string;
  originalUrl: string;
  processedUrl: string | null;
  filename: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): Image {
  return {
    id: r.id,
    project_id: r.projectId,
    original_url: r.originalUrl,
    processed_url: r.processedUrl,
    filename: r.filename,
    width: r.width,
    height: r.height,
    file_size: r.fileSize,
    mime_type: r.mimeType,
    metadata: r.metadata as Record<string, unknown> | null,
    created_at: toDateStr(r.createdAt),
    updated_at: toDateStr(r.updatedAt),
  };
}

function mapProcessingJob(r: {
  id: string;
  imageId: string | null;
  operation: string;
  provider: string;
  model: string | null;
  status: string;
  inputParams: unknown;
  outputUrl: string | null;
  error: string | null;
  cost: number;
  processingTime: number | null;
  createdAt: Date;
  updatedAt: Date;
}): ProcessingJobRecord {
  return {
    id: r.id,
    image_id: r.imageId,
    operation: r.operation,
    provider: r.provider,
    model: r.model,
    status: r.status as ProcessingJobRecord['status'],
    input_params: r.inputParams as Record<string, unknown>,
    output_url: r.outputUrl,
    error: r.error,
    cost: r.cost,
    processing_time: r.processingTime,
    created_at: toDateStr(r.createdAt),
    updated_at: toDateStr(r.updatedAt),
  };
}

function mapBrandKit(r: {
  id: string;
  name: string;
  colors: unknown;
  fonts: unknown;
  logoUrl: string | null;
  watermark: unknown;
  defaultBgStyle: string | null;
  defaultEnhancePreset: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BrandKitRecord {
  return {
    id: r.id,
    name: r.name,
    colors: r.colors as BrandKitRecord['colors'],
    fonts: r.fonts as BrandKitRecord['fonts'],
    logo_url: r.logoUrl,
    watermark: r.watermark as BrandKitRecord['watermark'],
    default_bg_style: r.defaultBgStyle,
    default_enhance_preset: r.defaultEnhancePreset,
    created_at: toDateStr(r.createdAt),
    updated_at: toDateStr(r.updatedAt),
  };
}

function mapAiModel(r: {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  gender: string;
  ageRange: string;
  skinTone: string;
  bodyType: string;
  pose: string;
  previewUrl: string | null;
  metadata: unknown;
  createdAt: Date;
}): AiModelRecord {
  return {
    id: r.id,
    name: r.name,
    provider: r.provider,
    model_id: r.modelId,
    gender: r.gender,
    age_range: r.ageRange,
    skin_tone: r.skinTone,
    body_type: r.bodyType,
    pose: r.pose,
    preview_url: r.previewUrl,
    metadata: r.metadata as Record<string, unknown> | null,
    created_at: toDateStr(r.createdAt),
  };
}

function mapPromptTemplate(r: {
  id: string;
  category: string;
  name: string;
  prompt: string;
  negativePrompt: string | null;
  previewUrl: string | null;
  isPublic: boolean;
  createdAt: Date;
}): PromptTemplateRecord {
  return {
    id: r.id,
    category: r.category,
    name: r.name,
    prompt: r.prompt,
    negative_prompt: r.negativePrompt,
    preview_url: r.previewUrl,
    is_public: r.isPublic,
    created_at: toDateStr(r.createdAt),
  };
}

// -----------------------------------------------------------------------------
// Project Queries
// -----------------------------------------------------------------------------

export async function getProjects(): Promise<Project[]> {
  if (!prisma) return [];
  try {
    const rows = await db.project.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(mapProject);
  } catch (e) {
    console.error('[getProjects] Error:', e);
    return [];
  }
}

export async function createProject(
  name: string,
  description?: string,
): Promise<Project | null> {
  if (!prisma) return null;
  try {
    const row = await db.project.create({
      data: { name, description: description ?? null },
    });
    return mapProject(row);
  } catch (e) {
    console.error('[createProject] Error:', e);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Image Queries
// -----------------------------------------------------------------------------

export async function getImages(projectId: string): Promise<Image[]> {
  if (!prisma) return [];
  try {
    const rows = await db.image.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapImage);
  } catch (e) {
    console.error('[getImages] Error:', e);
    return [];
  }
}

export async function createImage(input: {
  projectId: string;
  originalUrl: string;
  filename: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}): Promise<Image | null> {
  if (!prisma) return null;
  try {
    const row = await db.image.create({
      data: {
        projectId: input.projectId,
        originalUrl: input.originalUrl,
        filename: input.filename,
        width: input.width,
        height: input.height,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
      },
    });
    return mapImage(row);
  } catch (e) {
    console.error('[createImage] Error:', e);
    return null;
  }
}

export async function updateImage(
  imageId: string,
  updates: Partial<Image>,
): Promise<Image | null> {
  if (!prisma) return null;
  try {
    const data: Record<string, unknown> = {};
    if (updates.processed_url !== undefined) data.processedUrl = updates.processed_url;
    if (updates.filename !== undefined) data.filename = updates.filename;
    if (updates.width !== undefined) data.width = updates.width;
    if (updates.height !== undefined) data.height = updates.height;
    if (updates.file_size !== undefined) data.fileSize = updates.file_size;
    if (updates.mime_type !== undefined) data.mimeType = updates.mime_type;
    if (updates.metadata !== undefined) data.metadata = updates.metadata;

    const row = await db.image.update({
      where: { id: imageId },
      data,
    });
    return mapImage(row);
  } catch (e) {
    console.error('[updateImage] Error:', e);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Processing Job Queries
// -----------------------------------------------------------------------------

export async function createProcessingJob(input: {
  imageId: string;
  operation: string;
  provider: string;
  model: string;
  inputParams: Record<string, unknown>;
}): Promise<ProcessingJobRecord | null> {
  if (!prisma) return null;
  try {
    const row = await db.processingJob.create({
      data: {
        imageId: input.imageId,
        operation: input.operation,
        provider: input.provider,
        model: input.model,
        status: 'pending',
        inputParams: input.inputParams as Prisma.InputJsonValue,
        cost: 0,
      },
    });
    return mapProcessingJob(row);
  } catch (e) {
    console.error('[createProcessingJob] Error:', e);
    return null;
  }
}

export async function updateProcessingJob(
  jobId: string,
  updates: {
    status?: string;
    outputUrl?: string;
    error?: string;
    cost?: number;
    processingTime?: number;
  },
): Promise<ProcessingJobRecord | null> {
  if (!prisma) return null;
  try {
    const data: Record<string, unknown> = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.outputUrl !== undefined) data.outputUrl = updates.outputUrl;
    if (updates.error !== undefined) data.error = updates.error;
    if (updates.cost !== undefined) data.cost = updates.cost;
    if (updates.processingTime !== undefined) data.processingTime = updates.processingTime;

    const row = await db.processingJob.update({
      where: { id: jobId },
      data,
    });
    return mapProcessingJob(row);
  } catch (e) {
    console.error('[updateProcessingJob] Error:', e);
    return null;
  }
}

export async function getProcessingJobs(
  limit: number = 50,
): Promise<ProcessingJobRecord[]> {
  if (!prisma) return [];
  try {
    const rows = await db.processingJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(mapProcessingJob);
  } catch (e) {
    console.error('[getProcessingJobs] Error:', e);
    return [];
  }
}

// -----------------------------------------------------------------------------
// Brand Kit Queries
// -----------------------------------------------------------------------------

export async function getBrandKit(): Promise<BrandKitRecord | null> {
  if (!prisma) return null;
  try {
    const row = await db.brandKit.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    return row ? mapBrandKit(row) : null;
  } catch (e) {
    console.error('[getBrandKit] Error:', e);
    return null;
  }
}

export async function updateBrandKit(
  updates: Partial<BrandKitRecord>,
): Promise<BrandKitRecord | null> {
  if (!prisma) return null;
  try {
    const existing = await db.brandKit.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const data: Record<string, unknown> = {};
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.colors !== undefined) data.colors = updates.colors;
      if (updates.fonts !== undefined) data.fonts = updates.fonts;
      if (updates.logo_url !== undefined) data.logoUrl = updates.logo_url;
      if (updates.watermark !== undefined) data.watermark = updates.watermark;
      if (updates.default_bg_style !== undefined) data.defaultBgStyle = updates.default_bg_style;
      if (updates.default_enhance_preset !== undefined) data.defaultEnhancePreset = updates.default_enhance_preset;

      const row = await db.brandKit.update({
        where: { id: existing.id },
        data,
      });
      return mapBrandKit(row);
    }

    // No existing brand kit — create one
    const row = await db.brandKit.create({
      data: {
        name: updates.name ?? 'My Brand',
        colors: updates.colors ?? {
          primary: '#000000',
          secondary: '#ffffff',
          accent: '#3b82f6',
          background: '#f5f5f5',
        },
        fonts: updates.fonts ?? { primary: 'Inter', secondary: 'Inter' },
        logoUrl: updates.logo_url ?? null,
        watermark: updates.watermark ? (updates.watermark as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        defaultBgStyle: updates.default_bg_style ?? null,
        defaultEnhancePreset: updates.default_enhance_preset ?? null,
      },
    });
    return mapBrandKit(row);
  } catch (e) {
    console.error('[updateBrandKit] Error:', e);
    return null;
  }
}

// -----------------------------------------------------------------------------
// AI Model Queries
// -----------------------------------------------------------------------------

export async function getAiModels(): Promise<AiModelRecord[]> {
  if (!prisma) return [];
  try {
    const rows = await db.aiModel.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapAiModel);
  } catch (e) {
    console.error('[getAiModels] Error:', e);
    return [];
  }
}

export async function saveAiModel(input: {
  name: string;
  provider: string;
  modelId: string;
  gender: string;
  ageRange: string;
  skinTone: string;
  bodyType: string;
  pose: string;
  previewUrl: string;
  metadata: Record<string, unknown>;
}): Promise<AiModelRecord | null> {
  if (!prisma) return null;
  try {
    const row = await db.aiModel.create({
      data: {
        name: input.name,
        provider: input.provider,
        modelId: input.modelId,
        gender: input.gender,
        ageRange: input.ageRange,
        skinTone: input.skinTone,
        bodyType: input.bodyType,
        pose: input.pose,
        previewUrl: input.previewUrl,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
    return mapAiModel(row);
  } catch (e) {
    console.error('[saveAiModel] Error:', e);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Prompt Template Queries
// -----------------------------------------------------------------------------

export async function getPromptTemplates(): Promise<PromptTemplateRecord[]> {
  if (!prisma) return [];
  try {
    const rows = await db.promptTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapPromptTemplate);
  } catch (e) {
    console.error('[getPromptTemplates] Error:', e);
    return [];
  }
}

export async function savePromptTemplate(input: {
  category: string;
  name: string;
  prompt: string;
  negativePrompt: string;
  previewUrl: string;
  isPublic: boolean;
}): Promise<PromptTemplateRecord | null> {
  if (!prisma) return null;
  try {
    const row = await db.promptTemplate.create({
      data: {
        category: input.category,
        name: input.name,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt || null,
        previewUrl: input.previewUrl || null,
        isPublic: input.isPublic,
      },
    });
    return mapPromptTemplate(row);
  } catch (e) {
    console.error('[savePromptTemplate] Error:', e);
    return null;
  }
}
