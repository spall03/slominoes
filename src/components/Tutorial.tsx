// src/components/Tutorial.tsx
// First-time user experience — 7-step modal tutorial, shown once.

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme';
import { SymbolIcon } from '../symbols/index';

const TUTORIAL_KEY = 'slominoes_tutorial_seen';
const TOTAL_STEPS = 7;

interface TutorialStep {
  title: string;
  body: string;
  visual: React.ReactNode;
  visualLabel: string;
}

function MiniCell({ children, style }: { children?: React.ReactNode; style?: any }) {
  return <View style={[styles.miniCell, style]}>{children}</View>;
}

function SymCell({ symbol, size = 20, cellStyle }: { symbol: string; size?: number; cellStyle?: any }) {
  return (
    <MiniCell style={cellStyle}>
      <View style={Platform.OS === 'web' ? ({ filter: `drop-shadow(0 0 3px currentColor)` } as any) : undefined}>
        <SymbolIcon symbol={symbol} size={size} />
      </View>
    </MiniCell>
  );
}

function buildSteps(): TutorialStep[] {
  return [
    // Step 1: Welcome
    {
      title: 'Welcome to Slominoes',
      body: 'Place domino tiles on the grid. Match 3 or more symbols in a row or column to score points. Beat the target to advance!',
      visual: (
        <View style={styles.miniGrid5}>
          <MiniCell style={styles.emptyCell} />
          <SymCell symbol="lemon" />
          <MiniCell style={styles.emptyCell} />
          <MiniCell style={styles.emptyCell} />
          <MiniCell style={styles.emptyCell} />
          <MiniCell style={styles.emptyCell} />
          <SymCell symbol="cherry" cellStyle={styles.matchedCell} />
          <SymCell symbol="cherry" cellStyle={styles.matchedCell} />
          <SymCell symbol="cherry" cellStyle={styles.matchedCell} />
          <MiniCell style={styles.emptyCell} />
          <MiniCell style={styles.emptyCell} />
          <SymCell symbol="bell" />
          <MiniCell style={styles.emptyCell} />
          <SymCell symbol="seven" />
          <MiniCell style={styles.emptyCell} />
        </View>
      ),
      visualLabel: '3 cherries in a row = match!',
    },
    // Step 2: Entry Points
    {
      title: 'Entry Points',
      body: 'Choose an entry point arrow. You can only place tiles in cells reachable from that entry.',
      visual: (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <SymbolIcon symbol="arrow-down" size={24} />
          <View style={styles.miniGrid4}>
            <MiniCell style={styles.highlightCell} />
            <MiniCell style={styles.entryCell} />
            <MiniCell style={styles.entryCell} />
            <MiniCell style={styles.highlightCell} />
            <MiniCell style={styles.highlightCell} />
            <MiniCell style={styles.highlightCell} />
            <MiniCell style={styles.highlightCell} />
            <MiniCell style={styles.highlightCell} />
            <SymCell symbol="bar" size={16} />
            <MiniCell style={styles.highlightCell} />
            <MiniCell style={styles.highlightCell} />
            <SymCell symbol="wall" size={16} cellStyle={styles.wallCell} />
            <MiniCell style={styles.highlightCell} />
            <MiniCell style={styles.highlightCell} />
            <MiniCell style={styles.highlightCell} />
            <MiniCell style={styles.highlightCell} />
          </View>
        </View>
      ),
      visualLabel: 'Dashed cells = reachable from entry',
    },
    // Step 3: Tile Placement
    {
      title: 'Place Your Tile',
      body: 'Tap a cell to place. Tap again to rotate. Hold to confirm placement.',
      visual: (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={styles.domino}>
            <View style={styles.dominoHalf}><SymbolIcon symbol="cherry" size={20} /></View>
            <View style={[styles.dominoHalf, styles.dominoHalfRight]}><SymbolIcon symbol="bell" size={20} /></View>
          </View>
          <Text style={{ color: '#666', fontSize: 24 }}>→</Text>
          <View style={styles.miniGrid3}>
            <MiniCell style={styles.emptyCell} />
            <MiniCell style={styles.emptyCell} />
            <MiniCell style={styles.emptyCell} />
            <MiniCell style={styles.emptyCell} />
            <SymCell symbol="cherry" size={16} cellStyle={styles.entryCell} />
            <SymCell symbol="bell" size={16} cellStyle={styles.entryCell} />
            <MiniCell style={styles.emptyCell} />
            <MiniCell style={styles.emptyCell} />
            <MiniCell style={styles.emptyCell} />
          </View>
        </View>
      ),
      visualLabel: 'Tap to rotate · Hold to confirm',
    },
    // Step 4: Locking
    {
      title: 'Locked Matches',
      body: 'When symbols match, they lock in place. Locked cells are protected from respins.',
      visual: (
        <View style={styles.miniGrid5}>
          <MiniCell style={styles.emptyCell} />
          <SymCell symbol="lemon" />
          <MiniCell style={styles.emptyCell} />
          <MiniCell style={styles.emptyCell} />
          <MiniCell style={styles.emptyCell} />
          <MiniCell style={styles.emptyCell} />
          <SymCell symbol="cherry" cellStyle={styles.lockedCell} />
          <SymCell symbol="cherry" cellStyle={styles.lockedCell} />
          <SymCell symbol="cherry" cellStyle={styles.lockedCell} />
          <MiniCell style={styles.emptyCell} />
          <MiniCell style={styles.emptyCell} />
          <SymCell symbol="seven" />
          <MiniCell style={styles.emptyCell} />
          <SymCell symbol="bell" />
          <MiniCell style={styles.emptyCell} />
        </View>
      ),
      visualLabel: 'Gold border = locked · safe from respins',
    },
    // Step 5: Respins
    {
      title: 'Respins',
      body: 'Respin a row or column to shuffle its symbols. Locked cells stay put. Spend score to buy more respins.',
      visual: (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.miniGrid4Row}>
              <SymCell symbol="cherry" size={16} cellStyle={styles.lockedCell} />
              <SymCell symbol="lemon" size={16} cellStyle={styles.respinCell} />
              <SymCell symbol="bar" size={16} cellStyle={styles.respinCell} />
              <SymCell symbol="seven" size={16} cellStyle={styles.respinCell} />
            </View>
            <View style={styles.respinMock}>
              <SymbolIcon symbol="respin-row" size={20} />
            </View>
          </View>
          <Text style={{ color: '#666', fontSize: 18 }}>↓</Text>
          <View style={styles.miniGrid4Row}>
            <SymCell symbol="cherry" size={16} cellStyle={styles.lockedCell} />
            <SymCell symbol="cherry" size={16} cellStyle={styles.matchedCell} />
            <SymCell symbol="cherry" size={16} cellStyle={styles.matchedCell} />
            <SymCell symbol="bell" size={16} />
          </View>
        </View>
      ),
      visualLabel: 'Locked cherry stays · others shuffle · new match!',
    },
    // Step 6: Symbol Abilities
    {
      title: 'Symbol Abilities',
      body: 'Each symbol has unique stats and powers. Choose your loadout before each run to build combos.',
      visual: (
        <View style={styles.symCardRow}>
          <View style={styles.symCard}>
            <SymbolIcon symbol="cherry" size={28} />
            <Text style={[styles.cardName, { color: '#FF3B82' }]}>Cherry</Text>
            <Text style={styles.cardAbility}>Match 3 · 10pts</Text>
          </View>
          <View style={[styles.symCard, { borderColor: '#E040A0' }]}>
            <SymbolIcon symbol="jam" size={28} />
            <Text style={[styles.cardName, { color: '#E040A0' }]}>Jam</Text>
            <Text style={styles.cardAbility}>2x cherry in row</Text>
          </View>
          <View style={[styles.symCard, { borderColor: '#BBBBFF' }]}>
            <SymbolIcon symbol="ghost" size={28} />
            <Text style={[styles.cardName, { color: '#BBBBFF' }]}>Ghost</Text>
            <Text style={styles.cardAbility}>+1 respin on match</Text>
          </View>
        </View>
      ),
      visualLabel: '',
    },
    // Step 7: Unlocking
    {
      title: 'Unlock New Symbols',
      body: 'Play to unlock new symbols. Each has a hidden challenge — the hints will guide you.',
      visual: (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={styles.symCardRow}>
            <View style={styles.lockedCard}>
              <Text style={styles.lockedQ}>?</Text>
              <Text style={styles.lockedHint}>Fill the line</Text>
            </View>
            <View style={styles.lockedCard}>
              <Text style={styles.lockedQ}>?</Text>
              <Text style={styles.lockedHint}>Ring the bell</Text>
            </View>
            <View style={styles.lockedCard}>
              <Text style={styles.lockedQ}>?</Text>
              <Text style={styles.lockedHint}>Conquer all ten</Text>
            </View>
          </View>
          <Text style={styles.visualLabel}>Discover 15 unlockable symbols</Text>
        </View>
      ),
      visualLabel: '',
    },
  ];
}

