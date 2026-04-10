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
    "FASHN_API_KEY",
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

  // Check Replicate connectivity
  let replicateStatus = "not checked";
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const res = await fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      });
      replicateStatus = res.ok ? "connected" : `error: HTTP ${res.status}`;
    } catch (err) {
      replicateStatus = `error: ${err instanceof Error ? err.message : "unreachable"}`;
    }
  }

  // Check fal.ai connectivity
  let falStatus = "not checked";
  if (process.env.FAL_KEY) {
    try {
      const res = await fetch("https://queue.fal.run/fal-ai/fast-sdxl/status", {
        headers: { Authorization: `Key ${process.env.FAL_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      // 404/422 is fine — it means the API responded (no job ID given)
      falStatus = res.status < 500 ? "connected" : `error: HTTP ${res.status}`;
    } catch (err) {
      falStatus = `error: ${err instanceof Error ? err.message : "unreachable"}`;
    }
  }

  const allRequired = requiredVars.every((v) => process.env[v]);

  return NextResponse.json({
    status: allRequired ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    backends: {
      replicate: replicateStatus,
      fal: falStatus,
    },
    env: checks,
  });
}
