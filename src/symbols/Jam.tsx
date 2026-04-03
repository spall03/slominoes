import React from 'react';
import Svg, { G, Rect, Path, Line } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Jam({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#E040A0" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* lid */}
        <Rect x={18} y={14} width={28} height={8} rx={2} />
        {/* jar body */}
        <Path d="M20 22 L20 50 Q20 54 24 54 L40 54 Q44 54 44 50 L44 22" />
        {/* label line */}
        <Line x1={24} y1={36} x2={40} y2={36} />
      </G>
    </Svg>
  );
}
