import React from 'react';
import Svg, { G, Path, Line } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Crown({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FFD700" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* crown shape */}
        <Path d="M10 46 L10 22 L22 32 L32 14 L42 32 L54 22 L54 46 Z" />
        {/* base band */}
        <Line x1={10} y1={46} x2={54} y2={46} />
      </G>
    </Svg>
  );
}
