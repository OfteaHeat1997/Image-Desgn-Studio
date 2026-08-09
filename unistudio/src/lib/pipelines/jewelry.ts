/**
 * Pipeline Joyería — matriz de sub-tipos + routing por pieza
 *
 * Joyería no es un flow único. Cada pieza (arete, cadena, anillo, pulsera, set)
 * necesita un encuadre distinto, un soporte distinto y una posición distinta
 * sobre la modelo:
 *   - aretes/topos/candongas → orejas
 *   - cadenas/collares       → cuello
 *   - anillos                → mano
 *   - pulseras               → muñeca
 *   - sets (cadena + aretes) → torso
 *
 * Esta función es pura (sin side effects, sin fetch) — se llama desde el
 * cliente para decidir qué prompts mandar a /api/bg-generate, /api/model-create,
 * /api/jewelry-tryon, /api/macro-crop y /api/video.
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
  /** Prompt para /api/bg-generate — packshot limpio, listo para marketplace */
  packshotPrompt: string;
  /** Prompt para /api/bg-generate — la foto "estante" de lujo, para redes */
  estantePrompt: string;
  /** Ajustes de /api/macro-crop para el detalle — cuánto acerca y sobre qué fondo */
  macro: { zoom: number; background: 'velvet-black' | 'soft-white' | 'warm-gray' };
  /** Prompt para /api/video — movimiento de cámara sobre la pieza en el estante */
  videoPrompt: string;
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

