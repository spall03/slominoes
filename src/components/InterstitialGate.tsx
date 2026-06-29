import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { adsApi } from '../ads';
import { interstitialFailed, interstitialShown } from '../analytics-events';
import { useMetaStore } from '../meta-store';
import { useRunStore } from '../store';

const INTERSTITIAL_COOLDOWN_MS = 120_000;

interface Props {
  active: boolean;
  eligible: boolean;
  onComplete: () => void;
}

export function InterstitialGate({ active, eligible, onComplete }: Props) {
  const handledRef = useRef(false);

  useEffect(() => {
    if (!active) {
      handledRef.current = false;
      return;
    }
    if (handledRef.current) return;
    handledRef.current = true;

    let cancelled = false;
    const complete = () => {
      if (!cancelled) onComplete();
    };

    const run = async () => {
      const meta = useMetaStore.getState();
      const now = Date.now();
      const cooldownReady = now - meta.lastInterstitialAt >= INTERSTITIAL_COOLDOWN_MS;

      if (
        Platform.OS === 'web' ||
        !eligible ||
        !meta.adServiceReady ||
        meta.adServiceFailed ||
        meta.removeAdsEntitled ||
        !cooldownReady
      ) {
        complete();
        return;
      }

      if (!adsApi.isInterstitialReady()) {
        interstitialFailed('not-loaded');
        complete();
        return;
      }

      const result = await adsApi.showInterstitial();
      if (result.ok && result.shown) {
        useMetaStore.getState().markInterstitialShown();
        useRunStore.getState().markSawInterstitial();
        interstitialShown(useMetaStore.getState().cumulativeStats.totalRuns);
      } else {
        interstitialFailed(result.error ?? 'show-error');
      }
      adsApi.preloadInterstitial().catch(() => {});
      complete();
    };

    run().catch(() => {
      interstitialFailed('exception');
      complete();
    });

    return () => {
      cancelled = true;
    };
  }, [active, eligible, onComplete]);

  return null;
}
