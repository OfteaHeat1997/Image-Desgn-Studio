"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  AgentPlan,
  AgentPlanRequest,
  AgentPlanResponse,
  PipelineExecution,
  PipelineStep,
  StepExecution,
  PipelineStatus,
} from "@/types/agent";

// =============================================================================
// useAgentPipeline — Client-side execution engine
// Orchestrates existing /api/* routes sequentially based on an AgentPlan.
// =============================================================================

/** Compress an image to stay under Vercel's 4.5MB body limit */
async function compressIfNeeded(file: File, maxSizeKB = 3000): Promise<File> {
  if (file.size <= maxSizeKB * 1024) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 2048 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob && blob.size < file.size ? new File([blob], file.name, { type: "image/jpeg" }) : file),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); resolve(file); };
    const blobUrl = URL.createObjectURL(file);
    img.src = blobUrl;
  });
}

/** Convert a File to a data URL for sending to JSON APIs */
async function fileToDataUrl(file: File): Promise<string> {
  const compressed = await compressIfNeeded(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });
}

/**
 * Convert a URL to a data URL string.
 * For HTTP URLs (like replicate.delivery), passes the URL directly — no client fetch needed.
 * For blob/data URLs, reads them locally.
 */
async function urlToDataUrl(url: string): Promise<string> {
  // HTTP URLs can't be fetched client-side due to CORS — return as-is for server APIs
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // blob: or data: URLs — read locally
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  const file = new File([blob], "image.png", { type: blob.type || "image/png" });
  return fileToDataUrl(file);
}

/** Convert a URL (blob/data/http) to a File for FormData APIs */
async function urlToFile(url: string, filename: string): Promise<File> {
  // For HTTP URLs, download via our server proxy to avoid CORS
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const proxyRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const proxyData = await proxyRes.json();
      if (proxyData.success && proxyData.data?.dataUrl) {
        const fetchRes = await fetch(proxyData.data.dataUrl);
        const blob = await fetchRes.blob();
        return new File([blob], filename, { type: blob.type || "image/png" });
      }
    } catch { /* fall through */ }
    // Fallback: try direct fetch (might work for some CDNs)
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new File([blob], filename, { type: blob.type || "image/png" });
    } catch {
      throw new Error(`No se pudo descargar la imagen: ${url.slice(0, 60)}...`);
    }
  }
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

/** Client-side background removal using @imgly/background-removal */
async function clientBgRemove(imageFile: File): Promise<string> {
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(imageFile, {
    output: { format: "image/png" },
  });
  return URL.createObjectURL(blob);
}

// -----------------------------------------------------------------------------
// Step executor — calls the right API for each module
// -----------------------------------------------------------------------------

interface StepContext {
  /** The main image flowing through the pipeline (changes at each step) */
  currentUrl: string;
  /** Garment image URL (preserved from bg-remove for tryon) */
  garmentUrl: string | null;
  /** Model image URL (from model-create step) */
  modelUrl: string | null;
  /** Original input file for FormData APIs */
  inputFile: File;
  /** Catalog mode: stores results per angle (front, back, side, lifestyle) */
  catalogResults: Record<string, string>;
  /** Current catalog angle being processed */
  currentAngle: string | null;
}

