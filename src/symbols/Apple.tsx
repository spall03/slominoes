import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Apple({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#44CC44" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* stem */}
        <Path d="M32 14 Q33 8 36 6" />
        {/* leaf */}
        <Path d="M34 10 Q40 6 42 10 Q40 14 34 10" />
        {/* apple body */}
        <Path d="M24 18 Q14 22 14 36 Q14 52 26 54 Q32 56 38 54 Q50 52 50 36 Q50 22 40 18 Q36 16 32 18 Q28 16 24 18Z" />
      </G>
    </Svg>
  );
}
