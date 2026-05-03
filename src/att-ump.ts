// src/att-ump.ts
//
// Default (web) ATT/UMP consent stubs. Metro auto-resolves to
// att-ump.native.ts on iOS/Android, which holds the real SDK calls.
//
// Keeping the SDK requires out of the platform-shared init file is required
// for the web bundle to build cleanly — Metro's static analysis follows
// require() chains regardless of runtime guards.

export type ATTStatus = 'granted' | 'denied' | 'restricted' | 'not_determined' | 'unsupported';

export interface AttUmpApi {
  /** Request App Tracking Transparency authorization (iOS 14+). */
  requestATT(): Promise<ATTStatus>;
  /** Load Google UMP consent form, show if required. Idempotent. */
  loadConsent(): Promise<void>;
}

// Web no-op.
export const attUmpApi: AttUmpApi = {
  async requestATT() {
    return 'unsupported';
  },
  async loadConsent() {
    // no-op
  },
};
