// =============================================================================
// i18n — Textos visibles del cuerpo de la página de Workflows (ES / EN)
// =============================================================================
// Fuente única de todo el texto de la UI de `src/app/workflows/page.tsx`
// (menos el encabezado título/subtítulo, que vive en `pages.ts` → `t.pages.workflows`).
// Se consume con `const { locale } = useI18n()` →
//   `const b = locale === 'en' ? WORKFLOWS_BODY_EN : WORKFLOWS_BODY_ES`.
//
// Reglas de escritura:
//  1. Verbos accionables, segunda persona.
//  2. CTAs cortas.
//  3. Página técnica: los nombres de proveedor / rutas / archivos son
//     documentación (excepción de "no nombrar modelos") — se conservan.
//  4. NO se traducen: ids, keys, hrefs, rutas de archivo, costos/precios
//     (viven en los datos de page.tsx y algunos se comparan en condicionales).
//  5. Ambos idiomas con EXACTAMENTE la misma forma para que TypeScript
//     garantice que ninguna clave quede sin traducir.
// =============================================================================

/** Copy visible de una feature (los campos no-visibles viven en page.tsx). */
interface FeatureBody {
  name: string;
  whatItDoes: string;
  flow: string[];
  files: { label: string; purpose: string }[];
  providers: { name: string; quality: string }[];
  usedBy: string[];
}

/** Copy visible de un item de la vista de arquitectura. */
interface ArchitectureItemBody {
  label: string;
  desc: string;
}

export interface WorkflowsBodyCopy {
  /** Etiquetas estáticas dentro de cada FeatureCard. */
  labels: {
    whatItDoes: string;
    flow: string;
    providers: string;
    usedBy: string;
    codeFiles: string;
    realResult: string;
    videoDemo: string;
    resultAlt: (name: string) => string;
    useCta: (name: string) => string;
  };
  /** Sección 1 — Inventario. */
  inventory: {
    title: string;
    total: string;
    onWebsite: string;
    missing: string;
    catalog: string;
    web: string;
    missingBadge: (n: number) => string;
    priceLabel: string;
    categoryNames: Record<string, string>;
    categoryBrands: Record<string, string>;
  };
  /** Sección 2 — Flujos del AI Agent. */
  agent: {
    title: string;
    subtitle: string;
    agentPrefix: string;
    workflowNames: Record<string, string>;
    workflowDescriptions: Record<string, string>;
    workflowProducts: Record<string, string>;
    stepLabels: Record<string, string[]>;
  };
  /** Sección 3 — Arquitectura. */
  architecture: {
    title: string;
    items: {
      pages: ArchitectureItemBody;
      apiRoutes: ArchitectureItemBody;
      uiModules: ArchitectureItemBody;
      processing: ArchitectureItemBody;
      apiClients: ArchitectureItemBody;
      stores: ArchitectureItemBody;
      hooks: ArchitectureItemBody;
      types: ArchitectureItemBody;
    };
  };
  /** Sección 4 — Todas las features. */
  section4: {
    allFeatures: string;
    hint: string;
    filters: Record<string, string>;
  };
  /** Copy visible por feature, indexada por id. */
  features: Record<string, FeatureBody>;
}

// =============================================================================
// Español (byte-for-byte de la versión actual)
// =============================================================================

