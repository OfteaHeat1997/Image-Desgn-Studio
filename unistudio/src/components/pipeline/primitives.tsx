"use client";

/* =============================================================================
 * Primitivas compartidas de pipeline — UniStudio
 * =============================================================================
 * Las piezas de UI que todo pipeline necesita: badge de estado, miniatura a
 * prueba de URLs caducadas, comparador antes/después y visor a pantalla
 * completa.
 *
 * POR QUÉ VIVEN ACÁ Y NO EN LA PÁGINA
 * -----------------------------------
 * El pipeline de lencería (`src/app/pipelines/lingerie/page.tsx`) las tenía
 * inline. Cuando joyería necesitó la misma UX, copiarlas otra vez habría dejado
 * dos versiones que se desincronizan. Acá reciben sus textos por props en vez
 * de leer `t.pipelines.lingerie`, así cualquier pipeline las usa con su propia
 * copy sin arrastrar el i18n de otro.
 *
 * NOTA: lencería todavía usa sus copias inline. Migrarla es trabajo posterior —
 * hoy ese archivo es zona activa de otra terminal (ver COORDINATION.md).
 * ========================================================================== */

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Image as ImageIcon,
  Maximize2,
  SkipForward,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Estado de un paso                                                   */
/* ------------------------------------------------------------------ */

export type PipelineStepStatus =
  | "idle"
  | "pending"
  | "processing"
  | "done"
  | "error"
  | "skipped"
  | "accepted";

export interface StatusBadgeLabels {
  idle: string;
  pending: string;
  processing: string;
  done: string;
  error: string;
  skipped: string;
  accepted: string;
}

export function StatusBadge({
  status,
  labels,
}: {
  status: PipelineStepStatus;
  labels: StatusBadgeLabels;
}) {
  const config = {
    idle:       { label: labels.idle,       className: "bg-white/5 text-[var(--text-secondary)] border-white/10",                    icon: Clock },
    pending:    { label: labels.pending,    className: "bg-white/5 text-[var(--text-secondary)] border-white/10",                    icon: Clock },
    processing: { label: labels.processing, className: "bg-[var(--accent-dim)] text-[var(--accent-light)] border-[var(--accent)]/25", icon: Clock },
    done:       { label: labels.done,       className: "bg-[var(--success-dim)] text-[var(--success)] border-[var(--success)]/30",    icon: CheckCircle2 },
    error:      { label: labels.error,      className: "bg-red-500/15 text-red-300 border-red-500/25",                                icon: AlertCircle },
    skipped:    { label: labels.skipped,    className: "bg-white/5 text-[var(--text-secondary)] border-white/10",                    icon: SkipForward },
    accepted:   { label: labels.accepted,   className: "bg-[var(--success-dim)] text-[var(--success)] border-[var(--success)]/30",    icon: CheckCircle2 },
  }[status];

  const Icon = config.icon;
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className,
      )}
    >
      {status === "processing" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] lz-dot" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {config.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Descarga con detección de URLs caducadas                            */
/* ------------------------------------------------------------------ */

const CHECKER_DARK = "repeating-conic-gradient(#1a1a1a 0% 25%, #141414 0% 50%) 0 0 / 16px 16px";
const CHECKER_MID = "repeating-conic-gradient(#2a2a2a 0% 25%, #222 0% 50%) 0 0 / 12px 12px";

function buildProxyHref(url: string, filename: string): string {
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
}

/**
 * Descarga un asset upstream. Las URLs de fal.media / replicate.delivery caducan
 * en horas, y sin este manejo el browser abría el JSON de error como pestaña en
 * vez de avisar. Con esto sale un toast claro.
 */
