"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Folder,
  FileCode,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Search,
  Scissors,
  ImageIcon,
  Sparkles,
  Sun,
  Eraser,
  Expand,
  Shirt,
  User,
  Box,
  Gem,
  Video,
  Layers,
  Palette,
  CheckSquare,
  PenTool,
  Wand2,
  Megaphone,
  Zap,
  Database,
  Globe,
  Settings,
  Eye,
  Code,
  Layout,
  BookOpen,
  Bot,
  LayoutGrid,
} from "lucide-react";

// =============================================================================
// Data: Every folder & file with explanation
// =============================================================================

interface FileEntry {
  name: string;
  description: string;
  /** Where to go to edit this */
  editHint?: string;
  /** Full path from src/ */
  path: string;
  type: "file" | "folder";
  children?: FileEntry[];
  icon?: React.ElementType;
  color?: string;
  /** Link to open in editor */
  editorLink?: string;
}

const PROJECT_TREE: FileEntry[] = [
  // ── PAGES ──────────────────────────────────────────────────────────
  {
    name: "app/",
    description: "Todas las paginas y API routes de la aplicacion",
    path: "src/app",
    type: "folder",
    icon: Layout,
    color: "#5B9CF6",
    children: [
      {
        name: "page.tsx",
        description: "Dashboard principal — la pagina de inicio con todas las herramientas, hero section, tarjetas de modulos",
        editHint: "Cambiar textos, agregar/quitar herramientas del dashboard, modificar el hero",
        path: "src/app/page.tsx",
        type: "file",
        editorLink: "/",
      },
      {
        name: "layout.tsx",
        description: "Layout raiz — envuelve TODA la app. Fuente Inter, ToastContainer, metadata SEO",
        editHint: "Cambiar titulo/descripcion SEO, agregar providers globales, modificar fuente",
        path: "src/app/layout.tsx",
        type: "file",
      },
      {
        name: "globals.css",
        description: "TODOS los colores y estilos globales. Variables CSS del design system (--bg-primary, --accent, etc)",
        editHint: "Cambiar colores de la app, fuentes, scrollbar, animaciones. ESTE es el archivo para cambiar el look completo",
        path: "src/app/globals.css",
        type: "file",
        color: "#E879F9",
      },
      {
        name: "editor/page.tsx",
        description: "Editor principal — canvas central + sidebar izquierda (modulos) + sidebar derecha (capas/propiedades). Aqui viven TODOS los 19 paneles de modulos",
        editHint: "Agregar nuevos modulos al editor, cambiar layout del canvas, modificar la barra de herramientas",
        path: "src/app/editor/page.tsx",
        type: "file",
        editorLink: "/editor",
        color: "#C5A47E",
      },
      {
        name: "agent/page.tsx",
        description: "Pagina standalone del AI Agent — workflow de 5 pasos: elegir agente → subir imagen → configurar → procesar → resultado",
        editHint: "Modificar el flujo del agente, agregar nuevos tipos de agente, cambiar la UI del wizard",
        path: "src/app/agent/page.tsx",
        type: "file",
        editorLink: "/agent",
      },
      {
        name: "workflows/page.tsx",
        description: "Editor visual de workflows (estilo Weavy) — nodos arrastrables que muestran como se conectan los modulos",
        editHint: "Agregar nuevos templates de workflow, modificar nodos, cambiar conexiones",
        path: "src/app/workflows/page.tsx",
        type: "file",
        editorLink: "/workflows",
        color: "#50C878",
      },
      {
        name: "batch/page.tsx",
        description: "Procesamiento masivo — sube multiples fotos y aplica un pipeline a todas",
        editHint: "Modificar el pipeline builder, agregar presets de batch",
        path: "src/app/batch/page.tsx",
        type: "file",
        editorLink: "/batch",
      },
      {
        name: "gallery/page.tsx",
        description: "Galeria de imagenes — historial de todo lo procesado, sincronizado con DB",
        editHint: "Cambiar como se muestran las imagenes, filtros, busqueda",
        path: "src/app/gallery/page.tsx",
        type: "file",
        editorLink: "/gallery",
      },
      {
        name: "brand-kit/page.tsx",
        description: "Kit de marca — colores, logo, tipografia, watermark de Unistyles",
        editHint: "Agregar campos de marca, cambiar opciones de watermark",
        path: "src/app/brand-kit/page.tsx",
        type: "file",
        editorLink: "/brand-kit",
      },
      {
        name: "docs/page.tsx",
        description: "ESTA pagina — documentacion interactiva del proyecto",
        path: "src/app/docs/page.tsx",
        type: "file",
        editorLink: "/docs",
      },
    ],
  },

  // ── API ROUTES ────────────────────────────────────────────────────
  {
    name: "app/api/",
    description: "28 API routes — cada modulo tiene su endpoint. Aqui se conectan con Replicate, fal.ai, FASHN, etc",
    path: "src/app/api",
    type: "folder",
    icon: Globe,
    color: "#FF6B6B",
    children: [
      {
        name: "bg-remove/route.ts",
        description: "Quitar fondo — browser WASM (gratis), withoutBG, Replicate RMBG, remove.bg",
        editHint: "Agregar nuevo provider de BG removal, cambiar modelo de Replicate",
        path: "src/app/api/bg-remove/route.ts",
        type: "file",
      },
      {
        name: "bg-generate/route.ts",
        description: "Generar fondos IA — Flux Schnell/Dev/Kontext, Seedream. Modo preciso vs creativo",
        editHint: "Agregar nuevos modelos de generacion, cambiar presets de fondo",
        path: "src/app/api/bg-generate/route.ts",
        type: "file",
      },
      {
        name: "enhance/route.ts",
        description: "Mejorar imagen — Sharp (gratis): brillo, contraste, saturacion, nitidez",
        editHint: "Agregar nuevos presets de mejora, modificar parametros",
        path: "src/app/api/enhance/route.ts",
        type: "file",
      },
      {
        name: "upscale/route.ts",
        description: "Aumentar resolucion — Real-ESRGAN, Clarity Upscaler, Aura SR",
        path: "src/app/api/upscale/route.ts",
        type: "file",
      },
      {
        name: "shadows/route.ts",
        description: "Sombras — programaticas (gratis) + IC-Light IA ($0.02) + Flux Kontext ($0.055)",
        path: "src/app/api/shadows/route.ts",
        type: "file",
      },
      {
        name: "inpaint/route.ts",
        description: "Borrar/reemplazar — Flux Fill Pro/Dev, Flux Kontext (sin mascara)",
        path: "src/app/api/inpaint/route.ts",
        type: "file",
      },
      {
        name: "outpaint/route.ts",
        description: "Extender imagen — adaptar formato para cada plataforma (IG, TikTok, Amazon)",
        path: "src/app/api/outpaint/route.ts",
        type: "file",
      },
      {
        name: "tryon/route.ts",
        description: "Prueba virtual ropa — FASHN (no lingerie), IDM-VTON (si lingerie), CatVTON, Kolors",
        editHint: "El smart router decide: lingerie → IDM-VTON, otro → FASHN",
        path: "src/app/api/tryon/route.ts",
        type: "file",
        color: "#C5A47E",
      },
      {
        name: "model-create/route.ts",
        description: "Crear modelo IA — FASHN Model Create, Face to Model, Model Swap",
        path: "src/app/api/model-create/route.ts",
        type: "file",
      },
      {
        name: "ghost-mannequin/route.ts",
        description: "Maniqui invisible — Flux Kontext para eliminar maniqui",
        path: "src/app/api/ghost-mannequin/route.ts",
        type: "file",
      },
      {
        name: "jewelry-tryon/route.ts",
        description: "Joyeria virtual — Flux Kontext para aretes, collares, anillos en modelo",
        path: "src/app/api/jewelry-tryon/route.ts",
        type: "file",
      },
      {
        name: "video/route.ts",
        description: "Video Studio — 7 providers: Ken Burns (gratis), LTX, Wan 2.1/2.2, Kling, Minimax",
        path: "src/app/api/video/route.ts",
        type: "file",
      },
      {
        name: "avatar/route.ts",
        description: "Avatar parlante — Wav2Lip, MuseTalk, SadTalker, LivePortrait, Hedra",
        path: "src/app/api/avatar/route.ts",
        type: "file",
      },
      {
        name: "tts/route.ts",
        description: "Text-to-Speech — Edge TTS (gratis), Google Cloud TTS",
        path: "src/app/api/tts/route.ts",
        type: "file",
      },
      {
        name: "ad-create/route.ts",
        description: "Crear anuncios — genera video con formato para IG Reel, TikTok, FB, YouTube",
        path: "src/app/api/ad-create/route.ts",
        type: "file",
      },
      {
        name: "ai-agent/plan/route.ts",
        description: "AI Agent planner — Claude Haiku genera plan de pasos, con fallback a templates locales",
        editHint: "Modificar el prompt de Claude, agregar nuevos templates de fallback",
        path: "src/app/api/ai-agent/plan/route.ts",
        type: "file",
        color: "#C5A47E",
      },
      {
        name: "prompt/route.ts",
        description: "AI Prompt Assistant — Claude genera prompts optimizados para cada modulo",
        path: "src/app/api/prompt/route.ts",
        type: "file",
      },
      {
        name: "prompt-templates/route.ts",
        description: "Templates de prompts guardados en DB",
        path: "src/app/api/prompt-templates/route.ts",
        type: "file",
      },
      {
        name: "batch/route.ts",
        description: "Batch processing — ejecuta pipeline en multiples imagenes",
        path: "src/app/api/batch/route.ts",
        type: "file",
      },
      {
        name: "brand-kit/route.ts",
        description: "CRUD de brand kit en DB",
        path: "src/app/api/brand-kit/route.ts",
        type: "file",
      },
      {
        name: "health/route.ts",
        description: "Health check — verifica DB + env vars configurados",
        path: "src/app/api/health/route.ts",
        type: "file",
      },
      {
        name: "upload/route.ts",
        description: "Upload de imagenes — guarda en disco local o storage",
        path: "src/app/api/upload/route.ts",
        type: "file",
      },
      {
        name: "save-result/route.ts",
        description: "Guardar resultado procesado en DB/historial",
        path: "src/app/api/save-result/route.ts",
        type: "file",
      },
      {
        name: "db/history/route.ts",
        description: "Historial de imagenes procesadas desde DB",
        path: "src/app/api/db/history/route.ts",
        type: "file",
      },
      {
        name: "ai-models/route.ts",
        description: "CRUD de modelos IA guardados (galeria de modelos creados)",
        path: "src/app/api/ai-models/route.ts",
        type: "file",
      },
      {
        name: "video-enhance/route.ts",
        description: "Mejora de video post-generacion",
        path: "src/app/api/video-enhance/route.ts",
        type: "file",
      },
      {
        name: "inventory/load/route.ts",
        description: "Carga inventario de productos Unistyles",
        path: "src/app/api/inventory/load/route.ts",
        type: "file",
      },
      {
        name: "inventory/scan/route.ts",
        description: "Escanea carpetas de imagenes de inventario",
        path: "src/app/api/inventory/scan/route.ts",
        type: "file",
      },
    ],
  },

  // ── COMPONENTS: MODULES ────────────────────────────────────────────
  {
    name: "components/modules/",
    description: "Paneles de cada modulo — los controles que aparecen en el sidebar izquierdo del editor cuando seleccionas una herramienta",
    path: "src/components/modules",
    type: "folder",
    icon: PenTool,
    color: "#C5A47E",
    children: [
      { name: "BgRemovePanel.tsx", description: "Controles para quitar fondo — seleccion de provider, tipo de salida, color picker", path: "src/components/modules/BgRemovePanel.tsx", type: "file" },
      { name: "BgGeneratePanel.tsx", description: "Controles para fondos IA — modo preciso/creativo, presets de estilo, prompt custom", path: "src/components/modules/BgGeneratePanel.tsx", type: "file" },
      { name: "EnhancePanel.tsx", description: "Sliders de mejora — brillo, contraste, saturacion, nitidez + presets (ecommerce, fashion, etc)", path: "src/components/modules/EnhancePanel.tsx", type: "file" },
      { name: "ShadowsPanel.tsx", description: "Controles de sombras — tipo (drop/contact/reflection), iluminacion IA, presets", path: "src/components/modules/ShadowsPanel.tsx", type: "file" },
      { name: "InpaintPanel.tsx", description: "Controles de inpainting — prompt de que cambiar, presets de edicion", path: "src/components/modules/InpaintPanel.tsx", type: "file" },
      { name: "OutpaintPanel.tsx", description: "Controles de extension — presets por plataforma (Amazon, IG, TikTok), direccion", path: "src/components/modules/OutpaintPanel.tsx", type: "file" },
      { name: "TryOnPanel.tsx", description: "Controles de prueba virtual — subir prenda + modelo, seleccion de provider", path: "src/components/modules/TryOnPanel.tsx", type: "file" },
      { name: "ModelCreatePanel.tsx", description: "Formulario para crear modelo IA — genero, edad, piel, cuerpo, pose, expresion", path: "src/components/modules/ModelCreatePanel.tsx", type: "file" },
      { name: "GhostMannequinPanel.tsx", description: "Controles de maniqui invisible", path: "src/components/modules/GhostMannequinPanel.tsx", type: "file" },
      { name: "JewelryTryOnPanel.tsx", description: "Controles de joyeria virtual — tipo de accesorio, posicion", path: "src/components/modules/JewelryTryOnPanel.tsx", type: "file" },
      { name: "VideoPanel.tsx", description: "Video Studio completo — 3 tabs (Producto/Moda/Avatar), providers, TTS", path: "src/components/modules/VideoPanel.tsx", type: "file", color: "#FF6B6B" },
      { name: "AdCreatorPanel.tsx", description: "Crear anuncios — templates por red social, headline, CTA", path: "src/components/modules/AdCreatorPanel.tsx", type: "file" },
      { name: "AiPromptPanel.tsx", description: "Director creativo IA — describe tu producto, Claude sugiere conceptos", path: "src/components/modules/AiPromptPanel.tsx", type: "file" },
      { name: "AiAgentPanel.tsx", description: "AI Agent en el editor — 4 fases: input → plan → ejecutar → resultados", path: "src/components/modules/AiAgentPanel.tsx", type: "file", color: "#C5A47E" },
      { name: "SmartEditorPanel.tsx", description: "Herramientas del editor avanzado — capas, filtros, texto", path: "src/components/modules/SmartEditorPanel.tsx", type: "file" },
      { name: "CompliancePanel.tsx", description: "Verificador de marketplace — checa requisitos Amazon, Shopify, etc", path: "src/components/modules/CompliancePanel.tsx", type: "file" },
      {
        name: "video/",
        description: "Sub-componentes del Video Studio",
        path: "src/components/modules/video",
        type: "folder",
        children: [
          { name: "ProductVideoTab.tsx", description: "Tab de video de producto (gira, zoom, orbita)", path: "src/components/modules/video/ProductVideoTab.tsx", type: "file" },
          { name: "FashionVideoTab.tsx", description: "Tab de video de moda (model walk, reveal)", path: "src/components/modules/video/FashionVideoTab.tsx", type: "file" },
          { name: "AvatarVideoTab.tsx", description: "Tab de avatar parlante (TTS + lip sync)", path: "src/components/modules/video/AvatarVideoTab.tsx", type: "file" },
          { name: "VideoProviderSelect.tsx", description: "Selector de provider de video (Ken Burns, Wan, Kling, etc)", path: "src/components/modules/video/VideoProviderSelect.tsx", type: "file" },
          { name: "VideoModeToggle.tsx", description: "Toggle manual/auto mode", path: "src/components/modules/video/VideoModeToggle.tsx", type: "file" },
          { name: "VideoPreview.tsx", description: "Preview del video generado", path: "src/components/modules/video/VideoPreview.tsx", type: "file" },
        ],
      },
    ],
  },

  // ── COMPONENTS: UI ────────────────────────────────────────────────
  {
    name: "components/ui/",
    description: "Componentes reutilizables — botones, modals, sliders, toasts. Se usan en TODA la app",
    path: "src/components/ui",
    type: "folder",
    icon: Eye,
    color: "#E879F9",
    children: [
      { name: "button.tsx", description: "Boton con variantes (primary, secondary, ghost, danger)", path: "src/components/ui/button.tsx", type: "file" },
      { name: "toast.tsx", description: "Sistema de notificaciones — ToastContainer va en layout.tsx", path: "src/components/ui/toast.tsx", type: "file" },
      { name: "modal.tsx", description: "Modal/dialog reutilizable", path: "src/components/ui/modal.tsx", type: "file" },
      { name: "dropzone.tsx", description: "Zona de drag & drop para subir imagenes", path: "src/components/ui/dropzone.tsx", type: "file" },
      { name: "slider.tsx", description: "Slider con label y valor (para enhance, shadows, etc)", path: "src/components/ui/slider.tsx", type: "file" },
      { name: "tabs.tsx", description: "Tabs reutilizables", path: "src/components/ui/tabs.tsx", type: "file" },
      { name: "empty-state.tsx", description: "Estado vacio — se muestra cuando no hay imagen cargada en el editor", path: "src/components/ui/empty-state.tsx", type: "file" },
      { name: "module-header.tsx", description: "Header de cada modulo panel — titulo, descripcion, whyNeeded", path: "src/components/ui/module-header.tsx", type: "file" },
      { name: "result-banner.tsx", description: "Banner de exito despues de procesar — muestra costo + sugerencias", path: "src/components/ui/result-banner.tsx", type: "file" },
      { name: "processing-overlay.tsx", description: "Overlay de progreso durante procesamiento", path: "src/components/ui/processing-overlay.tsx", type: "file" },
      { name: "image-compare.tsx", description: "Slider antes/despues para comparar imagenes", path: "src/components/ui/image-compare.tsx", type: "file" },
      { name: "color-picker.tsx", description: "Color picker con presets y hex input", path: "src/components/ui/color-picker.tsx", type: "file" },
      { name: "select.tsx", description: "Dropdown select", path: "src/components/ui/select.tsx", type: "file" },
      { name: "progress.tsx", description: "Barra de progreso", path: "src/components/ui/progress.tsx", type: "file" },
      { name: "spinner.tsx", description: "Spinner de carga", path: "src/components/ui/spinner.tsx", type: "file" },
      { name: "switch.tsx", description: "Toggle switch", path: "src/components/ui/switch.tsx", type: "file" },
      { name: "badge.tsx", description: "Badge/chip para labels", path: "src/components/ui/badge.tsx", type: "file" },
      { name: "card.tsx", description: "Card container", path: "src/components/ui/card.tsx", type: "file" },
      { name: "tooltip.tsx", description: "Tooltip on hover", path: "src/components/ui/tooltip.tsx", type: "file" },
    ],
  },

  // ── COMPONENTS: EDITOR ────────────────────────────────────────────
  {
    name: "components/editor/",
    description: "Componentes del editor principal — sidebar de modulos, toolbar, capas, propiedades",
    path: "src/components/editor",
    type: "folder",
    icon: Layout,
    color: "#5B9CF6",
    children: [
      { name: "ModuleSidebar.tsx", description: "Sidebar izquierda con iconos de modulos agrupados por categoria (FONDOS, MEJORA, EDICION, MODELOS, CONTENIDO, AUTO)", editHint: "Agregar/quitar modulos del sidebar, cambiar iconos o categorias", path: "src/components/editor/ModuleSidebar.tsx", type: "file", color: "#C5A47E" },
      { name: "Toolbar.tsx", description: "Barra superior — undo/redo, zoom, export PNG/JPG/WebP", path: "src/components/editor/Toolbar.tsx", type: "file" },
      { name: "LayersPanel.tsx", description: "Panel de capas — reordenar, show/hide, lock, rename, opacity", path: "src/components/editor/LayersPanel.tsx", type: "file" },
      { name: "PropertiesPanel.tsx", description: "Panel de propiedades — posicion, tamanio, rotacion, filtros de la capa seleccionada", path: "src/components/editor/PropertiesPanel.tsx", type: "file" },
      { name: "ShadowsGuidePanel.tsx", description: "Guia visual de como funcionan las sombras", path: "src/components/editor/ShadowsGuidePanel.tsx", type: "file" },
      { name: "TryOnGuidePanel.tsx", description: "Guia paso a paso para usar try-on correctamente", path: "src/components/editor/TryOnGuidePanel.tsx", type: "file" },
    ],
  },

  // ── COMPONENTS: DASHBOARD ─────────────────────────────────────────
  {
    name: "components/dashboard/",
    description: "Componentes del dashboard principal",
    path: "src/components/dashboard",
    type: "folder",
    icon: Layout,
    color: "#50C878",
    children: [
      { name: "AgentChat.tsx", description: "Chat interface del AI Agent en el dashboard — 5 widgets: welcome, config, plan, progress, result", path: "src/components/dashboard/AgentChat.tsx", type: "file" },
    ],
  },

  // ── HOOKS ──────────────────────────────────────────────────────────
  {
    name: "hooks/",
    description: "Custom React hooks — logica reutilizable para procesamiento, editor, costos",
    path: "src/hooks",
    type: "folder",
    icon: Code,
    color: "#F5A623",
    children: [
      { name: "useAgentPipeline.ts", description: "MOTOR del AI Agent — orquesta /api/* routes secuencialmente, maneja contexto (currentUrl, garmentUrl, modelUrl)", editHint: "Agregar soporte para nuevos modulos en el agent, cambiar logica de ejecucion", path: "src/hooks/useAgentPipeline.ts", type: "file", color: "#C5A47E" },
      { name: "useEditor.ts", description: "Hook del editor Fabric.js — addImage, export, undo/redo, canvas state", path: "src/hooks/useEditor.ts", type: "file" },
      { name: "useImageProcessing.ts", description: "Hook generico de procesamiento — loading state, error handling, call API", path: "src/hooks/useImageProcessing.ts", type: "file" },
      { name: "useBatchProcessing.ts", description: "Hook de batch — ejecuta pipeline en multiples imagenes", path: "src/hooks/useBatchProcessing.ts", type: "file" },
      { name: "useApiCost.ts", description: "Tracking de costos — cuanto has gastado en APIs", path: "src/hooks/useApiCost.ts", type: "file" },
      { name: "use-toast.ts", description: "Zustand store para toasts — toast.success(), toast.error()", editHint: "import { toast } from '@/hooks/use-toast'", path: "src/hooks/use-toast.ts", type: "file" },
    ],
  },

  // ── LIB: API ──────────────────────────────────────────────────────
  {
    name: "lib/api/",
    description: "Clientes de APIs externas — la conexion directa con los proveedores de IA",
    path: "src/lib/api",
    type: "folder",
    icon: Globe,
    color: "#FF6B6B",
    children: [
      { name: "replicate.ts", description: "Cliente Replicate — submit prediction, poll status, get result. Usado por: bg-remove, bg-generate, shadows, inpaint, outpaint, tryon, model-create, video, upscale", editHint: "Cambiar modelos de Replicate, agregar nuevos providers", path: "src/lib/api/replicate.ts", type: "file", color: "#FF6B6B" },
      { name: "fal.ts", description: "Cliente fal.ai — mismo patron submit/poll. Usado por: video (Kling, Wan), avatar (MuseTalk), upscale (Aura SR)", path: "src/lib/api/fal.ts", type: "file" },
      { name: "fashn.ts", description: "Cliente FASHN — try-on, model-create, model-swap. Excluye lingerie de tryon", path: "src/lib/api/fashn.ts", type: "file" },
      { name: "withoutbg.ts", description: "Cliente withoutBG — BG removal API barato (0.05 EUR/imagen)", path: "src/lib/api/withoutbg.ts", type: "file" },
    ],
  },

  // ── LIB: PROCESSING ──────────────────────────────────────────────
  {
    name: "lib/processing/",
    description: "Logica de procesamiento de cada modulo — estos son los que realmente transforman las imagenes",
    path: "src/lib/processing",
    type: "folder",
    icon: Zap,
    color: "#E879F9",
    children: [
      { name: "bg-remove.ts", description: "Logica de BG removal — router entre browser/withoutbg/replicate/removebg", path: "src/lib/processing/bg-remove.ts", type: "file" },
      { name: "bg-remove-browser.ts", description: "BG removal en browser via @imgly WASM (gratis)", path: "src/lib/processing/bg-remove-browser.ts", type: "file" },
      { name: "bg-generate.ts", description: "Generacion de fondos — Flux Schnell/Dev/Kontext + compositing con Sharp", path: "src/lib/processing/bg-generate.ts", type: "file" },
      { name: "enhance.ts", description: "Enhancement con Sharp — white balance, brightness, contrast, saturation, sharpening, noise reduction + presets", path: "src/lib/processing/enhance.ts", type: "file" },
      { name: "shadows.ts", description: "Sombras — programaticas (drop/contact/reflection) + IC-Light IA", path: "src/lib/processing/shadows.ts", type: "file" },
      { name: "inpaint.ts", description: "Inpainting — Flux Fill Pro/Dev con mascara, Flux Kontext sin mascara", path: "src/lib/processing/inpaint.ts", type: "file" },
      { name: "outpaint.ts", description: "Outpainting — extension de canvas con Flux Kontext", path: "src/lib/processing/outpaint.ts", type: "file" },
      { name: "tryon.ts", description: "Virtual try-on — smart router: lingerie→IDM-VTON, otro→FASHN", path: "src/lib/processing/tryon.ts", type: "file" },
      { name: "model-create.ts", description: "Crear modelo IA — FASHN Model Create + buildModelPrompt", path: "src/lib/processing/model-create.ts", type: "file" },
      { name: "ghost-mannequin.ts", description: "Ghost mannequin — Flux Kontext inpainting", path: "src/lib/processing/ghost-mannequin.ts", type: "file" },
      { name: "jewelry.ts", description: "Jewelry try-on — Flux Kontext para cada tipo de accesorio", path: "src/lib/processing/jewelry.ts", type: "file" },
      { name: "video.ts", description: "Video generation — Wan 2.1/2.2, Kling, LTX, Ken Burns", path: "src/lib/processing/video.ts", type: "file" },
      { name: "avatar.ts", description: "Avatar parlante — Wav2Lip, MuseTalk, SadTalker, LivePortrait", path: "src/lib/processing/avatar.ts", type: "file" },
      { name: "ad-compose.ts", description: "Composicion de anuncios — template + video + texto", path: "src/lib/processing/ad-compose.ts", type: "file" },
      { name: "upscale.ts", description: "Upscaling — Real-ESRGAN, Clarity, Aura SR", path: "src/lib/processing/upscale.ts", type: "file" },
      { name: "sharp-utils.ts", description: "Utilidades Sharp — resize, format convert, watermark, compress", path: "src/lib/processing/sharp-utils.ts", type: "file" },
    ],
  },

  // ── LIB: VIDEO ────────────────────────────────────────────────────
  {
    name: "lib/video/",
    description: "Sistema de video — providers, presets, costos, TTS",
    path: "src/lib/video",
    type: "folder",
    icon: Video,
    color: "#FF6B6B",
    children: [
      { name: "providers.ts", description: "Registry de 7 video providers con sus configs, modelos, precios", path: "src/lib/video/providers.ts", type: "file" },
      { name: "presets.ts", description: "Motion presets — product-rotate, camera-orbit, fashion-walk, etc", path: "src/lib/video/presets.ts", type: "file" },
      { name: "cost.ts", description: "Calculadora de costos por provider y duracion", path: "src/lib/video/cost.ts", type: "file" },
      { name: "tts.ts", description: "Text-to-Speech servidor — Edge TTS (Node.js WebSocket). SOLO server-side", editHint: "NO importar en componentes client — usa tts-voices.ts para constantes", path: "src/lib/video/tts.ts", type: "file", color: "#FF6B6B" },
      { name: "tts-voices.ts", description: "Constantes de voces/idiomas TTS — SEGURO para client-side", path: "src/lib/video/tts-voices.ts", type: "file" },
    ],
  },

  // ── LIB: OTHER ────────────────────────────────────────────────────
  {
    name: "lib/db/",
    description: "Base de datos — Prisma client, queries, persistencia",
    path: "src/lib/db",
    type: "folder",
    icon: Database,
    color: "#5B9CF6",
    children: [
      { name: "prisma.ts", description: "Prisma client singleton — conexion a PostgreSQL", path: "src/lib/db/prisma.ts", type: "file" },
      { name: "queries.ts", description: "Queries reutilizables — getHistory, saveProcessingJob, etc", path: "src/lib/db/queries.ts", type: "file" },
      { name: "persist.ts", description: "Persistencia local — localStorage fallback cuando no hay DB", path: "src/lib/db/persist.ts", type: "file" },
    ],
  },
  {
    name: "lib/batch/",
    description: "Sistema de batch processing",
    path: "src/lib/batch",
    type: "folder",
    icon: Layers,
    color: "#F5A623",
    children: [
      { name: "pipeline.ts", description: "Pipeline builder — define secuencia de operaciones para batch", path: "src/lib/batch/pipeline.ts", type: "file" },
      { name: "queue.ts", description: "Queue system — maneja cola de imagenes a procesar", path: "src/lib/batch/queue.ts", type: "file" },
    ],
  },
  {
    name: "lib/brand/",
    description: "Kit de marca y compliance",
    path: "src/lib/brand",
    type: "folder",
    icon: Palette,
    color: "#C5A47E",
    children: [
      { name: "brand-kit.ts", description: "Logica de brand kit — colores, fonts, watermark", path: "src/lib/brand/brand-kit.ts", type: "file" },
      { name: "compliance.ts", description: "Checker de compliance — valida dimensiones, formato, BG color por marketplace", path: "src/lib/brand/compliance.ts", type: "file" },
    ],
  },
  {
    name: "lib/utils/",
    description: "Utilidades generales",
    path: "src/lib/utils",
    type: "folder",
    icon: Settings,
    color: "#8A8A90",
    children: [
      { name: "cn.ts", description: "clsx + tailwind-merge helper para clases CSS condicionales", path: "src/lib/utils/cn.ts", type: "file" },
      { name: "constants.ts", description: "Constantes globales — limits, defaults", path: "src/lib/utils/constants.ts", type: "file" },
      { name: "cost-tracker.ts", description: "Tracking de costos acumulados por sesion", path: "src/lib/utils/cost-tracker.ts", type: "file" },
      { name: "image.ts", description: "Utilidades de imagen — file→dataURL, resize, format detect", path: "src/lib/utils/image.ts", type: "file" },
      { name: "prompts.ts", description: "Templates de prompts para cada modulo", path: "src/lib/utils/prompts.ts", type: "file" },
    ],
  },

  // ── STORES ─────────────────────────────────────────────────────────
  {
    name: "stores/",
    description: "Zustand stores — estado global de la app (como Redux pero simple)",
    path: "src/stores",
    type: "folder",
    icon: Database,
    color: "#F5A623",
    children: [
      { name: "editor-store.ts", description: "Estado del editor — imagen actual, modulo seleccionado, historial, canvas, before/after", editHint: "Agregar nuevo estado al editor, nuevas acciones", path: "src/stores/editor-store.ts", type: "file", color: "#C5A47E" },
      { name: "video-store.ts", description: "Estado del Video Studio — provider, modo, parametros, resultado", path: "src/stores/video-store.ts", type: "file" },
      { name: "batch-store.ts", description: "Estado de batch — imagenes, pipeline, progreso", path: "src/stores/batch-store.ts", type: "file" },
      { name: "brand-store.ts", description: "Estado de brand kit — colores, logo, watermark", path: "src/stores/brand-store.ts", type: "file" },
      { name: "gallery-store.ts", description: "Estado de galeria — imagenes guardadas, filtros, busqueda", path: "src/stores/gallery-store.ts", type: "file" },
      { name: "settings-store.ts", description: "Settings globales — API keys status, preferencias", path: "src/stores/settings-store.ts", type: "file" },
    ],
  },

  // ── TYPES ──────────────────────────────────────────────────────────
  {
    name: "types/",
    description: "TypeScript type definitions — interfaces y tipos para toda la app",
    path: "src/types",
    type: "folder",
    icon: Code,
    color: "#5B9CF6",
    children: [
      { name: "agent.ts", description: "Tipos del AI Agent — AgentType, PipelineStep, AgentPlan, StepExecution", path: "src/types/agent.ts", type: "file" },
      { name: "api.ts", description: "Tipos de API responses — ProcessingResult, ApiResponse, etc", path: "src/types/api.ts", type: "file" },
      { name: "editor.ts", description: "Tipos del editor — EditorState, Layer, Tool, etc", path: "src/types/editor.ts", type: "file" },
      { name: "video.ts", description: "Tipos de video — VideoProvider, VideoPreset, AvatarProvider", path: "src/types/video.ts", type: "file" },
      { name: "batch.ts", description: "Tipos de batch — Pipeline, BatchJob, BatchResult", path: "src/types/batch.ts", type: "file" },
      { name: "brand.ts", description: "Tipos de brand — BrandKit, ComplianceResult, Platform", path: "src/types/brand.ts", type: "file" },
    ],
  },
];

