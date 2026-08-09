// =============================================================================
// Jewelry / Accessory Virtual Try-On Processing Module - UniStudio
// =============================================================================
// Strategy:
//   MODELO: Create a side-by-side composite (model | jewelry product) and use
//   Flux Kontext Pro to place the EXACT jewelry from the right onto the person
//   on the left. This ensures the AI copies the real product design.
//
//   EXHIBIDOR/FLOTANTE: Remove background from jewelry, generate a new scene
//   background with Flux Schnell (text-to-image only), then composite the
//   original product pixels onto that background. Product stays 100% pixel-perfect.
// =============================================================================

import sharp from 'sharp';
import { runModel, extractOutputUrl, ensureHttpUrl } from '@/lib/api/replicate';
import { removeBgReplicate } from '@/lib/processing/bg-remove';

// ---------------------------------------------------------------------------
// Cost constants (USD per call)
// ---------------------------------------------------------------------------

export const JEWELRY_COSTS: Record<string, number> = {
  earrings: 0.05,
  studs: 0.05,
  hoops: 0.05,
  necklace: 0.05,
  rosary: 0.05,
  ring: 0.05,
  bracelet: 0.05,
  set: 0.05,
  sunglasses: 0.05,
  watch: 0.05,
};

// ---------------------------------------------------------------------------
// Placement prompts — reference "the jewelry product shown on the RIGHT side"
// P-1: Added per-accessory framing instructions at the end of each prompt.
// ---------------------------------------------------------------------------