async function executeStep(
  step: PipelineStep,
  ctx: StepContext,
): Promise<{ resultUrl: string; cost: number; updatedCtx: Partial<StepContext> }> {
  const { module, params } = step;

  switch (module) {
    // ----- Background Remove -----
    case "bg-remove": {
      const provider = (params.provider as string) ?? "browser";
      if (provider === "browser") {
        const file = await urlToFile(ctx.currentUrl, "input.png");
        const resultUrl = await clientBgRemove(file);
        return { resultUrl, cost: 0, updatedCtx: { garmentUrl: resultUrl } };
      }
      const dataUrl = await fileToDataUrl(await urlToFile(ctx.currentUrl, "input.png"));
      const res = await fetch("/api/bg-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: dataUrl, provider }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "bg-remove failed");
      return { resultUrl: data.data.url, cost: data.cost ?? 0, updatedCtx: { garmentUrl: data.data.url } };
    }

    // ----- Background Generate -----
    case "bg-generate": {
      const dataUrl = await fileToDataUrl(await urlToFile(ctx.currentUrl, "input.png"));
      const res = await fetch("/api/bg-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          mode: params.mode ?? "precise",
          style: params.style ?? "studio-white",
          customPrompt: params.customPrompt ?? "",
          aspectRatio: params.aspectRatio ?? "1:1",
          productDescription: params.productDescription ?? "",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "bg-generate failed");
      return { resultUrl: data.data.url, cost: data.cost ?? 0.05, updatedCtx: {} };
    }

    // ----- Enhance (FormData or JSON depending on URL type) -----
    case "enhance": {
      // If URL is HTTP (e.g. replicate), send as JSON to avoid CORS
      if (ctx.currentUrl.startsWith("http")) {
        const res = await fetch("/api/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: ctx.currentUrl,
            preset: (params.preset as string) ?? "product-clean",
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? "enhance failed");
        return { resultUrl: data.data.url, cost: 0, updatedCtx: {} };
      }
      const file = await urlToFile(ctx.currentUrl, "input.png");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("preset", (params.preset as string) ?? "product-clean");
      const res = await fetch("/api/enhance", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "enhance failed");
      return { resultUrl: data.data.url, cost: 0, updatedCtx: {} };
    }

    // ----- Shadows -----
    case "shadows": {
      const shadowType = (params.type as string) ?? "drop";
      const provider = (params.provider as string) ?? "browser";

      // Programmatic shadows: use FormData with file
      if (["drop", "contact", "reflection"].includes(shadowType)) {
        const file = await urlToFile(ctx.currentUrl, "input.png");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("params", JSON.stringify({ type: shadowType, ...params }));
        const res = await fetch("/api/shadows", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? "shadows failed");
        return { resultUrl: data.data.url, cost: 0, updatedCtx: {} };
      }

      // AI shadows: JSON with imageUrl
      const dataUrl = await fileToDataUrl(await urlToFile(ctx.currentUrl, "input.png"));
      const res = await fetch("/api/shadows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          type: shadowType,
          provider,
          preset: params.preset ?? "studio",
          prompt: params.prompt ?? "",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "shadows failed");
      return { resultUrl: data.data.url, cost: data.cost ?? 0.04, updatedCtx: {} };
    }

    // ----- Outpaint -----
    case "outpaint": {
      const dataUrl = await fileToDataUrl(await urlToFile(ctx.currentUrl, "input.png"));
      const res = await fetch("/api/outpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          platform: params.platform ?? "instagram",
          targetAspectRatio: params.targetAspectRatio,
          prompt: params.prompt ?? "clean white background, product photography",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "outpaint failed");
      return { resultUrl: data.data.url, cost: data.cost ?? 0.05, updatedCtx: {} };
    }

    // ----- Upscale -----
    case "upscale": {
      const dataUrl = await fileToDataUrl(await urlToFile(ctx.currentUrl, "input.png"));
      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          provider: params.provider ?? "real-esrgan",
          scale: params.scale ?? 2,
          faceEnhance: params.faceEnhance ?? false,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "upscale failed");
      return { resultUrl: data.data.url, cost: data.cost ?? 0.02, updatedCtx: {} };
    }

    // ----- Model Create -----
    case "model-create": {
      const res = await fetch("/api/model-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: params.gender ?? "female",
          ageRange: params.ageRange ?? "26-35",
          skinTone: params.skinTone ?? "medium",
          bodyType: params.bodyType ?? "average",
          pose: params.pose ?? "standing",
          expression: params.expression ?? "confident",
          hairStyle: params.hairStyle ?? "natural professional",
          background: params.background ?? "studio white",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "model-create failed");
      // Store model URL but DON'T replace currentUrl (garment stays current)
      return { resultUrl: data.data.url, cost: data.cost ?? 0.055, updatedCtx: { modelUrl: data.data.url } };
    }

    // ----- Try-On (needs garment + model) -----
    case "tryon": {
      const garmentUrl = ctx.garmentUrl ?? ctx.currentUrl;
      const modelUrl = ctx.modelUrl;
      if (!modelUrl) throw new Error("No model image available for try-on. Run model-create first.");

      // Upload garment image to get a public URL (Replicate needs HTTP URLs, not data URLs)
      const garmentFile = await urlToFile(garmentUrl, "garment.png");
      const uploadForm = new FormData();
      uploadForm.append("file", garmentFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error ?? "Failed to upload garment image");
      const garmentHttpUrl = uploadData.data.url;

      // Map category names to IDM-VTON format
      const categoryMap: Record<string, string> = {
        tops: "upper_body",
        "upper-body": "upper_body",
        bottoms: "lower_body",
        "lower-body": "lower_body",
        dresses: "dresses",
        "one-pieces": "dresses",
        "full-body": "dresses",
      };
      const rawCat = (params.category as string) ?? "tops";
      const mappedCategory = categoryMap[rawCat] ?? "upper_body";

      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelImage: modelUrl,
          garmentImage: garmentHttpUrl,
          category: mappedCategory,
          provider: params.provider ?? "idm-vton",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "tryon failed");
      return { resultUrl: data.data.url, cost: data.cost ?? 0.02, updatedCtx: {} };
    }

    // ----- Jewelry Try-On (needs jewelry + model) -----
    case "jewelry-tryon": {
      const jewelryUrl = ctx.garmentUrl ?? ctx.currentUrl;
      const modelUrl = ctx.modelUrl;
      if (!modelUrl) throw new Error("No model image available for jewelry try-on. Run model-create first.");

      const jewelryDataUrl = await fileToDataUrl(await urlToFile(jewelryUrl, "jewelry.png"));
      const res = await fetch("/api/jewelry-tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelImage: modelUrl,
          jewelryImage: jewelryDataUrl,
          type: params.type ?? "earrings",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "jewelry-tryon failed");
      return { resultUrl: data.data.url, cost: data.cost ?? 0.05, updatedCtx: {} };
    }

    // ----- Inpaint -----
    case "inpaint": {
      const dataUrl = await fileToDataUrl(await urlToFile(ctx.currentUrl, "input.png"));
      const res = await fetch("/api/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          prompt: params.prompt ?? "clean product photo",
          provider: params.provider ?? "kontext",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "inpaint failed");
      return { resultUrl: data.data.url, cost: data.cost ?? 0.05, updatedCtx: {} };
    }

    // ----- Video (terminal step) -----
    case "video": {
      const dataUrl = await fileToDataUrl(await urlToFile(ctx.currentUrl, "input.png"));
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          provider: params.provider ?? "wan-2.2-fast",
          prompt: params.prompt ?? "Cinematic product showcase, smooth camera motion",
          duration: params.duration ?? 5,
          aspectRatio: params.aspectRatio ?? "16:9",
          category: params.category ?? "product",
          mode: "auto",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "video failed");
      return { resultUrl: data.data.url, cost: data.cost ?? 0.05, updatedCtx: {} };
    }

    // ----- Ghost Mannequin -----
    case "ghost-mannequin": {
      const dataUrl = await fileToDataUrl(await urlToFile(ctx.currentUrl, "input.png"));
      const res = await fetch("/api/ghost-mannequin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          operation: (params.operation as string) ?? "remove-mannequin",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "ghost-mannequin failed");
      return { resultUrl: data.data.url, cost: data.cost ?? 0.05, updatedCtx: {} };
    }

    // ----- Infographic overlay (free, server-side sharp) -----
    case "infographic": {
      // In catalog mode, use the result from a specific angle
      const useResultAngle = params._useResult as string | undefined;
      const baseUrl = (useResultAngle && ctx.catalogResults[useResultAngle])
        ? ctx.catalogResults[useResultAngle]
        : ctx.currentUrl;
      const dataUrl = await fileToDataUrl(await urlToFile(baseUrl, "input.png"));
      const res = await fetch("/api/infographic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          features: params.features ?? [],
          style: params.style ?? "light",
          accentColor: params.accentColor ?? "#C5A47E",
          width: params.width ?? 1200,
          height: params.height ?? 1500,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "infographic failed");
      return { resultUrl: data.data.url, cost: 0, updatedCtx: {} };
    }

    // ----- Ad Create (terminal step) -----
    case "ad-create": {
      const dataUrl = await fileToDataUrl(await urlToFile(ctx.currentUrl, "input.png"));
      const res = await fetch("/api/ad-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          template: params.template ?? "instagram-reel",
          headline: params.headline ?? "",
          cta: params.cta ?? "",
          description: params.description ?? "",
          autoPrompt: true,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "ad-create failed");
      return { resultUrl: data.data.videoUrl ?? data.data.url, cost: data.cost ?? 0.05, updatedCtx: {} };
    }

    default:
      throw new Error(`Unknown module: ${module}`);
  }
}

