// src/ad-init.ts
//
// Strict initialization state machine for ATT → UMP → AdMob → Analytics →
// Crashlytics → IAP. Per spec v2 — order is non-negotiable. ATT must
// resolve before any SDK init that could touch IDFA.
//
// On web, this is a no-op that immediately returns ready=true.

import { Platform } from 'react-native';
import { adsApi } from './ads';
import { analyticsApi } from './analytics';
import { crashlyticsApi } from './crashlytics';
import { iapApi } from './iap';
import { attUmpApi, type ATTStatus } from './att-ump';
import { userProperties, attResponse, appOpen } from './analytics-events';

export interface AdInitResult {
  ready: boolean;
  attStatus: ATTStatus;
  removeAdsEntitled: boolean;
  error?: string;
}

/**
 * Run the full init sequence. Idempotent — safe to call multiple times. Logs
 * the att_response analytics event after Firebase Analytics is up.
 *
 * On any catastrophic failure, returns ready=false with the failure reason.
 * App.tsx hides ad-using affordances when ready=false (graceful degradation).
 */
export async function initializeAdServices(): Promise<AdInitResult> {
  if (Platform.OS === 'web') {
    return {
      ready: true,
      attStatus: 'unsupported',
      removeAdsEntitled: false,
    };
  }

  try {
    // Step 1: ATT prompt (iOS only).
    const attStatus = await attUmpApi.requestATT();

    // Step 2: UMP consent form.
    await attUmpApi.loadConsent();

    // Step 3: AdMob initialize.
    const adsResult = await adsApi.initialize();
    if (!adsResult.ok) {
      return {
        ready: false,
        attStatus,
        removeAdsEntitled: false,
        error: adsResult.error,
      };
    }

    // Step 4: Firebase Analytics.
    await analyticsApi.initialize();
    appOpen();
    attResponse(attStatus);
    userProperties.attStatus(attStatus);

    // Step 5: Crashlytics.
    await crashlyticsApi.initialize();

    // Step 6: IAP — connect, then silent cold-start auto-restore.
    await iapApi.initialize();
    const entitlements = await iapApi.getActiveEntitlements();
    userProperties.iapRemoveAdsOwned(entitlements.removeAds);

    return {
      ready: true,
      attStatus,
      removeAdsEntitled: entitlements.removeAds,
    };
  } catch (e: any) {
    return {
      ready: false,
      attStatus: 'unsupported',
      removeAdsEntitled: false,
      error: e?.message ?? 'init failed',
    };
  }
}