const PLACEMENT_PROMPTS: Record<string, string> = {
  earrings:
    'This image has two halves. The RIGHT side shows the EXACT earrings product that must be used — do NOT replace or redesign it. ' +
    'The person on the LEFT is now wearing THIS EXACT pair of earrings from the RIGHT side on both earlobes. ' +
    'Preserve every detail of the earring: same shape, same stones, same metal, same size, same color. ' +
    'Do NOT substitute with different earrings. Do NOT invent new jewelry. ' +
    'Match lighting and reflections to the person\'s skin. Keep face, hair, and clothing unchanged. ' +
    'Output framing: tight close-up of head and shoulders from slight angle, ear area prominent, jewelry filling at least 20% of frame. Do NOT show full body.',

  necklace:
    'This image has two halves. The RIGHT side shows the EXACT necklace product that must be used — do NOT replace or redesign it. ' +
    'The person on the LEFT is now wearing THIS EXACT necklace from the RIGHT side around their neck. ' +
    'Preserve every detail: same chain style, same pendant, same length, same metal color, same thickness. ' +
    'Do NOT substitute with a ring, bracelet, or any other jewelry. Do NOT invent new jewelry. ' +
    'Match lighting and reflections. Keep the person unchanged. ' +
    'Output framing: upper chest and neck visible, necklace centered and prominent in frame.',

  ring:
    'This image has two halves. The RIGHT side shows the EXACT ring product that must be used — do NOT replace or redesign it. ' +
    'The hand on the LEFT is now wearing THIS EXACT ring from the RIGHT side on the ring finger. ' +
    'Preserve every detail: same gemstone cut, same band style, same metal color, same proportions. ' +
    'Do NOT substitute with a necklace or other jewelry. Do NOT invent new jewelry. ' +
    'Match lighting and perspective. Keep everything else unchanged. ' +
    'Output framing: extreme close-up of hand, ring sharp and centered, filling most of frame.',

  bracelet:
    'This image has two halves. The RIGHT side shows the EXACT bracelet product that must be used — do NOT replace or redesign it. ' +
    'The wrist on the LEFT is now wearing THIS EXACT bracelet from the RIGHT side. ' +
    'Preserve every detail: same chain style, same width, same clasp, same material, same color. ' +
    'Do NOT substitute with different jewelry. Do NOT invent new jewelry. ' +
    'Match lighting and reflections. Keep everything else unchanged. ' +
    'Output framing: close-up of wrist area, bracelet filling center of frame.',

  rosary:
    'This image has two halves. The RIGHT side shows the EXACT rosary that must be used — do NOT replace or redesign it. ' +
    'The person on the LEFT is now wearing THIS EXACT rosary from the RIGHT side around their neck. ' +
    'Preserve every detail: same bead size and spacing, same bead count, same centerpiece medal, same crucifix design and proportions, same metal colour. ' +
    'The bead chain rests on the collarbone and the crucifix hangs straight down at the center of the chest, following gravity. ' +
    'Do NOT substitute with a plain chain. Do NOT add gemstones, engravings or decorations that are not in the RIGHT side image. ' +
    'Match lighting and reflections to the skin. Keep face, hair and clothing unchanged. ' +
    'Output framing: upper body, neckline and chest visible so the full drop of the rosary and the crucifix are in frame.',

  studs:
    'This image has two halves. The RIGHT side shows the EXACT stud earrings product that must be used — do NOT replace or redesign it. ' +
    'The person on the LEFT is now wearing THIS EXACT pair of studs from the RIGHT side, centred on both earlobes. ' +
    'Preserve every detail: same stone cut, same setting, same metal, same diameter. ' +
    'Studs sit flush against the lobe — they do NOT dangle. ' +
    'Do NOT substitute with drop earrings or hoops. Do NOT invent new jewelry. ' +
    'Match lighting and reflections to the skin. Keep face, hair and clothing unchanged. ' +
    'Output framing: macro close-up of one ear and cheek, the stud sharp and filling a large part of the frame.',

  hoops:
    'This image has two halves. The RIGHT side shows the EXACT hoop earrings product that must be used — do NOT replace or redesign it. ' +
    'The person on the LEFT is now wearing THIS EXACT pair of hoops from the RIGHT side on both ears. ' +
    'Preserve every detail: same diameter, same tube thickness, same metal colour, same texture or engraving. ' +
    'The hoops hang below the earlobe and follow gravity, with the correct circular perspective for the head angle. ' +
    'Do NOT substitute with studs or drop earrings. Do NOT invent new jewelry. ' +
    'Match lighting and reflections. Keep face, hair and clothing unchanged. ' +
    'Output framing: head and shoulders from a slight angle, ear and jawline visible, hoop clearly readable.',

  set:
    'This image has two halves. The RIGHT side shows the EXACT matching jewelry set that must be used — do NOT replace or redesign any piece. ' +
    'The person on the LEFT is now wearing THIS EXACT set from the RIGHT side: the necklace resting naturally on the collarbone AND the matching earrings on both ears. ' +
    'Preserve every detail of every piece: same chain, same pendant, same earring shape, same stones, same metal colour. ' +
    'Every piece from the RIGHT side must appear on the person — do not drop one. ' +
    'Do NOT substitute pieces. Do NOT invent new jewelry. ' +
    'Match lighting and reflections. Keep face, hair and clothing unchanged. ' +
    'Output framing: upper body portrait showing both ears and the full neckline, all pieces of the set visible at once.',

  sunglasses:
    'This image has two halves. The RIGHT side shows the EXACT eyewear product that must be used — do NOT replace or redesign it. ' +
    'The person on the LEFT is now wearing THESE EXACT sunglasses from the RIGHT side on their face. ' +
    'Preserve every detail: same frame shape, same frame color, same lens tint, same temple style. ' +
    'Do NOT substitute with different eyewear. Do NOT invent new glasses. ' +
    'Keep everything else unchanged. ' +
    'Output framing: head and shoulders portrait, glasses prominently visible on face.',

  watch:
    'This image has two halves. The RIGHT side shows the EXACT watch product that must be used — do NOT replace or redesign it. ' +
    'The wrist on the LEFT is now wearing THIS EXACT watch from the RIGHT side. ' +
    'Preserve every detail: same dial design, same case shape, same band style, same color and material. ' +
    'Do NOT substitute with different jewelry or a different watch. Do NOT invent new jewelry. ' +
    'Match lighting and reflections. Keep everything else unchanged. ' +
    'Output framing: close-up of wrist, watch face clearly visible and centered.',
};

