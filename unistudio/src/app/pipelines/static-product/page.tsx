"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Upload,
  X,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Sparkles,
  Download,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";
import {
  getAdaptiveBgConfig,
  PRODUCT_TYPE_LABELS,
  BRAND_LABELS,
  STATIC_PRODUCT_ENHANCE_NORMALIZE,
  type StaticProductType,
  type StaticBrand,
} from "@/lib/pipelines/static-product";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type JobStatus = "idle" | "uploading" | "isolating" | "normalizing" | "generating-bg" | "shadowing" | "finishing" | "done" | "error";

interface Job {
  id: string;
  file: File;
  previewUrl: string;
  productType: StaticProductType;
  brand: StaticBrand;
  status: JobStatus;
  resultUrl?: string;
  error?: string;
  cost: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

async function safeJson(res: Response): Promise<{ success: boolean; data?: any; error?: string; cost?: number }> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.length > 100 ? text.slice(0, 100) + "..." : text || `HTTP ${res.status}`);
  }
}

const STATUS_LABEL: Record<JobStatus, string> = {
  idle: "Listo",
  uploading: "Subiendo...",
  isolating: "Quitando fondo...",
  normalizing: "Centrando en 2000×2000...",
  "generating-bg": "Generando fondo adaptativo...",
  shadowing: "Agregando sombra...",
  finishing: "Ajustes finales...",
  done: "Listo",
  error: "Error",
};

function StatusPill({ status }: { status: JobStatus }) {
  const isError = status === "error";
  const isDone = status === "done";
  const isActive = !["idle", "done", "error"].includes(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        isError && "bg-red-500/15 text-red-300",
        isDone && "bg-emerald-500/15 text-emerald-300",
        isActive && "bg-amber-500/15 text-amber-300",
        !isError && !isDone && !isActive && "bg-white/5 text-gray-400",
      )}
    >
      {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
      {isDone && <CheckCircle2 className="h-3 w-3" />}
      {isError && <AlertCircle className="h-3 w-3" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Upload zone                                                         */
/* ------------------------------------------------------------------ */

function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    onFiles(Array.from(files).filter((f) => f.type.startsWith("image/")));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all cursor-pointer",
        dragOver
          ? "border-violet-400/60 bg-violet-500/5"
          : "border-white/10 bg-white/[0.02] hover:border-white/20",
      )}
    >
      <Upload className="h-6 w-6 text-gray-400" />
      <div>
        <p className="text-sm font-medium text-gray-200">Arrastra fotos aquí o haz click</p>
        <p className="mt-1 text-xs text-gray-500">Perfumes, cremas, bloqueador, desodorantes, limpieza facial, maquillaje</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                      */
/* ------------------------------------------------------------------ */

