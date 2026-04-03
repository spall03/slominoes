import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Coral({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FF7766" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* base */}
        <Path d="M22 54 L42 54" />
        {/* center stalk */}
        <Path d="M32 54 L32 28" />
        {/* center bulb */}
        <Circle cx={32} cy={22} r={6} />
        {/* left branch */}
        <Path d="M32 40 Q22 36 18 28" />
        <Circle cx={16} cy={22} r={5} />
        {/* right branch */}
        <Path d="M32 36 Q42 32 46 24" />
        <Circle cx={48} cy={18} r={5} />
      </G>
    </Svg>
  );
}
