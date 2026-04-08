"use client";

import React, { useState, useCallback } from "react";
import { safeJson } from "@/lib/utils/safe-json";
import { User, AlertCircle, ImageIcon, Shirt } from "lucide-react";
import { ModuleHeader } from "@/components/ui/module-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ModelCreatePanelProps {
  imageFile: File | null;
  onProcess: (result: string, beforeImage?: string, cost?: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "non-binary", label: "No binario" },
];

const AGE_OPTIONS = [
  { value: "18-25", label: "18-25 anios" },
  { value: "25-35", label: "25-35 anios" },
  { value: "35-45", label: "35-45 anios" },
  { value: "45-55", label: "45-55 anios" },
  { value: "55+", label: "55+ anios" },
];

const BODY_TYPE_OPTIONS = [
  { value: "slim", label: "Delgado" },
  { value: "athletic", label: "Atletico" },
  { value: "average", label: "Promedio" },
  { value: "curvy", label: "Curvilíneo" },
  { value: "plus-size", label: "Talla grande" },
];

const SKIN_TONES = [
  { id: "light", color: "#f5d5c8", label: "Claro" },
  { id: "medium-light", color: "#ddb89e", label: "Medio claro" },
  { id: "medium", color: "#c19a6b", label: "Medio" },
  { id: "medium-dark", color: "#8d5524", label: "Medio oscuro" },
  { id: "dark", color: "#4a2c1a", label: "Oscuro" },
];

interface PoseDef {
  id: string;
  name: string;
  icon: string;
}

const POSES: PoseDef[] = [
  { id: "standing", name: "Frontal", icon: "||" },
  { id: "back-view", name: "Espalda", icon: ")(", },
  { id: "side-left", name: "Lateral Izq", icon: "|>" },
  { id: "side-right", name: "Lateral Der", icon: "<|" },
  { id: "three-quarter", name: "Vista 3/4", icon: "/|" },
  { id: "walking", name: "Caminando", icon: "/\\" },
  { id: "sitting", name: "Sentado/a", icon: "_|" },
  { id: "dynamic", name: "Dinamica", icon: "^/" },
  { id: "casual", name: "Casual", icon: "~|" },
  { id: "arms-up", name: "Brazos Arriba", icon: "^|^" },
  { id: "hands-hips", name: "Manos Cadera", icon: ">{<" },
];

const EXPRESSION_OPTIONS = [
  { value: "neutral", label: "Neutral" },
  { value: "smile", label: "Sonrisa" },
  { value: "serious", label: "Seria" },
  { value: "confident", label: "Segura" },
  { value: "relaxed", label: "Relajada" },
];

const GARMENT_CATEGORY_OPTIONS = [
  { value: "tops", label: "Superior (blusas, brasieres, tops)" },
  { value: "bottoms", label: "Inferior (pantalones, faldas)" },
  { value: "dresses", label: "Vestidos / Enterizos" },
];

