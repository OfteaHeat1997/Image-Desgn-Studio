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
  Info,
  StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";
import { mapProductTypeToGarmentType } from "@/lib/constants/garment-types";
import type { ProductSpec } from "@/app/api/analyze-product/route";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type StepId = "isolate" | "model" | "tryon" | "photoBack" | "photoFullBody" | "productVideo" | "modelVideo";
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

/**
 * Ángulo / rol de una foto del producto (Phase 2f — P0-1). La usuaria lo
 * asigna manualmente por dropdown, o se auto-detecta del nombre del archivo.
 *
 * - "frontal": vista de frente del bra (lo que hoy se subía como única foto)
 * - "espalda":  vista trasera del producto (broche, banda, cruce de tirantes)
 * - "lado":     perfil lateral
 * - "detalle":  macro de textura, costura, encaje
 * - "flat":     prenda sola sobre fondo plano, sin modelo
 * - "otra":     no aplica / no clasificada
 */
type PhotoAngle = "frontal" | "espalda" | "lado" | "detalle" | "flat" | "otra";

const PHOTO_ANGLE_OPTIONS: { value: PhotoAngle; label: string; hint: string }[] = [
  { value: "frontal", label: "Frontal",  hint: "Vista de frente (default)" },
  { value: "espalda", label: "Espalda",  hint: "Cuando exista, se usa directo en el paso Foto Espalda" },
  { value: "lado",    label: "Lado",     hint: "Perfil lateral" },
  { value: "detalle", label: "Detalle",  hint: "Macro de textura, encaje, costura" },
  { value: "flat",    label: "Flat lay", hint: "Prenda sola, sin modelo" },
  { value: "otra",    label: "Otra",     hint: "No clasificada" },
];

/**
 * Heurística: mira el nombre del archivo y adivina el ángulo. Matchea tanto
 * español (delante/patras/atras/espalda/lado/detalle) como inglés (front/back/
 * side/detail/flat). Sin match → "frontal" por default (es lo más común).
 *
 * Ejemplos que mapea bien:
 *   "bh negro patras 011473.png"       → espalda
 *   "bh blanco delante 1.png"          → frontal
 *   "011473_back_view.jpg"             → espalda
 *   "product_side_left.png"            → lado
 *   "texture_macro.jpg"                → detalle
 */
function detectPhotoAngle(filename: string): PhotoAngle {
  const f = filename.toLowerCase();
  if (/\b(patras|atras|espalda|back|rear|trasera|posterior)\b/.test(f)) return "espalda";
  if (/\b(delante|frente|frontal|front)\b/.test(f)) return "frontal";
  if (/\b(lado|side|perfil|lateral)\b/.test(f)) return "lado";
  if (/\b(detalle|detail|macro|closeup|close.?up|zoom|textura)\b/.test(f)) return "detalle";
  if (/\b(flat|flatlay|flat.?lay|packshot|ghost|mannequin|prenda.?sola)\b/.test(f)) return "flat";
  return "frontal";
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
  // Ficha técnica del producto extraída por Claude Vision antes de correr los
  // steps. Se inyecta en photoBack/photoFullBody/tryon para que no inventen
  // color/textura/broche. Nullable: si falla el análisis, el pipeline sigue
  // con el comportamiento legacy (invención libre).
  productSpec?: ProductSpec | null;
  // Estado del análisis: "pending" = no empezó, "analyzing" = en curso,
  // "done" = ya hay spec, "error" = falló (seguimos sin spec).
  analysisStatus?: "pending" | "analyzing" | "done" | "error";
  analysisError?: string;
  // Phase 2f P0-1: ángulo de la foto. Auto-detectado del filename, editable
  // por la usuaria en un dropdown. En P0-2, si alguna foto del batch tiene
  // angle="espalda", se usa directo en el paso Foto Espalda (no se reconstruye
  // desde la frontal).
  photoAngle: PhotoAngle;
  // Clave para agrupar fotos del MISMO producto (ej. "011473" extraído del
  // nombre). Si dos jobs comparten referenceKey, comparten referencias
  // cruzadas (la espalda de uno puede servir a la frontal del otro).
  referenceKey?: string;
}

/**
 * Extrae una clave de referencia del nombre del archivo. Soporta patrones:
 *   "bh negro patras 011473.png"  → "011473"
 *   "011473_802_front.png"        → "011473"
 *   "REF-71332 blanco.jpg"        → "71332"
 * Si no encuentra nada parseable, devuelve undefined (la usuaria puede
 * agrupar manualmente después).
 */
