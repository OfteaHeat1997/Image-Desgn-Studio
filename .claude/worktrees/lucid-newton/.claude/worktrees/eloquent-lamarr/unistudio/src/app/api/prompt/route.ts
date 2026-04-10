// =============================================================================
// Prompt Optimization API Route - UniStudio
// POST: Accepts JSON { description, context?, mode? }
// Modes:
//   "optimize" (default) — optimize a single prompt
//   "creative-director"  — generate multiple photo concept suggestions
// Uses Claude API if available, otherwise falls back to local optimization.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromptContext {
  productType?: string;
  targetPlatform?: string;
  brandStyle?: string;
  desiredMood?: string;
  productColor?: string;
  productMaterial?: string;
  occasion?: string;
}

interface OptimizedPrompt {
  prompt: string;
  negativePrompt: string;
}

interface PhotoConcept {
  id: string;
  title: string;
  description: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  mood: string;
  isFree: boolean;
  bgColor?: string;
}

// ---------------------------------------------------------------------------
// Local prompt optimization (no API key needed)
// ---------------------------------------------------------------------------

const PRODUCT_BOOSTERS: Record<string, string> = {
  clothing: 'fashion photography, studio lighting, fabric texture detail, clean presentation',
  lingerie: 'intimate apparel photography, soft lighting, delicate fabric detail, elegant presentation, feminine aesthetic',
  shoes: 'footwear photography, detailed stitching, material texture, professional product shot',
  jewelry: 'jewelry photography, macro detail, sparkle and reflection, luxury presentation, dark background contrast',
  electronics: 'tech product photography, sleek and modern, reflective surfaces, minimal clean background',
  food: 'food photography, appetizing presentation, natural lighting, fresh ingredients, depth of field',
  cosmetics: 'beauty product photography, soft lighting, luxurious feel, clean composition, pastel tones',
  furniture: 'interior photography, lifestyle setting, natural light, room context, warm atmosphere',
  accessories: 'accessory photography, detail shots, lifestyle context, complementary styling',
  beauty: 'beauty photography, soft glowing lighting, clean composition, luxurious feel',
  default: 'professional product photography, studio lighting, commercial quality, sharp focus',
};

const PLATFORM_MODIFIERS: Record<string, string> = {
  amazon: 'pure white background, centered product, no props, clean and simple, main product image',
  shopify: 'clean background, centered product, professional ecommerce, lifestyle optional',
  instagram: 'lifestyle setting, aspirational, visually engaging, social media optimized, story-worthy',
  facebook: 'eye-catching, clear product visibility, social sharing optimized, engaging composition',
  tiktok: 'dynamic, trending aesthetic, bold colors, attention-grabbing, vertical format',
  youtube: 'high quality thumbnail, bold text overlay friendly, 16:9 landscape, eye-catching',
  pinterest: 'vertical composition, eye-catching, lifestyle context, pin-worthy, 2:3 aspect',
  etsy: 'handmade feel, natural materials, warm tones, artisanal quality',
  ebay: 'clear product view, multiple angles implied, descriptive and detailed',
};

const MOOD_MODIFIERS: Record<string, string> = {
  luxurious: 'premium, opulent, rich textures, gold accents, high-end',
  minimal: 'minimalist, clean lines, negative space, simple elegance',
  warm: 'warm tones, golden hour lighting, cozy, inviting',
  cool: 'cool tones, modern, crisp, blue-white palette',
  natural: 'organic, earth tones, natural materials, soft daylight',
  bold: 'vibrant colors, high contrast, dynamic composition, eye-catching',
  elegant: 'sophisticated, refined, subtle details, tasteful',
  playful: 'fun, colorful, energetic, whimsical',
  romantic: 'soft pink tones, dreamy, delicate, feminine, rose petals',
  tropical: 'vibrant tropical colors, palm leaves, bright sunlight, Caribbean',
  urban: 'city vibes, concrete textures, modern architecture, street style',
};

