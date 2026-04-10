// =============================================================================
// Video Enhancement API Route - UniStudio
// POST: Accepts JSON { description, category?, duration?, platform?, budget? }
// Uses Claude Haiku to enhance prompts, select providers, generate scripts.
// Falls back to local rule-based logic when ANTHROPIC_API_KEY is not set.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { VideoCategory, VideoProviderKey, AvatarProviderKey } from '@/types/video';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoEnhanceRequest {
  description: string;
  category?: VideoCategory;
  duration?: number;
  platform?: string;
  budget?: number;
}

interface VideoEnhanceResponse {
  enhancedPrompt: string;
  recommendedProvider: VideoProviderKey | AvatarProviderKey;
  recommendedDuration: number;
  estimatedCost: number;
  script?: string;
  caption?: string;
  reasoning: string;
  method: 'claude' | 'local' | 'local-fallback';
}

// ---------------------------------------------------------------------------
// Provider cost/info table (server-side, kept minimal)
// ---------------------------------------------------------------------------

const PROVIDER_INFO: Record<
  string,
  { cost: number; costType: 'flat' | 'per-sec'; quality: string; maxDur: number; categories: string[] }
> = {
  kenburns:        { cost: 0,    costType: 'flat',    quality: 'draft',    maxDur: 15, categories: ['product', 'fashion'] },
  'ltx-video':     { cost: 0.04, costType: 'flat',    quality: 'draft',    maxDur: 5,  categories: ['product'] },
  'wan-2.2-fast':  { cost: 0.05, costType: 'flat',    quality: 'standard', maxDur: 5,  categories: ['product', 'fashion'] },
  'wan-2.5':       { cost: 0.05, costType: 'per-sec', quality: 'standard', maxDur: 10, categories: ['product', 'fashion'] },
  'wan-2.1':       { cost: 0.04, costType: 'flat',    quality: 'standard', maxDur: 10, categories: ['product'] },
  'kling-2.6':     { cost: 0.07, costType: 'per-sec', quality: 'premium',  maxDur: 10, categories: ['product', 'fashion'] },
  'minimax-hailuo':{ cost: 0.08, costType: 'per-sec', quality: 'premium',  maxDur: 6,  categories: ['product', 'fashion'] },
};

const AVATAR_INFO: Record<string, { cost: number; quality: string }> = {
  wav2lip:      { cost: 0.005, quality: 'budget lip-sync' },
  musetalk:     { cost: 0.04,  quality: 'real-time lip-sync' },
  sadtalker:    { cost: 0.08,  quality: '3D movement + expressions' },
  liveportrait: { cost: 0.09,  quality: 'expression transfer' },
  'hedra-free': { cost: 0,     quality: 'premium lip-sync (22/month limit)' },
};

function getProviderCost(key: string, duration: number): number {
  const p = PROVIDER_INFO[key];
  if (!p) return 999;
  return p.costType === 'flat' ? p.cost : p.cost * duration;
}

// ---------------------------------------------------------------------------
// Local fallback (rule-based)
// ---------------------------------------------------------------------------

function enhanceLocal(req: VideoEnhanceRequest): VideoEnhanceResponse {
  const { description, category = 'product', duration = 5, platform, budget } = req;

  // --- Avatar category ---
  if (category === 'avatar') {
    // Pick cheapest avatar provider
    const entries = Object.entries(AVATAR_INFO);
    entries.sort((a, b) => a[1].cost - b[1].cost);
    const pick = budget !== undefined
      ? entries.find(([, v]) => v.cost <= budget) ?? entries[0]
      : entries[0];

    const script = description.length < 40
      ? `Hola! ${description}. Descubre nuestra nueva coleccion. Visita nuestra tienda para mas informacion.`
      : description;

    return {
      enhancedPrompt: description,
      recommendedProvider: pick[0] as AvatarProviderKey,
      recommendedDuration: 10,
      estimatedCost: pick[1].cost,
      script,
      caption: platform ? `${description.slice(0, 80)}... #${platform}` : undefined,
      reasoning: `Proveedor mas economico para avatar: ${pick[0]} ($${pick[1].cost})`,
      method: 'local',
    };
  }

  // --- Video category (product / fashion) ---
  const eligible = Object.entries(PROVIDER_INFO).filter(
    ([, v]) => v.categories.includes(category) && v.maxDur >= duration,
  );

  // Sort by cost for the given duration
  eligible.sort((a, b) => getProviderCost(a[0], duration) - getProviderCost(b[0], duration));

  // Pick cheapest that fits budget (skip kenburns for quality unless budget = 0)
  let pick = eligible.find(([key]) => key !== 'kenburns') ?? eligible[0];
  if (budget !== undefined && budget === 0) {
    pick = eligible.find(([key]) => key === 'kenburns') ?? pick;
  } else if (budget !== undefined) {
    pick = eligible.find(([key, ]) => key !== 'kenburns' && getProviderCost(key, duration) <= budget) ?? pick;
  }

  const providerKey = pick[0] as VideoProviderKey;
  const cost = getProviderCost(providerKey, duration);

  // Enhance prompt locally
  const mods: string[] = [description];
  if (category === 'fashion') {
    mods.push('fashion model showcase, elegant movement, fabric flow detail');
  } else {
    mods.push('product showcase, smooth rotation, studio lighting, commercial quality');
  }
  if (platform) {
    const platformHints: Record<string, string> = {
      'instagram-reel': 'vertical format, attention-grabbing, social media optimized',
      tiktok: 'dynamic, trending aesthetic, bold, vertical format',
      'facebook-ad': 'eye-catching, clear product, social sharing',
      'facebook-marketplace': 'clean background, product detail, e-commerce quality',
      'youtube-short': 'vertical format, high quality, engaging',
      'instagram-story': 'vertical, quick impact, visually engaging',
      'pinterest-pin': 'vertical, aspirational, pin-worthy aesthetic',
    };
    if (platformHints[platform]) mods.push(platformHints[platform]);
  }
  mods.push('8k, high detail, professional');
  const enhancedPrompt = mods.join(', ');

  return {
    enhancedPrompt,
    recommendedProvider: providerKey,
    recommendedDuration: Math.min(duration, pick[1].maxDur),
    estimatedCost: cost,
    caption: platform ? `${description.slice(0, 100)} #ecommerce #${platform.replace('-', '')}` : undefined,
    reasoning: `Proveedor mas economico: ${pick[1].quality} ${providerKey} ($${cost.toFixed(2)})`,
    method: 'local',
  };
}

