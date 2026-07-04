// src/ads.native.ts
//
// Native (iOS/Android) AdMob implementation using react-native-google-mobile-ads.
// Supports a build-time test-ad switch for TestFlight/internal builds. App
// Store builds use production ad unit IDs from Expo public env vars.
//
// IMPORTANT: this module must NOT be imported on web. The platform router in
// ./ads.ts handles that gating.

import {
  AdEventType,
  InterstitialAd,
  MobileAds,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import type {
  AdsApi,
  AdResult,
  InterstitialResult,
  RewardedPlacement,
  RewardedResult,
} from './ads';

// -----------------------------------------------------------------------------
// Ad unit IDs — demo IDs in dev/testflight, real IDs in production
// -----------------------------------------------------------------------------
// Google's public test IDs work in any AdMob app for development/testing.
//
// Production IDs are injected through Expo public env vars. If a production
// ID is missing, the corresponding ad placement stays unavailable instead of
// serving Google's test ads in a release build.
const USE_TEST_AD_UNITS = __DEV__ || process.env.EXPO_PUBLIC_ADMOB_USE_TEST_ADS === 'true';

const IOS_AD_UNITS = {
  rewardedRespinRescue: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_RESPIN_RESCUE_ID,
  rewardedContinue: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_CONTINUE_ID,
  interstitial: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
};

const ANDROID_AD_UNITS = {
  rewardedRespinRescue: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_RESPIN_RESCUE_ID,
  rewardedContinue: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_CONTINUE_ID,
  interstitial: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
};

const PRODUCTION_AD_UNITS = Platform.OS === 'ios' ? IOS_AD_UNITS : ANDROID_AD_UNITS;

const AD_UNITS = {
  rewardedRespinRescue: USE_TEST_AD_UNITS ? TestIds.REWARDED : PRODUCTION_AD_UNITS.rewardedRespinRescue,
  rewardedContinue: USE_TEST_AD_UNITS ? TestIds.REWARDED : PRODUCTION_AD_UNITS.rewardedContinue,
  interstitial: USE_TEST_AD_UNITS ? TestIds.INTERSTITIAL : PRODUCTION_AD_UNITS.interstitial,
};

// -----------------------------------------------------------------------------
// Ad instances — singletons per placement, recreated after each show
// -----------------------------------------------------------------------------

let rewardedRespinRescue: RewardedAd | null = null;
let rewardedContinue: RewardedAd | null = null;
let interstitial: InterstitialAd | null = null;

let rewardedRespinRescueLoaded = false;
let rewardedContinueLoaded = false;
let interstitialLoaded = false;

let rewardedRespinRescueLoading: Promise<void> | null = null;
let rewardedContinueLoading: Promise<void> | null = null;

// Failure counters — hide ad UIs after consecutive failures (per spec)
let rewardedFailureCount: Record<RewardedPlacement, number> = {
  respin_rescue: 0,
  continue: 0,
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getRewardedRef(placement: RewardedPlacement): {
  ad: RewardedAd | null;
  loaded: boolean;
  loading: Promise<void> | null;
  setAd: (a: RewardedAd | null) => void;
  setLoaded: (l: boolean) => void;
  setLoading: (p: Promise<void> | null) => void;
  unitId?: string;
} {
  if (placement === 'respin_rescue') {
    return {
      ad: rewardedRespinRescue,
      loaded: rewardedRespinRescueLoaded,
      loading: rewardedRespinRescueLoading,
      setAd: (a) => { rewardedRespinRescue = a; },
      setLoaded: (l) => { rewardedRespinRescueLoaded = l; },
      setLoading: (p) => { rewardedRespinRescueLoading = p; },
      unitId: AD_UNITS.rewardedRespinRescue,
    };
  }
  return {
    ad: rewardedContinue,
    loaded: rewardedContinueLoaded,
    loading: rewardedContinueLoading,
    setAd: (a) => { rewardedContinue = a; },
    setLoaded: (l) => { rewardedContinueLoaded = l; },
    setLoading: (p) => { rewardedContinueLoading = p; },
    unitId: AD_UNITS.rewardedContinue,
  };
}

// -----------------------------------------------------------------------------
// AdsApi implementation
// -----------------------------------------------------------------------------

export const adsApi: AdsApi = {
  async initialize(): Promise<AdResult> {
    try {
      await MobileAds().initialize();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'MobileAds init failed' };
    }
  },

  async preloadRewarded(placement: RewardedPlacement): Promise<void> {
    const ref = getRewardedRef(placement);
    if (ref.loaded) return; // already ready
    if (ref.loading) return ref.loading; // load already in flight
    if (rewardedFailureCount[placement] >= 3) return; // give up for session
    if (!ref.unitId) return; // production ad unit not configured
    const unitId = ref.unitId;

    const ad = RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: false, // honored at SDK level via UMP/ATT
    });
    ref.setAd(ad);
    ref.setLoaded(false);

    let resolveLoad: () => void = () => {};
    let unsubLoaded: () => void = () => {};
    let unsubError: () => void = () => {};
    const loadPromise = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });
    ref.setLoading(loadPromise);

    const finish = (loaded: boolean) => {
      const current = getRewardedRef(placement);
      if (current.ad === ad) {
        current.setLoaded(loaded);
        if (!loaded) rewardedFailureCount[placement] += 1;
      }
      if (current.loading === loadPromise) current.setLoading(null);
      unsubLoaded();
      unsubError();
      resolveLoad();
    };

    unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      const current = getRewardedRef(placement);
      if (current.ad === ad) {
        rewardedFailureCount[placement] = 0;
      }
      finish(true);
    });
    unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      finish(false);
    });

    try {
      ad.load();
    } catch {
      finish(false);
    }
    return loadPromise;
  },

  isRewardedReady(placement: RewardedPlacement): boolean {
    return getRewardedRef(placement).loaded;
  },

  async showRewarded(placement: RewardedPlacement): Promise<RewardedResult> {
    const ref = getRewardedRef(placement);
    if (!ref.ad || !ref.loaded) {
      return { ok: false, rewarded: false, error: 'not-loaded' };
    }

    return new Promise((resolve) => {
      let rewarded = false;

      const unsubReward = ref.ad!.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          rewarded = true;
        },
      );
      const unsubClosed = ref.ad!.addAdEventListener(AdEventType.CLOSED, () => {
        unsubReward();
        unsubClosed();
        unsubError();
        ref.setAd(null);
        ref.setLoaded(false);
        resolve({ ok: true, rewarded });
      });
      const unsubError = ref.ad!.addAdEventListener(AdEventType.ERROR, (e: unknown) => {
        unsubReward();
        unsubClosed();
        unsubError();
        ref.setAd(null);
        ref.setLoaded(false);
        resolve({ ok: false, rewarded: false, error: String(e) });
      });

      try {
        ref.ad!.show();
      } catch (e: any) {
        unsubReward();
        unsubClosed();
        unsubError();
        resolve({ ok: false, rewarded: false, error: e?.message });
      }
    });
  },

  async preloadInterstitial(): Promise<void> {
    if (interstitialLoaded) return;
    if (!AD_UNITS.interstitial) return;

    return new Promise((resolve) => {
      const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
        requestNonPersonalizedAdsOnly: false,
      });
      interstitial = ad;

      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        interstitialLoaded = true;
        unsubLoaded();
        unsubError();
        resolve();
      });
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        interstitialLoaded = false;
        unsubLoaded();
        unsubError();
        resolve();
      });

      ad.load();
    });
  },

  isInterstitialReady(): boolean {
    return interstitialLoaded;
  },

  async showInterstitial(): Promise<InterstitialResult> {
    if (!interstitial || !interstitialLoaded) {
      return { ok: false, shown: false, error: 'not-loaded' };
    }
    return new Promise((resolve) => {
      const unsubClosed = interstitial!.addAdEventListener(AdEventType.CLOSED, () => {
        unsubClosed();
        unsubError();
        interstitial = null;
        interstitialLoaded = false;
        resolve({ ok: true, shown: true });
      });
      const unsubError = interstitial!.addAdEventListener(AdEventType.ERROR, (e: unknown) => {
        unsubClosed();
        unsubError();
        interstitial = null;
        interstitialLoaded = false;
        resolve({ ok: false, shown: false, error: String(e) });
      });

      try {
        interstitial!.show();
      } catch (e: any) {
        unsubClosed();
        unsubError();
        resolve({ ok: false, shown: false, error: e?.message });
      }
    });
  },
};
