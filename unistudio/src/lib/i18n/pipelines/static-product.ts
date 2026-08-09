// =============================================================================
// i18n — Textos visibles del pipeline de Perfumes y Belleza (ES / EN)
// =============================================================================
// Fuente única de todo el texto de la UI de
// `src/app/pipelines/static-product/page.tsx` (menos el encabezado
// título/subtítulo, que vive en `pages.ts` → `t.pages.staticProduct`).
// Se consume con `const { t } = useI18n()` → `const sp = t.pipelines.staticProduct`.
//
// Mismas reglas de escritura que translations.ts:
//  1. Verbos accionables.
//  2. CTAs cortas.
//  3. Descripción = outcome en 1 frase.
//  4. Sin nombrar modelos IA en la copy de marketing (los tooltips técnicos de
//     "Proveedor" son la excepción: su propósito es nombrar la herramienta).
//  5. Segunda persona.
//  6. Ambos idiomas con EXACTAMENTE la misma forma (mismo shape) para que
//     TypeScript garantice que ninguna clave quede sin traducir.
// =============================================================================

/** Estados posibles de un job — deben coincidir con `JobStatus` en page.tsx. */
type JobStatusKey =
  | 'idle'
  | 'uploading'
  | 'isolating'
  | 'normalizing'
  | 'generating'
  | 'done'
  | 'error';

/** Claves de paso — deben coincidir con `StepKey` en page.tsx. */
type StepKeyName =
  | 'isolate'
  | 'normalize'
  | 'white'
  | 'adaptive'
  | 'hero'
  | 'vertical'
  | 'upscale'
  | 'shadow'
  | 'lifestyleVideo';

/** Copy de texto visible de un paso (el `icon` sigue viviendo en STEP_META). */
interface StepItemCopy {
  label: string;
  costHint: string;
  description: string;
  what: string;
  provider: string;
  duration: string;
  tips: string[];
}

export interface StaticProductPipelineCopy {
  header: {
    home: string;
    name: string;
    categories: string;
  };
  batch: {
    heading: string;
    hintPre: string;
    hintPost: string;
    refreshTitle: string;
    refresh: string;
    errorLoading: (msg: string) => string;
    scanning: string;
    emptyPre: string;
    emptyPost: string;
    photos: (count: number) => string;
    loading: (loaded: number, total: number) => string;
  };
  upload: {
    heading: string;
    headingHint: string;
    defaultType: string;
    defaultBrand: string;
    dropCta: string;
    dropHint: string;
  };
  review: {
    heading: (count: number) => string;
    spent: string;
    done: string;
  };
  job: {
    downloadResult: string;
    remove: string;
    sceneLabel: string;
    sceneHint: string;
    sceneAuto: string;
    videoToggle: string;
    videoDesc: string;
    videoAction: string;
    /** Etiquetas del dropdown de acción del video — key = `LifestyleVideoAction`. */
    videoActions: Record<'auto' | 'spray' | 'mist' | 'rotacion' | 'luz' | 'dolly-in', string>;
    upscaleToggle: string;
    upscaleDesc: string;
    shadowToggle: string;
    shadowDesc: string;
    photoroomToggle: string;
    photoroomDesc: string;
    featuresTitle: string;
    cap: (value: string) => string;
    zoomSmall: string;
    downloadAllN: (total: number) => string;
    downloadNOfN: (count: number, total: number) => string;
    downloadNOfNTitle: (count: number, total: number) => string;
  };
  statusLabels: Record<JobStatusKey, string>;
  steps: {
    infoTitle: string;
    providerLabel: string;
    durationLabel: string;
    tipsLabel: string;
    failedLower: string;
    failedCap: string;
    skipped: string;
    processingLower: string;
    waiting: string;
    generating: string;
    unknownError: string;
    reviewBadge: string;
    zoomBig: string;
    downloadStep: (label: string) => string;
    download: string;
    changeTitle: string;
    change: string;
    repeatTitle: string;
    repeat: string;
    items: Record<StepKeyName, StepItemCopy>;
  };
  actions: {
    processing: string;
    processAll: string;
    validateTitle: string;
    validateLabel: string;
    validateCost: string;
    clearAll: string;
  };
  modal: {
    title: string;
    promptLabel: string;
    promptPlaceholder: string;
    cancel: string;
    regenerate: string;
  };
  lightbox: {
    close: string;
    download: string;
  };
  messages: {
    noneDownloaded: string;
    zipReady: (count: number) => string;
    zipError: string;
    duplicatesIgnored: (count: number) => string;
    ambiguousNames: (count: number) => string;
    catNoFolders: (name: string) => string;
    noImagesFound: (name: string) => string;
    photosLoadedFrom: (count: number, name: string) => string;
    errorLoadingCategory: (name: string, msg: string) => string;
    jobError: (name: string, msg: string) => string;
    noPending: string;
    processed: (count: number) => string;
    noImageAvailable: string;
    regenerated: (keys: string) => string;
    errorRerunning: (msg: string) => string;
    allOutputsFailed: string;
    productNotVisible: (reason: string) => string;
    duplicateDetected: (count: number, reason: string) => string;
    productChanged: (changes: string) => string;
  };
}

