import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Bomb({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FF4444" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* bomb body */}
        <Circle cx={30} cy={38} r={16} />
        {/* fuse */}
        <Path d="M40 24 Q46 16 50 12" />
        {/* spark */}
        <Path d="M48 10 L52 8 M50 14 L54 12 M52 10 L54 6" />
      </G>
    </Svg>
  );
}
