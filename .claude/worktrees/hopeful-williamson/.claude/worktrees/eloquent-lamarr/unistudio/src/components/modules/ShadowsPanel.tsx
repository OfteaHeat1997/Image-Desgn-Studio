"use client";

import React, { useState, useCallback } from "react";
import { Sun, ImageIcon } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/ui/color-picker";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ShadowsPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
  onShadowTypeChange?: (type: string) => void;
}

type ShadowType = "drop" | "contact" | "reflection" | "ai-relight" | "ai-kontext";

/* ------------------------------------------------------------------ */
/*  Shadow type cards config                                            */
/* ------------------------------------------------------------------ */

const SHADOW_TYPES: {
  id: ShadowType;
  name: string;
  shortDesc: string;
  cost: string;
  costColor: string;
}[] = [
  {
    id: "drop",
    name: "Sombra Suelta",
    shortDesc: "Sombra flotante detras del producto",
    cost: "Gratis",
    costColor: "text-emerald-400",
  },
  {
    id: "contact",
    name: "Sombra de Contacto",
    shortDesc: "Como apoyado en una mesa",
    cost: "Gratis",
    costColor: "text-emerald-400",
  },
  {
    id: "reflection",
    name: "Reflejo",
    shortDesc: "Reflejo espejo debajo del producto",
    cost: "Gratis",
    costColor: "text-emerald-400",
  },
  {
    id: "ai-relight",
    name: "Iluminacion IA",
    shortDesc: "La IA cambia la iluminacion",
    cost: "$0.04",
    costColor: "text-amber-400",
  },
  {
    id: "ai-kontext",
    name: "Sombras IA Avanzadas",
    shortDesc: "Describe las sombras en espanol",
    cost: "$0.05",
    costColor: "text-amber-400",
  },
];

/* ------------------------------------------------------------------ */
/*  Descriptions & tips per shadow type                                 */
/* ------------------------------------------------------------------ */

const TYPE_INFO: Record<ShadowType, { description: string; tip: string }> = {
  drop: {
    description:
      "Genera una sombra flotante detras del producto, como si estuviera elevado sobre la superficie. Perfecta para fondos limpios de e-commerce.",
    tip: "Funciona mejor con fotos PNG sin fondo. Ajusta la posicion y el difuminado para un look natural.",
  },
  contact: {
    description:
      "Crea una sombra en la base del producto, como si estuviera apoyado sobre una superficie. Da un aspecto realista y anclado.",
    tip: "Ideal para productos que quieres mostrar \"posados\" sobre una mesa o superficie.",
  },
  reflection: {
    description:
      "Agrega un reflejo espejo debajo del producto, como si estuviera sobre una superficie pulida o cristal.",
    tip: "Funciona especialmente bien con productos de joyeria, perfumes y cosmeticos.",
  },
  "ai-relight": {
    description:
      "La inteligencia artificial cambia la iluminacion completa de tu producto. Elige un estilo de luz predefinido o describe la iluminacion que deseas.",
    tip: "Usa el preset \"Luz Frontal Suave\" para fotos de e-commerce profesionales.",
  },
  "ai-kontext": {
    description:
      "Describe en tus propias palabras que tipo de sombra o iluminacion quieres. La IA interpreta tu instruccion y genera el resultado.",
    tip: "Puedes escribir en espanol. Se lo mas especifico posible para mejores resultados.",
  },
};

/* ------------------------------------------------------------------ */
/*  Lighting presets (Spanish) for AI Relight                           */
/* ------------------------------------------------------------------ */

const LIGHTING_PRESETS = [
  { id: "soft-front", name: "Luz Frontal Suave", desc: "Iluminacion pareja y suave" },
  { id: "left-key", name: "Luz Lateral Izq.", desc: "Luz principal desde la izquierda" },
  { id: "right-key", name: "Luz Lateral Der.", desc: "Luz principal desde la derecha" },
  { id: "top-down", name: "Luz Cenital", desc: "Iluminacion desde arriba" },
  { id: "rim-light", name: "Contraluz", desc: "Luz detras del producto" },
  { id: "golden-hour", name: "Hora Dorada", desc: "Tono calido, atardecer" },
  { id: "dramatic", name: "Dramatica", desc: "Contraste alto, teatral" },
  { id: "studio", name: "Estudio", desc: "Iluminacion profesional de estudio" },
];

