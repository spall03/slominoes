import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Honey({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FFAA00" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* hexagon */}
        <Path d="M32 8 L50 18 L50 38 L32 48 L14 38 L14 18 Z" />
        {/* drip */}
        <Path d="M32 48 Q32 56 28 58" />
        <Path d="M38 42 Q40 50 38 54" />
      </G>
    </Svg>
  );
}
