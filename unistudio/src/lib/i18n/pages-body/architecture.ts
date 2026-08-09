// =============================================================================
// architecture.ts — Copia i18n del cuerpo visible de /architecture
// =============================================================================
// Textos traducibles de la página de arquitectura (todo excepto el hero, que
// vive en t.pages.architecture.*, y el header, que no se toca).
//
//   const b = locale === 'en' ? ARCHITECTURE_BODY_EN : ARCHITECTURE_BODY_ES;
//   <h2>{b.sections.flujo}</h2>
//
// Reglas: los valores ES son idénticos byte-a-byte al texto original (se
// preservan mayúsculas, acentos faltantes, guiones —, flechas → y °). Solo se
// traducen campos visibles; ids, rutas de API, nombres de archivo y snippets
// de código NO se traducen.
// =============================================================================

export interface ModuleCopy {
  name: string;
  cost: string;
  provider: string;
  description: string;
}

export interface LayerCopy {
  name: string;
  description: string;
  items: string[];
}

export interface FlowStepCopy {
  title: string;
  description: string;
}

export interface AgentPhaseCopy {
  phase: string;
  desc: string;
}

export interface AgentTypeCopy {
  label: string;
  rest: string;
}

export interface CostFlowCopy {
  title: string;
  formula: string;
  total: string;
}

export interface DecisionGroupCopy {
  level: string;
  items: string[];
}

export interface ArchitectureBodyCopy {
  hero: {
    stats: {
      pages: string;
      apiRoutes: string;
      panels: string;
      stores: string;
      externalApis: string;
    };
  };
  sections: {
    flujo: string;
    agente: string;
    testing: string;
    arquitectura: string;
    modulos: string;
    costos: string;
    decisiones: string;
  };
  flow: {
    intro: string;
    steps: Record<number, FlowStepCopy>;
  };
  agent: {
    intro: string;
    phases: AgentPhaseCopy[];
    typesTitle: string;
    types: {
      ecommerce: AgentTypeCopy;
      model: AgentTypeCopy;
      social: AgentTypeCopy;
    };
  };
  testing: {
    note: string;
    categories: Record<string, string>;
    tests: Record<string, string>;
  };
  layersIntro: string;
  layers: Record<string, LayerCopy>;
  modulesIntro: string;
  moduleFilters: { all: string; free: string; paid: string };
  moduleFieldLabels: {
    apiRoute: string;
    panel: string;
    processing: string;
    provider: string;
  };
  modules: Record<string, ModuleCopy>;
  costs: {
    ecommerce: CostFlowCopy;
    model: CostFlowCopy;
    social: CostFlowCopy;
    comparison: { label: string; text: string };
  };
  decisions: {
    easy: DecisionGroupCopy;
    medium: DecisionGroupCopy;
    hard: DecisionGroupCopy;
  };
  footer: {
    tagline: string;
    links: { docs: string; workflows: string; editor: string };
  };
}

// -----------------------------------------------------------------------------
// Español (idéntico byte-a-byte al texto actual de la página)
// -----------------------------------------------------------------------------

