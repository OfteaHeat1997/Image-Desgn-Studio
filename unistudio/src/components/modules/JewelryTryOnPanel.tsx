"use client";

import React, { useState, useCallback } from "react";
import { Gem, AlertCircle, Sparkles, Upload, User, Loader2 } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface JewelryTryOnPanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

type AccessoryType = "earrings" | "necklace" | "ring" | "bracelet" | "sunglasses" | "watch";
type ModelSource = "upload" | "generate";

interface AccessoryDef {
  id: AccessoryType;
  name: string;
  emoji: string;
  hint: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const ACCESSORY_TYPES: AccessoryDef[] = [
  { id: "earrings", name: "Aretes", emoji: "💎", hint: "Rostro visible, de frente o 3/4" },
  { id: "necklace", name: "Collar", emoji: "📿", hint: "Cuello y pecho visibles" },
  { id: "ring", name: "Anillo", emoji: "💍", hint: "Mano visible, dedos extendidos" },
  { id: "bracelet", name: "Pulsera", emoji: "⌚", hint: "Muneca visible y despejada" },
  { id: "sunglasses", name: "Lentes", emoji: "🕶️", hint: "Rostro de frente, ojos visibles" },
  { id: "watch", name: "Reloj", emoji: "⏱️", hint: "Muneca visible y despejada" },
];

const METAL_OPTIONS = [
  { value: "gold", label: "Oro" },
  { value: "silver", label: "Plata" },
  { value: "rose-gold", label: "Oro Rosa" },
  { value: "platinum", label: "Platino" },
];

const FINISH_OPTIONS = [
  { value: "polished", label: "Pulido" },
  { value: "matte", label: "Mate" },
  { value: "brushed", label: "Cepillado" },
  { value: "hammered", label: "Martillado" },
];

const BACKGROUND_OPTIONS = [
  { value: "studio-white", label: "Estudio Blanco" },
  { value: "luxury-dark", label: "Lujo Oscuro" },
  { value: "marble", label: "Marmol" },
  { value: "velvet", label: "Terciopelo" },
  { value: "editorial", label: "Editorial" },
];

const GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
];

const SKIN_TONES = [
  { id: "light", label: "Clara", color: "#FFDBB4" },
  { id: "medium-light", label: "Media Clara", color: "#E8B98A" },
  { id: "medium", label: "Media", color: "#C68642" },
  { id: "medium-dark", label: "Media Oscura", color: "#8D5524" },
  { id: "dark", label: "Oscura", color: "#5C3317" },
];

const AGE_OPTIONS = [
  { value: "18-25", label: "18-25" },
  { value: "26-35", label: "26-35" },
  { value: "36-45", label: "36-45" },
  { value: "46-55", label: "46-55" },
];

/* Detailed professional pose descriptions per accessory type */
const ACCESSORY_POSE: Record<AccessoryType, string> = {
  earrings: "close-up head and shoulders portrait, slight 3/4 angle, ears fully visible, hair pulled back or tucked behind ears, elegant expression, luxury fashion editorial photography, soft studio lighting highlighting the ear area",
  necklace: "elegant upper body portrait showing neck, collarbones and upper chest clearly, wearing a simple v-neck or strapless top, sophisticated pose, luxury jewelry campaign photography, Rembrandt lighting on skin",
  ring: "extreme close-up of an elegant feminine hand with long slender fingers naturally posed, ring finger prominently displayed, soft natural nail polish, luxury jewelry photography on dark velvet surface, shallow depth of field, cinematic lighting",
  bracelet: "close-up of an elegant wrist and forearm, delicate hand gracefully posed, fingers slightly curved, luxury jewelry photography, soft directional lighting highlighting the wrist area, shallow depth of field",
  sunglasses: "head and shoulders portrait facing camera, confident expression, strong jawline, professional fashion photography, studio lighting with subtle reflections",
  watch: "close-up of a confident wrist and forearm, hand relaxed in a natural power pose, sleeve slightly rolled up, luxury lifestyle photography, warm golden hour lighting, shallow depth of field",
};

