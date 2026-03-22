import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Bar({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FF4444" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        {/* outer frame */}
        <Rect x={8} y={16} width={48} height={32} rx={4} />
        {/* inner frame */}
        <Rect x={12} y={20} width={40} height={24} rx={2} />
        {/* B */}
        <Path d="M18 28 L18 36 M18 28 L22 28 Q24 28 24 30 Q24 32 22 32 L18 32 M18 32 L22 32 Q25 32 25 34 Q25 36 22 36 L18 36" />
        {/* A */}
        <Path d="M28 36 L31 28 L34 36 M29 33 L33 33" />
        {/* R */}
        <Path d="M38 28 L38 36 M38 28 L42 28 Q44 28 44 30.5 Q44 33 42 33 L38 33 M41 33 L44 36" />
      </G>
    </Svg>
  );
}
