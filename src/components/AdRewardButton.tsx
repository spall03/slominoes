import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { adsApi, type RewardedPlacement } from '../ads';
import {
  rewardedCompleted,
  rewardedDismissed,
  rewardedFailed,
  rewardedOffered,
  rewardedStarted,
} from '../analytics-events';
import { colors, fonts } from '../theme';

type RewardState = 'loading' | 'ready' | 'watching' | 'rewarded' | 'failed';

const failureCounts: Record<RewardedPlacement, number> = {
  respin_rescue: 0,
  continue: 0,
};

interface Props {
  placement: RewardedPlacement;
  level: number;
  title: string;
  detail?: string;
  rewardLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  hideWhenUnavailable?: boolean;
  onReward: () => void;
}

export function AdRewardButton({
  placement,
  level,
  title,
  detail,
  rewardLabel,
  compact,
  disabled,
  hideWhenUnavailable,
  onReward,
}: Props) {
  const [state, setState] = useState<RewardState>('loading');
  const [error, setError] = useState<string | null>(null);
  const offeredRef = useRef(false);
  const mountedRef = useRef(true);

  const hidden = Platform.OS === 'web' || failureCounts[placement] >= 3;

  const preload = useCallback(async () => {
    if (disabled || hidden) return;
    setState('loading');
    setError(null);
    try {
      if (!adsApi.isRewardedReady(placement)) {
        await adsApi.preloadRewarded(placement);
      }
      if (!mountedRef.current) return;
      if (adsApi.isRewardedReady(placement)) {
        setState('ready');
        failureCounts[placement] = 0;
        if (!offeredRef.current) {
          offeredRef.current = true;
          rewardedOffered(placement, level);
        }
      } else {
        failureCounts[placement] += 1;
        setState('failed');
        setError('not-ready');
        rewardedFailed(placement, 'not-ready');
      }
    } catch (e: any) {
      if (!mountedRef.current) return;
      failureCounts[placement] += 1;
      const reason = e?.message ?? 'load-error';
      setState('failed');
      setError(reason);
      rewardedFailed(placement, reason);
    }
  }, [disabled, hidden, level, placement]);

  useEffect(() => {
    mountedRef.current = true;
    offeredRef.current = false;
    preload();
    return () => {
      mountedRef.current = false;
    };
  }, [preload]);

  const handlePress = async () => {
    if (disabled || hidden || state === 'loading' || state === 'watching' || state === 'rewarded') return;
    if (state === 'failed' || !adsApi.isRewardedReady(placement)) {
      preload();
      return;
    }

    setState('watching');
    rewardedStarted(placement);
    const result = await adsApi.showRewarded(placement);
    if (!mountedRef.current) return;

    if (result.ok && result.rewarded) {
      rewardedCompleted(placement);
      setState('rewarded');
      onReward();
      return;
    }

    if (result.ok) {
      rewardedDismissed(placement);
      preload();
      return;
    }

    const reason = result.error ?? 'show-error';
    failureCounts[placement] += 1;
    rewardedFailed(placement, reason);
    setError(reason);
    setState('failed');
  };

  const isBusy = state === 'loading' || state === 'watching';
  const isFailed = state === 'failed';

  if (hidden || (hideWhenUnavailable && isFailed)) return null;

  const label = compact
    ? isFailed ? 'RETRY' : state === 'watching' ? 'AD' : title
    : isFailed ? 'AD UNAVAILABLE' : state === 'watching' ? 'OPENING' : title;
  const sublabel = isFailed ? (error ? 'TRY AGAIN LATER' : 'AD FAILED') : detail;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        isFailed && styles.buttonFailed,
        disabled && styles.buttonDisabled,
        pressed && !disabled && !isBusy && styles.buttonPressed,
      ]}
      disabled={disabled || isBusy || state === 'rewarded'}
      onPress={handlePress}
    >
      <View style={styles.labelRow}>
        {isBusy && !compact && <ActivityIndicator size="small" color={colors.cyan} />}
        <Text style={[styles.title, compact && styles.titleCompact]}>
          {isBusy && !compact ? 'LOADING' : label}
        </Text>
        {rewardLabel && !compact && !isFailed && (
          <Text style={styles.reward}>{rewardLabel}</Text>
        )}
      </View>
      {sublabel && (
        <Text style={[styles.detail, compact && styles.detailCompact]}>
          {sublabel}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: colors.cyanTint,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 0 14px rgba(0,229,255,0.25)',
    } as any) : {}),
  },
  buttonCompact: {
    minWidth: 58,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  buttonFailed: {
    borderColor: colors.line2,
    backgroundColor: colors.surface2,
    ...(Platform.OS === 'web' ? ({ boxShadow: 'none' } as any) : {}),
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  titleCompact: {
    fontSize: 9,
    letterSpacing: 1.3,
  },
  reward: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 1,
  },
  detail: {
    marginTop: 3,
    color: colors.inkDim,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  detailCompact: {
    marginTop: 0,
    fontSize: 8,
    letterSpacing: 1,
  },
});
