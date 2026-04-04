// src/level.ts
import type { Symbol, EntrySpot, LevelConfig, Tile } from './types';
import {
  BOARD_SIZE,
  WALL_SCALAR,
  SCORE_COEFFICIENT,
  LEVEL_SCALAR_MAX,
  NUM_LEVELS,
  RESPINS_PER_LEVEL,
  TILES_PER_LEVEL,
  SYMBOLS,
  SYMBOL_WEIGHTS,
  LENGTH_MULTIPLIERS,
  MAX_LENGTH_MULTIPLIER,
  MIN_MATCH_LENGTH,
} from './constants';

// =============================================================================
// ENTRY SPOTS
// =============================================================================

export const ENTRY_SPOTS: EntrySpot[] = [
  { id: 0, label: 'Top', cells: [[0, 3], [0, 4]], arrowDirection: 'down' },
  { id: 1, label: 'Bottom', cells: [[7, 3], [7, 4]], arrowDirection: 'up' },
  // { id: 2, label: 'Left', cells: [[3, 0], [4, 0]], arrowDirection: 'right' },
  // { id: 3, label: 'Right', cells: [[3, 7], [4, 7]], arrowDirection: 'left' },
];

export function getEntrySpots(count: number): EntrySpot[] {
  const all: EntrySpot[] = [
    { id: 0, label: 'Top', cells: [[0, 3], [0, 4]], arrowDirection: 'down' },
    { id: 1, label: 'Bottom', cells: [[7, 3], [7, 4]], arrowDirection: 'up' },
    { id: 2, label: 'Left', cells: [[3, 0], [4, 0]], arrowDirection: 'right' },
    { id: 3, label: 'Right', cells: [[3, 7], [4, 7]], arrowDirection: 'left' },
  ];
  if (count <= 1) return [all[0]];
  if (count === 2) return [all[0], all[1]];
  return all;
}

// =============================================================================
// LEVEL GENERATION
// =============================================================================

export function generateLevelConfig(level: number): LevelConfig {
  const wallCount = Math.floor(level * WALL_SCALAR);

  // Place walls randomly, avoiding entry spot cells
  const entryCells = new Set(['0,3', '0,4', '7,3', '7,4']);
  const obstacles: { row: number; col: number; symbol: Symbol | 'wall' }[] = [];
  const usedPositions = new Set<string>();

  while (obstacles.length < wallCount) {
    const row = Math.floor(Math.random() * BOARD_SIZE);
    const col = Math.floor(Math.random() * BOARD_SIZE);
    const key = `${row},${col}`;
    if (entryCells.has(key) || usedPositions.has(key)) continue;
    usedPositions.add(key);
    obstacles.push({ row, col, symbol: 'wall' });
  }

  const playableCells = 64 - wallCount;
  const levelScalar = 1 + (level - 1) * ((LEVEL_SCALAR_MAX - 1) / (NUM_LEVELS - 1));
  const threshold = Math.round(playableCells * SCORE_COEFFICIENT * levelScalar);

  return {
    level,
    threshold,
    respins: RESPINS_PER_LEVEL,
    tilesPerLevel: TILES_PER_LEVEL,
    symbolCount: 5,
    obstacles,
    entrySpotCount: 2,
    boardMask: null,
  };
}

// =============================================================================
// SYMBOL / TILE UTILITIES
// =============================================================================

export function getLengthMultiplier(length: number): number {
  if (length < MIN_MATCH_LENGTH) return 0;
  if (length >= 6) return MAX_LENGTH_MULTIPLIER;
  return LENGTH_MULTIPLIERS[length] ?? MAX_LENGTH_MULTIPLIER;
}

export function getRandomSymbol(symbolCount: number = SYMBOLS.length): Symbol {
  const count = Math.min(symbolCount, SYMBOLS.length);
  let totalWeight = 0;
  for (let i = 0; i < count; i++) totalWeight += SYMBOL_WEIGHTS[i];
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < count; i++) {
    roll -= SYMBOL_WEIGHTS[i];
    if (roll <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[count - 1];
}

export function generateTile(id: string, symbolCount: number = SYMBOLS.length): Tile {
  return { id, symbolA: getRandomSymbol(symbolCount), symbolB: getRandomSymbol(symbolCount) };
}

export function generateTileQueue(tilesPerLevel: number = TILES_PER_LEVEL, symbolCount: number = SYMBOLS.length): Tile[] {
  return Array.from({ length: tilesPerLevel }, (_, i) =>
    generateTile(`tile-${i}`, symbolCount)
  );
}

// =============================================================================
// LOADOUT-AWARE TILE GENERATION
// =============================================================================

/** Generate a random symbol from a frequency table (Map<string, number>) */
export function getRandomSymbolFromFreqs(freqs: Map<string, number>): Symbol {
  let total = 0;
  for (const f of freqs.values()) total += f;
  let roll = Math.random() * total;
  for (const [sym, freq] of freqs) {
    if (sym === 'wall') continue;
    roll -= freq;
    if (roll <= 0) return sym as Symbol;
  }
  return freqs.keys().next().value as Symbol;
}

/** Generate a tile queue using a loadout's frequency table */
export function generateTileQueueFromFreqs(
  tilesPerLevel: number,
  freqs: Map<string, number>,
): Tile[] {
  return Array.from({ length: tilesPerLevel }, (_, i) => ({
    id: `tile-${i}`,
    symbolA: getRandomSymbolFromFreqs(freqs),
    symbolB: getRandomSymbolFromFreqs(freqs),
  }));
}
