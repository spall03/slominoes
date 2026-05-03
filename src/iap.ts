// src/iap.ts
//
// Default (web) IAP no-op + type interface. Metro auto-resolves to
// iap.native.ts on iOS/Android. v1 only sells one product:
// "Remove Ads" non-consumable at $3.99.

export const REMOVE_ADS_PRODUCT_ID = 'com.2ndstrike.slominoes.removeads';

export interface IapProduct {
  productId: string;
  price: string;
  localizedPrice: string;
  title: string;
  description: string;
}

export interface IapResult {
  ok: boolean;
  error?: string;
}

export interface PurchaseResult extends IapResult {
  purchased: boolean;
}

export interface RestoreResult extends IapResult {
  removeAds: boolean;
}

export interface IapApi {
  initialize(): Promise<IapResult>;
  fetchProducts(): Promise<IapProduct[]>;
  purchaseRemoveAds(): Promise<PurchaseResult>;
  restorePurchases(): Promise<RestoreResult>;
  getActiveEntitlements(): Promise<{ removeAds: boolean }>;
  cleanup(): void;
}

// Web no-op. The web build is free and ad-free — no IAP needed.
export const iapApi: IapApi = {
  async initialize() {
    return { ok: true };
  },
  async fetchProducts() {
    return [];
  },
  async purchaseRemoveAds() {
    return { ok: false, purchased: false, error: 'web-platform' };
  },
  async restorePurchases() {
    return { ok: false, removeAds: false, error: 'web-platform' };
  },
  async getActiveEntitlements() {
    return { removeAds: false };
  },
  cleanup() {
    // no-op
  },
};
