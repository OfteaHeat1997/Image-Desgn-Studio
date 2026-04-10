// =============================================================================
// Shared category mapping helpers for TryOn / Model-Create routes
// =============================================================================

import type { FashnCategory } from '@/lib/api/fashn';

/** Map any category format to IDM-VTON's expected values */
export function toIdmVtonCategory(cat: string): string {
  const map: Record<string, string> = {
    tops: 'upper_body',
    'upper-body': 'upper_body',
    upper_body: 'upper_body',
    bottoms: 'lower_body',
    'lower-body': 'lower_body',
    lower_body: 'lower_body',
    dresses: 'dresses',
    'one-pieces': 'dresses',
    'full-body': 'dresses',
  };
  return map[cat] ?? 'upper_body';
}

/** Map internal categories to FASHN categories */
export function toFashnCategory(category: string): FashnCategory {
  switch (category) {
    case 'dresses':
    case 'one-pieces':
      return 'one-pieces';
    case 'outerwear':
    case 'tops':
      return 'tops';
    case 'bottoms':
      return 'bottoms';
    default:
      return 'auto';
  }
}
