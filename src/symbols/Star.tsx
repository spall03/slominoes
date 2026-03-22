import React from 'react';
import Svg, { G, Polygon } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Star({ size = 32 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G fill="none" stroke="#ffd700" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <Polygon points="16,4 19.5,12 28,12 21,18 23.5,26 16,21 8.5,26 11,18 4,12 12.5,12" />
      </G>
    </Svg>
  );
}
