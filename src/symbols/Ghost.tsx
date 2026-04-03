import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Ghost({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#BBBBFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* ghost body */}
        <Path d="M16 54 L16 28 Q16 10 32 10 Q48 10 48 28 L48 54 L42 48 L36 54 L30 48 L24 54 L16 54Z" />
        {/* eyes */}
        <Circle cx={24} cy={28} r={3} />
        <Circle cx={40} cy={28} r={3} />
      </G>
    </Svg>
  );
}
