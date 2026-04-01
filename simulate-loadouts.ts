#!/usr/bin/env npx tsx
// Slominoes Loadout Simulator
// Run: npx tsx simulate-loadouts.ts
//
// Stress-tests symbol loadout combinations using a greedy bot.
// Reports per-loadout scores, flags broken/dead combos, and
// ranks individual symbols by contribution.

import {
  SYMBOL_ROSTER,
  buildFrequencyTable,
  getEffectiveScoreValue,
  getEntrySpotCount,
  getSelectionSlots,
  getRecipeMatches,
  type SymbolDef,
  type SymbolId,
} from './src/symbols';

import {
  findMatchesWithAbilities,
  calculateScoreWithAbilities,
  evaluateOnPlace,
  evaluateOnRespin,
  canPlaceOnWall,
  type Grid,
  type Match,
} from './src/ability-engine';

// =============================================================================
// CONSTANTS
// =============================================================================

const BOARD_SIZE = 8;
const TILES_PER_LEVEL = 16;
const RESPINS_PER_LEVEL = 5;
const WALL_SCALAR = 1.5;
const SCORE_COEFFICIENT = 30;
const LEVEL_SCALAR_MAX = 2.2;
const NUM_LEVELS = 10;

const BASE_RESPIN_COST = 100;
const RESPIN_COST_STEP = 50;

// =============================================================================
// GRID / LEVEL
// =============================================================================

interface ObstacleCell { row: number; col: number; }

interface LevelConfig {
  level: number;
  threshold: number;
  respins: number;
  tilesPerLevel: number;
  obstacles: ObstacleCell[];
  entrySpotCount: number;
}

