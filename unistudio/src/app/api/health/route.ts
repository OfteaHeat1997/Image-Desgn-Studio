import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check required env vars
  const requiredVars = [
    "REPLICATE_API_TOKEN",
    "FAL_KEY",
  ];
  const optionalVars = [
    "ANTHROPIC_API_KEY",
    "HEDRA_API_KEY",
    "GOOGLE_TTS_KEY",
  ];

  for (const v of requiredVars) {
    checks[v] = process.env[v] ? "ok" : "missing";
  }
  for (const v of optionalVars) {
    checks[v] = process.env[v] ? "ok" : "not set (optional)";
  }

  // Check Prisma connection
  let dbStatus = "not checked";
  try {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (err) {
    dbStatus = `error: ${err instanceof Error ? err.message : "unknown"}`;
  }

  const allRequired = requiredVars.every((v) => process.env[v]);

  return NextResponse.json({
    status: allRequired ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    env: checks,
  });
}
