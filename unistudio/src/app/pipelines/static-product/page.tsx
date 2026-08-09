"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
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
  FolderOpen,
  RefreshCw,
  RotateCw,
  Palette,
  Maximize2,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "@/hooks/use-toast";
import { useGalleryStore } from "@/stores/gallery-store";
import {
  getAdaptiveBgConfig,
  PRODUCT_TYPE_LABELS,
  BRAND_LABELS,
  STATIC_PRODUCT_ENHANCE_NORMALIZE,
  type StaticProductType,
  type StaticBrand,
} from "@/lib/pipelines/static-product";
import { inferProductContextFromPath } from "@/lib/pipelines/folder-routing";
import {
  staticProductDescriptor,
  type StaticProductFeatures,
} from "@/lib/processing/product-features";
import {
  SCENE_PRESETS,
  SCENE_CATEGORY_LABELS,
  findScenePreset,
  getScenePresetsForType,
  type SceneCategory,
} from "@/lib/pipelines/scene-presets";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type JobStatus = "idle" | "uploading" | "isolating" | "normalizing" | "generating" | "done" | "error";

/**
 * Steps:
 *  - isolate / normalize: shared prep (bg-remove + center 2000×2000).
 *  - white / adaptive / vertical: the 3 final outputs, generated in parallel
 *    after normalize. Each composites the SAME pixel-perfect product onto a
 *    different background — guaranteeing the bottle/jar shape is identical
 *    across all 3 outputs.
 */
type StepKey =
  | "isolate"
  | "normalize"
  | "white"
  | "adaptive"
  | "hero"
  | "vertical"
  | "upscale"
  | "shadow"
  | "lifestyleVideo";

interface StepSnapshot {
  /** URL después de completar este paso */
  resultUrl?: string;
  /** Costo incurrido en este paso */
  cost: number;
  /** Estado del paso específico */
  status: "idle" | "running" | "done" | "skipped" | "error";
  /** Mensaje de error si falló */
  error?: string;
  /** Warning opcional del validador IA */
  warning?: string;
}

interface Job {
  id: string;
  file: File;
  previewUrl: string;
  productType: StaticProductType;
  brand: StaticBrand;
  status: JobStatus;
  /**
   * resultUrl es el "main" output mostrado en el thumbnail principal — apunta
   * a `steps.adaptive.resultUrl` cuando está listo (es el de "catálogo Sephora",
   * el más vistoso). Los 3 outputs reales viven en `steps.white/adaptive/vertical`.
   */
  resultUrl?: string;
  error?: string;
  cost: number;
  steps: Record<StepKey, StepSnapshot>;
  /**
   * Features extraídos de ESTA foto vía Claude Vision. Se inyectan en los
   * prompts de bg-generate para que el fondo respete el frasco real (forma,
   * color, etiqueta) en vez de usar un template genérico por marca+tipo.
   */
  productFeatures?: StaticProductFeatures | null;
  /**
   * Escena manual elegida desde SCENE_PRESETS (mesa elegante, vanity, playa,
   * café parisino, manos sosteniendo, etc). Si null/undefined usa el default
   * por brand+tipo (matriz de getAdaptiveBgConfig).
   */
  sceneOverride?: string | null;
  /** Acción del video lifestyle (spray, mist, rotación, luz, dolly-in). */
  videoAction?: LifestyleVideoAction;
  /** Toggle: ¿generar el video lifestyle? Opt-in porque cuesta $0.05 + 60-120s. */
  generateVideo?: boolean;
  /**
   * Toggle: ¿escalar el adaptativo a alta resolución + QC de color? Opt-in
   * porque cuesta $0.05 y suma 15-40s. Usa Clarity Upscaler (resemblance 0.85).
   */
  upscaleOutput?: boolean;
  /**
   * Toggle: ¿agregar sombra de contacto realista al blanco e-commerce? Opt-in.
   * Sharp puro (gratis) — aterriza el producto para que no parezca pegado.
   */
  addShadow?: boolean;
}

const INITIAL_STEPS: Record<StepKey, StepSnapshot> = {
  isolate: { cost: 0, status: "idle" },
  normalize: { cost: 0, status: "idle" },
  white: { cost: 0, status: "idle" },
  adaptive: { cost: 0, status: "idle" },
  // Hero editorial 4:5 (1080×1350) — STANDARD, siempre corre. Mismo fondo y
  // MISMO seed que adaptive → los 3 formatos (1:1, 4:5, 9:16) quedan cohesivos.
  hero: { cost: 0, status: "idle" },
  vertical: { cost: 0, status: "idle" },
  // Upscale alta-res + QC — opt-in. Escala el adaptive (o el white si falló)
  // con Clarity (resemblance 0.85, creativity 0.25).
  upscale: { cost: 0, status: "idle" },
  // Sombra de contacto — opt-in. Aterriza el producto sobre el white e-commerce.
  shadow: { cost: 0, status: "idle" },
  // Video lifestyle 5s 9:16 — opt-in. Se genera DESPUÉS del adaptive, usando
  // ese frame como starting image. wan-2.2-fast anima sobre ese frame con un
  // prompt según la acción elegida (spray, mist, rotación, luz cinemática).
  lifestyleVideo: { cost: 0, status: "idle" },
};

/**
 * Acciones que la usuaria puede elegir para el video lifestyle. Cada una mapea
 * a un prompt específico que wan-2.2-fast usa para animar el frame estático.
 */
type LifestyleVideoAction = "auto" | "spray" | "mist" | "rotacion" | "luz" | "dolly-in";

const LIFESTYLE_VIDEO_ACTIONS: { value: LifestyleVideoAction; label: string; icon: string; promptHint: string }[] = [
  { value: "auto",      label: "Automático (cinemático suave)", icon: "🎬", promptHint: "subtle camera dolly-in toward the fragrance bottle, soft golden hour light, premium fragrance commercial film, slow elegant motion" },
  { value: "spray",     label: "Spray de perfume",              icon: "💨", promptHint: "elegant feminine hand entering frame from the right, gracefully spraying the fragrance bottle in slow motion, soft mist particles dispersing in the air, golden hour backlight catching the mist, premium fragrance commercial cinematic" },
  { value: "mist",      label: "Aroma flotando",                icon: "✨", promptHint: "soft golden mist particles slowly floating around the fragrance bottle, ethereal aromatic clouds rising upward, dreamy slow motion, magical fragrance ad aesthetic" },
  { value: "rotacion",  label: "Rotación 360° suave",            icon: "🔄", promptHint: "fragrance bottle slowly rotating 360 degrees on its base, smooth continuous motion, professional product showcase video, light catches different facets" },
  { value: "luz",       label: "Luz cinemática pulsante",        icon: "🌟", promptHint: "cinematic light beams sweeping across the fragrance bottle, dramatic chiaroscuro lighting changes, slow camera push-in, premium luxury fragrance trailer aesthetic" },
  { value: "dolly-in",  label: "Acercamiento dolly-in",          icon: "📹", promptHint: "smooth cinematic dolly-in camera movement approaching the fragrance bottle, subtle depth of field shift, editorial fragrance film, magazine commercial" },
];

interface StepMeta {
  label: string;
  icon: string;
  costHint: string;
  description: string;
  /** Lo que hace este paso en lenguaje humano */
  what?: string;
  /** Proveedor / modelo usado */
  provider?: string;
  /** Tiempo típico */
  duration?: string;
  /** Modos típicos de falla */
  canFail?: string[];
  /** Qué hacer si falla */
  tips?: string[];
}