function createEmptyGrid(): Grid {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

function generateLevelConfig(level: number, loadout: SymbolDef[]): LevelConfig {
  const wallCount = Math.floor(level * WALL_SCALAR);
  const entryCells = new Set(['0,3', '0,4', '7,3', '7,4', '3,0', '4,0', '3,7', '4,7']);
  const obstacles: ObstacleCell[] = [];
  const used = new Set<string>();

  while (obstacles.length < wallCount) {
    const row = Math.floor(Math.random() * BOARD_SIZE);
    const col = Math.floor(Math.random() * BOARD_SIZE);
    const key = `${row},${col}`;
    if (entryCells.has(key) || used.has(key)) continue;
    used.add(key);
    obstacles.push({ row, col });
  }

  const playable = 64 - wallCount;
  const scalar = 1 + (level - 1) * ((LEVEL_SCALAR_MAX - 1) / (NUM_LEVELS - 1));
  const threshold = Math.round(playable * SCORE_COEFFICIENT * scalar);

  return {
    level, threshold, respins: RESPINS_PER_LEVEL,
    tilesPerLevel: TILES_PER_LEVEL,
    obstacles,
    entrySpotCount: getEntrySpotCount(loadout),
  };
}

function createGridFromConfig(config: LevelConfig): Grid {
  const grid = createEmptyGrid();
  for (const obs of config.obstacles) {
    grid[obs.row][obs.col] = 'wall';
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
  return all.slice(0, count);
}

function computeReachableCells(grid: Grid, entrySpot: EntrySpot): Set<string> {
  const reachable = new Set<string>();
  const queue: [number, number][] = [];

  for (const [r, c] of entrySpot.cells) {
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && grid[r][c] === null && !reachable.has(`${r},${c}`)) {
      reachable.add(`${r},${c}`);
      queue.push([r, c]);
    }
  }

  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    for (const [dr, dc] of dirs) {
      const nr = cr + dr, nc = cc + dc;
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
// TILE GENERATION (loadout-aware)
// =============================================================================

interface Tile {
  symbolA: SymbolId;
  symbolB: SymbolId;
}

function getRandomSymbolFromLoadout(freqs: Map<SymbolId, number>): SymbolId {
  let total = 0;
  for (const f of freqs.values()) total += f;
  let roll = Math.random() * total;
  for (const [sym, freq] of freqs) {
    if (sym === 'wall') continue;
    roll -= freq;
    if (roll <= 0) return sym;
  }
  // Fallback
  return freqs.keys().next().value!;
}

function generateTileQueue(count: number, freqs: Map<SymbolId, number>): Tile[] {
  return Array.from({ length: count }, () => ({
    symbolA: getRandomSymbolFromLoadout(freqs),
    symbolB: getRandomSymbolFromLoadout(freqs),
  }));
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

interface Placement {
  row: number;
  col: number;
  rotation: Rotation;
  entryIndex: number;
}

function canPlaceTile(grid: Grid, row: number, col: number, rotation: Rotation, reachable: Set<string>, loadout: SymbolDef[], tile: Tile): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
  const cellA = grid[row][col];
  const [ro, co] = getSecondCellOffset(rotation);
  const r2 = row + ro, c2 = col + co;
  if (r2 < 0 || r2 >= BOARD_SIZE || c2 < 0 || c2 >= BOARD_SIZE) return false;
  const cellB = grid[r2][c2];

  // Check reachability
  if (!reachable.has(`${row},${col}`) && !(cellA === 'wall' && canPlaceOnWall(tile.symbolA, loadout))) return false;
  if (!reachable.has(`${r2},${c2}`) && !(cellB === 'wall' && canPlaceOnWall(tile.symbolB, loadout))) return false;

  // Normal placement: both cells must be empty
  // Wall placement: cell can be wall if symbol has place_on_wall
  const okA = cellA === null || (cellA === 'wall' && canPlaceOnWall(tile.symbolA, loadout));
  const okB = cellB === null || (cellB === 'wall' && canPlaceOnWall(tile.symbolB, loadout));

  return okA && okB;
}

function findAllValidPlacements(grid: Grid, entrySpots: EntrySpot[], loadout: SymbolDef[], tile: Tile): Placement[] {
  const placements: Placement[] = [];
  for (let ei = 0; ei < entrySpots.length; ei++) {
    const reachable = computeReachableCells(grid, entrySpots[ei]);
    // Also consider wall cells for vine
    const expandedReachable = new Set(reachable);
    for (const key of reachable) {
      const [r, c] = key.split(',').map(Number);
      const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] === 'wall') {
          expandedReachable.add(`${nr},${nc}`);
        }
      }
    }

    for (const cellKey of expandedReachable) {
      const [r, c] = cellKey.split(',').map(Number);
      for (let rot = 0; rot < 4; rot++) {
        if (canPlaceTile(grid, r, c, rot as Rotation, expandedReachable, loadout, tile)) {
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
// RESPIN (loadout-aware, respects locked cells)
// =============================================================================

function respinRow(grid: Grid, rowIndex: number, lockedCells: Set<string>, freqs: Map<SymbolId, number>): Grid {
  const newGrid = cloneGrid(grid);
  for (let col = 0; col < BOARD_SIZE; col++) {
    if (lockedCells.has(`${rowIndex},${col}`)) continue;
    if (newGrid[rowIndex][col] !== null && newGrid[rowIndex][col] !== 'wall') {
      newGrid[rowIndex][col] = getRandomSymbolFromLoadout(freqs);
    }
  }
  return newGrid;
}

function respinCol(grid: Grid, colIndex: number, lockedCells: Set<string>, freqs: Map<SymbolId, number>): Grid {
  const newGrid = cloneGrid(grid);
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (lockedCells.has(`${row},${colIndex}`)) continue;
    if (newGrid[row][colIndex] !== null && newGrid[row][colIndex] !== 'wall') {
      newGrid[row][colIndex] = getRandomSymbolFromLoadout(freqs);
    }
  }
  return newGrid;
}

// =============================================================================
// GREEDY BOT
// =============================================================================

function scorePlacement(grid: Grid, tile: Tile, placement: Placement, loadout: SymbolDef[]): number {
  const testGrid = placeTile(grid, tile, placement);
  const { score } = calculateScoreWithAbilities(testGrid, loadout, BOARD_SIZE);

  // Adjacency bonus: prefer extending near-matches
  const [ro, co] = getSecondCellOffset(placement.rotation);
  const r1 = placement.row, c1 = placement.col;
  const r2 = r1 + ro, c2 = c1 + co;
  let adj = 0;
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [sym, r, c] of [[tile.symbolA, r1, c1], [tile.symbolB, r2, c2]] as [SymbolId, number, number][]) {
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc] === sym) {
        adj += 5;
      }
    }
  }

  return score + adj;
}

