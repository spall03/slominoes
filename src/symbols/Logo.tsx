import React from 'react';
import Svg, { Text as SvgText } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export function Logo({ width = 360, height = 64 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 64">
      <SvgText
        x={180}
        y={46}
        textAnchor="middle"
        fontFamily="Space Grotesk, system-ui, sans-serif"
        fontSize={42}
        fontWeight="700"
        fill="none"
        stroke="#00E5FF"
        strokeWidth={1.5}
        letterSpacing={6}
      >
        SLOMINOES
      </SvgText>
    </Svg>
  );
}