export async function downloadAsset(url: string, filename: string): Promise<void> {
  if (url.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  try {
    const res = await fetch(buildProxyHref(url, filename));
    if (!res.ok) {
      let expired = false;
      try {
        const body = await res.json();
        expired = body?.expired === true;
      } catch {
        /* not JSON, ignore */
      }
      toast.error(
        expired
          ? "Este archivo expiró. Volvé a generarlo desde la galería."
          : `No se pudo descargar (HTTP ${res.status}).`,
      );
      return;
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.error("[pipeline] downloadAsset failed:", err);
    toast.error("No se pudo descargar el archivo. Reintentá.");
  }
}

/**
 * Convierte una URL upstream a data: URL para guardar en galería de forma
 * persistente. Degrada en silencio a la URL original si falla.
 */
export async function urlToDataUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

export function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes(".mp4") || url.includes(".webm") || url.includes("video");
}

/* ------------------------------------------------------------------ */
/*  Miniatura                                                           */
/* ------------------------------------------------------------------ */

export interface ThumbLabels {
  waiting: string;
  expired: string;
}

/**
 * Miniatura que nunca muestra el ícono roto del browser. Si la URL caducó o no
 * llegó todavía, cae a un placeholder con textura de transparencia.
 */
export function ImageThumb({
  url,
  label,
  className,
  labels,
}: {
  url?: string;
  label: string;
  className?: string;
  labels: ThumbLabels;
}) {
  const [hasError, setHasError] = useState(false);
  // Una URL nueva merece un intento nuevo: sin esto, un paso que falló y luego
  // se rehízo con éxito seguía mostrando el placeholder de "expiró".
  useEffect(() => setHasError(false), [url]);

  if (!url || hasError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-center",
          className,
        )}
        style={{ background: CHECKER_DARK }}
      >
        <ImageIcon className="h-6 w-6 text-[var(--text-muted)]" />
        <span className="text-[11px] leading-tight text-[var(--text-secondary)]">
          {hasError ? labels.expired : labels.waiting}
        </span>
      </div>
    );
  }

  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        className={cn("rounded-lg object-cover", className)}
        muted
        loop
        autoPlay
        playsInline
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={label}
      className={cn("rounded-lg object-contain", className)}
      style={{ background: CHECKER_MID }}
      onError={() => setHasError(true)}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Comparador antes / después                                          */
/* ------------------------------------------------------------------ */

export interface BeforeAfterLabels extends ThumbLabels {
  before: string;
  after: string;
  compareAria: (label: string) => string;
}

/**
 * Comparador con divisor deslizable. A prueba de fallos: si el resultado falta,
 * es video o la imagen caducó, cae a `ImageThumb` en vez de mostrar alt-text roto.
 */
export function BeforeAfterSlider({
  before,
  after,
  label,
  className,
  labels,
}: {
  before?: string;
  after?: string;
  label: string;
  className?: string;
  labels: BeforeAfterLabels;
}) {
  const [pos, setPos] = useState(50);
  const [beforeErr, setBeforeErr] = useState(false);
  const [afterErr, setAfterErr] = useState(false);

  useEffect(() => setAfterErr(false), [after]);
  useEffect(() => setBeforeErr(false), [before]);

  if (!after || isVideoUrl(after) || afterErr) {
    return (
      <ImageThumb
        url={afterErr ? undefined : after}
        label={label}
        className={className}
        labels={labels}
      />
    );
  }

  if (!before || beforeErr) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={after}
        alt=""
        className={cn("rounded-lg object-contain", className)}
        style={{ background: CHECKER_MID }}
        onError={() => setAfterErr(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative select-none overflow-hidden rounded-lg border border-white/10",
        className,
      )}
      style={{ background: CHECKER_MID }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after}
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
        onError={() => setAfterErr(true)}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={before}
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        onError={() => setBeforeErr(true)}
        draggable={false}
      />
      <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/90">
        {labels.before}
      </span>
      <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-[var(--accent)]/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
        {labels.after}
      </span>
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_6px_rgba(0,0,0,0.6)]"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
          <ChevronLeft className="h-3 w-3" />
          <ChevronRight className="-ml-1 h-3 w-3" />
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={labels.compareAria(label)}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Visor a pantalla completa                                           */
/* ------------------------------------------------------------------ */

export interface LightboxLabels {
  close: string;
  closeTitle: string;
  download: string;
  downloadTitle: string;
  compareWithOriginal: string;
  onlyResult: string;
  compareTitle: string;
  original: string;
  result: string;
  imageAlt: (n: number) => string;
  prevTitle: string;
  nextTitle: string;
}

