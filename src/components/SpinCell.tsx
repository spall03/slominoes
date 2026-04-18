// src/components/SpinCell.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { CELL_SIZE, CELL_MARGIN, SYMBOLS } from '../constants';
import { SymbolIcon } from '../symbols/index';
import { colors } from '../theme';
import { useGameStore } from '../store';
import type { Symbol } from '../types';

interface SpinCellProps {
  finalSymbol: Symbol;
  cycles: number;
  delay: number;
  onComplete: () => void;
}

export function SpinCell({ finalSymbol, cycles, delay, onComplete }: SpinCellProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Use the player's actual loadout symbols for the spin strip so the
  // animation matches what can actually land. Fall back to the default
  // SYMBOLS constant if no loadout is active (shouldn't happen in a live
  // level, but safe).
  const loadoutFreqs = useGameStore(s => s.loadoutFreqs);
  const stripSymbols: Symbol[] = loadoutFreqs && loadoutFreqs.size > 0
    ? (Array.from(loadoutFreqs.keys()) as Symbol[])
    : SYMBOLS;

  // Build the symbol strip: stripSymbols repeated `cycles` times, then finalSymbol at the end
  const strip: Symbol[] = [];
  for (let i = 0; i < cycles; i++) {
    for (const s of stripSymbols) {
      strip.push(s);
    }
  }
  strip.push(finalSymbol);

  const iconSize = CELL_SIZE - 4;
  const totalHeight = strip.length * CELL_SIZE;
  // Start showing first symbol at top. Animate translateY to show last symbol (finalSymbol).
  const targetY = -(totalHeight - CELL_SIZE);

  useEffect(() => {
    const duration = strip.length * 40; // ~40ms per symbol
    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: targetY,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        onCompleteRef.current();
      });
    }, delay);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.strip, { transform: [{ translateY }] }]}>
        {strip.map((sym, i) => (
          <View key={i} style={styles.symbolSlot}>
            <SymbolIcon symbol={sym} size={iconSize} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_MARGIN,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.cellFilled,
    borderWidth: 1,
    borderColor: colors.cellFilledBorder,
  },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  symbolSlot: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