// ---------------------------------------------------------------------------
// Background prompts for Flux Schnell — Exhibidor (stand) mode per accessory
// B-1: These replace the old EXHIBIDOR_PROMPTS sent to Flux Kontext Pro.
//      Flux Schnell generates ONLY the background; jewelry is composited after.
// ---------------------------------------------------------------------------

const EXHIBIDOR_BG_PROMPTS: Record<string, string> = {
  earrings:
    'Professional commercial photography studio, elegant T-bar earring display stand, ' +
    'clean white marble surface, soft diffused studio lighting, luxury brand advertising style, ' +
    'minimalist product display, high-end jewelry photography background, no jewelry in scene',
  necklace:
    'Professional commercial photography studio, sleek velvet bust necklace display stand, ' +
    'clean white marble surface, soft diffused studio lighting, luxury brand advertising style, ' +
    'minimalist product display, high-end jewelry photography background, no jewelry in scene',
  ring:
    'Professional commercial photography studio, minimalist ring holder stand on marble, ' +
    'clean white marble surface, soft diffused studio lighting, luxury brand advertising style, ' +
    'minimalist product display, high-end jewelry photography background, no jewelry in scene',
  bracelet:
    'Professional commercial photography studio, curved bracelet display cushion stand, ' +
    'clean white marble surface, soft diffused studio lighting, luxury brand advertising style, ' +
    'minimalist product display, high-end jewelry photography background, no jewelry in scene',
  rosary:
    'Professional commercial photography studio, tall velvet bust form for a rosary, ' +
    'clean white marble surface, soft diffused studio lighting, luxury brand advertising style, ' +
    'minimalist product display, high-end devotional jewelry photography background, no jewelry in scene',
  studs:
    'Professional commercial photography studio, small flat velvet earring pad on a pedestal, ' +
    'clean white marble surface, soft diffused studio lighting, luxury brand advertising style, ' +
    'minimalist product display, high-end jewelry photography background, no jewelry in scene',
  hoops:
    'Professional commercial photography studio, tall slim T-bar earring display stand, ' +
    'clean white marble surface, soft diffused studio lighting, luxury brand advertising style, ' +
    'minimalist product display, high-end jewelry photography background, no jewelry in scene',
  set:
    'Professional commercial photography studio, coordinated jewelry set display tray with velvet lining, ' +
    'clean white marble surface, soft diffused studio lighting, luxury brand advertising style, ' +
    'minimalist product display, high-end jewelry photography background, no jewelry in scene',
  sunglasses:
    'Professional commercial photography studio, clean eyewear display stand, ' +
    'clean white marble surface, soft diffused studio lighting, luxury brand advertising style, ' +
    'minimalist product display, high-end photography background, no eyewear in scene',
  watch:
    'Professional commercial photography studio, premium watch winder stand, ' +
    'clean white marble surface, soft diffused studio lighting, luxury brand advertising style, ' +
    'minimalist product display, high-end watch photography background, no watch in scene',
};

// ---------------------------------------------------------------------------
// Background prompt for Flux Schnell — Flotante (floating) mode
// P-3: Now a function that accepts accessory type for specificity.
// B-1: Flux Schnell generates ONLY the background; jewelry is composited after.
// ---------------------------------------------------------------------------

function getFlotanteBgPrompt(type: string): string {
  return (
    `Dramatic cinematic dark luxury background for a floating ${type}, ` +
    'deep dark gradient black to deep navy, magical floating scene, ' +
    'golden light particles and bokeh sparkling around empty center space, ' +
    'soft shadow below center, moody atmospheric lighting, product photography background, ' +
    'no jewelry or accessories in the scene'
  );
}

// ---------------------------------------------------------------------------
// Metal/finish modifier phrases — ONLY for modelo mode (P-2).
// Added "If different from the original jewelry, adjust..." qualifier.
// ---------------------------------------------------------------------------

const METAL_PHRASES: Record<string, string> = {
  gold: 'If different from the original jewelry, adjust the metal appearance to match: polished gold.',
  silver: 'If different from the original jewelry, adjust the metal appearance to match: polished silver.',
  'rose-gold': 'If different from the original jewelry, adjust the metal appearance to match: rose gold.',
  platinum: 'If different from the original jewelry, adjust the metal appearance to match: platinum.',
  'yellow-gold': 'If different from the original jewelry, adjust the metal appearance to match: yellow gold.',
  'white-gold': 'If different from the original jewelry, adjust the metal appearance to match: white gold.',
};

