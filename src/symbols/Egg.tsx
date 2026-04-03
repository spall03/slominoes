import React from 'react';
import Svg, { G, Ellipse, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Egg({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FFFACD" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* egg */}
        <Ellipse cx={32} cy={34} rx={16} ry={20} />
        {/* shine */}
        <Path d="M26 24 Q28 20 32 20" />
      </G>
    </Svg>
  );
}