interface GameResult {
  score: number;
  won: boolean;
  respinsUsed: number;
  abilityTriggers: Map<string, number>;
  matchesBySymbol: Map<SymbolId, number>;
  lockedCellCount: number;
  tilesPlaced: number;
}

function simulateGame(config: LevelConfig, loadout: SymbolDef[], freqs: Map<SymbolId, number>): GameResult {
  let grid = createGridFromConfig(config);
  const entrySpots = getEntrySpots(config.entrySpotCount);
  let tiles = generateTileQueue(config.tilesPerLevel, freqs);
  let respinsRemaining = config.respins;
  let respinsUsed = 0;
  let score = 0;
  let lockedCells = new Set<string>();
  let tilesPlaced = 0;
  const abilityTriggers = new Map<string, number>();
  const matchesBySymbol = new Map<SymbolId, number>();

  const trackTrigger = (key: string) => {
    abilityTriggers.set(key, (abilityTriggers.get(key) ?? 0) + 1);
  };

  // Place tiles with greedy strategy
  for (let tileIdx = 0; tileIdx < tiles.length; tileIdx++) {
    const tile = tiles[tileIdx];
    const placements = findAllValidPlacements(grid, entrySpots, loadout, tile);
    if (placements.length === 0) break;

    // Greedy: pick best placement (70% greedy, 30% random for variance)
    let chosen: Placement;
    if (Math.random() < 0.7) {
      let bestScore = -Infinity;
      chosen = placements[0];
      for (const p of placements) {
        const s = scorePlacement(grid, tile, p, loadout);
        if (s > bestScore) { bestScore = s; chosen = p; }
      }
    } else {
      chosen = placements[Math.floor(Math.random() * placements.length)];
    }

    grid = placeTile(grid, tile, chosen);
    tilesPlaced++;

    // Evaluate on_place abilities
    const [ro, co] = getSecondCellOffset(chosen.rotation);
    const placeEffectsA = evaluateOnPlace(tile.symbolA, chosen.row, chosen.col, grid, loadout);
    const placeEffectsB = evaluateOnPlace(tile.symbolB, chosen.row + ro, chosen.col + co, grid, loadout);
    score += placeEffectsA.bonusScore + placeEffectsB.bonusScore;
    if (placeEffectsA.bonusScore > 0) trackTrigger(`${tile.symbolA}:on_place`);
    if (placeEffectsB.bonusScore > 0) trackTrigger(`${tile.symbolB}:on_place`);

    // Score the grid
    const { score: gridScore, matches, effects } = calculateScoreWithAbilities(grid, loadout, BOARD_SIZE);
    score = gridScore; // Grid score includes base + ability bonuses

    // Track matches
    for (const m of matches) {
      matchesBySymbol.set(m.symbol, (matchesBySymbol.get(m.symbol) ?? 0) + 1);
      if (m.isRecipe) trackTrigger(`${m.recipeDefiner}:recipe_match`);
    }

    // Lock matched cells
    for (const m of matches) {
      for (const [r, c] of m.cells) lockedCells.add(`${r},${c}`);
    }

    // Apply effects
    respinsRemaining += effects.freeRespins;
    if (effects.freeRespins > 0) trackTrigger('free_respin');

    // Extra tiles
    if (effects.extraTiles > 0) {
      const extraTiles = generateTileQueue(effects.extraTiles, freqs);
      tiles = [...tiles, ...extraTiles];
      trackTrigger('extra_tiles');
    }

    // Clear cells (bomb) — only unlocked cells
    if (effects.cellsToClear.size > 0) {
      for (const key of effects.cellsToClear) {
        if (lockedCells.has(key)) continue; // bomb doesn't destroy locked cells
        const [r, c] = key.split(',').map(Number);
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          grid[r][c] = null;
        }
      }
      trackTrigger('clear');
      // Recalculate score after clearing
      const { score: newScore } = calculateScoreWithAbilities(grid, loadout, BOARD_SIZE);
      score = newScore;
    }

    // Unlock cells (oil can)
    if (effects.cellsToUnlock.size > 0) {
      for (const key of effects.cellsToUnlock) {
        lockedCells.delete(key);
      }
      trackTrigger('unlock');
    }
  }

  // Use respins (greedy: try all, sample, pick best)
  const RESPIN_SAMPLES = 5;
  while (respinsRemaining > 0) {
    let bestGrid = grid;
    let bestScore = score;

    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let s = 0; s < RESPIN_SAMPLES; s++) {
        const rowCandidate = respinRow(grid, i, lockedCells, freqs);
        const { score: rowScore } = calculateScoreWithAbilities(rowCandidate, loadout, BOARD_SIZE);
        if (rowScore > bestScore) { bestScore = rowScore; bestGrid = rowCandidate; }

        const colCandidate = respinCol(grid, i, lockedCells, freqs);
        const { score: colScore } = calculateScoreWithAbilities(colCandidate, loadout, BOARD_SIZE);
        if (colScore > bestScore) { bestScore = colScore; bestGrid = colCandidate; }
      }
    }

    grid = bestGrid;
    score = bestScore;
    respinsRemaining--;
    respinsUsed++;

    // Lock new matches after respin
    const { matches } = calculateScoreWithAbilities(grid, loadout, BOARD_SIZE);
    for (const m of matches) {
      for (const [r, c] of m.cells) lockedCells.add(`${r},${c}`);
    }
  }

  // Buy respins if profitable (greedy: buy if expected gain > cost)
  let respinsBought = 0;
  for (let attempt = 0; attempt < 10; attempt++) {
    const cost = BASE_RESPIN_COST + respinsBought * RESPIN_COST_STEP;
    if (score < cost) break;

    // Sample a few respins to estimate gain
    let bestGain = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let s = 0; s < 3; s++) {
        const rowCandidate = respinRow(grid, i, lockedCells, freqs);
        const { score: rs } = calculateScoreWithAbilities(rowCandidate, loadout, BOARD_SIZE);
        bestGain = Math.max(bestGain, rs - score);

        const colCandidate = respinCol(grid, i, lockedCells, freqs);
        const { score: cs } = calculateScoreWithAbilities(colCandidate, loadout, BOARD_SIZE);
        bestGain = Math.max(bestGain, cs - score);
      }
    }

    if (bestGain <= cost) break;

    // Buy and use the respin
    score -= cost;
    respinsBought++;
    respinsUsed++;

    let bestGrid = grid;
    let bestScore = score;
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let s = 0; s < RESPIN_SAMPLES; s++) {
        const rowCandidate = respinRow(grid, i, lockedCells, freqs);
        const { score: rs } = calculateScoreWithAbilities(rowCandidate, loadout, BOARD_SIZE);
        if (rs > bestScore) { bestScore = rs; bestGrid = rowCandidate; }

        const colCandidate = respinCol(grid, i, lockedCells, freqs);
        const { score: cs } = calculateScoreWithAbilities(colCandidate, loadout, BOARD_SIZE);
        if (cs > bestScore) { bestScore = cs; bestGrid = colCandidate; }
      }
    }
    grid = bestGrid;
    score = bestScore;

    const { matches } = calculateScoreWithAbilities(grid, loadout, BOARD_SIZE);
    for (const m of matches) {
      for (const [r, c] of m.cells) lockedCells.add(`${r},${c}`);
    }
  }

  return {
    score, won: score >= config.threshold,
    respinsUsed, abilityTriggers, matchesBySymbol,
    lockedCellCount: lockedCells.size, tilesPlaced,
  };
}

