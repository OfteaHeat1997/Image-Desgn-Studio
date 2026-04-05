// =============================================================================
// DB Persistence Helpers - UniStudio
// Fire-and-forget save functions for API routes.
// Errors are logged but never propagate to callers.
// Gracefully no-ops when DATABASE_URL is not configured.
// =============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

// -----------------------------------------------------------------------------
// Default project (cached in-memory)
// -----------------------------------------------------------------------------

let cachedProjectId: string | null = null;

export async function getDefaultProjectId(): Promise<string> {
  if (!prisma) return 'no-db';
  if (cachedProjectId) return cachedProjectId;

  let project = await prisma.project.findFirst({
    where: { name: 'Default Project' },
  });

  if (!project) {
    project = await prisma.project.create({
      data: { name: 'Default Project', description: 'Auto-created default project' },
    });
  }

  cachedProjectId = project.id;
  return cachedProjectId;
}

// -----------------------------------------------------------------------------
// Save an uploaded image
// -----------------------------------------------------------------------------

export async function saveUploadedImage(data: {
  filename: string;
  originalUrl: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}): Promise<string | null> {
  if (!prisma) return null;
  try {
    const projectId = await getDefaultProjectId();
    const row = await prisma.image.create({
      data: {
        projectId,
        originalUrl: data.originalUrl,
        filename: data.filename,
        width: data.width,
        height: data.height,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    });
    return row.id;
  } catch (e) {
    console.error('[DB] Failed to save uploaded image:', e);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Save a processing job
// -----------------------------------------------------------------------------

export async function saveJob(data: {
  imageId?: string | null;
  operation: string;
  provider: string;
  model?: string;
  inputParams: Record<string, unknown>;
  outputUrl: string;
  cost: number;
  processingTimeMs?: number;
}): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.processingJob.create({
      data: {
        imageId: data.imageId ?? null,
        operation: data.operation,
        provider: data.provider,
        model: data.model ?? null,
        status: 'completed',
        inputParams: data.inputParams as Prisma.InputJsonValue,
        outputUrl: data.outputUrl,
        cost: data.cost,
        processingTime: data.processingTimeMs ? data.processingTimeMs / 1000 : null,
      },
    });
  } catch (e) {
    console.error('[DB] Failed to save processing job:', e);
  }
}
