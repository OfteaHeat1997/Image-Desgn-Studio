"use client";

import React, { useState } from "react";
import {
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
  Bot,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  Layers,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ModuleItem {
  id: string;
  label: string;
  icon: React.ElementType;
  cost: string;
  description: string;
}

interface ModuleCategory {
  name: string;
  modules: ModuleItem[];
}

interface ModuleSidebarProps {
  selectedModule: string;
  onModuleChange: (module: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Module data                                                         */
/* ------------------------------------------------------------------ */

const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    name: "FONDOS",
    modules: [
      { id: "bg-remove", label: "Quitar Fondo", icon: Scissors, cost: "Gratis-$0.01", description: "Elimina el fondo de cualquier foto de producto" },
      { id: "bg-generate", label: "Fondos con IA", icon: ImageIcon, cost: "$0.003-$0.05", description: "Reemplaza el fondo con escenas profesionales" },
    ],
  },
  {
    name: "MEJORA",
    modules: [
      { id: "enhance", label: "Mejorar Calidad", icon: Sparkles, cost: "Gratis", description: "Ajusta brillo, contraste, nitidez y color" },
      { id: "upscale", label: "Aumentar Resolucion", icon: ZoomIn, cost: "$0.02-$0.05", description: "Agranda tu imagen 2x o 4x sin perder calidad" },
      { id: "shadows", label: "Sombras e Iluminacion", icon: Sun, cost: "Gratis-$0.05", description: "Agrega sombras realistas y cambia iluminacion" },
      { id: "outpaint", label: "Extender Imagen", icon: Expand, cost: "$0.05", description: "Expande los bordes para cualquier formato" },
    ],
  },
  {
    name: "EDICION",
    modules: [
      { id: "inpaint", label: "Borrar y Reemplazar", icon: Eraser, cost: "$0.03-$0.05", description: "Elimina objetos o cambia colores con IA" },
      { id: "compliance", label: "Verificar Marketplace", icon: CheckCircle, cost: "Gratis", description: "Verifica requisitos de Amazon, Shopify, Etsy" },
    ],
  },
  {
    name: "MODELOS",
    modules: [
      { id: "tryon", label: "Prueba Virtual", icon: Shirt, cost: "$0.02-$0.05", description: "Coloca tu prenda sobre un modelo virtual" },
      { id: "model-create", label: "Crear Modelo IA", icon: User, cost: "$0.055", description: "Genera modelos virtuales personalizables" },
      { id: "ghost-mannequin", label: "Maniqui Invisible", icon: Ghost, cost: "$0.05-$0.08", description: "Elimina el maniqui de fotos de ropa" },
      { id: "jewelry-tryon", label: "Joyeria Virtual", icon: Gem, cost: "$0.05", description: "Prueba joyeria sobre fotos de modelos" },
    ],
  },
  {
    name: "CONTENIDO",
    modules: [
      { id: "video", label: "Estudio de Video", icon: Film, cost: "$0-$0.35", description: "Convierte fotos en videos para redes sociales" },
      { id: "ad-creator", label: "Crear Anuncios", icon: Megaphone, cost: "$0.04-$0.35", description: "Genera videos publicitarios por plataforma" },
      { id: "ai-prompt", label: "Director Creativo IA", icon: Wand2, cost: "Gratis-$0.003", description: "La IA sugiere conceptos creativos" },
    ],
  },
  {
    name: "GESTION",
    modules: [
      { id: "batch", label: "Procesamiento Masivo", icon: Layers, cost: "Variable", description: "Procesa multiples imagenes con la misma secuencia" },
      { id: "brand-kit", label: "Kit de Marca", icon: Palette, cost: "Gratis", description: "Colores, fuentes, logo y marca de agua de tu marca" },
    ],
  },
  {
    name: "AUTOMATIZACION",
    modules: [
      { id: "ai-agent", label: "Agente IA (Auto)", icon: Bot, cost: "Variable", description: "Describe lo que quieres, el agente lo hace" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ModuleSidebar({ selectedModule, onModuleChange }: ModuleSidebarProps) {
  // All categories start expanded
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="flex flex-col h-full border-r border-surface-lighter bg-surface w-56 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-surface-lighter px-3 py-2.5">
        <a href="/" className="text-sm font-bold text-gradient">UniStudio</a>
        <span className="text-[9px] text-gray-600 uppercase tracking-wider">Modulos</span>
      </div>

      {/* Module list */}
      <nav className="flex-1 overflow-y-auto py-1 no-scrollbar">
        {MODULE_CATEGORIES.map((cat) => {
          const isCollapsed = collapsed[cat.name] ?? false;
          const hasSelected = cat.modules.some((m) => m.id === selectedModule);

          return (
            <div key={cat.name} className="mb-0.5">
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.name)}
                className={cn(
                  "flex w-full items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors",
                  hasSelected && isCollapsed
                    ? "text-accent-light"
                    : "text-gray-500 hover:text-gray-400",
                )}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                ) : (
                  <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                )}
                {cat.name}
              </button>

              {/* Modules */}
              {!isCollapsed && (
                <div className="space-y-px px-1">
                  {cat.modules.map((mod) => {
                    const Icon = mod.icon;
                    const isActive = selectedModule === mod.id;

                    return (
                      <button
                          key={mod.id}
                          type="button"
                          title={mod.description}
                          aria-label={`${mod.label} — ${mod.description}`}
                          onClick={() => onModuleChange(mod.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-all group",
                            isActive
                              ? "bg-accent/15 text-accent-light"
                              : "text-gray-400 hover:bg-surface-light hover:text-gray-200",
                          )}
                        >
                          <Icon className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isActive ? "text-accent-light" : "text-gray-500 group-hover:text-gray-400",
                          )} />
                          <span className="flex-1 text-[11px] font-medium truncate">
                            {mod.label}
                          </span>
                          <span className={cn(
                            "shrink-0 text-[8px] font-semibold",
                            mod.cost === "Gratis" || mod.cost.startsWith("Gratis")
                              ? "text-emerald-500"
                              : "text-gray-600",
                          )}>
                            {mod.cost}
                          </span>
                        </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export default ModuleSidebar;
