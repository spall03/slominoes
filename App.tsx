import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { create } from 'zustand';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// =============================================================================
// CONSTANTS
// =============================================================================

const BOARD_SIZE = 8;
const TILES_PER_LEVEL = 15;
const RESPINS_PER_LEVEL = 5;
const WIN_THRESHOLD = 3000;
const MIN_MATCH_LENGTH = 3;

const LENGTH_MULTIPLIERS: Record<number, number> = { 3: 1, 4: 2, 5: 3 };
const MAX_LENGTH_MULTIPLIER = 4;

function getLengthMultiplier(length: number): number {
  if (length < MIN_MATCH_LENGTH) return 0;
  if (length >= 6) return MAX_LENGTH_MULTIPLIER;
  return LENGTH_MULTIPLIERS[length] ?? MAX_LENGTH_MULTIPLIER;
}

// =============================================================================
// ENTRY SPOTS
// =============================================================================

interface EntrySpot {
  id: number;
  label: string;
  cells: [number, number][];
  arrowDirection: 'down' | 'up' | 'left' | 'right';
}

const ENTRY_SPOTS: EntrySpot[] = [
  { id: 0, label: 'Top', cells: [[0, 3], [0, 4]], arrowDirection: 'down' },
  { id: 1, label: 'Bottom', cells: [[7, 3], [7, 4]], arrowDirection: 'up' },
  // { id: 2, label: 'Left', cells: [[3, 0], [4, 0]], arrowDirection: 'right' },
  // { id: 3, label: 'Right', cells: [[3, 7], [4, 7]], arrowDirection: 'left' },
];

// =============================================================================
// LEVEL CONFIGS
// =============================================================================

interface ObstacleCell {
  row: number;
  col: number;
  symbol: Symbol | 'wall';
}

interface LevelConfig {
  level: number;
  threshold: number;
  respins: number;
  tilesPerLevel: number;
  symbolCount: number;
  obstacles: ObstacleCell[];
  entrySpotCount: number;
  boardMask: boolean[][] | null;
}

const LEVEL_CONFIGS: LevelConfig[] = [
  // Level 1 — gentle intro, lower threshold, full board
  {
    level: 1,
    threshold: 2500,
    respins: 4,
    tilesPerLevel: 15,
    symbolCount: 5,
    obstacles: [],
    entrySpotCount: 2,
    boardMask: null,
  },
  // Level 2 — introduce walls
  {
    level: 2,
    threshold: 3000,
    respins: 4,
    tilesPerLevel: 15,
    symbolCount: 5,
    obstacles: [
      { row: 3, col: 2, symbol: 'wall' },
      { row: 4, col: 5, symbol: 'wall' },
    ],
    entrySpotCount: 2,
    boardMask: null,
  },
  // Level 3 — corner-ish walls
  {
    level: 3,
    threshold: 3500,
    respins: 4,
    tilesPerLevel: 15,
    symbolCount: 5,
    obstacles: [
      { row: 1, col: 1, symbol: 'wall' },
      { row: 1, col: 6, symbol: 'wall' },
      { row: 6, col: 1, symbol: 'wall' },
      { row: 6, col: 6, symbol: 'wall' },
    ],
    entrySpotCount: 2,
    boardMask: null,
  },
  // Level 4 — corners + center, fewer respins, more symbols
  {
    level: 4,
    threshold: 4000,
    respins: 3,
    tilesPerLevel: 15,
    symbolCount: 6,
    obstacles: [
      { row: 1, col: 1, symbol: 'wall' },
      { row: 1, col: 6, symbol: 'wall' },
      { row: 6, col: 1, symbol: 'wall' },
      { row: 6, col: 6, symbol: 'wall' },
      { row: 3, col: 3, symbol: 'wall' },
      { row: 4, col: 4, symbol: 'wall' },
    ],
    entrySpotCount: 2,
    boardMask: null,
  },
  // Level 5 — scattered walls
  {
    level: 5,
    threshold: 4500,
    respins: 3,
    tilesPerLevel: 15,
    symbolCount: 6,
    obstacles: [
      { row: 0, col: 1, symbol: 'wall' },
      { row: 1, col: 5, symbol: 'wall' },
      { row: 2, col: 2, symbol: 'wall' },
      { row: 3, col: 6, symbol: 'wall' },
      { row: 4, col: 1, symbol: 'wall' },
      { row: 5, col: 5, symbol: 'wall' },
      { row: 6, col: 2, symbol: 'wall' },
      { row: 7, col: 6, symbol: 'wall' },
    ],
    entrySpotCount: 2,
    boardMask: null,
  },
  // Level 6 — cross-shaped board, no obstacles
  {
    level: 6,
    threshold: 5000,
    respins: 3,
    tilesPerLevel: 15,
    symbolCount: 6,
    obstacles: [],
    entrySpotCount: 2,
    boardMask: (() => {
      const mask = Array.from({ length: 8 }, () => Array(8).fill(true) as boolean[]);
      // Cut 3 cells from each corner
      // Top-left
      mask[0][0] = false; mask[0][1] = false; mask[1][0] = false;
      // Top-right
      mask[0][6] = false; mask[0][7] = false; mask[1][7] = false;
      // Bottom-left
      mask[6][0] = false; mask[7][0] = false; mask[7][1] = false;
      // Bottom-right
      mask[6][7] = false; mask[7][6] = false; mask[7][7] = false;
      return mask;
    })(),
  },
  // Level 7 — scattered walls, more symbols, fewer respins
  {
    level: 7,
    threshold: 6000,
    respins: 2,
    tilesPerLevel: 15,
    symbolCount: 7,
    obstacles: [
      { row: 0, col: 2, symbol: 'wall' },
      { row: 1, col: 5, symbol: 'wall' },
      { row: 2, col: 0, symbol: 'wall' },
      { row: 2, col: 7, symbol: 'wall' },
      { row: 3, col: 3, symbol: 'wall' },
      { row: 4, col: 4, symbol: 'wall' },
      { row: 5, col: 1, symbol: 'wall' },
      { row: 5, col: 6, symbol: 'wall' },
      { row: 6, col: 3, symbol: 'wall' },
      { row: 7, col: 5, symbol: 'wall' },
    ],
    entrySpotCount: 2,
    boardMask: null,
  },
  // Level 8 — L-shaped board (top-right quadrant cut), single entry
  {
    level: 8,
    threshold: 7000,
    respins: 2,
    tilesPerLevel: 15,
    symbolCount: 7,
    obstacles: [],
    entrySpotCount: 1,
    boardMask: (() => {
      const mask = Array.from({ length: 8 }, () => Array(8).fill(true) as boolean[]);
      // Block top-right quadrant: rows 0-3, cols 4-7
      for (let r = 0; r < 4; r++) {
        for (let c = 4; c < 8; c++) {
          mask[r][c] = false;
        }
      }
      return mask;
    })(),
  },
  // Level 9 — full board with 4 walls, tough threshold
  {
    level: 9,
    threshold: 8000,
    respins: 2,
    tilesPerLevel: 15,
    symbolCount: 7,
    obstacles: [
      { row: 2, col: 2, symbol: 'wall' },
      { row: 2, col: 5, symbol: 'wall' },
      { row: 5, col: 2, symbol: 'wall' },
      { row: 5, col: 5, symbol: 'wall' },
    ],
    entrySpotCount: 2,
    boardMask: null,
  },
  // Level 10 — final gauntlet: corners + center block, single entry
  {
    level: 10,
    threshold: 9500,
    respins: 2,
    tilesPerLevel: 15,
    symbolCount: 7,
    obstacles: [
      { row: 1, col: 1, symbol: 'wall' },
      { row: 1, col: 6, symbol: 'wall' },
      { row: 6, col: 1, symbol: 'wall' },
      { row: 6, col: 6, symbol: 'wall' },
      { row: 3, col: 3, symbol: 'wall' },
      { row: 3, col: 4, symbol: 'wall' },
      { row: 4, col: 3, symbol: 'wall' },
      { row: 4, col: 4, symbol: 'wall' },
    ],
    entrySpotCount: 1,
    boardMask: null,
  },
];

