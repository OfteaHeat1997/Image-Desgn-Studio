// =============================================================================
// i18n — Textos visibles del pipeline de Lencería (ES / EN)
// =============================================================================
// Fuente única del texto de la UI de `src/app/pipelines/lingerie/page.tsx`.
// Se consume con `const { t } = useI18n()` → `const lg = t.pipelines.lingerie`.
//
// Mismas reglas de escritura que translations.ts:
//  1. Verbos accionables.
//  2. CTAs cortas.
//  3. Descripción = outcome en 1 frase.
//  4. Sin nombrar modelos IA en la copy de marketing (los selectores/tooltips
//     técnicos de "Proveedor" son la excepción: su propósito es nombrar la
//     herramienta).
//  5. Segunda persona.
//  6. Ambos idiomas con EXACTAMENTE la misma forma (mismo shape) para que
//     TypeScript garantice que ninguna clave quede sin traducir.
// =============================================================================

interface OptionLabel {
  label: string;
}
interface OptionLabelHint {
  label: string;
  hint: string;
}
interface StepItemCopy {
  label: string;
  description: string;
}
interface StepDocCopy {
  what: string;
  provider: string;
  duration: string;
  costDetail: string;
  canFail: string[];
  tips: string[];
}
interface ProcessingCopyEntry {
  copy: [string, string, string];
  eta: string;
}

export interface LingeriePipelineCopy {
  setup: {
    home: string;
    breadcrumb: string;
    badge: string;
    title: string;
    subtitle: string;
    photosHeading: string;
    undoTitle: string;
    redoTitle: string;
    resetTitle: string;
    reset: string;
    loading: string;
    loadInventory: (typeLabel: string) => string;
    inventoryTypes: Record<string, string>;
    inventoryHint: string;
    photosCount: (count: number) => string;
    backReady: string;
    whichPhotos: string;
    needFrontal: string;
    needFrontalRest: string;
    needBack: string;
    needBackRest1: string;
    needBackEmph: string;
    needBackRest2: string;
    needSide: string;
    needSideRest: string;
    needFlat: string;
    needFlatRest: string;
    sizeSuggestionLabel: string;
    sizeSuggestionPre: string;
    sizeSuggestionMid: string;
    sizeSuggestionPost: string;
    changeTo: (value: string) => string;
    productsDetected: (count: number) => string;
    refPrefix: string;
    colorsCount: (count: number) => string;
    sharedModelNote: string;
    angleLabel: string;
    reuseHeading: string;
    reuseDesc: string;
    useNewModel: string;
    namePlaceholder: string;
    renameTitle: string;
    showingModels: (total: number) => string;
    productInfoHeading: string;
    refNumberLabel: string;
    refNumberPlaceholder: string;
    productTypeLabel: string;
    stepsHeading: string;
    costOnce: (cost: string) => string;
    costPerPhoto: (cost: string) => string;
  };
  productType: Record<string, string>;
  modelConfig: {
    heading: string;
    reuseNotePre: string;
    reuseNoteBold: string;
    reuseNotePost: string;
    skinToneLabel: string;
    skinTones: Record<string, string>;
    bodyTypeLabel: string;
    bodyTypes: Record<string, string>;
    ageLabel: string;
    ages: Record<string, string>;
  };
  executionMode: {
    heading: string;
    auto: string;
    autoSub: string;
    manual: string;
    manualSub: string;
  };
  generationMode: {
    heading: string;
    subtitle: string;
    comingSoon: string;
    faceSwapWarning: string;
    options: Record<string, { label: string; desc: string; cost: string }>;
  };
  artDirection: {
    heading: string;
    subtitle: string;
    options: Record<string, { label: string; desc: string }>;
  };
  fashnQuality: {
    heading: string;
    descPre: string;
    descBold: string;
    descPost: string;
    options: Record<string, { label: string; duration: string; hint: string }>;
  };
  summary: {
    heading: string;
    images: string;
    activeSteps: string;
    of: string;
    estimatedCost: string;
    start: string;
    startPhotos: (count: number) => string;
    uploadHint: string;
  };
  upload: {
    dropTitle: string;
    dropSub: string;
    formats: string;
  };
  steps: {
    items: Record<string, StepItemCopy>;
  };
  stepDocs: Record<string, StepDocCopy>;
  stepCard: {
    step: string;
    infoTitle: string;
    infoAria: string;
    providerBadgeKolors: string;
    providerBadgeGeneric: (provider: string) => string;
    stop: string;
    stopTitle: string;
    docsWhat: string;
    docsProvider: string;
    docsDuration: string;
    docsCost: string;
    docsCanFail: string;
    docsTips: string;
    methodLabel: string;
    providerLabel: string;
    poseLabel: string;
    actionLabel: string;
    poseDefaultSuffix: (label: string) => string;
    poseDefaults: Record<string, string>;
    original: string;
    result: string;
    noImage: string;
    techDetail: string;
    goUploadBack: string;
    variantsHint: (count: number) => string;
    variantAlt: (index: number) => string;
    variantThumbTitle: (index: number, selected: boolean) => string;
    viewBoth: string;
    viewBothCompareTitle: string;
    skip: string;
    downloadTitle: string;
    download: string;
    rerun: string;
    accept: string;
    skipStep: string;
    retry: string;
    retryWith: (label: string) => string;
  };
  statusBadge: Record<string, string>;
  processingCopy: Record<string, ProcessingCopyEntry>;
  defaultProcessingCopy: ProcessingCopyEntry;
  providerLabels: Record<string, string>;
  poseOptions: Record<string, string>;
  videoActionOptions: Record<string, string>;
  tryonProviders: Record<string, OptionLabelHint>;
  isolateMethods: Record<string, OptionLabelHint>;
  fashnModes: Record<string, OptionLabel>;
  photoAngles: Record<string, OptionLabelHint>;
  spec: {
    analyzing: string;
    analyzingSub: string;
    errorTitle: string;
    errorFallback: string;
    errorRest: string;
    retry: string;
    title: string;
    subtitle: string;
    notes: string;
    groups: Record<string, string>;
    fields: Record<string, { label: string; placeholder: string }>;
  };
  beforeAfter: {
    before: string;
    after: string;
    compareAria: (label: string) => string;
  };
  thumb: {
    expired: string;
    waiting: string;
  };
  lightbox: {
    variantChosen: string;
    compareTitle: string;
    onlyResult: string;
    compareWithOriginal: string;
    downloadTitle: string;
    download: string;
    closeTitle: string;
    close: string;
    original: string;
    result: string;
    imageAlt: (index: number) => string;
    prevTitle: string;
    nextTitle: string;
    variantChosenBtn: string;
    useVariant: (index: number) => string;
  };
  pipeline: {
    config: string;
    studioName: string;
    studioSuffix: string;
    refPrefix: string;
    buildTitle: string;
    processing: (current: number, total: number) => string;
    completed: (done: number, total: number) => string;
    downloadAll: string;
    spentLabel: string;
    batchDone: (count: number) => string;
    batchActive: (count: number) => string;
    batchErrors: (count: number) => string;
    batchPending: (count: number) => string;
    stopAll: string;
    imagesCount: (count: number) => string;
    processingShort: string;
    queued: string;
    headerDone: (cost: string) => string;
    imageProcessed: string;
    totalCostLabel: string;
    downloadAllResults: string;
    nextImage: string;
  };
  help: {
    title: string;
    undo: string;
    redo: string;
    redoAlt: string;
    toggleHelp: string;
    closeModal: string;
    navVariants: string;
    compareOriginal: string;
    footer: string;
  };
  messages: {
    stopBatch: string;
    stepStopped: (stepId: string) => string;
    undone: string;
    redone: string;
    modelReused: (ref: string) => string;
    inventoryNo: (type: string) => string;
    inventoryScanError: (err: string) => string;
    inventoryLoading: (total: number, refs: number) => string;
    inventoryNoneLoaded: string;
    inventoryLoaded: (count: number, failed: number) => string;
    inventoryError: (err: string) => string;
    resetConfirm: string;
    sessionReset: string;
    modelSelected: (name: string) => string;
    modelRenamed: (name: string) => string;
    noRealPhoto: (stepLabel: string) => string;
    reuploadNeeded: (filename: string) => string;
    uploadError: (filename: string, err: string) => string;
    unknownError: string;
    specReadFailed: (filename: string) => string;
    analysisFailed: string;
    photoBackSkip: string;
    modelVideoSkip: string;
    texturePreserveSkip: string;
    photoFullBodySkip: string;
    productVideoSkip: string;
    stoppedByUser: string;
    stepFellBack: (stepLabel: string, filename: string) => string;
    networkError: string;
    stepError: (stepLabel: string, msg: string) => string;
    jobExploded: (filename: string, msg: string) => string;
    pipelineComplete: (count: number) => string;
    noFileToAnalyze: string;
    noResultsYet: string;
    downloadingFiles: (count: number) => string;
  };
}

// -----------------------------------------------------------------------------
// Español (idioma por defecto) — valores EXACTOS a los que ya renderiza la page.
// -----------------------------------------------------------------------------