export interface ImageLightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
  filenamePrefix?: string;
  /** Foto original / input del paso, para el modo comparación lado a lado. */
  compareWith?: string;
  labels: LightboxLabels;
}

/**
 * Modal a pantalla completa para inspeccionar un resultado. Arranca en modo
 * comparación cuando hay una foto "antes", porque al abrir a pantalla completa
 * lo primero que se quiere ver es qué cambió.
 */
export function ImageLightbox({
  images,
  startIndex,
  onClose,
  filenamePrefix,
  compareWith,
  labels,
}: ImageLightboxProps) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(startIndex, images.length - 1)));
  const [compareMode, setCompareMode] = useState<boolean>(!!compareWith);
  const url = images[idx];
  const isVideo = isVideoUrl(url);
  const canCompare = !!compareWith && !isVideo;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1)
        setIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight" && images.length > 1) setIdx((i) => (i + 1) % images.length);
      if ((e.key === "c" || e.key === "C") && compareWith && !isVideo) setCompareMode((c) => !c);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [images.length, onClose, compareWith, isVideo]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!url) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const filename = `${filenamePrefix ?? "unistudio"}-${idx + 1}.${isVideo ? "mp4" : "jpg"}`;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between gap-2 p-3 sm:p-4">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          {images.length > 1 && (
            <span className="rounded-md bg-black/60 px-2.5 py-1 font-medium text-white">
              {idx + 1} / {images.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCompare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCompareMode((c) => !c);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                compareMode
                  ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                  : "bg-white/10 text-white hover:bg-white/20",
              )}
              title={labels.compareTitle}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              {compareMode ? labels.onlyResult : labels.compareWithOriginal}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void downloadAsset(url, filename);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            title={labels.downloadTitle}
          >
            <Download className="h-3.5 w-3.5" />
            {labels.download}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 items-center gap-2 rounded-lg border border-[var(--border-accent)] bg-[var(--accent-dim)] px-3 font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[#0C0C0E]"
            title={labels.closeTitle}
          >
            <X className="h-5 w-5" />
            <span className="text-sm">{labels.close}</span>
            <kbd className="hidden rounded border border-current/30 px-1 text-[10px] opacity-70 sm:inline">
              Esc
            </kbd>
          </button>
        </div>
      </div>

      <div className="flex h-full w-full items-center justify-center px-4 py-16">
        {compareMode && canCompare && compareWith ? (
          <div className="flex h-full max-h-[80vh] w-full max-w-[95vw] items-center gap-2">
            <div className="relative h-full flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compareWith}
                alt={labels.original}
                className="h-full w-full rounded-lg object-contain"
                style={{ background: CHECKER_DARK }}
              />
              <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {labels.original}
              </span>
            </div>
            <div className="relative h-full flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={labels.result}
                className="h-full w-full rounded-lg object-contain"
                style={{ background: CHECKER_DARK }}
              />
              <span className="absolute right-2 top-2 rounded-md bg-[var(--accent)]/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {labels.result}
              </span>
            </div>
          </div>
        ) : isVideo ? (
          <video src={url} controls autoPlay loop className="max-h-[80vh] max-w-[95vw] rounded-lg" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={labels.imageAlt(idx + 1)}
            className="max-h-[80vh] max-w-[95vw] rounded-lg object-contain"
            style={{ background: CHECKER_DARK }}
          />
        )}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i - 1 + images.length) % images.length);
            }}
            className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title={labels.prevTitle}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i + 1) % images.length);
            }}
            className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title={labels.nextTitle}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cronómetro en vivo                                                  */
/* ------------------------------------------------------------------ */

/** Cuenta segundos mientras `active` es true; se resetea al activarse. */
export function useElapsedSeconds(active: boolean): number {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const tick = () => setSecs(Math.floor((Date.now() - start) / 1000));
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [active]);
  return active ? secs : 0;
}

/** Formatea segundos como m:ss. */
export function fmtClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export { Check as PipelineCheckIcon };