// =============================================================================
// SYMBOLS
// =============================================================================

type Symbol = 'cherry' | 'lemon' | 'bar' | 'bell' | 'seven';

const SYMBOLS: Symbol[] = ['cherry', 'lemon', 'bar', 'bell', 'seven'];

const SYMBOL_VALUES: Record<Symbol, number> = {
  cherry: 10,
  lemon: 20,
  bar: 40,
  bell: 80,
  seven: 150,
};

const SYMBOL_DISPLAY: Record<Symbol, string> = {
  cherry: '🍒',
  lemon: '🍋',
  bar: '🎰',
  bell: '🔔',
  seven: '7️⃣',
};

function getRandomSymbol(symbolCount: number = SYMBOLS.length): Symbol {
  const count = Math.min(symbolCount, SYMBOLS.length);
  return SYMBOLS[Math.floor(Math.random() * count)];
}

// =============================================================================
// TILES
// =============================================================================

interface Tile {
  id: string;
  symbolA: Symbol;
  symbolB: Symbol;
}

function generateTile(id: string, symbolCount: number = SYMBOLS.length): Tile {
  return { id, symbolA: getRandomSymbol(symbolCount), symbolB: getRandomSymbol(symbolCount) };
}

function generateTileQueue(tilesPerLevel: number = TILES_PER_LEVEL, symbolCount: number = SYMBOLS.length): Tile[] {
  return Array.from({ length: tilesPerLevel }, (_, i) =>
    generateTile(`tile-${i}`, symbolCount)
  );
}

// =============================================================================
// GRID UTILITIES
// =============================================================================

type Grid = (Symbol | null)[][];

function createEmptyGrid(): Grid {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

// =============================================================================
// FLOOD FILL / REACHABILITY UTILITIES
// =============================================================================

function computeReachableCells(grid: Grid, entrySpot: EntrySpot): Set<string> {
  const reachable = new Set<string>();
  const queue: [number, number][] = [];

  // Seed BFS from all entry cells that are empty
  for (const [r, c] of entrySpot.cells) {
    const key = `${r},${c}`;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && grid[r][c] === null && !reachable.has(key)) {
      reachable.add(key);
      queue.push([r, c]);
    }
  }

  // BFS through adjacent empty cells
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    for (const [dr, dc] of dirs) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
      const key = `${nr},${nc}`;
      if (grid[nr][nc] === null && !reachable.has(key)) {
        reachable.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  return reachable;
}

function isTilePlacementReachable(
  reachableSet: Set<string>,
  row: number,
  col: number,
  rotation: Rotation,
): boolean {
  const [rowOffset, colOffset] = getSecondCellOffset(rotation);
  const row2 = row + rowOffset;
  const col2 = col + colOffset;
  return reachableSet.has(`${row},${col}`) && reachableSet.has(`${row2},${col2}`);
}

function canPlaceTileWithEntry(
  grid: Grid,
  row: number,
  col: number,
  rotation: Rotation,
  reachableCells: Set<string> | null,
): boolean {
  if (!reachableCells) return false;
  if (!canPlaceTile(grid, row, col, rotation)) return false;
  return isTilePlacementReachable(reachableCells, row, col, rotation);
}

// Check if any entry spot has valid placements on the grid
function anyEntryHasValidPlacement(grid: Grid): boolean {
  for (const entry of ENTRY_SPOTS) {
    const reachable = computeReachableCells(grid, entry);
    if (reachable.size < 2) continue;
    // Check if any placement works in any rotation
    for (const cellKey of reachable) {
      const [r, c] = cellKey.split(',').map(Number);
      for (let rot = 0; rot < 4; rot++) {
        if (canPlaceTileWithEntry(grid, r, c, rot as Rotation, reachable)) {
          return true;
        }
      }
    }
  }
  return false;
}

// =============================================================================
// ROTATION UTILITIES
// =============================================================================

// Rotation: 0 = right (→), 1 = down (↓), 2 = left (←), 3 = up (↑)
type Rotation = 0 | 1 | 2 | 3;

// Get the offset for the second cell based on rotation
function getSecondCellOffset(rotation: Rotation): [number, number] {
  switch (rotation) {
    case 0: return [0, 1];   // right
    case 1: return [1, 0];   // down
    case 2: return [0, -1];  // left
    case 3: return [-1, 0];  // up
  }
}

// Get symbols for placement - always returns [A, B], direction handled by offset
function getSymbolsForRotation(tile: Tile): [Symbol, Symbol] {
  return [tile.symbolA, tile.symbolB];
}

// =============================================================================
// SCORING
// =============================================================================

interface Match {
  cells: [number, number][];
  symbol: Symbol;
  length: number;
  score: number;
}

function findMatches(grid: Grid): Match[] {
  const matches: Match[] = [];

  // Horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    let col = 0;
    while (col < BOARD_SIZE) {
      const symbol = grid[row][col];
      if (symbol === null) { col++; continue; }

      let length = 1;
      while (col + length < BOARD_SIZE && grid[row][col + length] === symbol) {
        length++;
      }

      if (length >= MIN_MATCH_LENGTH) {
        const cells: [number, number][] = [];
        for (let i = 0; i < length; i++) cells.push([row, col + i]);
        const score = SYMBOL_VALUES[symbol] * length * getLengthMultiplier(length);
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
      if (symbol === null) { row++; continue; }

      let length = 1;
      while (row + length < BOARD_SIZE && grid[row + length][col] === symbol) {
        length++;
      }

      if (length >= MIN_MATCH_LENGTH) {
        const cells: [number, number][] = [];
        for (let i = 0; i < length; i++) cells.push([row + i, col]);
        const score = SYMBOL_VALUES[symbol] * length * getLengthMultiplier(length);
        matches.push({ cells, symbol, length, score });
      }
      row += length;
    }
  }

  return matches;
}

function calculateScore(grid: Grid): { score: number; matches: Match[] } {
  const matches = findMatches(grid);
  const score = matches.reduce((sum, m) => sum + m.score, 0);
  return { score, matches };
}

function matchKey(m: Match): string {
  return m.cells.map(([r, c]) => `${r},${c}`).join('|');
}

// =============================================================================
// GAME STATE (ZUSTAND)
// =============================================================================

type GamePhase = 'placing' | 'respinning' | 'ended';
type GameResult = 'win' | 'lose' | null;
type PlacementMode = 'idle' | 'placed';

interface ScorePopup {
  id: string;
  score: number;
  row: number;
  col: number;
}

interface GameState {
  grid: Grid;
  tileQueue: Tile[];
  currentTile: Tile | null;
  rotation: Rotation;
  respinsRemaining: number;
  score: number;
  scoreBeforeRespins: number;
  phase: GamePhase;
  result: GameResult;
  placementMode: PlacementMode;
  placedPosition: { row: number; col: number } | null;
  holdReady: boolean;
  matchingCells: Set<string>;
  highlightColor: 'gold' | 'red' | 'blue';
  scorePopups: ScorePopup[];
  pendingPhase2: { cells: Set<string>; popups: ScorePopup[] } | null;
  entrySpots: EntrySpot[];
  selectedEntry: number | null;
  reachableCells: Set<string> | null;

  selectEntry: (index: number) => void;
  deselectEntry: () => void;
  startPlacement: (row: number, col: number) => void;
  movePlacement: (row: number, col: number) => void;
  rotatePlacedTile: () => void;
  confirmPlacement: () => void;
  cancelPlacement: () => void;
  setHoldReady: (ready: boolean) => void;
  triggerMatchAnimation: (matches: Match[], newCells: [number, number][]) => void;
  clearMatchAnimation: () => void;
  removeScorePopup: (id: string) => void;
  respinLine: (type: 'row' | 'col', index: number) => void;
  resetGame: () => void;
}

function canPlaceTile(
  grid: Grid,
  row: number,
  col: number,
  rotation: Rotation
): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
  if (grid[row][col] !== null) return false;

  const [rowOffset, colOffset] = getSecondCellOffset(rotation);
  const row2 = row + rowOffset;
  const col2 = col + colOffset;

  if (row2 < 0 || row2 >= BOARD_SIZE || col2 < 0 || col2 >= BOARD_SIZE) return false;
  if (grid[row2][col2] !== null) return false;

  return true;
}

