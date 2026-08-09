"use client";

/* =============================================================================
 * Pipeline de Joyería — UniStudio
 * =============================================================================
 * Convierte una foto de celular de una joya en el set completo que hace falta
 * para venderla en línea:
 *
 *   1. Quitar fondo   → recorte transparente (base de todo lo demás)
 *   2. Nitidez        → 2x resolución, para que se lean eslabones y engastes
 *   3. Catálogo       → packshot fondo blanco, el que piden los marketplaces
 *   4. Escena de lujo → terciopelo/mármol, el que va a redes
 *   5. Detalle macro  → zoom con PÍXELES REALES, sin IA (prueba del acabado)
 *   6. En modelo      → opcional, la pieza puesta sobre una modelo IA
 *   7. Video          → opcional, cámara girando sobre la escena de lujo
 *
 * NINGÚN PASO FRENA A LOS DEMÁS. La versión anterior hacía hard-fail en el
 * upscale: una sola caída de GPU dejaba a la usuaria sin packshot, sin estante,
 * sin detalle, sin modelo y sin video — que es exactamente el bug que se veía
 * en producción como "Failed to run model nightmareai/real-esrgan".
 *
 * Doc: docs/pipelines/jewelry.md
 * ========================================================================== */

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  Download,
  Film,
  Gem,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Scissors,
  SkipForward,
  Sparkles,
  Square,
  StopCircle,
  Upload,
  User,
  X,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "@/hooks/use-toast";
import { useGalleryStore } from "@/stores/gallery-store";
import {
  getJewelryConfig,
  SUB_TYPE_LABELS,
  JEWELRY_UPSCALE_CONFIG,
  withJewelryPreserve,
  type JewelrySubType,
} from "@/lib/pipelines/jewelry";
import {
  jewelryDescriptor,
  type JewelryFeatures,
} from "@/lib/processing/product-features";
import {
  BeforeAfterSlider,
  ImageLightbox,
  ImageThumb,
  StatusBadge,
  downloadAsset,
  fmtClock,
  isVideoUrl,
  urlToDataUrl,
  useElapsedSeconds,
  type PipelineStepStatus,
} from "@/components/pipeline/primitives";
import type { JewelryStepKey } from "@/lib/i18n/pipelines/jewelry";

/* ------------------------------------------------------------------ */
/*  Modelo de datos                                                     */
/* ------------------------------------------------------------------ */

type StepKey = JewelryStepKey;
type Phase = "setup" | "pipeline";

/** Orden de ejecución. Es también el orden en que se pintan las tarjetas. */
const STEP_ORDER: StepKey[] = [
  "isolate",
  "sharpen",
  "packshot",
  "estante",
  "macro",
  "modelo",
  "video",
];

const STEP_ICONS: Record<StepKey, React.ElementType> = {
  isolate: Scissors,
  sharpen: Sparkles,
  packshot: Square,
  estante: Gem,
  macro: ZoomIn,
  modelo: User,
  video: Film,
};

/** Costo estimado por paso, en dólares. Se usa para el presupuesto previo. */
const STEP_COST: Record<StepKey, number> = {
  isolate: 0.01,
  sharpen: 0.02,
  packshot: 0.05,
  estante: 0.05,
  macro: 0,
  modelo: 0.1,
  video: 0.05,
};

/** Pasos que la usuaria puede apagar antes de correr. El resto van siempre. */
const OPTIONAL_STEPS: StepKey[] = ["modelo", "video"];

interface StepState {
  status: PipelineStepStatus;
  enabled: boolean;
  /** Imagen que entró a este paso — el "antes" del comparador. */
  inputUrl?: string;
  resultUrl?: string;
  error?: string;
  cost: number;
  /** Aviso no bloqueante: p. ej. el chequeo de identidad detectó que la joya cambió. */
  warning?: string;
}

interface Job {
  id: string;
  file: File;
  filename: string;
  previewUrl: string;
  uploadedUrl?: string;
  subType: JewelrySubType;
  steps: Record<StepKey, StepState>;
  status: "idle" | "active" | "done" | "error";
  totalCost: number;
  /**
   * Ficha que Claude Vision extrae de ESTA foto (material, acabado, piedras).
   * Se inyecta en los prompts de packshot/estante/modelo para anclar la IA al
   * producto real en vez de a una plantilla genérica por sub-tipo.
   */
  productFeatures?: JewelryFeatures | null;
  analysisStatus: "pending" | "analyzing" | "done" | "error";
}

function makeSteps(includeModel: boolean, includeVideo: boolean): Record<StepKey, StepState> {
  const base = {} as Record<StepKey, StepState>;
  for (const key of STEP_ORDER) {
    const optional = OPTIONAL_STEPS.includes(key);
    const enabled = !optional || (key === "modelo" ? includeModel : includeVideo);
    base[key] = { status: "idle", enabled, cost: 0 };
  }
  return base;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

async function safeJson(
  res: Response,
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; cost?: number }> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.length > 160 ? text.slice(0, 160) + "…" : text || `HTTP ${res.status}`);
  }
}

