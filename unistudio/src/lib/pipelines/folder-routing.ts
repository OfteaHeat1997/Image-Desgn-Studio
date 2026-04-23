/**
 * Folder / filename routing for Pipeline Estáticos.
 *
 * Problema real (docs/inventory.md líneas 384+): imágenes como DORSAY.jpg,
 * GAIA.jpg, OHM.jpg, OSADIA.jpg, ZENTRO.jpg se comparten entre perfumes y
 * desodorantes en el inventario Unistyles. Sin este helper, un archivo
 * DORSAY.jpg se procesaba con la matriz default (perfume premium Esika →
 * fondo mármol Sephora) incluso cuando venía del folder /desodorantes/
 * (donde el fondo correcto es gris neutro).
 *
 * Esta función es pura — no hace fetch, no lee filesystem. Solo pattern-match
 * sobre el string del path/filename. Llámala antes de `getAdaptiveBgConfig`.
 *
 * Doc: docs/inventory-final/AUDIT_ESTATICOS.md — Gap 4
 */

import type { StaticProductType, StaticBrand } from './static-product';

export interface InferredProductContext {
  productType?: StaticProductType;
  brand?: StaticBrand;
  /**
   * true si el filename matchea un nombre compartido entre categorías
   * (DORSAY/GAIA/OHM/OSADIA/ZENTRO) sin que el path resuelva la ambigüedad.
   * La UI debería mostrar al usuario un warning pidiéndole confirmar el tipo.
   */
  ambiguous: boolean;
  /** Explicación legible por qué se infirió lo que se infirió */
  reason: string;
}

/** Nombres que aparecen en AMBAS categorías (perfume + desodorante) */
const SHARED_NAMES = ['DORSAY', 'GAIA', 'OHM', 'OSADIA', 'ZENTRO'];

/**
 * Folder patterns → productType. Order matters: primero el más específico.
 * Cubre: los folders reales de inventory.md + docs/inventory-final/images/.
 */
const FOLDER_PATTERNS: Array<{ pattern: RegExp; productType: StaticProductType }> = [
  { pattern: /\/cremas?\//i, productType: 'cream' },
  { pattern: /\/catalogo\s*cremas\//i, productType: 'cream' },
  { pattern: /\/bloqueador\//i, productType: 'sunscreen' },
  { pattern: /\/catalogo\s+bloqueador\//i, productType: 'sunscreen' },
  { pattern: /\/desodorantes?\//i, productType: 'deodorant' },
  { pattern: /\/desodorantes?_hd\//i, productType: 'deodorant' },
  { pattern: /\/limpieza[-\s]?facial\//i, productType: 'facial' },
  { pattern: /\/perfumes?\//i, productType: 'perfume' },
  { pattern: /\/colonias?\//i, productType: 'perfume' },
  { pattern: /\/catalogo\s*colonias?\//i, productType: 'perfume' },
  { pattern: /\/maquillaje\//i, productType: 'makeup' },
  { pattern: /\/makeup\//i, productType: 'makeup' },
];

/** Brand keywords dentro del filename */
const BRAND_KEYWORDS: Array<{ pattern: RegExp; brand: StaticBrand }> = [
  { pattern: /yanbal/i, brand: 'yanbal' },
  { pattern: /esika|ésika/i, brand: 'esika' },
  { pattern: /l[\s'-]?bel/i, brand: 'lbel' },
  { pattern: /cyzone/i, brand: 'cyzone' },
  { pattern: /avon/i, brand: 'avon' },
  { pattern: /salome/i, brand: 'salome' },
];

/**
 * SKU prefix → productType + brand (solo para catálogos Unistyles).
 * Ejemplos: BLQ-004 = bloqueador Yanbal, COL-ES01 = perfume Esika.
 */
const SKU_PATTERNS: Array<{
  pattern: RegExp;
  productType?: StaticProductType;
  brand?: StaticBrand;
}> = [
  { pattern: /\bBLQ-\d+/i, productType: 'sunscreen' },
  { pattern: /\bCRM-\d+/i, productType: 'cream' },
  { pattern: /\bLF-ES\d+/i, productType: 'facial', brand: 'esika' },
  { pattern: /\bLF-LB\d+/i, productType: 'facial', brand: 'lbel' },
  { pattern: /\bCOL-CY\d+/i, productType: 'perfume', brand: 'cyzone' },
  { pattern: /\bCOL-ES\d+/i, productType: 'perfume', brand: 'esika' },
  { pattern: /\bCOL-LB\d+/i, productType: 'perfume', brand: 'lbel' },
  { pattern: /\bCOL-YB\d+/i, productType: 'perfume', brand: 'yanbal' },
  { pattern: /\bCOL-AV\d+/i, productType: 'perfume', brand: 'avon' },
];

/**
 * Infiere (productType, brand) de un path o filename.
 *
 * Orden de prioridad:
 * 1. SKU pattern en el nombre — lo más confiable (BLQ-004 → sunscreen+yanbal no importa qué más diga).
 * 2. Folder pattern — si el path viene de un folder Unistyles conocido, ganar por encima de heurística de nombre.
 * 3. Brand keyword en el filename.
 * 4. Nombre compartido (DORSAY/GAIA/etc.) → marcar como ambiguo si no se resolvió con 1+2.
 */
export function inferProductContextFromPath(path: string): InferredProductContext {
  if (!path) {
    return { ambiguous: false, reason: 'Sin path ni filename' };
  }

  // Normalize: use forward slashes for pattern matching
  const normalized = path.replace(/\\/g, '/');
  const reasons: string[] = [];

  let productType: StaticProductType | undefined;
  let brand: StaticBrand | undefined;

  // 1. SKU pattern (highest confidence)
  for (const { pattern, productType: pt, brand: br } of SKU_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      if (pt) productType = pt;
      if (br) brand = br;
      reasons.push(`SKU "${match[0]}" → ${pt ?? ''}${br ? '/' + br : ''}`);
      break;
    }
  }

  // 2. Folder pattern
  if (!productType) {
    for (const { pattern, productType: pt } of FOLDER_PATTERNS) {
      if (pattern.test(normalized)) {
        productType = pt;
        reasons.push(`folder → ${pt}`);
        break;
      }
    }
  }

  // 3. Brand keyword in filename
  if (!brand) {
    for (const { pattern, brand: br } of BRAND_KEYWORDS) {
      if (pattern.test(normalized)) {
        brand = br;
        reasons.push(`brand keyword → ${br}`);
        break;
      }
    }
  }

  // 4. Ambiguous shared-name check
  const filename = normalized.split('/').pop() ?? normalized;
  const sharedMatch = SHARED_NAMES.find((n) => filename.toUpperCase().includes(n));
  // Si el nombre es compartido Y el folder no resolvió perfume/deodorant, flag ambiguous.
  const ambiguous =
    Boolean(sharedMatch) && productType !== 'perfume' && productType !== 'deodorant';

  if (ambiguous) {
    reasons.push(
      `⚠ "${sharedMatch}" se usa en perfumes Y desodorantes — confirma el tipo manualmente`,
    );
  }

  return {
    productType,
    brand,
    ambiguous,
    reason: reasons.length > 0 ? reasons.join('; ') : 'No match',
  };
}