function detectReferenceKey(filename: string): string | undefined {
  // Busca el primer número de 4+ dígitos (típico de REFs Unistyles tipo
  // 011473, 71332, 199307). Ignora 4 dígitos que sean claramente año/resolución.
  const m = filename.match(/\b(\d{4,7})\b/);
  if (!m) return undefined;
  const num = m[1];
  // Descarta tamaños típicos de resolución (1200, 1920, 2048, etc.)
  if (/^(1200|1920|2048|4096|800|1080|720|480|360|240)$/.test(num)) {
    // Buscar el siguiente número en el string
    const all = filename.match(/\b\d{4,7}\b/g) || [];
    const filtered = all.filter((n) => !/^(1200|1920|2048|4096|800|1080|720|480|360|240)$/.test(n));
    return filtered[0];
  }
  return num;
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

// Flow lencería — pensado para cubrir las 4 vistas que muestra un ecommerce tipo
// Leonisa por producto (hero frontal, espalda, cuerpo completo, prenda sola) +
// 2 videos (360 producto, modelo posando).
//
// photoBack y photoFullBody reusan el SEED del model step → la misma identidad
// de modelo en distintas poses (mismo rostro, cuerpo, tono piel). Sin seed
// compartido serían modelos diferentes en cada foto.
const STEP_DEFS: Omit<PipelineStep, "status" | "inputUrl" | "resultUrl" | "error" | "cost_actual">[] = [
  { id: "isolate",       label: "Aislar Producto",        description: "Quitar la modelo y fondo, dejar solo la prenda flotando estilo ghost 3D", icon: Scissors,  cost: "$0.01-$0.04",  enabled: true  },
  { id: "model",         label: "Crear Modelo IA",        description: "Generar modelo con licencia libre (se reutiliza entre colores de la misma REF)", icon: User,      cost: "$0.055", enabled: true  },
  { id: "tryon",         label: "Foto Frontal (opcional)", description: "Vestir la modelo IA con TU prenda, vista frontal 3/4. Si falla, el pipeline sigue con el resto.", icon: Shirt,     cost: "$0.02",  enabled: true  },
  { id: "photoBack",     label: "Foto Espalda",           description: "Misma modelo de espaldas, mostrando el broche y la banda del bra (mismo seed, misma identidad)", icon: User,      cost: "$0.075", enabled: true  },
  { id: "photoFullBody", label: "Foto Cuerpo Completo",   description: "Misma modelo de cuerpo entero con short/panty nude + bra (mismo seed, misma identidad)",         icon: User,      cost: "$0.075", enabled: true  },
  { id: "productVideo",  label: "Video 360° del Producto", description: "Rotación 360° de la prenda aislada, estilo producto rotando (5s, 1:1)",     icon: Film,      cost: "$0.05",  enabled: true  },
  { id: "modelVideo",    label: "Video de la Modelo",      description: "Modelo vestida con la prenda, movimiento natural posando (5s, 9:16)",    icon: Film,      cost: "$0.05",  enabled: true  },
];

function makeSteps(): PipelineStep[] {
  return STEP_DEFS.map((d) => ({ ...d, status: "idle" }));
}

/**
 * P0-4: documentación por step mostrada en el tooltip "i". Explica qué hace,
 * qué proveedor usa, cuánto tarda típico, cuánto cuesta, qué puede fallar y
 * qué puede hacer la usuaria si falla. Fuente: docs/pipelines/lingerie.md.
 */
interface StepDoc {
  what: string;          // qué hace este step en lenguaje humano
  provider: string;      // qué proveedor / modelo usa
  duration: string;      // tiempo típico
  costDetail: string;    // detalle del costo
  canFail: string[];     // modos típicos de falla
  tips: string[];        // qué hacer la usuaria
}

const STEP_DOCS: Record<StepId, StepDoc> = {
  isolate: {
    what: "Quita la modelo y el fondo de tu foto, dejando solo la prenda flotando como si fuera un producto 3D (estilo ghost mannequin).",
    provider: "grounded_sam + SeedDream edit (o Flux Kontext para no-lencería). Fallback: WithoutBG.",
    duration: "15-45 s",
    costDetail: "$0.01 si el primer proveedor funciona; hasta $0.04 si cae al fallback final.",
    canFail: [
      "El proveedor no identifica la prenda si hay poca iluminación o fondo complejo.",
      "Si cae al último fallback (rembg), puede dejar a la modelo adentro — en ese caso el pipeline se detiene con error claro.",
    ],
    tips: [
      "Reintenta — a veces el primer intento falla por cola saturada.",
      "Si falla siempre, probá con una foto con fondo más limpio.",
      "Podés saltar este paso si ya subiste la prenda flotando (flat lay).",
    ],
  },
  model: {
    what: "Genera una modelo de IA con licencia libre (el rostro no existe). Se reutiliza en toda la REF para consistencia.",
    provider: "SeedDream v4.5 (fal.ai) — sin filtro de contenido, diseñado para lencería. Kontext Pro para no-lencería.",
    duration: "20-60 s",
    costDetail: "$0.055 por modelo nueva. $0 si reusás una ya creada desde el picker.",
    canFail: [
      "ByteDance rechaza el prompt por palabras sensibles → reintenta con prompt más seguro automáticamente.",
      "Timeout si la cola está saturada (raro en SeedDream).",
    ],
    tips: [
      "Si el resultado te gusta, aceptá y continuá — esta modelo se guarda y podés reusarla en futuras fotos sin pagar.",
      "Si no te gusta, reintentá — el seed random da variaciones.",
      "Ajustá tono de piel / edad / cuerpo en la configuración antes de correr.",
    ],
  },
  tryon: {
    what: "Viste la modelo de IA con TU prenda — la prenda real, preservando color y cortes.",
    provider: "Kolors Virtual Try-On (fal.ai) para lencería. FASHN v1.6 para otras categorías.",
    duration: "10-30 s",
    costDetail: "$0.02 con Kolors; $0.05 con FASHN.",
    canFail: [
      "image_load_error: el archivo intermedio no llegó a fal.ai (suele ser URL temporal caída).",
      "Kolors reinterpreta la prenda en ángulos raros — el frente queda fiel, los laterales varían.",
    ],
    tips: [
      "Este paso es OPCIONAL — si falla, el pipeline sigue con los demás.",
      "Reintentá una vez antes de saltarlo.",
    ],
  },
  photoBack: {
    what: "Genera una foto de la misma modelo de espaldas, mostrando broche y banda del bra. Si subiste una foto etiquetada como 'espalda', se usa esa directo; si no, la IA la infiere del frente.",
    provider: "model-create (SeedDream con mismo seed) + Kolors Try-On. Si hay foto de espalda real, la usa como garment reference.",
    duration: "30-90 s",
    costDetail: "$0.075 ($0.055 modelo + $0.02 tryon).",
    canFail: [
      "Sin foto de espalda real, la IA inventa detalles: broche, cruce de tirantes, banda pueden diferir del producto.",
      "Mismo seed del paso 'model' → misma cara, pero ropa y pose son nuevos.",
    ],
    tips: [
      "Para mejor fidelidad, subí una foto de la espalda real del bra y etiquetala como 'Espalda' en el setup — P0-2 la usa automáticamente.",
      "Si el resultado no sirve, saltá este paso — el pipeline sigue con los otros.",
    ],
  },
  photoFullBody: {
    what: "Genera una foto de la modelo de cuerpo entero con bra + briefs nude (shaper shorts).",
    provider: "model-create (SeedDream con mismo seed) + Kolors Try-On.",
    duration: "30-90 s",
    costDetail: "$0.075 ($0.055 modelo + $0.02 tryon).",
    canFail: [
      "Si el prompt confunde a SeedDream, los shaper shorts pueden salir como pantalones largos marrones (bug histórico ya fixeado).",
      "La identidad se preserva con seed — pero la iluminación puede variar vs la frontal.",
    ],
    tips: [
      "Si salió mal, rehacé — el seed es el mismo pero el random de la composición cambia.",
      "Para precisión absoluta, subí una foto real de cuerpo completo y etiquetala como 'Flat lay' o 'Otra'.",
    ],
  },
  productVideo: {
    what: "Video 360° de la prenda rotando sobre sí misma, estilo producto 3D de ecommerce.",
    provider: "wan-2.2-fast (Replicate) — 81 frames mínimo, guidance 3.0.",
    duration: "60-180 s",
    costDetail: "$0.05 por video de 5s.",
    canFail: [
      "REQUIERE que el paso 'Aislar Producto' haya completado — si no, el video rotaría la foto original (modelo + prenda).",
      "Si lo generás sin aislar, no sirve y el paso falla con mensaje claro.",
    ],
    tips: [
      "No desactives 'Aislar Producto' si querés este video.",
      "Si la rotación queda rara, reintentá — el random de wan-2.2 varía el motion.",
    ],
  },
  modelVideo: {
    what: "Video de la modelo posando con la prenda — movimiento natural, ideal para redes.",
    provider: "wan-2.2-fast (Replicate). Usa el resultado del tryon; si no hay tryon, la modelo sola.",
    duration: "60-180 s",
    costDetail: "$0.05 por video de 5s.",
    canFail: [
      "Si el tryon falló, el video muestra la modelo con base beige en vez de tu bra.",
      "wan puede generar movimientos bruscos si el prompt no es específico.",
    ],
    tips: [
      "Corré primero 'Foto Frontal (tryon)' — así el video usa tu prenda real.",
      "Reintentá si el movimiento queda feo.",
    ],
  },
};

/**
 * Convierte mensajes técnicos de error en texto humano, amigable para la
 * usuaria que no sabe lo que es un 422 o un JSON. Si no matchea ningún pattern,
 * devuelve un mensaje genérico por step.
 */
function humanizeStepError(stepId: StepId, rawError?: string): string {
  const msg = (rawError ?? '').toLowerCase();

  // Patterns comunes de error → mensaje humano
  if (msg.includes('image_load_error') || msg.includes('failed to load the image')) {
    return "La foto se corrompió antes de llegar a la IA. Reintentá — suele funcionar la segunda vez.";
  }
  if (msg.includes('content policy') || msg.includes('e005') || msg.includes('flagged as sensitive')) {
    return "La IA rechazó la prenda por su filtro de contenido. Reintentamos con otro proveedor automáticamente — dale reintentar.";
  }
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('auth')) {
    return "Hubo un problema de autorización con el proveedor IA. Verificá que las API keys en Vercel estén activas.";
  }
  if (msg.includes('404') || msg.includes('not found')) {
    return "El archivo intermedio se perdió o expiró. Reintentá para regenerar desde el paso anterior.";
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return "La IA tardó demasiado. Reintentá — suele ser cola saturada, no error de tu foto.";
  }
  if (msg.includes('non-image content') || msg.includes('json metadata')) {
    return "El archivo que llegó a la IA no era una imagen válida. Reintentá.";
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return "Demasiadas requests al proveedor. Esperá 30 segundos y reintentá.";
  }
  if (msg.includes('network') || msg.includes('fetch failed')) {
    return "Error de conexión al proveedor. Revisá tu internet y reintentá.";
  }

  // Fallback por step
  const byStep: Record<StepId, string> = {
    isolate: "No pudimos aislar la prenda. Probá con una foto más clara donde se vea todo el producto.",
    model: "No pudimos generar la modelo IA. Reintentá o probá con otras configuraciones.",
    tryon: "No pudimos vestir la modelo con tu prenda. Reintentá — si sigue fallando podés saltar este paso y los videos se generan igual.",
    photoBack: "No pudimos generar la foto de espalda. El resto del pipeline sigue sin problema.",
    photoFullBody: "No pudimos generar la foto de cuerpo completo. El resto del pipeline sigue sin problema.",
    productVideo: "No pudimos generar el video 360°. Reintentá.",
    modelVideo: "No pudimos generar el video de la modelo. Reintentá.",
  };
  return byStep[stepId] ?? "Algo salió mal en este paso. Reintentá.";
}

