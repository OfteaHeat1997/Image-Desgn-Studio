"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  X,
  Play,
  RotateCcw,
  Check,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Scissors,
  Image as ImageIcon,
  User,
  Shirt,
  Film,
  Sparkles,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Settings2,
  Zap,
  ZapOff,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type StepId = "isolate" | "background" | "model" | "tryon" | "productVideo" | "modelVideo";
type StepStatus = "idle" | "pending" | "processing" | "done" | "error" | "skipped" | "accepted";
type Phase = "setup" | "pipeline";

interface PipelineStep {
  id: StepId;
  label: string;
  description: string;
  icon: React.ElementType;
  cost: string;
  enabled: boolean;
  status: StepStatus;
  inputUrl?: string;
  resultUrl?: string;
  error?: string;
  cost_actual?: number;
}

interface ImageJob {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  falUrl?: string;
  steps: PipelineStep[];
  status: "idle" | "active" | "done" | "error";
  totalCost: number;
}

interface ModelConfig {
  gender: string;
  skinTone: string;
  bodyType: string;
  ageRange: string;
}

/* ------------------------------------------------------------------ */
/*  Step definitions                                                    */
/* ------------------------------------------------------------------ */

const STEP_DEFS: Omit<PipelineStep, "status" | "inputUrl" | "resultUrl" | "error" | "cost_actual">[] = [
  { id: "isolate",      label: "Aislar Producto",       description: "Eliminar modelo/fondo, dejar solo la prenda", icon: Scissors,  cost: "$0.01",  enabled: true  },
  { id: "background",   label: "Fondo Profesional",      description: "Fondo blanco/luxury para e-commerce",         icon: ImageIcon, cost: "$0.003", enabled: true  },
  { id: "model",        label: "Crear Modelo IA",        description: "Generar modelo personalizado (se reutiliza)", icon: User,      cost: "$0.055", enabled: true  },
  { id: "tryon",        label: "Prueba Virtual",         description: "Vestir el modelo con la prenda",              icon: Shirt,     cost: "$0.02",  enabled: true  },
  { id: "productVideo", label: "Video del Producto",     description: "Rotación 360° de la prenda aislada (5s)",     icon: Film,      cost: "$0.10",  enabled: true  },
  { id: "modelVideo",   label: "Video del Modelo",       description: "Modelo con movimiento natural (5s, 9:16)",    icon: Film,      cost: "$0.10",  enabled: false },
];

function makeSteps(): PipelineStep[] {
  return STEP_DEFS.map((d) => ({ ...d, status: "idle" }));
}

/* ------------------------------------------------------------------ */
/*  Cost estimate                                                       */
/* ------------------------------------------------------------------ */

