// src/constants.ts
import { Dimensions, Platform } from 'react-native';
import type { Symbol } from './types';

export const BOARD_SIZE = 8;
export const TILES_PER_LEVEL = 16;
export const RESPINS_PER_LEVEL = 0;
export const WIN_THRESHOLD = 3000;
export const MIN_MATCH_LENGTH = 3;

export const WALL_SCALAR = 1.5;
export const SCORE_COEFFICIENT = 30;
export const LEVEL_SCALAR_MAX = 2.2;
export const NUM_LEVELS = 10;

export const LENGTH_MULTIPLIERS: Record<number, number> = { 3: 1, 4: 2, 5: 3 };
export const MAX_LENGTH_MULTIPLIER = 4;

export const CELL_MARGIN = 1;
export const GRID_PADDING = 4;

const _screenWidth = Dimensions.get('window').width;
export const CELL_SIZE = _screenWidth < 500
  ? Math.floor((_screenWidth - GRID_PADDING * 2 - 4 - 16) / 9 - CELL_MARGIN * 2)
  : 40;
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

export const SYMBOL_WEIGHTS: number[] = [5, 4, 3, 2, 1];
