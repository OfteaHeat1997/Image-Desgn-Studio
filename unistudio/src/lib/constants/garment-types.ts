/**
 * Garment type constants — fuente única de verdad para lingerie routing.
 *
 * Antes estaba duplicado en 3 lugares:
 * - `src/app/pipelines/lingerie/page.tsx:440` (array lingerieTypes)
 * - `src/app/api/ai-agent/plan/route.ts` (mapeo isLingerie)
 * - `src/app/api/bg-remove/route.ts` (validación de garmentType para grounded_sam)
 *
 * Commit S1 los consolida acá para que cambios se apliquen en un solo sitio.
 */

/** Todos los tipos de prenda que el pipeline de Lencería procesa via Kolors + SeedDream. */
export const LINGERIE_GARMENT_TYPES = [
  'bra',
  'panty',
  'set',
  'shapewear',
  'bodysuit',
  'lingerie',
  'faja',
  'fajas',
  'swimwear',
  'bikini',
  'underwear',
  'intimate',
] as const;

export type LingerieGarmentType = (typeof LINGERIE_GARMENT_TYPES)[number];

const LINGERIE_TYPES_SET: Set<string> = new Set(LINGERIE_GARMENT_TYPES);

/** Returns true si el garment/productType requiere el flow lingerie-safe (Kolors + SeedDream, skip Flux/FASHN). */
export function isLingerieType(value: string | null | undefined): boolean {
  if (!value) return false;
  return LINGERIE_TYPES_SET.has(value);
}

/**
 * Mapea un productType de la UI a un garmentType que los módulos backend
 * aceptan. Centraliza la lógica que antes vivía inline en lingerie/page.tsx:440.
 *
 * @param productType Lo que la usuaria elige en el dropdown del pipeline
 *                    (bra | panty | faja | set | shapewear | etc.)
 * @returns garmentType para bg-remove/tryon/model-create. Cae a 'other' si no es lingerie.
 */
export function mapProductTypeToGarmentType(productType: string): string {
  // Direct pass-through for the 4 canonical Kolors categories
  if (
    productType === 'bra' ||
    productType === 'panty' ||
    productType === 'set' ||
    productType === 'shapewear'
  ) {
    return productType;
  }
  // Alias: "faja" is common Spanish for shapewear — route to the same path
  if (productType === 'faja' || productType === 'fajas') {
    return 'shapewear';
  }
  // Anything else in the lingerie family collapses to generic "lingerie"
  if (isLingerieType(productType)) {
    return 'lingerie';
  }
  return 'other';
}
