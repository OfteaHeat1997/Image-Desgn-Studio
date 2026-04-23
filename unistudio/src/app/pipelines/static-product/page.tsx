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
} from "lucide-react";
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

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type JobStatus = "idle" | "uploading" | "isolating" | "normalizing" | "generating-bg" | "shadowing" | "finishing" | "done" | "error";

type StepKey = "isolate" | "normalize" | "bg" | "shadow" | "finish";

interface StepSnapshot {
  /** URL después de completar este paso */
  resultUrl?: string;
  /** Costo incurrido en este paso */
  cost: number;
  /** Estado del paso específico */
  status: "idle" | "running" | "done" | "skipped" | "error";
  /** Mensaje de error si falló */
  error?: string;
  /**
   * Gap 6 — warning del validador opcional. Si set, la UI muestra un badge
   * ⚠ junto al thumbnail con el motivo. No bloquea nada; el usuario decide
   * si re-ejecuta vía los botones de Gap 5.
   */
  warning?: string;
}

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
  /** Snapshot por paso para mostrar progreso visual en vivo */
  steps: Record<StepKey, StepSnapshot>;
}

const INITIAL_STEPS: Record<StepKey, StepSnapshot> = {
  isolate: { cost: 0, status: "idle" },
  normalize: { cost: 0, status: "idle" },
  bg: { cost: 0, status: "idle" },
  shadow: { cost: 0, status: "idle" },
  finish: { cost: 0, status: "idle" },
};

