// =============================================================================
// Product Features — deep, per-photo product analysis (Vision)
// =============================================================================
// Cada producto es único: extraemos features específicos de ESTA foto
// (no por clase) y los inyectamos en los prompts subsiguientes para que el
// pipeline NUNCA cambie el producto.
// =============================================================================

import { CLAUDE_HAIKU } from '@/lib/utils/constants';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductCategory = 'lingerie' | 'static-product' | 'jewelry';

export interface LingerieFeatures {
  category: 'lingerie';
  vista: 'frontal' | 'trasera' | 'lateral' | 'producto-flat';
  tipo: 'bra' | 'panty' | 'bodysuit' | 'shapewear' | 'set' | 'faja' | 'other';
  subtipo: string | null;
  tirantes: 'finos' | 'gruesos' | 'sin-tirantes' | 'cruzados' | 'ajustables' | 'palabra-de-honor' | null;
  textura: 'encaje' | 'algodon' | 'satinado' | 'malla' | 'liso' | 'estampado' | 'mixto' | null;
  color_principal: string | null;
  color_hex: string | null;
  detalles_visibles: string[];
  copa: string | null;
  hasModel: boolean;
}

export interface StaticProductFeatures {
  category: 'static-product';
  tipo_envase: 'frasco' | 'spray' | 'tubo' | 'caja' | 'pote' | 'other';
  forma: 'cuadrado' | 'cilindrico' | 'piramidal' | 'redondo' | 'rectangular' | 'irregular';
  material_aparente: 'vidrio-transparente' | 'vidrio-opaco' | 'plastico' | 'metal' | 'carton' | 'mixto';
  color_liquido: string | null;
  color_envase: string | null;
  color_hex: string | null;
  etiqueta_visible: boolean;
  marca_legible: string | null;
  posicion_logo: 'frontal' | 'lateral' | 'trasera' | 'tapa' | null;
  tapa: 'redonda' | 'cuadrada' | 'spray' | 'rosca' | 'pump' | 'sin-tapa' | null;
  detalles_visibles: string[];
}

export interface JewelryFeatures {
  category: 'jewelry';
  tipo: 'anillo' | 'arete' | 'cadena' | 'pulsera' | 'topos' | 'candongas' | 'set' | 'other';
  material: 'oro' | 'plata' | 'rosa' | 'mixto' | 'acero' | 'otro';
  acabado: 'brillante' | 'mate' | 'satinado' | 'martillado' | null;
  piedras: boolean;
  num_piedras: number;
  color_piedras: string[];
  grabados: boolean;
  vista: 'plano' | 'lateral' | '3-4' | 'flat-lay';
  detalles_visibles: string[];
}

export type ProductFeatures = LingerieFeatures | StaticProductFeatures | JewelryFeatures;

