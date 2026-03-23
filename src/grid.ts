// src/grid.ts
import type { Grid, Rotation, Symbol, LevelConfig, EntrySpot, Tile } from './types';
import { BOARD_SIZE } from './constants';

export function createEmptyGrid(): Grid {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

export function createGridFromConfig(config: LevelConfig): Grid {
  const grid = createEmptyGrid();

  // Apply board mask
  if (config.boardMask) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!config.boardMask[r][c]) {
          grid[r][c] = 'wall';
        }
      }
    }
  }

  // Place obstacles
  for (const obs of config.obstacles) {
    if (obs.symbol === 'wall') {
      grid[obs.row][obs.col] = 'wall';
    } else {
      grid[obs.row][obs.col] = obs.symbol;
    }
  }

  return grid;
}

// Get the offset for the second cell based on rotation
// Rotation: 0 = right (→), 1 = down (↓), 2 = left (←), 3 = up (↑)
export function getSecondCellOffset(rotation: Rotation): [number, number] {
  switch (rotation) {
    case 0: return [0, 1];   // right
    case 1: return [1, 0];   // down
    case 2: return [0, -1];  // left
    case 3: return [-1, 0];  // up
  }
}

// Get symbols for placement - always returns [A, B], direction handled by offset
export function getSymbolsForRotation(tile: Tile): [Symbol, Symbol] {
  return [tile.symbolA, tile.symbolB];
}

export function canPlaceTile(
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

export function computeReachableCells(grid: Grid, entrySpot: EntrySpot): Set<string> {
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

export function isTilePlacementReachable(
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

export function canPlaceTileWithEntry(
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
export function anyEntryHasValidPlacement(grid: Grid, entrySpots: EntrySpot[]): boolean {
  for (const entry of entrySpots) {
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

/**
 * Return all empty (null) cells on the grid as a Set of "row,col" keys.
 */
export function allEmptyCells(grid: Grid, boardSize: number = BOARD_SIZE): Set<string> {
  const cells = new Set<string>();
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (grid[r][c] === null) cells.add(`${r},${c}`);
    }
  }
  return cells;
}

/**
 * Find all unlocked, filled cells connected to newly locked cells via BFS.
 * Floods through all adjacent unlocked filled cells, not just immediate neighbors.
 */
export function findUnlockedNeighbors(
  grid: Grid,
  newlyLockedCells: Set<string>,
  allLockedCells: Set<string>,
  boardSize: number = BOARD_SIZE,
): Set<string> {
  const connected = new Set<string>();
  const queue: [number, number][] = [];
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // Seed BFS from immediate neighbors of newly locked cells
  for (const cellKey of newlyLockedCells) {
    const [r, c] = cellKey.split(',').map(Number);
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) continue;
      const key = `${nr},${nc}`;
      if (allLockedCells.has(key)) continue;
      if (connected.has(key)) continue;
      const cell = grid[nr][nc];
      if (cell !== null && cell !== 'wall') {
        connected.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  // BFS: flood through all connected unlocked filled cells
  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    for (const [dr, dc] of dirs) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) continue;
      const key = `${nr},${nc}`;
      if (allLockedCells.has(key)) continue;
      if (connected.has(key)) continue;
      const cell = grid[nr][nc];
      if (cell !== null && cell !== 'wall') {
        connected.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  return connected;
}
