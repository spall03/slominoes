#!/usr/bin/env npx tsx
// Slominoes Simulation Tool
// Run: npx tsx simulate.ts
// Simulates thousands of games to report win rates and score distributions per level.

// =============================================================================
// GAME CONSTANTS (extracted from App.tsx)
// =============================================================================

const BOARD_SIZE = 8;
const TILES_PER_LEVEL = 16;
const RESPINS_PER_LEVEL = 5;
const MIN_MATCH_LENGTH = 3;

const WALL_SCALAR = 1.5;
const SCORE_COEFFICIENT = 30;
const LEVEL_SCALAR_MAX = 2.2;
const NUM_LEVELS = 10;

const LENGTH_MULTIPLIERS: Record<number, number> = { 3: 1, 4: 2, 5: 3 };
const MAX_LENGTH_MULTIPLIER = 4;

function getLengthMultiplier(length: number): number {
  if (length < MIN_MATCH_LENGTH) return 0;
  if (length >= 6) return MAX_LENGTH_MULTIPLIER;
  return LENGTH_MULTIPLIERS[length] ?? MAX_LENGTH_MULTIPLIER;
}

// =============================================================================
// SYMBOLS
// =============================================================================

type Symbol = 'cherry' | 'lemon' | 'bar' | 'bell' | 'seven' | 'wall';

const SYMBOLS: Symbol[] = ['cherry', 'lemon', 'bar', 'bell', 'seven'];

const SYMBOL_VALUES: Record<Symbol, number> = {
  cherry: 10, lemon: 20, bar: 40, bell: 80, seven: 150, wall: 0,
};

const SYMBOL_WEIGHTS: number[] = [5, 4, 3, 2, 1];

function getRandomSymbol(symbolCount: number = SYMBOLS.length): Symbol {
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

// =============================================================================
// TILES
// =============================================================================

interface Tile {
  symbolA: Symbol;
  symbolB: Symbol;
}

function generateTile(symbolCount: number): Tile {
  return { symbolA: getRandomSymbol(symbolCount), symbolB: getRandomSymbol(symbolCount) };
}

function generateTileQueue(count: number, symbolCount: number): Tile[] {
  return Array.from({ length: count }, () => generateTile(symbolCount));
}

// =============================================================================
// GRID
// =============================================================================

type Grid = (Symbol | null)[][];

function createEmptyGrid(): Grid {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

interface ObstacleCell { row: number; col: number; symbol: Symbol | 'wall'; }

interface LevelConfig {
  level: number;
  threshold: number;
  respins: number;
  tilesPerLevel: number;
  symbolCount: number;
  obstacles: ObstacleCell[];
  entrySpotCount: number;
}

function generateLevelConfig(level: number): LevelConfig {
  const wallCount = Math.floor(level * WALL_SCALAR);
  const entryCells = new Set(['0,3', '0,4', '7,3', '7,4']);
  const obstacles: ObstacleCell[] = [];
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
    level, threshold, respins: RESPINS_PER_LEVEL, tilesPerLevel: TILES_PER_LEVEL,
    symbolCount: 5, obstacles, entrySpotCount: 2,
  };
}

function createGridFromConfig(config: LevelConfig): Grid {
  const grid = createEmptyGrid();
  for (const obs of config.obstacles) {
    grid[obs.row][obs.col] = obs.symbol as Symbol;
  }
  return grid;
}

// =============================================================================
// ENTRY SPOTS & REACHABILITY
// =============================================================================

interface EntrySpot {
  id: number;
  cells: [number, number][];
}

function getEntrySpots(count: number): EntrySpot[] {
  const all: EntrySpot[] = [
    { id: 0, cells: [[0, 3], [0, 4]] },
    { id: 1, cells: [[7, 3], [7, 4]] },
    { id: 2, cells: [[3, 0], [4, 0]] },
    { id: 3, cells: [[3, 7], [4, 7]] },
  ];
  if (count <= 1) return [all[0]];
  if (count === 2) return [all[0], all[1]];
  return all;
}

function computeReachableCells(grid: Grid, entrySpot: EntrySpot): Set<string> {
  const reachable = new Set<string>();
  const queue: [number, number][] = [];

  for (const [r, c] of entrySpot.cells) {
    const key = `${r},${c}`;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && grid[r][c] === null && !reachable.has(key)) {
      reachable.add(key);
      queue.push([r, c]);
    }
  }

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

// =============================================================================
// PLACEMENT
// =============================================================================

type Rotation = 0 | 1 | 2 | 3;

function getSecondCellOffset(rotation: Rotation): [number, number] {
  switch (rotation) {
    case 0: return [0, 1];
    case 1: return [1, 0];
    case 2: return [0, -1];
    case 3: return [-1, 0];
  }
}

function canPlaceTile(grid: Grid, row: number, col: number, rotation: Rotation): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
  if (grid[row][col] !== null) return false;
  const [ro, co] = getSecondCellOffset(rotation);
  const r2 = row + ro, c2 = col + co;
  if (r2 < 0 || r2 >= BOARD_SIZE || c2 < 0 || c2 >= BOARD_SIZE) return false;
  if (grid[r2][c2] !== null) return false;
  return true;
}