export const WORKFLOWS_BODY_ES: WorkflowsBodyCopy = {
  labels: {
    whatItDoes: "Que Hace",
    flow: "Flujo Paso a Paso",
    providers: "Providers / APIs",
    usedBy: "Productos Unistyles que lo Usan",
    codeFiles: "Archivos del Codigo",
    realResult: "Resultado real de UniStudio",
    videoDemo: "Video demo",
    resultAlt: (name) => `${name} resultado`,
    useCta: (name) => `Usar ${name}`,
  },
  inventory: {
    title: "Tu Inventario Unistyles",
    total: "Productos Total",
    onWebsite: "En la Web",
    missing: "Faltan",
    catalog: "Catalogo:",
    web: "Web:",
    missingBadge: (n) => `-${n} faltan`,
    priceLabel: "Precio",
    categoryNames: {
      bras: "Brassieres",
      panties: "Panties",
      shapewear: "Shapewear",
      perfume: "Perfumes",
      cremas: "Cremas",
      bloqueador: "Bloqueador",
      desodorantes: "Desodorantes",
      limpieza: "Limpieza Facial",
      joyeria: "Joyeria",
    },
    categoryBrands: {
      bras: "Leonisa",
      panties: "Leonisa",
      shapewear: "Leonisa",
      perfume: "Esika/Cyzone/Yanbal/L'Bel",
      cremas: "Yanbal/Esika/L'Bel",
      bloqueador: "Yanbal/Esika/L'Bel",
      desodorantes: "Yanbal/Esika",
      limpieza: "Esika/L'Bel",
      joyeria: "Sin marca",
    },
  },
  agent: {
    title: "3 Flujos del AI Agent",
    subtitle:
      "Asi es como el AI Agent encadena los modulos automaticamente segun el tipo de producto",
    agentPrefix: "Agente: ",
    workflowNames: {
      "E-Commerce": "E-Commerce",
      "Modelo Virtual": "Modelo Virtual",
      "Social / Video": "Social / Video",
    },
    workflowDescriptions: {
      "E-Commerce":
        "Fotos de producto para Amazon, Shopify, Etsy — fondo blanco, sombras, formato correcto",
      "Modelo Virtual": "Prenda en modelo IA — quita fondo, crea modelo, viste, mejora",
      "Social / Video": "Contenido para TikTok, Reels, Stories — video + anuncio",
    },
    workflowProducts: {
      "E-Commerce": "Perfumes, Cremas, Bloqueador, Desodorantes",
      "Modelo Virtual": "Brassieres (77), Panties (72), Shapewear (15)",
      "Social / Video": "Hero products, campanas de temporada",
    },
    stepLabels: {
      "E-Commerce": ["Quitar fondo", "Mejorar calidad", "Agregar sombra", "Adaptar formato"],
      "Modelo Virtual": [
        "Quitar fondo prenda",
        "Crear modelo IA",
        "Vestir modelo",
        "Mejorar resultado",
      ],
      "Social / Video": [
        "Quitar fondo",
        "Fondo lifestyle",
        "Mejorar",
        "Crear video",
        "Crear anuncio",
      ],
    },
  },
  architecture: {
    title: "Arquitectura del Proyecto",
    items: {
      pages: {
        label: "Paginas",
        desc: "/, /editor, /agent, /workflows, /docs, /batch, /gallery, /brand-kit",
      },
      apiRoutes: { label: "API Routes", desc: "Un endpoint por modulo en src/app/api/" },
      uiModules: { label: "Modulos UI", desc: "Paneles en src/components/modules/" },
      processing: { label: "Procesamiento", desc: "Logica IA en src/lib/processing/" },
      apiClients: { label: "API Clients", desc: "Replicate, fal.ai, FASHN, withoutBG" },
      stores: {
        label: "Stores",
        desc: "Zustand: editor, video, batch, brand, gallery, settings",
      },
      hooks: { label: "Hooks", desc: "useAgentPipeline, useEditor, useImageProcessing, etc" },
      types: {
        label: "Types",
        desc: "agent.ts, api.ts, editor.ts, video.ts, batch.ts, brand.ts",
      },
    },
  },
  section4: {
    allFeatures: "Todas las Features",
    hint: "Haz click en cada feature para ver el flujo completo, archivos del codigo, providers, fotos reales y video demo",
    filters: {
      all: "Todas",
      fondos: "Fondos",
      mejora: "Mejora",
      edicion: "Edicion",
      modelos: "Modelos",
      contenido: "Contenido",
      auto: "Auto",
    },
  },
  features: {
    "bg-remove": {
      name: "Quitar Fondo",
      whatItDoes:
        "Toma tu foto de producto con cualquier fondo (mesa, piso, pared) y elimina todo lo que no es el producto. Te deja un PNG transparente listo para poner en cualquier fondo nuevo.",
      flow: [
        "Subes tu foto de producto (JPG/PNG desde celular)",
        "Eliges provider: Browser WASM (gratis) o API (withoutBG/Replicate)",
        "La IA detecta el producto y separa del fondo",
        "Resultado: PNG con fondo transparente",
        "Opcion: poner fondo de color solido o blur",
      ],
      files: [
        { label: "Panel UI", purpose: "Controles: elegir provider, tipo salida, color picker" },
        { label: "API Route", purpose: "Recibe imagen, llama al provider elegido, devuelve resultado" },
        { label: "Procesamiento", purpose: "Router entre providers (withoutBG, Replicate RMBG)" },
        { label: "Browser WASM", purpose: "BG removal GRATIS en el navegador con @imgly/background-removal" },
        { label: "API Client", purpose: "Conexion con withoutBG API (0.05 EUR/imagen)" },
      ],
      providers: [
        { name: "@imgly WASM (Browser)", quality: "4/5" },
        { name: "withoutBG API", quality: "5/5" },
        { name: "Replicate RMBG-2.0", quality: "5/5" },
        { name: "remove.bg HD", quality: "5/5" },
      ],
      usedBy: ["TODOS los 486 productos — es el primer paso de todo"],
    },
    "bg-generate": {
      name: "Fondos con IA",
      whatItDoes:
        "Despues de quitar el fondo, pon tu producto en CUALQUIER escenario: mesa de marmol, playa, estudio de lujo, jardin. La IA genera el fondo y tu producto se ve como foto profesional de catalogo.",
      flow: [
        "Necesitas: foto con fondo transparente (usa Quitar Fondo primero)",
        "Eliges modo: PRECISO (producto exacto + fondo nuevo) o CREATIVO (IA re-imagina todo)",
        "Eliges estilo: 20+ presets (studio, lifestyle, nature, luxury, beauty, seasonal)",
        "O escribes tu propio prompt describiendo el fondo que quieres",
        "La IA genera el fondo y coloca tu producto encima",
        "Resultado: foto profesional con fondo de estudio/lifestyle",
      ],
      files: [
        { label: "Panel UI", purpose: "Modo preciso/creativo, presets de estilo, prompt custom, previews" },
        { label: "API Route", purpose: "Recibe imagen + style, llama Flux model, devuelve resultado" },
        { label: "Procesamiento", purpose: "Flux Schnell (rapido), Flux Dev (calidad), Flux Kontext (preciso) + compositing Sharp" },
        { label: "API Client", purpose: "Conexion con Replicate (Flux models)" },
        { label: "Prompts", purpose: "20+ prompts optimizados por estilo de fondo" },
      ],
      providers: [
        { name: "Flux Schnell", quality: "3/5 (rapido)" },
        { name: "Flux Dev", quality: "4/5" },
        { name: "Flux Kontext Pro", quality: "5/5 (preciso)" },
      ],
      usedBy: [
        "Perfumes (146) — studio marble/luxury",
        "Cremas (49) — beauty spa/vanity",
        "Joyeria (82) — luxury velvet/gold",
      ],
    },
    enhance: {
      name: "Mejorar Calidad",
      whatItDoes:
        "Ajusta brillo, contraste, saturacion, nitidez y color de tu foto. Si tu foto de celular salio oscura, amarillenta o borrosa, esto lo corrige. 100% GRATIS, se procesa con Sharp en el servidor.",
      flow: [
        "Subes tu foto (cualquier formato)",
        "Eliges preset: ecommerce, fashion, beauty, luxury, natural, etc. (o ajustas manual)",
        "Sharp procesa: white balance, brightness, contrast, saturation, sharpness",
        "Preview instantaneo — ajusta sliders en tiempo real",
        "Resultado: foto mejorada sin costo de API",
      ],
      files: [
        { label: "Panel UI", purpose: "Sliders de brillo/contraste/saturacion/nitidez + presets" },
        { label: "API Route", purpose: "Recibe imagen + parametros, procesa con Sharp, devuelve resultado" },
        { label: "Procesamiento", purpose: "Sharp: recomb (white balance), linear (brightness/contrast), modulate (saturation), unsharp mask (sharpness)" },
        { label: "Sharp Utils", purpose: "Resize, format convert, compress — utilidades de Sharp" },
      ],
      providers: [{ name: "Sharp (servidor)", quality: "4/5" }],
      usedBy: ["TODOS — mejora gratis despues de cualquier procesamiento"],
    },
    shadows: {
      name: "Sombras e Iluminacion",
      whatItDoes:
        "Agrega sombras profesionales (drop shadow, contact, reflection) o cambia toda la iluminacion con IA. Esto transforma una foto plana en una foto de catalogo con profundidad y realismo.",
      flow: [
        "Subes foto con fondo transparente (funciona mejor asi)",
        "Eliges tipo: Drop Shadow (gratis), Contact Shadow (gratis), Reflection (gratis)",
        "O eliges IA: IC-Light relight ($0.02) o Flux Kontext ($0.055)",
        "Configuras: opacidad, blur, offset, color de sombra",
        "Resultado: producto con sombra/iluminacion profesional",
      ],
      files: [
        { label: "Panel UI", purpose: "Tipo de sombra, sliders, presets de iluminacion" },
        { label: "API Route", purpose: "Dos paths: programatico (Sharp) o IA (Replicate IC-Light)" },
        { label: "Procesamiento", purpose: "Drop/Contact/Reflection con Sharp + IC-Light para relight IA" },
        { label: "Guia visual", purpose: "Explica visualmente cada tipo de sombra" },
      ],
      providers: [
        { name: "Sharp programatico", quality: "3/5 (basico)" },
        { name: "IC-Light (Replicate)", quality: "4/5" },
        { name: "Flux Kontext Pro", quality: "5/5" },
      ],
      usedBy: [
        "Perfumes — reflection shadow",
        "Lenceria — contact shadow",
        "Joyeria — spotlight",
      ],
    },
    inpaint: {
      name: "Borrar y Reemplazar",
      whatItDoes:
        "Describe que quieres cambiar y la IA lo hace: quitar etiquetas, borrar arrugas, cambiar color de tela, quitar manchas. No necesitas mascara — solo describe el cambio con texto.",
      flow: [
        "Subes tu foto de producto",
        "Escribes que quieres cambiar: 'quitar la etiqueta', 'cambiar color a rojo'",
        "O usas preset: remove-tag, remove-wrinkles, fix-stain, change-color",
        "Flux Fill Pro (con mascara) o Flux Kontext (sin mascara, solo texto)",
        "Resultado: producto editado limpiamente",
      ],
      files: [
        { label: "Panel UI", purpose: "Prompt de edicion, presets, brush para mascara" },
        { label: "API Route", purpose: "Recibe imagen + prompt/mascara, llama Flux model" },
        { label: "Procesamiento", purpose: "Flux Fill Pro/Dev (mascara) o Flux Kontext (texto)" },
      ],
      providers: [
        { name: "Flux Fill Dev", quality: "4/5 (budget)" },
        { name: "Flux Fill Pro", quality: "5/5" },
        { name: "Flux Kontext Pro", quality: "5/5 (sin mascara)" },
      ],
      usedBy: ["Lenceria — quitar etiquetas, arrugas", "Perfumes — quitar reflejos"],
    },
    outpaint: {
      name: "Extender Imagen",
      whatItDoes:
        "Tu foto es cuadrada pero necesitas vertical para Stories? La IA extiende los bordes naturalmente. Presets listos para cada plataforma: Amazon 1:1, Instagram 4:5, TikTok 9:16, Pinterest 2:3.",
      flow: [
        "Subes tu foto ya editada con el fondo que quieres",
        "Eliges plataforma destino: Amazon, IG Feed, IG Story, TikTok, Pinterest, etc.",
        "O defines custom: direccion (arriba/abajo/izquierda/derecha) + padding",
        "Flux Kontext extiende la imagen naturalmente",
        "Resultado: imagen en el formato correcto para publicar",
      ],
      files: [
        { label: "Panel UI", purpose: "Presets por plataforma, direccion, custom ratio" },
        { label: "API Route", purpose: "Recibe imagen + target ratio, llama Flux Kontext" },
        { label: "Procesamiento", purpose: "Outpaint con Flux Kontext + platform presets" },
        { label: "Compliance", purpose: "Requisitos de dimension por marketplace" },
      ],
      providers: [
        { name: "Flux Kontext Pro", quality: "5/5" },
        { name: "Flux Fill Dev", quality: "4/5 (budget)" },
      ],
      usedBy: ["TODOS — adaptar formato para cada marketplace/red social"],
    },
    tryon: {
      name: "Prueba Virtual",
      whatItDoes:
        "Toma la foto de tu prenda (flat-lay o maniqui) + un modelo IA y genera una imagen del modelo VISTIENDO tu prenda. Para lenceria usa IDM-VTON (FASHN no soporta lingerie).",
      flow: [
        "Necesitas: 1) foto de prenda sin fondo, 2) foto de modelo (creada con Crear Modelo)",
        "Smart Router decide: lenceria/swimwear → IDM-VTON, otro → FASHN",
        "FASHN: POST a api.fashn.ai con garment_image + model_image + categoria",
        "IDM-VTON: Replicate cuuupid/idm-vton con garm_img + human_img",
        "Poll cada 2 seg hasta completado",
        "Resultado: modelo vistiendo tu prenda",
      ],
      files: [
        { label: "Panel UI", purpose: "Upload prenda + modelo, seleccion provider, categoria" },
        { label: "Guia", purpose: "Guia paso a paso para try-on correcto" },
        { label: "API Route", purpose: "Recibe garment + model, smart router, devuelve resultado" },
        { label: "Procesamiento", purpose: "Smart router: lingerie→IDM-VTON, otro→FASHN. Fallback automatico" },
        { label: "FASHN Client", purpose: "POST a api.fashn.ai/v1/run + poll /v1/status/{id}" },
      ],
      providers: [
        { name: "FASHN v1.6", quality: "5/5 (NO lingerie)" },
        { name: "IDM-VTON (Replicate)", quality: "4/5 (SI lingerie)" },
        { name: "Kolors VTO (Replicate)", quality: "3/5" },
      ],
      usedBy: [
        "Brassieres (77) — IDM-VTON (lingerie)",
        "Panties (72) — IDM-VTON",
        "Shapewear (15) — IDM-VTON",
      ],
    },
    "model-create": {
      name: "Crear Modelo IA",
      whatItDoes:
        "No tienes modelo? Genera uno con IA. Elige genero, edad, tono de piel, tipo de cuerpo, pose y expresion. El modelo generado se puede reutilizar para vestir con Try-On o Joyeria Virtual.",
      flow: [
        "Configuras: genero, rango de edad, tono de piel, tipo cuerpo, pose, expresion",
        "buildModelPrompt() construye un prompt detallado para FASHN",
        "FASHN Model Create genera imagen de modelo",
        "Resultado se guarda en galeria de modelos para reutilizar",
        "Puedes usar Face to Model (tu selfie → modelo completo)",
      ],
      files: [
        { label: "Panel UI", purpose: "Formulario: genero, edad, piel, cuerpo, pose, expresion" },
        { label: "API Route", purpose: "Construye prompt, llama FASHN Model Create" },
        { label: "Procesamiento", purpose: "buildModelPrompt + FASHN API call + variaciones" },
        { label: "AI Models DB", purpose: "Guardar/cargar modelos creados en DB" },
      ],
      providers: [
        { name: "FASHN Model Create", quality: "5/5" },
        { name: "FASHN Face to Model", quality: "5/5" },
        { name: "FASHN Model Variation", quality: "4/5" },
      ],
      usedBy: [
        "Lenceria — modelos femeninos diversos",
        "Joyeria — modelos para aretes/collares",
      ],
    },
    "ghost-mannequin": {
      name: "Maniqui Invisible",
      whatItDoes:
        "Si fotografiaste tu prenda sobre un maniqui fisico, esta herramienta elimina el maniqui y deja la prenda 'flotando' con volumen 3D. Efecto profesional que usan grandes marcas.",
      flow: [
        "Subes foto de prenda SOBRE maniqui fisico",
        "Flux Kontext inpainting: 'Remove the mannequin body completely'",
        "La IA rellena el interior de la prenda naturalmente",
        "Resultado: prenda flotando con forma 3D, sin maniqui",
      ],
      files: [
        { label: "Panel UI", purpose: "Controles de ghost mannequin" },
        { label: "API Route", purpose: "Recibe imagen, llama Flux Kontext para inpaint" },
        { label: "Procesamiento", purpose: "Flux Kontext con prompt especifico para maniqui" },
      ],
      providers: [{ name: "Flux Kontext Pro", quality: "5/5" }],
      usedBy: ["Brassieres fotografiados en maniqui", "Shapewear en maniqui"],
    },
    "jewelry-tryon": {
      name: "Joyeria Virtual",
      whatItDoes:
        "Prueba virtual de aretes, collares, anillos, pulseras, lentes y relojes. La IA coloca tu accesorio en un modelo con iluminacion y perspectiva realista.",
      flow: [
        "Necesitas: 1) foto del accesorio sin fondo, 2) foto de modelo con rostro visible",
        "Seleccionas tipo: earrings, necklace, ring, bracelet, sunglasses, watch",
        "Flux Kontext usa prompt especializado por tipo de accesorio",
        "La IA posiciona el accesorio correctamente (orejas, cuello, dedo, etc)",
        "Resultado: modelo usando tu joya con reflejo metalico realista",
      ],
      files: [
        { label: "Panel UI", purpose: "Tipo accesorio, upload joya + modelo" },
        { label: "API Route", purpose: "Recibe imagen + tipo + modelo, llama Flux Kontext" },
        { label: "Procesamiento", purpose: "Prompts especializados por tipo de joya + Flux Kontext" },
      ],
      providers: [{ name: "Flux Kontext Pro", quality: "5/5" }],
      usedBy: [
        "Aretes (~20)",
        "Cadenas (~15)",
        "Pulseras (~12)",
        "Topos (~15)",
        "Anillos (~5)",
        "Sets (~5)",
      ],
    },
    video: {
      name: "Video Studio",
      whatItDoes:
        "Convierte tu foto de producto en video animado para TikTok, Reels e historias. 3 modos: Producto (gira, zoom), Moda (model walk), Avatar (habla con lip sync + TTS).",
      flow: [
        "Subes foto de producto ya editada",
        "Eliges tab: Producto, Moda o Avatar",
        "Eliges provider: Ken Burns (GRATIS), Wan 2.2 ($0.05), Kling ($0.07+)",
        "Para Avatar: escribes texto → Edge TTS genera audio → lip sync con video",
        "Resultado: video MP4 listo para publicar",
      ],
      files: [
        { label: "Panel UI", purpose: "3 tabs: ProductVideoTab, FashionVideoTab, AvatarVideoTab" },
        { label: "Product Tab", purpose: "Video de producto: rotate, zoom, orbit" },
        { label: "Fashion Tab", purpose: "Video moda: model walk, reveal" },
        { label: "Avatar Tab", purpose: "Avatar parlante: TTS + lip sync" },
        { label: "Providers", purpose: "Registry de 7 providers: Ken Burns, LTX, Wan 2.1/2.2, Kling, Minimax" },
        { label: "API Route", purpose: "Recibe imagen + provider + params, genera video" },
        { label: "TTS Route", purpose: "Genera audio con Edge TTS (gratis)" },
        { label: "Avatar Route", purpose: "Wav2Lip/MuseTalk/SadTalker/LivePortrait" },
      ],
      providers: [
        { name: "Ken Burns (local)", quality: "2/5 (zoom/pan)" },
        { name: "LTX-Video", quality: "3/5" },
        { name: "Wan 2.2 Fast", quality: "4/5" },
        { name: "Kling 2.6", quality: "5/5 (con audio)" },
      ],
      usedBy: [
        "Hero products para TikTok/Reels",
        "Perfumes con rotacion 360",
        "Lenceria con fashion walk",
      ],
    },
    "ad-creator": {
      name: "Crear Anuncios",
      whatItDoes:
        "Genera video publicitario listo para publicar. Elige red social (IG Reel, TikTok, FB, YouTube Short, Pinterest), escribe titular y CTA. La IA genera el video con el formato correcto.",
      flow: [
        "Subes foto de producto ya editada",
        "Eliges template: IG Reel, TikTok, FB Ad, FB Marketplace, YT Short, IG Story, Pinterest",
        "Escribes headline y CTA",
        "Auto-prompt genera descripcion optimizada",
        "Video se genera con el aspect ratio y duracion correcta por plataforma",
      ],
      files: [
        { label: "Panel UI", purpose: "Templates por red social, headline/CTA, preview" },
        { label: "API Route", purpose: "Recibe imagen + template + texto, genera video ad" },
        { label: "Composicion", purpose: "Composicion de anuncio: template + video + texto overlay" },
      ],
      providers: [{ name: "Video provider elegido", quality: "Depende del provider" }],
      usedBy: ["Campanas de Instagram/TikTok para Unistyles"],
    },
    "ai-prompt": {
      name: "Director Creativo IA",
      whatItDoes:
        "No sabes que estilo usar? Sube tu producto, dile a Claude para que plataforma es, y la IA te sugiere 4 conceptos profesionales de fotografia con prompts optimizados.",
      flow: [
        "Subes foto de producto",
        "Describes que tipo de contenido necesitas (e-commerce, social, lifestyle)",
        "Claude Haiku analiza tu producto y genera 4 conceptos",
        "Cada concepto incluye: prompt optimizado, estilo de iluminacion, composicion",
        "Seleccionas el que mas te gusta y se aplica automaticamente",
      ],
      files: [
        { label: "Panel UI", purpose: "Input de producto + plataforma, muestra 4 conceptos" },
        { label: "API Route", purpose: "Envia a Claude Haiku, devuelve conceptos" },
        { label: "Prompts", purpose: "System prompts para Claude" },
      ],
      providers: [{ name: "Claude Haiku", quality: "5/5" }],
      usedBy: ["Cuando no sabes que fondo/estilo usar para tu producto"],
    },
    batch: {
      name: "Procesamiento Masivo",
      whatItDoes:
        "Cuando ya probaste tu flujo con 1 foto, aplicalo a 300+ fotos automaticamente. Define un pipeline (quitar fondo → mejorar → sombras) y batch lo aplica a todo tu catalogo.",
      flow: [
        "Subes multiples imagenes (drag & drop o seleccion multiple)",
        "Defines pipeline: secuencia de operaciones (bg-remove → enhance → shadow → resize)",
        "O usas preset: Quick Clean (gratis), Amazon Ready, Instagram Lifestyle, Full Production",
        "Batch procesa cada imagen por el pipeline completo",
        "Tracking en vivo: progreso, completadas, fallidas, costo acumulado",
        "Descarga ZIP con todos los resultados",
      ],
      files: [
        { label: "Pagina", purpose: "UI completa de batch processing" },
        { label: "API Route", purpose: "Recibe imagenes[] + pipeline, ejecuta secuencialmente" },
        { label: "Panel", purpose: "Pipeline builder con presets y ejecucion" },
        { label: "Pagina", purpose: "Procesamiento masivo con inventario" },
      ],
      providers: [{ name: "Depende del pipeline", quality: "Configurable" }],
      usedBy: ["Catalogos completos: 300+ productos de una vez"],
    },
    "ai-agent": {
      name: "AI Agent Automatico",
      whatItDoes:
        "EL CEREBRO de UniStudio. 3 agentes (E-Commerce, Modelo, Social) que deciden automaticamente que pasos ejecutar. Sube tu foto → elige agente → la IA planifica → ejecuta todo automaticamente.",
      flow: [
        "Sube foto + elige agente (E-Commerce, Modelo o Social)",
        "Elige categoria de producto (lingerie, perfume, joyeria, etc)",
        "Elige presupuesto: Gratis, Economico o Premium",
        "/api/ai-agent/plan → Claude Haiku crea plan de pasos (o fallback a template local)",
        "useAgentPipeline ejecuta pasos secuencialmente via /api/* existentes",
        "Contexto fluye: currentUrl (imagen actual) + garmentUrl (de bg-remove) + modelUrl (de model-create)",
        "Resultado final con costo total y previews de cada paso",
      ],
      files: [
        { label: "Tipos", purpose: "AgentType, PipelineStep, AgentPlan, StepExecution, BudgetTier" },
        { label: "Motor", purpose: "EJECUTOR: orquesta /api/* routes, maneja contexto garmentUrl/modelUrl" },
        { label: "Panel Editor", purpose: "4 fases en sidebar: Input → Plan → Execute → Results" },
        { label: "Chat Dashboard", purpose: "Interface chat del dashboard con 5 widgets" },
        { label: "Pagina Standalone", purpose: "Workflow de 5 pasos: elegir → subir → configurar → procesar → resultado" },
        { label: "Plan API", purpose: "Claude Haiku genera plan + fallback a templates locales" },
      ],
      providers: [
        { name: "Claude Haiku (planning)", quality: "5/5" },
        { name: "Template fallback (local)", quality: "4/5" },
      ],
      usedBy: ["Automatizar TODO: sube foto y la IA hace el resto"],
    },
    compliance: {
      name: "Verificar Marketplace",
      whatItDoes:
        "Antes de publicar, verifica que tu imagen cumple los requisitos exactos de Amazon, Shopify, Etsy, eBay, TikTok Shop, etc. Detecta errores de tamanio, formato, fondo y sugiere correcciones.",
      flow: [
        "Subes tu imagen final",
        "Seleccionas marketplace: Amazon, Shopify, IG Shop, Etsy, eBay, TikTok Shop, Pinterest, etc.",
        "checkCompliance() valida: dimensiones, aspect ratio, color de fondo, file size, formato",
        "Reporte: PASS o FAIL con issues especificos y fixes sugeridos",
        "Auto-fix: upscale, outpaint, cambiar fondo, comprimir automaticamente",
      ],
      files: [
        { label: "Panel UI", purpose: "Selector marketplace, reporte visual, auto-fix" },
        { label: "Compliance", purpose: "Requisitos por plataforma + checkCompliance()" },
      ],
      providers: [{ name: "Local (sin API)", quality: "5/5" }],
      usedBy: ["TODOS los productos antes de publicar en marketplace"],
    },
    "brand-kit": {
      name: "Kit de Marca",
      whatItDoes:
        "Guarda los colores, tipografias, logo y watermark de Unistyles para aplicar consistencia visual en TODAS las fotos de producto.",
      flow: [
        "Configuras colores de marca (primario, secundario, accent, fondo)",
        "Subes logo en varias versiones (color, blanco, negro, icono)",
        "Configuras watermark: posicion, opacidad, tamanio",
        "Se aplica automaticamente en exports y batch processing",
      ],
      files: [
        { label: "Pagina", purpose: "UI completa de brand kit" },
        { label: "API Route", purpose: "CRUD de brand kit en DB" },
        { label: "Logica", purpose: "Colores, fonts, watermark, logo management" },
        { label: "Store", purpose: "Zustand store de brand" },
      ],
      providers: [{ name: "Local", quality: "N/A" }],
      usedBy: ["Toda la marca Unistyles"],
    },
  },
};