// -----------------------------------------------------------------------------
// Español (idioma por defecto) — valores EXACTOS a los que ya renderiza la page.
// -----------------------------------------------------------------------------

export const STATIC_PRODUCT_PIPELINE_ES: StaticProductPipelineCopy = {
  header: {
    home: 'Inicio',
    name: 'Perfumes y Belleza',
    categories: 'Perfumes · Cremas · Skincare · Maquillaje',
  },
  batch: {
    heading: 'Batch desde inventario',
    hintPre:
      'Carga todas las fotos de una categoría sin subir manualmente. Solo funciona en dev local (las imágenes viven en ',
    hintPost: ', no se deployan).',
    refreshTitle: 'Refrescar inventario',
    refresh: 'Refrescar',
    errorLoading: (msg) => `Error cargando inventario: ${msg}`,
    scanning: 'Escaneando inventario...',
    emptyPre:
      'No se encontraron categorías de estáticos en el inventario local. Verifica que ',
    emptyPost: ' existe.',
    photos: (count) => `${count} fotos`,
    loading: (loaded, total) => `Cargando ${loaded}/${total}...`,
  },
  upload: {
    heading: '1 · Sube tus fotos',
    headingHint: 'o usa el batch de arriba',
    defaultType: 'Tipo por defecto (aplicado a lo que subas)',
    defaultBrand: 'Marca por defecto',
    dropCta: 'Arrastra fotos aquí o haz click',
    dropHint: 'Perfumes, cremas, bloqueador, desodorantes, limpieza facial, maquillaje',
  },
  review: {
    heading: (count) => `2 · Revisa y procesa (${count} foto${count !== 1 ? 's' : ''})`,
    spent: 'acumulado',
    done: 'listas',
  },
  job: {
    downloadResult: 'Descargar resultado',
    remove: 'Quitar',
    sceneLabel: '🎨 Escena del fondo',
    sceneHint: '— elige o deja en automático',
    sceneAuto: '🤖 Automático (decide la IA por marca+tipo)',
    videoToggle: '🎬 Video lifestyle Reels (+$0.05)',
    videoDesc:
      '5 segundos vertical 9:16 con animación cinemática. Listo para Reels, Stories, TikTok.',
    videoAction: 'Acción del video',
    videoActions: {
      auto: 'Automático (cinemático suave)',
      spray: 'Spray de perfume',
      mist: 'Aroma flotando',
      rotacion: 'Rotación 360° suave',
      luz: 'Luz cinemática pulsante',
      'dolly-in': 'Acercamiento dolly-in',
    },
    upscaleToggle: '🔍 Alta resolución + QC (+$0.05)',
    upscaleDesc:
      'Escala el adaptativo a mayor resolución y nitidez. Listo para el zoom de la ficha del producto.',
    shadowToggle: '🌑 Sombra de contacto en el blanco',
    shadowDesc:
      'Aterriza el producto sobre el blanco e-commerce para que no parezca pegado. Gratis.',
    photoroomToggle: '⚡ Usar Photoroom (blanco real + sombra)',
    photoroomDesc:
      'Genera el blanco e-commerce con recorte, fondo y sombra en un solo paso. En modo prueba (sandbox) sale con marca de agua.',
    featuresTitle: '✨ Lo que la IA ve en tu foto',
    cap: (value) => `tapa ${value}`,
    zoomSmall: 'Ver en grande',
    downloadAllN: (total) => `Descargar las ${total}`,
    downloadNOfN: (count, total) => `Descargar ${count}/${total}`,
    downloadNOfNTitle: (count, total) => `Descargar ${count} de ${total} versiones como ZIP`,
  },
  statusLabels: {
    idle: 'Listo',
    uploading: 'Subiendo...',
    isolating: 'Quitando fondo...',
    normalizing: 'Centrando 2000×2000...',
    generating: 'Generando 3 fondos...',
    done: 'Listo',
    error: 'Error',
  },
  steps: {
    infoTitle: '¿Qué hace este paso?',
    providerLabel: 'Proveedor:',
    durationLabel: 'Tiempo:',
    tipsLabel: 'Tips:',
    failedLower: 'falló',
    failedCap: 'Falló',
    skipped: 'saltado',
    processingLower: 'procesando…',
    waiting: 'esperando…',
    generating: 'Generando…',
    unknownError: 'Error desconocido',
    reviewBadge: '⚠ Revisar',
    zoomBig: 'Click para ver en grande',
    downloadStep: (label) => `Descargar ${label}`,
    download: 'Descargar',
    changeTitle: 'Cambiar prompt y re-generar adaptativo + vertical',
    change: 'Cambiar',
    repeatTitle: 'Re-ejecutar este output',
    repeat: 'Repetir',
    items: {
      isolate: {
        label: 'Quitar fondo',
        costHint: '$0.01',
        description: 'Aísla el producto sobre transparente.',
        what: 'Quita el fondo de tu foto y deja solo el producto sobre fondo transparente — base para todos los outputs siguientes.',
        provider: 'Replicate rembg (cjwbw/rembg). Fallback: WithoutBG Docker.',
        duration: '5–15 s',
        tips: [
          'Reintentá si el primer intento dejó halo.',
          'Para frascos de vidrio considerá una foto con fondo más contrastante.',
        ],
      },
      normalize: {
        label: 'Centrar 2000×2000',
        costHint: 'Gratis',
        description: 'Resize y centrado consistente entre fotos del mismo SKU.',
        what: 'Centra y normaliza el lienzo a 2000×2000 px para que todas las fotos del mismo SKU se vean alineadas en el catálogo.',
        provider: 'Sharp (server-side) — gratis, sin IA.',
        duration: '<1 s',
        tips: ['Subí fotos de al menos 1500×1500 para mejor calidad.'],
      },
      white: {
        label: 'Blanco e-commerce',
        costHint: 'Gratis',
        description:
          'Fondo #FFFFFF puro, listo para Amazon/MercadoLibre/listing. Sharp puro, no pasa por modelo IA.',
        what: 'Compone el producto sobre fondo blanco puro (#FFFFFF), formato exigido por Amazon, MercadoLibre y la mayoría de marketplaces.',
        provider: 'Sharp composite — sin IA, garantiza pixel-perfect.',
        duration: '<1 s',
        tips: ['Para listings de Amazon usá este output.'],
      },
      adaptive: {
        label: 'Adaptativo catálogo',
        costHint: '$0.003',
        description:
          'Fondo decidido por marca+tipo (mármol, gradient, playa). 1:1, listo para web/Instagram feed.',
        what: 'Genera un fondo único basado en la marca y tipo del producto (mármol para premium, gradient para teen, playa para verano). Compone TU producto encima en pixel-perfect.',
        provider: "Flux Schnell (Replicate) + Sharp composite. Mode 'fast'.",
        duration: '8–15 s',
        tips: [
          "Si sale raro, click 'Cambiar' para editar el prompt y regenerar.",
          'Adaptive y vertical comparten seed → look cohesivo entre 1:1 y 9:16.',
        ],
      },
      hero: {
        label: 'Hero editorial 4:5',
        costHint: '$0.003',
        description:
          'Mismo fondo adaptativo en 4:5 (1080×1350). Ideal para el feed de Instagram y Facebook.',
        what: 'Genera el mismo fondo adaptativo pero en 4:5 vertical (1080×1350) — el formato que más ocupa el feed de Instagram y Facebook. Mismo seed que el adaptativo y el vertical → catálogo cohesivo. Compone TU producto encima en pixel-perfect.',
        provider: 'Flux Schnell + Sharp composite. Mismo seed que adaptive.',
        duration: '8–15 s',
        tips: [
          'Usá este output para el feed de Instagram y Facebook — el 4:5 ocupa más pantalla que el 1:1.',
          'Comparte seed con adaptativo y vertical → los 3 formatos se ven cohesivos.',
        ],
      },
      vertical: {
        label: 'Vertical 9:16',
        costHint: '$0.003',
        description:
          'Mismo fondo adaptativo en formato vertical. Listo para Reels/Stories/TikTok.',
        what: 'Mismo fondo adaptativo del paso anterior pero en 9:16 — para Reels, Stories, TikTok. Mismo seed → estética cohesiva con el 1:1.',
        provider: 'Flux Schnell + Sharp composite. Mismo seed que adaptive.',
        duration: '8–15 s',
        tips: ['Usá este output para Reels y Stories.'],
      },
      upscale: {
        label: 'Alta resolución + QC',
        costHint: '$0.05',
        description:
          'Escala el adaptativo a mayor resolución y nitidez — listo para el zoom de la ficha del producto.',
        what: 'Escala el fondo adaptativo a una versión de mayor resolución y más nítida, ideal para el zoom de la ficha del producto y para impresión. Fiel al original — no reinventa el frasco.',
        provider: 'Clarity Upscaler (Replicate). resemblance 0.85, creativity 0.25.',
        duration: '15–40 s',
        tips: [
          'Actívalo cuando necesites zoom en la ficha o material impreso.',
          'Toma el adaptativo como base (o el blanco si el adaptativo falló).',
        ],
      },
      shadow: {
        label: 'Sombra de contacto',
        costHint: 'Gratis',
        description:
          'Sombra de contacto realista sobre el blanco e-commerce para que el producto no parezca pegado.',
        what: 'Agrega una sombra de contacto realista al output blanco e-commerce para aterrizar el producto sobre la superficie y que no parezca recortado y pegado.',
        provider: 'Sharp (contact shadow) — sin IA, gratis.',
        duration: '<1 s',
        tips: [
          'Actívalo si el blanco e-commerce se ve flotando o recortado.',
          'Se aplica sobre el output blanco (#FFFFFF).',
        ],
      },
      lifestyleVideo: {
        label: 'Video Reels lifestyle',
        costHint: '$0.05',
        description:
          'Video 5s 9:16 con animación cinemática (spray, mist, rotación). Listo para Reels/Stories/TikTok.',
        what: 'Genera un video corto de 5 segundos en formato vertical 9:16 con animación elegante de tu producto. Elige la acción: spray de perfume con manos, aroma flotando, rotación, luz pulsante. Ideal para redes sociales.',
        provider: 'wan-2.2-fast (Replicate). Anima el frame del adaptive con prompt según acción.',
        duration: '60–120 s para generar',
        tips: [
          'Necesitás haber generado el adaptive primero — el video usa esa imagen como punto de partida.',
          "Acción 'Spray' agrega manos virtuales aplicando el perfume — más cinemático.",
          "Si no eliges acción, queda en 'Automático' (dolly-in suave).",
        ],
      },
    },
  },
  actions: {
    processing: 'Procesando...',
    processAll: 'Procesar todas',
    validateTitle:
      'Corre un check de Claude Haiku después de generar el fondo adaptativo para detectar duplicados o producto faltante.',
    validateLabel: 'Validar fondos con IA',
    validateCost: '(+$0.0002/foto)',
    clearAll: 'Limpiar todo',
  },
  modal: {
    title: 'Cambiar fondo',
    promptLabel: 'Prompt del fondo (editable)',
    promptPlaceholder: 'Describe el fondo deseado...',
    cancel: 'Cancelar',
    regenerate: 'Re-generar adaptativo + vertical',
  },
  lightbox: {
    close: 'Cerrar',
    download: 'Descargar imagen',
  },
  messages: {
    noneDownloaded: 'No se pudo descargar ninguna versión.',
    zipReady: (count) => `ZIP listo (${count} versión${count !== 1 ? 'es' : ''}).`,
    zipError: 'Error generando ZIP',
    duplicatesIgnored: (count) =>
      `${count} foto${count !== 1 ? 's' : ''} duplicada${count !== 1 ? 's' : ''} ignorada${count !== 1 ? 's' : ''}.`,
    ambiguousNames: (count) =>
      `${count} foto${count !== 1 ? 's' : ''} con nombre compartido entre perfumes y desodorantes — confirma el tipo antes de procesar.`,
    catNoFolders: (name) => `${name} no tiene carpetas con imágenes.`,
    noImagesFound: (name) => `No se encontraron imágenes en ${name}.`,
    photosLoadedFrom: (count, name) => `${count} foto(s) cargadas desde ${name}.`,
    errorLoadingCategory: (name, msg) => `Error cargando ${name}: ${msg}`,
    jobError: (name, msg) => `Error en ${name}: ${msg}`,
    noPending: 'No hay fotos pendientes de procesar.',
    processed: (count) => `${count} foto(s) procesada(s).`,
    noImageAvailable: 'No hay imagen disponible. Procesa el job completo primero.',
    regenerated: (keys) => `Re-generado: ${keys}.`,
    errorRerunning: (msg) => `Error re-ejecutando: ${msg}`,
    allOutputsFailed: 'Los 3 outputs fallaron — revisa los errores por paso.',
    productNotVisible: (reason) => `⚠ Producto no visible: ${reason}`,
    duplicateDetected: (count, reason) => `⚠ Duplicado detectado (count=${count}): ${reason}`,
    productChanged: (changes) => `⚠ El producto cambió: ${changes}`,
  },
};

