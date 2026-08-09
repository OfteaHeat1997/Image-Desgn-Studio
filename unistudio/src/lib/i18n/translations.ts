// =============================================================================
// i18n — Textos de la página principal en Español e Inglés
// =============================================================================
// Fuente única de todo el texto visible en la portada (home). Cambiar acá →
// cambia en toda la página, en ambos idiomas. El idioma activo lo maneja
// `useLanguageStore` (src/stores/language-store.ts) y se consume con el hook
// `useI18n` (src/hooks/useI18n.ts).
//
// Reglas de escritura (research Photoroom / Claid / Pebblely):
//  1. Verbos accionables — "Sube / Procesa", "Upload / Create".
//  2. CTAs cortas (1-3 palabras) — "Empezar" / "Start".
//  3. Descripción = outcome en 1 frase, no el proceso.
//  4. NO nombrar modelos IA (Kolors, FASHN, Kontext) — confunde al usuario.
//  5. Segunda persona — "Tu marca" / "Your brand".
//  6. Ambos idiomas deben tener EXACTAMENTE la misma forma (mismo shape) para
//     que TypeScript garantice que ninguna clave quede sin traducir.
// =============================================================================

import { type PagesCopy, PAGES_ES, PAGES_EN } from './pages';
import {
  type JewelryPipelineCopy,
  JEWELRY_PIPELINE_ES,
  JEWELRY_PIPELINE_EN,
} from './pipelines/jewelry';

export type Locale = 'es' | 'en';

export const LOCALES: Locale[] = ['es', 'en'];
export const DEFAULT_LOCALE: Locale = 'es';

/** BCP-47 tag por locale — usado por el TTS / Web Speech API. */
export const LOCALE_BCP47: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-US',
};

/** Etiqueta corta que se muestra en el switch de idioma. */
export const LOCALE_LABEL: Record<Locale, string> = {
  es: 'ES',
  en: 'EN',
};

// -----------------------------------------------------------------------------
// Tipos — la forma la fija el diccionario español (`es`); el inglés debe
// satisfacer el mismo tipo.
// -----------------------------------------------------------------------------

interface PipelineCopy {
  title: string;
  icon: string;
  tagline: string;
  benefit: string;
  cta: string;
  video: string;
}

interface UtilityCopy {
  title: string;
  icon: string;
  benefit: string;
  video: string;
}

interface ModuleCopy {
  /** id estable — NO se traduce, se usa para el `href` en la página. */
  id: string;
  name: string;
  cost: string;
  description: string;
  /** ocupa toda la fila (solo el Agente IA). */
  wide?: boolean;
}

export interface HomeCopy {
  app: { name: string; tagline: string };
  language: { label: string; switchTo: string };
  dashboard: { title: string; subtitle: string };
  pipelines: { lingerie: PipelineCopy; beauty: PipelineCopy; jewelry: PipelineCopy };
  sections: { moreOptions: string; advancedTitle: string; show: string; hide: string };
  utilities: { batch: UtilityCopy; editor: UtilityCopy; brandKit: UtilityCopy };
  modules: ModuleCopy[];
  cost: { free: string };
  nav: { gallery: string; workflows: string; docs: string };
}

// -----------------------------------------------------------------------------
// Español (idioma por defecto)
// -----------------------------------------------------------------------------

