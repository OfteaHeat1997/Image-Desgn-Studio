"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Cpu,
  Database,
  Globe,
  Layers,
  Layout,
  Server,
  Zap,
  Eye,
  DollarSign,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

/* ================================================================== */
/*  Data: Module definitions with full info                             */
/* ================================================================== */

interface ModuleInfo {
  id: string;
  name: string;
  cost: string;
  free: boolean;
  apiRoute: string;
  panel: string;
  processing: string;
  provider: string;
  description: string;
}

const MODULES: ModuleInfo[] = [
  { id: "bg-remove", name: "Quitar Fondo", cost: "Gratis / $0.01", free: true, apiRoute: "/api/bg-remove", panel: "BgRemovePanel", processing: "bg-remove.ts", provider: "Browser WASM / Replicate / Docker", description: "Elimina el fondo de la foto. 3 proveedores: gratis en navegador, gratis con Docker, o $0.01 con Replicate." },
  { id: "bg-generate", name: "Fondos con IA", cost: "$0.003 - $0.05", free: false, apiRoute: "/api/bg-generate", panel: "BgGeneratePanel", processing: "bg-generate.ts", provider: "Replicate (Flux)", description: "Genera fondos profesionales. 3 modos: Fast ($0.003), Creative ($0.03), Precise ($0.05)." },
  { id: "enhance", name: "Mejorar Calidad", cost: "Gratis", free: true, apiRoute: "/api/enhance", panel: "EnhancePanel", processing: "enhance.ts", provider: "Sharp (local)", description: "Ajusta brillo, contraste, saturacion, nitidez. Todo gratis y local con Sharp." },
  { id: "upscale", name: "Aumentar Resolucion", cost: "$0.02 - $0.05", free: false, apiRoute: "/api/upscale", panel: "UpscalePanel", processing: "upscale.ts", provider: "Replicate", description: "Escala tu imagen 2x o 4x con IA. 3 proveedores: Real-ESRGAN, Aura SR, Clarity." },
  { id: "shadows", name: "Sombras", cost: "Gratis / $0.05", free: true, apiRoute: "/api/shadows", panel: "ShadowsPanel", processing: "shadows.ts", provider: "Sharp / Replicate", description: "Sombras drop/contacto/reflejo gratis con Sharp. Relighting con IA cuesta $0.05." },
  { id: "inpaint", name: "Borrar y Reemplazar", cost: "$0.03 - $0.05", free: false, apiRoute: "/api/inpaint", panel: "InpaintPanel", processing: "inpaint.ts", provider: "Replicate (Flux)", description: "Borra objetos, cambia colores, quita marcas de agua con IA generativa." },
  { id: "outpaint", name: "Extender Imagen", cost: "$0.05", free: false, apiRoute: "/api/outpaint", panel: "OutpaintPanel", processing: "outpaint.ts", provider: "Replicate (Kontext)", description: "Extiende los bordes para adaptarla a cualquier formato de plataforma." },
  { id: "tryon", name: "Prueba Virtual", cost: "$0.015 - $0.05", free: false, apiRoute: "/api/tryon", panel: "TryOnPanel", processing: "tryon.ts", provider: "Replicate / FASHN", description: "Coloca tu prenda sobre un modelo virtual. 3 proveedores segun calidad." },
  { id: "model-create", name: "Crear Modelo IA", cost: "$0.055", free: false, apiRoute: "/api/model-create", panel: "ModelCreatePanel", processing: "model-create.ts", provider: "Replicate (Flux)", description: "Genera modelos virtuales con genero, edad, tono de piel y pose configurables." },
  { id: "ghost-mannequin", name: "Maniqui Invisible", cost: "$0.05 - $0.08", free: false, apiRoute: "/api/ghost-mannequin", panel: "GhostMannequinPanel", processing: "ghost-mannequin.ts", provider: "Replicate", description: "Elimina el maniqui de fotos de ropa para efecto 'invisible'." },
  { id: "jewelry-tryon", name: "Joyeria Virtual", cost: "$0.05", free: false, apiRoute: "/api/jewelry-tryon", panel: "JewelryTryOnPanel", processing: "jewelry-tryon.ts", provider: "Replicate (Kontext)", description: "Prueba joyeria (aretes, collares, anillos) sobre fotos de modelos." },
  { id: "video", name: "Estudio de Video", cost: "$0 - $0.35", free: true, apiRoute: "/api/video", panel: "VideoPanel", processing: "video.ts", provider: "fal.ai / Replicate", description: "Convierte fotos en videos. 7 proveedores desde gratis (Ken Burns) hasta premium." },
  { id: "ad-creator", name: "Crear Anuncios", cost: "$0.04 - $0.35", free: false, apiRoute: "/api/ad-create", panel: "AdCreatorPanel", processing: "ad-compose.ts", provider: "fal.ai / Replicate", description: "Genera videos publicitarios para IG, TikTok, Facebook, YouTube, Pinterest." },
  { id: "ai-prompt", name: "Director Creativo IA", cost: "Gratis - $0.003", free: true, apiRoute: "/api/prompt", panel: "AiPromptPanel", processing: "—", provider: "Anthropic (Claude)", description: "La IA sugiere 4 conceptos creativos de fotografia para tu producto." },
  { id: "batch", name: "Procesamiento Masivo", cost: "Variable", free: false, apiRoute: "/api/batch", panel: "BatchProcessPanel", processing: "—", provider: "Multiple", description: "Procesa multiples imagenes con la misma secuencia de pasos." },
  { id: "compliance", name: "Verificar Marketplace", cost: "Gratis", free: true, apiRoute: "—", panel: "CompliancePanel", processing: "—", provider: "Local", description: "Verifica requisitos de Amazon, Shopify, Etsy, eBay. Auto-correccion gratis." },
  { id: "smart-editor", name: "Editor Avanzado", cost: "Gratis", free: true, apiRoute: "—", panel: "SmartEditorPanel", processing: "—", provider: "Fabric.js (local)", description: "Editor con capas, filtros, texto, transformaciones. Todo en el navegador." },
  { id: "brand-kit", name: "Kit de Marca", cost: "Gratis", free: true, apiRoute: "—", panel: "BrandKitPanel", processing: "—", provider: "Local", description: "Guarda colores, fuentes, logo y watermark de tu marca." },
];

