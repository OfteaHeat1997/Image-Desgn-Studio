"use client";

import React, { useState, useCallback } from "react";
import { ArrowUpCircle, Sparkles } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type UpscaleProvider = "real-esrgan" | "clarity" | "aura-sr";

interface UpscalePanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const COST_MAP: Record<UpscaleProvider, number> = {
  "real-esrgan": 0.02,
  clarity: 0.05,
  "aura-sr": 0.03,
};

const PROVIDER_OPTIONS = [
  { value: "real-esrgan", label: "Real-ESRGAN ($0.02) — General purpose, rapido" },
  { value: "clarity",     label: "Clarity ($0.05) — Mejor calidad, guiado por prompt" },
  { value: "aura-sr",     label: "AuraSR ($0.03) — Calidad balanceada" },
];

const SCALE_OPTIONS = [
  { value: "2", label: "2x — Doble resolucion" },
  { value: "4", label: "4x — Cuadruple resolucion" },
];

/* ------------------------------------------------------------------ */
/*  Helper: File -> data URL                                            */
/* ------------------------------------------------------------------ */

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function UpscalePanel({ imageFile, onProcess }: UpscalePanelProps) {
  const [provider, setProvider] = useState<UpscaleProvider>("real-esrgan");
  const [scale, setScale] = useState<2 | 4>(4);
  const [faceEnhance, setFaceEnhance] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const estimatedCost = COST_MAP[provider];

  const handleProviderChange = useCallback((val: string) => {
    const p = val as UpscaleProvider;
    setProvider(p);
    // aura-sr is fixed 4x — auto-correct scale
    if (p === "aura-sr") {
      setScale(4);
    }
    // Reset provider-specific options when switching
    if (p !== "real-esrgan") setFaceEnhance(false);
    if (p !== "clarity") setPrompt("");
    setErrorMsg(null);
  }, []);

  const handleApply = useCallback(async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Upload via /api/upload (handles compression for large images)
      const formData = new FormData();
      formData.append("file", imageFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error || "Error al subir imagen");

      const body: Record<string, unknown> = {
        imageUrl: uploadData.data.url,
        provider,
        scale,
      };

      if (provider === "real-esrgan") {
        body.faceEnhance = faceEnhance;
      }

      if (provider === "clarity" && prompt.trim()) {
        body.prompt = prompt.trim();
      }

      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Error al escalar imagen");
      }

      onProcess(data.data.url, undefined, estimatedCost);
      toast.success(`Imagen escalada ${scale}x con exito`);
    } catch (error) {
      console.error("Upscale error:", error);
      const msg = error instanceof Error ? error.message : "Error al escalar imagen";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, provider, scale, faceEnhance, prompt, estimatedCost, onProcess]);

  if (!imageFile) {
    return <EmptyState module="upscale" />;
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<ArrowUpCircle className="h-4 w-4" />}
        title="Escalar Imagen (Upscale)"
        description="Aumenta la resolucion de tu imagen 2x o 4x usando IA. Ideal para fotos de baja calidad que necesitan verse bien en pantallas grandes o en impresion."
        whyNeeded="Tu foto tiene poca resolucion? El upscale la agranda 2x o 4x sin perder calidad, ideal para impresion o zoom en marketplace."
        costLabel={`$${estimatedCost.toFixed(2)}/imagen`}
        steps={[
          "Sube tu imagen al area central del editor",
          "Elige el proveedor segun tu necesidad (velocidad vs calidad)",
          "Selecciona el factor de escala: 2x o 4x",
          "Activa opciones adicionales segun el proveedor elegido",
          'Haz clic en "Escalar Imagen" y espera el resultado',
        ]}
        tips={[
          "Real-ESRGAN es la opcion mas rapida y economica para la mayoria de fotos de producto.",
          "Clarity acepta un prompt para guiar la mejora — describe los detalles que quieres preservar.",
          "Activa 'Mejorar rostros' solo si tu imagen tiene personas o modelos.",
          "AuraSR ofrece un balance entre calidad y costo sin configuracion adicional.",
          "Para impresion, usa siempre 4x para maxima resolucion.",
        ]}
      />

      {/* Provider selector */}
      <Select
        label="Proveedor de Upscale"
        value={provider}
        onValueChange={handleProviderChange}
        options={PROVIDER_OPTIONS}
      />

      {/* Scale selector — hidden for aura-sr (fixed 4x) */}
      {provider !== "aura-sr" && (
        <Select
          label="Factor de Escala"
          value={String(scale)}
          onValueChange={(v) => setScale(Number(v) as 2 | 4)}
          options={SCALE_OPTIONS}
        />
      )}

      {/* aura-sr fixed scale notice */}
      {provider === "aura-sr" && (
        <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2">
          <p className="text-[11px] text-gray-400">
            AuraSR usa escala fija de <span className="text-white font-semibold">4x</span>.
          </p>
        </div>
      )}

      {/* Face enhance toggle — only for real-esrgan */}
      {provider === "real-esrgan" && (
        <div className="flex items-center justify-between rounded-lg border border-surface-lighter bg-surface-light px-3 py-2.5">
          <div>
            <p className="text-xs font-medium text-gray-300">Mejorar rostros</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Activa si la imagen contiene personas o modelos
            </p>
          </div>
          <Switch
            checked={faceEnhance}
            onCheckedChange={setFaceEnhance}
          />
        </div>
      )}

      {/* Prompt field — only for clarity */}
      {provider === "clarity" && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-300">
            Prompt de guia{" "}
            <span className="text-gray-500 font-normal">(opcional)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: producto de ropa con textura detallada de tela, fondo blanco limpio..."
            rows={3}
            className={cn(
              "w-full resize-none rounded-lg border border-surface-lighter bg-surface-light",
              "px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500",
              "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-surface",
              "transition-colors",
            )}
          />
          <p className="mt-1 text-[10px] text-gray-500">
            Describe los detalles que quieres que la IA preserve o mejore.
          </p>
        </div>
      )}

      {/* Estimated cost display */}
      <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-center">
        <span className="text-[10px] text-gray-500">
          Costo estimado:{" "}
          <span className="text-amber-400 font-semibold">
            ${estimatedCost.toFixed(2)}
          </span>{" "}
          por imagen
        </span>
      </div>

      {/* Error card */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <span className="text-red-400 text-xs shrink-0">Error:</span>
          <p className="text-xs text-red-300">{errorMsg}</p>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="ml-auto text-red-400 hover:text-red-300 text-xs shrink-0"
          >
            x
          </button>
        </div>
      )}

      {/* Apply button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleApply}
        disabled={!imageFile || isProcessing}
        loading={isProcessing}
        leftIcon={<Sparkles className="h-4 w-4" />}
      >
        {isProcessing ? "Escalando..." : `Escalar Imagen ${scale}x`}
      </Button>
    </div>
  );
}

export default UpscalePanel;
