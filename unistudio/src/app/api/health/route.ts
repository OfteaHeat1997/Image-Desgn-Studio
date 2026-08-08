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
    "GOOGLE_TTS_API_KEY",
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
    if (!prisma) {
      dbStatus = "not configured (DATABASE_URL not set)";
    } else {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    }
  } catch (err) {
    dbStatus = `error: ${err instanceof Error ? err.message : "unknown"}`;
  }

  // Check Replicate connectivity
  let replicateStatus = "not checked";
  const replicateToken = process.env.REPLICATE_API_TOKEN?.trim();
  if (replicateToken) {
    try {
      const res = await fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Bearer ${replicateToken}` },
        signal: AbortSignal.timeout(5000),
      });
      replicateStatus = res.ok ? "connected" : `error: HTTP ${res.status}`;
    } catch (err) {
      replicateStatus = `error: ${err instanceof Error ? err.message : "unreachable"}`;
    }
  }

  // Check fal.ai connectivity.
  //
  // FALSO POSITIVO que este check tenía y costó horas de debug: pegaba a
  // /fast-sdxl/status y daba "connected" con cualquier status < 500. Cuando la
  // cuenta de fal se queda SIN SALDO, fal responde 403 "User is locked. Reason:
  // Exhausted balance" — que es < 500 → el health decía "connected" mientras
  // TODOS los pasos del pipeline fallaban en rojo (fal es el proveedor de
  // SeedDream, Kolors, Kling y del storage donde se suben las imágenes).
  //
  // Ahora pegamos al MISMO endpoint que usa el pipeline (storage/upload/initiate)
  // y distinguimos explícitamente el bloqueo por saldo, que es accionable:
  // recargar en fal.ai/dashboard/billing.
  let falStatus = "not checked";
  const falKey = process.env.FAL_KEY?.trim();
  if (falKey) {
    try {
      const res = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
        method: "POST",
        headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: "image/png", file_name: "healthcheck.png" }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        falStatus = "connected";
      } else {
        const detail = await res.text().catch(() => "");
        if (/exhausted balance|user is locked/i.test(detail)) {
          falStatus = "SIN SALDO — recargá en fal.ai/dashboard/billing (todos los pasos van a fallar)";
        } else if (res.status === 401 || res.status === 403) {
          falStatus = `error: credenciales rechazadas (HTTP ${res.status})`;
        } else {
          falStatus = `error: HTTP ${res.status}`;
        }
      }
    } catch (err) {
      falStatus = `error: ${err instanceof Error ? err.message : "unreachable"}`;
    }
  }

  const allRequired = requiredVars.every((v) => process.env[v]);
  // El estado global también mira los backends: tener las env vars puestas no
  // sirve de nada si fal está sin saldo o Replicate rechaza el token.
  const backendsOk =
    !falStatus.startsWith("error") && !falStatus.startsWith("SIN SALDO") &&
    !replicateStatus.startsWith("error");

  return NextResponse.json({
    status: allRequired && backendsOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    backends: {
      replicate: replicateStatus,
      fal: falStatus,
    },
    env: checks,
  });
}
