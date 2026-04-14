"use client";

import React, { useState, useCallback } from "react";
import { safeJson } from "@/lib/utils/safe-json";
import { RotateCcw, Sparkles, SlidersHorizontal } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface EnhancePanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

interface EnhanceSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  exposure: number;
  noiseReduction: number;
  whiteBalance: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS: EnhanceSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  exposure: 0,
  noiseReduction: 0,
  whiteBalance: "auto",
};

interface PresetDef {
  id: string;
  name: string;
  settings: Partial<EnhanceSettings>;
}

/**
 * Preset slider values synced with ENHANCE_PRESETS in src/lib/processing/enhance.ts.
 * When a preset name is sent to the API, the server uses the lib's values directly.
 * These values are shown on the sliders so users see exactly what the preset does.
 * NOTE: exposure here is in the -2..2 range for the slider; the lib uses -100..100.
 */
const PRESETS: PresetDef[] = [
  { id: "auto", name: "Auto", settings: { brightness: 15, contrast: 18, saturation: 12, sharpness: 35 } },
  { id: "ecommerce", name: "E-Commerce", settings: { brightness: 18, contrast: 22, saturation: 10, sharpness: 40 } },
  { id: "product-clean", name: "Producto", settings: { brightness: 15, contrast: 20, saturation: 8, sharpness: 35, noiseReduction: 15 } },
  { id: "fashion", name: "Moda", settings: { brightness: 12, contrast: 25, saturation: 20, sharpness: 30 } },
  { id: "beauty", name: "Belleza", settings: { brightness: 12, contrast: 12, saturation: 15, sharpness: 20 } },
  { id: "luxury", name: "Lujo", settings: { brightness: 5, contrast: 30, saturation: 15, sharpness: 40 } },
  { id: "natural", name: "Natural", settings: { brightness: 5, contrast: 8, saturation: 3, sharpness: 15 } },
  { id: "bright-airy", name: "Luminoso", settings: { brightness: 25, contrast: -5, saturation: -5, sharpness: 20, exposure: 0.4 } },
  { id: "dark-moody", name: "Dramatico", settings: { brightness: -15, contrast: 35, saturation: 15, sharpness: 30 } },
  { id: "crisp-clean", name: "Nitido", settings: { brightness: 8, contrast: 18, saturation: 8, sharpness: 55 } },
];

const WHITE_BALANCE_OPTIONS = [
  { value: "auto", label: "Automatico" },
  { value: "warm", label: "Calido" },
  { value: "cool", label: "Frio" },
  { value: "daylight", label: "Luz de Dia" },
  { value: "tungsten", label: "Tungsteno" },
];

