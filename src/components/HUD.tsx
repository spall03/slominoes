// src/components/HUD.tsx
import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, symbolColors } from '../theme';
import { SymbolIcon } from '../symbols/index';
import type { Symbol } from '../types';

interface HUDProps {
  level: number;
  score: number;
  currentGridScore: number;
  threshold: number;
  respinsRemaining: number;
  respinMode: boolean;
  nextRespinCost: number;
  /** Next domino symbols (null when no tile queued). Rendered as a compact preview on the right side. */
  nextTileA?: Symbol | null;
  nextTileB?: Symbol | null;
  tilesRemaining?: number;
  /** Mobile entry point to respin mode. Tap the respin count to toggle. */
  onRespinToggle?: () => void;
  /** Called when user taps the respin badge while out of respins (buys one then enters mode). */
  onBuyRespin?: () => void;
  canAffordRespin?: boolean;
  onSettingsPress?: () => void;
}

/**
 * Move 02 HUD:
 * - One headline number (best-score-this-level), no parenthetical
 * - Single progress bar with two fill layers:
 *   - ghost cyan fill at 18% opacity = current grid score position
 *   - solid gold fill = best score this level
 *   - 2px cyan tick at best position
 * - Respin count in neutral ink (pink when mode is active); tap to toggle on mobile
 * - Next-tile preview folded in on the right (no longer in BottomBar)
 */
export function HUD({
  level,
  score,
  currentGridScore,
  threshold,
  respinsRemaining,
  respinMode,
  nextRespinCost,
  nextTileA,
  nextTileB,
  tilesRemaining,
  onRespinToggle,
  onBuyRespin,
  canAffordRespin,
  onSettingsPress,
}: HUDProps) {
  const handleRespinPress = () => {
    if (respinsRemaining > 0) {
      onRespinToggle?.();
    } else if (canAffordRespin) {
      onBuyRespin?.();
    }
  };
  const respinDisabled = respinsRemaining === 0 && !canAffordRespin;
  const bestProgress = Math.min(1, threshold > 0 ? score / threshold : 0);
  const currentProgress = Math.min(1, threshold > 0 ? currentGridScore / threshold : 0);
  const scoreDiverged = score > currentGridScore;

  return (
    <View>
      <View style={styles.compactHud}>
        <Text style={styles.level}>L{level}</Text>
        <View style={styles.scoreBlock}>
          <Text style={styles.score}>{score}</Text>
          <Text style={styles.threshold}>/ {threshold}</Text>
        </View>
        <View style={styles.rightCluster}>
          {nextTileA && nextTileB && (
            <View style={styles.nextTile}>
              <View style={glowStyle(nextTileA)}>
                <SymbolIcon symbol={nextTileA} size={14} />
              </View>
              <View style={glowStyle(nextTileB)}>
                <SymbolIcon symbol={nextTileB} size={14} />
              </View>
              {typeof tilesRemaining === 'number' && (
                <Text style={styles.tilesLeft}>{tilesRemaining}</Text>
              )}
            </View>
          )}
          <Pressable
            style={[
              styles.respinBadge,
              respinMode && styles.respinBadgeActive,
              respinDisabled && styles.respinBadgeDisabled,
            ]}
            onPress={handleRespinPress}
            disabled={respinDisabled}
          >
            <Text style={[styles.respinLabel, respinMode && styles.respinLabelActive]}>
              RESPIN
            </Text>
            {respinsRemaining > 0 ? (
              <Text style={[styles.respinCount, respinMode && styles.respinCountActive]}>
                {respinsRemaining}
              </Text>
            ) : (
              <Text style={[styles.respinCost, respinDisabled && styles.respinCostDisabled]}>
                {nextRespinCost}pts
              </Text>
            )}
          </Pressable>
          {onSettingsPress && (
            <Pressable onPress={onSettingsPress} style={styles.settingsButton} hitSlop={8}>
              <Text style={styles.settingsIcon}>&#x2699;</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Progress bar — ghost (current grid score) behind, solid gold (best) on top,
          cyan tick at best position. */}
      <View style={styles.progressTrack}>
        {scoreDiverged && (
          <View
            style={[
              styles.ghostFill,
              { width: `${Math.round(currentProgress * 100)}%` } as any,
            ]}
          />
        )}
        <LinearGradient
          colors={[colors.gold, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.bestFill, { width: `${Math.round(bestProgress * 100)}%` } as any]}
        />
        {bestProgress > 0 && bestProgress < 1 && (
          <View
            style={[
              styles.bestTick,
              { left: `${Math.round(bestProgress * 100)}%` } as any,
            ]}
          />
        )}
      </View>
    </View>
  );
}

function glowStyle(sym: Symbol) {
  if (Platform.OS !== 'web') return undefined as any;
  const color = symbolColors[sym] ?? colors.cyan;
  return { filter: `drop-shadow(0 0 3px ${color})` } as any;
}

const styles = StyleSheet.create({
  compactHud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 8 : 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    marginHorizontal: 8,
    marginTop: 4,
    gap: 10,
  },
  level: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 1,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
    gap: 4,
  },
  score: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  threshold: {
    color: colors.inkMute,
    fontFamily: fonts.regular,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tilesLeft: {
    color: colors.inkDim,
    fontFamily: fonts.regular,
    fontSize: 10,
    marginLeft: 4,
    fontVariant: ['tabular-nums'],
  },
  respinBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    minWidth: 50,
  },
  respinBadgeActive: {
    borderColor: colors.pink,
    backgroundColor: colors.pinkTint,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 0 8px rgba(255,59,130,0.4)',
    } as any) : {}),
  },
  respinBadgeDisabled: {
    opacity: 0.4,
  },
  respinCostDisabled: {
    color: colors.inkMute,
  },
  respinLabel: {
    color: colors.inkMute,
    fontFamily: fonts.semiBold,
    fontSize: 8,
    letterSpacing: 1.5,
  },
  respinLabelActive: {
    color: colors.pink,
  },
  respinCount: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  respinCountActive: {
    color: colors.pink,
  },
  respinCost: {
    color: colors.gold,
    fontFamily: fonts.semiBold,
    fontSize: 10,
  },
  settingsButton: {
    padding: 2,
  },
  settingsIcon: {
    fontSize: 20,
    color: colors.inkDim,
    fontFamily: fonts.regular,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.line,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 2,
    position: 'relative',
  },
  ghostFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(0,229,255,0.18)',
    zIndex: 1,
  },
  bestFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
    zIndex: 2,
  },
  bestTick: {
    position: 'absolute',
    top: -1,
    width: 2,
    height: 8,
    backgroundColor: colors.cyan,
    zIndex: 3,
  },
});
