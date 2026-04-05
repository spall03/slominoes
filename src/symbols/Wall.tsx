import React from 'react';
import Svg, { G, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function Wall({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#8888aa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {/* brick rows */}
        {/* row 1 */}
        <Rect x={8} y={10} width={22} height={10} rx={1} />
        <Rect x={34} y={10} width={22} height={10} rx={1} />
        {/* row 2 (offset) */}
        <Rect x={14} y={22} width={22} height={10} rx={1} />
        <Rect x={40} y={22} width={16} height={10} rx={1} />
        <Rect x={8} y={22} width={4} height={10} rx={1} />
        {/* row 3 */}
        <Rect x={8} y={34} width={22} height={10} rx={1} />
        <Rect x={34} y={34} width={22} height={10} rx={1} />
        {/* row 4 (offset) */}
        <Rect x={14} y={46} width={22} height={10} rx={1} />
        <Rect x={40} y={46} width={16} height={10} rx={1} />
        <Rect x={8} y={46} width={4} height={10} rx={1} />
      </G>
    </Svg>
  );
}