export const LINGERIE_PIPELINE_ES: LingeriePipelineCopy = {
  setup: {
    home: 'Inicio',
    breadcrumb: 'Lencería',
    badge: 'Bras · Panties · Shapewear · Fajas',
    title: 'Configura tu Pipeline de Lencería',
    subtitle:
      'Bras, panties y shapewear. Sube fotos de una referencia con modelo original, y el pipeline quita la modelo, crea una nueva con licencia libre, y la viste con la prenda. Opcionalmente genera videos de producto y de modelo.',
    photosHeading: '1 · Fotos del Producto',
    undoTitle: 'Deshacer (Ctrl+Z)',
    redoTitle: 'Rehacer (Ctrl+Shift+Z)',
    resetTitle: 'Comenzar de nuevo — borra las fotos y resultados (settings se mantienen)',
    reset: 'Comenzar de nuevo',
    loading: 'Cargando…',
    loadInventory: (typeLabel) => `Cargar inventario de ${typeLabel}`,
    inventoryTypes: { bra: 'Bras', panty: 'Panties', faja: 'Shapewear', set: 'Sets' },
    inventoryHint:
      'Si no hay folder pre-cargado de este tipo, subí tus fotos manualmente arrastrándolas arriba.',
    photosCount: (count) =>
      `${count} foto${count === 1 ? '' : 's'} · el ángulo se detecta del nombre, pero podés corregirlo abajo de cada foto`,
    backReady: 'Espalda real lista',
    whichPhotos: 'Qué fotos necesitás',
    needFrontal: 'Frontal',
    needFrontalRest: '— obligatoria (para tryon y modelo)',
    needBack: 'Espalda',
    needBackRest1: '— opcional,',
    needBackEmph: 'necesaria si querés "Foto Espalda"',
    needBackRest2: '(Kolors no rota 180° solo)',
    needSide: 'Lateral / Detalle',
    needSideRest: '— opcionales, mejoran fidelidad',
    needFlat: 'Flat lay',
    needFlatRest: '— opcional, para video 360° del producto',
    sizeSuggestionLabel: 'Sugerencia de talla:',
    sizeSuggestionPre: ' la mayoría de tus fotos son talla que sugiere modelo ',
    sizeSuggestionMid: ', pero tenés configurado ',
    sizeSuggestionPost: '.',
    changeTo: (value) => `Cambiar a ${value}`,
    productsDetected: (count) =>
      `${count} producto${count === 1 ? '' : 's'} detectado${count === 1 ? '' : 's'}:`,
    refPrefix: 'REF ',
    colorsCount: (count) => `(${count} color${count === 1 ? '' : 'es'})`,
    sharedModelNote:
      'Las fotos con misma REF comparten la modelo IA (se paga una sola vez por REF).',
    angleLabel: 'Ángulo',
    reuseHeading: 'Reusar modelo IA existente (ahorro $0.055/foto)',
    reuseDesc:
      'Click una modelo ya creada en sesiones anteriores para NO pagar por generar otra. O dejá sin seleccionar para crear nueva.',
    useNewModel: 'Usar nueva modelo ($0.055)',
    namePlaceholder: 'Nombre…',
    renameTitle: "Click para renombrar esta modelo (ej: 'Karen', 'Ana')",
    showingModels: (total) => `Mostrando 18 de ${total} modelos guardadas. Más en /gallery.`,
    productInfoHeading: '2 · Información del Producto',
    refNumberLabel: 'Número de referencia',
    refNumberPlaceholder: 'ej. 011473',
    productTypeLabel: 'Tipo de producto',
    stepsHeading: '3 · Pasos del Pipeline',
    costOnce: (cost) => `${cost} (1x)`,
    costPerPhoto: (cost) => `${cost}/foto`,
  },
  productType: {
    bra: 'Brassiere / Top',
    panty: 'Panty / Ropa interior',
    faja: 'Faja / Shapewear',
    set: 'Set completo',
  },
  modelConfig: {
    heading: 'Configuración del Modelo IA',
    reuseNotePre: 'El modelo se genera ',
    reuseNoteBold: 'una sola vez',
    reuseNotePost: ' y se reutiliza para todas las fotos del producto — optimizando costos.',
    skinToneLabel: 'Tono de piel',
    skinTones: {
      light: 'Clara',
      'medium-light': 'Medio clara',
      medium: 'Media',
      'medium-dark': 'Medio oscura',
      dark: 'Oscura',
    },
    bodyTypeLabel: 'Tipo de cuerpo',
    bodyTypes: {
      slim: 'Delgada',
      regular: 'Regular',
      curvy: 'Curvy',
      'plus-size': 'Plus size',
    },
    ageLabel: 'Rango de edad',
    ages: {
      '18-25': '18 – 25 años',
      '26-35': '26 – 35 años',
      '36-45': '36 – 45 años',
    },
  },
  executionMode: {
    heading: 'Modo de Ejecución',
    auto: 'Automático',
    autoSub: 'Todo sin pausas',
    manual: 'Manual',
    manualSub: 'Revisar cada paso',
  },
  generationMode: {
    heading: 'Modo de Generación',
    subtitle:
      'Elegí cómo se generan las fotos. El default es el más seguro; las otras opciones son alternativas con tradeoffs distintos.',
    comingSoon: 'Próximamente',
    faceSwapWarning:
      '⚠️ Requiere que etiquetes tus fotos con su ángulo (Frontal/Espalda/Cuerpo). El face-swap solo se aplica a las fotos reales que subiste; las vistas sin foto real caen al modo clásico automáticamente.',
    options: {
      default: {
        label: 'Modelo IA + Try-on (clásico)',
        desc: 'Genera una modelo IA nueva y le pone tu prenda aislada. Legalmente limpio. La prenda se reinterpreta un poco en cada vista.',
        cost: '~$0.15 / producto',
      },
      'face-swap': {
        label: 'Cambiar cara sobre tu foto real',
        desc: 'Usa TU foto real (frontal/espalda) y solo cambia la cara por una modelo IA. Producto idéntico al original. Más rápido y barato.',
        cost: '~$0.01 / producto',
      },
      'multi-sample': {
        label: '4 variantes — elegí la mejor',
        desc: 'Foto Espalda y Cuerpo Completo generan 4 opciones con caras/interpretaciones distintas. Vos elegís la que mejor preserva tu producto. Frontal sigue con 1 resultado.',
        cost: '~$0.60 / producto (4× los pasos de vista)',
      },
    },
  },
  artDirection: {
    heading: 'Art Direction (look del shoot)',
    subtitle:
      'El “look” como preset reutilizable — da consistencia a todo el catálogo. Se aplica a la modelo y al try-on.',
    options: {
      'catalogo-blanco': {
        label: 'Catálogo blanco',
        desc: 'E-commerce limpio: fondo blanco, luz pareja de softbox, color fiel. Default.',
      },
      'editorial-suave': {
        label: 'Editorial suave',
        desc: 'Mismo fondo blanco ecommerce, pero con luz cálida direccional (más estético).',
      },
      'lifestyle-natural': {
        label: 'Luz natural',
        desc: 'Mismo fondo blanco ecommerce, con luz natural suave (look más fresco).',
      },
    },
  },
  fashnQuality: {
    heading: 'Calidad de Try-on (avanzado)',
    descPre: 'El try-on de lencería usa ',
    descBold: 'SeedDream',
    descPost:
      ' por default (preserva tu prenda real), con Kolors de backup. Este control SOLO afecta si forzás FASHN manualmente al reintentar un paso — y FASHN bloquea lencería, así que normalmente no lo vas a necesitar.',
    options: {
      performance: { label: 'Rápido', duration: '~5s', hint: 'Menor fidelidad, útil para previews' },
      balanced: { label: 'Balanceado', duration: '~8s', hint: 'Default — equilibrio calidad/velocidad' },
      quality: { label: 'Alta calidad', duration: '~17s', hint: 'Preserva mejor texturas, costuras, broches' },
    },
  },
  summary: {
    heading: 'Resumen',
    images: 'Imágenes',
    activeSteps: 'Pasos activos',
    of: 'de',
    estimatedCost: 'Costo estimado',
    start: 'Iniciar Pipeline',
    startPhotos: (count) => `(${count} fotos)`,
    uploadHint: 'Sube al menos una imagen para continuar',
  },
  upload: {
    dropTitle: 'Arrastra las fotos aquí',
    dropSub: 'O haz clic para seleccionar — múltiples ángulos/colores del mismo producto',
    formats: 'JPG, PNG, WebP — máx. 50MB por foto',
  },
  steps: {
    items: {
      isolate: {
        label: 'Aislar Producto',
        description: 'Quitar la modelo y fondo, dejar solo la prenda flotando estilo ghost 3D',
      },
      model: {
        label: 'Crear Modelo IA',
        description: 'Generar modelo con licencia libre (se reutiliza entre colores de la misma REF)',
      },
      tryon: {
        label: 'Foto Frontal (opcional)',
        description:
          'Vestir la modelo IA con TU prenda, vista frontal 3/4. Si falla, el pipeline sigue con el resto.',
      },
      texturePreserve: {
        label: 'Restaurar Textura',
        description:
          'Inpaint sobre la zona del bra para recuperar la textura real de la prenda (Kolors la deja satinada/plástica). EXPERIMENTAL — desactivado por default mientras lo estabilizamos.',
      },
      photoBack: {
        label: 'Foto Espalda',
        description:
          'Misma modelo de espaldas, mostrando el broche y la banda del bra (mismo seed, misma identidad)',
      },
      photoFullBody: {
        label: 'Foto Cuerpo Completo',
        description:
          'Extiende el resultado del try-on hacia abajo con outpaint — misma cara y mismo bra real, agrega piernas + panty nude. NO regenera la modelo.',
      },
      productVideo: {
        label: 'Video 360° del Producto',
        description: 'Rotación 360° de la prenda aislada, estilo producto rotando (5s, 1:1)',
      },
      modelVideo: {
        label: 'Video de la Modelo',
        description:
          'Modelo vestida con la prenda, movimiento humano fotorealista (5s, 9:16). Provider premium Kling 2.6 Pro — apto para catálogo.',
      },
    },
  },
  stepDocs: {
    isolate: {
      what: 'Quita la modelo y el fondo de tu foto, dejando solo la prenda flotando como si fuera un producto 3D (estilo ghost mannequin).',
      provider: 'grounded_sam + SeedDream edit (o Flux Kontext para no-lencería). Fallback: WithoutBG.',
      duration: '15-45 s',
      costDetail: '$0.01 si el primer proveedor funciona; hasta $0.04 si cae al fallback final.',
      canFail: [
        'El proveedor no identifica la prenda si hay poca iluminación o fondo complejo.',
        'Si cae al último fallback (rembg), puede dejar a la modelo adentro — en ese caso el pipeline se detiene con error claro.',
      ],
      tips: [
        'Reintenta — a veces el primer intento falla por cola saturada.',
        'Si falla siempre, probá con una foto con fondo más limpio.',
        'Podés saltar este paso si ya subiste la prenda flotando (flat lay).',
      ],
    },
    model: {
      what: 'Genera una modelo de IA con licencia libre (el rostro no existe). Se reutiliza en toda la REF para consistencia.',
      provider: 'SeedDream v4.5 (fal.ai) — sin filtro de contenido, diseñado para lencería. Kontext Pro para no-lencería.',
      duration: '20-60 s',
      costDetail: '$0.055 por modelo nueva. $0 si reusás una ya creada desde el picker.',
      canFail: [
        'ByteDance rechaza el prompt por palabras sensibles → reintenta con prompt más seguro automáticamente.',
        'Timeout si la cola está saturada (raro en SeedDream).',
      ],
      tips: [
        'Si el resultado te gusta, aceptá y continuá — esta modelo se guarda y podés reusarla en futuras fotos sin pagar.',
        'Si no te gusta, reintentá — el seed random da variaciones.',
        'Ajustá tono de piel / edad / cuerpo en la configuración antes de correr.',
      ],
    },
    tryon: {
      what: 'Viste la modelo de IA con TU prenda — la prenda real, preservando color y cortes.',
      provider: 'SeedDream v4 edit (fal.ai) para lencería — editor multi-imagen (modelo + prenda) que preserva el producto real. Kolors queda de backup si SeedDream falla. FASHN v1.6 solo para no-íntimos.',
      duration: '10-30 s',
      costDetail: '$0.03 con SeedDream; $0.02 con Kolors (backup); $0.05 con FASHN.',
      canFail: [
        'image_load_error: el archivo intermedio no llegó a fal.ai (suele ser URL temporal caída).',
        "Si el badge dice 'kolors' (ámbar), SeedDream falló para esta prenda y cayó al backup — Kolors reinterpreta y puede inventar.",
        "Tela queda con aspecto satinado/plástico cuando corre Kolors. El paso 'Restaurar Textura' corrige esto.",
      ],
      tips: [
        'Este paso es OPCIONAL — si falla, el pipeline sigue con los demás.',
        "Mirá el BADGE: verde 'seedream' = preservó el producto; ámbar 'kolors' = cayó al backup.",
        'Si querés comparar, forzá un proveedor a mano en el selector de abajo y reintentá.',
        "Dejá 'Restaurar Textura' activado para recuperar la tela real después del tryon.",
      ],
    },
    texturePreserve: {
      what: 'Inpaint dirigido sobre la zona del bra para recuperar la textura real (satinada, encaje, mesh) que Kolors aplana en una superficie plástica genérica.',
      provider: 'grounded_sam (máscara del bra) + flux-fill-pro (Replicate, inpaint con prompt de material). Usa ProductSpec.material extraída por Claude Vision en el análisis previo.',
      duration: '20-50 s',
      costDetail: '$0.05 (≈$0.01 máscara + $0.05 flux-fill-pro).',
      canFail: [
        'Si la máscara del bra no se detecta (poca luz, fondo complejo), el step se salta sin error.',
        'Inpaint puede correr el ajuste del bra al cuerpo en 1-2 píxeles — si pasa, bajar el strength.',
        'flux-fill-pro no acepta imagen de referencia directa — la textura se guía por prompt (ProductSpec.material) y prompt-engineering. Para texturas muy específicas (encaje custom, prints), el resultado es aproximado.',
      ],
      tips: [
        'Si el bra original ya se ve bien en el tryon, podés saltar este paso.',
        "Funciona mejor cuando el productSpec tiene material identificado (ej 'satén elastizado', 'encaje floral').",
        'Si la textura quedó muy distinta, reintentá — flux-fill-pro varía con random seed.',
      ],
    },
    photoBack: {
      what: "Genera una foto de la misma modelo de espaldas, mostrando broche y banda del bra. Si subiste una foto etiquetada como 'espalda', se usa esa directo; si no, la IA la infiere del frente.",
      provider: 'model-create (SeedDream con mismo seed) + Kolors Try-On. Si hay foto de espalda real, la usa como garment reference.',
      duration: '30-90 s',
      costDetail: '$0.075 ($0.055 modelo + $0.02 tryon).',
      canFail: [
        'Sin foto de espalda real, la IA inventa detalles: broche, cruce de tirantes, banda pueden diferir del producto.',
        "Mismo seed del paso 'model' → misma cara, pero ropa y pose son nuevos.",
      ],
      tips: [
        "Para mejor fidelidad, subí una foto de la espalda real del bra y etiquetala como 'Espalda' en el setup — P0-2 la usa automáticamente.",
        'Si el resultado no sirve, saltá este paso — el pipeline sigue con los otros.',
      ],
    },
    photoFullBody: {
      what: 'Extiende el resultado del try-on hacia abajo con outpainting — agrega piernas + panty nude SIN regenerar la modelo. Garantiza misma cara y mismo bra real porque solo agrega canvas, no genera persona nueva.',
      provider: "/api/outpaint (flux-fill-pro con direction:'down', expandRatio:0.65) sobre el resultado del paso tryon (o texturePreserve si corrió).",
      duration: '20-50 s',
      costDetail: '$0.05 — outpaint solo, sin model-create ni tryon adicionales (antes era $0.075 con bugs).',
      canFail: [
        'Si tryon falló, este step no tiene canvas sobre el cual extender — falla con mensaje claro.',
        "El outpaint puede generar piernas anatómicamente raras si la pose original es muy de 3/4 — usar pose 'frontal' en tryon para mejor resultado.",
      ],
      tips: [
        "Corré primero 'Foto Frontal (tryon)' — y opcionalmente 'Restaurar Textura' antes — para que el outpaint extienda sobre la mejor versión.",
        'Si las piernas salen raras, reintentá — flux-fill-pro varía con random seed.',
      ],
    },
    productVideo: {
      what: 'Video 360° de la prenda rotando sobre sí misma, estilo producto 3D de ecommerce.',
      provider: 'wan-2.2-fast (Replicate) — 81 frames mínimo, guidance 3.0.',
      duration: '60-180 s',
      costDetail: '$0.05 por video de 5s.',
      canFail: [
        "REQUIERE que el paso 'Aislar Producto' haya completado — si no, el video rotaría la foto original (modelo + prenda).",
        'Si lo generás sin aislar, no sirve y el paso falla con mensaje claro.',
      ],
      tips: [
        "No desactives 'Aislar Producto' si querés este video.",
        'Si la rotación queda rara, reintentá — el random de wan-2.2 varía el motion.',
      ],
    },
    modelVideo: {
      what: 'Video de la modelo posando con la prenda — movimiento humano natural, apto para catálogo de moda. Usa el resultado del tryon (con textura ya restaurada si texturePreserve corrió); si no hay tryon, la modelo sola.',
      provider: 'Kling 2.6 Pro (fal-ai/kling-video/v2.6/pro/image-to-video) — calidad cinematográfica para humanos. wan-2.2-fast (el provider anterior, $0.05) generaba look de muñeco / piel waxy / identidad cambiando entre frames.',
      duration: '60-180 s',
      costDetail: '$0.35 por video de 5s (kling-2.6 a $0.07/s).',
      canFail: [
        'Si el tryon falló, el video muestra la modelo con base beige en vez de tu bra.',
        'Kling es más lento que wan — esperá hasta 3 min. Si tarda más, abortá y reintentá.',
      ],
      tips: [
        "Corré primero 'Foto Frontal (tryon)' — así el video usa tu prenda real.",
        "Activá 'Restaurar Textura' antes — la corrección de tela fluye al video.",
        'Si querés ahorrar costo, podés desactivar este step (perdés el video, pero las fotos quedan).',
      ],
    },
  },
  stepCard: {
    step: 'Paso',
    infoTitle: 'Ver detalles de este paso',
    infoAria: 'Ver detalles',
    providerBadgeKolors:
      'Cayó a Kolors (backup): SeedDream falló para esta prenda. Kolors tiende a inventar prendas genéricas. Reintentá o subí mejor la prenda aislada.',
    providerBadgeGeneric: (provider) => `Proveedor que generó este resultado: ${provider}.`,
    stop: 'Detener',
    stopTitle: 'Cancelar este paso',
    docsWhat: 'Qué hace',
    docsProvider: 'Proveedor',
    docsDuration: 'Duración típica',
    docsCost: 'Costo',
    docsCanFail: 'Qué puede fallar',
    docsTips: 'Tips',
    methodLabel: 'Método:',
    providerLabel: 'Proveedor:',
    poseLabel: 'Pose:',
    actionLabel: 'Acción:',
    poseDefaultSuffix: (label) => ` (default: ${label})`,
    poseDefaults: {
      photoBack: 'espalda',
      photoFullBody: 'cuerpo completo',
      tryon: 'frontal',
    },
    original: 'Original',
    result: 'Resultado',
    noImage: 'Sin imagen',
    techDetail: 'Ver detalle técnico',
    goUploadBack: 'Ir a subir foto de espalda',
    variantsHint: (count) => `${count} variantes — tocá una para verla grande y elegirla`,
    variantAlt: (index) => `Variante ${index}`,
    variantThumbTitle: (index, selected) =>
      `Tocá para ver variante ${index} en grande${selected ? ' (seleccionada)' : ''}`,
    viewBoth: 'Ver las dos en grande',
    viewBothCompareTitle: 'Ver las dos en grande, con comparador',
    skip: 'Saltar',
    downloadTitle: 'Descargar esta imagen',
    download: 'Descargar',
    rerun: 'Rehacer',
    accept: 'Aceptar y continuar',
    skipStep: 'Saltar este paso',
    retry: 'Reintentar',
    retryWith: (label) => `Reintentar con ${label}`,
  },
  statusBadge: {
    idle: 'Pendiente',
    pending: 'En cola',
    processing: 'En vivo',
    done: 'Listo',
    error: 'Error',
    skipped: 'Saltado',
    accepted: 'Aceptado',
  },
  processingCopy: {
    isolate: { copy: ['Detectando tu prenda…', 'Separándola del cuerpo…', 'Limpiando el fondo…'], eta: '~30s típico' },
    model: { copy: ['Convocando a tu modelo IA…', 'Definiendo pose y luz…', 'Renderizando piel y cabello…'], eta: '~40s típico' },
    tryon: { copy: ['Leyendo tu prenda real…', 'Vistiendo a la modelo…', 'Ajustando tirantes y corte…'], eta: '~25s típico' },
    texturePreserve: { copy: ['Detectando la zona del bra…', 'Leyendo la textura del encaje…', 'Pintando la tela real…'], eta: '~50s típico' },
    photoBack: { copy: ['Buscando la vista de espalda…', 'Componiendo broche y banda…', 'Afinando los detalles…'], eta: '~40s típico' },
    photoFullBody: { copy: ['Extendiendo el lienzo…', 'Agregando piernas y briefs…', 'Manteniendo la misma modelo…'], eta: '~40s típico' },
    modelVideo: { copy: ['Dándole movimiento a la modelo…', 'Cuidando la identidad facial…', 'Renderizando los frames…'], eta: '~2-3 min típico' },
    productVideo: { copy: ['Preparando el giro 360°…', 'Renderizando los frames…', 'Puliendo el video…'], eta: '~1-2 min típico' },
  },
  defaultProcessingCopy: {
    copy: ['Procesando…', 'Trabajando en tu imagen…', 'Casi listo…'],
    eta: '',
  },
  providerLabels: {
    'photoroom-ghost-mannequin': 'Photoroom',
    'grounded-sam-isolate': 'Recorte real',
    'rembg-last-resort': 'Solo quitó el fondo',
    seedream: 'SeedDream',
    leffa: 'Leffa',
    uwear: 'Uwear',
    kolors: 'Kolors',
  },
  poseOptions: {
    auto: 'Automático',
    frontal: 'Frontal',
    'tres-cuartos': '3/4 (diagonal)',
    lateral: 'Lateral (perfil)',
    espalda: 'Espalda',
    'cuerpo-completo': 'Cuerpo completo',
  },
  videoActionOptions: {
    auto: 'Automático',
    'girar-suave': 'Girar suave',
    'caminar-hacia': 'Caminar hacia cámara',
    'posar-quieta': 'Posar quieta',
    'manos-cintura': 'Manos en cintura',
    'girar-completo': 'Giro 360°',
  },
  tryonProviders: {
    auto: {
      label: 'Recomendado (Leffa)',
      hint: 'La opcion segura. Warpea los pixeles REALES de tu prenda en vez de redibujarla: respeta silueta, cierre y paneles. Tarda ~4 min.',
    },
    uwear: {
      label: 'Uwear — rapido',
      hint: 'Plataforma de moda: modelo mas realista y solo ~35 s. Usa SU propio avatar (siempre el mismo), no la modelo IA del paso anterior. ~$0.20.',
    },
    leffa: {
      label: 'Leffa — maxima fidelidad',
      hint: 'Igual que Recomendado, elegido a mano. Viste TU modelo IA, asi que la misma mujer aparece en todos los pasos. ~4 min · $0.04.',
    },
    seedream: {
      label: 'SeedDream — solo para probar rapido',
      hint: '25 s, pero REDIBUJA el producto: cambia el escote y el cierre. Sirve para ver el encuadre rapido, NO para el catalogo. $0.03.',
    },
  },
  isolateMethods: {
    'photoroom-sandbox': {
      label: 'Probar — gratis (con marca de agua)',
      hint: 'Para iterar sin gastar: 1.000 llamadas gratis al mes. Misma calidad que el modo final, pero la imagen sale con marca de agua. Usalo hasta que el recorte te guste.',
    },
    photoroom: {
      label: 'Final — sin marca de agua',
      hint: 'El mismo ghost-mannequin, limpio y listo para el catalogo. Consume tu cuota de Photoroom. Usalo una sola vez, cuando ya te guste el resultado.',
    },
    'grounded-sam': {
      label: 'Respaldo — sin Photoroom',
      hint: 'Recorta los pixeles reales de tu foto, sin depender de Photoroom. $0.01 y sin cuota. Sale mas plano y a veces le come un tirante.',
    },
  },
  fashnModes: {
    performance: { label: 'Rápido' },
    balanced: { label: 'Balanceado' },
    quality: { label: 'Alta calidad' },
  },
  photoAngles: {
    frontal: { label: 'Frontal', hint: 'Vista de frente (default)' },
    espalda: { label: 'Espalda', hint: 'Cuando exista, se usa directo en el paso Foto Espalda' },
    lado: { label: 'Lado', hint: 'Perfil lateral' },
    detalle: { label: 'Detalle', hint: 'Macro de textura, encaje, costura' },
    flat: { label: 'Flat lay', hint: 'Prenda sola, sin modelo' },
    otra: { label: 'Otra', hint: 'No clasificada' },
  },
  spec: {
    analyzing: 'Entendiendo el producto…',
    analyzingSub: 'Claude Vision está leyendo la foto para extraer color, textura y detalles reales.',
    errorTitle: 'No se pudo leer la ficha técnica',
    errorFallback: 'Claude Vision no respondió.',
    errorRest:
      'El pipeline continúa igual que antes — los pasos siguientes van a inferir los detalles del producto.',
    retry: 'Reintentar análisis',
    title: 'Ficha técnica del producto',
    subtitle: 'Leída por Claude Vision — podés editar cualquier campo antes de que corra el resto.',
    notes: 'Notas',
    groups: {
      Identidad: 'Identidad',
      Construcción: 'Construcción',
      Detalles: 'Detalles',
    },
    fields: {
      color: { label: 'Color principal', placeholder: 'ej. negro satinado' },
      material: { label: 'Tela', placeholder: 'ej. satén con elastano' },
      texture: { label: 'Textura', placeholder: 'ej. lisa con brillo suave' },
      type: { label: 'Tipo de prenda', placeholder: 'ej. bra deportivo con broche frontal' },
      cup: { label: 'Copa', placeholder: 'ej. preformada, costura en V' },
      strapStyle: { label: 'Tirantes', placeholder: 'ej. anchos ajustables' },
      frontClosure: { label: 'Broche frontal', placeholder: 'ej. 5 ganchos centrales o sin cierre' },
      backClosure: { label: 'Cierre trasero', placeholder: 'ej. 3 ganchos y gancho' },
      band: { label: 'Banda', placeholder: 'ej. ancha 5cm' },
      padding: { label: 'Padding', placeholder: 'ej. removible / sin padding' },
      underwire: { label: 'Varilla', placeholder: 'ej. sin varilla' },
      details: { label: 'Otros detalles', placeholder: 'ej. encaje, transparencias, bordados' },
    },
  },
  beforeAfter: {
    before: 'Antes',
    after: 'Después',
    compareAria: (label) => `Comparar antes y después de ${label}`,
  },
  thumb: {
    expired: 'La imagen expiró. Refresca la página y reprocesa.',
    waiting: 'Esperando paso anterior',
  },
  lightbox: {
    variantChosen: '✓ Variante elegida',
    compareTitle: 'Comparar con la foto original (C)',
    onlyResult: 'Solo resultado',
    compareWithOriginal: 'Comparar con original',
    downloadTitle: 'Descargar esta imagen',
    download: 'Descargar',
    closeTitle: 'Cerrar (Esc)',
    close: 'Cerrar',
    original: 'Original',
    result: 'Resultado',
    imageAlt: (index) => `Imagen ${index}`,
    prevTitle: 'Anterior (←)',
    nextTitle: 'Siguiente (→)',
    variantChosenBtn: 'Variante ya elegida',
    useVariant: (index) => `Usar variante ${index}`,
  },
  pipeline: {
    config: 'Configuración',
    studioName: 'Lencería',
    studioSuffix: 'Studio',
    refPrefix: 'Ref. ',
    buildTitle: 'Versión del build que está sirviendo Vercel ahora mismo',
    processing: (current, total) => `Procesando ${current} de ${total}…`,
    completed: (done, total) => `✓ ${done} de ${total} completadas`,
    downloadAll: 'Descargar todo',
    spentLabel: 'Gastado:',
    batchDone: (count) => `${count} listo${count > 1 ? 's' : ''}`,
    batchActive: (count) => `${count} procesando`,
    batchErrors: (count) => `${count} error${count > 1 ? 'es' : ''}`,
    batchPending: (count) => `${count} en cola`,
    stopAll: 'Parar todo',
    imagesCount: (count) => `Imágenes (${count})`,
    processingShort: 'Procesando…',
    queued: 'En cola',
    headerDone: (cost) => `Completado · costo: $${cost}`,
    imageProcessed: 'Imagen procesada',
    totalCostLabel: 'Costo total:',
    downloadAllResults: 'Descargar todos',
    nextImage: 'Siguiente imagen',
  },
  help: {
    title: 'Atajos de teclado',
    undo: 'Deshacer (undo)',
    redo: 'Rehacer (redo)',
    redoAlt: 'Rehacer (alternativo)',
    toggleHelp: 'Abrir/cerrar esta ayuda',
    closeModal: 'Cerrar modal / lightbox',
    navVariants: 'Navegar entre variantes (lightbox)',
    compareOriginal: 'Comparar con original (lightbox)',
    footer: 'Los atajos no funcionan cuando estás escribiendo en un campo de texto.',
  },
  messages: {
    stopBatch: 'Procesamiento detenido. Lo que ya completaste se mantiene visible y descargable.',
    stepStopped: (stepId) => `Paso "${stepId}" detenido.`,
    undone: 'Deshecho',
    redone: 'Rehecho',
    modelReused: (ref) => `Modelo IA de REF ${ref} encontrada — se va a reusar (ahorro $0.055).`,
    inventoryNo: (type) =>
      `No hay inventario pre-cargado de ${type}. Subí tus fotos arrastrándolas o tocando el área de upload de arriba.`,
    inventoryScanError: (err) => `No se pudo escanear el inventario: ${err}`,
    inventoryLoading: (total, refs) => `Cargando ${total} fotos de ${refs} REFs…`,
    inventoryNoneLoaded: 'No se pudo cargar ninguna foto del inventario.',
    inventoryLoaded: (count, failed) =>
      `Inventario cargado: ${count} fotos${failed > 0 ? ` (${failed} fallaron)` : ''}.`,
    inventoryError: (err) => `Error cargando inventario: ${err}`,
    resetConfirm:
      '¿Estás segura? Se borran las fotos subidas y los resultados. Los settings se mantienen.',
    sessionReset: 'Sesión reiniciada — podés subir fotos nuevas.',
    modelSelected: (name) => `Modelo "${name}" seleccionada — pipeline la reusa sin cobrar.`,
    modelRenamed: (name) => `Modelo renombrada a "${name}"`,
    noRealPhoto: (stepLabel) => `Sin foto real para ${stepLabel} — usando modo clásico para este paso.`,
    reuploadNeeded: (filename) =>
      `${filename}: tenés que subir la foto de nuevo (esta sesión fue restaurada sin el archivo).`,
    uploadError: (filename, err) => `Error de carga — ${filename}: ${err}`,
    unknownError: 'Error desconocido',
    specReadFailed: (filename) =>
      `No se pudo leer la ficha técnica de ${filename}. Sigo con los pasos normales.`,
    analysisFailed: 'Análisis falló',
    photoBackSkip:
      'No subiste foto del producto desde atrás — no podemos inferirla del frente (Kolors generaría un bra distinto al original). Subí una foto etiquetada "Espalda" en el setup y reintentá.',
    modelVideoSkip:
      'El video de la modelo necesita la Foto Frontal (try-on). Corré ese paso primero — no usamos tu foto original (copyright).',
    texturePreserveSkip: 'Sin resultado del tryon — no hay nada para texturizar.',
    photoFullBodySkip:
      'Foto Cuerpo Completo necesita el resultado del Try-On (Foto Frontal). Activá y corré la Foto Frontal primero.',
    productVideoSkip:
      "El Video 360° necesita la prenda aislada y el paso 'Aislar Producto' no dejó resultado. Reintentá ese paso, o desactivá este video.",
    stoppedByUser: 'Detenido por la usuaria',
    stepFellBack: (stepLabel, filename) =>
      `${stepLabel} falló — usamos tu foto real (${filename}) en su lugar para no perder el paso.`,
    networkError: 'Error de conexión. Revisá tu internet y reintentá.',
    stepError: (stepLabel, msg) => `Error en "${stepLabel}": ${msg}`,
    jobExploded: (filename, msg) => `${filename}: ${msg}`,
    pipelineComplete: (count) => `Pipeline completado — ${count} imagen(es) procesada(s)`,
    noFileToAnalyze: 'No hay archivo cargado para analizar.',
    noResultsYet: 'No hay resultados para descargar todavía.',
    downloadingFiles: (count) => `Descargando ${count} archivos…`,
  },
};

