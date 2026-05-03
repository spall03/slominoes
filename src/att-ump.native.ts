// src/att-ump.native.ts
//
// Native ATT and UMP consent implementation. Imports the AdMob SDK
// directly (this file is never included in the web bundle).

import { Platform } from 'react-native';
import {
  AdsConsent,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';
import type { AttUmpApi, ATTStatus } from './att-ump';

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

export const attUmpApi: AttUmpApi = {
  async requestATT(): Promise<ATTStatus> {
    if (Platform.OS !== 'ios') return 'unsupported';
    try {
      // The SDK's built-in tracking authorization helper. Available in
      // react-native-google-mobile-ads v14+. Falls back gracefully if a
      // future version moves this API.
      const adsModule: any = require('react-native-google-mobile-ads');
      if (typeof adsModule.requestTrackingPermissionsAsync === 'function') {
        const result = await adsModule.requestTrackingPermissionsAsync();
        return mapATTStatus(result?.status);
      }
      return 'not_determined';
    } catch {
      return 'unsupported';
    }
  },

  async loadConsent(): Promise<void> {
    try {
      const consentInfo = await AdsConsent.requestInfoUpdate({
        // For pre-launch debugging: force EEA behavior. Comment in for testing.
        // debugGeography: AdsConsentDebugGeography.EEA,
      });

      if (consentInfo.status === AdsConsentStatus.REQUIRED) {
        await AdsConsent.showForm();
      }
    } catch {
      // Form unavailable (network error). Per spec: proceed with
      // non-personalized ads. AdMob falls back automatically when no
      // consent is recorded.
    }
  },
};
