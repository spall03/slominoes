// src/crashlytics.ts
//
// Default (web) Crashlytics no-op + type interface. Metro auto-resolves to
// crashlytics.native.ts on iOS/Android.

export interface CrashlyticsApi {
  initialize(): Promise<void>;
  setCustomKey(key: string, value: string | number | boolean): void;
  log(message: string): void;
  recordError(error: Error): void;
  testCrash(): void;
}

// Web no-op.
export const crashlyticsApi: CrashlyticsApi = {
  async initialize() {
    // no-op
  },
  setCustomKey() {
    // no-op
  },
  log() {
    // no-op
  },
  recordError() {
    // no-op
  },
  testCrash() {
    // no-op
  },
};
