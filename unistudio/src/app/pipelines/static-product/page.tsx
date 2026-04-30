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
  FolderOpen,
  RefreshCw,
  RotateCw,
  Palette,
  Maximize2,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils/cn";
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
type StepKey = "isolate" | "normalize" | "white" | "adaptive" | "vertical";

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
}

const INITIAL_STEPS: Record<StepKey, StepSnapshot> = {
  isolate: { cost: 0, status: "idle" },
  normalize: { cost: 0, status: "idle" },
  white: { cost: 0, status: "idle" },
  adaptive: { cost: 0, status: "idle" },
  vertical: { cost: 0, status: "idle" },
};

const STEP_META: Record<StepKey, { label: string; icon: string; costHint: string; description: string }> = {
  isolate: {
    label: "Quitar fondo",
    icon: "✂️",
    costHint: "$0.01",
    description: "Aísla el producto sobre transparente.",
  },
  normalize: {
    label: "Centrar 2000×2000",
    icon: "📐",
    costHint: "Gratis",
    description: "Resize y centrado consistente entre fotos del mismo SKU.",
  },
  white: {
    label: "Blanco e-commerce",
    icon: "⬜",
    costHint: "Gratis",
    description: "Fondo #FFFFFF puro, listo para Amazon/MercadoLibre/listing. Sharp puro, no pasa por modelo IA.",
  },
  adaptive: {
    label: "Adaptativo catálogo",
    icon: "🎨",
    costHint: "$0.003",
    description: "Fondo decidido por marca+tipo (mármol, gradient, playa). 1:1, listo para web/Instagram feed.",
  },
  vertical: {
    label: "Vertical 9:16",
    icon: "📱",
    costHint: "$0.003",
    description: "Mismo fondo adaptativo en formato vertical. Listo para Reels/Stories/TikTok.",
  },
};

