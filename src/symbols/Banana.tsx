import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Banana({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FFE135" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* banana curve */}
        <Path d="M18 14 Q12 32 20 48 Q28 58 40 54 Q48 50 46 42 Q40 52 30 44 Q20 34 22 14Z" />
        {/* stem */}
        <Path d="M18 14 Q16 10 20 8" />
      </G>
    </Svg>
  );
}
