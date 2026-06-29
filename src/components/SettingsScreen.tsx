// src/components/SettingsScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { colors, fonts } from '../theme';
import { useSettingsStore } from '../settings-store';
import { useRunStore } from '../store';
import { useMetaStore } from '../meta-store';
import { iapApi } from '../iap';
import { attUmpApi } from '../att-ump';
import {
  iapCompleted,
  iapFailed,
  iapRestored,
  iapSettingsViewed,
  iapStarted,
} from '../analytics-events';

interface Props {
  onClose: () => void;
}

function ToggleRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <Pressable style={styles.toggleRow} onPress={onToggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, enabled && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
      </View>
    </Pressable>
  );
}

export function SettingsScreen({ onClose }: Props) {
  const musicEnabled = useSettingsStore(s => s.musicEnabled);
  const sfxEnabled = useSettingsStore(s => s.sfxEnabled);
  const toggleMusic = useSettingsStore(s => s.toggleMusic);
  const toggleSfx = useSettingsStore(s => s.toggleSfx);
  const removeAdsEntitled = useMetaStore(s => s.removeAdsEntitled);
  const adServiceReady = useMetaStore(s => s.adServiceReady);
  const adServiceFailed = useMetaStore(s => s.adServiceFailed);
  const setRemoveAdsEntitled = useMetaStore(s => s.setRemoveAdsEntitled);
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);
  const [storePrice, setStorePrice] = useState<string | null>(null);
  const [iapBusy, setIapBusy] = useState<'purchase' | 'restore' | 'privacy' | null>(null);
  const [iapMessage, setIapMessage] = useState<string | null>(null);
  const loggedIapViewRef = useRef(false);
  const showIap = Platform.OS !== 'web';
  const iapAvailable = showIap && adServiceReady && !adServiceFailed;

  useEffect(() => {
    if (!showIap) return;
    if (!loggedIapViewRef.current) {
      loggedIapViewRef.current = true;
      iapSettingsViewed();
    }
    if (!iapAvailable) return;
    iapApi.fetchProducts()
      .then(products => {
        const product = products[0];
        if (product) setStorePrice(product.localizedPrice || product.price);
      })
      .catch(() => {});
  }, [iapAvailable, showIap]);

  const handleAbandon = () => {
    if (!confirmingAbandon) {
      setConfirmingAbandon(true);
      return;
    }
    setConfirmingAbandon(false);
    useRunStore.getState().abandonRun();
    onClose();
  };

  const handlePurchaseRemoveAds = async () => {
    if (!iapAvailable || iapBusy) return;
    setIapBusy('purchase');
    setIapMessage(null);
    iapStarted('settings');
    const result = await iapApi.purchaseRemoveAds();
    if (result.ok && result.purchased) {
      setRemoveAdsEntitled(true);
      iapCompleted(storePrice ?? 'store_price');
      setIapMessage('Ad-free enabled');
    } else if (result.error === 'cancelled') {
      iapFailed('cancelled');
      setIapMessage('Purchase cancelled');
    } else {
      iapFailed('error', result.error);
      setIapMessage('Purchase unavailable');
    }
    setIapBusy(null);
  };

  const handleRestorePurchases = async () => {
    if (!iapAvailable || iapBusy) return;
    setIapBusy('restore');
    setIapMessage(null);
    const result = await iapApi.restorePurchases();
    if (result.ok && result.removeAds) {
      setRemoveAdsEntitled(true);
      iapRestored('button');
      setIapMessage('Purchase restored');
    } else {
      iapFailed('error', result.error ?? 'no-entitlement');
      setIapMessage('No purchase found');
    }
    setIapBusy(null);
  };

  const handlePrivacyChoices = async () => {
    if (!iapAvailable || iapBusy) return;
    setIapBusy('privacy');
    setIapMessage(null);
    try {
      await attUmpApi.loadConsent();
      setIapMessage('Privacy choices updated');
    } catch {
      setIapMessage('Privacy choices unavailable');
    }
    setIapBusy(null);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>SETTINGS</Text>

        <View style={styles.section}>
          <ToggleRow label="Music" enabled={musicEnabled} onToggle={toggleMusic} />
          <ToggleRow label="Sound Effects" enabled={sfxEnabled} onToggle={toggleSfx} />
        </View>

        {showIap && (
          <View style={styles.section}>
            <View style={styles.iapPanel}>
              <View style={styles.iapHeaderRow}>
                <View>
                  <Text style={styles.iapEyebrow}>REMOVE ADS</Text>
                  <Text style={styles.iapTitle}>
                    {removeAdsEntitled ? 'AD-FREE' : (storePrice ?? 'STORE PRICE')}
                  </Text>
                </View>
                <View style={[styles.iapPill, removeAdsEntitled && styles.iapPillOwned]}>
                  <Text style={[styles.iapPillText, removeAdsEntitled && styles.iapPillTextOwned]}>
                    {removeAdsEntitled ? 'OWNED' : 'IAP'}
                  </Text>
                </View>
              </View>
              <Text style={styles.iapCopy}>
                Removes interstitials. Rewarded ads stay available.
              </Text>
              {!removeAdsEntitled && (
                <Pressable
                  style={[
                    styles.goldButton,
                    (!iapAvailable || !!iapBusy) && styles.actionDisabled,
                  ]}
                  disabled={!iapAvailable || !!iapBusy}
                  onPress={handlePurchaseRemoveAds}
                >
                  <Text style={styles.goldButtonText}>
                    {iapBusy === 'purchase' ? 'PURCHASING' : 'REMOVE ADS'}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={[
                  styles.secondaryRowButton,
                  (!iapAvailable || !!iapBusy) && styles.actionDisabled,
                ]}
                disabled={!iapAvailable || !!iapBusy}
                onPress={handleRestorePurchases}
              >
                <Text style={styles.secondaryRowText}>
                  {iapBusy === 'restore' ? 'RESTORING' : 'RESTORE PURCHASES'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryRowButton,
                  (!iapAvailable || !!iapBusy) && styles.actionDisabled,
                ]}
                disabled={!iapAvailable || !!iapBusy}
                onPress={handlePrivacyChoices}
              >
                <Text style={styles.secondaryRowText}>
                  {iapBusy === 'privacy' ? 'OPENING' : 'MANAGE PRIVACY CHOICES'}
                </Text>
              </Pressable>
              {iapMessage && <Text style={styles.iapMessage}>{iapMessage}</Text>}
              {!iapAvailable && <Text style={styles.iapMessage}>Store unavailable</Text>}
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.abandonButton,
            confirmingAbandon && styles.abandonButtonConfirm,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleAbandon}
        >
          <Text
            style={[
              styles.abandonText,
              confirmingAbandon && styles.abandonTextConfirm,
            ]}
          >
            {confirmingAbandon ? 'TAP AGAIN TO CONFIRM' : 'ABANDON RUN'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
          onPress={() => {
            setConfirmingAbandon(false);
            onClose();
          }}
        >
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,6,20,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 24,
    minWidth: 260,
    maxWidth: 320,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 0 30px rgba(0,229,255,0.15), 0 0 60px rgba(0,229,255,0.05)`,
    } as any : {}),
  },
  title: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 24,
    ...(Platform.OS === 'web' ? {
      textShadow: `0 0 12px rgba(0,229,255,0.4)`,
    } as any : {}),
  },
  section: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  iapPanel: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: 10,
    backgroundColor: colors.goldTint,
    padding: 12,
    gap: 10,
  },
  iapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  iapEyebrow: {
    color: colors.gold,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 2,
  },
  iapTitle: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 1,
  },
  iapPill: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.surface,
  },
  iapPillOwned: {
    borderColor: colors.cyan,
    backgroundColor: colors.cyanTint,
  },
  iapPillText: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  iapPillTextOwned: {
    color: colors.cyan,
  },
  iapCopy: {
    color: colors.inkDim,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  goldButton: {
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  goldButtonText: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 2,
  },
  secondaryRowButton: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryRowText: {
    color: colors.cyan,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  iapMessage: {
    color: colors.inkMute,
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    letterSpacing: 1,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textDim,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackOn: {
    borderColor: colors.gold,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 0 8px rgba(255,215,0,0.3)`,
    } as any : {}),
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textDim,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.gold,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 0 6px rgba(255,215,0,0.5)`,
    } as any : {}),
  },
  abandonButton: {
    // Abandon IS destructive, so pink is semantically correct under the new
    // palette rule (pink = loss/danger in UI chrome only).
    borderWidth: 1,
    borderColor: colors.pink,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
    minWidth: 220,
    alignItems: 'center',
  },
  abandonButtonConfirm: {
    backgroundColor: colors.pinkTint,
    borderColor: colors.pink,
  },
  abandonText: {
    color: colors.pink,
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  abandonTextConfirm: {
    color: colors.pink,
  },
  closeButton: {
    // Secondary action — neutral ink, no strong accent.
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  closeText: {
    color: colors.inkDim,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
