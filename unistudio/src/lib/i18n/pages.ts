// =============================================================================
// i18n — Encabezados de las páginas internas (ES / EN)
// =============================================================================
// Título + subtítulo de cada página de la plataforma (fuera de la home). Se
// consume con `const { t } = useI18n()` → `t.pages.<page>.title`.
// Mismas reglas de escritura que translations.ts: verbos accionables, outcome
// en una frase, sin nombrar modelos IA. Ambos idiomas con el MISMO shape para
// que TypeScript garantice que ninguna clave quede sin traducir.
// =============================================================================

export interface PagesCopy {
  gallery: { title: string; subtitle: string; totalSuffix: string };
  batch: { title: string; subtitle: string };
  brandKit: { title: string; subtitle: string };
  agent: { title: string; subtitle: string };
  workflows: { title: string; subtitle: string };
  architecture: { title: string; subtitle: string };
  docs: { title: string; subtitle: string };
  staticProduct: { title: string; subtitle: string };
  jewelry: { title: string; subtitle: string };
}

export const PAGES_ES: PagesCopy = {
  gallery: {
    title: 'Tu galería de imágenes',
    subtitle: 'Todas tus fotos procesadas, listas para reusar o descargar.',
    totalSuffix: 'en total',
  },
  batch: {
    title: 'Procesa muchas fotos a la vez',
    subtitle:
      'Sube hasta 50 imágenes y aplica el mismo pipeline a todas — perfecto para catálogo de temporada.',
  },
  brandKit: {
    title: 'Tu Kit de Marca',
    subtitle:
      'Define la identidad de tu marca: logo, colores y marca de agua. Se aplica automáticamente en todas las fotos.',
  },
  agent: {
    title: '¿Qué querés procesar?',
    subtitle:
      'Subí una foto (auto-detecto la categoría) o elegí abajo. Te mando al pipeline correcto con la configuración para ese tipo de producto.',
  },
  workflows: {
    title: 'UniStudio — Mapa Completo',
    subtitle:
      'Cada feature, qué hace, qué archivos tocar, con fotos reales de tu inventario Unistyles.',
  },
  architecture: {
    title: 'Cómo Funciona UniStudio',
    subtitle:
      'Guía interactiva para entender la arquitectura, el flujo de datos, cada módulo, y cómo probar que todo funcione.',
  },
  docs: {
    title: 'Mapa del Proyecto',
    subtitle: 'Cada archivo, cada carpeta, qué hace y dónde ir para cambiarlo.',
  },
  staticProduct: {
    title: 'Fotos profesionales para tu catálogo',
    subtitle:
      'Sube tus perfumes y la IA genera los 3 outputs que necesitas: fondo blanco para Amazon, fondo de catálogo estilo Sephora, y formato vertical 9:16 para Reels y Stories — todos cohesivos entre sí.',
  },
  jewelry: {
    title: 'Joyería para catálogo de lujo',
    subtitle:
      'Cada pieza recibe el mismo tratamiento que las marcas premium: estante elegante con fondo de mármol, foto en modelo (oreja, cuello, mano o muñeca según el tipo) y video 360° opcional para Reels.',
  },
};

export const PAGES_EN: PagesCopy = {
  gallery: {
    title: 'Your image gallery',
    subtitle: 'All your processed photos, ready to reuse or download.',
    totalSuffix: 'total',
  },
  batch: {
    title: 'Process many photos at once',
    subtitle:
      'Upload up to 50 images and apply the same pipeline to all of them — perfect for a seasonal catalog.',
  },
  brandKit: {
    title: 'Your Brand Kit',
    subtitle:
      "Define your brand identity: logo, colors and watermark. It's applied automatically across every photo.",
  },
  agent: {
    title: 'What do you want to process?',
    subtitle:
      "Upload a photo (I auto-detect the category) or pick one below. I'll route you to the right pipeline with the setup for that product type.",
  },
  workflows: {
    title: 'UniStudio — Full Map',
    subtitle:
      'Every feature, what it does and which files to touch — with real photos from your Unistyles inventory.',
  },
  architecture: {
    title: 'How UniStudio Works',
    subtitle:
      'An interactive guide to understand the architecture, the data flow, each module, and how to test that everything works.',
  },
  docs: {
    title: 'Project Map',
    subtitle: 'Every file, every folder, what it does and where to go to change it.',
  },
  staticProduct: {
    title: 'Professional photos for your catalog',
    subtitle:
      'Upload your perfumes and AI generates the 3 outputs you need: white background for Amazon, Sephora-style catalog background, and 9:16 vertical for Reels and Stories — all consistent with each other.',
  },
  jewelry: {
    title: 'Jewelry for a luxury catalog',
    subtitle:
      'Every piece gets the same treatment as premium brands: an elegant marble-background display, on-model shots (ear, neck, hand or wrist by type) and an optional 360° video for Reels.',
  },
};
