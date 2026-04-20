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
  Gem,
  Sparkles,
  Download,
  User,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";
import {
  getJewelryConfig,
  SUB_TYPE_LABELS,
  JEWELRY_UPSCALE_CONFIG,
  type JewelrySubType,
} from "@/lib/pipelines/jewelry";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type JobStatus =
  | "idle"
  | "uploading"
  | "isolating"
  | "upscaling"
  | "generating-estante"
  | "generating-model"
  | "generating-video"
  | "done"
  | "error";

interface Job {
  id: string;
  file: File;
  previewUrl: string;
  subType: JewelrySubType;
  status: JobStatus;
  estanteUrl?: string;
  modelUrl?: string;
  videoUrl?: string;
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
  upscaling: "Upscale 2x...",
  "generating-estante": "Generando estante...",
  "generating-model": "Generando foto en modelo...",
  "generating-video": "Generando video 360°...",
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
          ? "border-amber-400/60 bg-amber-500/5"
          : "border-white/10 bg-white/[0.02] hover:border-white/20",
      )}
    >
      <Upload className="h-6 w-6 text-gray-400" />
      <div>
        <p className="text-sm font-medium text-gray-200">Arrastra fotos de joyería aquí o haz click</p>
        <p className="mt-1 text-xs text-gray-500">Aretes, cadenas, anillos, pulseras, topos, candongas, sets</p>
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

