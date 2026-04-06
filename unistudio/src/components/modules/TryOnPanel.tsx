"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Shirt, Info, Sparkles, CheckCircle2, Circle, Upload, ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface TryOnPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
  onProviderChange?: (provider: string) => void;
  onModelImageChange?: (hasModel: boolean) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

interface CategoryDef {
  value: string;
  label: string;
}

const CATEGORIES: CategoryDef[] = [
  { value: "tops", label: "Parte Superior" },
  { value: "bottoms", label: "Parte Inferior" },
  { value: "one-pieces", label: "Enterizo / Vestido" },
];

interface GarmentTypeDef {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  badge?: string;
}

const GARMENT_TYPES: GarmentTypeDef[] = [
  { id: "regular", name: "Ropa Regular", desc: "Camisas, pantalones, vestidos", emoji: "\u{1F455}" },
  { id: "lingerie", name: "Lenceria", desc: "Ropa interior, bodys, conjuntos", emoji: "\u{1FA71}", badge: "Usa IDM-VTON" },
  { id: "swimwear", name: "Traje de Bano", desc: "Bikinis, enterizos de playa", emoji: "\u{1F459}", badge: "Usa IDM-VTON" },
];

interface ProviderDef {
  id: string;
  name: string;
  desc: string;
  cost: string;
  costNum: number;
  badge?: string;
}

const PROVIDERS: ProviderDef[] = [
  { id: "auto", name: "Auto", desc: "Elige el mejor proveedor automaticamente.", cost: "variable", costNum: 0, badge: "Recomendado" },
  { id: "fashn", name: "FASHN v1.6", desc: "Mejor calidad ropa regular. No soporta lenceria.", cost: "$0.05", costNum: 0.05 },
  { id: "idm-vton", name: "IDM-VTON", desc: "Funciona con todo incluyendo lenceria.", cost: "$0.02", costNum: 0.02 },
];

/* ------------------------------------------------------------------ */
/*  Step indicator                                                      */
/* ------------------------------------------------------------------ */

