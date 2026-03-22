// src/components/ScorePopup.tsx
import React, { useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { CELL_SIZE, CELL_TOTAL, GRID_PADDING } from '../constants';

interface ScorePopupProps {
  score: number;
  row: number;
  col: number;
  color?: string;
  onComplete: () => void;
}

export function ScorePopup({
  score,
  row,
  col,
  color,
  onComplete,
}: ScorePopupProps) {
  const isNegative = score < 0;
  const driftTarget = isNegative ? 60 : -60;
  const displayText = isNegative ? `${score}` : `+${score}`;
  const textColor = color ?? (isNegative ? colors.red : score > 0 ? '#44ff44' : colors.gold);

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: driftTarget,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onCompleteRef.current();
    });
  }, [translateY, opacity, driftTarget]);

  // Position based on cell location
  const halfCell = Math.floor(CELL_SIZE / 2);
  const left = GRID_PADDING + col * CELL_TOTAL + halfCell;
  const top = GRID_PADDING + row * CELL_TOTAL;

  return (
    <Animated.View
      style={[
        styles.scorePopup,
        {
          left,
          top,
          transform: [{ translateY }, { translateX: -halfCell }],
          opacity,
        },
      ]}
    >
      <Text style={[styles.scorePopupText, { color: textColor }]}>{displayText}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scorePopup: {
    position: 'absolute',
    zIndex: 100,
  },
  scorePopupText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: fonts.bold,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