// =============================================================================
// Quick Reference: "Where do I go to..."
// =============================================================================

interface QuickRef {
  question: string;
  answer: string;
  files: string[];
  icon: React.ElementType;
  color: string;
}

const QUICK_REFERENCE: QuickRef[] = [
  {
    question: "Cambiar los colores de toda la app?",
    answer: "Edita las CSS variables en globals.css (:root). Cambia --accent para el dorado, --bg-primary para el fondo negro, etc.",
    files: ["src/app/globals.css"],
    icon: Palette,
    color: "#E879F9",
  },
  {
    question: "Agregar un nuevo modulo/herramienta?",
    answer: "1) Crea el panel en components/modules/ 2) Crea el API route en app/api/ 3) Crea el procesamiento en lib/processing/ 4) Registralo en editor/page.tsx y en ModuleSidebar.tsx",
    files: ["src/components/modules/", "src/app/api/", "src/lib/processing/", "src/app/editor/page.tsx", "src/components/editor/ModuleSidebar.tsx"],
    icon: PenTool,
    color: "#C5A47E",
  },
  {
    question: "Cambiar un modelo de IA (Replicate/fal.ai)?",
    answer: "Los modelos estan en lib/processing/[modulo].ts. El ID del modelo de Replicate esta ahi. Los community models NECESITAN :hash despues del nombre.",
    files: ["src/lib/processing/", "src/lib/api/replicate.ts"],
    icon: Zap,
    color: "#FF6B6B",
  },
  {
    question: "Modificar el AI Agent?",
    answer: "Plan: api/ai-agent/plan/route.ts. Ejecucion: hooks/useAgentPipeline.ts. UI del editor: components/modules/AiAgentPanel.tsx. UI standalone: app/agent/page.tsx",
    files: ["src/app/api/ai-agent/plan/route.ts", "src/hooks/useAgentPipeline.ts", "src/components/modules/AiAgentPanel.tsx", "src/app/agent/page.tsx"],
    icon: Bot,
    color: "#C5A47E",
  },
  {
    question: "Agregar un nuevo provider de video?",
    answer: "Registralo en lib/video/providers.ts, agrega precios en lib/video/cost.ts, actualiza types/video.ts, agrega la llamada en lib/processing/video.ts",
    files: ["src/lib/video/providers.ts", "src/lib/video/cost.ts", "src/types/video.ts", "src/lib/processing/video.ts"],
    icon: Video,
    color: "#FF6B6B",
  },
  {
    question: "Cambiar como se ven las notificaciones/toasts?",
    answer: "El componente visual esta en components/ui/toast.tsx. El store esta en hooks/use-toast.ts. Uso: toast.success('msg'), toast.error('msg')",
    files: ["src/components/ui/toast.tsx", "src/hooks/use-toast.ts"],
    icon: Eye,
    color: "#E879F9",
  },
  {
    question: "Cambiar el dashboard (pagina principal)?",
    answer: "Todo el dashboard esta en app/page.tsx — hero, tarjetas de modulos, CTAs, escenarios de 'por donde empezar'",
    files: ["src/app/page.tsx"],
    icon: Layout,
    color: "#5B9CF6",
  },
  {
    question: "Configurar la base de datos?",
    answer: "Schema en prisma/schema.prisma. Client en lib/db/prisma.ts. Queries en lib/db/queries.ts. La DB es PostgreSQL via Prisma.",
    files: ["prisma/schema.prisma", "src/lib/db/prisma.ts", "src/lib/db/queries.ts"],
    icon: Database,
    color: "#5B9CF6",
  },
  {
    question: "Cambiar las API keys / env vars?",
    answer: "Edita .env.local en la raiz del proyecto. Nunca commitas este archivo. Las keys necesarias: REPLICATE_API_TOKEN, FAL_KEY, FASHN_API_KEY, ANTHROPIC_API_KEY",
    files: [".env.local"],
    icon: Settings,
    color: "#F5A623",
  },
  {
    question: "Ver los workflows visuales (como Weavy)?",
    answer: "Ve a /workflows — editor visual de nodos que muestra como se conectan todos los modulos. 5 templates pre-hechos.",
    files: ["src/app/workflows/page.tsx"],
    icon: LayoutGrid,
    color: "#50C878",
  },
];

