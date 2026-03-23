// src/constants.ts
import { Dimensions, Platform } from 'react-native';
import type { Symbol } from './types';
import { CONFIG } from './config';

export const BOARD_SIZE = CONFIG.BOARD_SIZE;
export const TILES_PER_LEVEL = CONFIG.TILES_PER_BATCH * CONFIG.NUM_BATCHES;
export const RESPINS_PER_LEVEL = 0;
export const WIN_THRESHOLD = CONFIG.THRESHOLD;
export const MIN_MATCH_LENGTH = CONFIG.MIN_MATCH_LENGTH;

export const WALL_SCALAR = 0;
export const SCORE_COEFFICIENT = 30;
export const LEVEL_SCALAR_MAX = 2.2;
export const NUM_LEVELS = 1;

export const LENGTH_MULTIPLIERS: Record<number, number> = { 3: 1, 4: 2, 5: 3 };
export const MAX_LENGTH_MULTIPLIER = 4;

export const CELL_MARGIN = 1;
export const GRID_PADDING = 4;

const _screenWidth = Dimensions.get('window').width;
export const CELL_SIZE = _screenWidth < 500
  ? Math.floor((_screenWidth - GRID_PADDING * 2 - 4 - 16) / (BOARD_SIZE + 1) - CELL_MARGIN * 2)
  : Math.floor(360 / BOARD_SIZE);
export const CELL_TOTAL = CELL_SIZE + CELL_MARGIN * 2;

export const isMobile = Platform.OS !== 'web' || _screenWidth < 700;

export const SYMBOLS: Symbol[] = ['cherry', 'lemon', 'bar', 'bell', 'seven'];

export const SYMBOL_VALUES: Record<Symbol, number> = {
  cherry: 10,
  lemon: 20,
  bar: 40,
  bell: 80,
  seven: 150,
  wall: 0,
};

export const SYMBOL_WEIGHTS: number[] = CONFIG.SYMBOL_WEIGHTS;
