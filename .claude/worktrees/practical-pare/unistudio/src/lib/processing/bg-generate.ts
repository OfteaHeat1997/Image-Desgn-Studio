// =============================================================================
// Background Generation Processing Module
// =============================================================================

import { runModel, extractOutputUrl } from '@/lib/api/replicate';
import { removeBgReplicate } from '@/lib/processing/bg-remove';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BackgroundPreset {
  name: string;
  prompt: string;
  negativePrompt: string;
  category: 'studio' | 'lifestyle' | 'nature' | 'luxury' | 'seasonal' | 'minimalist' | 'beauty' | 'intimates' | 'fragrance' | 'jewelry' | 'skincare';
}

export interface CompositePosition {
  x: number; // 0.0 - 1.0 (fraction of background width)
  y: number; // 0.0 - 1.0 (fraction of background height)
  scale: number; // 0.1 - 2.0 (relative to background)
}

// ---------------------------------------------------------------------------
// Background Presets
// ---------------------------------------------------------------------------

export const BACKGROUND_PRESETS: Record<string, BackgroundPreset> = {
  // ---- Studio ----
  'studio-white': {
    name: 'Studio White',
    prompt: 'clean white studio background, professional product photography lighting, soft shadows, seamless white backdrop, high-key lighting',
    negativePrompt: 'dirty, textured, colored, patterns, objects, distracting elements',
    category: 'studio',
  },
  'studio-gray': {
    name: 'Studio Gray',
    prompt: 'neutral gray studio background, professional photography lighting, gradient gray backdrop, subtle shadows, clean and modern',
    negativePrompt: 'colorful, cluttered, patterns, distracting elements, harsh shadows',
    category: 'studio',
  },
  'studio-black': {
    name: 'Studio Black',
    prompt: 'deep black studio background, dramatic low-key lighting, elegant dark backdrop, professional product photography, moody and luxurious',
    negativePrompt: 'bright, colorful, cluttered, messy, low quality, washed out',
    category: 'studio',
  },
  'studio-gradient': {
    name: 'Studio Gradient',
    prompt: 'smooth gradient studio background, professional lighting, soft transition from light to dark, elegant product photography backdrop',
    negativePrompt: 'harsh lines, patterns, objects, cluttered, textured surface',
    category: 'studio',
  },
  'studio-spotlight': {
    name: 'Spotlight',
    prompt: 'focused spotlight on clean dark background, dramatic pool of light, professional studio spotlight effect, product hero shot, theatrical lighting with vignette',
    negativePrompt: 'bright everywhere, flat lighting, colorful, cluttered, low quality',
    category: 'studio',
  },

  // ---- Nature ----
  'nature-garden': {
    name: 'Garden',
    prompt: 'lush green garden setting, natural sunlight, beautiful flowers and plants, bokeh background, outdoor fresh atmosphere, vibrant colors',
    negativePrompt: 'dead plants, brown, dry, urban, buildings, people, animals',
    category: 'nature',
  },
  'nature-beach': {
    name: 'Beach',
    prompt: 'tropical beach scene, white sand, turquoise ocean, palm trees, golden sunlight, paradise setting, clear blue sky',
    negativePrompt: 'cloudy, stormy, trash, crowded, people, buildings, dark',
    category: 'nature',
  },
  'nature-forest': {
    name: 'Forest',
    prompt: 'serene forest clearing, dappled sunlight through trees, lush green foliage, mossy ground, magical woodland atmosphere, bokeh light',
    negativePrompt: 'dark, scary, dead trees, urban, people, animals, night',
    category: 'nature',
  },
  'nature-sunset': {
    name: 'Sunset',
    prompt: 'golden sunset sky, warm orange and pink clouds, golden hour light, romantic evening atmosphere, beautiful horizon, natural warm glow',
    negativePrompt: 'dark, night, cold, cloudy, gloomy, people, buildings, low quality',
    category: 'nature',
  },

  // ---- Lifestyle / Interior ----
  'lifestyle-living-room': {
    name: 'Living Room',
    prompt: 'modern living room interior, stylish home decor, natural daylight from window, cozy and inviting atmosphere, neutral tones, interior design magazine quality',
    negativePrompt: 'cluttered, messy, dark, low quality, unrealistic, people',
    category: 'lifestyle',
  },
  'lifestyle-bedroom': {
    name: 'Bedroom',
    prompt: 'elegant modern bedroom interior, soft natural light, clean bedding, minimalist nightstand, warm and serene atmosphere, interior photography',
    negativePrompt: 'cluttered, messy, dark, low quality, unrealistic, people',
    category: 'lifestyle',
  },
  'lifestyle-bathroom': {
    name: 'Bathroom',
    prompt: 'luxury modern bathroom, marble countertop, clean white tiles, natural light, spa-like atmosphere, premium interior design',
    negativePrompt: 'dirty, cluttered, old, low quality, unrealistic, people',
    category: 'lifestyle',
  },
  'lifestyle-kitchen': {
    name: 'Kitchen',
    prompt: 'modern bright kitchen interior, clean marble countertop, natural daylight, minimalist design, professional interior photography, warm and inviting',
    negativePrompt: 'dirty, cluttered, messy, dark, low quality, people, food',
    category: 'lifestyle',
  },
  'lifestyle-cafe': {
    name: 'Cafe',
    prompt: 'cozy modern cafe interior, warm ambient lighting, wooden tables, coffee shop atmosphere, soft bokeh background, lifestyle photography',
    negativePrompt: 'dirty, crowded, dark, messy, low quality, people, text',
    category: 'lifestyle',
  },
  'lifestyle-office': {
    name: 'Office',
    prompt: 'modern minimalist office space, clean desk setup, natural window light, professional workspace, contemporary interior design, productivity aesthetic',
    negativePrompt: 'cluttered, messy, dark, old, low quality, people, papers',
    category: 'lifestyle',
  },

  // ---- Luxury ----
  'luxury-marble': {
    name: 'Marble Surface',
    prompt: 'elegant white marble surface, luxury product display, subtle gold veining, premium photography, clean and sophisticated, high-end',
    negativePrompt: 'cheap, dirty, cracked, cluttered, low quality, colorful',
    category: 'luxury',
  },
  'luxury-velvet': {
    name: 'Velvet',
    prompt: 'rich velvet fabric background, deep jewel tones, luxurious texture, dramatic lighting, premium product display, high-end fashion photography',
    negativePrompt: 'cheap, wrinkled, dirty, faded, low quality, bright',
    category: 'luxury',
  },
  'luxury-gold': {
    name: 'Gold Luxury',
    prompt: 'opulent gold and champagne tones, luxury backdrop, metallic accents, premium product photography, elegant and rich, warm golden lighting',
    negativePrompt: 'cheap, plastic, cluttered, low quality, dull, cold tones',
    category: 'luxury',
  },

  // ---- Abstract ----
  'abstract-bokeh': {
    name: 'Bokeh',
    prompt: 'beautiful soft bokeh light background, out of focus colorful circles of light, dreamy atmosphere, professional photography, warm tones, magical ambiance',
    negativePrompt: 'sharp, in focus, cluttered, text, low quality, dark, harsh',
    category: 'minimalist',
  },
  'abstract-smoke': {
    name: 'Smoke',
    prompt: 'ethereal smoke and mist background, flowing wisps of smoke, dramatic moody atmosphere, dark background with soft light, artistic and elegant',
    negativePrompt: 'bright, colorful, cluttered, text, low quality, harsh, fire',
    category: 'minimalist',
  },
  'abstract-neon': {
    name: 'Neon',
    prompt: 'vibrant neon lights background, glowing pink blue purple neon, cyberpunk atmosphere, dark background with colorful reflections, urban night aesthetic',
    negativePrompt: 'bright daylight, natural, cluttered, text, low quality, people',
    category: 'minimalist',
  },

  // ---- Minimalist ----
  'minimalist-clean': {
    name: 'Minimalist Clean',
    prompt: 'ultra minimalist clean background, single solid color surface, geometric simplicity, modern design, ample negative space, scandinavian aesthetic',
    negativePrompt: 'cluttered, busy, textured, patterns, objects, colorful, ornate',
    category: 'minimalist',
  },
  'minimalist-pastel': {
    name: 'Minimalist Pastel',
    prompt: 'soft pastel background, gentle gradient, light pink lavender mint tones, dreamy and airy, clean product photography, modern aesthetic',
    negativePrompt: 'dark, harsh, saturated, busy, cluttered, patterns, objects',
    category: 'minimalist',
  },

  // ---- Beauty ----
  'beauty-spa': {
    name: 'Spa',
    prompt: 'serene spa environment, zen stones, bamboo, soft towels, candles, water droplets, calming atmosphere, wellness and relaxation, natural materials',
    negativePrompt: 'cluttered, dirty, dark, industrial, urban, people, low quality',
    category: 'beauty',
  },
  'beauty-vanity': {
    name: 'Vanity',
    prompt: 'elegant vanity table setup, mirror with soft lighting, makeup brushes, luxurious beauty setting, feminine and glamorous, pink and gold tones',
    negativePrompt: 'messy, cluttered, dark, masculine, low quality, unrealistic',
    category: 'beauty',
  },
  'beauty-floral': {
    name: 'Floral',
    prompt: 'beautiful floral arrangement background, fresh flowers, roses peonies and eucalyptus, soft natural light, romantic and elegant, botanical setting',
    negativePrompt: 'dead flowers, wilted, dark, ugly, cluttered, low quality',
    category: 'beauty',
  },

  // ---- Moda Íntima ----
  'lingerie-boudoir': {
    name: 'Boudoir Romántico',
    prompt: 'Soft boudoir bedroom setting, pale blush pink silk sheets, scattered fresh rose petals, warm soft candlelight glow, sheer white curtains with gentle backlight filtering through, intimate and romantic atmosphere, low depth of field, high-end editorial fashion photography, feminine and sensual',
    negativePrompt: 'people, harsh light, cluttered, masculine, sport, office, low quality, artificial, bright white, cold tones',
    category: 'intimates',
  },
  'lingerie-silk': {
    name: 'Satén y Seda',
    prompt: 'Luxurious silk satin fabric background, blush pink and champagne cream tones, softly draped fabric with natural elegant folds, smooth and glossy texture, soft directional studio light from the side creating gentle highlights, intimate fashion product photography, elegant and sensual',
    negativePrompt: 'rough texture, cheap polyester look, harsh shadows, bright direct light, cluttered, people, distracting elements, cold blue tones',
    category: 'intimates',
  },
  'lingerie-vanity': {
    name: 'Tocador con Rosas',
    prompt: 'Elegant feminine vanity table with Hollywood mirror and warm soft globe bulbs, single red rose in crystal vase, scattered rose petals on polished surface, blush pink and champagne gold tones, romantic soft bokeh background, glamorous boudoir ambiance, fashion photography lighting',
    negativePrompt: 'makeup brushes, cosmetics, medicine, masculine, harsh light, cold tones, cluttered, dark, people, low quality',
    category: 'intimates',
  },

  // ---- Fragancias ----
  'fragrance-mirror': {
    name: 'Espejo Negro',
    prompt: 'Elegant polished black mirror reflective surface, luxury fragrance bottle photography, single soft spotlight from above creating perfect specular highlight, deep black background with crisp clean reflection below the product, premium perfume boutique aesthetic, dramatic high-contrast lighting, negative space on sides',
    negativePrompt: 'matte surface, dull, colorful, cluttered, fingerprints, scratches, people, text, logos, low quality, blurry reflection',
    category: 'fragrance',
  },
  'fragrance-garden': {
    name: 'Jardín Brumoso',
    prompt: 'Romantic misty garden at golden dawn, soft morning light filtering through gentle fog, delicate dew drops on rose petals, ethereal dreamlike atmosphere, blurred floral bokeh in background, pastel pinks and greens, luxury fragrance advertising photography, feminine and elegant',
    negativePrompt: 'harsh midday sun, dark night, ugly flowers, dead plants, dry, urban, buildings, people, text, cold tones, low quality',
    category: 'fragrance',
  },
  'fragrance-crystal': {
    name: 'Cristal y Luz',
    prompt: 'Luxury crystal prisms and cut glass elements creating rainbow light refraction effects, deep purple and sapphire blue background, scattered light dispersion forming colorful spectrum rays, high-end perfumery editorial photography, glamorous and otherworldly, dark and luminous simultaneously',
    negativePrompt: 'cheap plastic, dull, matte, cluttered, people, text, warm tones, daylight, natural outdoor, low quality',
    category: 'fragrance',
  },

  // ---- Joyería ----
  'jewelry-velvet-tray': {
    name: 'Bandeja de Joyería',
    prompt: 'Professional jewelry display on deep navy blue velvet tray, soft directional spotlight illuminating the piece from above-right, elegant retail jewelry photography, luxurious velvet texture visible in macro detail, clean dark background with subtle gradient, fine jewelry store aesthetic, negative space around the piece',
    negativePrompt: 'cheap display, plastic, bright colors, cluttered, multiple items, people, hands, price tags, text, messy, harsh flat lighting',
    category: 'jewelry',
  },
  'jewelry-dark-stone': {
    name: 'Piedra Oscura',
    prompt: 'Smooth polished dark charcoal grey granite stone surface, fine natural grain texture, elegant and minimal, soft side lighting creating subtle shadows that enhance the product, fine jewelry photography lighting, sophisticated and contemporary, negative space',
    negativePrompt: 'rough unfinished stone, cracked, bright colors, cluttered, people, price tags, text, low quality, warm tones',
    category: 'jewelry',
  },
  'jewelry-botanical': {
    name: 'Flatlay Botánico',
    prompt: 'Elegant overhead flatlay on white marble surface, delicate dried cotton flowers, small green eucalyptus sprigs, baby\'s breath florals arranged naturally around the product, soft diffused natural window light from the left, fine jewelry photography, modern minimalist botanical aesthetic, Instagram-ready composition',
    negativePrompt: 'harsh shadows, dark background, wilted flowers, dead plants, people, cluttered, price tags, synthetic flowers, low quality',
    category: 'jewelry',
  },

  // ---- Skincare ----
  'skincare-flatlay': {
    name: 'Flatlay Natural',
    prompt: 'Clean white linen textile flatlay with scattered eucalyptus leaves, dried lavender sprigs, smooth white river pebbles, and soft cotton bolls arranged organically around the product, soft diffused natural window light creating minimal shadows, clean organic skincare beauty photography, airy and fresh aesthetic, overhead composition',
    negativePrompt: 'harsh shadows, dark background, artificial materials, plastic, synthetic, cluttered, people, price tags, chemical lab look',
    category: 'skincare',
  },
  'skincare-terrazzo': {
    name: 'Terrazzo Pastel',
    prompt: 'Soft pastel pink terrazzo surface with small decorative stone flecks in cream and rose tones, modern clean beauty aesthetic, soft overhead diffused studio lighting, contemporary skincare product photography, fresh minimalist and playful, subtle shadow under product',
    negativePrompt: 'dark, harsh shadows, busy pattern, overwhelming texture, people, cluttered, old terrazzo, low quality, dull colors',
    category: 'skincare',
  },

  // ---- Seasonal ----
  'seasonal-christmas': {
    name: 'Christmas',
    prompt: 'festive Christmas setting, twinkling lights, pine branches, red and gold ornaments, warm cozy atmosphere, holiday photography, bokeh lights',
    negativePrompt: 'summer, beach, low quality, unrealistic, cluttered text',
    category: 'seasonal',
  },
  'seasonal-summer': {
    name: 'Summer',
    prompt: 'bright summer scene, sunshine, vibrant colors, tropical elements, fresh and energetic, poolside or outdoor setting, clear blue sky',
    negativePrompt: 'winter, snow, dark, cold, gloomy, people, low quality',
    category: 'seasonal',
  },
  'seasonal-valentines': {
    name: "Valentine's Day",
    prompt: "romantic Valentine's Day setting, soft pink and red tones, rose petals, hearts, gentle lighting, love and romance atmosphere, elegant",
    negativePrompt: 'dark, scary, cold tones, cluttered, low quality, text',
    category: 'seasonal',
  },
};

