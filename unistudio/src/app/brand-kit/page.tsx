"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Save,
  RotateCcw,
  Type,
  Image as ImageIcon,
  Palette as PaletteIcon,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { ColorPicker } from "@/components/ui/color-picker";
import { Dropzone } from "@/components/ui/dropzone";
import { cn } from "@/lib/utils/cn";
import { useBrandStore } from "@/stores/brand-store";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface BrandKitState {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  logoUrl: string | null;
  fonts: {
    primary: string;
    secondary: string;
  };
  watermark: {
    enabled: boolean;
    position: WatermarkPosition;
    opacity: number;
    size: number;
  };
  defaultBgStyle: string;
  defaultEnhancePreset: string;
  defaultShadowType: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Lato", label: "Lato" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Raleway", label: "Raleway" },
];

const BG_STYLE_OPTIONS = [
  { value: "studio-white", label: "Estudio Blanco" },
  { value: "gradient", label: "Degradado" },
  { value: "outdoor-natural", label: "Exterior Natural" },
  { value: "minimalist", label: "Minimalista" },
  { value: "lifestyle", label: "Escena Lifestyle" },
];

const ENHANCE_PRESET_OPTIONS = [
  { value: "auto", label: "Automatico" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "fashion", label: "Moda" },
  { value: "luxury", label: "Lujo" },
  { value: "natural", label: "Natural" },
  { value: "crisp-clean", label: "Nitido y Limpio" },
];

const SHADOW_TYPE_OPTIONS = [
  { value: "drop", label: "Sombra Proyectada" },
  { value: "contact", label: "Sombra de Contacto" },
  { value: "reflection", label: "Reflejo" },
  { value: "none", label: "Ninguna" },
];

const WATERMARK_POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: "top-left", label: "TL" },
  { value: "top-center", label: "TC" },
  { value: "top-right", label: "TR" },
  { value: "center-left", label: "CL" },
  { value: "center", label: "C" },
  { value: "center-right", label: "CR" },
  { value: "bottom-left", label: "BL" },
  { value: "bottom-center", label: "BC" },
  { value: "bottom-right", label: "BR" },
];

/* ------------------------------------------------------------------ */
/*  Initial state                                                       */
/* ------------------------------------------------------------------ */

