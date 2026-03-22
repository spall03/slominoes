import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Cherry({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FF3B82" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* stem */}
        <Path d="M28 24 Q30 14 36 10" />
        <Path d="M36 24 Q34 14 36 10" />
        {/* leaf */}
        <Path d="M36 10 Q42 8 40 14" />
        {/* left cherry */}
        <Circle cx={24} cy={38} r={10} />
        {/* right cherry */}
        <Circle cx={40} cy={38} r={10} />
        {/* stem to cherries */}
        <Path d="M28 24 C26 28 24 30 24 32" />
        <Path d="M36 24 C38 28 40 30 40 32" />
      </G>
    </Svg>
  );
}
