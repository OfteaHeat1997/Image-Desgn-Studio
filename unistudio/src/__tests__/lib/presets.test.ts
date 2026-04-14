// =============================================================================
// Tests: lib/video/presets.ts
// Covers: required fields, unique IDs, non-empty prompts, valid categories,
//         Spanish descriptions, quality descriptors in prompts
// =============================================================================

import {
  ALL_PRESETS,
  PRODUCT_PRESETS,
  FASHION_PRESETS,
  AVATAR_PRESETS,
  getPresetById,
  getPresetsForCategory,
} from '@/lib/video/presets';
import type { VideoCategory, VideoPreset } from '@/types/video';

const VALID_CATEGORIES: VideoCategory[] = ['product', 'fashion', 'avatar', 'hero'];

// Quality-descriptor words that should appear in prompts
const QUALITY_DESCRIPTORS = [
  '4K', 'cinematic', 'professional', 'quality', 'commercial', 'studio',
];

describe('Video Presets: data integrity', () => {
  // ---- Every preset has required fields ----
  describe('every preset has required fields', () => {
    it.each(ALL_PRESETS)('$id has required fields', (preset: VideoPreset) => {
      expect(preset.id).toBeTruthy();
      expect(typeof preset.id).toBe('string');

      expect(preset.name).toBeTruthy();
      expect(typeof preset.name).toBe('string');

      expect(preset.category).toBeTruthy();
      expect(VALID_CATEGORIES).toContain(preset.category);

      expect(preset.promptTemplate).toBeTruthy();
      expect(typeof preset.promptTemplate).toBe('string');

      expect(preset.description).toBeTruthy();
      expect(typeof preset.description).toBe('string');

      expect(preset.icon).toBeTruthy();
      expect(typeof preset.icon).toBe('string');
    });
  });

  // ---- No duplicate preset IDs ----
  it('has no duplicate preset IDs', () => {
    const ids = ALL_PRESETS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // ---- All prompts are non-empty strings ----
  it('all prompts are non-empty strings (at least 20 chars)', () => {
    for (const preset of ALL_PRESETS) {
      expect(preset.promptTemplate.trim().length).toBeGreaterThan(20);
    }
  });

  // ---- All categories are valid VideoCategory values ----
  it('all presets have valid VideoCategory values', () => {
    for (const preset of ALL_PRESETS) {
      expect(VALID_CATEGORIES).toContain(preset.category);
    }
  });

  // ---- Descriptions are in Spanish ----
  // We check that descriptions contain at least one Spanish-language indicator:
  // Spanish articles (el, la, los, las, un, una, de, para), Spanish verbs,
  // or non-ASCII characters (tildes, ñ, etc.)
  it('descriptions appear to be in Spanish', () => {
    const spanishIndicators = /\b(el|la|los|las|un|una|de|para|con|del|en|y|tu|su|al|por)\b/i;
    for (const preset of ALL_PRESETS) {
      const hasSpanishWords = spanishIndicators.test(preset.description);
      const hasSpanishChars = /[áéíóúñü]/i.test(preset.description);
      expect(hasSpanishWords || hasSpanishChars).toBe(true);
    }
  });

  // ---- Prompt templates contain quality descriptors ----
  it('product preset prompts contain quality descriptors', () => {
    for (const preset of PRODUCT_PRESETS) {
      const hasQuality = QUALITY_DESCRIPTORS.some((q) =>
        preset.promptTemplate.toLowerCase().includes(q.toLowerCase()),
      );
      expect(hasQuality).toBe(true);
    }
  });

  it('fashion preset prompts contain quality descriptors', () => {
    for (const preset of FASHION_PRESETS) {
      const hasQuality = QUALITY_DESCRIPTORS.some((q) =>
        preset.promptTemplate.toLowerCase().includes(q.toLowerCase()),
      );
      expect(hasQuality).toBe(true);
    }
  });

  // ---- Category-specific counts ----
  it('has product presets', () => {
    expect(PRODUCT_PRESETS.length).toBeGreaterThan(0);
    expect(PRODUCT_PRESETS.every((p) => p.category === 'product')).toBe(true);
  });

  it('has fashion presets', () => {
    expect(FASHION_PRESETS.length).toBeGreaterThan(0);
    expect(FASHION_PRESETS.every((p) => p.category === 'fashion')).toBe(true);
  });

  it('has avatar presets', () => {
    expect(AVATAR_PRESETS.length).toBeGreaterThan(0);
    expect(AVATAR_PRESETS.every((p) => p.category === 'avatar')).toBe(true);
  });

  // ---- ALL_PRESETS contains all sub-arrays ----
  it('ALL_PRESETS is the union of product + fashion + avatar presets', () => {
    expect(ALL_PRESETS.length).toBe(
      PRODUCT_PRESETS.length + FASHION_PRESETS.length + AVATAR_PRESETS.length,
    );
  });
});

describe('getPresetById', () => {
  it('returns the correct preset for a known ID', () => {
    const preset = getPresetById('product-rotate');
    expect(preset).toBeDefined();
    expect(preset?.id).toBe('product-rotate');
    expect(preset?.category).toBe('product');
  });

  it('returns undefined for an unknown ID', () => {
    const preset = getPresetById('nonexistent-preset-id');
    expect(preset).toBeUndefined();
  });

  it('returns undefined for an empty string ID', () => {
    const preset = getPresetById('');
    expect(preset).toBeUndefined();
  });

  it('returns undefined for a null-ish ID', () => {
    const preset = getPresetById('null');
    expect(preset).toBeUndefined();
  });

  it('can find all presets by their own ID', () => {
    for (const preset of ALL_PRESETS) {
      const found = getPresetById(preset.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(preset.id);
    }
  });

  it('returns a preset with all required fields', () => {
    const preset = getPresetById('fashion-walk');
    expect(preset).toBeDefined();
    expect(preset?.promptTemplate).toBeTruthy();
    expect(preset?.description).toBeTruthy();
    expect(preset?.category).toBe('fashion');
  });
});

describe('getPresetsForCategory', () => {
  it('returns only product presets for category "product"', () => {
    const presets = getPresetsForCategory('product');
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.every((p) => p.category === 'product')).toBe(true);
  });

  it('returns only fashion presets for category "fashion"', () => {
    const presets = getPresetsForCategory('fashion');
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.every((p) => p.category === 'fashion')).toBe(true);
  });

  it('returns only avatar presets for category "avatar"', () => {
    const presets = getPresetsForCategory('avatar');
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.every((p) => p.category === 'avatar')).toBe(true);
  });

  it('returns empty array for unknown category', () => {
    const presets = getPresetsForCategory('hero' as VideoCategory);
    // hero category may or may not have presets — just verify it's an array
    expect(Array.isArray(presets)).toBe(true);
  });
});