function createInitialState() {
  const queue = generateTileQueue();
  return {
    grid: createEmptyGrid(),
    tileQueue: queue.slice(1),
    currentTile: queue[0] ?? null,
    rotation: 0 as Rotation,
    respinsRemaining: RESPINS_PER_LEVEL,
    score: 0,
    scoreBeforeRespins: 0,
    phase: 'placing' as GamePhase,
    result: null as GameResult,
    placementMode: 'idle' as PlacementMode,
    placedPosition: null as { row: number; col: number } | null,
    holdReady: false,
    matchingCells: new Set<string>(),
    highlightColor: 'gold' as 'gold' | 'red' | 'blue',
    scorePopups: [] as ScorePopup[],
    pendingPhase2: null as { cells: Set<string>; popups: ScorePopup[] } | null,
    entrySpots: ENTRY_SPOTS,
    selectedEntry: null as number | null,
    reachableCells: null as Set<string> | null,
  };
}

const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  selectEntry: (index: number) => {
    const { phase, grid } = get();
    if (phase !== 'placing') return;
    const entry = ENTRY_SPOTS[index];
    if (!entry) return;
    const reachable = computeReachableCells(grid, entry);
    set({
      selectedEntry: index,
      reachableCells: reachable,
      placementMode: 'idle',
      placedPosition: null,
      holdReady: false,
    });
  },

  deselectEntry: () => {
    set({
      selectedEntry: null,
      reachableCells: null,
      placementMode: 'idle',
      placedPosition: null,
      holdReady: false,
    });
  },

  startPlacement: (row: number, col: number) => {
    const { phase, currentTile, rotation, grid, reachableCells } = get();
    if (phase !== 'placing' || !currentTile) return;

    // Try current rotation first, then others
    let useRotation: Rotation | null = null;
    if (canPlaceTileWithEntry(grid, row, col, rotation, reachableCells)) {
      useRotation = rotation;
    } else {
      for (let i = 1; i <= 3; i++) {
        const tryRot = ((rotation + i) % 4) as Rotation;
        if (canPlaceTileWithEntry(grid, row, col, tryRot, reachableCells)) {
          useRotation = tryRot;
          break;
        }
      }
    }
    if (useRotation === null) return;

    set({
      placementMode: 'placed',
      placedPosition: { row, col },
      rotation: useRotation,
    });
  },

  movePlacement: (row: number, col: number) => {
    const { phase, currentTile, rotation, grid, placementMode, reachableCells } = get();
    if (phase !== 'placing' || !currentTile || placementMode !== 'placed') return;
    if (!canPlaceTileWithEntry(grid, row, col, rotation, reachableCells)) return;

    set({ placedPosition: { row, col } });
  },

  rotatePlacedTile: () => {
    const { placementMode, placedPosition, rotation, grid, reachableCells } = get();
    if (placementMode !== 'placed' || !placedPosition) return;

    // Try each rotation until we find a valid one
    for (let i = 1; i <= 4; i++) {
      const newRotation = ((rotation + i) % 4) as Rotation;
      if (canPlaceTileWithEntry(grid, placedPosition.row, placedPosition.col, newRotation, reachableCells)) {
        set({ rotation: newRotation });
        return;
      }
    }
  },

  confirmPlacement: () => {
    const { phase, currentTile, rotation, grid, tileQueue, placementMode, placedPosition, reachableCells } = get();
    if (phase !== 'placing' || !currentTile || placementMode !== 'placed' || !placedPosition) return;

    const { row, col } = placedPosition;
    if (!canPlaceTileWithEntry(grid, row, col, rotation, reachableCells)) return;

    const [rowOffset, colOffset] = getSecondCellOffset(rotation);
    const row2 = row + rowOffset;
    const col2 = col + colOffset;

    const [symbolFirst, symbolSecond] = getSymbolsForRotation(currentTile);

    const newGrid = cloneGrid(grid);
    newGrid[row][col] = symbolFirst;
    newGrid[row2][col2] = symbolSecond;

    const { score: newTotalScore, matches } = calculateScore(newGrid);

    const nextTile = tileQueue[0] ?? null;
    const newQueue = tileQueue.slice(1);
    const isComplete = nextTile === null;

    if (isComplete) {
      set({
        grid: newGrid,
        tileQueue: [],
        currentTile: null,
        score: newTotalScore,
        scoreBeforeRespins: newTotalScore,
        phase: 'respinning',
        placementMode: 'idle',
        placedPosition: null,
        holdReady: false,
        selectedEntry: null,
        reachableCells: null,
      });
    } else {
      // Check if any entry has valid placements on the new grid
      const stuck = !anyEntryHasValidPlacement(newGrid);
      if (stuck) {
        // Skip to respinning early
        set({
          grid: newGrid,
          tileQueue: newQueue,
          currentTile: nextTile,
          score: newTotalScore,
          scoreBeforeRespins: newTotalScore,
          phase: 'respinning',
          placementMode: 'idle',
          placedPosition: null,
          holdReady: false,
          selectedEntry: null,
          reachableCells: null,
        });
      } else {
        set({
          grid: newGrid,
          tileQueue: newQueue,
          currentTile: nextTile,
          score: newTotalScore,
          placementMode: 'idle',
          placedPosition: null,
          holdReady: false,
          selectedEntry: null,
          reachableCells: null,
        });
      }
    }

    // Trigger match animation for matches involving newly placed cells
    if (matches.length > 0) {
      const newCells: [number, number][] = [[row, col], [row2, col2]];
      get().triggerMatchAnimation(matches, newCells);
    }
  },

  cancelPlacement: () => {
    const { placementMode } = get();
    if (placementMode === 'placed') {
      // Cancel placement but keep entry selected
      set({
        placementMode: 'idle',
        placedPosition: null,
        holdReady: false,
      });
    } else {
      // In idle with entry selected — deselect entry
      set({
        selectedEntry: null,
        reachableCells: null,
        placementMode: 'idle',
        placedPosition: null,
        holdReady: false,
      });
    }
  },

  setHoldReady: (ready: boolean) => {
    set({ holdReady: ready });
  },

  triggerMatchAnimation: (matches: Match[], newCells: [number, number][]) => {
    const matchingCells = new Set<string>();
    const scorePopups: ScorePopup[] = [];
    const newCellKeys = new Set(newCells.map(([r, c]) => `${r},${c}`));

    // Only animate matches that include at least one new cell
    const relevantMatches = matches.filter(match =>
      match.cells.some(([r, c]) => newCellKeys.has(`${r},${c}`))
    );

    // Group scores by cell position so overlapping popups merge
    const popupMap = new Map<string, number>();

    relevantMatches.forEach((match) => {
      // Add all cells in matching combos to highlight set
      match.cells.forEach(([row, col]) => {
        matchingCells.add(`${row},${col}`);
      });

      // Accumulate score at center of match
      const centerIndex = Math.floor(match.cells.length / 2);
      const [centerRow, centerCol] = match.cells[centerIndex];
      const key = `${centerRow},${centerCol}`;
      popupMap.set(key, (popupMap.get(key) ?? 0) + match.score);
    });

    let popupIndex = 0;
    popupMap.forEach((totalScore, key) => {
      const [row, col] = key.split(',').map(Number);
      scorePopups.push({
        id: `popup-${Date.now()}-${popupIndex++}`,
        score: totalScore,
        row,
        col,
      });
    });

    if (matchingCells.size > 0) {
      set({ matchingCells, scorePopups });
    }
  },

  clearMatchAnimation: () => {
    const { pendingPhase2 } = get();
    if (pendingPhase2) {
      // Advance to phase 2
      set({
        matchingCells: pendingPhase2.cells,
        highlightColor: 'blue',
        scorePopups: pendingPhase2.popups,
        pendingPhase2: null,
      });
    } else {
      set({ matchingCells: new Set<string>(), highlightColor: 'gold' });
    }
  },

  removeScorePopup: (id: string) => {
    set(state => ({
      scorePopups: state.scorePopups.filter(p => p.id !== id),
    }));
  },

  respinLine: (type: 'row' | 'col', index: number) => {
    const { phase, respinsRemaining, grid, score, matchingCells } = get();
    if (phase !== 'respinning' || respinsRemaining <= 0) return;
    if (index < 0 || index >= BOARD_SIZE) return;
    if (matchingCells.size > 0) return; // Block respins during animation

    const matchesBefore = findMatches(grid);

    const newGrid = cloneGrid(grid);

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

    const newRespins = respinsRemaining - 1;
    const matchesAfter = findMatches(newGrid);
    const gridScore = matchesAfter.reduce((sum, m) => sum + m.score, 0);
    const newScore = Math.max(score, gridScore);

    // Diff matches: broken = before only, new = after only
    const beforeKeys = new Set(matchesBefore.map(matchKey));
    const afterKeys = new Set(matchesAfter.map(matchKey));
    const brokenMatches = matchesBefore.filter(m => !afterKeys.has(matchKey(m)));
    const newMatches = matchesAfter.filter(m => !beforeKeys.has(matchKey(m)));

    // Compute animation state inline so we can set everything atomically
    let animState: Partial<GameState> = {};
    if (brokenMatches.length > 0 || newMatches.length > 0) {
      // Build phase 2 data (blue highlight + positive popups)
      const phase2Cells = new Set<string>();
      const phase2PopupMap = new Map<string, number>();
      newMatches.forEach((match) => {
        match.cells.forEach(([r, c]) => phase2Cells.add(`${r},${c}`));
        const ci = Math.floor(match.cells.length / 2);
        const [cr, cc] = match.cells[ci];
        const key = `${cr},${cc}`;
        phase2PopupMap.set(key, (phase2PopupMap.get(key) ?? 0) + match.score);
      });
      let idx = 0;
      const phase2Popups: ScorePopup[] = [];
      phase2PopupMap.forEach((totalScore, key) => {
        const [r, c] = key.split(',').map(Number);
        phase2Popups.push({ id: `popup-p2-${Date.now()}-${idx++}`, score: totalScore, row: r, col: c });
      });

      if (brokenMatches.length === 0) {
        // No broken matches — skip to phase 2 directly
        animState = { matchingCells: phase2Cells, highlightColor: 'blue', scorePopups: phase2Popups, pendingPhase2: null };
      } else {
        // Build phase 1 data (red highlight + negative popups)
        const phase1Cells = new Set<string>();
        const phase1PopupMap = new Map<string, number>();
        brokenMatches.forEach((match) => {
          match.cells.forEach(([r, c]) => phase1Cells.add(`${r},${c}`));
          const ci = Math.floor(match.cells.length / 2);
          const [cr, cc] = match.cells[ci];
          const key = `${cr},${cc}`;
          phase1PopupMap.set(key, (phase1PopupMap.get(key) ?? 0) + match.score);
        });
        let idx1 = 0;
        const phase1Popups: ScorePopup[] = [];
        phase1PopupMap.forEach((totalScore, key) => {
          const [r, c] = key.split(',').map(Number);
          phase1Popups.push({ id: `popup-p1-${Date.now()}-${idx1++}`, score: -totalScore, row: r, col: c });
        });
        const pending = phase2Cells.size > 0 ? { cells: phase2Cells, popups: phase2Popups } : null;
        animState = { matchingCells: phase1Cells, highlightColor: 'red', scorePopups: phase1Popups, pendingPhase2: pending };
      }
    }

    // Single atomic set() — grid + score + animation state together
    if (newRespins === 0) {
      set({
        grid: newGrid,
        respinsRemaining: 0,
        score: newScore,
        phase: 'ended',
        result: newScore >= WIN_THRESHOLD ? 'win' : 'lose',
        ...animState,
      });
    } else {
      set({
        grid: newGrid,
        respinsRemaining: newRespins,
        score: newScore,
        ...animState,
      });
    }
  },

  resetGame: () => set(createInitialState()),
}));

