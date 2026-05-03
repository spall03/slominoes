// src/ads.ts
//
// Default (web) implementation + type interface. Metro auto-resolves to
// ads.native.ts on iOS/Android via the .native.ts platform extension.
// TypeScript always resolves to this file (web stub exposes the full
// interface so type-checking is correct on every platform).
//
// Web is ad-free per spec v2 — these no-ops let any UI render harmlessly.

export type RewardedPlacement = 'respin_rescue' | 'continue';

export interface AdResult {
  ok: boolean;
  error?: string;
}

export interface RewardedResult extends AdResult {
  rewarded: boolean;
}

export interface InterstitialResult extends AdResult {
  shown: boolean;
}

export interface AdsApi {
  initialize(): Promise<AdResult>;

  preloadRewarded(placement: RewardedPlacement): Promise<void>;
  isRewardedReady(placement: RewardedPlacement): boolean;
  showRewarded(placement: RewardedPlacement): Promise<RewardedResult>;

  preloadInterstitial(): Promise<void>;
  isInterstitialReady(): boolean;
  showInterstitial(): Promise<InterstitialResult>;
}

// Web no-op implementation. ads.native.ts overrides this on iOS/Android.
export const adsApi: AdsApi = {
  async initialize() {
    return { ok: true };
  },
  async preloadRewarded() {
    // no-op
  },
  isRewardedReady() {
    return false;
  },
  async showRewarded() {
    return { ok: false, rewarded: false, error: 'web-platform' };
  },
  async preloadInterstitial() {
    // no-op
  },
  isInterstitialReady() {
    return false;
  },
  async showInterstitial() {
    return { ok: false, shown: false, error: 'web-platform' };
  },
};
