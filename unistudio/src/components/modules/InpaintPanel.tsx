"use client";

import React, { useState, useCallback } from "react";
import { safeJson } from "@/lib/utils/safe-json";
import { Eraser, Clock } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { compressImageFile } from "@/lib/utils/compress-image";
import { toast } from "@/hooks/use-toast";

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
  { value: "kontext", label: "Kontext Pro ($0.05)" },
  { value: "flux-fill-pro", label: "Flux Fill Pro ($0.05)" },
  { value: "flux-fill-dev", label: "Flux Fill Dev ($0.03)" },
];

interface QuickPreset {
  id: string;
  label: string;
  prompt: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: "remove-watermark", label: "Quitar Watermark", prompt: "Remove all watermarks, logos, copyright text, and brand markings completely. Keep the product intact." },
  { id: "remove-logo", label: "Quitar Logo", prompt: "Remove the brand logo and any text overlay completely, reconstruct the underlying surface" },
  { id: "remove-text", label: "Quitar Texto", prompt: "Remove all text, numbers, and written content from the image completely" },
  { id: "remove-tag", label: "Quitar Etiqueta", prompt: "Quitar la etiqueta y rellenar con la misma tela" },
  { id: "remove-wrinkles", label: "Quitar Arrugas", prompt: "Alisar arrugas y pliegues" },
  { id: "fix-stain", label: "Quitar Mancha", prompt: "Quitar la mancha y restaurar la superficie original" },
  { id: "color-red", label: "Rojo", prompt: "Cambiar el color a rojo" },
  { id: "color-blue", label: "Azul", prompt: "Cambiar el color a azul" },
  { id: "color-black", label: "Negro", prompt: "Cambiar el color a negro" },
  { id: "color-white", label: "Blanco", prompt: "Cambiar el color a blanco" },
  { id: "remove-reflection", label: "Sin Reflejo", prompt: "Quitar reflejos y brillos" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function InpaintPanel({ imageFile, onProcess }: InpaintPanelProps) {
  const [prompt, setPrompt] = useState("");
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
      const compressed = await compressImageFile(imageFile);
      const formData = new FormData();
      formData.append("file", compressed);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await safeJson(uploadRes);

      if (!uploadData.success) throw new Error(uploadData.error || "Error al subir imagen");

      // Step 2: Call inpaint API
      setStatusText(`Editando con ${provider === "kontext" ? "Kontext" : provider}... (30-90 seg)`);

      const res = await fetch("/api/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadData.data.url,
          prompt,
          provider,
        }),
      });
      const data = await safeJson(res);

      if (!data.success) throw new Error(data.error || "Error al editar imagen");
      setStatusText("Listo!");
      onProcess(data.data.url, undefined, data.data.cost ?? 0.05);
    } catch (error) {
      console.error("Inpaint error:", error);
      setStatusText("");
      const msg = error instanceof Error ? error.message : "Error al editar imagen";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusText(""), 3000);
    }
  }, [imageFile, prompt, provider, onProcess]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<Eraser className="h-4 w-4" />}
        title="Borrar y Reemplazar"
        description="Elimina etiquetas de precio, manchas, arrugas, logos o cualquier objeto no deseado de tu foto. Tambien puedes cambiar colores (ej: camisa azul a roja). Solo describe lo que quieres y la IA lo hace."
        whyNeeded="Tus fotos de producto pueden tener etiquetas de tienda, stickers de precio, manchas en la tela o reflejos no deseados. En vez de volver a fotografiar, la IA los elimina en segundos. Tambien sirve para cambiar colores de producto sin tener cada variante fisicamente."
        costLabel="Desde $0.03"
        steps={[
          "Sube tu imagen al area central del editor",
          "Usa las Acciones Rapidas (quitar etiqueta, quitar mancha, etc.) o escribe tu instruccion",
          "Se especifico: \"eliminar etiqueta blanca del cuello\" funciona mejor que \"limpiar\"",
          "Haz clic en \"Aplicar Cambio\" y la IA edita solo esa parte de la imagen",
        ]}
        tips={[
          "Las Acciones Rapidas cubren los casos mas comunes con un solo clic.",
          "Para cambiar colores, escribe: \"cambiar el color de la camiseta de azul a rojo\".",
          "Kontext ($0.05) es mejor para cambios creativos. Flux Fill ($0.03) es mas barato para borrar cosas simples.",
          "Puedes aplicar multiples cambios uno tras otro — acepta el resultado y aplica otro cambio encima.",
        ]}
      />

      {/* Mode indicator */}
      <div className="rounded-lg border border-accent bg-accent/10 px-3 py-2 text-center text-xs font-medium text-accent-light">
        Edicion Guiada por Texto
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