// -----------------------------------------------------------------------------
// English
// -----------------------------------------------------------------------------

export const LINGERIE_PIPELINE_EN: LingeriePipelineCopy = {
  setup: {
    home: 'Home',
    breadcrumb: 'Lingerie',
    badge: 'Bras · Panties · Shapewear · Shaping',
    title: 'Set up your Lingerie Pipeline',
    subtitle:
      'Bras, panties and shapewear. Upload photos of a reference shot on an original model, and the pipeline removes that model, creates a new royalty-free one, and dresses her in the garment. Optionally generate product and model videos.',
    photosHeading: '1 · Product Photos',
    undoTitle: 'Undo (Ctrl+Z)',
    redoTitle: 'Redo (Ctrl+Shift+Z)',
    resetTitle: 'Start over — clears the photos and results (settings are kept)',
    reset: 'Start over',
    loading: 'Loading…',
    loadInventory: (typeLabel) => `Load ${typeLabel} inventory`,
    inventoryTypes: { bra: 'Bras', panty: 'Panties', faja: 'Shapewear', set: 'Sets' },
    inventoryHint:
      'If there is no preloaded folder for this type, upload your photos manually by dragging them above.',
    photosCount: (count) =>
      `${count} photo${count === 1 ? '' : 's'} · the angle is detected from the filename, but you can fix it below each photo`,
    backReady: 'Real back view ready',
    whichPhotos: 'Which photos you need',
    needFrontal: 'Front',
    needFrontalRest: '— required (for try-on and model)',
    needBack: 'Back',
    needBackRest1: '— optional,',
    needBackEmph: 'required if you want the "Back Photo"',
    needBackRest2: '(a single view cannot be rotated 180°)',
    needSide: 'Side / Detail',
    needSideRest: '— optional, they improve fidelity',
    needFlat: 'Flat lay',
    needFlatRest: '— optional, for the 360° product video',
    sizeSuggestionLabel: 'Size suggestion:',
    sizeSuggestionPre: ' most of your photos are a size that suggests a ',
    sizeSuggestionMid: ' model, but you have set ',
    sizeSuggestionPost: '.',
    changeTo: (value) => `Switch to ${value}`,
    productsDetected: (count) => `${count} product${count === 1 ? '' : 's'} detected:`,
    refPrefix: 'REF ',
    colorsCount: (count) => `(${count} color${count === 1 ? '' : 's'})`,
    sharedModelNote:
      'Photos with the same REF share the AI model (you only pay once per REF).',
    angleLabel: 'Angle',
    reuseHeading: 'Reuse an existing AI model (saves $0.055/photo)',
    reuseDesc:
      'Click a model already created in earlier sessions to AVOID paying to generate another one. Or leave it unselected to create a new one.',
    useNewModel: 'Use a new model ($0.055)',
    namePlaceholder: 'Name…',
    renameTitle: "Click to rename this model (e.g. 'Karen', 'Ana')",
    showingModels: (total) => `Showing 18 of ${total} saved models. More in /gallery.`,
    productInfoHeading: '2 · Product Details',
    refNumberLabel: 'Reference number',
    refNumberPlaceholder: 'e.g. 011473',
    productTypeLabel: 'Product type',
    stepsHeading: '3 · Pipeline Steps',
    costOnce: (cost) => `${cost} (1x)`,
    costPerPhoto: (cost) => `${cost}/photo`,
  },
  productType: {
    bra: 'Bra / Top',
    panty: 'Panty / Underwear',
    faja: 'Shaper / Shapewear',
    set: 'Full set',
  },
  modelConfig: {
    heading: 'AI Model Setup',
    reuseNotePre: 'The model is generated ',
    reuseNoteBold: 'just once',
    reuseNotePost: ' and reused for every photo of the product — keeping costs down.',
    skinToneLabel: 'Skin tone',
    skinTones: {
      light: 'Light',
      'medium-light': 'Medium light',
      medium: 'Medium',
      'medium-dark': 'Medium dark',
      dark: 'Dark',
    },
    bodyTypeLabel: 'Body type',
    bodyTypes: {
      slim: 'Slim',
      regular: 'Regular',
      curvy: 'Curvy',
      'plus-size': 'Plus size',
    },
    ageLabel: 'Age range',
    ages: {
      '18-25': '18 – 25 years',
      '26-35': '26 – 35 years',
      '36-45': '36 – 45 years',
    },
  },
  executionMode: {
    heading: 'Run Mode',
    auto: 'Automatic',
    autoSub: 'Everything, no pauses',
    manual: 'Manual',
    manualSub: 'Review each step',
  },
  generationMode: {
    heading: 'Generation Mode',
    subtitle:
      'Choose how the photos are generated. The default is the safest; the other options are alternatives with different trade-offs.',
    comingSoon: 'Coming soon',
    faceSwapWarning:
      '⚠️ Requires that you tag your photos with their angle (Front/Back/Body). The face swap only applies to the real photos you uploaded; views without a real photo fall back to the classic mode automatically.',
    options: {
      default: {
        label: 'AI model + Try-on (classic)',
        desc: 'Generates a new AI model and dresses it in your isolated garment. Legally clean. The garment is reinterpreted a little in each view.',
        cost: '~$0.15 / product',
      },
      'face-swap': {
        label: 'Swap the face on your real photo',
        desc: 'Uses YOUR real photo (front/back) and only swaps the face for an AI model. Product identical to the original. Faster and cheaper.',
        cost: '~$0.01 / product',
      },
      'multi-sample': {
        label: '4 variants — pick the best',
        desc: 'Back Photo and Full Body generate 4 options with different faces/interpretations. You pick the one that best preserves your product. Front still returns 1 result.',
        cost: '~$0.60 / product (4× the view steps)',
      },
    },
  },
  artDirection: {
    heading: 'Art Direction (shoot look)',
    subtitle:
      'The “look” as a reusable preset — it brings consistency to the whole catalog. It applies to the model and the try-on.',
    options: {
      'catalogo-blanco': {
        label: 'White catalog',
        desc: 'Clean e-commerce: white background, even softbox light, true color. Default.',
      },
      'editorial-suave': {
        label: 'Soft editorial',
        desc: 'Same white e-commerce background, but with warm directional light (more stylish).',
      },
      'lifestyle-natural': {
        label: 'Natural light',
        desc: 'Same white e-commerce background, with soft natural light (a fresher look).',
      },
    },
  },
  fashnQuality: {
    heading: 'Try-on Quality (advanced)',
    descPre: 'The lingerie try-on uses ',
    descBold: 'a fidelity-first engine',
    descPost:
      ' by default (it preserves your real garment), with a backup engine. This control ONLY matters if you force the advanced engine manually when retrying a step — and it blocks lingerie, so you normally won\'t need it.',
    options: {
      performance: { label: 'Fast', duration: '~5s', hint: 'Lower fidelity, handy for previews' },
      balanced: { label: 'Balanced', duration: '~8s', hint: 'Default — balance of quality and speed' },
      quality: { label: 'High quality', duration: '~17s', hint: 'Better preserves textures, seams, clasps' },
    },
  },
  summary: {
    heading: 'Summary',
    images: 'Images',
    activeSteps: 'Active steps',
    of: 'of',
    estimatedCost: 'Estimated cost',
    start: 'Start Pipeline',
    startPhotos: (count) => `(${count} photos)`,
    uploadHint: 'Upload at least one image to continue',
  },
  upload: {
    dropTitle: 'Drag your photos here',
    dropSub: 'Or click to select — multiple angles/colors of the same product',
    formats: 'JPG, PNG, WebP — max. 50MB per photo',
  },
  steps: {
    items: {
      isolate: {
        label: 'Isolate Product',
        description: 'Remove the model and background, leaving just the garment floating, 3D ghost style',
      },
      model: {
        label: 'Create AI Model',
        description: 'Generate a royalty-free model (reused across colors of the same REF)',
      },
      tryon: {
        label: 'Front Photo (optional)',
        description:
          'Dress the AI model in YOUR garment, front 3/4 view. If it fails, the pipeline continues with the rest.',
      },
      texturePreserve: {
        label: 'Restore Texture',
        description:
          'Inpaint over the bra area to recover the garment\'s real texture (the try-on can leave it satiny/plastic). EXPERIMENTAL — off by default while we stabilize it.',
      },
      photoBack: {
        label: 'Back Photo',
        description:
          'Same model from behind, showing the clasp and band of the bra (same seed, same identity)',
      },
      photoFullBody: {
        label: 'Full Body Photo',
        description:
          'Extends the try-on result downward with outpaint — same face and same real bra, adds legs + nude panty. Does NOT regenerate the model.',
      },
      productVideo: {
        label: '360° Product Video',
        description: '360° rotation of the isolated garment, spinning-product style (5s, 1:1)',
      },
      modelVideo: {
        label: 'Model Video',
        description:
          'Model wearing the garment, photorealistic human motion (5s, 9:16). Premium provider — catalog-ready.',
      },
    },
  },
  stepDocs: {
    isolate: {
      what: 'Removes the model and background from your photo, leaving just the garment floating as if it were a 3D product (ghost mannequin style).',
      provider: 'grounded_sam + SeedDream edit (or Flux Kontext for non-lingerie). Fallback: WithoutBG.',
      duration: '15-45 s',
      costDetail: '$0.01 if the first provider works; up to $0.04 if it falls to the final fallback.',
      canFail: [
        'The provider fails to identify the garment when there is low light or a busy background.',
        'If it falls to the last fallback (rembg), it may leave the model in — in that case the pipeline stops with a clear error.',
      ],
      tips: [
        'Retry — sometimes the first attempt fails because of a busy queue.',
        'If it always fails, try a photo with a cleaner background.',
        'You can skip this step if you already uploaded the garment floating (flat lay).',
      ],
    },
    model: {
      what: 'Generates a royalty-free AI model (the face does not exist). Reused across the whole REF for consistency.',
      provider: 'SeedDream v4.5 (fal.ai) — no content filter, designed for lingerie. Kontext Pro for non-lingerie.',
      duration: '20-60 s',
      costDetail: '$0.055 per new model. $0 if you reuse one already created from the picker.',
      canFail: [
        'ByteDance rejects the prompt over sensitive words → it retries automatically with a safer prompt.',
        'Timeout if the queue is busy (rare with SeedDream).',
      ],
      tips: [
        'If you like the result, accept and continue — this model is saved and you can reuse it on future photos for free.',
        'If you don\'t like it, retry — the random seed gives variations.',
        'Adjust skin tone / age / body in the settings before running.',
      ],
    },
    tryon: {
      what: 'Dresses the AI model in YOUR garment — the real one, preserving color and cut.',
      provider: 'SeedDream v4 edit (fal.ai) for lingerie — a multi-image editor (model + garment) that preserves the real product. Kolors is the backup if SeedDream fails. FASHN v1.6 only for non-intimate items.',
      duration: '10-30 s',
      costDetail: '$0.03 with SeedDream; $0.02 with Kolors (backup); $0.05 with FASHN.',
      canFail: [
        'image_load_error: the intermediate file did not reach fal.ai (usually an expired temporary URL).',
        "If the badge says 'kolors' (amber), SeedDream failed for this garment and fell to the backup — Kolors reinterprets and may invent details.",
        "The fabric looks satiny/plastic when Kolors runs. The 'Restore Texture' step fixes this.",
      ],
      tips: [
        'This step is OPTIONAL — if it fails, the pipeline continues with the rest.',
        "Watch the BADGE: green 'seedream' = it preserved the product; amber 'kolors' = it fell to the backup.",
        'If you want to compare, force a provider by hand in the selector below and retry.',
        "Leave 'Restore Texture' on to recover the real fabric after the try-on.",
      ],
    },
    texturePreserve: {
      what: 'Targeted inpaint over the bra area to recover the real texture (satin, lace, mesh) that Kolors flattens into a generic plastic surface.',
      provider: 'grounded_sam (bra mask) + flux-fill-pro (Replicate, inpaint with a material prompt). Uses ProductSpec.material extracted by Claude Vision in the earlier analysis.',
      duration: '20-50 s',
      costDetail: '$0.05 (≈$0.01 mask + $0.05 flux-fill-pro).',
      canFail: [
        'If the bra mask is not detected (low light, busy background), the step is skipped without error.',
        'Inpaint may shift the bra fit on the body by 1-2 pixels — if it happens, lower the strength.',
        'flux-fill-pro does not accept a direct reference image — texture is guided by the prompt (ProductSpec.material) and prompt engineering. For very specific textures (custom lace, prints), the result is approximate.',
      ],
      tips: [
        'If the original bra already looks good in the try-on, you can skip this step.',
        "It works best when the productSpec has an identified material (e.g. 'stretch satin', 'floral lace').",
        'If the texture came out very different, retry — flux-fill-pro varies with the random seed.',
      ],
    },
    photoBack: {
      what: "Generates a photo of the same model from behind, showing the clasp and band of the bra. If you uploaded a photo tagged as 'back', it uses that directly; otherwise AI infers it from the front.",
      provider: 'model-create (SeedDream with the same seed) + Kolors Try-On. If there is a real back photo, it uses it as the garment reference.',
      duration: '30-90 s',
      costDetail: '$0.075 ($0.055 model + $0.02 try-on).',
      canFail: [
        'Without a real back photo, AI invents details: clasp, strap crossing and band may differ from the product.',
        "Same seed as the 'model' step → same face, but the clothing and pose are new.",
      ],
      tips: [
        "For better fidelity, upload a photo of the bra’s real back and tag it as 'Back' in the setup — the pipeline uses it automatically.",
        'If the result is no good, skip this step — the pipeline continues with the others.',
      ],
    },
    photoFullBody: {
      what: 'Extends the try-on result downward with outpainting — adds legs + nude panty WITHOUT regenerating the model. It guarantees the same face and the same real bra because it only adds canvas, it does not generate a new person.',
      provider: "/api/outpaint (flux-fill-pro with direction:'down', expandRatio:0.65) over the result of the try-on step (or texturePreserve if it ran).",
      duration: '20-50 s',
      costDetail: '$0.05 — outpaint only, no extra model-create or try-on (it used to be $0.075 with bugs).',
      canFail: [
        'If the try-on failed, this step has no canvas to extend — it fails with a clear message.',
        "The outpaint can produce anatomically odd legs if the original pose is very 3/4 — use the 'front' pose in the try-on for a better result.",
      ],
      tips: [
        "Run 'Front Photo (try-on)' first — and optionally 'Restore Texture' before it — so the outpaint extends over the best version.",
        'If the legs come out odd, retry — flux-fill-pro varies with the random seed.',
      ],
    },
    productVideo: {
      what: '360° video of the garment rotating on itself, e-commerce 3D-product style.',
      provider: 'wan-2.2-fast (Replicate) — 81 frames minimum, guidance 3.0.',
      duration: '60-180 s',
      costDetail: '$0.05 per 5s video.',
      canFail: [
        "REQUIRES the 'Isolate Product' step to have completed — otherwise the video would rotate the original photo (model + garment).",
        'If you generate it without isolating, it is useless and the step fails with a clear message.',
      ],
      tips: [
        "Don't turn off 'Isolate Product' if you want this video.",
        'If the rotation comes out odd, retry — the wan-2.2 randomness varies the motion.',
      ],
    },
    modelVideo: {
      what: 'Video of the model posing with the garment — natural human motion, ready for a fashion catalog. It uses the try-on result (with texture already restored if texturePreserve ran); if there is no try-on, the model alone.',
      provider: 'Kling 2.6 Pro (fal-ai/kling-video/v2.6/pro/image-to-video) — cinematic quality for humans. wan-2.2-fast (the previous provider, $0.05) produced a doll-like look / waxy skin / identity changing between frames.',
      duration: '60-180 s',
      costDetail: '$0.35 per 5s video (kling-2.6 at $0.07/s).',
      canFail: [
        'If the try-on failed, the video shows the model with a beige base instead of your bra.',
        'Kling is slower than wan — wait up to 3 min. If it takes longer, abort and retry.',
      ],
      tips: [
        "Run 'Front Photo (try-on)' first — so the video uses your real garment.",
        "Turn on 'Restore Texture' beforehand — the fabric fix flows into the video.",
        'If you want to save cost, you can turn off this step (you lose the video, but the photos remain).',
      ],
    },
  },
  stepCard: {
    step: 'Step',
    infoTitle: 'See details for this step',
    infoAria: 'See details',
    providerBadgeKolors:
      'Fell to Kolors (backup): SeedDream failed for this garment. Kolors tends to invent generic garments. Retry or upload a better isolated garment.',
    providerBadgeGeneric: (provider) => `Provider that generated this result: ${provider}.`,
    stop: 'Stop',
    stopTitle: 'Cancel this step',
    docsWhat: 'What it does',
    docsProvider: 'Provider',
    docsDuration: 'Typical duration',
    docsCost: 'Cost',
    docsCanFail: 'What can fail',
    docsTips: 'Tips',
    methodLabel: 'Method:',
    providerLabel: 'Provider:',
    poseLabel: 'Pose:',
    actionLabel: 'Action:',
    poseDefaultSuffix: (label) => ` (default: ${label})`,
    poseDefaults: {
      photoBack: 'back',
      photoFullBody: 'full body',
      tryon: 'front',
    },
    original: 'Original',
    result: 'Result',
    noImage: 'No image',
    techDetail: 'See technical detail',
    goUploadBack: 'Go upload a back photo',
    variantsHint: (count) => `${count} variants — tap one to see it large and pick it`,
    variantAlt: (index) => `Variant ${index}`,
    variantThumbTitle: (index, selected) =>
      `Tap to see variant ${index} large${selected ? ' (selected)' : ''}`,
    viewBoth: 'View both large',
    viewBothCompareTitle: 'View both large, with the comparer',
    skip: 'Skip',
    downloadTitle: 'Download this image',
    download: 'Download',
    rerun: 'Redo',
    accept: 'Accept and continue',
    skipStep: 'Skip this step',
    retry: 'Retry',
    retryWith: (label) => `Retry with ${label}`,
  },
  statusBadge: {
    idle: 'Pending',
    pending: 'Queued',
    processing: 'Live',
    done: 'Done',
    error: 'Error',
    skipped: 'Skipped',
    accepted: 'Accepted',
  },
  processingCopy: {
    isolate: { copy: ['Detecting your garment…', 'Separating it from the body…', 'Cleaning up the background…'], eta: '~30s typical' },
    model: { copy: ['Summoning your AI model…', 'Setting pose and light…', 'Rendering skin and hair…'], eta: '~40s typical' },
    tryon: { copy: ['Reading your real garment…', 'Dressing the model…', 'Adjusting straps and cut…'], eta: '~25s typical' },
    texturePreserve: { copy: ['Detecting the bra area…', 'Reading the lace texture…', 'Painting the real fabric…'], eta: '~50s typical' },
    photoBack: { copy: ['Finding the back view…', 'Composing clasp and band…', 'Fine-tuning the details…'], eta: '~40s typical' },
    photoFullBody: { copy: ['Extending the canvas…', 'Adding legs and briefs…', 'Keeping the same model…'], eta: '~40s typical' },
    modelVideo: { copy: ['Bringing the model to life…', 'Protecting the facial identity…', 'Rendering the frames…'], eta: '~2-3 min typical' },
    productVideo: { copy: ['Preparing the 360° spin…', 'Rendering the frames…', 'Polishing the video…'], eta: '~1-2 min typical' },
  },
  defaultProcessingCopy: {
    copy: ['Processing…', 'Working on your image…', 'Almost there…'],
    eta: '',
  },
  providerLabels: {
    'photoroom-ghost-mannequin': 'Photoroom',
    'grounded-sam-isolate': 'Real cutout',
    'rembg-last-resort': 'Only removed the background',
    seedream: 'SeedDream',
    leffa: 'Leffa',
    uwear: 'Uwear',
    kolors: 'Kolors',
  },
  poseOptions: {
    auto: 'Automatic',
    frontal: 'Front',
    'tres-cuartos': '3/4 (diagonal)',
    lateral: 'Side (profile)',
    espalda: 'Back',
    'cuerpo-completo': 'Full body',
  },
  videoActionOptions: {
    auto: 'Automatic',
    'girar-suave': 'Gentle turn',
    'caminar-hacia': 'Walk toward camera',
    'posar-quieta': 'Hold still',
    'manos-cintura': 'Hands on waist',
    'girar-completo': '360° spin',
  },
  tryonProviders: {
    auto: {
      label: 'Recommended (Leffa)',
      hint: 'The safe option. It warps the REAL pixels of your garment instead of redrawing it: it respects the silhouette, closure and panels. Takes ~4 min.',
    },
    uwear: {
      label: 'Uwear — fast',
      hint: 'Fashion platform: a more realistic model and only ~35 s. Uses ITS own avatar (always the same one), not the AI model from the previous step. ~$0.20.',
    },
    leffa: {
      label: 'Leffa — maximum fidelity',
      hint: 'Same as Recommended, picked by hand. It dresses YOUR AI model, so the same woman appears in every step. ~4 min · $0.04.',
    },
    seedream: {
      label: 'SeedDream — just for a quick test',
      hint: '25 s, but it REDRAWS the product: it changes the neckline and the closure. Good for a quick framing check, NOT for the catalog. $0.03.',
    },
  },
  isolateMethods: {
    'photoroom-sandbox': {
      label: 'Test — free (with watermark)',
      hint: 'To iterate without spending: 1,000 free calls per month. Same quality as the final mode, but the image comes out with a watermark. Use it until you are happy with the cutout.',
    },
    photoroom: {
      label: 'Final — no watermark',
      hint: 'The same ghost-mannequin, clean and catalog-ready. It uses your Photoroom quota. Use it just once, when you already like the result.',
    },
    'grounded-sam': {
      label: 'Backup — without Photoroom',
      hint: 'Cuts out the real pixels from your photo, without relying on Photoroom. $0.01 and no quota. It comes out flatter and sometimes eats a strap.',
    },
  },
  fashnModes: {
    performance: { label: 'Fast' },
    balanced: { label: 'Balanced' },
    quality: { label: 'High quality' },
  },
  photoAngles: {
    frontal: { label: 'Front', hint: 'Front view (default)' },
    espalda: { label: 'Back', hint: 'When available, it is used directly in the Back Photo step' },
    lado: { label: 'Side', hint: 'Side profile' },
    detalle: { label: 'Detail', hint: 'Texture, lace, seam macro' },
    flat: { label: 'Flat lay', hint: 'Garment alone, no model' },
    otra: { label: 'Other', hint: 'Unclassified' },
  },
  spec: {
    analyzing: 'Understanding the product…',
    analyzingSub: 'AI is reading the photo to extract real color, texture and details.',
    errorTitle: 'The product spec could not be read',
    errorFallback: 'AI did not respond.',
    errorRest:
      'The pipeline continues just as before — the next steps will infer the product details.',
    retry: 'Retry analysis',
    title: 'Product spec',
    subtitle: 'Read by AI — you can edit any field before the rest runs.',
    notes: 'Notes',
    groups: {
      Identidad: 'Identity',
      Construcción: 'Construction',
      Detalles: 'Details',
    },
    fields: {
      color: { label: 'Main color', placeholder: 'e.g. satin black' },
      material: { label: 'Fabric', placeholder: 'e.g. satin with elastane' },
      texture: { label: 'Texture', placeholder: 'e.g. smooth with a soft sheen' },
      type: { label: 'Garment type', placeholder: 'e.g. sports bra with front clasp' },
      cup: { label: 'Cup', placeholder: 'e.g. molded, V-seam' },
      strapStyle: { label: 'Straps', placeholder: 'e.g. wide adjustable' },
      frontClosure: { label: 'Front clasp', placeholder: 'e.g. 5 center hooks or no closure' },
      backClosure: { label: 'Back closure', placeholder: 'e.g. 3 hooks and eye' },
      band: { label: 'Band', placeholder: 'e.g. wide 5cm' },
      padding: { label: 'Padding', placeholder: 'e.g. removable / no padding' },
      underwire: { label: 'Underwire', placeholder: 'e.g. no underwire' },
      details: { label: 'Other details', placeholder: 'e.g. lace, sheer panels, embroidery' },
    },
  },
  beforeAfter: {
    before: 'Before',
    after: 'After',
    compareAria: (label) => `Compare before and after of ${label}`,
  },
  thumb: {
    expired: 'The image expired. Refresh the page and reprocess.',
    waiting: 'Waiting for the previous step',
  },
  lightbox: {
    variantChosen: '✓ Variant chosen',
    compareTitle: 'Compare with the original photo (C)',
    onlyResult: 'Result only',
    compareWithOriginal: 'Compare with original',
    downloadTitle: 'Download this image',
    download: 'Download',
    closeTitle: 'Close (Esc)',
    close: 'Close',
    original: 'Original',
    result: 'Result',
    imageAlt: (index) => `Image ${index}`,
    prevTitle: 'Previous (←)',
    nextTitle: 'Next (→)',
    variantChosenBtn: 'Variant already chosen',
    useVariant: (index) => `Use variant ${index}`,
  },
  pipeline: {
    config: 'Setup',
    studioName: 'Lingerie',
    studioSuffix: 'Studio',
    refPrefix: 'Ref. ',
    buildTitle: 'Version of the build Vercel is serving right now',
    processing: (current, total) => `Processing ${current} of ${total}…`,
    completed: (done, total) => `✓ ${done} of ${total} done`,
    downloadAll: 'Download all',
    spentLabel: 'Spent:',
    batchDone: (count) => `${count} done`,
    batchActive: (count) => `${count} processing`,
    batchErrors: (count) => `${count} error${count > 1 ? 's' : ''}`,
    batchPending: (count) => `${count} queued`,
    stopAll: 'Stop everything',
    imagesCount: (count) => `Images (${count})`,
    processingShort: 'Processing…',
    queued: 'Queued',
    headerDone: (cost) => `Done · cost: $${cost}`,
    imageProcessed: 'Image processed',
    totalCostLabel: 'Total cost:',
    downloadAllResults: 'Download all',
    nextImage: 'Next image',
  },
  help: {
    title: 'Keyboard shortcuts',
    undo: 'Undo',
    redo: 'Redo',
    redoAlt: 'Redo (alternate)',
    toggleHelp: 'Open/close this help',
    closeModal: 'Close modal / lightbox',
    navVariants: 'Navigate between variants (lightbox)',
    compareOriginal: 'Compare with original (lightbox)',
    footer: 'Shortcuts do not work while you are typing in a text field.',
  },
  messages: {
    stopBatch: 'Processing stopped. What you already completed stays visible and downloadable.',
    stepStopped: (stepId) => `Step "${stepId}" stopped.`,
    undone: 'Undone',
    redone: 'Redone',
    modelReused: (ref) => `AI model for REF ${ref} found — it will be reused (saves $0.055).`,
    inventoryNo: (type) =>
      `There is no preloaded ${type} inventory. Upload your photos by dragging them or tapping the upload area above.`,
    inventoryScanError: (err) => `The inventory could not be scanned: ${err}`,
    inventoryLoading: (total, refs) => `Loading ${total} photos from ${refs} REFs…`,
    inventoryNoneLoaded: 'No inventory photo could be loaded.',
    inventoryLoaded: (count, failed) =>
      `Inventory loaded: ${count} photos${failed > 0 ? ` (${failed} failed)` : ''}.`,
    inventoryError: (err) => `Error loading inventory: ${err}`,
    resetConfirm:
      'Are you sure? The uploaded photos and results will be deleted. Your settings are kept.',
    sessionReset: 'Session reset — you can upload new photos.',
    modelSelected: (name) => `Model "${name}" selected — the pipeline reuses it at no charge.`,
    modelRenamed: (name) => `Model renamed to "${name}"`,
    noRealPhoto: (stepLabel) => `No real photo for ${stepLabel} — using classic mode for this step.`,
    reuploadNeeded: (filename) =>
      `${filename}: you need to upload the photo again (this session was restored without the file).`,
    uploadError: (filename, err) => `Upload error — ${filename}: ${err}`,
    unknownError: 'Unknown error',
    specReadFailed: (filename) =>
      `The product spec for ${filename} could not be read. Continuing with the normal steps.`,
    analysisFailed: 'Analysis failed',
    photoBackSkip:
      'You did not upload a photo of the product from behind — we cannot infer it from the front (it would generate a bra different from the original). Upload a photo tagged "Back" in the setup and retry.',
    modelVideoSkip:
      'The model video needs the Front Photo (try-on). Run that step first — we do not use your original photo (copyright).',
    texturePreserveSkip: 'No try-on result — there is nothing to texture.',
    photoFullBodySkip:
      'Full Body Photo needs the Try-On result (Front Photo). Turn on and run the Front Photo first.',
    productVideoSkip:
      "The 360° Video needs the isolated garment and the 'Isolate Product' step left no result. Retry that step, or turn off this video.",
    stoppedByUser: 'Stopped by the user',
    stepFellBack: (stepLabel, filename) =>
      `${stepLabel} failed — we used your real photo (${filename}) instead so the step is not lost.`,
    networkError: 'Connection error. Check your internet and retry.',
    stepError: (stepLabel, msg) => `Error in "${stepLabel}": ${msg}`,
    jobExploded: (filename, msg) => `${filename}: ${msg}`,
    pipelineComplete: (count) => `Pipeline complete — ${count} image(s) processed`,
    noFileToAnalyze: 'There is no file loaded to analyze.',
    noResultsYet: 'There are no results to download yet.',
    downloadingFiles: (count) => `Downloading ${count} files…`,
  },
};
