import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Vine({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#22BB44" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* curling vine */}
        <Path d="M16 52 Q20 36 32 32 Q44 28 40 16 Q38 10 32 12" />
        {/* leaf 1 */}
        <Path d="M24 40 Q18 34 24 32" />
        {/* leaf 2 */}
        <Path d="M40 22 Q46 18 44 24" />
      </G>
    </Svg>
  );
}
