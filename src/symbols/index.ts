import React from 'react';

import { Cherry } from './Cherry';
import { Lemon } from './Lemon';
import { Bar } from './Bar';
import { Bell } from './Bell';
import { Seven } from './Seven';
import { Wall } from './Wall';
import { Jam } from './Jam';
import { Apple } from './Apple';
import { Magnet } from './Magnet';
import { OilCan } from './OilCan';
import { Crown } from './Crown';
import { Bomb } from './Bomb';
import { Egg } from './Egg';
import { Compass } from './Compass';
import { Vine } from './Vine';
import { Ghost } from './Ghost';
import { Honey } from './Honey';
import { Tide } from './Tide';
import { Coral } from './Coral';
import { Ember } from './Ember';
import { Banana } from './Banana';

const SYMBOL_COMPONENTS: Record<string, React.ComponentType<{ size?: number }>> = {
  cherry: Cherry,
  lemon: Lemon,
  bar: Bar,
  bell: Bell,
  seven: Seven,
  wall: Wall,
  jam: Jam,
  apple: Apple,
  magnet: Magnet,
  oil_can: OilCan,
  crown: Crown,
  bomb: Bomb,
  egg: Egg,
  compass: Compass,
  vine: Vine,
  ghost: Ghost,
  honey: Honey,
  tide: Tide,
  coral: Coral,
  ember: Ember,
  banana: Banana,
};

interface SymbolIconProps {
  symbol: string;
  size?: number;
}

export function SymbolIcon({ symbol, size }: SymbolIconProps) {
  const Component = SYMBOL_COMPONENTS[symbol];
  if (!Component) return null;
  return React.createElement(Component, { size });
}

// Re-export all individual components
export { Cherry, Lemon, Bar, Bell, Seven, Wall };
export { Jam, Apple, Magnet, OilCan, Crown, Bomb, Egg, Compass, Vine, Ghost, Honey, Tide, Coral, Ember, Banana };
export { Arrow } from './Arrow';
export { RespinRow } from './RespinRow';
export { RespinCol } from './RespinCol';
export { Help } from './Help';
export { Star } from './Star';
export { Logo } from './Logo';
export { Domino } from './Domino';
