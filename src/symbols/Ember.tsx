import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Ember({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FF6600" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* outer flame */}
        <Path d="M32 6 Q44 20 44 36 Q44 54 32 56 Q20 54 20 36 Q20 20 32 6Z" />
        {/* inner flame */}
        <Path d="M32 22 Q38 30 38 40 Q38 50 32 52 Q26 50 26 40 Q26 30 32 22Z" />
      </G>
    </Svg>
  );
}
