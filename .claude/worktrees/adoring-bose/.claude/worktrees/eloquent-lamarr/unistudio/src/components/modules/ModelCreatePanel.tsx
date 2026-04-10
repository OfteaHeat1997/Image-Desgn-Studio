"use client";

import React, { useState, useCallback } from "react";
import { User, AlertCircle } from "lucide-react";
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
  { id: "standing", name: "De Pie", icon: "||" },
  { id: "three-quarter", name: "Vista 3/4", icon: "/|" },
  { id: "walking", name: "Caminando", icon: "/\\" },
  { id: "sitting", name: "Sentado/a", icon: "_|" },
  { id: "dynamic", name: "Dinamica", icon: "^/" },
  { id: "casual", name: "Casual", icon: "~|" },
];

const EXPRESSION_OPTIONS = [
  { value: "neutral", label: "Neutral" },
  { value: "smile", label: "Sonrisa" },
  { value: "serious", label: "Seria" },
  { value: "confident", label: "Segura" },
  { value: "relaxed", label: "Relajada" },
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
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
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Error al crear modelo");
      onProcess(data.data.url, undefined, data.data.cost);
    } catch (error) {
      console.error("Model creation error:", error);
      setErrorMsg(error instanceof Error ? error.message : "Error al crear modelo");
    } finally {
      setIsProcessing(false);
    }
  }, [gender, age, skinTone, bodyType, pose, expression, hairStyle, additionalDesc, onProcess]);

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<User className="h-4 w-4" />}
        title="Crear Modelo IA"
        description="Genera un modelo fotorrealista personalizado para tu marca. Elige genero, edad, tono de piel, tipo de cuerpo, pose y expresion — sin contratar modelos ni fotografos."
        whyNeeded="Diversifica tu catalogo con modelos de todas las etnias sin sesion fotografica."
        costLabel="$0.055/img"
        steps={[
          "Configura las caracteristicas del modelo: genero, edad, tono de piel",
          "Elige tipo de cuerpo, pose y expresion facial",
          "Opcionalmente, sube una imagen de referencia de tu prenda",
          "Haz clic en \"Generar Modelo\" para crear la foto",
        ]}
        tips={[
          "Puedes usar el modelo generado en el modulo Try-On para vestirlo con tu prenda.",
          "Los modelos con pose \"frontal\" funcionan mejor para pruebas virtuales de ropa.",
          "Para consistencia de marca, guarda los parametros de tu modelo favorito.",
          "Cada generacion produce un modelo unico — genera varios para elegir el mejor.",
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
        <div className="grid grid-cols-3 gap-1.5">
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
        {isProcessing ? "Generando Modelo..." : "Generar Modelo ($0.055)"}
      </Button>

    </div>
  );
}

export default ModelCreatePanel;
