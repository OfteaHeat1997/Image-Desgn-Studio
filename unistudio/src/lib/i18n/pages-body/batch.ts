// =============================================================================
// batch.ts — Copia i18n del CUERPO de la página /batch (Procesamiento Masivo)
// =============================================================================
// Decoupled body copy for the batch page. The page header stays wired to
// `t.pages.batch.*`; everything else in the visible body reads from here.
//
//   const b = locale === 'en' ? BATCH_BODY_EN : BATCH_BODY_ES;
//   <h2>{b.upload.title}</h2>
//
// ES values are byte-for-byte the original Spanish; EN is natural professional
// English. Interpolated strings are functions that keep the dynamic value and
// plural agreement.
// =============================================================================

export interface BatchBodyCopy {
  /** Barra de navegación superior. */
  nav: {
    home: string;
    title: string;
  };
  /** Botones de acción del encabezado de la página. */
  actions: {
    stop: string;
    stopping: string;
    startBatch: string;
  };
  /** Modo automático (AI Agent sobre el inventario). */
  auto: {
    title: string;
    subtitle: string;
    totalImages: (n: number) => string;
    scanning: string;
    scanErrorTitle: string;
    retry: string;
    noFolders: string;
    imagesCount: (n: number) => string;
    processedOf: (done: number, total: number) => string;
    clickToProcess: string;
    processingCategory: (name: string) => string;
    autoProgress: (done: number, total: number) => string;
  };
  /** Zona de subida de imágenes. */
  upload: {
    title: string;
    autoDownload: string;
    recommended: string;
    dropLabel: string;
    dropHint: string;
    uploadedCount: (n: number) => string;
  };
  /** Panel de progreso en vivo. */
  progress: {
    processing: string;
    processedCount: (done: number, total: number) => string;
    errorSuffix: (n: number) => string;
    starting: string;
    uploadingImage: string;
  };
  /** ETA (tiempo restante estimado). */
  eta: (seconds: number) => string;
  /** Panel de errores / cancelados. */
  errors: {
    errorsTitle: string;
    cancelledTitle: string;
    retryFailed: string;
    cancelled: string;
  };
  /** Resultados recuperados de una sesión anterior. */
  recovered: {
    title: (n: number) => string;
    subtitle: string;
    packaging: (done: number, total: number) => string;
    downloadZip: (n: number) => string;
    clear: string;
    clearTitle: string;
    showingRecent: (total: number) => string;
  };
  /** Panel de resultados. */
  results: {
    title: string;
    count: (n: number) => string;
    downloadedInfo: (downloaded: number, done: number) => string;
    packaging: (done: number, total: number) => string;
    download: string;
    downloadZip: (n: number) => string;
    before: string;
    after: string;
    downloaded: string;
    originalAlt: string;
    resultAlt: string;
  };
  /** Constructor de pipeline (presets + pasos). */
  pipeline: {
    presetsTitle: string;
    stepsTitle: string;
    addStep: string;
    noSteps: string;
    lingerieWarning: string;
    stepsCount: (n: number) => string;
    estCost: string;
    forImages: (n: number) => string;
  };
  /** Notificaciones (toasts). */
  toast: {
    presetLoaded: (name: string, steps: number) => string;
    zipCreatedWithFailures: (added: number, failed: number) => string;
    zipReady: (added: number) => string;
    zipError: string;
    zipFailed: (msg: string) => string;
    categoryNoPipeline: (name: string) => string;
    stopping: string;
    batchStopped: (processed: number, total: number) => string;
    batchDone: (processed: number, total: number, errs: number) => string;
    recoveredZipWithFailures: (added: number, failed: number) => string;
    recoveredZipReady: (added: number) => string;
  };
  /** Errores del escaneo de inventario (mensajes de estado). */
  scanError: {
    scanFailed: string;
    unknown: string;
    timeout: string;
    generic: (msg: string) => string;
  };
  /** Aviso al intentar salir con un batch en progreso. */
  leaveWarning: string;
  /** Metadatos de operaciones (etiqueta + descripción) por valor de operación. */
  operations: Record<string, { label: string; description: string }>;
  /** Etiquetas de proveedores por valor de proveedor. */
  providers: Record<string, string>;
  /** Metadatos de presets (nombre + descripción) por id de preset. */
  presets: Record<string, { name: string; description: string }>;
}

