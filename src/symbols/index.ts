import React from 'react';
import type { Symbol } from '../types';

import { Cherry } from './Cherry';
import { Lemon } from './Lemon';
import { Bar } from './Bar';
import { Bell } from './Bell';
import { Seven } from './Seven';
import { Wall } from './Wall';

const SYMBOL_COMPONENTS: Record<Symbol, React.ComponentType<{ size?: number }>> = {
  cherry: Cherry,
  lemon: Lemon,
  bar: Bar,
  bell: Bell,
  seven: Seven,
  wall: Wall,
};

interface SymbolIconProps {
  symbol: Symbol;
  size?: number;
}

export function SymbolIcon({ symbol, size }: SymbolIconProps) {
  const Component = SYMBOL_COMPONENTS[symbol];
  if (!Component) return null;
  return React.createElement(Component, { size });
}

// Re-export all individual components
export { Cherry, Lemon, Bar, Bell, Seven, Wall };
export { Arrow } from './Arrow';
export { RespinRow } from './RespinRow';
export { RespinCol } from './RespinCol';
export { Help } from './Help';
export { Star } from './Star';
export { Logo } from './Logo';
export { Domino } from './Domino';
