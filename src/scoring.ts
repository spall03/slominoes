// src/scoring.ts
import type { Grid, Match, Symbol } from './types';
import { BOARD_SIZE, MIN_MATCH_LENGTH, SYMBOL_VALUES } from './constants';
import { getLengthMultiplier } from './level';

export function findMatches(grid: Grid): Match[] {
  const matches: Match[] = [];

  // Horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    let col = 0;
    while (col < BOARD_SIZE) {
      const symbol = grid[row][col];
      if (symbol === null || symbol === 'wall') { col++; continue; }

      let length = 1;
      while (col + length < BOARD_SIZE && grid[row][col + length] === symbol) {
        length++;
      }

      if (length >= MIN_MATCH_LENGTH) {
        const cells: [number, number][] = [];
        for (let i = 0; i < length; i++) cells.push([row, col + i]);
        const multiplier = getLengthMultiplier(length);
        const score = SYMBOL_VALUES[symbol] * length * multiplier;
        matches.push({ cells, symbol, length, score });
      }
      col += length;
    }
  }

  // Vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    let row = 0;
    while (row < BOARD_SIZE) {
      const symbol = grid[row][col];
      if (symbol === null || symbol === 'wall') { row++; continue; }

      let length = 1;
      while (row + length < BOARD_SIZE && grid[row + length][col] === symbol) {
        length++;
      }

      if (length >= MIN_MATCH_LENGTH) {
        const cells: [number, number][] = [];
        for (let i = 0; i < length; i++) cells.push([row + i, col]);
        const multiplier = getLengthMultiplier(length);
        const score = SYMBOL_VALUES[symbol] * length * multiplier;
        matches.push({ cells, symbol, length, score });
      }
      row += length;
    }
  }

  return matches;
}

export function calculateScore(grid: Grid): { score: number; matches: Match[] } {
  const matches = findMatches(grid);
  const score = matches.reduce((sum, m) => sum + m.score, 0);
  return { score, matches };
}

export function matchKey(m: Match): string {
  return m.cells.map(([r, c]) => `${r},${c}`).join('|');
}
