// =============================================================================
// UX Copy — Strings centralizados en español para la portada y pipelines
// =============================================================================
// Todas las cadenas de texto que ve la usuaria viven aquí. Cambiar acá → cambia
// en TODA la app. Mantener tono: directo, sin tecnicismos, accionable.
//
// Reglas de escritura (basadas en research Photoroom/Claid/Pebblely):
//  1. Verbos en imperativo o presente — "Sube", "Procesa", no "subir/procesando"
//  2. CTAs cortas (1-3 palabras) — "Empezar →", "Ver tutorial"
//  3. Descripciones bajo el título: 1 frase con outcome, no proceso
//     ❌ "Bras, panties, shapewear — quita la modelo y crea una nueva"
//     ✅ "De foto con modelo a catálogo profesional con modelo IA"
//  4. NO mencionar modelos IA por nombre (Kolors, FASHN, Kontext) — confunde
//  5. Hablar en SEGUNDA persona ("Tu marca", no "la marca")
// =============================================================================

export const COPY = {
  app: {
    name: "UniStudio",
    tagline: "Tu estudio de fotos profesional con IA",
  },

  dashboard: {
    title: "¿Qué quieres procesar hoy?",
    subtitle: "Elige tu tipo de producto y la IA hace el resto",
  },

  pipelines: {
    lingerie: {
      title: "Lencería",
      icon: "🩱",
      tagline: "Bras, panties, shapewear y fajas",
      benefit: "Foto con modelo IA + prueba virtual + video",
      cta: "Empezar",
    },
    beauty: {
      title: "Perfumes y Belleza",
      icon: "🧴",
      tagline: "Perfumes, cremas, skincare y maquillaje",
      benefit: "Fondo blanco + catálogo + Reels en un click",
      cta: "Empezar",
    },
    jewelry: {
      title: "Joyería",
      icon: "💎",
      tagline: "Aretes, cadenas, anillos y pulseras",
      benefit: "Estante de lujo + foto en modelo + video 360°",
      cta: "Empezar",
    },
  },

  utilities: {
    batch: {
      title: "Procesamiento Masivo",
      icon: "📦",
      benefit: "50+ fotos con un solo click",
    },
    editor: {
      title: "Editar foto",
      icon: "✏️",
      benefit: "Retoques manuales con todas las herramientas",
    },
    brandKit: {
      title: "Kit de marca",
      icon: "🎨",
      benefit: "Tu logo, colores y marca de agua",
    },
  },

  // CTAs reusables
  cta: {
    start: "Empezar",
    process: "Procesar",
    upload: "Subir foto",
    download: "Descargar",
    retry: "Reintentar",
    cancel: "Cancelar",
    continue: "Continuar",
    back: "Atrás",
    learnMore: "Aprender más",
  },

  // Mensajes de estado
  status: {
    processing: "Procesando…",
    uploading: "Subiendo…",
    analyzing: "Analizando tu foto…",
    generating: "Generando…",
    done: "Listo",
    failed: "Falló",
    retrying: "Reintentando…",
    waiting: "En cola…",
  },

  // Estados de error human-friendly (no tecnicismos)
  errors: {
    networkOffline: "Sin conexión. Verifica tu internet y reintenta.",
    timeout: "El servidor tardó más de lo esperado. Reintenta.",
    quotaExceeded: "Cuota excedida. Espera unos minutos o cambia de plan.",
    invalidImage: "La foto no se puede procesar. Sube otra (JPG, PNG, WebP).",
    productChanged: "El producto cambió en el resultado. Reintenta.",
    backgroundFiltered: "El sistema rechazó el fondo. Reintentando con otro estilo.",
    unknown: "Algo falló. Reintenta o contáctanos.",
  },

  // Tips por categoría — se muestran antes de procesar
  tips: {
    lingerie: [
      "Sube fotos con buena iluminación — sin sombras fuertes en la prenda",
      "La modelo IA se reusa entre fotos del mismo SKU para coherencia",
      "Si subes foto de espalda real, la usamos para el video posterior",
    ],
    beauty: [
      "Sube el frasco sobre fondo simple (mesa lisa, mantel claro)",
      "La IA detecta marca y forma para elegir el fondo adecuado",
      "Los 3 outputs comparten estética: blanco / catálogo / vertical 9:16",
    ],
    jewelry: [
      "Foto top-down (desde arriba) da mejor isolate del aro/cadena",
      "Si tiene piedras, asegúrate que se vean — el upscale las preserva",
      "Para video 360°, recomendamos pieza brillante con buena luz",
    ],
  },
} as const;

export type CopyKey = keyof typeof COPY;
