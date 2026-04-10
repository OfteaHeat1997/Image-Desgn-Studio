"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { safeJson } from "@/lib/utils/safe-json";
import {
  Monitor,
  Cpu,
  HardDrive,
  Star,
  Scissors,
  Sparkles,
  Zap,
  Gem,
} from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { ColorPicker } from "@/components/ui/color-picker";
import { TabRoot, TabList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface BgRemovePanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

interface Provider {
  id: string;
  name: string;
  cost: string;
  quality: number;
  icon: React.ElementType;
  description: string;
}

type OutputType = "transparent" | "solid" | "blur";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const PROVIDERS: Provider[] = [
  {
    id: "browser",
    name: "Navegador (Recomendado)",
    cost: "Gratis",
    quality: 4,
    icon: Monitor,
    description: "Gratis, privado, se procesa en tu PC",
  },
  {
    id: "replicate",
    name: "Replicate IA",
    cost: "$0.01",
    quality: 5,
    icon: Cpu,
    description: "Maxima calidad para bordes complejos",
  },
];

/* E-commerce color presets */
const BG_COLOR_PRESETS = [
  "#ffffff",  // Blanco puro
  "#f5f5f5",  // Blanco suave
  "#fafafa",  // Casi blanco
  "#000000",  // Negro
  "#fdf2f8",  // Rosa claro
  "#f8e8ee",  // Rosa Unistyles
  "#eff6ff",  // Azul claro
  "#f0fdf4",  // Verde claro
  "#fefce8",  // Amarillo claro
  "#f5f0ff",  // Lila claro
];

/* Marketplace resize presets */
const MARKETPLACE_SIZES = [
  { value: "none", label: "Sin redimensionar" },
  { value: "1200x1200", label: "Web Profesional (1200x1200)" },
  { value: "1000x1000", label: "Amazon (1000x1000)" },
  { value: "2048x2048", label: "Shopify (2048x2048)" },
  { value: "1600x1600", label: "Etsy (1600x1600)" },
  { value: "1080x1080", label: "Instagram (1080x1080)" },
  { value: "1080x1350", label: "IG Retrato (1080x1350)" },
  { value: "800x800", label: "eBay (800x800)" },
  { value: "1200x1500", label: "Pinterest (1200x1500)" },
  { value: "custom", label: "Personalizado..." },
];

/* Download format options */
const FORMAT_OPTIONS = [
  { value: "png", label: "PNG (transparencia)" },
  { value: "jpg", label: "JPG (mas liviano)" },
  { value: "webp", label: "WebP (web optimizado)" },
];

/* Shadow types */
const SHADOW_OPTIONS = [
  { value: "none", label: "Sin sombra" },
  { value: "soft", label: "Sombra suave" },
  { value: "hard", label: "Sombra fuerte" },
  { value: "reflection", label: "Reflejo" },
];

/* ------------------------------------------------------------------ */
/*  Stars helper                                                        */
/* ------------------------------------------------------------------ */

function QualityStars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < count ? "fill-accent-light text-accent-light" : "text-gray-600",
          )}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Client-side post-processing helpers                                 */
/* ------------------------------------------------------------------ */

/** Apply solid background color to a transparent image */
async function applySolidBg(transparentBlob: Blob, color: string): Promise<Blob> {
  const img = await createImageBitmap(transparentBlob);
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  img.close();
  return canvas.convertToBlob({ type: "image/png" });
}

