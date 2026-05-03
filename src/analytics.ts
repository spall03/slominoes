// src/analytics.ts
//
// Default (web) Analytics no-op + type interface. Metro auto-resolves to
// analytics.native.ts on iOS/Android.
//
// Call sites should use the typed event helpers in src/analytics-events.ts,
// not these primitives directly.

export type AnalyticsValue = string | number | boolean;

export interface AnalyticsApi {
  initialize(): Promise<void>;
  setUserProperty(name: string, value: AnalyticsValue | null): void;
  logEvent(name: string, params?: Record<string, AnalyticsValue>): void;
}

// Web no-op.
export const analyticsApi: AnalyticsApi = {
  async initialize() {
    // no-op
  },
  setUserProperty() {
    // no-op
  },
  logEvent() {
    // no-op
  },
};
