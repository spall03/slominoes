// src/crashlytics.native.ts
//
// Firebase Crashlytics on iOS/Android via @react-native-firebase/crashlytics.
// Auto-collects crashes and ANRs. Custom keys per spec are set from store
// state-change handlers (currentLevel, runPhase, placementMode,
// removeAdsEntitled).

import crashlytics from '@react-native-firebase/crashlytics';
import type { CrashlyticsApi } from './crashlytics';

let initialized = false;

export const crashlyticsApi: CrashlyticsApi = {
  async initialize() {
    if (initialized) return;
    try {
      await crashlytics().setCrashlyticsCollectionEnabled(true);
      initialized = true;
    } catch {
      // silent — crashlytics failure must not block app boot
    }
  },

  setCustomKey(key: string, value: string | number | boolean) {
    if (!initialized) return;
    try {
      if (typeof value === 'boolean') {
        crashlytics().setAttribute(key, String(value));
      } else if (typeof value === 'number') {
        crashlytics().setAttribute(key, String(value));
      } else {
        crashlytics().setAttribute(key, value);
      }
    } catch {
      // silent
    }
  },

  log(message: string) {
    if (!initialized) return;
    try {
      crashlytics().log(message);
    } catch {
      // silent
    }
  },

  recordError(error: Error) {
    if (!initialized) return;
    try {
      crashlytics().recordError(error);
    } catch {
      // silent
    }
  },

  testCrash() {
    if (!__DEV__) return; // never in production
    crashlytics().crash();
  },
};