// -----------------------------------------------------------------------------
// Parallel execution: detect independent steps
// -----------------------------------------------------------------------------

/** Steps that don't depend on the current image flow (they generate from scratch) */
const INDEPENDENT_MODULES = new Set(["model-create"]);

/**
 * Find groups of consecutive steps that can run in parallel.
 * Returns arrays of step indices: [[0], [1, 2], [3]] means steps 1+2 run together.
 */
function findParallelGroups(steps: PipelineStep[]): number[][] {
  const groups: number[][] = [];
  let i = 0;

  while (i < steps.length) {
    // Check if next step is independent and can run in parallel with current
    if (
      i + 1 < steps.length &&
      !INDEPENDENT_MODULES.has(steps[i].module) &&
      INDEPENDENT_MODULES.has(steps[i + 1].module)
    ) {
      // Current step + next independent step can run in parallel
      groups.push([i, i + 1]);
      i += 2;
    } else if (
      i + 1 < steps.length &&
      INDEPENDENT_MODULES.has(steps[i].module) &&
      !INDEPENDENT_MODULES.has(steps[i + 1].module)
    ) {
      // Independent step first, then dependent — still parallel
      groups.push([i, i + 1]);
      i += 2;
    } else {
      groups.push([i]);
      i += 1;
    }
  }

  return groups;
}