// =============================================================================
// LOADOUT TESTING
// =============================================================================

interface LoadoutStats {
  loadout: SymbolId[];
  meanScore: number;
  medianScore: number;
  stdDev: number;
  winRate: number;
  maxScore: number;
  minScore: number;
  meanRespins: number;
  meanTilesPlaced: number;
  meanLockedCells: number;
  abilityTriggerSummary: Map<string, number>;
}

function testLoadout(loadout: SymbolDef[], gamesPerLevel: number, levels: number[] = [1, 5, 10]): LoadoutStats {
  const allScores: number[] = [];
  let totalWins = 0;
  let totalRespins = 0;
  let totalTiles = 0;
  let totalLocked = 0;
  const triggerTotals = new Map<string, number>();
  const freqs = buildFrequencyTable(loadout);
  const totalGames = gamesPerLevel * levels.length;

  for (const level of levels) {
    for (let g = 0; g < gamesPerLevel; g++) {
      const config = generateLevelConfig(level, loadout);
      const result = simulateGame(config, loadout, freqs);

      allScores.push(result.score);
      if (result.won) totalWins++;
      totalRespins += result.respinsUsed;
      totalTiles += result.tilesPlaced;
      totalLocked += result.lockedCellCount;

      for (const [key, count] of result.abilityTriggers) {
        triggerTotals.set(key, (triggerTotals.get(key) ?? 0) + count);
      }
    }
  }

  allScores.sort((a, b) => a - b);
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const median = allScores[Math.floor(allScores.length / 2)];
  const variance = allScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / allScores.length;
  const stdDev = Math.sqrt(variance);

  return {
    loadout: loadout.map(s => s.id),
    meanScore: Math.round(mean),
    medianScore: median,
    stdDev: Math.round(stdDev),
    winRate: (totalWins / totalGames) * 100,
    maxScore: allScores[allScores.length - 1],
    minScore: allScores[0],
    meanRespins: Math.round((totalRespins / totalGames) * 10) / 10,
    meanTilesPlaced: Math.round((totalTiles / totalGames) * 10) / 10,
    meanLockedCells: Math.round((totalLocked / totalGames) * 10) / 10,
    abilityTriggerSummary: triggerTotals,
  };
}

