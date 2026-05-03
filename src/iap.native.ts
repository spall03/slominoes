// src/iap.native.ts
//
// Native IAP via react-native-iap. StoreKit 2 on iOS.
//
// Source-of-truth model: StoreKit is truth, AsyncStorage is cache. Cold-start
// auto-restore queries StoreKit silently to recover entitlement after reinstall.
//
// The persisted `removeAdsEntitled` flag in useMetaStore is updated by
// callers, NOT by this module. This module only reads/writes StoreKit.

import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  type Product,
  type ProductPurchase,
} from 'react-native-iap';
import type {
  IapApi,
  IapProduct,
  IapResult,
  PurchaseResult,
  RestoreResult,
} from './iap';

// Inlined to avoid Metro circular import (Metro resolves './iap' to this file
// on native builds via the .native.ts extension). Must match iap.ts.
const REMOVE_ADS_PRODUCT_ID = 'com.2ndstrike.slominoes.removeads';

let connected = false;

function toIapProduct(p: Product): IapProduct {
  return {
    productId: p.productId,
    price: p.price,
    localizedPrice: p.localizedPrice ?? p.price,
    title: p.title ?? 'Remove Ads',
    description: p.description ?? '',
  };
}

function isRemoveAds(p: ProductPurchase): boolean {
  return p.productId === REMOVE_ADS_PRODUCT_ID;
}

export const iapApi: IapApi = {
  async initialize(): Promise<IapResult> {
    if (connected) return { ok: true };
    try {
      await initConnection();
      connected = true;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'IAP init failed' };
    }
  },

  async fetchProducts(): Promise<IapProduct[]> {
    if (!connected) await iapApi.initialize();
    try {
      const products = await getProducts({ skus: [REMOVE_ADS_PRODUCT_ID] });
      return products.map(toIapProduct);
    } catch {
      return [];
    }
  },

  async purchaseRemoveAds(): Promise<PurchaseResult> {
    if (!connected) await iapApi.initialize();
    try {
      const result = await requestPurchase({ sku: REMOVE_ADS_PRODUCT_ID });
      // result can be a Purchase or array; normalize
      const purchase = Array.isArray(result) ? result[0] : result;
      if (!purchase) {
        return { ok: false, purchased: false, error: 'no-purchase-returned' };
      }
      // Acknowledge the purchase to StoreKit (required to clear pending state)
      await finishTransaction({ purchase, isConsumable: false });
      return { ok: true, purchased: true };
    } catch (e: any) {
      const code = e?.code ?? 'unknown';
      // E_USER_CANCELLED is a non-error case
      if (code === 'E_USER_CANCELLED') {
        return { ok: false, purchased: false, error: 'cancelled' };
      }
      return { ok: false, purchased: false, error: e?.message ?? code };
    }
  },

  async restorePurchases(): Promise<RestoreResult> {
    if (!connected) await iapApi.initialize();
    try {
      const purchases = await getAvailablePurchases();
      const removeAds = purchases.some(isRemoveAds);
      return { ok: true, removeAds };
    } catch (e: any) {
      return { ok: false, removeAds: false, error: e?.message };
    }
  },

  async getActiveEntitlements(): Promise<{ removeAds: boolean }> {
    if (!connected) {
      const init = await iapApi.initialize();
      if (!init.ok) return { removeAds: false };
    }
    try {
      const purchases = await getAvailablePurchases();
      return { removeAds: purchases.some(isRemoveAds) };
    } catch {
      // Offline / StoreKit failure — caller should fall back to cached value
      return { removeAds: false };
    }
  },

  cleanup() {
    if (!connected) return;
    try {
      endConnection();
    } catch {
      // best-effort
    }
    connected = false;
  },
};
