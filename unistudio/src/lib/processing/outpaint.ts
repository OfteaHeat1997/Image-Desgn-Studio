// =============================================================================
// Outpainting / Canvas Extension Processing Module
// =============================================================================

import { runModel, extractOutputUrl } from '@/lib/api/replicate';

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

// ---------------------------------------------------------------------------
// Outpaint with Flux Kontext Pro
// ---------------------------------------------------------------------------

/**
 * Extend the canvas of an image to a target aspect ratio using Flux Kontext Pro.
 * The model intelligently generates content in the extended areas while
 * preserving the original image content.
 *
 * @param imageUrl          - URL of the source image.
 * @param targetAspectRatio - Desired output aspect ratio (e.g. '16:9', '4:5', '9:16').
 * @param prompt            - Optional prompt to guide the outpainted content.
 * @returns URL of the outpainted image.
 */
export async function outpaintKontext(
  imageUrl: string,
  targetAspectRatio: string,
  prompt?: string,
): Promise<string> {
  const outpaintPrompt = prompt
    ? `Extend the image canvas to ${targetAspectRatio} aspect ratio. Fill the new areas with: ${prompt}. Keep the original content EXACTLY the same.`
    : `Extend the image canvas to ${targetAspectRatio} aspect ratio. Naturally extend the background and scene. Keep the original content EXACTLY the same.`;

  const output = await runModel('black-forest-labs/flux-kontext-pro', {
    input_image: imageUrl,
    prompt: outpaintPrompt,
    aspect_ratio: targetAspectRatio,
  });

  return extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Outpaint with Flux Fill (mask-based)
// ---------------------------------------------------------------------------

/**
 * Outpaint an image using Flux Fill (Dev or Pro) with a mask indicating
 * the areas to generate. Useful when you have precise control over which
 * areas need to be filled.
 *
 * @param imageUrl - URL of the source image (padded to target size with transparent/black areas).
 * @param maskUrl  - URL of the mask image (white = areas to generate, black = preserve).
 * @param prompt   - Text description guiding the content generation for outpainted areas.
 * @param usePro   - Whether to use flux-fill-pro (true) or flux-fill-dev (false). Defaults to false.
 * @returns URL of the outpainted image.
 */
export async function outpaintFluxFill(
  imageUrl: string,
  maskUrl: string,
  prompt: string,
  usePro: boolean = false,
): Promise<string> {
  const model = usePro
    ? 'black-forest-labs/flux-fill-pro'
    : 'black-forest-labs/flux-fill-dev';

  const output = await runModel(model, {
    image: imageUrl,
    mask: maskUrl,
    prompt,
  });

  return extractOutputUrl(output);
}

// ---------------------------------------------------------------------------
// Smart Outpaint (platform-aware)
// ---------------------------------------------------------------------------

/**
 * Automatically outpaint an image to match a specific platform's requirements.
 * Looks up the platform preset and uses the appropriate outpainting method.
 *
 * @param imageUrl - URL of the source image.
 * @param platform - Platform key from PLATFORM_PRESETS (e.g. 'amazon', 'instagram-story').
 * @returns URL of the outpainted image resized for the target platform.
 * @throws If the platform preset is not found.
 */
export async function smartOutpaint(
  imageUrl: string,
  platform: string,
): Promise<string> {
  const preset = PLATFORM_PRESETS[platform];
  if (!preset) {
    const available = Object.keys(PLATFORM_PRESETS).join(', ');
    throw new Error(
      `Unknown platform "${platform}". Available: ${available}`,
    );
  }

  // Build a contextual prompt based on the platform's recommended background
  let backgroundPrompt: string;
  switch (preset.background) {
    case 'white':
      backgroundPrompt =
        'Extend with a clean, pure white background. Professional product photography, seamless white backdrop.';
      break;
    case 'lifestyle':
      backgroundPrompt =
        'Extend with a natural lifestyle background that matches the existing scene. Continue the environment and lighting naturally.';
      break;
    case 'gradient':
      backgroundPrompt =
        'Extend with a smooth gradient background that seamlessly continues from the existing image. Modern and clean.';
      break;
    default:
      backgroundPrompt =
        'Extend the background naturally, seamlessly continuing the existing scene.';
  }

  return outpaintKontext(imageUrl, preset.aspectRatio, backgroundPrompt);
}
