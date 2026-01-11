/**
 * Scoring logic: match detection and score calculation
 */

import {
  BOARD_SIZE,
  MIN_MATCH_LENGTH,
  getLengthMultiplier,
} from '../constants/gameConfig';
import { Symbol, SYMBOL_VALUES } from './symbols';

/**
 * A match is a consecutive sequence of identical symbols
 */
export interface Match {
  cells: [number, number][]; // [row, col] pairs
  symbol: Symbol;
  length: number;
  direction: 'horizontal' | 'vertical';
  score: number;
}

/**
 * Result of calculating the score for a grid
 */
export interface ScoreResult {
  score: number;
  matches: Match[];
}

/**
 * Find all horizontal matches in a single row
 */
function findHorizontalMatchesInRow(
  grid: (Symbol | null)[][],
  row: number
): Match[] {
  const matches: Match[] = [];
  let col = 0;

  while (col < BOARD_SIZE) {
    const symbol = grid[row][col];

    // Skip empty cells
    if (symbol === null) {
      col++;
      continue;
    }

    // Count consecutive matching symbols
    let matchLength = 1;
    const startCol = col;

    while (col + matchLength < BOARD_SIZE && grid[row][col + matchLength] === symbol) {
      matchLength++;
    }

    // Record if it's a valid match (3+)
    if (matchLength >= MIN_MATCH_LENGTH) {
      const cells: [number, number][] = [];
      for (let i = 0; i < matchLength; i++) {
        cells.push([row, startCol + i]);
      }

      const baseValue = SYMBOL_VALUES[symbol];
      const multiplier = getLengthMultiplier(matchLength);
      const score = baseValue * matchLength * multiplier;

      matches.push({
        cells,
        symbol,
        length: matchLength,
        direction: 'horizontal',
        score,
      });
    }

    col += matchLength;
  }

  return matches;
}

/**
 * Find all vertical matches in a single column
 */
function findVerticalMatchesInColumn(
  grid: (Symbol | null)[][],
  col: number
): Match[] {
  const matches: Match[] = [];
  let row = 0;

  while (row < BOARD_SIZE) {
    const symbol = grid[row][col];

    // Skip empty cells
    if (symbol === null) {
      row++;
      continue;
    }

    // Count consecutive matching symbols
    let matchLength = 1;
    const startRow = row;

    while (row + matchLength < BOARD_SIZE && grid[row + matchLength][col] === symbol) {
      matchLength++;
    }

    // Record if it's a valid match (3+)
    if (matchLength >= MIN_MATCH_LENGTH) {
      const cells: [number, number][] = [];
      for (let i = 0; i < matchLength; i++) {
        cells.push([startRow + i, col]);
      }

      const baseValue = SYMBOL_VALUES[symbol];
      const multiplier = getLengthMultiplier(matchLength);
      const score = baseValue * matchLength * multiplier;

      matches.push({
        cells,
        symbol,
        length: matchLength,
        direction: 'vertical',
        score,
      });
    }

    row += matchLength;
  }

  return matches;
}

/**
 * Find all matches (horizontal and vertical) in the grid
 */
export function findMatches(grid: (Symbol | null)[][]): Match[] {
  const matches: Match[] = [];

  // Find horizontal matches in each row
  for (let row = 0; row < BOARD_SIZE; row++) {
    matches.push(...findHorizontalMatchesInRow(grid, row));
  }

  // Find vertical matches in each column
  for (let col = 0; col < BOARD_SIZE; col++) {
    matches.push(...findVerticalMatchesInColumn(grid, col));
  }

  return matches;
}

/**
 * Calculate the total score for a grid
 * Note: Overlapping matches are allowed - same symbol can contribute to row AND column
 */
export function calculateScore(grid: (Symbol | null)[][]): ScoreResult {
  const matches = findMatches(grid);
  const score = matches.reduce((total, match) => total + match.score, 0);

  return {
    score,
    matches,
  };
}

/**
 * Calculate the score for a single match
 * Formula: (symbol_base_value * match_length) * length_multiplier
 */
export function calculateMatchScore(symbol: Symbol, length: number): number {
  if (length < MIN_MATCH_LENGTH) return 0;

  const baseValue = SYMBOL_VALUES[symbol];
  const multiplier = getLengthMultiplier(length);

  return baseValue * length * multiplier;
}
