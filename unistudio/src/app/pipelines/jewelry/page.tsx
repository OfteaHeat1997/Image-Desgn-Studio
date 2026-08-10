"use client";

/* =============================================================================
 * Pipeline de Joyería — UniStudio
 * =============================================================================
 * De una foto de celular al set completo para vender en línea.
 *
 * LO MANEJA VISION, NO UN DESPLEGABLE
 * -----------------------------------
 * El inventario real son 202 fotos SIN catalogar cuyos nombres son marcas de
 * tiempo de cámara ("20250613_163539.jpg") — cero información. Y la clienta
 * trae productos nuevos todo el tiempo: probando 8 fotos, Vision devolvió
 * `armband`, que no estaba en ninguna lista cerrada. Elegir el tipo a mano,
 * foto por foto, no escala.
 *
 * Por eso Claude Vision lee cada foto, `featuresToSubType()` la lleva a una
 * familia y el pipeline se configura solo. Si Vision no está seguro, la tarjeta
 * lo marca en ámbar y podés corregirlo antes de que gaste.
 *
 * TRES ETAPAS, NO OCHO PASOS SUELTOS
 * ----------------------------------
 * La referencia de UX dice que 3-6 pasos es lo que se abarca de un vistazo;
 * con más, hay que dividir el recorrido. La versión anterior mostraba 7
 * tarjetas planas y se sentía abrumadora. Ahora: Preparar → Generar → Publicar.
 *
 * Doc: docs/pipelines/jewelry.md
 * ========================================================================== */

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  Download,
  Eraser,
  Gem,
  Hand,
  Info,
  Instagram,
  Loader2,
  Play,
  RotateCcw,
  Scissors,
  SkipForward,
  Square,
  StopCircle,
  ThumbsDown,
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
  featuresToSubType,
  SUB_TYPE_LABELS,
  withJewelryPreserve,
  type JewelrySubType,
} from "@/lib/pipelines/jewelry";
import {
  jewelryDescriptor,
  type JewelryFeatures,
} from "@/lib/processing/product-features";
import {
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
import type { JewelryStageKey, JewelryStepKey } from "@/lib/i18n/pipelines/jewelry";

/* ------------------------------------------------------------------ */
/*  Modelo de datos                                                     */
/* ------------------------------------------------------------------ */

type StepKey = JewelryStepKey;
type StageKey = JewelryStageKey;
type Phase = "setup" | "pipeline";

/** Qué pasos viven en qué etapa, y en qué orden corren. */
const STAGES: Array<{ key: StageKey; steps: StepKey[] }> = [
  { key: "prepare", steps: ["clean", "isolate"] },
  { key: "generate", steps: ["packshot", "luxury", "macro", "model", "scale"] },
  { key: "publish", steps: ["social"] },
];

const STEP_ORDER: StepKey[] = STAGES.flatMap((s) => s.steps);

const STEP_ICONS: Record<StepKey, React.ElementType> = {
  clean: Eraser,
  isolate: Scissors,
  packshot: Square,
  luxury: Gem,
  macro: ZoomIn,
  model: User,
  scale: Hand,
  social: Instagram,
};

/** Costo estimado por paso, en dólares. */
/**
 * Fondo del packshot: marfil, NO blanco puro.
 *
 * Lo fija la doctrina de marca de Unistyles. El blanco puro apaga el dorado del
 * PVD 18K y ademas delata el recorte, porque el borde del producto queda contra
 * un fondo sin ninguna temperatura.
 */
const PACKSHOT_BG = "#F6F4F0";

const STEP_COST: Record<StepKey, number> = {
  clean: 0.04,
  isolate: 0.01,
  packshot: 0,
  luxury: 0.05,
  macro: 0,
  model: 0.1,
  scale: 0.1,
  social: 0,
};

/**
 * Motor que corre cada paso, para mostrarlo en la tarjeta. La usuaria pidio
 * explicitamente saber "cual proveedor" genero cada foto: hasta ahora solo
 * estaba escrito dentro del panel de documentacion, cerrado por defecto.
 */
const STEP_ENGINE: Record<StepKey, string> = {
  clean: "Kontext Pro",
  isolate: "BiRefNet",
  packshot: "sharp · sin IA",
  luxury: "Flux Schnell + sharp",
  macro: "sharp · sin IA",
  model: "SeedDream + Kontext",
  scale: "SeedDream + Kontext",
  social: "sharp + ffmpeg",
};

/** Pasos que se pueden apagar antes de correr. El resto van siempre. */
const OPTIONAL_STEPS: StepKey[] = ["model", "scale"];

interface StepState {
  status: PipelineStepStatus;
  enabled: boolean;
  /** Imagen que entró a este paso — el "antes" del comparador. */
  inputUrl?: string;
  resultUrl?: string;
  /**
   * TODOS los resultados que produjo este paso, en orden. "Rehacer" no pisa el
   * anterior: lo guarda acá. Así se puede comparar y volver al que gustaba, que
   * es lo que faltaba — antes rehacer destruía el resultado bueno sin vuelta
   * atrás, y no había forma de decir "este pedazo no lo quiero".
   */
  candidates?: string[];
  /** Slides del carrusel (solo el paso `social`). */
  carousel?: string[];
  /** Reel vertical (solo el paso `social`). */
  reelUrl?: string;
  reelError?: string;
  error?: string;
  cost: number;
  /** Aviso no bloqueante: p. ej. la joya cambió al generar la escena. */
  warning?: string;
}

interface Job {
  id: string;
  file: File;
  filename: string;
  previewUrl: string;
  uploadedUrl?: string;
  subType: JewelrySubType;
  /** false cuando Vision no reconoció el tipo y hubo que adivinar. */
  subTypeConfident: boolean;
  steps: Record<StepKey, StepState>;
  status: "idle" | "active" | "done" | "error";
  features?: JewelryFeatures | null;
  analysisStatus: "pending" | "analyzing" | "done" | "error";
  /**
   * Prompts escritos por Claude Vision mirando ESTA foto. Reemplazan a las
   * plantillas por sub-tipo, que producían escenas genéricas — la "escena de
   * lujo" salía como un primer plano oscuro porque la plantilla no nombraba
   * superficie, props ni espacio negativo. Si Vision falla, queda null y el
   * pipeline usa las plantillas.
   */
  prompts?: {
    pieceDescription: string;
    packshot: string;
    luxury: string;
    luxuryBackdrop: string;
    macroFocus: string;
    model: string;
    negative: string;
    productWords: string;
    propWords: string;
  } | null;
}

function makeSteps(includeModel: boolean, includeScale: boolean): Record<StepKey, StepState> {
  const base = {} as Record<StepKey, StepState>;
  for (const key of STEP_ORDER) {
    const enabled =
      key === "model" ? includeModel : key === "scale" ? includeScale : true;
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

/** Extrae la URL de una respuesta de módulo (`url`, `imageUrl` o `videoUrl`). */
function pickUrl(data?: Record<string, unknown>): string | undefined {
  const candidate = data?.url ?? data?.imageUrl ?? data?.videoUrl;
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
/*  Ficha de Vision                                                     */
/* ------------------------------------------------------------------ */

/** Campo de texto de la ficha. Editable: lo que Vision leyo se puede corregir. */
function SpecField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-[var(--text-secondary)]">{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--accent)]/50 disabled:opacity-50"
      />
    </label>
  );
}

/**
 * Ficha tecnica de la pieza — EDITABLE.
 *
 * Antes era una fila de chips de solo lectura: si Vision leia mal el material o
 * el tipo de cadena, no habia forma de corregirlo y el error se propagaba a
 * TODOS los prompts, porque packshot, escena, macro y on-model parten de
 * `jewelryDescriptor(features)`.
 *
 * Lenceria resuelve esto con campos editables (`ProductSpecPanel`), y era el
 * pedido repetido: poder arreglar lo que la IA entendio mal ANTES de gastar.
 */
function VisionPanel({
  job,
  disabled,
  onChangeType,
  onEditFeatures,
  onReanalyze,
}: {
  job: Job;
  disabled: boolean;
  onChangeType: (s: JewelrySubType) => void;
  onEditFeatures: (patch: Partial<JewelryFeatures>) => void;
  onReanalyze: () => void;
}) {
  const { t } = useI18n();
  const jt = t.pipelines.jewelry;
  const [open, setOpen] = useState(true);
  const f = job.features;

  return (
    <div className="mb-5 rounded-xl border border-white/8 bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform",
              open ? "rotate-180" : "",
            )}
          />
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              {jt.vision.heading}
            </span>
            <span className="block text-[11px] text-[var(--text-secondary)]">
              {jt.vision.subtitle}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onReanalyze}
          disabled={disabled || job.analysisStatus === "analyzing"}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-gray-200 transition-colors hover:border-white/25 disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {job.analysisStatus === "analyzing" ? jt.vision.reanalyzing : jt.vision.reanalyze}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/6 px-4 py-4">
          {job.analysisStatus === "analyzing" && (
            <p className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              {jt.vision.analyzing}
            </p>
          )}
          {job.analysisStatus === "error" && !f && (
            <p className="text-xs text-[var(--text-secondary)]">{jt.vision.failed}</p>
          )}

          {f && (
            <div className="space-y-4">
              {!job.subTypeConfident && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <p className="text-[11px] leading-snug text-amber-200">
                    <span className="font-semibold">{jt.vision.guessed}.</span> {jt.vision.guessedHint}
                  </p>
                </div>
              )}
              {f.num_productos > 1 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <p className="text-[11px] leading-snug text-amber-200">
                    <span className="font-semibold">{jt.vision.multiProduct(f.num_productos)}.</span>{" "}
                    {jt.vision.multiProductHint}
                  </p>
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {jt.vision.sectionIdentity}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] text-[var(--text-secondary)]">
                      {jt.vision.fieldType}
                    </span>
                    <select
                      value={job.subType}
                      onChange={(e) => onChangeType(e.target.value as JewelrySubType)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {Object.entries(SUB_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <SpecField
                    label={jt.vision.fieldMaterial}
                    value={f.material}
                    disabled={disabled}
                    onChange={(v) => onEditFeatures({ material: v as JewelryFeatures["material"] })}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {jt.vision.sectionConstruction}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SpecField
                    label={jt.vision.fieldFinish}
                    value={f.acabado ?? ""}
                    disabled={disabled}
                    onChange={(v) => onEditFeatures({ acabado: (v || null) as JewelryFeatures["acabado"] })}
                  />
                  <SpecField
                    label={jt.vision.fieldChain}
                    value={f.tipo_cadena ?? ""}
                    disabled={disabled}
                    onChange={(v) => onEditFeatures({ tipo_cadena: v || null })}
                  />
                  <SpecField
                    label={jt.vision.fieldClasp}
                    value={f.cierre ?? ""}
                    disabled={disabled}
                    onChange={(v) => onEditFeatures({ cierre: v || null })}
                  />
                  <SpecField
                    label={jt.vision.fieldEngraved}
                    value={f.texto_grabado ?? ""}
                    disabled={disabled}
                    onChange={(v) => onEditFeatures({ texto_grabado: v || null })}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {jt.vision.sectionDetails}
                </p>
                <SpecField
                  label={jt.vision.fieldStones}
                  value={f.piedras && f.num_piedras > 0 ? String(f.num_piedras) : ""}
                  disabled={disabled}
                  onChange={(v) => {
                    const n = parseInt(v, 10);
                    const ok = Number.isFinite(n) && n > 0;
                    onEditFeatures({ num_piedras: ok ? n : 0, piedras: ok });
                  }}
                />
                <label className="mt-3 block">
                  <span className="mb-1 block text-[11px] text-[var(--text-secondary)]">
                    {jt.vision.fieldDetails}
                  </span>
                  <textarea
                    value={f.detalles_visibles.join("\n")}
                    disabled={disabled}
                    rows={4}
                    onChange={(e) =>
                      onEditFeatures({
                        detalles_visibles: e.target.value
                          .split("\n")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-relaxed text-white outline-none transition-colors focus:border-[var(--accent)]/50 disabled:opacity-50"
                  />
                  <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                    {jt.vision.detailsHint}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Vista previa del recorrido (pantalla inicial)                       */
/* ------------------------------------------------------------------ */

/**
 * Los 8 pasos, visibles ANTES de subir nada.
 *
 * Hasta ahora la pantalla inicial solo nombraba dos pasos — las dos casillas
 * opcionales — porque el resto se creaba recién al subir una foto. Se entraba,
 * se veían dos nombres sueltos y no había forma de saber que el pipeline tenía
 * ocho pasos ni qué iba a producir. Verificado en el HTML del deploy: de los 8
 * nombres, solo "En modelo" y "Foto de escala" aparecían.
 */
function FlowPreview({
  includeModel,
  includeScale,
}: {
  includeModel: boolean;
  includeScale: boolean;
}) {
  const { t } = useI18n();
  const jt = t.pipelines.jewelry;

  return (
    <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="space-y-3">
        {STAGES.map((stage) => (
          <div key={stage.key}>
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {jt.stages[stage.key].label}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {jt.stages[stage.key].hint}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stage.steps.map((k) => {
                const off =
                  (k === "model" && !includeModel) || (k === "scale" && !includeScale);
                const Icon = STEP_ICONS[k];
                return (
                  <span
                    key={k}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]",
                      off
                        ? "border-white/8 bg-transparent text-[var(--text-muted)] line-through"
                        : "border-white/10 bg-white/[0.03] text-gray-200",
                    )}
                    title={jt.steps[k].description}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {jt.steps[k].label}
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {jt.steps[k].costHint}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Barra de pasos                                                      */
/* ------------------------------------------------------------------ */

/**
 * Mapa fijo de todo el recorrido, siempre visible bajo el encabezado.
 *
 * El reclamo fue "no puedo ver los otros pasos": ocho tarjetas altas apiladas
 * dejan el resto fuera de pantalla y no hay forma de saber qué viene ni cuánto
 * falta. Esta barra muestra los ocho de un vistazo con su estado, y al tocar
 * uno salta a su tarjeta.
 */
function StepRail({
  steps,
  onJump,
}: {
  steps: Record<StepKey, StepState>;
  onJump: (k: StepKey) => void;
}) {
  const { t } = useI18n();
  const jt = t.pipelines.jewelry;

  return (
    <div className="sticky top-[57px] z-20 -mx-4 mb-5 border-b border-[var(--border-default)] bg-[rgba(12,12,14,0.92)] px-4 py-2 backdrop-blur md:-mx-6 md:px-6">
      <div className="flex flex-wrap items-center gap-1.5">
        {STAGES.map((stage) => {
          const visible = stage.steps.filter((k) => steps[k].enabled);
          if (visible.length === 0) return null;
          return (
            <div key={stage.key} className="flex flex-wrap items-center gap-1.5">
              <span className="px-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {jt.stages[stage.key].label}
              </span>
              {visible.map((k) => {
                const st = steps[k];
                const Icon = STEP_ICONS[k];
                const dot =
                  st.status === "done" || st.status === "accepted"
                    ? "bg-[var(--success)]"
                    : st.status === "processing"
                      ? "bg-[var(--accent)] lz-dot"
                      : st.status === "error"
                        ? "bg-red-400"
                        : st.status === "skipped"
                          ? "bg-white/25"
                          : "bg-white/15";
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onJump(k)}
                    title={jt.steps[k].label}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors",
                      st.status === "processing"
                        ? "border-[var(--accent)]/50 bg-[var(--accent-dim)] text-[var(--accent)]"
                        : st.status === "error"
                          ? "border-red-500/40 bg-red-500/10 text-red-300"
                          : "border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:border-white/25 hover:text-gray-200",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden whitespace-nowrap sm:inline">{jt.steps[k].label}</span>
                  </button>
                );
              })}
              <span className="px-0.5 text-[var(--text-muted)]">›</span>
            </div>
          );
        })}
      </div>
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
  busy: boolean;
  filenamePrefix: string;
  onAccept: () => void;
  onSkip: () => void;
  onRerun: () => void;
  onStop: () => void;
  /** Elegir cuál de las versiones generadas se queda. */
  onSelectVariant: (url: string) => void;
  /** "No me gusta": descarta la versión actual y vuelve a la anterior. */
  onDiscard: () => void;
  /** Plegada = fila compacta. Permite ver varios pasos a la vez. */
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function StepCard({
  stepKey,
  step,
  stepNumber,
  busy,
  filenamePrefix,
  onAccept,
  onSkip,
  onRerun,
  onStop,
  onSelectVariant,
  onDiscard,
  collapsed,
  onToggleCollapse,
}: StepCardProps) {
  const { t } = useI18n();
  const jt = t.pipelines.jewelry;
  const copy = jt.steps[stepKey];
  const Icon = STEP_ICONS[stepKey];

  const [showDocs, setShowDocs] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // VISTA GRANDE AL PASAR EL MOUSE, sin clic. Escalar la tarjeta un 3% no
  // alcanza para juzgar el acabado de una joya. El retardo de 180 ms es
  // hover-intent: sin él, el preview se dispara al pasar de largo scrolleando.

  const elapsed = useElapsedSeconds(step.status === "processing");
  const isSocial = stepKey === "social";

  // Los botones salen cuando ESTE paso terminó y no hay nada corriendo. Antes se
  // exigía que TODO el lote estuviera libre, así que durante una corrida no
  // aparecía ninguno — el "no tiene los botones" que se reportó.
  const canInteract =
    !busy && ["done", "accepted", "error", "skipped"].includes(step.status);

  const lightboxImages = isSocial ? (step.carousel ?? []) : step.resultUrl ? [step.resultUrl] : [];

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
                : "border-white/8 bg-white/[0.02]",
      )}
    >
      {/* Encabezado. Al plegar, toda la tarjeta se reduce a esta fila: asi
          entran varios pasos en pantalla en vez de uno solo. */}
      <div
        onClick={onToggleCollapse}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
        style={{ borderBottom: collapsed ? "none" : "1px solid rgba(255,255,255,0.06)" }}
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
                onClick={(e) => { e.stopPropagation(); setShowDocs((s) => !s); }}
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
            <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
              {copy.description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {/* Que motor corre este paso, siempre a la vista. Estaba solo en el
              panel de docs, detras del icono "i", asi que no habia forma de
              saber quien genero cada foto sin abrirlo. */}
          <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
            {STEP_ENGINE[stepKey]}
          </span>
          <span className="hidden text-xs font-medium text-[var(--text-secondary)] sm:inline">
            {(step.status === "done" || step.status === "accepted") && step.cost > 0
              ? `$${step.cost.toFixed(3)}`
              : copy.costHint}
          </span>
          <StatusBadge status={step.status} labels={jt.statusBadge} />
          {step.status === "processing" && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStop(); }}
              className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
              title={jt.stepCard.stopTitle}
            >
              <StopCircle className="h-3 w-3" />
              {jt.buttons.stop}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
            aria-label={collapsed ? copy.label : copy.label}
            className="rounded p-0.5 text-[var(--text-secondary)] transition-colors hover:text-white"
          >
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 transition-transform", collapsed ? "" : "rotate-180")}
            />
          </button>
        </div>
      </div>

      {/* Documentación del paso */}
      {!collapsed && showDocs && (
        <div className="border-b border-white/6 bg-[var(--accent)]/[0.03] px-5 py-4 text-xs">
          <div className="space-y-3">
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {jt.stepCard.docsWhat}
              </p>
              <p className="text-gray-300">{copy.what}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(
                [
                  [jt.stepCard.docsProvider, copy.provider],
                  [jt.stepCard.docsDuration, copy.duration],
                  [jt.stepCard.docsCost, copy.costDetail],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    {label}
                  </p>
                  <p className="text-[var(--text-secondary)]">{value}</p>
                </div>
              ))}
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
      {!collapsed && (
      <div className="px-5 py-4">
        {step.status === "processing" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
            <p className="text-sm text-gray-300">{copy.processing[elapsed % 3]}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {fmtClock(elapsed)} · {copy.eta}
            </p>
          </div>
        ) : isSocial ? (
          <SocialResult step={step} filenamePrefix={filenamePrefix} onOpen={setLightboxIdx} />
        ) : (
          <div>
            {/* Antes de correr se explica QUE hace, sin obligar a abrir el panel.
                El reclamo fue "faltan explicaciones": la doc estaba escondida
                detrás del icono "i" y nadie la abría antes de gastar. */}
            {step.status === "idle" && (
              <p className="mb-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {copy.what}
              </p>
            )}

            {/* DOS PANELES SEPARADOS, como lencería. Antes había un comparador
                con divisor que SUPERPONE las dos imágenes: para ver el original
                había que arrastrar, y nunca se veían las dos a la vez. El
                reclamo fue textual — "card separado para ver original y
                resultado". Cada panel abre el visor al tocarlo. */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  {jt.lightbox.original}
                </p>
                <button
                  type="button"
                  onClick={() => step.inputUrl && setLightboxIdx(0)}
                  disabled={!step.inputUrl}
                  className="w-full cursor-zoom-in disabled:cursor-default"
                >
                  <ImageThumb
                    url={step.inputUrl}
                    label={jt.lightbox.original}
                    className="h-[22rem] w-full"
                    labels={jt.thumb}
                  />
                </button>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {jt.lightbox.result}
                </p>
                <button
                  type="button"
                  onClick={() => step.resultUrl && setLightboxIdx(0)}
                  disabled={!step.resultUrl}
                  className="w-full cursor-zoom-in disabled:cursor-default"
                  title={step.resultUrl ? jt.stepCard.zoomHint : undefined}
                >
                  <ImageThumb
                    url={step.resultUrl}
                    label={copy.label}
                    className="h-[22rem] w-full"
                    labels={jt.thumb}
                  />
                </button>
              </div>
            </div>
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

        {/* Versiones generadas. Rehacer ya no pisa la anterior, así que se
            puede comparar y volver a la que gustaba. */}
        {!isSocial && (step.candidates?.length ?? 0) > 1 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {jt.buttons.variants(step.candidates!.length)}
            </p>
            <div className="flex flex-wrap gap-2">
              {step.candidates!.map((url, i) => {
                const active = url === step.resultUrl;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onSelectVariant(url)}
                    title={jt.buttons.useVariant(i + 1)}
                    className={cn(
                      "relative h-14 w-14 overflow-hidden rounded-lg border-2 transition-all",
                      active
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                        : "border-white/10 opacity-70 hover:opacity-100",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={jt.buttons.useVariant(i + 1)} className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-black/70 px-1 text-[9px] font-semibold text-white">
                      {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PASO QUE TODAVIA NO CORRIO. Antes no tenia NINGUN boton: los de
            Aceptar/Rehacer/Saltar solo salen despues de correr, asi que si la
            tanda se detenia la usuaria quedaba sin nada que oprimir. Reportado
            textual: "no puedo oprimir ningun boton". */}
        {!busy && (step.status === "idle" || step.status === "pending") && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRerun}
              title={jt.buttons.runStepTitle}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--bg-primary)] transition-colors hover:brightness-110"
            >
              <Play className="h-3.5 w-3.5" />
              {jt.buttons.runStep}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-gray-200"
            >
              <SkipForward className="h-3.5 w-3.5" />
              {jt.buttons.skip}
            </button>
          </div>
        )}

        {canInteract && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {step.status !== "accepted" && (step.resultUrl || step.carousel) && (
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
            {(step.resultUrl || step.carousel) && (
              <button
                type="button"
                onClick={onDiscard}
                title={jt.buttons.discardTitle}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/5 px-3.5 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                {jt.buttons.discard}
              </button>
            )}
            {step.status !== "skipped" && (
              <button
                type="button"
                onClick={onSkip}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-gray-200"
              >
                <SkipForward className="h-3.5 w-3.5" />
                {jt.buttons.skip}
              </button>
            )}
            {step.resultUrl && !isSocial && (
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

      )}

      {/* El peek a pantalla completa se ELIMINO. Era un overlay `fixed inset-0`
          que al pasar el mouse tapaba las tarjetas de alrededor y el resto de la
          pagina — en las capturas se veia el panel flotando encima del paso
          siguiente. Para ver grande esta el clic, que abre el visor. */}

      {lightboxIdx !== null && lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          filenamePrefix={`${filenamePrefix}-${stepKey}`}
          compareWith={isSocial ? undefined : step.inputUrl}
          labels={jt.lightbox}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Resultado del paso "Redes"                                          */
/* ------------------------------------------------------------------ */

function SocialResult({
  step,
  filenamePrefix,
  onOpen,
}: {
  step: StepState;
  filenamePrefix: string;
  onOpen: (i: number) => void;
}) {
  const { t } = useI18n();
  const jt = t.pipelines.jewelry;

  if (!step.carousel || step.carousel.length === 0) {
    return (
      <ImageThumb url={undefined} label={jt.social.carousel} className="h-40 w-full" labels={jt.thumb} />
    );
  }

  const downloadAll = () => {
    step.carousel?.forEach((url, i) =>
      void downloadAsset(url, `${filenamePrefix}-ig-${i + 1}.jpg`),
    );
    if (step.reelUrl) void downloadAsset(step.reelUrl, `${filenamePrefix}-reel.mp4`);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-white">{jt.social.carousel}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">{jt.social.carouselHint}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {step.carousel.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onOpen(i)}
              className="group relative overflow-hidden rounded-lg border border-white/10 bg-black"
              title={jt.social.slide(i + 1)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={jt.social.slide(i + 1)} className="aspect-[4/5] w-full object-cover" />
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-white">{jt.social.reel}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">{jt.social.reelHint}</p>
        </div>
        {step.reelUrl ? (
          <video
            src={step.reelUrl}
            controls
            loop
            muted
            playsInline
            className="mx-auto max-h-72 rounded-lg border border-white/10 bg-black"
          />
        ) : (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            {step.reelError ?? jt.social.reelUnavailable}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={downloadAll}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-gray-200 transition-colors hover:border-white/20 hover:text-white"
      >
        <Download className="h-3.5 w-3.5" />
        {jt.social.downloadKit}
      </button>
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
  const [includeModel, setIncludeModel] = useState(true);
  const [includeScale, setIncludeScale] = useState(false);
  /**
   * Pasos desplegados. Por defecto solo se abre el que corre y el ultimo que
   * fallo: con los ocho abiertos la pagina medía varias pantallas y no se veia
   * el recorrido. El resto queda plegado en una fila y se abre al tocarlo.
   */
  const [expanded, setExpanded] = useState<Set<StepKey>>(new Set());

  const toggleExpanded = useCallback((k: StepKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  /** Salta a la tarjeta desde la barra y la abre. */
  const jumpToStep = useCallback((k: StepKey) => {
    setExpanded((prev) => new Set(prev).add(k));
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-step-id="${k}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const previewUrlsRef = useRef<string[]>([]);
  // Espejo del estado: los pasos encadenan y setState es asíncrono, así que
  // runStep lee de acá para ver siempre el último resultado.
  const jobsRef = useRef<Job[]>([]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const urls = previewUrlsRef;
    return () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current = [];
    };
  }, []);

  const patchJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
    jobsRef.current = jobsRef.current.map((j) => (j.id === id ? { ...j, ...patch } : j));
  }, []);

  const patchStep = useCallback((id: string, key: StepKey, patch: Partial<StepState>) => {
    const apply = (j: Job): Job =>
      j.id === id ? { ...j, steps: { ...j.steps, [key]: { ...j.steps[key], ...patch } } } : j;
    setJobs((prev) => prev.map(apply));
    jobsRef.current = jobsRef.current.map(apply);
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
          filename: file.name,
          previewUrl: preview,
          // Provisional: Vision lo corrige apenas lee la foto.
          subType: "necklace" as JewelrySubType,
          subTypeConfident: false,
          steps: makeSteps(includeModel, includeScale),
          status: "idle",
          analysisStatus: "pending",
        };
      });
      setJobs((prev) => [...prev, ...newJobs]);
      jobsRef.current = [...jobsRef.current, ...newJobs];
      setActiveJobId((cur) => cur ?? newJobs[0].id);
    },
    [includeModel, includeScale],
  );

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    jobsRef.current = jobsRef.current.filter((j) => j.id !== id);
    setActiveJobId((cur) => (cur === id ? null : cur));
  };

  const humanizeError = useCallback(
    (raw?: string): string => {
      const msg = (raw ?? "").toLowerCase();
      if (msg.includes("out of memory") || msg.includes("cuda")) return jt.errors.gpuMemory;
      if (msg.includes("content policy") || msg.includes("sensitive")) return jt.errors.contentPolicy;
      if (msg.includes("401") || msg.includes("unauthorized")) return jt.errors.auth;
      if (msg.includes("404") || msg.includes("not found")) return jt.errors.notFound;
      if (msg.includes("timeout") || msg.includes("timed out")) return jt.errors.timeout;
      if (msg.includes("image_load_error")) return jt.errors.imageLoad;
      return raw && raw.length < 160 ? raw : jt.errors.generic;
    },
    [jt.errors],
  );

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
            // NO se marca como "Listo". La doctrina de Unistyles es explicita:
            // "si falla cualquiera de los primeros cuatro puntos, la imagen debe
            // corregirse antes de publicarse", y el punto 1 es "¿la joya sigue
            // siendo exactamente la original?". Antes el paso quedaba en verde
            // con el producto cambiado — el on-model llego a convertir una
            // pulsera de cuentas en un RELOJ y aun asi decia Listo. Ahora queda
            // en rojo, con el motivo y los botones de rehacer a la vista.
            patchStep(jobId, stepKey, {
              status: "error",
              error: onModel
                ? jt.messages.jewelryChangedModel(changes)
                : jt.messages.jewelryChanged(changes),
              warning: undefined,
            });
          }
        })
        .catch((err) => console.warn("[jewelry] identity-check falló:", err));
    },
    [jt.messages, patchStep],
  );

  /** Foto base para generar escenas: el recorte si existe, si no la limpia. */
  const productUrl = (job: Job): string | undefined =>
    job.steps.isolate.resultUrl ?? job.steps.clean.resultUrl ?? job.uploadedUrl;

  const runStep = useCallback(
    async (jobId: string, key: StepKey): Promise<boolean> => {
      const job = jobsRef.current.find((j) => j.id === jobId);
      if (!job) return false;

      const config = getJewelryConfig(job.subType);
      const controller = new AbortController();
      abortRef.current = controller;
      const signal = controller.signal;

      const fail = (msg?: string): false => {
        patchStep(jobId, key, { status: "error", error: humanizeError(msg) });
        return false;
      };

      /**
       * Marca el paso como hecho y ACUMULA el resultado en `candidates`, sin
       * pisar los anteriores. Rehacer deja de ser destructivo.
       */
      const done = (url: string, cost: number, extra: Partial<StepState> = {}) => {
        const prev = jobsRef.current.find((j) => j.id === jobId)?.steps[key].candidates ?? [];
        const candidates = prev.includes(url) ? prev : [...prev, url];
        patchStep(jobId, key, { status: "done", resultUrl: url, candidates, cost, ...extra });
      };

      // Auto-scroll a la tarjeta que arranca. Sin esto las tarjetas quedan
      // below-the-fold y no se ve que un paso empezo — el "no puedo ir abajo ni
      // arriba". Lo mismo que hace lenceria.
      const focusCard = () => {
        requestAnimationFrame(() => {
          document
            .querySelector(`[data-step-id="${key}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      };

      const descriptor = job.features ? jewelryDescriptor(job.features) : null;

      try {
        switch (key) {
          case "clean": {
            const input = job.uploadedUrl;
            if (!input) return fail("Falta la subida");
            patchStep(jobId, key, { status: "processing", inputUrl: input, error: undefined });
            focusCard();
            const res = await fetch("/api/photo-clean", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: input }),
              signal,
            });
            const data = await safeJson(res);
            const url = pickUrl(data.data);
            if (!data.success || !url) return fail(data.error);
            done(url, data.cost ?? STEP_COST.clean);
            return true;
          }

          case "isolate": {
            const input = job.steps.clean.resultUrl ?? job.uploadedUrl;
            if (!input) return fail(jt.messages.needsIsolate);
            patchStep(jobId, key, { status: "processing", inputUrl: input, error: undefined });
            focusCard();
            // RECORTE DIRIGIDO. BiRefNet es un segmentador de objeto SALIENTE:
            // no sabe qué es el producto, así que con una pieza apoyada en un
            // exhibidor se queda con los dos — y los pasos 3 a 6 heredan ese
            // recorte. Por eso el packshot redibuja la joya: tiene que inventar
            // cómo se ve sin el cilindro.
            // Ahora Vision nombra producto y utilería, y grounded_sam segmenta
            // con esas palabras. Si la máscara sale pobre, /api/bg-remove lanza
            // (compuerta de cobertura) y caemos a BiRefNet, que es el
            // comportamiento anterior: esto no puede quedar peor que antes.
            let data: Awaited<ReturnType<typeof safeJson>> | null = null;
            let url: string | undefined;

            if (job.prompts?.productWords) {
              try {
                const guided = await fetch("/api/bg-remove", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    imageUrl: input,
                    provider: "replicate",
                    removeSubject: true,
                    isolateMethod: "grounded-sam",
                    garmentType: job.subType,
                    subjectPrompt: job.prompts.productWords,
                    propPrompt: job.prompts.propWords,
                  }),
                  signal,
                });
                const gd = await safeJson(guided);
                const gu = pickUrl(gd.data);
                if (gd.success && gu) {
                  data = gd;
                  url = gu;
                }
              } catch {
                /* el respaldo se encarga */
              }
            }

            if (!url) {
              const res = await fetch("/api/bg-remove", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: input, provider: "birefnet" }),
                signal,
              });
              data = await safeJson(res);
              url = pickUrl(data.data);
            }

            if (!data?.success || !url) return fail(data?.error);
            done(url, data.cost ?? STEP_COST.isolate);
            return true;
          }

          // ESCENA DE LUJO POR COMPOSICIÓN. La IA genera SOLO el decorado y
          // encima se pegan los píxeles REALES del recorte. Los pasos 1-3
          // respetaban la pieza porque casi no la tocan; del 4 en adelante
          // Kontext la redibujaba dentro de la escena y la reinterpretaba
          // (duplicaba el crucifijo, perdía la medalla, cambiaba las cuentas).
          // Componiendo, la joya no puede cambiar: nunca entra al modelo.
          case "luxury": {
            const input = productUrl(job);
            if (!input) return fail(jt.messages.needsIsolate);
            const backdrop = job.prompts?.luxuryBackdrop;
            if (!backdrop) {
              // Sin decorado dirigido no hay compuesto posible: se marca saltado
              // en vez de caer al camino que reinterpreta la pieza.
              patchStep(jobId, key, { status: "skipped" });
              return false;
            }
            patchStep(jobId, key, { status: "processing", inputUrl: input, error: undefined });
            focusCard();
            const res = await fetch("/api/jewelry-scene", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productUrl: input, backdropPrompt: backdrop, aspectRatio: "4:5" }),
              signal,
            });
            const data = await safeJson(res);
            const url = pickUrl(data.data);
            if (!data.success || !url) return fail(data.error);
            done(url, data.cost ?? 0.04);
            return true;
          }

          case "packshot": {
            const input = productUrl(job);
            if (!input) return fail(jt.messages.needsIsolate);
            patchStep(jobId, key, { status: "processing", inputUrl: input, error: undefined });
            focusCard();
            // PACKSHOT POR COMPOSICION, NO POR GENERACION.
            //
            // Antes esto pasaba por Kontext con un prompt de "fondo limpio". El
            // problema no era el prompt: es que un generador REDIBUJA. Con un
            // collar de dije chico y lejano, el modelo "mejora" la foto —
            // engrosa la cadena, satura el oro y llega a inventarle una piedra
            // roja al colgante. El resultado ya no es el producto que la clienta
            // vende, y para un packshot de catalogo eso lo invalida entero.
            //
            // Un packshot no necesita IA: es la pieza recortada sobre un fondo
            // limpio con su sombra. Componiendo pixeles reales la joya es
            // IMPOSIBLE de alterar, sale en menos de un segundo y cuesta $0.
            //
            // Marfil, no blanco puro: lo pide la doctrina de marca (el blanco
            // puro apaga el dorado del PVD y delata el fondo recortado).
            const res = await fetch("/api/jewelry-scene", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productUrl: input,
                solidBackground: PACKSHOT_BG,
                aspectRatio: "1:1",
                productScale: 0.78,
                shadow: true,
              }),
              signal,
            });
            const data = await safeJson(res);
            const url = pickUrl(data.data);
            if (!data.success || !url) return fail(data.error);
            done(url, data.cost ?? 0);
            return true;
          }

          case "macro": {
            const input = productUrl(job);
            if (!input) return fail(jt.messages.needsIsolate);
            patchStep(jobId, key, { status: "processing", inputUrl: input, error: undefined });
            focusCard();
            // Vision mira la pieza aislada y elige QUE acercar. Sin esto el
            // recorte es mecanico (la zona con mas masa de pixeles) y el zoom
            // sale raro: a veces un tramo vacio de cadena, a veces media pieza.
            let region: { x: number; y: number; w: number; h: number } | undefined;
            try {
              const rr = await fetch("/api/jewelry-prompts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: input, mode: "macro-region" }),
                signal,
              });
              const rd = await rr.json();
              if (rd?.success && rd.data?.region) region = rd.data.region;
            } catch {
              /* sin region, el recortador vuelve a su heuristica */
            }

            const res = await fetch("/api/macro-crop", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageUrl: input,
                region,
                zoom: config.macro.zoom,
                background: config.macro.background,
                aspectRatio: "1:1",
              }),
              signal,
            });
            const data = await safeJson(res);
            const url = pickUrl(data.data);
            if (!data.success || !url) return fail(data.error);
            done(url, 0);
            return true;
          }

          case "model":
          case "scale": {
            const jewelryUrl = productUrl(job);
            if (!jewelryUrl) return fail(jt.messages.needsIsolate);
            patchStep(jobId, key, { status: "processing", inputUrl: jewelryUrl, error: undefined });
            focusCard();

            // La foto de escala siempre va sobre una mano: es la referencia que
            // la compradora entiende sin pensar, y los anillos son lo que más
            // se devuelve por no dimensionar bien el tamaño.
            const modelPrompt =
              key === "scale"
                ? "elegant woman hand holding the piece between thumb and fingers, hand at natural scale, plain neutral background, soft studio light, commercial jewelry scale reference photography, sharp focus"
                : config.modelPrompt;

            const modelRes = await fetch("/api/model-create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gender: "female",
                ageRange: "26-35",
                skinTone: "medium",
                bodyType: "average",
                // `pose` y `expression` son OBLIGATORIOS en /api/model-create.
                // Faltaban, así que el paso moría con
                // 'Missing required field "pose"' antes de generar nada — esa
                // era la causa real de "en la modelo no funciona".
                pose: "standing",
                expression: "natural",
                customDetails: modelPrompt,
              }),
              signal,
            });
            const modelData = await safeJson(modelRes);
            const modelPhotoUrl = pickUrl(modelData.data);
            if (!modelData.success || !modelPhotoUrl) return fail(modelData.error);
            const modelCost = modelData.cost ?? 0.055;

            const tryonRes = await fetch("/api/jewelry-tryon", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                modelImage: modelPhotoUrl,
                jewelryImage: jewelryUrl,
                // La escala se compone siempre contra una mano.
                type: key === "scale" ? "ring" : job.subType,
                mode: "modelo",
                featureDescriptor: descriptor ?? undefined,
                // El prompt de colocacion de Vision va al TRY-ON, que es quien
                // pone la joya sobre el cuerpo. Se estaba mandando a
                // model-create, o sea describiendo a la modelo en vez de dirigir
                // la colocacion: la direccion se perdia.
                placementDirection: key === "model" ? job.prompts?.model : undefined,
                negative: job.prompts?.negative,
              }),
              signal,
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
            done(url, modelCost + (tryonData.cost ?? 0.05));
            runIdentityCheck(jobId, key, jewelryUrl, url, true);
            return true;
          }

          case "social": {
            const current = jobsRef.current.find((j) => j.id === jobId);
            if (!current) return false;
            // ORDEN DELIBERADO. La slide 1 se lleva el 80% del resultado, así
            // que va la escena de lujo; el detalle macro (prueba de calidad)
            // queda en el medio, donde el engagement cae.
            const order: StepKey[] = ["luxury", "packshot", "macro", "model", "scale"];
            const urls = order
              .map((k) => current.steps[k].resultUrl)
              .filter((u): u is string => Boolean(u) && !isVideoUrl(u));
            if (urls.length === 0) return fail(jt.messages.needsEstante);

            patchStep(jobId, key, { status: "processing", inputUrl: urls[0], error: undefined });
            focusCard();
            const res = await fetch("/api/social-kit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              // EL REEL NO BLOQUEA EL CARRUSEL. Renderizar 1080x1920 con ffmpeg
              // (zoompan + xfade, libx264) en una funcion serverless se pasa de
              // cualquier limite razonable: el paso moria por timeout y no
              // entregaba NADA, ni siquiera el carrusel, que se arma en 2s.
              // Ahora el paso devuelve el carrusel siempre; el reel queda para
              // pedirlo aparte cuando haga falta.
              // El reel VA. Estuvo en `false` un tiempo para cortar un timeout y
              // quedo asi, con lo cual el paso 8 entregaba solo el carrusel y
              // avisaba "no se pudo generar en este entorno" — un mensaje que ni
              // siquiera correspondia, porque el reel no se intentaba.
              //
              // Se limita a 4 slides: el reel es un loop de vitrina, no el
              // catalogo entero, y cada slide suma tiempo de encodeo contra el
              // maxDuration de la ruta (que fue el timeout original).
              body: JSON.stringify({
                imageUrls: urls.slice(0, 10),
                includeReel: true,
                reelImageUrls: urls.slice(0, 4),
              }),
              signal,
            });
            const data = await safeJson(res);
            if (!data.success) return fail(data.error);
            const carousel = (data.data?.carousel as string[]) ?? [];
            const reel = data.data?.reel as string | null;
            patchStep(jobId, key, {
              status: "done",
              carousel,
              resultUrl: carousel[0],
              reelUrl: reel ?? undefined,
              reelError: (data.data?.reelError as string) ?? undefined,
              cost: 0,
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

  const saveToGallery = useCallback(async (job: Job) => {
    const addImages = useGalleryStore.getState().addImages;
    const baseName = job.filename.replace(/\.[^.]+$/, "");
    const stamp = Date.now();
    const items = [];
    for (const key of STEP_ORDER) {
      // El recorte es intermedio; el kit de redes se descarga aparte.
      if (key === "isolate" || key === "social") continue;
      const step = job.steps[key];
      if (!step.resultUrl || step.status === "error") continue;
      items.push({
        id: `jewelry-${key}-${stamp}-${job.id}`,
        filename: `${baseName}-${key}.jpg`,
        resultUrl: await urlToDataUrl(step.resultUrl),
        originalUrl: job.previewUrl,
        date: new Date().toISOString(),
        operations: [`jewelry-${key}`],
        project: `jewelry-${job.subType}`,
      });
    }
    if (items.length > 0) addImages(items);
  }, []);

  /** Sube la foto y deja que Vision decida el tipo antes de gastar en generar. */
  const prepareJob = useCallback(
    async (jobId: string): Promise<boolean> => {
      const job = jobsRef.current.find((j) => j.id === jobId);
      if (!job) return false;

      let uploadedUrl = job.uploadedUrl;
      if (!uploadedUrl) {
        try {
          const form = new FormData();
          form.append("file", job.file);
          const upRes = await fetch("/api/upload", { method: "POST", body: form });
          const upData = await safeJson(upRes);
          uploadedUrl = pickUrl(upData.data);
          if (!upData.success || !uploadedUrl) throw new Error(upData.error ?? "Falló la subida");
          patchJob(jobId, { uploadedUrl });
        } catch (err) {
          patchJob(jobId, { status: "error" });
          toast.error(
            jt.messages.jobError(job.filename, humanizeError(err instanceof Error ? err.message : String(err))),
          );
          return false;
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
        const features: JewelryFeatures | null = data?.success ? data.data : null;
        if (features) {
          const { subType, confident } = featuresToSubType(features.tipo, features.detalles_visibles);
          patchJob(jobId, {
            features,
            analysisStatus: "done",
            subType,
            subTypeConfident: confident,
          });
        } else {
          patchJob(jobId, { analysisStatus: "error" });
        }
      } catch {
        patchJob(jobId, { analysisStatus: "error" });
      }

      // Dirección de arte por foto. No bloquea: si falla, se usan las
      // plantillas por sub-tipo.
      try {
        const current = jobsRef.current.find((j) => j.id === jobId);
        const res = await fetch("/api/jewelry-prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: uploadedUrl, features: current?.features ?? null }),
        });
        const data = await res.json();
        patchJob(jobId, { prompts: data?.success ? data.data : null });
      } catch {
        patchJob(jobId, { prompts: null });
      }
      return true;
    },
    [humanizeError, jt.messages, patchJob],
  );

  const processJob = useCallback(
    async (jobId: string): Promise<void> => {
      patchJob(jobId, { status: "active" });
      const ok = await prepareJob(jobId);
      if (!ok) return;

      // Un fallo NUNCA aborta la cadena: cada paso mira si tiene con qué correr.
      for (const key of STEP_ORDER) {
        const current = jobsRef.current.find((j) => j.id === jobId);
        if (!current) return;
        if (!current.steps[key].enabled) {
          patchStep(jobId, key, { status: "skipped" });
          continue;
        }
        await runStep(jobId, key);
      }
      patchJob(jobId, { status: "done" });
    },
    [patchJob, patchStep, prepareJob, runStep],
  );

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

  /**
   * "No me gusta": saca la versión actual de la lista y vuelve a la anterior.
   * Si era la única, el paso queda vacío y listo para rehacer — antes no había
   * forma de rechazar un resultado sin gastar en otro.
   */
  const handleDiscard = (jobId: string, key: StepKey) => {
    const step = jobsRef.current.find((j) => j.id === jobId)?.steps[key];
    if (!step) return;
    const remaining = (step.candidates ?? []).filter((u) => u !== step.resultUrl);
    patchStep(jobId, key, {
      candidates: remaining,
      resultUrl: remaining[remaining.length - 1],
      carousel: undefined,
      reelUrl: undefined,
      status: remaining.length > 0 ? "done" : "idle",
      warning: undefined,
      error: undefined,
    });
  };

  /** Vuelve a leer la foto con Vision, descartando lo que habia. */
  const handleReanalyze = async (jobId: string) => {
    const job = jobsRef.current.find((j) => j.id === jobId);
    if (!job?.uploadedUrl) return;
    patchJob(jobId, { analysisStatus: "analyzing" });
    try {
      const res = await fetch("/api/product-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: job.uploadedUrl, category: "jewelry" }),
      });
      const data = await res.json();
      const features: JewelryFeatures | null = data?.success ? data.data : null;
      if (features) {
        const { subType, confident } = featuresToSubType(features.tipo, features.detalles_visibles);
        patchJob(jobId, { features, analysisStatus: "done", subType, subTypeConfident: confident });
      } else {
        patchJob(jobId, { analysisStatus: "error" });
      }
    } catch {
      patchJob(jobId, { analysisStatus: "error" });
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

  const estimatedCost = useMemo(
    () =>
      STEP_ORDER.reduce((sum, key) => {
        if (key === "model" && !includeModel) return sum;
        if (key === "scale" && !includeScale) return sum;
        return sum + STEP_COST[key];
      }, 0),
    [includeModel, includeScale],
  );

  const spentTotal = jobs.reduce(
    (sum, j) => sum + Object.values(j.steps).reduce((s, st) => s + st.cost, 0),
    0,
  );
  const doneCount = jobs.filter((j) => j.status === "done").length;

  /* ------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-surface text-heading">
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
        <span
          className="shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]"
          title={jt.stepCard.buildTitle}
        >
          build {process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev"}
        </span>
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

        {/* ---------------- Configuración ---------------- */}
        {phase === "setup" && (
          <>
            <section className="mb-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <h2 className="text-sm font-semibold text-white">{jt.config.heading}</h2>
              <p className="mb-4 mt-0.5 text-xs text-[var(--text-secondary)]">
                {jt.config.subheading}
              </p>

              <div className="mb-4">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  {jt.config.outputs}
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={includeModel}
                      onChange={(e) => setIncludeModel(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-[var(--accent)]"
                    />
                    <User className="h-4 w-4 text-[var(--accent)]" />
                    {jt.steps.model.label}
                    <span className="text-[11px] text-[var(--text-secondary)]">(+$0.10)</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={includeScale}
                      onChange={(e) => setIncludeScale(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-[var(--accent)]"
                    />
                    <Hand className="h-4 w-4 text-[var(--accent)]" />
                    {jt.steps.scale.label}
                    <span className="text-[11px] text-[var(--text-secondary)]">(+$0.10)</span>
                  </label>
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">{jt.config.outputsHint}</p>
              </div>

              <FlowPreview includeModel={includeModel} includeScale={includeScale} />

              <div className="mb-4 flex items-center justify-between rounded-lg border border-[var(--border-accent)] bg-[var(--accent-dim)] px-3 py-2">
                <span className="text-xs font-medium text-[var(--accent)]">{jt.config.estimated}</span>
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
                      <p className="min-w-0 flex-1 truncate text-sm text-gray-200" title={job.filename}>
                        {job.filename}
                      </p>
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
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {busy ? jt.buttons.processing : jt.buttons.processAll}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      jobs.forEach((j) => URL.revokeObjectURL(j.previewUrl));
                      previewUrlsRef.current = [];
                      setJobs([]);
                      jobsRef.current = [];
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

        {/* ---------------- Pipeline ---------------- */}
        {phase === "pipeline" && activeJob && (
          <>
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

            <StepRail steps={activeJob.steps} onJump={jumpToStep} />

            <VisionPanel
              job={activeJob}
              disabled={busy}
              onChangeType={(s) =>
                patchJob(activeJob.id, { subType: s, subTypeConfident: true })
              }
              // Lo que se corrige aca alimenta TODOS los prompts, porque parten
              // de jewelryDescriptor(features).
              onEditFeatures={(patch) =>
                activeJob.features &&
                patchJob(activeJob.id, { features: { ...activeJob.features, ...patch } })
              }
              onReanalyze={() => void handleReanalyze(activeJob.id)}
            />

            {/* Etapas */}
            {STAGES.map((stage) => {
              const visible = stage.steps.filter((k) => activeJob.steps[k].enabled);
              if (visible.length === 0) return null;
              const stageCopy = jt.stages[stage.key];
              const doneInStage = visible.filter((k) =>
                ["done", "accepted", "skipped"].includes(activeJob.steps[k].status),
              ).length;
              return (
                <section key={stage.key} className="mb-7">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-white">{stageCopy.label}</h2>
                      <p className="text-[11px] text-[var(--text-secondary)]">{stageCopy.hint}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-[var(--text-secondary)]">
                      {doneInStage}/{visible.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {visible.map((key) => (
                      <StepCard
                        key={key}
                        stepKey={key}
                        step={activeJob.steps[key]}
                        stepNumber={STEP_ORDER.indexOf(key) + 1}
                        busy={busy}
                        filenamePrefix={activeJob.filename.replace(/\.[^.]+$/, "")}
                        onAccept={() => patchStep(activeJob.id, key, { status: "accepted" })}
                        onSkip={() => patchStep(activeJob.id, key, { status: "skipped" })}
                        onRerun={() => void handleRerun(activeJob.id, key)}
                        onStop={() => abortRef.current?.abort()}
                        onSelectVariant={(url) =>
                          patchStep(activeJob.id, key, { resultUrl: url, status: "done" })
                        }
                        onDiscard={() => handleDiscard(activeJob.id, key)}
                        collapsed={
                          !expanded.has(key) &&
                          activeJob.steps[key].status !== "processing" &&
                          activeJob.steps[key].status !== "error"
                        }
                        onToggleCollapse={() => toggleExpanded(key)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

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
