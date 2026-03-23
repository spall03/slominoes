// src/components/BottomBar.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { SymbolIcon } from '../symbols/index';
import type { Symbol } from '../types';

interface BottomBarProps {
  symbolA: Symbol;
  symbolB: Symbol;
  tilesLeft: number;
  totalInBatch: number;
}

export function BottomBar({
  symbolA,
  symbolB,
  tilesLeft,
  totalInBatch,
}: BottomBarProps) {
  const tilesPlaced = totalInBatch - tilesLeft;

  return (
    <View style={styles.bottomBar}>
      <View style={styles.bottomBarTile}>
        <View style={styles.tilePreviewBoxSmall}>
          <SymbolIcon symbol={symbolA} size={20} />
          <SymbolIcon symbol={symbolB} size={20} />
        </View>
        <Text style={styles.bottomBarMeta}>
          {tilesPlaced}/{totalInBatch} placed
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 4,
    backgroundColor: colors.hudBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 6,
  },
  bottomBarTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tilePreviewBoxSmall: {
    flexDirection: 'row',
    backgroundColor: colors.cell,
    borderWidth: 1,
    borderColor: colors.cellFilledBorder,
    borderRadius: 4,
    padding: 4,
    gap: 2,
  },
  bottomBarMeta: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
