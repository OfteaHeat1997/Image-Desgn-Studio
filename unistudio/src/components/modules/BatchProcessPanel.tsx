"use client";

import React, { useState, useCallback, useId } from "react";
import {
  Layers,
  Plus,
  X,
  Play,
  ChevronRight,
  ExternalLink,
  Scissors,
  Image,
  Sparkles,
  Sun,
  Eraser,
  Maximize2,
  ZoomIn,
} from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface BatchProcessPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

interface PipelineStep {
  id: string;
  operation: string;
  provider: string;
  params: Record<string, unknown>;
  enabled: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

interface OperationDef {
  operation: string;
  label: string;
  provider: string;
  cost: number;
  icon: React.ElementType;
  emoji: string;
  description: string;
}

const OPERATIONS: OperationDef[] = [
  {
    operation: "bg-remove",
    label: "Quitar Fondo",
    provider: "replicate",
    cost: 0.004,
    icon: Scissors,
    emoji: "✂️",
    description: "Elimina el fondo automaticamente",
  },
  {
    operation: "bg-generate",
    label: "Generar Fondo",
    provider: "kontext",
    cost: 0.05,
    icon: Image,
    emoji: "🖼️",
    description: "Crea un fondo nuevo con IA",
  },
  {
    operation: "enhance",
    label: "Mejorar Calidad",
    provider: "sharp",
    cost: 0,
    icon: Sparkles,
    emoji: "✨",
    description: "Ajusta brillo, contraste y nitidez",
  },
  {
    operation: "shadows",
    label: "Sombras",
    provider: "browser",
    cost: 0,
    icon: Sun,
    emoji: "🌤️",
    description: "Agrega sombras realistas al producto",
  },
  {
    operation: "inpaint",
    label: "Borrar Objetos",
    provider: "kontext",
    cost: 0.05,
    icon: Eraser,
    emoji: "🔍",
    description: "Elimina marcas de agua u objetos no deseados",
  },
  {
    operation: "outpaint",
    label: "Extender Imagen",
    provider: "kontext",
    cost: 0.05,
    icon: Maximize2,
    emoji: "↔️",
    description: "Amplia el encuadre de la foto",
  },
  {
    operation: "upscale",
    label: "Aumentar Resolucion",
    provider: "real-esrgan",
    cost: 0.02,
    icon: ZoomIn,
    emoji: "🔭",
    description: "Escala la imagen a alta resolucion",
  },
];

const OP_MAP = Object.fromEntries(OPERATIONS.map((o) => [o.operation, o]));

/* Map operation → API endpoint */
const OP_ENDPOINT: Record<string, string> = {
  "bg-remove": "/api/bg-remove",
  "bg-generate": "/api/bg-generate",
  "enhance": "/api/enhance",
  "shadows": "/api/shadows",
  "inpaint": "/api/inpaint",
  "outpaint": "/api/outpaint",
  "upscale": "/api/upscale",
};

/* Default params per operation */
const OP_DEFAULT_PARAMS: Record<string, Record<string, unknown>> = {
  "bg-remove": { provider: "replicate" },
  "bg-generate": { mode: "precise", style: "studio-white", prompt: "fondo blanco profesional para e-commerce" },
  "enhance": { preset: "ecommerce" },
  "shadows": { type: "drop" },
  "inpaint": { provider: "kontext", prompt: "eliminar objeto no deseado" },
  "outpaint": { provider: "kontext", direction: "all", pixels: 200 },
  "upscale": { provider: "real-esrgan", scale: 2 },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCost(cost: number): string {
  if (cost === 0) return "Gratis";
  return `$${cost.toFixed(3)}`;
}

function totalCostOf(steps: PipelineStep[]): number {
  return steps
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + (OP_MAP[s.operation]?.cost ?? 0), 0);
}

/** Convert a File to a data URL */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Upload imageFile to /api/upload and return its remote URL */
async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Error al subir imagen");
  return data.data.url as string;
}

/** Call a single pipeline step via its API endpoint.
 *  Returns the result URL from the API response. */
