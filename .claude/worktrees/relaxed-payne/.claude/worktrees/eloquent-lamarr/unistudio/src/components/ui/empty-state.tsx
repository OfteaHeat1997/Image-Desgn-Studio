"use client";

import React from "react";
import {
  Upload,
  Scissors,
  Image as ImageIcon,
  Sparkles,
  Sun,
  Expand,
  Eraser,
  CheckCircle,
  Shirt,
  User,
  Ghost,
  Gem,
  Film,
  Megaphone,
  Wand2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Module metadata for empty states                                    */
/* ------------------------------------------------------------------ */

interface ModuleMeta {
  icon: React.ElementType;
  title: string;
  hint: string;
}

const MODULE_META: Record<string, ModuleMeta> = {
  "bg-remove": {
    icon: Scissors,
    title: "Quitar Fondo",
    hint: "Elimina el fondo de tu producto para obtener un PNG transparente o con fondo de color.",
  },
  "bg-generate": {
    icon: ImageIcon,
    title: "Fondos con IA",
    hint: "Coloca tu producto sobre escenas profesionales generadas por IA.",
  },
  enhance: {
    icon: Sparkles,
    title: "Mejorar Calidad",
    hint: "Ajusta brillo, contraste y nitidez para lograr calidad profesional.",
  },
  shadows: {
    icon: Sun,
    title: "Sombras e Iluminacion",
    hint: "Agrega sombras realistas para dar profundidad a tu producto.",
  },
  outpaint: {
    icon: Expand,
    title: "Extender Imagen",
    hint: "Expande los bordes de tu imagen para adaptarla a cualquier formato.",
  },
  inpaint: {
    icon: Eraser,
    title: "Borrar y Reemplazar",
    hint: "Elimina objetos no deseados o cambia colores con IA.",
  },
  compliance: {
    icon: CheckCircle,
    title: "Verificar Marketplace",
    hint: "Verifica que tu foto cumpla los requisitos de Amazon, Shopify, etc.",
  },
  tryon: {
    icon: Shirt,
    title: "Prueba Virtual",
    hint: "Coloca tu prenda sobre un modelo virtual.",
  },
  "ghost-mannequin": {
    icon: Ghost,
    title: "Maniqui Invisible",
    hint: "Elimina el maniqui de fotos de ropa para el efecto hollow-man.",
  },
  "jewelry-tryon": {
    icon: Gem,
    title: "Joyeria Virtual",
    hint: "Prueba joyeria sobre fotos de modelos.",
  },
  video: {
    icon: Film,
    title: "Video Studio",
    hint: "Convierte tu foto en un video animado para redes sociales.",
  },
  "ad-creator": {
    icon: Megaphone,
    title: "Crear Anuncios",
    hint: "Genera videos publicitarios para cada plataforma.",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  module: string;
}

export function EmptyState({ module }: EmptyStateProps) {
  const meta = MODULE_META[module];
  const Icon = meta?.icon ?? Upload;

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 mb-4">
        <Icon className="h-7 w-7 text-accent-light/60" />
      </div>

      <h4 className="text-sm font-semibold text-gray-300 mb-1.5">
        {meta?.title ?? "Modulo"}
      </h4>

      <p className="text-[11px] text-gray-500 leading-relaxed mb-4 max-w-[200px]">
        {meta?.hint ?? "Sube una imagen para comenzar."}
      </p>

      <div className="flex items-center gap-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 px-4 py-3">
        <Upload className="h-4 w-4 text-accent-light/50 shrink-0" />
        <div className="text-left">
          <p className="text-[11px] font-medium text-accent-light/80">
            Sube una imagen para comenzar
          </p>
          <p className="text-[9px] text-gray-500">
            Arrastra al area central o haz clic para seleccionar
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmptyState;
