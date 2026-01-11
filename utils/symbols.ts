/**
 * Symbol definitions and generation utilities
 */

import { TILES_PER_LEVEL } from '../constants/gameConfig';

/**
 * Available slot symbols
 */
export enum Symbol {
  Cherry = 'cherry',
  Lemon = 'lemon',
  Bar = 'bar',
  Bell = 'bell',
  Seven = 'seven',
}

/**
 * Base point values for each symbol
 */
export const SYMBOL_VALUES: Record<Symbol, number> = {
  [Symbol.Cherry]: 10,
  [Symbol.Lemon]: 20,
  [Symbol.Bar]: 40,
  [Symbol.Bell]: 80,
  [Symbol.Seven]: 150,
};

/**
 * Display emoji/icon for each symbol (placeholder)
 */
export const SYMBOL_DISPLAY: Record<Symbol, string> = {
  [Symbol.Cherry]: '🍒',
  [Symbol.Lemon]: '🍋',
  [Symbol.Bar]: '🎰',
  [Symbol.Bell]: '🔔',
  [Symbol.Seven]: '7️⃣',
};

/**
 * Array of all symbols for random selection
 */
export const ALL_SYMBOLS: Symbol[] = Object.values(Symbol);

/**
 * A domino tile containing two symbols
 */
export interface Tile {
  id: string;
  symbolA: Symbol;
  symbolB: Symbol;
}

/**
 * Get a random symbol
 */
export function getRandomSymbol(): Symbol {
  const index = Math.floor(Math.random() * ALL_SYMBOLS.length);
  return ALL_SYMBOLS[index];
}

/**
 * Generate a random tile with two symbols
 */
export function generateTile(id: string): Tile {
  return {
    id,
    symbolA: getRandomSymbol(),
    symbolB: getRandomSymbol(),
  };
}

/**
 * Generate the initial queue of tiles for a level
 */
export function generateTileQueue(): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 0; i < TILES_PER_LEVEL; i++) {
    tiles.push(generateTile(`tile-${i}`));
  }
  return tiles;
}

/**
 * Create an empty 8x8 grid (null = empty cell)
 */
export function createEmptyGrid(): (Symbol | null)[][] {
  const grid: (Symbol | null)[][] = [];
  for (let row = 0; row < 8; row++) {
    grid.push(new Array(8).fill(null));
  }
  return grid;
}

/**
 * Deep clone a grid
 */
export function cloneGrid(grid: (Symbol | null)[][]): (Symbol | null)[][] {
  return grid.map(row => [...row]);
}
