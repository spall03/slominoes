import React from 'react';
import Svg, { G, Path, Circle, Line } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Bell({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FF8C00" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* bell top knob */}
        <Circle cx={32} cy={14} r={3} />
        {/* bell body */}
        <Path d="M20 42 Q20 22 32 18 Q44 22 44 42" />
        {/* bell bottom rim */}
        <Line x1={16} y1={42} x2={48} y2={42} />
        {/* clapper */}
        <Circle cx={32} cy={48} r={3} />
        {/* inner line detail */}
        <Path d="M24 38 Q32 34 40 38" />
      </G>
    </Svg>
  );
}
