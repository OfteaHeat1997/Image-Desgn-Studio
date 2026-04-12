"use client";

import React, { useState, useCallback } from "react";
import { safeJson } from "@/lib/utils/safe-json";
import { Shirt, ArrowRightLeft, X } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { cn } from "@/lib/utils/cn";
import { compressImageFile } from "@/lib/utils/compress-image";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface GhostMannequinPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

type Operation = "remove-mannequin" | "flat-to-model" | "model-to-flat";

type GarmentCategory = "tops" | "bottoms" | "dresses";

interface OperationDef {
  id: Operation;
  name: string;
  description: string;
  cost: string;
  needsModel: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const OPERATIONS: OperationDef[] = [
  {
    id: "remove-mannequin",
    name: "Quitar Maniqui",
    description: "Elimina el maniqui y crea el efecto 3D hollow-man profesional",
    cost: "$0.05",
    needsModel: false,
  },
  {
    id: "flat-to-model",
    name: "Flat Lay a Modelo",
    description: "Convierte una foto flat lay en un look puesto sobre modelo",
    cost: "$0.08",
    needsModel: true,
  },
  {
    id: "model-to-flat",
    name: "Modelo a Flat Lay",
    description: "Convierte una foto con modelo en vista flat lay",
    cost: "$0.05",
    needsModel: false,
  },
];

const GARMENT_CATEGORIES: { value: GarmentCategory; label: string }[] = [
  { value: "tops", label: "Parte Superior (camisas, chaquetas, blusas)" },
  { value: "bottoms", label: "Parte Inferior (pantalones, faldas)" },
  { value: "dresses", label: "Vestidos / Enterizos" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function GhostMannequinPanel({ imageFile, onProcess }: GhostMannequinPanelProps) {
  const [operation, setOperation] = useState<Operation>("remove-mannequin");
  const [category, setCategory] = useState<GarmentCategory>("tops");
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedOp = OPERATIONS.find((o) => o.id === operation)!;

  const handleModelUpload = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setModelFile(file);
    setModelImage((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const handleProcess = useCallback(async () => {
    if (!imageFile) return;

    if (selectedOp.needsModel && !modelFile) {
      setErrorMsg("Sube una imagen de modelo para esta operacion.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setStatusText("Subiendo imagen...");

    try {
      // Upload garment image
      const compressed = await compressImageFile(imageFile);
      const formData = new FormData();
      formData.append("file", compressed);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await safeJson(uploadRes);
      if (!uploadData.success) throw new Error(uploadData.error || "Error al subir la imagen");

      // Upload model image if needed
      let modelImageUrl: string | undefined;
      if (selectedOp.needsModel && modelFile) {
        setStatusText("Subiendo foto de modelo...");
        const compressedModel = await compressImageFile(modelFile);
        const modelFormData = new FormData();
        modelFormData.append("file", compressedModel);
        const modelUploadRes = await fetch("/api/upload", { method: "POST", body: modelFormData });
        const modelUploadData = await safeJson(modelUploadRes);
        if (!modelUploadData.success) throw new Error(modelUploadData.error || "Error al subir la imagen de modelo");
        modelImageUrl = modelUploadData.data.url;
      }

      setStatusText("Procesando con IA...");

      const res = await fetch("/api/ghost-mannequin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadData.data.url,
          operation,
          modelImage: modelImageUrl,
          category,
        }),
      });
      const data = await safeJson(res);

      if (!data.success) throw new Error(data.error || "Error al procesar la imagen");

      setStatusText("Listo.");
      onProcess(data.data.url, uploadData.data.url, data.cost ?? data.data?.cost ?? 0.05);
    } catch (error) {
      console.error("Ghost mannequin error:", error);
      const msg = error instanceof Error ? error.message : "Error inesperado al procesar la imagen.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  }, [imageFile, modelFile, operation, category, selectedOp, onProcess]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<Shirt className="h-4 w-4" />}
        title="Maniqui Invisible"
        description="Fotografiaste tu prenda en un maniqui? Este modulo elimina el maniqui y deja la prenda flotando con forma 3D — el efecto 'hollow-man' que usan Zara, H&M y las grandes marcas. Tambien convierte fotos planas (flat lay) a vista en modelo."
        whyNeeded="Los maniquis se ven poco profesionales en una tienda online — distraen al comprador. El efecto invisible muestra la prenda con volumen y forma, como si la vistiera una persona invisible. Es el estandar de la industria de moda."
        costLabel="$0.05/img"
        steps={[
          "Sube la foto de tu prenda sobre maniqui",
          "Elige la operacion: Quitar Maniqui, Flat to Model, o Model to Flat",
          "Para 'Flat to Model', opcionalmente sube una foto de modelo de referencia",
          "Haz clic en \"Procesar\" y la IA elimina el maniqui manteniendo la forma",
        ]}
        tips={[
          "Funciona mejor con prendas de parte superior (camisas, chaquetas, vestidos) que muestran volumen claro.",
          "\"Flat to Model\" es genial si solo tienes fotos de la prenda acostada y quieres verla puesta.",
          "Usa fotos con buena iluminacion uniforme y fondo simple para mejores resultados.",
          "Despues de quitar el maniqui, puedes agregarle sombra con el modulo de Sombras para un look mas profesional.",
        ]}
      />

      {/* Quick instruction */}
      <p className="text-xs text-gray-500">
        Crea el efecto de maniqui invisible para mostrar tu ropa de forma profesional en tu catalogo.
      </p>

      {/* Error card */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5">
          <span className="flex-1 text-xs text-red-400">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="mt-0.5 shrink-0 text-red-400 hover:text-red-300 transition-colors"
            aria-label="Cerrar error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Operation selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">Operacion</label>
        <div className="space-y-2">
          {OPERATIONS.map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => {
                setOperation(op.id);
                setErrorMsg(null);
              }}
              className={cn(
                "flex w-full flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                operation === op.id
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-medium text-gray-200">{op.name}</span>
                <span className="text-[10px] font-semibold text-emerald-400">{op.cost}</span>
              </div>
              <span className="text-[10px] text-gray-500">{op.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Garment category selector (only shown for flat-to-model) */}
      {selectedOp.needsModel && (
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-400">
            Categoria de Prenda
          </label>
          <div className="space-y-1.5">
            {GARMENT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all",
                  category === cat.value
                    ? "border-accent bg-accent/10 text-gray-200"
                    : "border-surface-lighter bg-surface-light text-gray-400 hover:border-surface-hover",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    category === cat.value ? "bg-accent" : "bg-surface-hover",
                  )}
                />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Model image upload for flat-to-model */}
      {selectedOp.needsModel && (
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-400">Foto del Modelo</label>
          {modelImage ? (
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-surface-lighter">
              <img src={modelImage} alt="Modelo" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => { setModelImage(null); setModelFile(null); }}
                className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-gray-300 hover:text-white transition-colors"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <Dropzone
              onDrop={handleModelUpload}
              multiple={false}
              label="Sube una foto de modelo"
              hint="Foto de cuerpo completo para vestir"
              className="min-h-[100px]"
            />
          )}
        </div>
      )}

      {/* Status text during processing */}
      {isProcessing && statusText && (
        <p className="text-center text-xs text-gray-500 animate-pulse">{statusText}</p>
      )}

      {/* Process button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleProcess}
        disabled={!imageFile || isProcessing || (selectedOp.needsModel && !modelFile)}
        loading={isProcessing}
        leftIcon={operation === "remove-mannequin" ? <Shirt className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
      >
        {isProcessing ? "Procesando..." : selectedOp.name}
      </Button>

      {!imageFile && (
        <p className="text-center text-xs text-gray-500">
          Sube una imagen de la prenda primero.
        </p>
      )}
    </div>
  );
}

export default GhostMannequinPanel;
