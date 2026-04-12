// =============================================================================
// Video Motion Presets - UniStudio
// Expanded presets for product, fashion, and avatar video categories.
// =============================================================================

import type { VideoPreset, VideoCategory } from '@/types/video';

// ---------------------------------------------------------------------------
// Product Presets
// ---------------------------------------------------------------------------

const PRODUCT_PRESETS: VideoPreset[] = [
  {
    id: 'product-rotate',
    name: 'Rotacion 360',
    description: 'Tu producto gira 360° en turntable con luz de estudio profesional. Ideal para cualquier producto de catálogo.',
    promptTemplate:
      'Smooth slow 360-degree rotation of this product on a clean neutral turntable, camera orbits at product eye-level maintaining perfect framing, soft diffused studio lighting with subtle fill light from left and key light from upper right, clean seamless background, crisp reflection on the surface below, professional product photography quality, commercial advertisement, cinematic, 4K',
    category: 'product',
    icon: 'RotateCw',
    recommended: ['wan-2.2-fast', 'kling-2.6'],
  },
  {
    id: 'product-zoom',
    name: 'Zoom Detalle',
    description: 'Acercamiento dramático revelando los detalles y textura del producto. Ideal para texturas de tela, joyería y acabados finos.',
    promptTemplate:
      'Slow cinematic push-in zoom toward the product, starting from medium shot gliding smoothly to extreme close-up revealing fine texture and craftsmanship details, shallow depth of field with soft bokeh background, single soft key light from upper right creating elegant highlights and shadows, neutral studio background, macro photography quality, smooth camera motion, 4K cinematic, commercial advertisement quality',
    category: 'product',
    icon: 'ZoomIn',
    recommended: ['ltx-video', 'wan-2.2-fast'],
  },
  {
    id: 'camera-orbit',
    name: 'Orbita Camara',
    description: 'La cámara orbita 180° alrededor del producto mostrando todos los ángulos. Ideal para productos con diseño en 3D o múltiples caras.',
    promptTemplate:
      'Camera slowly orbits 180 degrees around the centered product in a smooth continuous arc, product stays perfectly centered and sharp throughout, professional three-point studio lighting maintaining consistent illumination from all angles, neutral gradient background, smooth cinematic camera movement, 3D product showcase quality, 4K, commercial advertisement',
    category: 'product',
    icon: 'Orbit',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'product-reveal',
    name: 'Reveal Dramatico',
    description: 'El producto emerge dramáticamente desde la oscuridad con luz cinematográfica de lujo. Ideal para lanzamientos premium y hero sections.',
    promptTemplate:
      'Dramatic product reveal from deep shadow, single spotlight beam gradually illuminates the product from directly above creating theatrical lighting, product emerges fully into view as the light expands, dark cinematic background fading to pure black, volumetric light rays visible, luxury product launch commercial feel, suspenseful to glamorous transition, 4K, high-end advertisement quality',
    category: 'product',
    icon: 'Sparkles',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'product-unboxing',
    name: 'Unboxing',
    description: 'Una caja premium se abre revelando el producto en su interior. Ideal para productos de regalo y packaging especial.',
    promptTemplate:
      'Premium unboxing experience filmed from slight overhead angle, elegant box lid slowly opens to reveal the product nestled in tissue paper or velvet interior, warm spotlight from above illuminates the reveal moment, clean premium packaging, satisfying and luxurious reveal, top-down perspective with slight tilt, luxury brand presentation quality, 4K, commercial',
    category: 'product',
    icon: 'PackageOpen',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'product-lifestyle',
    name: 'Lifestyle',
    description: 'El producto en su contexto natural de uso con luz ambiente cálida. Ideal para productos del hogar, cosméticos y accesorios.',
    promptTemplate:
      'Product being used or displayed naturally in a real-world lifestyle setting, smooth natural camera movement, warm ambient lighting creating cozy atmosphere, authentic and aspirational environment, soft natural window light from one side, cinematic depth of field with soft bokeh background, lifestyle product photography, organic genuine feel, 4K cinematic',
    category: 'product',
    icon: 'Clapperboard',
    recommended: ['wan-2.2-fast', 'kling-2.6'],
  },
  {
    id: 'product-float',
    name: 'Flotante',
    description: 'Tu producto levita en el aire con partículas de luz mágicas alrededor. Ideal para perfumes, cremas y productos premium.',
    promptTemplate:
      'Product floating and slowly rotating in mid-air, gentle anti-gravity levitation effect, dreamy soft bokeh dark background, fine particles of golden light and dust floating gently around it, single dramatic overhead spotlight creating theatrical shadows below, dark luxury background fading to black, magical gravity-defying elegant showcase, smooth slow motion, 4K cinematic quality',
    category: 'product',
    icon: 'Cloud',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'product-splash',
    name: 'Splash/Agua',
    description: 'El producto emerge de un splash dinámico de agua congelado en alta velocidad. Ideal para skincare, bebidas y cosméticos frescos.',
    promptTemplate:
      'Product surrounded by dynamic water splash explosion, clear liquid droplets frozen in time like high-speed photography capturing the exact moment of impact, fresh clean water catching studio light with brilliant sparkle effects, bright clean white or light blue background, product stays perfectly sharp and in focus at center, fresh and pure aesthetic, commercial product photography, 4K, high-speed water effect',
    category: 'product',
    icon: 'Droplets',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  // ── Fragrance ──
  {
    id: 'fragrance-spin',
    name: 'Perfume 360°',
    description: 'El frasco gira suavemente sobre superficie reflectante oscura con luz de borde elegante. Ideal para fragancias y perfumes.',
    promptTemplate:
      'Luxury perfume bottle performing a smooth elegant 360-degree rotation on a polished obsidian-black reflective surface, dramatic rim lighting creating bright specular highlights that outline the glass bottle contours, the reflection below is crisp and mirror-perfect, dark gradient background fading to pure black, single key light from upper left, cinematic fragrance commercial quality, 4K, luxury advertisement',
    category: 'product',
    icon: 'Wind',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'fragrance-reveal',
    name: 'Perfume Reveal',
    description: 'El perfume emerge dramáticamente de niebla y humo dorado con luz volumétrica. Ideal para perfumes de lujo y fragancias exclusivas.',
    promptTemplate:
      'Luxury perfume bottle dramatically revealed as golden mist and smoke slowly part from center frame, volumetric light beams cutting through the dispersing mist, the bottle appears gleaming and pristine in the clearing smoke, dark atmospheric background, warm golden backlighting creating a halo effect, fine particles of light floating gently in the air, cinematic luxury fragrance advertisement, 4K quality',
    category: 'product',
    icon: 'Flame',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'fragrance-luxury-spin',
    name: 'Giro de Lujo',
    description: 'Rotación premium con barrido de luz dorada y partículas flotantes. Para la presentación más elegante de tu fragancia.',
    promptTemplate:
      'Luxury perfume bottle performing slow elegant 360-degree rotation on polished black reflective surface, dramatic rim lighting creating sharp specular highlights on glass surfaces, golden light sweep moving across the bottle revealing its form and craftsmanship, fine particles of light floating gently in foreground depth, the reflection below is perfect and crisp, dark cinematic background, professional fragrance commercial quality, 4K',
    category: 'product',
    icon: 'Orbit',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'fragrance-mist',
    name: 'Efecto Bruma',
    description: 'El spray del perfume crea una nube etérea con retroiluminación dramática. Ideal para capturar la esencia y el lujo de la fragancia.',
    promptTemplate:
      'Perfume bottle with ethereal mist and spray particles slowly rising and dispersing upward from the nozzle, dramatic backlight illuminating the mist from behind creating a luminous glowing halo effect, volumetric god rays visible through the spray cloud, dark moody atmospheric background, the spray cloud catches and beautifully scatters the light, luxury fragrance advertising quality, 4K cinematic',
    category: 'product',
    icon: 'Cloud',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'fragrance-gift-reveal',
    name: 'Revelacion de Regalo',
    description: 'Una caja de regalo elegante se abre revelando el perfume en terciopelo. Ideal para campañas navideñas y de regalo.',
    promptTemplate:
      'Elegant luxury gift box slowly opening from the top, velvet interior cradles the perfume bottle perfectly, warm golden spotlight from directly above illuminates the unboxing moment beautifully, box lid rises gracefully in slow motion revealing the treasure nestled inside, premium tissue paper, anticipation building to luxurious reveal, cinematic gift-giving moment, 4K commercial quality',
    category: 'product',
    icon: 'PackageOpen',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  // ── Jewelry ──
  {
    id: 'jewelry-sparkle',
    name: 'Joya Brillante',
    description: 'Macro extremo de la joya con destellos y reflejos de luz en movimiento. Ideal para anillos, collares y accesorios con metal o piedras.',
    promptTemplate:
      'Extreme macro close-up of jewelry piece, camera slowly orbiting very close to the surface, studio light creating brilliant sparkle flare effects on metal surfaces and stone facets, dark velvet or deep black background, fine surface details and engravings clearly visible, light catching the piece from multiple angles creating rainbow refractions and lens flares, luxury jewelry photography quality, 4K',
    category: 'product',
    icon: 'Star',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'jewelry-float',
    name: 'Joya Flotante',
    description: 'La joya levita y gira lentamente con luz teatral sobre fondo oscuro de lujo. Ideal para collares, pulseras y anillos premium.',
    promptTemplate:
      'Jewelry piece floating and slowly rotating in mid-air, dramatic single spotlight from directly above creating theatrical shadows below, fine particles of light and gold dust floating gently around it, deep black luxury background, the jewelry catches and scatters the spotlight into brilliant refractions, slow graceful rotation revealing all facets, luxury jewelry commercial quality, 4K cinematic',
    category: 'product',
    icon: 'Gem',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'jewelry-light-sweep',
    name: 'Barrido de Luz',
    description: 'Un haz de luz atraviesa la joya revelando progresivamente el brillo del metal. Ideal para acero inoxidable, plata y oro.',
    promptTemplate:
      'Dramatic directional light sweep slowly moving across the polished metal jewelry surface from left to right, the moving light progressively reveals the metallic sheen and mirror-like reflections as it passes, dark elegant background, macro shot showing fine surface texture and polish, the reflection is crisp and theatrical, jewelry product photography quality, 4K',
    category: 'product',
    icon: 'Sparkles',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'jewelry-chain-drop',
    name: 'Caida de Cadena',
    description: 'Una cadena metálica cae en cámara lenta sobre terciopelo oscuro con efecto satisfactorio. Ideal para cadenas y pulseras.',
    promptTemplate:
      'Stainless steel or gold chain dropping gracefully in elegant slow motion, the chain falls from above frame and lands in a natural coil on dark velvet surface below, the metallic links catch studio light with brilliant reflections as they fall and settle, satisfying tactile quality to the movement, black velvet background, macro jewelry commercial quality, 4K slow motion',
    category: 'product',
    icon: 'Droplets',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'jewelry-on-model',
    name: 'En Modelo',
    description: 'La joya luce en una persona real con movimiento natural y luz suave en la piel. Ideal para joyas que se llevan puestas.',
    promptTemplate:
      'Close-up shot of person naturally wearing this jewelry piece, subtle natural body movement, soft diffused lighting creating beautiful warm skin tones and highlighting the jewelry, the piece is clearly in focus while the background softly blurs into bokeh, skin and jewelry complement each other beautifully, natural lifestyle jewelry photography quality, 4K',
    category: 'product',
    icon: 'User',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  // ── Skincare ──
  {
    id: 'skincare-texture',
    name: 'Textura Crema',
    description: 'Close-up de la textura cremosa del producto siendo revelada con luz suave. Ideal para cremas, serums y productos de textura visible.',
    promptTemplate:
      'Extreme close-up of skincare product texture, smooth cream or serum being slowly revealed or gently disturbed, the texture has beautiful visual depth and rich creaminess, clean spa-like white or neutral background, soft diffused natural lighting from above creating a gentle sheen, the product surface has a luxurious and appealing texture, zen and pure aesthetic, macro beauty photography, 4K',
    category: 'product',
    icon: 'Layers',
    recommended: ['ltx-video', 'wan-2.2-fast'],
  },
  {
    id: 'skincare-splash',
    name: 'Skincare Splash',
    description: 'El producto rodeado de gotas de agua pura en efecto de alta velocidad. Ideal para productos frescos e hidratantes.',
    promptTemplate:
      'Skincare product with fresh water splash explosion surrounding it, clear water droplets frozen in high-speed photography moment, droplets catching studio light with brilliant sparkle effects, bright clean white or aqua background, product remains perfectly sharp and in focus at center, fresh and pure hydrating aesthetic, product hero shot quality, 4K commercial',
    category: 'product',
    icon: 'Waves',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'skincare-application',
    name: 'Textura en Piel',
    description: 'Crema siendo aplicada suavemente en piel radiante mostrando textura y absorción. Ideal para mostrar la calidad del producto.',
    promptTemplate:
      'Extreme close-up of smooth skincare cream being gently applied and blended onto glowing healthy skin, the cream spreads beautifully showing its silky luxurious texture as it absorbs, soft natural window light creating warm flattering skin tones, satisfying smooth application motion, fresh clean beauty aesthetic, the skin appears radiant and healthy, 4K beauty photography quality',
    category: 'product',
    icon: 'Layers',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'skincare-water-fresh',
    name: 'Efecto Frescura',
    description: 'Gotas de agua fresca ruedan y rebotan sobre el producto con efecto refrescante. Ideal para tónicos, hidratantes y productos acuosos.',
    promptTemplate:
      'Skincare product with fresh water droplets rolling, bouncing and splashing on its surface in slow motion, clean pure water catching studio light with sparkle and rainbow refraction effects, droplets bead and roll beautifully on the surface, bright fresh spa atmosphere, pure and clean aesthetic, product hero shot quality, 4K macro commercial',
    category: 'product',
    icon: 'Waves',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'skincare-ingredients',
    name: 'Ingrediente Estrella',
    description: 'El producto rodeado de ingredientes naturales flotando suavemente alrededor. Ideal para productos orgánicos y naturales.',
    promptTemplate:
      'Skincare product centered and surrounded by gently floating natural ingredients in zero gravity, eucalyptus leaves, sliced citrus fruits, flower petals, green botanicals all slowly drifting gracefully around the product, soft natural daylight from above, white or light neutral clean background, organic natural beauty aesthetic, 4K commercial quality',
    category: 'product',
    icon: 'Sparkles',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
];

// ---------------------------------------------------------------------------
// Fashion Presets
// ---------------------------------------------------------------------------

const FASHION_PRESETS: VideoPreset[] = [
  {
    id: 'fashion-walk',
    name: 'Pasarela',
    description: 'La modelo camina con confianza mostrando la prenda en movimiento real. Ideal para ropa de todo tipo, especialmente outerwear.',
    promptTemplate:
      'Fashion model walking confidently forward on a clean runway or studio floor, the clothing moves naturally with each step showing drape and fit perfectly, professional studio lighting with soft key light from front-left, white or neutral background, camera at mid-body level following the stride, editorial fashion photography quality, elegant confident walk, 4K',
    category: 'fashion',
    icon: 'Footprints',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'fashion-pose',
    name: 'Pose Elegante',
    description: 'La modelo posa con movimiento sutil: giro de cabeza, viento en el pelo y expresión segura. Ideal para prendas de lujo y editorial.',
    promptTemplate:
      'Fashion model striking elegant editorial poses with subtle natural movement, gentle breeze causing hair and fabric to flow softly, professional studio three-point lighting creating flattering shadows and highlights, the clothing details are clearly visible, confident and sophisticated expression, editorial fashion photography style, camera at slight flattering angle, 4K quality',
    category: 'fashion',
    icon: 'User',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'fashion-lookbook',
    name: 'Lookbook',
    description: 'La modelo gira lentamente mostrando la prenda desde el frente y la espalda. Ideal para lookbooks y catálogos de temporada.',
    promptTemplate:
      'Fashion model slowly rotating to show the outfit from front to three-quarter to back views, clean white or light neutral studio background, soft professional studio lighting that flatters both the clothing and skin tone, movement is graceful and deliberate, the garment cut and construction clearly visible from all angles, lookbook editorial photography style, 4K',
    category: 'fashion',
    icon: 'BookOpen',
    recommended: ['wan-2.5', 'kling-2.6'],
  },
  {
    id: 'fashion-detail',
    name: 'Detalle Tela',
    description: 'Macro de la textura de la tela y los detalles de costura en movimiento lento. Ideal para prendas con tejido especial o artesanía.',
    promptTemplate:
      'Close-up macro of fabric texture and garment details with gentle natural movement, the fabric drapes and shifts slightly revealing its weight and luxurious quality, studio lighting grazing across the textile surface at low angle to reveal texture depth and weave pattern, shallow depth of field, fine stitching and finishing details clearly visible, macro fashion photography quality, 4K',
    category: 'fashion',
    icon: 'Scan',
    recommended: ['ltx-video', 'wan-2.2-fast'],
  },
  {
    id: 'fashion-lifestyle',
    name: 'Street Style',
    description: 'La modelo en una calle urbana real con luz natural y movimiento casual auténtico. Ideal para ropa casual y streetwear.',
    promptTemplate:
      'Fashion model walking casually in an urban street or city environment, natural sunlight or warm golden hour light, candid photography feel with authentic natural movement, city architecture in soft bokeh background, the clothing looks naturally integrated into real life, street style fashion photography quality, handheld camera feel, 4K',
    category: 'fashion',
    icon: 'MapPin',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'fashion-lingerie',
    name: 'Lenceria',
    description: 'Modelo posa con elegancia bajo luz romántica y suave con movimiento sutil. Ideal para lencería y ropa interior premium.',
    promptTemplate:
      'Elegant model posing gracefully in lingerie, soft romantic lighting from a single side light source creating beautiful shadow and sculptural form, tasteful and sophisticated composition, the garment details including lace, silk and embroidery are clearly visible, luxurious studio backdrop in cream or deep tone, subtle natural movement, high-end intimate apparel photography quality, 4K',
    category: 'fashion',
    icon: 'Heart',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'lingerie-360',
    name: 'Lenceria 360° (Frente + Espalda)',
    description: 'Video mostrando la prenda desde el frente hasta la espalda con transición suave. Ideal para ver ambas vistas de lencería.',
    promptTemplate:
      'Model wearing lingerie smoothly transitioning from full front view to full back view, the camera orbits elegantly or the model slowly turns, soft romantic studio lighting maintaining flattering illumination throughout the transition, tasteful and sophisticated, both front and back garment designs clearly visible, clean neutral backdrop, luxury lingerie brand photography quality, 4K',
    category: 'fashion',
    icon: 'RefreshCw',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'lingerie-fabric-flow',
    name: 'Movimiento de Tela',
    description: 'La tela delicada fluye y ondula en cámara lenta mostrando su calidad y suavidad. Ideal para seda, encaje y tejidos delicados.',
    promptTemplate:
      'Delicate lingerie fabric flowing and draping beautifully in slow motion, silk and lace catching soft romantic side lighting with shimmering highlights and translucent glow, the fabric lightness and premium quality evident in how it moves and drapes, intimate and elegant atmosphere, soft focused background, lace texture and embroidery details clearly visible, slow motion luxury fashion quality, 4K',
    category: 'fashion',
    icon: 'Wind',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'lingerie-lifestyle',
    name: 'Estilo de Vida',
    description: 'Mujer en lencería en ambiente natural cómodo con luz matinal cálida y movimiento confiado. Para lifestyle elegante.',
    promptTemplate:
      'Woman wearing lingerie in a natural comfortable lifestyle setting, elegant bedroom or dressing room environment, warm soft morning golden light streaming through sheer curtains, natural confident and comfortable movement, the setting feels authentic and aspirational, tasteful and editorial composition, warm inviting color palette, lifestyle intimate apparel photography quality, 4K',
    category: 'fashion',
    icon: 'Heart',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
];

// ---------------------------------------------------------------------------
// Avatar Presets (used as starting prompts for talking head)
// ---------------------------------------------------------------------------

const AVATAR_PRESETS: VideoPreset[] = [
  {
    id: 'avatar-presenter',
    name: 'Presentador',
    description: 'Un presentador profesional habla directo a cámara sobre tu producto. Ideal para demos y presentaciones de producto.',
    promptTemplate: 'Professional product presenter talking directly to camera, confident and clear delivery, professional studio background',
    category: 'avatar',
    icon: 'Mic',
  },
  {
    id: 'avatar-review',
    name: 'Review',
    description: 'Una persona auténtica da una reseña amigable y sincera de tu producto. Ideal para reseñas y testimonios en redes sociales.',
    promptTemplate: 'Authentic product review style, casual and friendly tone, honest and relatable delivery, natural home or lifestyle background',
    category: 'avatar',
    icon: 'Star',
  },
  {
    id: 'avatar-tutorial',
    name: 'Tutorial',
    description: 'Un instructor explica paso a paso cómo usar tu producto de forma educativa. Ideal para tutoriales y guías de uso.',
    promptTemplate: 'Tutorial style educational delivery, clear step-by-step explanation of how to use the product, helpful and informative tone',
    category: 'avatar',
    icon: 'GraduationCap',
  },
  {
    id: 'avatar-ad',
    name: 'Anuncio',
    description: 'Un presentador energético hace el pitch de tu producto estilo comercial. Ideal para ads de redes sociales y campañas.',
    promptTemplate: 'Commercial advertisement style delivery, energetic and persuasive tone, compelling call to action, upbeat and engaging',
    category: 'avatar',
    icon: 'Megaphone',
  },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const ALL_PRESETS: VideoPreset[] = [
  ...PRODUCT_PRESETS,
  ...FASHION_PRESETS,
  ...AVATAR_PRESETS,
];

export function getPresetsForCategory(category: VideoCategory): VideoPreset[] {
  return ALL_PRESETS.filter((p) => p.category === category);
}

export function getPresetById(id: string): VideoPreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}

export { PRODUCT_PRESETS, FASHION_PRESETS, AVATAR_PRESETS };
