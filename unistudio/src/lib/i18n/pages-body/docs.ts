// =============================================================================
// i18n — Textos visibles del cuerpo de la página de Documentación (ES / EN)
// =============================================================================
// Fuente única de todo el texto de la UI de `src/app/docs/page.tsx` MENOS el
// encabezado (título/subtítulo, que vive en `pages.ts` → `t.pages.docs`).
//
// Se consume de forma desacoplada, sin tocar `translations.ts`:
//
//   import { DOCS_BODY_ES, DOCS_BODY_EN } from '@/lib/i18n/pages-body/docs';
//   const { locale } = useI18n();
//   const b = locale === 'en' ? DOCS_BODY_EN : DOCS_BODY_ES;
//   <span>{b.ui.open}</span>
//
// Reglas de escritura:
//  1. Los valores ES son idénticos byte-a-byte a los que había en page.tsx
//     (se preservan acentos, guiones largos "—", flechas "→", etc.).
//  2. Los valores EN son inglés profesional y natural.
//  3. NUNCA se traducen rutas de archivo, nombres de carpeta/archivo, código,
//     rutas de ruta (route strings) ni identificadores técnicos que aparecen
//     como contenido: SOLO las descripciones/etiquetas legibles por humanos.
//  4. `tree` está indexado por la `path` de cada entrada (clave estable y única).
//  5. `quickRef` es un array alineado por índice con `QUICK_REFERENCE` en page.tsx.
//  6. Ambos idiomas tienen EXACTAMENTE la misma forma para que TypeScript
//     garantice que ninguna clave quede sin traducir.
// =============================================================================

/** Copy de un nodo del árbol de proyecto (descripción + pista de edición). */
export interface TreeNodeCopy {
  description: string;
  editHint?: string;
}

/** Copy de una tarjeta de "¿Dónde voy para...?". */
export interface QuickRefCopy {
  question: string;
  answer: string;
}

/** Etiquetas sueltas de la UI del cuerpo. */
export interface DocsBodyUiCopy {
  /** Badge para abrir una página desde el árbol. */
  open: string;
  /** Prefijo de la línea de pista de edición ("Editar:" / "Edit:"). */
  editPrefix: string;
  /** Placeholder del buscador. */
  searchPlaceholder: string;
  /** Pestaña del árbol de archivos. */
  tabFiles: string;
  /** Pestaña de la referencia rápida. */
  tabReference: string;
}

/** Etiquetas de las tarjetas de estadísticas (los valores numéricos no cambian). */
export interface DocsBodyStatsCopy {
  pages: string;
  apiRoutes: string;
  modules: string;
  components: string;
  tsFiles: string;
}

export interface DocsBodyCopy {
  ui: DocsBodyUiCopy;
  stats: DocsBodyStatsCopy;
  /** Descripciones/pistas del árbol de proyecto, indexadas por `path`. */
  tree: Record<string, TreeNodeCopy>;
  /** Tarjetas de referencia rápida, alineadas por índice con QUICK_REFERENCE. */
  quickRef: QuickRefCopy[];
}

// =============================================================================
// Español (byte-a-byte idéntico a lo que había en page.tsx)
// =============================================================================

