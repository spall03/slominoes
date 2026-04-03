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
        <Path d="M32 8 L50 20 L50 44 L32 56 L14 44 L14 20 Z" />
      </G>
    </Svg>
  );
}
