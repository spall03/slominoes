// src/components/Cell.tsx
import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { colors, symbolColors } from '../theme';
import { CELL_SIZE, CELL_MARGIN } from '../constants';
import { SymbolIcon, Arrow } from '../symbols/index';
import type { Symbol } from '../types';

interface CellProps {
  symbol: Symbol | null;
  isEmpty: boolean;
  isPreview?: boolean;
  isPlaced?: boolean;
  isHoldReady?: boolean;
  isMatching?: boolean;
  isLocked?: boolean;
  isReachable?: boolean;
  isEntryCell?: 'down' | 'up' | 'left' | 'right' | null;
  highlightColor?: 'gold' | 'red' | 'blue';
  previewSymbol?: Symbol;
  onMatchAnimationComplete?: () => void;
}

export function Cell({
  symbol,
  isEmpty,
  isPreview,
  isPlaced,
  isHoldReady,
  isMatching,
  isLocked,
  isReachable,
  isEntryCell,
  highlightColor,
  previewSymbol,
  onMatchAnimationComplete,
}: CellProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const prevSymbol = useRef(symbol);
  const onCompleteRef = useRef(onMatchAnimationComplete);
  onCompleteRef.current = onMatchAnimationComplete;

  useEffect(() => {
    if (symbol !== prevSymbol.current) {
      prevSymbol.current = symbol;
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [symbol, scaleAnim]);

  // Blink animation when matching - runs once on mount if isMatching is true
  useEffect(() => {
    if (isMatching) {
      Animated.sequence([
        Animated.timing(highlightOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start(() => {
        onCompleteRef.current?.();
      });
    }
    // Only run on mount - component is re-keyed for each animation trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displaySymbol = isPreview ? previewSymbol : symbol;

  // Determine highlight overlay color
  const overlayColor =
    highlightColor === 'red' ? colors.red :
    highlightColor === 'blue' ? colors.cyan :
    colors.gold;

  return (
    <Animated.View
      style={[
        styles.cell,
        !isEmpty && !isPreview && styles.filledCell,
        isLocked && styles.lockedCell,
        symbol === 'wall' && styles.wallCell,
        isPreview && !isPlaced && styles.previewCell,
        isPreview && isPlaced && !isHoldReady && styles.placedCell,
        isPreview && isPlaced && isHoldReady && styles.holdReadyCell,
        isEmpty && isReachable && !isPreview && styles.reachableCell,
        { transform: [{ scale: scaleAnim }], overflow: 'hidden' },
      ]}
    >
      {/* Highlight overlay */}
      <Animated.View
        style={[
          styles.highlightOverlay,
          { opacity: highlightOpacity, backgroundColor: overlayColor },
        ]}
        pointerEvents="none"
      />
      {isEntryCell && isEmpty && !isPreview ? (
        <View style={styles.entryCellArrow}>
          <Arrow direction={isEntryCell} size={CELL_SIZE - 8} />
        </View>
      ) : (
        <View style={[styles.symbolContainer, isPreview && !isPlaced && styles.previewOpacity]}>
          {displaySymbol ? (
            <View
              style={
                Platform.OS === 'web' && displaySymbol !== 'wall'
                  ? ({
                      filter: `drop-shadow(0 0 4px ${symbolColors[displaySymbol]})`,
                    } as any)
                  : undefined
              }
            >
              <SymbolIcon symbol={displaySymbol} size={CELL_SIZE - 4} />
            </View>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: colors.cell,
    borderWidth: 1,
    borderColor: colors.border,
    margin: CELL_MARGIN,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledCell: {
    backgroundColor: colors.cellFilled,
    borderColor: colors.cellFilledBorder,
  },
  lockedCell: {
    backgroundColor: colors.cellLocked,
    borderColor: colors.cellLockedBorder,
    borderWidth: 1.5,
  },
  wallCell: {
    backgroundColor: '#1a1a2e',
    borderColor: '#3d3d5c',
    borderWidth: 1,
  },
  previewCell: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.gold,
    borderStyle: 'dashed',
  },
  placedCell: {
    backgroundColor: colors.cyanTint,
    borderWidth: 2,
    borderColor: colors.cyanBorder,
  },
  holdReadyCell: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  reachableCell: {
    borderWidth: 1,
    borderColor: colors.indigoBorder,
    borderStyle: 'dashed',
    backgroundColor: colors.indigoTint,
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
    zIndex: 1,
  },
  symbolContainer: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewOpacity: {
    opacity: 0.6,
  },
  entryCellArrow: {
    zIndex: 2,
    opacity: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
