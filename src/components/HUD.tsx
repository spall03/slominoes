// src/components/HUD.tsx
import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';
import { RespinRow } from '../symbols/RespinRow';

interface HUDProps {
  level: number;
  score: number;
  currentGridScore: number;
  threshold: number;
  respinsRemaining: number;
  respinMode: boolean;
  nextRespinCost: number;
  onSettingsPress?: () => void;
}

export function HUD({ level, score, currentGridScore, threshold, respinsRemaining, respinMode, nextRespinCost, onSettingsPress }: HUDProps) {
  const bestProgress = Math.min(1, threshold > 0 ? score / threshold : 0);
  const currentProgress = Math.min(1, threshold > 0 ? currentGridScore / threshold : 0);
  const scoreDiverged = score > currentGridScore;

  return (
    <View>
      <View style={styles.compactHud}>
        <Text style={styles.hudLevel}>L{level}</Text>
        <View style={styles.hudScoreWrap}>
          <Text style={styles.hudScore}>{score}</Text>
          {scoreDiverged && (
            <Text style={styles.hudCurrentScore}> ({currentGridScore})</Text>
          )}
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
      {/* Progress bar: current grid score (dim) + best score (bright) */}
      <View style={styles.progressTrack}>
        {/* Current grid score — dimmer, shows where you are now */}
        {scoreDiverged && (
          <View style={[styles.progressCurrentFill, { width: `${Math.round(currentProgress * 100)}%` } as any]} />
        )}
        {/* Best score — main bright gradient bar */}
        <LinearGradient
          colors={[colors.pink, colors.cyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.round(bestProgress * 100)}%` } as any]}
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
  hudCurrentScore: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
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
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 2,
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
    zIndex: 2,
  },
  progressCurrentFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
});
