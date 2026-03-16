"use client";

import React, { useState, useCallback } from "react";
import {
  Expand,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Clock,
} from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface OutpaintPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

interface PlatformPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  ratio: string;
}

const PLATFORM_PRESETS: PlatformPreset[] = [
  { id: "amazon", name: "Amazon", width: 2000, height: 2000, ratio: "1:1" },
  { id: "shopify", name: "Shopify", width: 2048, height: 2048, ratio: "1:1" },
  { id: "instagram", name: "IG Feed", width: 1080, height: 1080, ratio: "1:1" },
  { id: "instagram-story", name: "IG Story", width: 1080, height: 1920, ratio: "9:16" },
  { id: "tiktok", name: "TikTok", width: 1080, height: 1920, ratio: "9:16" },
  { id: "facebook", name: "Facebook", width: 1200, height: 628, ratio: "1.91:1" },
  { id: "pinterest", name: "Pinterest", width: 1000, height: 1500, ratio: "2:3" },
  { id: "etsy", name: "Etsy", width: 2000, height: 1500, ratio: "4:3" },
  { id: "ebay", name: "eBay", width: 1600, height: 1600, ratio: "1:1" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function OutpaintPanel({ imageFile, onProcess }: OutpaintPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customWidth, setCustomWidth] = useState(2000);
  const [customHeight, setCustomHeight] = useState(2000);
  const [extendTop, setExtendTop] = useState(true);
  const [extendBottom, setExtendBottom] = useState(true);
  const [extendLeft, setExtendLeft] = useState(true);
  const [extendRight, setExtendRight] = useState(true);
  const [bgPrompt, setBgPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePresetSelect = useCallback((preset: PlatformPreset) => {
    setSelectedPreset(preset.id);
    setCustomWidth(preset.width);
    setCustomHeight(preset.height);
  }, []);

  const handleApply = useCallback(async () => {
    if (!imageFile) return;
    // Validate dimensions
    const w = Math.max(100, customWidth);
    const h = Math.max(100, customHeight);
    setIsProcessing(true);
    setErrorMsg(null);
    setStatusText("Subiendo imagen...");

    try {
      // Step 1: Upload the image
      const formData = new FormData();
      formData.append("file", imageFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) throw new Error(uploadData.error || "Error al subir imagen");

      setStatusText("Extendiendo imagen con IA... (30-90 seg)");

      // Determine target aspect ratio from dimensions
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const d = gcd(w, h);
      const targetAspectRatio = `${w / d}:${h / d}`;

      // Find matching platform ID if a preset is selected
      const platformId = selectedPreset || undefined;

      // Build direction-aware prompt
      const dirs: string[] = [];
      if (extendTop) dirs.push("top");
      if (extendBottom) dirs.push("bottom");
      if (extendLeft) dirs.push("left");
      if (extendRight) dirs.push("right");
      const directionHint = dirs.length > 0 && dirs.length < 4
        ? `Extend the image toward the ${dirs.join(", ")} side${dirs.length > 1 ? "s" : ""}. `
        : "";
      const fullPrompt = directionHint + (bgPrompt || "");

      // Step 2: Call outpaint API
      const res = await fetch("/api/outpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadData.data.url,
          platform: platformId,
          targetAspectRatio,
          prompt: fullPrompt || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Error al extender imagen");
      setStatusText("Listo!");
      onProcess(data.data.url, undefined, data.data.cost ?? 0.05);
    } catch (error) {
      console.error("Outpaint error:", error);
      setStatusText("");
      setErrorMsg(error instanceof Error ? error.message : "Error al extender imagen");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusText(""), 3000);
    }
  }, [imageFile, customWidth, customHeight, selectedPreset, bgPrompt, extendTop, extendBottom, extendLeft, extendRight, onProcess]);

  const activeDirections = [extendTop, extendBottom, extendLeft, extendRight].filter(Boolean).length;
  const estimatedCost = activeDirections > 0 ? 0.05 : 0;

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<Expand className="h-4 w-4" />}
        title="Extender Imagen"
        description="Amplia los bordes de tu imagen con IA para adaptarla al formato de cualquier plataforma. La IA genera contenido nuevo que se fusiona naturalmente con la imagen original."
        whyNeeded="Instagram requiere 1:1, Stories 9:16, Amazon 1:1. No recortes — extiende con IA."
        costLabel="$0.05/img"
        steps={[
          "Sube tu imagen al area central del editor",
          "Elige un preset de plataforma (Instagram, Amazon, etc.) o define tamanio personalizado",
          "Ajusta los margenes con las flechas de direccion",
          "Haz clic en \"Extender Imagen\" y la IA rellena los bordes",
        ]}
        tips={[
          "Los presets de plataforma ajustan el tamanio exacto que requiere cada marketplace.",
          "La IA genera contenido coherente en los bordes — no solo estira la imagen.",
          "Ideal para convertir fotos cuadradas de producto a formato vertical de Instagram Stories.",
          "Funciona mejor con imagenes de alta resolucion y fondos simples.",
        ]}
      />

      {/* Platform presets grid */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Formatos por Plataforma
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {PLATFORM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={cn(
                "flex flex-col items-center rounded-lg border p-2 text-center transition-all",
                selectedPreset === preset.id
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover",
              )}
            >
              <span className="text-[10px] font-semibold text-gray-200">
                {preset.name}
              </span>
              <span className="text-[9px] text-gray-500">
                {preset.width}x{preset.height}
              </span>
              <span className="text-[9px] text-gray-500">{preset.ratio}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom size */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Tamanio Personalizado
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-gray-500">Ancho</label>
            <input
              type="number"
              value={customWidth}
              onChange={(e) => {
                setCustomWidth(Math.max(0, parseInt(e.target.value) || 0));
                setSelectedPreset(null);
              }}
              min={100}
              className="h-9 w-full rounded-lg border border-surface-lighter bg-surface-light px-3 text-xs text-gray-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
            />
          </div>
          <span className="mt-5 text-xs text-gray-500">x</span>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-gray-500">Alto</label>
            <input
              type="number"
              value={customHeight}
              onChange={(e) => {
                setCustomHeight(Math.max(0, parseInt(e.target.value) || 0));
                setSelectedPreset(null);
              }}
              min={100}
              className="h-9 w-full rounded-lg border border-surface-lighter bg-surface-light px-3 text-xs text-gray-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Direction toggles */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Direcciones de Extension
        </label>
        <div className="flex flex-col items-center gap-1">
          {/* Top */}
          <button
            type="button"
            onClick={() => setExtendTop(!extendTop)}
            className={cn(
              "flex items-center gap-1 rounded-md border px-4 py-1.5 text-[10px] font-medium transition-all",
              extendTop
                ? "border-accent bg-accent/10 text-accent-light"
                : "border-surface-lighter bg-surface-light text-gray-500",
            )}
          >
            <ArrowUp className="h-3 w-3" /> Arriba
          </button>

          {/* Middle row */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExtendLeft(!extendLeft)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-3 py-1.5 text-[10px] font-medium transition-all",
                extendLeft
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-500",
              )}
            >
              <ArrowLeft className="h-3 w-3" /> Izq.
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-surface-lighter bg-surface">
              <div className="h-6 w-6 rounded bg-surface-lighter" />
            </div>

            <button
              type="button"
              onClick={() => setExtendRight(!extendRight)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-3 py-1.5 text-[10px] font-medium transition-all",
                extendRight
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-500",
              )}
            >
              Der. <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Bottom */}
          <button
            type="button"
            onClick={() => setExtendBottom(!extendBottom)}
            className={cn(
              "flex items-center gap-1 rounded-md border px-4 py-1.5 text-[10px] font-medium transition-all",
              extendBottom
                ? "border-accent bg-accent/10 text-accent-light"
                : "border-surface-lighter bg-surface-light text-gray-500",
            )}
          >
            <ArrowDown className="h-3 w-3" /> Abajo
          </button>
        </div>
      </div>

      {/* Background continuation prompt */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          Descripcion del Fondo
        </label>
        <textarea
          value={bgPrompt}
          onChange={(e) => setBgPrompt(e.target.value)}
          placeholder="ej. Continuar con superficie de marmol blanco y luz suave..."
          rows={3}
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
        />
      </div>

      {/* Cost estimate */}
      <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-center">
        <span className="text-[10px] text-gray-500">
          Destino: {customWidth}x{customHeight} | Costo:{" "}
          <span className="text-emerald-400 font-semibold">
            ~${estimatedCost.toFixed(2)}
          </span>
        </span>
      </div>

      {/* Status text */}
      {isProcessing && statusText && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-accent-light animate-pulse" />
          <p className="text-[11px] text-accent-light">{statusText}</p>
        </div>
      )}

      {/* Error card */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <span className="text-red-400 text-xs shrink-0">Error:</span>
          <p className="text-xs text-red-300">{errorMsg}</p>
          <button type="button" onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-300 text-xs shrink-0">x</button>
        </div>
      )}

      {/* Apply button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleApply}
        disabled={!imageFile || isProcessing || activeDirections === 0}
        loading={isProcessing}
        leftIcon={<Expand className="h-4 w-4" />}
      >
        {isProcessing ? "Extendiendo..." : "Extender Imagen"}
      </Button>
    </div>
  );
}

export default OutpaintPanel;