export const ARCHITECTURE_BODY_ES: ArchitectureBodyCopy = {
  hero: {
    stats: {
      pages: "9 paginas",
      apiRoutes: "29 API routes",
      panels: "19 paneles",
      stores: "6 stores",
      externalApis: "4 APIs externas",
    },
  },
  sections: {
    flujo: "Flujo de una Foto (paso a paso)",
    agente: "Flujo del Agente IA",
    testing: "Testing — Que Probar",
    arquitectura: "Capas de la Arquitectura",
    modulos: "Los 18 Modulos (detalle)",
    costos: "Resumen de Costos",
    decisiones: "Decisiones para Mejorar",
  },
  flow: {
    intro:
      "Este es el camino que sigue CADA foto que procesas. Todos los 18 modulos siguen este mismo flujo.",
    steps: {
      1: {
        title: "Usuario sube foto",
        description:
          "Drag & drop o click. El archivo se guarda en memoria del navegador como File object.",
      },
      2: {
        title: "Selecciona modulo",
        description:
          "Click en la barra lateral izquierda. Se carga el panel correspondiente (ej: BgRemovePanel).",
      },
      3: {
        title: "Configura opciones",
        description:
          "Elige proveedor, estilo, formato. Cada panel tiene sus propias opciones.",
      },
      4: {
        title: "Click Procesar",
        description:
          "El panel convierte la foto a data URL y envia POST al API route correspondiente.",
      },
      5: {
        title: "API valida y procesa",
        description:
          "Verifica datos, llama al servicio de IA (Replicate/fal.ai), espera resultado (10-60 seg).",
      },
      6: {
        title: "IA devuelve resultado",
        description:
          "URL de la imagen/video procesada. Se guarda en base de datos (fire-and-forget).",
      },
      7: {
        title: "Muestra antes/despues",
        description:
          "El editor muestra comparacion. El costo se suma al total de sesion.",
      },
      8: {
        title: "Siguiente paso o exportar",
        description:
          "Aceptar resultado como input del siguiente modulo, o exportar como PNG/JPG/WebP.",
      },
    },
  },
  agent: {
    intro:
      "El agente automatiza todo el flujo anterior. Tu solo dices que quieres y el decide los pasos.",
    phases: [
      {
        phase: "1. ANALISIS",
        desc: "Sube foto → /api/analyze-image detecta marca de agua, iluminacion, resolucion, tipo de fondo",
      },
      {
        phase: "2. PLANIFICACION",
        desc: "Claude IA ve el analisis y decide los pasos necesarios (o usa templates si no hay API key)",
      },
      {
        phase: "3. CONFIRMACION",
        desc: "Te muestra el plan con costos. Tu decides si ejecutar o ajustar presupuesto.",
      },
      {
        phase: "4. EJECUCION",
        desc: "useAgentPipeline.ts ejecuta cada paso secuencialmente. El resultado de un paso es input del siguiente.",
      },
      {
        phase: "5. RESULTADOS",
        desc: "Preview de cada paso intermedio + resultado final. Puedes descargar o usar en el editor.",
      },
    ],
    typesTitle: "3 Tipos de Agente",
    types: {
      ecommerce: {
        label: "E-Commerce",
        rest: ": foto cruda → foto profesional de catalogo",
      },
      model: {
        label: "Modelo",
        rest: ": prenda → modelo IA vistiendo la prenda",
      },
      social: {
        label: "Social",
        rest: ": producto → videos, banners y anuncios",
      },
    },
  },
  testing: {
    note: 'Marca cada test que pase. Los tests sin "API Key" funcionan sin configuracion.',
    categories: {
      "Basico (sin API keys)": "Basico (sin API keys)",
      "Con API Keys": "Con API Keys",
    },
    tests: {
      "Dashboard carga sin errores": "Dashboard carga sin errores",
      "Editor abre y acepta foto (drag/drop)": "Editor abre y acepta foto (drag/drop)",
      "Zoom in/out funciona": "Zoom in/out funciona",
      "Undo/Redo no crashea": "Undo/Redo no crashea",
      "Cambiar entre modulos funciona": "Cambiar entre modulos funciona",
      "Enhance (preset) funciona": "Enhance (preset) funciona",
      "BG Remove (Browser) funciona": "BG Remove (Browser) funciona",
      "Brand Kit guarda colores": "Brand Kit guarda colores",
      "Galeria muestra historial": "Galeria muestra historial",
      "Exportar imagen funciona": "Exportar imagen funciona",
      "BG Remove (Replicate) — $0.01": "BG Remove (Replicate) — $0.01",
      "BG Generate — $0.03-$0.05": "BG Generate — $0.03-$0.05",
      "Inpaint (borrar objeto) — $0.03": "Inpaint (borrar objeto) — $0.03",
      "Upscale 2x — $0.02": "Upscale 2x — $0.02",
      "Model Create — $0.055": "Model Create — $0.055",
      "Try-On (prenda + modelo) — $0.02": "Try-On (prenda + modelo) — $0.02",
      "Video generacion — $0.04+": "Video generacion — $0.04+",
      "Agente IA (E-Commerce) — variable": "Agente IA (E-Commerce) — variable",
      "Health check responde OK": "Health check responde OK",
    },
  },
  layersIntro:
    "La app tiene 7 capas. Los datos fluyen de arriba hacia abajo (usuario → IA) y regresan de abajo hacia arriba (resultado → pantalla).",
  layers: {
    "PAGINAS (Frontend)": {
      name: "PAGINAS (Frontend)",
      description:
        "Lo que ve el usuario. React components con Tailwind CSS. Cada pagina es un archivo en src/app/.",
      items: [
        "/ (Dashboard)",
        "/editor",
        "/agent",
        "/batch",
        "/brand-kit",
        "/gallery",
        "/docs",
        "/workflows",
        "/architecture",
      ],
    },
    "PANELES DE MODULOS (UI)": {
      name: "PANELES DE MODULOS (UI)",
      description:
        "Controles de cada modulo. El usuario configura opciones y hace click en Procesar.",
      items: [
        "19 paneles en src/components/modules/",
        "Cada panel: opciones + boton Procesar",
        "Props: imageFile + onProcess callback",
      ],
    },
    "API ROUTES (Backend)": {
      name: "API ROUTES (Backend)",
      description:
        "Endpoints HTTP que reciben peticiones del frontend y las envian a los servicios de IA.",
      items: [
        "29 endpoints en src/app/api/",
        "Reciben JSON o FormData",
        "Validan, procesan, responden",
        "Patron: { success, data, cost }",
      ],
    },
    "PROCESAMIENTO (Logica)": {
      name: "PROCESAMIENTO (Logica)",
      description:
        "La logica real de cada operacion. Funciones que reciben una imagen y devuelven el resultado.",
      items: [
        "16 modulos en src/lib/processing/",
        "Funciones puras: input -> output",
        "Usan Sharp (local) o APIs externas",
      ],
    },
    "CLIENTES DE API (Comunicacion)": {
      name: "CLIENTES DE API (Comunicacion)",
      description:
        "Wrappers que se comunican con servicios externos. Manejan autenticacion, reintentos, y errores.",
      items: [
        "replicate.ts — Replicate (imagenes)",
        "fal.ts — fal.ai (videos)",
        "fashn.ts — FASHN (try-on)",
        "withoutbg.ts — Docker local",
      ],
    },
    "ESTADO (Stores)": {
      name: "ESTADO (Stores)",
      description:
        "Estado global de la aplicacion. Zustand es como useState pero compartido entre todos los componentes.",
      items: [
        "6 Zustand stores",
        "editor-store (capas, undo/redo)",
        "gallery-store (historial)",
        "settings-store (costos, config)",
        "3 mas: batch, video, brand",
      ],
    },
    "BASE DE DATOS": {
      name: "BASE DE DATOS",
      description:
        "Almacenamiento persistente. Guarda historial de procesamiento, costos, y resultados.",
      items: [
        "PostgreSQL + Prisma ORM",
        "7 modelos (Project, Image, ProcessingJob...)",
        "Fire-and-forget: nunca bloquea la UI",
      ],
    },
  },
  modulesIntro:
    "Click en cualquier modulo para ver sus archivos, proveedor y costo real.",
  moduleFilters: { all: "Todos (18)", free: "Gratis", paid: "De Pago" },
  moduleFieldLabels: {
    apiRoute: "API Route:",
    panel: "Panel:",
    processing: "Procesamiento:",
    provider: "Proveedor:",
  },
  modules: {
    "bg-remove": {
      name: "Quitar Fondo",
      cost: "Gratis / $0.01",
      provider: "Browser WASM / Replicate / Docker",
      description:
        "Elimina el fondo de la foto. 3 proveedores: gratis en navegador, gratis con Docker, o $0.01 con Replicate.",
    },
    "bg-generate": {
      name: "Fondos con IA",
      cost: "$0.003 - $0.05",
      provider: "Replicate (Flux)",
      description:
        "Genera fondos profesionales. 3 modos: Fast ($0.003), Creative ($0.03), Precise ($0.05).",
    },
    enhance: {
      name: "Mejorar Calidad",
      cost: "Gratis",
      provider: "Sharp (local)",
      description:
        "Ajusta brillo, contraste, saturacion, nitidez. Todo gratis y local con Sharp.",
    },
    upscale: {
      name: "Aumentar Resolucion",
      cost: "$0.02 - $0.05",
      provider: "Replicate",
      description:
        "Escala tu imagen 2x o 4x con IA. 3 proveedores: Real-ESRGAN, Aura SR, Clarity.",
    },
    shadows: {
      name: "Sombras",
      cost: "Gratis / $0.05",
      provider: "Sharp / Replicate",
      description:
        "Sombras drop/contacto/reflejo gratis con Sharp. Relighting con IA cuesta $0.05.",
    },
    inpaint: {
      name: "Borrar y Reemplazar",
      cost: "$0.03 - $0.05",
      provider: "Replicate (Flux)",
      description:
        "Borra objetos, cambia colores, quita marcas de agua con IA generativa.",
    },
    outpaint: {
      name: "Extender Imagen",
      cost: "$0.05",
      provider: "Replicate (Kontext)",
      description:
        "Extiende los bordes para adaptarla a cualquier formato de plataforma.",
    },
    tryon: {
      name: "Prueba Virtual",
      cost: "$0.015 - $0.05",
      provider: "Replicate / FASHN",
      description:
        "Coloca tu prenda sobre un modelo virtual. 3 proveedores segun calidad.",
    },
    "model-create": {
      name: "Crear Modelo IA",
      cost: "$0.055",
      provider: "Replicate (Flux)",
      description:
        "Genera modelos virtuales con genero, edad, tono de piel y pose configurables.",
    },
    "ghost-mannequin": {
      name: "Maniqui Invisible",
      cost: "$0.05 - $0.08",
      provider: "Replicate",
      description:
        "Elimina el maniqui de fotos de ropa para efecto 'invisible'.",
    },
    "jewelry-tryon": {
      name: "Joyeria Virtual",
      cost: "$0.05",
      provider: "Replicate (Kontext)",
      description:
        "Prueba joyeria (aretes, collares, anillos) sobre fotos de modelos.",
    },
    video: {
      name: "Estudio de Video",
      cost: "$0 - $0.35",
      provider: "fal.ai / Replicate",
      description:
        "Convierte fotos en videos. 7 proveedores desde gratis (Ken Burns) hasta premium.",
    },
    "ad-creator": {
      name: "Crear Anuncios",
      cost: "$0.04 - $0.35",
      provider: "fal.ai / Replicate",
      description:
        "Genera videos publicitarios para IG, TikTok, Facebook, YouTube, Pinterest.",
    },
    "ai-prompt": {
      name: "Director Creativo IA",
      cost: "Gratis - $0.003",
      provider: "Anthropic (Claude)",
      description:
        "La IA sugiere 4 conceptos creativos de fotografia para tu producto.",
    },
    batch: {
      name: "Procesamiento Masivo",
      cost: "Variable",
      provider: "Multiple",
      description:
        "Procesa multiples imagenes con la misma secuencia de pasos.",
    },
    compliance: {
      name: "Verificar Marketplace",
      cost: "Gratis",
      provider: "Local",
      description:
        "Verifica requisitos de Amazon, Shopify, Etsy, eBay. Auto-correccion gratis.",
    },
    "smart-editor": {
      name: "Editor Avanzado",
      cost: "Gratis",
      provider: "Fabric.js (local)",
      description:
        "Editor con capas, filtros, texto, transformaciones. Todo en el navegador.",
    },
    "brand-kit": {
      name: "Kit de Marca",
      cost: "Gratis",
      provider: "Local",
      description: "Guarda colores, fuentes, logo y watermark de tu marca.",
    },
  },
  costs: {
    ecommerce: {
      title: "Flujo E-Commerce Tipico",
      formula: "BG Remove ($0.01) + BG Generate ($0.05) + Shadows ($0) = ",
      total: "$0.06/foto",
    },
    model: {
      title: "Flujo Modelo Tipico",
      formula: "BG Remove ($0.01) + Model Create ($0.055) + Try-On ($0.02) = ",
      total: "$0.085/foto",
    },
    social: {
      title: "Flujo Social Tipico",
      formula: "E-Commerce flow ($0.06) + Video ($0.05) = ",
      total: "$0.11/foto",
    },
    comparison: {
      label: "Comparacion",
      text: ": Photoroom cobra $9.99/mes (100 fotos) = $0.10/foto. UniStudio cuesta $0.06/foto para el mismo resultado.",
    },
  },
  decisions: {
    easy: {
      level: "Facil",
      items: [
        "Agregar presets de color en BG Remove",
        "Agregar filtros en Enhance",
        "Mejorar textos del dashboard",
        "Personalizar tema de colores (globals.css)",
      ],
    },
    medium: {
      level: "Medio",
      items: [
        "Agregar nuevo proveedor de video",
        "Mejorar galeria (busqueda, filtros)",
        "Agregar formatos de marketplace",
        "Crear presets de outpaint",
      ],
    },
    hard: {
      level: "Avanzado",
      items: [
        "Agregar autenticacion (NextAuth)",
        "Implementar rate limiting",
        "Crear modulo completamente nuevo",
        "Agregar webhooks de notificacion",
      ],
    },
  },
  footer: {
    tagline: "UniStudio — Guia de Arquitectura Interactiva",
    links: {
      docs: "Explorador de Archivos →",
      workflows: "Guia de Flujos →",
      editor: "Abrir Editor →",
    },
  },
};