const STEP_META: Record<StepKey, StepMeta> = {
  isolate: {
    label: "Quitar fondo",
    icon: "✂️",
    costHint: "$0.01",
    description: "Aísla el producto sobre transparente.",
    what: "Quita el fondo de tu foto y deja solo el producto sobre fondo transparente — base para todos los outputs siguientes.",
    provider: "Replicate rembg (cjwbw/rembg). Fallback: WithoutBG Docker.",
    duration: "5–15 s",
    canFail: ["Si el producto tiene partes brillantes o transparentes (frasco vidrio), el borde puede salir con halo."],
    tips: ["Reintentá si el primer intento dejó halo.", "Para frascos de vidrio considerá una foto con fondo más contrastante."],
  },
  normalize: {
    label: "Centrar 2000×2000",
    icon: "📐",
    costHint: "Gratis",
    description: "Resize y centrado consistente entre fotos del mismo SKU.",
    what: "Centra y normaliza el lienzo a 2000×2000 px para que todas las fotos del mismo SKU se vean alineadas en el catálogo.",
    provider: "Sharp (server-side) — gratis, sin IA.",
    duration: "<1 s",
    canFail: ["Si la imagen original es muy chica (<1000px), puede salir pixelada."],
    tips: ["Subí fotos de al menos 1500×1500 para mejor calidad."],
  },
  white: {
    label: "Blanco e-commerce",
    icon: "⬜",
    costHint: "Gratis",
    description: "Fondo #FFFFFF puro, listo para Amazon/MercadoLibre/listing. Sharp puro, no pasa por modelo IA.",
    what: "Compone el producto sobre fondo blanco puro (#FFFFFF), formato exigido por Amazon, MercadoLibre y la mayoría de marketplaces.",
    provider: "Sharp composite — sin IA, garantiza pixel-perfect.",
    duration: "<1 s",
    canFail: ["Casi nunca falla. Si el isolate dejó halo, ese halo se preserva en blanco."],
    tips: ["Para listings de Amazon usá este output."],
  },
  adaptive: {
    label: "Adaptativo catálogo",
    icon: "🎨",
    costHint: "$0.003",
    description: "Fondo decidido por marca+tipo (mármol, gradient, playa). 1:1, listo para web/Instagram feed.",
    what: "Genera un fondo único basado en la marca y tipo del producto (mármol para premium, gradient para teen, playa para verano). Compone TU producto encima en pixel-perfect.",
    provider: "Flux Schnell (Replicate) + Sharp composite. Mode 'fast'.",
    duration: "8–15 s",
    canFail: [
      "Schnell puede rechazar el prompt por filtro NSFW blando para algunas marcas premium (palabra 'luxury' dispara) — con retry automático en este branch.",
      "Si el prompt supera ~150 palabras (combo HD+NO_DUP+brand), retry con prompt strippeado.",
    ],
    tips: ["Si sale raro, click 'Cambiar' para editar el prompt y regenerar.", "Adaptive y vertical comparten seed → look cohesivo entre 1:1 y 9:16."],
  },
  hero: {
    label: "Hero editorial 4:5",
    icon: "🖼️",
    costHint: "$0.003",
    description: "Mismo fondo adaptativo en 4:5 (1080×1350). Ideal para el feed de Instagram y Facebook.",
    what: "Genera el mismo fondo adaptativo pero en 4:5 vertical (1080×1350) — el formato que más ocupa el feed de Instagram y Facebook. Mismo seed que el adaptativo y el vertical → catálogo cohesivo. Compone TU producto encima en pixel-perfect.",
    provider: "Flux Schnell + Sharp composite. Mismo seed que adaptive.",
    duration: "8–15 s",
    canFail: ["Mismo riesgo que adaptive (filtro NSFW)."],
    tips: [
      "Usá este output para el feed de Instagram y Facebook — el 4:5 ocupa más pantalla que el 1:1.",
      "Comparte seed con adaptativo y vertical → los 3 formatos se ven cohesivos.",
    ],
  },
  vertical: {
    label: "Vertical 9:16",
    icon: "📱",
    costHint: "$0.003",
    description: "Mismo fondo adaptativo en formato vertical. Listo para Reels/Stories/TikTok.",
    what: "Mismo fondo adaptativo del paso anterior pero en 9:16 — para Reels, Stories, TikTok. Mismo seed → estética cohesiva con el 1:1.",
    provider: "Flux Schnell + Sharp composite. Mismo seed que adaptive.",
    duration: "8–15 s",
    canFail: ["Mismo riesgo que adaptive (filtro NSFW)."],
    tips: ["Usá este output para Reels y Stories."],
  },
  upscale: {
    label: "Alta resolución + QC",
    icon: "🔍",
    costHint: "$0.05",
    description: "Escala el adaptativo a mayor resolución y nitidez — listo para zoom en la ficha del producto.",
    what: "Escala el fondo adaptativo a una versión de mayor resolución y más nítida, ideal para el zoom de la ficha del producto y para impresión. Fiel al original — no reinventa el frasco.",
    provider: "Clarity Upscaler (Replicate). resemblance 0.85, creativity 0.25.",
    duration: "15–40 s",
    canFail: ["Si la GPU se queda sin memoria, se degrada suave y devuelve la imagen original."],
    tips: [
      "Actívalo cuando necesites zoom en la ficha o material impreso.",
      "Toma el adaptativo como base (o el blanco si el adaptativo falló).",
    ],
  },
  shadow: {
    label: "Sombra de contacto",
    icon: "🌑",
    costHint: "Gratis",
    description: "Sombra de contacto realista sobre el blanco e-commerce para que el producto no parezca pegado.",
    what: "Agrega una sombra de contacto realista al output blanco e-commerce para aterrizar el producto sobre la superficie y que no parezca recortado y pegado.",
    provider: "Sharp (contact shadow) — sin IA, gratis.",
    duration: "<1 s",
    canFail: ["Si el blanco e-commerce falló, no hay base sobre la cual aplicar la sombra."],
    tips: [
      "Actívalo si el blanco e-commerce se ve flotando o recortado.",
      "Se aplica sobre el output blanco (#FFFFFF).",
    ],
  },
  lifestyleVideo: {
    label: "Video Reels lifestyle",
    icon: "🎬",
    costHint: "$0.05",
    description: "Video 5s 9:16 con animación cinemática (spray, mist, rotación). Listo para Reels/Stories/TikTok.",
    what: "Genera un video corto de 5 segundos en formato vertical 9:16 con animación elegante de tu producto. Elige la acción: spray de perfume con manos, aroma flotando, rotación, luz pulsante. Ideal para redes sociales.",
    provider: "wan-2.2-fast (Replicate). Anima el frame del adaptive con prompt según acción.",
    duration: "60–120 s para generar",
    tips: [
      "Necesitás haber generado el adaptive primero — el video usa esa imagen como punto de partida.",
      "Acción 'Spray' agrega manos virtuales aplicando el perfume — más cinemático.",
      "Si no eliges acción, queda en 'Automático' (dolly-in suave).",
    ],
  },
};

/** Las etapas de IMAGEN estándar que producen un output descargable (orden de display). */
const OUTPUT_STEPS: StepKey[] = ["white", "adaptive", "hero", "vertical"];

/**
 * Outputs a renderizar para un job. A los 4 outputs estándar les sumamos los
 * opt-in (upscale, shadow, video lifestyle) SOLO cuando la usuaria los activó o
 * cuando ya se intentó/generó — así aparecen como tarjeta con su estado en vez
 * de generarse silenciosamente sin mostrarse.
 */
function outputStepsFor(job: Job): StepKey[] {
  const steps: StepKey[] = [...OUTPUT_STEPS];
  if (job.upscaleOutput === true || job.steps.upscale.status !== "idle") steps.push("upscale");
  if (job.addShadow === true || job.steps.shadow.status !== "idle") steps.push("shadow");
  if (job.generateVideo === true || job.steps.lifestyleVideo.status !== "idle") steps.push("lifestyleVideo");
  return steps;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Auto-detect brand desde el texto/logo legible en la foto. Vision devuelve
 * marca_legible como string libre ("ésika", "Yanbal Paris", "L'Bel"). Lo
 * matcheamos contra BRAND_LABELS normalizando: lowercase, sin acentos, sin
 * apóstrofos. Si matchea, devolvemos el key del brand. Si no, null.
 *
 * Bug que resuelve: subir un frasco ésika y ver "Yanbal" preseleccionado
 * porque era el default duro. Ahora el default sale de la foto.
 */
function matchBrandFromText(brandText: string | null | undefined): StaticBrand | null {
  if (!brandText || typeof brandText !== "string") return null;
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // sin acentos
      .replace(/['']/g, "") // sin apóstrofos curvos o rectos
      .replace(/\s+/g, " ")
      .trim();
  const target = normalize(brandText);
  for (const [key, label] of Object.entries(BRAND_LABELS)) {
    const normalizedLabel = normalize(label);
    if (target === normalizedLabel) return key as StaticBrand;
    if (target.includes(normalizedLabel) || normalizedLabel.includes(target)) {
      return key as StaticBrand;
    }
  }
  return null;
}

async function safeJson(res: Response): Promise<{ success: boolean; data?: any; error?: string; cost?: number }> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.length > 100 ? text.slice(0, 100) + "..." : text || `HTTP ${res.status}`);
  }
}

