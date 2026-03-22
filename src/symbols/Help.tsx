import React from 'react';
import Svg, { G, Circle, Path } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Help({ size = 32 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G fill="none" stroke="#5c6bc0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={16} cy={16} r={12} />
        <Path d="M12 12 Q12 8 16 8 Q20 8 20 12 Q20 15 16 16 L16 18" />
        {/* filled dot for period */}
        <Circle cx={16} cy={22} r={1} fill="#5c6bc0" />
      </G>
    </Svg>
  );
}
