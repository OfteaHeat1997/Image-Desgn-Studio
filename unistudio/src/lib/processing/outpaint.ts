// =============================================================================
// Outpainting / Canvas Extension Processing Module
// Platform presets for outpainting target sizes.
// Actual outpainting is handled by the /api/outpaint route via Flux Kontext Pro.
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformPreset {
  name: string;
  description: string;
  width: number;
  height: number;
  aspectRatio: string;
  background: string; // recommended background type
  category: 'marketplace' | 'social' | 'advertising';
}

// ---------------------------------------------------------------------------
// Platform Presets
// ---------------------------------------------------------------------------

export const PLATFORM_PRESETS: Record<string, PlatformPreset> = {
  amazon: {
    name: 'Amazon',
    description: 'Amazon product listing main image',
    width: 2000,
    height: 2000,
    aspectRatio: '1:1',
    background: 'white',
    category: 'marketplace',
  },
  shopify: {
    name: 'Shopify',
    description: 'Shopify product catalog image',
    width: 2048,
    height: 2048,
    aspectRatio: '1:1',
    background: 'white',
    category: 'marketplace',
  },
  'instagram-feed': {
    name: 'Instagram Feed',
    description: 'Instagram square feed post',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    background: 'lifestyle',
    category: 'social',
  },
  'instagram-post': {
    name: 'Instagram Post',
    description: 'Instagram portrait post (4:5)',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    background: 'lifestyle',
    category: 'social',
  },
  'instagram-story': {
    name: 'Instagram Story',
    description: 'Instagram / Facebook story (9:16)',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    background: 'lifestyle',
    category: 'social',
  },
  tiktok: {
    name: 'TikTok',
    description: 'TikTok vertical video cover',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    background: 'lifestyle',
    category: 'social',
  },
  pinterest: {
    name: 'Pinterest',
    description: 'Pinterest pin image (2:3)',
    width: 1000,
    height: 1500,
    aspectRatio: '2:3',
    background: 'lifestyle',
    category: 'social',
  },
  etsy: {
    name: 'Etsy',
    description: 'Etsy product listing image (4:3)',
    width: 2000,
    height: 1500,
    aspectRatio: '4:3',
    background: 'lifestyle',
    category: 'marketplace',
  },
  ebay: {
    name: 'eBay',
    description: 'eBay product listing image',
    width: 1600,
    height: 1600,
    aspectRatio: '1:1',
    background: 'white',
    category: 'marketplace',
  },
  'facebook-ad': {
    name: 'Facebook Ad',
    description: 'Facebook ad image (1:1)',
    width: 1200,
    height: 1200,
    aspectRatio: '1:1',
    background: 'lifestyle',
    category: 'advertising',
  },
  'youtube-thumb': {
    name: 'YouTube Thumbnail',
    description: 'YouTube video thumbnail (16:9)',
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    background: 'lifestyle',
    category: 'advertising',
  },
  banner: {
    name: 'Banner',
    description: 'Website / email banner (3:1)',
    width: 1500,
    height: 500,
    aspectRatio: '3:1',
    background: 'gradient',
    category: 'advertising',
  },
};

