// src/analytics-events.ts
//
// Typed event helpers for Firebase Analytics. Call sites use these instead of
// analyticsApi.logEvent() directly so we get compile-time safety on event
// names + parameter shapes.
//
// Spec: docs/superpowers/specs/2026-04-19-ad-support-design.md, "Analytics
// design (Firebase Analytics)" section. Total: 17 events + 5 user properties.

import { analyticsApi } from './analytics';
import type { SymbolId } from './symbols';

// -----------------------------------------------------------------------------
// User properties
// -----------------------------------------------------------------------------

export type ATTStatus = 'granted' | 'denied' | 'restricted' | 'not_determined' | 'unsupported';

export const userProperties = {
  iapRemoveAdsOwned(owned: boolean) {
    analyticsApi.setUserProperty('iap_remove_ads_owned', owned);
  },
  attStatus(status: ATTStatus) {
    analyticsApi.setUserProperty('att_status', status);
  },
  furthestLevelReached(level: number) {
    analyticsApi.setUserProperty('furthest_level_reached', level);
  },
  totalRunsPlayed(count: number) {
    analyticsApi.setUserProperty('total_runs_played', count);
  },
  unlocksOwnedCount(count: number) {
    analyticsApi.setUserProperty('unlocks_owned_count', count);
  },
};

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

// Session-level
export const appOpen = () =>
  analyticsApi.logEvent('app_open');

export const attResponse = (status: ATTStatus) =>
  analyticsApi.logEvent('att_response', { status });

// Run lifecycle
export interface RunStartedParams {
  loadout: string;          // comma-separated, sorted alphabetically
  loadout_size: number;
  has_crown: boolean;
  unlocks_count: number;
}
export const runStarted = (p: RunStartedParams) =>
  analyticsApi.logEvent('run_started', p as any);

export interface RunEndedParams {
  outcome: 'won' | 'lost' | 'abandoned';
  final_level: number;
  final_score: number;
  total_respins_used: number;
  continues_used: number;
  saw_interstitial: boolean;
  duration_ms: number;
}
export const runEnded = (p: RunEndedParams) =>
  analyticsApi.logEvent('run_ended', p as any);

// Level lifecycle
export interface LevelEndedParams {
  level: number;
  outcome: 'won' | 'lost' | 'auto_end';
  score: number;
  threshold: number;
  respins_used: number;
  respins_bought_in_level: number;
}
export const levelEnded = (p: LevelEndedParams) =>
  analyticsApi.logEvent('level_ended', p as any);

// Rewarded ads
export type RewardedPlacement = 'respin_rescue' | 'continue';

export const rewardedOffered = (placement: RewardedPlacement, level: number) =>
  analyticsApi.logEvent('rewarded_offered', { placement, level });

export const rewardedStarted = (placement: RewardedPlacement) =>
  analyticsApi.logEvent('rewarded_started', { placement });

export const rewardedCompleted = (placement: RewardedPlacement) =>
  analyticsApi.logEvent('rewarded_completed', { placement });

export const rewardedDismissed = (placement: RewardedPlacement) =>
  analyticsApi.logEvent('rewarded_dismissed', { placement });

export const rewardedFailed = (placement: RewardedPlacement, reason: string) =>
  analyticsApi.logEvent('rewarded_failed', { placement, reason });

export const continueUsed = (level: number, remainingAfter: 0 | 1) =>
  analyticsApi.logEvent('continue_used', { level, remaining_after: remainingAfter });

// Interstitials
export const interstitialShown = (runCount: number) =>
  analyticsApi.logEvent('interstitial_shown', { run_count: runCount });

export const interstitialFailed = (reason: string) =>
  analyticsApi.logEvent('interstitial_failed', { reason });

// IAP
export const iapSettingsViewed = () =>
  analyticsApi.logEvent('iap_settings_viewed');

export type IapTrigger = 'settings' | 'other';
export const iapStarted = (trigger: IapTrigger) =>
  analyticsApi.logEvent('iap_started', { trigger });

export const iapCompleted = (priceTier: string) =>
  analyticsApi.logEvent('iap_completed', { price_tier: priceTier });

export type IapFailReason = 'cancelled' | 'error' | 'pending';
export const iapFailed = (reason: IapFailReason, detail?: string) =>
  analyticsApi.logEvent('iap_failed', { reason, ...(detail ? { detail } : {}) });

export type IapRestoreTrigger = 'button' | 'auto_cold_start';
export const iapRestored = (trigger: IapRestoreTrigger) =>
  analyticsApi.logEvent('iap_restored', { trigger });

// Meta
export const unlockTriggered = (symbolId: SymbolId) =>
  analyticsApi.logEvent('unlock_triggered', { symbol_id: symbolId });

// ---------------------------------------------------------------------------
// Tutorial (FTUE Level 0) — separate event family per spec v3.
// Level 0 does NOT fire run_started / run_ended / level_ended.
// ---------------------------------------------------------------------------

export type TutorialStep = 1 | 1.5 | 2 | 3 | 4 | 5 | 6;

export const tutorialStarted = () =>
  analyticsApi.logEvent('tutorial_started');

export const tutorialStepAdvanced = (step: TutorialStep) =>
  analyticsApi.logEvent('tutorial_step_advanced', { step });

export const tutorialCompleted = (params: { respin_used: boolean }) =>
  analyticsApi.logEvent('tutorial_completed', params);

export const tutorialSkipped = () =>
  analyticsApi.logEvent('tutorial_skipped');

// -----------------------------------------------------------------------------
// Helper: build comma-separated sorted loadout string
// -----------------------------------------------------------------------------

export function buildLoadoutString(symbolIds: SymbolId[]): string {
  return [...symbolIds].sort().join(',');
}
