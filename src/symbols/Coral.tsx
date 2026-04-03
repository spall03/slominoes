import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Coral({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FF7766" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* main trunk */}
        <Path d="M32 56 L32 30" />
        {/* left branch */}
        <Path d="M32 40 Q20 36 18 24 Q16 16 20 12" />
        {/* right branch */}
        <Path d="M32 36 Q42 32 44 22 Q46 14 42 10" />
        {/* small branches */}
        <Path d="M22 28 Q16 26 14 20" />
        <Path d="M40 26 Q46 24 48 18" />
      </G>
    </Svg>
  );
}
