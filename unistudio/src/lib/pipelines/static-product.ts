/**
 * Pipeline Estáticos — matriz de fondo adaptativo
 *
 * Productos estáticos (perfumes, cremas, bloqueadores, desodorantes, limpieza
 * facial, maquillaje) no van sobre fondo blanco siempre. El fondo se decide
 * según categoría + marca, para imitar cómo e-commerce reales (Sephora, Ulta,
 * Nivea, La Mer) presentan productos similares.
 *
 * Esta función es pura (sin side effects, sin fetch) — se llama desde el
 * cliente para decidir qué prompt mandar a /api/bg-generate.
 *
 * Doc: docs/pipelines/static-product.md
 */

export type StaticProductType =
  | 'perfume'
  | 'cream'
  | 'sunscreen'
  | 'deodorant'
  | 'facial'
  | 'makeup';

export type StaticBrand =
  | 'esika'
  | 'yanbal'
  | 'lbel'
  | 'cyzone'
  | 'avon'
  | 'salome'
  | 'other';

export interface AdaptiveBgConfig {
  /** Prompt para /api/bg-generate */
  prompt: string;
  /** Tipo de sombra para /api/shadows */
  shadowType: 'contact' | 'drop' | 'reflection';
  /** Modo de bg-generate — precise usa Flux Pro ($0.05), fast usa Flux Schnell ($0.003) */
  bgMode: 'fast' | 'precise';
  /** Etiqueta humana del look elegido, solo para mostrar en UI */
  label: string;
}

export const PRODUCT_TYPE_LABELS: Record<StaticProductType, string> = {
  perfume: 'Perfume / Colonia',
  cream: 'Crema / Hidratante',
  sunscreen: 'Bloqueador solar',
  deodorant: 'Desodorante / Talco',
  facial: 'Limpieza Facial',
  makeup: 'Maquillaje',
};

export const BRAND_LABELS: Record<StaticBrand, string> = {
  esika: 'Esika',
  yanbal: 'Yanbal',
  lbel: "L'Bel",
  cyzone: 'Cyzone',
  avon: 'Avon',
  salome: 'Salome',
  other: 'Otra marca',
};

const PREMIUM_BRANDS: StaticBrand[] = ['esika', 'yanbal', 'lbel'];

export function getAdaptiveBgConfig(
  productType: StaticProductType,
  brand: StaticBrand,
): AdaptiveBgConfig {
  // --- Perfumes ---
  if (productType === 'perfume') {
    if (PREMIUM_BRANDS.includes(brand)) {
      return {
        prompt:
          'luxury perfume bottle on polished cream marble surface, soft warm gradient lighting, subtle golden highlights, faint reflection under the bottle, professional high-end cosmetics photography, shallow depth of field, 8k quality',
        shadowType: 'reflection',
        bgMode: 'precise',
        label: 'Gradient premium con reflejo (estilo Sephora)',
      };
    }
    if (brand === 'cyzone') {
      return {
        prompt:
          'vibrant coral-lilac pastel background with soft bokeh highlights, youthful modern aesthetic, professional fragrance product photography, fresh and playful',
        shadowType: 'drop',
        bgMode: 'fast',
        label: 'Fondo pastel juvenil',
      };
    }
    return {
      prompt:
        'clean warm beige background with soft natural light, minimal elegant product photography, subtle texture',
      shadowType: 'drop',
      bgMode: 'fast',
      label: 'Beige cálido minimalista',
    };
  }

  // --- Creams ---
  if (productType === 'cream') {
    if (brand === 'yanbal' || brand === 'lbel') {
      return {
        prompt:
          'pure white marble surface with soft reflection, clean spa aesthetic, subtle daylight from the left, professional skincare product photography, premium high-end look',
        shadowType: 'reflection',
        bgMode: 'precise',
        label: 'Mármol blanco premium (estilo La Mer)',
      };
    }
    if (brand === 'esika' || brand === 'cyzone') {
      return {
        prompt:
          'warm beige linen texture background with soft diffused lighting, cozy spa aesthetic, professional skincare product photography',
        shadowType: 'contact',
        bgMode: 'fast',
        label: 'Beige cálido tipo spa',
      };
    }
    return {
      prompt:
        'neutral cream background with soft subtle texture, clean skincare product photography',
      shadowType: 'contact',
      bgMode: 'fast',
      label: 'Crema neutro',
    };
  }

  // --- Sunscreen ---
  if (productType === 'sunscreen') {
    return {
      prompt:
        'defocused warm sandy beach background, golden-hour lighting, soft ocean blur in distance, summer sun protection product photography',
      shadowType: 'drop',
      bgMode: 'precise',
      label: 'Playa desenfocada (estilo Coppertone)',
    };
  }

  // --- Deodorant ---
  if (productType === 'deodorant') {
    return {
      prompt:
        'smooth neutral gray gradient background with soft cool lighting from the top, clean professional product photography, no distractions',
      shadowType: 'contact',
      bgMode: 'fast',
      label: 'Degradado gris neutro',
    };
  }

  // --- Facial cleansing ---
  if (productType === 'facial') {
    return {
      prompt:
        'clean blue and white spa background, soft water droplet reflection suggestion, fresh skincare photography, professional La Roche-Posay style',
      shadowType: 'reflection',
      bgMode: 'precise',
      label: 'Spa azul/blanco',
    };
  }

  // --- Makeup ---
  if (productType === 'makeup') {
    return {
      prompt:
        'dramatic matte black background with soft rim lighting from the side, luxury cosmetics product photography, high contrast, editorial style',
      shadowType: 'drop',
      bgMode: 'precise',
      label: 'Negro mate dramático (estilo MAC)',
    };
  }

  // Fallback (should never trigger due to exhaustive types)
  return {
    prompt: 'clean white background, professional product photography, centered product, studio lighting',
    shadowType: 'contact',
    bgMode: 'fast',
    label: 'Fondo blanco simple',
  };
}

/**
 * Resize + center preset for /api/enhance to normalize the canvas before bg-generate.
 * All static product outputs should share the same 2000x2000 1:1 frame so the
 * generated catalog looks cohesive.
 */
export const STATIC_PRODUCT_ENHANCE_NORMALIZE = {
  preset: 'product-normalize' as const,
  canvas: { width: 2000, height: 2000 },
  aspectRatio: '1:1' as const,
};
