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
import { userProperties, attResponse, appOpen, type ATTStatus } from './analytics-events';

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
    // -----------------------------------------------------------------------
    // Step 1: ATT prompt (iOS only). Must resolve before any SDK init.
    // -----------------------------------------------------------------------
    const attStatus = await requestATT();

    // -----------------------------------------------------------------------
    // Step 2: UMP consent form. Must resolve before AdMob init.
    // -----------------------------------------------------------------------
    await loadUMPConsent();

    // -----------------------------------------------------------------------
    // Step 3: AdMob initialize.
    // -----------------------------------------------------------------------
    const adsResult = await adsApi.initialize();
    if (!adsResult.ok) {
      return {
        ready: false,
        attStatus,
        removeAdsEntitled: false,
        error: adsResult.error,
      };
    }

    // -----------------------------------------------------------------------
    // Step 4: Firebase Analytics. Now safe to log events.
    // -----------------------------------------------------------------------
    await analyticsApi.initialize();
    appOpen();
    attResponse(attStatus);
    userProperties.attStatus(attStatus);

    // -----------------------------------------------------------------------
    // Step 5: Crashlytics.
    // -----------------------------------------------------------------------
    await crashlyticsApi.initialize();

    // -----------------------------------------------------------------------
    // Step 6: IAP — connect, then silent cold-start auto-restore.
    // -----------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// ATT integration
// ---------------------------------------------------------------------------
//
// react-native-google-mobile-ads exposes the ATT request flow. On Android
// (or pre-iOS-14) the call is a no-op and returns 'unsupported'.

async function requestATT(): Promise<ATTStatus> {
  if (Platform.OS !== 'ios') return 'unsupported';
  try {
    // Lazy-require so web build doesn't pull in the native module
    const { AdsConsent, AdsConsentStatus } = require('react-native-google-mobile-ads');

    // Use the SDK's built-in tracking authorization helper if available
    const adsModule = require('react-native-google-mobile-ads');
    if (typeof adsModule.requestTrackingPermissionsAsync === 'function') {
      const result = await adsModule.requestTrackingPermissionsAsync();
      return mapATTStatus(result?.status);
    }

    // Fallback: assume not_determined if the helper isn't available. UMP will
    // handle non-personalized ads regardless.
    return 'not_determined';
  } catch {
    return 'unsupported';
  }
}

function mapATTStatus(rawStatus: string | undefined): ATTStatus {
  switch (rawStatus) {
    case 'granted':
    case 'authorized':
      return 'granted';
    case 'denied':
      return 'denied';
    case 'restricted':
      return 'restricted';
    case 'not-determined':
    case 'undetermined':
      return 'not_determined';
    default:
      return 'unsupported';
  }
}

// ---------------------------------------------------------------------------
// UMP consent (EU GDPR)
// ---------------------------------------------------------------------------
//
// Requests consent info from Google's UMP SDK and shows the form if required.
// If the form fails to load (network error), proceed with non-personalized
// ads. The "Manage Privacy Choices" entry in Settings re-presents the form on
// demand.

async function loadUMPConsent(): Promise<void> {
  try {
    const { AdsConsent, AdsConsentStatus, AdsConsentDebugGeography } = require('react-native-google-mobile-ads');

    const consentInfo = await AdsConsent.requestInfoUpdate({
      // For pre-launch debugging: force EEA behavior. Comment out for prod builds.
      // debugGeography: AdsConsentDebugGeography.EEA,
    });

    if (consentInfo.status === AdsConsentStatus.REQUIRED) {
      await AdsConsent.showForm();
    }
  } catch {
    // Form unavailable (network error). Spec says: proceed with NPA ads.
    // The AdMob SDK will request non-personalized ads when no consent is
    // recorded.
  }
}