export default function StaticProductPipelinePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [defaultType, setDefaultType] = useState<StaticProductType>("perfume");
  const [defaultBrand, setDefaultBrand] = useState<StaticBrand>("other");
  const previewUrlsRef = useRef<string[]>([]);

  // Read URL params from auto-mode redirect (e.g., ?productType=perfume)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pt = params.get("productType") as StaticProductType | null;
    const br = params.get("brand") as StaticBrand | null;
    if (pt && pt in PRODUCT_TYPE_LABELS) setDefaultType(pt);
    if (br && br in BRAND_LABELS) setDefaultBrand(br);
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      previewUrlsRef.current = [];
    };
  }, []);

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const newJobs: Job[] = files.map((file, i) => {
        const preview = URL.createObjectURL(file);
        previewUrlsRef.current.push(preview);
        return {
          id: `job-${Date.now()}-${i}`,
          file,
          previewUrl: preview,
          productType: defaultType,
          brand: defaultBrand,
          status: "idle",
          cost: 0,
        };
      });
      setJobs((prev) => [...prev, ...newJobs]);
    },
    [defaultType, defaultBrand],
  );

  const updateJob = (id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const processJob = async (job: Job): Promise<void> => {
    const config = getAdaptiveBgConfig(job.productType, job.brand);
    let currentUrl: string;
    let totalCost = 0;

    try {
      // 1. Upload
      updateJob(job.id, { status: "uploading" });
      const form = new FormData();
      form.append("file", job.file);
      const upRes = await fetch("/api/upload", { method: "POST", body: form });
      const upData = await safeJson(upRes);
      if (!upData.success) throw new Error(upData.error || "Upload failed");
      currentUrl = upData.data.url;

      // 2. Remove background
      updateJob(job.id, { status: "isolating" });
      const bgRes = await fetch("/api/bg-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: currentUrl, provider: "replicate" }),
      });
      const bgData = await safeJson(bgRes);
      if (!bgData.success) throw new Error(bgData.error || "Background removal failed");
      currentUrl = bgData.data.url || bgData.data.imageUrl;
      totalCost += bgData.cost ?? 0.01;

      // 3. Normalize canvas (center in 2000x2000 1:1)
      updateJob(job.id, { status: "normalizing" });
      const normRes = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentUrl,
          preset: STATIC_PRODUCT_ENHANCE_NORMALIZE.preset,
          canvas: STATIC_PRODUCT_ENHANCE_NORMALIZE.canvas,
        }),
      });
      const normData = await safeJson(normRes);
      if (!normData.success) {
        // enhance has a resize fallback — if preset is unknown, it falls back to identity.
        // Don't fail the pipeline; keep currentUrl as-is.
        console.warn("[static-product] normalize step soft-failed:", normData.error);
      } else {
        currentUrl = normData.data.url || normData.data.imageUrl || currentUrl;
      }

      // 4. Generate adaptive background
      updateJob(job.id, { status: "generating-bg" });
      const genRes = await fetch("/api/bg-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentUrl,
          prompt: config.prompt,
          mode: config.bgMode,
        }),
      });
      const genData = await safeJson(genRes);
      if (!genData.success) throw new Error(genData.error || "Background generation failed");
      currentUrl = genData.data.url || genData.data.imageUrl;
      totalCost += genData.cost ?? (config.bgMode === "precise" ? 0.05 : 0.003);

      // 5. Shadows
      updateJob(job.id, { status: "shadowing" });
      const shRes = await fetch("/api/shadows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentUrl,
          type: config.shadowType,
        }),
      });
      const shData = await safeJson(shRes);
      if (shData.success) {
        currentUrl = shData.data.url || shData.data.imageUrl || currentUrl;
        totalCost += shData.cost ?? 0;
      } else {
        console.warn("[static-product] shadow step soft-failed:", shData.error);
      }

      // 6. Final color pop enhance
      updateJob(job.id, { status: "finishing" });
      const finRes = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentUrl,
          preset: "product-clean",
        }),
      });
      const finData = await safeJson(finRes);
      if (finData.success) {
        currentUrl = finData.data.url || finData.data.imageUrl || currentUrl;
      }

      updateJob(job.id, { status: "done", resultUrl: currentUrl, cost: totalCost });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      updateJob(job.id, { status: "error", error: message });
      toast.error(`Error en ${job.file.name}: ${message}`);
    }
  };

  const handleProcessAll = async () => {
    if (isRunning) return;
    const pending = jobs.filter((j) => j.status === "idle" || j.status === "error");
    if (pending.length === 0) {
      toast.info("No hay fotos pendientes de procesar.");
      return;
    }
    setIsRunning(true);
    try {
      for (const job of pending) {
        await processJob(job);
      }
      toast.success(`${pending.length} foto(s) procesada(s).`);
    } finally {
      setIsRunning(false);
    }
  };

  const totalCost = jobs.reduce((sum, j) => sum + j.cost, 0);
  const doneCount = jobs.filter((j) => j.status === "done").length;

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/8 bg-black/40 px-6 py-3 backdrop-blur">
        <a href="/editor" className="flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
          <ChevronLeft className="h-4 w-4" />
          Editor
        </a>
        <span className="text-gray-700">/</span>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Pipeline de Estáticos</span>
        </div>
        <div className="ml-auto">
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
            Perfumes · Cremas · Skincare · Maquillaje
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Pipeline de Productos Estáticos</h1>
          <p className="mt-1 text-sm text-gray-400">
            Perfumes, cremas, bloqueador, desodorantes, limpieza facial y maquillaje. El pipeline detecta el producto y aplica un fondo apropiado (sin fondo blanco genérico — decide por categoría y marca, como Sephora/La Mer/MAC).
          </p>
        </div>

        {/* Defaults + upload */}
        <section className="mb-6 rounded-xl border border-white/8 bg-white/[0.02] p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            1 · Sube tus fotos
          </h2>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Tipo por defecto (aplicado a lo que subas)</label>
              <select
                value={defaultType}
                onChange={(e) => setDefaultType(e.target.value as StaticProductType)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
              >
                {Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Marca por defecto</label>
              <select
                value={defaultBrand}
                onChange={(e) => setDefaultBrand(e.target.value as StaticBrand)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
              >
                {Object.entries(BRAND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <UploadZone onFiles={handleFiles} />
        </section>

        {/* Jobs list */}
        {jobs.length > 0 && (
          <section className="mb-6 rounded-xl border border-white/8 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                2 · Revisa y procesa ({jobs.length} foto{jobs.length !== 1 && "s"})
              </h2>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>${totalCost.toFixed(3)} acumulado</span>
                <span>{doneCount}/{jobs.length} listas</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {jobs.map((job) => {
                const cfg = getAdaptiveBgConfig(job.productType, job.brand);
                return (
                  <div
                    key={job.id}
                    className="flex gap-3 rounded-lg border border-white/8 bg-black/30 p-3"
                  >
                    {/* Preview */}
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded border border-white/10 bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={job.resultUrl ?? job.previewUrl}
                        alt={job.file.name}
                        className="h-full w-full object-contain"
                      />
                      {job.status === "done" && job.resultUrl && (
                        <a
                          href={job.resultUrl}
                          download={`${job.file.name.replace(/\.[^.]+$/, "")}-static.jpg`}
                          className="absolute bottom-1 right-1 rounded bg-black/70 p-1 text-white transition hover:bg-black"
                          title="Descargar resultado"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-gray-200" title={job.file.name}>
                          {job.file.name}
                        </p>
                        <button
                          onClick={() => removeJob(job.id)}
                          disabled={isRunning}
                          className="text-gray-500 hover:text-red-400 disabled:opacity-30"
                          title="Quitar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={job.productType}
                          onChange={(e) => updateJob(job.id, { productType: e.target.value as StaticProductType })}
                          disabled={isRunning || job.status !== "idle"}
                          className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white disabled:opacity-50"
                        >
                          {Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <select
                          value={job.brand}
                          onChange={(e) => updateJob(job.id, { brand: e.target.value as StaticBrand })}
                          disabled={isRunning || job.status !== "idle"}
                          className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white disabled:opacity-50"
                        >
                          {Object.entries(BRAND_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="flex items-center gap-1 truncate text-[11px] text-violet-300"
                          title={cfg.prompt}
                        >
                          <Wand2 className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        <StatusPill status={job.status} />
                      </div>

                      {job.error && (
                        <p className="text-[11px] text-red-400" title={job.error}>
                          {job.error.length > 80 ? job.error.slice(0, 80) + "..." : job.error}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Actions */}
        {jobs.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleProcessAll}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-500/50"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? "Procesando..." : "Procesar todas"}
            </button>
            <button
              onClick={() => {
                jobs.forEach((j) => URL.revokeObjectURL(j.previewUrl));
                previewUrlsRef.current = [];
                setJobs([]);
              }}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Limpiar todo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
