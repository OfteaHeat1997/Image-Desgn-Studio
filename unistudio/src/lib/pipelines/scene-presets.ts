// =============================================================================
// SCENE_PRESETS — escenarios de fondo para perfumes/cosméticos
// =============================================================================
// La usuaria pidió variedad: "tipo una mesa elegante o una persona con la
// colonia en la mano, piensas algunos escenarios". Antes el pipeline tenía 1
// solo prompt por brand. Ahora la usuaria puede elegir entre 10 escenarios
// curados profesionalmente, cada uno con su prompt optimizado para Schnell.
//
// CRÍTICO: todos los prompts dicen "EMPTY scene, NO products, NO bottles in
// background". El composite-first añade el producto real encima. Así Schnell
// genera SOLO el escenario, NUNCA otro frasco.
// =============================================================================

export type SceneCategory =
  | 'studio'      // foto profesional limpia
  | 'lujo'        // luxury, premium feel
  | 'natural'     // naturaleza, exterior
  | 'lifestyle'   // con persona / contexto humano
  | 'romantico'   // mood emocional, regalo
  | 'editorial';  // magazine, fashion

export interface ScenePreset {
  id: string;
  label: string;
  icon: string;        // emoji para preview rápido
  category: SceneCategory;
  prompt: string;      // prompt para Schnell — debe ser EMPTY scene
  description: string; // ayuda UX
  bestFor: string[];   // ej ['perfume', 'cream']
}

const HD =
  ', ultra high resolution, 8K, sharp focus, crystal clear details, professional commercial product photography, studio quality lighting, no blur, no artifacts, photo-realistic, magazine quality';
const NO_DUP =
  ', completely EMPTY scene with NO PRODUCTS visible, no perfume bottles in background, no extra bottles, no shelves with products, no shopping displays, no perfume samples in scene, just the empty surface ready for product placement, NO PRODUCT decoration in background, plain empty area';