// =============================================================================
// English (natural, professional)
// =============================================================================

export const WORKFLOWS_BODY_EN: WorkflowsBodyCopy = {
  labels: {
    whatItDoes: "What It Does",
    flow: "Step-by-Step Flow",
    providers: "Providers / APIs",
    usedBy: "Unistyles Products That Use It",
    codeFiles: "Code Files",
    realResult: "Real UniStudio result",
    videoDemo: "Video demo",
    resultAlt: (name) => `${name} result`,
    useCta: (name) => `Use ${name}`,
  },
  inventory: {
    title: "Your Unistyles Inventory",
    total: "Total Products",
    onWebsite: "On the Website",
    missing: "Missing",
    catalog: "Catalog:",
    web: "Web:",
    missingBadge: (n) => `-${n} missing`,
    priceLabel: "Price",
    categoryNames: {
      bras: "Bras",
      panties: "Panties",
      shapewear: "Shapewear",
      perfume: "Perfumes",
      cremas: "Creams",
      bloqueador: "Sunscreen",
      desodorantes: "Deodorants",
      limpieza: "Facial Cleansing",
      joyeria: "Jewelry",
    },
    categoryBrands: {
      bras: "Leonisa",
      panties: "Leonisa",
      shapewear: "Leonisa",
      perfume: "Esika/Cyzone/Yanbal/L'Bel",
      cremas: "Yanbal/Esika/L'Bel",
      bloqueador: "Yanbal/Esika/L'Bel",
      desodorantes: "Yanbal/Esika",
      limpieza: "Esika/L'Bel",
      joyeria: "No brand",
    },
  },
  agent: {
    title: "The 3 AI Agent Workflows",
    subtitle:
      "This is how the AI Agent chains the modules automatically based on the product type",
    agentPrefix: "Agent: ",
    workflowNames: {
      "E-Commerce": "E-Commerce",
      "Modelo Virtual": "Virtual Model",
      "Social / Video": "Social / Video",
    },
    workflowDescriptions: {
      "E-Commerce":
        "Product photos for Amazon, Shopify, Etsy — white background, shadows, correct format",
      "Modelo Virtual": "Garment on an AI model — remove background, create model, dress, enhance",
      "Social / Video": "Content for TikTok, Reels, Stories — video + ad",
    },
    workflowProducts: {
      "E-Commerce": "Perfumes, Creams, Sunscreen, Deodorants",
      "Modelo Virtual": "Bras (77), Panties (72), Shapewear (15)",
      "Social / Video": "Hero products, seasonal campaigns",
    },
    stepLabels: {
      "E-Commerce": ["Remove background", "Enhance quality", "Add shadow", "Adapt format"],
      "Modelo Virtual": [
        "Remove garment background",
        "Create AI model",
        "Dress the model",
        "Enhance result",
      ],
      "Social / Video": [
        "Remove background",
        "Lifestyle background",
        "Enhance",
        "Create video",
        "Create ad",
      ],
    },
  },
  architecture: {
    title: "Project Architecture",
    items: {
      pages: {
        label: "Pages",
        desc: "/, /editor, /agent, /workflows, /docs, /batch, /gallery, /brand-kit",
      },
      apiRoutes: { label: "API Routes", desc: "One endpoint per module in src/app/api/" },
      uiModules: { label: "UI Modules", desc: "Panels in src/components/modules/" },
      processing: { label: "Processing", desc: "AI logic in src/lib/processing/" },
      apiClients: { label: "API Clients", desc: "Replicate, fal.ai, FASHN, withoutBG" },
      stores: {
        label: "Stores",
        desc: "Zustand: editor, video, batch, brand, gallery, settings",
      },
      hooks: { label: "Hooks", desc: "useAgentPipeline, useEditor, useImageProcessing, etc" },
      types: {
        label: "Types",
        desc: "agent.ts, api.ts, editor.ts, video.ts, batch.ts, brand.ts",
      },
    },
  },
  section4: {
    allFeatures: "All Features",
    hint: "Click each feature to see the full flow, code files, providers, real photos and video demo",
    filters: {
      all: "All",
      fondos: "Backgrounds",
      mejora: "Enhance",
      edicion: "Editing",
      modelos: "Models",
      contenido: "Content",
      auto: "Auto",
    },
  },
  features: {
    "bg-remove": {
      name: "Background Removal",
      whatItDoes:
        "Takes your product photo on any background (table, floor, wall) and removes everything that isn't the product. You get a transparent PNG ready to place on any new background.",
      flow: [
        "You upload your product photo (JPG/PNG from your phone)",
        "You choose a provider: Browser WASM (free) or API (withoutBG/Replicate)",
        "The AI detects the product and separates it from the background",
        "Result: a PNG with a transparent background",
        "Option: add a solid color background or blur",
      ],
      files: [
        { label: "UI Panel", purpose: "Controls: choose provider, output type, color picker" },
        { label: "API Route", purpose: "Receives the image, calls the chosen provider, returns the result" },
        { label: "Processing", purpose: "Router between providers (withoutBG, Replicate RMBG)" },
        { label: "Browser WASM", purpose: "FREE BG removal in the browser with @imgly/background-removal" },
        { label: "API Client", purpose: "Connection to the withoutBG API (0.05 EUR/image)" },
      ],
      providers: [
        { name: "@imgly WASM (Browser)", quality: "4/5" },
        { name: "withoutBG API", quality: "5/5" },
        { name: "Replicate RMBG-2.0", quality: "5/5" },
        { name: "remove.bg HD", quality: "5/5" },
      ],
      usedBy: ["ALL 486 products — it's the first step of everything"],
    },
    "bg-generate": {
      name: "AI Backgrounds",
      whatItDoes:
        "After removing the background, place your product in ANY setting: marble table, beach, luxury studio, garden. The AI generates the background and your product looks like a professional catalog shot.",
      flow: [
        "You need: a photo with a transparent background (use Background Removal first)",
        "You choose a mode: PRECISE (exact product + new background) or CREATIVE (AI re-imagines everything)",
        "You choose a style: 20+ presets (studio, lifestyle, nature, luxury, beauty, seasonal)",
        "Or you write your own prompt describing the background you want",
        "The AI generates the background and places your product on top",
        "Result: a professional photo with a studio/lifestyle background",
      ],
      files: [
        { label: "UI Panel", purpose: "Precise/creative mode, style presets, custom prompt, previews" },
        { label: "API Route", purpose: "Receives image + style, calls Flux model, returns the result" },
        { label: "Processing", purpose: "Flux Schnell (fast), Flux Dev (quality), Flux Kontext (precise) + Sharp compositing" },
        { label: "API Client", purpose: "Connection to Replicate (Flux models)" },
        { label: "Prompts", purpose: "20+ prompts optimized per background style" },
      ],
      providers: [
        { name: "Flux Schnell", quality: "3/5 (fast)" },
        { name: "Flux Dev", quality: "4/5" },
        { name: "Flux Kontext Pro", quality: "5/5 (precise)" },
      ],
      usedBy: [
        "Perfumes (146) — studio marble/luxury",
        "Creams (49) — beauty spa/vanity",
        "Jewelry (82) — luxury velvet/gold",
      ],
    },
    enhance: {
      name: "Enhance Quality",
      whatItDoes:
        "Adjusts the brightness, contrast, saturation, sharpness and color of your photo. If your phone shot came out dark, yellowish or blurry, this fixes it. 100% FREE, processed with Sharp on the server.",
      flow: [
        "You upload your photo (any format)",
        "You choose a preset: ecommerce, fashion, beauty, luxury, natural, etc. (or adjust manually)",
        "Sharp processes: white balance, brightness, contrast, saturation, sharpness",
        "Instant preview — adjust the sliders in real time",
        "Result: an enhanced photo with no API cost",
      ],
      files: [
        { label: "UI Panel", purpose: "Brightness/contrast/saturation/sharpness sliders + presets" },
        { label: "API Route", purpose: "Receives image + parameters, processes with Sharp, returns the result" },
        { label: "Processing", purpose: "Sharp: recomb (white balance), linear (brightness/contrast), modulate (saturation), unsharp mask (sharpness)" },
        { label: "Sharp Utils", purpose: "Resize, format convert, compress — Sharp utilities" },
      ],
      providers: [{ name: "Sharp (server)", quality: "4/5" }],
      usedBy: ["ALL — free enhancement after any processing"],
    },
    shadows: {
      name: "Shadows & Lighting",
      whatItDoes:
        "Adds professional shadows (drop shadow, contact, reflection) or relights the whole scene with AI. This turns a flat photo into a catalog shot with depth and realism.",
      flow: [
        "You upload a photo with a transparent background (it works best this way)",
        "You choose a type: Drop Shadow (free), Contact Shadow (free), Reflection (free)",
        "Or you choose AI: IC-Light relight ($0.02) or Flux Kontext ($0.055)",
        "You configure: opacity, blur, offset, shadow color",
        "Result: a product with professional shadow/lighting",
      ],
      files: [
        { label: "UI Panel", purpose: "Shadow type, sliders, lighting presets" },
        { label: "API Route", purpose: "Two paths: programmatic (Sharp) or AI (Replicate IC-Light)" },
        { label: "Processing", purpose: "Drop/Contact/Reflection with Sharp + IC-Light for AI relight" },
        { label: "Visual Guide", purpose: "Visually explains each shadow type" },
      ],
      providers: [
        { name: "Sharp programmatic", quality: "3/5 (basic)" },
        { name: "IC-Light (Replicate)", quality: "4/5" },
        { name: "Flux Kontext Pro", quality: "5/5" },
      ],
      usedBy: [
        "Perfumes — reflection shadow",
        "Lingerie — contact shadow",
        "Jewelry — spotlight",
      ],
    },
    inpaint: {
      name: "Erase & Replace",
      whatItDoes:
        "Describe what you want to change and the AI does it: remove tags, erase wrinkles, change fabric color, remove stains. You don't need a mask — just describe the change in text.",
      flow: [
        "You upload your product photo",
        "You write what you want to change: 'remove the tag', 'change color to red'",
        "Or you use a preset: remove-tag, remove-wrinkles, fix-stain, change-color",
        "Flux Fill Pro (with mask) or Flux Kontext (no mask, text only)",
        "Result: a cleanly edited product",
      ],
      files: [
        { label: "UI Panel", purpose: "Edit prompt, presets, brush for the mask" },
        { label: "API Route", purpose: "Receives image + prompt/mask, calls Flux model" },
        { label: "Processing", purpose: "Flux Fill Pro/Dev (mask) or Flux Kontext (text)" },
      ],
      providers: [
        { name: "Flux Fill Dev", quality: "4/5 (budget)" },
        { name: "Flux Fill Pro", quality: "5/5" },
        { name: "Flux Kontext Pro", quality: "5/5 (no mask)" },
      ],
      usedBy: ["Lingerie — remove tags, wrinkles", "Perfumes — remove reflections"],
    },
    outpaint: {
      name: "Extend Image",
      whatItDoes:
        "Your photo is square but you need vertical for Stories? The AI extends the edges naturally. Ready-made presets for each platform: Amazon 1:1, Instagram 4:5, TikTok 9:16, Pinterest 2:3.",
      flow: [
        "You upload your photo already edited with the background you want",
        "You choose the target platform: Amazon, IG Feed, IG Story, TikTok, Pinterest, etc.",
        "Or you define custom: direction (up/down/left/right) + padding",
        "Flux Kontext extends the image naturally",
        "Result: an image in the right format to publish",
      ],
      files: [
        { label: "UI Panel", purpose: "Presets per platform, direction, custom ratio" },
        { label: "API Route", purpose: "Receives image + target ratio, calls Flux Kontext" },
        { label: "Processing", purpose: "Outpaint with Flux Kontext + platform presets" },
        { label: "Compliance", purpose: "Dimension requirements per marketplace" },
      ],
      providers: [
        { name: "Flux Kontext Pro", quality: "5/5" },
        { name: "Flux Fill Dev", quality: "4/5 (budget)" },
      ],
      usedBy: ["ALL — adapt the format for each marketplace/social network"],
    },
    tryon: {
      name: "Virtual Try-On",
      whatItDoes:
        "Takes your garment photo (flat-lay or mannequin) plus an AI model and generates an image of the model WEARING your garment. For lingerie it uses IDM-VTON (FASHN doesn't support lingerie).",
      flow: [
        "You need: 1) a garment photo with no background, 2) a model photo (created with Create Model)",
        "Smart Router decides: lingerie/swimwear → IDM-VTON, other → FASHN",
        "FASHN: POST to api.fashn.ai with garment_image + model_image + category",
        "IDM-VTON: Replicate cuuupid/idm-vton with garm_img + human_img",
        "Poll every 2 sec until complete",
        "Result: a model wearing your garment",
      ],
      files: [
        { label: "UI Panel", purpose: "Upload garment + model, provider selection, category" },
        { label: "Guide", purpose: "Step-by-step guide for a correct try-on" },
        { label: "API Route", purpose: "Receives garment + model, smart router, returns the result" },
        { label: "Processing", purpose: "Smart router: lingerie→IDM-VTON, other→FASHN. Automatic fallback" },
        { label: "FASHN Client", purpose: "POST to api.fashn.ai/v1/run + poll /v1/status/{id}" },
      ],
      providers: [
        { name: "FASHN v1.6", quality: "5/5 (NO lingerie)" },
        { name: "IDM-VTON (Replicate)", quality: "4/5 (YES lingerie)" },
        { name: "Kolors VTO (Replicate)", quality: "3/5" },
      ],
      usedBy: [
        "Bras (77) — IDM-VTON (lingerie)",
        "Panties (72) — IDM-VTON",
        "Shapewear (15) — IDM-VTON",
      ],
    },
    "model-create": {
      name: "Create AI Model",
      whatItDoes:
        "No model? Generate one with AI. Choose gender, age, skin tone, body type, pose and expression. The generated model can be reused to dress with Try-On or Virtual Jewelry.",
      flow: [
        "You configure: gender, age range, skin tone, body type, pose, expression",
        "buildModelPrompt() builds a detailed prompt for FASHN",
        "FASHN Model Create generates a model image",
        "The result is saved to the model gallery to reuse",
        "You can use Face to Model (your selfie → full model)",
      ],
      files: [
        { label: "UI Panel", purpose: "Form: gender, age, skin, body, pose, expression" },
        { label: "API Route", purpose: "Builds the prompt, calls FASHN Model Create" },
        { label: "Processing", purpose: "buildModelPrompt + FASHN API call + variations" },
        { label: "AI Models DB", purpose: "Save/load created models in the DB" },
      ],
      providers: [
        { name: "FASHN Model Create", quality: "5/5" },
        { name: "FASHN Face to Model", quality: "5/5" },
        { name: "FASHN Model Variation", quality: "4/5" },
      ],
      usedBy: [
        "Lingerie — diverse female models",
        "Jewelry — models for earrings/necklaces",
      ],
    },
    "ghost-mannequin": {
      name: "Invisible Mannequin",
      whatItDoes:
        "If you shot your garment on a physical mannequin, this tool removes the mannequin and leaves the garment 'floating' with 3D volume. A professional effect used by major brands.",
      flow: [
        "You upload a photo of the garment ON a physical mannequin",
        "Flux Kontext inpainting: 'Remove the mannequin body completely'",
        "The AI fills the inside of the garment naturally",
        "Result: the garment floating with a 3D shape, no mannequin",
      ],
      files: [
        { label: "UI Panel", purpose: "Ghost mannequin controls" },
        { label: "API Route", purpose: "Receives the image, calls Flux Kontext for inpaint" },
        { label: "Processing", purpose: "Flux Kontext with a specific prompt for the mannequin" },
      ],
      providers: [{ name: "Flux Kontext Pro", quality: "5/5" }],
      usedBy: ["Bras shot on a mannequin", "Shapewear on a mannequin"],
    },
    "jewelry-tryon": {
      name: "Virtual Jewelry",
      whatItDoes:
        "Virtual try-on for earrings, necklaces, rings, bracelets, glasses and watches. The AI places your accessory on a model with realistic lighting and perspective.",
      flow: [
        "You need: 1) the accessory photo with no background, 2) a model photo with a visible face",
        "You select the type: earrings, necklace, ring, bracelet, sunglasses, watch",
        "Flux Kontext uses a specialized prompt per accessory type",
        "The AI positions the accessory correctly (ears, neck, finger, etc)",
        "Result: a model wearing your jewelry with a realistic metallic reflection",
      ],
      files: [
        { label: "UI Panel", purpose: "Accessory type, upload jewelry + model" },
        { label: "API Route", purpose: "Receives image + type + model, calls Flux Kontext" },
        { label: "Processing", purpose: "Specialized prompts per jewelry type + Flux Kontext" },
      ],
      providers: [{ name: "Flux Kontext Pro", quality: "5/5" }],
      usedBy: [
        "Earrings (~20)",
        "Chains (~15)",
        "Bracelets (~12)",
        "Studs (~15)",
        "Rings (~5)",
        "Sets (~5)",
      ],
    },
    video: {
      name: "Video Studio",
      whatItDoes:
        "Turns your product photo into an animated video for TikTok, Reels and stories. 3 modes: Product (spin, zoom), Fashion (model walk), Avatar (talks with lip sync + TTS).",
      flow: [
        "You upload your already-edited product photo",
        "You choose a tab: Product, Fashion or Avatar",
        "You choose a provider: Ken Burns (FREE), Wan 2.2 ($0.05), Kling ($0.07+)",
        "For Avatar: you write text → Edge TTS generates audio → lip sync with video",
        "Result: an MP4 video ready to publish",
      ],
      files: [
        { label: "UI Panel", purpose: "3 tabs: ProductVideoTab, FashionVideoTab, AvatarVideoTab" },
        { label: "Product Tab", purpose: "Product video: rotate, zoom, orbit" },
        { label: "Fashion Tab", purpose: "Fashion video: model walk, reveal" },
        { label: "Avatar Tab", purpose: "Talking avatar: TTS + lip sync" },
        { label: "Providers", purpose: "Registry of 7 providers: Ken Burns, LTX, Wan 2.1/2.2, Kling, Minimax" },
        { label: "API Route", purpose: "Receives image + provider + params, generates the video" },
        { label: "TTS Route", purpose: "Generates audio with Edge TTS (free)" },
        { label: "Avatar Route", purpose: "Wav2Lip/MuseTalk/SadTalker/LivePortrait" },
      ],
      providers: [
        { name: "Ken Burns (local)", quality: "2/5 (zoom/pan)" },
        { name: "LTX-Video", quality: "3/5" },
        { name: "Wan 2.2 Fast", quality: "4/5" },
        { name: "Kling 2.6", quality: "5/5 (with audio)" },
      ],
      usedBy: [
        "Hero products for TikTok/Reels",
        "Perfumes with 360 rotation",
        "Lingerie with a fashion walk",
      ],
    },
    "ad-creator": {
      name: "Create Ads",
      whatItDoes:
        "Generates a ready-to-publish ad video. Pick a social network (IG Reel, TikTok, FB, YouTube Short, Pinterest), write a headline and CTA. The AI generates the video in the right format.",
      flow: [
        "You upload your already-edited product photo",
        "You choose a template: IG Reel, TikTok, FB Ad, FB Marketplace, YT Short, IG Story, Pinterest",
        "You write the headline and CTA",
        "Auto-prompt generates an optimized description",
        "The video is generated with the right aspect ratio and duration per platform",
      ],
      files: [
        { label: "UI Panel", purpose: "Templates per social network, headline/CTA, preview" },
        { label: "API Route", purpose: "Receives image + template + text, generates the ad video" },
        { label: "Composition", purpose: "Ad composition: template + video + text overlay" },
      ],
      providers: [{ name: "Chosen video provider", quality: "Depends on the provider" }],
      usedBy: ["Instagram/TikTok campaigns for Unistyles"],
    },
    "ai-prompt": {
      name: "AI Creative Director",
      whatItDoes:
        "Not sure which style to use? Upload your product, tell the AI which platform it's for, and it suggests 4 professional photography concepts with optimized prompts.",
      flow: [
        "You upload a product photo",
        "You describe what type of content you need (e-commerce, social, lifestyle)",
        "Claude Haiku analyzes your product and generates 4 concepts",
        "Each concept includes: an optimized prompt, lighting style, composition",
        "You select the one you like most and it is applied automatically",
      ],
      files: [
        { label: "UI Panel", purpose: "Product + platform input, shows 4 concepts" },
        { label: "API Route", purpose: "Sends to Claude Haiku, returns the concepts" },
        { label: "Prompts", purpose: "System prompts for Claude" },
      ],
      providers: [{ name: "Claude Haiku", quality: "5/5" }],
      usedBy: ["When you don't know which background/style to use for your product"],
    },
    batch: {
      name: "Bulk Processing",
      whatItDoes:
        "Once you've tested your flow with 1 photo, apply it to 300+ photos automatically. Define a pipeline (remove background → enhance → shadows) and batch applies it to your whole catalog.",
      flow: [
        "You upload multiple images (drag & drop or multi-select)",
        "You define a pipeline: a sequence of operations (bg-remove → enhance → shadow → resize)",
        "Or you use a preset: Quick Clean (free), Amazon Ready, Instagram Lifestyle, Full Production",
        "Batch runs each image through the full pipeline",
        "Live tracking: progress, completed, failed, accumulated cost",
        "Download a ZIP with all the results",
      ],
      files: [
        { label: "Page", purpose: "Full batch processing UI" },
        { label: "API Route", purpose: "Receives images[] + pipeline, runs sequentially" },
        { label: "Panel", purpose: "Pipeline builder with presets and execution" },
        { label: "Page", purpose: "Batch processing with inventory" },
      ],
      providers: [{ name: "Depends on the pipeline", quality: "Configurable" }],
      usedBy: ["Full catalogs: 300+ products at once"],
    },
    "ai-agent": {
      name: "Automatic AI Agent",
      whatItDoes:
        "THE BRAIN of UniStudio. 3 agents (E-Commerce, Model, Social) that automatically decide which steps to run. Upload your photo → choose an agent → the AI plans → it runs everything automatically.",
      flow: [
        "Upload a photo + choose an agent (E-Commerce, Model or Social)",
        "Choose a product category (lingerie, perfume, jewelry, etc)",
        "Choose a budget: Free, Economy or Premium",
        "/api/ai-agent/plan → Claude Haiku creates a step plan (or falls back to a local template)",
        "useAgentPipeline runs the steps sequentially via existing /api/*",
        "Context flows: currentUrl (current image) + garmentUrl (from bg-remove) + modelUrl (from model-create)",
        "Final result with total cost and previews of each step",
      ],
      files: [
        { label: "Types", purpose: "AgentType, PipelineStep, AgentPlan, StepExecution, BudgetTier" },
        { label: "Engine", purpose: "EXECUTOR: orchestrates /api/* routes, manages garmentUrl/modelUrl context" },
        { label: "Editor Panel", purpose: "4 phases in the sidebar: Input → Plan → Execute → Results" },
        { label: "Dashboard Chat", purpose: "Dashboard chat interface with 5 widgets" },
        { label: "Standalone Page", purpose: "5-step workflow: choose → upload → configure → process → result" },
        { label: "Plan API", purpose: "Claude Haiku generates the plan + fallback to local templates" },
      ],
      providers: [
        { name: "Claude Haiku (planning)", quality: "5/5" },
        { name: "Template fallback (local)", quality: "4/5" },
      ],
      usedBy: ["Automate EVERYTHING: upload a photo and the AI does the rest"],
    },
    compliance: {
      name: "Check Marketplace",
      whatItDoes:
        "Before publishing, check that your image meets the exact requirements of Amazon, Shopify, Etsy, eBay, TikTok Shop, etc. It detects size, format and background errors and suggests fixes.",
      flow: [
        "You upload your final image",
        "You select a marketplace: Amazon, Shopify, IG Shop, Etsy, eBay, TikTok Shop, Pinterest, etc.",
        "checkCompliance() validates: dimensions, aspect ratio, background color, file size, format",
        "Report: PASS or FAIL with specific issues and suggested fixes",
        "Auto-fix: upscale, outpaint, change background, compress automatically",
      ],
      files: [
        { label: "UI Panel", purpose: "Marketplace selector, visual report, auto-fix" },
        { label: "Compliance", purpose: "Requirements per platform + checkCompliance()" },
      ],
      providers: [{ name: "Local (no API)", quality: "5/5" }],
      usedBy: ["ALL products before publishing to a marketplace"],
    },
    "brand-kit": {
      name: "Brand Kit",
      whatItDoes:
        "Saves Unistyles' colors, fonts, logo and watermark to apply visual consistency across ALL your product photos.",
      flow: [
        "You configure your brand colors (primary, secondary, accent, background)",
        "You upload the logo in several versions (color, white, black, icon)",
        "You configure the watermark: position, opacity, size",
        "It is applied automatically in exports and batch processing",
      ],
      files: [
        { label: "Page", purpose: "Full brand kit UI" },
        { label: "API Route", purpose: "Brand kit CRUD in the DB" },
        { label: "Logic", purpose: "Colors, fonts, watermark, logo management" },
        { label: "Store", purpose: "Zustand brand store" },
      ],
      providers: [{ name: "Local", quality: "N/A" }],
      usedBy: ["The whole Unistyles brand"],
    },
  },
};