/* ================================================================== */
/*  Data: Architecture layers                                          */
/* ================================================================== */

interface ArchLayer {
  name: string;
  icon: React.ElementType;
  color: string;
  items: string[];
  description: string;
}

const LAYERS: ArchLayer[] = [
  {
    name: "PAGINAS (Frontend)",
    icon: Layout,
    color: "#5B9CF6",
    items: ["/ (Dashboard)", "/editor", "/agent", "/batch", "/brand-kit", "/gallery", "/docs", "/workflows", "/architecture"],
    description: "Lo que ve el usuario. React components con Tailwind CSS. Cada pagina es un archivo en src/app/.",
  },
  {
    name: "PANELES DE MODULOS (UI)",
    icon: Layers,
    color: "#C5A47E",
    items: ["19 paneles en src/components/modules/", "Cada panel: opciones + boton Procesar", "Props: imageFile + onProcess callback"],
    description: "Controles de cada modulo. El usuario configura opciones y hace click en Procesar.",
  },
  {
    name: "API ROUTES (Backend)",
    icon: Server,
    color: "#34D399",
    items: ["29 endpoints en src/app/api/", "Reciben JSON o FormData", "Validan, procesan, responden", "Patron: { success, data, cost }"],
    description: "Endpoints HTTP que reciben peticiones del frontend y las envian a los servicios de IA.",
  },
  {
    name: "PROCESAMIENTO (Logica)",
    icon: Cpu,
    color: "#F59E0B",
    items: ["16 modulos en src/lib/processing/", "Funciones puras: input -> output", "Usan Sharp (local) o APIs externas"],
    description: "La logica real de cada operacion. Funciones que reciben una imagen y devuelven el resultado.",
  },
  {
    name: "CLIENTES DE API (Comunicacion)",
    icon: Globe,
    color: "#EC4899",
    items: ["replicate.ts — Replicate (imagenes)", "fal.ts — fal.ai (videos)", "fashn.ts — FASHN (try-on)", "withoutbg.ts — Docker local"],
    description: "Wrappers que se comunican con servicios externos. Manejan autenticacion, reintentos, y errores.",
  },
  {
    name: "ESTADO (Stores)",
    icon: Database,
    color: "#A78BFA",
    items: ["6 Zustand stores", "editor-store (capas, undo/redo)", "gallery-store (historial)", "settings-store (costos, config)", "3 mas: batch, video, brand"],
    description: "Estado global de la aplicacion. Zustand es como useState pero compartido entre todos los componentes.",
  },
  {
    name: "BASE DE DATOS",
    icon: Database,
    color: "#6366F1",
    items: ["PostgreSQL + Prisma ORM", "7 modelos (Project, Image, ProcessingJob...)", "Fire-and-forget: nunca bloquea la UI"],
    description: "Almacenamiento persistente. Guarda historial de procesamiento, costos, y resultados.",
  },
];

