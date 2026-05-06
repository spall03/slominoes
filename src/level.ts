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

/**
 * Hand-crafted Level 0 (FTUE tutorial) config. Soft rails — pre-seeded board
 * + carefully-chosen tile queue (in generateTutorialTileQueue) guarantee the
 * scripted teaching beats fire reliably without hard-rails / forced moves.
 *
 * Spec: docs/superpowers/specs/2026-05-03-ftue-level-zero-design.md (v3)
 */
export const TUTORIAL_LEVEL_CONFIG: LevelConfig = {
  level: 0,
  // Threshold = 30 means a single 3-cherry match (10 × 3) wins the level
  // immediately — instant dopamine, "I figured it out."
  threshold: 30,
  // 1 respin so the tutorial can teach the respin mechanic, not so many that
  // the player can spam-respin and avoid learning placement.
  respins: 1,
  tilesPerLevel: 4,
  symbolCount: 5,
  // Pre-seeded board: 2 cherries adjacent at row 5 (begging for a 3-match)
  // + 1 isolated bar at (3, 1) that will be the respin-lesson setup.
  obstacles: [
    { row: 5, col: 3, symbol: 'cherry' },
    { row: 5, col: 4, symbol: 'cherry' },
    { row: 3, col: 1, symbol: 'bar' },
  ],
  entrySpotCount: 2,
  boardMask: null,
  // CRITICAL — without this, +15% auto-end fires at score >= 34.5 (single
  // cherry match = 30, any incidental pickup tips it over) and the level
  // ends before the respin lesson on tile 3.
  disableAutoEnd: true,
  isTutorial: true,
};

/**
 * Hand-crafted tile queue for Level 0. Spec v3 design:
 *   - tile 1 (cherry+lemon): completes the seeded cherry pair → 3-match → lock
 *   - tile 2 (bell+seven):   both symbols absent from current board →
 *                            STRUCTURALLY non-matching, lesson "not every move
 *                            is a match" can't be undermined by luck
 *   - tile 3 (bar+bell):     bar adjacent to seeded (3, 1) bar → near-match,
 *                            sets up the respin lesson
 *   - tile 4 (seven+lemon):  cleanup tile after the respin lesson
 */
export function generateTutorialTileQueue(): Tile[] {
  return [
    { id: 't0-1', symbolA: 'cherry', symbolB: 'lemon' },
    { id: 't0-2', symbolA: 'bell',   symbolB: 'seven' },
    { id: 't0-3', symbolA: 'bar',    symbolB: 'bell'  },
    { id: 't0-4', symbolA: 'seven',  symbolB: 'lemon' },
  ];
}

export function generateLevelConfig(level: number): LevelConfig {
  // Tutorial — hand-crafted, no procedural generation.
  if (level === 0) return TUTORIAL_LEVEL_CONFIG;

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