function StatusPill({ status }: { status: JobStatus }) {
  const { t } = useI18n();
  const sp = t.pipelines.staticProduct;
  const isError = status === "error";
  const isDone = status === "done";
  const isActive = !["idle", "done", "error"].includes(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        isError && "border-[var(--error)]/25 bg-[var(--error-dim)] text-[var(--error)]",
        isDone && "border-[var(--success)]/25 bg-[var(--success-dim)] text-[var(--success)]",
        isActive && "border-[var(--accent)]/30 bg-[var(--accent-dim)] text-[var(--accent)]",
        !isError && !isDone && !isActive && "border-[var(--border-subtle)] bg-white/5 text-[var(--text-muted)]",
      )}
    >
      {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
      {isDone && <CheckCircle2 className="h-3 w-3" />}
      {isError && <AlertCircle className="h-3 w-3" />}
      {sp.statusLabels[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Batch from folder helpers — Gap 1 del audit                         */
/* ------------------------------------------------------------------ */

interface InventoryCategoryLite {
  id: string;
  name: string;
  pipeline?: string;
  pipelineParams?: Record<string, string>;
  imageCount: number;
  folders: string[];
}

interface InventoryImage {
  filename: string;
  dataUrl: string;
  size: number;
}

/** base64 data URL → File para reusar el flow existente del pipeline */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/** Carga TODOS los imágenes de un folder vía /api/inventory/load con paginación 10×10 */
async function loadAllFromFolder(
  folder: string,
  onProgress: (loaded: number, total: number) => void,
): Promise<InventoryImage[]> {
  const all: InventoryImage[] = [];
  let offset = 0;
  const limit = 10;
  while (true) {
    const res = await fetch("/api/inventory/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, offset, limit }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error cargando (status ${res.status}): ${errText.slice(0, 120)}`);
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Error desconocido al cargar");
    const page = json.data.images as InventoryImage[];
    const total = json.data.total as number;
    all.push(...page);
    onProgress(all.length, total);
    if (!json.data.hasMore || page.length === 0) break;
    offset += page.length;
    // seguridad: evitar loops infinitos si total < offset
    if (offset >= total) break;
  }
  return all;
}

/* ------------------------------------------------------------------ */
/*  Upload zone                                                         */
/* ------------------------------------------------------------------ */

function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const { t } = useI18n();
  const sp = t.pipelines.staticProduct;
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
        "group focus-ring flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed px-6 py-14 text-center transition-default",
        dragOver
          ? "border-[var(--accent)]/70 bg-[var(--accent-dim)] scale-[1.01]"
          : "border-[var(--border-default)] bg-[var(--bg-overlay)]/40 hover:border-[var(--accent)]/40 hover:bg-[var(--accent-glow)]",
      )}
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full border transition-default shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          dragOver
            ? "border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent-light)]"
            : "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)] group-hover:border-[var(--accent)]/40 group-hover:bg-[var(--accent)]/10",
        )}
      >
        <Upload className="h-6 w-6" />
      </span>
      <div>
        <p className="text-base font-semibold text-[var(--text-primary)]">
          {sp.upload.dropCta}{" "}
          <span className="font-normal text-[var(--text-muted)]">{sp.upload.dropClick}</span>
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">{sp.upload.dropHint}</p>
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
  const { t } = useI18n();
  const sp = t.pipelines.staticProduct;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [defaultType, setDefaultType] = useState<StaticProductType>("perfume");
  const [defaultBrand, setDefaultBrand] = useState<StaticBrand>("other");
  const previewUrlsRef = useRef<string[]>([]);
  // Mirror of `jobs` so handleFiles can dedupe synchronously without stale closure.
  const jobsRef = useRef<Job[]>([]);
  useEffect(() => { jobsRef.current = jobs; }, [jobs]);
  // ID of the job currently being zipped (for "Descargar las 3" button per-job spinner)
  const [zippingJobId, setZippingJobId] = useState<string | null>(null);

  // Gap 1 — Batch desde folder del inventario
  const [batchCategories, setBatchCategories] = useState<InventoryCategoryLite[] | null>(null);
  const [batchLoadingId, setBatchLoadingId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Gap 5 — Per-step approval: modal para cambiar el prompt del fondo
  const [bgPromptModal, setBgPromptModal] = useState<{ job: Job; customPrompt: string } | null>(null);
  const [reRunningJobId, setReRunningJobId] = useState<string | null>(null);

  // Gap 6 — validador post-bg con Claude Haiku (default ON, costo despreciable
  // $0.0002/foto y atrapa duplicados/producto faltante que de otra manera
  // pasarían silenciosos).
  const [validateBg, setValidateBg] = useState(true);

  // Lightbox state — click on any thumbnail to view full-size in a modal.
  // Fixes the "no preview en grande" complaint: every step thumb is clickable
  // and opens the original-resolution image.
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);

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

  // Gap 1 — cargar categorías del inventario al montar la página
  const loadScan = useCallback(async () => {
    setScanError(null);
    try {
      const res = await fetch("/api/inventory/scan");
      if (!res.ok) throw new Error(`Scan falló con status ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Scan falló");
      const allCats = json.data.categories as InventoryCategoryLite[];
      // Solo nos interesan categorías que ruteen a static-product Y tengan imágenes
      const staticCats = allCats.filter(
        (c) => c.pipeline === "/pipelines/static-product" && c.imageCount > 0,
      );
      setBatchCategories(staticCats);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : String(err));
      setBatchCategories([]);
    }
  }, []);

  useEffect(() => {
    loadScan();
  }, [loadScan]);

  /**
   * Añade files al grid de jobs. Infiere tipo/marca del filename o de un
   * `pathHint` explícito (C2 Gap 4). Si `presetType` / `presetBrand` vienen,
   * ganan por encima de la inferencia (usado por el batch de C4 que ya conoce
   * la categoría desde el scan).
   */
  const handleFiles = useCallback(
    (
      files: File[],
      opts?: { pathHint?: (f: File) => string; presetType?: StaticProductType; presetBrand?: StaticBrand },
    ) => {
      if (files.length === 0) return;
      // Dedupe by filename + size — prevents the "duplicate cards" bug when
      // the user drops the same folder twice or hits the upload button twice.
      // Compares against existing jobs AND against duplicates in the same drop.
      const existingKeys = new Set(
        jobsRef.current.map((j) => `${j.file.name}::${j.file.size}`),
      );
      const seenInDrop = new Set<string>();
      const uniqueFiles = files.filter((f) => {
        const key = `${f.name}::${f.size}`;
        if (existingKeys.has(key) || seenInDrop.has(key)) return false;
        seenInDrop.add(key);
        return true;
      });
      const skipped = files.length - uniqueFiles.length;
      if (skipped > 0) {
        toast.warning(sp.messages.duplicatesIgnored(skipped));
      }
      if (uniqueFiles.length === 0) return;
      let ambiguousCount = 0;
      const newJobs: Job[] = uniqueFiles.map((file, i) => {
        const preview = URL.createObjectURL(file);
        previewUrlsRef.current.push(preview);

        // Gap 4: antes de usar los defaults globales, inferir tipo/marca del filename
        // o del webkitRelativePath (si viene de folder drag-drop). Previene que un
        // DORSAY.jpg del folder /desodorantes/ se procese como perfume premium Esika.
        const pathHint =
          opts?.pathHint?.(file) ??
          (file as File & { webkitRelativePath?: string }).webkitRelativePath ??
          file.name;
        const inferred = inferProductContextFromPath(pathHint);
        if (inferred.ambiguous && !opts?.presetType) ambiguousCount += 1;

        return {
          id: `job-${Date.now()}-${i}`,
          file,
          previewUrl: preview,
          productType: opts?.presetType ?? inferred.productType ?? defaultType,
          brand: opts?.presetBrand ?? inferred.brand ?? defaultBrand,
          status: "idle",
          cost: 0,
          steps: { ...INITIAL_STEPS },
        };
      });
      setJobs((prev) => [...prev, ...newJobs]);
      if (ambiguousCount > 0) {
        toast.warning(sp.messages.ambiguousNames(ambiguousCount));
      }

      // Auto-detect brand + features INMEDIATAMENTE al subir (no esperar a
      // que la usuaria pulse "Procesar"). La usuaria reportó: "auto detect
      // no funciona yo lo puse, debería auto detectar cuando hago upload".
      // Por job: subimos a /api/upload (HTTP url) → analizamos con Vision →
      // si detectamos brand del logo, cambiamos el dropdown automáticamente.
      // Hacemos esto en background para no bloquear el UI; los chips ✨
      // aparecen cuando termina (~3-5s por foto).
      newJobs.forEach((job) => {
        (async () => {
          try {
            const form = new FormData();
            form.append("file", job.file);
            const upRes = await fetch("/api/upload", { method: "POST", body: form });
            const upData = await upRes.json();
            if (!upData?.success) return;
            const httpUrl: string = upData.data.url;
            const featRes = await fetch("/api/product-features", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: httpUrl, category: "static-product" }),
            });
            const featData = await featRes.json();
            if (!featData?.success || !featData.data) return;
            const features = featData.data as StaticProductFeatures;
            const detectedBrand = matchBrandFromText(features.marca_legible);
            setJobs((prev) =>
              prev.map((j) => {
                if (j.id !== job.id) return j;
                const patch: Partial<Job> = { productFeatures: features };
                // Solo overrideamos brand si la usuaria todavía tiene el
                // default. Si ya cambió manualmente, respetamos su elección.
                if (detectedBrand && j.brand === defaultBrand) {
                  patch.brand = detectedBrand;
                }
                return { ...j, ...patch };
              }),
            );
          } catch (err) {
            console.warn("[static-product] eager features failed:", err);
          }
        })();
      });
    },
    [defaultType, defaultBrand],
  );

  const updateJob = (id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const updateStep = (id: string, key: StepKey, patch: Partial<StepSnapshot>) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, steps: { ...j.steps, [key]: { ...j.steps[key], ...patch } } }
          : j,
      ),
    );
  };

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  /**
   * Gap 1 del audit — carga todas las imágenes de una categoría del inventario
   * (paginado 10×10 vía /api/inventory/load), las convierte en File y las
   * añade al grid. Después el usuario hace click en "Procesar todas" como
   * con upload normal. Seed compartido por marca (Gap 2) garantiza catálogo
   * cohesivo sin requerir cambios aquí.
   */
  const loadBatchFromCategory = useCallback(
    async (cat: InventoryCategoryLite) => {
      if (isRunning || batchLoadingId) return;
      if (cat.folders.length === 0) {
        toast.error(sp.messages.catNoFolders(cat.name));
        return;
      }

      setBatchLoadingId(cat.id);
      setBatchProgress({ loaded: 0, total: cat.imageCount });
      const loadedFiles: File[] = [];

      try {
        for (const folder of cat.folders) {
          const images = await loadAllFromFolder(folder, (loaded) => {
            setBatchProgress({ loaded: loadedFiles.length + loaded, total: cat.imageCount });
          });
          for (const img of images) {
            loadedFiles.push(dataUrlToFile(img.dataUrl, img.filename));
          }
        }
        if (loadedFiles.length === 0) {
          toast.info(sp.messages.noImagesFound(cat.name));
          return;
        }
        // Preset el productType desde el scan para esquivar la inferencia por filename
        // (que solo ve el nombre, no el folder — resultaría menos precisa).
        const presetType = cat.pipelineParams?.productType as StaticProductType | undefined;
        handleFiles(loadedFiles, { presetType });
        toast.success(sp.messages.photosLoadedFrom(loadedFiles.length, cat.name));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(sp.messages.errorLoadingCategory(cat.name, msg));
      } finally {
        setBatchLoadingId(null);
        setBatchProgress(null);
      }
    },
    [isRunning, batchLoadingId, handleFiles],
  );

  /**
   * Generate ONE of the 3 outputs (white | adaptive | vertical) using the
   * given input URL (the normalized transparent product). Composite-first:
   * for the adaptive/vertical outputs we use `mode: 'fast'` which calls
   * `generateBgFast` server-side, which does bg-remove + Flux Schnell bg +
   * Sharp composite — the original product pixels are NEVER modified by Flux.
   * For white we use `style: 'pure-white'` which goes straight to Sharp.
   */
  const generateOneOutput = async (
    inputUrl: string,
    key: StepKey,
    config: ReturnType<typeof getAdaptiveBgConfig>,
    overridePrompt?: string,
  ): Promise<{ url: string; cost: number }> => {
    // 90s timeout client-side — Vercel route caps at 60s, but giving us 30s
    // grace prevents the "infinite spinner" bug when a request hangs (e.g.
    // Replicate throttling on low budget) instead of returning a clean error.
    const timeoutSignal = AbortSignal.timeout(90_000);

    if (key === "white") {
      const r = await fetch("/api/bg-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: timeoutSignal,
        body: JSON.stringify({
          imageUrl: inputUrl,
          mode: "fast", // ignored by route when style is solid-color; included for safety
          style: "pure-white",
          aspectRatio: "1:1",
        }),
      });
      const d = await safeJson(r);
      if (!d.success) throw new Error(d.error || "Falló blanco e-commerce");
      return { url: d.data.url || d.data.imageUrl, cost: d.cost ?? 0 };
    }

    // adaptive (1:1), hero (4:5) and vertical (9:16) share the same prompt +
    // seed → cohesive catalog look across all three formats. Always use
    // mode:'fast' so the product is composited (pixel-perfect), never
    // re-imagined by Kontext Pro.
    const aspectRatio = key === "vertical" ? "9:16" : key === "hero" ? "4:5" : "1:1";
    const r = await fetch("/api/bg-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: timeoutSignal,
      body: JSON.stringify({
        imageUrl: inputUrl,
        mode: "fast",
        style: "custom",
        customPrompt: overridePrompt?.trim() || config.prompt,
        aspectRatio,
        seed: config.seed,
      }),
    });
    const d = await safeJson(r);
    if (!d.success) throw new Error(d.error || `Falló generar ${key}`);
    return { url: d.data.url || d.data.imageUrl, cost: d.cost ?? 0.003 };
  };

  const runOutputStep = async (
    jobId: string,
    key: StepKey,
    inputUrl: string,
    config: ReturnType<typeof getAdaptiveBgConfig>,
    overridePrompt?: string,
  ): Promise<{ url?: string; cost: number }> => {
    updateStep(jobId, key, { status: "running", error: undefined });
    try {
      const { url, cost } = await generateOneOutput(inputUrl, key, config, overridePrompt);
      updateStep(jobId, key, { status: "done", resultUrl: url, cost });
      return { url, cost };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateStep(jobId, key, { status: "error", error: message });
      return { cost: 0 };
    }
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

      // 1b. Analyze the uploaded photo features in parallel — ~$0.001, ~3s.
      // The result is injected into the bg-generate prompts so the background
      // is built around THIS specific bottle (real shape, color, label) instead
      // of a generic brand+type template. Fire-and-forget: if it fails the
      // pipeline keeps going with the legacy template-only prompt.
      const featuresPromise = fetch("/api/product-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: currentUrl, category: "static-product" }),
      })
        .then((r) => r.json())
        .then((d) => (d?.success ? (d.data as StaticProductFeatures) : null))
        .catch(() => null);

      // 2. Remove background → step "isolate"
      updateJob(job.id, { status: "isolating" });
      updateStep(job.id, "isolate", { status: "running" });
      const bgRes = await fetch("/api/bg-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: currentUrl, provider: "replicate" }),
      });
      const bgData = await safeJson(bgRes);
      if (!bgData.success) {
        updateStep(job.id, "isolate", { status: "error", error: bgData.error || "Falló quitar fondo" });
        throw new Error(bgData.error || "Background removal failed");
      }
      currentUrl = bgData.data.url || bgData.data.imageUrl;
      const isolateCost = bgData.cost ?? 0.01;
      totalCost += isolateCost;
      updateStep(job.id, "isolate", { status: "done", resultUrl: currentUrl, cost: isolateCost });

      // 3. Normalize canvas → step "normalize"
      updateJob(job.id, { status: "normalizing" });
      updateStep(job.id, "normalize", { status: "running" });
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
        console.warn("[static-product] normalize step soft-failed:", normData.error);
        updateStep(job.id, "normalize", { status: "skipped", error: normData.error });
      } else {
        currentUrl = normData.data.url || normData.data.imageUrl || currentUrl;
        updateStep(job.id, "normalize", { status: "done", resultUrl: currentUrl, cost: 0 });
      }

      // 4. Generate the 3 outputs in parallel from the same normalized input.
      //    All 3 share the EXACT same product pixels (composite-first).
      // Wait for productFeatures (started in step 1b) so we can inject the
      // per-photo descriptor into the prompt. Cap at 5s so the pipeline never
      // stalls on a slow Vision call.
      updateJob(job.id, { status: "generating" });
      const features = await Promise.race([
        featuresPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      if (features) {
        // Auto-detect brand from logo/text en la foto. Si Vision detecta
        // "ésika" en el frasco pero la usuaria dejó "Yanbal" como default,
        // sobreescribimos al brand correcto. Resuelve queja directa: subir
        // ésika y que aparezca como Yanbal por default es confuso.
        const detectedBrand = matchBrandFromText(features.marca_legible);
        const brandUpdate: Partial<Job> = { productFeatures: features };
        if (detectedBrand && detectedBrand !== job.brand) {
          brandUpdate.brand = detectedBrand;
          // Re-derivar config porque cambió la marca
          const newConfig = getAdaptiveBgConfig(job.productType, detectedBrand);
          // Actualizar el config local también para que el resto del flow lo vea
          Object.assign(config, newConfig);
        }
        updateJob(job.id, brandUpdate);
      }

      // Build the effective prompt:
      // 1. Si la usuaria eligió escena manual (mesa elegante, vanity, playa,
      //    manos, etc) usar ESA en vez del default por brand. Esto es el
      //    pedido directo: "tipo una mesa elegante o una persona con la
      //    colonia en la mano". El config.prompt se sustituye por el
      //    preset.prompt.
      // 2. Sumar el feature descriptor para que el frasco real se preserve.
      const manualScene = findScenePreset(job.sceneOverride);
      if (manualScene) {
        config.prompt = manualScene.prompt;
        config.label = manualScene.label;
      }
      const featureSuffix = features
        ? `. The product in the photo is: ${staticProductDescriptor(features)}. Compose the scene around this exact bottle — preserve its shape, color, label and material.`
        : "";
      const enrichedConfig = { ...config, prompt: config.prompt + featureSuffix };

      const sharedInput = currentUrl;
      const [whiteRes, adaptiveRes, heroRes, verticalRes] = await Promise.all([
        runOutputStep(job.id, "white", sharedInput, enrichedConfig),
        runOutputStep(job.id, "adaptive", sharedInput, enrichedConfig),
        runOutputStep(job.id, "hero", sharedInput, enrichedConfig),
        runOutputStep(job.id, "vertical", sharedInput, enrichedConfig),
      ]);
      totalCost += whiteRes.cost + adaptiveRes.cost + heroRes.cost + verticalRes.cost;

      // Optional: upscale the adaptive output (or white if adaptive failed) to a
      // higher-res, sharper version — opt-in ($0.05, ~15-40s). Clarity Upscaler
      // (resemblance 0.85, creativity 0.25) keeps the bottle faithful. softFail
      // so a GPU hiccup degrades sharpness of ONE output instead of erroring.
      if (job.upscaleOutput) {
        const upscaleSrc = adaptiveRes.url || whiteRes.url;
        if (upscaleSrc) {
          updateStep(job.id, "upscale", { status: "running" });
          try {
            const uRes = await fetch("/api/upscale", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageUrl: upscaleSrc,
                provider: "clarity",
                scale: 2,
                softFail: true,
              }),
            });
            const uData = await safeJson(uRes);
            if (uData.success && uData.data?.url) {
              const upscaleCost = uData.cost ?? 0.05;
              totalCost += upscaleCost;
              updateStep(job.id, "upscale", { status: "done", resultUrl: uData.data.url, cost: upscaleCost });
            } else {
              updateStep(job.id, "upscale", { status: "error", error: uData.error || "Falló alta resolución" });
            }
          } catch (uErr) {
            updateStep(job.id, "upscale", {
              status: "error",
              error: uErr instanceof Error ? uErr.message : String(uErr),
            });
          }
        } else {
          updateStep(job.id, "upscale", { status: "skipped", error: "Sin base para escalar (adaptive/white fallaron)." });
        }
      }

      // Optional: contact shadow on the white e-commerce output — opt-in (free,
      // Sharp-only). Grounds the product so it doesn't look cut out and pasted.
      if (job.addShadow) {
        const shadowSrc = whiteRes.url;
        if (shadowSrc) {
          updateStep(job.id, "shadow", { status: "running" });
          try {
            const sRes = await fetch("/api/shadows", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: shadowSrc, type: "contact" }),
            });
            const sData = await safeJson(sRes);
            if (sData.success && sData.data?.url) {
              const shadowCost = sData.cost ?? 0;
              totalCost += shadowCost;
              updateStep(job.id, "shadow", { status: "done", resultUrl: sData.data.url, cost: shadowCost });
            } else {
              updateStep(job.id, "shadow", { status: "error", error: sData.error || "Falló sombra de contacto" });
            }
          } catch (sErr) {
            updateStep(job.id, "shadow", {
              status: "error",
              error: sErr instanceof Error ? sErr.message : String(sErr),
            });
          }
        } else {
          updateStep(job.id, "shadow", { status: "skipped", error: "Sin blanco e-commerce sobre el cual aplicar sombra." });
        }
      }

      // Optional: video lifestyle 5s 9:16 (opt-in, costs $0.05). Solo se
      // ejecuta si la usuaria activó el toggle generateVideo en el job.
      // Toma el frame del adaptive como starting image y lo anima con
      // wan-2.2-fast según la acción elegida (spray, mist, rotación...).
      if (job.generateVideo && adaptiveRes.url) {
        updateStep(job.id, "lifestyleVideo", { status: "running" });
        try {
          const action = LIFESTYLE_VIDEO_ACTIONS.find((a) => a.value === (job.videoAction ?? "auto")) ?? LIFESTYLE_VIDEO_ACTIONS[0];
          const productDesc = job.productFeatures
            ? staticProductDescriptor(job.productFeatures)
            : "elegant fragrance bottle";
          const videoPrompt = `${action.promptHint}. Featured product: ${productDesc}. Premium fragrance commercial video aesthetic, vertical 9:16 format, professional lighting`;
          const vRes = await fetch("/api/video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: adaptiveRes.url,
              provider: "wan-2.2-fast",
              duration: 5,
              aspectRatio: "9:16",
              prompt: videoPrompt,
            }),
          });
          const vData = await safeJson(vRes);
          if (vData.success && vData.data?.url) {
            const videoCost = vData.cost ?? 0.05;
            totalCost += videoCost;
            updateStep(job.id, "lifestyleVideo", {
              status: "done",
              resultUrl: vData.data.url,
              cost: videoCost,
            });
          } else {
            updateStep(job.id, "lifestyleVideo", {
              status: "error",
              error: vData.error || "Falló video lifestyle",
            });
          }
        } catch (vErr) {
          updateStep(job.id, "lifestyleVideo", {
            status: "error",
            error: vErr instanceof Error ? vErr.message : String(vErr),
          });
        }
      }

      // Optional Gap-6 validator on the adaptive output only (the most likely to
      // surface a "missing product" or "duplicate" issue from Flux).
      if (validateBg && adaptiveRes.url) {
        try {
          const vRes = await fetch("/api/validate-bg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: adaptiveRes.url }),
          });
          const vData = await safeJson(vRes);
          if (vData.success && vData.data) {
            const v = vData.data as { productCount: number; looksLikeDuplicate: boolean; productMissing: boolean; reason: string };
            const validateCost = (vData.cost as number) ?? 0.0002;
            totalCost += validateCost;
            if (v.productMissing) {
              updateStep(job.id, "adaptive", { warning: sp.messages.productNotVisible(v.reason) });
            } else if (v.looksLikeDuplicate || v.productCount > 1) {
              updateStep(job.id, "adaptive", { warning: sp.messages.duplicateDetected(v.productCount, v.reason) });
            }
          }
        } catch (vErr) {
          console.warn("[static-product] validate-bg failed:", vErr);
        }
      }

      // Identity check: ensure the bottle in the adaptive output is the SAME
      // product as the input. Detects when the AI hallucinated a different
      // bottle. Soft-fail: only adds a warning chip, doesn't block the output.
      if (adaptiveRes.url) {
        fetch("/api/identity-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputUrl: sharedInput,
            outputUrl: adaptiveRes.url,
            category: "static-product",
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d?.success && d.data && !d.data.same && d.data.confidence > 0.6) {
              const changes = (d.data.changes ?? []).slice(0, 2).join("; ");
              updateStep(job.id, "adaptive", {
                warning: sp.messages.productChanged(changes || d.data.reason),
              });
            }
          })
          .catch((err) => console.warn("[static-product] identity-check failed:", err));
      }

      // The "main" thumbnail uses the adaptive 1:1 output (most visually rich).
      // If adaptive failed, fall back to white, then vertical, then the
      // normalize result, so the user always sees something useful.
      const main = adaptiveRes.url || whiteRes.url || heroRes.url || verticalRes.url || currentUrl;
      const anyOutputSucceeded = !!(whiteRes.url || adaptiveRes.url || heroRes.url || verticalRes.url);
      updateJob(job.id, {
        status: anyOutputSucceeded ? "done" : "error",
        resultUrl: main,
        cost: totalCost,
        error: anyOutputSucceeded ? undefined : sp.messages.allOutputsFailed,
      });

      // Save each successful output to the gallery so it's not lost. The
      // gallery shows them as separate entries with distinct suffixes.
      if (anyOutputSucceeded) {
        const addToGallery = useGalleryStore.getState().addImage;
        const stem = job.file.name.replace(/\.[^.]+$/, "");
        const outs: Array<[StepKey, string | undefined]> = [
          ["white", whiteRes.url],
          ["adaptive", adaptiveRes.url],
          ["hero", heroRes.url],
          ["vertical", verticalRes.url],
        ];
        for (const [key, url] of outs) {
          if (!url) continue;
          addToGallery({
            id: `static-${Date.now()}-${job.id}-${key}`,
            filename: `${stem}-${key}.jpg`,
            resultUrl: url,
            originalUrl: job.previewUrl,
            date: new Date().toISOString(),
            operations: ["bg-remove", "enhance", "bg-generate"],
            project: `static-${job.productType}-${job.brand}`,
          });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      updateJob(job.id, { status: "error", error: message });
      toast.error(sp.messages.jobError(job.file.name, message));
    }
  };

  /**
   * Re-generate ONE of the 3 outputs (or all of adaptive+vertical when called
   * from the "Cambiar fondo" modal). Uses the existing normalize result as
   * input, so we don't pay isolate+normalize again.
   */
  const reRunOutputs = async (
    jobId: string,
    keys: StepKey[],
    overridePrompt?: string,
  ) => {
    if (isRunning || reRunningJobId) return;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const inputUrl = job.steps.normalize.resultUrl || job.steps.isolate.resultUrl;
    if (!inputUrl) {
      toast.error(sp.messages.noImageAvailable);
      return;
    }
    const config = getAdaptiveBgConfig(job.productType, job.brand);
    setReRunningJobId(jobId);
    updateJob(jobId, { status: "generating", error: undefined });
    try {
      const results = await Promise.all(
        keys.map((key) => runOutputStep(jobId, key, inputUrl, config, overridePrompt)),
      );
      const addedCost = results.reduce((s, r) => s + r.cost, 0);
      const adaptive = job.steps.adaptive.resultUrl;
      const next = results.find((r) => r.url)?.url || adaptive || job.resultUrl;
      updateJob(jobId, {
        status: "done",
        resultUrl: next,
        cost: job.cost + addedCost,
      });
      toast.success(sp.messages.regenerated(keys.join(", ")));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateJob(jobId, { status: "error", error: message });
      toast.error(sp.messages.errorRerunning(message));
    } finally {
      setReRunningJobId(null);
    }
  };

  const handleProcessAll = async () => {
    if (isRunning) return;
    const pending = jobs.filter((j) => j.status === "idle" || j.status === "error");
    if (pending.length === 0) {
      toast.info(sp.messages.noPending);
      return;
    }
    setIsRunning(true);
    try {
      for (const job of pending) {
        await processJob(job);
      }
      toast.success(sp.messages.processed(pending.length));
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
    <div className="min-h-screen bg-surface text-heading overflow-x-hidden">
      {/* Header — design tokens (oro brand en vez de amber random) */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border-default)] bg-[rgba(12,12,14,0.85)] px-4 md:px-6 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition-default hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{sp.header.home}</span>
        </Link>
        <span className="text-[var(--border-default)]">/</span>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-muted)] text-[var(--bg-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Package className="h-4 w-4" />
          </span>
          <span className="font-serif text-[15px] font-semibold text-[var(--text-primary)] truncate">{sp.header.name}</span>
        </div>
        <div className="ml-auto hidden md:block">
          <span className="rounded-full border border-[var(--border-accent)] bg-[var(--accent-glow)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
            {sp.header.categories}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 md:px-6 py-8 md:py-12">
        <div className="mb-10 md:mb-12 lz-rise">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-accent)] bg-[var(--accent-glow)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            <Sparkles className="h-3 w-3" />
            {sp.header.name}
          </span>
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-[var(--text-primary)] md:text-[2.75rem]">
            {t.pages.staticProduct.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            {t.pages.staticProduct.subtitle}
          </p>
        </div>

        {/* Gap 1 — Batch desde inventario local */}
        <section className="mb-8 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)]">
                  <FolderOpen className="h-4 w-4" />
                </span>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">{sp.batch.heading}</h2>
                <span className="rounded-full border border-[var(--border-subtle)] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {sp.batch.badge}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
                {sp.batch.hintPre}<code className="rounded bg-[var(--bg-overlay)] px-1 text-[var(--text-secondary)]">docs/inventory-final/images/</code>{sp.batch.hintPost}
              </p>
            </div>
            <button
              onClick={loadScan}
              disabled={batchLoadingId !== null}
              className="lz-lift flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-default hover:border-[var(--accent)]/40 hover:text-[var(--accent-light)] disabled:opacity-50"
              title={sp.batch.refreshTitle}
            >
              <RefreshCw className="h-3 w-3" />
              {sp.batch.refresh}
            </button>
          </div>

          {scanError && (
            <div className="mb-3 rounded-[var(--radius-sm)] border border-[var(--error)]/30 bg-[var(--error-dim)] px-3 py-2 text-xs text-[var(--error)]">
              {sp.batch.errorLoading(scanError)}
            </div>
          )}

          {batchCategories === null ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 className="h-3 w-3 animate-spin" /> {sp.batch.scanning}
            </div>
          ) : batchCategories.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              {sp.batch.emptyPre}<code className="rounded bg-[var(--bg-overlay)] px-1 text-[var(--text-secondary)]">docs/inventory-final/images/</code>{sp.batch.emptyPost}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {batchCategories.map((cat) => {
                const isLoading = batchLoadingId === cat.id;
                const pt = cat.pipelineParams?.productType ?? "other";
                return (
                  <button
                    key={cat.id}
                    onClick={() => loadBatchFromCategory(cat)}
                    disabled={batchLoadingId !== null || isRunning}
                    className={cn(
                      "lz-lift group relative flex flex-col items-start gap-1.5 rounded-[var(--radius-md)] border bg-[var(--bg-elevated)] px-3.5 py-3 text-left transition-default",
                      isLoading
                        ? "border-[var(--accent)]/40 bg-[var(--accent-glow)]"
                        : "border-[var(--border-default)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-glow)] disabled:opacity-40 disabled:hover:border-[var(--border-default)] disabled:hover:bg-[var(--bg-elevated)]",
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{cat.name}</span>
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-[var(--accent)]" />
                      ) : (
                        <Package className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)] transition-default group-hover:text-[var(--accent)]" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">{pt}</span>
                      <span>{sp.batch.photos(cat.imageCount)}</span>
                    </div>
                    {isLoading && batchProgress && (
                      <div className="mt-1 w-full">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--bg-overlay)]">
                          <div
                            className="h-full rounded-full bg-[var(--accent)] transition-all"
                            style={{
                              width: `${batchProgress.total > 0 ? Math.round((batchProgress.loaded / batchProgress.total) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[9px] text-[var(--accent)]">
                          {sp.batch.loading(batchProgress.loaded, batchProgress.total)}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Defaults + upload */}
        <section className="mb-8 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 md:p-7 lz-rise">
          <div className="mb-5 flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/12 font-serif text-lg font-semibold text-[var(--accent-light)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              1
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">{sp.upload.stepKicker}</p>
              <h2 className="font-serif text-xl font-semibold text-[var(--text-primary)]">
                {sp.upload.stepTitle}{" "}
                <span className="font-sans text-sm font-normal text-[var(--text-muted)]">{sp.upload.headingHint}</span>
              </h2>
            </div>
          </div>

          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{sp.upload.defaultsTitle}</p>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">{sp.upload.defaultType}</label>
              <select
                value={defaultType}
                onChange={(e) => setDefaultType(e.target.value as StaticProductType)}
                className="focus-ring w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] transition-default hover:border-[var(--accent)]/40"
              >
                {Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">{sp.upload.defaultBrand}</label>
              <select
                value={defaultBrand}
                onChange={(e) => setDefaultBrand(e.target.value as StaticBrand)}
                className="focus-ring w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] transition-default hover:border-[var(--accent)]/40"
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
          <section className="mb-8 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 md:p-7 lz-rise">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/12 font-serif text-lg font-semibold text-[var(--accent-light)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  2
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">{sp.review.stepKicker}</p>
                  <h2 className="font-serif text-xl font-semibold text-[var(--text-primary)]">{sp.review.stepTitle}</h2>
                </div>
              </div>
              {/* Resumen — chips estilo checkout refinado */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                  {jobs.length} {sp.review.photosLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/25 bg-[var(--success-dim)] px-3 py-1.5 text-xs font-medium text-[var(--success)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {doneCount}/{jobs.length} {sp.review.done}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-accent)] bg-[var(--accent-glow)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]">
                  ${totalCost.toFixed(3)} <span className="font-normal text-[var(--accent-muted)]">{sp.review.spent}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {jobs.map((job) => {
                const cfg = getAdaptiveBgConfig(job.productType, job.brand);
                return (
                  <div
                    key={job.id}
                    className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 transition-default hover:border-[var(--border-accent)]"
                  ><div className="flex gap-4">
                    {/* Preview */}
                    <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-overlay)]">
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
                          className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 p-1.5 text-white backdrop-blur transition-default hover:bg-[var(--accent)] hover:text-[var(--bg-primary)]"
                          title={sp.job.downloadResult}
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-1 flex-col gap-2.5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]" title={job.file.name}>
                          {job.file.name}
                        </p>
                        <div className="flex items-center gap-1">
                          {(() => {
                            const doneOutputs = OUTPUT_STEPS.filter((k) => job.steps[k].status === "done" && job.steps[k].resultUrl);
                            if (doneOutputs.length === 0) return null;
                            return (
                              <button
                                type="button"
                                disabled={zippingJobId === job.id}
                                onClick={async () => {
                                  setZippingJobId(job.id);
                                  try {
                                    const zip = new JSZip();
                                    const baseName = job.file.name.replace(/\.[^.]+$/, "");
                                    let added = 0;
                                    for (const k of doneOutputs) {
                                      const url = job.steps[k].resultUrl!;
                                      try {
                                        const res = await fetch(url);
                                        if (!res.ok) continue;
                                        const blob = await res.blob();
                                        zip.file(`${baseName}-${k}.jpg`, blob);
                                        added++;
                                      } catch { /* skip individual failure */ }
                                    }
                                    if (added === 0) {
                                      toast.error(sp.messages.noneDownloaded);
                                      return;
                                    }
                                    const zipBlob = await zip.generateAsync({ type: "blob" });
                                    saveAs(zipBlob, `${baseName}-versiones.zip`);
                                    toast.success(sp.messages.zipReady(added));
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : sp.messages.zipError);
                                  } finally {
                                    setZippingJobId(null);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-[var(--success)]/25 bg-[var(--success-dim)] px-2 py-1 text-[10px] font-medium text-[var(--success)] transition-default hover:bg-[var(--success)]/20 disabled:opacity-50"
                                title={sp.job.downloadNOfNTitle(doneOutputs.length, OUTPUT_STEPS.length)}
                              >
                                {zippingJobId === job.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                                {doneOutputs.length === OUTPUT_STEPS.length
                                  ? sp.job.downloadAllN(OUTPUT_STEPS.length)
                                  : sp.job.downloadNOfN(doneOutputs.length, OUTPUT_STEPS.length)}
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => removeJob(job.id)}
                            disabled={isRunning}
                            className="rounded-md p-1 text-[var(--text-muted)] transition-default hover:bg-[var(--error-dim)] hover:text-[var(--error)] disabled:opacity-30"
                            title={sp.job.remove}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={job.productType}
                          onChange={(e) => updateJob(job.id, { productType: e.target.value as StaticProductType })}
                          disabled={isRunning || job.status !== "idle"}
                          className="focus-ring rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] transition-default hover:border-[var(--accent)]/40 disabled:opacity-50"
                        >
                          {Object.entries(PRODUCT_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <select
                          value={job.brand}
                          onChange={(e) => updateJob(job.id, { brand: e.target.value as StaticBrand })}
                          disabled={isRunning || job.status !== "idle"}
                          className="focus-ring rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] transition-default hover:border-[var(--accent)]/40 disabled:opacity-50"
                        >
                          {Object.entries(BRAND_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>

                      {/* Selector de escena manual — pedido directo:
                          "tipo una mesa elegante o una persona con la colonia
                          en la mano". 14 escenarios curados profesionalmente,
                          agrupados por categoría. Si no eligen, sale el default
                          por brand+tipo. */}
                      <div>
                        <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                          {sp.job.sceneLabel}
                          <span className="text-muted normal-case font-normal">{sp.job.sceneHint}</span>
                        </label>
                        <select
                          value={job.sceneOverride ?? "auto"}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateJob(job.id, { sceneOverride: v === "auto" ? null : v });
                          }}
                          disabled={isRunning || (job.status !== "idle" && job.status !== "done" && job.status !== "error")}
                          className="focus-ring w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-2 text-xs text-[var(--text-primary)] transition-default hover:border-[var(--accent)]/40 disabled:opacity-50"
                        >
                          <option value="auto">{sp.job.sceneAuto}</option>
                          {(["lujo", "natural", "lifestyle", "romantico", "editorial", "studio"] as SceneCategory[]).map((cat) => {
                            const presets = getScenePresetsForType(job.productType).filter((p) => p.category === cat);
                            if (presets.length === 0) return null;
                            return (
                              <optgroup key={cat} label={SCENE_CATEGORY_LABELS[cat]}>
                                {presets.map((p) => (
                                  <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                        {job.sceneOverride && (
                          <p className="mt-1 text-[10px] text-muted leading-tight">
                            {findScenePreset(job.sceneOverride)?.description}
                          </p>
                        )}
                      </div>

                      {/* Toggle "🎬 Generar video Reels" + acción.
                          Pedido directo: "falta para las redes sociales,
                          modelo poniéndosela, haciendo spray a la colonia,
                          un fondo interesante". 5s 9:16 wan-2.2-fast,
                          opt-in porque suma $0.05 + 60-120s. */}
                      <div className="rounded-[var(--radius-sm)] border border-[var(--accent)]/25 bg-[var(--accent-glow)] px-3 py-2.5">
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={job.generateVideo ?? false}
                            onChange={(e) => updateJob(job.id, { generateVideo: e.target.checked })}
                            disabled={isRunning || (job.status !== "idle" && job.status !== "done" && job.status !== "error")}
                            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-[var(--accent-light)]">
                                {sp.job.videoToggle}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
                              {sp.job.videoDesc}
                            </p>
                          </div>
                        </label>
                        {job.generateVideo && (
                          <div className="mt-2.5 pl-6">
                            <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                              {sp.job.videoAction}
                            </label>
                            <select
                              value={job.videoAction ?? "auto"}
                              onChange={(e) => updateJob(job.id, { videoAction: e.target.value as LifestyleVideoAction })}
                              disabled={isRunning || (job.status !== "idle" && job.status !== "done" && job.status !== "error")}
                              className="focus-ring w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] transition-default hover:border-[var(--accent)]/40 disabled:opacity-50"
                            >
                              {LIFESTYLE_VIDEO_ACTIONS.map((a) => (
                                <option key={a.value} value={a.value}>{a.icon} {sp.job.videoActions[a.value]}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Mejoras opt-in: alta resolución (upscale) + sombra de
                          contacto. Ambas suman una tarjeta de output cuando se
                          activan. Upscale cuesta $0.05; la sombra es gratis. */}
                      <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <label className="flex items-start gap-2.5 cursor-pointer px-3 py-2.5 transition-default hover:bg-white/[0.03]">
                          <input
                            type="checkbox"
                            checked={job.upscaleOutput ?? false}
                            onChange={(e) => updateJob(job.id, { upscaleOutput: e.target.checked })}
                            disabled={isRunning || (job.status !== "idle" && job.status !== "done" && job.status !== "error")}
                            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">{sp.job.upscaleToggle}</span>
                            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-0.5">{sp.job.upscaleDesc}</p>
                          </div>
                        </label>
                        <label className="flex items-start gap-2.5 cursor-pointer px-3 py-2.5 transition-default hover:bg-white/[0.03]">
                          <input
                            type="checkbox"
                            checked={job.addShadow ?? false}
                            onChange={(e) => updateJob(job.id, { addShadow: e.target.checked })}
                            disabled={isRunning || (job.status !== "idle" && job.status !== "done" && job.status !== "error")}
                            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">{sp.job.shadowToggle}</span>
                            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-0.5">{sp.job.shadowDesc}</p>
                          </div>
                        </label>
                      </div>

                      {/* Per-photo features detected by Vision — shows that the
                           pipeline is using THIS bottle, not a generic template */}
                      {job.productFeatures && (
                        <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                            {sp.job.featuresTitle}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                              {job.productFeatures.tipo_envase} {job.productFeatures.forma}
                            </span>
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                              {job.productFeatures.material_aparente}
                            </span>
                            {job.productFeatures.color_envase && (
                              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                                {job.productFeatures.color_envase}
                              </span>
                            )}
                            {job.productFeatures.tapa && (
                              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                                {sp.job.cap(job.productFeatures.tapa)}
                              </span>
                            )}
                            {job.productFeatures.marca_legible && (
                              <span className="rounded bg-[var(--accent-dim)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                                {job.productFeatures.marca_legible}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="flex items-center gap-1 truncate text-[11px] text-[var(--accent)]"
                          title={cfg.prompt}
                        >
                          <Wand2 className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        <StatusPill status={job.status} />
                      </div>

                      {job.error && (
                        <p className="text-[11px] text-[var(--error)]" title={job.error}>
                          {job.error.length > 80 ? job.error.slice(0, 80) + "..." : job.error}
                        </p>
                      )}
                    </div>
                    </div>

                    {/* Step timeline — split into 2 prep steps (compact) + 3 outputs (big) */}
                    {job.status !== "idle" && (
                      <div className="mt-3 space-y-3">
                        {/* Prep — compact thumbnails */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {(["isolate", "normalize"] as StepKey[]).map((key) => {
                            const step = job.steps[key];
                            const meta = STEP_META[key];
                            const spMeta = sp.steps.items[key];
                            const activeClass =
                              step.status === "done" ? "border-[var(--success)]/30 bg-[var(--success-dim)]" :
                              step.status === "running" ? "border-[var(--accent)]/40 bg-[var(--accent-glow)] animate-pulse" :
                              step.status === "error" ? "border-[var(--error)]/40 bg-[var(--error-dim)]" :
                              step.status === "skipped" ? "border-[var(--border-subtle)] bg-white/[0.02] opacity-60" :
                              "border-[var(--border-default)] bg-[var(--bg-surface)]";
                            return (
                              <div
                                key={key}
                                className={cn("flex items-center gap-2.5 rounded-[var(--radius-sm)] border p-2.5 text-[11px]", activeClass)}
                                title={step.error ?? spMeta.description}
                              >
                                <span className="text-base">{meta.icon}</span>
                                {step.resultUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setLightbox({ url: step.resultUrl!, label: spMeta.label })}
                                    className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-overlay)] transition-default hover:ring-2 hover:ring-[var(--accent)]/60"
                                    title={sp.job.zoomSmall}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={step.resultUrl} alt={spMeta.label} className="h-full w-full object-contain" />
                                  </button>
                                ) : (
                                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-overlay)] text-[var(--text-disabled)]">
                                    {step.status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : "—"}
                                  </div>
                                )}
                                <div className="flex flex-1 flex-col text-[10px]">
                                  <span className="truncate font-medium text-[var(--text-primary)]">{spMeta.label}</span>
                                  <span className="text-[var(--text-muted)]">
                                    {step.status === "done" && <><CheckCircle2 className="inline h-2.5 w-2.5 text-[var(--success)]" /> {step.cost > 0 && <span className="font-mono text-[var(--accent)]">${step.cost.toFixed(3)}</span>}</>}
                                    {step.status === "error" && <span className="text-[var(--error)]"><AlertCircle className="inline h-2.5 w-2.5" /> {sp.steps.failedLower}</span>}
                                    {step.status === "skipped" && sp.steps.skipped}
                                    {step.status === "running" && sp.steps.processingLower}
                                    {step.status === "idle" && spMeta.costHint}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Outputs — big thumbnails with download + zoom + re-run */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          {outputStepsFor(job).map((key) => {
                            const step = job.steps[key];
                            const meta = STEP_META[key];
                            const spMeta = sp.steps.items[key];
                            const isVideo = key === "lifestyleVideo";
                            const activeClass =
                              step.status === "done" ? "border-[var(--success)]/30 bg-[var(--success-dim)]" :
                              step.status === "running" ? "border-[var(--accent)]/40 bg-[var(--accent-glow)] animate-pulse" :
                              step.status === "error" ? "border-[var(--error)]/40 bg-[var(--error-dim)]" :
                              step.status === "skipped" ? "border-[var(--border-subtle)] bg-white/[0.02] opacity-60" :
                              "border-[var(--border-default)] bg-[var(--bg-surface)]";
                            const downloadName = `${job.file.name.replace(/\.[^.]+$/, "")}-${key}.${isVideo ? "mp4" : "jpg"}`;
                            const canRerun =
                              (job.status === "done" || job.status === "error") &&
                              !isRunning &&
                              reRunningJobId !== job.id;
                            return (
                              <div
                                key={key}
                                className={cn("flex flex-col rounded-[var(--radius-md)] border p-3", activeClass)}
                                title={step.error ?? spMeta.description}
                              >
                                <div className="mb-2 flex items-center justify-between gap-1 text-[11px]">
                                  <span className="flex items-center gap-1.5 truncate font-semibold text-[var(--text-primary)]">
                                    <span className="text-base">{meta.icon}</span>
                                    {spMeta.label}
                                    {spMeta.what && (
                                      <details className="relative ml-0.5">
                                        <summary
                                          className="cursor-pointer list-none rounded-md bg-white/5 px-1 text-[9px] text-[var(--text-muted)] transition-default hover:bg-white/10 hover:text-[var(--accent)]"
                                          title={sp.steps.infoTitle}
                                        >
                                          ⓘ
                                        </summary>
                                        <div className="absolute left-0 top-5 z-10 w-64 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                                          <p className="mb-1 text-[10px] leading-relaxed text-[var(--text-secondary)]">{spMeta.what}</p>
                                          {spMeta.provider && (
                                            <p className="mt-1.5 text-[9px] text-[var(--text-muted)]">
                                              <span className="font-semibold text-[var(--accent)]">{sp.steps.providerLabel}</span> {spMeta.provider}
                                            </p>
                                          )}
                                          {spMeta.duration && (
                                            <p className="text-[9px] text-[var(--text-muted)]">
                                              <span className="font-semibold text-[var(--accent)]">{sp.steps.durationLabel}</span> {spMeta.duration}
                                            </p>
                                          )}
                                          {spMeta.tips && spMeta.tips.length > 0 && (
                                            <div className="mt-1.5 border-t border-[var(--border-subtle)] pt-1.5">
                                              <p className="text-[9px] font-semibold text-[var(--accent)]">{sp.steps.tipsLabel}</p>
                                              <ul className="mt-0.5 list-disc pl-3 text-[9px] text-[var(--text-secondary)]">
                                                {spMeta.tips.map((t, i) => (
                                                  <li key={i} className="leading-tight">{t}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                      </details>
                                    )}
                                  </span>
                                  <span
                                    className={cn(
                                      "font-mono text-[10px]",
                                      step.status === "error" ? "text-[var(--error)]" : "text-[var(--accent)]",
                                    )}
                                  >
                                    {step.status === "error"
                                      ? sp.steps.failedCap
                                      : step.status === "done" && step.cost > 0
                                        ? `$${step.cost.toFixed(3)}`
                                        : spMeta.costHint}
                                  </span>
                                </div>

                                {step.resultUrl ? (
                                  isVideo ? (
                                    <video
                                      src={step.resultUrl}
                                      className="h-40 w-full rounded-[var(--radius-sm)] bg-[var(--bg-overlay)] object-contain"
                                      controls
                                      loop
                                      muted
                                      playsInline
                                    />
                                  ) : (
                                  <button
                                    type="button"
                                    onClick={() => setLightbox({ url: step.resultUrl!, label: `${job.file.name} — ${spMeta.label}` })}
                                    className="group relative h-40 w-full overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-overlay)] transition-default hover:ring-2 hover:ring-[var(--accent)]/70"
                                    title={sp.steps.zoomBig}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={step.resultUrl}
                                      alt={spMeta.label}
                                      className="h-full w-full object-contain"
                                    />
                                    <span className="absolute right-1.5 top-1.5 rounded-md bg-black/70 p-1 text-white opacity-0 backdrop-blur transition-default group-hover:opacity-100">
                                      <Maximize2 className="h-3 w-3" />
                                    </span>
                                    {step.warning && (
                                      <span
                                        className="absolute left-1.5 top-1.5 rounded-md bg-[var(--warning)] px-1.5 py-0.5 text-[10px] font-semibold text-black shadow"
                                        title={step.warning}
                                      >
                                        {sp.steps.reviewBadge}
                                      </span>
                                    )}
                                  </button>
                                  )
                                ) : (
                                  <div className="flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-overlay)] px-2 text-[var(--text-disabled)]">
                                    {step.status === "running" ? (
                                      <>
                                        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
                                        <span className="text-[10px] text-[var(--accent)]">{sp.steps.generating}</span>
                                      </>
                                    ) : step.status === "error" ? (
                                      <>
                                        <AlertCircle className="h-6 w-6 flex-shrink-0 text-[var(--error)]" />
                                        <span className="line-clamp-3 text-center text-[10px] leading-tight text-[var(--error)]" title={step.error}>
                                          {step.error || sp.steps.unknownError}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-xs">{sp.steps.waiting}</span>
                                    )}
                                  </div>
                                )}

                                <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-muted)]">{spMeta.description}</p>

                                {/* Per-output controls */}
                                <div className="mt-2.5 flex items-center justify-end gap-1.5">
                                  {step.resultUrl && (
                                    <a
                                      href={step.resultUrl}
                                      download={downloadName}
                                      className="inline-flex items-center gap-1 rounded-md border border-[var(--success)]/25 bg-[var(--success-dim)] px-2 py-1 text-[10px] font-medium text-[var(--success)] transition-default hover:bg-[var(--success)]/20"
                                      title={sp.steps.downloadStep(spMeta.label)}
                                    >
                                      <Download className="h-2.5 w-2.5" />
                                      {sp.steps.download}
                                    </a>
                                  )}
                                  {canRerun && key === "adaptive" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setBgPromptModal({
                                          job,
                                          customPrompt: getAdaptiveBgConfig(job.productType, job.brand).prompt,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 rounded-md border border-[var(--accent)]/25 bg-[var(--accent-dim)] px-2 py-1 text-[10px] font-medium text-[var(--accent)] transition-default hover:bg-[var(--accent)]/20"
                                      title={sp.steps.changeTitle}
                                    >
                                      <Palette className="h-2.5 w-2.5" />
                                      {sp.steps.change}
                                    </button>
                                  )}
                                  {canRerun && OUTPUT_STEPS.includes(key) && (
                                    <button
                                      type="button"
                                      onClick={() => reRunOutputs(job.id, [key])}
                                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-white/5 px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] transition-default hover:border-[var(--accent)]/40 hover:text-[var(--accent-light)]"
                                      title={sp.steps.repeatTitle}
                                    >
                                      <RotateCw className="h-2.5 w-2.5" />
                                      {sp.steps.repeat}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Actions */}
        {jobs.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <button
              onClick={handleProcessAll}
              disabled={isRunning}
              className="lz-lift inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-accent)] bg-gradient-to-b from-[var(--accent)] to-[var(--accent-muted)] px-5 py-2.5 text-sm font-semibold text-[#0C0C0E] shadow-[0_4px_14px_-4px_rgba(212,180,138,0.55)] transition-default hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? sp.actions.processing : sp.actions.processAll}
            </button>

            {/* Gap 6 — toggle validador de fondos (default ON, costo despreciable) */}
            <label
              className={cn(
                "inline-flex items-center gap-2 rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-xs transition-default cursor-pointer",
                validateBg
                  ? "border-[var(--accent)]/40 bg-[var(--accent-glow)] text-[var(--accent-light)]"
                  : "border-[var(--border-default)] bg-white/[0.03] text-[var(--text-muted)] hover:border-[var(--accent)]/30 hover:text-[var(--text-secondary)]",
              )}
              title={sp.actions.validateTitle}
            >
              <input
                type="checkbox"
                checked={validateBg}
                onChange={(e) => setValidateBg(e.target.checked)}
                disabled={isRunning}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              <span>{sp.actions.validateLabel} <span className="text-[10px] opacity-70">{sp.actions.validateCost}</span></span>
            </label>
            <button
              onClick={() => {
                jobs.forEach((j) => URL.revokeObjectURL(j.previewUrl));
                previewUrlsRef.current = [];
                setJobs([]);
              }}
              disabled={isRunning}
              className="lz-lift ml-auto inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-default hover:border-[var(--accent)]/40 hover:text-[var(--accent-light)] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              {sp.actions.clearAll}
            </button>
          </div>
        )}
      </div>

      {/* Gap 5 — modal para cambiar el prompt del fondo y re-generar */}
      {bgPromptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setBgPromptModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-[var(--text-primary)]">
                <Palette className="h-4 w-4 text-[var(--accent)]" />
                {sp.modal.title}
              </h3>
              <button
                onClick={() => setBgPromptModal(null)}
                className="rounded-md p-1 text-[var(--text-muted)] transition-default hover:bg-white/5 hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-xs text-[var(--text-muted)]">
              {bgPromptModal.job.file.name} — {PRODUCT_TYPE_LABELS[bgPromptModal.job.productType]} / {BRAND_LABELS[bgPromptModal.job.brand]}
            </p>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {(["perfume", "cream", "sunscreen", "deodorant", "facial", "makeup"] as StaticProductType[]).map((pt) => {
                const altConfig = getAdaptiveBgConfig(pt, bgPromptModal.job.brand);
                const isCurrent = altConfig.prompt === bgPromptModal.customPrompt;
                return (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setBgPromptModal({ ...bgPromptModal, customPrompt: altConfig.prompt })}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[10px] transition-default",
                      isCurrent
                        ? "border-[var(--accent)]/50 bg-[var(--accent-dim)] text-[var(--accent-light)]"
                        : "border-[var(--border-default)] bg-white/[0.03] text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text-secondary)]",
                    )}
                    title={altConfig.prompt.slice(0, 100) + "..."}
                  >
                    {altConfig.label}
                  </button>
                );
              })}
            </div>

            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              {sp.modal.promptLabel}
            </label>
            <textarea
              value={bgPromptModal.customPrompt}
              onChange={(e) => setBgPromptModal({ ...bgPromptModal, customPrompt: e.target.value })}
              className="focus-ring mb-4 h-32 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]"
              placeholder={sp.modal.promptPlaceholder}
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setBgPromptModal(null)}
                className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-white/[0.03] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition-default hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)]"
              >
                {sp.modal.cancel}
              </button>
              <button
                onClick={() => {
                  const modalJob = bgPromptModal.job;
                  const prompt = bgPromptModal.customPrompt;
                  setBgPromptModal(null);
                  // Re-generate both adaptive 1:1 AND vertical 9:16 with the new
                  // prompt so the catalog square and reels formats stay coherent.
                  reRunOutputs(modalJob.id, ["adaptive", "vertical"], prompt);
                }}
                disabled={!bgPromptModal.customPrompt.trim()}
                className="lz-lift inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-accent)] bg-gradient-to-b from-[var(--accent)] to-[var(--accent-muted)] px-4 py-2 text-xs font-semibold text-[#0C0C0E] shadow-[0_4px_14px_-4px_rgba(212,180,138,0.55)] transition-default hover:brightness-110 disabled:opacity-50"
              >
                <RotateCw className="h-3 w-3" />
                {sp.modal.regenerate}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox — full-size preview of any thumbnail. ESC or click outside closes. */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            title={sp.lightbox.close}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex max-h-full max-w-full flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <p className="max-w-[80vw] truncate text-xs text-[var(--text-secondary)]">{lightbox.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.label}
              className="max-h-[85vh] max-w-[90vw] rounded-[var(--radius-md)] object-contain shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
            />
            <a
              href={lightbox.url}
              download
              className="lz-lift inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-accent)] bg-gradient-to-b from-[var(--accent)] to-[var(--accent-muted)] px-4 py-2 text-xs font-semibold text-[#0C0C0E] shadow-[0_4px_14px_-4px_rgba(212,180,138,0.55)] transition-default hover:brightness-110"
            >
              <Download className="h-3 w-3" />
              {sp.lightbox.download}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
