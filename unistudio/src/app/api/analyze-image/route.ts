// =============================================================================
// Analyze Image API Route - UniStudio
// POST: Analyzes an image to provide intelligence for the AI Agent planner.
// Uses sharp for metadata + histogram analysis.
// Optionally uses Claude Vision for content detection (watermarks, text, etc.)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import type { ImageAnalysis, AgentModule, BudgetTier } from "@/types/agent";
import { CLAUDE_HAIKU } from "@/lib/utils/constants";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Minimum resolution for e-commerce (most platforms need 1000px+)
const MIN_ECOMMERCE_WIDTH = 1000;
const MIN_ECOMMERCE_HEIGHT = 1000;

// ---------------------------------------------------------------------------
// Sharp-based analysis (free, fast, always available)
// ---------------------------------------------------------------------------

async function analyzeWithSharp(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  stats: sharp.Stats;
}> {
  const metadata = await sharp(buffer).metadata();
  const stats = await sharp(buffer).stats();

  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format ?? "unknown",
    hasAlpha: metadata.hasAlpha ?? false,
    stats,
  };
}

function analyzeHistogram(stats: sharp.Stats): {
  lightingQuality: ImageAnalysis["lightingQuality"];
  colorBalance: ImageAnalysis["colorBalance"];
} {
  // Analyze brightness from all channels
  const channels = stats.channels;
  const avgMean = channels.reduce((sum, ch) => sum + ch.mean, 0) / channels.length;
  const avgStdDev = channels.reduce((sum, ch) => sum + ch.stdev, 0) / channels.length;

  // Lighting quality based on mean brightness and standard deviation
  let lightingQuality: ImageAnalysis["lightingQuality"] = "good";
  if (avgMean < 60) {
    lightingQuality = "dark";
  } else if (avgMean > 220) {
    lightingQuality = "overexposed";
  } else if (avgStdDev < 30) {
    lightingQuality = "uneven"; // very flat = likely uneven lighting
  }

  // Color balance: compare channel means (RGB)
  let colorBalance: ImageAnalysis["colorBalance"] = "good";
  if (channels.length >= 3) {
    const [r, g, b] = channels.slice(0, 3).map((ch) => ch.mean);
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));

    // Check saturation via standard deviation spread
    const avgSatStdDev = channels.slice(0, 3).reduce((sum, ch) => sum + ch.stdev, 0) / 3;

    if (r > g + 15 && r > b + 15) {
      colorBalance = "warm";
    } else if (b > r + 15 && b > g + 10) {
      colorBalance = "cool";
    } else if (avgSatStdDev > 80 && maxDiff > 25) {
      colorBalance = "oversaturated";
    } else if (avgSatStdDev < 25 && maxDiff < 10) {
      colorBalance = "desaturated";
    }
  }

  return { lightingQuality, colorBalance };
}

function detectBackgroundType(
  stats: sharp.Stats,
  hasAlpha: boolean,
): ImageAnalysis["backgroundType"] {
  if (hasAlpha) {
    // Check if alpha channel has significant variation (actual transparency)
    const alphaChannel = stats.channels.length >= 4 ? stats.channels[3] : null;
    if (alphaChannel && alphaChannel.stdev > 50) {
      return "transparent";
    }
  }

  // Check if background is likely white (high mean, low stdev across channels)
  const channels = stats.channels.slice(0, 3);
  const allHighMean = channels.every((ch) => ch.mean > 230);
  // Check if image likely has white background: high mean = bright overall
  const hasWhiteRegions = channels.every((ch) => ch.mean > 235);

  if (allHighMean && hasWhiteRegions) {
    return "white";
  }

  // Check for solid color background (low variance = uniform)
  const allLowStdev = channels.every((ch) => ch.stdev < 40);
  if (allLowStdev) {
    return "solid-color";
  }

  return "complex";
}

