// =============================================================================
// i18n — Textos visibles del cuerpo de Kit de Marca (ES / EN)
// =============================================================================
// Fuente única del texto de la UI de `src/app/brand-kit/page.tsx`, MENOS el
// encabezado título/subtítulo (que vive en `pages.ts` → `t.pages.brandKit`) y
// la barra superior de navegación (breadcrumb), que se deja sin traducir igual
// que en el resto de páginas ya migradas.
//
// Se consume con:
//   const { locale } = useI18n();
//   const b = locale === 'en' ? BRAND_KIT_BODY_EN : BRAND_KIT_BODY_ES;
//   <h2>{b.colors.heading}</h2>
//
// Reglas de escritura (iguales a translations.ts):
//  1. Verbos accionables.
//  2. CTAs cortas.
//  3. Sin nombrar modelos IA en la copy.
//  4. Segunda persona.
//  5. Ambos idiomas con EXACTAMENTE la misma forma (mismo shape) para que
//     TypeScript garantice que ninguna clave quede sin traducir.
//  6. Los valores ES son idénticos byte a byte a los originales del page.tsx
//     (se preservan acentos ausentes, guiones largos, ñ, … y paréntesis).
// =============================================================================

export interface BrandKitBodyCopy {
  status: {
    loading: string;
    dbUnavailable: string;
  };
  actions: {
    reset: string;
    save: string;
  };
  toasts: {
    saved: string;
    savedLocal: string;
    reset: string;
    resetLocal: string;
  };
  colors: {
    heading: string;
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  logo: {
    heading: string;
    alt: string;
    remove: string;
    uploadLabel: string;
    uploadHint: string;
  };
  fonts: {
    heading: string;
    primary: string;
    secondary: string;
  };
  watermark: {
    heading: string;
    enabled: string;
    disabled: string;
    position: string;
    opacity: string;
    size: string;
  };
  presets: {
    heading: string;
    bgStyle: string;
    enhancePreset: string;
    shadowType: string;
  };
  preview: {
    heading: string;
    /** Etiqueta de la fuente secundaria en la vista previa. */
    secondaryFont: (fontName: string) => string;
  };
}

export const BRAND_KIT_BODY_ES: BrandKitBodyCopy = {
  status: {
    loading: 'Cargando configuracion guardada…',
    dbUnavailable: 'Base de datos no disponible — los cambios se guardan localmente.',
  },
  actions: {
    reset: 'Restablecer',
    save: 'Guardar',
  },
  toasts: {
    saved: 'Kit de marca guardado correctamente',
    savedLocal: 'Kit de marca guardado localmente (base de datos no disponible)',
    reset: 'Kit de marca restablecido',
    resetLocal: 'Kit de marca restablecido localmente',
  },
  colors: {
    heading: 'Colores de Marca',
    primary: 'Primario',
    secondary: 'Secundario',
    accent: 'Acento',
    background: 'Fondo',
  },
  logo: {
    heading: 'Logotipo',
    alt: 'Logotipo de marca',
    remove: 'Eliminar',
    uploadLabel: 'Sube tu logotipo',
    uploadHint: 'PNG o SVG, se recomienda fondo transparente',
  },
  fonts: {
    heading: 'Tipografia',
    primary: 'Fuente Principal',
    secondary: 'Fuente Secundaria',
  },
  watermark: {
    heading: 'Marca de Agua',
    enabled: 'Habilitada',
    disabled: 'Deshabilitada',
    position: 'Posicion',
    opacity: 'Opacidad',
    size: 'Tamaño',
  },
  presets: {
    heading: 'Presets de Estilo por Defecto',
    bgStyle: 'Estilo de Fondo',
    enhancePreset: 'Preset de Mejora',
    shadowType: 'Tipo de Sombra',
  },
  preview: {
    heading: 'Vista Previa',
    secondaryFont: (fontName: string) => `${fontName} - texto secundario`,
  },
};

export const BRAND_KIT_BODY_EN: BrandKitBodyCopy = {
  status: {
    loading: 'Loading saved settings…',
    dbUnavailable: 'Database unavailable — changes are saved locally.',
  },
  actions: {
    reset: 'Reset',
    save: 'Save',
  },
  toasts: {
    saved: 'Brand kit saved successfully',
    savedLocal: 'Brand kit saved locally (database unavailable)',
    reset: 'Brand kit reset',
    resetLocal: 'Brand kit reset locally',
  },
  colors: {
    heading: 'Brand Colors',
    primary: 'Primary',
    secondary: 'Secondary',
    accent: 'Accent',
    background: 'Background',
  },
  logo: {
    heading: 'Logo',
    alt: 'Brand logo',
    remove: 'Remove',
    uploadLabel: 'Upload your logo',
    uploadHint: 'PNG or SVG, transparent background recommended',
  },
  fonts: {
    heading: 'Typography',
    primary: 'Primary Font',
    secondary: 'Secondary Font',
  },
  watermark: {
    heading: 'Watermark',
    enabled: 'Enabled',
    disabled: 'Disabled',
    position: 'Position',
    opacity: 'Opacity',
    size: 'Size',
  },
  presets: {
    heading: 'Default Style Presets',
    bgStyle: 'Background Style',
    enhancePreset: 'Enhancement Preset',
    shadowType: 'Shadow Type',
  },
  preview: {
    heading: 'Preview',
    secondaryFont: (fontName: string) => `${fontName} - secondary text`,
  },
};
