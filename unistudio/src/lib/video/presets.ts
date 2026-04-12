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
    description: 'Rotacion suave del producto en turntable',
    promptTemplate:
      'Smooth 360-degree rotation of the product, spinning slowly on a turntable, professional product showcase, studio lighting, clean background',
    category: 'product',
    icon: 'RotateCw',
    recommended: ['wan-2.2-fast', 'kling-2.6'],
  },
  {
    id: 'product-zoom',
    name: 'Zoom Detalle',
    description: 'Zoom cinematico a los detalles del producto',
    promptTemplate:
      'Slow cinematic zoom into the product details, revealing texture and craftsmanship, professional macro photography, shallow depth of field',
    category: 'product',
    icon: 'ZoomIn',
    recommended: ['ltx-video', 'wan-2.2-fast'],
  },
  {
    id: 'camera-orbit',
    name: 'Orbita Camara',
    description: 'La camara orbita alrededor del producto',
    promptTemplate:
      'Camera slowly orbits around the product, smooth cinematic movement, product stays centered, professional studio lighting, 3D showcase',
    category: 'product',
    icon: 'Orbit',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'product-reveal',
    name: 'Reveal Dramatico',
    description: 'El producto aparece con efecto dramatico',
    promptTemplate:
      'Dramatic product reveal, appearing from shadow or curtain, cinematic lighting transition, suspenseful to glamorous, professional product launch',
    category: 'product',
    icon: 'Sparkles',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'product-unboxing',
    name: 'Unboxing',
    description: 'Experiencia de unboxing premium',
    promptTemplate:
      'Premium unboxing experience, box opening to reveal the product, satisfying packaging, top-down view, clean hands, luxury presentation',
    category: 'product',
    icon: 'PackageOpen',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'product-lifestyle',
    name: 'Lifestyle',
    description: 'Producto en un escenario de uso real',
    promptTemplate:
      'Product being used naturally in a lifestyle setting, smooth natural movement, warm ambient lighting, cinematic atmosphere, real-world context',
    category: 'product',
    icon: 'Clapperboard',
    recommended: ['wan-2.2-fast', 'kling-2.6'],
  },
  {
    id: 'product-float',
    name: 'Flotante',
    description: 'Producto flotando con efecto magico',
    promptTemplate:
      'Product floating in mid-air with gentle rotation, dreamy atmosphere, soft particles of light, studio background, gravity-defying elegant showcase',
    category: 'product',
    icon: 'Cloud',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'product-splash',
    name: 'Splash/Agua',
    description: 'Producto con efecto de agua o liquido',
    promptTemplate:
      'Product with dynamic water splash effect, liquid motion around the item, fresh and clean vibe, high-speed photography look, studio lighting',
    category: 'product',
    icon: 'Droplets',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  // ── Fragrance ──
  {
    id: 'fragrance-spin',
    name: 'Perfume 360°',
    description: 'Rotacion elegante de frasco de perfume',
    promptTemplate:
      'Luxury perfume bottle performing a slow elegant 360-degree rotation on a reflective dark surface, dramatic rim lighting, particles of light, cinematic fragrance commercial',
    category: 'product',
    icon: 'Wind',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'fragrance-reveal',
    name: 'Perfume Reveal',
    description: 'Perfume emerge del humo dorado',
    promptTemplate:
      'Dramatic slow reveal of a perfume bottle emerging from golden mist and smoke, luxury advertising, volumetric lighting',
    category: 'product',
    icon: 'Flame',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'fragrance-luxury-spin',
    name: 'Giro de Lujo',
    description: 'Rotacion premium con luz espectacular',
    promptTemplate:
      'Luxury perfume bottle performing slow elegant 360-degree rotation on polished black reflective surface, dramatic rim lighting creating specular highlights on glass, golden light sweep, particles of light floating, cinematic fragrance commercial',
    category: 'product',
    icon: 'Orbit',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'fragrance-mist',
    name: 'Efecto Bruma',
    description: 'Perfume con niebla eterea y particulas',
    promptTemplate:
      'Perfume bottle with ethereal mist and spray particles rising and floating around it, dramatic backlight through the mist, luxury fragrance advertising, dark moody atmosphere, volumetric lighting',
    category: 'product',
    icon: 'Cloud',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'fragrance-gift-reveal',
    name: 'Revelacion de Regalo',
    description: 'Caja elegante abriendo para revelar perfume',
    promptTemplate:
      'Elegant gift box slowly opening to reveal a luxury perfume bottle nestled in velvet tissue paper, warm spotlight, anticipation reveal moment, premium unboxing experience',
    category: 'product',
    icon: 'PackageOpen',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  // ── Jewelry ──
  {
    id: 'jewelry-sparkle',
    name: 'Joya Brillante',
    description: 'Macro de joya con destellos de luz',
    promptTemplate:
      'Extreme macro close-up of jewelry piece with light reflections creating sparkle effects, slow camera orbit, dark velvet background, fine detail visible',
    category: 'product',
    icon: 'Star',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'jewelry-float',
    name: 'Joya Flotante',
    description: 'Joya flotando con luz dramatica',
    promptTemplate:
      'Jewelry piece floating and slowly rotating in mid-air with dramatic spotlight, particles of light, dark luxury background',
    category: 'product',
    icon: 'Gem',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'jewelry-light-sweep',
    name: 'Barrido de Luz',
    description: 'Luz dramatica revelando el brillo del metal',
    promptTemplate:
      'Dramatic directional light sweep slowly crossing polished stainless steel jewelry surface, revealing metallic sheen and reflections, dark background, macro jewelry photography',
    category: 'product',
    icon: 'Sparkles',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'jewelry-chain-drop',
    name: 'Caida de Cadena',
    description: 'Cadena de acero cayendo en camara lenta',
    promptTemplate:
      'Stainless steel chain dropping and landing gracefully in slow motion onto dark velvet surface, satisfying metallic sound moment, jewelry commercial',
    category: 'product',
    icon: 'Droplets',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'jewelry-on-model',
    name: 'En Modelo',
    description: 'Joya puesta en persona con movimiento natural',
    promptTemplate:
      'Close-up of person wearing this jewelry piece, natural subtle movement, soft lighting on skin, jewelry detail clearly visible, lifestyle jewelry photography',
    category: 'product',
    icon: 'User',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  // ── Skincare ──
  {
    id: 'skincare-texture',
    name: 'Textura Crema',
    description: 'Close-up de textura del producto',
    promptTemplate:
      'Close-up of skincare product with smooth cream texture being revealed, clean spa aesthetic, soft natural lighting, zen atmosphere',
    category: 'product',
    icon: 'Layers',
    recommended: ['ltx-video', 'wan-2.2-fast'],
  },
  {
    id: 'skincare-splash',
    name: 'Skincare Splash',
    description: 'Producto con gotas de agua pura',
    promptTemplate:
      'Skincare product with fresh water splash effect, clean pure water drops, bright fresh atmosphere, product hero shot',
    category: 'product',
    icon: 'Waves',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'skincare-application',
    name: 'Textura en Piel',
    description: 'Crema aplicada en piel radiante',
    promptTemplate:
      'Close-up of skincare cream being smoothly applied on glowing healthy skin, satisfying smooth texture, soft natural lighting, clean beauty aesthetic',
    category: 'product',
    icon: 'Layers',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'skincare-water-fresh',
    name: 'Efecto Frescura',
    description: 'Producto con salpicaduras de agua fresca',
    promptTemplate:
      'Skincare product with fresh water droplets splashing and rolling on surface, clean pure water, bright fresh atmosphere, product hero shot, spa aesthetic',
    category: 'product',
    icon: 'Waves',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'skincare-ingredients',
    name: 'Ingrediente Estrella',
    description: 'Producto rodeado de ingredientes naturales',
    promptTemplate:
      'Skincare product surrounded by natural ingredients floating gently, eucalyptus leaves, citrus slices, flower petals, soft natural light, organic beauty',
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
    description: 'Modelo caminando estilo runway',
    promptTemplate:
      'Fashion model walking confidently in the clothing, runway style movement, professional fashion photography, studio or lifestyle setting, natural stride',
    category: 'fashion',
    icon: 'Footprints',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'fashion-pose',
    name: 'Pose Elegante',
    description: 'Modelo posando con movimiento sutil',
    promptTemplate:
      'Fashion model striking elegant poses, subtle movement, wind in hair, professional studio lighting, editorial fashion photography, confident expression',
    category: 'fashion',
    icon: 'User',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'fashion-lookbook',
    name: 'Lookbook',
    description: 'Presentacion tipo lookbook editorial',
    promptTemplate:
      'Fashion lookbook presentation, model turns to show outfit from multiple angles, soft natural lighting, clean background, editorial style photography',
    category: 'fashion',
    icon: 'BookOpen',
    recommended: ['wan-2.5', 'kling-2.6'],
  },
  {
    id: 'fashion-detail',
    name: 'Detalle Tela',
    description: 'Close-up del tejido y textura',
    promptTemplate:
      'Close-up of fabric texture and details, gentle movement showing material drape and quality, macro fashion photography, professional studio lighting',
    category: 'fashion',
    icon: 'Scan',
    recommended: ['ltx-video', 'wan-2.2-fast'],
  },
  {
    id: 'fashion-lifestyle',
    name: 'Street Style',
    description: 'Modelo en contexto urbano',
    promptTemplate:
      'Fashion model in urban street style setting, walking casually, city background, natural sunlight, candid photography style, authentic movement',
    category: 'fashion',
    icon: 'MapPin',
    recommended: ['kling-2.6', 'wan-2.5'],
  },
  {
    id: 'fashion-lingerie',
    name: 'Lenceria',
    description: 'Presentacion elegante de lenceria',
    promptTemplate:
      'Elegant lingerie presentation, model posing gracefully, soft romantic lighting, tasteful and sophisticated, luxury brand photography, subtle movement',
    category: 'fashion',
    icon: 'Heart',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'lingerie-360',
    name: 'Lenceria 360° (Frente + Espalda)',
    description: 'Video que muestra frente y espalda de la prenda',
    promptTemplate:
      'Elegant lingerie showcase transitioning from front view to back view, tasteful and sophisticated, luxury brand photography, smooth camera movement revealing both sides of the garment',
    category: 'fashion',
    icon: 'RefreshCw',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'lingerie-fabric-flow',
    name: 'Movimiento de Tela',
    description: 'Tela delicada fluyendo en camara lenta',
    promptTemplate:
      'Delicate lingerie fabric flowing and draping in slow motion, soft romantic lighting, silk and lace texture visible, intimate fashion photography, elegant and sensual',
    category: 'fashion',
    icon: 'Wind',
    recommended: ['kling-2.6', 'minimax-hailuo'],
  },
  {
    id: 'lingerie-lifestyle',
    name: 'Estilo de Vida',
    description: 'Modelo en escena natural y confiada',
    promptTemplate:
      'Woman in lingerie in natural comfortable movement in elegant bedroom setting, warm soft morning light, confident and comfortable lifestyle, tasteful editorial',
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
    description: 'Avatar presentando tu producto',
    promptTemplate: 'Professional product presenter talking to camera',
    category: 'avatar',
    icon: 'Mic',
  },
  {
    id: 'avatar-review',
    name: 'Review',
    description: 'Avatar haciendo una resena del producto',
    promptTemplate: 'Authentic product review style, casual and friendly',
    category: 'avatar',
    icon: 'Star',
  },
  {
    id: 'avatar-tutorial',
    name: 'Tutorial',
    description: 'Avatar explicando como usar el producto',
    promptTemplate: 'Tutorial style, explaining how to use the product, educational',
    category: 'avatar',
    icon: 'GraduationCap',
  },
  {
    id: 'avatar-ad',
    name: 'Anuncio',
    description: 'Avatar para comercial/anuncio',
    promptTemplate: 'Commercial advertisement style, energetic and persuasive',
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
