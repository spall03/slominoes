import React from 'react';
import Svg, { G, Path, Circle, Line } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Compass({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#40E0D0" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* outer circle */}
        <Circle cx={32} cy={34} r={20} />
        {/* N arrow */}
        <Path d="M32 34 L32 18" />
        <Path d="M28 22 L32 14 L36 22" />
        {/* S line */}
        <Path d="M32 34 L32 50" />
        {/* E/W ticks */}
        <Line x1={16} y1={34} x2={20} y2={34} />
        <Line x1={44} y1={34} x2={48} y2={34} />
      </G>
    </Svg>
  );
}
