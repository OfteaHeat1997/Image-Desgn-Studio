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
  /**
   * Seed determinista por (productType, brand). Mismo valor → Flux genera el
   * mismo fondo para todos los SKUs del mismo tipo+marca → catálogo cohesivo
   * (los 20 perfumes Yanbal comparten mármol idéntico, no 20 mármoles distintos).
   * Range: 1..999_999. Estable entre runs.
   */
  seed: number;
}

/**
 * Seed determinista por (productType, brand). Calculada con hash simple
 * basado en el orden de PRODUCT_TYPE_LABELS × BRAND_LABELS, para que un SKU
 * procesado hoy use el mismo seed que otro SKU del mismo tipo+marca procesado
 * el mes pasado. No usamos Math.random ni Date.now: la estabilidad es el punto.
 */
function brandSeed(productType: StaticProductType, brand: StaticBrand): number {
  const typeOrder: StaticProductType[] = ['perfume', 'cream', 'sunscreen', 'deodorant', 'facial', 'makeup'];
  const brandOrder: StaticBrand[] = ['esika', 'yanbal', 'lbel', 'cyzone', 'avon', 'salome', 'other'];
  const ti = typeOrder.indexOf(productType);
  const bi = brandOrder.indexOf(brand);
  // 10000 + type×1000 + brand×100 → rangos 10000..16699 bien separados entre grupos
  return 10000 + ti * 1000 + bi * 100;
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
  // Suffijo de calidad agregado a TODOS los prompts — fuerza Flux Pro a producir
  // imágenes nítidas sin artefactos, ampliación-ready para catálogo e-commerce.
  const HD = ', ultra high resolution, 8K, sharp focus, crystal clear details, professional commercial product photography, studio quality lighting, no blur, no artifacts, photo-realistic, magazine quality';
  const seed = brandSeed(productType, brand);

  // --- Perfumes ---
  if (productType === 'perfume') {
    if (PREMIUM_BRANDS.includes(brand)) {
      return {
        prompt:
          'luxury perfume bottle on polished cream marble surface with subtle veining, soft warm golden gradient lighting from side, visible glass refraction and crystal-clear reflections on the marble, shallow depth of field with bokeh, Sephora flagship store aesthetic, editorial catalog photography' + HD,
        shadowType: 'reflection',
        bgMode: 'precise',
        label: 'Gradient premium con reflejo (estilo Sephora)',
        seed,
      };
    }
    if (brand === 'cyzone') {
      return {
        prompt:
          'vibrant coral-to-lilac gradient background with soft pastel bokeh highlights, youthful modern aesthetic with clean geometry, professional fragrance commercial photography, fresh and dynamic' + HD,
        shadowType: 'drop',
        bgMode: 'precise',
        label: 'Fondo pastel juvenil',
        seed,
      };
    }
    return {
      prompt:
        'clean warm beige studio background with soft natural daylight from the left, subtle linen texture visible, minimal elegant commercial product photography' + HD,
      shadowType: 'drop',
      bgMode: 'precise',
      label: 'Beige cálido minimalista',
      seed,
    };
  }

  // --- Creams ---
  if (productType === 'cream') {
    if (brand === 'yanbal' || brand === 'lbel') {
      return {
        prompt:
          'pristine white Carrara marble surface with subtle gray veining, soft mirror-like reflection beneath the product, diffused daylight from left, clean spa aesthetic, La Mer flagship product photography, crisp edges' + HD,
        shadowType: 'reflection',
        bgMode: 'precise',
        label: 'Mármol blanco premium (estilo La Mer)',
        seed,
      };
    }
    if (brand === 'esika' || brand === 'cyzone') {
      return {
        prompt:
          'warm beige linen texture background with visible fabric weave, soft diffused lighting from above-left, cozy spa aesthetic, professional skincare commercial photography, natural and organic feel' + HD,
        shadowType: 'contact',
        bgMode: 'precise',
        label: 'Beige cálido tipo spa',
        seed,
      };
    }
    return {
      prompt:
        'neutral warm cream background with subtle linen texture, soft studio lighting, clean commercial skincare product photography, elegant minimalism' + HD,
      shadowType: 'contact',
      bgMode: 'precise',
      label: 'Crema neutro',
      seed,
    };
  }

  // --- Sunscreen ---
  if (productType === 'sunscreen') {
    return {
      prompt:
        'defocused warm sandy beach background with golden-hour sun flare, soft turquoise ocean blur in the distance, shallow depth of field, summer sun-protection commercial photography, Coppertone campaign aesthetic, bright and vibrant' + HD,
      shadowType: 'drop',
      bgMode: 'precise',
      label: 'Playa desenfocada (estilo Coppertone)',
      seed,
    };
  }

  // --- Deodorant ---
  if (productType === 'deodorant') {
    return {
      prompt:
        'smooth cool gray-to-silver gradient background with soft top lighting, subtle studio vignette, clean commercial product photography with no distractions, modern minimal aesthetic' + HD,
      shadowType: 'contact',
      bgMode: 'precise',
      label: 'Degradado gris neutro',
      seed,
    };
  }

  // --- Facial cleansing ---
  if (productType === 'facial') {
    return {
      prompt:
        'clean white-to-pale-blue spa background with suggestion of water droplets and subtle reflections, fresh clinical skincare aesthetic, La Roche-Posay pharmacy commercial photography, luminous and pure' + HD,
      shadowType: 'reflection',
      bgMode: 'precise',
      label: 'Spa azul/blanco',
      seed,
    };
  }

  // --- Makeup ---
  if (productType === 'makeup') {
    return {
      prompt:
        'dramatic matte black background with soft rim lighting from the side creating a rich shadow falloff, subtle spotlight on the product, luxury cosmetics editorial photography, high contrast, MAC flagship aesthetic, glossy and bold' + HD,
      shadowType: 'drop',
      bgMode: 'precise',
      label: 'Negro mate dramático (estilo MAC)',
      seed,
    };
  }

  // Fallback
  return {
    prompt: 'clean pure white studio background with subtle gradient, professional commercial product photography, centered product, soft studio lighting' + HD,
    shadowType: 'contact',
    bgMode: 'precise',
    label: 'Fondo blanco simple',
    seed,
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
