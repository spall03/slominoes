// src/components/LevelPreviewScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { BOARD_SIZE } from '../constants';
import { useRunStore } from '../store';
import { useMetaStore } from '../meta-store';
import { getEntrySpots } from '../level';
import { SymbolPoolStrip } from './SymbolPoolStrip';
import { tutorialSkipped } from '../analytics-events';

export function LevelPreviewScreen() {
  const { currentLevel, levelConfig, bonusRespins } = useRunStore();
  if (!levelConfig) return null;
  const config = levelConfig;
  const entrySpots = getEntrySpots(config.entrySpotCount);
  const isTutorial = currentLevel === 0;

  const handleSkipTutorial = () => {
    useMetaStore.getState().setTutorialSeen();
    tutorialSkipped();
    useRunStore.setState({
      runPhase: 'draft',
      currentLevel: 1,
      levelScore: 0,
      levelConfig: null,
      bonusRespins: 5,
    });
  };

  const entryCellSet = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entrySpots) {
      for (const [r, c] of entry.cells) {
        set.add(`${r},${c}`);
      }
    }
    return set;
  }, [entrySpots]);

  const wallSet = useMemo(() => {
    const set = new Set<string>();
    for (const obs of config.obstacles) {
      if (obs.symbol === 'wall') set.add(`${obs.row},${obs.col}`);
    }
    return set;
  }, [config.obstacles]);

  // Tutorial (Level 0) gets a stripped-down preview: TUTORIAL header,
  // motivation copy, START primary, SKIP-I've-played-before secondary.
  // No threshold/respin badges; no symbol pool strip; no mini-grid.
  if (isTutorial) {
    return (
      <ScrollView
        contentContainerStyle={styles.container}
        style={styles.scrollBg}
      >
        <Text style={styles.tutorialEyebrow}>TUTORIAL</Text>
        <Text style={styles.tutorialBody}>
          Playable 60-second tutorial.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
          onPress={() => {
            useMetaStore.getState().startLevel();
            useRunStore.getState().startLevel();
          }}
        >
          <Text style={styles.startButtonText}>START</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.skipButton, pressed && styles.buttonPressed]}
          onPress={handleSkipTutorial}
        >
          <Text style={styles.skipButtonText}>SKIP — I've played before</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={styles.scrollBg}
    >
      <Text style={styles.title}>Level {currentLevel}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <Text style={styles.statLabel}>THRESHOLD</Text>
          <Text style={styles.statValue}>{config.threshold}</Text>
        </View>
        <View style={styles.statBadge}>
          <Text style={styles.statLabel}>RESPINS</Text>
          <Text style={styles.statValue}>
            {config.respins}
            {bonusRespins > 0 ? ` (+${bonusRespins})` : ''}
          </Text>
        </View>
      </View>

      <SymbolPoolStrip variant="full" />

      {/* Mini grid preview */}
      <View style={styles.miniGrid}>
        {Array.from({ length: BOARD_SIZE }).map((_, row) => (
          <View key={row} style={styles.miniRow}>
            {Array.from({ length: BOARD_SIZE }).map((_, col) => {
              const key = `${row},${col}`;
              const isWall = wallSet.has(key);
              const isEntry = entryCellSet.has(key);

              return (
                <View
                  key={col}
                  style={[
                    styles.miniCell,
                    isWall
                      ? styles.miniCellWall
                      : isEntry
                        ? styles.miniCellEntry
                        : styles.miniCellOpen,
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      {bonusRespins > 0 && (
        <Text style={styles.bonusText}>
          +{bonusRespins} BONUS RESPINS BANKED
        </Text>
      )}

      <Pressable
        style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
        onPress={() => {
          useMetaStore.getState().startLevel();
          useRunStore.getState().startLevel();
        }}
      >
        <Text style={styles.startButtonText}>START LEVEL</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollBg: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 36,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statBadge: {
    backgroundColor: colors.hudBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  miniGrid: {
    flexDirection: 'column',
    gap: 2,
    marginVertical: 20,
  },
  miniRow: {
    flexDirection: 'row',
    gap: 2,
  },
  miniCell: {
    width: 22,
    height: 22,
    borderRadius: 3,
  },
  miniCellOpen: {
    backgroundColor: colors.cell,
  },
  miniCellWall: {
    backgroundColor: colors.cellWall,
  },
  miniCellEntry: {
    backgroundColor: colors.cyan,
  },
  bonusText: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  startButtonText: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  // Tutorial (Level 0) variant
  tutorialEyebrow: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  tutorialBody: {
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  skipButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  skipButtonText: {
    color: colors.inkDim,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: 1.5,
  },
});
