// src/level.ts
import type { Symbol, EntrySpot, LevelConfig, ObstacleCell, Tile } from './types';
import {
  SYMBOLS,
  SYMBOL_WEIGHTS,
  LENGTH_MULTIPLIERS,
  MAX_LENGTH_MULTIPLIER,
  MIN_MATCH_LENGTH,
} from './constants';
import { CONFIG } from './config';

// =============================================================================
// ENTRY SPOTS
// =============================================================================

export const ENTRY_SPOTS: EntrySpot[] = getEntrySpots(CONFIG.ENTRY_SPOT_COUNT);

export function getEntrySpots(count: number): EntrySpot[] {
  const size = CONFIG.BOARD_SIZE;
  const mid = Math.floor(size / 2);
  const all: EntrySpot[] = [
    { id: 0, label: 'Top', cells: [[0, mid - 1], [0, mid]], arrowDirection: 'down' },
    { id: 1, label: 'Bottom', cells: [[size - 1, mid - 1], [size - 1, mid]], arrowDirection: 'up' },
    { id: 2, label: 'Left', cells: [[mid - 1, 0], [mid, 0]], arrowDirection: 'right' },
    { id: 3, label: 'Right', cells: [[mid - 1, size - 1], [mid, size - 1]], arrowDirection: 'left' },
  ];
  if (count <= 1) return [all[0]];
  if (count === 2) return [all[0], all[1]];
  return all;
}

// =============================================================================
// LEVEL GENERATION
// =============================================================================

export function generateLevelConfig(level: number): LevelConfig {
  const boardSize = CONFIG.BOARD_SIZE;
  const wallCount = CONFIG.WALL_COUNT;
  const mid = Math.floor(boardSize / 2);

  const entryCells = new Set([
    `0,${mid - 1}`, `0,${mid}`,
    `${boardSize - 1},${mid - 1}`, `${boardSize - 1},${mid}`,
  ]);

  const obstacles: ObstacleCell[] = [];
  const usedPositions = new Set<string>();
  while (obstacles.length < wallCount) {
    const row = Math.floor(Math.random() * boardSize);
    const col = Math.floor(Math.random() * boardSize);
    const key = `${row},${col}`;
    if (entryCells.has(key) || usedPositions.has(key)) continue;
    usedPositions.add(key);
    obstacles.push({ row, col, symbol: 'wall' });
  }

  return {
    level,
    threshold: CONFIG.THRESHOLD,
    respins: 0,
    tilesPerLevel: CONFIG.TILES_PER_BATCH * CONFIG.NUM_BATCHES,
    symbolCount: CONFIG.SYMBOL_COUNT,
    obstacles,
    entrySpotCount: CONFIG.ENTRY_SPOT_COUNT,
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

export function generateTileQueue(tilesPerLevel: number = CONFIG.TILES_PER_BATCH * CONFIG.NUM_BATCHES, symbolCount: number = SYMBOLS.length): Tile[] {
  return Array.from({ length: tilesPerLevel }, (_, i) =>
    generateTile(`tile-${i}`, symbolCount)
  );
}
