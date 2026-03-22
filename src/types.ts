// src/types.ts

export type Symbol = 'cherry' | 'lemon' | 'bar' | 'bell' | 'seven' | 'wall';

export interface EntrySpot {
  id: number;
  label: string;
  cells: [number, number][];
  arrowDirection: 'down' | 'up' | 'left' | 'right';
}

export interface ObstacleCell {
  row: number;
  col: number;
  symbol: Symbol | 'wall';
}

export interface LevelConfig {
  level: number;
  threshold: number;
  respins: number;
  tilesPerLevel: number;
  symbolCount: number;
  obstacles: ObstacleCell[];
  entrySpotCount: number;
  boardMask: boolean[][] | null;
}

export interface Tile {
  id: string;
  symbolA: Symbol;
  symbolB: Symbol;
}

export type Grid = (Symbol | null)[][];

export type Rotation = 0 | 1 | 2 | 3;

export interface Match {
  cells: [number, number][];
  symbol: Symbol;
  length: number;
  score: number;
}

export interface ScorePopup {
  id: string;
  score: number;
  row: number;
  col: number;
}

export type GamePhase = 'placing' | 'ended';
export type GameResult = 'win' | 'lose' | null;
export type PlacementMode = 'idle' | 'placed';
export type RunPhase = 'title' | 'levelPreview' | 'playing' | 'gameOver';