// ---------------------------------------------------------------------------
// Precise mode: Flux Kontext Pro with fallback to bg-remove + composite
// ---------------------------------------------------------------------------

/**
 * Generate a new background while keeping the product/subject exactly the same.
 * Uses Flux Kontext Pro first. If it gets flagged by NSFW filters (common with
 * lingerie/swimwear), falls back to bg-remove + solid color or generated background.
 *
 * @param imageUrl      - URL of the original product image.
 * @param stylePreset   - Key from BACKGROUND_PRESETS or a custom preset name.
 * @param customPrompt  - Optional override prompt (used instead of preset prompt).
 * @param aspectRatio   - Target aspect ratio (e.g. '1:1', '16:9'). Defaults to '1:1'.
 * @returns URL of the generated image.
 */
export async function generateBgPrecise(
  imageUrl: string,
  stylePreset: string,
  customPrompt?: string,
  aspectRatio: string = '1:1',
): Promise<string> {
  const preset = BACKGROUND_PRESETS[stylePreset];
  const bgPrompt = customPrompt || preset?.prompt || stylePreset;

  // Try Flux Kontext Pro first
  try {
    const fullPrompt = `CRITICAL PRODUCT PRESERVATION: Keep this EXACT product completely unchanged. Do NOT modify, redesign, replace, alter, or reimagine the product in any way. Every detail — shape, colors, labels, text, packaging, logo, texture — must remain pixel-perfect identical to the input image. The product is the ONLY element that must be preserved exactly as-is. ONLY change the background/environment around the product to: ${bgPrompt}. Do NOT alter the product shape, color, label, packaging, or any detail whatsoever.`;

    const output = await runModel('black-forest-labs/flux-kontext-pro', {
      input_image: imageUrl,
      prompt: fullPrompt,
      aspect_ratio: aspectRatio,
    });

    return await extractOutputUrl(output);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    const isFlagged = msg.includes('flagged as sensitive') || msg.includes('E005');

    if (!isFlagged) throw error;

    // Fallback: remove background with rembg, then composite onto new background
    console.log('[bg-generate] Kontext Pro flagged content, using bg-remove + composite fallback');
    return generateBgPreciseFallback(imageUrl, stylePreset, bgPrompt, aspectRatio);
  }
}

