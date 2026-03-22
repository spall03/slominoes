import React from 'react';
import Svg, { G, Path, Ellipse } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Lemon({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#BFFF00" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* lemon body - oval/pointed */}
        <Ellipse cx={32} cy={34} rx={14} ry={17} />
        {/* top nub */}
        <Path d="M28 18 Q32 12 36 18" />
        {/* inner segment lines */}
        <Path d="M28 28 Q32 32 28 40" />
        <Path d="M32 22 L32 46" />
        <Path d="M36 28 Q32 32 36 40" />
      </G>
    </Svg>
  );
}
