"use client";

import React, { useState, useCallback } from "react";
import { Gem, AlertCircle } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface JewelryTryOnPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

type AccessoryType = "earrings" | "necklace" | "ring" | "bracelet" | "sunglasses" | "watch";

interface AccessoryDef {
  id: AccessoryType;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const ACCESSORY_TYPES: AccessoryDef[] = [
  { id: "earrings", name: "Aretes" },
  { id: "necklace", name: "Collar" },
  { id: "ring", name: "Anillo" },
  { id: "bracelet", name: "Pulsera" },
  { id: "sunglasses", name: "Lentes" },
  { id: "watch", name: "Reloj" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function JewelryTryOnPanel({ imageFile, onProcess }: JewelryTryOnPanelProps) {
  const [accessoryType, setAccessoryType] = useState<AccessoryType>("earrings");
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleModelUpload = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setModelFile(file);
    setModelImage(URL.createObjectURL(file));
    setErrorMsg(null);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!imageFile || !modelFile) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setStatusText("Subiendo imagen del accesorio...");

    try {
      // Upload jewelry image
      const jewelryFormData = new FormData();
      jewelryFormData.append("file", imageFile);
      const jewelryUploadRes = await fetch("/api/upload", { method: "POST", body: jewelryFormData });
      const jewelryUploadData = await jewelryUploadRes.json();
      if (!jewelryUploadData.success) throw new Error(jewelryUploadData.error || "Error al subir imagen del accesorio");

      setStatusText("Subiendo foto del modelo...");

      // Upload model image
      const modelFormData = new FormData();
      modelFormData.append("file", modelFile);
      const modelUploadRes = await fetch("/api/upload", { method: "POST", body: modelFormData });
      const modelUploadData = await modelUploadRes.json();
      if (!modelUploadData.success) throw new Error(modelUploadData.error || "Error al subir foto del modelo");

      setStatusText("Aplicando accesorio con IA — esto puede tomar unos segundos...");

      // Call jewelry try-on API
      const res = await fetch("/api/jewelry-tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelImage: modelUploadData.data.url,
          jewelryImage: jewelryUploadData.data.url,
          type: accessoryType,
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Error en prueba de joyeria");

      const cost: number | undefined = data.data?.cost;

      // Pass model image as "before" so comparison shows model vs model+jewelry
      onProcess(data.data.url, modelUploadData.data.url, cost);
    } catch (error) {
      console.error("Jewelry try-on error:", error);
      setErrorMsg(error instanceof Error ? error.message : "Error en prueba de joyeria. Por favor, intenta de nuevo.");
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  }, [imageFile, modelFile, accessoryType, onProcess]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<Gem className="h-4 w-4" />}
        title="Joyeria Virtual"
        description="Prueba virtual de joyeria y accesorios sobre modelos IA. Sube la foto del accesorio y una foto de modelo — la IA lo coloca con iluminacion y perspectiva realista."
        whyNeeded="Muestra como se ve la joyeria puesta sin sesion fotografica."
        costLabel="$0.05/img"
        steps={[
          "Sube la foto del accesorio (aretes, collar, anillo, etc.) al area central",
          "Elige el tipo de accesorio para que la IA sepa donde colocarlo",
          "Sube una foto del modelo (rostro o cuerpo, segun el accesorio)",
          "Haz clic en \"Generar\" para ver el resultado virtual",
        ]}
        tips={[
          "Usa fotos del accesorio sobre fondo blanco o transparente para mejores resultados.",
          "Para aretes, el modelo debe tener el rostro visible y de frente o 3/4.",
          "Para collares y pulseras, asegurate de que el area del cuello/muneca este despejada.",
          "Funciona mejor con fotos de alta resolucion y buena iluminacion.",
        ]}
      />

      {/* Error card */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{errorMsg}</p>
        </div>
      )}

      {/* Accessory type selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">Tipo de Accesorio</label>
        <div className="grid grid-cols-3 gap-1.5">
          {ACCESSORY_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setAccessoryType(type.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-2.5 transition-all",
                accessoryType === type.id
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover",
              )}
            >
              <span className="text-[11px] font-medium text-gray-300">{type.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Jewelry image (current editor image) */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">Imagen del Accesorio</label>
        <div className="rounded-lg border border-surface-lighter bg-surface-light p-3 text-center">
          {imageFile ? (
            <p className="text-xs text-gray-300">
              Usando: <span className="text-accent-light">{imageFile.name}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-500">Sube una imagen del accesorio en el editor primero.</p>
          )}
        </div>
      </div>

      {/* Model image upload */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">Foto del Modelo</label>
        {modelImage ? (
          <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-surface-lighter">
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
            hint="Foto que muestre donde colocar el accesorio"
            className="min-h-[100px]"
          />
        )}
      </div>

      {/* Cost */}
      <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-center">
        <span className="text-[10px] text-gray-500">
          Costo: <span className="text-emerald-400 font-semibold">$0.05</span> por prueba
        </span>
      </div>

      {/* Status text during processing */}
      {isProcessing && statusText && (
        <p className="text-center text-xs text-accent-light animate-pulse">{statusText}</p>
      )}

      {/* Process button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleProcess}
        disabled={!imageFile || !modelFile || isProcessing}
        loading={isProcessing}
        leftIcon={<Gem className="h-4 w-4" />}
      >
        {isProcessing ? "Aplicando Accesorio..." : "Aplicar Accesorio"}
      </Button>

      {(!imageFile || !modelFile) && !isProcessing && (
        <p className="text-center text-xs text-gray-500">
          Sube una imagen del accesorio y una foto de modelo para comenzar.
        </p>
      )}
    </div>
  );
}

export default JewelryTryOnPanel;
