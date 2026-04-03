import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Egg({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FFFACD" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* egg shape */}
        <Path d="M32 8 Q14 24 14 40 Q14 56 32 56 Q50 56 50 40 Q50 24 32 8Z" />
      </G>
    </Svg>
  );
}