/* ================================================================== */
/*  Data: Flow steps                                                    */
/* ================================================================== */

interface FlowStep {
  number: number;
  title: string;
  description: string;
  file: string;
  color: string;
}

const FLOW_STEPS: FlowStep[] = [
  { number: 1, title: "Usuario sube foto", description: "Drag & drop o click. El archivo se guarda en memoria del navegador como File object.", file: "editor/page.tsx", color: "#5B9CF6" },
  { number: 2, title: "Selecciona modulo", description: "Click en la barra lateral izquierda. Se carga el panel correspondiente (ej: BgRemovePanel).", file: "ModuleSidebar.tsx", color: "#C5A47E" },
  { number: 3, title: "Configura opciones", description: "Elige proveedor, estilo, formato. Cada panel tiene sus propias opciones.", file: "components/modules/", color: "#F59E0B" },
  { number: 4, title: "Click Procesar", description: "El panel convierte la foto a data URL y envia POST al API route correspondiente.", file: "api/[modulo]/route.ts", color: "#34D399" },
  { number: 5, title: "API valida y procesa", description: "Verifica datos, llama al servicio de IA (Replicate/fal.ai), espera resultado (10-60 seg).", file: "lib/api/replicate.ts", color: "#EC4899" },
  { number: 6, title: "IA devuelve resultado", description: "URL de la imagen/video procesada. Se guarda en base de datos (fire-and-forget).", file: "lib/db/persist.ts", color: "#6366F1" },
  { number: 7, title: "Muestra antes/despues", description: "El editor muestra comparacion. El costo se suma al total de sesion.", file: "editor/page.tsx", color: "#A78BFA" },
  { number: 8, title: "Siguiente paso o exportar", description: "Aceptar resultado como input del siguiente modulo, o exportar como PNG/JPG/WebP.", file: "Toolbar.tsx", color: "#EF4444" },
];

/* ================================================================== */
/*  Data: Testing checklist                                             */
/* ================================================================== */

interface TestItem {
  category: string;
  items: { test: string; needsApi: boolean; route: string }[];
}

const TEST_CHECKLIST: TestItem[] = [
  {
    category: "Basico (sin API keys)",
    items: [
      { test: "Dashboard carga sin errores", needsApi: false, route: "/" },
      { test: "Editor abre y acepta foto (drag/drop)", needsApi: false, route: "/editor" },
      { test: "Zoom in/out funciona", needsApi: false, route: "/editor" },
      { test: "Undo/Redo no crashea", needsApi: false, route: "/editor" },
      { test: "Cambiar entre modulos funciona", needsApi: false, route: "/editor" },
      { test: "Enhance (preset) funciona", needsApi: false, route: "/editor?module=enhance" },
      { test: "BG Remove (Browser) funciona", needsApi: false, route: "/editor?module=bg-remove" },
      { test: "Brand Kit guarda colores", needsApi: false, route: "/brand-kit" },
      { test: "Galeria muestra historial", needsApi: false, route: "/gallery" },
      { test: "Exportar imagen funciona", needsApi: false, route: "/editor" },
    ],
  },
  {
    category: "Con API Keys",
    items: [
      { test: "BG Remove (Replicate) — $0.01", needsApi: true, route: "/editor?module=bg-remove" },
      { test: "BG Generate — $0.03-$0.05", needsApi: true, route: "/editor?module=bg-generate" },
      { test: "Inpaint (borrar objeto) — $0.03", needsApi: true, route: "/editor?module=inpaint" },
      { test: "Upscale 2x — $0.02", needsApi: true, route: "/editor?module=upscale" },
      { test: "Model Create — $0.055", needsApi: true, route: "/editor?module=model-create" },
      { test: "Try-On (prenda + modelo) — $0.02", needsApi: true, route: "/editor?module=tryon" },
      { test: "Video generacion — $0.04+", needsApi: true, route: "/editor?module=video" },
      { test: "Agente IA (E-Commerce) — variable", needsApi: true, route: "/agent" },
      { test: "Health check responde OK", needsApi: true, route: "/api/health" },
    ],
  },
];