/** Map white balance names to Kelvin values for the enhance API */
const WB_KELVIN: Record<string, number> = {
  warm: 3200,
  tungsten: 3200,
  daylight: 6500,
  cool: 8000,
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function EnhancePanel({ imageFile, onProcess }: EnhancePanelProps) {
  const [settings, setSettings] = useState<EnhanceSettings>(DEFAULT_SETTINGS);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateSetting = useCallback(
    <K extends keyof EnhanceSettings>(key: K, value: EnhanceSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setActivePreset(null);
    },
    [],
  );

  const applyPreset = useCallback((preset: PresetDef) => {
    setSettings({ ...DEFAULT_SETTINGS, ...preset.settings });
    setActivePreset(preset.id);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setActivePreset(null);
  }, []);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** Compress large images to stay under Vercel 4.5MB limit */
  const compressFile = useCallback(async (file: File): Promise<File> => {
    if (file.size <= 3 * 1024 * 1024) return file;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 2048 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file),
          "image/jpeg", 0.85,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(img.src); resolve(file); };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleApply = useCallback(async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const compressed = await compressFile(imageFile);
      const formData = new FormData();
      formData.append("file", compressed);

      // Send settings as JSON options
      const wbKelvin = WB_KELVIN[settings.whiteBalance];
      const options: Record<string, number> = {
        brightness: settings.brightness,
        contrast: settings.contrast,
        saturation: settings.saturation,
        sharpness: settings.sharpness,
        vibrance: 0, // required by enhanceImage — default to 0 for custom mode
        exposure: settings.exposure * 50, // convert -2..2 to -100..100
        noiseReduction: settings.noiseReduction,
        ...(wbKelvin ? { whiteBalance: wbKelvin } : {}),
      };

      if (activePreset) {
        formData.append("preset", activePreset);
      } else {
        formData.append("options", JSON.stringify(options));
      }

      const res = await fetch("/api/enhance", {
        method: "POST",
        body: formData,
      });

      const data = await safeJson(res);

      if (!data.success) {
        throw new Error(data.error || "Error al mejorar imagen");
      }

      onProcess(data.data.url, undefined, 0);
    } catch (error) {
      console.error("Enhancement error:", error);
      const msg = error instanceof Error ? error.message : "Error al mejorar imagen";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, settings, activePreset, onProcess, compressFile]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <ModuleHeader
            icon={<SlidersHorizontal className="h-4 w-4" />}
            title="Mejorar Calidad"
            description="Corrige fotos oscuras, borrosas o con colores apagados. Ajusta brillo, contraste, nitidez y saturacion con presets profesionales o controles manuales. Todo gratis y se procesa en tu computadora."
            whyNeeded="Las fotos tomadas con celular suelen salir oscuras, amarillentas o sin nitidez. Los compradores no confian en productos con fotos de mala calidad — este modulo convierte una foto de celular en calidad de catalogo profesional en segundos."
            costLabel="Gratis"
            steps={[
              "Sube tu imagen al area central del editor",
              "Elige un preset rapido (E-Commerce, Vivido, Suave) o ajusta manualmente",
              "Usa los controles de brillo, contraste, saturacion y nitidez",
              "Haz clic en \"Aplicar Mejora\" para ver el antes/despues",
            ]}
            tips={[
              "El preset \"E-Commerce\" es ideal para productos — optimiza brillo, contraste y nitidez automaticamente.",
              "No exageres la saturacion — colores muy intensos se ven falsos y generan devoluciones.",
              "La nitidez debe ser sutil — bordes muy marcados hacen la imagen artificial.",
              "Todo es gratis y se procesa localmente — puedes experimentar sin costo.",
            ]}
          />

          {/* Quick instruction */}
          <p className="text-xs text-gray-500 -mt-1">
            Mejora la calidad de tu imagen con ajustes profesionales. <strong className="text-gray-400">100% gratis</strong> — se procesa en tu navegador.
          </p>
          <button
            type="button"
            onClick={resetSettings}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors shrink-0 mt-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reiniciar
          </button>
        </div>
      </div>

      {/* Preset buttons grid */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Estilos Rapidos
        </label>
        <div className="grid grid-cols-5 gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={cn(
                "rounded-md px-1 py-2 text-[10px] font-medium transition-all text-center leading-tight",
                activePreset === preset.id
                  ? "bg-accent/15 text-accent-light ring-1 ring-accent"
                  : "bg-surface-light text-gray-400 hover:bg-surface-lighter hover:text-gray-300",
              )}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Manual sliders */}
      <div className="space-y-3">
        <label className="block text-xs font-medium text-gray-400">
          Ajustes Manuales
        </label>

        <Slider
          label="Brillo"
          value={[settings.brightness]}
          onValueChange={([v]) => updateSetting("brightness", v)}
          min={-100}
          max={100}
          step={1}
        />

        <Slider
          label="Contraste"
          value={[settings.contrast]}
          onValueChange={([v]) => updateSetting("contrast", v)}
          min={-100}
          max={100}
          step={1}
        />

        <Slider
          label="Saturacion"
          value={[settings.saturation]}
          onValueChange={([v]) => updateSetting("saturation", v)}
          min={-100}
          max={100}
          step={1}
        />

        <Slider
          label="Nitidez"
          value={[settings.sharpness]}
          onValueChange={([v]) => updateSetting("sharpness", v)}
          min={0}
          max={100}
          step={1}
        />

        <Slider
          label="Exposicion"
          value={[settings.exposure]}
          onValueChange={([v]) => updateSetting("exposure", v)}
          min={-2}
          max={2}
          step={0.1}
          formatValue={(v) => v.toFixed(1)}
        />

        <Slider
          label="Reduccion de Ruido"
          value={[settings.noiseReduction]}
          onValueChange={([v]) => updateSetting("noiseReduction", v)}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {/* White Balance */}
      <Select
        label="Balance de Blancos"
        value={settings.whiteBalance}
        onValueChange={(v) => updateSetting("whiteBalance", v)}
        options={WHITE_BALANCE_OPTIONS}
      />

      {/* Cost display */}
      <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-center">
        <span className="text-[10px] text-gray-500">
          Costo: <span className="text-emerald-400 font-semibold">Gratis</span> — se procesa en el servidor
        </span>
      </div>

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
        disabled={!imageFile || isProcessing}
        loading={isProcessing}
        leftIcon={<Sparkles className="h-4 w-4" />}
      >
        {isProcessing ? "Mejorando..." : "Aplicar Mejora"}
      </Button>
    </div>
  );
}

export default EnhancePanel;
