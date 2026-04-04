import React from 'react';
import Svg, { G, Line, Polyline, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function RespinCol({ size = 40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G fill="none" stroke="#e74c6f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
         transform="rotate(90, 20, 20)">
        {/* same as RespinRow, rotated 90° */}
        <Line x1={8} y1={20} x2={32} y2={20} />
        <Polyline points="12,15 8,20 12,25" />
        <Polyline points="28,15 32,20 28,25" />
        <Path d="M14 12 A10 10 0 0 1 26 12" />
        <Path d="M26 28 A10 10 0 0 1 14 28" />
      </G>
    </Svg>
  );
}