/* ================================================================== */
/*  Components                                                          */
/* ================================================================== */

function SectionTitle({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="text-xl font-bold text-white mt-10 mb-4 flex items-center gap-2 scroll-mt-20">
      <span className="w-1 h-6 bg-accent rounded-full" />
      {children}
    </h2>
  );
}

function FlowDiagram() {
  return (
    <div className="space-y-3">
      {FLOW_STEPS.map((step, i) => (
        <div key={step.number} className="flex items-start gap-3">
          {/* Step number */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black"
              style={{ backgroundColor: step.color }}
            >
              {step.number}
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div className="w-px h-8 bg-surface-lighter mt-1" />
            )}
          </div>
          {/* Content */}
          <div className="flex-1 pb-2">
            <p className="text-sm font-semibold text-white">{step.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
            <code className="text-[10px] text-accent/70 mt-0.5 block">{step.file}</code>
          </div>
        </div>
      ))}
    </div>
  );
}

function ArchitectureLayers() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-2">
      {LAYERS.map((layer) => {
        const isOpen = expanded[layer.name] ?? true;
        const Icon = layer.icon;
        return (
          <div key={layer.name} className="rounded-lg border border-surface-lighter overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded((p) => ({ ...p, [layer.name]: !isOpen }))}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-surface-light transition-colors"
            >
              <Icon className="h-4 w-4 shrink-0" style={{ color: layer.color }} />
              <span className="text-sm font-semibold text-white flex-1">{layer.name}</span>
              {isOpen ? <ChevronDown className="h-3 w-3 text-gray-500" /> : <ChevronRight className="h-3 w-3 text-gray-500" />}
            </button>
            {isOpen && (
              <div className="px-3 pb-3 border-t border-surface-lighter bg-surface-light/30">
                <p className="text-xs text-gray-400 mt-2 mb-2">{layer.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {layer.items.map((item) => (
                    <span key={item} className="text-[10px] px-2 py-0.5 rounded-full border border-surface-lighter text-gray-300 bg-surface">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModuleTable() {
  const [filter, setFilter] = useState<"all" | "free" | "paid">("all");

  const filtered = MODULES.filter((m) => {
    if (filter === "free") return m.free;
    if (filter === "paid") return !m.free;
    return true;
  });

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(["all", "free", "paid"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filter === f
                ? "border-accent bg-accent/10 text-accent-light"
                : "border-surface-lighter text-gray-400 hover:text-gray-200"
            }`}
          >
            {f === "all" ? "Todos (18)" : f === "free" ? "Gratis" : "De Pago"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((mod) => (
          <details key={mod.id} className="group rounded-lg border border-surface-lighter overflow-hidden">
            <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-light transition-colors list-none">
              <span className={`w-2 h-2 rounded-full shrink-0 ${mod.free ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-sm font-medium text-white flex-1">{mod.name}</span>
              <span className={`text-[10px] font-semibold ${mod.free ? "text-emerald-500" : "text-gray-400"}`}>
                {mod.cost}
              </span>
              <ChevronRight className="h-3 w-3 text-gray-500 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="px-3 pb-3 border-t border-surface-lighter bg-surface-light/30 space-y-2">
              <p className="text-xs text-gray-400 mt-2">{mod.description}</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-gray-500">API Route:</span>{" "}
                  <code className="text-accent/80">{mod.apiRoute}</code>
                </div>
                <div>
                  <span className="text-gray-500">Panel:</span>{" "}
                  <code className="text-blue-400">{mod.panel}</code>
                </div>
                <div>
                  <span className="text-gray-500">Procesamiento:</span>{" "}
                  <code className="text-yellow-400">{mod.processing}</code>
                </div>
                <div>
                  <span className="text-gray-500">Proveedor:</span>{" "}
                  <span className="text-gray-300">{mod.provider}</span>
                </div>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function TestChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (test: string) => {
    setChecked((p) => ({ ...p, [test]: !p[test] }));
  };

  return (
    <div className="space-y-4">
      {TEST_CHECKLIST.map((cat) => {
        const done = cat.items.filter((i) => checked[i.test]).length;
        return (
          <div key={cat.category}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-white">{cat.category}</h3>
              <span className="text-[10px] text-gray-500">
                {done}/{cat.items.length}
              </span>
            </div>
            <div className="space-y-1">
              {cat.items.map((item) => (
                <button
                  key={item.test}
                  type="button"
                  onClick={() => toggle(item.test)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-left hover:bg-surface-light transition-colors group"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    checked[item.test]
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-surface-lighter group-hover:border-gray-400"
                  }`}>
                    {checked[item.test] && <CheckCircle className="h-3 w-3 text-black" />}
                  </div>
                  <span className={`text-xs flex-1 ${checked[item.test] ? "text-gray-500 line-through" : "text-gray-300"}`}>
                    {item.test}
                  </span>
                  {item.needsApi && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      API Key
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  Navigation                                                          */
/* ================================================================== */

const NAV_ITEMS = [
  { id: "flujo", label: "Flujo de Datos" },
  { id: "arquitectura", label: "Arquitectura" },
  { id: "modulos", label: "18 Modulos" },
  { id: "agente", label: "Agente IA" },
  { id: "testing", label: "Testing" },
  { id: "costos", label: "Costos" },
  { id: "decisiones", label: "Decisiones" },
];

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-bg-primary text-gray-200">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-surface-lighter bg-surface/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-sm font-bold text-gradient">UniStudio</h1>
          <span className="text-[10px] text-gray-600 uppercase tracking-wider">Arquitectura</span>
          <div className="flex-1" />
          <nav className="hidden md:flex gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-[10px] px-2 py-1 rounded-md text-gray-400 hover:text-white hover:bg-surface-light transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="rounded-xl border border-surface-lighter bg-surface p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Como Funciona UniStudio</h2>
          <p className="text-sm text-gray-400 max-w-2xl">
            Guia interactiva para entender la arquitectura, el flujo de datos, cada modulo, y como probar
            que todo funcione. Diseñada para estudiantes que necesitan tomar decisiones sobre el proyecto.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Layout className="h-3.5 w-3.5 text-blue-400" />
              <span>9 paginas</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Server className="h-3.5 w-3.5 text-emerald-400" />
              <span>29 API routes</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Layers className="h-3.5 w-3.5 text-accent" />
              <span>19 paneles</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Database className="h-3.5 w-3.5 text-purple-400" />
              <span>6 stores</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Globe className="h-3.5 w-3.5 text-pink-400" />
              <span>4 APIs externas</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_1fr] gap-6">
          {/* LEFT COLUMN */}
          <div>
            {/* Flow Diagram */}
            <SectionTitle id="flujo">Flujo de una Foto (paso a paso)</SectionTitle>
            <div className="rounded-xl border border-surface-lighter bg-surface p-4">
              <p className="text-xs text-gray-400 mb-4">
                Este es el camino que sigue CADA foto que procesas. Todos los 18 modulos siguen este mismo flujo.
              </p>
              <FlowDiagram />
            </div>

            {/* Agent Flow */}
            <SectionTitle id="agente">Flujo del Agente IA</SectionTitle>
            <div className="rounded-xl border border-surface-lighter bg-surface p-4 space-y-3">
              <p className="text-xs text-gray-400">
                El agente automatiza todo el flujo anterior. Tu solo dices que quieres y el decide los pasos.
              </p>

              {[
                { phase: "1. ANALISIS", desc: "Sube foto → /api/analyze-image detecta marca de agua, iluminacion, resolucion, tipo de fondo", color: "#5B9CF6" },
                { phase: "2. PLANIFICACION", desc: "Claude IA ve el analisis y decide los pasos necesarios (o usa templates si no hay API key)", color: "#C5A47E" },
                { phase: "3. CONFIRMACION", desc: "Te muestra el plan con costos. Tu decides si ejecutar o ajustar presupuesto.", color: "#F59E0B" },
                { phase: "4. EJECUCION", desc: "useAgentPipeline.ts ejecuta cada paso secuencialmente. El resultado de un paso es input del siguiente.", color: "#34D399" },
                { phase: "5. RESULTADOS", desc: "Preview de cada paso intermedio + resultado final. Puedes descargar o usar en el editor.", color: "#A78BFA" },
              ].map((p) => (
                <div key={p.phase} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: p.color }} />
                  <div>
                    <span className="text-xs font-semibold text-white">{p.phase}</span>
                    <p className="text-[11px] text-gray-400">{p.desc}</p>
                  </div>
                </div>
              ))}

              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 mt-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-300">3 Tipos de Agente</p>
                    <p className="text-[10px] text-amber-400/80 mt-1">
                      <strong>E-Commerce</strong>: foto cruda → foto profesional de catalogo<br />
                      <strong>Modelo</strong>: prenda → modelo IA vistiendo la prenda<br />
                      <strong>Social</strong>: producto → videos, banners y anuncios
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Testing */}
            <SectionTitle id="testing">Testing — Que Probar</SectionTitle>
            <div className="rounded-xl border border-surface-lighter bg-surface p-4">
              <p className="text-xs text-gray-400 mb-3">
                Marca cada test que pase. Los tests sin &quot;API Key&quot; funcionan sin configuracion.
              </p>
              <TestChecklist />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* Architecture Layers */}
            <SectionTitle id="arquitectura">Capas de la Arquitectura</SectionTitle>
            <div className="rounded-xl border border-surface-lighter bg-surface p-4">
              <p className="text-xs text-gray-400 mb-3">
                La app tiene 7 capas. Los datos fluyen de arriba hacia abajo (usuario → IA) y regresan de abajo hacia arriba (resultado → pantalla).
              </p>
              <ArchitectureLayers />
            </div>

            {/* Modules Table */}
            <SectionTitle id="modulos">Los 18 Modulos (detalle)</SectionTitle>
            <div className="rounded-xl border border-surface-lighter bg-surface p-4">
              <p className="text-xs text-gray-400 mb-3">
                Click en cualquier modulo para ver sus archivos, proveedor y costo real.
              </p>
              <ModuleTable />
            </div>

            {/* Cost Summary */}
            <SectionTitle id="costos">Resumen de Costos</SectionTitle>
            <div className="rounded-xl border border-surface-lighter bg-surface p-4 space-y-3">
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" /> Flujo E-Commerce Tipico
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  BG Remove ($0.01) + BG Generate ($0.05) + Shadows ($0) = <strong className="text-emerald-400">$0.06/foto</strong>
                </p>
              </div>
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" /> Flujo Modelo Tipico
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  BG Remove ($0.01) + Model Create ($0.055) + Try-On ($0.02) = <strong className="text-blue-400">$0.085/foto</strong>
                </p>
              </div>
              <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3">
                <p className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" /> Flujo Social Tipico
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  E-Commerce flow ($0.06) + Video ($0.05) = <strong className="text-purple-400">$0.11/foto</strong>
                </p>
              </div>
              <div className="rounded-lg bg-surface-light p-3">
                <p className="text-xs text-gray-400">
                  <strong className="text-white">Comparacion</strong>: Photoroom cobra $9.99/mes (100 fotos) = $0.10/foto.
                  UniStudio cuesta $0.06/foto para el mismo resultado.
                </p>
              </div>
            </div>

            {/* Decisions */}
            <SectionTitle id="decisiones">Decisiones para Mejorar</SectionTitle>
            <div className="rounded-xl border border-surface-lighter bg-surface p-4 space-y-3">
              {[
                { level: "Facil", color: "emerald", items: [
                  "Agregar presets de color en BG Remove",
                  "Agregar filtros en Enhance",
                  "Mejorar textos del dashboard",
                  "Personalizar tema de colores (globals.css)",
                ] },
                { level: "Medio", color: "amber", items: [
                  "Agregar nuevo proveedor de video",
                  "Mejorar galeria (busqueda, filtros)",
                  "Agregar formatos de marketplace",
                  "Crear presets de outpaint",
                ] },
                { level: "Avanzado", color: "red", items: [
                  "Agregar autenticacion (NextAuth)",
                  "Implementar rate limiting",
                  "Crear modulo completamente nuevo",
                  "Agregar webhooks de notificacion",
                ] },
              ].map((group) => (
                <div key={group.level}>
                  <p className={`text-xs font-semibold text-${group.color}-400 mb-1`}>{group.level}</p>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                        <Info className={`h-3 w-3 shrink-0 mt-0.5 text-${group.color}-500/50`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 mb-6 text-center">
          <p className="text-xs text-gray-600">
            UniStudio — Guia de Arquitectura Interactiva
          </p>
          <div className="flex justify-center gap-3 mt-2">
            <Link href="/docs" className="text-[10px] text-accent/60 hover:text-accent transition-colors">
              Explorador de Archivos →
            </Link>
            <Link href="/workflows" className="text-[10px] text-accent/60 hover:text-accent transition-colors">
              Guia de Flujos →
            </Link>
            <Link href="/editor" className="text-[10px] text-accent/60 hover:text-accent transition-colors">
              Abrir Editor →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