// ---------------------------------------------------------------------------
// Claude Haiku enhancement
// ---------------------------------------------------------------------------

async function enhanceWithClaude(req: VideoEnhanceRequest): Promise<VideoEnhanceResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const { description, category = 'product', duration = 5, platform, budget } = req;

  const providerList = category === 'avatar'
    ? Object.entries(AVATAR_INFO)
        .map(([k, v]) => `${k}: $${v.cost} (${v.quality})`)
        .join('\n')
    : Object.entries(PROVIDER_INFO)
        .filter(([, v]) => v.categories.includes(category))
        .map(([k, v]) => `${k}: $${getProviderCost(k, duration).toFixed(2)} for ${duration}s (${v.quality}, max ${v.maxDur}s)`)
        .join('\n');

  const systemPrompt = `Eres un asistente de video para UniStudio, plataforma de fotografia de producto AI para e-commerce.

Tu tarea:
1. Mejorar la descripcion del usuario en un prompt optimizado para generacion de video AI (en ingles)
2. Recomendar el proveedor mas barato que cumpla la calidad necesaria
3. Si la categoria es "avatar", generar un script corto y natural en espanol (2-3 oraciones)
4. Si se especifica plataforma, generar un caption optimizado para esa red social en espanol

Proveedores disponibles:
${providerList}

REGLAS:
- El prompt mejorado SIEMPRE en ingles (para el modelo AI)
- Scripts y captions SIEMPRE en espanol
- Priorizar costo bajo a menos que el budget lo permita
- No recomendar "kenburns" a menos que budget sea 0
- Si el usuario escribe poco, enriquecer con detalles de producto/moda
- Responder SOLO JSON valido

Responde con este formato JSON:
{
  "enhancedPrompt": "English prompt for video generation...",
  "recommendedProvider": "provider-key",
  "recommendedDuration": ${duration},
  "estimatedCost": 0.05,
  "script": "Solo si category=avatar: Script en espanol...",
  "caption": "Solo si platform: Caption para la red social...",
  "reasoning": "Explicacion breve en espanol de la seleccion"
}`;

  const userMessage = `Descripcion: ${description}
Categoria: ${category}
Duracion solicitada: ${duration}s
${platform ? `Plataforma: ${platform}` : ''}
${budget !== undefined ? `Budget maximo: $${budget}` : 'Budget: el mas barato posible'}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
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

  // Parse JSON (handle code-block wrapping)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      enhancedPrompt: parsed.enhancedPrompt || description,
      recommendedProvider: parsed.recommendedProvider || 'wan-2.2-fast',
      recommendedDuration: parsed.recommendedDuration || duration,
      estimatedCost: parsed.estimatedCost ?? 0.05,
      script: parsed.script || undefined,
      caption: parsed.caption || undefined,
      reasoning: parsed.reasoning || 'Recomendacion IA',
      method: 'claude',
    };
  } catch {
    // If JSON parsing fails, use the raw text as prompt enhancement
    return {
      enhancedPrompt: content.trim().slice(0, 500),
      recommendedProvider: category === 'avatar' ? 'wav2lip' : 'wan-2.2-fast',
      recommendedDuration: duration,
      estimatedCost: 0.05,
      reasoning: 'Respuesta IA (formato parcial)',
      method: 'claude',
    };
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, category, duration, platform, budget } = body as VideoEnhanceRequest;

    if (!description || !description.trim()) {
      return NextResponse.json(
        { success: false, error: 'Se requiere una descripcion.' },
        { status: 400 },
      );
    }

    const req: VideoEnhanceRequest = {
      description: description.trim(),
      category: category || 'product',
      duration: duration || 5,
      platform,
      budget,
    };

    let result: VideoEnhanceResponse;

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        result = await enhanceWithClaude(req);
      } catch (err) {
        console.warn('[API /video-enhance] Claude failed, using local fallback:', err);
        result = enhanceLocal(req);
        result.method = 'local-fallback';
      }
    } else {
      result = enhanceLocal(req);
    }

    return NextResponse.json({
      success: true,
      data: result,
      cost: result.method === 'claude' ? 0.0005 : 0,
    });
  } catch (error) {
    console.error('[API /video-enhance] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred.',
      },
      { status: 500 },
    );
  }
}