export default function JewelryPipelinePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [defaultSubType, setDefaultSubType] = useState<JewelrySubType>("earrings");
  const [includeModel, setIncludeModel] = useState(true);
  const [includeVideo, setIncludeVideo] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);

  // Read URL params from auto-mode redirect (e.g., ?subType=earrings)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const st = params.get("subType") as JewelrySubType | null;
    if (st && st in SUB_TYPE_LABELS) setDefaultSubType(st);
  }, []);

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
          subType: defaultSubType,
          status: "idle",
          cost: 0,
        };
      });
      setJobs((prev) => [...prev, ...newJobs]);
    },
    [defaultSubType],
  );

  const updateJob = (id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const processJob = async (job: Job): Promise<void> => {
    const config = getJewelryConfig(job.subType);
    let totalCost = 0;

    try {
      // 1. Upload
      updateJob(job.id, { status: "uploading" });
      const form = new FormData();
      form.append("file", job.file);
      const upRes = await fetch("/api/upload", { method: "POST", body: form });
      const upData = await safeJson(upRes);
      if (!upData.success) throw new Error(upData.error || "Upload failed");
      let workingUrl: string = upData.data.url;

      // 2. Remove background (jewelry usually isolated, but safe to re-run)
      updateJob(job.id, { status: "isolating" });
      const bgRes = await fetch("/api/bg-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: workingUrl, provider: "replicate" }),
      });
      const bgData = await safeJson(bgRes);
      if (!bgData.success) throw new Error(bgData.error || "Background removal failed");
      workingUrl = bgData.data.url || bgData.data.imageUrl;
      totalCost += bgData.cost ?? 0.01;

      // 3. Upscale 2x — ALWAYS required for jewelry detail
      updateJob(job.id, { status: "upscaling" });
      const upsRes = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: workingUrl,
          provider: JEWELRY_UPSCALE_CONFIG.provider,
          scale: JEWELRY_UPSCALE_CONFIG.scale,
        }),
      });
      const upsData = await safeJson(upsRes);
      if (upsData.success) {
        workingUrl = upsData.data.url || upsData.data.imageUrl || workingUrl;
        totalCost += upsData.cost ?? 0.02;
      } else {
        console.warn("[jewelry] upscale soft-failed:", upsData.error);
      }

      const isolatedUrl = workingUrl;

      // 4. Generate ESTANTE (display shot) — always
      updateJob(job.id, { status: "generating-estante" });
      const estanteRes = await fetch("/api/bg-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: isolatedUrl,
          prompt: config.estantePrompt,
          mode: "precise",
        }),
      });
      const estanteData = await safeJson(estanteRes);
      if (!estanteData.success) throw new Error(estanteData.error || "Estante generation failed");
      const estanteUrl: string = estanteData.data.url || estanteData.data.imageUrl;
      totalCost += estanteData.cost ?? 0.05;
      updateJob(job.id, { estanteUrl });

      // 5. Optional: Generate MODELO (jewelry on a person)
      let modelUrl: string | undefined;
      if (includeModel) {
        updateJob(job.id, { status: "generating-model" });
        try {
          // 5a. Create model photo
          const modelRes = await fetch("/api/model-create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: config.modelPrompt,
            }),
          });
          const modelData = await safeJson(modelRes);
          if (!modelData.success) throw new Error(modelData.error || "Model create failed");
          const modelPhotoUrl: string = modelData.data.url || modelData.data.imageUrl;
          totalCost += modelData.cost ?? 0.055;

          // 5b. Place jewelry on the model
          const tryonRes = await fetch("/api/jewelry-tryon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              modelImageUrl: modelPhotoUrl,
              jewelryImageUrl: isolatedUrl,
              prompt: config.tryonPrompt,
              bodyPart: config.bodyPart,
            }),
          });
          const tryonData = await safeJson(tryonRes);
          if (tryonData.success) {
            modelUrl = tryonData.data.url || tryonData.data.imageUrl;
            totalCost += tryonData.cost ?? 0.05;
            updateJob(job.id, { modelUrl });
          } else {
            console.warn("[jewelry] tryon soft-failed:", tryonData.error);
            toast.error(`Modelo para ${job.file.name} falló — estante OK.`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("[jewelry] model step soft-failed:", msg);
          toast.error(`Modelo para ${job.file.name}: ${msg}`);
        }
      }

      // 6. Optional: Generate VIDEO (Ken Burns 360° over estante)
      let videoUrl: string | undefined;
      if (includeVideo) {
        updateJob(job.id, { status: "generating-video" });
        try {
          const videoRes = await fetch("/api/video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: estanteUrl,
              provider: "kenburns",
              duration: 5,
              aspectRatio: "1:1",
            }),
          });
          const videoData = await safeJson(videoRes);
          if (videoData.success) {
            videoUrl = videoData.data.url || videoData.data.videoUrl;
            updateJob(job.id, { videoUrl });
          } else {
            console.warn("[jewelry] video soft-failed:", videoData.error);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("[jewelry] video step soft-failed:", msg);
        }
      }

      updateJob(job.id, { status: "done", cost: totalCost });
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
      toast.success(`${pending.length} pieza(s) procesada(s).`);
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
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/8 bg-black/40 px-6 py-3 backdrop-blur">
        <a href="/editor" className="flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
          <ChevronLeft className="h-4 w-4" />
          Editor
        </a>
        <span className="text-gray-700">/</span>
        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Pipeline de Joyería</span>
        </div>
        <div className="ml-auto">
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
            Aretes · Cadenas · Anillos · Pulseras · Sets
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Pipeline de Joyería</h1>
          <p className="mt-1 text-sm text-gray-400">
            Sube fotos de tus piezas y el pipeline genera: (1) foto de estante con fondo de lujo, (2) foto en modelo con la pieza en el lugar correcto del cuerpo (orejas / cuello / mano / muñeca), (3) video 360° del producto.
          </p>
        </div>

        {/* Defaults + toggles + upload */}
        <section className="mb-6 rounded-xl border border-white/8 bg-white/[0.02] p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            1 · Configura y sube
          </h2>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Tipo por defecto</label>
              <select
                value={defaultSubType}
                onChange={(e) => setDefaultSubType(e.target.value as JewelrySubType)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
              >
                {Object.entries(SUB_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="includeModel"
                type="checkbox"
                checked={includeModel}
                onChange={(e) => setIncludeModel(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.04] text-amber-500"
              />
              <label htmlFor="includeModel" className="flex items-center gap-1.5 text-sm text-gray-200 cursor-pointer">
                <User className="h-4 w-4 text-amber-400" />
                Incluir foto en modelo
                <span className="text-[11px] text-gray-500">(+$0.10)</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="includeVideo"
                type="checkbox"
                checked={includeVideo}
                onChange={(e) => setIncludeVideo(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.04] text-amber-500"
              />
              <label htmlFor="includeVideo" className="flex items-center gap-1.5 text-sm text-gray-200 cursor-pointer">
                <Film className="h-4 w-4 text-amber-400" />
                Incluir video 360°
                <span className="text-[11px] text-gray-500">(gratis)</span>
              </label>
            </div>
          </div>

          <UploadZone onFiles={handleFiles} />
        </section>

        {jobs.length > 0 && (
          <section className="mb-6 rounded-xl border border-white/8 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                2 · Revisa y procesa ({jobs.length} pieza{jobs.length !== 1 && "s"})
              </h2>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>${totalCost.toFixed(3)} acumulado</span>
                <span>{doneCount}/{jobs.length} listas</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {jobs.map((job) => {
                const cfg = getJewelryConfig(job.subType);
                return (
                  <div
                    key={job.id}
                    className="rounded-lg border border-white/8 bg-black/30 p-3"
                  >
                    <div className="flex gap-3">
                      {/* Input preview */}
                      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded border border-white/10 bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={job.previewUrl}
                          alt={job.file.name}
                          className="h-full w-full object-contain"
                        />
                      </div>

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

                        <div className="flex items-center gap-2">
                          <select
                            value={job.subType}
                            onChange={(e) => updateJob(job.id, { subType: e.target.value as JewelrySubType })}
                            disabled={isRunning || job.status !== "idle"}
                            className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white disabled:opacity-50"
                          >
                            {Object.entries(SUB_TYPE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <span className="text-[11px] text-amber-300">{cfg.label}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <StatusPill status={job.status} />
                          {job.error && (
                            <p className="text-[11px] text-red-400 truncate max-w-md" title={job.error}>
                              {job.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Results row */}
                    {job.status === "done" && (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {job.estanteUrl && (
                          <ResultCard label="Estante" url={job.estanteUrl} filename={`${job.file.name.replace(/\.[^.]+$/, "")}-estante.jpg`} />
                        )}
                        {job.modelUrl && (
                          <ResultCard label="En modelo" url={job.modelUrl} filename={`${job.file.name.replace(/\.[^.]+$/, "")}-modelo.jpg`} />
                        )}
                        {job.videoUrl && (
                          <ResultCard label="Video 360°" url={job.videoUrl} filename={`${job.file.name.replace(/\.[^.]+$/, "")}.mp4`} isVideo />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {jobs.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleProcessAll}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/50"
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

function ResultCard({ label, url, filename, isVideo }: { label: string; url: string; filename: string; isVideo?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded border border-white/10 bg-black">
      {isVideo ? (
        <video src={url} className="h-32 w-full object-contain" controls />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={url} alt={label} className="h-32 w-full object-contain" />
      )}
      <div className="flex items-center justify-between bg-black/60 px-2 py-1">
        <span className="text-[11px] font-medium text-amber-300">{label}</span>
        <a
          href={url}
          download={filename}
          className="rounded p-0.5 text-gray-300 transition hover:text-white"
          title={`Descargar ${label}`}
        >
          <Download className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
