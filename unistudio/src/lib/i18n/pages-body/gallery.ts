// =============================================================================
// gallery.ts — Copia i18n del CUERPO de la página Galería
// =============================================================================
// Textos visibles del cuerpo de /gallery (todo excepto la cabecera, que sigue
// en t.pages.gallery.*). Desacoplado de translations.ts a propósito.
//
//   const { locale } = useI18n();
//   const b = locale === 'en' ? GALLERY_BODY_EN : GALLERY_BODY_ES;
//   <button>{b.download}</button>
//
// Reglas: los valores ES son byte a byte idénticos al texto actual (acentos,
// «…», guiones largos, «...»). El EN es inglés profesional en segunda persona.
// =============================================================================

export interface GalleryBodyCopy {
  /** Etiquetas del selector de operación, indexadas por su `value`. */
  operationOptions: Record<string, string>;
  /** Etiquetas del selector de fuente, indexadas por su `value`. */
  projectOptions: Record<string, string>;

  // Barra de selección
  selectedCount: (n: number) => string;
  downloadIndividual: string;
  downloadIndividualTitle: string;
  downloadZip: (n: number) => string;
  downloadZipTitle: string;
  delete: string;
  clear: string;

  // Filtros
  searchPlaceholder: string;
  selectAll: string;
  deselectAll: string;

  // Estados vacíos
  emptyTitle: string;
  emptyHint: string;
  noMatch: string;

  // Acciones al pasar el cursor sobre la miniatura (title)
  viewTitle: string;
  openInEditorTitle: string;
  downloadTitle: string;
  deleteTitle: string;

  // Modal de vista previa
  previewFallbackTitle: string;
  originalLabel: string;
  processedLabel: string;
  previous: string;
  download: string;
  next: string;

  // Toasts
  packagingToast: (n: number) => string;
  noDownloadError: string;
  zipReadyToast: (count: number, sizeMb: string) => string;
}

export const GALLERY_BODY_ES: GalleryBodyCopy = {
  operationOptions: {
    all: "Todas las Operaciones",
    "bg-remove": "Quitar Fondo",
    "bg-generate": "Fondos con IA",
    enhance: "Mejorar Calidad",
    shadows: "Sombras",
    upscale: "Escalar",
    outpaint: "Extender",
    inpaint: "Borrar/Reemplazar",
    tryon: "Prueba Virtual",
    "model-create": "Modelo IA",
    "ghost-mannequin": "Maniqui Invisible",
    "jewelry-tryon": "Joyeria Virtual",
    video: "Video",
  },
  projectOptions: {
    all: "Todas las Fuentes",
    editor: "Editor",
    batch: "Procesamiento Masivo",
  },

  selectedCount: (n) => `${n} seleccionados`,
  downloadIndividual: "Descargar individual",
  downloadIndividualTitle: "Descargar una por una (lento si son muchas)",
  downloadZip: (n) => `Descargar ZIP (${n})`,
  downloadZipTitle: "Empaquetar todas en un solo ZIP — recomendado para 10+ fotos",
  delete: "Eliminar",
  clear: "Limpiar",

  searchPlaceholder: "Buscar por nombre...",
  selectAll: "Seleccionar Todo",
  deselectAll: "Deseleccionar Todo",

  emptyTitle: "Aun no hay imagenes procesadas.",
  emptyHint: "Procesa imagenes en el Editor o en Batch para verlas aqui.",
  noMatch: "Ninguna imagen coincide con los filtros.",

  viewTitle: "Ver",
  openInEditorTitle: "Abrir en Editor",
  downloadTitle: "Descargar",
  deleteTitle: "Eliminar",

  previewFallbackTitle: "Vista Previa",
  originalLabel: "Original",
  processedLabel: "Procesada",
  previous: "Anterior",
  download: "Descargar",
  next: "Siguiente",

  packagingToast: (n) => `Empaquetando ${n} imágenes en ZIP…`,
  noDownloadError: "No se pudo descargar ninguna imagen.",
  zipReadyToast: (count, sizeMb) => `ZIP listo: ${count} imágenes (${sizeMb} MB)`,
};

export const GALLERY_BODY_EN: GalleryBodyCopy = {
  operationOptions: {
    all: "All Operations",
    "bg-remove": "Remove Background",
    "bg-generate": "AI Backgrounds",
    enhance: "Enhance Quality",
    shadows: "Shadows",
    upscale: "Upscale",
    outpaint: "Extend",
    inpaint: "Erase/Replace",
    tryon: "Virtual Try-On",
    "model-create": "AI Model",
    "ghost-mannequin": "Ghost Mannequin",
    "jewelry-tryon": "Virtual Jewelry",
    video: "Video",
  },
  projectOptions: {
    all: "All Sources",
    editor: "Editor",
    batch: "Batch Processing",
  },

  selectedCount: (n) => `${n} selected`,
  downloadIndividual: "Download individually",
  downloadIndividualTitle: "Download one at a time (slow for large batches)",
  downloadZip: (n) => `Download ZIP (${n})`,
  downloadZipTitle: "Package everything into a single ZIP — recommended for 10+ photos",
  delete: "Delete",
  clear: "Clear",

  searchPlaceholder: "Search by name...",
  selectAll: "Select All",
  deselectAll: "Deselect All",

  emptyTitle: "No processed images yet.",
  emptyHint: "Process images in the Editor or Batch to see them here.",
  noMatch: "No images match your filters.",

  viewTitle: "View",
  openInEditorTitle: "Open in Editor",
  downloadTitle: "Download",
  deleteTitle: "Delete",

  previewFallbackTitle: "Preview",
  originalLabel: "Original",
  processedLabel: "Processed",
  previous: "Previous",
  download: "Download",
  next: "Next",

  packagingToast: (n) => `Packaging ${n} ${n === 1 ? "image" : "images"} into a ZIP…`,
  noDownloadError: "Couldn't download any image.",
  zipReadyToast: (count, sizeMb) =>
    `ZIP ready: ${count} ${count === 1 ? "image" : "images"} (${sizeMb} MB)`,
};
