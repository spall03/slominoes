import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function OilCan({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FFB020" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* body */}
        <Path d="M14 30 L14 50 L42 50 L42 30 Z" />
        {/* handle */}
        <Path d="M28 30 Q28 20 36 18" />
        {/* spout */}
        <Path d="M42 34 L56 24" />
        {/* drip */}
        <Path d="M56 24 L56 28" />
      </G>
    </Svg>
  );
}
