"use client";

import React, { useState, useCallback } from "react";
import { RotateCcw, Sparkles, SlidersHorizontal } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

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

const PRESETS: PresetDef[] = [
  { id: "auto", name: "Auto", settings: { brightness: 10, contrast: 10, saturation: 5, sharpness: 20 } },
  { id: "ecommerce", name: "E-Commerce", settings: { brightness: 15, contrast: 15, saturation: -5, sharpness: 30 } },
  { id: "fashion", name: "Moda", settings: { brightness: 5, contrast: 20, saturation: 10, sharpness: 15 } },
  { id: "beauty", name: "Belleza", settings: { brightness: 10, contrast: 5, saturation: 15, sharpness: 10, noiseReduction: 20 } },
  { id: "luxury", name: "Lujo", settings: { brightness: -5, contrast: 25, saturation: -10, sharpness: 25 } },
  { id: "natural", name: "Natural", settings: { brightness: 5, contrast: 5, saturation: 0, sharpness: 10 } },
  { id: "bright-airy", name: "Luminoso", settings: { brightness: 25, contrast: -10, saturation: -5, exposure: 0.5 } },
  { id: "dark-moody", name: "Dramatico", settings: { brightness: -20, contrast: 30, saturation: -15, sharpness: 20 } },
  { id: "vintage", name: "Vintage", settings: { brightness: -5, contrast: 10, saturation: -25, noiseReduction: 0, whiteBalance: "warm" } },
  { id: "crisp-clean", name: "Nitido", settings: { brightness: 10, contrast: 15, saturation: 0, sharpness: 40, noiseReduction: 30 } },
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

  const handleApply = useCallback(async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);

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

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Error al mejorar imagen");
      }

      onProcess(data.data.url, undefined, 0);
    } catch (error) {
      console.error("Enhancement error:", error);
      setErrorMsg(error instanceof Error ? error.message : "Error al mejorar imagen");
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, settings, activePreset, onProcess]);

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
