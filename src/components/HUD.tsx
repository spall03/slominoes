// src/components/HUD.tsx
import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';
import { RespinRow } from '../symbols/RespinRow';

interface HUDProps {
  level: number;
  score: number;
  threshold: number;
  respinsRemaining: number;
  respinMode: boolean;
  nextRespinCost: number;
  onSettingsPress?: () => void;
}

export function HUD({ level, score, threshold, respinsRemaining, respinMode, nextRespinCost, onSettingsPress }: HUDProps) {
  const progress = Math.min(1, threshold > 0 ? score / threshold : 0);

  return (
    <View>
      <View style={styles.compactHud}>
        <Text style={styles.hudLevel}>L{level}</Text>
        <View style={styles.hudScoreWrap}>
          <Text style={styles.hudScore}>{score}</Text>
          <Text style={styles.hudGoal}> / {threshold}</Text>
        </View>
        <View style={styles.rightCluster}>
          <View style={[styles.respinBadge, respinMode && styles.respinBadgeActive]}>
            <View style={styles.respinIconWrap}>
              <RespinRow size={18} />
            </View>
            {respinsRemaining > 0 ? (
              <Text style={[styles.respinBadgeText, respinMode && styles.respinBadgeTextActive]}>
                {respinsRemaining}
              </Text>
            ) : (
              <Text style={styles.respinCostText}>{nextRespinCost}pts</Text>
            )}
          </View>
          {onSettingsPress && (
            <Pressable onPress={onSettingsPress} style={styles.settingsButton} hitSlop={8}>
              <Text style={styles.settingsIcon}>&#x2699;</Text>
            </Pressable>
          )}
        </View>
      </View>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[colors.pink, colors.cyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` } as any]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 8 : 4,
    backgroundColor: colors.hudBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginHorizontal: 8,
    marginTop: 4,
  },
  hudLevel: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  hudScoreWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  hudScore: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
    fontSize: 18,
  },
  hudGoal: {
    color: colors.textDim,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  respinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  respinBadgeActive: {
    backgroundColor: colors.respin,
  },
  respinIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    padding: 2,
  },
  settingsIcon: {
    fontSize: 22,
    color: colors.textMuted,
    fontFamily: fonts.regular,
    ...(Platform.OS === 'web' ? {
      textShadow: `0 0 6px rgba(136,136,136,0.4)`,
    } as any : {}),
  },
  respinBadgeText: {
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  respinBadgeTextActive: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
  },
  respinCostText: {
    color: colors.gold,
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 4,
  },
});