const es: HomeCopy = {
  app: {
    name: 'UniStudio',
    tagline: 'Tu estudio de fotografía de producto con IA',
  },

  language: {
    label: 'Idioma',
    switchTo: 'Ver en inglés',
  },

  dashboard: {
    title: '¿Qué producto quieres fotografiar hoy?',
    subtitle: 'Elige tu categoría y la IA genera fotos y videos listos para vender.',
  },

  pipelines: {
    lingerie: {
      title: 'Lencería',
      icon: '🩱',
      tagline: 'Bras, panties, shapewear y fajas',
      benefit: 'Fotos en modelo IA, prueba virtual y video — desde una sola imagen.',
      cta: 'Empezar',
      video: '/videos/tryon.mp4',
    },
    beauty: {
      title: 'Perfumes y Belleza',
      icon: '🧴',
      tagline: 'Perfumes, cremas, skincare y maquillaje',
      benefit: 'Fondo blanco impecable, escenas de catálogo y Reels en un clic.',
      cta: 'Empezar',
      video: '/videos/bg-generate.mp4',
    },
    jewelry: {
      title: 'Joyería',
      icon: '💎',
      tagline: 'Aretes, cadenas, anillos y pulseras',
      benefit: 'Exhibidor de lujo, foto en modelo y video 360° de cada pieza.',
      cta: 'Empezar',
      video: '/videos/jewelry-tryon.mp4',
    },
  },

  sections: {
    moreOptions: 'Más opciones',
    advancedTitle: 'Módulos sueltos (avanzado)',
    show: 'Ver',
    hide: 'Ocultar',
  },

  utilities: {
    batch: {
      title: 'Procesamiento masivo',
      icon: '📦',
      benefit: 'Procesa 50 o más fotos de una sola vez.',
      video: '/videos/batch.mp4',
    },
    editor: {
      title: 'Editar foto',
      icon: '✏️',
      benefit: 'Retoques manuales con todas las herramientas.',
      video: '/videos/smart-editor.mp4',
    },
    brandKit: {
      title: 'Kit de marca',
      icon: '🎨',
      benefit: 'Tu logo, tus colores y tu marca de agua.',
      video: '/videos/brand-kit.mp4',
    },
  },

  modules: [
    {
      id: 'bg-remove',
      name: 'Quitar fondo',
      cost: '$0.01',
      description:
        'Borra el fondo y deja solo el producto sobre transparente. Ideal para listados.',
    },
    {
      id: 'bg-generate',
      name: 'Fondos con IA',
      cost: '$0.003 – $0.05',
      description:
        'Genera un fondo nuevo con IA: mármol, playa, degradado o lo que imagines.',
    },
    {
      id: 'enhance',
      name: 'Mejorar calidad',
      cost: 'Gratis',
      description:
        'Ajusta brillo, contraste y nitidez automáticamente para un acabado profesional.',
    },
    {
      id: 'inpaint',
      name: 'Borrar y reemplazar',
      cost: '$0.03 – $0.05',
      description:
        'Selecciona una zona y la IA la reemplaza. Perfecto para borrar manchas o detalles.',
    },
    {
      id: 'upscale',
      name: 'Aumentar resolución',
      cost: '$0.02 – $0.05',
      description:
        'Duplica o cuadruplica la resolución sin perder detalle. Para imprimir o hacer zoom.',
    },
    {
      id: 'tryon',
      name: 'Prueba virtual',
      cost: '$0.02 – $0.05',
      description:
        'Viste una modelo IA con tu prenda real. La modelo no existe; la prenda es tuya.',
    },
    {
      id: 'model-create',
      name: 'Crear modelo IA',
      cost: '$0.055',
      description:
        'Genera una persona con licencia libre para reusar en todas las fotos del producto.',
    },
    {
      id: 'ghost-mannequin',
      name: 'Maniquí invisible',
      cost: '$0.05 – $0.08',
      description:
        'Quita la modelo o el maniquí y deja la prenda flotando estilo producto 3D.',
    },
    {
      id: 'jewelry',
      name: 'Joyería virtual',
      cost: '$0.05',
      description:
        'Coloca un anillo, arete o cadena en una modelo IA para mostrar la pieza puesta.',
    },
    {
      id: 'video',
      name: 'Estudio de video',
      cost: '$0 – $0.35',
      description: 'Crea videos cortos a partir de tus fotos para Reels, Stories y TikTok.',
    },
    {
      id: 'ad-create',
      name: 'Crear anuncios',
      cost: '$0.04 – $0.35',
      description: 'Diseña anuncios listos para Meta o Google con tus productos y tu marca.',
    },
    {
      id: 'shadows',
      name: 'Sombras y luces',
      cost: '$0.04',
      description:
        'Agrega sombras profesionales bajo el producto para que luzca natural en cualquier fondo.',
    },
    {
      id: 'outpaint',
      name: 'Extender imagen',
      cost: '$0.05',
      description:
        'Amplía la foto más allá de los bordes; la IA completa la escena de forma coherente.',
    },
    {
      id: 'compliance',
      name: 'Verificar',
      cost: 'Gratis',
      description:
        'Revisa que tu foto cumpla las reglas de Amazon, MercadoLibre y otros marketplaces.',
    },
    {
      id: 'smart-editor',
      name: 'Editor avanzado',
      cost: 'Gratis',
      description: 'Editor visual con todas las herramientas para retoques manuales detallados.',
    },
    {
      id: 'ai-prompt',
      name: 'Director creativo',
      cost: 'Gratis',
      description:
        'Conversa con la IA para escribir prompts y crear imágenes desde cero.',
    },
    {
      id: 'ai-agent',
      name: 'Agente IA',
      cost: 'Para productos fuera de las 3 categorías',
      description:
        'Para productos que no encajan en lencería, perfumes o joyería. La IA lee la foto y decide qué pasos correr.',
      wide: true,
    },
  ],

  cost: { free: 'Gratis' },

  nav: {
    gallery: 'Galería',
    workflows: 'Workflows',
    docs: 'Guía',
  },
};