// Map style presets to solid hex colors for simple studio backgrounds
const STUDIO_COLORS: Record<string, string> = {
  'studio-white': '#FFFFFF',
  'studio-gray': '#808080',
  'studio-black': '#1A1A1A',
  'studio-gradient': '#E0E0E0',
  'studio-spotlight': '#0D0D0D',
};

// Parse aspect ratio string (e.g. "1:1", "4:5") into canvas dimensions
function aspectRatioToCanvas(aspectRatio: string, baseSize: number = 1024): { width: number; height: number } {
  const parts = aspectRatio.split(':').map(Number);
  const ratioW = parts[0] || 1;
  const ratioH = parts[1] || 1;

  if (ratioW >= ratioH) {
    return { width: baseSize, height: Math.round(baseSize * (ratioH / ratioW)) };
  }
  return { width: Math.round(baseSize * (ratioW / ratioH)), height: baseSize };
}

/**
 * Fallback for precise mode when Kontext Pro flags the content.
 * Removes the background with rembg, then composites onto a solid color
 * (for studio presets) or a generated background (for other presets).
 * The product is scaled to ~80% of the canvas and centered with padding.
 */
async function generateBgPreciseFallback(
  imageUrl: string,
  stylePreset: string,
  bgPrompt: string,
  aspectRatio: string,
): Promise<string> {
  // Step 1: Remove background using rembg (no content filter)
  const transparentUrl = await removeBgReplicate(imageUrl);

  // Step 2: Download the transparent image
  const { replicateHeaders } = await import('@/lib/utils/image');
  const transparentRes = await fetch(transparentUrl, { headers: replicateHeaders(transparentUrl) });
  if (!transparentRes.ok) throw new Error(`Failed to download transparent image: ${transparentRes.status}`);
  const transparentBuffer = Buffer.from(await transparentRes.arrayBuffer());

  // Step 3: Calculate canvas size from aspect ratio
  const canvas = aspectRatioToCanvas(aspectRatio, 1024);

  // Step 4: Resize product to fit ~80% of the canvas (padding on all sides)
  const productMaxW = Math.round(canvas.width * 0.80);
  const productMaxH = Math.round(canvas.height * 0.85);

  const resizedProduct = await sharp(transparentBuffer)
    .resize(productMaxW, productMaxH, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  // Get actual resized dimensions to center it
  const prodMeta = await sharp(resizedProduct).metadata();
  const prodW = prodMeta.width || productMaxW;
  const prodH = prodMeta.height || productMaxH;
  const left = Math.round((canvas.width - prodW) / 2);
  const top = Math.round((canvas.height - prodH) / 2);

  // Step 5: Determine background
  const solidColor = STUDIO_COLORS[stylePreset];

  if (solidColor) {
    // Simple composite onto solid color
    const r = parseInt(solidColor.slice(1, 3), 16);
    const g = parseInt(solidColor.slice(3, 5), 16);
    const b = parseInt(solidColor.slice(5, 7), 16);

    const resultBuffer = await sharp({
      create: { width: canvas.width, height: canvas.height, channels: 4, background: { r, g, b, alpha: 1 } },
    })
      .composite([{ input: resizedProduct, left, top }])
      .png()
      .toBuffer();

    return `data:image/png;base64,${resultBuffer.toString('base64')}`;
  }

  // For non-studio presets: generate background with Flux Schnell, then composite
  const bgOutput = await runModel('black-forest-labs/flux-schnell', {
    prompt: bgPrompt,
    aspect_ratio: aspectRatio,
    num_outputs: 1,
  });
  const bgUrl = await extractOutputUrl(bgOutput);

  // Download background and composite
  const bgRes = await fetch(bgUrl, { headers: replicateHeaders(bgUrl) });
  if (!bgRes.ok) throw new Error(`Failed to download generated background: ${bgRes.status}`);
  const bgBuffer = Buffer.from(await bgRes.arrayBuffer());

  // Resize background to match canvas
  const resizedBg = await sharp(bgBuffer).resize(canvas.width, canvas.height, { fit: 'cover' }).png().toBuffer();

  const resultBuffer = await sharp(resizedBg)
    .composite([{ input: resizedProduct, left, top }])
    .png()
    .toBuffer();

  return `data:image/png;base64,${resultBuffer.toString('base64')}`;
}

// ---------------------------------------------------------------------------
// Creative mode: Flux Dev (full prompt-based generation)
// ---------------------------------------------------------------------------

/**
 * Generate a completely new product scene using Flux Dev.
 * Best for creating fully AI-generated product photography with custom styling.
 *
 * @param productDescription - Text description of the product.
 * @param stylePreset        - Key from BACKGROUND_PRESETS.
 * @param customPrompt       - Optional additional prompt instructions.
 * @param aspectRatio        - Target aspect ratio. Defaults to '1:1'.
 * @returns URL of the generated image.
 */
export async function generateBgCreative(
  productDescription: string,
  stylePreset: string,
  customPrompt?: string,
  aspectRatio: string = '1:1',
): Promise<string> {
  const preset = BACKGROUND_PRESETS[stylePreset];
  const bgPrompt = customPrompt || preset?.prompt || stylePreset;
  const negativePrompt = preset?.negativePrompt || 'blurry, low quality, distorted, ugly';

  const fullPrompt = `Professional product photography of ${productDescription}. Background: ${bgPrompt}. Studio quality, sharp focus, beautiful lighting, commercial photography, 8k, high resolution.`;

  const output = await runModel('black-forest-labs/flux-dev', {
    prompt: fullPrompt,
    negative_prompt: negativePrompt,
    aspect_ratio: aspectRatio,
    num_outputs: 1,
  });

  return await extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Fast mode: Flux Schnell ($0.003 per generation)
// ---------------------------------------------------------------------------

/**
 * Fast background generation using Flux Schnell + composite approach.
 * When an imageUrl is provided, removes the background first, then generates
 * a new background and composites the original product on top to guarantee
 * the product is never altered. Falls back to pure generation if no image.
 *
 * @param prompt      - Full prompt for the background/scene.
 * @param aspectRatio - Target aspect ratio. Defaults to '1:1'.
 * @param imageUrl    - Optional product image URL. When provided, the product is composited onto the new background.
 * @returns URL of the generated image.
 */
export async function generateBgFast(
  prompt: string,
  aspectRatio: string = '1:1',
  imageUrl?: string,
): Promise<string> {
  // Generate the background with Flux Schnell
  const output = await runModel('black-forest-labs/flux-schnell', {
    prompt,
    aspect_ratio: aspectRatio,
    num_outputs: 1,
  });
  const bgUrl = await extractOutputUrl(output);

  // If no product image, return background-only (preview mode)
  if (!imageUrl) return bgUrl;

  // Composite approach: remove bg from product, then composite onto new background
  // This guarantees the product is NEVER altered — we use the original product pixels
  try {
    const transparentUrl = await removeBgReplicate(imageUrl);
    const { replicateHeaders } = await import('@/lib/utils/image');

    const [transparentRes, bgRes] = await Promise.all([
      fetch(transparentUrl, { headers: replicateHeaders(transparentUrl) }),
      fetch(bgUrl, { headers: replicateHeaders(bgUrl) }),
    ]);
    if (!transparentRes.ok) throw new Error(`Failed to download transparent product: ${transparentRes.status}`);
    if (!bgRes.ok) throw new Error(`Failed to download generated background: ${bgRes.status}`);

    const [transparentBuffer, bgBuffer] = await Promise.all([
      transparentRes.arrayBuffer().then(Buffer.from),
      bgRes.arrayBuffer().then(Buffer.from),
    ]);

    const canvas = aspectRatioToCanvas(aspectRatio, 1024);
    const productMaxW = Math.round(canvas.width * 0.80);
    const productMaxH = Math.round(canvas.height * 0.85);

    const resizedProduct = await sharp(transparentBuffer)
      .resize(productMaxW, productMaxH, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();

    const prodMeta = await sharp(resizedProduct).metadata();
    const prodW = prodMeta.width || productMaxW;
    const prodH = prodMeta.height || productMaxH;
    const left = Math.round((canvas.width - prodW) / 2);
    const top = Math.round((canvas.height - prodH) / 2);

    const resizedBg = await sharp(bgBuffer).resize(canvas.width, canvas.height, { fit: 'cover' }).png().toBuffer();

    const resultBuffer = await sharp(resizedBg)
      .composite([{ input: resizedProduct, left, top }])
      .png()
      .toBuffer();

    return `data:image/png;base64,${resultBuffer.toString('base64')}`;
  } catch (err) {
    // If composite fails, return background-only rather than crashing
    console.warn('[bg-generate] Fast mode composite failed, returning background only:', err);
    return bgUrl;
  }
}

// ---------------------------------------------------------------------------
// Composite product onto generated background
// ---------------------------------------------------------------------------

/**
 * Download a product image and a background image, then composite the product
 * on top of the background at a specified position and scale.
 *
 * @param productUrl    - URL of the product image (should have transparent background).
 * @param backgroundUrl - URL of the generated background image.
 * @param position      - Optional positioning: x/y as fraction (0-1), scale relative to background.
 * @returns A Buffer containing the composited PNG.
 */
export async function compositeProductOnBackground(
  productUrl: string,
  backgroundUrl: string,
  position?: CompositePosition,
): Promise<Buffer> {
  // Download both images in parallel
  const [productResponse, backgroundResponse] = await Promise.all([
    fetch(productUrl),
    fetch(backgroundUrl),
  ]);

  if (!productResponse.ok) {
    throw new Error(`Failed to download product image: ${productResponse.status}`);
  }
  if (!backgroundResponse.ok) {
    throw new Error(`Failed to download background image: ${backgroundResponse.status}`);
  }

  const [productArrayBuffer, backgroundArrayBuffer] = await Promise.all([
    productResponse.arrayBuffer(),
    backgroundResponse.arrayBuffer(),
  ]);

  const productBuffer = Buffer.from(productArrayBuffer);
  const backgroundBuffer = Buffer.from(backgroundArrayBuffer);

  // Get background dimensions
  const bgMeta = await sharp(backgroundBuffer).metadata();
  const bgWidth = bgMeta.width || 1024;
  const bgHeight = bgMeta.height || 1024;

  // Default position: centered, scaled to 70% of background
  const pos: CompositePosition = {
    x: position?.x ?? 0.5,
    y: position?.y ?? 0.5,
    scale: position?.scale ?? 0.7,
  };

  // Resize product to fit within the background at the given scale
  const targetProductWidth = Math.round(bgWidth * pos.scale);
  const targetProductHeight = Math.round(bgHeight * pos.scale);

  const resizedProduct = await sharp(productBuffer)
    .resize(targetProductWidth, targetProductHeight, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  // Get actual dimensions after resize
  const productMeta = await sharp(resizedProduct).metadata();
  const prodWidth = productMeta.width || targetProductWidth;
  const prodHeight = productMeta.height || targetProductHeight;

  // Calculate top-left corner based on center position
  const left = Math.round(bgWidth * pos.x - prodWidth / 2);
  const top = Math.round(bgHeight * pos.y - prodHeight / 2);

  // Composite product onto background
  return sharp(backgroundBuffer)
    .composite([
      {
        input: resizedProduct,
        left: Math.max(0, left),
        top: Math.max(0, top),
      },
    ])
    .png()
    .toBuffer();
}
