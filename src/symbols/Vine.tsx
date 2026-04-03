import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Vine({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#22BB44" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* main stem */}
        <Path d="M28 56 Q20 44 28 34 Q36 24 28 14 Q26 10 22 8" />
        {/* leaf left */}
        <Path d="M24 42 Q14 38 16 30 Q18 34 24 36" />
        {/* leaf right */}
        <Path d="M32 26 Q42 22 44 14 Q40 20 34 22" />
        {/* tendril */}
        <Path d="M22 8 Q18 6 16 10" />
      </G>
    </Svg>
  );
}