export const DOCS_BODY_ES: DocsBodyCopy = {
  ui: {
    open: "Abrir",
    editPrefix: "Editar:",
    searchPlaceholder: "Buscar archivo, carpeta o pregunta...",
    tabFiles: "Archivos",
    tabReference: "Donde voy para...?",
  },
  stats: {
    pages: "Paginas",
    apiRoutes: "API Routes",
    modules: "Modulos",
    components: "Componentes",
    tsFiles: "Archivos TS",
  },
  tree: {
    // ── PAGES ──────────────────────────────────────────────────────────
    "src/app": {
      description: "Todas las paginas y API routes de la aplicacion",
    },
    "src/app/page.tsx": {
      description: "Dashboard principal — la pagina de inicio con todas las herramientas, hero section, tarjetas de modulos",
      editHint: "Cambiar textos, agregar/quitar herramientas del dashboard, modificar el hero",
    },
    "src/app/layout.tsx": {
      description: "Layout raiz — envuelve TODA la app. Fuente Inter, ToastContainer, metadata SEO",
      editHint: "Cambiar titulo/descripcion SEO, agregar providers globales, modificar fuente",
    },
    "src/app/globals.css": {
      description: "TODOS los colores y estilos globales. Variables CSS del design system (--bg-primary, --accent, etc)",
      editHint: "Cambiar colores de la app, fuentes, scrollbar, animaciones. ESTE es el archivo para cambiar el look completo",
    },
    "src/app/editor/page.tsx": {
      description: "Editor principal — canvas central + sidebar izquierda (modulos) + sidebar derecha (capas/propiedades). Aqui viven TODOS los 19 paneles de modulos",
      editHint: "Agregar nuevos modulos al editor, cambiar layout del canvas, modificar la barra de herramientas",
    },
    "src/app/agent/page.tsx": {
      description: "Pagina standalone del AI Agent — workflow de 5 pasos: elegir agente → subir imagen → configurar → procesar → resultado",
      editHint: "Modificar el flujo del agente, agregar nuevos tipos de agente, cambiar la UI del wizard",
    },
    "src/app/workflows/page.tsx": {
      description: "Editor visual de workflows (estilo Weavy) — nodos arrastrables que muestran como se conectan los modulos",
      editHint: "Agregar nuevos templates de workflow, modificar nodos, cambiar conexiones",
    },
    "src/app/batch/page.tsx": {
      description: "Procesamiento masivo — sube multiples fotos y aplica un pipeline a todas",
      editHint: "Modificar el pipeline builder, agregar presets de batch",
    },
    "src/app/gallery/page.tsx": {
      description: "Galeria de imagenes — historial de todo lo procesado, sincronizado con DB",
      editHint: "Cambiar como se muestran las imagenes, filtros, busqueda",
    },
    "src/app/brand-kit/page.tsx": {
      description: "Kit de marca — colores, logo, tipografia, watermark de Unistyles",
      editHint: "Agregar campos de marca, cambiar opciones de watermark",
    },
    "src/app/docs/page.tsx": {
      description: "ESTA pagina — documentacion interactiva del proyecto",
    },

    // ── API ROUTES ────────────────────────────────────────────────────
    "src/app/api": {
      description: "28 API routes — cada modulo tiene su endpoint. Aqui se conectan con Replicate, fal.ai, FASHN, etc",
    },
    "src/app/api/bg-remove/route.ts": {
      description: "Quitar fondo — browser WASM (gratis), withoutBG, Replicate RMBG, remove.bg",
      editHint: "Agregar nuevo provider de BG removal, cambiar modelo de Replicate",
    },
    "src/app/api/bg-generate/route.ts": {
      description: "Generar fondos IA — Flux Schnell/Dev/Kontext, Seedream. Modo preciso vs creativo",
      editHint: "Agregar nuevos modelos de generacion, cambiar presets de fondo",
    },
    "src/app/api/enhance/route.ts": {
      description: "Mejorar imagen — Sharp (gratis): brillo, contraste, saturacion, nitidez",
      editHint: "Agregar nuevos presets de mejora, modificar parametros",
    },
    "src/app/api/upscale/route.ts": {
      description: "Aumentar resolucion — Real-ESRGAN, Clarity Upscaler, Aura SR",
    },
    "src/app/api/shadows/route.ts": {
      description: "Sombras — programaticas (gratis) + IC-Light IA ($0.02) + Flux Kontext ($0.055)",
    },
    "src/app/api/inpaint/route.ts": {
      description: "Borrar/reemplazar — Flux Fill Pro/Dev, Flux Kontext (sin mascara)",
    },
    "src/app/api/outpaint/route.ts": {
      description: "Extender imagen — adaptar formato para cada plataforma (IG, TikTok, Amazon)",
    },
    "src/app/api/tryon/route.ts": {
      description: "Prueba virtual ropa — FASHN (no lingerie), IDM-VTON (si lingerie), CatVTON, Kolors",
      editHint: "El smart router decide: lingerie → IDM-VTON, otro → FASHN",
    },
    "src/app/api/model-create/route.ts": {
      description: "Crear modelo IA — FASHN Model Create, Face to Model, Model Swap",
    },
    "src/app/api/ghost-mannequin/route.ts": {
      description: "Maniqui invisible — Flux Kontext para eliminar maniqui",
    },
    "src/app/api/jewelry-tryon/route.ts": {
      description: "Joyeria virtual — Flux Kontext para aretes, collares, anillos en modelo",
    },
    "src/app/api/video/route.ts": {
      description: "Video Studio — 7 providers: Ken Burns (gratis), LTX, Wan 2.1/2.2, Kling, Minimax",
    },
    "src/app/api/avatar/route.ts": {
      description: "Avatar parlante — Wav2Lip, MuseTalk, SadTalker, LivePortrait, Hedra",
    },
    "src/app/api/tts/route.ts": {
      description: "Text-to-Speech — Edge TTS (gratis), Google Cloud TTS",
    },
    "src/app/api/ad-create/route.ts": {
      description: "Crear anuncios — genera video con formato para IG Reel, TikTok, FB, YouTube",
    },
    "src/app/api/ai-agent/plan/route.ts": {
      description: "AI Agent planner — Claude Haiku genera plan de pasos, con fallback a templates locales",
      editHint: "Modificar el prompt de Claude, agregar nuevos templates de fallback",
    },
    "src/app/api/prompt/route.ts": {
      description: "AI Prompt Assistant — Claude genera prompts optimizados para cada modulo",
    },
    "src/app/api/prompt-templates/route.ts": {
      description: "Templates de prompts guardados en DB",
    },
    "src/app/api/batch/route.ts": {
      description: "Batch processing — ejecuta pipeline en multiples imagenes",
    },
    "src/app/api/brand-kit/route.ts": {
      description: "CRUD de brand kit en DB",
    },
    "src/app/api/health/route.ts": {
      description: "Health check — verifica DB + env vars configurados",
    },
    "src/app/api/upload/route.ts": {
      description: "Upload de imagenes — guarda en disco local o storage",
    },
    "src/app/api/save-result/route.ts": {
      description: "Guardar resultado procesado en DB/historial",
    },
    "src/app/api/db/history/route.ts": {
      description: "Historial de imagenes procesadas desde DB",
    },
    "src/app/api/ai-models/route.ts": {
      description: "CRUD de modelos IA guardados (galeria de modelos creados)",
    },
    "src/app/api/video-enhance/route.ts": {
      description: "Mejora de video post-generacion",
    },
    "src/app/api/inventory/load/route.ts": {
      description: "Carga inventario de productos Unistyles",
    },
    "src/app/api/inventory/scan/route.ts": {
      description: "Escanea carpetas de imagenes de inventario",
    },

    // ── COMPONENTS: MODULES ────────────────────────────────────────────
    "src/components/modules": {
      description: "Paneles de cada modulo — los controles que aparecen en el sidebar izquierdo del editor cuando seleccionas una herramienta",
    },
    "src/components/modules/BgRemovePanel.tsx": {
      description: "Controles para quitar fondo — seleccion de provider, tipo de salida, color picker",
    },
    "src/components/modules/BgGeneratePanel.tsx": {
      description: "Controles para fondos IA — modo preciso/creativo, presets de estilo, prompt custom",
    },
    "src/components/modules/EnhancePanel.tsx": {
      description: "Sliders de mejora — brillo, contraste, saturacion, nitidez + presets (ecommerce, fashion, etc)",
    },
    "src/components/modules/ShadowsPanel.tsx": {
      description: "Controles de sombras — tipo (drop/contact/reflection), iluminacion IA, presets",
    },
    "src/components/modules/InpaintPanel.tsx": {
      description: "Controles de inpainting — prompt de que cambiar, presets de edicion",
    },
    "src/components/modules/OutpaintPanel.tsx": {
      description: "Controles de extension — presets por plataforma (Amazon, IG, TikTok), direccion",
    },
    "src/components/modules/TryOnPanel.tsx": {
      description: "Controles de prueba virtual — subir prenda + modelo, seleccion de provider",
    },
    "src/components/modules/ModelCreatePanel.tsx": {
      description: "Formulario para crear modelo IA — genero, edad, piel, cuerpo, pose, expresion",
    },
    "src/components/modules/GhostMannequinPanel.tsx": {
      description: "Controles de maniqui invisible",
    },
    "src/components/modules/JewelryTryOnPanel.tsx": {
      description: "Controles de joyeria virtual — tipo de accesorio, posicion",
    },
    "src/components/modules/VideoPanel.tsx": {
      description: "Video Studio completo — 3 tabs (Producto/Moda/Avatar), providers, TTS",
    },
    "src/components/modules/AdCreatorPanel.tsx": {
      description: "Crear anuncios — templates por red social, headline, CTA",
    },
    "src/components/modules/AiPromptPanel.tsx": {
      description: "Director creativo IA — describe tu producto, Claude sugiere conceptos",
    },
    "src/components/modules/AiAgentPanel.tsx": {
      description: "AI Agent en el editor — 4 fases: input → plan → ejecutar → resultados",
    },
    "src/components/modules/SmartEditorPanel.tsx": {
      description: "Herramientas del editor avanzado — capas, filtros, texto",
    },
    "src/components/modules/CompliancePanel.tsx": {
      description: "Verificador de marketplace — checa requisitos Amazon, Shopify, etc",
    },
    "src/components/modules/video": {
      description: "Sub-componentes del Video Studio",
    },
    "src/components/modules/video/ProductVideoTab.tsx": {
      description: "Tab de video de producto (gira, zoom, orbita)",
    },
    "src/components/modules/video/FashionVideoTab.tsx": {
      description: "Tab de video de moda (model walk, reveal)",
    },
    "src/components/modules/video/AvatarVideoTab.tsx": {
      description: "Tab de avatar parlante (TTS + lip sync)",
    },
    "src/components/modules/video/VideoProviderSelect.tsx": {
      description: "Selector de provider de video (Ken Burns, Wan, Kling, etc)",
    },
    "src/components/modules/video/VideoModeToggle.tsx": {
      description: "Toggle manual/auto mode",
    },
    "src/components/modules/video/VideoPreview.tsx": {
      description: "Preview del video generado",
    },

    // ── COMPONENTS: UI ────────────────────────────────────────────────
    "src/components/ui": {
      description: "Componentes reutilizables — botones, modals, sliders, toasts. Se usan en TODA la app",
    },
    "src/components/ui/button.tsx": {
      description: "Boton con variantes (primary, secondary, ghost, danger)",
    },
    "src/components/ui/toast.tsx": {
      description: "Sistema de notificaciones — ToastContainer va en layout.tsx",
    },
    "src/components/ui/modal.tsx": {
      description: "Modal/dialog reutilizable",
    },
    "src/components/ui/dropzone.tsx": {
      description: "Zona de drag & drop para subir imagenes",
    },
    "src/components/ui/slider.tsx": {
      description: "Slider con label y valor (para enhance, shadows, etc)",
    },
    "src/components/ui/tabs.tsx": {
      description: "Tabs reutilizables",
    },
    "src/components/ui/empty-state.tsx": {
      description: "Estado vacio — se muestra cuando no hay imagen cargada en el editor",
    },
    "src/components/ui/module-header.tsx": {
      description: "Header de cada modulo panel — titulo, descripcion, whyNeeded",
    },
    "src/components/ui/result-banner.tsx": {
      description: "Banner de exito despues de procesar — muestra costo + sugerencias",
    },
    "src/components/ui/processing-overlay.tsx": {
      description: "Overlay de progreso durante procesamiento",
    },
    "src/components/ui/image-compare.tsx": {
      description: "Slider antes/despues para comparar imagenes",
    },
    "src/components/ui/color-picker.tsx": {
      description: "Color picker con presets y hex input",
    },
    "src/components/ui/select.tsx": {
      description: "Dropdown select",
    },
    "src/components/ui/progress.tsx": {
      description: "Barra de progreso",
    },
    "src/components/ui/spinner.tsx": {
      description: "Spinner de carga",
    },
    "src/components/ui/switch.tsx": {
      description: "Toggle switch",
    },
    "src/components/ui/badge.tsx": {
      description: "Badge/chip para labels",
    },
    "src/components/ui/card.tsx": {
      description: "Card container",
    },
    "src/components/ui/tooltip.tsx": {
      description: "Tooltip on hover",
    },

    // ── COMPONENTS: EDITOR ────────────────────────────────────────────
    "src/components/editor": {
      description: "Componentes del editor principal — sidebar de modulos, toolbar, capas, propiedades",
    },
    "src/components/editor/ModuleSidebar.tsx": {
      description: "Sidebar izquierda con iconos de modulos agrupados por categoria (FONDOS, MEJORA, EDICION, MODELOS, CONTENIDO, AUTO)",
      editHint: "Agregar/quitar modulos del sidebar, cambiar iconos o categorias",
    },
    "src/components/editor/Toolbar.tsx": {
      description: "Barra superior — undo/redo, zoom, export PNG/JPG/WebP",
    },
    "src/components/editor/LayersPanel.tsx": {
      description: "Panel de capas — reordenar, show/hide, lock, rename, opacity",
    },
    "src/components/editor/PropertiesPanel.tsx": {
      description: "Panel de propiedades — posicion, tamanio, rotacion, filtros de la capa seleccionada",
    },
    "src/components/editor/ShadowsGuidePanel.tsx": {
      description: "Guia visual de como funcionan las sombras",
    },
    "src/components/editor/TryOnGuidePanel.tsx": {
      description: "Guia paso a paso para usar try-on correctamente",
    },

    // ── COMPONENTS: DASHBOARD ─────────────────────────────────────────
    "src/components/dashboard": {
      description: "Componentes del dashboard principal",
    },
    "src/components/dashboard/AgentChat.tsx": {
      description: "Chat interface del AI Agent en el dashboard — 5 widgets: welcome, config, plan, progress, result",
    },

    // ── HOOKS ──────────────────────────────────────────────────────────
    "src/hooks": {
      description: "Custom React hooks — logica reutilizable para procesamiento, editor, costos",
    },
    "src/hooks/useAgentPipeline.ts": {
      description: "MOTOR del AI Agent — orquesta /api/* routes secuencialmente, maneja contexto (currentUrl, garmentUrl, modelUrl)",
      editHint: "Agregar soporte para nuevos modulos en el agent, cambiar logica de ejecucion",
    },
    "src/hooks/useEditor.ts": {
      description: "Hook del editor Fabric.js — addImage, export, undo/redo, canvas state",
    },
    "src/hooks/useImageProcessing.ts": {
      description: "Hook generico de procesamiento — loading state, error handling, call API",
    },
    "src/hooks/useBatchProcessing.ts": {
      description: "Hook de batch — ejecuta pipeline en multiples imagenes",
    },
    "src/hooks/useApiCost.ts": {
      description: "Tracking de costos — cuanto has gastado en APIs",
    },
    "src/hooks/use-toast.ts": {
      description: "Zustand store para toasts — toast.success(), toast.error()",
      editHint: "import { toast } from '@/hooks/use-toast'",
    },

    // ── LIB: API ──────────────────────────────────────────────────────
    "src/lib/api": {
      description: "Clientes de APIs externas — la conexion directa con los proveedores de IA",
    },
    "src/lib/api/replicate.ts": {
      description: "Cliente Replicate — submit prediction, poll status, get result. Usado por: bg-remove, bg-generate, shadows, inpaint, outpaint, tryon, model-create, video, upscale",
      editHint: "Cambiar modelos de Replicate, agregar nuevos providers",
    },
    "src/lib/api/fal.ts": {
      description: "Cliente fal.ai — mismo patron submit/poll. Usado por: video (Kling, Wan), avatar (MuseTalk), upscale (Aura SR)",
    },
    "src/lib/api/fashn.ts": {
      description: "Cliente FASHN — try-on, model-create, model-swap. Excluye lingerie de tryon",
    },
    "src/lib/api/withoutbg.ts": {
      description: "Cliente withoutBG — BG removal API barato (0.05 EUR/imagen)",
    },

    // ── LIB: PROCESSING ──────────────────────────────────────────────
    "src/lib/processing": {
      description: "Logica de procesamiento de cada modulo — estos son los que realmente transforman las imagenes",
    },
    "src/lib/processing/bg-remove.ts": {
      description: "Logica de BG removal — router entre browser/withoutbg/replicate/removebg",
    },
    "src/lib/processing/bg-remove-browser.ts": {
      description: "BG removal en browser via @imgly WASM (gratis)",
    },
    "src/lib/processing/bg-generate.ts": {
      description: "Generacion de fondos — Flux Schnell/Dev/Kontext + compositing con Sharp",
    },
    "src/lib/processing/enhance.ts": {
      description: "Enhancement con Sharp — white balance, brightness, contrast, saturation, sharpening, noise reduction + presets",
    },
    "src/lib/processing/shadows.ts": {
      description: "Sombras — programaticas (drop/contact/reflection) + IC-Light IA",
    },
    "src/lib/processing/inpaint.ts": {
      description: "Inpainting — Flux Fill Pro/Dev con mascara, Flux Kontext sin mascara",
    },
    "src/lib/processing/outpaint.ts": {
      description: "Outpainting — extension de canvas con Flux Kontext",
    },
    "src/lib/processing/tryon.ts": {
      description: "Virtual try-on — smart router: lingerie→IDM-VTON, otro→FASHN",
    },
    "src/lib/processing/model-create.ts": {
      description: "Crear modelo IA — FASHN Model Create + buildModelPrompt",
    },
    "src/lib/processing/ghost-mannequin.ts": {
      description: "Ghost mannequin — Flux Kontext inpainting",
    },
    "src/lib/processing/jewelry.ts": {
      description: "Jewelry try-on — Flux Kontext para cada tipo de accesorio",
    },
    "src/lib/processing/video.ts": {
      description: "Video generation — Wan 2.1/2.2, Kling, LTX, Ken Burns",
    },
    "src/lib/processing/avatar.ts": {
      description: "Avatar parlante — Wav2Lip, MuseTalk, SadTalker, LivePortrait",
    },
    "src/lib/processing/ad-compose.ts": {
      description: "Composicion de anuncios — template + video + texto",
    },
    "src/lib/processing/upscale.ts": {
      description: "Upscaling — Real-ESRGAN, Clarity, Aura SR",
    },
    "src/lib/processing/sharp-utils.ts": {
      description: "Utilidades Sharp — resize, format convert, watermark, compress",
    },

    // ── LIB: VIDEO ────────────────────────────────────────────────────
    "src/lib/video": {
      description: "Sistema de video — providers, presets, costos, TTS",
    },
    "src/lib/video/providers.ts": {
      description: "Registry de 7 video providers con sus configs, modelos, precios",
    },
    "src/lib/video/presets.ts": {
      description: "Motion presets — product-rotate, camera-orbit, fashion-walk, etc",
    },
    "src/lib/video/cost.ts": {
      description: "Calculadora de costos por provider y duracion",
    },
    "src/lib/video/tts.ts": {
      description: "Text-to-Speech servidor — Edge TTS (Node.js WebSocket). SOLO server-side",
      editHint: "NO importar en componentes client — usa tts-voices.ts para constantes",
    },
    "src/lib/video/tts-voices.ts": {
      description: "Constantes de voces/idiomas TTS — SEGURO para client-side",
    },

    // ── LIB: OTHER ────────────────────────────────────────────────────
    "src/lib/db": {
      description: "Base de datos — Prisma client, queries, persistencia",
    },
    "src/lib/db/prisma.ts": {
      description: "Prisma client singleton — conexion a PostgreSQL",
    },
    "src/lib/db/queries.ts": {
      description: "Queries reutilizables — getHistory, saveProcessingJob, etc",
    },
    "src/lib/db/persist.ts": {
      description: "Persistencia local — localStorage fallback cuando no hay DB",
    },
    "src/lib/batch": {
      description: "Sistema de batch processing",
    },
    "src/lib/batch/pipeline.ts": {
      description: "Pipeline builder — define secuencia de operaciones para batch",
    },
    "src/lib/batch/queue.ts": {
      description: "Queue system — maneja cola de imagenes a procesar",
    },
    "src/lib/brand": {
      description: "Kit de marca y compliance",
    },
    "src/lib/brand/brand-kit.ts": {
      description: "Logica de brand kit — colores, fonts, watermark",
    },
    "src/lib/brand/compliance.ts": {
      description: "Checker de compliance — valida dimensiones, formato, BG color por marketplace",
    },
    "src/lib/utils": {
      description: "Utilidades generales",
    },
    "src/lib/utils/cn.ts": {
      description: "clsx + tailwind-merge helper para clases CSS condicionales",
    },
    "src/lib/utils/constants.ts": {
      description: "Constantes globales — limits, defaults",
    },
    "src/lib/utils/cost-tracker.ts": {
      description: "Tracking de costos acumulados por sesion",
    },
    "src/lib/utils/image.ts": {
      description: "Utilidades de imagen — file→dataURL, resize, format detect",
    },
    "src/lib/utils/prompts.ts": {
      description: "Templates de prompts para cada modulo",
    },

    // ── STORES ─────────────────────────────────────────────────────────
    "src/stores": {
      description: "Zustand stores — estado global de la app (como Redux pero simple)",
    },
    "src/stores/editor-store.ts": {
      description: "Estado del editor — imagen actual, modulo seleccionado, historial, canvas, before/after",
      editHint: "Agregar nuevo estado al editor, nuevas acciones",
    },
    "src/stores/video-store.ts": {
      description: "Estado del Video Studio — provider, modo, parametros, resultado",
    },
    "src/stores/batch-store.ts": {
      description: "Estado de batch — imagenes, pipeline, progreso",
    },
    "src/stores/brand-store.ts": {
      description: "Estado de brand kit — colores, logo, watermark",
    },
    "src/stores/gallery-store.ts": {
      description: "Estado de galeria — imagenes guardadas, filtros, busqueda",
    },
    "src/stores/settings-store.ts": {
      description: "Settings globales — API keys status, preferencias",
    },

    // ── TYPES ──────────────────────────────────────────────────────────
    "src/types": {
      description: "TypeScript type definitions — interfaces y tipos para toda la app",
    },
    "src/types/agent.ts": {
      description: "Tipos del AI Agent — AgentType, PipelineStep, AgentPlan, StepExecution",
    },
    "src/types/api.ts": {
      description: "Tipos de API responses — ProcessingResult, ApiResponse, etc",
    },
    "src/types/editor.ts": {
      description: "Tipos del editor — EditorState, Layer, Tool, etc",
    },
    "src/types/video.ts": {
      description: "Tipos de video — VideoProvider, VideoPreset, AvatarProvider",
    },
    "src/types/batch.ts": {
      description: "Tipos de batch — Pipeline, BatchJob, BatchResult",
    },
    "src/types/brand.ts": {
      description: "Tipos de brand — BrandKit, ComplianceResult, Platform",
    },
  },
  quickRef: [
    {
      question: "Cambiar los colores de toda la app?",
      answer: "Edita las CSS variables en globals.css (:root). Cambia --accent para el dorado, --bg-primary para el fondo negro, etc.",
    },
    {
      question: "Agregar un nuevo modulo/herramienta?",
      answer: "1) Crea el panel en components/modules/ 2) Crea el API route en app/api/ 3) Crea el procesamiento en lib/processing/ 4) Registralo en editor/page.tsx y en ModuleSidebar.tsx",
    },
    {
      question: "Cambiar un modelo de IA (Replicate/fal.ai)?",
      answer: "Los modelos estan en lib/processing/[modulo].ts. El ID del modelo de Replicate esta ahi. Los community models NECESITAN :hash despues del nombre.",
    },
    {
      question: "Modificar el AI Agent?",
      answer: "Plan: api/ai-agent/plan/route.ts. Ejecucion: hooks/useAgentPipeline.ts. UI del editor: components/modules/AiAgentPanel.tsx. UI standalone: app/agent/page.tsx",
    },
    {
      question: "Agregar un nuevo provider de video?",
      answer: "Registralo en lib/video/providers.ts, agrega precios en lib/video/cost.ts, actualiza types/video.ts, agrega la llamada en lib/processing/video.ts",
    },
    {
      question: "Cambiar como se ven las notificaciones/toasts?",
      answer: "El componente visual esta en components/ui/toast.tsx. El store esta en hooks/use-toast.ts. Uso: toast.success('msg'), toast.error('msg')",
    },
    {
      question: "Cambiar el dashboard (pagina principal)?",
      answer: "Todo el dashboard esta en app/page.tsx — hero, tarjetas de modulos, CTAs, escenarios de 'por donde empezar'",
    },
    {
      question: "Configurar la base de datos?",
      answer: "Schema en prisma/schema.prisma. Client en lib/db/prisma.ts. Queries en lib/db/queries.ts. La DB es PostgreSQL via Prisma.",
    },
    {
      question: "Cambiar las API keys / env vars?",
      answer: "Edita .env.local en la raiz del proyecto. Nunca commitas este archivo. Las keys necesarias: REPLICATE_API_TOKEN, FAL_KEY, FASHN_API_KEY, ANTHROPIC_API_KEY",
    },
    {
      question: "Ver los workflows visuales (como Weavy)?",
      answer: "Ve a /workflows — editor visual de nodos que muestra como se conectan todos los modulos. 5 templates pre-hechos.",
    },
  ],
};