export interface ProductFeaturesResult {
  features: ProductFeatures;
  cost: number;
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Per-category prompts (JSON-strict)
// ---------------------------------------------------------------------------

const PROMPTS: Record<ProductCategory, string> = {
  lingerie: `Analiza esta foto de prenda íntima/lencería. Extrae features ESPECÍFICOS de ESTA foto, no genéricos.
Responde SOLO con JSON válido:
{
  "vista": "frontal" | "trasera" | "lateral" | "producto-flat",
  "tipo": "bra" | "panty" | "bodysuit" | "shapewear" | "set" | "faja" | "other",
  "subtipo": "push-up" | "triangulo" | "deportivo" | "sin-tirantes" | "balconette" | "bralette" | "tanga" | "hipster" | "boyshort" | string,
  "tirantes": "finos" | "gruesos" | "sin-tirantes" | "cruzados" | "ajustables" | "palabra-de-honor" | null,
  "textura": "encaje" | "algodon" | "satinado" | "malla" | "liso" | "estampado" | "mixto" | null,
  "color_principal": string (ej "beige", "negro", "rojo"),
  "color_hex": string (ej "#E8D4B5"),
  "detalles_visibles": [string] (lista específica: "moño central", "encaje en copas", "broche frontal", "ribete dorado"),
  "copa": "A" | "B" | "C" | "D" | "DD" | null,
  "hasModel": boolean (¿hay una persona/modelo en la foto?)
}`,

  'static-product': `Analiza esta foto de producto cosmético/perfume/crema. Extrae features ESPECÍFICOS de ESTA foto, no genéricos.
Responde SOLO con JSON válido:
{
  "tipo_envase": "frasco" | "spray" | "tubo" | "caja" | "pote" | "other",
  "forma": "cuadrado" | "cilindrico" | "piramidal" | "redondo" | "rectangular" | "irregular",
  "material_aparente": "vidrio-transparente" | "vidrio-opaco" | "plastico" | "metal" | "carton" | "mixto",
  "color_liquido": string | null (color del líquido si es transparente),
  "color_envase": string (color del envase),
  "color_hex": string (hex del color dominante),
  "etiqueta_visible": boolean,
  "marca_legible": string | null (texto de marca si es legible),
  "posicion_logo": "frontal" | "lateral" | "trasera" | "tapa" | null,
  "tapa": "redonda" | "cuadrada" | "spray" | "rosca" | "pump" | "sin-tapa" | null,
  "detalles_visibles": [string] (lista específica: "tapa dorada", "etiqueta blanca", "líquido ámbar", "facetas en vidrio")
}`,

  jewelry: `Analiza esta foto de joyería. Extrae features ESPECÍFICOS de ESTA foto, no genéricos.
Responde SOLO con JSON válido:
{
  "tipo": "anillo" | "arete" | "cadena" | "pulsera" | "topos" | "candongas" | "set" | "other",
  "material": "oro" | "plata" | "rosa" | "mixto" | "acero" | "otro",
  "acabado": "brillante" | "mate" | "satinado" | "martillado" | null,
  "piedras": boolean,
  "num_piedras": number,
  "color_piedras": [string] (ej ["transparente", "azul"]),
  "grabados": boolean,
  "vista": "plano" | "lateral" | "3-4" | "flat-lay",
  "detalles_visibles": [string] (lista específica: "circonias en banda", "grabado interior", "cadena tipo cubana")
}`,
};

// ---------------------------------------------------------------------------
// In-memory cache by image hash
// ---------------------------------------------------------------------------

const CACHE = new Map<string, ProductFeatures>();
const MAX_CACHE_ENTRIES = 200;

function cacheKey(category: ProductCategory, hash: string): string {
  return `${category}:${hash}`;
}

function readCache(category: ProductCategory, hash: string | null): ProductFeatures | null {
  if (!hash) return null;
  return CACHE.get(cacheKey(category, hash)) ?? null;
}

function writeCache(category: ProductCategory, hash: string | null, features: ProductFeatures): void {
  if (!hash) return;
  if (CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = CACHE.keys().next().value;
    if (firstKey !== undefined) CACHE.delete(firstKey);
  }
  CACHE.set(cacheKey(category, hash), features);
}

// ---------------------------------------------------------------------------
// Hash helper (sha256 of buffer or url) — runs server-side only
// ---------------------------------------------------------------------------

async function hashInput(input: { buffer?: Buffer; url?: string }): Promise<string | null> {
  try {
    const { createHash } = await import('crypto');
    const hash = createHash('sha256');
    if (input.buffer) {
      hash.update(input.buffer);
    } else if (input.url) {
      hash.update(input.url);
    } else {
      return null;
    }
    return hash.digest('hex').slice(0, 32);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vision call
// ---------------------------------------------------------------------------

async function callVision(
  base64: string,
  mimeType: string,
  category: ProductCategory,
): Promise<ProductFeatures | null> {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_HAIKU,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
              { type: 'text', text: PROMPTS[category] },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error('[product-features] Vision API error:', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return { ...parsed, category } as ProductFeatures;
  } catch (err) {
    console.error('[product-features] Vision analysis failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a product photo and return category-specific features.
 * Each call is per-photo; results are cached by SHA256 of buffer/URL.
 */
export async function analyzeProductFeatures(
  input: { buffer?: Buffer; url?: string; mimeType?: string; base64?: string },
  category: ProductCategory,
): Promise<ProductFeaturesResult | null> {
  const hash = await hashInput(input);

  // Cache hit
  const cached = readCache(category, hash);
  if (cached) {
    return { features: cached, cost: 0, cached: true };
  }

  // Resolve to base64 + mimeType for the vision API
  let base64: string;
  let mimeType: string;

  if (input.base64 && input.mimeType) {
    base64 = input.base64;
    mimeType = input.mimeType;
  } else if (input.buffer) {
    base64 = input.buffer.toString('base64');
    mimeType = input.mimeType ?? 'image/png';
  } else if (input.url) {
    if (input.url.startsWith('data:')) {
      const m = input.url.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return null;
      mimeType = m[1];
      base64 = m[2];
    } else {
      const { replicateHeaders } = await import('@/lib/utils/image');
      const res = await fetch(input.url, { headers: replicateHeaders(input.url) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      base64 = buf.toString('base64');
      mimeType = res.headers.get('content-type') ?? 'image/png';
    }
  } else {
    return null;
  }

  const features = await callVision(base64, mimeType, category);
  if (!features) return null;

  writeCache(category, hash, features);
  return { features, cost: 0.001, cached: false };
}

// ---------------------------------------------------------------------------
// Prompt-snippet helpers — used by downstream pipeline steps to inject
// the per-photo features into their prompts so the output respects the
// specific product (not a generic class template).
// ---------------------------------------------------------------------------

export function lingerieDescriptor(f: LingerieFeatures): string {
  const parts: string[] = [];
  if (f.subtipo) parts.push(f.subtipo);
  parts.push(f.tipo);
  if (f.tirantes && f.tirantes !== 'sin-tirantes') parts.push(`tirantes ${f.tirantes}`);
  if (f.tirantes === 'sin-tirantes') parts.push('sin tirantes');
  if (f.textura) parts.push(`de ${f.textura}`);
  if (f.color_principal) parts.push(`color ${f.color_principal}`);
  if (f.detalles_visibles.length) parts.push(`con ${f.detalles_visibles.slice(0, 3).join(', ')}`);
  return parts.join(' ');
}

export function staticProductDescriptor(f: StaticProductFeatures): string {
  const parts: string[] = [];
  parts.push(`${f.tipo_envase} ${f.forma}`);
  parts.push(`de ${f.material_aparente}`);
  if (f.color_liquido) parts.push(`con líquido ${f.color_liquido}`);
  if (f.color_envase) parts.push(`color ${f.color_envase}`);
  if (f.tapa) parts.push(`tapa ${f.tapa}`);
  if (f.marca_legible) parts.push(`marca "${f.marca_legible}"`);
  if (f.detalles_visibles.length) parts.push(`detalles: ${f.detalles_visibles.slice(0, 3).join(', ')}`);
  return parts.join(' ');
}

export function jewelryDescriptor(f: JewelryFeatures): string {
  const parts: string[] = [];
  parts.push(f.tipo);
  parts.push(`en ${f.material}`);
  if (f.acabado) parts.push(`acabado ${f.acabado}`);
  if (f.piedras && f.num_piedras > 0) {
    parts.push(`con ${f.num_piedras} piedra${f.num_piedras > 1 ? 's' : ''}`);
    if (f.color_piedras.length) parts.push(`color ${f.color_piedras.join(', ')}`);
  }
  if (f.grabados) parts.push('con grabados');
  if (f.detalles_visibles.length) parts.push(`detalles: ${f.detalles_visibles.slice(0, 3).join(', ')}`);
  return parts.join(' ');
}

export function describeFeatures(features: ProductFeatures): string {
  switch (features.category) {
    case 'lingerie':
      return lingerieDescriptor(features);
    case 'static-product':
      return staticProductDescriptor(features);
    case 'jewelry':
      return jewelryDescriptor(features);
  }
}

/**
 * Build a "preserve the product" guard sentence to append to generation prompts.
 * Generation models tend to drift; this sentence anchors them to the input.
 */
export function preserveProductGuard(features: ProductFeatures): string {
  const desc = describeFeatures(features);
  return `Preserve the EXACT product from the input photo: ${desc}. Do NOT change shape, color, texture, or details. Only modify the background/environment.`;
}
