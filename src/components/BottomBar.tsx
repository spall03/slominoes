// src/components/BottomBar.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { isMobile } from '../constants';
import { SymbolIcon } from '../symbols/index';
import type { Symbol } from '../types';

interface BottomBarProps {
  symbolA: Symbol;
  symbolB: Symbol;
  tilesRemaining: number;
  respinsRemaining: number;
  onRespinToggle: () => void;
}

export function BottomBar({
  symbolA,
  symbolB,
  tilesRemaining,
  respinsRemaining,
  onRespinToggle,
}: BottomBarProps) {
  return (
    <View style={styles.bottomBar}>
      <View style={styles.bottomBarTile}>
        <View style={styles.tilePreviewBoxSmall}>
          <SymbolIcon symbol={symbolA} size={20} />
          <SymbolIcon symbol={symbolB} size={20} />
        </View>
        <Text style={styles.bottomBarMeta}>{tilesRemaining} left</Text>
      </View>
      {isMobile && respinsRemaining > 0 && (
        <Pressable
          style={({ pressed }) => [styles.respinToggle, pressed && styles.buttonPressed]}
          onPress={onRespinToggle}
        >
          <Text style={styles.respinToggleText}>Respin</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 14,
    marginBottom: 4,
    backgroundColor: colors.hudBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
  },
  bottomBarTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tilePreviewBoxSmall: {
    flexDirection: 'row',
    backgroundColor: colors.cell,
    borderWidth: 1,
    borderColor: colors.cellFilledBorder,
    borderRadius: 4,
    padding: 5,
    gap: 3,
  },
  bottomBarMeta: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  respinToggle: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.respin,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  respinToggleText: {
    color: colors.respin,
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