function canPlaceTileWithEntry(grid: Grid, row: number, col: number, rotation: Rotation, reachable: Set<string>): boolean {
  if (!canPlaceTile(grid, row, col, rotation)) return false;
  const [ro, co] = getSecondCellOffset(rotation);
  return reachable.has(`${row},${col}`) && reachable.has(`${row + ro},${col + co}`);
}

interface Placement {
  row: number;
  col: number;
  rotation: Rotation;
  entryIndex: number;
}

function findAllValidPlacements(grid: Grid, entrySpots: EntrySpot[]): Placement[] {
  const placements: Placement[] = [];
  for (let ei = 0; ei < entrySpots.length; ei++) {
    const reachable = computeReachableCells(grid, entrySpots[ei]);
    for (const cellKey of reachable) {
      const [r, c] = cellKey.split(',').map(Number);
      for (let rot = 0; rot < 4; rot++) {
        if (canPlaceTileWithEntry(grid, r, c, rot as Rotation, reachable)) {
          placements.push({ row: r, col: c, rotation: rot as Rotation, entryIndex: ei });
        }
      }
    }
  }
  return placements;
}

function placeTile(grid: Grid, tile: Tile, placement: Placement): Grid {
  const newGrid = cloneGrid(grid);
  const [ro, co] = getSecondCellOffset(placement.rotation);
  newGrid[placement.row][placement.col] = tile.symbolA;
  newGrid[placement.row + ro][placement.col + co] = tile.symbolB;
  return newGrid;
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

  for (let row = 0; row < BOARD_SIZE; row++) {
    let col = 0;
    while (col < BOARD_SIZE) {
      const symbol = grid[row][col];
      if (symbol === null || symbol === 'wall') { col++; continue; }
      let length = 1;
      while (col + length < BOARD_SIZE && grid[row][col + length] === symbol) length++;
      if (length >= MIN_MATCH_LENGTH) {
        const cells: [number, number][] = [];
        for (let i = 0; i < length; i++) cells.push([row, col + i]);
        const score = SYMBOL_VALUES[symbol] * length * getLengthMultiplier(length);
        matches.push({ cells, symbol, length, score });
      }
      col += length;
    }
  }

  for (let col = 0; col < BOARD_SIZE; col++) {
    let row = 0;
    while (row < BOARD_SIZE) {
      const symbol = grid[row][col];
      if (symbol === null || symbol === 'wall') { row++; continue; }
      let length = 1;
      while (row + length < BOARD_SIZE && grid[row + length][col] === symbol) length++;
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

function calculateScore(grid: Grid): number {
  return findMatches(grid).reduce((sum, m) => sum + m.score, 0);
}

// =============================================================================
// RESPIN
// =============================================================================

function respinRow(grid: Grid, rowIndex: number, symbolCount: number): Grid {
  const newGrid = cloneGrid(grid);
  for (let col = 0; col < BOARD_SIZE; col++) {
    if (newGrid[rowIndex][col] !== null && newGrid[rowIndex][col] !== 'wall') {
      newGrid[rowIndex][col] = getRandomSymbol(symbolCount);
    }
  }
  return newGrid;
}

function respinCol(grid: Grid, colIndex: number, symbolCount: number): Grid {
  const newGrid = cloneGrid(grid);
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (newGrid[row][colIndex] !== null && newGrid[row][colIndex] !== 'wall') {
      newGrid[row][colIndex] = getRandomSymbol(symbolCount);
    }
  }
  return newGrid;
}

// =============================================================================
// SIMULATION STRATEGIES
// =============================================================================

type Strategy = 'random' | 'chain-builder' | 'no-respins';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Score a placement by how well it builds toward chains.
// For each symbol placed, count adjacent cells with the same symbol.
// Also count how many cells in the same row/col already have that symbol (run-building).
function adjacencyScore(grid: Grid, tile: Tile, placement: Placement): number {
  const [ro, co] = getSecondCellOffset(placement.rotation);
  const r1 = placement.row, c1 = placement.col;
  const r2 = r1 + ro, c2 = c1 + co;
  const symbols: [Symbol, number, number][] = [[tile.symbolA, r1, c1], [tile.symbolB, r2, c2]];

  let score = 0;
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [sym, r, c] of symbols) {
    // Direct adjacency bonus (strongest signal)
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
      if (grid[nr][nc] === sym) score += 10;
    }

    // Row run: count same-symbol cells in this row (building horizontal chains)
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (col === c) continue;
      if (grid[r][col] === sym) score += 2;
    }

    // Col run: count same-symbol cells in this column (building vertical chains)
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (row === r) continue;
      if (grid[row][c] === sym) score += 2;
    }

    // Bonus for higher-value symbols (worth building chains of)
    score += SYMBOL_VALUES[sym] / 20;
  }

  // Also add actual match score if this creates one
  const testGrid = cloneGrid(grid);
  testGrid[r1][c1] = tile.symbolA;
  testGrid[r2][c2] = tile.symbolB;
  score += calculateScore(testGrid) * 2;

  return score;
}