const BASE_NEGATIVE =
  'blurry, low quality, distorted, ugly, deformed, noisy, grainy, oversaturated, underexposed, overexposed, watermark, text overlay, logo';

const NEGATIVE_ADDITIONS: Record<string, string> = {
  clothing: 'wrinkled, stained, pilling, loose threads, bad stitching',
  lingerie: 'wrinkled, stained, cheap looking, bad stitching, inappropriate',
  jewelry: 'tarnished, scratched, dull, cheap looking, plastic',
  food: 'unappetizing, stale, moldy, messy, artificial looking',
  cosmetics: 'smudged, broken, cheap packaging, messy application',
  electronics: 'fingerprints, dust, scratches, outdated design',
  default: 'amateur, unprofessional, cluttered background',
};

function optimizePromptLocal(
  description: string,
  context?: PromptContext,
): OptimizedPrompt {
  const parts: string[] = [];
  parts.push(description);

  const productType = context?.productType?.toLowerCase() || 'default';
  const booster = PRODUCT_BOOSTERS[productType] || PRODUCT_BOOSTERS['default'];
  parts.push(booster);

  if (context?.targetPlatform) {
    const platformMod = PLATFORM_MODIFIERS[context.targetPlatform.toLowerCase()];
    if (platformMod) parts.push(platformMod);
  }

  if (context?.brandStyle) {
    parts.push(`brand aesthetic: ${context.brandStyle}`);
  }

  if (context?.desiredMood) {
    const mood = MOOD_MODIFIERS[context.desiredMood.toLowerCase()];
    if (mood) parts.push(mood);
    else parts.push(context.desiredMood);
  }

  parts.push('8k, high resolution, sharp focus, professional');

  const negParts = [BASE_NEGATIVE];
  const negAddition = NEGATIVE_ADDITIONS[productType] || NEGATIVE_ADDITIONS['default'];
  negParts.push(negAddition);

  return {
    prompt: parts.join(', '),
    negativePrompt: negParts.join(', '),
  };
}

// ---------------------------------------------------------------------------
// Claude API - Optimize single prompt
// ---------------------------------------------------------------------------

async function optimizePromptWithClaude(
  description: string,
  context?: PromptContext,
): Promise<OptimizedPrompt> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const systemPrompt = `You are an expert AI prompt engineer specializing in product photography and image generation.
Your task is to optimize user descriptions into highly effective prompts for AI image generation models (Flux, Stable Diffusion, etc.).

Rules:
1. Enhance the description with specific photography terms, lighting descriptions, and composition details
2. Add relevant technical quality boosters (resolution, sharpness, etc.)
3. Keep the core product/subject intent intact
4. If platform context is given, optimize for that platform's visual standards
5. Generate both a positive prompt and a negative prompt
6. Return ONLY valid JSON with "prompt" and "negativePrompt" fields
7. Keep prompts concise but descriptive (under 200 words each)
8. The user may write in Spanish — always return prompts in English for the AI model`;

  const userMessage = `Optimize this product photography description into an AI image generation prompt:

Description: ${description}
${context?.productType ? `Product Type: ${context.productType}` : ''}
${context?.targetPlatform ? `Target Platform: ${context.targetPlatform}` : ''}
${context?.brandStyle ? `Brand Style: ${context.brandStyle}` : ''}
${context?.desiredMood ? `Desired Mood: ${context.desiredMood}` : ''}

Return JSON: { "prompt": "...", "negativePrompt": "..." }`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userMessage }],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('No content in Claude API response');

  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      prompt: parsed.prompt || description,
      negativePrompt: parsed.negativePrompt || BASE_NEGATIVE,
    };
  } catch {
    return { prompt: content.trim(), negativePrompt: BASE_NEGATIVE };
  }
}

// ---------------------------------------------------------------------------
// Claude API - Creative Director (generates multiple photo concepts)
// ---------------------------------------------------------------------------