// =============================================================================
// English (natural, professional)
// =============================================================================

export const DOCS_BODY_EN: DocsBodyCopy = {
  ui: {
    open: "Open",
    editPrefix: "Edit:",
    searchPlaceholder: "Search a file, folder or question...",
    tabFiles: "Files",
    tabReference: "Where do I go to...?",
  },
  stats: {
    pages: "Pages",
    apiRoutes: "API Routes",
    modules: "Modules",
    components: "Components",
    tsFiles: "TS Files",
  },
  tree: {
    // ── PAGES ──────────────────────────────────────────────────────────
    "src/app": {
      description: "Every page and API route in the application",
    },
    "src/app/page.tsx": {
      description: "Main dashboard — the home page with all the tools, hero section and module cards",
      editHint: "Change copy, add/remove dashboard tools, tweak the hero",
    },
    "src/app/layout.tsx": {
      description: "Root layout — wraps the WHOLE app. Inter font, ToastContainer, SEO metadata",
      editHint: "Change SEO title/description, add global providers, change the font",
    },
    "src/app/globals.css": {
      description: "ALL global colors and styles. Design-system CSS variables (--bg-primary, --accent, etc)",
      editHint: "Change the app's colors, fonts, scrollbar, animations. THIS is the file to change the whole look",
    },
    "src/app/editor/page.tsx": {
      description: "Main editor — central canvas + left sidebar (modules) + right sidebar (layers/properties). This is where ALL 19 module panels live",
      editHint: "Add new modules to the editor, change the canvas layout, tweak the toolbar",
    },
    "src/app/agent/page.tsx": {
      description: "Standalone AI Agent page — a 5-step workflow: pick agent → upload image → configure → process → result",
      editHint: "Change the agent flow, add new agent types, tweak the wizard UI",
    },
    "src/app/workflows/page.tsx": {
      description: "Visual workflow editor (Weavy-style) — draggable nodes that show how the modules connect",
      editHint: "Add new workflow templates, tweak nodes, change connections",
    },
    "src/app/batch/page.tsx": {
      description: "Bulk processing — upload multiple photos and apply one pipeline to all of them",
      editHint: "Tweak the pipeline builder, add batch presets",
    },
    "src/app/gallery/page.tsx": {
      description: "Image gallery — a history of everything processed, synced with the DB",
      editHint: "Change how images are shown, filters, search",
    },
    "src/app/brand-kit/page.tsx": {
      description: "Brand kit — colors, logo, typography, Unistyles watermark",
      editHint: "Add brand fields, change watermark options",
    },
    "src/app/docs/page.tsx": {
      description: "THIS page — interactive project documentation",
    },

    // ── API ROUTES ────────────────────────────────────────────────────
    "src/app/api": {
      description: "28 API routes — each module has its own endpoint. This is where they connect to Replicate, fal.ai, FASHN, etc",
    },
    "src/app/api/bg-remove/route.ts": {
      description: "Remove background — browser WASM (free), withoutBG, Replicate RMBG, remove.bg",
      editHint: "Add a new BG-removal provider, change the Replicate model",
    },
    "src/app/api/bg-generate/route.ts": {
      description: "Generate AI backgrounds — Flux Schnell/Dev/Kontext, Seedream. Precise vs creative mode",
      editHint: "Add new generation models, change background presets",
    },
    "src/app/api/enhance/route.ts": {
      description: "Enhance image — Sharp (free): brightness, contrast, saturation, sharpness",
      editHint: "Add new enhancement presets, tweak parameters",
    },
    "src/app/api/upscale/route.ts": {
      description: "Increase resolution — Real-ESRGAN, Clarity Upscaler, Aura SR",
    },
    "src/app/api/shadows/route.ts": {
      description: "Shadows — programmatic (free) + IC-Light AI ($0.02) + Flux Kontext ($0.055)",
    },
    "src/app/api/inpaint/route.ts": {
      description: "Erase/replace — Flux Fill Pro/Dev, Flux Kontext (maskless)",
    },
    "src/app/api/outpaint/route.ts": {
      description: "Extend image — adapt the format for each platform (IG, TikTok, Amazon)",
    },
    "src/app/api/tryon/route.ts": {
      description: "Virtual clothing try-on — FASHN (no lingerie), IDM-VTON (if lingerie), CatVTON, Kolors",
      editHint: "The smart router decides: lingerie → IDM-VTON, otherwise → FASHN",
    },
    "src/app/api/model-create/route.ts": {
      description: "Create AI model — FASHN Model Create, Face to Model, Model Swap",
    },
    "src/app/api/ghost-mannequin/route.ts": {
      description: "Invisible mannequin — Flux Kontext to remove the mannequin",
    },
    "src/app/api/jewelry-tryon/route.ts": {
      description: "Virtual jewelry — Flux Kontext for earrings, necklaces and rings on a model",
    },
    "src/app/api/video/route.ts": {
      description: "Video Studio — 7 providers: Ken Burns (free), LTX, Wan 2.1/2.2, Kling, Minimax",
    },
    "src/app/api/avatar/route.ts": {
      description: "Talking avatar — Wav2Lip, MuseTalk, SadTalker, LivePortrait, Hedra",
    },
    "src/app/api/tts/route.ts": {
      description: "Text-to-Speech — Edge TTS (free), Google Cloud TTS",
    },
    "src/app/api/ad-create/route.ts": {
      description: "Create ads — generates video formatted for IG Reel, TikTok, FB, YouTube",
    },
    "src/app/api/ai-agent/plan/route.ts": {
      description: "AI Agent planner — Claude Haiku generates the step plan, with a fallback to local templates",
      editHint: "Tweak the Claude prompt, add new fallback templates",
    },
    "src/app/api/prompt/route.ts": {
      description: "AI Prompt Assistant — Claude generates optimized prompts for each module",
    },
    "src/app/api/prompt-templates/route.ts": {
      description: "Prompt templates stored in the DB",
    },
    "src/app/api/batch/route.ts": {
      description: "Batch processing — runs a pipeline over multiple images",
    },
    "src/app/api/brand-kit/route.ts": {
      description: "Brand-kit CRUD in the DB",
    },
    "src/app/api/health/route.ts": {
      description: "Health check — verifies the DB + configured env vars",
    },
    "src/app/api/upload/route.ts": {
      description: "Image upload — saves to local disk or storage",
    },
    "src/app/api/save-result/route.ts": {
      description: "Save the processed result to the DB/history",
    },
    "src/app/api/db/history/route.ts": {
      description: "History of processed images from the DB",
    },
    "src/app/api/ai-models/route.ts": {
      description: "CRUD for saved AI models (gallery of created models)",
    },
    "src/app/api/video-enhance/route.ts": {
      description: "Post-generation video enhancement",
    },
    "src/app/api/inventory/load/route.ts": {
      description: "Loads the Unistyles product inventory",
    },
    "src/app/api/inventory/scan/route.ts": {
      description: "Scans the inventory image folders",
    },

    // ── COMPONENTS: MODULES ────────────────────────────────────────────
    "src/components/modules": {
      description: "Panel for each module — the controls that appear in the editor's left sidebar when you select a tool",
    },
    "src/components/modules/BgRemovePanel.tsx": {
      description: "Background-removal controls — provider selection, output type, color picker",
    },
    "src/components/modules/BgGeneratePanel.tsx": {
      description: "AI background controls — precise/creative mode, style presets, custom prompt",
    },
    "src/components/modules/EnhancePanel.tsx": {
      description: "Enhancement sliders — brightness, contrast, saturation, sharpness + presets (ecommerce, fashion, etc)",
    },
    "src/components/modules/ShadowsPanel.tsx": {
      description: "Shadow controls — type (drop/contact/reflection), AI lighting, presets",
    },
    "src/components/modules/InpaintPanel.tsx": {
      description: "Inpainting controls — prompt for what to change, editing presets",
    },
    "src/components/modules/OutpaintPanel.tsx": {
      description: "Extension controls — per-platform presets (Amazon, IG, TikTok), direction",
    },
    "src/components/modules/TryOnPanel.tsx": {
      description: "Virtual try-on controls — upload garment + model, provider selection",
    },
    "src/components/modules/ModelCreatePanel.tsx": {
      description: "Form to create an AI model — gender, age, skin, body, pose, expression",
    },
    "src/components/modules/GhostMannequinPanel.tsx": {
      description: "Invisible-mannequin controls",
    },
    "src/components/modules/JewelryTryOnPanel.tsx": {
      description: "Virtual jewelry controls — accessory type, position",
    },
    "src/components/modules/VideoPanel.tsx": {
      description: "Full Video Studio — 3 tabs (Product/Fashion/Avatar), providers, TTS",
    },
    "src/components/modules/AdCreatorPanel.tsx": {
      description: "Create ads — templates per social network, headline, CTA",
    },
    "src/components/modules/AiPromptPanel.tsx": {
      description: "AI creative director — describe your product, Claude suggests concepts",
    },
    "src/components/modules/AiAgentPanel.tsx": {
      description: "AI Agent inside the editor — 4 phases: input → plan → run → results",
    },
    "src/components/modules/SmartEditorPanel.tsx": {
      description: "Advanced editor tools — layers, filters, text",
    },
    "src/components/modules/CompliancePanel.tsx": {
      description: "Marketplace checker — checks Amazon, Shopify, etc requirements",
    },
    "src/components/modules/video": {
      description: "Video Studio sub-components",
    },
    "src/components/modules/video/ProductVideoTab.tsx": {
      description: "Product video tab (spin, zoom, orbit)",
    },
    "src/components/modules/video/FashionVideoTab.tsx": {
      description: "Fashion video tab (model walk, reveal)",
    },
    "src/components/modules/video/AvatarVideoTab.tsx": {
      description: "Talking avatar tab (TTS + lip sync)",
    },
    "src/components/modules/video/VideoProviderSelect.tsx": {
      description: "Video provider selector (Ken Burns, Wan, Kling, etc)",
    },
    "src/components/modules/video/VideoModeToggle.tsx": {
      description: "Manual/auto mode toggle",
    },
    "src/components/modules/video/VideoPreview.tsx": {
      description: "Preview of the generated video",
    },

    // ── COMPONENTS: UI ────────────────────────────────────────────────
    "src/components/ui": {
      description: "Reusable components — buttons, modals, sliders, toasts. Used across the WHOLE app",
    },
    "src/components/ui/button.tsx": {
      description: "Button with variants (primary, secondary, ghost, danger)",
    },
    "src/components/ui/toast.tsx": {
      description: "Notification system — ToastContainer goes in layout.tsx",
    },
    "src/components/ui/modal.tsx": {
      description: "Reusable modal/dialog",
    },
    "src/components/ui/dropzone.tsx": {
      description: "Drag & drop zone for uploading images",
    },
    "src/components/ui/slider.tsx": {
      description: "Slider with label and value (for enhance, shadows, etc)",
    },
    "src/components/ui/tabs.tsx": {
      description: "Reusable tabs",
    },
    "src/components/ui/empty-state.tsx": {
      description: "Empty state — shown when no image is loaded in the editor",
    },
    "src/components/ui/module-header.tsx": {
      description: "Header for each module panel — title, description, whyNeeded",
    },
    "src/components/ui/result-banner.tsx": {
      description: "Success banner after processing — shows cost + suggestions",
    },
    "src/components/ui/processing-overlay.tsx": {
      description: "Progress overlay during processing",
    },
    "src/components/ui/image-compare.tsx": {
      description: "Before/after slider to compare images",
    },
    "src/components/ui/color-picker.tsx": {
      description: "Color picker with presets and hex input",
    },
    "src/components/ui/select.tsx": {
      description: "Dropdown select",
    },
    "src/components/ui/progress.tsx": {
      description: "Progress bar",
    },
    "src/components/ui/spinner.tsx": {
      description: "Loading spinner",
    },
    "src/components/ui/switch.tsx": {
      description: "Toggle switch",
    },
    "src/components/ui/badge.tsx": {
      description: "Badge/chip for labels",
    },
    "src/components/ui/card.tsx": {
      description: "Card container",
    },
    "src/components/ui/tooltip.tsx": {
      description: "Tooltip on hover",
    },

    // ── COMPONENTS: EDITOR ────────────────────────────────────────────
    "src/components/editor": {
      description: "Main editor components — module sidebar, toolbar, layers, properties",
    },
    "src/components/editor/ModuleSidebar.tsx": {
      description: "Left sidebar with module icons grouped by category (FONDOS, MEJORA, EDICION, MODELOS, CONTENIDO, AUTO)",
      editHint: "Add/remove modules from the sidebar, change icons or categories",
    },
    "src/components/editor/Toolbar.tsx": {
      description: "Top bar — undo/redo, zoom, export PNG/JPG/WebP",
    },
    "src/components/editor/LayersPanel.tsx": {
      description: "Layers panel — reorder, show/hide, lock, rename, opacity",
    },
    "src/components/editor/PropertiesPanel.tsx": {
      description: "Properties panel — position, size, rotation, filters of the selected layer",
    },
    "src/components/editor/ShadowsGuidePanel.tsx": {
      description: "Visual guide to how shadows work",
    },
    "src/components/editor/TryOnGuidePanel.tsx": {
      description: "Step-by-step guide to use try-on correctly",
    },

    // ── COMPONENTS: DASHBOARD ─────────────────────────────────────────
    "src/components/dashboard": {
      description: "Main dashboard components",
    },
    "src/components/dashboard/AgentChat.tsx": {
      description: "AI Agent chat interface on the dashboard — 5 widgets: welcome, config, plan, progress, result",
    },

    // ── HOOKS ──────────────────────────────────────────────────────────
    "src/hooks": {
      description: "Custom React hooks — reusable logic for processing, editor, costs",
    },
    "src/hooks/useAgentPipeline.ts": {
      description: "AI Agent ENGINE — orchestrates /api/* routes sequentially, manages context (currentUrl, garmentUrl, modelUrl)",
      editHint: "Add support for new modules in the agent, change the execution logic",
    },
    "src/hooks/useEditor.ts": {
      description: "Fabric.js editor hook — addImage, export, undo/redo, canvas state",
    },
    "src/hooks/useImageProcessing.ts": {
      description: "Generic processing hook — loading state, error handling, call API",
    },
    "src/hooks/useBatchProcessing.ts": {
      description: "Batch hook — runs a pipeline over multiple images",
    },
    "src/hooks/useApiCost.ts": {
      description: "Cost tracking — how much you have spent on APIs",
    },
    "src/hooks/use-toast.ts": {
      description: "Zustand store for toasts — toast.success(), toast.error()",
      editHint: "import { toast } from '@/hooks/use-toast'",
    },

    // ── LIB: API ──────────────────────────────────────────────────────
    "src/lib/api": {
      description: "External API clients — the direct connection to the AI providers",
    },
    "src/lib/api/replicate.ts": {
      description: "Replicate client — submit prediction, poll status, get result. Used by: bg-remove, bg-generate, shadows, inpaint, outpaint, tryon, model-create, video, upscale",
      editHint: "Change Replicate models, add new providers",
    },
    "src/lib/api/fal.ts": {
      description: "fal.ai client — same submit/poll pattern. Used by: video (Kling, Wan), avatar (MuseTalk), upscale (Aura SR)",
    },
    "src/lib/api/fashn.ts": {
      description: "FASHN client — try-on, model-create, model-swap. Excludes lingerie from try-on",
    },
    "src/lib/api/withoutbg.ts": {
      description: "withoutBG client — cheap BG-removal API (0.05 EUR/image)",
    },

    // ── LIB: PROCESSING ──────────────────────────────────────────────
    "src/lib/processing": {
      description: "Processing logic for each module — these are what actually transform the images",
    },
    "src/lib/processing/bg-remove.ts": {
      description: "BG-removal logic — router between browser/withoutbg/replicate/removebg",
    },
    "src/lib/processing/bg-remove-browser.ts": {
      description: "In-browser BG removal via @imgly WASM (free)",
    },
    "src/lib/processing/bg-generate.ts": {
      description: "Background generation — Flux Schnell/Dev/Kontext + compositing with Sharp",
    },
    "src/lib/processing/enhance.ts": {
      description: "Enhancement with Sharp — white balance, brightness, contrast, saturation, sharpening, noise reduction + presets",
    },
    "src/lib/processing/shadows.ts": {
      description: "Shadows — programmatic (drop/contact/reflection) + IC-Light AI",
    },
    "src/lib/processing/inpaint.ts": {
      description: "Inpainting — Flux Fill Pro/Dev with a mask, Flux Kontext without a mask",
    },
    "src/lib/processing/outpaint.ts": {
      description: "Outpainting — canvas extension with Flux Kontext",
    },
    "src/lib/processing/tryon.ts": {
      description: "Virtual try-on — smart router: lingerie→IDM-VTON, otherwise→FASHN",
    },
    "src/lib/processing/model-create.ts": {
      description: "Create AI model — FASHN Model Create + buildModelPrompt",
    },
    "src/lib/processing/ghost-mannequin.ts": {
      description: "Ghost mannequin — Flux Kontext inpainting",
    },
    "src/lib/processing/jewelry.ts": {
      description: "Jewelry try-on — Flux Kontext for each accessory type",
    },
    "src/lib/processing/video.ts": {
      description: "Video generation — Wan 2.1/2.2, Kling, LTX, Ken Burns",
    },
    "src/lib/processing/avatar.ts": {
      description: "Talking avatar — Wav2Lip, MuseTalk, SadTalker, LivePortrait",
    },
    "src/lib/processing/ad-compose.ts": {
      description: "Ad composition — template + video + text",
    },
    "src/lib/processing/upscale.ts": {
      description: "Upscaling — Real-ESRGAN, Clarity, Aura SR",
    },
    "src/lib/processing/sharp-utils.ts": {
      description: "Sharp utilities — resize, format convert, watermark, compress",
    },

    // ── LIB: VIDEO ────────────────────────────────────────────────────
    "src/lib/video": {
      description: "Video system — providers, presets, costs, TTS",
    },
    "src/lib/video/providers.ts": {
      description: "Registry of 7 video providers with their configs, models and prices",
    },
    "src/lib/video/presets.ts": {
      description: "Motion presets — product-rotate, camera-orbit, fashion-walk, etc",
    },
    "src/lib/video/cost.ts": {
      description: "Cost calculator per provider and duration",
    },
    "src/lib/video/tts.ts": {
      description: "Server-side Text-to-Speech — Edge TTS (Node.js WebSocket). Server-side ONLY",
      editHint: "Do NOT import in client components — use tts-voices.ts for constants",
    },
    "src/lib/video/tts-voices.ts": {
      description: "TTS voice/language constants — SAFE for client-side",
    },

    // ── LIB: OTHER ────────────────────────────────────────────────────
    "src/lib/db": {
      description: "Database — Prisma client, queries, persistence",
    },
    "src/lib/db/prisma.ts": {
      description: "Prisma client singleton — connection to PostgreSQL",
    },
    "src/lib/db/queries.ts": {
      description: "Reusable queries — getHistory, saveProcessingJob, etc",
    },
    "src/lib/db/persist.ts": {
      description: "Local persistence — localStorage fallback when there is no DB",
    },
    "src/lib/batch": {
      description: "Batch-processing system",
    },
    "src/lib/batch/pipeline.ts": {
      description: "Pipeline builder — defines the sequence of operations for a batch",
    },
    "src/lib/batch/queue.ts": {
      description: "Queue system — manages the queue of images to process",
    },
    "src/lib/brand": {
      description: "Brand kit and compliance",
    },
    "src/lib/brand/brand-kit.ts": {
      description: "Brand-kit logic — colors, fonts, watermark",
    },
    "src/lib/brand/compliance.ts": {
      description: "Compliance checker — validates dimensions, format, BG color per marketplace",
    },
    "src/lib/utils": {
      description: "General utilities",
    },
    "src/lib/utils/cn.ts": {
      description: "clsx + tailwind-merge helper for conditional CSS classes",
    },
    "src/lib/utils/constants.ts": {
      description: "Global constants — limits, defaults",
    },
    "src/lib/utils/cost-tracker.ts": {
      description: "Tracking of accumulated costs per session",
    },
    "src/lib/utils/image.ts": {
      description: "Image utilities — file→dataURL, resize, format detect",
    },
    "src/lib/utils/prompts.ts": {
      description: "Prompt templates for each module",
    },

    // ── STORES ─────────────────────────────────────────────────────────
    "src/stores": {
      description: "Zustand stores — global app state (like Redux but simple)",
    },
    "src/stores/editor-store.ts": {
      description: "Editor state — current image, selected module, history, canvas, before/after",
      editHint: "Add new editor state, new actions",
    },
    "src/stores/video-store.ts": {
      description: "Video Studio state — provider, mode, parameters, result",
    },
    "src/stores/batch-store.ts": {
      description: "Batch state — images, pipeline, progress",
    },
    "src/stores/brand-store.ts": {
      description: "Brand-kit state — colors, logo, watermark",
    },
    "src/stores/gallery-store.ts": {
      description: "Gallery state — saved images, filters, search",
    },
    "src/stores/settings-store.ts": {
      description: "Global settings — API keys status, preferences",
    },

    // ── TYPES ──────────────────────────────────────────────────────────
    "src/types": {
      description: "TypeScript type definitions — interfaces and types for the whole app",
    },
    "src/types/agent.ts": {
      description: "AI Agent types — AgentType, PipelineStep, AgentPlan, StepExecution",
    },
    "src/types/api.ts": {
      description: "API response types — ProcessingResult, ApiResponse, etc",
    },
    "src/types/editor.ts": {
      description: "Editor types — EditorState, Layer, Tool, etc",
    },
    "src/types/video.ts": {
      description: "Video types — VideoProvider, VideoPreset, AvatarProvider",
    },
    "src/types/batch.ts": {
      description: "Batch types — Pipeline, BatchJob, BatchResult",
    },
    "src/types/brand.ts": {
      description: "Brand types — BrandKit, ComplianceResult, Platform",
    },
  },
  quickRef: [
    {
      question: "Change the colors of the whole app?",
      answer: "Edit the CSS variables in globals.css (:root). Change --accent for the gold, --bg-primary for the black background, etc.",
    },
    {
      question: "Add a new module/tool?",
      answer: "1) Create the panel in components/modules/ 2) Create the API route in app/api/ 3) Create the processing in lib/processing/ 4) Register it in editor/page.tsx and in ModuleSidebar.tsx",
    },
    {
      question: "Change an AI model (Replicate/fal.ai)?",
      answer: "The models live in lib/processing/[module].ts. The Replicate model ID is right there. Community models NEED the :hash after the name.",
    },
    {
      question: "Modify the AI Agent?",
      answer: "Plan: api/ai-agent/plan/route.ts. Execution: hooks/useAgentPipeline.ts. Editor UI: components/modules/AiAgentPanel.tsx. Standalone UI: app/agent/page.tsx",
    },
    {
      question: "Add a new video provider?",
      answer: "Register it in lib/video/providers.ts, add prices in lib/video/cost.ts, update types/video.ts, add the call in lib/processing/video.ts",
    },
    {
      question: "Change how the notifications/toasts look?",
      answer: "The visual component is in components/ui/toast.tsx. The store is in hooks/use-toast.ts. Usage: toast.success('msg'), toast.error('msg')",
    },
    {
      question: "Change the dashboard (home page)?",
      answer: "The whole dashboard is in app/page.tsx — hero, module cards, CTAs, 'where to start' scenarios",
    },
    {
      question: "Set up the database?",
      answer: "Schema in prisma/schema.prisma. Client in lib/db/prisma.ts. Queries in lib/db/queries.ts. The DB is PostgreSQL via Prisma.",
    },
    {
      question: "Change the API keys / env vars?",
      answer: "Edit .env.local at the project root. Never commit this file. The keys you need: REPLICATE_API_TOKEN, FAL_KEY, FASHN_API_KEY, ANTHROPIC_API_KEY",
    },
    {
      question: "See the visual workflows (Weavy-style)?",
      answer: "Go to /workflows — a visual node editor that shows how all the modules connect. 5 ready-made templates.",
    },
  ],
};