// =============================================================================
// COMBINATORIAL SEARCH
// =============================================================================

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// =============================================================================
// MAIN
// =============================================================================

const GAMES_PER_LEVEL = 200;
const LEVELS_TO_TEST = [1, 5, 10];
const LOADOUT_SIZE = 5;
const MAX_LOADOUTS = 100; // Random sample if too many combos

// Get all non-wall symbols
const allSymbols = SYMBOL_ROSTER.filter(s => s.id !== 'wall');

console.log('='.repeat(90));
console.log('SLOMINOES LOADOUT SIMULATOR');
console.log(`${GAMES_PER_LEVEL} games/level | Levels: ${LEVELS_TO_TEST.join(',')} | Loadout size: ${LOADOUT_SIZE}`);
console.log('='.repeat(90));

// First: test the baseline (all base symbols)
const baseLoadout = allSymbols.filter(s => s.base);
console.log('\nBASELINE: base symbols only');
const baseline = testLoadout(baseLoadout, GAMES_PER_LEVEL, LEVELS_TO_TEST);
console.log(`  Mean: ${baseline.meanScore} | Median: ${baseline.medianScore} | StdDev: ${baseline.stdDev} | Win: ${baseline.winRate.toFixed(1)}%`);

// Generate loadouts to test
const allCombos = combinations(allSymbols, LOADOUT_SIZE);
let loadoutsToTest: SymbolDef[][];

if (allCombos.length <= MAX_LOADOUTS) {
  loadoutsToTest = allCombos;
  console.log(`\nTesting all ${allCombos.length} loadout combinations`);
} else {
  // Random sample
  loadoutsToTest = [];
  const indices = new Set<number>();
  while (indices.size < MAX_LOADOUTS) {
    indices.add(Math.floor(Math.random() * allCombos.length));
  }
  for (const i of indices) loadoutsToTest.push(allCombos[i]);
  console.log(`\nSampling ${MAX_LOADOUTS} of ${allCombos.length} possible loadouts`);
}

