"use client";

import React, { useState, useCallback } from "react";
import {
  Monitor,
  Cpu,
  HardDrive,
  Star,
  Scissors,
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
    id: "replicate",
    name: "Replicate IA",
    cost: "$0.004",
    quality: 5,
    icon: Star,
    description: "Mejor calidad, rapido, recomendado",
  },
  {
    id: "browser",
    name: "Navegador",
    cost: "Gratis",
    quality: 3,
    icon: Monitor,
    description: "Se procesa en tu PC, sin costo",
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
  { value: "1000x1000", label: "Amazon (1000x1000)" },
  { value: "2048x2048", label: "Shopify (2048x2048)" },
  { value: "1600x1600", label: "Etsy (1600x1600)" },
  { value: "1080x1080", label: "Instagram (1080x1080)" },
  { value: "1080x1350", label: "IG Retrato (1080x1350)" },
  { value: "800x800", label: "eBay (800x800)" },
  { value: "1200x1500", label: "Pinterest (1200x1500)" },
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
  const ctx = canvas.getContext("2d")!;
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

/** Resize image to marketplace dimensions with smart auto-crop */
async function resizeForMarketplace(
  imageBlob: Blob,
  sizeStr: string,
  autoCropMargin: number,
  keepTransparent: boolean = false,
): Promise<Blob> {
  if (sizeStr === "none") return imageBlob;

  const [targetW, targetH] = sizeStr.split("x").map(Number);
  const bitmap = await createImageBitmap(imageBlob);

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext("2d")!;

  // Only fill white background if NOT transparent mode
  if (!keepTransparent) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
  }

  // Calculate scale to fit with margin
  const marginFraction = autoCropMargin / 100;
  const availW = targetW * (1 - marginFraction * 2);
  const availH = targetH * (1 - marginFraction * 2);
  const scale = Math.min(availW / bitmap.width, availH / bitmap.height);

  const drawW = Math.round(bitmap.width * scale);
  const drawH = Math.round(bitmap.height * scale);
  const x = Math.round((targetW - drawW) / 2);
  const y = Math.round((targetH - drawH) / 2);

  ctx.drawImage(bitmap, x, y, drawW, drawH);
  bitmap.close();
  return canvas.convertToBlob({ type: "image/png" });
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isFree = selectedProvider === "browser" || selectedProvider === "withoutbg";

  const handleProcess = useCallback(async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setStatusText("Iniciando...");
    setProgressPct(0);
    let operationCost = 0;

    try {
      let resultBlob: Blob;

      if (selectedProvider === "browser") {
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
        const uploadData = await uploadRes.json();
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
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Error al remover fondo");

        operationCost = data.cost ?? 0.01;

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

      // 3. Marketplace resize
      if (marketplaceSize !== "none") {
        setStatusText("Redimensionando para marketplace...");
        resultBlob = await resizeForMarketplace(resultBlob, marketplaceSize, autoCropMargin, outputType === "transparent");
      }

      // 4. Convert format
      if (outputFormat !== "png") {
        setStatusText(`Convirtiendo a ${outputFormat.toUpperCase()}...`);
        resultBlob = await convertFormat(resultBlob, outputFormat);
      }

      setProgressPct(100);
      setStatusText("Listo!");
      const url = URL.createObjectURL(resultBlob);
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
  }, [imageFile, selectedProvider, outputType, bgColor, blurAmount, shadowType, marketplaceSize, autoCropMargin, outputFormat, onProcess]);

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={<Scissors className="h-4 w-4" />}
        title="Quitar Fondo"
        description="Elimina el fondo de cualquier foto de producto con precision profesional. El modo Navegador es completamente gratis y no envia datos a ningun servidor."
        whyNeeded="Amazon, Shopify y la mayoria de marketplaces requieren fondo blanco. Ahorra horas de edicion manual en Photoshop."
        costLabel="Desde gratis"
        steps={[
          "Arrastra tu foto de producto al area central del editor",
          "Elige el proveedor (Navegador = gratis, no envia datos)",
          "Configura las opciones de salida: color de fondo, formato, marketplace",
          "Haz clic en \"Quitar Fondo\" y espera el resultado",
        ]}
        tips={[
          "El modo Navegador procesa todo localmente — ideal para fotos sensibles.",
          "Usa imagenes PNG con buena iluminacion para bordes mas limpios.",
          "Activa \"Auto-Crop\" para recortar el espacio extra automaticamente.",
          "Para marketplace, elige el formato destino antes de procesar.",
        ]}
      />

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

      {/* Auto-crop margin (only when marketplace resize is on) */}
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
        className="w-full"
        onClick={handleProcess}
        disabled={!imageFile || isProcessing}
        loading={isProcessing}
      >
        {isProcessing ? "Removiendo Fondo..." : "Remover Fondo"}
      </Button>

      {/* Cost indicator */}
      <p className="text-center text-[10px] text-gray-500">
        {isFree ? (
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
