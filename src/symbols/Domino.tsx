import React from 'react';
import Svg, { G, Rect, Line, Circle, Path, Ellipse } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Domino({ size = 80 }: Props) {
  // Source viewBox is 48x80; scale width proportionally
  const width = size * (48 / 80);
  return (
    <Svg width={width} height={size} viewBox="0 0 48 80">
      {/* domino outline */}
      <G fill="none" stroke="#00E5FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={4} y={4} width={40} height={72} rx={6} />
        <Line x1={8} y1={40} x2={40} y2={40} />
      </G>
      {/* top symbol: mini cherry */}
      <G fill="none" stroke="#FF3B82" strokeWidth={1.5} strokeLinecap="round">
        <Circle cx={20} cy={24} r={5} />
        <Circle cx={30} cy={24} r={5} />
        <Path d="M22 19 Q24 12 28 19" />
      </G>
      {/* bottom symbol: mini lemon */}
      <G fill="none" stroke="#BFFF00" strokeWidth={1.5} strokeLinecap="round">
        <Ellipse cx={24} cy={58} rx={7} ry={9} />
        <Path d="M22 50 Q24 46 26 50" />
      </G>
    </Svg>
  );
}