export const SCENE_PRESETS: ScenePreset[] = [
  // ─── STUDIO ────────────────────────────────────────────────────
  {
    id: 'studio-pedestal',
    label: 'Estudio minimalista',
    icon: '⬜',
    category: 'studio',
    description: 'Backdrop blanco/crema limpio. Catálogo profesional.',
    bestFor: ['perfume', 'cream', 'sunscreen', 'deodorant', 'facial', 'makeup'],
    prompt:
      'minimalist luxury photo studio backdrop, polished cream marble pedestal in foreground, soft warm golden gradient bokeh in background (out-of-focus light, NO objects), editorial fragrance catalog aesthetic, magazine-quality empty scene' +
      HD +
      NO_DUP,
  },
  {
    id: 'studio-black',
    label: 'Estudio negro dramático',
    icon: '⬛',
    category: 'studio',
    description: 'Fondo matte black con rim lighting. MAC/Tom Ford editorial.',
    bestFor: ['perfume', 'makeup'],
    prompt:
      'dramatic matte black photo studio backdrop, soft rim lighting from the side creating rich shadow falloff, subtle spotlight on empty pedestal area, luxury cosmetics editorial photography, high contrast, completely empty matte black studio space' +
      HD +
      NO_DUP,
  },

  // ─── LUJO ──────────────────────────────────────────────────────
  {
    id: 'mesa-marmol-petalos',
    label: 'Mesa de mármol con pétalos de rosa',
    icon: '🌹',
    category: 'lujo',
    description: 'Mármol blanco con pétalos rojos suaves. Romance premium.',
    bestFor: ['perfume', 'cream'],
    prompt:
      'pristine white Carrara marble counter with subtle gray veining, scattered fresh red rose petals on the marble (just petals, NO products), soft warm window light from the left, luxury hotel suite aesthetic, romantic premium fragrance editorial' +
      HD +
      NO_DUP,
  },
  {
    id: 'vanity-dorada',
    label: 'Vanity dorada parisina',
    icon: '💎',
    category: 'lujo',
    description: 'Tocador dorado con espejo. Estilo Chanel/Dior.',
    bestFor: ['perfume', 'makeup'],
    prompt:
      'elegant vintage gold vanity table surface with subtle decorative mirror visible behind out-of-focus, soft parisian boudoir lighting through sheer curtains, gilded picture frame partially in frame, luxury haute couture aesthetic, empty vanity surface ready for product placement' +
      HD +
      NO_DUP,
  },
  {
    id: 'hotel-bathroom',
    label: 'Baño de hotel de lujo',
    icon: '🏨',
    category: 'lujo',
    description: 'Mármol de baño + toalla enrollada blanca. Spa premium.',
    bestFor: ['perfume', 'cream', 'facial', 'makeup'],
    prompt:
      'luxurious hotel bathroom marble counter with subtle gold veining, single rolled crisp white spa towel partially visible to the side, soft natural daylight from a window, eucalyptus sprig (no products), Aman resort aesthetic, empty marble counter' +
      HD +
      NO_DUP,
  },

  // ─── NATURAL ───────────────────────────────────────────────────
  {
    id: 'terraza-atardecer',
    label: 'Terraza al atardecer',
    icon: '🌅',
    category: 'natural',
    description: 'Terraza con luz golden hour. Mood vacacional cálido.',
    bestFor: ['perfume', 'sunscreen'],
    prompt:
      'sun-drenched mediterranean terrace stone surface, soft golden-hour light from the right, defocused palm leaves and tile patterns in background, Saint-Tropez summer aesthetic, warm honey-colored bokeh, empty stone surface' +
      HD +
      NO_DUP,
  },
  {
    id: 'playa-dorada',
    label: 'Playa dorada',
    icon: '🏖️',
    category: 'natural',
    description: 'Arena dorada + océano azul borroso. Coppertone aesthetic.',
    bestFor: ['perfume', 'sunscreen', 'cream'],
    prompt:
      'fine golden sand beach surface in foreground with a few small smooth pebbles, soft turquoise ocean water bokeh in distance, sunset golden flare, summer vacation aesthetic, Coppertone campaign style, empty sand area' +
      HD +
      NO_DUP,
  },
  {
    id: 'jardin-verde',
    label: 'Jardín verde fresco',
    icon: '🌿',
    category: 'natural',
    description: 'Hojas verdes + luz dappled. Frescura natural.',
    bestFor: ['perfume', 'facial', 'cream'],
    prompt:
      'lush green garden setting with defocused leaves and soft dappled sunlight filtering through trees, mossy stone surface in foreground, fresh botanical aesthetic, organic skincare campaign style, empty stone surface ready for product' +
      HD +
      NO_DUP,
  },

  // ─── LIFESTYLE ─────────────────────────────────────────────────
  {
    id: 'cafe-parisino',
    label: 'Café parisino matutino',
    icon: '☕',
    category: 'lifestyle',
    description: 'Espresso + croissant + periódico. Mood mañana.',
    bestFor: ['perfume'],
    prompt:
      'cozy parisian café marble bistro table with a small espresso cup with crema and a folded morning newspaper to the side (no products), warm golden morning light, intimate café aesthetic, croissant flakes on plate visible at edge, empty table space in center' +
      HD +
      NO_DUP,
  },
  {
    id: 'manos-sosteniendo',
    label: 'Manos sosteniendo (lifestyle)',
    icon: '👐',
    category: 'lifestyle',
    description: 'Plano cerrado de manos elegantes. El producto va en las manos.',
    bestFor: ['perfume', 'cream'],
    prompt:
      'close-up of elegant feminine hands with manicured nails holding empty space ready for product, soft natural window light, neutral cream blouse sleeve visible, lifestyle product photography aesthetic, hands frame the empty product placement zone gently, no other objects' +
      HD +
      NO_DUP,
  },

  // ─── ROMÁNTICO ─────────────────────────────────────────────────
  {
    id: 'cama-blanca',
    label: 'Cama blanca lujosa',
    icon: '🛏️',
    category: 'romantico',
    description: 'Sábanas blancas + luz suave. Boudoir aesthetic.',
    bestFor: ['perfume'],
    prompt:
      'crisp white luxury bed linen with soft folds and subtle wrinkles, single dried lavender stem to the side (no products), morning light filtering through linen curtain, intimate boudoir aesthetic, empty linen surface' +
      HD +
      NO_DUP,
  },
  {
    id: 'regalo-rosa',
    label: 'Caja de regalo abierta',
    icon: '🎁',
    category: 'romantico',
    description: 'Caja rosa con cinta. Día de la madre / San Valentín.',
    bestFor: ['perfume', 'cream', 'makeup'],
    prompt:
      'soft pink gift box opened with crinkled silk ribbon and tissue paper visible (no products inside, ready to receive product), elegant gift wrap aesthetic, soft rose-colored studio lighting, mothers day or valentine campaign style, empty gift box interior' +
      HD +
      NO_DUP,
  },

  // ─── EDITORIAL ─────────────────────────────────────────────────
  {
    id: 'editorial-gradient',
    label: 'Gradient pastel editorial',
    icon: '🌸',
    category: 'editorial',
    description: 'Gradient suave coral-lila. Vogue/Cyzone juvenil.',
    bestFor: ['perfume', 'makeup'],
    prompt:
      'vibrant coral-to-lilac gradient backdrop with soft pastel bokeh highlights, youthful modern aesthetic with clean geometry, professional fragrance commercial backdrop, fresh and dynamic, completely empty background ready for product' +
      HD +
      NO_DUP,
  },
];

// Categorías para agrupar en el UI
export const SCENE_CATEGORY_LABELS: Record<SceneCategory, string> = {
  studio: 'Estudio profesional',
  lujo: 'Lujo / Premium',
  natural: 'Natural / Outdoor',
  lifestyle: 'Lifestyle (con contexto)',
  romantico: 'Romántico / Regalo',
  editorial: 'Editorial / Magazine',
};

/**
 * Devuelve los presets aplicables a un productType. Permite filtrar el picker
 * según si la usuaria está procesando perfume vs crema vs maquillaje.
 */
export function getScenePresetsForType(productType: string): ScenePreset[] {
  return SCENE_PRESETS.filter((p) => p.bestFor.includes(productType));
}

export function findScenePreset(id: string | null | undefined): ScenePreset | null {
  if (!id) return null;
  return SCENE_PRESETS.find((p) => p.id === id) ?? null;
}