async function creativeDirectorClaude(
  context: PromptContext,
): Promise<PhotoConcept[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const systemPrompt = `Eres un director creativo profesional de fotografia de producto para e-commerce y redes sociales.
Tu trabajo es generar 4 conceptos de foto DIFERENTES y CREATIVOS para el producto del usuario.

REGLAS IMPORTANTES:
1. Genera exactamente 4 conceptos distintos — variados en estilo, fondo, y mood
2. El primer concepto SIEMPRE debe ser uno GRATIS (fondo solido de color)
3. Los otros 3 deben ser creativos con escenarios/ambientes interesantes
4. Si el usuario especifica una plataforma, adapta los conceptos a esa plataforma
5. Los prompts para generacion de imagen SIEMPRE en ingles (para el modelo AI)
6. Los titulos y descripciones SIEMPRE en espanol (para el usuario)
7. Incluye detalles especificos de iluminacion, angulo, composicion y props
8. Para redes sociales, haz las fotos atractivas y "shareable"
9. Para e-commerce (Amazon, Shopify), prioriza claridad y fondo limpio

FORMATO DE RESPUESTA (JSON array):
[
  {
    "id": "concept-1",
    "title": "Titulo en espanol",
    "description": "Descripcion breve en espanol de como se vera la foto",
    "prompt": "Detailed English prompt for AI image generation...",
    "negativePrompt": "English negative prompt...",
    "aspectRatio": "1:1",
    "mood": "elegant",
    "isFree": true,
    "bgColor": "#FFFFFF"
  },
  {
    "id": "concept-2",
    "title": "Titulo creativo",
    "description": "Descripcion del concepto",
    "prompt": "English prompt...",
    "negativePrompt": "...",
    "aspectRatio": "4:5",
    "mood": "luxurious",
    "isFree": false
  }
]

Aspect ratios comunes:
- "1:1" — Instagram feed, Amazon, general e-commerce
- "4:5" — Instagram portrait, Facebook
- "9:16" — Instagram Stories, TikTok, YouTube Shorts
- "16:9" — YouTube thumbnail, Facebook cover, web banner
- "2:3" — Pinterest
- "3:2" — Blog, web landscape`;

  const parts: string[] = [];
  if (context.productType) parts.push(`Tipo de producto: ${context.productType}`);
  if (context.productColor) parts.push(`Color del producto: ${context.productColor}`);
  if (context.productMaterial) parts.push(`Material: ${context.productMaterial}`);
  if (context.targetPlatform) parts.push(`Plataforma destino: ${context.targetPlatform}`);
  if (context.brandStyle) parts.push(`Estilo de marca: ${context.brandStyle}`);
  if (context.desiredMood) parts.push(`Mood deseado: ${context.desiredMood}`);
  if (context.occasion) parts.push(`Ocasion: ${context.occasion}`);

  const userMessage = `Genera 4 conceptos de foto profesional para este producto:

${parts.join('\n')}

Recuerda: el primer concepto debe ser GRATIS (fondo solido), los demas creativos con IA.
Devuelve SOLO el JSON array, sin texto adicional.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: userMessage }],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error');
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('No content in Claude API response');

  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  // Also try to find a plain JSON array
  if (!jsonStr.startsWith('[')) {
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) jsonStr = arrayMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr) as PhotoConcept[];
    return parsed.map((c, i) => ({
      ...c,
      id: c.id || `concept-${i + 1}`,
      negativePrompt: c.negativePrompt || BASE_NEGATIVE,
    }));
  } catch {
    throw new Error('Failed to parse creative director response');
  }
}

// ---------------------------------------------------------------------------
// Local fallback for creative director (no API key)
// ---------------------------------------------------------------------------

function creativeDirectorLocal(context: PromptContext): PhotoConcept[] {
  const product = context.productType || 'product';
  const platform = context.targetPlatform || '';

  const concepts: PhotoConcept[] = [
    {
      id: 'concept-1',
      title: 'Fondo Blanco Clasico',
      description: `Tu ${product} sobre fondo blanco puro, perfecto para e-commerce.`,
      prompt: `Professional product photography of ${product}, pure white background, centered, studio lighting, high resolution, commercial quality, sharp focus, clean presentation`,
      negativePrompt: BASE_NEGATIVE,
      aspectRatio: platform === 'instagram' ? '4:5' : '1:1',
      mood: 'minimal',
      isFree: true,
      bgColor: '#FFFFFF',
    },
    {
      id: 'concept-2',
      title: 'Marmol Elegante',
      description: `Superficie de marmol blanco con iluminacion suave para un look premium.`,
      prompt: `Professional product photography of ${product} on white marble surface, soft diffused lighting, luxury aesthetic, elegant composition, high-end commercial photography, 8k quality`,
      negativePrompt: BASE_NEGATIVE,
      aspectRatio: '1:1',
      mood: 'luxurious',
      isFree: false,
    },
    {
      id: 'concept-3',
      title: 'Naturaleza Tropical',
      description: `Escenario tropical con hojas verdes y luz natural dorada.`,
      prompt: `Professional lifestyle product photography of ${product}, tropical setting with green palm leaves, golden natural sunlight, warm inviting atmosphere, Caribbean vibes, editorial quality`,
      negativePrompt: BASE_NEGATIVE,
      aspectRatio: platform === 'tiktok' ? '9:16' : '4:5',
      mood: 'tropical',
      isFree: false,
    },
    {
      id: 'concept-4',
      title: 'Minimalista Moderno',
      description: `Fondo pastel suave con sombras geometricas para un look contemporaneo.`,
      prompt: `Professional product photography of ${product}, soft pastel background, geometric shadows, contemporary minimal aesthetic, clean composition, editorial fashion photography, natural daylight`,
      negativePrompt: BASE_NEGATIVE,
      aspectRatio: '1:1',
      mood: 'elegant',
      isFree: false,
    },
  ];

  return concepts;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, context, mode = 'optimize' } = body as {
      description?: string;
      context?: PromptContext;
      mode?: 'optimize' | 'creative-director';
    };

    // ---- Creative Director Mode ----
    if (mode === 'creative-director') {
      if (!context?.productType) {
        return NextResponse.json(
          { success: false, error: 'Creative director requires at least productType in context.' },
          { status: 400 },
        );
      }

      let concepts: PhotoConcept[];
      let method: string;

      if (process.env.ANTHROPIC_API_KEY) {
        try {
          concepts = await creativeDirectorClaude(context);
          method = 'claude';
        } catch (err) {
          console.warn('[API /prompt] Claude creative-director failed, using local:', err);
          concepts = creativeDirectorLocal(context);
          method = 'local-fallback';
        }
      } else {
        concepts = creativeDirectorLocal(context);
        method = 'local';
      }

      return NextResponse.json({
        success: true,
        data: { concepts, method },
        cost: method === 'claude' ? 0.003 : 0,
      });
    }

    // ---- Standard Optimize Mode ----
    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Missing required field "description".' },
        { status: 400 },
      );
    }

    let result: OptimizedPrompt;
    let method: string;

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        result = await optimizePromptWithClaude(description, context);
        method = 'claude';
      } catch (claudeError) {
        console.warn(
          '[API /prompt] Claude optimization failed, falling back to local:',
          claudeError instanceof Error ? claudeError.message : claudeError,
        );
        result = optimizePromptLocal(description, context);
        method = 'local-fallback';
      }
    } else {
      result = optimizePromptLocal(description, context);
      method = 'local';
    }

    return NextResponse.json({
      success: true,
      data: {
        prompt: result.prompt,
        negativePrompt: result.negativePrompt,
        method,
        originalDescription: description,
      },
      cost: method === 'claude' ? 0.002 : 0,
    });
  } catch (error) {
    console.error('[API /prompt] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred.',
      },
      { status: 500 },
    );
  }
}