// =============================================================================
// ANIMATED CELL COMPONENT
// =============================================================================

function AnimatedCell({
  symbol,
  isEmpty,
  isPreview,
  isPlaced,
  isHoldReady,
  isMatching,
  isReachable,
  isEntryCell,
  highlightColor,
  previewSymbol,
  onMatchAnimationComplete,
}: {
  symbol: Symbol | null;
  isEmpty: boolean;
  isPreview?: boolean;
  isPlaced?: boolean;
  isHoldReady?: boolean;
  isMatching?: boolean;
  isReachable?: boolean;
  isEntryCell?: 'down' | 'up' | 'left' | 'right' | null;
  highlightColor?: 'gold' | 'red' | 'blue';
  previewSymbol?: Symbol;
  onMatchAnimationComplete?: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const prevSymbol = useRef(symbol);
  const onCompleteRef = useRef(onMatchAnimationComplete);
  onCompleteRef.current = onMatchAnimationComplete;

  useEffect(() => {
    if (symbol !== prevSymbol.current) {
      prevSymbol.current = symbol;
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [symbol, scaleAnim]);

  // Blink animation when matching - runs once on mount if isMatching is true
  useEffect(() => {
    if (isMatching) {
      // Blink 3 times using opacity
      Animated.sequence([
        Animated.timing(highlightOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start(() => {
        onCompleteRef.current?.();
      });
    }
    // Only run on mount - component is re-keyed for each animation trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displaySymbol = isPreview ? previewSymbol : symbol;

  const ENTRY_ARROW: Record<string, string> = { down: '▼', up: '▲', left: '◀', right: '▶' };

  return (
    <Animated.View
      style={[
        styles.cell,
        !isEmpty && !isPreview && styles.filledCell,
        isPreview && !isPlaced && styles.previewCell,
        isPreview && isPlaced && !isHoldReady && styles.placedCell,
        isPreview && isPlaced && isHoldReady && styles.holdReadyCell,
        isEmpty && isReachable && !isPreview && styles.reachableCell,
        { transform: [{ scale: scaleAnim }], overflow: 'hidden' },
      ]}
    >
      {/* Highlight overlay */}
      <Animated.View
        style={[
          styles.highlightOverlay,
          { opacity: highlightOpacity, backgroundColor: highlightColor === 'red' ? '#ff4444' : highlightColor === 'blue' ? '#4488ff' : '#ffd700' },
        ]}
        pointerEvents="none"
      />
      {isEntryCell && isEmpty && !isPreview ? (
        <Text style={[styles.cellText, styles.cellTextAbove, styles.entryCellArrow]}>
          {ENTRY_ARROW[isEntryCell]}
        </Text>
      ) : (
        <Text style={[styles.cellText, styles.cellTextAbove, isPreview && !isPlaced && styles.previewCellText]}>
          {displaySymbol ? SYMBOL_DISPLAY[displaySymbol] : ''}
        </Text>
      )}
    </Animated.View>
  );
}

// =============================================================================
// SCORE POPUP COMPONENT
// =============================================================================

function ScorePopup({
  score,
  row,
  col,
  color,
  onComplete,
}: {
  score: number;
  row: number;
  col: number;
  color?: string;
  onComplete: () => void;
}) {
  const isNegative = score < 0;
  const driftTarget = isNegative ? 60 : -60;
  const displayText = isNegative ? `${score}` : `+${score}`;
  const textColor = color ?? (isNegative ? '#ff4444' : score > 0 ? '#44ff44' : '#ffd700');

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: driftTarget,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onCompleteRef.current();
    });
  }, [translateY, opacity, driftTarget]);

  // Position based on cell location
  const halfCell = Math.floor(CELL_SIZE / 2);
  const left = GRID_PADDING + col * CELL_TOTAL + halfCell;
  const top = GRID_PADDING + row * CELL_TOTAL;

  return (
    <Animated.View
      style={[
        styles.scorePopup,
        {
          left,
          top,
          transform: [{ translateY }, { translateX: -halfCell }],
          opacity,
        },
      ]}
    >
      <Text style={[styles.scorePopupText, { color: textColor }]}>{displayText}</Text>
    </Animated.View>
  );
}

// =============================================================================
// ENTRY SPOT BUTTON COMPONENT
// =============================================================================

function EntrySpotButton({
  entry,
  isSelected,
  isBlocked,
  onPress,
}: {
  entry: EntrySpot;
  isSelected: boolean;
  isBlocked: boolean;
  onPress: () => void;
}) {
  const arrow = entry.arrowDirection === 'down' ? '▼' : '▲';
  return (
    <Pressable
      style={[
        styles.entrySpotButton,
        isSelected && styles.entrySpotButtonSelected,
        isBlocked && styles.entrySpotButtonBlocked,
      ]}
      onPress={onPress}
      disabled={isBlocked}
    >
      <Text style={[
        styles.entrySpotButtonText,
        isBlocked && styles.entrySpotButtonTextBlocked,
      ]}>
        {arrow}
      </Text>
    </Pressable>
  );
}

// =============================================================================
// GESTURE GRID COMPONENT
// =============================================================================

// Responsive cell size: grid (8 cells) + respin buttons (1 cell) + padding must fit screen
const CELL_MARGIN = 1;
const GRID_PADDING = 4;
const _screenWidth = Dimensions.get('window').width;
// Total width = GRID_PADDING*2 + 9*(CELL_SIZE + CELL_MARGIN*2) + 4(gap) + 16(outer margin)
const CELL_SIZE = _screenWidth < 500
  ? Math.floor((_screenWidth - GRID_PADDING * 2 - 4 - 16) / 9 - CELL_MARGIN * 2)
  : 40;
const CELL_TOTAL = CELL_SIZE + CELL_MARGIN * 2;


function GestureGrid() {
  const {
    grid,
    currentTile,
    rotation,
    phase,
    placementMode,
    placedPosition,
    holdReady,
    matchingCells,
    highlightColor,
    scorePopups,
    selectedEntry,
    reachableCells,
    entrySpots,
    selectEntry,
    deselectEntry,
    startPlacement,
    movePlacement,
    rotatePlacedTile,
    confirmPlacement,
    cancelPlacement,
    setHoldReady,
    clearMatchAnimation,
    removeScorePopup,
  } = useGameStore();

  const [animationKey, setAnimationKey] = useState(0);

  // Keyboard controls (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const findFirstValidCell = (grid: Grid, reachable: Set<string> | null, entryIndex: number | null): { row: number; col: number } | null => {
      if (!reachable || entryIndex === null) return null;
      // Start searching from the selected entry's cells, spiral outward
      const entry = ENTRY_SPOTS[entryIndex];
      const [startRow, startCol] = entry.cells[0];
      for (let dist = 0; dist < BOARD_SIZE; dist++) {
        for (let row = startRow - dist; row <= startRow + dist; row++) {
          for (let col = startCol - dist; col <= startCol + dist; col++) {
            if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) continue;
            for (let rot = 0; rot < 4; rot++) {
              if (canPlaceTileWithEntry(grid, row, col, rot as Rotation, reachable)) return { row, col };
            }
          }
        }
      }
      return null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.phase !== 'placing' || !state.currentTile) return;

      // No entry selected: 1/2 keys select entry, all other keys ignored
      if (state.selectedEntry === null) {
        if (e.key === '1') {
          e.preventDefault();
          state.selectEntry(0);
        } else if (e.key === '2') {
          e.preventDefault();
          state.selectEntry(1);
        }
        return;
      }

      // Entry selected, idle mode
      if (state.placementMode === 'idle') {
        switch (e.key) {
          case '1':
            e.preventDefault();
            state.selectEntry(0);
            break;
          case '2':
            e.preventDefault();
            state.selectEntry(1);
            break;
          case 'Enter':
          case ' ':
            e.preventDefault();
            {
              const cell = findFirstValidCell(state.grid, state.reachableCells, state.selectedEntry);
              if (cell) state.startPlacement(cell.row, cell.col);
            }
            break;
          case 'Escape':
            e.preventDefault();
            state.deselectEntry();
            break;
        }
        return;
      }

      // Placed mode
      if (!state.placedPosition) return;
      const { row, col } = state.placedPosition;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (canPlaceTileWithEntry(state.grid, row - 1, col, state.rotation, state.reachableCells)) {
            state.movePlacement(row - 1, col);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (canPlaceTileWithEntry(state.grid, row + 1, col, state.rotation, state.reachableCells)) {
            state.movePlacement(row + 1, col);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (canPlaceTileWithEntry(state.grid, row, col - 1, state.rotation, state.reachableCells)) {
            state.movePlacement(row, col - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (canPlaceTileWithEntry(state.grid, row, col + 1, state.rotation, state.reachableCells)) {
            state.movePlacement(row, col + 1);
          }
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          state.rotatePlacedTile();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          state.confirmPlacement();
          break;
        case 'Escape':
          e.preventDefault();
          state.cancelPlacement();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  const animatingCellsRef = useRef(new Set<string>());

  const handleMatchAnimationComplete = useCallback((cellKey: string) => {
    animatingCellsRef.current.delete(cellKey);
    if (animatingCellsRef.current.size === 0) {
      clearMatchAnimation();
    }
  }, [clearMatchAnimation]);

  // Track animating cells when matchingCells changes
  useEffect(() => {
    if (matchingCells.size > 0) {
      animatingCellsRef.current = new Set(matchingCells);
      setAnimationKey(k => k + 1);
    }
  }, [matchingCells]);

  const getCellFromPosition = useCallback((x: number, y: number) => {
    const col = Math.floor((x - GRID_PADDING) / CELL_TOTAL);
    const row = Math.floor((y - GRID_PADDING) / CELL_TOTAL);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      return { row, col };
    }
    return null;
  }, []);

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      if (phase !== 'placing' || !currentTile) return;
      if (selectedEntry === null) return; // Must select entry first

      const cell = getCellFromPosition(event.x, event.y);
      if (!cell) return;

      if (placementMode === 'idle') {
        // First tap - place tile (startPlacement auto-rotates if needed)
        const anyRotFits = [0, 1, 2, 3].some(r =>
          canPlaceTileWithEntry(grid, cell.row, cell.col, r as Rotation, reachableCells)
        );
        if (anyRotFits) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          startPlacement(cell.row, cell.col);
        }
      } else if (placementMode === 'placed') {
        // Tap while placed - rotate
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        rotatePlacedTile();
      }
    });

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      if (phase !== 'placing' || placementMode !== 'placed') return;

      const cell = getCellFromPosition(event.x, event.y);
      if (cell && canPlaceTileWithEntry(grid, cell.row, cell.col, rotation, reachableCells)) {
        if (!placedPosition || placedPosition.row !== cell.row || placedPosition.col !== cell.col) {
          Haptics.selectionAsync();
          movePlacement(cell.row, cell.col);
        }
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      if (phase === 'placing' && placementMode === 'placed') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setHoldReady(true);
      }
    })
    .onEnd((event, success) => {
      if (success && phase === 'placing' && placementMode === 'placed') {
        confirmPlacement();
      }
      setHoldReady(false);
    })
    .onFinalize(() => {
      setHoldReady(false);
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, panGesture, tapGesture);

  const getPreviewInfo = (row: number, col: number): { isPreview: boolean; previewSymbol?: Symbol } => {
    if (!placedPosition || !currentTile || phase !== 'placing' || placementMode !== 'placed') {
      return { isPreview: false };
    }

    const [rowOffset, colOffset] = getSecondCellOffset(rotation);
    const [symbolFirst, symbolSecond] = getSymbolsForRotation(currentTile);

    if (row === placedPosition.row && col === placedPosition.col) {
      return { isPreview: true, previewSymbol: symbolFirst };
    }

    const row2 = placedPosition.row + rowOffset;
    const col2 = placedPosition.col + colOffset;

    if (row === row2 && col === col2) {
      return { isPreview: true, previewSymbol: symbolSecond };
    }

    return { isPreview: false };
  };

  // Build entry cell lookup: "row,col" -> arrowDirection
  const entryCellMap = new Map<string, 'down' | 'up' | 'left' | 'right'>();
  for (const entry of entrySpots) {
    for (const [r, c] of entry.cells) {
      entryCellMap.set(`${r},${c}`, entry.arrowDirection);
    }
  }

  // Check which entries are blocked (for button state)
  const entryBlocked = useMemo(() => entrySpots.map(entry => {
    const reachable = computeReachableCells(grid, entry);
    if (reachable.size < 2) return true;
    for (const cellKey of reachable) {
      const [r, c] = cellKey.split(',').map(Number);
      for (let rot = 0; rot < 4; rot++) {
        if (canPlaceTileWithEntry(grid, r, c, rot as Rotation, reachable)) return false;
      }
    }
    return true;
  }), [grid, entrySpots]);

  return (
    <View>
      {/* Top entry spot buttons */}
      {phase === 'placing' && currentTile && (
        <View style={styles.entrySpotRow}>
          {entrySpots
            .filter(e => e.arrowDirection === 'down')
            .map(entry => (
              <EntrySpotButton
                key={entry.id}
                entry={entry}
                isSelected={selectedEntry === entry.id}
                isBlocked={entryBlocked[entry.id]}
                onPress={() => selectEntry(entry.id)}
              />
            ))}
        </View>
      )}
      <GestureDetector gesture={composedGesture}>
        <View style={styles.grid}>
          {grid.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.row}>
              {row.map((cell, colIndex) => {
                const { isPreview, previewSymbol } = getPreviewInfo(rowIndex, colIndex);
                const cellKey = `${rowIndex},${colIndex}`;
                const isMatching = matchingCells.has(cellKey);
                const isReachable = reachableCells?.has(cellKey) ?? false;
                const entryCellDir = entryCellMap.get(cellKey) ?? null;
                return (
                  <AnimatedCell
                    key={`cell-${rowIndex}-${colIndex}-${animationKey}`}
                    symbol={cell}
                    isEmpty={cell === null}
                    isPreview={isPreview}
                    isPlaced={placementMode === 'placed'}
                    isHoldReady={holdReady}
                    isMatching={isMatching}
                    isReachable={isReachable}
                    isEntryCell={entryCellDir}
                    highlightColor={isMatching ? highlightColor : undefined}
                    previewSymbol={previewSymbol}
                    onMatchAnimationComplete={() => handleMatchAnimationComplete(cellKey)}
                  />
                );
              })}
            </View>
          ))}
        {/* Score popups */}
        {scorePopups.map(popup => (
          <ScorePopup
            key={popup.id}
            score={popup.score}
            row={popup.row}
            col={popup.col}
            color={highlightColor === 'gold' ? '#ffd700' : undefined}
            onComplete={() => removeScorePopup(popup.id)}
          />
        ))}
        </View>
      </GestureDetector>
      {/* Bottom entry spot buttons */}
      {phase === 'placing' && currentTile && (
        <View style={styles.entrySpotRow}>
          {entrySpots
            .filter(e => e.arrowDirection === 'up')
            .map(entry => (
              <EntrySpotButton
                key={entry.id}
                entry={entry}
                isSelected={selectedEntry === entry.id}
                isBlocked={entryBlocked[entry.id]}
                onPress={() => selectEntry(entry.id)}
              />
            ))}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// HELP PANEL COMPONENT
// =============================================================================

function HelpPanel() {
  return (
    <View style={styles.helpPanel}>
      <Text style={styles.helpHeading}>Goal</Text>
      <Text style={styles.helpBody}>
        Score {WIN_THRESHOLD}+ points by placing {TILES_PER_LEVEL} domino tiles on an 8x8 grid, then using {RESPINS_PER_LEVEL} respins to improve your matches.
      </Text>

      <Text style={styles.helpHeading}>Matching</Text>
      <Text style={styles.helpBody}>
        Line up 3+ identical symbols in a row or column. Longer matches score more:
      </Text>
      <Text style={styles.helpBody}>
        {'  '}3-in-a-row: x1 | 4: x2 | 5: x3 | 6+: x4
      </Text>

      <Text style={styles.helpHeading}>Symbol values</Text>
      <Text style={styles.helpBody}>
        🍒 10  🍋 20  🎰 40  🔔 80  7️⃣ 150
      </Text>

      <Text style={styles.helpHeading}>Scoring formula</Text>
      <Text style={styles.helpBody}>
        value x length x multiplier{'\n'}
        e.g. 4 bells = 80 x 4 x 2 = 640
      </Text>

      <Text style={styles.helpHeading}>Scoring</Text>
      <Text style={styles.helpBody}>
        Your score equals the total of all matches currently on the grid. It's recalculated after every move — not additive.
      </Text>

      <Text style={styles.helpHeading}>Entry Points</Text>
      <Text style={styles.helpBody}>
        Before placing each tile, choose an entry point (top or bottom arrows). You can only place tiles in empty cells reachable from that entry. Earlier placements may block paths, creating a spatial puzzle.
      </Text>

      <Text style={styles.helpHeading}>Respins</Text>
      <Text style={styles.helpBody}>
        After all tiles are placed, you get {RESPINS_PER_LEVEL} respins. Each respin re-randomizes every filled cell in a row or column. Respins can create new matches but also break existing ones. Your score is locked to the best total seen — it can never go down.
      </Text>
    </View>
  );
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

export default function App() {
  const {
    currentTile,
    tileQueue,
    respinsRemaining,
    score,
    phase,
    result,
    placementMode,
    selectedEntry,
    respinLine,
    resetGame,
  } = useGameStore();

  const tilesRemaining = tileQueue.length + (currentTile ? 1 : 0);
  const [showHelp, setShowHelp] = useState(false);

  // Respin keyboard cursor (web only)
  const [respinCursor, setRespinCursor] = useState<{ type: 'row' | 'col'; index: number }>({ type: 'row', index: 0 });
  const respinCursorRef = useRef(respinCursor);
  respinCursorRef.current = respinCursor;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleRespinKey = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.phase !== 'respinning') return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setRespinCursor(c => c.type === 'row'
            ? { type: 'row', index: (c.index - 1 + BOARD_SIZE) % BOARD_SIZE }
            : { type: 'col', index: c.index });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setRespinCursor(c => c.type === 'row'
            ? { type: 'row', index: (c.index + 1) % BOARD_SIZE }
            : { type: 'col', index: c.index });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setRespinCursor(c => c.type === 'col'
            ? { type: 'col', index: (c.index - 1 + BOARD_SIZE) % BOARD_SIZE }
            : { type: 'col', index: 0 });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setRespinCursor(c => c.type === 'col'
            ? { type: 'col', index: (c.index + 1) % BOARD_SIZE }
            : { type: 'col', index: 0 });
          break;
        case 'Tab':
          e.preventDefault();
          setRespinCursor(c => c.type === 'row'
            ? { type: 'col', index: c.index < BOARD_SIZE ? c.index : 0 }
            : { type: 'row', index: c.index < BOARD_SIZE ? c.index : 0 });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          state.respinLine(respinCursorRef.current.type, respinCursorRef.current.index);
          break;
      }
    };

    document.addEventListener('keydown', handleRespinKey);
    return () => document.removeEventListener('keydown', handleRespinKey);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Slot Dominoes</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>Score: {score}</Text>
            <Text style={styles.goalText}>Goal: {WIN_THRESHOLD}</Text>
          </View>
        </View>

        <View style={Platform.OS === 'web' && _screenWidth >= 700 ? styles.mainRow : undefined}>
          {/* Left column: grid + controls */}
          <View style={Platform.OS === 'web' && _screenWidth >= 700 ? styles.mainColumn : undefined}>
            {/* Grid */}
            <View style={styles.gridContainer}>
              <View style={styles.gridWithRows}>
                <View>
                  {/* Column respin buttons */}
                  {phase === 'respinning' && (
                    <View style={styles.colButtons}>
                      {Array.from({ length: BOARD_SIZE }).map((_, col) => (
                        <Pressable
                          key={`col-${col}`}
                          style={[
                            styles.respinButton,
                            respinCursor.type === 'col' && respinCursor.index === col && styles.respinButtonSelected,
                          ]}
                          onPress={() => respinLine('col', col)}
                        >
                          <Text style={styles.respinButtonText}>v</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <GestureGrid />
                </View>

                {/* Row respin buttons */}
                {phase === 'respinning' && (
                  <View style={styles.rowButtons}>
                    {Array.from({ length: BOARD_SIZE }).map((_, row) => (
                      <Pressable
                        key={`row-btn-${row}`}
                        style={[
                          styles.respinButton,
                          respinCursor.type === 'row' && respinCursor.index === row && styles.respinButtonSelected,
                        ]}
                        onPress={() => respinLine('row', row)}
                      >
                        <Text style={styles.respinButtonText}>{'>'}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Confirm / Cancel buttons when tile is placed */}
              {phase === 'placing' && placementMode === 'placed' && (
                <View style={styles.placementButtons}>
                  <Pressable style={styles.confirmButton} onPress={useGameStore.getState().confirmPlacement}>
                    <Text style={styles.buttonText}>Confirm</Text>
                  </Pressable>
                  <Pressable style={styles.cancelButton} onPress={useGameStore.getState().cancelPlacement}>
                    <Text style={styles.buttonText}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              {phase === 'placing' && currentTile && (
                <>
                  {placementMode === 'idle' && (
                    <View style={styles.tilePreview}>
                      <Text style={styles.previewLabel}>Current tile:</Text>
                      <View style={styles.tilePreviewBox}>
                        <Text style={styles.previewSymbol}>
                          {SYMBOL_DISPLAY[currentTile.symbolA]}
                        </Text>
                        <Text style={styles.previewSymbol}>
                          {SYMBOL_DISPLAY[currentTile.symbolB]}
                        </Text>
                      </View>
                    </View>
                  )}
                  {placementMode === 'placed' && tileQueue.length > 0 && (
                    <View style={styles.tilePreview}>
                      <Text style={styles.previewLabel}>Next tile:</Text>
                      <View style={styles.tilePreviewBox}>
                        <Text style={styles.previewSymbol}>
                          {SYMBOL_DISPLAY[tileQueue[0].symbolA]}
                        </Text>
                        <Text style={styles.previewSymbol}>
                          {SYMBOL_DISPLAY[tileQueue[0].symbolB]}
                        </Text>
                      </View>
                    </View>
                  )}
                  <Text style={styles.infoText}>Tiles left: {tilesRemaining}</Text>
                  {placementMode === 'idle' && selectedEntry === null && (
                    <Text style={styles.hintText}>
                      {Platform.OS === 'web'
                        ? 'Press 1 or 2 to select an entry point'
                        : 'Tap an entry point arrow'}
                    </Text>
                  )}
                  {placementMode === 'idle' && selectedEntry !== null && (
                    <Text style={styles.hintText}>
                      {Platform.OS === 'web'
                        ? 'Click highlighted area to place tile | Esc: change entry'
                        : 'Tap highlighted area to place tile'}
                    </Text>
                  )}
                  {placementMode === 'placed' && (
                    <Text style={styles.hintText}>
                      {Platform.OS === 'web'
                        ? 'Arrows: move | R: rotate | Enter: confirm | Esc: cancel'
                        : 'Tap to rotate | Drag to move | Hold to confirm'}
                    </Text>
                  )}
                </>
              )}

              {phase === 'respinning' && (
                <Text style={styles.infoText}>
                  {Platform.OS === 'web'
                    ? `Respins: ${respinsRemaining} | Arrows: select | Tab: row/col | Enter: pull`
                    : `Respins: ${respinsRemaining} | Tap row/column arrows to respin`}
                </Text>
              )}

              {phase === 'ended' && (
                <View style={styles.endScreen}>
                  <Text
                    style={[
                      styles.resultText,
                      result === 'win' ? styles.winText : styles.loseText,
                    ]}
                  >
                    {result === 'win' ? 'You Win!' : 'Game Over'}
                  </Text>
                  <Text style={styles.finalScore}>Final Score: {score}</Text>
                  <Pressable style={styles.restartButton} onPress={resetGame}>
                    <Text style={styles.buttonText}>Play Again</Text>
                  </Pressable>
                </View>
              )}

              {/* Help toggle (mobile only — on web the panel is always visible to the right) */}
              {(Platform.OS !== 'web' || _screenWidth < 700) && (
                <>
                  <Pressable onPress={() => setShowHelp(h => !h)} style={styles.helpToggle}>
                    <Text style={styles.helpToggleText}>{showHelp ? 'Hide rules' : 'How to play'}</Text>
                  </Pressable>
                  {showHelp && <HelpPanel />}
                </>
              )}
            </View>
          </View>

          {/* Right column: rules panel (web only, always visible) */}
          {Platform.OS === 'web' && _screenWidth >= 700 && <HelpPanel />}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
    gap: 24,
  },
  mainColumn: {
    alignItems: 'center',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 8 : 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 24,
  },
  scoreText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  goalText: {
    fontSize: 18,
    color: '#888',
  },
  gridContainer: {
    alignItems: 'center',
    padding: 8,
  },
  colButtons: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: GRID_PADDING,
  },
  gridWithRows: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: GRID_PADDING,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#3d3d5c',
    margin: CELL_MARGIN,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledCell: {
    backgroundColor: '#4a4a70',
  },
  previewCell: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffd700',
    borderStyle: 'dashed',
  },
  placedCell: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  holdReadyCell: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffd700',
    borderRadius: 4,
    zIndex: 1,
  },
  scorePopup: {
    position: 'absolute',
    zIndex: 100,
  },
  scorePopupText: {
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cellText: {
    fontSize: CELL_SIZE < 36 ? 16 : 20,
  },
  cellTextAbove: {
    zIndex: 2,
  },
  previewCellText: {
    opacity: 0.6,
  },
  rowButtons: {
    marginLeft: 4,
    alignSelf: 'flex-end',
  },
  respinButton: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#ff6b6b',
    margin: CELL_MARGIN,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  respinButtonSelected: {
    backgroundColor: '#ff3b3b',
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  respinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controls: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  tilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 16,
    color: '#888',
  },
  tilePreviewBox: {
    flexDirection: 'row',
    backgroundColor: '#4a4a70',
    borderRadius: 6,
    padding: 8,
    gap: 4,
  },
  tilePreviewBoxVertical: {
    flexDirection: 'column',
  },
  previewSymbol: {
    fontSize: 28,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#ffd700',
    marginTop: 4,
  },
  endScreen: {
    alignItems: 'center',
    gap: 16,
  },
  resultText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  winText: {
    color: '#4caf50',
  },
  loseText: {
    color: '#f44336',
  },
  finalScore: {
    fontSize: 24,
    color: '#fff',
  },
  restartButton: {
    backgroundColor: '#5c6bc0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  placementButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  confirmButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#666',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  helpToggle: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#555',
  },
  helpToggleText: {
    color: '#aaa',
    fontSize: 13,
  },
  helpPanel: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    width: 260,
  },
  helpHeading: {
    color: '#ffd700',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 2,
  },
  helpBody: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
  },
  entrySpotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  entrySpotButton: {
    width: CELL_SIZE * 2 + CELL_MARGIN * 4,
    height: CELL_SIZE,
    backgroundColor: '#5c6bc0',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrySpotButtonSelected: {
    backgroundColor: '#ffc107',
  },
  entrySpotButtonBlocked: {
    backgroundColor: '#3d3d5c',
    opacity: 0.4,
  },
  entrySpotButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  entrySpotButtonTextBlocked: {
    color: '#666',
  },
  reachableCell: {
    borderWidth: 1,
    borderColor: 'rgba(92, 107, 192, 0.6)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(92, 107, 192, 0.15)',
  },
  entryCellArrow: {
    fontSize: CELL_SIZE < 36 ? 10 : 12,
    color: '#5c6bc0',
    opacity: 0.7,
  },
});
