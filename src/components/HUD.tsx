// src/components/HUD.tsx
import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';

interface HUDProps {
  level: number;
  score: number;
  threshold: number;
  batch: number;         // 1-indexed for display
  totalBatches: number;
  cascadeWave: number;   // 0 when not cascading
  phase: string;
}

export function HUD({ level, score, threshold, batch, totalBatches, cascadeWave, phase }: HUDProps) {
  const progress = Math.min(1, threshold > 0 ? score / threshold : 0);

  return (
    <View>
      <View style={styles.compactHud}>
        <Text style={styles.hudLevel}>L{level}</Text>
        <View style={styles.hudScoreWrap}>
          <Text style={styles.hudScore}>{score}</Text>
          <Text style={styles.hudGoal}> / {threshold}</Text>
        </View>
        {cascadeWave > 0 ? (
          <View style={styles.chainBadge}>
            <Text style={styles.chainBadgeText}>
              CHAIN x{cascadeWave}
            </Text>
          </View>
        ) : (
          <View style={styles.batchBadge}>
            <Text style={styles.batchBadgeText}>
              Batch {batch}/{totalBatches}
            </Text>
          </View>
        )}
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
  batchBadge: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  batchBadgeText: {
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  chainBadge: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  chainBadgeText: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 12,
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