/** Apply blurred original background behind the subject */
async function applyBlurBg(
  originalFile: File,
  transparentBlob: Blob,
  blurAmount: number,
): Promise<Blob> {
  const [origBitmap, fgBitmap] = await Promise.all([
    createImageBitmap(originalFile),
    createImageBitmap(transparentBlob),
  ]);
  const canvas = new OffscreenCanvas(origBitmap.width, origBitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.filter = `blur(${blurAmount}px)`;
  ctx.drawImage(origBitmap, 0, 0);
  ctx.filter = "none";
  ctx.drawImage(fgBitmap, 0, 0);
  origBitmap.close();
  fgBitmap.close();
  return canvas.convertToBlob({ type: "image/png" });
}

/** Add AI-style shadow beneath the subject */
async function addShadow(
  imageBlob: Blob,
  shadowType: string,
): Promise<Blob> {
  if (shadowType === "none") return imageBlob;

  const bitmap = await createImageBitmap(imageBlob);
  const padding = Math.round(bitmap.height * 0.08);
  const w = bitmap.width;
  const h = bitmap.height + padding;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;

  // Transparent background
  ctx.clearRect(0, 0, w, h);

  if (shadowType === "reflection") {
    // Draw reflected image below (flipped, faded)
    ctx.save();
    ctx.translate(0, h);
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.15;
    ctx.drawImage(bitmap, 0, padding * 0.5, w, bitmap.height);
    ctx.restore();
  } else {
    // Draw shadow ellipse beneath the subject
    const shadowY = bitmap.height - padding * 0.3;
    const shadowW = w * 0.6;
    const shadowH = padding * 0.6;
    const shadowBlur = shadowType === "hard" ? 8 : 20;
    const shadowAlpha = shadowType === "hard" ? 0.35 : 0.18;

    ctx.save();
    ctx.filter = `blur(${shadowBlur}px)`;
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(w / 2, shadowY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw original image on top
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ type: "image/png" });
}

/**
 * Auto-trim transparent pixels from a PNG image.
 * Returns a cropped bitmap with only the visible product content.
 */
async function autoTrimTransparent(imageBlob: Blob): Promise<ImageBitmap> {
  const bitmap = await createImageBitmap(imageBlob);
  const w = bitmap.width;
  const h = bitmap.height;

  // Read pixel data to find bounding box of non-transparent pixels
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const pixels = ctx.getImageData(0, 0, w, h).data;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y2 = 0; y2 < h; y2++) {
    for (let x2 = 0; x2 < w; x2++) {
      const alpha = pixels[(y2 * w + x2) * 4 + 3];
      if (alpha > 10) { // non-transparent pixel
        if (x2 < minX) minX = x2;
        if (x2 > maxX) maxX = x2;
        if (y2 < minY) minY = y2;
        if (y2 > maxY) maxY = y2;
      }
    }
  }

  bitmap.close();

  // If no visible pixels found, return original
  if (maxX <= minX || maxY <= minY) {
    return createImageBitmap(imageBlob);
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // Create cropped canvas with just the product
  const croppedCanvas = new OffscreenCanvas(cropW, cropH);
  const croppedCtx = croppedCanvas.getContext("2d")!;
  croppedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return createImageBitmap(await croppedCanvas.convertToBlob({ type: "image/png" }));
}

/** Resize image to marketplace dimensions with smart auto-crop */
async function resizeForMarketplace(
  imageBlob: Blob,
  sizeStr: string,
  autoCropMargin: number,
  keepTransparent: boolean = false,
): Promise<Blob> {
  if (sizeStr === "none") return imageBlob;

  const [targetW, targetH] = sizeStr.split("x").map(Number);

  // Auto-trim transparent pixels first so the product fills the frame
  const trimmedBitmap = await autoTrimTransparent(imageBlob);

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext("2d")!;

  // Only fill white background if NOT transparent mode
  if (!keepTransparent) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
  }

  // Calculate scale to fit the TRIMMED product with margin
  const marginFraction = autoCropMargin / 100;
  const availW = targetW * (1 - marginFraction * 2);
  const availH = targetH * (1 - marginFraction * 2);
  const scale = Math.min(availW / trimmedBitmap.width, availH / trimmedBitmap.height);

  const drawW = Math.round(trimmedBitmap.width * scale);
  const drawH = Math.round(trimmedBitmap.height * scale);
  const x = Math.round((targetW - drawW) / 2);
  const y = Math.round((targetH - drawH) / 2);

  ctx.drawImage(trimmedBitmap, x, y, drawW, drawH);
  trimmedBitmap.close();

  // Apply light sharpening for crisp product photos
  // Re-draw with slight sharpening via contrast boost
  const sharpCanvas = new OffscreenCanvas(targetW, targetH);
  const sharpCtx = sharpCanvas.getContext("2d")!;
  sharpCtx.filter = "contrast(1.05) saturate(1.03)";
  sharpCtx.drawImage(canvas, 0, 0);

  return sharpCanvas.convertToBlob({ type: "image/png" });
}

