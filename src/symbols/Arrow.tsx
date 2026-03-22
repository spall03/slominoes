import React from 'react';
import Svg, { G, Polyline } from 'react-native-svg';

interface Props {
  direction: 'down' | 'up' | 'left' | 'right';
  size?: number;
}

// Each direction uses its own polyline points from the source SVG files.
// arrow-down:  points="8,12 16,22 24,12"  stroke #FF3B82
// arrow-up:    points="8,22 16,12 24,22"  stroke #FF3B82
// arrow-left:  points="22,8 12,16 22,24"  stroke #FFBF00
// arrow-right: points="12,8 22,16 12,24"  stroke #FFBF00

const DIRECTION_CONFIG = {
  down:  { points: '8,12 16,22 24,12', color: '#FF3B82' },
  up:    { points: '8,22 16,12 24,22', color: '#FF3B82' },
  left:  { points: '22,8 12,16 22,24', color: '#FFBF00' },
  right: { points: '12,8 22,16 12,24', color: '#FFBF00' },
} as const;

export function Arrow({ direction, size = 32 }: Props) {
  const { points, color } = DIRECTION_CONFIG[direction];
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points={points} />
      </G>
    </Svg>
  );
}
