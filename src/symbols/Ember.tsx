import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Ember({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FF6600" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* single flame */}
        <Path d="M20 54 Q14 42 18 30 Q22 18 32 8 Q42 18 46 30 Q50 42 44 54Z" />
      </G>
    </Svg>
  );
}