/* ------------------------------------------------------------------ */
/*  Español (original — byte por byte)                                  */
/* ------------------------------------------------------------------ */

export const BATCH_BODY_ES: BatchBodyCopy = {
  nav: {
    home: "Inicio",
    title: "Procesamiento Masivo",
  },
  actions: {
    stop: "Detener",
    stopping: "Deteniendo...",
    startBatch: "Iniciar Lote",
  },
  auto: {
    title: "AI Agent — Modo Automatico",
    subtitle:
      "Selecciona una categoria y el agente carga las imagenes, elige el pipeline, y procesa todo automaticamente.",
    totalImages: (n) => `${n} imagenes totales`,
    scanning: "Escaneando inventario...",
    scanErrorTitle: "Error al escanear",
    retry: "Reintentar",
    noFolders:
      "No se encontraron carpetas de inventario. Verifica que las imagenes estan en el escritorio.",
    imagesCount: (n) => `${n} imagenes`,
    processedOf: (done, total) => `${done} / ${total} procesadas...`,
    clickToProcess: "Click para procesar todo",
    processingCategory: (name) => `Procesando ${name}...`,
    autoProgress: (done, total) =>
      `${done} de ${total} imagenes — los resultados aparecen abajo`,
  },
  upload: {
    title: "Subir Imagenes",
    autoDownload: "Auto-descarga",
    recommended: "(recomendado)",
    dropLabel: "Arrastra y suelta imagenes de producto aqui",
    dropHint: "PNG, JPG, WebP — hasta 100 imagenes",
    uploadedCount: (n) =>
      `${n} imagen${n !== 1 ? "es" : ""} subida${n !== 1 ? "s" : ""}`,
  },
  progress: {
    processing: "Procesando...",
    processedCount: (done, total) => `${done} / ${total} procesadas`,
    errorSuffix: (n) => ` · ${n} error${n !== 1 ? "es" : ""}`,
    starting: "Iniciando...",
    uploadingImage: "Subiendo imagen...",
  },
  eta: (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "calculando...";
    if (seconds < 60) return `~${Math.round(seconds)}s restantes`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s === 0 ? `~${m} min restantes` : `~${m} min ${s}s restantes`;
  },
  errors: {
    errorsTitle: "Errores",
    cancelledTitle: "Cancelados",
    retryFailed: "Reintentar fallidos",
    cancelled: "Cancelada",
  },
  recovered: {
    title: (n) => `Resultados recuperados (${n})`,
    subtitle: "Procesadas en una sesión anterior — los URLs siguen vivos.",
    packaging: (done, total) => `Empaquetando ${done}/${total}...`,
    downloadZip: (n) => `Descargar ZIP (${n})`,
    clear: "Limpiar",
    clearTitle: "Limpiar la lista (no borra los archivos descargados)",
    showingRecent: (total) => `Mostrando las 24 más recientes de ${total}.`,
  },
  results: {
    title: "Resultados",
    count: (n) => `(${n})`,
    downloadedInfo: (downloaded, done) =>
      `${downloaded}/${done} descargadas · localStorage SAFE — refresh OK`,
    packaging: (done, total) => `Empaquetando ${done}/${total}...`,
    download: "Descargar",
    downloadZip: (n) => `Descargar ZIP (${n})`,
    before: "Antes",
    after: "Despues",
    downloaded: "DESCARGADA",
    originalAlt: "Original",
    resultAlt: "Resultado",
  },
  pipeline: {
    presetsTitle: "Presets de Pipeline",
    stepsTitle: "Pasos del Pipeline",
    addStep: "Agregar Paso",
    noSteps: "Sin pasos. Agrega un paso o carga un preset.",
    lingerieWarning:
      '💡 Si tus fotos tienen una modelo usando la ropa, usa "Prueba Virtual" en vez de "Quitar Fondo". El módulo de quitar fondo no puede separar la prenda del cuerpo.',
    stepsCount: (n) => `${n} paso${n !== 1 ? "s" : ""}`,
    estCost: "Est. costo:",
    forImages: (n) => `para ${n} imagen${n !== 1 ? "es" : ""}`,
  },
  toast: {
    presetLoaded: (name, steps) => `Pipeline "${name}" cargado — ${steps} pasos`,
    zipCreatedWithFailures: (added, failed) =>
      `ZIP creado con ${added} imágenes — ${failed} fallaron al descargar.`,
    zipReady: (added) => `ZIP listo (${added} imágenes).`,
    zipError: "Error generando ZIP",
    zipFailed: (msg) => `No pude crear el ZIP: ${msg}`,
    categoryNoPipeline: (name) =>
      `La categoría "${name}" no tiene pipeline configurado — revisá inventory/scan.`,
    stopping: "Deteniendo batch... la imagen actual se cancelará.",
    batchStopped: (processed, total) =>
      `Batch detenido — ${processed}/${total} procesadas.`,
    batchDone: (processed, total, errs) =>
      `Batch terminado — ${processed}/${total} procesadas${errs ? `, ${errs} con error` : ""}.`,
    recoveredZipWithFailures: (added, failed) =>
      `ZIP creado con ${added} imágenes — ${failed} URLs ya no responden (pueden haber expirado).`,
    recoveredZipReady: (added) => `ZIP listo (${added} imágenes recuperadas).`,
  },
  scanError: {
    scanFailed: "El scan del inventario falló.",
    unknown: "Error desconocido",
    timeout: "El scan tardó demasiado. Revisá la conexión y recargá.",
    generic: (msg) => `No se pudo escanear el inventario (${msg}).`,
  },
  leaveWarning:
    "Hay un batch en progreso. Si salís perdés las imágenes en cola.",
  operations: {
    "bg-remove": { label: "Quitar Fondo", description: "Elimina el fondo de tu producto" },
    enhance: { label: "Mejorar Calidad", description: "Ajusta brillo, color, nitidez — Gratis" },
    shadows: { label: "Agregar Sombras", description: "Agrega sombras profesionales" },
    upscale: { label: "Upscale 2x", description: "Duplica el tamaño sin perder calidad" },
    resize: { label: "Redimensionar", description: "Cambia el tamaño para diferentes plataformas" },
    outpaint: { label: "Extender Imagen", description: "Adapta a formato Instagram, TikTok, etc." },
    compliance: { label: "Verificar Cumplimiento", description: "Verifica que tu imagen cumple con las plataformas" },
    watermark: { label: "Marca de Agua", description: "Agrega tu logo o marca" },
    "bg-generate": { label: "Fondos con IA", description: "Reemplaza el fondo con escenas profesionales — $0.003-0.05/foto" },
    "model-create": { label: "Crear Modelo IA", description: "Genera una modelo virtual — $0.055/foto" },
    tryon: { label: "Prueba Virtual (Try-On)", description: "Pone tu prenda en la modelo — $0.02/foto" },
    video: { label: "Generar Video", description: "Crea video del producto girando — $0.05/foto" },
    "jewelry-tryon": { label: "Joyería Virtual", description: "Prueba virtual de joyas — $0.02/foto" },
  },
  providers: {
    auto: "Auto (Recomendado)",
    replicate: "Replicate",
    fal: "Fal.ai",
    browser: "Navegador (Gratis)",
  },
  presets: {
    "ecommerce-pro": {
      name: "E-Commerce Profesional",
      description: "Fondo blanco + mejorar + sombra + cuadrado 1:1 — listo para tu tienda",
    },
    "quick-clean": {
      name: "Limpieza Rápida",
      description: "Quita el fondo y mejora la calidad automáticamente",
    },
    "whatsapp-catalog": {
      name: "Catálogo WhatsApp",
      description: "Formato cuadrado optimizado para catálogo de WhatsApp Business",
    },
    "social-full": {
      name: "Redes Sociales Completo",
      description: "Fondo bonito + mejora + video — listo para Instagram y TikTok",
    },
    "instagram-lifestyle": {
      name: "Instagram Lifestyle",
      description: "Fondo IA lifestyle + mejora + redimensionar para Instagram",
    },
    "full-production": {
      name: "Producción Completa",
      description: "Pipeline completo: fondo + mejora + sombras + upscale + marca",
    },
  },
};