// -----------------------------------------------------------------------------
// Quality validation between steps
// -----------------------------------------------------------------------------

async function validateStepResult(
  resultUrl: string,
  module: string,
): Promise<{ valid: boolean; warning?: string }> {
  // Skip validation for video/ad steps (not images)
  if (module === "video" || module === "ad-create") {
    return { valid: !!resultUrl };
  }

  if (!resultUrl) {
    return { valid: false, warning: "No se recibio resultado del paso" };
  }

  // For blob: or data: URLs, check they're not empty
  if (resultUrl.startsWith("blob:") || resultUrl.startsWith("data:")) {
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      if (blob.size < 100) {
        return { valid: false, warning: `Resultado vacio o corrupto (${blob.size} bytes)` };
      }
      // Check it's actually an image
      if (!blob.type.startsWith("image/")) {
        return { valid: false, warning: `Tipo de archivo inesperado: ${blob.type}` };
      }
    } catch {
      return { valid: false, warning: "No se pudo leer el resultado" };
    }
  }

  // For HTTP URLs, trust them — HEAD checks fail due to CORS on CDNs like replicate.delivery
  if (resultUrl.startsWith("http")) {
    return { valid: true };
  }

  return { valid: true };
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

function createEmptyExecution(planId: string, steps: PipelineStep[]): PipelineExecution {
  return {
    planId,
    status: "idle",
    steps: steps.map((s) => ({
      stepId: s.id,
      status: "pending",
      inputUrl: null,
      resultUrl: null,
      error: null,
      actualCost: 0,
      startedAt: null,
      completedAt: null,
    })),
    currentStepIndex: -1,
    totalCost: 0,
  };
}