const GARMENT_TYPE_OPTIONS = [
  { value: "general", label: "Ropa general" },
  { value: "lingerie", label: "Lenceria / Ropa interior" },
  { value: "swimwear", label: "Traje de bano / Bikini" },
  { value: "bodysuit", label: "Body / Enterizo" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ModelCreatePanel({ imageFile, onProcess }: ModelCreatePanelProps) {
  const [gender, setGender] = useState("female");
  const [age, setAge] = useState("25-35");
  const [skinTone, setSkinTone] = useState("medium");
  const [bodyType, setBodyType] = useState("average");
  const [pose, setPose] = useState("standing");
  const [expression, setExpression] = useState("neutral");
  const [hairStyle, setHairStyle] = useState("");
  const [additionalDesc, setAdditionalDesc] = useState("");
  const [garmentCategory, setGarmentCategory] = useState("tops");
  const [garmentType, setGarmentType] = useState("lingerie");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasGarment = !!imageFile;

  const handleGenerate = useCallback(async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      let garmentImageUrl: string | undefined;

      // If user uploaded a garment image, upload it first
      if (imageFile) {
        setProcessingStep("Subiendo imagen de prenda...");
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await safeJson(uploadRes);
        if (!uploadData.success) throw new Error(uploadData.error || "Error al subir imagen de prenda");
        garmentImageUrl = uploadData.data.url;
      }

      setProcessingStep(garmentImageUrl ? "Generando modelo base..." : "Generando modelo...");

      const res = await fetch("/api/model-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          ageRange: age,
          skinTone,
          bodyType,
          pose,
          expression,
          hairStyle: hairStyle || undefined,
          customDetails: additionalDesc || undefined,
          garmentImage: garmentImageUrl,
          garmentCategory: garmentImageUrl ? garmentCategory : undefined,
          garmentType: garmentImageUrl ? garmentType : undefined,
        }),
      });

      if (garmentImageUrl) {
        setProcessingStep("Aplicando prenda al modelo (Virtual Try-On)...");
      }

      const data = await safeJson(res);

      if (!data.success) throw new Error(data.error || "Error al crear modelo");
      onProcess(data.data.url, data.data.baseModelUrl, data.data.cost);
    } catch (error) {
      console.error("Model creation error:", error);
      const msg = error instanceof Error ? error.message : "Error al crear modelo";
      if (msg.includes("flagged as sensitive") || msg.includes("E005")) {
        setErrorMsg("El filtro de contenido bloqueo la generacion. Intenta cambiar el tipo de cuerpo o la pose. El sistema reintenta automaticamente con un prompt mas seguro.");
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  }, [gender, age, skinTone, bodyType, pose, expression, hairStyle, additionalDesc, imageFile, garmentCategory, garmentType, onProcess]);

  // Cost depends on whether garment will be applied
  const estimatedCost = hasGarment ? "$0.075 - $0.105" : "$0.055";

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<User className="h-4 w-4" />}
        title="Crear Modelo IA"
        description="Genera una persona fotorrealista para mostrar tu producto puesto. Elige genero, edad, tono de piel, tipo de cuerpo, pose y expresion. La IA crea un modelo unico en segundos — sin contratar modelos, fotografos ni estudio."
        whyNeeded="Contratar un modelo real cuesta $200-500 por sesion. Con este modulo, generas modelos diversos (diferentes etnias, edades, tipos de cuerpo) por $0.055 cada uno. Ideal para lenceria, ropa, accesorios y cosmeticos. Puedes crear un catalogo completo en minutos."
        costLabel="$0.055/img"
        steps={[
          "Elige genero, rango de edad y tono de piel del modelo",
          "Configura tipo de cuerpo, pose y expresion facial",
          "Opcionalmente sube tu prenda — el modelo aparecera vistiendo la",
          "Haz clic en \"Generar Modelo\" y en ~15 segundos tendras la foto",
        ]}
        tips={[
          "Para lenceria/ropa: sube la foto de la prenda y el modelo aparecera vistiendo la automaticamente.",
          "Pose \"frontal\" es la mejor para pruebas virtuales y catalogos de e-commerce.",
          "Genera 3-4 modelos diferentes y elige el mejor — cada uno es unico.",
          "Puedes usar el modelo generado despues en \"Prueba Virtual\" para ponerle mas prendas encima.",
        ]}
      />

      {/* Gender */}
      <Select
        label="Genero"
        value={gender}
        onValueChange={setGender}
        options={GENDER_OPTIONS}
      />

      {/* Age Range */}
      <Select
        label="Rango de Edad"
        value={age}
        onValueChange={setAge}
        options={AGE_OPTIONS}
      />

      {/* Skin Tone */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Tono de Piel
        </label>
        <div className="flex gap-2">
          {SKIN_TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => setSkinTone(tone.id)}
              className={cn(
                "h-9 w-9 rounded-lg border-2 transition-all",
                skinTone === tone.id
                  ? "border-accent scale-110 shadow-md"
                  : "border-surface-lighter hover:border-surface-hover",
              )}
              style={{ backgroundColor: tone.color }}
              title={tone.label}
            />
          ))}
        </div>
      </div>

      {/* Body Type */}
      <Select
        label="Tipo de Cuerpo"
        value={bodyType}
        onValueChange={setBodyType}
        options={BODY_TYPE_OPTIONS}
      />

      {/* Pose */}
      <div>
        <label className="mb-2 block text-xs font-medium text-gray-400">
          Pose
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {POSES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPose(p.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-2 transition-all",
                pose === p.id
                  ? "border-accent bg-accent/10"
                  : "border-surface-lighter bg-surface-light hover:border-surface-hover",
              )}
            >
              <span className="font-mono text-sm text-gray-400">{p.icon}</span>
              <span className="text-[9px] text-gray-400">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expression */}
      <Select
        label="Expresion"
        value={expression}
        onValueChange={setExpression}
        options={EXPRESSION_OPTIONS}
      />

      {/* Hair Style */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          Estilo de Cabello
        </label>
        <input
          type="text"
          value={hairStyle}
          onChange={(e) => setHairStyle(e.target.value)}
          placeholder="ej. Cabello largo castaño, cola de caballo..."
          className="h-9 w-full rounded-lg border border-surface-lighter bg-surface-light px-3 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
        />
      </div>

      {/* Additional description */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-400">
          Descripcion Adicional
        </label>
        <textarea
          value={additionalDesc}
          onChange={(e) => setAdditionalDesc(e.target.value)}
          placeholder="Otros detalles para el modelo, ej. maquillaje natural, look playero..."
          rows={2}
          className="w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors resize-none"
        />
      </div>

      {/* Garment image info */}
      {hasGarment && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-accent">Prenda detectada — se aplicara al modelo</span>
          </div>
          <p className="text-[10px] text-gray-400">
            La prenda de tu imagen se vestira automaticamente en el modelo generado usando Virtual Try-On.
          </p>
          <Select
            label="Categoria de prenda"
            value={garmentCategory}
            onValueChange={setGarmentCategory}
            options={GARMENT_CATEGORY_OPTIONS}
          />
          <Select
            label="Tipo de prenda"
            value={garmentType}
            onValueChange={setGarmentType}
            options={GARMENT_TYPE_OPTIONS}
          />
        </div>
      )}

      {!hasGarment && (
        <div className="flex items-start gap-2 rounded-lg border border-surface-lighter bg-surface-light p-3">
          <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <p className="text-[10px] text-gray-400">
            Sube una imagen de tu prenda en el canvas para que el modelo la use automaticamente. Sin imagen, se genera solo el modelo base.
          </p>
        </div>
      )}

      {/* Inline error card */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{errorMsg}</p>
        </div>
      )}

      {/* Generate button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleGenerate}
        disabled={isProcessing}
        loading={isProcessing}
        leftIcon={<User className="h-4 w-4" />}
      >
        {isProcessing
          ? processingStep || "Generando Modelo..."
          : hasGarment
            ? `Generar Modelo + Vestir (${estimatedCost})`
            : "Generar Modelo ($0.055)"}
      </Button>

    </div>
  );
}

export default ModelCreatePanel;