function getAspectRatioLabel(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(w, h);
  const rw = w / d;
  const rh = h / d;
  // Simplify common ratios
  if (rw === rh) return "1:1";
  if (Math.abs(rw / rh - 16 / 9) < 0.05) return "16:9";
  if (Math.abs(rw / rh - 9 / 16) < 0.05) return "9:16";
  if (Math.abs(rw / rh - 4 / 3) < 0.05) return "4:3";
  if (Math.abs(rw / rh - 3 / 4) < 0.05) return "3:4";
  if (Math.abs(rw / rh - 4 / 5) < 0.05) return "4:5";
  return `${rw}:${rh}`;
}

// ---------------------------------------------------------------------------
// Claude Vision analysis (optional, uses API key)
// ---------------------------------------------------------------------------

async function analyzeWithVision(
  base64Image: string,
  mimeType: string,
): Promise<{
  hasWatermark: boolean;
  hasText: boolean;
  additionalWarnings: string[];
} | null> {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_HAIKU,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: `Analyze this product/fashion image. Respond with JSON only:
{
  "hasWatermark": boolean (visible watermark, logo overlay, or stock photo mark?),
  "hasText": boolean (visible text, price tags, labels, brand logos on the image?),
  "issues": string[] (list of specific issues, e.g. "watermark in bottom-right corner", "price tag visible", "image is blurry", "poor lighting on left side", "mannequin visible")
}
Be strict: only flag issues that would affect professional e-commerce use. Empty issues array if image is clean.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[analyze-image] Vision API error:", res.status);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]);
    return {
      hasWatermark: result.hasWatermark === true,
      hasText: result.hasText === true,
      additionalWarnings: Array.isArray(result.issues) ? result.issues : [],
    };
  } catch (err) {
    console.error("[analyze-image] Vision analysis failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Build recommendations
// ---------------------------------------------------------------------------

function buildRecommendations(analysis: {
  width: number;
  height: number;
  isLowResolution: boolean;
  backgroundType: ImageAnalysis["backgroundType"];
  hasWatermark: boolean;
  hasText: boolean;
  lightingQuality: ImageAnalysis["lightingQuality"];
  colorBalance: ImageAnalysis["colorBalance"];
}): {
  suggestedSteps: AgentModule[];
  warnings: string[];
  minBudgetNeeded: BudgetTier;
} {
  const suggestedSteps: AgentModule[] = [];
  const warnings: string[] = [];
  let minBudget: BudgetTier = "free";

  // Watermark detected -> needs inpainting first
  if (analysis.hasWatermark) {
    suggestedSteps.push("inpaint");
    warnings.push("Marca de agua detectada — se recomienda removerla antes de procesar");
    minBudget = "economic";
  }

  // Text/tags detected -> needs inpainting
  if (analysis.hasText) {
    suggestedSteps.push("inpaint");
    warnings.push("Texto/etiqueta visible — considere removerlo con inpainting");
    if (minBudget === "free") minBudget = "economic";
  }

  // Background not already white/transparent -> needs bg-remove
  if (analysis.backgroundType === "complex" || analysis.backgroundType === "solid-color") {
    suggestedSteps.push("bg-remove");
  }

  // Lighting issues -> needs enhance
  if (analysis.lightingQuality !== "good") {
    suggestedSteps.push("enhance");
    const lightingMsg =
      analysis.lightingQuality === "dark"
        ? "Imagen oscura — se aplicara mejora automatica de brillo"
        : analysis.lightingQuality === "overexposed"
          ? "Imagen sobreexpuesta — se ajustara la exposicion"
          : "Iluminacion desigual — se recomienda mejora automatica";
    warnings.push(lightingMsg);
  }

  // Color balance issues -> needs enhance
  if (analysis.colorBalance !== "good" && !suggestedSteps.includes("enhance")) {
    suggestedSteps.push("enhance");
    warnings.push(
      analysis.colorBalance === "warm"
        ? "Balance de color calido — se ajustara automaticamente"
        : analysis.colorBalance === "cool"
          ? "Balance de color frio — se ajustara automaticamente"
          : analysis.colorBalance === "oversaturated"
            ? "Colores sobresaturados — se ajustara la saturacion"
            : "Colores desaturados — se mejorara la viveza",
    );
  }

  // Low resolution -> needs upscale at the end
  if (analysis.isLowResolution) {
    suggestedSteps.push("upscale");
    warnings.push(
      `Resolucion baja (${analysis.width}x${analysis.height}) — se recomienda upscale para e-commerce`,
    );
    if (minBudget === "free") minBudget = "economic";
  }

  return { suggestedSteps, warnings, minBudgetNeeded: minBudget };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let buffer: Buffer;
    let mimeType = "image/png";
    let fileSize = 0;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided" },
          { status: 400 },
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mimeType = file.type || "image/png";
      fileSize = file.size;
    } else {
      const body = await request.json();
      const imageUrl = body.imageUrl as string;
      if (!imageUrl) {
        return NextResponse.json(
          { success: false, error: "imageUrl is required" },
          { status: 400 },
        );
      }

      if (imageUrl.startsWith("data:")) {
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          return NextResponse.json(
            { success: false, error: "Invalid data URL format" },
            { status: 400 },
          );
        }
        mimeType = matches[1];
        buffer = Buffer.from(matches[2], "base64");
        fileSize = buffer.length;
      } else {
        const { replicateHeaders } = await import('@/lib/utils/image');
        const res = await fetch(imageUrl, { headers: replicateHeaders(imageUrl) });
        if (!res.ok) {
          return NextResponse.json(
            { success: false, error: `Failed to fetch image: ${res.status}` },
            { status: 400 },
          );
        }
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        mimeType = res.headers.get("content-type") ?? "image/png";
        fileSize = buffer.length;
      }
    }

    // Run sharp analysis (always available, free)
    const sharpResult = await analyzeWithSharp(buffer);
    const { lightingQuality, colorBalance } = analyzeHistogram(sharpResult.stats);
    const backgroundType = detectBackgroundType(sharpResult.stats, sharpResult.hasAlpha);

    const isLowResolution =
      sharpResult.width < MIN_ECOMMERCE_WIDTH || sharpResult.height < MIN_ECOMMERCE_HEIGHT;

    // Run Claude Vision analysis (optional, ~$0.001)
    const base64 = buffer.toString("base64");
    const visionResult = await analyzeWithVision(base64, mimeType);

    const hasWatermark = visionResult?.hasWatermark ?? false;
    const hasText = visionResult?.hasText ?? false;

    // Build recommendations
    const recommendations = buildRecommendations({
      width: sharpResult.width,
      height: sharpResult.height,
      isLowResolution,
      backgroundType,
      hasWatermark,
      hasText,
      lightingQuality,
      colorBalance,
    });

    // Merge vision warnings with recommendations
    if (visionResult?.additionalWarnings) {
      for (const w of visionResult.additionalWarnings) {
        if (!recommendations.warnings.includes(w)) {
          recommendations.warnings.push(w);
        }
      }
    }

    const analysis: ImageAnalysis = {
      width: sharpResult.width,
      height: sharpResult.height,
      format: sharpResult.format,
      fileSize,
      aspectRatio: getAspectRatioLabel(sharpResult.width, sharpResult.height),
      isLowResolution,
      needsUpscale: isLowResolution,
      backgroundType,
      hasWatermark,
      hasText,
      lightingQuality,
      colorBalance,
      suggestedSteps: recommendations.suggestedSteps,
      warnings: recommendations.warnings,
      minBudgetNeeded: recommendations.minBudgetNeeded,
    };

    return NextResponse.json({
      success: true,
      data: analysis,
      cost: visionResult ? 0.001 : 0,
      method: visionResult ? "vision" : "local",
    });
  } catch (error) {
    console.error("[API /analyze-image] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 },
    );
  }
}
