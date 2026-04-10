// =============================================================================
// Ad Composition Pipeline - UniStudio
// Templates and pipeline for creating social media ads from product videos.
// =============================================================================

import type { AdFormat, AdTemplate, AdCreateOptions } from '@/types/video';

// ---------------------------------------------------------------------------
// Ad Templates
// ---------------------------------------------------------------------------

export const AD_TEMPLATES: Record<AdFormat, AdTemplate> = {
  'instagram-reel': {
    id: 'instagram-reel',
    name: 'Instagram Reel',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    maxDuration: 90,
    description: 'Video vertical para Reels (9:16)',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    maxDuration: 60,
    description: 'Video vertical para TikTok (9:16)',
  },
  'facebook-ad': {
    id: 'facebook-ad',
    name: 'Facebook Ad',
    aspectRatio: '1:1',
    width: 1080,
    height: 1080,
    maxDuration: 15,
    description: 'Video cuadrado para Facebook Ads (1:1)',
  },
  'facebook-marketplace': {
    id: 'facebook-marketplace',
    name: 'Meta Marketplace',
    aspectRatio: '1:1',
    width: 1080,
    height: 1080,
    maxDuration: 10,
    description: 'Video cuadrado para Facebook/Meta Marketplace (1:1)',
  },
  'youtube-short': {
    id: 'youtube-short',
    name: 'YouTube Short',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    maxDuration: 60,
    description: 'Video vertical para YouTube Shorts (9:16)',
  },
  'instagram-story': {
    id: 'instagram-story',
    name: 'Instagram Story',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    maxDuration: 15,
    description: 'Video vertical para Stories (9:16)',
  },
  'pinterest-pin': {
    id: 'pinterest-pin',
    name: 'Pinterest Video Pin',
    aspectRatio: '2:3',
    width: 1000,
    height: 1500,
    maxDuration: 15,
    description: 'Video vertical para Pinterest (2:3)',
  },
};

// ---------------------------------------------------------------------------
// Auto-prompt generation for ads
// ---------------------------------------------------------------------------

/** Build a video generation prompt from ad parameters */
export function buildAdPrompt(options: AdCreateOptions): string {
  if (options.autoPrompt) return options.autoPrompt;

  const template = AD_TEMPLATES[options.template];
  const isVertical = template.aspectRatio === '9:16' || template.aspectRatio === '2:3';

  // Meta Marketplace: focused on product showcase, clean, detailed
  if (options.template === 'facebook-marketplace') {
    const parts = [
      'Product showcase video for online marketplace listing,',
      'square format, clean white or neutral background,',
      'slow rotation showing all angles and details,',
      options.headline ? `product: ${options.headline},` : '',
      'clear product visibility, well-lit, no text overlay,',
      'e-commerce quality, professional product photography style',
    ];
    return parts.filter(Boolean).join(' ');
  }

  const parts = [
    'Professional product advertisement video,',
    isVertical ? 'vertical format, social media optimized,' : 'square format, social media optimized,',
    'smooth motion, high production value,',
    options.headline ? `featuring: ${options.headline},` : '',
    'clean typography overlay, modern design,',
    'brand-consistent color grading, commercial quality',
  ];

  return parts.filter(Boolean).join(' ');
}

/** Get the aspect ratio string for a template */
export function getTemplateAspectRatio(format: AdFormat): string {
  return AD_TEMPLATES[format]?.aspectRatio ?? '9:16';
}

/** Get recommended duration for a template */
export function getRecommendedDuration(format: AdFormat): number {
  const template = AD_TEMPLATES[format];
  if (!template) return 5;
  // For short formats, use 5s. For longer (reels/tiktok), use 10s
  return template.maxDuration >= 30 ? 10 : 5;
}

/** Get all available ad templates */
export function getAdTemplates(): AdTemplate[] {
  return Object.values(AD_TEMPLATES);
}
