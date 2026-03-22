import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Seven({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#00E5FF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {/* seven top bar */}
        <Path d="M18 14 L46 14" />
        {/* seven diagonal */}
        <Path d="M46 14 L28 52" />
        {/* cross bar */}
        <Path d="M24 34 L40 34" />
        {/* serif/accent at top left */}
        <Path d="M18 14 L18 20" />
      </G>
    </Svg>
  );
}