// -----------------------------------------------------------------------------
// English
// -----------------------------------------------------------------------------

const en: HomeCopy = {
  app: {
    name: 'UniStudio',
    tagline: 'Your AI-powered product photography studio',
  },

  language: {
    label: 'Language',
    switchTo: 'View in Spanish',
  },

  dashboard: {
    title: 'What product are you shooting today?',
    subtitle: 'Pick a category and AI generates sell-ready photos and video.',
  },

  pipelines: {
    lingerie: {
      title: 'Lingerie',
      icon: '🩱',
      tagline: 'Bras, panties, shapewear and shaping',
      benefit: 'AI-model shots, virtual try-on and video — all from a single image.',
      cta: 'Start',
      video: '/videos/tryon.mp4',
    },
    beauty: {
      title: 'Perfume & Beauty',
      icon: '🧴',
      tagline: 'Perfume, creams, skincare and makeup',
      benefit: 'Clean white background, catalog scenes and Reels in one click.',
      cta: 'Start',
      video: '/videos/bg-generate.mp4',
    },
    jewelry: {
      title: 'Jewelry',
      icon: '💎',
      tagline: 'Earrings, chains, rings and bracelets',
      benefit: 'Luxury display, on-model shots and a 360° video of every piece.',
      cta: 'Start',
      video: '/videos/jewelry-tryon.mp4',
    },
  },

  sections: {
    moreOptions: 'More options',
    advancedTitle: 'Standalone modules (advanced)',
    show: 'Show',
    hide: 'Hide',
  },

  utilities: {
    batch: {
      title: 'Batch processing',
      icon: '📦',
      benefit: 'Process 50+ photos in a single click.',
      video: '/videos/batch.mp4',
    },
    editor: {
      title: 'Photo editor',
      icon: '✏️',
      benefit: 'Manual retouching with the full toolkit.',
      video: '/videos/smart-editor.mp4',
    },
    brandKit: {
      title: 'Brand kit',
      icon: '🎨',
      benefit: 'Your logo, your colors and your watermark.',
      video: '/videos/brand-kit.mp4',
    },
  },

  modules: [
    {
      id: 'bg-remove',
      name: 'Remove background',
      cost: '$0.01',
      description:
        'Erase the background and keep only the product on transparency. Perfect for listings.',
    },
    {
      id: 'bg-generate',
      name: 'AI backgrounds',
      cost: '$0.003 – $0.05',
      description: 'Generate a new AI background: marble, beach, gradient or anything you imagine.',
    },
    {
      id: 'enhance',
      name: 'Enhance quality',
      cost: 'Free',
      description:
        'Auto-adjust brightness, contrast and sharpness for a professional finish.',
    },
    {
      id: 'inpaint',
      name: 'Erase & replace',
      cost: '$0.03 – $0.05',
      description:
        'Select an area and AI replaces it. Great for removing blemishes or details.',
    },
    {
      id: 'upscale',
      name: 'Upscale resolution',
      cost: '$0.02 – $0.05',
      description:
        'Double or quadruple resolution with no loss of detail. For print or catalog zoom.',
    },
    {
      id: 'tryon',
      name: 'Virtual try-on',
      cost: '$0.02 – $0.05',
      description:
        'Dress an AI model in your real garment. The model is fictional; the garment is yours.',
    },
    {
      id: 'model-create',
      name: 'Create AI model',
      cost: '$0.055',
      description:
        'Generate a royalty-free person to reuse across every photo of the same product.',
    },
    {
      id: 'ghost-mannequin',
      name: 'Ghost mannequin',
      cost: '$0.05 – $0.08',
      description:
        'Remove the model or mannequin and leave the garment floating, 3D-product style.',
    },
    {
      id: 'jewelry',
      name: 'Virtual jewelry',
      cost: '$0.05',
      description:
        'Place a ring, earring or chain on an AI model to show the piece being worn.',
    },
    {
      id: 'video',
      name: 'Video studio',
      cost: '$0 – $0.35',
      description: 'Create short videos from your photos for Reels, Stories and TikTok.',
    },
    {
      id: 'ad-create',
      name: 'Create ads',
      cost: '$0.04 – $0.35',
      description: 'Design ready-to-run Meta or Google ads with your products and brand.',
    },
    {
      id: 'shadows',
      name: 'Shadows & light',
      cost: '$0.04',
      description:
        'Add professional shadows under the product so it looks natural on any background.',
    },
    {
      id: 'outpaint',
      name: 'Extend image',
      cost: '$0.05',
      description:
        'Expand the photo beyond its edges; AI fills in the rest of the scene seamlessly.',
    },
    {
      id: 'compliance',
      name: 'Compliance check',
      cost: 'Free',
      description:
        'Check that your photo meets Amazon, MercadoLibre and other marketplace rules.',
    },
    {
      id: 'smart-editor',
      name: 'Advanced editor',
      cost: 'Free',
      description: 'Visual editor with the full toolkit for detailed manual retouching.',
    },
    {
      id: 'ai-prompt',
      name: 'Creative director',
      cost: 'Free',
      description: 'Chat with AI to write prompts and create images from scratch.',
    },
    {
      id: 'ai-agent',
      name: 'AI Agent',
      cost: 'For products outside the 3 categories',
      description:
        'For products that don’t fit lingerie, perfume or jewelry. AI reads the photo and decides which steps to run.',
      wide: true,
    },
  ],

  cost: { free: 'Free' },

  nav: {
    gallery: 'Gallery',
    workflows: 'Workflows',
    docs: 'Guide',
  },
};

