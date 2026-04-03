import React from 'react';
import Svg, { G, Path, Line } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Magnet({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#8888FF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* U-shaped magnet */}
        <Path d="M16 14 L16 36 Q16 52 32 52 Q48 52 48 36 L48 14" />
        {/* left pole cap */}
        <Line x1={12} y1={14} x2={20} y2={14} />
        {/* right pole cap */}
        <Line x1={44} y1={14} x2={52} y2={14} />
      </G>
    </Svg>
  );
}