/** Extrae la URL de una respuesta de módulo, que usa `url`, `imageUrl` o `videoUrl`. */
function pickUrl(data?: Record<string, unknown>): string | undefined {
  if (!data) return undefined;
  const candidate = data.url ?? data.imageUrl ?? data.videoUrl;
  return typeof candidate === "string" ? candidate : undefined;
}

/* ------------------------------------------------------------------ */
/*  Zona de carga                                                       */
/* ------------------------------------------------------------------ */

function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const { t } = useI18n();
  const jt = t.pipelines.jewelry;
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
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all",
        dragOver
          ? "border-[var(--accent)]/60 bg-[var(--accent-glow)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-dim)]">
        <Upload className="h-5 w-5 text-[var(--accent)]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{jt.upload.cta}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{jt.upload.hint}</p>
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
/*  Tarjeta de paso                                                     */
/* ------------------------------------------------------------------ */

interface StepCardProps {
  stepKey: StepKey;
  step: StepState;
  stepNumber: number;
  isActive: boolean;
  busy: boolean;
  filenamePrefix: string;
  onAccept: () => void;
  onSkip: () => void;
  onRerun: () => void;
  onStop?: () => void;
}

function StepCard({
  stepKey,
  step,
  stepNumber,
  isActive,
  busy,
  filenamePrefix,
  onAccept,
  onSkip,
  onRerun,
  onStop,
}: StepCardProps) {
  const { t } = useI18n();
  const jt = t.pipelines.jewelry;
  const copy = jt.steps[stepKey];
  const Icon = STEP_ICONS[stepKey];

  const [showDocs, setShowDocs] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // VISTA PREVIA AL PASAR EL MOUSE, sin clic. Escalar la tarjeta un 3% no
  // alcanza para juzgar el acabado de una joya: el zoom tiene que ser
  // generoso y obvio. El retardo de 180 ms es hover-intent — sin él el
  // preview se dispara al pasar de largo scrolleando y la página parpadea.
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openPeek = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeek(true), 180);
  };
  const closePeek = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setPeek(false);
  };
  useEffect(
    () => () => {
      if (peekTimer.current) clearTimeout(peekTimer.current);
    },
    [],
  );

  const elapsed = useElapsedSeconds(step.status === "processing");
  const canInteract =
    (step.status === "done" || step.status === "accepted" || step.status === "error") && !busy;

  return (
    <div
      data-step-id={stepKey}
      className={cn(
        "lz-rise rounded-2xl border transition-all duration-300",
        step.status === "processing"
          ? "lz-glow border-[var(--accent)]/35 bg-gradient-to-b from-[var(--accent-glow)] to-transparent"
          : step.status === "done" || step.status === "accepted"
            ? "border-[var(--border-accent)] bg-[var(--accent)]/[0.02]"
            : step.status === "skipped"
              ? "border-white/5 bg-white/[0.01] opacity-60"
              : step.status === "error"
                ? "border-red-500/30 bg-red-500/[0.03]"
                : isActive
                  ? "border-[var(--accent)]/30 bg-[var(--accent-glow)]"
                  : "border-white/8 bg-white/[0.02]",
      )}
    >
      {/* Encabezado */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative shrink-0">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors",
                step.status === "done" || step.status === "accepted"
                  ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                  : step.status === "processing"
                    ? "bg-gradient-to-br from-[var(--accent)]/25 to-[var(--accent-muted)]/15 text-[var(--accent-light)]"
                    : step.status === "error"
                      ? "bg-red-500/15 text-red-300"
                      : isActive
                        ? "bg-[var(--accent)]/12 text-[var(--accent-light)]"
                        : "bg-white/[0.06] text-[var(--text-secondary)]",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
            {(step.status === "done" || step.status === "accepted") && (
              <span className="lz-pop absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg-primary)]">
                <Check className="h-2.5 w-2.5 text-black/80" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                {jt.stepCard.step} {stepNumber}
              </span>
              <button
                type="button"
                onClick={() => setShowDocs((s) => !s)}
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full transition-colors",
                  showDocs
                    ? "bg-[var(--accent)]/30 text-[var(--accent-light)]"
                    : "bg-white/10 text-[var(--text-secondary)] hover:bg-[var(--accent)]/20 hover:text-[var(--accent-light)]",
                )}
                title={jt.stepCard.infoTitle}
                aria-label={jt.stepCard.infoAria}
              >
                <Info className="h-3 w-3" />
              </button>
            </div>
            <span className="block truncate text-[15px] font-semibold text-white">{copy.label}</span>
            <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{copy.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs font-medium text-[var(--text-secondary)] sm:inline">
            {step.status === "done" || step.status === "accepted"
              ? step.cost > 0
                ? `$${step.cost.toFixed(3)}`
                : copy.costHint
              : copy.costHint}
          </span>
          <StatusBadge status={step.status} labels={jt.statusBadge} />
          {step.status === "processing" && onStop && (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
              title={jt.stepCard.stopTitle}
            >
              <StopCircle className="h-3 w-3" />
              {jt.buttons.stop}
            </button>
          )}
        </div>
      </div>

      {/* Panel de documentación */}
      {showDocs && (
        <div className="border-b border-white/6 bg-[var(--accent)]/[0.03] px-5 py-4 text-xs">
          <div className="space-y-3">
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {jt.stepCard.docsWhat}
              </p>
              <p className="text-gray-300">{copy.what}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {jt.stepCard.docsProvider}
                </p>
                <p className="text-[var(--text-secondary)]">{copy.provider}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {jt.stepCard.docsDuration}
                </p>
                <p className="text-[var(--text-secondary)]">{copy.duration}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {jt.stepCard.docsCost}
                </p>
                <p className="text-[var(--text-secondary)]">{copy.costDetail}</p>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {jt.stepCard.docsCanFail}
              </p>
              <ul className="list-disc space-y-0.5 pl-4 text-[var(--text-secondary)]">
                {copy.canFail.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {jt.stepCard.docsTips}
              </p>
              <ul className="list-disc space-y-0.5 pl-4 text-gray-300">
                {copy.tips.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Cuerpo */}
      <div className="px-5 py-4">
        {step.status === "processing" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
            <p className="text-sm text-gray-300">{copy.processing[elapsed % 3]}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {fmtClock(elapsed)} · {copy.eta}
            </p>
          </div>
        ) : (
          <div
            onMouseEnter={step.resultUrl ? openPeek : undefined}
            onMouseLeave={closePeek}
            className="relative"
          >
            <button
              type="button"
              onClick={() => step.resultUrl && setLightboxOpen(true)}
              disabled={!step.resultUrl}
              className="w-full cursor-zoom-in disabled:cursor-default"
              title={step.resultUrl ? jt.stepCard.zoomHint : undefined}
            >
              <BeforeAfterSlider
                before={step.inputUrl}
                after={step.resultUrl}
                label={copy.label}
                className="h-56 w-full"
                labels={{ ...jt.beforeAfter, ...jt.thumb }}
              />
            </button>
            {step.resultUrl && (
              <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                {jt.stepCard.zoomHint}
              </p>
            )}
          </div>
        )}

        {step.status === "error" && step.error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300" />
            <p className="text-xs leading-relaxed text-red-200">{step.error}</p>
          </div>
        )}

        {step.warning && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-amber-200">{step.warning}</p>
          </div>
        )}

        {/* Acciones */}
        {canInteract && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {step.status !== "accepted" && step.resultUrl && (
              <button
                type="button"
                onClick={onAccept}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--bg-primary)] transition-colors hover:brightness-110"
              >
                <Check className="h-3.5 w-3.5" />
                {jt.buttons.accept}
              </button>
            )}
            <button
              type="button"
              onClick={onRerun}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-gray-200 transition-colors hover:border-white/20 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {jt.buttons.rerun}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-gray-200"
            >
              <SkipForward className="h-3.5 w-3.5" />
              {jt.buttons.skip}
            </button>
            {step.resultUrl && (
              <button
                type="button"
                onClick={() =>
                  void downloadAsset(
                    step.resultUrl as string,
                    `${filenamePrefix}-${stepKey}.${isVideoUrl(step.resultUrl) ? "mp4" : "jpg"}`,
                  )
                }
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-gray-200"
              >
                <Download className="h-3.5 w-3.5" />
                {jt.results.download}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Vista grande al pasar el mouse */}
      {peek && step.resultUrl && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-8 backdrop-blur-sm">
          <div className="flex max-h-full w-full max-w-5xl items-center gap-3">
            {step.inputUrl && !isVideoUrl(step.resultUrl) && (
              <div className="relative flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={step.inputUrl}
                  alt={jt.lightbox.original}
                  className="max-h-[70vh] w-full rounded-xl object-contain"
                />
                <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  {jt.beforeAfter.before}
                </span>
              </div>
            )}
            <div className="relative flex-1">
              {isVideoUrl(step.resultUrl) ? (
                <video src={step.resultUrl} autoPlay loop muted className="max-h-[70vh] w-full rounded-xl" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={step.resultUrl}
                  alt={copy.label}
                  className="max-h-[70vh] w-full rounded-xl object-contain"
                />
              )}
              <span className="absolute right-2 top-2 rounded bg-[var(--accent)]/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {jt.beforeAfter.after}
              </span>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && step.resultUrl && (
        <ImageLightbox
          images={[step.resultUrl]}
          startIndex={0}
          onClose={() => setLightboxOpen(false)}
          filenamePrefix={`${filenamePrefix}-${stepKey}`}
          compareWith={step.inputUrl}
          labels={jt.lightbox}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Página                                                              */
/* ------------------------------------------------------------------ */

export default function JewelryPipelinePage() {
  const { t } = useI18n();
  const jt = t.pipelines.jewelry;

  const [phase, setPhase] = useState<Phase>("setup");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [defaultSubType, setDefaultSubType] = useState<JewelrySubType>("earrings");
  const [includeModel, setIncludeModel] = useState(true);
  const [includeVideo, setIncludeVideo] = useState(false);

  const previewUrlsRef = useRef<string[]>([]);
  // Espejo del estado para que runStep lea siempre los últimos resultados sin
  // depender del closure de React (setState es asíncrono y los pasos encadenan).
  const jobsRef = useRef<Job[]>([]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);
  // Permite cancelar el paso en curso desde el botón Detener.
  const abortRef = useRef<AbortController | null>(null);

  // Lee ?subType= del redirect del modo automático.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const st = params.get("subType") as JewelrySubType | null;
    if (st && st in SUB_TYPE_LABELS) setDefaultSubType(st);
  }, []);

  useEffect(() => {
    const urls = previewUrlsRef;
    return () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = [];
    };
  }, []);

  /* ---- Alta de fotos ---- */

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const newJobs: Job[] = files.map((file, i) => {
        const preview = URL.createObjectURL(file);
        previewUrlsRef.current.push(preview);
        return {
          id: `job-${Date.now()}-${i}`,
          file,
          filename: file.name,
          previewUrl: preview,
          subType: defaultSubType,
          steps: makeSteps(includeModel, includeVideo),
          status: "idle",
          totalCost: 0,
          analysisStatus: "pending",
        };
      });
      setJobs((prev) => [...prev, ...newJobs]);
      setActiveJobId((cur) => cur ?? newJobs[0].id);
    },
    [defaultSubType, includeModel, includeVideo],
  );

  const patchJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const patchStep = useCallback((id: string, key: StepKey, patch: Partial<StepState>) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, steps: { ...j.steps, [key]: { ...j.steps[key], ...patch } } } : j,
      ),
    );
  }, []);

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setActiveJobId((cur) => (cur === id ? null : cur));
  };

  /* ---- Traducción de errores técnicos a lenguaje humano ---- */

  const humanizeError = useCallback(
    (raw?: string): string => {
      const msg = (raw ?? "").toLowerCase();
      if (msg.includes("out of memory") || msg.includes("cuda") || msg.includes("gpu"))
        return jt.errors.gpuMemory;
      if (msg.includes("content policy") || msg.includes("sensitive") || msg.includes("e005"))
        return jt.errors.contentPolicy;
      if (msg.includes("401") || msg.includes("unauthorized")) return jt.errors.auth;
      if (msg.includes("404") || msg.includes("not found")) return jt.errors.notFound;
      if (msg.includes("timeout") || msg.includes("timed out")) return jt.errors.timeout;
      if (msg.includes("image_load_error") || msg.includes("failed to load the image"))
        return jt.errors.imageLoad;
      return raw && raw.length < 160 ? raw : jt.errors.generic;
    },
    [jt.errors],
  );

  /* ---- Chequeo de identidad (no bloqueante) ---- */

  const runIdentityCheck = useCallback(
    (jobId: string, stepKey: StepKey, inputUrl: string, outputUrl: string, onModel: boolean) => {
      void fetch("/api/identity-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputUrl, outputUrl, category: "jewelry" }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && d.data && !d.data.same && d.data.confidence > 0.6) {
            const changes = (d.data.changes ?? []).slice(0, 2).join("; ") || d.data.reason;
            patchStep(jobId, stepKey, {
              warning: onModel ? jt.messages.jewelryChangedModel(changes) : jt.messages.jewelryChanged(changes),
            });
          }
        })
        .catch((err) => console.warn("[jewelry] identity-check failed:", err));
    },
    [jt.messages, patchStep],
  );

  /* ---- Ejecución de un paso ---- */

  /** Imagen del producto lista para componer escenas: la nítida si existe. */
  const productUrl = (job: Job): string | undefined =>
    job.steps.sharpen.resultUrl ?? job.steps.isolate.resultUrl;

  const runStep = useCallback(
    async (jobId: string, key: StepKey): Promise<boolean> => {
      const job = jobsRef.current.find((j) => j.id === jobId);
      if (!job) return false;

      const config = getJewelryConfig(job.subType);
      const controller = new AbortController();
      abortRef.current = controller;

      const fail = (msg: string): false => {
        patchStep(jobId, key, { status: "error", error: humanizeError(msg) });
        return false;
      };

      try {
        switch (key) {
          /* ---------------- 1. Quitar fondo ---------------- */
          case "isolate": {
            const input = job.uploadedUrl;
            if (!input) return fail("Missing upload");
            patchStep(jobId, key, { status: "processing", inputUrl: input, error: undefined });
            const res = await fetch("/api/bg-remove", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: input, provider: "replicate" }),
              signal: controller.signal,
            });
            const data = await safeJson(res);
            const url = pickUrl(data.data);
            if (!data.success || !url) return fail(data.error ?? "bg-remove failed");
            patchStep(jobId, key, {
              status: "done",
              resultUrl: url,
              cost: data.cost ?? STEP_COST.isolate,
            });
            return true;
          }

          /* ---------------- 2. Nitidez ---------------- */
          case "sharpen": {
            const input = job.steps.isolate.resultUrl;
            if (!input) return fail(jt.messages.needsIsolate);
            patchStep(jobId, key, { status: "processing", inputUrl: input, error: undefined });
            const res = await fetch("/api/upscale", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageUrl: input,
                provider: JEWELRY_UPSCALE_CONFIG.provider,
                scale: JEWELRY_UPSCALE_CONFIG.scale,
                // La clave del arreglo: la ruta devuelve 200 con la imagen
                // original si la GPU no puede, en vez de tumbar el pipeline.
                softFail: JEWELRY_UPSCALE_CONFIG.softFail,
              }),
              signal: controller.signal,
            });
            const data = await safeJson(res);
            const url = pickUrl(data.data);
            if (!data.success || !url) return fail(data.error ?? "upscale failed");
            const skipped = data.data?.skipped === true;
            patchStep(jobId, key, {
              status: skipped ? "skipped" : "done",
              resultUrl: url,
              cost: data.cost ?? 0,
              warning: skipped ? jt.messages.skippedUpscale : undefined,
            });
            return true;
          }

          /* ---------------- 3 y 4. Packshot y escena de lujo ---------------- */
          case "packshot":
          case "estante": {
            const input = productUrl(job);
            if (!input) return fail(jt.messages.needsIsolate);
            patchStep(jobId, key, { status: "processing", inputUrl: input, error: undefined });

            // La ficha de Vision ancla el prompt a ESTA pieza (oro, 3 piedras,
            // grabados) en vez de a la plantilla genérica del sub-tipo.
            const descriptor = job.productFeatures ? jewelryDescriptor(job.productFeatures) : null;
            const suffix = descriptor ? `. Featuring this exact piece: ${descriptor}.` : "";
            const basePrompt = key === "packshot" ? config.packshotPrompt : config.estantePrompt;

            const res = await fetch("/api/bg-generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageUrl: input,
                mode: "precise",
                style: "custom",
                customPrompt: withJewelryPreserve(basePrompt + suffix),
                aspectRatio: "1:1",
              }),
              signal: controller.signal,
            });
            const data = await safeJson(res);
            const url = pickUrl(data.data);
            if (!data.success || !url) return fail(data.error ?? "bg-generate failed");
            patchStep(jobId, key, {
              status: "done",
              resultUrl: url,
              cost: data.cost ?? STEP_COST[key],
            });
            runIdentityCheck(jobId, key, input, url, false);
            return true;
          }

          /* ---------------- 5. Detalle macro ---------------- */
          case "macro": {
            const input = productUrl(job);
            if (!input) return fail(jt.messages.needsIsolate);
            patchStep(jobId, key, { status: "processing", inputUrl: input, error: undefined });
            const res = await fetch("/api/macro-crop", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageUrl: input,
                zoom: config.macro.zoom,
                background: config.macro.background,
                aspectRatio: "1:1",
              }),
              signal: controller.signal,
            });
            const data = await safeJson(res);
            const url = pickUrl(data.data);
            if (!data.success || !url) return fail(data.error ?? "macro-crop failed");
            patchStep(jobId, key, { status: "done", resultUrl: url, cost: 0 });
            return true;
          }

          /* ---------------- 6. En modelo ---------------- */
          case "modelo": {
            const jewelryUrl = productUrl(job);
            if (!jewelryUrl) return fail(jt.messages.needsIsolate);
            patchStep(jobId, key, { status: "processing", inputUrl: jewelryUrl, error: undefined });

            const modelRes = await fetch("/api/model-create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gender: "female",
                ageRange: "26-35",
                skinTone: "medium",
                bodyType: "average",
                customDetails: config.modelPrompt,
              }),
              signal: controller.signal,
            });
            const modelData = await safeJson(modelRes);
            const modelPhotoUrl = pickUrl(modelData.data);
            if (!modelData.success || !modelPhotoUrl) return fail(modelData.error ?? "model-create failed");
            const modelCost = modelData.cost ?? 0.055;

            const descriptor = job.productFeatures ? jewelryDescriptor(job.productFeatures) : undefined;
            const tryonRes = await fetch("/api/jewelry-tryon", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                modelImage: modelPhotoUrl,
                jewelryImage: jewelryUrl,
                type: job.subType,
                mode: "modelo",
                featureDescriptor: descriptor,
              }),
              signal: controller.signal,
            });
            const tryonData = await safeJson(tryonRes);
            const url = pickUrl(tryonData.data);
            if (!tryonData.success || !url) {
              patchStep(jobId, key, {
                status: "error",
                error: humanizeError(tryonData.error),
                cost: modelCost,
              });
              return false;
            }
            patchStep(jobId, key, {
              status: "done",
              resultUrl: url,
              cost: modelCost + (tryonData.cost ?? 0.05),
            });
            runIdentityCheck(jobId, key, jewelryUrl, url, true);
            return true;
          }

          /* ---------------- 7. Video ---------------- */
          case "video": {
            const input = job.steps.estante.resultUrl;
            if (!input) return fail(jt.messages.needsEstante);
            patchStep(jobId, key, { status: "processing", inputUrl: input, error: undefined });
            const res = await fetch("/api/video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageUrl: input,
                provider: "wan-2.2-fast",
                prompt: config.videoPrompt,
                duration: 5,
                aspectRatio: "1:1",
              }),
              signal: controller.signal,
            });
            const data = await safeJson(res);
            const url = pickUrl(data.data);
            if (!data.success || !url) return fail(data.error ?? "video failed");
            patchStep(jobId, key, {
              status: "done",
              resultUrl: url,
              cost: data.cost ?? STEP_COST.video,
            });
            return true;
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          patchStep(jobId, key, { status: "idle" });
          return false;
        }
        return fail(err instanceof Error ? err.message : String(err));
      } finally {
        abortRef.current = null;
      }
      return false;
    },
    [humanizeError, jt.messages, patchStep, runIdentityCheck],
  );

  /* ---- Corrida completa de un job ---- */

  const processJob = useCallback(
    async (jobId: string): Promise<void> => {
      patchJob(jobId, { status: "active" });

      // Subida + análisis de la ficha, en paralelo. El análisis nunca bloquea:
      // si falla, los prompts caen a la plantilla del sub-tipo.
      const job = jobsRef.current.find((j) => j.id === jobId);
      if (!job) return;

      let uploadedUrl = job.uploadedUrl;
      if (!uploadedUrl) {
        try {
          const form = new FormData();
          form.append("file", job.file);
          const upRes = await fetch("/api/upload", { method: "POST", body: form });
          const upData = await safeJson(upRes);
          uploadedUrl = pickUrl(upData.data);
          if (!upData.success || !uploadedUrl) throw new Error(upData.error ?? "Upload failed");
          patchJob(jobId, { uploadedUrl });
          jobsRef.current = jobsRef.current.map((j) =>
            j.id === jobId ? { ...j, uploadedUrl } : j,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          patchJob(jobId, { status: "error" });
          toast.error(jt.messages.jobError(job.filename, humanizeError(msg)));
          return;
        }
      }

      patchJob(jobId, { analysisStatus: "analyzing" });
      try {
        const res = await fetch("/api/product-features", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: uploadedUrl, category: "jewelry" }),
        });
        const data = await res.json();
        const features = data?.success ? (data.data as JewelryFeatures) : null;
        patchJob(jobId, { productFeatures: features, analysisStatus: features ? "done" : "error" });
        jobsRef.current = jobsRef.current.map((j) =>
          j.id === jobId ? { ...j, productFeatures: features } : j,
        );
      } catch {
        patchJob(jobId, { analysisStatus: "error" });
      }

      // Los pasos corren en orden. Un fallo NUNCA aborta la cadena: cada paso
      // decide si tiene con qué correr mirando el resultado de los anteriores.
      for (const key of STEP_ORDER) {
        const current = jobsRef.current.find((j) => j.id === jobId);
        if (!current) return;
        if (!current.steps[key].enabled) {
          patchStep(jobId, key, { status: "skipped" });
          continue;
        }
        await runStep(jobId, key);
        // Deja que React aplique el patch antes de que el próximo paso lea el ref.
        await new Promise((r) => setTimeout(r, 0));
      }

      const finished = jobsRef.current.find((j) => j.id === jobId);
      const total = finished
        ? Object.values(finished.steps).reduce((sum, s) => sum + s.cost, 0)
        : 0;
      patchJob(jobId, { status: "done", totalCost: total });
    },
    [humanizeError, jt.messages, patchJob, patchStep, runStep],
  );

  /* ---- Guardado en galería ---- */

  const saveToGallery = useCallback(async (job: Job) => {
    const addImages = useGalleryStore.getState().addImages;
    const baseName = job.filename.replace(/\.[^.]+$/, "");
    const stamp = Date.now();
    const items = [];
    for (const key of STEP_ORDER) {
      const step = job.steps[key];
      // El recorte y la nitidez son intermedios: no son entregables.
      if (key === "isolate" || key === "sharpen") continue;
      if (!step.resultUrl || step.status === "error") continue;
      const isVid = isVideoUrl(step.resultUrl);
      items.push({
        id: `jewelry-${key}-${stamp}-${job.id}`,
        filename: `${baseName}-${key}.${isVid ? "mp4" : "jpg"}`,
        // Los videos se guardan por URL: convertirlos a data URL revienta la cuota.
        resultUrl: isVid ? step.resultUrl : await urlToDataUrl(step.resultUrl),
        originalUrl: job.previewUrl,
        date: new Date().toISOString(),
        operations: [`jewelry-${key}`],
        project: `jewelry-${job.subType}`,
      });
    }
    if (items.length > 0) addImages(items);
  }, []);

  /* ---- Disparadores ---- */

  const handleProcessAll = async () => {
    if (busy) return;
    const pending = jobs.filter((j) => j.status !== "done");
    if (pending.length === 0) {
      toast.info(jt.messages.noPending);
      return;
    }
    setPhase("pipeline");
    setBusy(true);
    try {
      for (const job of pending) {
        setActiveJobId(job.id);
        await processJob(job.id);
        const finished = jobsRef.current.find((j) => j.id === job.id);
        if (finished) await saveToGallery(finished);
      }
      toast.success(jt.messages.processed(pending.length));
    } finally {
      setBusy(false);
    }
  };

  const handleRerun = async (jobId: string, key: StepKey) => {
    if (busy) return;
    setBusy(true);
    try {
      await runStep(jobId, key);
    } finally {
      setBusy(false);
    }
  };

  const activeJob = jobs.find((j) => j.id === activeJobId) ?? jobs[0];

  const estimatedCost = useMemo(() => {
    let total = 0;
    for (const key of STEP_ORDER) {
      if (OPTIONAL_STEPS.includes(key)) {
        if (key === "modelo" && !includeModel) continue;
        if (key === "video" && !includeVideo) continue;
      }
      total += STEP_COST[key];
    }
    return total;
  }, [includeModel, includeVideo]);

  const spentTotal = jobs.reduce(
    (sum, j) => sum + Object.values(j.steps).reduce((s, st) => s + st.cost, 0),
    0,
  );
  const doneCount = jobs.filter((j) => j.status === "done").length;

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-heading">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border-default)] bg-[rgba(12,12,14,0.85)] px-4 py-3 backdrop-blur md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-muted transition-default hover:text-[var(--accent)]"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{jt.buttons.back}</span>
        </Link>
        <span className="text-[var(--border-default)]">/</span>
        <div className="flex min-w-0 items-center gap-2">
          <Gem className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <span className="truncate text-sm font-semibold text-heading">Joyería</span>
        </div>
        {jobs.length > 0 && (
          <div className="ml-auto flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span>
              ${spentTotal.toFixed(3)} {jt.review.accumulated}
            </span>
            <span>
              {doneCount}/{jobs.length} {jt.review.ready}
            </span>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-bold text-heading md:text-3xl">{t.pages.jewelry.title}</h1>
          <p className="mt-1 text-sm leading-relaxed text-body">{t.pages.jewelry.subtitle}</p>
        </div>

        {/* ---------------- Fase de configuración ---------------- */}
        {phase === "setup" && (
          <>
            <section className="mb-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <h2 className="text-sm font-semibold text-white">{jt.config.heading}</h2>
              <p className="mb-4 mt-0.5 text-xs text-[var(--text-secondary)]">
                {jt.config.subheading}
              </p>

              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="defaultSubType"
                    className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]"
                  >
                    {jt.config.defaultType}
                  </label>
                  <select
                    id="defaultSubType"
                    value={defaultSubType}
                    onChange={(e) => setDefaultSubType(e.target.value as JewelrySubType)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
                  >
                    {Object.entries(SUB_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    {jt.config.outputs}
                  </p>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={includeModel}
                        onChange={(e) => setIncludeModel(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-[var(--accent)]"
                      />
                      <User className="h-4 w-4 text-[var(--accent)]" />
                      {jt.config.includeModel}
                      <span className="text-[11px] text-[var(--text-secondary)]">(+$0.10)</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={includeVideo}
                        onChange={(e) => setIncludeVideo(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-[var(--accent)]"
                      />
                      <Film className="h-4 w-4 text-[var(--accent)]" />
                      {jt.config.includeVideo}
                      <span className="text-[11px] text-[var(--text-secondary)]">(+$0.05)</span>
                    </label>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                    {jt.config.outputsHint}
                  </p>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between rounded-lg border border-[var(--border-accent)] bg-[var(--accent-dim)] px-3 py-2">
                <span className="text-xs font-medium text-[var(--accent)]">
                  {jt.config.estimated}
                </span>
                <span className="font-mono text-sm font-semibold text-[var(--accent)]">
                  ${estimatedCost.toFixed(2)}
                </span>
              </div>

              <UploadZone onFiles={handleFiles} />
            </section>

            {jobs.length > 0 && (
              <section className="mb-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                <h2 className="mb-3 text-sm font-semibold text-white">
                  {jt.review.heading(jobs.length)}
                </h2>
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/30 p-3"
                    >
                      <ImageThumb
                        url={job.previewUrl}
                        label={job.filename}
                        className="h-16 w-16 shrink-0"
                        labels={jt.thumb}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-200" title={job.filename}>
                          {job.filename}
                        </p>
                        <select
                          value={job.subType}
                          onChange={(e) =>
                            patchJob(job.id, { subType: e.target.value as JewelrySubType })
                          }
                          disabled={busy}
                          className="mt-1.5 rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white disabled:opacity-50"
                        >
                          {Object.entries(SUB_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeJob(job.id)}
                        disabled={busy}
                        className="shrink-0 text-[var(--text-secondary)] transition-colors hover:text-red-400 disabled:opacity-30"
                        title={jt.buttons.remove}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleProcessAll}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-primary)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {busy ? jt.buttons.processing : jt.buttons.processAll}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      jobs.forEach((j) => URL.revokeObjectURL(j.previewUrl));
                      previewUrlsRef.current = [];
                      setJobs([]);
                      setActiveJobId(null);
                    }}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    {jt.buttons.clearAll}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {/* ---------------- Fase de pipeline ---------------- */}
        {phase === "pipeline" && activeJob && (
          <>
            {/* Selector de pieza cuando hay varias */}
            {jobs.length > 1 && (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setActiveJobId(job.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                      job.id === activeJob.id
                        ? "border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                        : "border-white/10 bg-white/[0.02] text-[var(--text-secondary)] hover:text-gray-200",
                    )}
                  >
                    <ImageThumb
                      url={job.previewUrl}
                      label={job.filename}
                      className="h-6 w-6"
                      labels={jt.thumb}
                    />
                    <span className="max-w-[9rem] truncate">{job.filename}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Ficha que la IA leyó de la foto */}
            <div className="mb-5 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {jt.features.heading}
              </p>
              {activeJob.analysisStatus === "analyzing" && (
                <p className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {jt.features.analyzing}
                </p>
              )}
              {activeJob.analysisStatus === "error" && (
                <p className="text-xs text-[var(--text-secondary)]">{jt.features.failed}</p>
              )}
              {activeJob.productFeatures && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-gray-200">
                    {activeJob.productFeatures.tipo} · {activeJob.productFeatures.material}
                  </span>
                  {activeJob.productFeatures.acabado && (
                    <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-gray-200">
                      {activeJob.productFeatures.acabado}
                    </span>
                  )}
                  {activeJob.productFeatures.piedras &&
                    activeJob.productFeatures.num_piedras > 0 && (
                      <span className="rounded bg-[var(--accent-dim)] px-2 py-0.5 text-[11px] text-[var(--accent)]">
                        {jt.features.stones(activeJob.productFeatures.num_piedras)}
                        {activeJob.productFeatures.color_piedras.length > 0 &&
                          ` (${activeJob.productFeatures.color_piedras.join(", ")})`}
                      </span>
                    )}
                  {activeJob.productFeatures.grabados && (
                    <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-gray-200">
                      {jt.features.engraved}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Tarjetas de paso */}
            <div className="space-y-4">
              {STEP_ORDER.filter((key) => activeJob.steps[key].enabled).map((key, i) => (
                <StepCard
                  key={key}
                  stepKey={key}
                  step={activeJob.steps[key]}
                  stepNumber={i + 1}
                  isActive={activeJob.steps[key].status === "processing"}
                  busy={busy}
                  filenamePrefix={activeJob.filename.replace(/\.[^.]+$/, "")}
                  onAccept={() => patchStep(activeJob.id, key, { status: "accepted" })}
                  onSkip={() => patchStep(activeJob.id, key, { status: "skipped" })}
                  onRerun={() => void handleRerun(activeJob.id, key)}
                  onStop={() => abortRef.current?.abort()}
                />
              ))}
            </div>

            {/* Resultados */}
            <section className="mt-8 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">{jt.results.heading}</h2>
                <button
                  type="button"
                  onClick={() => {
                    const prefix = activeJob.filename.replace(/\.[^.]+$/, "");
                    STEP_ORDER.forEach((key) => {
                      const url = activeJob.steps[key].resultUrl;
                      if (!url || key === "isolate" || key === "sharpen") return;
                      void downloadAsset(
                        url,
                        `${prefix}-${key}.${isVideoUrl(url) ? "mp4" : "jpg"}`,
                      );
                    });
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:border-white/20 hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  {jt.buttons.downloadAll}
                </button>
              </div>

              {STEP_ORDER.filter(
                (k) => k !== "isolate" && k !== "sharpen" && activeJob.steps[k].resultUrl,
              ).length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)]">{jt.results.empty}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {STEP_ORDER.filter((k) => k !== "isolate" && k !== "sharpen").map((key) => {
                    const step = activeJob.steps[key];
                    if (!step.enabled) return null;
                    const copy = jt.steps[key];
                    if (!step.resultUrl) {
                      if (step.status !== "error") return null;
                      return (
                        <div
                          key={key}
                          className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center"
                        >
                          <AlertCircle className="h-5 w-5 text-red-400" />
                          <p className="text-[11px] font-semibold text-red-300">
                            {copy.label} {jt.results.failedSuffix}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={key}
                        className="overflow-hidden rounded-lg border border-white/10 bg-black"
                      >
                        <ImageThumb
                          url={step.resultUrl}
                          label={copy.label}
                          className="h-32 w-full"
                          labels={jt.thumb}
                        />
                        <div className="flex items-center justify-between bg-black/60 px-2 py-1.5">
                          <span className="truncate text-[11px] font-medium text-[var(--accent)]">
                            {copy.label}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void downloadAsset(
                                step.resultUrl as string,
                                `${activeJob.filename.replace(/\.[^.]+$/, "")}-${key}.${
                                  isVideoUrl(step.resultUrl) ? "mp4" : "jpg"
                                }`,
                              )
                            }
                            className="shrink-0 rounded p-0.5 text-gray-300 transition hover:text-white"
                            title={`${jt.results.download} ${copy.label}`}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPhase("setup")}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                {jt.config.heading}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