function simulateGame(config: LevelConfig, strategy: Strategy): { score: number; won: boolean; respinsUsed: number; scoreBeforeRespins: number } {
  let grid = createGridFromConfig(config);
  const entrySpots = getEntrySpots(config.entrySpotCount);
  const tiles = generateTileQueue(config.tilesPerLevel, config.symbolCount);
  let respinsRemaining = config.respins;
  let respinsUsed = 0;

  // Place all tiles first
  for (let tileIdx = 0; tileIdx < tiles.length; tileIdx++) {
    const tile = tiles[tileIdx];
    const placements = findAllValidPlacements(grid, entrySpots);

    if (placements.length === 0) break; // stuck

    if (strategy === 'random') {
      grid = placeTile(grid, tile, pickRandom(placements));
    } else {
      // Chain-builder: pick placement that maximizes adjacency + chain potential
      let bestScore = -Infinity;
      let bestPlacement = placements[0];
      for (const p of placements) {
        const s = adjacencyScore(grid, tile, p);
        if (s > bestScore) {
          bestScore = s;
          bestPlacement = p;
        }
      }
      grid = placeTile(grid, tile, bestPlacement);
    }
  }

  const scoreBeforeRespins = calculateScore(grid);

  // Use respins after all tiles placed (unless no-respins strategy)
  if (strategy !== 'no-respins') {
    while (respinsRemaining > 0) {
      grid = performRespin(grid, config.symbolCount, strategy);
      respinsRemaining--;
      respinsUsed++;
    }
  }

  const finalScore = calculateScore(grid);
  return { score: finalScore, won: finalScore >= config.threshold, respinsUsed, scoreBeforeRespins };
}

function performRespin(grid: Grid, symbolCount: number, strategy: Strategy): Grid {
  if (strategy === 'random') {
    const isRow = Math.random() < 0.5;
    const index = Math.floor(Math.random() * BOARD_SIZE);
    return isRow ? respinRow(grid, index, symbolCount) : respinCol(grid, index, symbolCount);
  }

  // Smart: try all rows and cols, sample each multiple times, pick best outcome
  let bestGrid = grid;
  let bestScore = calculateScore(grid);
  const SAMPLES = 10;

  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let s = 0; s < SAMPLES; s++) {
      const rowCandidate = respinRow(grid, i, symbolCount);
      const rowScore = calculateScore(rowCandidate);
      if (rowScore > bestScore) { bestScore = rowScore; bestGrid = rowCandidate; }

      const colCandidate = respinCol(grid, i, symbolCount);
      const colScore = calculateScore(colCandidate);
      if (colScore > bestScore) { bestScore = colScore; bestGrid = colCandidate; }
    }
  }

  return bestGrid;
}

