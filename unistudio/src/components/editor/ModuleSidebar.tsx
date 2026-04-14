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
  SlidersHorizontal,
  Package,
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
  color: string;
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
    name: "📸 PREPARAR FOTO",
    color: "#50C878",
    modules: [
      { id: "bg-remove", label: "Quitar Fondo", icon: Scissors, cost: "Gratis", description: "Elimina el fondo de tu producto" },
      { id: "bg-generate", label: "Fondos con IA", icon: ImageIcon, cost: "$0.003-$0.05", description: "Reemplaza el fondo con escenas profesionales" },
      { id: "enhance", label: "Mejorar Calidad", icon: Sparkles, cost: "Gratis", description: "Ajusta brillo, color, nitidez — Gratis" },
      { id: "inpaint", label: "Borrar y Reemplazar", icon: Eraser, cost: "$0.03-$0.05", description: "Borra objetos, cambia colores, retoca" },
      { id: "upscale", label: "Aumentar Resolucion", icon: ZoomIn, cost: "$0.02-$0.05", description: "Haz tu imagen más grande sin perder calidad" },
    ],
  },
  {
    name: "👗 MODELOS Y MODA",
    color: "#F5A623",
    modules: [
      { id: "tryon", label: "Prueba Virtual", icon: Shirt, cost: "$0.02-$0.05", description: "Pon tu prenda en una modelo virtual" },
      { id: "model-create", label: "Crear Modelo IA", icon: User, cost: "$0.055", description: "Genera una modelo personalizada" },
      { id: "ghost-mannequin", label: "Maniqui Invisible", icon: Ghost, cost: "$0.05", description: "Efecto ghost mannequin profesional" },
      { id: "jewelry-tryon", label: "Joyeria Virtual", icon: Gem, cost: "$0.05", description: "Exhibe tu joyería en stands o modelos" },
    ],
  },
  {
    name: "🎥 VIDEO Y ADS",
    color: "#E06BDF",
    modules: [
      { id: "video", label: "Estudio de Video", icon: Film, cost: "$0-$0.35", description: "Convierte fotos en videos profesionales" },
      { id: "ad-creator", label: "Crear Anuncios", icon: Megaphone, cost: "$0.04-$0.35", description: "Videos para Instagram, TikTok, Facebook" },
      { id: "ai-prompt", label: "Director Creativo IA", icon: Wand2, cost: "Gratis-$0.003", description: "El AI te sugiere 4 conceptos profesionales" },
    ],
  },
  {
    name: "🤖 AUTOMATIZACIÓN",
    color: "#A78BFA",
    modules: [
      { id: "ai-agent", label: "Agente IA (Auto)", icon: Bot, cost: "Variable", description: "El AI decide los pasos y ejecuta todo" },
      { id: "batch", label: "Procesamiento Masivo", icon: Layers, cost: "Variable", description: "Procesa 50+ imágenes con un pipeline" },
      { id: "brand-kit", label: "Kit de Marca", icon: Palette, cost: "Gratis", description: "Tu logo, colores, y watermark" },
      { id: "catalog-pipeline", label: "Pipeline de Catálogo", icon: Package, cost: "$0.18+/ref", description: "Genera todo el contenido de e-commerce para una referencia en un clic" },
    ],
  },
  {
    name: "⚙️ HERRAMIENTAS",
    color: "#5B9CF6",
    modules: [
      { id: "shadows", label: "Agregar Sombra", icon: Sun, cost: "Gratis", description: "Agrega sombras y luces profesionales" },
      { id: "outpaint", label: "Extender Imagen", icon: Expand, cost: "$0.05", description: "Adapta tu foto a Instagram, TikTok, etc." },
      { id: "compliance", label: "Verificar", icon: CheckCircle, cost: "Gratis", description: "¿Tu imagen cumple para Amazon? ¿Shopify?" },
      { id: "smart-editor", label: "Editor Avanzado", icon: SlidersHorizontal, cost: "Gratis", description: "Edita manualmente con herramientas pro" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ModuleSidebar({ selectedModule, onModuleChange }: ModuleSidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="hidden md:flex flex-col h-full border-r bg-[var(--bg-surface)] w-60 shrink-0" style={{ borderColor: "var(--border-default)" }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
        <a href="/" className="text-base font-bold text-gradient hover:opacity-80 transition-opacity" title="Volver al Dashboard">
          UniStudio
        </a>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Editor</span>
      </div>

      {/* Module list */}
      <nav className="flex-1 overflow-y-auto py-2 no-scrollbar">
        {MODULE_CATEGORIES.map((cat) => {
          const isCollapsed = collapsed[cat.name] ?? false;
          const hasSelected = cat.modules.some((m) => m.id === selectedModule);

          return (
            <div key={cat.name} className="mb-1">
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.name)}
                className="flex w-full items-center gap-2 px-4 py-2 transition-colors hover:bg-white/[0.03]"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3 shrink-0" style={{ color: cat.color }} />
                ) : (
                  <ChevronDown className="h-3 w-3 shrink-0" style={{ color: cat.color }} />
                )}
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: hasSelected && isCollapsed ? cat.color : "var(--text-secondary)" }}
                >
                  {cat.name}
                </span>
                <div className="flex-1 h-px ml-1" style={{ background: `${cat.color}20` }} />
              </button>

              {/* Modules */}
              {!isCollapsed && (
                <div className="space-y-0.5 px-2">
                  {cat.modules.map((mod) => {
                    const Icon = mod.icon;
                    const isActive = selectedModule === mod.id;

                    // Standalone pages — navigate instead of loading in editor
                    const STANDALONE_PAGES: Record<string, string> = {
                      "catalog-pipeline": "/catalog-pipeline",
                    };
                    const standaloneHref = STANDALONE_PAGES[mod.id];

                    return (
                      <button
                        key={mod.id}
                        type="button"
                        title={mod.description}
                        aria-label={`${mod.label} — ${mod.description}`}
                        onClick={() => standaloneHref ? window.location.assign(standaloneHref) : onModuleChange(mod.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all group",
                          isActive
                            ? "text-white"
                            : "hover:bg-white/[0.04]",
                        )}
                        style={isActive ? {
                          background: `${cat.color}18`,
                          border: `1px solid ${cat.color}30`,
                        } : {
                          border: "1px solid transparent",
                        }}
                      >
                        <Icon
                          className="h-4 w-4 shrink-0 transition-colors"
                          style={{ color: isActive ? cat.color : "var(--text-muted)" }}
                        />
                        <span className="flex-1 min-w-0">
                          <span className={cn(
                            "block text-[13px] font-medium truncate transition-colors",
                            isActive ? "text-white" : "text-[var(--text-secondary)] group-hover:text-white",
                          )}>
                            {mod.label}
                          </span>
                          <span className="text-[10px] text-zinc-500 block mt-0.5 leading-tight truncate">
                            {mod.description}
                          </span>
                        </span>
                        <span
                          className="shrink-0 text-[10px] font-bold"
                          style={{
                            color: mod.cost === "Gratis" || mod.cost.startsWith("Gratis")
                              ? "#50C878"
                              : "var(--text-muted)",
                          }}
                        >
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

      {/* Quick links */}
      <div className="p-2 space-y-0.5" style={{ borderTop: "1px solid var(--border-default)" }}>
        <a
          href="/gallery"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all hover:bg-white/[0.04]"
          style={{ color: "var(--text-secondary)" }}
        >
          <ImageIcon className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          Galeria
        </a>
        <a
          href="/batch"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all hover:bg-white/[0.04]"
          style={{ color: "var(--text-secondary)" }}
        >
          <Layers className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          Batch Masivo
        </a>
        <a
          href="/catalog-pipeline"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all hover:bg-white/[0.04]"
          style={{ color: "var(--text-secondary)" }}
        >
          <Package className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          Pipeline Catálogo
        </a>
      </div>
    </div>
  );
}

export default ModuleSidebar;
