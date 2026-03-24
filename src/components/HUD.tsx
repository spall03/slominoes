// src/components/HUD.tsx
import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';

interface HUDProps {
  level: number;
  score: number;
  threshold: number;
  respinsRemaining: number;
  respinMode: boolean;
  nextRespinCost: number;
}

export function HUD({ level, score, threshold, respinsRemaining, respinMode, nextRespinCost }: HUDProps) {
  const progress = Math.min(1, threshold > 0 ? score / threshold : 0);

  return (
    <View>
      <View style={styles.compactHud}>
        <Text style={styles.hudLevel}>L{level}</Text>
        <View style={styles.hudScoreWrap}>
          <Text style={styles.hudScore}>{score}</Text>
          <Text style={styles.hudGoal}> / {threshold}</Text>
        </View>
        <View style={[styles.respinBadge, respinMode && styles.respinBadgeActive]}>
          <Text style={[styles.respinBadgeLabel, respinMode && styles.respinBadgeLabelActive]}>
            {'⟳ '}
          </Text>
          {respinsRemaining > 0 ? (
            <Text style={[styles.respinBadgeText, respinMode && styles.respinBadgeTextActive]}>
              {respinsRemaining}
            </Text>
          ) : (
            <Text style={styles.respinCostText}>{nextRespinCost}pts</Text>
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
  respinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  respinBadgeActive: {
    backgroundColor: colors.respin,
  },
  respinBadgeLabel: {
    color: colors.respin,
    fontSize: 13,
  },
  respinBadgeLabelActive: {
    color: colors.textPrimary,
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