const INITIAL_STATE: BrandKitState = {
  colors: {
    primary: "#000000",
    secondary: "#ffffff",
    accent: "#C5A47E",
    background: "#f5f5f5",
  },
  logoUrl: null,
  fonts: {
    primary: "Inter",
    secondary: "Inter",
  },
  watermark: {
    enabled: false,
    position: "bottom-right",
    opacity: 30,
    size: 15,
  },
  defaultBgStyle: "studio-white",
  defaultEnhancePreset: "auto",
  defaultShadowType: "contact",
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function BrandKitPage() {
  const [state, setState] = useState<BrandKitState>(INITIAL_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const updateBrandKit = useBrandStore((s) => s.updateBrandKit);

  // Load saved brand kit from database on mount
  useEffect(() => {
    fetch("/api/brand-kit")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data;
          setState((prev) => ({
            ...prev,
            colors: d.colors ?? prev.colors,
            fonts: d.fonts ?? prev.fonts,
            logoUrl: d.logo_url ?? prev.logoUrl,
            watermark: d.watermark
              ? {
                  enabled: d.watermark.enabled ?? false,
                  position: d.watermark.position ?? "bottom-right",
                  opacity: d.watermark.opacity ?? 30,
                  size: d.watermark.size ?? 15,
                }
              : prev.watermark,
            defaultBgStyle: d.default_bg_style ?? prev.defaultBgStyle,
            defaultEnhancePreset: d.default_enhance_preset ?? prev.defaultEnhancePreset,
            defaultShadowType: d.default_shadow_type ?? prev.defaultShadowType,
          }));
        }
      })
      .catch(() => {});
  }, []);

  /* ---- Updaters ---- */

  const updateColor = useCallback((key: keyof BrandKitState["colors"], value: string) => {
    setState((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  }, []);

  const updateFont = useCallback((key: keyof BrandKitState["fonts"], value: string) => {
    setState((prev) => ({
      ...prev,
      fonts: { ...prev.fonts, [key]: value },
    }));
  }, []);

  const updateWatermark = useCallback(
    (updates: Partial<BrandKitState["watermark"]>) => {
      setState((prev) => ({
        ...prev,
        watermark: { ...prev.watermark, ...updates },
      }));
    },
    [],
  );

  const handleLogoUpload = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    // Convert to data URL so it persists across sessions (blob URLs die on reload)
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setState((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await fetch("/api/brand-kit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My Brand",
          colors: state.colors,
          fonts: state.fonts,
          logo_url: state.logoUrl,
          watermark: state.watermark.enabled
            ? {
                enabled: true,
                position: state.watermark.position,
                opacity: state.watermark.opacity,
                size: state.watermark.size,
                imageUrl: state.logoUrl || "",
              }
            : null,
          default_bg_style: state.defaultBgStyle,
          default_enhance_preset: state.defaultEnhancePreset,
          default_shadow_type: state.defaultShadowType,
        }),
      });
      // Sync to Zustand store so other components can access brand kit
      updateBrandKit({
        colors: state.colors,
        fonts: state.fonts,
        logoUrl: state.logoUrl || "",
        watermark: {
          enabled: state.watermark.enabled,
          position: state.watermark.position,
          opacity: state.watermark.opacity / 100,
          size: state.watermark.size,
          imageUrl: state.logoUrl || "",
        },
        defaultBgStyle: state.defaultBgStyle,
        defaultEnhancePreset: state.defaultEnhancePreset,
      });
      toast.success("Kit de marca guardado correctamente");
    } catch (e) {
      console.error("Failed to save brand kit:", e);
      toast.error("Error al guardar el kit de marca");
    } finally {
      setIsSaving(false);
    }
  }, [state]);

  const handleReset = useCallback(async () => {
    setState(INITIAL_STATE);
    // Persist the reset defaults to the database so they survive page refresh
    try {
      await fetch("/api/brand-kit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My Brand",
          colors: INITIAL_STATE.colors,
          fonts: INITIAL_STATE.fonts,
          logo_url: INITIAL_STATE.logoUrl,
          watermark: null,
          default_bg_style: INITIAL_STATE.defaultBgStyle,
          default_enhance_preset: INITIAL_STATE.defaultEnhancePreset,
          default_shadow_type: INITIAL_STATE.defaultShadowType,
        }),
      });
      updateBrandKit({
        colors: INITIAL_STATE.colors,
        fonts: INITIAL_STATE.fonts,
        logoUrl: "",
        watermark: {
          enabled: false,
          position: INITIAL_STATE.watermark.position,
          opacity: INITIAL_STATE.watermark.opacity / 100,
          size: INITIAL_STATE.watermark.size,
          imageUrl: "",
        },
        defaultBgStyle: INITIAL_STATE.defaultBgStyle,
        defaultEnhancePreset: INITIAL_STATE.defaultEnhancePreset,
      });
      toast.success("Kit de marca restablecido");
    } catch (e) {
      console.error("Failed to reset brand kit:", e);
      toast.error("Error al restablecer el kit de marca");
    }
  }, [updateBrandKit]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kit de Marca</h1>
          <p className="mt-1 text-sm text-gray-400">
            Define la identidad de tu marca para fotografia de producto consistente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={handleReset}>
            Restablecer
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} loading={isSaving} onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---- Left Column: Settings ---- */}
        <div className="space-y-6 lg:col-span-2">
          {/* Colors */}
          <section className="rounded-xl border border-surface-lighter bg-surface-light p-5">
            <div className="mb-4 flex items-center gap-2">
              <PaletteIcon className="h-4 w-4 text-accent-light" />
              <h2 className="text-sm font-semibold text-gray-200">Colores de Marca</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ColorPicker
                label="Primario"
                value={state.colors.primary}
                onChange={(v) => updateColor("primary", v)}
              />
              <ColorPicker
                label="Secundario"
                value={state.colors.secondary}
                onChange={(v) => updateColor("secondary", v)}
              />
              <ColorPicker
                label="Acento"
                value={state.colors.accent}
                onChange={(v) => updateColor("accent", v)}
              />
              <ColorPicker
                label="Fondo"
                value={state.colors.background}
                onChange={(v) => updateColor("background", v)}
              />
            </div>
          </section>

          {/* Logo Upload */}
          <section className="rounded-xl border border-surface-lighter bg-surface-light p-5">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-accent-light" />
              <h2 className="text-sm font-semibold text-gray-200">Logotipo</h2>
            </div>
            {state.logoUrl ? (
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-surface-lighter bg-surface">
                  <img
                    src={state.logoUrl}
                    alt="Logotipo de marca"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setState((prev) => ({ ...prev, logoUrl: null }))}
                >
                  Eliminar
                </Button>
              </div>
            ) : (
              <Dropzone
                onDrop={handleLogoUpload}
                multiple={false}
                label="Sube tu logotipo"
                hint="PNG o SVG, se recomienda fondo transparente"
                className="min-h-[100px]"
              />
            )}
          </section>

          {/* Fonts */}
          <section className="rounded-xl border border-surface-lighter bg-surface-light p-5">
            <div className="mb-4 flex items-center gap-2">
              <Type className="h-4 w-4 text-accent-light" />
              <h2 className="text-sm font-semibold text-gray-200">Tipografia</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Fuente Principal"
                value={state.fonts.primary}
                onValueChange={(v) => updateFont("primary", v)}
                options={FONT_OPTIONS}
              />
              <Select
                label="Fuente Secundaria"
                value={state.fonts.secondary}
                onValueChange={(v) => updateFont("secondary", v)}
                options={FONT_OPTIONS}
              />
            </div>
          </section>

          {/* Watermark */}
          <section className="rounded-xl border border-surface-lighter bg-surface-light p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">Marca de Agua</h2>
              <Switch
                checked={state.watermark.enabled}
                onCheckedChange={(checked) => updateWatermark({ enabled: checked })}
                label={state.watermark.enabled ? "Habilitada" : "Deshabilitada"}
                labelPosition="left"
              />
            </div>

            {state.watermark.enabled && (
              <div className="space-y-4">
                {/* Position grid */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Posicion
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 w-fit">
                    {WATERMARK_POSITIONS.map((pos) => (
                      <button
                        key={pos.value}
                        type="button"
                        onClick={() => updateWatermark({ position: pos.value })}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg border text-xs font-medium transition-all",
                          state.watermark.position === pos.value
                            ? "border-accent bg-accent/15 text-accent-light"
                            : "border-surface-lighter bg-surface text-gray-500 hover:border-surface-hover hover:text-gray-300",
                        )}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity */}
                <Slider
                  label="Opacidad"
                  value={[state.watermark.opacity]}
                  onValueChange={([v]) => updateWatermark({ opacity: v })}
                  min={5}
                  max={100}
                  step={5}
                  formatValue={(v) => `${v}%`}
                />

                {/* Size */}
                <Slider
                  label="Tamaño"
                  value={[state.watermark.size]}
                  onValueChange={([v]) => updateWatermark({ size: v })}
                  min={5}
                  max={50}
                  step={1}
                  formatValue={(v) => `${v}%`}
                />
              </div>
            )}
          </section>

          {/* Default Style Presets */}
          <section className="rounded-xl border border-surface-lighter bg-surface-light p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-200">
              Presets de Estilo por Defecto
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Estilo de Fondo"
                value={state.defaultBgStyle}
                onValueChange={(v) => setState((prev) => ({ ...prev, defaultBgStyle: v }))}
                options={BG_STYLE_OPTIONS}
              />
              <Select
                label="Preset de Mejora"
                value={state.defaultEnhancePreset}
                onValueChange={(v) => setState((prev) => ({ ...prev, defaultEnhancePreset: v }))}
                options={ENHANCE_PRESET_OPTIONS}
              />
              <Select
                label="Tipo de Sombra"
                value={state.defaultShadowType}
                onValueChange={(v) => setState((prev) => ({ ...prev, defaultShadowType: v }))}
                options={SHADOW_TYPE_OPTIONS}
              />
            </div>
          </section>
        </div>

        {/* ---- Right Column: Preview ---- */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 rounded-xl border border-surface-lighter bg-surface-light p-5">
            <div className="mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4 text-accent-light" />
              <h2 className="text-sm font-semibold text-gray-200">Vista Previa</h2>
            </div>

            {/* Preview card */}
            <div
              className="relative aspect-square overflow-hidden rounded-lg border border-surface-lighter"
              style={{ backgroundColor: state.colors.background }}
            >
              {/* Simulated product placeholder */}
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-32 w-24 rounded-lg bg-gray-300/30 shadow-lg" />
              </div>

              {/* Watermark preview */}
              {state.watermark.enabled && (
                <div
                  className={cn(
                    "absolute px-2 py-1 text-[10px] font-bold",
                    state.watermark.position.includes("top") && "top-2",
                    state.watermark.position.includes("bottom") && "bottom-2",
                    state.watermark.position.includes("center") &&
                      !state.watermark.position.includes("left") &&
                      !state.watermark.position.includes("right") &&
                      "left-1/2 -translate-x-1/2",
                    state.watermark.position === "center" && "top-1/2 -translate-y-1/2",
                    state.watermark.position.includes("left") && "left-2",
                    state.watermark.position.includes("right") && "right-2",
                  )}
                  style={{
                    opacity: state.watermark.opacity / 100,
                    fontSize: `${Math.max(8, state.watermark.size * 0.8)}px`,
                    color: state.colors.primary,
                  }}
                >
                  {state.logoUrl ? (
                    <img
                      src={state.logoUrl}
                      alt="Watermark"
                      style={{
                        height: `${state.watermark.size * 2}px`,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    "BRAND"
                  )}
                </div>
              )}
            </div>

            {/* Color swatches preview */}
            <div className="mt-4 flex items-center gap-2">
              {Object.entries(state.colors).map(([key, color]) => (
                <div key={key} className="flex flex-col items-center gap-1">
                  <div
                    className="h-8 w-8 rounded-lg border border-surface-lighter"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] text-gray-500 capitalize">{key}</span>
                </div>
              ))}
            </div>

            {/* Font preview */}
            <div className="mt-4 space-y-1">
              <p className="text-sm font-semibold text-gray-200" style={{ fontFamily: state.fonts.primary }}>
                {state.fonts.primary}
              </p>
              <p className="text-xs text-gray-400" style={{ fontFamily: state.fonts.secondary }}>
                {state.fonts.secondary} - texto secundario
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
