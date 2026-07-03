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
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ErrorCode,
  type EventSubscription,
  type Product,
  type ProductOrSubscription,
  type Purchase,
  type PurchaseError,
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
  const displayPrice = p.displayPrice ?? String(p.price ?? '');
  return {
    productId: p.id,
    price: p.price != null ? String(p.price) : displayPrice,
    localizedPrice: displayPrice,
    title: p.title ?? 'Remove Ads',
    description: p.description ?? '',
  };
}

function isRemoveAds(p: Purchase): boolean {
  return p.productId === REMOVE_ADS_PRODUCT_ID;
}

function isOneTimeProduct(p: ProductOrSubscription): p is Product {
  return p.type === 'in-app';
}

function normalizeRemoveAdsPurchase(
  result: Purchase | Purchase[] | null | undefined,
): Purchase | null {
  if (Array.isArray(result)) {
    return result.find(isRemoveAds) ?? null;
  }
  return result && isRemoveAds(result) ? result : null;
}

function isUserCancelled(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return (
    code === ErrorCode.UserCancelled ||
    code === 'E_USER_CANCELLED' ||
    code === 'E_USER_CANCELED' ||
    code === 'user-cancelled'
  );
}

function errorMessage(e: unknown, fallback: string): string {
  const err = e as { message?: unknown; code?: unknown } | null;
  if (typeof err?.message === 'string' && err.message.length > 0) {
    return err.message;
  }
  if (typeof err?.code === 'string' && err.code.length > 0) {
    return err.code;
  }
  return fallback;
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
      const products = await fetchProducts({
        skus: [REMOVE_ADS_PRODUCT_ID],
        type: 'in-app',
      });
      return (products ?? []).filter(isOneTimeProduct).map(toIapProduct);
    } catch {
      return [];
    }
  },

  async purchaseRemoveAds(): Promise<PurchaseResult> {
    if (!connected) await iapApi.initialize();

    return new Promise<PurchaseResult>((resolve) => {
      let settled = false;
      let updateSub: EventSubscription | null = null;
      let errorSub: EventSubscription | null = null;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        updateSub?.remove();
        errorSub?.remove();
        if (timeout) clearTimeout(timeout);
      };

      const settle = (result: PurchaseResult) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const completePurchase = async (purchase: Purchase) => {
        try {
          await finishTransaction({ purchase, isConsumable: false });
          settle({ ok: true, purchased: true });
        } catch (e: unknown) {
          settle({
            ok: false,
            purchased: false,
            error: errorMessage(e, 'finish-transaction-failed'),
          });
        }
      };

      updateSub = purchaseUpdatedListener((purchase) => {
        if (isRemoveAds(purchase)) {
          void completePurchase(purchase);
        }
      });

      errorSub = purchaseErrorListener((error: PurchaseError) => {
        settle({
          ok: false,
          purchased: false,
          error: isUserCancelled(error)
            ? 'cancelled'
            : errorMessage(error, 'purchase-error'),
        });
      });

      timeout = setTimeout(() => {
        settle({ ok: false, purchased: false, error: 'purchase-timeout' });
      }, 120000);

      requestPurchase({
        type: 'in-app',
        request: {
          apple: { sku: REMOVE_ADS_PRODUCT_ID },
          google: { skus: [REMOVE_ADS_PRODUCT_ID] },
        },
      })
        .then((result) => {
          const purchase = normalizeRemoveAdsPurchase(result);
          if (purchase) {
            void completePurchase(purchase);
          }
        })
        .catch((e: unknown) => {
          settle({
            ok: false,
            purchased: false,
            error: isUserCancelled(e)
              ? 'cancelled'
              : errorMessage(e, 'purchase-error'),
          });
        });
    });
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
