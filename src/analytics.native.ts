// src/analytics.native.ts
//
// Firebase Analytics on iOS/Android via @react-native-firebase/analytics.

import analytics from '@react-native-firebase/analytics';
import type { AnalyticsApi, AnalyticsValue } from './analytics';

let initialized = false;

export const analyticsApi: AnalyticsApi = {
  async initialize() {
    if (initialized) return;
    try {
      // Firebase auto-initializes from GoogleService-Info.plist; no explicit
      // setup call needed. setAnalyticsCollectionEnabled is idempotent.
      await analytics().setAnalyticsCollectionEnabled(true);
      initialized = true;
    } catch {
      // Silent — analytics failures should never block app boot
    }
  },

  setUserProperty(name: string, value: AnalyticsValue | null) {
    if (!initialized) return;
    try {
      const stringValue = value === null ? null : String(value);
      analytics().setUserProperty(name, stringValue);
    } catch {
      // silent
    }
  },

  logEvent(name: string, params?: Record<string, AnalyticsValue>) {
    if (!initialized) return;
    try {
      analytics().logEvent(name, params as any);
    } catch {
      // silent
    }
  },
};
