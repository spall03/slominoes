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
        <Path d="M32 12 L32 20" />
        {/* leaf */}
        <Path d="M32 16 Q38 12 40 16" />
        {/* apple body */}
        <Path d="M20 28 Q18 16 32 20 Q46 16 44 28 Q46 46 32 54 Q18 46 20 28Z" />
      </G>
    </Svg>
  );
}