// -----------------------------------------------------------------------------
// English
// -----------------------------------------------------------------------------

export const STATIC_PRODUCT_PIPELINE_EN: StaticProductPipelineCopy = {
  header: {
    home: 'Home',
    name: 'Perfume & Beauty',
    categories: 'Perfume · Creams · Skincare · Makeup',
  },
  batch: {
    heading: 'Inventory batch',
    hintPre:
      'Load every photo in a category without uploading manually. Works only in local dev (the images live in ',
    hintPost: ', not deployed).',
    refreshTitle: 'Refresh inventory',
    refresh: 'Refresh',
    errorLoading: (msg) => `Error loading inventory: ${msg}`,
    scanning: 'Scanning inventory...',
    emptyPre:
      'No static-product categories found in the local inventory. Check that ',
    emptyPost: ' exists.',
    photos: (count) => `${count} photos`,
    loading: (loaded, total) => `Loading ${loaded}/${total}...`,
  },
  upload: {
    heading: '1 · Upload your photos',
    headingHint: 'or use the batch above',
    defaultType: 'Default type (applied to whatever you upload)',
    defaultBrand: 'Default brand',
    dropCta: 'Drag photos here or click',
    dropHint: 'Perfume, creams, sunscreen, deodorant, facial cleanser, makeup',
  },
  review: {
    heading: (count) => `2 · Review and process (${count} photo${count !== 1 ? 's' : ''})`,
    spent: 'spent',
    done: 'done',
  },
  job: {
    downloadResult: 'Download result',
    remove: 'Remove',
    sceneLabel: '🎨 Background scene',
    sceneHint: '— pick one or leave on auto',
    sceneAuto: '🤖 Auto (AI decides by brand+type)',
    videoToggle: '🎬 Lifestyle Reels video (+$0.05)',
    videoDesc:
      '5 seconds, vertical 9:16, with cinematic animation. Ready for Reels, Stories, TikTok.',
    videoAction: 'Video action',
    videoActions: {
      auto: 'Auto (soft cinematic)',
      spray: 'Perfume spray',
      mist: 'Drifting scent',
      rotacion: 'Smooth 360° rotation',
      luz: 'Pulsing cinematic light',
      'dolly-in': 'Dolly-in push',
    },
    upscaleToggle: '🔍 High-res + QC (+$0.05)',
    upscaleDesc:
      'Upscales the adaptive output to higher resolution and sharpness. Ready for product-page zoom.',
    shadowToggle: '🌑 Contact shadow on the white',
    shadowDesc:
      'Grounds the product on the e-commerce white so it does not look pasted. Free.',
    photoroomToggle: '⚡ Use Photoroom (true white + shadow)',
    photoroomDesc:
      'Builds the e-commerce white with cut-out, background and shadow in a single step. In test mode (sandbox) it comes out watermarked.',
    featuresTitle: '✨ What AI sees in your photo',
    cap: (value) => `cap ${value}`,
    zoomSmall: 'View larger',
    downloadAllN: (total) => `Download all ${total}`,
    downloadNOfN: (count, total) => `Download ${count}/${total}`,
    downloadNOfNTitle: (count, total) => `Download ${count} of ${total} versions as ZIP`,
  },
  statusLabels: {
    idle: 'Ready',
    uploading: 'Uploading...',
    isolating: 'Removing background...',
    normalizing: 'Centering 2000×2000...',
    generating: 'Generating 3 backgrounds...',
    done: 'Done',
    error: 'Error',
  },
  steps: {
    infoTitle: 'What does this step do?',
    providerLabel: 'Provider:',
    durationLabel: 'Time:',
    tipsLabel: 'Tips:',
    failedLower: 'failed',
    failedCap: 'Failed',
    skipped: 'skipped',
    processingLower: 'processing…',
    waiting: 'waiting…',
    generating: 'Generating…',
    unknownError: 'Unknown error',
    reviewBadge: '⚠ Review',
    zoomBig: 'Click to view larger',
    downloadStep: (label) => `Download ${label}`,
    download: 'Download',
    changeTitle: 'Change the prompt and regenerate adaptive + vertical',
    change: 'Change',
    repeatTitle: 'Rerun this output',
    repeat: 'Repeat',
    items: {
      isolate: {
        label: 'Remove background',
        costHint: '$0.01',
        description: 'Isolates the product on transparency.',
        what: 'Removes the background from your photo and leaves only the product on transparency — the base for every output that follows.',
        provider: 'Replicate rembg (cjwbw/rembg). Fallback: WithoutBG Docker.',
        duration: '5–15 s',
        tips: [
          'Retry if the first pass left a halo.',
          'For glass bottles, try a photo with a higher-contrast background.',
        ],
      },
      normalize: {
        label: 'Center 2000×2000',
        costHint: 'Free',
        description: 'Consistent resize and centering across photos of the same SKU.',
        what: 'Centers and normalizes the canvas to 2000×2000 px so every photo of the same SKU lines up in the catalog.',
        provider: 'Sharp (server-side) — free, no AI.',
        duration: '<1 s',
        tips: ['Upload photos of at least 1500×1500 for better quality.'],
      },
      white: {
        label: 'E-commerce white',
        costHint: 'Free',
        description:
          'Pure #FFFFFF background, ready for Amazon/MercadoLibre/listing. Pure Sharp, never touches an AI model.',
        what: 'Composites the product on a pure white background (#FFFFFF), the format required by Amazon, MercadoLibre and most marketplaces.',
        provider: 'Sharp composite — no AI, guarantees pixel-perfect.',
        duration: '<1 s',
        tips: ['Use this output for Amazon listings.'],
      },
      adaptive: {
        label: 'Catalog adaptive',
        costHint: '$0.003',
        description:
          'Background chosen by brand+type (marble, gradient, beach). 1:1, ready for web/Instagram feed.',
        what: "Generates a unique background based on the product's brand and type (marble for premium, gradient for teen, beach for summer). Composites YOUR product on top pixel-perfect.",
        provider: "Flux Schnell (Replicate) + Sharp composite. Mode 'fast'.",
        duration: '8–15 s',
        tips: [
          "If it looks off, click 'Change' to edit the prompt and regenerate.",
          'Adaptive and vertical share a seed → cohesive look across 1:1 and 9:16.',
        ],
      },
      hero: {
        label: 'Editorial hero 4:5',
        costHint: '$0.003',
        description:
          'The same adaptive background in 4:5 (1080×1350). Ideal for the Instagram and Facebook feed.',
        what: 'Generates the same adaptive background but in 4:5 portrait (1080×1350) — the format that fills the most of the Instagram and Facebook feed. Same seed as adaptive and vertical → cohesive catalog. Composites YOUR product on top pixel-perfect.',
        provider: 'Flux Schnell + Sharp composite. Same seed as adaptive.',
        duration: '8–15 s',
        tips: [
          'Use this output for the Instagram and Facebook feed — 4:5 takes more screen than 1:1.',
          'Shares a seed with adaptive and vertical → all 3 formats look cohesive.',
        ],
      },
      vertical: {
        label: 'Vertical 9:16',
        costHint: '$0.003',
        description:
          'The same adaptive background in vertical format. Ready for Reels/Stories/TikTok.',
        what: 'The same adaptive background from the previous step but in 9:16 — for Reels, Stories, TikTok. Same seed → cohesive aesthetic with the 1:1.',
        provider: 'Flux Schnell + Sharp composite. Same seed as adaptive.',
        duration: '8–15 s',
        tips: ['Use this output for Reels and Stories.'],
      },
      upscale: {
        label: 'High-res + QC',
        costHint: '$0.05',
        description:
          'Upscales the adaptive output to higher resolution and sharpness — ready for product-page zoom.',
        what: 'Upscales the adaptive background to a higher-resolution, sharper version, ideal for product-page zoom and print. Faithful to the original — never reinvents the bottle.',
        provider: 'Clarity Upscaler (Replicate). resemblance 0.85, creativity 0.25.',
        duration: '15–40 s',
        tips: [
          'Turn it on when you need product-page zoom or print material.',
          'Takes the adaptive as its base (or the white output if adaptive failed).',
        ],
      },
      shadow: {
        label: 'Contact shadow',
        costHint: 'Free',
        description:
          'Realistic contact shadow on the e-commerce white output so the product does not look pasted.',
        what: 'Adds a realistic contact shadow to the e-commerce white output to ground the product on the surface so it does not look cut out and pasted.',
        provider: 'Sharp (contact shadow) — no AI, free.',
        duration: '<1 s',
        tips: [
          'Turn it on if the e-commerce white looks floating or cut out.',
          'Applied on top of the white output (#FFFFFF).',
        ],
      },
      lifestyleVideo: {
        label: 'Lifestyle Reels video',
        costHint: '$0.05',
        description:
          '5s 9:16 video with cinematic animation (spray, mist, rotation). Ready for Reels/Stories/TikTok.',
        what: "Generates a short 5-second vertical 9:16 video with an elegant animation of your product. Pick the action: perfume spray with hands, drifting scent, rotation, pulsing light. Ideal for social media.",
        provider: 'wan-2.2-fast (Replicate). Animates the adaptive frame with a prompt based on the action.',
        duration: '60–120 s to generate',
        tips: [
          'You need to have generated the adaptive first — the video uses that image as its starting point.',
          "The 'Spray' action adds virtual hands applying the perfume — more cinematic.",
          "If you don't pick an action, it stays on 'Auto' (soft dolly-in).",
        ],
      },
    },
  },
  actions: {
    processing: 'Processing...',
    processAll: 'Process all',
    validateTitle:
      'Runs an AI check after generating the adaptive background to catch duplicates or a missing product.',
    validateLabel: 'Validate backgrounds with AI',
    validateCost: '(+$0.0002/photo)',
    clearAll: 'Clear all',
  },
  modal: {
    title: 'Change background',
    promptLabel: 'Background prompt (editable)',
    promptPlaceholder: 'Describe the background you want...',
    cancel: 'Cancel',
    regenerate: 'Regenerate adaptive + vertical',
  },
  lightbox: {
    close: 'Close',
    download: 'Download image',
  },
  messages: {
    noneDownloaded: "Couldn't download any version.",
    zipReady: (count) => `ZIP ready (${count} version${count !== 1 ? 's' : ''}).`,
    zipError: 'Error generating ZIP',
    duplicatesIgnored: (count) =>
      `${count} duplicate photo${count !== 1 ? 's' : ''} ignored.`,
    ambiguousNames: (count) =>
      `${count} photo${count !== 1 ? 's' : ''} with a name shared between perfumes and deodorants — confirm the type before processing.`,
    catNoFolders: (name) => `${name} has no folders with images.`,
    noImagesFound: (name) => `No images found in ${name}.`,
    photosLoadedFrom: (count, name) => `${count} photo(s) loaded from ${name}.`,
    errorLoadingCategory: (name, msg) => `Error loading ${name}: ${msg}`,
    jobError: (name, msg) => `Error on ${name}: ${msg}`,
    noPending: 'No photos pending to process.',
    processed: (count) => `${count} photo(s) processed.`,
    noImageAvailable: 'No image available. Process the whole job first.',
    regenerated: (keys) => `Regenerated: ${keys}.`,
    errorRerunning: (msg) => `Error rerunning: ${msg}`,
    allOutputsFailed: 'All 3 outputs failed — check the per-step errors.',
    productNotVisible: (reason) => `⚠ Product not visible: ${reason}`,
    duplicateDetected: (count, reason) => `⚠ Duplicate detected (count=${count}): ${reason}`,
    productChanged: (changes) => `⚠ The product changed: ${changes}`,
  },
};
