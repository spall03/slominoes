// src/components/EntrySpotButton.tsx
import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, Text, StyleSheet, Platform } from 'react-native';
import { colors, fonts } from '../theme';
import { CELL_SIZE, CELL_MARGIN } from '../constants';
import { Arrow } from '../symbols/index';
import type { EntrySpot } from '../types';

interface EntrySpotButtonProps {
  entry: EntrySpot;
  isSelected: boolean;
  isBlocked: boolean;
  onPress: () => void;
  /** When true, plays a one-time attention pulse on mount (used on first appearance per level). */
  pulseOnMount?: boolean;
}

export function EntrySpotButton({
  entry,
  isSelected,
  isBlocked,
  onPress,
  pulseOnMount,
}: EntrySpotButtonProps) {
  const isSide = entry.arrowDirection === 'left' || entry.arrowDirection === 'right';
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulseOnMount || isBlocked) return;
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [pulseOnMount, pulseAnim, isBlocked]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
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
        <Arrow direction={entry.arrowDirection} size={CELL_SIZE - 12} />
        {/* Keyboard-shortcut label for web users */}
        {Platform.OS === 'web' && !isBlocked && (
          <Text style={[styles.label, isSelected && styles.labelSelected]}>
            {entry.id + 1}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const EDGE_SIZE = Math.round(CELL_SIZE * 1.2);

const styles = StyleSheet.create({
  entrySpotButton: {
    // Sits outside the grid, taller than a cell, rounded on the "outside"
    // edge to read as a lip/bezel the tile drops from.
    width: CELL_SIZE * 2 + CELL_MARGIN * 4,
    height: EDGE_SIZE,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.cyanBorder, // 60% cyan when unselected
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  entrySpotButtonSide: {
    width: EDGE_SIZE,
    height: CELL_SIZE * 2 + CELL_MARGIN * 4,
  },
  entrySpotButtonSelected: {
    backgroundColor: colors.cyanWash, // 15% cyan fill
    borderColor: colors.cyan,         // solid cyan border
    borderWidth: 2,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 0 12px rgba(0,229,255,0.45)',
    } as any) : {}),
  },
  entrySpotButtonBlocked: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    opacity: 0.4,
  },
  label: {
    fontSize: 9,
    fontFamily: fonts.semiBold,
    color: colors.inkMute,
    letterSpacing: 1,
  },
  labelSelected: {
    color: colors.cyan,
  },
});
