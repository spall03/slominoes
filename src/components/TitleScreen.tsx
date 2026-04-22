// src/components/TitleScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { colors, fonts, symbolColors } from '../theme';
import { useRunStore } from '../store';
import { useMetaStore } from '../meta-store';
import { SYMBOL_ROSTER, type SymbolId } from '../symbols';
import { SymbolIcon } from '../symbols/index';
import { Logo } from '../symbols/Logo';
import { Domino } from '../symbols/Domino';
import { Tutorial, hasTutorialBeenSeen } from './Tutorial';
import { SettingsScreen } from './SettingsScreen';
import { startMusic, stopMusic } from '../music';

export function TitleScreen() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const unlockedSymbols = useMetaStore(s => s.unlockedSymbols);
  const stats = useMetaStore(s => s.cumulativeStats);

  useEffect(() => {
    hasTutorialBeenSeen(); // warm the promise chain
  }, []);

  useEffect(() => {
    try { startMusic('title'); } catch {}
    return () => { try { stopMusic(); } catch {} };
  }, []);

  const handleNewGame = async () => {
    const seen = await hasTutorialBeenSeen();
    if (!seen) {
      setShowTutorial(true);
    } else {
      useRunStore.getState().startRun();
    }
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    useRunStore.getState().startRun();
  };

  // Build the unlocked-roster strip: every non-base unlocked symbol, at 50% opacity.
  const unlockedRoster: SymbolId[] = SYMBOL_ROSTER
    .filter(s => !s.base && unlockedSymbols.has(s.id))
    .map(s => s.id);

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.settingsButton, pressed && styles.buttonPressed]}
        onPress={() => setShowSettings(true)}
      >
        <Text style={styles.settingsIcon}>&#x2699;</Text>
      </Pressable>

      <Logo width={240} />
      <View style={styles.dominoWrap}>
        <Domino size={60} />
      </View>

      {/* Unlocked roster strip */}
      {unlockedRoster.length > 0 && (
        <View style={styles.rosterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rosterRow}
          >
            {unlockedRoster.map(id => (
              <View
                key={id}
                style={[
                  styles.rosterPill,
                  Platform.OS === 'web' ? ({
                    filter: `drop-shadow(0 0 3px ${symbolColors[id] ?? colors.cyan})`,
                  } as any) : undefined,
                ]}
              >
                <SymbolIcon symbol={id} size={20} />
              </View>
            ))}
          </ScrollView>
          <Text style={styles.rosterCount}>
            +{unlockedRoster.length} UNLOCKED
          </Text>
        </View>
      )}

      {/* Stats row: furthest / best run / total runs */}
      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={[styles.statValue, styles.statValueGold]}>
            L{Math.max(1, stats.furthestLevel)}
          </Text>
          <Text style={styles.statLabel}>FURTHEST</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{stats.bestRunScore}</Text>
          <Text style={styles.statLabel}>BEST RUN</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{stats.totalRuns}</Text>
          <Text style={styles.statLabel}>RUNS</Text>
        </View>
      </View>

      {/* Primary CTA — single action */}
      <Pressable
        style={({ pressed }) => [styles.newGameButton, pressed && styles.buttonPressed]}
        onPress={handleNewGame}
      >
        <Text style={styles.newGameText}>NEW RUN</Text>
      </Pressable>

      {/* Secondary — text button (no outline) per Move 03 */}
      <Pressable
        style={({ pressed }) => [styles.howToPlayButton, pressed && styles.buttonPressed]}
        onPress={() => setShowTutorial(true)}
      >
        <Text style={styles.howToPlayText}>HOW TO PLAY</Text>
      </Pressable>

      {showTutorial && <Tutorial onComplete={handleTutorialComplete} />}
      {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}
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
  dominoWrap: {
    marginTop: 16,
    marginBottom: 24,
  },
  rosterWrap: {
    alignItems: 'center',
    marginBottom: 16,
    maxWidth: 320,
  },
  rosterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    opacity: 0.6,
  },
  rosterPill: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterCount: {
    color: colors.inkMute,
    fontFamily: fonts.semiBold,
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  statCell: {
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 2,
  },
  statValue: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  statValueGold: {
    color: colors.gold,
  },
  statLabel: {
    color: colors.inkMute,
    fontFamily: fonts.semiBold,
    fontSize: 9,
    letterSpacing: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.line,
  },
  newGameButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 0 16px rgba(0,229,255,0.25)',
    } as any) : {}),
  },
  newGameText: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  howToPlayButton: {
    // Secondary — text button, no outline
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  howToPlayText: {
    color: colors.inkDim,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  settingsIcon: {
    fontSize: 28,
    color: colors.inkDim,
    ...(Platform.OS === 'web' ? ({
      textShadow: '0 0 8px rgba(154,154,176,0.35)',
    } as any) : {}),
  },
});