/* ------------------------------------------------------------------ */
/*  Suggestion chips for AI Kontext                                     */
/* ------------------------------------------------------------------ */

const KONTEXT_SUGGESTIONS = [
  "Agrega sombra suave natural sobre superficie blanca",
  "Iluminacion de estudio profesional con sombras definidas",
  "Sombra dramatica lateral como en fotografia de moda",
  "Luz calida de atardecer con sombras suaves",
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ShadowsPanel({ imageFile, onProcess, onShadowTypeChange }: ShadowsPanelProps) {
  const [shadowType, setShadowType] = useState<ShadowType>("drop");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Drop shadow state
  const [dropOffsetX, setDropOffsetX] = useState(5);
  const [dropOffsetY, setDropOffsetY] = useState(10);
  const [dropBlur, setDropBlur] = useState(20);
  const [dropOpacity, setDropOpacity] = useState(40);
  const [dropColor, setDropColor] = useState("#000000");

  // Contact shadow state
  const [contactSpread, setContactSpread] = useState(30);
  const [contactOpacity, setContactOpacity] = useState(50);
  const [contactBlur, setContactBlur] = useState(15);

  // Reflection state
  const [reflectionOpacity, setReflectionOpacity] = useState(40);
  const [reflectionBlur, setReflectionBlur] = useState(10);
  const [reflectionHeight, setReflectionHeight] = useState(50);

  // AI Relight state
  const [relightPreset, setRelightPreset] = useState("soft-front");
  const [relightPrompt, setRelightPrompt] = useState("");

  // AI Kontext state
  const [kontextPrompt, setKontextPrompt] = useState("");

  /* ---- handleApply — unchanged API logic ---- */

  const handleApply = useCallback(async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (shadowType === "drop" || shadowType === "contact" || shadowType === "reflection") {
        const formData = new FormData();
        formData.append("file", imageFile);

        const params: Record<string, unknown> = { type: shadowType };

        if (shadowType === "drop") {
          params.offsetX = dropOffsetX;
          params.offsetY = dropOffsetY;
          params.blur = dropBlur;
          params.opacity = dropOpacity / 100;
          params.color = dropColor;
          params.spread = 0;
        } else if (shadowType === "contact") {
          params.blur = contactBlur;
          params.opacity = contactOpacity / 100;
          params.distance = contactSpread;
          params.color = "#000000";
        } else if (shadowType === "reflection") {
          params.opacity = reflectionOpacity / 100;
          params.blur = reflectionBlur;
          params.distance = 2;
          params.fade = 1 - reflectionHeight / 100;
        }

        formData.append("params", JSON.stringify(params));

        const res = await fetch("/api/shadows", { method: "POST", body: formData });
        const data = await res.json();

        if (!data.success) throw new Error(data.error || "Error al generar sombra");
        onProcess(data.data.url, undefined, 0);
      } else {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();

        if (!uploadData.success) throw new Error(uploadData.error || "Error al subir imagen");

        const res = await fetch("/api/shadows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: uploadData.data.url,
            type: shadowType,
            preset: shadowType === "ai-relight" ? relightPreset : undefined,
            prompt: shadowType === "ai-relight" ? relightPrompt || undefined : kontextPrompt || undefined,
          }),
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.error || "Error al generar sombra IA");
        const aiCost = shadowType === "ai-relight" ? 0.04 : 0.05;
        onProcess(data.data.url, undefined, aiCost);
      }
    } catch (error) {
      console.error("Shadow error:", error);
      setErrorMsg(error instanceof Error ? error.message : "Error al generar sombra");
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, shadowType, dropOffsetX, dropOffsetY, dropBlur, dropOpacity, dropColor, contactSpread, contactOpacity, contactBlur, reflectionOpacity, reflectionBlur, reflectionHeight, relightPreset, relightPrompt, kontextPrompt, onProcess]);

  const costDisplay = shadowType === "ai-relight"
    ? "$0.04"
    : shadowType === "ai-kontext"
      ? "$0.05"
      : "Gratis";

  const typeInfo = TYPE_INFO[shadowType];

  return (
    <div className="space-y-4">
      {/* Header */}
      <ModuleHeader
        icon={<Sun className="h-4 w-4" />}
        title="Sombras e Iluminacion"
        description="Dale profundidad profesional a tus fotos. Elige entre sombras flotantes, de contacto, reflejos o cambia toda la iluminacion con IA. Las sombras basicas son gratis."
        whyNeeded="Sin sombras, los productos parecen flotando. Las sombras dan profundidad y realismo profesional."
        costLabel="Desde gratis"
        steps={[
          "Sube una imagen de producto (idealmente PNG sin fondo)",
          "Elige un tipo de sombra de las opciones abajo",
          "Ajusta los controles de intensidad, opacidad y color",
          "Haz clic en \"Aplicar Sombra\" y compara el antes/despues",
        ]}
        tips={[
          "Sombra Suelta, Contacto y Reflejo son gratis — se procesan localmente.",
          "Iluminacion IA y Sombras IA usan modelos de Replicate (pago por uso).",
          "Puedes encadenar sombras: aplica una, acepta, y aplica otra encima.",
          "Usa PNG con fondo transparente para los bordes mas limpios.",
        ]}
      />

      {/* Upload hint when no image */}
      {!imageFile && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 px-3 py-2.5">
          <ImageIcon className="h-4 w-4 shrink-0 text-accent-light" />
          <p className="text-[11px] text-accent-light">
            Sube una imagen en el area central para empezar.
          </p>
        </div>
      )}

      {/* Shadow type cards selector */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-medium text-gray-400">
          Tipo de efecto
        </label>
        <div className="space-y-1.5">
          {SHADOW_TYPES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => { setShadowType(st.id); onShadowTypeChange?.(st.id); }}
              className={cn(
                "w-full flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all",
                shadowType === st.id
                  ? "bg-accent/10 ring-1 ring-accent/50"
                  : "bg-surface-light hover:bg-surface-lighter",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      shadowType === st.id ? "text-accent-light" : "text-gray-300",
                    )}
                  >
                    {st.name}
                  </span>
                  <span className={cn("text-[10px] font-semibold", st.costColor)}>
                    {st.cost}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                  {st.shortDesc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Description + tip for selected type */}
      <div className="rounded-lg bg-surface-light px-3 py-2.5 space-y-1.5">
        <p className="text-[11px] text-gray-300 leading-relaxed">{typeInfo.description}</p>
        <p className="text-[10px] text-accent-light/70 leading-relaxed">
          Tip: {typeInfo.tip}
        </p>
      </div>

      {/* Controls per type */}
      {shadowType === "drop" && (
        <div className="space-y-3">
          <Slider
            label="Posicion Horizontal"
            value={[dropOffsetX]}
            onValueChange={([v]) => setDropOffsetX(v)}
            min={-50}
            max={50}
            step={1}
            formatValue={(v) => `${v}px`}
          />
          <Slider
            label="Posicion Vertical"
            value={[dropOffsetY]}
            onValueChange={([v]) => setDropOffsetY(v)}
            min={-50}
            max={50}
            step={1}
            formatValue={(v) => `${v}px`}
          />
          <Slider
            label="Difuminado"
            value={[dropBlur]}
            onValueChange={([v]) => setDropBlur(v)}
            min={0}
            max={100}
            step={1}
          />
          <Slider
            label="Intensidad"
            value={[dropOpacity]}
            onValueChange={([v]) => setDropOpacity(v)}
            min={0}
            max={100}
            step={1}
            formatValue={(v) => `${v}%`}
          />
          <ColorPicker
            label="Color de Sombra"
            value={dropColor}
            onChange={setDropColor}
            presets={["#000000", "#09090B", "#333333", "#0A0A0C"]}
          />
        </div>
      )}

      {shadowType === "contact" && (
        <div className="space-y-3">
          <Slider
            label="Ancho de Sombra"
            value={[contactSpread]}
            onValueChange={([v]) => setContactSpread(v)}
            min={0}
            max={100}
            step={1}
          />
          <Slider
            label="Intensidad"
            value={[contactOpacity]}
            onValueChange={([v]) => setContactOpacity(v)}
            min={0}
            max={100}
            step={1}
            formatValue={(v) => `${v}%`}
          />
          <Slider
            label="Difuminado"
            value={[contactBlur]}
            onValueChange={([v]) => setContactBlur(v)}
            min={0}
            max={100}
            step={1}
          />
        </div>
      )}

      {shadowType === "reflection" && (
        <div className="space-y-3">
          <Slider
            label="Intensidad"
            value={[reflectionOpacity]}
            onValueChange={([v]) => setReflectionOpacity(v)}
            min={0}
            max={100}
            step={1}
            formatValue={(v) => `${v}%`}
          />
          <Slider
            label="Difuminado"
            value={[reflectionBlur]}
            onValueChange={([v]) => setReflectionBlur(v)}
            min={0}
            max={100}
            step={1}
          />
          <Slider
            label="Altura del Reflejo"
            value={[reflectionHeight]}
            onValueChange={([v]) => setReflectionHeight(v)}
            min={10}
            max={100}
            step={1}
            formatValue={(v) => `${v}%`}
          />
        </div>
      )}

      {shadowType === "ai-relight" && (
        <div className="space-y-3">
          <label className="block text-[11px] font-medium text-gray-400">
            Estilo de Luz
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {LIGHTING_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setRelightPreset(preset.id)}
                className={cn(
                  "rounded-lg px-2 py-2 text-left transition-all",
                  relightPreset === preset.id
                    ? "bg-accent/15 text-accent-light ring-1 ring-accent"
                    : "bg-surface-light text-gray-400 hover:bg-surface-lighter",
                )}
              >
                <span className="block text-[10px] font-medium">{preset.name}</span>
                <span className="block text-[9px] text-gray-500 mt-0.5">{preset.desc}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-gray-400">
              Instruccion Personalizada
            </label>
            <textarea
              value={relightPrompt}
              onChange={(e) => setRelightPrompt(e.target.value)}
              placeholder="Describe la iluminacion que deseas..."
              rows={2}
              className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
            />
          </div>
        </div>
      )}

      {shadowType === "ai-kontext" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-gray-400">
              Instruccion Personalizada
            </label>
            <textarea
              value={kontextPrompt}
              onChange={(e) => setKontextPrompt(e.target.value)}
              placeholder="Describe las sombras e iluminacion que quieres..."
              rows={4}
              className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
            />
          </div>

          {/* Suggestion chips */}
          <div>
            <label className="mb-1.5 block text-[10px] text-gray-500">
              Sugerencias (haz clic para usar):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {KONTEXT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setKontextPrompt(suggestion)}
                  className="rounded-full bg-surface-light px-2.5 py-1 text-[10px] text-gray-400 hover:bg-accent/10 hover:text-accent-light transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cost display */}
      <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-center">
        <span className="text-[10px] text-gray-500">
          Costo: <span className="text-emerald-400 font-semibold">{costDisplay}</span>
          {shadowType.startsWith("ai") ? " por imagen" : " — procesamiento local"}
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
        leftIcon={<Sun className="h-4 w-4" />}
      >
        {isProcessing ? "Aplicando..." : "Aplicar Sombra"}
      </Button>
    </div>
  );
}

export default ShadowsPanel;