/* ------------------------------------------------------------------ */
/*  Cost estimate                                                       */
/* ------------------------------------------------------------------ */

function estimateCost(steps: PipelineStep[], imageCount: number): number {
  const perImage: Record<StepId, number> = {
    isolate: 0.04,       // rango $0.01-$0.04 — SeedDream ghost fallback cuando grounded_sam falla
    model: 0.055,
    tryon: 0.02,
    photoBack: 0.075,    // model-create (0.055) + tryon (0.02) — nueva modelo con mismo seed + distinta pose
    photoFullBody: 0.075,
    productVideo: 0.05,
    modelVideo: 0.05,
  };
  const enabledSteps = steps.filter((s) => s.enabled);
  let cost = 0;
  for (const step of enabledSteps) {
    if (step.id === "model") {
      // model is generated ONCE and reused across all color variants for the same REF
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

/**
 * Thumbnail para el picker de modelos reusables. Si la previewUrl no carga
 * (URL vieja de Replicate expirada, fal URL borrada, CORS), muestra icono +
 * nombre corto en vez del icono roto <img> que el browser pone por default.
 * La usuaria reportó "hay imágenes pero no se ven las modelos" — esto lo arregla.
 */
function ModelThumb({ url, alt, name }: { url: string; alt: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 bg-white/5 text-center px-2"
        style={{ background: "repeating-conic-gradient(#1a1a1a 0% 25%, #141414 0% 50%) 0 0 / 10px 10px" }}
      >
        <ImageIcon className="h-5 w-5 text-gray-600" />
        <span className="text-[9px] text-gray-500 leading-tight line-clamp-2">{name}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="aspect-[3/4] w-full object-cover bg-white/5"
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

function ImageThumb({ url, label, className }: { url?: string; label: string; className?: string }) {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) {
    // Placeholder visual decente en lugar del texto 'Sin imagen' plano.
    // Muestra icono + mensaje contextual con el background checkerboard típico de transparencia.
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 text-center px-3",
          className,
        )}
        style={{
          background: "repeating-conic-gradient(#1a1a1a 0% 25%, #141414 0% 50%) 0 0 / 16px 16px",
        }}
      >
        <ImageIcon className="h-6 w-6 text-gray-600" />
        <span className="text-[11px] text-gray-500 leading-tight">
          {hasError ? "No pudimos cargar la imagen" : "Esperando paso anterior"}
        </span>
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
        onError={() => setHasError(true)}
      />
    );
  }
  return (
    <img
      src={url}
      alt={label}
      className={cn("rounded-lg object-contain", className)}
      style={{ background: "repeating-conic-gradient(#2a2a2a 0% 25%, #222 0% 50%) 0 0 / 12px 12px" }}
      onError={() => setHasError(true)}
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
  onStop?: () => void;
  autoMode: boolean;
}

function StepCard({ step, stepNumber, isActive, previousResultUrl, onAccept, onSkip, onRerun, autoMode, onStop }: StepCardProps) {
  const Icon = step.icon;
  // Fallback chain: step's own captured input > chain input > empty. Si los
  // dos son falsy, ImageThumb ahora muestra placeholder con ícono + "Esperando"
  // en lugar del texto crudo "Sin imagen".
  const inputUrl = step.inputUrl || previousResultUrl || undefined;
  const canInteract = step.status === "done" && !autoMode;
  const isVideo = step.resultUrl && (step.resultUrl.includes(".mp4") || step.resultUrl.includes(".webm") || step.resultUrl.includes("video"));
  const [showDocs, setShowDocs] = useState(false);
  const docs = STEP_DOCS[step.id];

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
              {/* P0-4: botón "i" que abre el panel de docs del step */}
              {docs && (
                <button
                  type="button"
                  onClick={() => setShowDocs((s) => !s)}
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full transition-colors",
                    showDocs
                      ? "bg-violet-500/30 text-violet-200"
                      : "bg-white/10 text-gray-400 hover:bg-violet-500/20 hover:text-violet-300",
                  )}
                  title="Ver detalles de este paso"
                  aria-label="Ver detalles"
                >
                  <Info className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{step.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500">{step.cost}</span>
          <StatusBadge status={step.status} />
          {/* P0-3: botón DETENER visible solo cuando está procesando y existe un handler */}
          {step.status === "processing" && onStop && (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
              title="Cancelar este paso"
            >
              <StopCircle className="h-3 w-3" />
              Detener
            </button>
          )}
        </div>
      </div>

      {/* P0-4: panel desplegable con docs del step (qué hace, proveedor, costo,
          duración, fallas típicas, tips). Se expande al tocar el ícono "i". */}
      {showDocs && docs && (
        <div className="border-b border-white/6 bg-violet-500/[0.03] px-5 py-4 text-xs">
          <div className="space-y-3">
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">Qué hace</p>
              <p className="text-gray-300">{docs.what}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">Proveedor</p>
                <p className="text-gray-400">{docs.provider}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">Duración típica</p>
                <p className="text-gray-400">{docs.duration}</p>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">Costo</p>
                <p className="text-gray-400">{docs.costDetail}</p>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-violet-300">Qué puede fallar</p>
              <ul className="list-disc space-y-0.5 pl-4 text-gray-400">
                {docs.canFail.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Tips</p>
              <ul className="list-disc space-y-0.5 pl-4 text-gray-300">
                {docs.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex h-40 w-full flex-col items-center justify-center gap-2 overflow-auto rounded-lg border border-red-500/20 bg-red-500/[0.04] px-3 py-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
                  <p className="text-center text-sm font-medium text-red-300">
                    {humanizeStepError(step.id, step.error)}
                  </p>
                  {step.error && (
                    <details className="w-full">
                      <summary className="cursor-pointer text-[10px] text-gray-500 hover:text-gray-300">
                        Ver detalle técnico
                      </summary>
                      <pre className="mt-1 max-h-20 overflow-auto rounded bg-black/40 p-2 text-[9px] leading-tight text-gray-400">
                        {step.error}
                      </pre>
                    </details>
                  )}
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

          {/* Error retry — Reintentar es primario (botón grande violeta), Saltar secundario (link gris) */}
          {step.status === "error" && (
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/6 pt-4">
              <button
                onClick={onSkip}
                className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-300 hover:underline"
              >
                Saltar este paso
              </button>
              <button
                onClick={onRerun}
                className="flex items-center gap-2 rounded-lg bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition-colors hover:bg-violet-400"
              >
                <RotateCcw className="h-4 w-4" />
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
/*  Product spec panel (ficha técnica leída por Claude Vision)          */
/* ------------------------------------------------------------------ */

interface ProductSpecPanelProps {
  status: ImageJob["analysisStatus"];
  spec: ProductSpec | null | undefined;
  error?: string;
  onChange: (updated: ProductSpec) => void;
  onReanalyze?: () => void;
}

/**
 * Campos que Claude lee del producto. Se mantienen string/null y se editan
 * inline; el resultado queda pegado al `job.productSpec` para iteraciones
 * futuras (hoy solo se muestran al usuario — iteración 2 los inyecta en los
 * prompts de generación).
 */
const SPEC_FIELDS: {
  group: "Identidad" | "Construcción" | "Detalles";
  key: string;
  label: string;
  placeholder: string;
  getter: (s: ProductSpec) => string | null | undefined;
  setter: (s: ProductSpec, v: string) => ProductSpec;
}[] = [
  { group: "Identidad", key: "color", label: "Color principal", placeholder: "ej. negro satinado",
    getter: (s) => s.color?.primary,
    setter: (s, v) => ({ ...s, color: { ...s.color, primary: v } }) },
  { group: "Identidad", key: "material", label: "Tela", placeholder: "ej. satén con elastano",
    getter: (s) => s.material,
    setter: (s, v) => ({ ...s, material: v }) },
  { group: "Identidad", key: "texture", label: "Textura", placeholder: "ej. lisa con brillo suave",
    getter: (s) => s.texture,
    setter: (s, v) => ({ ...s, texture: v }) },
  { group: "Identidad", key: "type", label: "Tipo de prenda", placeholder: "ej. bra deportivo con broche frontal",
    getter: (s) => s.garment?.type,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, type: v } }) },
  { group: "Construcción", key: "cup", label: "Copa", placeholder: "ej. preformada, costura en V",
    getter: (s) => s.garment?.cup,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, cup: v || null } }) },
  { group: "Construcción", key: "strapStyle", label: "Tirantes", placeholder: "ej. anchos ajustables",
    getter: (s) => s.garment?.strapStyle,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, strapStyle: v || null } }) },
  { group: "Construcción", key: "frontClosure", label: "Broche frontal", placeholder: "ej. 5 ganchos centrales o sin cierre",
    getter: (s) => s.garment?.frontClosure,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, frontClosure: v || null } }) },
  { group: "Construcción", key: "backClosure", label: "Cierre trasero", placeholder: "ej. 3 ganchos y gancho",
    getter: (s) => s.garment?.backClosure,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, backClosure: v || null } }) },
  { group: "Construcción", key: "band", label: "Banda", placeholder: "ej. ancha 5cm",
    getter: (s) => s.garment?.band,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, band: v || null } }) },
  { group: "Detalles", key: "padding", label: "Padding", placeholder: "ej. removible / sin padding",
    getter: (s) => s.garment?.padding,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, padding: v || null } }) },
  { group: "Detalles", key: "underwire", label: "Varilla", placeholder: "ej. sin varilla",
    getter: (s) => s.garment?.underwire,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, underwire: v || null } }) },
  { group: "Detalles", key: "details", label: "Otros detalles", placeholder: "ej. encaje, transparencias, bordados",
    getter: (s) => s.garment?.details,
    setter: (s, v) => ({ ...s, garment: { ...s.garment, details: v || null } }) },
];

