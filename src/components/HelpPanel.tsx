// src/components/HelpPanel.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { BOARD_SIZE, SYMBOL_VALUES } from '../constants';
import { useGameStore } from '../store';
import { SymbolIcon } from '../symbols/index';
import type { Symbol } from '../types';

const SYMBOL_LIST: { symbol: Symbol; value: number }[] = [
  { symbol: 'cherry', value: SYMBOL_VALUES.cherry },
  { symbol: 'lemon', value: SYMBOL_VALUES.lemon },
  { symbol: 'bar', value: SYMBOL_VALUES.bar },
  { symbol: 'bell', value: SYMBOL_VALUES.bell },
  { symbol: 'seven', value: SYMBOL_VALUES.seven },
];

export function HelpPanel() {
  const { levelConfig } = useGameStore();
  return (
    <View style={styles.helpPanel}>
      <Text style={styles.helpHeading}>Goal</Text>
      <Text style={styles.helpBody}>
        Score {levelConfig.threshold}+ points by placing {levelConfig.tilesPerLevel} domino tiles on a {BOARD_SIZE}x{BOARD_SIZE} grid, then using {levelConfig.respins} respins to improve your matches.
      </Text>

      <Text style={styles.helpHeading}>Matching</Text>
      <Text style={styles.helpBody}>
        Line up 3+ identical symbols in a row or column. Longer matches score more:
      </Text>
      <Text style={styles.helpBody}>
        {'  '}3-in-a-row: x1 | 4: x2 | 5: x3 | 6+: x4
      </Text>

      <Text style={styles.helpHeading}>Symbol values</Text>
      <View style={styles.symbolValuesRow}>
        {SYMBOL_LIST.map(({ symbol, value }) => (
          <View key={symbol} style={styles.symbolValueItem}>
            <SymbolIcon symbol={symbol} size={16} />
            <Text style={styles.symbolValueText}>{value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.helpHeading}>Scoring formula</Text>
      <Text style={styles.helpBody}>
        value x length x multiplier{'\n'}
        e.g. 4 bells = 80 x 4 x 2 = 640
      </Text>

      <Text style={styles.helpHeading}>Scoring</Text>
      <Text style={styles.helpBody}>
        Your score equals the total of all matches currently on the grid. It's recalculated after every move -- not additive.
      </Text>

      <Text style={styles.helpHeading}>Entry Points</Text>
      <Text style={styles.helpBody}>
        Before placing each tile, choose an entry point. You can only place tiles in empty cells reachable from that entry. Earlier placements may block paths, creating a spatial puzzle. Some levels have side entries too!
      </Text>

      <Text style={styles.helpHeading}>Respins</Text>
      <Text style={styles.helpBody}>
        After all tiles are placed, you get {levelConfig.respins} respins. Each respin re-randomizes every filled cell in a row or column. Respins can create new matches but also break existing ones. Your score is locked to the best total seen -- it can never go down.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  helpPanel: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    width: 260,
  },
  helpHeading: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 2,
  },
  helpBody: {
    color: '#ccc',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  symbolValuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  symbolValueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  symbolValueText: {
    color: '#ccc',
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
