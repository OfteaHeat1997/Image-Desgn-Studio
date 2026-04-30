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

// HD suffix para forzar Flux Pro a producir calidad editorial, sin artefactos.
const HD = ', ultra high resolution, 8K, sharp focus, crystal clear metal and gem details, professional commercial jewelry photography, studio quality lighting, photo-realistic, magazine quality, no blur';

// PRESERVE suffix para anclar Kontext al producto del input image y NUNCA
// re-imaginarlo. Sin esto, prompts que describen el ambiente pueden disparar
// que Kontext reinterprete la joya — un anillo dorado puede salir plateado.
const PRESERVE = '. CRITICAL: preserve the EXACT jewelry piece from the input image — same shape, same metal color, same gems, same engravings, same proportions. Only modify the background/scene around it.';

/**
 * Public helper: append the preservation guard to any estantePrompt at the
 * bg-generate call site, so Kontext Pro never re-imagines the jewelry piece.
 */
export function withJewelryPreserve(prompt: string): string {
  return prompt + PRESERVE;
}

export function getJewelryConfig(subType: JewelrySubType): JewelryConfig {
  switch (subType) {
    case 'earrings':
      return {
        estantePrompt:
          'pair of earrings displayed on premium black velvet jewelry stand with visible fabric texture, warm golden lighting from the side creating soft specular highlights on the metal, gentle reflection on the velvet, luxury boutique flagship product photography, shallow depth of field bokeh, Tiffany catalog aesthetic' + HD,
        bodyPart: 'ears',
        modelPrompt:
          'beautiful professional woman portrait, hair pulled back elegantly revealing both ears clearly, soft directional studio lighting, clean neutral light-gray background, front three-quarter view, commercial fashion photography, sharp focus on ears' + HD,
        tryonPrompt:
          'Apply the earrings to both ears of the model. Preserve the exact shape, color, gem detail and metal finish. Natural contact shadow where earring meets skin. Realistic scale.',
        label: 'Aretes (sobre orejas)',
      };

    case 'studs':
      return {
        estantePrompt:
          'pair of stud earrings on premium black velvet display with macro detail showing every facet, soft diagonal key lighting, close-up product photography, luxury boutique aesthetic, extreme sharpness' + HD,
        bodyPart: 'ears',
        modelPrompt:
          'beautiful woman close-up portrait, hair pulled back showing the earlobe in razor-sharp detail, soft rim lighting catching the face edge, clean neutral background, professional macro fashion photography' + HD,
        tryonPrompt:
          'Apply the stud earrings to both earlobes. Keep them subtle and well-centered on the lobe. Preserve gem/metal exactly.',
        label: 'Topos (close-up orejas)',
      };

    case 'hoops':
      return {
        estantePrompt:
          'pair of hoop earrings on premium black velvet stand with warm directional lighting catching the curvature of the metal, soft specular highlights, luxury boutique product photography, editorial quality' + HD,
        bodyPart: 'ears',
        modelPrompt:
          'beautiful woman portrait, hair pulled back revealing the full ear and upper neck, soft studio lighting, clean neutral background, side-leaning three-quarter view, commercial fashion photography' + HD,
        tryonPrompt:
          'Apply the hoop earrings to both ears. Hoops hang naturally below the earlobe. Preserve size, metal tone, and any decorative details exactly.',
        label: 'Candongas (orejas visibles)',
      };

    case 'necklace':
      return {
        estantePrompt:
          'necklace displayed on a premium brown leather bust form with visible grain, warm directional lighting, subtle golden highlights along the chain, luxury boutique flagship product photography, catalog editorial aesthetic' + HD,
        bodyPart: 'neck',
        modelPrompt:
          'beautiful woman upper-body portrait with collarbone and full neckline visible, soft diffused studio lighting, clean neutral background, commercial fashion photography, sharp focus on neck area' + HD,
        tryonPrompt:
          'Place the necklace around the neck of the model, sitting naturally on the collarbone. Preserve exact chain length, pendant position, metal finish, and any gems. Natural drape.',
        label: 'Cadenas / Collares (sobre cuello)',
      };

    case 'ring':
      return {
        estantePrompt:
          'ring placed on a cream silk cushion with visible fabric texture, soft directional lighting, subtle contact shadow beneath, luxury boutique product photography, shallow depth of field with bokeh, Cartier catalog aesthetic' + HD,
        bodyPart: 'hand',
        modelPrompt:
          'elegant professional woman hand in soft natural pose showing the ring finger prominently, manicured french-tip nails, soft diffused studio lighting, clean neutral background, commercial jewelry hand modeling, macro sharpness' + HD,
        tryonPrompt:
          'Place the ring on the ring finger of the model hand. Natural fit, realistic scale. Preserve gem color, metal tone, and every decorative detail exactly.',
        label: 'Anillos (sobre mano)',
      };

    case 'bracelet':
      return {
        estantePrompt:
          'bracelet displayed on a dark walnut wood base with visible wood grain, warm directional lighting, soft reflection on the polished wood surface, luxury boutique product photography, editorial quality' + HD,
        bodyPart: 'wrist',
        modelPrompt:
          'elegant professional woman wrist in relaxed natural pose, hand resting gracefully, soft diffused studio lighting, clean neutral background, commercial jewelry modeling close-up' + HD,
        tryonPrompt:
          'Place the bracelet on the wrist of the model. Natural wrap around the wrist, realistic scale. Preserve clasp, charms, and any decorative details exactly.',
        label: 'Pulseras (sobre muñeca)',
      };

    case 'set':
      return {
        estantePrompt:
          'jewelry set with necklace and matching earrings displayed together on white Carrara marble surface with subtle veining, soft warm golden lighting, pieces arranged in coordinated composition, luxury boutique flagship catalog photography, editorial quality' + HD,
        bodyPart: 'torso',
        modelPrompt:
          'beautiful woman upper-body portrait showing neck, collarbone, and both ears clearly, hair styled up to reveal ears and neckline, soft studio lighting, clean neutral background, commercial fashion photography' + HD,
        tryonPrompt:
          'Apply the matching set on the model: necklace sitting naturally on the collarbone AND matching earrings on both ears. Preserve every piece exactly — shape, color, gems, metal finish.',
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