const FINISH_PHRASES: Record<string, string> = {
  polished: 'High-polish mirror finish.',
  matte: 'Brushed matte finish.',
  brushed: 'Brushed satin finish.',
  hammered: 'Hammered textured finish.',
  oxidized: 'Oxidized antique finish.',
};

// ---------------------------------------------------------------------------
// Composite image creation — for modelo mode
// ---------------------------------------------------------------------------

/**
 * Create a side-by-side composite: [model | jewelry product]
 * Both images are resized to the same height and placed next to each other.
 * Returns a data URL of the composite.
 *
 * B-2: Added withoutEnlargement: false so small jewelry images (e.g. 300x300)
 * are upscaled to match the 1024px panel height instead of staying tiny.
 * Jewelry panel uses fit: 'contain' to fill the full height.
 */
async function createComposite(
  modelImageUrl: string,
  jewelryImageUrl: string,
): Promise<string> {
  // Download both images
  const [modelBuf, jewelryBuf] = await Promise.all([
    fetchImageBuffer(modelImageUrl),
    fetchImageBuffer(jewelryImageUrl),
  ]);

  const targetHeight = 1024;

  const modelResized = await sharp(modelBuf)
    .resize({ height: targetHeight, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  // B-2: fit: 'contain' ensures the jewelry fills the full height panel
  // withoutEnlargement: false allows small images to be upscaled
  const jewelryResized = await sharp(jewelryBuf)
    .resize({ height: targetHeight, width: 512, fit: 'contain', withoutEnlargement: false })
    .png()
    .toBuffer();

  // Get dimensions after resize
  const modelMeta = await sharp(modelResized).metadata();
  const jewelryMeta = await sharp(jewelryResized).metadata();

  const mw = modelMeta.width || 768;
  const mh = modelMeta.height || 1024;
  const jw = jewelryMeta.width || 512;
  const jh = jewelryMeta.height || 1024;

  // Separator width
  const sep = 4;
  const totalWidth = mw + sep + jw;
  const totalHeight = Math.max(mh, jh);

  // Create composite with white separator bar
  const composite = await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: modelResized, top: Math.round((totalHeight - mh) / 2), left: 0 },
      { input: jewelryResized, top: Math.round((totalHeight - jh) / 2), left: mw + sep },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return `data:image/jpeg;base64,${composite.toString('base64')}`;
}

/**
 * Download an image from URL or decode a data URL, returning a Buffer.
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) throw new Error('Invalid data URI');
    return Buffer.from(match[1], 'base64');
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Main exported functions
// ---------------------------------------------------------------------------

/**
 * Apply jewelry virtually by creating a composite reference image (modelo mode).
 *
 * 1. Creates a side-by-side composite: [model photo | jewelry product photo]
 * 2. Uploads the composite to Replicate
 * 3. Uses Flux Kontext Pro with a prompt that says "place the jewelry from the
 *    RIGHT side onto the person on the LEFT side"
 *
 * P-2: Metal/finish modifiers are only applied here (modelo mode), with a
 * preservation qualifier so they don't override the original product design.
 * P-4: Accepts bgStyle to append a background instruction to the prompt.
 * B-3: Added aspect_ratio: '1:1' to the Flux Kontext Pro call.
 */
export async function applyJewelry(
  modelImageUrl: string,
  jewelryImageUrl: string,
  accessoryType: string,
  options?: {
    metalType?: string;
    finish?: string;
    bgStyle?: string;
    featureDescriptor?: string;
    /**
     * Direccion de colocacion escrita por Claude Vision para ESTA pieza: donde
     * va sobre el cuerpo, como cae por gravedad y que encuadre la muestra mejor.
     * Se AGREGA a la plantilla por tipo, no la reemplaza: la plantilla trae los
     * guards de "no rediseñar", que no se pueden perder.
     */
    placementDirection?: string;
    /** Lista de la marca de lo que NO debe aparecer ni cambiar. */
    negative?: string;
  },
): Promise<string> {
  const placementPrompt = PLACEMENT_PROMPTS[accessoryType];
  if (!placementPrompt) {
    throw new Error(
      `Unsupported accessory type "${accessoryType}". ` +
      'Use one of: earrings, studs, hoops, necklace, rosary, ring, bracelet, set, sunglasses, watch.',
    );
  }

  // Build modifier hints (modelo mode only — P-2)
  const modifiers: string[] = [];
  if (options?.metalType && METAL_PHRASES[options.metalType]) {
    modifiers.push(METAL_PHRASES[options.metalType]);
  }
  if (options?.finish && FINISH_PHRASES[options.finish]) {
    modifiers.push(FINISH_PHRASES[options.finish]);
  }
  const modifierStr = modifiers.length > 0 ? ' ' + modifiers.join(' ') : '';

  // P-4: Append background style instruction if provided
  const bgInstruction = options?.bgStyle
    ? ` The background should be ${options.bgStyle}.`
    : '';

  // Inject the per-photo feature descriptor so Kontext anchors the result to
  // the EXACT piece (anillo redondo · oro · 3 piedras transparentes ·
  // grabados) instead of generating a generic earring/ring/etc. The descriptor
  // comes from /api/product-features (Claude Haiku Vision).
  const featureAnchor = options?.featureDescriptor
    ? ` The exact piece in the input is: ${options.featureDescriptor}. Reproduce these features faithfully — same shape, same material, same stones, same engravings.`
    : '';

  // Create composite image: [model | jewelry product]
  const compositeDataUrl = await createComposite(modelImageUrl, jewelryImageUrl);

  // Upload composite to Replicate for processing
  const compositeHttpUrl = await ensureHttpUrl(compositeDataUrl);

  // Build the full prompt
  // ANTI-DÍPTICO. La entrada es un compuesto lado a lado [modelo | joya], y
  // Kontext a veces "responde" con otro lado a lado: devolvía una foto partida
  // en dos paneles (plano general + close-up) en vez de una sola. Verificado con
  // el rosario el 2026-08-09. Sin esta frase el resultado no sirve para catálogo.
  // UNA SOLA PIEZA. Verificado con el rosario (2026-08-09): Kontext le agrego a
  // la modelo un SEGUNDO collar corto con medalla, ademas del rosario. Viola la
  // regla 1 de la direccion visual de Unistyles ("no inventar piezas
  // adicionales"): el cliente recibe una pieza, no dos.
  const onlyThisPiece =
    ' The person must wear EXACTLY ONE piece of jewelry: the one shown on the RIGHT side. ' +
    'Do NOT add any additional necklace, chain, pendant, medal, choker or layered second piece. ' +
    'If the person in the LEFT image is already wearing jewelry, remove it. ' +
    'No layering, no stacking, no extra accessories of any kind.';

  const singleImage =
    onlyThisPiece +
    ' Output ONE single photograph as the final image. Do NOT return a collage, a diptych, ' +
    'a split screen, a before/after comparison or two panels side by side. ' +
    'The two halves of the input are a REFERENCE for you, not a layout to reproduce.';

  // La direccion de Vision va DESPUES de la plantilla: lo ultimo pesa mas, y la
  // plantilla ya dejo sentados los guards de preservacion.
  const direction = options?.placementDirection ? ` ${options.placementDirection}` : '';
  const negative = options?.negative
    ? ` Do NOT include or change any of the following: ${options.negative}.`
    : '';

  const fullPrompt =
    placementPrompt + modifierStr + bgInstruction + featureAnchor + direction + negative + singleImage +
    ' Professional jewelry photography quality, photorealistic, high detail.';

  // SALIDA VERTICAL, no cuadrada. La entrada es un compuesto lado a lado y con
  // `1:1` Kontext copiaba esa estructura: devolvía la foto partida en dos
  // paneles. Un lienzo 3:4 no da lugar a dos paneles horizontales, así que
  // fuerza una sola toma — y de paso encaja con el 4:5 de Instagram.
  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: compositeHttpUrl,
    prompt: fullPrompt,
    aspect_ratio: '3:4',
  });

  return await extractOutputUrl(output);
}