const STEP_META: Record<StepKey, { label: string; icon: string; costHint: string }> = {
  isolate: { label: "Quitar fondo", icon: "✂️", costHint: "$0.01" },
  normalize: { label: "Centrar en cuadrado", icon: "📐", costHint: "Gratis" },
  bg: { label: "Fondo adaptativo", icon: "🎨", costHint: "$0.003–$0.05" },
  shadow: { label: "Sombra", icon: "🌒", costHint: "Gratis" },
  finish: { label: "Ajustes finales", icon: "✨", costHint: "Gratis" },
};

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

  // Gap 1 — Batch desde folder del inventario
  const [batchCategories, setBatchCategories] = useState<InventoryCategoryLite[] | null>(null);
  const [batchLoadingId, setBatchLoadingId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Gap 5 — Per-step approval: modal para cambiar el prompt del fondo
  const [bgPromptModal, setBgPromptModal] = useState<{ job: Job; customPrompt: string } | null>(null);
  const [reRunningJobId, setReRunningJobId] = useState<string | null>(null);

  // Gap 6 — validador post-bg con Claude Haiku (opt-in, +$0.0002/foto)
  const [validateBg, setValidateBg] = useState(false);

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
      let ambiguousCount = 0;
      const newJobs: Job[] = files.map((file, i) => {
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

      // 4. Generate adaptive background → step "bg"
      updateJob(job.id, { status: "generating-bg" });
      updateStep(job.id, "bg", { status: "running" });
      const genRes = await fetch("/api/bg-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentUrl,
          mode: config.bgMode,
          style: "custom",
          customPrompt: config.prompt,
          aspectRatio: "1:1",
          // Seed estable por (productType, brand) → todos los SKUs del mismo grupo
          // comparten fondo idéntico (mármol, playa, gris, etc.) para catálogo cohesivo.
          seed: config.seed,
        }),
      });
      const genData = await safeJson(genRes);
      if (!genData.success) {
        updateStep(job.id, "bg", { status: "error", error: genData.error || "Falló generar fondo" });
        throw new Error(genData.error || "Background generation failed");
      }
      currentUrl = genData.data.url || genData.data.imageUrl;
      const bgCost = genData.cost ?? (config.bgMode === "precise" ? 0.05 : 0.003);
      totalCost += bgCost;
      updateStep(job.id, "bg", { status: "done", resultUrl: currentUrl, cost: bgCost });

      // Gap 6 — validador opcional post-bg. No bloquea; solo flaggea.
      if (validateBg) {
        try {
          const vRes = await fetch("/api/validate-bg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: currentUrl }),
          });
          const vData = await safeJson(vRes);
          if (vData.success && vData.data) {
            const v = vData.data as { productCount: number; looksLikeDuplicate: boolean; productMissing: boolean; reason: string };
            const validateCost = (vData.cost as number) ?? 0.0002;
            totalCost += validateCost;
            if (v.productMissing) {
              updateStep(job.id, "bg", { warning: `⚠ Producto no visible: ${v.reason}` });
            } else if (v.looksLikeDuplicate || v.productCount > 1) {
              updateStep(job.id, "bg", { warning: `⚠ Duplicado detectado (count=${v.productCount}): ${v.reason}` });
            }
          }
        } catch (vErr) {
          // Validator non-blocking: log y seguir
          console.warn("[static-product] validate-bg failed:", vErr);
        }
      }

      // 5. Shadows → step "shadow"
      updateJob(job.id, { status: "shadowing" });
      updateStep(job.id, "shadow", { status: "running" });
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
        const shCost = shData.cost ?? 0;
        totalCost += shCost;
        updateStep(job.id, "shadow", { status: "done", resultUrl: currentUrl, cost: shCost });
      } else {
        console.warn("[static-product] shadow step soft-failed:", shData.error);
        updateStep(job.id, "shadow", { status: "skipped", error: shData.error });
      }

      // 6. Final color pop enhance → step "finish"
      updateJob(job.id, { status: "finishing" });
      updateStep(job.id, "finish", { status: "running" });
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
        updateStep(job.id, "finish", { status: "done", resultUrl: currentUrl, cost: 0 });
      } else {
        updateStep(job.id, "finish", { status: "skipped", error: finData.error });
      }

      updateJob(job.id, { status: "done", resultUrl: currentUrl, cost: totalCost });

      // Auto-save a galería para que la usuaria no pierda el resultado aunque no haga click en download
      const addToGallery = useGalleryStore.getState().addImage;
      addToGallery({
        id: `static-${Date.now()}-${job.id}`,
        filename: job.file.name.replace(/\.[^.]+$/, '') + '-static.jpg',
        resultUrl: currentUrl,
        originalUrl: job.previewUrl,
        date: new Date().toISOString(),
        operations: ['bg-remove', 'enhance', 'bg-generate', 'shadows', 'enhance-final'],
        project: `static-${job.productType}-${job.brand}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      updateJob(job.id, { status: "error", error: message });
      toast.error(`Error en ${job.file.name}: ${message}`);
    }
  };

  /**
   * Gap 5 — re-ejecutar el step de fondo con un prompt custom (o el de la
   * matriz si no se pasa override) + cadena completa hacia abajo (shadow + finish).
   * Usa el resultado de "normalize" como input de bg. Seed sigue siendo el
   * estable por (tipo, marca) salvo que `overrideSeed` se pase.
   */
  const reRunBgAndBelow = async (
    jobId: string,
    overridePrompt?: string,
    overrideSeed?: number,
  ) => {
    if (isRunning || reRunningJobId) return;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const inputUrl = job.steps.normalize.resultUrl || job.steps.isolate.resultUrl;
    if (!inputUrl) {
      toast.error("No hay imagen disponible desde el paso previo. Procesa el job completo primero.");
      return;
    }
    const config = getAdaptiveBgConfig(job.productType, job.brand);
    const finalPrompt = overridePrompt?.trim() || config.prompt;
    const finalSeed = overrideSeed ?? config.seed;
    setReRunningJobId(jobId);
    // Resetear los 3 steps de abajo
    updateStep(jobId, "bg", { status: "running", resultUrl: undefined, cost: 0, error: undefined });
    updateStep(jobId, "shadow", { status: "idle", resultUrl: undefined, cost: 0, error: undefined });
    updateStep(jobId, "finish", { status: "idle", resultUrl: undefined, cost: 0, error: undefined });
    updateJob(jobId, { status: "generating-bg", error: undefined });

    let currentUrl = inputUrl;
    let addedCost = 0;
    try {
      // BG
      const genRes = await fetch("/api/bg-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentUrl,
          mode: config.bgMode,
          style: "custom",
          customPrompt: finalPrompt,
          aspectRatio: "1:1",
          seed: finalSeed,
        }),
      });
      const genData = await safeJson(genRes);
      if (!genData.success) {
        updateStep(jobId, "bg", { status: "error", error: genData.error || "Falló generar fondo" });
        throw new Error(genData.error || "Background generation failed");
      }
      currentUrl = genData.data.url || genData.data.imageUrl;
      const bgCost = genData.cost ?? (config.bgMode === "precise" ? 0.05 : 0.003);
      addedCost += bgCost;
      updateStep(jobId, "bg", { status: "done", resultUrl: currentUrl, cost: bgCost, warning: undefined });

      // Gap 6 — validador también se corre en re-runs
      if (validateBg) {
        try {
          const vRes = await fetch("/api/validate-bg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: currentUrl }),
          });
          const vData = await safeJson(vRes);
          if (vData.success && vData.data) {
            const v = vData.data as { productCount: number; looksLikeDuplicate: boolean; productMissing: boolean; reason: string };
            addedCost += ((vData.cost as number) ?? 0.0002);
            if (v.productMissing) {
              updateStep(jobId, "bg", { warning: `⚠ Producto no visible: ${v.reason}` });
            } else if (v.looksLikeDuplicate || v.productCount > 1) {
              updateStep(jobId, "bg", { warning: `⚠ Duplicado detectado: ${v.reason}` });
            }
          }
        } catch (vErr) {
          console.warn("[static-product] validate-bg re-run failed:", vErr);
        }
      }

      // Shadow
      updateJob(jobId, { status: "shadowing" });
      updateStep(jobId, "shadow", { status: "running" });
      const shRes = await fetch("/api/shadows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: currentUrl, type: config.shadowType }),
      });
      const shData = await safeJson(shRes);
      if (shData.success) {
        currentUrl = shData.data.url || shData.data.imageUrl || currentUrl;
        const shCost = shData.cost ?? 0;
        addedCost += shCost;
        updateStep(jobId, "shadow", { status: "done", resultUrl: currentUrl, cost: shCost });
      } else {
        updateStep(jobId, "shadow", { status: "skipped", error: shData.error });
      }

      // Finish
      updateJob(jobId, { status: "finishing" });
      updateStep(jobId, "finish", { status: "running" });
      const finRes = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: currentUrl, preset: "product-clean" }),
      });
      const finData = await safeJson(finRes);
      if (finData.success) {
        currentUrl = finData.data.url || finData.data.imageUrl || currentUrl;
        updateStep(jobId, "finish", { status: "done", resultUrl: currentUrl, cost: 0 });
      } else {
        updateStep(jobId, "finish", { status: "skipped", error: finData.error });
      }

      updateJob(jobId, {
        status: "done",
        resultUrl: currentUrl,
        cost: job.cost + addedCost,
      });
      toast.success(`Fondo re-generado para ${job.file.name}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateJob(jobId, { status: "error", error: message });
      toast.error(`Error re-ejecutando ${job.file.name}: ${message}`);
    } finally {
      setReRunningJobId(null);
    }
  };

  /**
   * Gap 5 — re-ejecutar solo el step de sombra + finish. Útil cuando el fondo
   * está bien pero la sombra quedó muy dura o muy suave.
   */
  const reRunShadowAndBelow = async (jobId: string) => {
    if (isRunning || reRunningJobId) return;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const inputUrl = job.steps.bg.resultUrl;
    if (!inputUrl) {
      toast.error("No hay resultado del fondo todavía.");
      return;
    }
    const config = getAdaptiveBgConfig(job.productType, job.brand);
    setReRunningJobId(jobId);
    updateStep(jobId, "shadow", { status: "running", resultUrl: undefined, cost: 0, error: undefined });
    updateStep(jobId, "finish", { status: "idle", resultUrl: undefined, cost: 0, error: undefined });
    updateJob(jobId, { status: "shadowing", error: undefined });

    let currentUrl = inputUrl;
    try {
      const shRes = await fetch("/api/shadows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: currentUrl, type: config.shadowType }),
      });
      const shData = await safeJson(shRes);
      if (shData.success) {
        currentUrl = shData.data.url || shData.data.imageUrl || currentUrl;
        updateStep(jobId, "shadow", { status: "done", resultUrl: currentUrl, cost: 0 });
      } else {
        updateStep(jobId, "shadow", { status: "skipped", error: shData.error });
      }
      updateJob(jobId, { status: "finishing" });
      updateStep(jobId, "finish", { status: "running" });
      const finRes = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: currentUrl, preset: "product-clean" }),
      });
      const finData = await safeJson(finRes);
      if (finData.success) {
        currentUrl = finData.data.url || finData.data.imageUrl || currentUrl;
        updateStep(jobId, "finish", { status: "done", resultUrl: currentUrl, cost: 0 });
      } else {
        updateStep(jobId, "finish", { status: "skipped", error: finData.error });
      }
      updateJob(jobId, { status: "done", resultUrl: currentUrl });
      toast.success(`Sombra re-generada para ${job.file.name}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateJob(jobId, { status: "error", error: message });
      toast.error(`Error: ${message}`);
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

                    {/* Step timeline — live preview de cada paso con thumbnails + costo */}
                    {job.status !== "idle" && (
                      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                        {(Object.keys(STEP_META) as StepKey[]).map((key) => {
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
                              className={cn("flex flex-col rounded border p-2 text-[10px]", activeClass)}
                              title={step.error ?? meta.label}
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{meta.icon}</span>
                                <span className="truncate font-medium text-gray-200">{meta.label}</span>
                              </div>
                              {step.resultUrl ? (
                                <div className="relative">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={step.resultUrl}
                                    alt={meta.label}
                                    className="mt-1 h-14 w-full rounded bg-black object-contain"
                                  />
                                  {step.warning && (
                                    <span
                                      className="absolute right-0.5 top-1.5 rounded bg-amber-500/90 px-1 py-0.5 text-[9px] font-semibold text-black shadow"
                                      title={step.warning}
                                    >
                                      ⚠
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-1 flex h-14 items-center justify-center rounded bg-black/40 text-gray-600">
                                  {step.status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : "—"}
                                </div>
                              )}
                              <div className="mt-1 flex items-center justify-between gap-1 text-gray-400">
                                <span>
                                  {step.status === "done" && <CheckCircle2 className="inline h-2.5 w-2.5 text-emerald-400" />}
                                  {step.status === "error" && <AlertCircle className="inline h-2.5 w-2.5 text-red-400" />}
                                  {step.status === "skipped" && "saltado"}
                                  {step.status === "running" && "..."}
                                  {step.status === "idle" && meta.costHint}
                                </span>
                                {step.status === "done" && step.cost > 0 && (
                                  <span className="font-mono text-[9px] text-violet-300">${step.cost.toFixed(3)}</span>
                                )}
                              </div>

                              {/* Gap 5 — per-step approval: botones Re-ejecutar / Cambiar fondo
                                  visibles solo cuando el job está done o error y ningún re-run en curso */}
                              {(job.status === "done" || job.status === "error") &&
                                !isRunning &&
                                reRunningJobId !== job.id && (
                                  <div className="mt-1 flex items-center justify-end gap-1">
                                    {key === "bg" && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setBgPromptModal({ job, customPrompt: getAdaptiveBgConfig(job.productType, job.brand).prompt });
                                        }}
                                        className="flex items-center gap-0.5 rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-medium text-violet-300 transition hover:bg-violet-500/25"
                                        title="Cambiar prompt del fondo y re-generar"
                                      >
                                        <Palette className="h-2.5 w-2.5" />
                                        Cambiar
                                      </button>
                                    )}
                                    {(key === "bg" || key === "shadow") && step.resultUrl && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (key === "bg") reRunBgAndBelow(job.id);
                                          else reRunShadowAndBelow(job.id);
                                        }}
                                        className="flex items-center gap-0.5 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-gray-300 transition hover:bg-white/10"
                                        title={`Re-ejecutar ${meta.label.toLowerCase()} con los mismos parámetros`}
                                      >
                                        <RotateCw className="h-2.5 w-2.5" />
                                        Re-ejecutar
                                      </button>
                                    )}
                                  </div>
                                )}

                              {/* Indicador de re-run en curso */}
                              {reRunningJobId === job.id && step.status === "running" && (
                                <div className="mt-1 flex items-center justify-end text-[9px] text-amber-300">
                                  <Loader2 className="mr-0.5 h-2.5 w-2.5 animate-spin" />
                                  re-ejecutando
                                </div>
                              )}
                            </div>
                          );
                        })}
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

            {/* Gap 6 — toggle validador de fondos */}
            <label
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition cursor-pointer",
                validateBg
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                  : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20",
              )}
              title="Corre un check de Claude Haiku después de generar el fondo para detectar duplicados, producto faltante, etc."
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
                  reRunBgAndBelow(modalJob.id, prompt);
                }}
                disabled={!bgPromptModal.customPrompt.trim()}
                className="inline-flex items-center gap-1.5 rounded bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
              >
                <RotateCw className="h-3 w-3" />
                Re-generar fondo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