function ProductSpecPanel({ status, spec, error, onChange, onReanalyze }: ProductSpecPanelProps) {
  const [open, setOpen] = useState(true);

  // Estado de análisis en curso
  if (status === "analyzing") {
    return (
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.05] p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
          <div>
            <p className="text-sm font-semibold text-white">Entendiendo el producto…</p>
            <p className="text-xs text-gray-400">Claude Vision está leyendo la foto para extraer color, textura y detalles reales.</p>
          </div>
        </div>
      </div>
    );
  }

  // Error en el análisis — el pipeline sigue pero sin spec
  if (status === "error") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-200">No se pudo leer la ficha técnica</p>
            <p className="mt-1 text-xs text-gray-400">
              {error || "Claude Vision no respondió."} El pipeline continúa igual que antes — los pasos siguientes van a inferir los detalles del producto.
            </p>
            {onReanalyze && (
              <button
                onClick={onReanalyze}
                className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
              >
                <RotateCcw className="h-3 w-3" />
                Reintentar análisis
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No spec todavía (pending o antes de correr el pipeline)
  if (!spec) return null;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <div>
            <p className="text-sm font-semibold text-white">Ficha técnica del producto</p>
            <p className="text-[11px] text-gray-500">Leída por Claude Vision — podés editar cualquier campo antes de que corra el resto.</p>
          </div>
        </div>
        <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-90")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-violet-500/15 px-5 py-4">
          {(["Identidad", "Construcción", "Detalles"] as const).map((group) => {
            const fields = SPEC_FIELDS.filter((f) => f.group === group);
            return (
              <div key={group}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-violet-300/70">{group}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {fields.map((field) => {
                    const value = field.getter(spec) ?? "";
                    return (
                      <label key={field.key} className="flex flex-col gap-1">
                        <span className="text-[11px] text-gray-400">{field.label}</span>
                        <input
                          type="text"
                          value={value}
                          placeholder={field.placeholder}
                          onChange={(e) => onChange(field.setter(spec, e.target.value))}
                          className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {spec.notes && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-violet-300/70">Notas</p>
              <textarea
                value={spec.notes}
                onChange={(e) => onChange({ ...spec, notes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
              />
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

/**
 * Convierte un File a dataURL base64 para mandar a /api/analyze-product.
 * Claude Vision necesita el contenido inline (no URLs externas accesibles
 * desde el server).
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`No se pudo leer el archivo ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Analiza las fotos de un producto con Claude Vision y devuelve la ficha
 * técnica. Por ahora solo usa la foto frontal (la que subiste inicialmente).
 * Cuando agreguemos multi-foto, el caller puede pasar más entradas.
 */
async function analyzeProductPhotos(
  photos: { file: File; role: "frontal" | "back" | "detail" | "flat" }[],
  productType: string,
): Promise<ProductSpec> {
  const dataUrls = await Promise.all(
    photos.map(async (p) => ({ dataUrl: await fileToDataUrl(p.file), role: p.role })),
  );
  const res = await fetch("/api/analyze-product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos: dataUrls, productType }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "analyze-product failed");
  return json.data.productSpec as ProductSpec;
}

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
  referenceNumber?: string,
  sharedSeed?: number,
  isolatedGarmentUrl?: string,
): Promise<{ resultUrl: string; cost: number; newModelUrl?: string; newSeed?: number }> {
  // Map productType to the garmentType the AI Agent routes expect. This unlocks:
  // - bg-remove's grounded_sam segmentation (needs garmentType + removeSubject)
  // - model-create's SeedDream routing with the no-moderation prompt
  // - tryon's forced Kolors for lingerie
  // Centralized in src/lib/constants/garment-types.ts (commit S1).
  const garmentTypeForApi = mapProductTypeToGarmentType(productType);
  const isLingerieFlow = garmentTypeForApi !== 'other';

  if (stepId === "isolate") {
    const res = await fetch("/api/bg-remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: inputUrl,
        provider: "replicate",
        // Lingerie input usually shows a model wearing the garment — we need
        // grounded_sam to strip the person and return ONLY the product, not
        // run plain rembg which keeps the person as foreground.
        removeSubject: isLingerieFlow,
        garmentType: garmentTypeForApi,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "bg-remove failed");
    // Hard-fail en lencería cuando isolate cayó al último recurso rembg plano:
    // ese provider solo quita el fondo pero DEJA A LA MODELO como foreground.
    // Downstream productVideo genera rotación de la modelo en vez de la prenda.
    // Mejor fallar acá con mensaje claro que generar un video 360° inútil.
    if (isLingerieFlow && json.data?.provider === 'rembg-last-resort') {
      throw new Error(
        "No se pudo aislar la prenda sola (grounded_sam y SeedDream fallaron). El resultado incluye a la modelo, así que el Video 360° del Producto no serviría. Reintentá con otra foto o desactivá el paso 'Aislar Prenda' si querés continuar con la foto original."
      );
    }
    return { resultUrl: json.data.url, cost: json.cost ?? 0.01 };
  }

  // Step "background" (Fondo Profesional) removed 2026-04-21 — era para pipeline
  // Estáticos (perfumes/cremas), no para lencería. El tryon Kolors ya provee
  // fondo blanco estudio. Dead code — cualquier legacy stepId "background" que
  // llegue acá cae al throw del final de runStep.

  if (stepId === "model") {
    if (sharedModelUrl) return { resultUrl: sharedModelUrl, cost: 0 };
    const pose = productType === "bra" ? "upper-body front-facing" : "full-body front-facing";
    // Generamos seed cliente-side y lo pasamos a model-create. Guardamos el seed
    // para que photoBack + photoFullBody puedan reusar la misma identidad de
    // modelo cambiando solo la pose.
    const generatedSeed = Math.floor(Math.random() * 999999);
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
        garmentType: garmentTypeForApi,
        seed: generatedSeed,
        // Tag the saved AiModel with this reference so future runs for same SKU can reuse
        referenceNumber: referenceNumber || undefined,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "model-create failed");
    return { resultUrl: json.data.url, cost: json.cost ?? 0.055, newModelUrl: json.data.url, newSeed: generatedSeed };
  }

  // photoBack y photoFullBody: generan una SEGUNDA foto reusando el seed de la
  // modelo original → misma identidad, distinta pose. Fujo interno:
  // 1. model-create(seed, pose=back-view|standing-full-body) → modelo en pose nueva
  // 2. tryon Kolors(modelo nueva, garment aislado) → foto final
  if (stepId === "photoBack" || stepId === "photoFullBody") {
    if (!isolatedGarmentUrl) {
      throw new Error(`${stepId === "photoBack" ? "Foto Espalda" : "Foto Cuerpo Completo"} necesita la prenda aislada. Activá el paso 'Aislar Producto'.`);
    }
    if (!isLingerieFlow) {
      throw new Error("Estas fotos extra solo aplican a lencería.");
    }
    const newPose = stepId === "photoBack" ? "back-view" : "standing";
    // Bug histórico: para photoFullBody se mandaba
    //   "plain white studio background, full body shot showing legs with nude seamless shaper shorts"
    // al campo `background`. /api/model-create lo embute en "against a X
    // background", produciendo "against a plain white studio background, full
    // body shot showing legs with nude seamless shaper shorts background" —
    // SeedDream interpretaba mal esa frase hyper-poblada y generaba pantalones
    // marrones en vez de briefs nude. Ahora usamos background limpio y dejamos
    // que el prompt base de model-create (beige swim briefs para lencería) se
    // encargue del lower body; Kolors reemplaza el top con la prenda real.
    const newBackground = "plain white studio background, clean minimalist";
    // Fase 1: generar modelo en la nueva pose con el MISMO seed
    const modelRes = await fetch("/api/model-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gender: modelConfig.gender,
        ageRange: modelConfig.ageRange,
        skinTone: modelConfig.skinTone,
        bodyType: modelConfig.bodyType,
        pose: newPose,
        expression: "confident natural",
        background: newBackground,
        garmentType: garmentTypeForApi,
        seed: sharedSeed,
        referenceNumber: referenceNumber || undefined,
      }),
    });
    const modelJson = await modelRes.json();
    if (!modelJson.success) throw new Error(modelJson.error || `${stepId}: model-create failed`);
    const newModelImage = modelJson.data.url;
    const modelCost = modelJson.cost ?? 0.055;

    // Fase 2: vestir la nueva modelo con la MISMA prenda aislada
    const category =
      productType === "panty" ? "bottoms"
      : productType === "set" ? "one-pieces"
      : "tops";
    const tryonRes = await fetch("/api/tryon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelImage: newModelImage,
        garmentImage: isolatedGarmentUrl,
        category,
        garmentType: garmentTypeForApi,
        provider: "kolors",
      }),
    });
    const tryonJson = await tryonRes.json();
    if (!tryonJson.success) throw new Error(tryonJson.error || `${stepId}: tryon failed`);
    const tryonCost = tryonJson.cost ?? 0.02;
    return { resultUrl: tryonJson.data.url, cost: modelCost + tryonCost };
  }

  if (stepId === "tryon") {
    // Kolors-compatible category names (tryon route maps them):
    // bra → "tops", panty → "bottoms", set → "one-pieces"
    const category =
      productType === "panty" ? "bottoms"
      : productType === "set" ? "one-pieces"
      : "tops";
    // Refuse to run tryon without a separate model image — otherwise both
    // inputs become the same URL and Kolors produces garbage.
    if (!sharedModelUrl) {
      throw new Error("Falta la modelo IA (paso 'model' no corrió o falló). Corré ese paso antes del try-on.");
    }
    const res = await fetch("/api/tryon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelImage: sharedModelUrl,
        garmentImage: inputUrl,
        category,
        garmentType: garmentTypeForApi,
        provider: isLingerieFlow ? "kolors" : "idm-vton",
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
    // Usa el URL de la modelo (sharedModelUrl) PRIORITARIAMENTE. Si tryon funcionó
    // (inputUrl viene del tryon exitoso), usa ese. Si no, fallback al modelo alone.
    // Así modelVideo produce algo útil incluso cuando tryon falla.
    const modelVideoUrl = inputUrl && inputUrl !== sharedModelUrl ? inputUrl : (sharedModelUrl ?? inputUrl);
    const res = await fetch("/api/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: modelVideoUrl,
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

export default function LingeriePipelinePage() {
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
  // Seed compartido entre poses: photoBack + photoFullBody lo reusan para que
  // SeedDream genere la MISMA modelo (mismo rostro + cuerpo + piel) en distinta
  // pose. Sin seed serían modelos diferentes en cada foto.
  const [sharedSeed, setSharedSeed] = useState<number | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  const [savedModels, setSavedModels] = useState<Array<{ id: string; name: string; previewUrl: string; gender?: string; skinTone?: string; bodyType?: string; seed?: number }>>([]);

  // Cargar modelos IA previamente generadas para ofrecer reuso sin costo
  useEffect(() => {
    fetch('/api/ai-models', { signal: AbortSignal.timeout(10000) })
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          // Extraer seed de metadata (donde model-create lo guardó para reuso
          // entre poses). Modelos viejos pre-Phase-2a no tienen seed → undefined.
          //
          // NOTA: /api/ai-models devuelve AiModelRecord con snake_case
          // (preview_url, skin_tone, body_type). El código anterior leía
          // camelCase (previewUrl) → siempre undefined → todas las previews
          // rotas.
          type ModelWithMeta = {
            id: string;
            name: string;
            preview_url: string | null;
            gender?: string;
            skin_tone?: string;
            body_type?: string;
            metadata?: Record<string, unknown> | null;
          };
          const mapped = (json.data as ModelWithMeta[])
            .filter((m) => !!m.preview_url)
            .map((m) => ({
              id: m.id,
              name: m.name,
              previewUrl: m.preview_url!,
              gender: m.gender,
              skinTone: m.skin_tone,
              bodyType: m.body_type,
              seed: typeof m.metadata?.seed === 'number' ? (m.metadata.seed as number) : undefined,
            }));
          setSavedModels(mapped);
        }
      })
      .catch(() => {
        /* Silent — la usuaria puede crear modelo nueva igual */
      });
  }, []);

  const previewUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => previewUrlsRef.current.forEach(URL.revokeObjectURL);
  }, []);

  // Read URL params on mount — inventory auto-mode redirects with ?productType=bra|panty
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pt = params.get("productType");
    if (pt && ["bra", "panty", "set", "faja"].includes(pt)) {
      setProductType(pt);
    }
  }, []);

  // Cross-session AI model reuse: when referenceNumber is typed/changed,
  // lookup saved models with that tag. If found, reuse it and skip $0.055 regen.
  const [reusedModelFound, setReusedModelFound] = useState(false);
  useEffect(() => {
    setReusedModelFound(false);
    const ref = referenceNumber.trim();
    if (!ref) {
      setSharedModelUrl(undefined);
      return;
    }
    // Debounce 600ms so we don't spam the API on every keystroke
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/ai-models?referenceNumber=${encodeURIComponent(ref)}`,
          { signal: AbortSignal.timeout(10000) },
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const saved = json.data[0];
          if (saved?.preview_url) {
            setSharedModelUrl(saved.preview_url);
            setReusedModelFound(true);
            toast.success(`Modelo IA de REF ${ref} encontrada — se va a reusar (ahorro $0.055).`);
          }
        }
      } catch {
        // Silent — user can still run the pipeline, just won't reuse
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [referenceNumber]);

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
        // Phase 2f P0-1: auto-detect del nombre del archivo. La usuaria puede
        // corregir con el dropdown si el heurístico se equivocó.
        photoAngle: detectPhotoAngle(file.name),
        referenceKey: detectReferenceKey(file.name),
      };
    });
    setJobs((prev) => [...prev, ...newJobs]);
  }, []);

  /** Phase 2f P0-1: usuaria corrigió el ángulo desde el dropdown del card. */
  const updateJobAngle = useCallback((jobId: string, angle: PhotoAngle) => {
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, photoAngle: angle } : j));
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
    currentSharedSeed: number | undefined,
    currentIsolatedGarment: string | undefined,
  ): Promise<{ resultUrl: string; cost: number; newModelUrl?: string; newSeed?: number }> => {
    return runStep(
      step.id,
      inputUrl,
      job.falUrl,
      modelConfig,
      productType,
      currentSharedModel,
      referenceNumber || undefined,
      currentSharedSeed,
      currentIsolatedGarment,
    );
  }, [modelConfig, productType, referenceNumber]);

  /* ---- Process one job sequentially ---- */
  const processJob = useCallback(async (
    jobId: string,
    jobsSnapshot: ImageJob[],
    currentSharedModel: string | undefined,
    currentSharedSeed: number | undefined,
  ): Promise<{ newSharedModel?: string; newSharedSeed?: number }> => {
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

    // Análisis de producto con Claude Vision — corre UNA sola vez por job antes
    // del primer step. Produce una ProductSpec que se muestra al usuario
    // (editable) y que iteraciones siguientes inyectarán en los prompts. Si
    // falla, el pipeline sigue igual que antes (sin spec). No es bloqueante.
    if (!job.productSpec && job.analysisStatus !== "done") {
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, analysisStatus: "analyzing" } : j));
      try {
        const spec = await analyzeProductPhotos(
          [{ file: job.file, role: "frontal" }],
          productType,
        );
        setJobs((prev) => prev.map((j) =>
          j.id === jobId ? { ...j, productSpec: spec, analysisStatus: "done" } : j,
        ));
      } catch (analyzeErr) {
        const msg = analyzeErr instanceof Error ? analyzeErr.message : "Análisis falló";
        console.warn(`[lingerie] analyze-product failed for ${job.file.name}:`, msg);
        setJobs((prev) => prev.map((j) =>
          j.id === jobId ? { ...j, productSpec: null, analysisStatus: "error", analysisError: msg } : j,
        ));
        // No bloquea el pipeline — solo warnea y seguimos como antes.
        toast.warning(`No se pudo leer la ficha técnica de ${job.file.name}. Sigo con los pasos normales.`);
      }
    }

    let lastResultUrl = uploadedUrl;
    let newSharedModel = currentSharedModel;
    let newSharedSeed = currentSharedSeed;

    // Get fresh step list with only enabled steps
    const enabledSteps = job.steps.filter((s) => s.enabled);

    // Local map de resultados por step — evita leer job.steps (snapshot stale
    // del useState inicial, que NO se actualiza durante el loop por ser una
    // closure). Se populate abajo cada vez que un step completa.
    const stepResults: Partial<Record<StepId, string>> = {};

    for (const stepDef of enabledSteps) {
      // Determine input: for tryon use sharedModelUrl is handled in runStep
      let inputForStep = lastResultUrl;
      if (stepDef.id === "modelVideo") {
        // modelVideo usa tryon result (modelo + prenda). Si tryon no corrió,
        // cae a la modelo IA sola (sharedModel) — es un fallback razonable.
        inputForStep = stepResults.tryon || newSharedModel || lastResultUrl;
      } else if (stepDef.id === "tryon") {
        // tryon → Kolors (fal.ai). Preferir URLs de fal nativas para evitar
        // el round-trip Replicate→fal en ensureFalAccessibleUrl que descarga
        // JSON metadata en vez de bytes de imagen (fix de commit 1e63a40).
        // Prioridad: isolate result (fal URL) → falUrl pre-subida → uploadedUrl.
        inputForStep = stepResults.isolate || falUrl || uploadedUrl;
      } else if (stepDef.id === "productVideo") {
        // productVideo REQUIERE la prenda aislada (prenda sola, fondo limpio).
        // Caer a falUrl/uploadedUrl daría video de la foto original (modelo
        // con prenda puesta) → lo opuesto del objetivo. Mejor fallar con
        // mensaje claro pidiendo activar el paso 'Aislar Prenda'.
        if (!stepResults.isolate) {
          throw new Error(
            "Video 360° del Producto necesita la prenda aislada. Activá el paso 'Aislar Prenda' o desactivá este video."
          );
        }
        inputForStep = stepResults.isolate;
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
          newSharedSeed,
          stepResults.isolate,
        );

        if (result.newModelUrl) {
          newSharedModel = result.newModelUrl;
          setSharedModelUrl(result.newModelUrl);
        }
        if (result.newSeed !== undefined) {
          newSharedSeed = result.newSeed;
          setSharedSeed(result.newSeed);
        }

        updateStep(jobId, stepDef.id, {
          status: "done",
          resultUrl: result.resultUrl,
          cost_actual: result.cost,
        });

        // Populate local map para que el próximo step pueda leer este resultUrl
        // sin depender del useState (que es stale en esta closure).
        stepResults[stepDef.id] = result.resultUrl;

        // lastResultUrl se usa como input default del siguiente step. Evitamos
        // propagar outputs que no son imagen de producto (videos, models vacias
        // sin vestir, y las fotos extra photoBack/photoFullBody que son fotos
        // paralelas al hero, no un eslabón lineal).
        const nonPropagatingSteps: StepId[] = ["productVideo", "modelVideo", "model", "photoBack", "photoFullBody"];
        if (!nonPropagatingSteps.includes(stepDef.id)) {
          lastResultUrl = result.resultUrl;
        }

        setJobs((prev) => prev.map((j) =>
          j.id !== jobId ? j : { ...j, totalCost: j.totalCost + result.cost }
        ));

        // Manual mode: pause and wait for user action (10 min timeout to prevent memory leak)
        if (!autoMode && (stepDef.id !== "model" || !newSharedModel)) {
          await new Promise<void>((resolve) => {
            const TIMEOUT_MS = 10 * 60 * 1000; // 10 min — si la usuaria cierra tab, no queda pendiente forever
            let timeoutId: ReturnType<typeof setTimeout>;
            const cleanup = () => {
              window.removeEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
              clearTimeout(timeoutId);
            };
            const handler = (event: CustomEvent<{ jobId: string; stepId: string; action: string }>) => {
              if (event.detail.jobId === jobId && event.detail.stepId === stepDef.id) {
                cleanup();
                if (event.detail.action === "skip") {
                  updateStep(jobId, stepDef.id, { status: "skipped" });
                } else {
                  updateStep(jobId, stepDef.id, { status: "accepted" });
                }
                resolve();
              }
            };
            window.addEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
            timeoutId = setTimeout(() => {
              cleanup();
              updateStep(jobId, stepDef.id, { status: "skipped" });
              resolve();
            }, TIMEOUT_MS);
          });
        } else {
          updateStep(jobId, stepDef.id, { status: "accepted" });
        }
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : "Error desconocido";
        // "Failed to fetch" / "NetworkError" / "Load failed" son TypeErrors del
        // browser cuando fetch() falla antes de recibir respuesta (conexión móvil
        // intermitente, red caída, request cortado). Traducimos a español para
        // que la usuaria entienda qué hacer (reintentar con mejor señal) en vez
        // de ver un string técnico en inglés.
        const isNetworkError = /failed to fetch|networkerror|load failed|network request failed/i.test(rawMsg);
        const errorMsg = isNetworkError
          ? "Error de conexión. Revisá tu internet y reintentá."
          : rawMsg;
        updateStep(jobId, stepDef.id, { status: "error", error: errorMsg });

        if (!autoMode) {
          // Wait for user to retry or skip (10 min timeout)
          await new Promise<void>((resolve) => {
            const TIMEOUT_MS = 10 * 60 * 1000;
            let timeoutId: ReturnType<typeof setTimeout>;
            const cleanup = () => {
              window.removeEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
              clearTimeout(timeoutId);
            };
            const handler = (event: CustomEvent<{ jobId: string; stepId: string; action: string }>) => {
              if (event.detail.jobId === jobId && event.detail.stepId === stepDef.id) {
                cleanup();
                if (event.detail.action === "skip") {
                  updateStep(jobId, stepDef.id, { status: "skipped" });
                  resolve();
                } else if (event.detail.action === "rerun") {
                  resolve();
                }
              }
            };
            window.addEventListener("pipeline-action" as keyof WindowEventMap, handler as EventListener);
            timeoutId = setTimeout(() => {
              cleanup();
              updateStep(jobId, stepDef.id, { status: "skipped" });
              resolve();
            }, TIMEOUT_MS);
          });
        } else {
          // Auto mode: skip errored step and continue
          toast.error(`Error en "${stepDef.label}": ${errorMsg}`);
        }
      }
    }

    setJobs((prev) => prev.map((j) => j.id !== jobId ? j : { ...j, status: "done" }));
    return { newSharedModel, newSharedSeed };
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
    let currentSharedSeed = sharedSeed;

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
      const { newSharedModel, newSharedSeed } = await processJob(job.id, jobsSnapshot, currentSharedModel, currentSharedSeed);
      if (newSharedModel) currentSharedModel = newSharedModel;
      if (newSharedSeed !== undefined) currentSharedSeed = newSharedSeed;
    }

    setIsRunning(false);
    toast.success(`Pipeline completado — ${jobsSnapshot.length} imagen(es) procesada(s)`);
  }, [jobs, steps, sharedModelUrl, sharedSeed, processJob]);

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
            <span className="text-sm font-semibold text-white">Pipeline de Lencería</span>
          </div>
          <div className="ml-auto">
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">
              Bras · Panties · Shapewear
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-8">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Configura tu Pipeline de Lencería</h1>
            <p className="mt-1 text-sm text-gray-400">
              Bras, panties y shapewear. Sube fotos de una referencia con modelo original, y el pipeline quita la modelo, crea una nueva con licencia libre, y la viste con la prenda. Opcionalmente genera videos de producto y de modelo.
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
                  <>
                    <div className="mt-4 mb-2 flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">
                        {jobs.length} foto{jobs.length === 1 ? '' : 's'} · el ángulo se detecta del nombre, pero podés corregirlo abajo de cada foto
                      </span>
                      {jobs.some((j) => j.photoAngle === 'espalda') && (
                        <span className="rounded-md bg-violet-500/15 px-2 py-0.5 font-medium text-violet-300">
                          ✓ Foto de espalda detectada — se va a usar como referencia real
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {jobs.map((job) => (
                        <div key={job.id} className="group relative">
                          <div className="relative">
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
                            {/* Badge con el ángulo detectado — siempre visible */}
                            <div className="absolute left-1 top-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                              {PHOTO_ANGLE_OPTIONS.find((o) => o.value === job.photoAngle)?.label ?? job.photoAngle}
                            </div>
                            {job.referenceKey && (
                              <div className="absolute left-1 bottom-1 rounded-md bg-violet-500/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                REF {job.referenceKey}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 truncate text-[10px] text-gray-500">{job.file.name}</p>
                          {/* P0-1: dropdown para corregir el ángulo */}
                          <label className="mt-1 flex items-center gap-1">
                            <span className="text-[9px] uppercase tracking-wider text-gray-600">Ángulo</span>
                            <select
                              value={job.photoAngle}
                              onChange={(e) => updateJobAngle(job.id, e.target.value as PhotoAngle)}
                              className="flex-1 rounded-md border border-white/10 bg-black/40 px-1.5 py-1 text-[10px] text-white outline-none focus:border-violet-500/50"
                            >
                              {PHOTO_ANGLE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value} title={o.hint}>{o.label}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Reuso de modelos IA ya generadas — ahorro $0.055 por REF */}
              {savedModels.length > 0 && (
                <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
                        Reusar modelo IA existente (ahorro $0.055/foto)
                      </h2>
                      <p className="mt-1 text-xs text-gray-400">
                        Click una modelo ya creada en sesiones anteriores para NO pagar por generar otra. O dejá sin seleccionar para crear nueva.
                      </p>
                    </div>
                    {sharedModelUrl && (
                      <button
                        type="button"
                        onClick={() => setSharedModelUrl(undefined)}
                        className="rounded border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-300 hover:border-white/20"
                      >
                        Usar nueva modelo ($0.055)
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {savedModels.slice(0, 18).map((m) => {
                      const isSelected = sharedModelUrl === m.previewUrl;
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => {
                            setSharedModelUrl(m.previewUrl);
                            // Si el modelo guardado tiene seed (solo los creados post-upgrade 2a),
                            // lo reusamos para que photoBack/photoFullBody generen la MISMA
                            // identidad. Si no hay seed (modelos viejos), esas fotos extra
                            // usarán seed random → identidad similar pero no idéntica.
                            if (m.seed !== undefined) setSharedSeed(m.seed);
                            toast.success(`Modelo "${m.name}" seleccionada — pipeline la reusa sin cobrar.`);
                          }}
                          className={cn(
                            "group relative flex flex-col overflow-hidden rounded-lg border transition-all",
                            isSelected
                              ? "border-emerald-400 ring-2 ring-emerald-400/40"
                              : "border-white/10 hover:border-white/30",
                          )}
                          title={`${m.name} — ${m.gender ?? 'female'}, ${m.skinTone ?? 'medium'}, ${m.bodyType ?? 'average'}`}
                        >
                          <ModelThumb url={m.previewUrl} alt={m.name} name={m.name ?? 'Modelo'} />
                          <div className="bg-black/60 px-1.5 py-1 text-[10px] text-gray-300 truncate">
                            {m.name?.slice(0, 20) ?? 'Modelo'}
                          </div>
                          {isSelected && (
                            <div className="absolute right-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              ✓
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {savedModels.length > 18 && (
                    <p className="mt-2 text-[11px] text-gray-500">
                      Mostrando 18 de {savedModels.length} modelos guardadas. Más en /gallery.
                    </p>
                  )}
                </section>
              )}

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

              {/* Ficha técnica del producto — leída por Claude Vision antes
                  del primer step. Editable; los valores se guardan en el job
                  (iteraciones siguientes los inyectan en los prompts). */}
              <ProductSpecPanel
                status={activeJob.analysisStatus}
                spec={activeJob.productSpec}
                error={activeJob.analysisError}
                onChange={(updated) => {
                  setJobs((prev) => prev.map((j) =>
                    j.id === activeJob.id ? { ...j, productSpec: updated } : j,
                  ));
                }}
                onReanalyze={async () => {
                  setJobs((prev) => prev.map((j) =>
                    j.id === activeJob.id
                      ? { ...j, analysisStatus: "analyzing", analysisError: undefined }
                      : j,
                  ));
                  try {
                    const spec = await analyzeProductPhotos(
                      [{ file: activeJob.file, role: "frontal" }],
                      productType,
                    );
                    setJobs((prev) => prev.map((j) =>
                      j.id === activeJob.id
                        ? { ...j, productSpec: spec, analysisStatus: "done", analysisError: undefined }
                        : j,
                    ));
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "Análisis falló";
                    setJobs((prev) => prev.map((j) =>
                      j.id === activeJob.id
                        ? { ...j, productSpec: null, analysisStatus: "error", analysisError: msg }
                        : j,
                    ));
                  }
                }}
              />

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
