import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Banana({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FFE135" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* outer curve */}
        <Path d="M16 44 Q12 36 16 26 Q22 14 34 10 Q42 8 48 12" />
        {/* inner curve */}
        <Path d="M18 48 Q16 42 20 32 Q26 22 36 18 Q42 14 48 16" />
        {/* top tip */}
        <Path d="M48 12 Q50 14 48 16" />
        {/* bottom tip */}
        <Path d="M16 44 Q16 46 18 48" />
      </G>
    </Svg>
  );
}