// =============================================================================
// RUNNER
// =============================================================================

interface LevelStats {
  level: number;
  threshold: number;
  winRate: number;
  meanScore: number;
  medianScore: number;
  maxScore: number;
  minScore: number;
  pctOfThreshold: number;
  meanRespinsUsed: number;
  meanPreRespinScore: number;
}

function runSimulation(strategy: Strategy, gamesPerLevel: number): LevelStats[] {
  const results: LevelStats[] = [];

  for (let level = 1; level <= NUM_LEVELS; level++) {
    const scores: number[] = [];
    const preRespinScores: number[] = [];
    let wins = 0;
    let totalRespins = 0;

    for (let g = 0; g < gamesPerLevel; g++) {
      const config = generateLevelConfig(level);
      const result = simulateGame(config, strategy);
      scores.push(result.score);
      preRespinScores.push(result.scoreBeforeRespins);
      if (result.won) wins++;
      totalRespins += result.respinsUsed;
    }

    scores.sort((a, b) => a - b);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const median = scores[Math.floor(scores.length / 2)];
    const meanPreRespin = preRespinScores.reduce((a, b) => a + b, 0) / preRespinScores.length;

    // Use a representative threshold (generate one config to get it)
    const sampleConfig = generateLevelConfig(level);

    results.push({
      level,
      threshold: sampleConfig.threshold,
      winRate: (wins / gamesPerLevel) * 100,
      meanScore: Math.round(mean),
      medianScore: median,
      maxScore: scores[scores.length - 1],
      minScore: scores[0],
      pctOfThreshold: Math.round((mean / sampleConfig.threshold) * 100),
      meanRespinsUsed: Math.round((totalRespins / gamesPerLevel) * 10) / 10,
      meanPreRespinScore: Math.round(meanPreRespin),
    });
  }

  return results;
}

function printResults(strategy: string, stats: LevelStats[]) {
  console.log(`\n${'='.repeat(90)}`);
  console.log(`Strategy: ${strategy.toUpperCase()}`);
  console.log(`${'='.repeat(90)}`);
  console.log(
    'Lvl'.padStart(3),
    'Thresh'.padStart(7),
    'Win%'.padStart(6),
    'Mean'.padStart(7),
    'Median'.padStart(7),
    'Max'.padStart(7),
    'PreRsp'.padStart(7),
    '%Thresh'.padStart(8),
    'Respins'.padStart(8),
  );
  console.log('-'.repeat(90));

  for (const s of stats) {
    console.log(
      String(s.level).padStart(3),
      String(s.threshold).padStart(7),
      s.winRate.toFixed(1).padStart(6),
      String(s.meanScore).padStart(7),
      String(s.medianScore).padStart(7),
      String(s.maxScore).padStart(7),
      String(s.meanPreRespinScore).padStart(7),
      `${s.pctOfThreshold}%`.padStart(8),
      String(s.meanRespinsUsed).padStart(8),
    );
  }
}

// =============================================================================
// MAIN
// =============================================================================

const GAMES_PER_LEVEL = 2000;

console.log(`Slominoes Simulation — ${GAMES_PER_LEVEL} games per level per strategy`);
console.log(`Config: WALL_SCALAR=${WALL_SCALAR}, SCORE_COEFFICIENT=${SCORE_COEFFICIENT}, LEVEL_SCALAR_MAX=${LEVEL_SCALAR_MAX}`);
console.log(`Tiles: ${TILES_PER_LEVEL}, Respins: ${RESPINS_PER_LEVEL}, Symbols: 5`);

const strategies: Strategy[] = ['random', 'chain-builder', 'no-respins'];

for (const strategy of strategies) {
  const stats = runSimulation(strategy, GAMES_PER_LEVEL);
  printResults(strategy, stats);
}

console.log('\n');