async function callStep(
  step: PipelineStep,
  imageUrl: string,
): Promise<{ resultUrl: string; cost: number }> {
  const endpoint = OP_ENDPOINT[step.operation];
  if (!endpoint) throw new Error(`Operacion desconocida: ${step.operation}`);

  let res: Response;

  if (step.operation === "enhance" || step.operation === "upscale") {
    // These endpoints expect FormData with a file URL reference or formData
    // We pass imageUrl as JSON body instead (the APIs accept both)
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, ...step.params }),
    });
  } else {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, ...step.params }),
    });
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || `Error en paso: ${step.operation}`);
  }

  const resultUrl: string =
    data.data?.url ?? data.data?.imageUrl ?? data.data?.result ?? "";
  if (!resultUrl) throw new Error(`Paso "${step.operation}" no devolvio imagen`);

  const cost: number = data.data?.cost ?? OP_MAP[step.operation]?.cost ?? 0;
  return { resultUrl, cost };
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function BatchProcessPanel({ imageFile, onProcess }: BatchProcessPanelProps) {
  const uid = useId();
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [selectedOp, setSelectedOp] = useState<string>(OPERATIONS[0].operation);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ---- Pipeline management ---- */

  const addStep = useCallback(() => {
    const op = OPERATIONS.find((o) => o.operation === selectedOp);
    if (!op) return;
    const newStep: PipelineStep = {
      id: `${op.operation}-${Date.now()}`,
      operation: op.operation,
      provider: op.provider,
      params: { ...OP_DEFAULT_PARAMS[op.operation] },
      enabled: true,
    };
    setSteps((prev) => [...prev, newStep]);
  }, [selectedOp]);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleStep = useCallback((id: string, enabled: boolean) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s)),
    );
  }, []);

  const moveStep = useCallback((id: string, dir: -1 | 1) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }, []);

  /* ---- Processing ---- */

  const handleProcess = useCallback(async () => {
    if (!imageFile) return;

    const enabledSteps = steps.filter((s) => s.enabled);
    if (enabledSteps.length === 0) {
      toast.error("Agrega al menos un paso al pipeline");
      return;
    }

    setIsProcessing(true);
    setCurrentStepIdx(0);
    setErrorMsg(null);

    let totalCost = 0;
    let currentImageUrl = "";

    try {
      // Capture original for before/after
      const beforeDataUrl = await fileToDataUrl(imageFile);

      // Upload image once — reuse URL for all steps
      currentImageUrl = await uploadFile(imageFile);

      for (let i = 0; i < enabledSteps.length; i++) {
        setCurrentStepIdx(i);
        const step = enabledSteps[i];
        const { resultUrl, cost } = await callStep(step, currentImageUrl);
        currentImageUrl = resultUrl;
        totalCost += cost;
      }

      setCurrentStepIdx(-1);
      onProcess(currentImageUrl, beforeDataUrl, totalCost);
      toast.success(`Pipeline completado — ${enabledSteps.length} paso(s) aplicados`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setErrorMsg(msg);
      toast.error(msg);
      setCurrentStepIdx(-1);
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, steps, onProcess]);

  /* ---- Derived values ---- */

  const enabledSteps = steps.filter((s) => s.enabled);
  const totalCost = totalCostOf(steps);
  const currentStepLabel =
    currentStepIdx >= 0
      ? `Paso ${currentStepIdx + 1}/${enabledSteps.length}: ${OP_MAP[enabledSteps[currentStepIdx]?.operation]?.label ?? "..."}`
      : "";

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-5">
      {/* Header */}
      <ModuleHeader
        icon={<Layers className="h-4 w-4" />}
        title="Procesamiento en Lote"
        description="Crea un pipeline de pasos (quitar fondo → mejorar calidad → agregar sombra → redimensionar) y aplicalos a tu imagen automaticamente. Cada paso usa el resultado del anterior. Ideal para estandarizar el look de todos tus productos."
        whyNeeded="Si tienes 50 fotos de productos y cada una necesita el mismo tratamiento (quitar fondo, mejorar, sombra), hacerlo una por una toma horas. Con el pipeline, defines los pasos una vez y los aplicas a todas. Para lotes grandes (10+ imagenes) usa la pagina dedicada en /batch."
        costLabel={totalCost === 0 ? "Gratis" : `~$${totalCost.toFixed(3)}/imagen`}
        steps={[
          "Sube una imagen al area central del editor",
          "Elige operaciones del menu y haz clic en \"Agregar\" para crear tu pipeline",
          "Ordena y activa/desactiva los pasos segun necesites (el orden importa)",
          "Haz clic en \"Ejecutar Pipeline\" — cada paso se ejecuta automaticamente",
        ]}
        tips={[
          "Orden recomendado: Quitar Fondo → Mejorar → Sombras → Redimensionar. Este flujo es el estandar de e-commerce.",
          "Desactiva pasos con el toggle sin eliminarlos — asi pruebas variaciones rapidamente.",
          "Los pasos gratuitos (Mejorar, Sombras locales) no consumen creditos de API.",
          "Para procesar muchas imagenes a la vez, usa la pagina dedicada /batch con mas opciones.",
        ]}
      />

      {/* Single image notice */}
      {imageFile ? (
        <div className="flex items-center gap-2 rounded-lg border border-surface-lighter bg-surface-light px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[11px] text-gray-300 truncate">
            1 imagen seleccionada:{" "}
            <span className="text-gray-200 font-medium">{imageFile.name}</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2">
          <span className="text-[11px] text-amber-300">
            Usa{" "}
            <a
              href="/batch"
              className="underline underline-offset-2 hover:text-amber-200 transition-colors inline-flex items-center gap-0.5"
            >
              /batch <ExternalLink className="h-2.5 w-2.5" />
            </a>{" "}
            para subir multiples imagenes
          </span>
        </div>
      )}

      {/* Add step row */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Agregar Paso
        </label>
        <div className="flex gap-2">
          <select
            id={`${uid}-op-select`}
            value={selectedOp}
            onChange={(e) => setSelectedOp(e.target.value)}
            disabled={isProcessing}
            className={cn(
              "flex-1 rounded-lg border border-surface-lighter bg-surface-light px-2.5 py-2",
              "text-xs text-gray-200 outline-none",
              "focus:border-accent focus:ring-1 focus:ring-accent/30",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {OPERATIONS.map((op) => (
              <option key={op.operation} value={op.operation}>
                {op.emoji} {op.label} — {formatCost(op.cost)}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            onClick={addStep}
            disabled={isProcessing}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            className="shrink-0 px-3"
          >
            Agregar
          </Button>
        </div>
        {selectedOp && OP_MAP[selectedOp] && (
          <p className="mt-1 text-[10px] text-gray-500">
            {OP_MAP[selectedOp].description}
          </p>
        )}
      </div>

      {/* Pipeline step list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-400">
            Pipeline ({steps.length} pasos)
          </label>
          {steps.length > 0 && (
            <button
              type="button"
              onClick={() => setSteps([])}
              disabled={isProcessing}
              className="text-[10px] text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              Limpiar todo
            </button>
          )}
        </div>

        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-surface-lighter py-6 text-center">
            <Layers className="h-6 w-6 text-gray-600" />
            <p className="text-[11px] text-gray-500">
              Sin pasos. Agrega operaciones arriba.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {steps.map((step, idx) => {
              const opDef = OP_MAP[step.operation];
              const Icon = opDef?.icon ?? Layers;
              const isCurrent =
                isProcessing &&
                enabledSteps[currentStepIdx]?.id === step.id;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
                    step.enabled
                      ? isCurrent
                        ? "border-accent bg-accent/10"
                        : "border-surface-lighter bg-surface-light"
                      : "border-surface-lighter bg-surface opacity-50",
                  )}
                >
                  {/* Step index */}
                  <span className="text-[9px] font-mono text-gray-600 w-4 shrink-0">
                    {idx + 1}
                  </span>

                  {/* Icon */}
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      step.enabled ? "text-gray-400" : "text-gray-600",
                    )}
                  />

                  {/* Label */}
                  <span
                    className={cn(
                      "flex-1 text-xs font-medium truncate",
                      step.enabled ? "text-gray-200" : "text-gray-500",
                    )}
                  >
                    {opDef?.label ?? step.operation}
                  </span>

                  {/* Processing indicator */}
                  {isCurrent && (
                    <div className="h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                  )}

                  {/* Cost badge */}
                  <Badge
                    variant={opDef?.cost === 0 ? "success" : "default"}
                    size="sm"
                    className="shrink-0"
                  >
                    {formatCost(opDef?.cost ?? 0)}
                  </Badge>

                  {/* Enable toggle */}
                  <Switch
                    checked={step.enabled}
                    onCheckedChange={(checked) => toggleStep(step.id, checked)}
                    disabled={isProcessing}
                  />

                  {/* Move up/down */}
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      onClick={() => moveStep(step.id, -1)}
                      disabled={idx === 0 || isProcessing}
                      className="text-gray-600 hover:text-gray-400 disabled:opacity-20 transition-colors leading-none"
                      title="Subir"
                    >
                      <ChevronRight className="h-2.5 w-2.5 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(step.id, 1)}
                      disabled={idx === steps.length - 1 || isProcessing}
                      className="text-gray-600 hover:text-gray-400 disabled:opacity-20 transition-colors leading-none"
                      title="Bajar"
                    >
                      <ChevronRight className="h-2.5 w-2.5 rotate-90" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    disabled={isProcessing}
                    className="shrink-0 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Eliminar paso"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cost summary */}
      {steps.length > 0 && (
        <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-400">Pasos activos</span>
            <span className="text-gray-200 font-medium">
              {enabledSteps.length} / {steps.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-400">Costo estimado por imagen</span>
            <span
              className={cn(
                "font-semibold",
                totalCost === 0 ? "text-emerald-400" : "text-accent-light",
              )}
            >
              {totalCost === 0 ? "Gratis" : `$${totalCost.toFixed(3)}`}
            </span>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {isProcessing && currentStepIdx >= 0 && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lighter">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{
                width: `${Math.round(((currentStepIdx + 1) / enabledSteps.length) * 100)}%`,
              }}
            />
          </div>
          <p className="text-center text-[10px] text-gray-400">{currentStepLabel}</p>
        </div>
      )}

      {/* Error card */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <span className="text-red-400 text-xs shrink-0">Error:</span>
          <p className="text-xs text-red-300 flex-1">{errorMsg}</p>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="ml-auto text-red-400 hover:text-red-300 text-xs shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Process button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleProcess}
        disabled={!imageFile || isProcessing || enabledSteps.length === 0}
        loading={isProcessing}
        leftIcon={<Play className="h-4 w-4" />}
      >
        {isProcessing
          ? currentStepLabel || "Procesando..."
          : `Ejecutar Pipeline (${enabledSteps.length} paso${enabledSteps.length !== 1 ? "s" : ""})`}
      </Button>

      {!imageFile && (
        <p className="text-center text-[10px] text-amber-400">
          Sube una imagen primero para ejecutar el pipeline.
        </p>
      )}
    </div>
  );
}

export default BatchProcessPanel;
