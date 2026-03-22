// src/components/GameOverScreen.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';
import { NUM_LEVELS } from '../constants';
import { useRunStore } from '../store';

export function GameOverScreen() {
  const { currentLevel, levelScore, levelConfig } = useRunStore();
  const won = currentLevel >= NUM_LEVELS && levelScore >= 0;
  const threshold = levelConfig?.threshold ?? 0;
  const progress = threshold > 0 ? Math.min(1, levelScore / threshold) : 1;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.heading,
          { color: won ? colors.cyan : colors.pink },
          won
            ? { textShadowColor: colors.cyan, textShadowRadius: 20 }
            : { textShadowColor: colors.pink, textShadowRadius: 20 },
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
          <Text style={[styles.statValue, { color: colors.cyan }]}>
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
                colors={won ? [colors.cyan, colors.cyan] : [colors.pink, colors.cyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` } as any]}
              />
            </View>
          </>
        )}
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
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.pink,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  playAgainText: {
    color: colors.pink,
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  mainMenuButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.indigo,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  mainMenuText: {
    color: colors.indigo,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
