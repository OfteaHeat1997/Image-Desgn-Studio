"use client";

import React, { useState, useCallback } from "react";
import { Eraser, Clock } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface InpaintPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}


/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const PROVIDER_OPTIONS = [
  { value: "kontext", label: "Kontext ($0.05)" },
  { value: "flux-fill-pro", label: "Flux Fill Pro ($0.05) — requiere mascara" },
  { value: "flux-fill-dev", label: "Flux Fill Dev ($0.03) — requiere mascara" },
];

interface QuickPreset {
  id: string;
  label: string;
  prompt: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: "remove-tag", label: "Quitar Etiqueta", prompt: "Remove the tag and fill with matching fabric" },
  { id: "remove-wrinkles", label: "Quitar Arrugas", prompt: "Smooth out wrinkles and creases" },
  { id: "fix-stain", label: "Quitar Mancha", prompt: "Remove stain and restore original surface" },
  { id: "color-red", label: "Rojo", prompt: "Change color to red" },
  { id: "color-blue", label: "Azul", prompt: "Change color to blue" },
  { id: "color-black", label: "Negro", prompt: "Change color to black" },
  { id: "color-white", label: "Blanco", prompt: "Change color to white" },
  { id: "remove-reflection", label: "Sin Reflejo", prompt: "Remove reflections and glare" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function InpaintPanel({ imageFile, onProcess }: InpaintPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegative, setShowNegative] = useState(false);
  const [provider, setProvider] = useState("kontext");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePreset = useCallback((preset: QuickPreset) => {
    setPrompt(preset.prompt);
  }, []);

  const handleApply = useCallback(async () => {
    if (!imageFile) return;
    if (!prompt) {
      setErrorMsg("Escribe una descripcion del cambio que quieres hacer.");
      return;
    }
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

      // Step 2: Call inpaint API
      setStatusText(`Editando con ${provider === "kontext" ? "Kontext" : provider}... (30-90 seg)`);

      const res = await fetch("/api/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadData.data.url,
          prompt,
          negativePrompt: negativePrompt || undefined,
          provider,
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Error al editar imagen");
      setStatusText("Listo!");
      onProcess(data.data.url, undefined, data.data.cost ?? 0.05);
    } catch (error) {
      console.error("Inpaint error:", error);
      setStatusText("");
      setErrorMsg(error instanceof Error ? error.message : "Error al editar imagen");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusText(""), 3000);
    }
  }, [imageFile, prompt, negativePrompt, provider, onProcess]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<Eraser className="h-4 w-4" />}
        title="Borrar y Reemplazar"
        description="Elimina objetos no deseados, cambia colores o corrige imperfecciones. Describe el cambio que quieres y la IA lo aplica automaticamente."
        whyNeeded="Quitar etiquetas, manchas, arrugas o cambiar el color del producto sin re-fotografiar."
        costLabel="Desde $0.03"
        steps={[
          "Sube tu imagen al area central del editor",
          "Elige el modo: Mascara + IA o Guiado por Texto",
          "Describe lo que quieres cambiar (ej: \"quitar etiqueta\", \"cambiar color a rojo\")",
          "Haz clic en \"Aplicar\" y la IA editara la imagen",
        ]}
        tips={[
          "El modo Guiado por Texto no necesita mascara — la IA identifica areas automaticamente.",
          "Se especifico: \"eliminar mancha en la esquina superior derecha\" funciona mejor que \"limpiar\".",
          "Kontext ($0.05) es ideal para cambios creativos como colores o estilos.",
          "Flux Fill ($0.03) es mas economico para borrar objetos simples (requiere mascara).",
        ]}
      />

      {/* Mode indicator */}
      <div className="flex gap-1.5">
        <div className="flex-1 rounded-lg border border-accent bg-accent/10 px-3 py-2 text-center text-xs font-medium text-accent-light">
          Guiado por Texto
        </div>
        <div className="flex-1 rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-center text-xs font-medium text-gray-500 opacity-50 cursor-not-allowed relative">
          Mascara + IA
          <span className="ml-1 rounded bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold text-amber-400">
            PRONTO
          </span>
        </div>
      </div>
      <p className="text-[10px] text-gray-500">
        Describe lo que quieres cambiar. No necesitas mascara — la IA identificara y editara las areas relevantes automaticamente.
      </p>

      {/* Quick presets */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Acciones Rapidas
        </label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePreset(preset)}
              className={cn(
                "rounded-md border px-2 py-1 text-[10px] font-medium transition-all",
                prompt === preset.prompt
                  ? "border-accent bg-accent/10 text-accent-light"
                  : "border-surface-lighter bg-surface-light text-gray-400 hover:border-surface-hover hover:text-gray-300",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          Descripcion del Cambio
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="ej. Quitar la etiqueta y rellenar con la misma tela..."
          rows={3}
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
        />
      </div>

      {/* Negative prompt (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowNegative(!showNegative)}
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span className={cn("transition-transform text-[8px]", showNegative ? "rotate-90" : "")}>▶</span>
          Prompt negativo (opcional)
        </button>
        {showNegative && (
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="ej. blurry, distorted, low quality..."
            rows={2}
            className="mt-1.5 w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
          />
        )}
      </div>

      {/* Provider */}
      <Select
        label="Proveedor"
        value={provider}
        onValueChange={setProvider}
        options={PROVIDER_OPTIONS}
      />

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
        disabled={!imageFile || isProcessing}
        loading={isProcessing}
        leftIcon={<Eraser className="h-4 w-4" />}
      >
        {isProcessing ? "Procesando..." : "Aplicar Cambio"}
      </Button>
    </div>
  );
}

export default InpaintPanel;