// -----------------------------------------------------------------------------
// English (natural professional translation)
// -----------------------------------------------------------------------------

export const ARCHITECTURE_BODY_EN: ArchitectureBodyCopy = {
  hero: {
    stats: {
      pages: "9 pages",
      apiRoutes: "29 API routes",
      panels: "19 panels",
      stores: "6 stores",
      externalApis: "4 external APIs",
    },
  },
  sections: {
    flujo: "A Photo's Journey (step by step)",
    agente: "AI Agent Flow",
    testing: "Testing — What to Check",
    arquitectura: "Architecture Layers",
    modulos: "The 18 Modules (detail)",
    costos: "Cost Summary",
    decisiones: "Decisions to Improve",
  },
  flow: {
    intro:
      "This is the path EVERY photo you process follows. All 18 modules follow this same flow.",
    steps: {
      1: {
        title: "User uploads a photo",
        description:
          "Drag & drop or click. The file is kept in browser memory as a File object.",
      },
      2: {
        title: "Select a module",
        description:
          "Click the left sidebar. The matching panel loads (e.g. BgRemovePanel).",
      },
      3: {
        title: "Configure options",
        description:
          "Choose provider, style and format. Each panel has its own options.",
      },
      4: {
        title: "Click Process",
        description:
          "The panel converts the photo to a data URL and sends a POST to the matching API route.",
      },
      5: {
        title: "API validates and processes",
        description:
          "It checks the data, calls the AI service (Replicate/fal.ai) and waits for the result (10-60 sec).",
      },
      6: {
        title: "AI returns the result",
        description:
          "URL of the processed image/video. It is saved to the database (fire-and-forget).",
      },
      7: {
        title: "Show before/after",
        description:
          "The editor shows the comparison. The cost is added to the session total.",
      },
      8: {
        title: "Next step or export",
        description:
          "Accept the result as input for the next module, or export as PNG/JPG/WebP.",
      },
    },
  },
  agent: {
    intro:
      "The agent automates the whole flow above. You just say what you want and it decides the steps.",
    phases: [
      {
        phase: "1. ANALYSIS",
        desc: "Upload photo → /api/analyze-image detects watermark, lighting, resolution and background type",
      },
      {
        phase: "2. PLANNING",
        desc: "Claude AI reads the analysis and decides the steps needed (or uses templates if there is no API key)",
      },
      {
        phase: "3. CONFIRMATION",
        desc: "It shows you the plan with costs. You decide whether to run it or adjust the budget.",
      },
      {
        phase: "4. EXECUTION",
        desc: "useAgentPipeline.ts runs each step sequentially. The result of one step is the input for the next.",
      },
      {
        phase: "5. RESULTS",
        desc: "Preview of each intermediate step + the final result. You can download it or use it in the editor.",
      },
    ],
    typesTitle: "3 Agent Types",
    types: {
      ecommerce: {
        label: "E-Commerce",
        rest: ": raw photo → professional catalog photo",
      },
      model: {
        label: "Model",
        rest: ": garment → AI model wearing the garment",
      },
      social: {
        label: "Social",
        rest: ": product → videos, banners and ads",
      },
    },
  },
  testing: {
    note: 'Check off each test that passes. Tests without "API Key" work with no setup.',
    categories: {
      "Basico (sin API keys)": "Basic (no API keys)",
      "Con API Keys": "With API Keys",
    },
    tests: {
      "Dashboard carga sin errores": "Dashboard loads without errors",
      "Editor abre y acepta foto (drag/drop)": "Editor opens and accepts a photo (drag/drop)",
      "Zoom in/out funciona": "Zoom in/out works",
      "Undo/Redo no crashea": "Undo/Redo does not crash",
      "Cambiar entre modulos funciona": "Switching between modules works",
      "Enhance (preset) funciona": "Enhance (preset) works",
      "BG Remove (Browser) funciona": "BG Remove (Browser) works",
      "Brand Kit guarda colores": "Brand Kit saves colors",
      "Galeria muestra historial": "Gallery shows history",
      "Exportar imagen funciona": "Export image works",
      "BG Remove (Replicate) — $0.01": "BG Remove (Replicate) — $0.01",
      "BG Generate — $0.03-$0.05": "BG Generate — $0.03-$0.05",
      "Inpaint (borrar objeto) — $0.03": "Inpaint (remove object) — $0.03",
      "Upscale 2x — $0.02": "Upscale 2x — $0.02",
      "Model Create — $0.055": "Model Create — $0.055",
      "Try-On (prenda + modelo) — $0.02": "Try-On (garment + model) — $0.02",
      "Video generacion — $0.04+": "Video generation — $0.04+",
      "Agente IA (E-Commerce) — variable": "AI Agent (E-Commerce) — variable",
      "Health check responde OK": "Health check responds OK",
    },
  },
  layersIntro:
    "The app has 7 layers. Data flows top to bottom (user → AI) and back bottom to top (result → screen).",
  layers: {
    "PAGINAS (Frontend)": {
      name: "PAGES (Frontend)",
      description:
        "What the user sees. React components with Tailwind CSS. Each page is a file in src/app/.",
      items: [
        "/ (Dashboard)",
        "/editor",
        "/agent",
        "/batch",
        "/brand-kit",
        "/gallery",
        "/docs",
        "/workflows",
        "/architecture",
      ],
    },
    "PANELES DE MODULOS (UI)": {
      name: "MODULE PANELS (UI)",
      description:
        "The controls for each module. The user sets options and clicks Process.",
      items: [
        "19 panels in src/components/modules/",
        "Each panel: options + Process button",
        "Props: imageFile + onProcess callback",
      ],
    },
    "API ROUTES (Backend)": {
      name: "API ROUTES (Backend)",
      description:
        "HTTP endpoints that receive requests from the frontend and send them to the AI services.",
      items: [
        "29 endpoints in src/app/api/",
        "Receive JSON or FormData",
        "Validate, process, respond",
        "Pattern: { success, data, cost }",
      ],
    },
    "PROCESAMIENTO (Logica)": {
      name: "PROCESSING (Logic)",
      description:
        "The real logic of each operation. Functions that take an image and return the result.",
      items: [
        "16 modules in src/lib/processing/",
        "Pure functions: input -> output",
        "Use Sharp (local) or external APIs",
      ],
    },
    "CLIENTES DE API (Comunicacion)": {
      name: "API CLIENTS (Communication)",
      description:
        "Wrappers that talk to external services. They handle authentication, retries and errors.",
      items: [
        "replicate.ts — Replicate (images)",
        "fal.ts — fal.ai (videos)",
        "fashn.ts — FASHN (try-on)",
        "withoutbg.ts — Docker local",
      ],
    },
    "ESTADO (Stores)": {
      name: "STATE (Stores)",
      description:
        "The app's global state. Zustand is like useState but shared across every component.",
      items: [
        "6 Zustand stores",
        "editor-store (layers, undo/redo)",
        "gallery-store (history)",
        "settings-store (costs, config)",
        "3 more: batch, video, brand",
      ],
    },
    "BASE DE DATOS": {
      name: "DATABASE",
      description:
        "Persistent storage. Saves processing history, costs and results.",
      items: [
        "PostgreSQL + Prisma ORM",
        "7 models (Project, Image, ProcessingJob...)",
        "Fire-and-forget: never blocks the UI",
      ],
    },
  },
  modulesIntro:
    "Click any module to see its files, provider and real cost.",
  moduleFilters: { all: "All (18)", free: "Free", paid: "Paid" },
  moduleFieldLabels: {
    apiRoute: "API Route:",
    panel: "Panel:",
    processing: "Processing:",
    provider: "Provider:",
  },
  modules: {
    "bg-remove": {
      name: "Remove Background",
      cost: "Free / $0.01",
      provider: "Browser WASM / Replicate / Docker",
      description:
        "Removes the background from the photo. 3 providers: free in the browser, free with Docker, or $0.01 with Replicate.",
    },
    "bg-generate": {
      name: "AI Backgrounds",
      cost: "$0.003 - $0.05",
      provider: "Replicate (Flux)",
      description:
        "Generates professional backgrounds. 3 modes: Fast ($0.003), Creative ($0.03), Precise ($0.05).",
    },
    enhance: {
      name: "Enhance Quality",
      cost: "Free",
      provider: "Sharp (local)",
      description:
        "Adjusts brightness, contrast, saturation and sharpness. All free and local with Sharp.",
    },
    upscale: {
      name: "Upscale Resolution",
      cost: "$0.02 - $0.05",
      provider: "Replicate",
      description:
        "Upscales your image 2x or 4x with AI. 3 providers: Real-ESRGAN, Aura SR, Clarity.",
    },
    shadows: {
      name: "Shadows",
      cost: "Free / $0.05",
      provider: "Sharp / Replicate",
      description:
        "Drop/contact/reflection shadows free with Sharp. AI relighting costs $0.05.",
    },
    inpaint: {
      name: "Erase and Replace",
      cost: "$0.03 - $0.05",
      provider: "Replicate (Flux)",
      description:
        "Erase objects, change colors and remove watermarks with generative AI.",
    },
    outpaint: {
      name: "Extend Image",
      cost: "$0.05",
      provider: "Replicate (Kontext)",
      description:
        "Extends the edges to fit any platform format.",
    },
    tryon: {
      name: "Virtual Try-On",
      cost: "$0.015 - $0.05",
      provider: "Replicate / FASHN",
      description:
        "Places your garment on a virtual model. 3 providers depending on quality.",
    },
    "model-create": {
      name: "Create AI Model",
      cost: "$0.055",
      provider: "Replicate (Flux)",
      description:
        "Generates virtual models with configurable gender, age, skin tone and pose.",
    },
    "ghost-mannequin": {
      name: "Invisible Mannequin",
      cost: "$0.05 - $0.08",
      provider: "Replicate",
      description:
        "Removes the mannequin from clothing photos for an 'invisible' effect.",
    },
    "jewelry-tryon": {
      name: "Virtual Jewelry",
      cost: "$0.05",
      provider: "Replicate (Kontext)",
      description:
        "Try jewelry (earrings, necklaces, rings) on model photos.",
    },
    video: {
      name: "Video Studio",
      cost: "$0 - $0.35",
      provider: "fal.ai / Replicate",
      description:
        "Turns photos into videos. 7 providers from free (Ken Burns) to premium.",
    },
    "ad-creator": {
      name: "Create Ads",
      cost: "$0.04 - $0.35",
      provider: "fal.ai / Replicate",
      description:
        "Generates ad videos for IG, TikTok, Facebook, YouTube, Pinterest.",
    },
    "ai-prompt": {
      name: "AI Creative Director",
      cost: "Free - $0.003",
      provider: "Anthropic (Claude)",
      description:
        "The AI suggests 4 creative photography concepts for your product.",
    },
    batch: {
      name: "Batch Processing",
      cost: "Variable",
      provider: "Multiple",
      description:
        "Processes multiple images with the same sequence of steps.",
    },
    compliance: {
      name: "Marketplace Check",
      cost: "Free",
      provider: "Local",
      description:
        "Checks Amazon, Shopify, Etsy and eBay requirements. Free auto-fix.",
    },
    "smart-editor": {
      name: "Advanced Editor",
      cost: "Free",
      provider: "Fabric.js (local)",
      description:
        "Editor with layers, filters, text and transforms. All in the browser.",
    },
    "brand-kit": {
      name: "Brand Kit",
      cost: "Free",
      provider: "Local",
      description: "Saves your brand's colors, fonts, logo and watermark.",
    },
  },
  costs: {
    ecommerce: {
      title: "Typical E-Commerce Flow",
      formula: "BG Remove ($0.01) + BG Generate ($0.05) + Shadows ($0) = ",
      total: "$0.06/photo",
    },
    model: {
      title: "Typical Model Flow",
      formula: "BG Remove ($0.01) + Model Create ($0.055) + Try-On ($0.02) = ",
      total: "$0.085/photo",
    },
    social: {
      title: "Typical Social Flow",
      formula: "E-Commerce flow ($0.06) + Video ($0.05) = ",
      total: "$0.11/photo",
    },
    comparison: {
      label: "Comparison",
      text: ": Photoroom charges $9.99/mo (100 photos) = $0.10/photo. UniStudio costs $0.06/photo for the same result.",
    },
  },
  decisions: {
    easy: {
      level: "Easy",
      items: [
        "Add color presets to BG Remove",
        "Add filters to Enhance",
        "Improve the dashboard copy",
        "Customize the color theme (globals.css)",
      ],
    },
    medium: {
      level: "Medium",
      items: [
        "Add a new video provider",
        "Improve the gallery (search, filters)",
        "Add marketplace formats",
        "Create outpaint presets",
      ],
    },
    hard: {
      level: "Advanced",
      items: [
        "Add authentication (NextAuth)",
        "Implement rate limiting",
        "Build a completely new module",
        "Add notification webhooks",
      ],
    },
  },
  footer: {
    tagline: "UniStudio — Interactive Architecture Guide",
    links: {
      docs: "File Explorer →",
      workflows: "Workflow Guide →",
      editor: "Open Editor →",
    },
  },
};
