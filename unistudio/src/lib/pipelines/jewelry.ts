/**
 * Pipeline Joyería — matriz de sub-tipos + routing por pieza
 *
 * Joyería no es un flow único. Cada pieza (arete, cadena, anillo, pulsera, set)
 * necesita un fondo distinto + posición distinta sobre la modelo:
 *   - aretes/topos/candongas → orejas
 *   - cadenas/collares       → cuello
 *   - anillos                → mano
 *   - pulseras               → muñeca
 *   - sets (cadena + aretes) → torso
 *
 * Esta función es pura (sin side effects, sin fetch) — se llama desde el
 * cliente para decidir qué prompts mandar a /api/bg-generate, /api/model-create
 * y /api/jewelry-tryon.
 *
 * Doc: docs/pipelines/jewelry.md
 */

export type JewelrySubType =
  | 'earrings'   // aretes
  | 'studs'      // topos
  | 'hoops'      // candongas
  | 'necklace'   // cadenas, collares
  | 'ring'       // anillos
  | 'bracelet'   // pulseras
  | 'set';       // sets (combo)

export type JewelryBodyPart = 'ears' | 'neck' | 'hand' | 'wrist' | 'torso';

export interface JewelryConfig {
  /** Prompt para /api/bg-generate — la foto "estante" de lujo */
  estantePrompt: string;
  /** Parte del cuerpo donde va la pieza cuando se monta sobre la modelo */
  bodyPart: JewelryBodyPart;
  /** Prompt para /api/model-create — modelo que muestre la parte correcta del cuerpo */
  modelPrompt: string;
  /** Prompt para /api/jewelry-tryon — instrucción de posicionamiento */
  tryonPrompt: string;
  /** Etiqueta humana del sub-tipo para UI */
  label: string;
}

export const SUB_TYPE_LABELS: Record<JewelrySubType, string> = {
  earrings: 'Aretes',
  studs: 'Topos',
  hoops: 'Candongas',
  necklace: 'Cadenas / Collares',
  ring: 'Anillos',
  bracelet: 'Pulseras',
  set: 'Sets (combo)',
};

export function getJewelryConfig(subType: JewelrySubType): JewelryConfig {
  switch (subType) {
    case 'earrings':
      return {
        estantePrompt:
          'pair of earrings displayed on premium black velvet jewelry stand with warm golden lighting from the side, soft reflection on the velvet, luxury boutique product photography, shallow depth of field, high-end catalog style',
        bodyPart: 'ears',
        modelPrompt:
          'beautiful woman portrait, hair pulled back showing the ear clearly, soft studio lighting, clean neutral background, professional fashion photography, front three-quarter view',
        tryonPrompt:
          'Apply the earrings to both ears of the model, preserve the shape and color exactly, natural shadow where earring meets skin',
        label: 'Aretes (sobre orejas)',
      };

    case 'studs':
      return {
        estantePrompt:
          'pair of stud earrings on premium black velvet display with soft diagonal lighting, close-up macro product photography, luxury boutique aesthetic',
        bodyPart: 'ears',
        modelPrompt:
          'beautiful woman close-up portrait, hair pulled back showing the ear in detail, soft rim lighting, clean background, professional macro fashion photography',
        tryonPrompt:
          'Apply the stud earrings to both ears of the model, keep them subtle and well-positioned on the earlobe',
        label: 'Topos (close-up orejas)',
      };

    case 'hoops':
      return {
        estantePrompt:
          'pair of hoop earrings on premium black velvet stand with warm directional lighting, soft highlights on the metal, luxury boutique product photography',
        bodyPart: 'ears',
        modelPrompt:
          'beautiful woman portrait, hair pulled back revealing the full ear and neck, soft studio lighting, clean background, professional fashion photography, side-leaning view',
        tryonPrompt:
          'Apply the hoop earrings to both ears of the model, hoops hang naturally below the earlobe',
        label: 'Candongas (orejas visibles)',
      };

    case 'necklace':
      return {
        estantePrompt:
          'necklace displayed on a premium brown leather bust with soft directional lighting and subtle golden reflections, luxury boutique product photography, high-end catalog style',
        bodyPart: 'neck',
        modelPrompt:
          'beautiful woman upper-body portrait with collarbone and neckline fully visible, soft studio lighting, clean neutral background, professional fashion photography',
        tryonPrompt:
          'Place the necklace around the neck of the model, sitting naturally on the collarbone, preserving chain length and pendant exactly',
        label: 'Cadenas / Collares (sobre cuello)',
      };

    case 'ring':
      return {
        estantePrompt:
          'ring placed on a cream silk cushion with soft directional lighting, subtle shadow beneath, luxury boutique product photography, shallow depth of field, high-end jewelry catalog',
        bodyPart: 'hand',
        modelPrompt:
          'elegant woman hand in soft pose showing the ring finger clearly, manicured nails, soft studio lighting, clean neutral background, professional jewelry hand modeling',
        tryonPrompt:
          'Place the ring on the ring finger of the model hand, natural fit, preserving gem and metal exactly',
        label: 'Anillos (sobre mano)',
      };

    case 'bracelet':
      return {
        estantePrompt:
          'bracelet displayed on a dark walnut wood base with visible grain, warm directional lighting, soft reflection, luxury boutique product photography, high-end catalog aesthetic',
        bodyPart: 'wrist',
        modelPrompt:
          'elegant woman wrist in relaxed pose with hand resting naturally, soft studio lighting, clean neutral background, professional jewelry modeling, close-up',
        tryonPrompt:
          'Place the bracelet on the wrist of the model, natural wrap around the wrist, preserve clasp and detail',
        label: 'Pulseras (sobre muñeca)',
      };

    case 'set':
      return {
        estantePrompt:
          'jewelry set (necklace and earrings) displayed together on white marble surface with soft golden lighting, pieces arranged in coordinated composition, luxury boutique product photography, high-end catalog style',
        bodyPart: 'torso',
        modelPrompt:
          'beautiful woman upper-body portrait showing neck, collarbone, and both ears, hair styled to reveal ears, soft studio lighting, clean neutral background, professional fashion photography',
        tryonPrompt:
          'Apply the matching set on the model: necklace on collarbone and earrings on both ears, preserving every piece exactly',
        label: 'Sets (torso mostrando combo)',
      };
  }
}

/**
 * Upscale is ALWAYS required for jewelry — small pieces need detail preservation.
 * Use Real-ESRGAN 2x for best balance between detail and cost ($0.02).
 */
export const JEWELRY_UPSCALE_CONFIG = {
  provider: 'real-esrgan' as const,
  scale: 2 as const,
};
