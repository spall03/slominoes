import React from 'react';
import Svg, { G, Line, Polyline, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function RespinCol({ size = 40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G fill="none" stroke="#e74c6f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {/* vertical double arrow */}
        <Line x1={20} y1={8} x2={20} y2={32} />
        <Polyline points="15,12 20,8 25,12" />
        <Polyline points="15,28 20,32 25,28" />
        {/* circular refresh hint */}
        <Path d="M14 12 A10 10 0 0 1 26 12" />
        <Path d="M26 28 A10 10 0 0 1 14 28" />
      </G>
    </Svg>
  );
}