/**
 * Apply a display or floating effect to a jewelry image (no model needed).
 * Used for "exhibidor" and "flotante" modes.
 *
 * B-1: COMPOSITE APPROACH (pixel-perfect product preservation):
 *   1. Remove background from jewelry image using rembg
 *   2. Generate ONLY a new background scene with Flux Schnell (text-to-image, no input_image)
 *   3. Composite the original product pixels onto the generated background
 *
 * The jewelry is NEVER sent through an image-to-image model, so it cannot be
 * regenerated or redesigned by the AI.
 *
 * B-4: Throws an error for unknown accessory types instead of silently defaulting.
 * P-2: Metal/finish modifiers are NOT applied here — they would alter the product.
 * P-3: Flotante background prompt now uses the accessory type for specificity.
 */
export async function applyJewelryDisplay(
  jewelryImageUrl: string,
  accessoryType: string,
  mode: 'exhibidor' | 'flotante',
  _options?: { metalType?: string; finish?: string },
): Promise<string> {
  // B-4: Validate accessory type — throw instead of silently defaulting
  if (!EXHIBIDOR_BG_PROMPTS[accessoryType]) {
    throw new Error(
      `Unsupported accessory type "${accessoryType}" for ${mode} mode. ` +
      'Use one of: earrings, studs, hoops, necklace, rosary, ring, bracelet, set, sunglasses, watch.',
    );
  }

  // Step 1: Remove background from jewelry image to get transparent PNG
  const jewelryHttpUrl = await ensureHttpUrl(jewelryImageUrl);
  const transparentUrl = await removeBgReplicate(jewelryHttpUrl);

  // Step 2: Download the transparent jewelry image
  const { replicateHeaders } = await import('@/lib/utils/image');
  const transparentRes = await fetch(transparentUrl, { headers: replicateHeaders(transparentUrl) });
  if (!transparentRes.ok) {
    throw new Error(`Failed to download transparent jewelry: ${transparentRes.status}`);
  }
  const transparentBuffer = Buffer.from(await transparentRes.arrayBuffer());

  // Step 3: Generate background ONLY with Flux Schnell (no input_image — B-1, P-3)
  // B-3: aspect_ratio: '1:1' is set here
  const bgPrompt = mode === 'flotante'
    ? getFlotanteBgPrompt(accessoryType)
    : EXHIBIDOR_BG_PROMPTS[accessoryType];

  const bgOutput = await runModel('black-forest-labs/flux-schnell', {
    prompt: bgPrompt,
    aspect_ratio: '1:1',
    num_outputs: 1,
  });
  const bgUrl = await extractOutputUrl(bgOutput);

  // Download the generated background
  const bgRes = await fetch(bgUrl, { headers: replicateHeaders(bgUrl) });
  if (!bgRes.ok) throw new Error(`Failed to download generated background: ${bgRes.status}`);
  const bgBuffer = Buffer.from(await bgRes.arrayBuffer());

  // Step 4: Composite original product pixels onto the generated background
  const canvas = { width: 1024, height: 1024 };
  const productMaxW = Math.round(canvas.width * 0.75);
  const productMaxH = Math.round(canvas.height * 0.75);

  const resizedProduct = await sharp(transparentBuffer)
    .resize(productMaxW, productMaxH, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  const prodMeta = await sharp(resizedProduct).metadata();
  const prodW = prodMeta.width || productMaxW;
  const prodH = prodMeta.height || productMaxH;
  const left = Math.round((canvas.width - prodW) / 2);
  const top = Math.round((canvas.height - prodH) / 2);

  const resizedBg = await sharp(bgBuffer)
    .resize(canvas.width, canvas.height, { fit: 'cover' })
    .png()
    .toBuffer();

  const resultBuffer = await sharp(resizedBg)
    .composite([{ input: resizedProduct, left, top }])
    .png()
    .toBuffer();

  return `data:image/png;base64,${resultBuffer.toString('base64')}`;
}