/** Convert blob to desired output format */
async function convertFormat(
  imageBlob: Blob,
  format: string,
): Promise<Blob> {
  if (format === "png") return imageBlob;
  const bitmap = await createImageBitmap(imageBlob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  if (format === "jpg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const mime = format === "jpg" ? "image/jpeg" : "image/webp";
  return canvas.convertToBlob({ type: mime, quality: 0.92 });
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function BgRemovePanel({ imageFile, onProcess }: BgRemovePanelProps) {
  const [selectedProvider, setSelectedProvider] = useState("browser");
  const [outputType, setOutputType] = useState<OutputType>("transparent");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [blurAmount, setBlurAmount] = useState(50);
  const [shadowType, setShadowType] = useState("none");
  const [marketplaceSize, setMarketplaceSize] = useState("none");
  const [autoCropMargin, setAutoCropMargin] = useState(10);
  const [outputFormat, setOutputFormat] = useState("png");
  const [customW, setCustomW] = useState(1200);
  const [customH, setCustomH] = useState(1200);
  const [isolateProduct, setIsolateProduct] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isFree = !isolateProduct && (selectedProvider === "browser" || selectedProvider === "withoutbg");

  // Track the last result blob URL so we can revoke it on replacement and unmount
  const lastResultUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (lastResultUrlRef.current) URL.revokeObjectURL(lastResultUrlRef.current);
    };
  }, []);

  /** One-click E-Commerce mode: white bg, auto-crop, 1200x1200, sharpened */
  const applyEcommerceMode = useCallback(() => {
    setSelectedProvider("browser");
    setOutputType("solid");
    setBgColor("#ffffff");
    setShadowType("soft");
    setMarketplaceSize("1200x1200");
    setAutoCropMargin(8);
    setOutputFormat("jpg");
  }, []);

  /* ---- Auto-recommendation based on image ---- */
  const recommendation = useMemo(() => {
    if (!imageFile) return null;

    const sizeMB = imageFile.size / (1024 * 1024);
    const isLarge = sizeMB > 8;
    const isPng = imageFile.type === "image/png";

    // For most images, browser is great and free
    if (!isLarge) {
      return {
        provider: "browser" as const,
        outputType: "transparent" as OutputType,
        marketplace: "none",
        reason: "Tu imagen es ideal para procesamiento gratuito en el navegador.",
        badge: "Gratis",
      };
    }

    // Very large images may benefit from server processing
    return {
      provider: "replicate" as const,
      outputType: "transparent" as OutputType,
      marketplace: "none",
      reason: `Imagen grande (${sizeMB.toFixed(1)}MB) — el servidor procesa mas rapido.`,
      badge: "$0.004",
    };
  }, [imageFile]);

  const applyRecommendation = useCallback(() => {
    if (!recommendation) return;
    setSelectedProvider(recommendation.provider);
    setOutputType(recommendation.outputType);
    if (recommendation.marketplace !== "none") {
      setMarketplaceSize(recommendation.marketplace);
    }
  }, [recommendation]);

  // Auto-apply free recommendation on first image load
  useEffect(() => {
    if (recommendation && recommendation.provider === "browser") {
      applyRecommendation();
    }
  }, [imageFile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProcess = useCallback(async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setStatusText("Iniciando...");
    setProgressPct(0);
    let operationCost = 0;

    try {
      let resultBlob: Blob;

      if (isolateProduct) {
        // ---- AISLAR PRODUCTO: Kontext Pro → bg-remove ----
        // Step 1: Upload original image
        setStatusText("Subiendo imagen...");
        setProgressPct(10);

        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await safeJson(uploadRes);
        if (!uploadData.success) throw new Error(uploadData.error || "Error al subir");

        // Step 2: Flux Kontext Pro removes the person, keeps only jewelry
        setStatusText("Paso 1/2: Aislando producto con IA (Kontext Pro)...");
        setProgressPct(25);

        const kontextRes = await fetch("/api/inpaint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: uploadData.data.url,
            provider: "kontext",
            prompt:
              "Remove the person or model wearing this jewelry completely. " +
              "Keep ONLY the jewelry piece itself (bracelet, necklace, ring, earring, or accessory). " +
              "Place the jewelry on a plain white background, centered and clearly visible. " +
              "Professional product photography style. No hands, arms, neck, or body parts.",
          }),
        });
        const kontextData = await safeJson(kontextRes);
        if (!kontextData.success) throw new Error(kontextData.error || "Error en Kontext Pro");
        operationCost += kontextData.data?.cost ?? 0.05;

        // Step 3: Upload Kontext result, then bg-remove to clean up background
        setStatusText("Paso 2/2: Limpiando fondo con IA...");
        setProgressPct(60);

        const kontextBlobRes = await fetch(kontextData.data.url);
        const kontextBlob = await kontextBlobRes.blob();
        const kontextFile = new File([kontextBlob], "kontext-result.png", { type: "image/png" });

        const uploadForm2 = new FormData();
        uploadForm2.append("file", kontextFile);
        const uploadRes2 = await fetch("/api/upload", { method: "POST", body: uploadForm2 });
        const uploadData2 = await safeJson(uploadRes2);
        if (!uploadData2.success) throw new Error(uploadData2.error || "Error al subir resultado");

        const bgRes = await fetch("/api/bg-remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: uploadData2.data.url,
            provider: "replicate",
          }),
        });
        const bgData = await safeJson(bgRes);
        if (!bgData.success) throw new Error(bgData.error || "Error al remover fondo");
        operationCost += bgData.cost ?? 0.01;

        const finalRes = await fetch(bgData.data.url);
        resultBlob = await finalRes.blob();
        setProgressPct(78);
      } else if (selectedProvider === "browser") {
        // ---- FREE: Browser processing ----
        setStatusText("Cargando modelo IA (primera vez ~40MB)...");
        setProgressPct(5);

        const { removeBackground } = await import("@imgly/background-removal");

        setStatusText("Procesando imagen...");
        setProgressPct(20);

        const blob = await removeBackground(imageFile, {
          model: "isnet_fp16",
          output: { format: "image/png" },
          progress: (key: string, current: number, total: number) => {
            const pct = total > 0 ? Math.round((current / total) * 100) : 0;
            if (key.includes("fetch") || key.includes("download")) {
              setStatusText(`Descargando modelo... ${pct}%`);
              setProgressPct(5 + Math.round(pct * 0.5));
            } else {
              setStatusText(`Procesando... ${pct}%`);
              setProgressPct(55 + Math.round(pct * 0.4));
            }
          },
        });

        resultBlob = blob instanceof Blob ? blob : new Blob([blob], { type: "image/png" });
      } else {
        // ---- API: upload + server processing ----
        setStatusText("Subiendo imagen...");
        setProgressPct(20);

        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await safeJson(uploadRes);
        if (!uploadData.success) throw new Error(uploadData.error || "Error al subir");

        setStatusText(`Removiendo fondo via ${selectedProvider}...`);
        setProgressPct(50);

        const res = await fetch("/api/bg-remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: uploadData.data.url,
            provider: selectedProvider,
          }),
        });
        const data = await safeJson(res);
        if (!data.success) throw new Error(data.error || "Error al remover fondo");

        operationCost = data.cost ?? 0.004;

        // Download the result as blob
        const resultRes = await fetch(data.data.url);
        resultBlob = await resultRes.blob();
      }

      setProgressPct(80);

      // ---- Post-processing pipeline ----

      // 1. Apply background type
      if (outputType === "solid") {
        setStatusText("Aplicando color de fondo...");
        resultBlob = await applySolidBg(resultBlob, bgColor);
      } else if (outputType === "blur") {
        setStatusText("Aplicando fondo difuminado...");
        resultBlob = await applyBlurBg(imageFile, resultBlob, blurAmount);
      }

      // 2. Add shadow
      if (shadowType !== "none") {
        setStatusText("Agregando sombra...");
        resultBlob = await addShadow(resultBlob, shadowType);
      }

      // 3. Marketplace resize (auto-trims transparent pixels + centers product)
      const effectiveSize = marketplaceSize === "custom" ? `${customW}x${customH}` : marketplaceSize;
      if (effectiveSize !== "none") {
        setStatusText("Recortando y centrando producto...");
        resultBlob = await resizeForMarketplace(resultBlob, effectiveSize, autoCropMargin, outputType === "transparent");
      }

      // 4. Convert format
      if (outputFormat !== "png") {
        setStatusText(`Convirtiendo a ${outputFormat.toUpperCase()}...`);
        resultBlob = await convertFormat(resultBlob, outputFormat);
      }

      setProgressPct(100);
      setStatusText("Listo!");
      if (lastResultUrlRef.current) URL.revokeObjectURL(lastResultUrlRef.current);
      const url = URL.createObjectURL(resultBlob);
      lastResultUrlRef.current = url;
      onProcess(url, undefined, operationCost);
    } catch (error) {
      console.error("BG removal error:", error);
      const msg = error instanceof Error ? error.message : "Error desconocido";
      setStatusText("");
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setStatusText("");
        setProgressPct(0);
      }, 3000);
    }
  }, [imageFile, selectedProvider, isolateProduct, outputType, bgColor, blurAmount, shadowType, marketplaceSize, autoCropMargin, outputFormat, customW, customH, onProcess]);

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={<Scissors className="h-4 w-4" />}
        title="Quitar Fondo"
        description="Elimina el fondo de tus fotos de producto y reemplazalo con blanco puro, un color personalizado o dejalo transparente. Todo se procesa en tu computadora — gratis, privado, sin enviar nada a internet."
        whyNeeded="Amazon, Shopify, eBay y casi todos los marketplaces exigen fondo blanco uniforme. Sin fondo limpio, tus productos se ven poco profesionales y algunos marketplaces rechazan la foto directamente. Con este modulo ahorras horas de Photoshop."
        costLabel="Desde gratis"
        steps={[
          "Sube tu foto de producto arrastrando al area central",
          "Haz clic en \"Modo E-Commerce\" para configuracion perfecta automatica, o ajusta manualmente",
          "Elige tipo de salida: fondo blanco, color personalizado, transparente o difuminado",
          "Selecciona un tamanio de marketplace (todas las fotos salen del mismo tamanio)",
          "Haz clic en \"Remover Fondo\" — el producto queda centrado, nitido y profesional",
        ]}
        tips={[
          "Usa \"Modo E-Commerce (1 clic)\" para resultados perfectos sin configurar nada — fondo blanco, centrado, 1200x1200, con sombra suave.",
          "El producto se recorta y centra automaticamente — no importa si la foto original tiene mucho espacio alrededor.",
          "Para una web profesional, usa siempre el mismo tamanio (ej: 1200x1200) para que todas las fotos se vean uniformes.",
          "JPG es mas liviano para web (~50KB vs 200KB PNG). Usa PNG solo si necesitas transparencia.",
          "El margen de recorte (8-12%) es ideal para e-commerce — deja espacio alrededor del producto sin que se vea lejano.",
        ]}
      />

      {/* E-Commerce one-click preset */}
      {imageFile && (
        <button
          type="button"
          onClick={applyEcommerceMode}
          className="w-full flex items-center gap-2.5 rounded-lg border border-accent/40 bg-accent/10 p-3 text-left transition-all hover:bg-accent/20 hover:border-accent/60"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
            <Zap className="h-4 w-4 text-accent-light" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-accent-light block">
              Modo E-Commerce (1 clic)
            </span>
            <span className="text-[10px] text-gray-400">
              Fondo blanco + centrado + 1200x1200 + nitido + sombra
            </span>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
            Gratis
          </span>
        </button>
      )}

      {/* Aislar Producto toggle */}
      {imageFile && (
        <button
          type="button"
          onClick={() => setIsolateProduct((v) => !v)}
          className={cn(
            "w-full flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all",
            isolateProduct
              ? "border-violet-500/60 bg-violet-500/15 hover:bg-violet-500/20"
              : "border-surface-lighter bg-surface-light hover:border-surface-hover",
          )}
        >
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
            isolateProduct ? "bg-violet-500/30" : "bg-surface-lighter",
          )}>
            <Gem className={cn("h-4 w-4", isolateProduct ? "text-violet-300" : "text-gray-500")} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={cn(
              "text-[11px] font-bold block",
              isolateProduct ? "text-violet-200" : "text-gray-300",
            )}>
              Aislar Producto (Joyeria)
            </span>
            <span className="text-[10px] text-gray-400">
              Extrae solo la joya/accesorio de una foto con modelo — elimina la persona
            </span>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-bold",
              isolateProduct
                ? "bg-violet-500/20 text-violet-300"
                : "bg-surface-lighter text-gray-500",
            )}>
              {isolateProduct ? "ACTIVO" : "~$0.06"}
            </span>
          </div>
        </button>
      )}

      {/* Aislar Producto info banner when active */}
      {imageFile && isolateProduct && (
        <div className="flex items-start gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
          <Gem className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
          <div className="text-[10px] text-gray-300 leading-relaxed">
            <span className="font-semibold text-violet-300 block mb-0.5">Modo Aislamiento Activo</span>
            Paso 1: Flux Kontext Pro elimina la persona, deja solo la joya.<br />
            Paso 2: Rembg limpia el fondo → PNG transparente.<br />
            <span className="text-gray-500">Costo estimado: ~$0.06 por imagen</span>
          </div>
        </div>
      )}

      {/* Auto-recommendation banner */}
      {recommendation && imageFile && (
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-lg border p-3",
            recommendation.provider === "browser"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/30 bg-amber-500/10",
          )}
        >
          <Sparkles className={cn(
            "h-4 w-4 shrink-0 mt-0.5",
            recommendation.provider === "browser" ? "text-emerald-400" : "text-amber-400",
          )} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-gray-200">
                Recomendacion Automatica
              </span>
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                recommendation.provider === "browser"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400",
              )}>
                {recommendation.badge}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              {recommendation.reason}
            </p>
            {selectedProvider !== recommendation.provider && (
              <button
                type="button"
                onClick={applyRecommendation}
                className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-accent-light hover:text-accent transition-colors"
              >
                <Zap className="h-3 w-3" />
                Aplicar recomendacion
              </button>
            )}
          </div>
        </div>
      )}

      {/* Provider selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Proveedor
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => setSelectedProvider(provider.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all",
                selectedProvider === provider.id
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <provider.icon className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-[9px] font-semibold text-emerald-400">
                  {provider.cost}
                </span>
              </div>
              <span className="text-[11px] font-medium text-gray-200">
                {provider.name}
              </span>
              <QualityStars count={provider.quality} />
            </button>
          ))}
        </div>
      </div>

      {/* Output type tabs */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Tipo de Salida
        </label>
        <TabRoot
          value={outputType}
          onValueChange={(v) => setOutputType(v as OutputType)}
        >
          <TabList className="w-full">
            <TabTrigger value="transparent" className="flex-1 text-xs">
              Transparente
            </TabTrigger>
            <TabTrigger value="solid" className="flex-1 text-xs">
              Color Solido
            </TabTrigger>
            <TabTrigger value="blur" className="flex-1 text-xs">
              Difuminado
            </TabTrigger>
          </TabList>

          <TabContent value="transparent">
            <p className="text-[10px] text-gray-500">
              Resultado en PNG transparente, ideal para e-commerce.
            </p>
          </TabContent>

          <TabContent value="solid">
            <div className="mt-1">
              <ColorPicker
                label="Color de Fondo"
                value={bgColor}
                onChange={setBgColor}
                presets={BG_COLOR_PRESETS}
              />
            </div>
          </TabContent>

          <TabContent value="blur">
            <div className="mt-1">
              <Slider
                label="Intensidad de Difuminado"
                value={[blurAmount]}
                onValueChange={([v]) => setBlurAmount(v)}
                min={5}
                max={100}
                step={5}
                formatValue={(v) => `${v}px`}
              />
            </div>
          </TabContent>
        </TabRoot>
      </div>

      {/* AI Shadow */}
      <Select
        label="Sombra"
        value={shadowType}
        onValueChange={setShadowType}
        options={SHADOW_OPTIONS}
      />

      {/* Marketplace resize */}
      <Select
        label="Redimensionar para Marketplace"
        value={marketplaceSize}
        onValueChange={setMarketplaceSize}
        options={MARKETPLACE_SIZES}
      />

      {/* Custom size inputs */}
      {marketplaceSize === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-0.5 block text-[10px] text-gray-500">Ancho (px)</label>
            <input
              type="number"
              value={customW}
              onChange={(e) => setCustomW(Math.max(100, parseInt(e.target.value) || 100))}
              className="h-8 w-full rounded-md border border-surface-lighter bg-surface-light px-2 text-xs text-gray-200 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-gray-500">Alto (px)</label>
            <input
              type="number"
              value={customH}
              onChange={(e) => setCustomH(Math.max(100, parseInt(e.target.value) || 100))}
              className="h-8 w-full rounded-md border border-surface-lighter bg-surface-light px-2 text-xs text-gray-200 focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Auto-crop margin (when any resize is on) */}
      {marketplaceSize !== "none" && (
        <Slider
          label="Margen de Recorte"
          value={[autoCropMargin]}
          onValueChange={([v]) => setAutoCropMargin(v)}
          min={0}
          max={25}
          step={1}
          formatValue={(v) => `${v}%`}
        />
      )}

      {/* Output format */}
      <Select
        label="Formato de Salida"
        value={outputFormat}
        onValueChange={setOutputFormat}
        options={FORMAT_OPTIONS}
      />

      {/* Progress bar */}
      {isProcessing && (
        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-lighter">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-center text-[10px] text-gray-400">{statusText}</p>
        </div>
      )}

      {/* Action button */}
      <Button
        variant="primary"
        className={cn("w-full", isolateProduct && "bg-violet-600 hover:bg-violet-500")}
        onClick={handleProcess}
        disabled={!imageFile || isProcessing}
        loading={isProcessing}
      >
        {isProcessing
          ? isolateProduct ? "Aislando Producto..." : "Removiendo Fondo..."
          : isolateProduct ? "Aislar Producto" : "Remover Fondo"}
      </Button>

      {/* Cost indicator */}
      <p className="text-center text-[10px] text-gray-500">
        {isolateProduct ? (
          <>
            Costo estimado:{" "}
            <span className="text-violet-400">~$0.06</span>
            {" "}(Kontext Pro + Rembg)
          </>
        ) : isFree ? (
          <span className="font-semibold text-emerald-400">
            GRATIS — se procesa {selectedProvider === "browser" ? "en tu navegador" : "en Docker local"}
          </span>
        ) : (
          <>
            Costo estimado:{" "}
            <span className="text-emerald-400">$0.01</span>
          </>
        )}
      </p>

      {!imageFile && (
        <p className="text-center text-[10px] text-amber-400">
          Sube una imagen primero para remover el fondo.
        </p>
      )}

      {/* Error card */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <span className="text-red-400 text-xs shrink-0">Error:</span>
          <p className="text-xs text-red-300">{errorMsg}</p>
          <button type="button" onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-300 text-xs shrink-0">x</button>
        </div>
      )}

      {/* Status after completion */}
      {!isProcessing && statusText && !errorMsg && (
        <p className="text-center text-xs text-emerald-400">
          {statusText}
        </p>
      )}
    </div>
  );
}

export default BgRemovePanel;