export function useAgentPipeline() {
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [planMethod, setPlanMethod] = useState<"ai" | "fallback">("fallback");
  const [execution, setExecution] = useState<PipelineExecution | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const abortRef = useRef(false);

  // Track blob URLs for cleanup to prevent memory leaks
  const blobUrlsRef = useRef<string[]>([]);

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      }
      blobUrlsRef.current = [];
    };
  }, []);

  // ----- Request a plan from the API -----
  const requestPlan = useCallback(async (req: AgentPlanRequest) => {
    setIsPlanning(true);
    setPlan(null);
    setExecution(null);
    try {
      const res = await fetch("/api/ai-agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Error del servidor (${res.status}): ${text || res.statusText}`);
      }

      const data = (await res.json()) as AgentPlanResponse;
      if (!data.success || !data.data) {
        throw new Error(data.error || "No se pudo generar el plan. Intenta de nuevo.");
      }
      setPlan(data.data.plan);
      setPlanMethod(data.data.method);
      setExecution(createEmptyExecution(data.data.plan.id, data.data.plan.steps));
      return data.data.plan;
    } catch (err) {
      // Re-throw with context so the UI can show it
      if (err instanceof Error) throw err;
      throw new Error("Error de conexion al crear plan. Verifica que el servidor esta corriendo.");
    } finally {
      setIsPlanning(false);
    }
  }, []);

  // ----- Execute the plan (with parallel support) -----
  const execute = useCallback(async (agentPlan: AgentPlan, imageFile: File) => {
    abortRef.current = false;
    const steps = agentPlan.steps;

    const exec = createEmptyExecution(agentPlan.id, steps);
    exec.status = "running";
    setExecution({ ...exec });

    // Build initial context
    const inputUrl = URL.createObjectURL(imageFile);
    blobUrlsRef.current.push(inputUrl); // Track for cleanup
    const ctx: StepContext = {
      currentUrl: inputUrl,
      garmentUrl: null,
      modelUrl: null,
      inputFile: imageFile,
      catalogResults: {},
      currentAngle: null,
    };

    // Find parallel groups
    const groups = findParallelGroups(steps);

    for (const group of groups) {
      if (abortRef.current) {
        exec.status = "cancelled";
        setExecution({ ...exec });
        return exec;
      }

      // Mark all steps in this group as running
      for (const idx of group) {
        exec.currentStepIndex = idx;
        exec.steps[idx] = { ...exec.steps[idx], status: "running", startedAt: Date.now() };
      }
      setExecution({ ...exec });

      if (group.length === 1) {
        // Single step — sequential execution
        const i = group[0];
        const step = steps[i];
        // Capture input URL before this step runs (for before/after)
        const stepInputUrl = step.module === "model-create" ? (ctx.modelUrl ?? ctx.currentUrl) : ctx.currentUrl;
        exec.steps[i] = { ...exec.steps[i], inputUrl: stepInputUrl };
        setExecution({ ...exec });

        try {
          const result = await executeStep(step, ctx);

          const validation = await validateStepResult(result.resultUrl, step.module);
          if (!validation.valid) {
            throw new Error(validation.warning ?? "Validacion de calidad fallida");
          }

          const catalogAngle = step.params._catalogAngle as string | undefined;

          if (step.module === "model-create") {
            ctx.modelUrl = result.resultUrl;
            if (catalogAngle) ctx.currentAngle = catalogAngle;
          } else if (step.module === "infographic" && step.params._useResult) {
            // Infographic doesn't change the main flow
          } else {
            ctx.currentUrl = result.resultUrl;
          }
          if (result.updatedCtx.garmentUrl) ctx.garmentUrl = result.updatedCtx.garmentUrl;
          if (result.updatedCtx.modelUrl) ctx.modelUrl = result.updatedCtx.modelUrl;

          // Track catalog results by angle
          if (catalogAngle && step.module === "tryon") {
            ctx.catalogResults[catalogAngle] = result.resultUrl;
          }

          exec.steps[i] = {
            ...exec.steps[i],
            status: "completed",
            inputUrl: stepInputUrl,
            resultUrl: result.resultUrl,
            actualCost: result.cost,
            completedAt: Date.now(),
            error: validation.warning ?? null,
          };
          exec.totalCost += result.cost;
          setExecution({ ...exec });
        } catch (err) {
          exec.steps[i] = {
            ...exec.steps[i],
            status: "failed",
            error: err instanceof Error ? err.message : "Unknown error",
            completedAt: Date.now(),
          };
          exec.status = "failed";
          setExecution({ ...exec });
          return exec;
        }
      } else {
        // Parallel group — run all steps concurrently
        // Capture input URLs before parallel execution
        for (const idx of group) {
          const step = steps[idx];
          const stepInputUrl = step.module === "model-create" ? (ctx.modelUrl ?? ctx.currentUrl) : ctx.currentUrl;
          exec.steps[idx] = { ...exec.steps[idx], inputUrl: stepInputUrl };
        }
        setExecution({ ...exec });

        const promises = group.map(async (idx) => {
          const step = steps[idx];
          const result = await executeStep(step, ctx);
          const validation = await validateStepResult(result.resultUrl, step.module);
          if (!validation.valid) {
            throw new Error(validation.warning ?? "Validacion de calidad fallida");
          }
          return { idx, step, result, warning: validation.warning };
        });

        try {
          const results = await Promise.all(promises);

          // Apply all results to context and execution
          for (const { idx, step, result, warning } of results) {
            if (step.module === "model-create") {
              ctx.modelUrl = result.resultUrl;
            } else {
              ctx.currentUrl = result.resultUrl;
            }
            if (result.updatedCtx.garmentUrl) ctx.garmentUrl = result.updatedCtx.garmentUrl;
            if (result.updatedCtx.modelUrl) ctx.modelUrl = result.updatedCtx.modelUrl;

            exec.steps[idx] = {
              ...exec.steps[idx],
              status: "completed",
              inputUrl: exec.steps[idx].inputUrl,
              resultUrl: result.resultUrl,
              actualCost: result.cost,
              completedAt: Date.now(),
              error: warning ?? null,
            };
            exec.totalCost += result.cost;
          }
          setExecution({ ...exec });
        } catch (err) {
          // Mark all steps in the group that haven't completed as failed
          for (const idx of group) {
            if (exec.steps[idx].status !== "completed") {
              exec.steps[idx] = {
                ...exec.steps[idx],
                status: "failed",
                error: err instanceof Error ? err.message : "Unknown error",
                completedAt: Date.now(),
              };
            }
          }
          exec.status = "failed";
          setExecution({ ...exec });
          return exec;
        }
      }
    }

    exec.status = "completed";
    setExecution({ ...exec });
    return exec;
  }, []);

  // ----- Retry from a specific step -----
  const retryFromStep = useCallback(async (agentPlan: AgentPlan, imageFile: File, fromIndex: number) => {
    if (!execution) return;
    abortRef.current = false;

    const exec = { ...execution };
    exec.status = "running";

    // Reset steps from `fromIndex` onward
    for (let i = fromIndex; i < exec.steps.length; i++) {
      exec.steps[i] = {
        ...exec.steps[i],
        status: "pending",
        resultUrl: null,
        error: null,
        actualCost: 0,
        startedAt: null,
        completedAt: null,
      };
    }

    // FIX: Recalculate totalCost from ONLY completed steps (not accumulate on top of stale total)
    exec.totalCost = exec.steps.reduce(
      (sum, s) => sum + (s.status === "completed" ? s.actualCost : 0),
      0,
    );

    setExecution({ ...exec });

    // Build context from completed steps
    const inputUrl = URL.createObjectURL(imageFile);
    blobUrlsRef.current.push(inputUrl); // Track for cleanup
    const ctx: StepContext = {
      currentUrl: inputUrl,
      garmentUrl: null,
      modelUrl: null,
      inputFile: imageFile,
      catalogResults: {},
      currentAngle: null,
    };

    // Replay context from completed steps
    for (let i = 0; i < fromIndex; i++) {
      const stepExec = exec.steps[i];
      if (stepExec.status === "completed" && stepExec.resultUrl) {
        const stepModule = agentPlan.steps[i].module;
        const catalogAngle = agentPlan.steps[i].params._catalogAngle as string | undefined;
        if (stepModule === "model-create") {
          ctx.modelUrl = stepExec.resultUrl;
          if (catalogAngle) ctx.currentAngle = catalogAngle;
        } else {
          ctx.currentUrl = stepExec.resultUrl;
        }
        if (stepModule === "bg-remove") {
          ctx.garmentUrl = stepExec.resultUrl;
        }
        if (catalogAngle && stepModule === "tryon") {
          ctx.catalogResults[catalogAngle] = stepExec.resultUrl;
        }
      }
    }

    // Execute from `fromIndex`
    for (let i = fromIndex; i < agentPlan.steps.length; i++) {
      if (abortRef.current) {
        exec.status = "cancelled";
        setExecution({ ...exec });
        return exec;
      }

      const step = agentPlan.steps[i];
      const stepInputUrl = step.module === "model-create" ? (ctx.modelUrl ?? ctx.currentUrl) : ctx.currentUrl;
      exec.currentStepIndex = i;
      exec.steps[i] = { ...exec.steps[i], status: "running", inputUrl: stepInputUrl, startedAt: Date.now() };
      setExecution({ ...exec });

      try {
        const result = await executeStep(step, ctx);

        // Validate result quality before continuing
        const validation = await validateStepResult(result.resultUrl, step.module);
        if (!validation.valid) {
          throw new Error(validation.warning ?? "Validacion de calidad fallida");
        }

        if (step.module === "model-create") {
          ctx.modelUrl = result.resultUrl;
        } else {
          ctx.currentUrl = result.resultUrl;
        }
        if (result.updatedCtx.garmentUrl) ctx.garmentUrl = result.updatedCtx.garmentUrl;
        if (result.updatedCtx.modelUrl) ctx.modelUrl = result.updatedCtx.modelUrl;

        exec.steps[i] = {
          ...exec.steps[i],
          status: "completed",
          inputUrl: stepInputUrl,
          resultUrl: result.resultUrl,
          actualCost: result.cost,
          completedAt: Date.now(),
          error: validation.warning ?? null,
        };
        exec.totalCost += result.cost;
        setExecution({ ...exec });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        exec.steps[i] = {
          ...exec.steps[i],
          status: "failed",
          error: errorMsg,
          completedAt: Date.now(),
        };
        exec.status = "failed";
        setExecution({ ...exec });
        return exec;
      }
    }

    exec.status = "completed";
    setExecution({ ...exec });
    return exec;
  }, [execution]);

  // ----- Cancel -----
  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  // ----- Reset -----
  const reset = useCallback(() => {
    // Revoke all tracked blob URLs to free memory
    for (const url of blobUrlsRef.current) {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
    blobUrlsRef.current = [];

    setPlan(null);
    setPlanMethod("fallback");
    setExecution(null);
    abortRef.current = false;
  }, []);

  return {
    plan,
    planMethod,
    execution,
    isPlanning,
    requestPlan,
    execute,
    retryFromStep,
    cancel,
    reset,
  };
}
