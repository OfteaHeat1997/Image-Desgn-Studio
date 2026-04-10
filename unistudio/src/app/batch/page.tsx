"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Zap,
  Sparkles,
  FolderOpen,
  Bot,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dropzone } from "@/components/ui/dropzone";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { useGalleryStore } from "@/stores/gallery-store";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Safe JSON helper — handles "Request Entity Too Large" text errors   */
/* ------------------------------------------------------------------ */

async function safeJson(res: Response): Promise<{ success: boolean; data?: any; error?: string; cost?: number }> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Server returned non-JSON (e.g. "Request Entity Too Large")
    throw new Error(text.length > 100 ? text.slice(0, 100) + "..." : text || `HTTP ${res.status}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Inventory types                                                     */
/* ------------------------------------------------------------------ */

interface InventoryCategory {
  id: string;
  name: string;
  agentPreset: string;
  imageCount: number;
  folders: string[];
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface PipelineStep {
  id: string;
  operation: string;
  provider: string;
  label: string;
  params?: Record<string, unknown>;
}

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  originalUrl?: string;
  resultUrl?: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const OPERATIONS = [
  { value: "bg-remove", label: "Quitar Fondo" },
  { value: "enhance", label: "Mejorar Calidad" },
  { value: "shadows", label: "Agregar Sombras" },
  { value: "upscale", label: "Upscale 2x" },
  { value: "resize", label: "Redimensionar" },
  { value: "outpaint", label: "Extender Imagen" },
  { value: "compliance", label: "Verificar Cumplimiento" },
  { value: "watermark", label: "Marca de Agua" },
];

const PROVIDERS = [
  { value: "auto", label: "Auto (Recomendado)" },
  { value: "replicate", label: "Replicate" },
  { value: "fal", label: "Fal.ai" },
  { value: "browser", label: "Navegador (Gratis)" },
];

interface PresetDef {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
}

const PIPELINE_PRESETS: PresetDef[] = [
  {
    id: "ecommerce-pro",
    name: "E-Commerce Profesional",
    description: "Fondo blanco puro + mejora + sombra + cuadrado 1:1 — listo para web",
    steps: [
      { id: "s1", operation: "bg-remove", provider: "replicate", label: "Quitar Fondo" },
      { id: "s2", operation: "enhance", provider: "auto", label: "Mejorar Calidad", params: { preset: "ecommerce" } },
      { id: "s3", operation: "shadows", provider: "auto", label: "Sombra Suave", params: { type: "drop", offsetX: 0, offsetY: 8, blur: 25, opacity: 0.2, color: "#000000", spread: 0 } },
      { id: "s4", operation: "outpaint", provider: "auto", label: "Fondo Blanco 1:1", params: { targetAspectRatio: "1:1", prompt: "pure white background, professional product photography, centered product" } },
    ],
  },
  {
    id: "quick-clean",
    name: "Limpieza Rapida",
    description: "Eliminar fondo + mejora automatica",
    steps: [
      { id: "s1", operation: "bg-remove", provider: "auto", label: "Eliminar Fondo" },
      { id: "s2", operation: "enhance", provider: "auto", label: "Mejora" },
    ],
  },
  {
    id: "amazon-ready",
    name: "Listo para Amazon",
    description: "Fondo blanco + mejora + verificacion",
    steps: [
      { id: "s1", operation: "bg-remove", provider: "auto", label: "Eliminar Fondo" },
      { id: "s2", operation: "enhance", provider: "auto", label: "Mejora" },
      { id: "s3", operation: "compliance", provider: "auto", label: "Verificacion" },
    ],
  },
  {
    id: "instagram-lifestyle",
    name: "Instagram Lifestyle",
    description: "Fondo IA + mejora + redimensionar para IG",
    steps: [
      { id: "s1", operation: "bg-remove", provider: "auto", label: "Eliminar Fondo" },
      { id: "s2", operation: "outpaint", provider: "auto", label: "Extender Imagen" },
      { id: "s3", operation: "enhance", provider: "auto", label: "Mejora" },
      { id: "s4", operation: "resize", provider: "auto", label: "Redimensionar" },
    ],
  },
  {
    id: "full-production",
    name: "Produccion Completa",
    description: "Pipeline completo: Fondo + mejora + sombras + upscale + marca",
    steps: [
      { id: "s1", operation: "bg-remove", provider: "auto", label: "Eliminar Fondo" },
      { id: "s2", operation: "enhance", provider: "auto", label: "Mejora" },
      { id: "s3", operation: "shadows", provider: "auto", label: "Sombras" },
      { id: "s4", operation: "upscale", provider: "auto", label: "Upscale 2x" },
      { id: "s5", operation: "watermark", provider: "auto", label: "Marca de Agua" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  AI Agent Presets — Inventory-specific pipelines                     */
/* ------------------------------------------------------------------ */

const AGENT_PRESETS: PresetDef[] = [
  {
    id: "agent-perfumes",
    name: "Colonias / Perfumes",
    description: "Limpiar fondo, mejorar, reflejo elegante, 1:1 cuadrado",
    steps: [
      { id: "a1", operation: "bg-remove", provider: "replicate", label: "Quitar Fondo" },
      { id: "a2", operation: "enhance", provider: "auto", label: "Mejorar Calidad", params: { preset: "product-clean" } },
      { id: "a3", operation: "shadows", provider: "auto", label: "Reflejo Elegante", params: { type: "reflection", blur: 15, opacity: 0.4, distance: 5, fade: 0.8 } },
      { id: "a4", operation: "outpaint", provider: "auto", label: "Fondo Blanco 1:1", params: { targetAspectRatio: "1:1", prompt: "pure white background, professional perfume product photography, centered" } },
    ],
  },
  {
    id: "agent-cremas",
    name: "Cremas / Skincare",
    description: "Upscale (son muy pequenas), limpiar fondo, mejorar, sombra contacto",
    steps: [
      { id: "a1", operation: "bg-remove", provider: "replicate", label: "Quitar Fondo" },
      { id: "a2", operation: "upscale", provider: "auto", label: "Upscale 2x (baja resolucion)", params: { scale: 2, provider: "real-esrgan" } },
      { id: "a3", operation: "enhance", provider: "auto", label: "Mejorar Calidad", params: { preset: "product-clean" } },
      { id: "a4", operation: "shadows", provider: "auto", label: "Sombra de Contacto", params: { type: "contact", blur: 20, opacity: 0.35, distance: 8, color: "#000000" } },
      { id: "a5", operation: "outpaint", provider: "auto", label: "Fondo Blanco 1:1", params: { targetAspectRatio: "1:1", prompt: "pure white background, professional skincare product photography, centered" } },
    ],
  },
  {
    id: "agent-accesorios",
    name: "Accesorios / Joyas",
    description: "Quitar fondo oscuro y texto, mejorar, sombra suave, 1:1",
    steps: [
      { id: "a1", operation: "bg-remove", provider: "replicate", label: "Quitar Fondo + Texto" },
      { id: "a2", operation: "enhance", provider: "auto", label: "Mejorar Calidad", params: { preset: "product-clean" } },
      { id: "a3", operation: "shadows", provider: "auto", label: "Sombra Suave", params: { type: "drop", offsetX: 3, offsetY: 6, blur: 15, opacity: 0.25, color: "#000000", spread: 0 } },
      { id: "a4", operation: "outpaint", provider: "auto", label: "Fondo Blanco 1:1", params: { targetAspectRatio: "1:1", prompt: "pure white background, professional jewelry photography, product centered, clean" } },
    ],
  },
  {
    id: "agent-lenceria",
    name: "Lenceria (Producto Solo)",
    description: "Quitar fondo del producto, mejorar, sombra, 1:1 blanco",
    steps: [
      { id: "a1", operation: "bg-remove", provider: "replicate", label: "Quitar Fondo" },
      { id: "a2", operation: "enhance", provider: "auto", label: "Mejorar Calidad", params: { preset: "product-clean" } },
      { id: "a3", operation: "shadows", provider: "auto", label: "Sombra de Contacto", params: { type: "contact", blur: 20, opacity: 0.3, distance: 10, color: "#000000" } },
      { id: "a4", operation: "outpaint", provider: "auto", label: "Fondo Blanco 1:1", params: { targetAspectRatio: "1:1", prompt: "pure white background, professional lingerie product photography, centered, e-commerce" } },
    ],
  },
  {
    id: "agent-pantys",
    name: "Panties / Ropa Interior",
    description: "Ya tienen fondo blanco — solo mejorar, sombra, estandarizar 1:1",
    steps: [
      { id: "a1", operation: "enhance", provider: "auto", label: "Mejorar Calidad", params: { preset: "product-clean" } },
      { id: "a2", operation: "shadows", provider: "auto", label: "Sombra de Contacto", params: { type: "contact", blur: 18, opacity: 0.3, distance: 8, color: "#000000" } },
      { id: "a3", operation: "outpaint", provider: "auto", label: "Estandarizar 1:1", params: { targetAspectRatio: "1:1", prompt: "pure white background, centered product, professional e-commerce photography" } },
    ],
  },
  {
    id: "agent-desodorantes",
    name: "Desodorantes / Bloqueador",
    description: "Ya estan limpios — mejorar y estandarizar formato",
    steps: [
      { id: "a1", operation: "enhance", provider: "auto", label: "Mejorar Calidad", params: { preset: "product-clean" } },
      { id: "a2", operation: "shadows", provider: "auto", label: "Sombra Suave", params: { type: "drop", offsetX: 3, offsetY: 6, blur: 12, opacity: 0.2, color: "#000000", spread: 0 } },
      { id: "a3", operation: "outpaint", provider: "auto", label: "Estandarizar 1:1", params: { targetAspectRatio: "1:1", prompt: "pure white background, professional product photography, centered" } },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Status Icon                                                         */
/* ------------------------------------------------------------------ */

function StatusIcon({ status }: { status: UploadedImage["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-400" />;
    case "processing":
      return <Loader2 className="h-4 w-4 animate-spin text-accent-light" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function BatchPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const addToGallery = useGalleryStore((s) => s.addImage);

  // Track all preview blob URLs so we can revoke them on clear and unmount
  const previewUrlsRef = useRef<string[]>([]);
  // Track result blob URLs (e.g. from watermark step) for the same reason
  const resultUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      previewUrlsRef.current = [];
      resultUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      resultUrlsRef.current = [];
    };
  }, []);

  /* ---- Auto Mode state ---- */
  const [inventory, setInventory] = useState<InventoryCategory[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [scanningInventory, setScanningInventory] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const [autoProcessing, setAutoProcessing] = useState<string | null>(null);
  const [autoBatchIndex, setAutoBatchIndex] = useState(0);
  const [autoBatchTotal, setAutoBatchTotal] = useState(0);

  /* ---- Scan inventory on mount ---- */
  useEffect(() => {
    setScanningInventory(true);
    fetch("/api/inventory/scan")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setInventory(data.data.categories);
          setInventoryTotal(data.data.totalImages);
        }
      })
      .catch(() => {})
      .finally(() => setScanningInventory(false));
  }, []);

  /* ---- Image upload ---- */

  const handleDrop = useCallback((files: File[]) => {
    const newImages: UploadedImage[] = files.map((f, i) => {
      const preview = URL.createObjectURL(f);
      previewUrlsRef.current.push(preview);
      return {
        id: `img-${Date.now()}-${i}`,
        file: f,
        preview,
        status: "pending" as const,
      };
    });
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  /* ---- Pipeline step management ---- */

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        operation: "bg-remove",
        provider: "auto",
        label: "Background Removal",
      },
    ]);
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  }, []);

  const updateStepOp = useCallback((stepId: string, operation: string) => {
    const match = OPERATIONS.find((o) => o.value === operation);
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, operation, label: match?.label ?? operation }
          : s,
      ),
    );
  }, []);

  const updateStepProvider = useCallback((stepId: string, provider: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, provider } : s)),
    );
  }, []);

  const moveStep = useCallback((index: number, direction: "up" | "down") => {
    setSteps((prev) => {
      const arr = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }, []);

  const loadPreset = useCallback((presetId: string) => {
    const preset = PIPELINE_PRESETS.find((p) => p.id === presetId)
      ?? AGENT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSteps(preset.steps.map((s) => ({ ...s, id: `step-${Date.now()}-${Math.random()}` })));
      setActivePresetId(presetId);
      toast.success(`Pipeline "${preset.name}" cargado — ${preset.steps.length} pasos`);
      // Auto-scroll to pipeline steps section
      setTimeout(() => {
        document.getElementById("pipeline-steps")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, []);

  /* ---- Download all results as ZIP ---- */

  const handleDownloadAll = useCallback(async () => {
    const doneImages = images.filter((img) => img.status === "done" && img.resultUrl);
    if (doneImages.length === 0) return;

    // If only one image, just download it directly
    if (doneImages.length === 1) {
      const a = document.createElement("a");
      a.href = doneImages[0].resultUrl!;
      a.download = `processed-${doneImages[0].file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // For multiple images, download each and offer individually
    // (ZIP would require a library like JSZip - keep it simple for now)
    for (const img of doneImages) {
      const a = document.createElement("a");
      a.href = img.resultUrl!;
      a.download = `processed-${img.file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Small delay between downloads
      await new Promise((r) => setTimeout(r, 300));
    }
  }, [images]);

  /* ---- Run batch (real API calls) ---- */

  const processOneImage = useCallback(async (img: UploadedImage, pipelineSteps: PipelineStep[]): Promise<{ resultUrl: string }> => {
    // Step 1: Upload image
    const formData = new FormData();
    formData.append("file", img.file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    const uploadData = await safeJson(uploadRes);
    if (!uploadData.success) throw new Error(uploadData.error || "Upload failed");

    let currentImageUrl = uploadData.data.url;

    // Step 2: Run each pipeline step sequentially
    for (const step of pipelineSteps) {
      switch (step.operation) {
        case "bg-remove": {
          // Batch always uses server-side replicate (browser provider needs client-side canvas)
          const bgProvider = step.provider === "browser" || step.provider === "auto" ? "replicate" : step.provider;
          const res = await fetch("/api/bg-remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: currentImageUrl, provider: bgProvider }),
          });
          const data = await safeJson(res);
          if (!data.success) throw new Error(data.error || "BG removal failed");
          currentImageUrl = data.data.url || data.data.imageUrl;
          break;
        }
        case "enhance": {
          const presetName = (step.params?.preset as string) ?? "product-clean";
          const res = await fetch("/api/enhance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: currentImageUrl, preset: presetName, ...step.params }),
          });
          const data = await safeJson(res);
          if (!data.success) throw new Error(data.error || "Enhancement failed");
          currentImageUrl = data.data.url;
          break;
        }
        case "shadows": {
          const shadowParams = step.params ?? {};
          const shadowBody = {
            imageUrl: currentImageUrl,
            type: (shadowParams.type as string) || "drop",
            offsetX: (shadowParams.offsetX as number) ?? 5,
            offsetY: (shadowParams.offsetY as number) ?? 10,
            blur: (shadowParams.blur as number) ?? 20,
            opacity: (shadowParams.opacity as number) ?? 0.3,
            color: (shadowParams.color as string) || "#000000",
            spread: (shadowParams.spread as number) ?? 0,
            distance: (shadowParams.distance as number) ?? undefined,
            fade: (shadowParams.fade as number) ?? undefined,
          };
          const res = await fetch("/api/shadows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(shadowBody),
          });
          const data = await safeJson(res);
          if (!data.success) throw new Error(data.error || "Shadow generation failed");
          currentImageUrl = data.data.url;
          break;
        }
        case "upscale": {
          const res = await fetch("/api/upscale", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: currentImageUrl,
              scale: (step.params?.scale as number) ?? 2,
              provider: (step.params?.provider as string) ?? "real-esrgan",
              faceEnhance: (step.params?.faceEnhance as boolean) ?? false,
            }),
          });
          const data = await safeJson(res);
          if (!data.success) throw new Error(data.error || "Upscale failed");
          currentImageUrl = data.data.url;
          break;
        }
        case "outpaint": {
          const res = await fetch("/api/outpaint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: currentImageUrl,
              targetAspectRatio: (step.params?.targetAspectRatio as string) ?? "1:1",
              platform: step.params?.platform as string | undefined,
              prompt: (step.params?.prompt as string) ?? "pure white background, professional product photography, centered",
            }),
          });
          const data = await safeJson(res);
          if (!data.success) throw new Error(data.error || "Outpaint failed");
          currentImageUrl = data.data.url;
          break;
        }
        case "resize": {
          const res = await fetch("/api/outpaint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: currentImageUrl,
              targetAspectRatio: (step.params?.targetAspectRatio as string) ?? "1:1",
              prompt: (step.params?.prompt as string) ?? "Extend the background naturally to fit the new aspect ratio.",
            }),
          });
          const data = await safeJson(res);
          if (!data.success) throw new Error(data.error || "Resize failed");
          currentImageUrl = data.data.url;
          break;
        }
        case "compliance": {
          // Pass-through: compliance is a visual check, no transformation needed
          console.log("[Batch] Compliance check skipped (visual-only step)");
          break;
        }
        case "watermark": {
          // Draw a real text watermark using OffscreenCanvas
          const wmText = (step.params?.text as string) || "UNISTYLES";
          const wmOpacity = (step.params?.opacity as number) ?? 0.15;
          const wmRes = await fetch(currentImageUrl);
          const wmBlob = await wmRes.blob();
          const wmBitmap = await createImageBitmap(wmBlob);
          const wmCanvas = new OffscreenCanvas(wmBitmap.width, wmBitmap.height);
          const wmCtx = wmCanvas.getContext("2d")!;
          wmCtx.drawImage(wmBitmap, 0, 0);
          // Tiled diagonal watermark
          const fontSize = Math.max(24, Math.round(wmBitmap.width / 20));
          wmCtx.font = `bold ${fontSize}px sans-serif`;
          wmCtx.fillStyle = `rgba(255,255,255,${wmOpacity})`;
          wmCtx.textAlign = "center";
          wmCtx.textBaseline = "middle";
          wmCtx.save();
          wmCtx.translate(wmBitmap.width / 2, wmBitmap.height / 2);
          wmCtx.rotate(-Math.PI / 6);
          const gap = fontSize * 4;
          for (let y = -wmBitmap.height; y < wmBitmap.height * 2; y += gap) {
            for (let x = -wmBitmap.width; x < wmBitmap.width * 2; x += gap) {
              wmCtx.fillText(wmText, x, y);
            }
          }
          wmCtx.restore();
          const wmOutBlob = await wmCanvas.convertToBlob({ type: "image/png" });
          // Revoke previous intermediate blob URL (if any) before replacing
          if (currentImageUrl.startsWith("blob:")) URL.revokeObjectURL(currentImageUrl);
          currentImageUrl = URL.createObjectURL(wmOutBlob);
          break;
        }
        default:
          console.warn(`[Batch] Unknown operation: ${step.operation}`);
          break;
      }
    }

    return { resultUrl: currentImageUrl };
  }, []);

  /* ---- Auto Mode: Load category + pipeline + process ---- */
  const startAutoMode = useCallback(async (cat: InventoryCategory) => {
    if (isRunning || autoProcessing) return;

    setLoadingCategory(cat.id);
    setAutoProcessing(cat.id);
    // Revoke any existing preview and result blob URLs before clearing the image list
    previewUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    previewUrlsRef.current = [];
    resultUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    resultUrlsRef.current = [];
    setImages([]);
    setAutoBatchIndex(0);
    setAutoBatchTotal(cat.imageCount);
    setOverallProgress(0);

    // 1. Load the right pipeline preset
    const preset = AGENT_PRESETS.find((p) => p.id === cat.agentPreset);
    if (!preset) {
      setAutoProcessing(null);
      setLoadingCategory(null);
      return;
    }
    const pipelineSteps = preset.steps.map((s) => ({ ...s, id: `step-${Date.now()}-${Math.random()}` }));
    setSteps(pipelineSteps);

    // 2. Process images in batches of 10 from each folder
    const allResults: UploadedImage[] = [];
    let globalIndex = 0;

    for (const folder of cat.folders) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        // Load batch of images from disk
        const loadRes = await fetch("/api/inventory/load", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder, offset, limit: 10 }),
        });
        const loadData = await loadRes.json();
        if (!loadData.success) break;

        const { images: loadedImages, hasMore: more } = loadData.data;
        hasMore = more;
        offset += loadedImages.length;
        if (loadedImages.length === 0) break;

        // Convert data URLs to File objects
        const batchImages: UploadedImage[] = [];
        for (const img of loadedImages as { filename: string; dataUrl: string; size: number }[]) {
          const res = await fetch(img.dataUrl);
          const blob = await res.blob();
          const file = new File([blob], img.filename, { type: blob.type });
          const preview = URL.createObjectURL(blob);
          previewUrlsRef.current.push(preview);
          batchImages.push({
            id: `auto-${Date.now()}-${globalIndex}`,
            file,
            preview,
            status: "pending",
          });
          globalIndex++;
        }

        setImages((prev) => [...prev, ...batchImages]);

        // Process each image through the pipeline
        for (const img of batchImages) {
          setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: "processing" } : i));
          setAutoBatchIndex((prev) => prev + 1);
          setOverallProgress(Math.round(((allResults.length + 1) / cat.imageCount) * 100));

          try {
            const result = await processOneImage(img, pipelineSteps);
            const done: UploadedImage = { ...img, status: "done", resultUrl: result.resultUrl, originalUrl: img.preview };
            setImages((prev) => prev.map((i) => i.id === img.id ? done : i));
            allResults.push(done);

            addToGallery({
              id: `auto-${Date.now()}-${allResults.length}`,
              filename: img.file.name,
              resultUrl: result.resultUrl,
              originalUrl: img.preview,
              date: new Date().toISOString().split("T")[0],
              operations: pipelineSteps.map((s) => s.operation),
              project: `batch-${cat.id}`,
            });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Processing failed";
            setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: "error", error: errMsg } : i));
            allResults.push({ ...img, status: "error", error: errMsg });
          }
        }
      }
    }

    setOverallProgress(100);
    setAutoProcessing(null);
    setLoadingCategory(null);
  }, [isRunning, autoProcessing, processOneImage, addToGallery]);

  const startBatch = useCallback(async () => {
    if (images.length === 0 || steps.length === 0) return;
    setIsRunning(true);
    setOverallProgress(0);

    // Mark all as pending
    setImages((prev) => prev.map((img) => ({ ...img, status: "pending" as const, resultUrl: undefined, error: undefined })));

    let processed = 0;
    const total = images.length;

    for (let i = 0; i < total; i++) {
      // Mark current as processing
      setImages((prev) => prev.map((img, idx) => idx === i ? { ...img, status: "processing" as const } : img));

      try {
        const result = await processOneImage(images[i], steps);
        // Track blob result URLs (e.g. from watermark step) for cleanup
        if (result.resultUrl.startsWith("blob:")) resultUrlsRef.current.push(result.resultUrl);
        setImages((prev) => prev.map((img, idx) =>
          idx === i ? { ...img, status: "done" as const, resultUrl: result.resultUrl, originalUrl: images[i].preview } : img,
        ));

        // Save to gallery
        addToGallery({
          id: `batch-${Date.now()}-${i}`,
          filename: images[i].file.name,
          resultUrl: result.resultUrl,
          originalUrl: images[i].preview,
          date: new Date().toISOString().split("T")[0],
          operations: steps.map((s) => s.operation),
          project: "batch",
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Processing failed";
        setImages((prev) => prev.map((img, idx) =>
          idx === i ? { ...img, status: "error" as const, error: errMsg } : img,
        ));
      }

      processed++;
      setOverallProgress(Math.round((processed / total) * 100));
    }

    setIsRunning(false);
  }, [images, steps, processOneImage, addToGallery]);

  /* ---- Render ---- */

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Procesamiento por Lotes</h1>
          <p className="mt-1 text-sm text-gray-400">
            Sube imagenes, construye un pipeline y procesalas todas de una vez.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Play className="h-4 w-4" />}
          disabled={isRunning || images.length === 0 || steps.length === 0}
          loading={isRunning}
          onClick={startBatch}
        >
          Iniciar Lote
        </Button>
      </div>

      {/* ============================================================== */}
      {/*  AUTO MODE — AI Agent processes entire inventory folders        */}
      {/* ============================================================== */}
      <div className="mb-8 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface to-surface p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
            <Bot className="h-5 w-5 text-accent-light" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">AI Agent — Modo Automatico</h2>
            <p className="text-xs text-gray-400">
              Selecciona una categoria y el agente carga las imagenes, elige el pipeline, y procesa todo automaticamente.
            </p>
          </div>
          {inventoryTotal > 0 && (
            <Badge variant="default" size="sm" className="ml-auto">
              {inventoryTotal} imagenes totales
            </Badge>
          )}
        </div>

        {scanningInventory ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-accent-light" />
            <span className="text-sm text-gray-400">Escaneando inventario...</span>
          </div>
        ) : inventory.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">
            No se encontraron carpetas de inventario. Verifica que las imagenes estan en el escritorio.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {inventory.map((cat) => {
              const isProcessing = autoProcessing === cat.id;
              const isLoading = loadingCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  disabled={!!autoProcessing || isRunning || cat.imageCount === 0}
                  onClick={() => startAutoMode(cat)}
                  className={cn(
                    "group relative flex flex-col rounded-xl border p-4 text-left transition-all",
                    isProcessing
                      ? "border-accent bg-accent/15"
                      : cat.imageCount === 0
                        ? "border-surface-lighter bg-surface opacity-50"
                        : "border-surface-lighter bg-surface hover:border-accent/50 hover:bg-accent/5",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent-light" />
                    ) : (
                      <FolderOpen className="h-4 w-4 text-accent-light" />
                    )}
                    <span className="text-sm font-semibold text-gray-200">{cat.name}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <ImageIcon className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-400">{cat.imageCount} imagenes</span>
                  </div>

                  {isProcessing && (
                    <div className="mt-3">
                      <Progress value={overallProgress} size="sm" />
                      <p className="mt-1 text-[10px] text-accent-light">
                        {autoBatchIndex} / {autoBatchTotal} procesadas...
                      </p>
                    </div>
                  )}

                  {!isProcessing && cat.imageCount > 0 && (
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-gray-500 group-hover:text-accent-light transition-colors">
                      <Play className="h-3 w-3" />
                      <span>Click para procesar todo</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Auto mode progress overlay */}
        {autoProcessing && (
          <div className="mt-4 rounded-lg border border-accent/20 bg-surface-light p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent-light" />
                <span className="text-sm font-medium text-gray-200">
                  Procesando {inventory.find((c) => c.id === autoProcessing)?.name}...
                </span>
              </div>
              <span className="text-sm tabular-nums text-accent-light">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} size="sm" className="mt-2" />
            <p className="mt-1 text-[10px] text-gray-500">
              {autoBatchIndex} de {autoBatchTotal} imagenes — los resultados aparecen abajo
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ---------- Left: Upload + Results ---------- */}
        <div className="space-y-6">
          {/* Upload area */}
          <div className="rounded-xl border border-surface-lighter bg-surface-light p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-200">Subir Imagenes</h2>
            <Dropzone
              onDrop={handleDrop}
              multiple
              label="Arrastra y suelta imagenes de producto aqui"
              hint="PNG, JPG, WebP — hasta 100 imagenes"
              className="min-h-[120px]"
            />

            {/* Thumbnails grid */}
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-6 gap-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-surface-lighter"
                  >
                    <img
                      src={img.preview}
                      alt={img.file.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1">
                      <StatusIcon status={img.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {images.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                {images.length} imagen{images.length !== 1 ? "es" : ""} subida{images.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Progress */}
          {isRunning && (
            <div className="rounded-xl border border-surface-lighter bg-surface-light p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-200">Progreso</h2>
              <Progress value={overallProgress} label="Overall Progress" />
            </div>
          )}

          {/* Errors */}
          {!isRunning && images.some((img) => img.status === "error") && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
              <h2 className="mb-3 text-sm font-semibold text-red-400">Errores</h2>
              <div className="space-y-1.5">
                {images
                  .filter((img) => img.status === "error")
                  .map((img) => (
                    <div key={img.id} className="flex items-center gap-2 text-xs text-gray-400">
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                      <span className="font-medium text-gray-300">{img.file.name}:</span>
                      <span>{img.error}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Results */}
          {!isRunning && images.some((img) => img.status === "done") && (
            <div className="rounded-xl border border-surface-lighter bg-surface-light p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-200">Resultados</h2>
                <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleDownloadAll}>
                  Descargar Todo
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {images
                  .filter((img) => img.status === "done")
                  .map((img) => (
                    <div
                      key={img.id}
                      className="group overflow-hidden rounded-lg border border-surface-lighter bg-surface"
                    >
                      {/* Before / After side by side */}
                      <div className="grid grid-cols-2 gap-0.5 bg-surface-lighter">
                        <div className="relative aspect-square">
                          <img
                            src={img.preview}
                            alt="Original"
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-gray-300 uppercase">Antes</span>
                        </div>
                        <div className="relative aspect-square">
                          <img
                            src={img.resultUrl || img.preview}
                            alt="Resultado"
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute top-1 left-1 rounded bg-accent/80 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">Despues</span>
                        </div>
                      </div>
                      {/* File info + download */}
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{img.file.name}</span>
                        <a
                          href={img.resultUrl || img.preview}
                          download={`processed-${img.file.name}`}
                          className="flex items-center gap-1 rounded bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent-light hover:bg-accent/30 transition-colors"
                        >
                          <Download className="h-3 w-3" /> Descargar
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------- Right: Pipeline Builder ---------- */}
        <div className="space-y-6">
          {/* AI Agent Presets — Unistyles Inventory */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-light" />
              <h2 className="text-sm font-semibold text-accent-light">AI Agent — Por Categoria</h2>
            </div>
            <p className="mb-3 text-[10px] text-gray-400">
              Pipelines optimizados para cada tipo de producto del inventario Unistyles.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AGENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadPreset(preset.id)}
                  className={cn(
                    "flex flex-col rounded-lg border p-3 text-left transition-all",
                    activePresetId === preset.id
                      ? "border-accent bg-accent/15 ring-1 ring-accent/30"
                      : "border-accent/20 bg-surface hover:border-accent/50 hover:bg-accent/10",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-accent-light" />
                    <span className="text-xs font-semibold text-gray-200">
                      {preset.name}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500">{preset.description}</p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <Badge variant="default" size="sm">{preset.steps.length} pasos</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Standard Presets */}
          <div className="rounded-xl border border-surface-lighter bg-surface-light p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-200">Presets de Pipeline</h2>
            <div className="grid grid-cols-2 gap-2">
              {PIPELINE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadPreset(preset.id)}
                  className={cn(
                    "flex flex-col rounded-lg border p-3 text-left transition-all",
                    activePresetId === preset.id
                      ? "border-accent bg-accent/15 ring-1 ring-accent/30"
                      : "border-surface-lighter bg-surface hover:border-accent/40 hover:bg-surface-light",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-accent-light" />
                    <span className="text-xs font-semibold text-gray-200">
                      {preset.name}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div id="pipeline-steps" className="rounded-xl border border-surface-lighter bg-surface-light p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">Pasos del Pipeline</h2>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={addStep}
              >
                Agregar Paso
              </Button>
            </div>

            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-surface-lighter p-8 text-center">
                <p className="text-sm text-gray-500">
                  Sin pasos. Agrega un paso o carga un preset.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-2 rounded-lg border border-surface-lighter bg-surface p-3"
                  >
                    {/* Step number */}
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent-light">
                      {idx + 1}
                    </div>

                    {/* Operation select */}
                    <div className="flex-1">
                      <Select
                        value={step.operation}
                        onValueChange={(val) => updateStepOp(step.id, val)}
                        options={OPERATIONS}
                        placeholder="Operation"
                      />
                    </div>

                    {/* Provider select */}
                    <div className="w-36">
                      <Select
                        value={step.provider}
                        onValueChange={(val) => updateStepProvider(step.id, val)}
                        options={PROVIDERS}
                        placeholder="Provider"
                      />
                    </div>

                    {/* Reorder buttons */}
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveStep(idx, "up")}
                        disabled={idx === 0}
                        className="text-gray-500 hover:text-gray-300 disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(idx, "down")}
                        disabled={idx === steps.length - 1}
                        className="text-gray-500 hover:text-gray-300 disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {steps.length > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {steps.length} paso{steps.length !== 1 ? "s" : ""}
                </span>
                <span>
                  Est. costo:{" "}
                  <span className="text-emerald-400">
                    ~${(steps.reduce((sum, s) => {
                      const costs: Record<string, number> = { "bg-remove": 0.01, enhance: 0, shadows: 0.04, upscale: 0.02, outpaint: 0.05, resize: 0.05, compliance: 0, watermark: 0 };
                      return sum + (costs[s.operation] ?? 0.02);
                    }, 0) * Math.max(images.length, 1)).toFixed(2)}
                  </span>{" "}
                  para {images.length} imagen{images.length !== 1 ? "es" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