/* Background prompt modifiers */
const BG_PROMPTS: Record<string, string> = {
  "studio-white": "clean white studio background, professional product photography",
  "luxury-dark": "dark moody luxury background, dramatic lighting, high-end jewelry campaign",
  "marble": "white Carrara marble surface background, luxury still life photography",
  "velvet": "deep burgundy velvet fabric background, luxury jewelry display",
  "editorial": "blurred luxury boutique interior background, editorial fashion photography",
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function JewelryTryOnPanel({ imageFile, onProcess }: JewelryTryOnPanelProps) {
  const [accessoryType, setAccessoryType] = useState<AccessoryType>("necklace");
  const [modelSource, setModelSource] = useState<ModelSource>("generate");

  // Jewelry image uploaded directly from panel (when no editor image)
  const [localJewelryFile, setLocalJewelryFile] = useState<File | null>(null);
  const [localJewelryPreview, setLocalJewelryPreview] = useState<string | null>(null);

  // Manual upload state
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);

  // AI model generator state
  const [gender, setGender] = useState("female");
  const [skinTone, setSkinTone] = useState("medium");
  const [ageRange, setAgeRange] = useState("26-35");
  const [bgStyle, setBgStyle] = useState("luxury-dark");

  // Jewelry style options
  const [metalType, setMetalType] = useState("gold");
  const [finish, setFinish] = useState("polished");

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string>("");
  const [progressPct, setProgressPct] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // The effective jewelry file: editor image takes priority, fallback to local upload
  const effectiveJewelryFile = imageFile ?? localJewelryFile;

  const handleJewelryUpload = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLocalJewelryFile(file);
    setLocalJewelryPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setErrorMsg(null);
  }, []);

  const handleModelUpload = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setModelFile(file);
    setModelImage((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setErrorMsg(null);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!effectiveJewelryFile) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setProgressPct(0);

    try {
      let modelImageUrl: string;
      let modelBeforeUrl: string | undefined;
      let totalCost = 0;

      if (modelSource === "generate") {
        // ---- STEP 1: Generate AI model with professional pose for this accessory ----
        setStatusText("Generando modelo profesional...");
        setProgressPct(10);

        const pose = ACCESSORY_POSE[accessoryType];
        const bgPrompt = BG_PROMPTS[bgStyle] || BG_PROMPTS["luxury-dark"];
        const isHandShot = accessoryType === "ring" || accessoryType === "bracelet" || accessoryType === "watch";

        const modelRes = await fetch("/api/model-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gender,
            ageRange,
            skinTone,
            bodyType: "average",
            pose: isHandShot ? "hand closeup" : "portrait",
            expression: "confident",
            hairStyle: gender === "male" ? "short clean cut" : "natural elegant updo showing ears and neck",
            background: bgStyle,
            customDetails: `${pose}, ${bgPrompt}, NOT wearing any jewelry or accessories, bare skin ready for jewelry placement, 8K ultra-detailed, luxury brand campaign quality`,
          }),
        });
        const modelData = await modelRes.json();
        if (!modelData.success) throw new Error(modelData.error || "Error al generar modelo IA");

        modelImageUrl = modelData.data.url;
        modelBeforeUrl = modelImageUrl;
        totalCost += modelData.data?.cost ?? 0.055;
        setProgressPct(40);
      } else {
        // ---- Manual upload mode ----
        if (!modelFile) throw new Error("Sube una foto del modelo primero");
        setStatusText("Subiendo foto del modelo...");
        setProgressPct(10);

        const modelFormData = new FormData();
        modelFormData.append("file", modelFile);
        const modelUploadRes = await fetch("/api/upload", { method: "POST", body: modelFormData });
        const modelUploadData = await modelUploadRes.json();
        if (!modelUploadData.success) throw new Error(modelUploadData.error || "Error al subir foto del modelo");

        modelImageUrl = modelUploadData.data.url;
        modelBeforeUrl = modelImageUrl;
        setProgressPct(30);
      }

      // ---- STEP 2: Upload jewelry image ----
      setStatusText("Subiendo imagen del accesorio...");
      setProgressPct(50);

      const jewelryFormData = new FormData();
      jewelryFormData.append("file", effectiveJewelryFile);
      const jewelryUploadRes = await fetch("/api/upload", { method: "POST", body: jewelryFormData });
      const jewelryUploadData = await jewelryUploadRes.json();
      if (!jewelryUploadData.success) throw new Error(jewelryUploadData.error || "Error al subir imagen del accesorio");

      // ---- STEP 3: Apply jewelry ----
      setStatusText("Aplicando accesorio con IA — esto puede tomar unos segundos...");
      setProgressPct(70);

      const res = await fetch("/api/jewelry-tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelImage: modelImageUrl,
          jewelryImage: jewelryUploadData.data.url,
          type: accessoryType,
          metalType,
          finish,
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Error en prueba de joyeria");

      totalCost += data.data?.cost ?? 0.05;
      setProgressPct(100);
      setStatusText("Listo!");

      onProcess(data.data.url, modelBeforeUrl, totalCost);
    } catch (error) {
      console.error("Jewelry try-on error:", error);
      setErrorMsg(error instanceof Error ? error.message : "Error en prueba de joyeria.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setStatusText("");
        setProgressPct(0);
      }, 3000);
    }
  }, [effectiveJewelryFile, modelFile, modelSource, accessoryType, gender, skinTone, ageRange, bgStyle, metalType, finish, onProcess]);

  const selectedAccessory = ACCESSORY_TYPES.find((a) => a.id === accessoryType)!;
  const estimatedCost = modelSource === "generate" ? "$0.105" : "$0.05";
  const canProcess = effectiveJewelryFile && (modelSource === "generate" || modelFile);

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={<Gem className="h-4 w-4" />}
        title="Joyeria Virtual"
        description="Muestra tus joyas y accesorios como se verian puestos en una persona real. Sube la foto de tu joya y el sistema genera un modelo IA usandola, o sube tu propia foto de modelo. Funciona con aretes, collares, anillos, pulseras, relojes y lentes."
        whyNeeded="La joyeria en foto plana es dificil de visualizar — los clientes quieren ver como luce puesta. Las fotos con modelo aumentan la confianza del comprador y reducen devoluciones. Con este modulo no necesitas sesion fotografica para cada pieza."
        costLabel={`Desde ${estimatedCost}`}
        steps={[
          "Sube la foto de tu joya al area central del editor",
          "Elige el tipo de accesorio: aretes, collar, anillo, pulsera, reloj o lentes",
          "Elige si generar un modelo IA o subir tu propia foto de modelo",
          "Haz clic en \"Aplicar Accesorio\" — la IA coloca la joya en la posicion correcta",
        ]}
        tips={[
          "Fotografia la joya sobre fondo blanco con buena luz — la IA la entiende mejor asi.",
          "Para anillos y pulseras, la IA genera una foto de mano con la pose correcta.",
          "Para aretes y collares, genera un modelo de rostro/cuello automaticamente.",
          "Prueba diferentes estilos de fondo (Luxury Dark, Marble, etc.) para resaltar tu joya.",
        ]}
      />

      {/* Error card */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="text-[11px] text-red-300 flex-1">{errorMsg}</p>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-300 text-xs shrink-0">✕</button>
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
                "flex flex-col items-center gap-0.5 rounded-lg border p-2 transition-all",
                accessoryType === type.id
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover",
              )}
            >
              <span className="text-lg">{type.emoji}</span>
              <span className="text-[10px] font-medium text-gray-300">{type.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-gray-500">
          Consejo: {selectedAccessory.hint}
        </p>
      </div>

      {/* Jewelry image — from editor OR uploaded directly here */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">Imagen del Accesorio</label>
        {effectiveJewelryFile ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
            <span className="text-lg">{selectedAccessory.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-300 truncate">{effectiveJewelryFile.name}</p>
              <p className="text-[9px] text-gray-500">{(effectiveJewelryFile.size / 1024).toFixed(0)}KB</p>
            </div>
            <span className="text-[9px] text-emerald-400 font-semibold">Listo</span>
            {/* Allow changing if it was a local upload */}
            {!imageFile && localJewelryFile && (
              <button
                type="button"
                onClick={() => { setLocalJewelryFile(null); setLocalJewelryPreview(null); }}
                className="text-[9px] text-gray-500 hover:text-gray-300"
              >
                Cambiar
              </button>
            )}
          </div>
        ) : (
          <Dropzone
            onDrop={handleJewelryUpload}
            multiple={false}
            label="Sube la foto de tu joyeria"
            hint="Collar, aretes, pulsera, anillo, etc."
            className="min-h-[80px]"
          />
        )}
        {localJewelryPreview && !imageFile && (
          <div className="mt-1.5 overflow-hidden rounded-lg border border-surface-lighter">
            <img src={localJewelryPreview} alt="Accesorio" className="w-full aspect-[4/3] object-contain bg-black/20" />
          </div>
        )}
      </div>

      {/* Model source toggle */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">Modelo</label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setModelSource("generate")}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2.5 transition-all",
              modelSource === "generate"
                ? "border-accent bg-accent/10"
                : "border-surface-lighter bg-surface-light hover:border-surface-hover",
            )}
          >
            <Sparkles className={cn("h-4 w-4", modelSource === "generate" ? "text-accent-light" : "text-gray-500")} />
            <div className="text-left">
              <p className={cn("text-[11px] font-semibold", modelSource === "generate" ? "text-accent-light" : "text-gray-300")}>
                Generar IA
              </p>
              <p className="text-[9px] text-gray-500">Automatico</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setModelSource("upload")}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-2.5 transition-all",
              modelSource === "upload"
                ? "border-accent bg-accent/10"
                : "border-surface-lighter bg-surface-light hover:border-surface-hover",
            )}
          >
            <Upload className={cn("h-4 w-4", modelSource === "upload" ? "text-accent-light" : "text-gray-500")} />
            <div className="text-left">
              <p className={cn("text-[11px] font-semibold", modelSource === "upload" ? "text-accent-light" : "text-gray-300")}>
                Subir Foto
              </p>
              <p className="text-[9px] text-gray-500">Manual</p>
            </div>
          </button>
        </div>
      </div>

      {/* AI Model Generator (inline) */}
      {modelSource === "generate" && (
        <div className="space-y-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-accent-light" />
            <span className="text-[11px] font-semibold text-accent-light">Configurar Modelo IA</span>
          </div>

          {/* Gender */}
          <Select
            value={gender}
            onValueChange={setGender}
            options={GENDER_OPTIONS}
            label="Genero"
          />

          {/* Age */}
          <Select
            value={ageRange}
            onValueChange={setAgeRange}
            options={AGE_OPTIONS}
            label="Edad"
          />

          {/* Skin tone swatches */}
          <div>
            <label className="mb-1.5 block text-[10px] font-medium text-gray-400">Tono de Piel</label>
            <div className="flex gap-2">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => setSkinTone(tone.id)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-all",
                    skinTone === tone.id
                      ? "border-accent ring-2 ring-accent/30 scale-110"
                      : "border-transparent hover:border-gray-500",
                  )}
                  style={{ backgroundColor: tone.color }}
                  title={tone.label}
                />
              ))}
            </div>
          </div>

          {/* Background style */}
          <Select
            value={bgStyle}
            onValueChange={setBgStyle}
            options={BACKGROUND_OPTIONS}
            label="Estilo de Fondo"
          />

          <p className="text-[9px] text-gray-500">
            Se generara un modelo {gender === "male" ? "masculino" : "femenino"} con pose ideal para {selectedAccessory.name.toLowerCase()}.
          </p>
        </div>
      )}

      {/* Metal & Finish options */}
      <div className="space-y-3 rounded-lg border border-surface-lighter bg-surface-light/50 p-3">
        <div className="flex items-center gap-1.5">
          <Gem className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold text-gray-300">Estilo de Joyeria</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={metalType}
            onValueChange={setMetalType}
            options={METAL_OPTIONS}
            label="Metal"
          />
          <Select
            value={finish}
            onValueChange={setFinish}
            options={FINISH_OPTIONS}
            label="Acabado"
          />
        </div>
      </div>

      {/* Manual upload */}
      {modelSource === "upload" && (
        <div>
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
              hint="Foto que muestre donde colocar el accesorio"
              className="min-h-[100px]"
            />
          )}
        </div>
      )}

      {/* Progress bar */}
      {isProcessing && (
        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-lighter">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-center text-[10px] text-gray-400 animate-pulse">{statusText}</p>
        </div>
      )}

      {/* Cost indicator */}
      <div className="rounded-lg border border-surface-lighter bg-surface px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500">Costo estimado</span>
          <span className="text-[11px] text-emerald-400 font-semibold">{estimatedCost}</span>
        </div>
        {modelSource === "generate" && (
          <p className="text-[9px] text-gray-600 mt-0.5">
            Incluye generacion de modelo ($0.055) + prueba de joyeria ($0.05)
          </p>
        )}
      </div>

      {/* Process button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleProcess}
        disabled={!canProcess || isProcessing}
        loading={isProcessing}
        leftIcon={<Gem className="h-4 w-4" />}
      >
        {isProcessing
          ? statusText || "Procesando..."
          : modelSource === "generate"
            ? `Generar Modelo + Aplicar ${selectedAccessory.name}`
            : `Aplicar ${selectedAccessory.name}`
        }
      </Button>

      {!effectiveJewelryFile && !isProcessing && (
        <p className="text-center text-[10px] text-amber-400/80">
          Sube una imagen del accesorio arriba para comenzar.
        </p>
      )}

      {/* Status after completion */}
      {!isProcessing && statusText && !errorMsg && (
        <p className="text-center text-xs text-emerald-400">
          {statusText}
        </p>
      )}
    </div>
  );
}

export default JewelryTryOnPanel;