// Base común de todo packshot de marketplace. Las guías de catálogo (Mercado
// Libre, Shopify, Amazon) piden lo mismo: fondo blanco liso, la pieza centrada,
// sombra de contacto suave para que no parezca recortada, y nada más en cuadro.
const PACKSHOT_BASE =
  'pure seamless white background, product perfectly centered with generous margin, ' +
  'soft realistic contact shadow directly beneath the piece to ground it, ' +
  'even shadowless studio lighting from a large softbox, no props, no text, no watermark, ' +
  'ecommerce marketplace catalog packshot' + HD;

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
        packshotPrompt: 'pair of earrings, both earrings shown side by side at the same height, ' + PACKSHOT_BASE,
        estantePrompt:
          'pair of earrings displayed on premium black velvet jewelry stand with visible fabric texture, warm golden lighting from the side creating soft specular highlights on the metal, gentle reflection on the velvet, luxury boutique flagship product photography, shallow depth of field bokeh, Tiffany catalog aesthetic' + HD,
        macro: { zoom: 2.6, background: 'velvet-black' },
        videoPrompt:
          'slow cinematic camera orbit around the earrings on the velvet stand, warm golden highlight travelling across the metal, subtle sparkle on the stones, product stays perfectly still and unchanged, luxury jewelry commercial',
        bodyPart: 'ears',
        modelPrompt:
          'beautiful professional woman portrait, hair pulled back elegantly revealing both ears clearly, soft directional studio lighting, clean neutral light-gray background, front three-quarter view, commercial fashion photography, sharp focus on ears' + HD,
        tryonPrompt:
          'Apply the earrings to both ears of the model. Preserve the exact shape, color, gem detail and metal finish. Natural contact shadow where earring meets skin. Realistic scale.',
        label: 'Aretes (sobre orejas)',
      };

    case 'studs':
      return {
        packshotPrompt: 'pair of stud earrings shown side by side, front facing so the stone setting is readable, ' + PACKSHOT_BASE,
        estantePrompt:
          'pair of stud earrings on premium black velvet display with macro detail showing every facet, soft diagonal key lighting, close-up product photography, luxury boutique aesthetic, extreme sharpness' + HD,
        // Los topos son diminutos: el macro tiene que acercar mucho más que en
        // una pieza grande para que el engaste se lea.
        macro: { zoom: 3.4, background: 'velvet-black' },
        videoPrompt:
          'extreme close-up macro camera slowly pushing in on the stud earrings, light sweeping across the facets creating controlled sparkle, product stays perfectly still and unchanged, luxury jewelry commercial',
        bodyPart: 'ears',
        modelPrompt:
          'beautiful woman close-up portrait, hair pulled back showing the earlobe in razor-sharp detail, soft rim lighting catching the face edge, clean neutral background, professional macro fashion photography' + HD,
        tryonPrompt:
          'Apply the stud earrings to both earlobes. Keep them subtle and well-centered on the lobe. Preserve gem/metal exactly.',
        label: 'Topos (close-up orejas)',
      };

    case 'hoops':
      return {
        packshotPrompt: 'pair of hoop earrings shown side by side, full circle visible and unobstructed, ' + PACKSHOT_BASE,
        estantePrompt:
          'pair of hoop earrings on premium black velvet stand with warm directional lighting catching the curvature of the metal, soft specular highlights, luxury boutique product photography, editorial quality' + HD,
        macro: { zoom: 2.4, background: 'velvet-black' },
        videoPrompt:
          'slow cinematic camera orbit around the hoop earrings, warm light travelling around the curve of the metal revealing its roundness, product stays perfectly still and unchanged, luxury jewelry commercial',
        bodyPart: 'ears',
        modelPrompt:
          'beautiful woman portrait, hair pulled back revealing the full ear and upper neck, soft studio lighting, clean neutral background, side-leaning three-quarter view, commercial fashion photography' + HD,
        tryonPrompt:
          'Apply the hoop earrings to both ears. Hoops hang naturally below the earlobe. Preserve size, metal tone, and any decorative details exactly.',
        label: 'Candongas (orejas visibles)',
      };

    case 'necklace':
      return {
        packshotPrompt:
          'necklace laid out in a clean symmetrical open loop with the pendant centered at the bottom and the clasp at the top, chain evenly spread without tangles, ' + PACKSHOT_BASE,
        // GHOST NECKLINE. La referencia de fotografía de joyería para collares no
        // es un busto de cuero: es la pieza colgando de un cuello invisible, con
        // la caída que le da la gravedad. Un collar fotografiado plano se ve
        // muerto en la ficha; colgado se lee el largo real y cómo cae el dije,
        // que es exactamente lo que la compradora quiere saber.
        estantePrompt:
          'necklace suspended as if worn on an invisible neck — ghost mannequin neckline effect, ' +
          'the chain drapes naturally under gravity in a soft V, the pendant hanging straight down and centered, ' +
          'no bust form and no person visible, floating against a deep warm charcoal backdrop with a subtle vignette, ' +
          'warm directional key light running along the chain to reveal every link, soft reflected fill on the pendant, ' +
          'luxury boutique flagship product photography, catalog editorial aesthetic' + HD,
        macro: { zoom: 2.2, background: 'velvet-black' },
        videoPrompt:
          'slow cinematic camera push toward the suspended necklace, warm highlight travelling down the chain link by link and settling on the pendant, chain sways almost imperceptibly, product stays unchanged, luxury jewelry commercial',
        bodyPart: 'neck',
        modelPrompt:
          'beautiful woman upper-body portrait with collarbone and full neckline visible, soft diffused studio lighting, clean neutral background, commercial fashion photography, sharp focus on neck area' + HD,
        tryonPrompt:
          'Place the necklace around the neck of the model, sitting naturally on the collarbone. Preserve exact chain length, pendant position, metal finish, and any gems. Natural drape.',
        label: 'Cadenas / Collares (sobre cuello)',
      };

    case 'ring':
      return {
        packshotPrompt:
          'ring standing upright at a slight three-quarter angle so both the band profile and the stone setting are readable, ' + PACKSHOT_BASE,
        estantePrompt:
          'ring placed on a cream silk cushion with visible fabric texture, soft directional lighting, subtle contact shadow beneath, luxury boutique product photography, shallow depth of field with bokeh, Cartier catalog aesthetic' + HD,
        macro: { zoom: 3.0, background: 'warm-gray' },
        videoPrompt:
          'slow cinematic camera orbit around the ring on the silk cushion, light rotating across the stone to trigger fire and brilliance, product stays perfectly still and unchanged, luxury jewelry commercial',
        bodyPart: 'hand',
        modelPrompt:
          'elegant professional woman hand in soft natural pose showing the ring finger prominently, manicured french-tip nails, soft diffused studio lighting, clean neutral background, commercial jewelry hand modeling, macro sharpness' + HD,
        tryonPrompt:
          'Place the ring on the ring finger of the model hand. Natural fit, realistic scale. Preserve gem color, metal tone, and every decorative detail exactly.',
        label: 'Anillos (sobre mano)',
      };

    case 'bracelet':
      return {
        packshotPrompt:
          'bracelet laid out in a clean open circle with the clasp visible at the top, links evenly spaced without overlap, ' + PACKSHOT_BASE,
        estantePrompt:
          'bracelet wrapped around a clear acrylic display ramp so it holds its worn circular shape, dark walnut wood base with visible grain beneath, warm directional lighting, soft reflection on the polished wood surface, luxury boutique product photography, editorial quality' + HD,
        macro: { zoom: 2.8, background: 'warm-gray' },
        videoPrompt:
          'slow cinematic camera orbit around the bracelet on its display, warm light travelling link by link around the curve, product stays perfectly still and unchanged, luxury jewelry commercial',
        bodyPart: 'wrist',
        modelPrompt:
          'elegant professional woman wrist in relaxed natural pose, hand resting gracefully, soft diffused studio lighting, clean neutral background, commercial jewelry modeling close-up' + HD,
        tryonPrompt:
          'Place the bracelet on the wrist of the model. Natural wrap around the wrist, realistic scale. Preserve clasp, charms, and any decorative details exactly.',
        label: 'Pulseras (sobre muñeca)',
      };

    case 'set':
      return {
        packshotPrompt:
          'complete jewelry set arranged in a balanced symmetrical layout, necklace open at the center with matching earrings placed on either side, every piece fully visible and not overlapping, ' + PACKSHOT_BASE,
        estantePrompt:
          'jewelry set with necklace and matching earrings displayed together on white Carrara marble surface with subtle veining, soft warm golden lighting, pieces arranged in coordinated composition, luxury boutique flagship catalog photography, editorial quality' + HD,
        macro: { zoom: 2.0, background: 'velvet-black' },
        videoPrompt:
          'slow cinematic camera glide across the jewelry set on marble, warm light sweeping over each piece in turn, every piece stays perfectly still and unchanged, luxury jewelry commercial',
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
 * Nitidez de la pieza antes de generar las escenas.
 *
 * Real-ESRGAN es el primero por costo, pero NO es obligatorio: /api/upscale
 * recibe `softFail: true`, así que si la GPU se queda sin memoria devuelve la
 * imagen original y el pipeline sigue con los pasos que de verdad importan.
 * Antes esto era un hard fail y una sola caída de GPU dejaba a la usuaria sin
 * packshot, sin estante, sin detalle, sin modelo y sin video.
 *
 * `scale: 2` en vez de 4: Kontext genera alrededor de 1 MP igual, así que
 * escalar más solo aumenta el riesgo de OOM sin mejorar el resultado final.
 */
export const JEWELRY_UPSCALE_CONFIG = {
  provider: 'real-esrgan' as const,
  scale: 2 as const,
  softFail: true as const,
};
