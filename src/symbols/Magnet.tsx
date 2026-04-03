import React from 'react';
import Svg, { G, Path, Line } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Magnet({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#8888FF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* top arm outer (U opening faces right) */}
        <Path d="M54 12 L32 12 Q10 12 10 32 Q10 52 32 52 L54 52" />
        {/* top arm inner */}
        <Path d="M54 22 L32 22 Q20 22 20 32 Q20 42 32 42 L54 42" />
        {/* top pole cap */}
        <Line x1={54} y1={12} x2={54} y2={22} />
        {/* bottom pole cap */}
        <Line x1={54} y1={42} x2={54} y2={52} />
      </G>
    </Svg>
  );
}
