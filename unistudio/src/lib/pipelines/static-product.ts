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
  // Suffijos CORTOS. Antes eran de ~400 chars combinados y hacían que el prompt
  // total superara ~1000 chars — Flux Schnell se atragantaba y devolvía un output
  // que reventaba extractOutputUrl con "Unable to extract URL". Verificado:
  // prompt de 258 chars funciona, el de 1047 falla. Mantener esto CORTO.
  const HD = ', high resolution, sharp focus, photo-realistic, soft studio lighting';
  // ANTI-DUP: NUNCA nombrar "bottle/product/perfume" ni con "no" — Flux Schnell
  // no soporta negativos y al ver esas palabras las DIBUJA (efecto "no pienses en
  // un elefante rosa"). Bug: salían frascos fantasma detrás. Ahora SOLO lenguaje
  // positivo de escena vacía, sin nombrar ningún objeto. El producto real se
  // compone encima (pixel-perfect), así que el fondo va limpio.
  const NO_DUP = ', pure abstract studio backdrop only, empty minimalist set design, plain uncluttered wallpaper aesthetic, wide open negative space, backdrop wall and floor only';
  const seed = brandSeed(productType, brand);

  // --- Perfumes ---
  if (productType === 'perfume') {
    if (PREMIUM_BRANDS.includes(brand)) {
      return {
        prompt:
          'warm cream seamless studio floor and backdrop, beige silk drape behind with soft folds, dried pampas grass to one side, warm golden sunlight and long soft shadows across the floor, luxury minimal, flat empty surface' + HD + NO_DUP,
        shadowType: 'reflection',
        bgMode: 'precise',
        label: 'Gradient premium con reflejo (estilo Sephora)',
        seed,
      };
    }
    if (brand === 'cyzone') {
      return {
        prompt:
          'vibrant coral-to-lilac gradient background with soft pastel bokeh highlights, youthful modern aesthetic with clean geometry, soft ambient lighting, fresh and dynamic' + HD + NO_DUP,
        shadowType: 'drop',
        bgMode: 'precise',
        label: 'Fondo pastel juvenil',
        seed,
      };
    }
    return {
      prompt:
        'clean warm beige studio background with soft natural daylight from the left, subtle linen texture visible, minimal elegant soft lighting' + HD + NO_DUP,
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
          'pristine flat white Carrara marble surface in a clean photo studio, subtle gray veining, soft reflection, diffused daylight from left, minimalist spa aesthetic, white seamless backdrop, flat empty surface' + HD + NO_DUP,
        shadowType: 'reflection',
        bgMode: 'precise',
        label: 'Mármol blanco premium (estilo La Mer)',
        seed,
      };
    }
    if (brand === 'esika' || brand === 'cyzone') {
      return {
        prompt:
          'warm beige linen texture background with visible fabric weave, soft diffused lighting from above-left, cozy spa aesthetic, soft natural lighting, natural and organic feel' + HD + NO_DUP,
        shadowType: 'contact',
        bgMode: 'precise',
        label: 'Beige cálido tipo spa',
        seed,
      };
    }
    return {
      prompt:
        'neutral warm cream background with subtle linen texture, soft studio lighting, clean soft studio lighting, elegant minimalism' + HD + NO_DUP,
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
        'defocused warm sandy beach with golden-hour sun flare, soft turquoise ocean blur in the distance, shallow depth of field, bright airy summer atmosphere, clean and vibrant' + HD + NO_DUP,
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
        'smooth cool gray-to-silver gradient background with soft top lighting, subtle studio vignette, clean soft studio lighting, modern minimal aesthetic' + HD + NO_DUP,
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
        'clean white-to-pale-blue spa background with suggestion of water droplets and subtle reflections, fresh clinical skincare aesthetic, clean clinical lighting, luminous and pure' + HD + NO_DUP,
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
        'dramatic matte black seamless studio floor and backdrop, soft rim lighting from the side, rich shadow falloff, high contrast minimal, flat empty surface' + HD + NO_DUP,
      shadowType: 'drop',
      bgMode: 'precise',
      label: 'Negro mate dramático (estilo MAC)',
      seed,
    };
  }

  // Fallback
  return {
    prompt: 'clean pure white studio background with subtle gradient, soft studio lighting, soft studio lighting' + HD + NO_DUP,
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
