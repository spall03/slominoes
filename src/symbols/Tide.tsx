import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Tide({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#4488FF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* top wave */}
        <Path d="M8 24 Q16 16 24 24 Q32 32 40 24 Q48 16 56 24" />
        {/* middle wave */}
        <Path d="M8 36 Q16 28 24 36 Q32 44 40 36 Q48 28 56 36" />
        {/* bottom wave */}
        <Path d="M8 48 Q16 40 24 48 Q32 56 40 48 Q48 40 56 48" />
      </G>
    </Svg>
  );
}
