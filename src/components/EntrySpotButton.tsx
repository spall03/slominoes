// src/components/EntrySpotButton.tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { CELL_SIZE, CELL_MARGIN } from '../constants';
import { Arrow } from '../symbols/index';
import type { EntrySpot } from '../types';

interface EntrySpotButtonProps {
  entry: EntrySpot;
  isSelected: boolean;
  isBlocked: boolean;
  onPress: () => void;
}

export function EntrySpotButton({
  entry,
  isSelected,
  isBlocked,
  onPress,
}: EntrySpotButtonProps) {
  const isSide = entry.arrowDirection === 'left' || entry.arrowDirection === 'right';

  return (
    <Pressable
      style={[
        styles.entrySpotButton,
        isSide && styles.entrySpotButtonSide,
        isSelected && styles.entrySpotButtonSelected,
        isBlocked && styles.entrySpotButtonBlocked,
      ]}
      onPress={onPress}
      disabled={isBlocked}
    >
      <Arrow
        direction={entry.arrowDirection}
        size={CELL_SIZE - 8}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entrySpotButton: {
    width: CELL_SIZE * 2 + CELL_MARGIN * 4,
    height: CELL_SIZE,
    backgroundColor: colors.indigo,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrySpotButtonSide: {
    width: CELL_SIZE,
    height: CELL_SIZE * 2 + CELL_MARGIN * 4,
  },
  entrySpotButtonSelected: {
    backgroundColor: colors.gold,
  },
  entrySpotButtonBlocked: {
    backgroundColor: colors.cell,
    opacity: 0.4,
  },
});