function estimateCost(steps: PipelineStep[], imageCount: number): number {
  const perImage: Record<StepId, number> = {
    isolate: 0.01,
    background: 0.003,
    model: 0.055,
    tryon: 0.02,
    productVideo: 0.10,
    modelVideo: 0.10,
  };
  const enabledSteps = steps.filter((s) => s.enabled);
  let cost = 0;
  for (const step of enabledSteps) {
    if (step.id === "model") {
      // model is generated ONCE and reused
      cost += perImage[step.id];
    } else {
      cost += perImage[step.id] * imageCount;
    }
  }
  return cost;
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: StepStatus }) {
  const config = {
    idle:       { label: "Pendiente",    className: "bg-white/5 text-gray-400",      icon: Clock         },
    pending:    { label: "En cola",      className: "bg-white/5 text-gray-400",      icon: Clock         },
    processing: { label: "Procesando",   className: "bg-violet-500/20 text-violet-300", icon: Loader2    },
    done:       { label: "Listo",        className: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
    error:      { label: "Error",        className: "bg-red-500/20 text-red-400",    icon: AlertCircle   },
    skipped:    { label: "Saltado",      className: "bg-white/5 text-gray-500",      icon: SkipForward   },
    accepted:   { label: "Aceptado",     className: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle2 },
  }[status];

  const Icon = config.icon;
  return (
    <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      <Icon className={cn("h-3 w-3", status === "processing" && "animate-spin")} />
      {config.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Image thumbnail                                                     */
/* ------------------------------------------------------------------ */

function ImageThumb({ url, label, className }: { url?: string; label: string; className?: string }) {
  if (!url) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xs text-gray-500", className)}>
        {label}
      </div>
    );
  }
  const isVideo = url.includes(".mp4") || url.includes(".webm") || url.includes("video");
  if (isVideo) {
    return (
      <video
        src={url}
        className={cn("rounded-lg object-cover", className)}
        muted
        loop
        autoPlay
        playsInline
      />
    );
  }
  return (
    <img
      src={url}
      alt={label}
      className={cn("rounded-lg object-contain", className)}
      style={{ background: "repeating-conic-gradient(#2a2a2a 0% 25%, #222 0% 50%) 0 0 / 12px 12px" }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Step Card — the core interactive component                          */
/* ------------------------------------------------------------------ */

interface StepCardProps {
  step: PipelineStep;
  stepNumber: number;
  isActive: boolean;
  previousResultUrl?: string;
  onAccept: () => void;
  onSkip: () => void;
  onRerun: () => void;
  autoMode: boolean;
}

function StepCard({ step, stepNumber, isActive, previousResultUrl, onAccept, onSkip, onRerun, autoMode }: StepCardProps) {
  const Icon = step.icon;
  const inputUrl = step.inputUrl || previousResultUrl;
  const canInteract = step.status === "done" && !autoMode;
  const isVideo = step.resultUrl && (step.resultUrl.includes(".mp4") || step.resultUrl.includes(".webm") || step.resultUrl.includes("video"));

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        isActive && step.status !== "idle" && step.status !== "pending"
          ? "border-violet-500/40 bg-violet-500/[0.04] shadow-lg shadow-violet-500/5"
          : step.status === "done" || step.status === "accepted"
          ? "border-emerald-500/20 bg-emerald-500/[0.02]"
          : step.status === "skipped"
          ? "border-white/5 bg-white/[0.01] opacity-50"
          : step.status === "error"
          ? "border-red-500/30 bg-red-500/[0.03]"
          : "border-white/8 bg-white/[0.02]",
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold shrink-0",
              step.status === "done" || step.status === "accepted"
                ? "bg-emerald-500/20 text-emerald-400"
                : step.status === "processing"
                ? "bg-violet-500/20 text-violet-400"
                : step.status === "error"
                ? "bg-red-500/20 text-red-400"
                : "bg-white/8 text-gray-400",
            )}
          >
            {step.status === "processing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step.status === "done" || step.status === "accepted" ? (
              <Check className="h-4 w-4" />
            ) : step.status === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              stepNumber
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm font-semibold text-white">{step.label}</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{step.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500">{step.cost}</span>
          <StatusBadge status={step.status} />
        </div>
      </div>

      {/* Card body — before/after comparison */}
      {(step.status !== "idle" && step.status !== "pending") && (
        <div className="p-5">
          <div className="flex items-center gap-4">
            {/* Input (before) */}
            <div className="flex-1 min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Original</p>
              <ImageThumb
                url={inputUrl}
                label="Sin imagen"
                className="h-40 w-full"
              />
            </div>

            {/* Arrow */}
            <div className="flex shrink-0 flex-col items-center gap-1">
              <ArrowRight className={cn(
                "h-5 w-5",
                step.status === "processing" ? "text-violet-400 animate-pulse" : "text-gray-600",
              )} />
            </div>

            {/* Output (after) */}
            <div className="flex-1 min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Resultado</p>
              {step.status === "processing" ? (
                <div className="flex h-40 w-full items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/[0.04]">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                    <span className="text-xs text-violet-400">Generando...</span>
                  </div>
                </div>
              ) : step.status === "error" ? (
                <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.04] px-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-center text-xs text-red-400">{step.error || "Error desconocido"}</p>
                </div>
              ) : (
                <div className="relative">
                  {isVideo ? (
                    <video
                      src={step.resultUrl}
                      className="h-40 w-full rounded-lg object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={step.resultUrl}
                      alt="Resultado"
                      className="h-40 w-full rounded-lg object-contain"
                      style={{ background: "repeating-conic-gradient(#2a2a2a 0% 25%, #222 0% 50%) 0 0 / 12px 12px" }}
                    />
                  )}
                  {(step.status === "accepted") && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-emerald-500/20">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons — only shown when done and in manual mode */}
          {canInteract && (
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/6 pt-4">
              <button
                onClick={onSkip}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Saltar
              </button>
              <button
                onClick={onRerun}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Rehacer
              </button>
              <button
                onClick={onAccept}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30 hover:text-emerald-300"
              >
                <Check className="h-3.5 w-3.5" />
                Aceptar y continuar
              </button>
            </div>
          )}

          {/* Error retry */}
          {step.status === "error" && (
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/6 pt-4">
              <button
                onClick={onSkip}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Saltar paso
              </button>
              <button
                onClick={onRerun}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reintentar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Upload zone                                                         */
/* ------------------------------------------------------------------ */

function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) onFiles(files);
  }, [onFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) onFiles(files);
    e.target.value = "";
  }, [onFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-all",
        dragging
          ? "border-violet-500/60 bg-violet-500/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
      )}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChange} />
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
        <Upload className={cn("h-6 w-6", dragging ? "text-violet-400" : "text-gray-400")} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Arrastra las fotos aquí</p>
        <p className="mt-1 text-xs text-gray-500">O haz clic para seleccionar — múltiples ángulos/colores del mismo producto</p>
      </div>
      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-500">JPG, PNG, WebP — máx. 50MB por foto</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

async function uploadFile(file: File): Promise<{ url: string; falUrl?: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Upload failed");
  return { url: json.data.replicateUrl || json.data.url, falUrl: json.data.falUrl };
}

async function runStep(
  stepId: StepId,
  inputUrl: string,
  falUrl: string | undefined,
  modelConfig: ModelConfig,
  productType: string,
  sharedModelUrl?: string,
): Promise<{ resultUrl: string; cost: number; newModelUrl?: string }> {
  if (stepId === "isolate") {
    const res = await fetch("/api/bg-remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: inputUrl, provider: "replicate" }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "bg-remove failed");
    return { resultUrl: json.data.url, cost: json.cost ?? 0.01 };
  }

  if (stepId === "background") {
    const res = await fetch("/api/bg-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: inputUrl, mode: "fast", style: "studio-white", aspectRatio: "1:1" }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "bg-generate failed");
    return { resultUrl: json.data.url, cost: json.cost ?? 0.003 };
  }

  if (stepId === "model") {
    if (sharedModelUrl) return { resultUrl: sharedModelUrl, cost: 0 };
    const pose = productType === "bra" ? "upper-body front-facing" : "full-body front-facing";
    const res = await fetch("/api/model-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gender: modelConfig.gender,
        ageRange: modelConfig.ageRange,
        skinTone: modelConfig.skinTone,
        bodyType: modelConfig.bodyType,
        pose,
        expression: "confident natural",
        background: "plain white studio background",
        clothing: "wearing coordinated neutral lingerie, tasteful and professional",
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "model-create failed");
    return { resultUrl: json.data.url, cost: json.cost ?? 0.055, newModelUrl: json.data.url };
  }

  if (stepId === "tryon") {
    const category = productType === "bra" || productType === "set" ? "upper_body" : "lower_body";
    const res = await fetch("/api/tryon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelImage: sharedModelUrl || inputUrl,
        garmentImage: inputUrl,
        category,
        garmentType: "lingerie",
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "tryon failed");
    return { resultUrl: json.data.url, cost: json.cost ?? 0.02 };
  }

  if (stepId === "productVideo") {
    const res = await fetch("/api/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: inputUrl,
        falImageUrl: falUrl,
        provider: "wan-2.2-fast",
        duration: 5,
        aspectRatio: "1:1",
        prompt: "Smooth slow 360 degree rotation of this lingerie garment on pure white background, professional product photography, clean studio lighting",
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "video failed");
    return { resultUrl: json.data.url, cost: json.cost ?? 0.10 };
  }

  if (stepId === "modelVideo") {
    const res = await fetch("/api/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: inputUrl,
        falImageUrl: falUrl,
        provider: "wan-2.2-fast",
        duration: 5,
        aspectRatio: "9:16",
        prompt: "Fashion model wearing lingerie, subtle natural movement, confident elegant pose, soft studio lighting, editorial fashion photography",
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "video failed");
    return { resultUrl: json.data.url, cost: json.cost ?? 0.10 };
  }

  throw new Error(`Unknown step: ${stepId}`);
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function CatalogPipelinePage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [productType, setProductType] = useState("bra");
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    gender: "female",
    skinTone: "medium",
    bodyType: "curvy",
    ageRange: "26-35",
  });
  const [steps, setSteps] = useState<PipelineStep[]>(makeSteps());
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [activeJobIndex, setActiveJobIndex] = useState(0);
  const [autoMode, setAutoMode] = useState(true);
  const [sharedModelUrl, setSharedModelUrl] = useState<string | undefined>();
  const [isRunning, setIsRunning] = useState(false);

  const previewUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => previewUrlsRef.current.forEach(URL.revokeObjectURL);
  }, []);

  /* ---- Setup: add images ---- */
  const handleFiles = useCallback((files: File[]) => {
    const newJobs: ImageJob[] = files.map((file) => {
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.push(url);
      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: url,
        steps: makeSteps(),
        status: "idle",
        totalCost: 0,
      };
    });
    setJobs((prev) => [...prev, ...newJobs]);
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  /* ---- Toggle step enabled ---- */
  const toggleStep = useCallback((stepId: StepId) => {
    setSteps((prev) => prev.map((s) => s.id === stepId ? { ...s, enabled: !s.enabled } : s));
  }, []);

  /* ---- Update a specific step in a specific job ---- */
  const updateStep = useCallback((jobId: string, stepId: StepId, update: Partial<PipelineStep>) => {
    setJobs((prev) => prev.map((job) =>
      job.id !== jobId ? job : {
        ...job,
        steps: job.steps.map((s) => s.id === stepId ? { ...s, ...update } : s),
      },
    ));
  }, []);

  /* ---- Run one step for one job ---- */
  const executeStep = useCallback(async (
    job: ImageJob,
    step: PipelineStep,
    inputUrl: string,
    currentSharedModel: string | undefined,
  ): Promise<{ resultUrl: string; cost: number; newModelUrl?: string }> => {
    return runStep(
      step.id,
      inputUrl,
      job.falUrl,
      modelConfig,
      productType,
      step.id === "tryon" ? currentSharedModel : currentSharedModel,
    );
  }, [modelConfig, productType]);

  /* ---- Process one job sequentially ---- */
  const processJob = useCallback(async (
    jobId: string,
    jobsSnapshot: ImageJob[],
    currentSharedModel: string | undefined,
  ): Promise<{ newSharedModel?: string }> => {
    const job = jobsSnapshot.find((j) => j.id === jobId);
    if (!job) return {};

    // Upload the image first
    let uploadedUrl = job.uploadedUrl;
    let falUrl = job.falUrl;
    if (!uploadedUrl) {
      try {
        const uploaded = await uploadFile(job.file);
        uploadedUrl = uploaded.url;
        falUrl = uploaded.falUrl;
        setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, uploadedUrl, falUrl } : j));
      } catch (err) {
        setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "error" } : j));
        toast.error(`Error de carga — ${job.file.name}: ${err instanceof Error ? err.message : "Error desconocido"}`);
        return {};
      }
    }

    let lastResultUrl = uploadedUrl;
    let newSharedModel = currentSharedModel;

    // Get fresh step list with only enabled steps
    const enabledSteps = job.steps.filter((s) => s.enabled);

    for (const stepDef of enabledSteps) {
      // Determine input: for tryon use sharedModelUrl is handled in runStep
      let inputForStep = lastResultUrl;
      if (stepDef.id === "modelVideo") {
        // model video uses tryon result
        const tryonStep = job.steps.find((s) => s.id === "tryon");
        inputForStep = tryonStep?.resultUrl || lastResultUrl;
      } else if (stepDef.id === "tryon") {
        // tryon garment = isolated or original
        const isolateStep = job.steps.find((s) => s.id === "isolate");
        inputForStep = isolateStep?.resultUrl || uploadedUrl;
      } else if (stepDef.id === "productVideo") {
        // product video uses isolated
        const isolateStep = job.steps.find((s) => s.id === "isolate");
        inputForStep = isolateStep?.resultUrl || uploadedUrl;
      }

      updateStep(jobId, stepDef.id, { status: "processing", inputUrl: inputForStep });

      try {
        // Refresh job to get latest state
        const freshJob = (await new Promise<ImageJob>((resolve) => {
          setJobs((prev) => {
            const j = prev.find((j) => j.id === jobId);
            if (j) resolve({ ...j, uploadedUrl, falUrl });
            return prev;
          });
        }));

        const result = await executeStep(
          { ...freshJob, uploadedUrl, falUrl },
          stepDef,
          inputForStep,
          newSharedModel,
        );

        if (result.newModelUrl) {
          newSharedModel = result.newModelUrl;
          setSharedModelUrl(result.newModelUrl);
        }

        updateStep(jobId, stepDef.id, {
          status: "done",
          resultUrl: result.resultUrl,
          cost_actual: result.cost,
        });

        if (stepDef.id !== "productVideo" && stepDef.id !== "modelVideo" && stepDef.id !== "model") {
          lastResultUrl = result.resultUrl;
        }

        setJobs((prev) => prev.map((j) =>
          j.id !== jobId ? j : { ...j, totalCost: j.totalCost + result.cost }
        ));

        // Manual mode: pause and wait for user action
        if (!autoMode && (stepDef.id !== "model" || !newSharedModel)) {
          await new Promise<void>((resolve) => {
            const handler = (event: CustomEvent<{ jobId: string; stepId: string; action: string }>) => {
              if (event.detail.jobId === jobId && event.detail.stepId === stepDef.id) {
                window.removeEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
                if (event.detail.action === "skip") {
                  updateStep(jobId, stepDef.id, { status: "skipped" });
                } else {
                  updateStep(jobId, stepDef.id, { status: "accepted" });
                }
                resolve();
              }
            };
            window.addEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
          });
        } else {
          updateStep(jobId, stepDef.id, { status: "accepted" });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error desconocido";
        updateStep(jobId, stepDef.id, { status: "error", error: errorMsg });

        if (!autoMode) {
          // Wait for user to retry or skip
          await new Promise<void>((resolve) => {
            const handler = (event: CustomEvent<{ jobId: string; stepId: string; action: string }>) => {
              if (event.detail.jobId === jobId && event.detail.stepId === stepDef.id) {
                window.removeEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
                if (event.detail.action === "skip") {
                  updateStep(jobId, stepDef.id, { status: "skipped" });
                  resolve();
                } else if (event.detail.action === "rerun") {
                  // Rerun is handled by re-triggering processJob from outside
                  resolve();
                }
              }
            };
            window.addEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
          });
        } else {
          // Auto mode: skip errored step and continue
          toast.error(`Error en "${stepDef.label}": ${errorMsg}`);
        }
      }
    }

    setJobs((prev) => prev.map((j) => j.id !== jobId ? j : { ...j, status: "done" }));
    return { newSharedModel };
  }, [autoMode, executeStep, updateStep]);

  /* ---- Start the full pipeline ---- */
  const startPipeline = useCallback(async () => {
    if (jobs.length === 0) return;
    setPhase("pipeline");
    setIsRunning(true);

    // Apply enabled steps to all jobs
    setJobs((prev) => prev.map((job) => ({
      ...job,
      status: "idle",
      steps: job.steps.map((s) => ({
        ...s,
        enabled: steps.find((def) => def.id === s.id)?.enabled ?? s.enabled,
        status: "idle",
        resultUrl: undefined,
        error: undefined,
      })),
    })));

    let currentSharedModel = sharedModelUrl;

    // Get fresh snapshot
    const jobsSnapshot = jobs.map((job) => ({
      ...job,
      steps: job.steps.map((s) => ({
        ...s,
        enabled: steps.find((def) => def.id === s.id)?.enabled ?? s.enabled,
        status: "idle" as StepStatus,
        resultUrl: undefined,
        error: undefined,
      })),
    }));

    for (let i = 0; i < jobsSnapshot.length; i++) {
      const job = jobsSnapshot[i];
      setActiveJobIndex(i);
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "active" } : j));
      const { newSharedModel } = await processJob(job.id, jobsSnapshot, currentSharedModel);
      if (newSharedModel) currentSharedModel = newSharedModel;
    }

    setIsRunning(false);
    toast.success(`Pipeline completado — ${jobsSnapshot.length} imagen(es) procesada(s)`);
  }, [jobs, steps, sharedModelUrl, processJob]);

  /* ---- Manual mode action dispatcher ---- */
  const dispatchAction = useCallback((jobId: string, stepId: StepId, action: "accept" | "skip" | "rerun") => {
    if (action === "rerun") {
      updateStep(jobId, stepId, { status: "idle", resultUrl: undefined, error: undefined });
    }
    window.dispatchEvent(new CustomEvent("pipeline-action", { detail: { jobId, stepId, action } }));
  }, [updateStep]);

  /* ---- Download all results ---- */
  const downloadAll = useCallback(async () => {
    const results: { url: string; name: string }[] = [];
    for (const job of jobs) {
      const base = job.file.name.replace(/\.[^.]+$/, "");
      for (const step of job.steps) {
        if (step.resultUrl && (step.status === "done" || step.status === "accepted")) {
          results.push({ url: step.resultUrl, name: `${base}_${step.id}` });
        }
      }
    }
    for (const { url, name } of results) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = blob.type.includes("video") ? "mp4" : "png";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        /* skip failed downloads */
      }
    }
  }, [jobs]);

  const activeJob = jobs[activeJobIndex];
  const completedCount = jobs.filter((j) => j.status === "done").length;
  const totalCostAll = jobs.reduce((a, j) => a + j.totalCost, 0);
  const estimatedCost = estimateCost(steps, jobs.length);

  /* ================================================================ */
  /*  SETUP PHASE                                                      */
  /* ================================================================ */
  if (phase === "setup") {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-base, #111)" }}>
        {/* Top nav */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/8 bg-black/40 px-6 py-3 backdrop-blur">
          <a href="/editor" className="flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
            <ChevronLeft className="h-4 w-4" />
            Editor
          </a>
          <span className="text-gray-700">/</span>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">Pipeline de Catálogo</span>
          </div>
          <div className="ml-auto">
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">
              Leonisa Lencería
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-8">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Configura tu Pipeline de Catálogo</h1>
            <p className="mt-1 text-sm text-gray-400">
              Sube todas las fotos de una referencia (diferentes colores/ángulos) y genera todo el contenido de e-commerce de una vez.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Upload */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  1 · Fotos del Producto
                </h2>
                <UploadZone onFiles={handleFiles} />

                {/* Uploaded image grid */}
                {jobs.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                    {jobs.map((job) => (
                      <div key={job.id} className="group relative">
                        <img
                          src={job.previewUrl}
                          alt={job.file.name}
                          className="aspect-square w-full rounded-lg object-cover border border-white/10"
                        />
                        <button
                          onClick={() => removeJob(job.id)}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <p className="mt-1 truncate text-[10px] text-gray-500">{job.file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Reference + product type */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  2 · Información del Producto
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Número de referencia</label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="ej. 011473"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Tipo de producto</label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                    >
                      <option value="bra">Brassiere / Top</option>
                      <option value="panty">Panty / Ropa interior</option>
                      <option value="faja">Faja / Shapewear</option>
                      <option value="set">Set completo</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Steps to run */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  3 · Pasos del Pipeline
                </h2>
                <div className="space-y-2">
                  {steps.map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <label
                        key={step.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all",
                          step.enabled
                            ? "border-violet-500/30 bg-violet-500/[0.06]"
                            : "border-white/6 bg-white/[0.01] opacity-60",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={step.enabled}
                          onChange={() => toggleStep(step.id)}
                          className="accent-violet-500"
                        />
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-xs font-bold text-gray-500">
                          {idx + 1}
                        </div>
                        <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{step.label}</p>
                          <p className="text-xs text-gray-500">{step.description}</p>
                        </div>
                        <span className={cn(
                          "shrink-0 text-xs font-semibold",
                          step.id === "model" ? "text-amber-400" : "text-gray-500",
                        )}>
                          {step.id === "model" && jobs.length > 1 ? `${step.cost} (1x)` : `${step.cost}/foto`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Right column — model config + summary */}
            <div className="space-y-5">
              {/* Model config */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Configuración del Modelo IA
                </h2>
                <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  El modelo se genera <strong>una sola vez</strong> y se reutiliza para todas las fotos del producto — optimizando costos.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">Tono de piel</label>
                    <select
                      value={modelConfig.skinTone}
                      onChange={(e) => setModelConfig((m) => ({ ...m, skinTone: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                    >
                      <option value="light">Clara</option>
                      <option value="medium-light">Medio clara</option>
                      <option value="medium">Media</option>
                      <option value="medium-dark">Medio oscura</option>
                      <option value="dark">Oscura</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">Tipo de cuerpo</label>
                    <select
                      value={modelConfig.bodyType}
                      onChange={(e) => setModelConfig((m) => ({ ...m, bodyType: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                    >
                      <option value="slim">Delgada</option>
                      <option value="regular">Regular</option>
                      <option value="curvy">Curvy</option>
                      <option value="plus-size">Plus size</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">Rango de edad</label>
                    <select
                      value={modelConfig.ageRange}
                      onChange={(e) => setModelConfig((m) => ({ ...m, ageRange: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                    >
                      <option value="18-25">18 – 25 años</option>
                      <option value="26-35">26 – 35 años</option>
                      <option value="36-45">36 – 45 años</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Mode toggle */}
              <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Modo de Ejecución</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAutoMode(true)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs transition-all",
                      autoMode
                        ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                        : "border-white/8 bg-white/[0.02] text-gray-400 hover:border-white/15",
                    )}
                  >
                    <Zap className="h-4 w-4" />
                    <span className="font-semibold">Automático</span>
                    <span className="text-center text-[10px] text-gray-500">Todo sin pausas</span>
                  </button>
                  <button
                    onClick={() => setAutoMode(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs transition-all",
                      !autoMode
                        ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                        : "border-white/8 bg-white/[0.02] text-gray-400 hover:border-white/15",
                    )}
                  >
                    <Settings2 className="h-4 w-4" />
                    <span className="font-semibold">Manual</span>
                    <span className="text-center text-[10px] text-gray-500">Revisar cada paso</span>
                  </button>
                </div>
              </section>

              {/* Cost summary + launch */}
              <section className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-5">
                <h2 className="mb-4 text-sm font-semibold text-white">Resumen</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Imágenes</span>
                    <span className="font-medium text-white">{jobs.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Pasos activos</span>
                    <span className="font-medium text-white">{steps.filter((s) => s.enabled).length} de {steps.length}</span>
                  </div>
                  <div className="my-3 border-t border-white/8" />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Costo estimado</span>
                    <span className="text-base font-bold text-violet-300">
                      ${estimatedCost.toFixed(3)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={startPipeline}
                  disabled={jobs.length === 0}
                  className={cn(
                    "mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all",
                    jobs.length > 0
                      ? "bg-violet-600 text-white hover:bg-violet-500 active:scale-[0.98]"
                      : "cursor-not-allowed bg-white/5 text-gray-500",
                  )}
                >
                  <Play className="h-4 w-4" />
                  Iniciar Pipeline
                  {jobs.length > 0 && <span className="ml-1 text-violet-300">({jobs.length} fotos)</span>}
                </button>

                {jobs.length === 0 && (
                  <p className="mt-2 text-center text-xs text-gray-600">Sube al menos una imagen para continuar</p>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  PIPELINE PHASE                                                   */
  /* ================================================================ */
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg-base, #111)" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/8 bg-black/60 px-6 py-3 backdrop-blur">
        <button
          onClick={() => { if (!isRunning) setPhase("setup"); }}
          className={cn(
            "flex items-center gap-2 text-sm font-medium transition-colors",
            isRunning ? "cursor-not-allowed text-gray-600" : "text-gray-400 hover:text-white",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Configuración
        </button>
        <span className="text-gray-700">/</span>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">
            Pipeline{referenceNumber ? ` — Ref. ${referenceNumber}` : ""}
          </span>
        </div>

        {/* Overall progress */}
        <div className="ml-auto flex items-center gap-4">
          {isRunning && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              <span className="text-sm text-gray-400">
                Procesando {activeJobIndex + 1} de {jobs.length}…
              </span>
            </div>
          )}
          {!isRunning && completedCount > 0 && (
            <span className="text-sm text-emerald-400 font-medium">
              ✓ {completedCount} de {jobs.length} completadas
            </span>
          )}
          {!isRunning && completedCount === jobs.length && jobs.length > 0 && (
            <button
              onClick={downloadAll}
              className="flex items-center gap-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-600/30"
            >
              <Download className="h-4 w-4" />
              Descargar todo
            </button>
          )}
          {totalCostAll > 0 && (
            <span className="text-xs text-gray-500">
              Gastado: <span className="font-semibold text-gray-300">${totalCostAll.toFixed(3)}</span>
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — image list */}
        <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-white/8 p-3 lg:block">
          <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Imágenes ({jobs.length})
          </p>
          <div className="space-y-1.5">
            {jobs.map((job, idx) => (
              <button
                key={job.id}
                onClick={() => setActiveJobIndex(idx)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-all",
                  idx === activeJobIndex
                    ? "border border-violet-500/30 bg-violet-500/10"
                    : "border border-transparent hover:bg-white/[0.03]",
                )}
              >
                <div className="relative shrink-0">
                  <img
                    src={job.previewUrl}
                    alt={job.file.name}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                  {job.status === "done" && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                  {job.status === "active" && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500">
                      <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-white">{job.file.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {job.status === "done"
                      ? `$${job.totalCost.toFixed(3)}`
                      : job.status === "active"
                      ? "Procesando…"
                      : "En cola"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content — step cards */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeJob && (
            <div className="mx-auto max-w-3xl space-y-4">
              {/* Image header */}
              <div className="mb-6 flex items-center gap-4">
                <img
                  src={activeJob.previewUrl}
                  alt={activeJob.file.name}
                  className="h-14 w-14 rounded-lg border border-white/10 object-cover"
                />
                <div>
                  <h2 className="text-base font-bold text-white">{activeJob.file.name}</h2>
                  <p className="text-sm text-gray-400">
                    {activeJob.status === "done"
                      ? `Completado · costo: $${activeJob.totalCost.toFixed(3)}`
                      : activeJob.status === "active"
                      ? "Procesando…"
                      : "En cola"}
                  </p>
                </div>
                {/* Mobile: image navigation */}
                <div className="ml-auto flex items-center gap-2 lg:hidden">
                  <button
                    onClick={() => setActiveJobIndex((i) => Math.max(0, i - 1))}
                    disabled={activeJobIndex === 0}
                    className="rounded-lg border border-white/10 p-1.5 text-gray-400 disabled:opacity-30 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-gray-500">{activeJobIndex + 1} / {jobs.length}</span>
                  <button
                    onClick={() => setActiveJobIndex((i) => Math.min(jobs.length - 1, i + 1))}
                    disabled={activeJobIndex === jobs.length - 1}
                    className="rounded-lg border border-white/10 p-1.5 text-gray-400 disabled:opacity-30 hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Step cards */}
              {activeJob.steps.filter((s) => s.enabled).map((step, idx, arr) => {
                const prevStep = arr[idx - 1];
                const isActive = step.status === "processing" || (step.status === "done" && !autoMode);
                return (
                  <StepCard
                    key={step.id}
                    step={step}
                    stepNumber={idx + 1}
                    isActive={isActive}
                    previousResultUrl={prevStep?.resultUrl || activeJob.uploadedUrl || activeJob.previewUrl}
                    onAccept={() => dispatchAction(activeJob.id, step.id, "accept")}
                    onSkip={() => dispatchAction(activeJob.id, step.id, "skip")}
                    onRerun={() => dispatchAction(activeJob.id, step.id, "rerun")}
                    autoMode={autoMode}
                  />
                );
              })}

              {/* Completion summary */}
              {activeJob.status === "done" && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-white">Imagen procesada</p>
                      <p className="text-sm text-gray-400">
                        Costo total: <span className="font-medium text-emerald-400">${activeJob.totalCost.toFixed(3)}</span>
                      </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      {activeJobIndex < jobs.length - 1 && (
                        <button
                          onClick={() => setActiveJobIndex(activeJobIndex + 1)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 hover:border-white/20 hover:text-white"
                        >
                          Siguiente imagen
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