// =============================================================================
// Tree Renderer
// =============================================================================

function FileTreeItem({ entry, depth = 0 }: { entry: FileEntry; depth?: number }) {
  const [isOpen, setIsOpen] = useState(depth < 1);
  const Icon = entry.icon || (entry.type === "folder" ? Folder : FileCode);
  const color = entry.color || (entry.type === "folder" ? "#C5A47E" : "#8A8A90");

  return (
    <div>
      <button
        onClick={() => entry.children && setIsOpen(!isOpen)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 hover:bg-white/[0.03] group"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Expand icon */}
        <div className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
          {entry.children ? (
            isOpen ? (
              <ChevronDown className="h-3 w-3 text-[#55555A]" />
            ) : (
              <ChevronRight className="h-3 w-3 text-[#55555A]" />
            )
          ) : (
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          )}
        </div>

        {/* Icon */}
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <Icon className="h-3 w-3" style={{ color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[12px] font-semibold"
              style={{ color: entry.type === "folder" ? "#F5F5F5" : "#D4D4D8" }}
            >
              {entry.name}
            </span>
            {entry.editorLink && (
              <Link
                href={entry.editorLink}
                onClick={(e) => e.stopPropagation()}
                className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
              >
                Abrir
              </Link>
            )}
          </div>
          <p className="text-[10px] text-[#8A8A90] leading-relaxed mt-0.5">
            {entry.description}
          </p>
          {entry.editHint && (
            <p className="text-[9px] mt-1 leading-relaxed" style={{ color: "#F5A623" }}>
              Editar: {entry.editHint}
            </p>
          )}
        </div>
      </button>

      {/* Children */}
      {isOpen && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem key={child.path} entry={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function DocsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"tree" | "reference">("tree");

  // Filter tree by search
  const filteredTree = search
    ? PROJECT_TREE.map((folder) => ({
        ...folder,
        children: folder.children?.filter(
          (f) =>
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.description.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((f) => (f.children?.length ?? 0) > 0 || f.name.toLowerCase().includes(search.toLowerCase()))
    : PROJECT_TREE;

  const filteredRef = search
    ? QUICK_REFERENCE.filter(
        (r) =>
          r.question.toLowerCase().includes(search.toLowerCase()) ||
          r.answer.toLowerCase().includes(search.toLowerCase())
      )
    : QUICK_REFERENCE;

  return (
    <div className="min-h-screen" style={{ background: "#09090B" }}>
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#8A8A90] hover:text-[#F5F5F5] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BookOpen className="h-5 w-5" style={{ color: "#C5A47E" }} />
              <h1 className="text-[28px] font-bold text-[#F5F5F5]">
                Mapa del Proyecto
              </h1>
            </div>
            <p className="text-[14px] text-[#8A8A90]">
              Cada archivo, cada carpeta, que hace y donde ir para cambiarlo
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { label: "Paginas", value: "7", color: "#5B9CF6" },
            { label: "API Routes", value: "28", color: "#FF6B6B" },
            { label: "Modulos", value: "17", color: "#C5A47E" },
            { label: "Componentes", value: "53", color: "#E879F9" },
            { label: "Archivos TS", value: "161", color: "#F5A623" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4 text-center"
              style={{
                background: "#111113",
                border: "1px solid #262629",
              }}
            >
              <div className="text-[22px] font-bold" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#55555A] mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Search + Tabs */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2.5"
            style={{ background: "#111113", border: "1px solid #262629" }}
          >
            <Search className="h-4 w-4 text-[#55555A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar archivo, carpeta o pregunta..."
              className="flex-1 bg-transparent text-[13px] text-[#F5F5F5] placeholder:text-[#3A3A3E] outline-none"
            />
          </div>

          <div className="flex gap-1 rounded-lg p-1" style={{ background: "#111113", border: "1px solid #262629" }}>
            {(["tree", "reference"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-1.5 rounded-md text-[12px] font-medium transition-all"
                style={{
                  background: activeTab === tab ? "#C5A47E20" : "transparent",
                  color: activeTab === tab ? "#C5A47E" : "#55555A",
                }}
              >
                {tab === "tree" ? "Archivos" : "Donde voy para...?"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === "tree" ? (
          <div
            className="rounded-xl"
            style={{ background: "#111113", border: "1px solid #262629" }}
          >
            <div className="py-2">
              {filteredTree.map((entry) => (
                <FileTreeItem key={entry.path} entry={entry} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRef.map((ref) => {
              const RefIcon = ref.icon;
              return (
                <div
                  key={ref.question}
                  className="rounded-xl p-5"
                  style={{
                    background: "#111113",
                    border: "1px solid #262629",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5"
                      style={{
                        background: `${ref.color}15`,
                        border: `1px solid ${ref.color}25`,
                      }}
                    >
                      <RefIcon className="h-4 w-4" style={{ color: ref.color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[14px] font-semibold text-[#F5F5F5] mb-2">
                        {ref.question}
                      </h3>
                      <p className="text-[12px] text-[#8A8A90] leading-relaxed mb-3">
                        {ref.answer}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {ref.files.map((f) => (
                          <span
                            key={f}
                            className="text-[10px] font-mono px-2 py-1 rounded-md"
                            style={{
                              background: "#1A1A1D",
                              color: "#D4D4D8",
                              border: "1px solid #262629",
                            }}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick links */}
        <div className="mt-10 flex items-center justify-center gap-4">
          {[
            { label: "Dashboard", href: "/", icon: Layout },
            { label: "Editor", href: "/editor", icon: PenTool },
            { label: "Workflows", href: "/workflows", icon: LayoutGrid },
            { label: "AI Agent", href: "/agent", icon: Bot },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-medium transition-all hover:-translate-y-0.5"
              style={{ background: "#111113", border: "1px solid #262629", color: "#8A8A90" }}
            >
              <link.icon className="h-3.5 w-3.5" />
              {link.label}
              <ExternalLink className="h-3 w-3" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
