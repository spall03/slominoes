/**
 * Core game configuration constants
 */

// Board dimensions
export const BOARD_SIZE = 8;
export const BOARD_ROWS = BOARD_SIZE;
export const BOARD_COLS = BOARD_SIZE;

// Tile configuration
export const TILES_PER_LEVEL = 15;

// Respin configuration
export const RESPINS_PER_LEVEL = 5;

// Scoring thresholds
export const WIN_THRESHOLD = 3000;

// Match configuration
export const MIN_MATCH_LENGTH = 3;

// Length multipliers for matches
export const LENGTH_MULTIPLIERS: Record<number, number> = {
  3: 1,
  4: 2,
  5: 3,
  // 6+ uses max multiplier
};
export const MAX_LENGTH_MULTIPLIER = 4;

/**
 * Get the multiplier for a given match length
 */
export function getLengthMultiplier(length: number): number {
  if (length < MIN_MATCH_LENGTH) return 0;
  if (length >= 6) return MAX_LENGTH_MULTIPLIER;
  return LENGTH_MULTIPLIERS[length] ?? MAX_LENGTH_MULTIPLIER;
}