/** Las 3 etapas que producen un output descargable (orden de display). */
const OUTPUT_STEPS: StepKey[] = ["white", "adaptive", "vertical"];

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
  normalizing: "Centrando 2000×2000...",
  generating: "Generando 3 fondos...",
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
        toast.warning(`${skipped} foto${skipped !== 1 ? "s" : ""} duplicada${skipped !== 1 ? "s" : ""} ignorada${skipped !== 1 ? "s" : ""}.`);
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
        toast.warning(
          `${ambiguousCount} foto${ambiguousCount !== 1 ? "s" : ""} con nombre compartido entre perfumes y desodorantes — confirma el tipo antes de procesar.`,
        );
      }
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
        toast.error(`${cat.name} no tiene carpetas con imágenes.`);
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
          toast.info(`No se encontraron imágenes en ${cat.name}.`);
          return;
        }
        // Preset el productType desde el scan para esquivar la inferencia por filename
        // (que solo ve el nombre, no el folder — resultaría menos precisa).
        const presetType = cat.pipelineParams?.productType as StaticProductType | undefined;
        handleFiles(loadedFiles, { presetType });
        toast.success(`${loadedFiles.length} foto(s) cargadas desde ${cat.name}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Error cargando ${cat.name}: ${msg}`);
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

    // adaptive (1:1) and vertical (9:16) share the same prompt + seed → cohesive
    // catalog look across both formats. Always use mode:'fast' so the product
    // is composited (pixel-perfect), never re-imagined by Kontext Pro.
    const aspectRatio = key === "vertical" ? "9:16" : "1:1";
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
        updateJob(job.id, { productFeatures: features });
      }

      // Build the effective prompt: legacy template + per-photo descriptor so
      // the AI uses THIS bottle's real characteristics (Yanbal vs Cyzone won't
      // both end up looking like the same generic frasco).
      const featureSuffix = features
        ? `. The product in the photo is: ${staticProductDescriptor(features)}. Compose the scene around this exact bottle — preserve its shape, color, label and material.`
        : "";
      const enrichedConfig = { ...config, prompt: config.prompt + featureSuffix };

      const sharedInput = currentUrl;
      const [whiteRes, adaptiveRes, verticalRes] = await Promise.all([
        runOutputStep(job.id, "white", sharedInput, enrichedConfig),
        runOutputStep(job.id, "adaptive", sharedInput, enrichedConfig),
        runOutputStep(job.id, "vertical", sharedInput, enrichedConfig),
      ]);
      totalCost += whiteRes.cost + adaptiveRes.cost + verticalRes.cost;

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
              updateStep(job.id, "adaptive", { warning: `⚠ Producto no visible: ${v.reason}` });
            } else if (v.looksLikeDuplicate || v.productCount > 1) {
              updateStep(job.id, "adaptive", { warning: `⚠ Duplicado detectado (count=${v.productCount}): ${v.reason}` });
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
                warning: `⚠ El producto cambió: ${changes || d.data.reason}`,
              });
            }
          })
          .catch((err) => console.warn("[static-product] identity-check failed:", err));
      }

      // The "main" thumbnail uses the adaptive 1:1 output (most visually rich).
      // If adaptive failed, fall back to white, then vertical, then the
      // normalize result, so the user always sees something useful.
      const main = adaptiveRes.url || whiteRes.url || verticalRes.url || currentUrl;
      const anyOutputSucceeded = !!(whiteRes.url || adaptiveRes.url || verticalRes.url);
      updateJob(job.id, {
        status: anyOutputSucceeded ? "done" : "error",
        resultUrl: main,
        cost: totalCost,
        error: anyOutputSucceeded ? undefined : "Los 3 outputs fallaron — revisa los errores por paso.",
      });

      // Save each successful output to the gallery so it's not lost. The
      // gallery shows them as separate entries with distinct suffixes.
      if (anyOutputSucceeded) {
        const addToGallery = useGalleryStore.getState().addImage;
        const stem = job.file.name.replace(/\.[^.]+$/, "");
        const outs: Array<[StepKey, string | undefined]> = [
          ["white", whiteRes.url],
          ["adaptive", adaptiveRes.url],
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
      toast.error(`Error en ${job.file.name}: ${message}`);
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
      toast.error("No hay imagen disponible. Procesa el job completo primero.");
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
      toast.success(`Re-generado: ${keys.join(", ")}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateJob(jobId, { status: "error", error: message });
      toast.error(`Error re-ejecutando: ${message}`);
    } finally {
      setReRunningJobId(null);
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

        {/* Gap 1 — Batch desde inventario local */}
        <section className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
                <FolderOpen className="mr-2 inline h-4 w-4" />
                Batch desde inventario
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Carga todas las fotos de una categoría sin subir manualmente. Solo funciona en dev local (las imágenes viven en <code className="rounded bg-black/40 px-1">docs/inventory-final/images/</code>, no se deployan).
              </p>
            </div>
            <button
              onClick={loadScan}
              disabled={batchLoadingId !== null}
              className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-gray-400 hover:border-white/20 hover:text-white disabled:opacity-50"
              title="Refrescar inventario"
            >
              <RefreshCw className="h-3 w-3" />
              Refrescar
            </button>
          </div>

          {scanError && (
            <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              Error cargando inventario: {scanError}
            </div>
          )}

          {batchCategories === null ? (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Escaneando inventario...
            </div>
          ) : batchCategories.length === 0 ? (
            <p className="text-xs text-gray-500">
              No se encontraron categorías de estáticos en el inventario local. Verifica que <code className="rounded bg-black/40 px-1">docs/inventory-final/images/</code> existe.
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
                      "group relative flex flex-col items-start gap-1 rounded-lg border bg-black/30 px-3 py-2.5 text-left transition",
                      isLoading
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-black/30",
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-gray-200">{cat.name}</span>
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-amber-300" />
                      ) : (
                        <Package className="h-3.5 w-3.5 flex-shrink-0 text-gray-500 group-hover:text-emerald-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">{pt}</span>
                      <span>{cat.imageCount} fotos</span>
                    </div>
                    {isLoading && batchProgress && (
                      <div className="mt-1 w-full">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-black/40">
                          <div
                            className="h-full bg-amber-400 transition-all"
                            style={{
                              width: `${batchProgress.total > 0 ? Math.round((batchProgress.loaded / batchProgress.total) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <p className="mt-0.5 text-[9px] text-amber-300">
                          Cargando {batchProgress.loaded}/{batchProgress.total}...
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
        <section className="mb-6 rounded-xl border border-white/8 bg-white/[0.02] p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            1 · Sube tus fotos <span className="font-normal normal-case text-gray-500">o usa el batch de arriba</span>
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

            <div className="grid grid-cols-1 gap-3">
              {jobs.map((job) => {
                const cfg = getAdaptiveBgConfig(job.productType, job.brand);
                return (
                  <div
                    key={job.id}
                    className="rounded-lg border border-white/8 bg-black/30 p-3"
                  ><div className="flex gap-3">
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
                                      toast.error("No se pudo descargar ninguna versión.");
                                      return;
                                    }
                                    const zipBlob = await zip.generateAsync({ type: "blob" });
                                    saveAs(zipBlob, `${baseName}-3versiones.zip`);
                                    toast.success(`ZIP listo (${added} versión${added !== 1 ? "es" : ""}).`);
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : "Error generando ZIP");
                                  } finally {
                                    setZippingJobId(null);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-1 text-[10px] font-medium text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                                title={`Descargar ${doneOutputs.length} de 3 versiones como ZIP`}
                              >
                                {zippingJobId === job.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                                {doneOutputs.length === 3
                                  ? "Descargar las 3"
                                  : `Descargar ${doneOutputs.length}/3`}
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => removeJob(job.id)}
                            disabled={isRunning}
                            className="text-gray-500 hover:text-red-400 disabled:opacity-30"
                            title="Quitar"
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

                      {/* Per-photo features detected by Vision — shows that the
                           pipeline is using THIS bottle, not a generic template */}
                      {job.productFeatures && (
                        <div className="rounded border border-emerald-500/20 bg-emerald-500/[0.04] px-2 py-1.5">
                          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                            ✨ Lo que la IA ve en tu foto
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-200">
                              {job.productFeatures.tipo_envase} {job.productFeatures.forma}
                            </span>
                            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-200">
                              {job.productFeatures.material_aparente}
                            </span>
                            {job.productFeatures.color_envase && (
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-200">
                                {job.productFeatures.color_envase}
                              </span>
                            )}
                            {job.productFeatures.tapa && (
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-200">
                                tapa {job.productFeatures.tapa}
                              </span>
                            )}
                            {job.productFeatures.marca_legible && (
                              <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300">
                                {job.productFeatures.marca_legible}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

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

                    {/* Step timeline — split into 2 prep steps (compact) + 3 outputs (big) */}
                    {job.status !== "idle" && (
                      <div className="mt-3 space-y-3">
                        {/* Prep — compact thumbnails */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {(["isolate", "normalize"] as StepKey[]).map((key) => {
                            const step = job.steps[key];
                            const meta = STEP_META[key];
                            const activeClass =
                              step.status === "done" ? "bg-emerald-500/10 border-emerald-500/30" :
                              step.status === "running" ? "bg-amber-500/10 border-amber-500/40 animate-pulse" :
                              step.status === "error" ? "bg-red-500/10 border-red-500/40" :
                              step.status === "skipped" ? "bg-zinc-700/20 border-zinc-600/30 opacity-60" :
                              "bg-white/[0.02] border-white/10";
                            return (
                              <div
                                key={key}
                                className={cn("flex items-center gap-2 rounded border p-2 text-[11px]", activeClass)}
                                title={step.error ?? meta.description}
                              >
                                <span className="text-base">{meta.icon}</span>
                                {step.resultUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setLightbox({ url: step.resultUrl!, label: meta.label })}
                                    className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-black hover:ring-2 hover:ring-violet-400/60"
                                    title="Ver en grande"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={step.resultUrl} alt={meta.label} className="h-full w-full object-contain" />
                                  </button>
                                ) : (
                                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-black/40 text-gray-600">
                                    {step.status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : "—"}
                                  </div>
                                )}
                                <div className="flex flex-1 flex-col text-[10px]">
                                  <span className="truncate font-medium text-gray-200">{meta.label}</span>
                                  <span className="text-gray-400">
                                    {step.status === "done" && <><CheckCircle2 className="inline h-2.5 w-2.5 text-emerald-400" /> {step.cost > 0 && <span className="font-mono text-violet-300">${step.cost.toFixed(3)}</span>}</>}
                                    {step.status === "error" && <span className="text-red-400"><AlertCircle className="inline h-2.5 w-2.5" /> falló</span>}
                                    {step.status === "skipped" && "saltado"}
                                    {step.status === "running" && "procesando…"}
                                    {step.status === "idle" && meta.costHint}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Outputs — big thumbnails with download + zoom + re-run */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {OUTPUT_STEPS.map((key) => {
                            const step = job.steps[key];
                            const meta = STEP_META[key];
                            const activeClass =
                              step.status === "done" ? "bg-emerald-500/10 border-emerald-500/30" :
                              step.status === "running" ? "bg-amber-500/10 border-amber-500/40 animate-pulse" :
                              step.status === "error" ? "bg-red-500/10 border-red-500/40" :
                              step.status === "skipped" ? "bg-zinc-700/20 border-zinc-600/30 opacity-60" :
                              "bg-white/[0.02] border-white/10";
                            const downloadName = `${job.file.name.replace(/\.[^.]+$/, "")}-${key}.jpg`;
                            const canRerun =
                              (job.status === "done" || job.status === "error") &&
                              !isRunning &&
                              reRunningJobId !== job.id;
                            return (
                              <div
                                key={key}
                                className={cn("flex flex-col rounded-lg border p-2", activeClass)}
                                title={step.error ?? meta.description}
                              >
                                <div className="mb-1.5 flex items-center justify-between gap-1 text-[11px]">
                                  <span className="flex items-center gap-1 truncate font-semibold text-gray-100">
                                    <span className="text-base">{meta.icon}</span>
                                    {meta.label}
                                  </span>
                                  <span
                                    className={cn(
                                      "font-mono text-[10px]",
                                      step.status === "error" ? "text-red-400" : "text-violet-300",
                                    )}
                                  >
                                    {step.status === "error"
                                      ? "Falló"
                                      : step.status === "done" && step.cost > 0
                                        ? `$${step.cost.toFixed(3)}`
                                        : meta.costHint}
                                  </span>
                                </div>

                                {step.resultUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setLightbox({ url: step.resultUrl!, label: `${job.file.name} — ${meta.label}` })}
                                    className="group relative h-40 w-full overflow-hidden rounded bg-black hover:ring-2 hover:ring-violet-400/70"
                                    title="Click para ver en grande"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={step.resultUrl}
                                      alt={meta.label}
                                      className="h-full w-full object-contain"
                                    />
                                    <span className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100">
                                      <Maximize2 className="h-3 w-3" />
                                    </span>
                                    {step.warning && (
                                      <span
                                        className="absolute left-1 top-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-black shadow"
                                        title={step.warning}
                                      >
                                        ⚠ Revisar
                                      </span>
                                    )}
                                  </button>
                                ) : (
                                  <div className="flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded bg-black/40 px-2 text-gray-600">
                                    {step.status === "running" ? (
                                      <>
                                        <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
                                        <span className="text-[10px] text-amber-300">Generando…</span>
                                      </>
                                    ) : step.status === "error" ? (
                                      <>
                                        <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-400" />
                                        <span className="line-clamp-3 text-center text-[10px] leading-tight text-red-300" title={step.error}>
                                          {step.error || "Error desconocido"}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-xs">esperando…</span>
                                    )}
                                  </div>
                                )}

                                <p className="mt-1.5 line-clamp-2 text-[10px] text-gray-500">{meta.description}</p>

                                {/* Per-output controls */}
                                <div className="mt-2 flex items-center justify-end gap-1">
                                  {step.resultUrl && (
                                    <a
                                      href={step.resultUrl}
                                      download={downloadName}
                                      className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-1 text-[10px] font-medium text-emerald-300 transition hover:bg-emerald-500/25"
                                      title={`Descargar ${meta.label}`}
                                    >
                                      <Download className="h-2.5 w-2.5" />
                                      Descargar
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
                                      className="inline-flex items-center gap-1 rounded bg-violet-500/15 px-2 py-1 text-[10px] font-medium text-violet-300 transition hover:bg-violet-500/25"
                                      title="Cambiar prompt y re-generar adaptativo + vertical"
                                    >
                                      <Palette className="h-2.5 w-2.5" />
                                      Cambiar
                                    </button>
                                  )}
                                  {canRerun && (
                                    <button
                                      type="button"
                                      onClick={() => reRunOutputs(job.id, [key])}
                                      className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-[10px] font-medium text-gray-300 transition hover:bg-white/10"
                                      title="Re-ejecutar este output"
                                    >
                                      <RotateCw className="h-2.5 w-2.5" />
                                      Repetir
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleProcessAll}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-500/50"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? "Procesando..." : "Procesar todas"}
            </button>

            {/* Gap 6 — toggle validador de fondos (default ON, costo despreciable) */}
            <label
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition cursor-pointer",
                validateBg
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                  : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20",
              )}
              title="Corre un check de Claude Haiku después de generar el fondo adaptativo para detectar duplicados o producto faltante."
            >
              <input
                type="checkbox"
                checked={validateBg}
                onChange={(e) => setValidateBg(e.target.checked)}
                disabled={isRunning}
                className="h-3 w-3 accent-amber-500"
              />
              <span>Validar fondos con IA <span className="text-[10px] opacity-70">(+$0.0002/foto)</span></span>
            </label>
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

      {/* Gap 5 — modal para cambiar el prompt del fondo y re-generar */}
      {bgPromptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setBgPromptModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-white/10 bg-zinc-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Palette className="h-4 w-4 text-violet-400" />
                Cambiar fondo
              </h3>
              <button
                onClick={() => setBgPromptModal(null)}
                className="text-gray-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-2 text-xs text-gray-400">
              {bgPromptModal.job.file.name} — {PRODUCT_TYPE_LABELS[bgPromptModal.job.productType]} / {BRAND_LABELS[bgPromptModal.job.brand]}
            </p>

            <div className="mb-2 flex flex-wrap gap-1">
              {(["perfume", "cream", "sunscreen", "deodorant", "facial", "makeup"] as StaticProductType[]).map((pt) => {
                const altConfig = getAdaptiveBgConfig(pt, bgPromptModal.job.brand);
                const isCurrent = altConfig.prompt === bgPromptModal.customPrompt;
                return (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setBgPromptModal({ ...bgPromptModal, customPrompt: altConfig.prompt })}
                    className={cn(
                      "rounded border px-2 py-1 text-[10px] transition",
                      isCurrent
                        ? "border-violet-400 bg-violet-500/20 text-violet-200"
                        : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:text-white",
                    )}
                    title={altConfig.prompt.slice(0, 100) + "..."}
                  >
                    {altConfig.label}
                  </button>
                );
              })}
            </div>

            <label className="mb-1 block text-xs text-gray-400">
              Prompt del fondo (editable)
            </label>
            <textarea
              value={bgPromptModal.customPrompt}
              onChange={(e) => setBgPromptModal({ ...bgPromptModal, customPrompt: e.target.value })}
              className="mb-3 h-32 w-full rounded border border-white/10 bg-black/40 p-2 text-xs text-gray-200"
              placeholder="Describe el fondo deseado..."
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setBgPromptModal(null)}
                className="rounded border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-300 hover:border-white/20"
              >
                Cancelar
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
                className="inline-flex items-center gap-1.5 rounded bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
              >
                <RotateCw className="h-3 w-3" />
                Re-generar adaptativo + vertical
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
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex max-h-full max-w-full flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <p className="max-w-[80vw] truncate text-xs text-gray-300">{lightbox.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.label}
              className="max-h-[85vh] max-w-[90vw] rounded object-contain"
            />
            <a
              href={lightbox.url}
              download
              className="inline-flex items-center gap-1.5 rounded bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400"
            >
              <Download className="h-3 w-3" />
              Descargar imagen
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