export function Tutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = buildSteps();
  const current = steps[step];

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      AsyncStorage.setItem(TUTORIAL_KEY, 'true');
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    AsyncStorage.setItem(TUTORIAL_KEY, 'true');
    onComplete();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        {/* Step dots */}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        <View style={styles.visualContainer}>
          {current.visual}
          {current.visualLabel ? (
            <Text style={styles.visualLabel}>{current.visualLabel}</Text>
          ) : null}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          {step === 0 ? (
            <>
              <Pressable style={[styles.btn, styles.btnSkip]} onPress={handleSkip}>
                <Text style={styles.btnSkipText}>Skip</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleNext}>
                <Text style={styles.btnPrimaryText}>Next →</Text>
              </Pressable>
            </>
          ) : step < TOTAL_STEPS - 1 ? (
            <>
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={handleBack}>
                <Text style={styles.btnSecondaryText}>← Back</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleNext}>
                <Text style={styles.btnPrimaryText}>Next →</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={[styles.btn, styles.btnGold]} onPress={handleNext}>
              <Text style={styles.btnGoldText}>Let's Play!</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

/** Check if tutorial has been seen */
export async function hasTutorialBeenSeen(): Promise<boolean> {
  const val = await AsyncStorage.getItem(TUTORIAL_KEY);
  return val === 'true';
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,6,20,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  modal: {
    backgroundColor: '#0a0a1e',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 28,
    width: '88%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 14,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.cyan,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 8px rgba(0,229,255,0.4)',
    } as any : {}),
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  visualContainer: {
    backgroundColor: '#0d0d20',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  visualLabel: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  btnPrimary: {
    borderWidth: 2,
    borderColor: colors.cyan,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 12px rgba(0,229,255,0.2)',
    } as any : {}),
  },
  btnPrimaryText: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#444',
  },
  btnSecondaryText: {
    color: '#888',
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  btnSkip: {
    borderWidth: 1,
    borderColor: '#333',
    flex: 0,
    paddingHorizontal: 16,
  },
  btnSkipText: {
    color: '#555',
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  btnGold: {
    borderWidth: 2,
    borderColor: colors.gold,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 12px rgba(255,215,0,0.3)',
    } as any : {}),
  },
  btnGoldText: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Mini grid layouts
  miniGrid5: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 5 * 38,
    gap: 2,
  },
  miniGrid4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 4 * 38,
    gap: 2,
  },
  miniGrid4Row: {
    flexDirection: 'row',
    gap: 2,
  },
  miniGrid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 3 * 38,
    gap: 2,
  },

  // Mini cells
  miniCell: {
    width: 36,
    height: 36,
    backgroundColor: '#161630',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCell: {
    backgroundColor: '#0d0d1e',
    borderStyle: 'dashed',
    borderColor: '#2a2a50',
  },
  matchedCell: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(255,215,0,0.08)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 6px rgba(255,215,0,0.3)',
    } as any : {}),
  },
  lockedCell: {
    borderColor: 'rgba(255,215,0,0.35)',
    borderWidth: 1.5,
    backgroundColor: '#1a1a2e',
  },
  highlightCell: {
    backgroundColor: 'rgba(92,107,192,0.1)',
    borderColor: 'rgba(92,107,192,0.4)',
    borderStyle: 'dashed',
  },
  entryCell: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderColor: 'rgba(0,229,255,0.4)',
  },
  wallCell: {
    backgroundColor: '#0e0e1e',
    opacity: 0.5,
  },
  respinCell: {
    backgroundColor: 'rgba(231,76,111,0.1)',
    borderColor: 'rgba(231,76,111,0.4)',
  },

  // Domino tile
  domino: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 6,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 12px rgba(0,229,255,0.3)',
    } as any : {}),
  },
  dominoHalf: {
    width: 40,
    height: 40,
    backgroundColor: '#161630',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dominoHalfRight: {
    borderLeftWidth: 1,
    borderLeftColor: colors.cyan,
  },

  // Respin button mock
  respinMock: {
    borderWidth: 1,
    borderColor: colors.respin,
    borderRadius: 6,
    padding: 8,
  },

  // Symbol cards
  symCardRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  symCard: {
    flex: 1,
    backgroundColor: '#0a0a1e',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    gap: 4,
  },
  cardName: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardAbility: {
    fontSize: 8,
    fontFamily: fonts.regular,
    color: colors.cyan,
    textAlign: 'center',
  },

  // Locked cards
  lockedCard: {
    flex: 1,
    backgroundColor: '#0a0a1e',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    gap: 4,
    opacity: 0.5,
  },
  lockedQ: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: '#555',
  },
  lockedHint: {
    fontSize: 9,
    fontFamily: fonts.regular,
    color: '#666',
    fontStyle: 'italic',
  },
});
