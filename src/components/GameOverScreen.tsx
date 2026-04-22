// src/components/GameOverScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';
import { NUM_LEVELS } from '../constants';
import { useRunStore } from '../store';
import { useMetaStore, UNLOCK_CONDITIONS } from '../meta-store';
import { SYMBOL_ROSTER } from '../symbols';
import { startMusic, stopMusic } from '../music';

export function GameOverScreen() {
  const { currentLevel, levelScore, levelConfig } = useRunStore();
  const endRun = useMetaStore(s => s.endRun);
  const unlockedSymbols = useMetaStore(s => s.unlockedSymbols);
  const endRunCalled = useRef(false);

  // Count non-base unlockable symbols
  const totalUnlockable = UNLOCK_CONDITIONS.length;
  const unlockedCount = UNLOCK_CONDITIONS.filter(c => unlockedSymbols.has(c.symbolId)).length;
  const allUnlocked = unlockedCount >= totalUnlockable;

  const won = currentLevel >= NUM_LEVELS && levelScore >= 0;

  useEffect(() => {
    if (won) {
      try { stopMusic(); } catch {}
    } else {
      try { startMusic('loss'); } catch {}
    }
    return () => { try { stopMusic(); } catch {} };
  }, [won]);

  // Call endRun once when this screen mounts
  useEffect(() => {
    if (!endRunCalled.current) {
      endRunCalled.current = true;
      endRun(levelScore, currentLevel, won);
    }
  }, [endRun, levelScore, currentLevel, won]);

  const threshold = levelConfig?.threshold ?? 0;
  const progress = threshold > 0 ? Math.min(1, levelScore / threshold) : 1;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.heading,
          // Move 03: VICTORY uses gold (value hue, reinforces reward symbology);
          // GAME OVER uses inkMute (loss is the absence of color, not a scold).
          { color: won ? colors.gold : colors.inkMute },
          won
            ? { textShadowColor: colors.gold, textShadowRadius: 20 }
            : { textShadowColor: 'transparent', textShadowRadius: 0 },
        ]}
      >
        {won ? 'VICTORY' : 'GAME OVER'}
      </Text>

      <Text style={styles.subtitle}>
        {won
          ? `All ${NUM_LEVELS} levels complete!`
          : `Reached Level ${currentLevel} / ${NUM_LEVELS}`}
      </Text>

      {/* Stats card */}
      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>SCORE</Text>
          <Text style={[styles.statValue, { color: colors.gold }]}>
            {levelScore}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>LEVEL</Text>
          <Text style={[styles.statValue, { color: colors.ink }]}>
            {currentLevel} / {NUM_LEVELS}
          </Text>
        </View>
        {threshold > 0 && (
          <>
            <View style={styles.progressLabelRow}>
              <Text style={styles.statLabel}>THRESHOLD</Text>
              <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={won ? [colors.gold, colors.gold] : [colors.inkMute, colors.inkDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` } as any]}
              />
            </View>
          </>
        )}

        {/* Unlock progress — retention anchor per the design audit. */}
        <View style={styles.unlockRow}>
          <Text style={styles.statLabel}>UNLOCKS</Text>
          <Text style={[
            styles.statValue,
            { color: allUnlocked ? colors.gold : colors.ink },
          ]}>
            {unlockedCount} / {totalUnlockable}
          </Text>
        </View>
        <View style={styles.unlockTrack}>
          <LinearGradient
            colors={[colors.cyan, colors.cyan]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.unlockFill,
              { width: `${Math.round((unlockedCount / totalUnlockable) * 100)}%` } as any,
            ]}
          />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.playAgainButton, pressed && styles.buttonPressed]}
        onPress={() => useRunStore.getState().startRun()}
      >
        <Text style={styles.playAgainText}>
          {won ? 'PLAY AGAIN' : 'TRY AGAIN'}
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.mainMenuButton, pressed && styles.buttonPressed]}
        onPress={() => useRunStore.getState().startRun()}
      >
        <Text style={styles.mainMenuText}>MAIN MENU</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 36,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: colors.hudBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 32,
    minWidth: 200,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 20,
  },
  playAgainButton: {
    // Primary CTA — cyan (the action color)
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  playAgainText: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  mainMenuButton: {
    // Secondary — text button, no outline (audit Move 03)
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  mainMenuText: {
    color: colors.inkDim,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  unlockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 6,
  },
  unlockTrack: {
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
  },
  unlockFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  progressPct: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 6,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
