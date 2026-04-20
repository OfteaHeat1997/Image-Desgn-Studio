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
  /** Concrete example a non-technical user can picture. Shown on hover. */
  example?: string;
  /** When this module is the right choice. Shown on hover. */
  useWhen?: string;
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
    name: "PREPARAR FOTO",
    color: "#50C878",
    modules: [
      {
        id: "bg-remove",
        label: "Quitar Fondo",
        icon: Scissors,
        cost: "Gratis",
        description: "Deja tu producto sobre fondo transparente",
        example: "Un brasier que está sobre una mesa → brasier sin la mesa",
        useWhen: "Quieres el producto solo, sin fondo, para ponerlo en otro fondo después",
      },
      {
        id: "bg-generate",
        label: "Poner un Fondo Nuevo",
        icon: ImageIcon,
        cost: "$0.003-$0.05",
        description: "Reemplaza el fondo con un escenario profesional",
        example: "Tu brasier → en una playa, o estudio blanco, o mármol de lujo",
        useWhen: "Ya quitaste el fondo y necesitas uno bonito",
      },
      {
        id: "enhance",
        label: "Mejorar Calidad",
        icon: Sparkles,
        cost: "Gratis",
        description: "Brillo, color, nitidez automáticos",
        example: "Foto oscura o apagada → foto profesional clarita",
        useWhen: "La foto se ve opaca, muy oscura o con colores apagados",
      },
      {
        id: "inpaint",
        label: "Borrador Mágico",
        icon: Eraser,
        cost: "$0.03-$0.05",
        description: "Borra objetos o cambia el color de una zona",
        example: "Hay un watermark de Leonisa o una etiqueta → se borra. O: cambiar el color del brasier de rojo a negro",
        useWhen: "Quieres eliminar algo puntual (logo, tag, mancha) o cambiar un color",
      },
      {
        id: "upscale",
        label: "Subir Resolución HD",
        icon: ZoomIn,
        cost: "$0.02-$0.05",
        description: "Haz la foto más grande sin perder detalle",
        example: "Foto de 500x500px → 2000x2000px con la misma nitidez",
        useWhen: "Necesitas la foto para impresión o Amazon pide mínimo 1000px",
      },
    ],
  },
  {
    name: "MODELOS Y MODA",
    color: "#F5A623",
    modules: [
      {
        id: "tryon",
        label: "Vestir una Modelo",
        icon: Shirt,
        cost: "$0.02-$0.05",
        description: "Pone tu prenda sobre una modelo virtual",
        example: "Foto de un brasier + foto de una modelo → la modelo con tu brasier puesto",
        useWhen: "Tienes la prenda aislada y una modelo lista — quieres juntar ambas",
      },
      {
        id: "model-create",
        label: "Crear una Modelo Nueva",
        icon: User,
        cost: "$0.055",
        description: "Genera una modelo IA (libre de copyright)",
        example: "Escoges: mujer, piel media, 25 años, pose frontal → foto de esa persona creada por IA",
        useWhen: "Necesitas una modelo original que NO esté en ninguna otra tienda",
      },
      {
        id: "ghost-mannequin",
        label: "Quitar Maniquí (Ghost)",
        icon: Ghost,
        cost: "$0.05",
        description: "La prenda queda 'flotando' en 3D sin maniquí",
        example: "Un brasier puesto en un maniquí blanco → solo el brasier con la forma del cuerpo conservada",
        useWhen: "La prenda está en maniquí (NO en modelo) y quieres el efecto 'ghost mannequin' de catálogo",
      },
      {
        id: "jewelry-tryon",
        label: "Joyería en Modelo o Stand",
        icon: Gem,
        cost: "$0.05",
        description: "Exhibe aretes / anillos / collares en modelo o expositor",
        example: "Aretes sobre papel → en las orejas de una modelo. O: collar → en un stand de terciopelo",
        useWhen: "El producto es joyería (aretes, anillos, collar, pulsera, reloj)",
      },
    ],
  },
  {
    name: "VIDEO Y ADS",
    color: "#E06BDF",
    modules: [
      {
        id: "video",
        label: "Hacer un Video",
        icon: Film,
        cost: "$0-$0.35",
        description: "Convierte una foto en video corto con movimiento",
        example: "Foto estática del brasier → video de 3s con zoom suave y rotación",
        useWhen: "Necesitas contenido para Instagram Reels / TikTok / WhatsApp Status",
      },
      {
        id: "ad-creator",
        label: "Crear Anuncio para Redes",
        icon: Megaphone,
        cost: "$0.04-$0.35",
        description: "Video listo para IG, TikTok, Facebook",
        example: "Tu brasier + texto '30% OFF' → video 9:16 listo para subir",
        useWhen: "Quieres un anuncio pagado o post promocional",
      },
      {
        id: "ai-prompt",
        label: "Ideas Creativas IA",
        icon: Wand2,
        cost: "Gratis-$0.003",
        description: "El IA te sugiere 4 conceptos para tu foto",
        example: "Subes el brasier → IA propone: 'playa', 'estudio blanco', 'lifestyle', 'lujo mármol'",
        useWhen: "No sabes qué fondo / estilo usar y quieres inspiración",
      },
    ],
  },
  {
    name: "AUTOMATIZACIÓN",
    color: "#A78BFA",
    modules: [
      {
        id: "ai-agent",
        label: "Agente IA (Automático)",
        icon: Bot,
        cost: "Variable",
        description: "Escoges tu producto y el IA hace TODO solo",
        example: "Subes foto de brasier → IA decide: aislar, crear modelo, vestirla, mejorar, hacer video. Todo automático.",
        useWhen: "Eres mamá (o cualquier persona) y no quieres pensar en los pasos — solo el resultado final",
      },
      {
        id: "batch",
        label: "Procesar Muchas Fotos",
        icon: Layers,
        cost: "Variable",
        description: "50+ imágenes con el mismo pipeline, sin repetir clicks",
        example: "Tienes 50 fotos de brasieres de distintos colores → todas salen procesadas igual",
        useWhen: "Tienes muchas fotos que necesitan EL MISMO tratamiento",
      },
      {
        id: "brand-kit",
        label: "Kit de Marca (Logo/Colores)",
        icon: Palette,
        cost: "Gratis",
        description: "Guarda tu logo, colores y marca de agua",
        example: "Guardas el logo de 'Unistyles' → después aparece automáticamente en todas las fotos",
        useWhen: "Cada foto tuya debe llevar tu logo o colores de marca",
      },
      {
        id: "catalog-pipeline",
        label: "Pipeline de Catálogo Completo",
        icon: Package,
        cost: "$0.18+/ref",
        description: "Todo el contenido de una referencia en 1 clic",
        example: "Una referencia (ej: REF-123 rojo) → 4 ángulos + 2 videos + infografía",
        useWhen: "Quieres el catálogo COMPLETO listo de una vez",
      },
    ],
  },
  {
    name: "HERRAMIENTAS",
    color: "#5B9CF6",
    modules: [
      {
        id: "shadows",
        label: "Sombra bajo Producto",
        icon: Sun,
        cost: "Gratis",
        description: "Una sombra realista para que no parezca flotar",
        example: "Brasier sobre fondo blanco sin sombra → ahora se ve apoyado",
        useWhen: "Tu producto ya está sobre fondo blanco pero se ve muy 'pegado' o flotante",
      },
      {
        id: "outpaint",
        label: "Adaptar a IG / TikTok",
        icon: Expand,
        cost: "$0.05",
        description: "Extiende la foto al formato que cada red pide",
        example: "Foto cuadrada → versión vertical 9:16 para Instagram Story",
        useWhen: "La foto es cuadrada y necesitas vertical, o al revés",
      },
      {
        id: "compliance",
        label: "Revisar para Amazon / Shopify",
        icon: CheckCircle,
        cost: "Gratis",
        description: "Te avisa si la foto cumple los requisitos de la plataforma",
        example: "Subes foto → 'Amazon OK ✓ (1200px, fondo blanco). Shopify OK ✓'",
        useWhen: "Antes de subir a un marketplace y no quieres que te la rechacen",
      },
      {
        id: "smart-editor",
        label: "Editor Manual (Photoshop-style)",
        icon: SlidersHorizontal,
        cost: "Gratis",
        description: "Controles manuales: brillo, contraste, texto, recortar",
        example: "Quieres ajustar tú misma el brillo o añadir texto encima",
        useWhen: "Quieres control manual — ya pasaste por los otros módulos y algo específico no te convence",
      },
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
                      <div key={mod.id} className="relative group/item">
                        <button
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

                        {/* Hover tooltip with concrete example + when to use it.
                            Pops out to the right of the sidebar, invisible by default,
                            appears on hover (works without reading, tu mamá friendly). */}
                        {(mod.example || mod.useWhen) && (
                          <div
                            className="pointer-events-none absolute left-full top-0 z-50 ml-2 w-72 opacity-0 translate-x-[-4px] transition-all duration-150 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:pointer-events-auto"
                          >
                            <div
                              className="rounded-xl border bg-[var(--bg-surface)] p-3 shadow-2xl"
                              style={{ borderColor: `${cat.color}40` }}
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <Icon className="h-4 w-4" style={{ color: cat.color }} />
                                <span className="text-sm font-semibold text-white">{mod.label}</span>
                                <span className="ml-auto text-[10px] font-bold" style={{
                                  color: mod.cost === "Gratis" || mod.cost.startsWith("Gratis") ? "#50C878" : cat.color,
                                }}>{mod.cost}</span>
                              </div>
                              <p className="mb-2 text-[11px] leading-snug text-gray-300">{mod.description}</p>
                              {mod.example && (
                                <div className="mb-2 rounded-lg border border-surface-lighter bg-black/30 p-2">
                                  <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>
                                    Ejemplo
                                  </div>
                                  <p className="text-[11px] leading-snug text-gray-200">{mod.example}</p>
                                </div>
                              )}
                              {mod.useWhen && (
                                <div className="rounded-lg border border-surface-lighter bg-black/30 p-2">
                                  <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>
                                    Úsalo cuando
                                  </div>
                                  <p className="text-[11px] leading-snug text-gray-200">{mod.useWhen}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
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
