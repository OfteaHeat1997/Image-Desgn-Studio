// =============================================================================
// Prisma Client Singleton - UniStudio
// Standard Next.js pattern: store on globalThis to survive dev hot-reload.
// Uses PrismaPg adapter (required in Prisma 7).
// Gracefully handles missing DATABASE_URL for deployments without a database.
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null };

function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    console.warn('[UniStudio] DATABASE_URL not set — database features disabled');
    return null;
  }
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production' && prisma) globalForPrisma.prisma = prisma;