// Test all loadouts
const results: LoadoutStats[] = [baseline];

let tested = 0;
for (const loadout of loadoutsToTest) {
  // Skip the baseline combo (already tested)
  if (loadout.every(s => s.base) && loadout.length === LOADOUT_SIZE) continue;

  const stats = testLoadout(loadout, GAMES_PER_LEVEL, LEVELS_TO_TEST);
  results.push(stats);
  tested++;
  if (tested % 20 === 0) process.stdout.write(`  ${tested}/${loadoutsToTest.length} loadouts tested\r`);
}

console.log(`\n${'='.repeat(90)}`);

// Sort by mean score
results.sort((a, b) => b.meanScore - a.meanScore);

// Top 10
console.log('\nTOP 10 LOADOUTS:');
console.log('-'.repeat(90));
console.log(
  'Rank'.padStart(4),
  'Loadout'.padEnd(40),
  'Mean'.padStart(7),
  'Med'.padStart(7),
  'SD'.padStart(6),
  'Win%'.padStart(6),
  'Max'.padStart(7),
);
console.log('-'.repeat(90));

for (let i = 0; i < Math.min(10, results.length); i++) {
  const r = results[i];
  console.log(
    String(i + 1).padStart(4),
    r.loadout.join(', ').padEnd(40),
    String(r.meanScore).padStart(7),
    String(r.medianScore).padStart(7),
    String(r.stdDev).padStart(6),
    r.winRate.toFixed(1).padStart(6),
    String(r.maxScore).padStart(7),
  );
}

// Bottom 10
console.log('\nBOTTOM 10 LOADOUTS:');
console.log('-'.repeat(90));
for (let i = Math.max(0, results.length - 10); i < results.length; i++) {
  const r = results[i];
  console.log(
    String(i + 1).padStart(4),
    r.loadout.join(', ').padEnd(40),
    String(r.meanScore).padStart(7),
    String(r.medianScore).padStart(7),
    String(r.stdDev).padStart(6),
    r.winRate.toFixed(1).padStart(6),
    String(r.maxScore).padStart(7),
  );
}

// Flag outliers (>2 SD from baseline)
const baselineMean = baseline.meanScore;
const baselineSD = baseline.stdDev;
const broken = results.filter(r => r.meanScore > baselineMean + 2 * baselineSD);
const dead = results.filter(r => r.meanScore < baselineMean - 2 * baselineSD);

if (broken.length > 0) {
  console.log(`\n⚠️  POTENTIALLY BROKEN (>${baselineMean + 2 * baselineSD} mean score):`);
  for (const r of broken) {
    console.log(`  ${r.loadout.join(', ')} — mean ${r.meanScore}, win ${r.winRate.toFixed(1)}%`);
  }
}

if (dead.length > 0) {
  console.log(`\n⚠️  POTENTIALLY DEAD (<${baselineMean - 2 * baselineSD} mean score):`);
  for (const r of dead) {
    console.log(`  ${r.loadout.join(', ')} — mean ${r.meanScore}, win ${r.winRate.toFixed(1)}%`);
  }
}

// Per-symbol power ranking
console.log('\nSYMBOL POWER RANKING (avg score in loadouts containing this symbol):');
console.log('-'.repeat(60));

const symbolScores = new Map<SymbolId, number[]>();
for (const r of results) {
  for (const sym of r.loadout) {
    if (!symbolScores.has(sym)) symbolScores.set(sym, []);
    symbolScores.get(sym)!.push(r.meanScore);
  }
}

const rankings: { sym: SymbolId; avg: number; count: number }[] = [];
for (const [sym, scores] of symbolScores) {
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  rankings.push({ sym, avg, count: scores.length });
}
rankings.sort((a, b) => b.avg - a.avg);

for (const r of rankings) {
  const def = allSymbols.find(s => s.id === r.sym);
  const label = def?.base ? '(base)' : '(unlock)';
  console.log(`  ${r.sym.padEnd(12)} ${label.padEnd(10)} avg: ${String(r.avg).padStart(6)} (in ${r.count} loadouts)`);
}

console.log('\n');