// -----------------------------------------------------------------------------
// Registro
// -----------------------------------------------------------------------------

/**
 * Diccionario completo de la app: la home (`HomeCopy`) + los encabezados de las
 * páginas internas (`pages`). Se extiende de forma aditiva, así la home no se
 * rompe: sus claves siguen en el nivel superior (`t.dashboard`, `t.pipelines`…)
 * y lo nuevo cuelga de `t.pages.*`.
 */
export interface AppCopy extends Omit<HomeCopy, 'pipelines'> {
  pages: PagesCopy;
  /**
   * La home usa `pipelines.<x>` (PipelineCopy: title/cta/...). El pipeline de
   * joyería suma su copy de página bajo la MISMA clave `jewelry` — claves
   * disjuntas, así ambos consumidores conviven sin romperse.
   */
  pipelines: Omit<HomeCopy['pipelines'], 'jewelry'> & {
    jewelry: PipelineCopy & JewelryPipelineCopy;
  };
}

const esFull: AppCopy = {
  ...es,
  pages: PAGES_ES,
  pipelines: {
    ...es.pipelines,
    jewelry: { ...es.pipelines.jewelry, ...JEWELRY_PIPELINE_ES },
  },
};
const enFull: AppCopy = {
  ...en,
  pages: PAGES_EN,
  pipelines: {
    ...en.pipelines,
    jewelry: { ...en.pipelines.jewelry, ...JEWELRY_PIPELINE_EN },
  },
};

export const TRANSLATIONS: Record<Locale, AppCopy> = { es: esFull, en: enFull };

export function getCopy(locale: Locale): AppCopy {
  return TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE];
}