function StepBadge({ number, done, active }: { number: number; done: boolean; active: boolean }) {
  if (done) {
    return <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />;
  }
  return (
    <div className={cn(
      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
      active
        ? "bg-accent text-white ring-2 ring-accent/30"
        : "bg-surface-lighter text-gray-500"
    )}>
      {number}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function TryOnPanel({ imageFile, onProcess, onProviderChange, onModelImageChange }: TryOnPanelProps) {
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [category, setCategory] = useState("tops");
  const [garmentType, setGarmentType] = useState("regular");
  const [provider, setProvider] = useState("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isLingerieOrSwimwear = garmentType === "lingerie" || garmentType === "swimwear";

  // Determine step completion
  const step1Done = !!imageFile;
  const step2Done = !!modelImage;
  const step3Done = step1Done && step2Done; // config always has defaults
  const allReady = step1Done && step2Done;

  // Determine active step
  const activeStep = !step1Done ? 1 : !step2Done ? 2 : 3;

  // Notify parent about provider changes
  useEffect(() => {
    const effectiveProvider = isLingerieOrSwimwear ? "idm-vton" : provider;
    onProviderChange?.(effectiveProvider);
  }, [provider, isLingerieOrSwimwear, onProviderChange]);

  // Notify parent about model image changes
  useEffect(() => {
    onModelImageChange?.(!!modelImage);
  }, [modelImage, onModelImageChange]);

  const handleModelUpload = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setModelFile(file);
    setModelImage((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!imageFile || !modelImage || !modelFile) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Step 1: Upload model image
      const modelFormData = new FormData();
      modelFormData.append("file", modelFile);
      const modelUploadRes = await fetch("/api/upload", { method: "POST", body: modelFormData });
      const modelUploadData = await modelUploadRes.json();
      if (!modelUploadData.success) throw new Error(modelUploadData.error || "Error al subir imagen del modelo");

      // Step 2: Upload garment image
      const garmentFormData = new FormData();
      garmentFormData.append("file", imageFile);
      const garmentUploadRes = await fetch("/api/upload", { method: "POST", body: garmentFormData });
      const garmentUploadData = await garmentUploadRes.json();
      if (!garmentUploadData.success) throw new Error(garmentUploadData.error || "Error al subir imagen de la prenda");

      // Step 3: Call try-on API
      const effectiveProvider = isLingerieOrSwimwear ? "idm-vton" : provider;

      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelImage: modelUploadData.data.url,
          garmentImage: garmentUploadData.data.url,
          category,
          garmentType,
          provider: effectiveProvider,
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Error en la generacion de prueba virtual");

      // Resolve cost
      const providerDef = PROVIDERS.find((p) => p.id === effectiveProvider);
      const cost = data.data.cost ?? providerDef?.costNum ?? 0.02;

      onProcess(data.data.url, modelUploadData.data.url, cost);
    } catch (error) {
      console.error("Try-on error:", error);
      setErrorMsg(error instanceof Error ? error.message : "Error en la generacion de prueba virtual");
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, modelImage, modelFile, category, garmentType, provider, isLingerieOrSwimwear, onProcess]);

  // Resolve displayed cost
  const effectiveProvider = isLingerieOrSwimwear ? "idm-vton" : provider;
  const selectedProviderDef = PROVIDERS.find((p) => p.id === effectiveProvider);
  const displayCost = effectiveProvider === "auto" ? "~$0.02 - $0.05" : selectedProviderDef?.cost ?? "$0.02";

  return (
    <div className="space-y-4">

      {/* ============================================================ */}
      {/*  HEADER — Que es esto?                                        */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-accent/20 bg-gradient-to-b from-accent/10 to-transparent p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20">
            <Shirt className="h-5 w-5 text-accent-light" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Prueba Virtual</h3>
            <span className="text-[10px] font-semibold text-emerald-400">Desde $0.015 por imagen</span>
          </div>
        </div>
        <p className="text-[13px] text-gray-200 leading-relaxed">
          Viste a un modelo con tu prenda usando IA. Tu subes la <strong className="text-white">foto del modelo</strong> y la <strong className="text-white">foto de la prenda</strong>, y la IA genera una imagen del modelo vistiendo tu prenda.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  PASO 1 — Sube la prenda (area central)                       */}
      {/* ============================================================ */}
      <div className={cn(
        "rounded-lg border p-3 transition-all",
        step1Done
          ? "border-emerald-500/30 bg-emerald-500/5"
          : activeStep === 1
            ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
            : "border-surface-lighter bg-surface-light"
      )}>
        <div className="flex items-center gap-3">
          <StepBadge number={1} done={step1Done} active={activeStep === 1} />
          <div className="flex-1">
            <p className={cn("text-xs font-bold", step1Done ? "text-emerald-300" : "text-white")}>
              Sube la foto de la PRENDA
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {step1Done ? (
                <>Usando: <span className="text-accent-light font-medium">{imageFile?.name}</span></>
              ) : (
                <>Arrastra una imagen de tu prenda al <strong className="text-gray-200">area grande del centro</strong> del editor <span className="text-accent-light">&rarr;</span></>
              )}
            </p>
          </div>
          {step1Done && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
        </div>
        {!step1Done && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2">
            <Upload className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="text-[11px] text-amber-300 font-medium">
              La prenda sobre fondo blanco o transparente (PNG) da los mejores resultados
            </span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  PASO 2 — Sube la foto del modelo                             */}
      {/* ============================================================ */}
      <div className={cn(
        "rounded-lg border p-3 transition-all",
        step2Done
          ? "border-emerald-500/30 bg-emerald-500/5"
          : activeStep === 2
            ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
            : "border-surface-lighter bg-surface-light"
      )}>
        <div className="flex items-center gap-3 mb-2">
          <StepBadge number={2} done={step2Done} active={activeStep === 2} />
          <div className="flex-1">
            <p className={cn("text-xs font-bold", step2Done ? "text-emerald-300" : "text-white")}>
              Sube la foto del MODELO
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {step2Done
                ? "Modelo cargado correctamente"
                : "La persona que va a vestir tu prenda. Foto de cuerpo completo o medio cuerpo."
              }
            </p>
          </div>
          {step2Done && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
        </div>

        {step2Done && modelImage ? (
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-surface-lighter">
            <img src={modelImage} alt="Modelo" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => { setModelImage(null); setModelFile(null); }}
              className="absolute right-2 top-2 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-black/90 transition-colors"
            >
              Cambiar modelo
            </button>
          </div>
        ) : (
          <Dropzone
            onDrop={handleModelUpload}
            multiple={false}
            label="Arrastra aqui la foto del modelo"
            hint="JPG o PNG — cuerpo completo funciona mejor"
            className="min-h-[100px]"
          />
        )}
      </div>

      {/* ============================================================ */}
      {/*  PASO 3 — Configurar y generar                                */}
      {/* ============================================================ */}
      <div className={cn(
        "rounded-lg border p-3 transition-all",
        !allReady
          ? "border-surface-lighter bg-surface-light opacity-50"
          : "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
      )}>
        <div className="flex items-center gap-3 mb-3">
          <StepBadge number={3} done={false} active={allReady} />
          <div className="flex-1">
            <p className={cn("text-xs font-bold", allReady ? "text-white" : "text-gray-500")}>
              Configura y genera
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {allReady ? "Todo listo. Elige opciones y genera." : "Completa los pasos 1 y 2 primero."}
            </p>
          </div>
        </div>

        {allReady && (
          <div className="space-y-3">
            {/* Garment type — quick pick */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-gray-300">
                Que tipo de prenda es?
              </label>
              <div className="space-y-1">
                {GARMENT_TYPES.map((gt) => (
                  <button
                    key={gt.id}
                    type="button"
                    onClick={() => setGarmentType(gt.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all",
                      garmentType === gt.id
                        ? "border-pink-500/40 bg-pink-500/10"
                        : "border-surface-lighter bg-surface-light hover:border-surface-hover"
                    )}
                  >
                    <span className="text-lg shrink-0">{gt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "text-[11px] font-semibold",
                        garmentType === gt.id ? "text-pink-300" : "text-gray-300"
                      )}>
                        {gt.name}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-1">{gt.desc}</span>
                    </div>
                    {gt.badge && (
                      <span className="shrink-0 rounded bg-blue-500/15 px-1.5 py-0.5 text-[8px] font-bold text-blue-400">
                        {gt.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Lingerie/swimwear notice */}
            {isLingerieOrSwimwear && (
              <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                <p className="text-[11px] text-blue-300">
                  Lenceria y swimwear usan <strong>IDM-VTON</strong> automaticamente para mejores resultados.
                </p>
              </div>
            )}

            {/* Category chips */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-gray-300">
                Donde va la prenda?
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all",
                      category === cat.value
                        ? "bg-pink-500/20 text-pink-300 ring-1 ring-pink-500/40"
                        : "bg-surface-light text-gray-400 hover:bg-surface-lighter"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced — Provider selection (collapsed) */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span>Opciones avanzadas (proveedor)</span>
              {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showAdvanced && (
              <div className="space-y-1.5">
                {PROVIDERS.map((prov) => {
                  const isDisabled = isLingerieOrSwimwear && prov.id !== "idm-vton" && prov.id !== "auto";
                  const isSelected = isLingerieOrSwimwear ? prov.id === "idm-vton" : provider === prov.id;

                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => { if (!isDisabled) setProvider(prov.id); }}
                      disabled={isDisabled}
                      className={cn(
                        "w-full flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all",
                        isDisabled
                          ? "border-surface-lighter bg-surface-light/50 opacity-40 cursor-not-allowed"
                          : isSelected
                            ? "border-accent/40 bg-accent/10"
                            : "border-surface-lighter bg-surface-light hover:border-surface-hover"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[11px] font-semibold", isSelected ? "text-accent-light" : "text-gray-300")}>
                            {prov.name}
                          </span>
                          {prov.badge && (
                            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[8px] font-bold text-accent-light">{prov.badge}</span>
                          )}
                        </div>
                        <span className="block text-[10px] text-gray-500 mt-0.5">{prov.desc}</span>
                      </div>
                      <span className={cn("shrink-0 text-[10px] font-mono", isSelected ? "text-accent-light" : "text-gray-500")}>
                        {prov.cost}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Error message */}
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <span className="text-red-400 text-xs shrink-0">Error:</span>
                <p className="text-xs text-red-300">{errorMsg}</p>
                <button type="button" onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-300 text-xs shrink-0">x</button>
              </div>
            )}

            {/* GENERATE BUTTON */}
            <Button
              variant="primary"
              className="w-full !py-3 text-sm"
              onClick={handleGenerate}
              disabled={!allReady || isProcessing}
              loading={isProcessing}
              leftIcon={<Shirt className="h-4 w-4" />}
            >
              {isProcessing ? "Generando..." : "Generar Prueba Virtual"}
            </Button>

            <p className="text-center text-[11px] text-gray-500">
              Costo: <span className="text-emerald-400 font-semibold">{displayCost}</span> por imagen
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TryOnPanel;
