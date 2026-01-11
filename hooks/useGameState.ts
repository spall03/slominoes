/**
 * Core game state management using Zustand
 */

import { create } from 'zustand';
import {
  BOARD_SIZE,
  RESPINS_PER_LEVEL,
  WIN_THRESHOLD,
} from '../constants/gameConfig';
import {
  Symbol,
  Tile,
  generateTileQueue,
  createEmptyGrid,
  cloneGrid,
  getRandomSymbol,
} from '../utils/symbols';
import { calculateScore, Match } from '../utils/scoring';

/**
 * Game phases
 */
export type GamePhase = 'placing' | 'respinning' | 'ended';

/**
 * Tile orientation for placement
 */
export type Orientation = 'horizontal' | 'vertical';

/**
 * End game result
 */
export type GameResult = 'win' | 'lose' | null;

/**
 * Core game state interface
 */
export interface GameState {
  // Board state
  grid: (Symbol | null)[][];

  // Tile management
  tileQueue: Tile[];
  currentTile: Tile | null;
  currentOrientation: Orientation;

  // Respin state
  respinsRemaining: number;

  // Scoring
  placementScore: number;
  respinScore: number;
  lastMatches: Match[];

  // Game phase
  phase: GamePhase;
  result: GameResult;

  // Actions
  placeTile: (row: number, col: number) => boolean;
  rotateTile: () => void;
  respinLine: (type: 'row' | 'col', index: number) => void;
  resetGame: () => void;

  // Computed helpers
  getTotalScore: () => number;
  getTilesRemaining: () => number;
  canPlaceTile: (row: number, col: number) => boolean;
}

/**
 * Check if a tile can be placed at the given position
 */
function canPlaceTileAt(
  grid: (Symbol | null)[][],
  row: number,
  col: number,
  orientation: Orientation
): boolean {
  // Check first cell bounds and emptiness
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return false;
  }
  if (grid[row][col] !== null) {
    return false;
  }

  // Check second cell based on orientation
  if (orientation === 'horizontal') {
    if (col + 1 >= BOARD_SIZE) return false;
    if (grid[row][col + 1] !== null) return false;
  } else {
    if (row + 1 >= BOARD_SIZE) return false;
    if (grid[row + 1][col] !== null) return false;
  }

  return true;
}

/**
 * Create initial game state
 */
function createInitialState() {
  const tileQueue = generateTileQueue();
  return {
    grid: createEmptyGrid(),
    tileQueue: tileQueue.slice(1),
    currentTile: tileQueue[0] ?? null,
    currentOrientation: 'horizontal' as Orientation,
    respinsRemaining: RESPINS_PER_LEVEL,
    placementScore: 0,
    respinScore: 0,
    lastMatches: [] as Match[],
    phase: 'placing' as GamePhase,
    result: null as GameResult,
  };
}

/**
 * Main game state store
 */
export const useGameState = create<GameState>((set, get) => ({
  ...createInitialState(),

  /**
   * Place the current tile at the specified position
   * Returns true if placement was successful
   */
  placeTile: (row: number, col: number): boolean => {
    const state = get();

    if (state.phase !== 'placing' || !state.currentTile) {
      return false;
    }

    if (!canPlaceTileAt(state.grid, row, col, state.currentOrientation)) {
      return false;
    }

    const newGrid = cloneGrid(state.grid);
    const { symbolA, symbolB } = state.currentTile;

    // Place both symbols
    newGrid[row][col] = symbolA;
    if (state.currentOrientation === 'horizontal') {
      newGrid[row][col + 1] = symbolB;
    } else {
      newGrid[row + 1][col] = symbolB;
    }

    // Get next tile from queue
    const newQueue = [...state.tileQueue];
    const nextTile = newQueue.shift() ?? null;

    // Check if placement phase is complete
    const isPlacementComplete = nextTile === null;

    if (isPlacementComplete) {
      // Calculate placement score and transition to respin phase
      const { score, matches } = calculateScore(newGrid);
      set({
        grid: newGrid,
        tileQueue: newQueue,
        currentTile: null,
        placementScore: score,
        lastMatches: matches,
        phase: 'respinning',
      });
    } else {
      set({
        grid: newGrid,
        tileQueue: newQueue,
        currentTile: nextTile,
      });
    }

    return true;
  },

  /**
   * Toggle tile orientation between horizontal and vertical
   */
  rotateTile: () => {
    set(state => ({
      currentOrientation: state.currentOrientation === 'horizontal' ? 'vertical' : 'horizontal',
    }));
  },

  /**
   * Respin all symbols in a row or column
   */
  respinLine: (type: 'row' | 'col', index: number) => {
    const state = get();

    if (state.phase !== 'respinning' || state.respinsRemaining <= 0) {
      return;
    }

    if (index < 0 || index >= BOARD_SIZE) {
      return;
    }

    const newGrid = cloneGrid(state.grid);

    // Respin all symbols in the selected row or column
    if (type === 'row') {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (newGrid[index][col] !== null) {
          newGrid[index][col] = getRandomSymbol();
        }
      }
    } else {
      for (let row = 0; row < BOARD_SIZE; row++) {
        if (newGrid[row][index] !== null) {
          newGrid[row][index] = getRandomSymbol();
        }
      }
    }

    const newRespinsRemaining = state.respinsRemaining - 1;

    // Check if respin phase is complete
    if (newRespinsRemaining === 0) {
      // Calculate final respin score and end game
      const { score, matches } = calculateScore(newGrid);
      const totalScore = state.placementScore + score;
      const result: GameResult = totalScore >= WIN_THRESHOLD ? 'win' : 'lose';

      set({
        grid: newGrid,
        respinsRemaining: 0,
        respinScore: score,
        lastMatches: matches,
        phase: 'ended',
        result,
      });
    } else {
      // Recalculate score after respin
      const { score, matches } = calculateScore(newGrid);
      set({
        grid: newGrid,
        respinsRemaining: newRespinsRemaining,
        respinScore: score,
        lastMatches: matches,
      });
    }
  },

  /**
   * Reset the game to initial state
   */
  resetGame: () => {
    set(createInitialState());
  },

  /**
   * Get the total score (placement + respin)
   */
  getTotalScore: () => {
    const state = get();
    return state.placementScore + state.respinScore;
  },

  /**
   * Get the number of tiles remaining to place
   */
  getTilesRemaining: () => {
    const state = get();
    return state.tileQueue.length + (state.currentTile ? 1 : 0);
  },

  /**
   * Check if a tile can be placed at the given position
   */
  canPlaceTile: (row: number, col: number): boolean => {
    const state = get();
    return canPlaceTileAt(state.grid, row, col, state.currentOrientation);
  },
}));

/**
 * Selector hooks for common state slices
 */
export const useGrid = () => useGameState(state => state.grid);
export const useCurrentTile = () => useGameState(state => state.currentTile);
export const useOrientation = () => useGameState(state => state.currentOrientation);
export const usePhase = () => useGameState(state => state.phase);
export const useRespins = () => useGameState(state => state.respinsRemaining);
export const useScores = () => useGameState(state => ({
  placement: state.placementScore,
  respin: state.respinScore,
  total: state.placementScore + state.respinScore,
}));
export const useResult = () => useGameState(state => state.result);
export const useMatches = () => useGameState(state => state.lastMatches);
