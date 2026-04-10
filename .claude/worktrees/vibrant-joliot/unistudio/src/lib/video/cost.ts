// =============================================================================
// Video Cost Calculator - UniStudio
// Calculates costs for video generation, avatars, and TTS.
// =============================================================================

import type {
  VideoProviderKey,
  AvatarProviderKey,
  TtsProviderKey,
} from '@/types/video';
import { VIDEO_PROVIDERS, AVATAR_PROVIDERS, TTS_PROVIDERS, getProviderCost } from './providers';

// ---------------------------------------------------------------------------
// Cost Calculation
// ---------------------------------------------------------------------------

/** Calculate cost for video generation */
export function calculateVideoCost(
  providerKey: VideoProviderKey,
  duration: number,
): number {
  const provider = VIDEO_PROVIDERS[providerKey];
  if (!provider) return 0;
  return getProviderCost(provider, duration);
}

/** Calculate cost for avatar generation (video + TTS) */
export function calculateAvatarCost(
  avatarProviderKey: AvatarProviderKey,
  ttsProviderKey: TtsProviderKey,
): number {
  const avatarProvider = AVATAR_PROVIDERS[avatarProviderKey];
  const ttsProvider = TTS_PROVIDERS[ttsProviderKey];
  if (!avatarProvider || !ttsProvider) return 0;
  return avatarProvider.costPerVideo + ttsProvider.costPerRequest;
}

/** Calculate total ad creation cost (video + composition) */
export function calculateAdCost(
  videoProviderKey: VideoProviderKey,
  duration: number,
): number {
  // Ad cost = video generation cost (composition is free, done locally)
  return calculateVideoCost(videoProviderKey, duration);
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Format a cost as a display string */
export function formatCost(cost: number): string {
  if (cost === 0) return 'GRATIS';
  if (cost < 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/** Format provider cost label for select dropdowns */
export function formatProviderCostLabel(
  providerKey: VideoProviderKey,
  duration: number = 5,
): string {
  const provider = VIDEO_PROVIDERS[providerKey];
  if (!provider) return providerKey;

  const cost = getProviderCost(provider, duration);
  const costStr = formatCost(cost);
  const qualityLabel =
    provider.quality === 'draft' ? 'borrador'
    : provider.quality === 'standard' ? 'standard'
    : 'premium';

  return `${provider.name} · ${costStr} (${qualityLabel})`;
}

/** Format avatar provider cost label */
export function formatAvatarCostLabel(providerKey: AvatarProviderKey): string {
  const provider = AVATAR_PROVIDERS[providerKey];
  if (!provider) return providerKey;

  const costStr = formatCost(provider.costPerVideo);
  return `${provider.name} · ${costStr}`;
}

/** Format TTS provider cost label */
export function formatTtsCostLabel(providerKey: TtsProviderKey): string {
  const provider = TTS_PROVIDERS[providerKey];
  if (!provider) return providerKey;

  const costStr = formatCost(provider.costPerRequest);
  return `${provider.name} · ${costStr}`;
}

// ---------------------------------------------------------------------------
// Budget estimation
// ---------------------------------------------------------------------------

export interface BudgetEstimate {
  videosPerDollar: number;
  monthlyCostAt20Videos: number;
  providerKey: VideoProviderKey;
}

/** Estimate budget for a provider */
export function estimateBudget(
  providerKey: VideoProviderKey,
  duration: number = 5,
): BudgetEstimate {
  const cost = calculateVideoCost(providerKey, duration);
  return {
    videosPerDollar: cost > 0 ? Math.floor(1 / cost) : Infinity,
    monthlyCostAt20Videos: cost * 20,
    providerKey,
  };
}