/* ------------------------------------------------------------------ */
/*  English (natural, professional)                                     */
/* ------------------------------------------------------------------ */

export const BATCH_BODY_EN: BatchBodyCopy = {
  nav: {
    home: "Home",
    title: "Batch Processing",
  },
  actions: {
    stop: "Stop",
    stopping: "Stopping...",
    startBatch: "Start Batch",
  },
  auto: {
    title: "AI Agent — Automatic Mode",
    subtitle:
      "Pick a category and the agent loads the images, chooses the pipeline, and processes everything automatically.",
    totalImages: (n) => `${n} images total`,
    scanning: "Scanning inventory...",
    scanErrorTitle: "Scan failed",
    retry: "Retry",
    noFolders:
      "No inventory folders found. Make sure the images are on the desktop.",
    imagesCount: (n) => `${n} images`,
    processedOf: (done, total) => `${done} / ${total} processed...`,
    clickToProcess: "Click to process all",
    processingCategory: (name) => `Processing ${name}...`,
    autoProgress: (done, total) =>
      `${done} of ${total} images — results appear below`,
  },
  upload: {
    title: "Upload Images",
    autoDownload: "Auto-download",
    recommended: "(recommended)",
    dropLabel: "Drag and drop your product images here",
    dropHint: "PNG, JPG, WebP — up to 100 images",
    uploadedCount: (n) => `${n} image${n !== 1 ? "s" : ""} uploaded`,
  },
  progress: {
    processing: "Processing...",
    processedCount: (done, total) => `${done} / ${total} processed`,
    errorSuffix: (n) => ` · ${n} error${n !== 1 ? "s" : ""}`,
    starting: "Starting...",
    uploadingImage: "Uploading image...",
  },
  eta: (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "calculating...";
    if (seconds < 60) return `~${Math.round(seconds)}s left`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s === 0 ? `~${m} min left` : `~${m} min ${s}s left`;
  },
  errors: {
    errorsTitle: "Errors",
    cancelledTitle: "Cancelled",
    retryFailed: "Retry failed",
    cancelled: "Cancelled",
  },
  recovered: {
    title: (n) => `Recovered results (${n})`,
    subtitle: "Processed in a previous session — the URLs are still live.",
    packaging: (done, total) => `Packaging ${done}/${total}...`,
    downloadZip: (n) => `Download ZIP (${n})`,
    clear: "Clear",
    clearTitle: "Clear the list (does not delete the downloaded files)",
    showingRecent: (total) => `Showing the 24 most recent of ${total}.`,
  },
  results: {
    title: "Results",
    count: (n) => `(${n})`,
    downloadedInfo: (downloaded, done) =>
      `${downloaded}/${done} downloaded · localStorage SAFE — refresh OK`,
    packaging: (done, total) => `Packaging ${done}/${total}...`,
    download: "Download",
    downloadZip: (n) => `Download ZIP (${n})`,
    before: "Before",
    after: "After",
    downloaded: "DOWNLOADED",
    originalAlt: "Original",
    resultAlt: "Result",
  },
  pipeline: {
    presetsTitle: "Pipeline Presets",
    stepsTitle: "Pipeline Steps",
    addStep: "Add Step",
    noSteps: "No steps yet. Add a step or load a preset.",
    lingerieWarning:
      '💡 If your photos show a model wearing the garment, use "Virtual Try-On" instead of "Remove Background". The background removal module can\'t separate the garment from the body.',
    stepsCount: (n) => `${n} step${n !== 1 ? "s" : ""}`,
    estCost: "Est. cost:",
    forImages: (n) => `for ${n} image${n !== 1 ? "s" : ""}`,
  },
  toast: {
    presetLoaded: (name, steps) =>
      `Pipeline "${name}" loaded — ${steps} step${steps !== 1 ? "s" : ""}`,
    zipCreatedWithFailures: (added, failed) =>
      `ZIP created with ${added} images — ${failed} failed to download.`,
    zipReady: (added) => `ZIP ready (${added} images).`,
    zipError: "Error generating ZIP",
    zipFailed: (msg) => `Couldn't create the ZIP: ${msg}`,
    categoryNoPipeline: (name) =>
      `The "${name}" category has no pipeline configured — check inventory/scan.`,
    stopping: "Stopping batch... the current image will be cancelled.",
    batchStopped: (processed, total) =>
      `Batch stopped — ${processed}/${total} processed.`,
    batchDone: (processed, total, errs) =>
      `Batch finished — ${processed}/${total} processed${errs ? `, ${errs} with errors` : ""}.`,
    recoveredZipWithFailures: (added, failed) =>
      `ZIP created with ${added} images — ${failed} URLs no longer respond (they may have expired).`,
    recoveredZipReady: (added) => `ZIP ready (${added} recovered images).`,
  },
  scanError: {
    scanFailed: "The inventory scan failed.",
    unknown: "Unknown error",
    timeout: "The scan took too long. Check your connection and reload.",
    generic: (msg) => `Couldn't scan the inventory (${msg}).`,
  },
  leaveWarning:
    "A batch is in progress. If you leave, you'll lose the queued images.",
  operations: {
    "bg-remove": { label: "Remove Background", description: "Removes the background from your product" },
    enhance: { label: "Enhance Quality", description: "Adjust brightness, color, sharpness — Free" },
    shadows: { label: "Add Shadows", description: "Adds professional shadows" },
    upscale: { label: "Upscale 2x", description: "Doubles the size without losing quality" },
    resize: { label: "Resize", description: "Change the size for different platforms" },
    outpaint: { label: "Extend Image", description: "Adapt to Instagram, TikTok, and other formats" },
    compliance: { label: "Check Compliance", description: "Verifies your image meets platform requirements" },
    watermark: { label: "Watermark", description: "Add your logo or brand" },
    "bg-generate": { label: "AI Backgrounds", description: "Replaces the background with professional scenes — $0.003-0.05/photo" },
    "model-create": { label: "Create AI Model", description: "Generates a virtual model — $0.055/photo" },
    tryon: { label: "Virtual Try-On", description: "Puts your garment on the model — $0.02/photo" },
    video: { label: "Generate Video", description: "Creates a video of the product rotating — $0.05/photo" },
    "jewelry-tryon": { label: "Virtual Jewelry", description: "Virtual try-on for jewelry — $0.02/photo" },
  },
  providers: {
    auto: "Auto (Recommended)",
    replicate: "Replicate",
    fal: "Fal.ai",
    browser: "Browser (Free)",
  },
  presets: {
    "ecommerce-pro": {
      name: "Professional E-Commerce",
      description: "White background + enhance + shadow + 1:1 square — ready for your store",
    },
    "quick-clean": {
      name: "Quick Clean-Up",
      description: "Removes the background and enhances quality automatically",
    },
    "whatsapp-catalog": {
      name: "WhatsApp Catalog",
      description: "Square format optimized for your WhatsApp Business catalog",
    },
    "social-full": {
      name: "Full Social Media",
      description: "Nice background + enhance + video — ready for Instagram and TikTok",
    },
    "instagram-lifestyle": {
      name: "Instagram Lifestyle",
      description: "AI lifestyle background + enhance + resize for Instagram",
    },
    "full-production": {
      name: "Full Production",
      description: "Complete pipeline: background + enhance + shadows + upscale + branding",
    },
  },
};
