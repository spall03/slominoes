// src/store.ts
import { create } from 'zustand';
import type {
  Grid,
  Rotation,
  LevelConfig,
  EntrySpot,
  Tile,
  Match,
  ScorePopup,
  GamePhase,
  GameResult,
  PlacementMode,
  RunPhase,
  Symbol,
  SpinCellInfo,
} from './types';
import { BOARD_SIZE, NUM_LEVELS } from './constants';
import { CONFIG } from './config';
import {
  createEmptyGrid,
  cloneGrid,
  createGridFromConfig,
  getSecondCellOffset,
  getSymbolsForRotation,
  canPlaceTile,
  computeReachableCells,
  isTilePlacementReachable,
  canPlaceTileWithEntry,
  anyEntryHasValidPlacement,
  findUnlockedNeighbors,
} from './grid';
import {
  generateLevelConfig,
  getEntrySpots,
  generateTileQueue,
  getRandomSymbol,
} from './level';
import { findMatches, calculateScore, matchKey, findNewMatches, calculateLockedScore } from './scoring';

// =============================================================================
// SHARED REF
// =============================================================================

export const respinModeRef = { current: false };

// =============================================================================
// GAME STATE
// =============================================================================

export interface GameState {
  levelConfig: LevelConfig;
  grid: Grid;
  lockedCells: Set<string>;
  tileBatches: Tile[][];
  currentBatch: number;
  batchQueue: Tile[];
  currentTile: Tile | null;
  rotation: Rotation;
  respinsRemaining: number;
  score: number;
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
  spinningCells: Map<string, SpinCellInfo>;
  pendingGrid: Grid | null;
  pendingLockedCells: Set<string> | null;
  pendingScore: number;
  cascadeWave: number;

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
  ignite: (type: 'row' | 'col', index: number) => void;
  clearSpinAnimation: () => void;
  resetGame: (config?: LevelConfig) => void;
}

export function createInitialState(config: LevelConfig = generateLevelConfig(1)) {
  const totalTiles = CONFIG.TILES_PER_BATCH * CONFIG.NUM_BATCHES;
  const allTiles = generateTileQueue(totalTiles, config.symbolCount);
  const batches: Tile[][] = [];
  for (let i = 0; i < CONFIG.NUM_BATCHES; i++) {
    batches.push(allTiles.slice(i * CONFIG.TILES_PER_BATCH, (i + 1) * CONFIG.TILES_PER_BATCH));
  }

  const firstBatch = batches[0] ?? [];
  const spots = getEntrySpots(config.entrySpotCount);

  return {
    levelConfig: config,
    grid: createGridFromConfig(config),
    lockedCells: new Set<string>(),
    tileBatches: batches,
    currentBatch: 0,
    batchQueue: firstBatch.slice(1),
    currentTile: firstBatch[0] ?? null,
    rotation: 0 as Rotation,
    respinsRemaining: config.respins,
    score: 0,
    phase: 'placing' as GamePhase,
    result: null as GameResult,
    placementMode: 'idle' as PlacementMode,
    placedPosition: null as { row: number; col: number } | null,
    holdReady: false,
    matchingCells: new Set<string>(),
    highlightColor: 'gold' as 'gold' | 'red' | 'blue',
    scorePopups: [] as ScorePopup[],
    pendingPhase2: null as { cells: Set<string>; popups: ScorePopup[] } | null,
    entrySpots: spots,
    selectedEntry: null as number | null,
    reachableCells: null as Set<string> | null,
    spinningCells: new Map<string, SpinCellInfo>(),
    pendingGrid: null as Grid | null,
    pendingLockedCells: null as Set<string> | null,
    pendingScore: 0,
    cascadeWave: 0,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  selectEntry: (index: number) => {
    const { phase, grid, entrySpots } = get();
    if (phase !== 'placing') return;
    const entry = entrySpots[index];
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
    const { phase, currentTile, rotation, grid, batchQueue, placementMode, placedPosition, reachableCells } = get();
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

    const nextTile = batchQueue[0] ?? null;
    const newQueue = batchQueue.slice(1);
    const isBatchComplete = nextTile === null;

    if (isBatchComplete) {
      // Batch is done — transition to igniting phase (no scoring yet)
      set({
        grid: newGrid,
        batchQueue: [],
        currentTile: null,
        phase: 'igniting',
        placementMode: 'idle',
        placedPosition: null,
        holdReady: false,
        selectedEntry: null,
        reachableCells: null,
      });
    } else {
      // More tiles in batch — advance to next tile
      set({
        grid: newGrid,
        batchQueue: newQueue,
        currentTile: nextTile,
        placementMode: 'idle',
        placedPosition: null,
        holdReady: false,
        selectedEntry: null,
        reachableCells: null,
      });
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

  ignite: (type: 'row' | 'col', index: number) => {
    const { phase, grid, lockedCells, spinningCells } = get();
    if (phase !== 'igniting') return;
    if (index < 0 || index >= BOARD_SIZE) return;
    if (spinningCells.size > 0) return; // Block during active spin

    const newGrid = cloneGrid(grid);
    const newSpinningCells = new Map<string, SpinCellInfo>();

    if (type === 'row') {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const key = `${index},${col}`;
        if (lockedCells.has(key)) continue; // Skip locked cells
        if (newGrid[index][col] !== null && newGrid[index][col] !== 'wall') {
          const newSymbol = getRandomSymbol(get().levelConfig.symbolCount);
          newGrid[index][col] = newSymbol;
          newSpinningCells.set(key, {
            finalSymbol: newSymbol,
            cycles: CONFIG.SPIN_BASE_CYCLES + col,
            delay: col * CONFIG.SPIN_STAGGER_MS,
          });
        }
      }
    } else {
      for (let row = 0; row < BOARD_SIZE; row++) {
        const key = `${row},${index}`;
        if (lockedCells.has(key)) continue; // Skip locked cells
        if (newGrid[row][index] !== null && newGrid[row][index] !== 'wall') {
          const newSymbol = getRandomSymbol(get().levelConfig.symbolCount);
          newGrid[row][index] = newSymbol;
          newSpinningCells.set(key, {
            finalSymbol: newSymbol,
            cycles: CONFIG.SPIN_BASE_CYCLES + row,
            delay: row * CONFIG.SPIN_STAGGER_MS,
          });
        }
      }
    }

    set({
      phase: 'cascading',
      spinningCells: newSpinningCells,
      pendingGrid: newGrid,
      pendingLockedCells: new Set(lockedCells),
      pendingScore: get().score,
      cascadeWave: 0,
    });
  },

  clearSpinAnimation: () => {
    const { pendingGrid, pendingLockedCells, currentBatch, tileBatches, levelConfig } = get();
    if (!pendingGrid) return;

    const grid = pendingGrid;
    const locked = pendingLockedCells ?? new Set<string>();

    // Find new matches (matches with at least one unlocked cell)
    const newMatches = findNewMatches(grid, locked);

    if (newMatches.length === 0) {
      // No new matches — cascade ends
      const finalScore = calculateLockedScore(grid, locked);
      const nextBatchIndex = currentBatch + 1;

      if (nextBatchIndex < tileBatches.length) {
        // More batches remain — start next batch
        const nextBatch = tileBatches[nextBatchIndex];
        set({
          grid,
          lockedCells: locked,
          score: finalScore,
          phase: 'placing',
          currentBatch: nextBatchIndex,
          batchQueue: nextBatch.slice(1),
          currentTile: nextBatch[0] ?? null,
          spinningCells: new Map(),
          pendingGrid: null,
          pendingLockedCells: null,
          pendingScore: 0,
          cascadeWave: 0,
        });
      } else {
        // No more batches — game ends
        const result = finalScore >= levelConfig.threshold ? 'win' : 'lose';
        set({
          grid,
          lockedCells: locked,
          score: finalScore,
          phase: 'ended',
          result,
          spinningCells: new Map(),
          pendingGrid: null,
          pendingLockedCells: null,
          pendingScore: 0,
          cascadeWave: 0,
        });
        if (result === 'win') {
          useRunStore.getState().completeLevel(finalScore, levelConfig.threshold, get().respinsRemaining);
        } else {
          useRunStore.getState().failLevel(finalScore);
        }
      }
    } else {
      // New matches found — lock matched cells and propagate
      const newlyLocked = new Set<string>();
      newMatches.forEach(match => {
        match.cells.forEach(([r, c]) => {
          const key = `${r},${c}`;
          if (!locked.has(key)) {
            newlyLocked.add(key);
          }
          locked.add(key);
        });
      });

      const updatedScore = calculateLockedScore(grid, locked);

      // Build score popups for the new matches
      const popupMap = new Map<string, number>();
      newMatches.forEach((match) => {
        match.cells.forEach(([row, col]) => {
          // (cells are highlighted via matchingCells below)
        });
        const centerIndex = Math.floor(match.cells.length / 2);
        const [cr, cc] = match.cells[centerIndex];
        const key = `${cr},${cc}`;
        popupMap.set(key, (popupMap.get(key) ?? 0) + match.score);
      });
      let popupIdx = 0;
      const popups: ScorePopup[] = [];
      popupMap.forEach((totalScore, key) => {
        const [r, c] = key.split(',').map(Number);
        popups.push({ id: `popup-cascade-${Date.now()}-${popupIdx++}`, score: totalScore, row: r, col: c });
      });

      // Highlight newly matched cells
      const matchCells = new Set<string>();
      newMatches.forEach(match => {
        match.cells.forEach(([r, c]) => matchCells.add(`${r},${c}`));
      });

      // Find unlocked neighbors of newly locked cells
      const neighbors = findUnlockedNeighbors(grid, newlyLocked, locked);

      if (neighbors.size === 0) {
        // No neighbors to respin — cascade ends
        const nextBatchIndex = currentBatch + 1;
        if (nextBatchIndex < tileBatches.length) {
          const nextBatch = tileBatches[nextBatchIndex];
          set({
            grid,
            lockedCells: locked,
            score: updatedScore,
            phase: 'placing',
            currentBatch: nextBatchIndex,
            batchQueue: nextBatch.slice(1),
            currentTile: nextBatch[0] ?? null,
            spinningCells: new Map(),
            pendingGrid: null,
            pendingLockedCells: null,
            pendingScore: 0,
            cascadeWave: 0,
            matchingCells: matchCells,
            scorePopups: popups,
          });
        } else {
          const result = updatedScore >= levelConfig.threshold ? 'win' : 'lose';
          set({
            grid,
            lockedCells: locked,
            score: updatedScore,
            phase: 'ended',
            result,
            spinningCells: new Map(),
            pendingGrid: null,
            pendingLockedCells: null,
            pendingScore: 0,
            cascadeWave: 0,
            matchingCells: matchCells,
            scorePopups: popups,
          });
          if (result === 'win') {
            useRunStore.getState().completeLevel(updatedScore, levelConfig.threshold, get().respinsRemaining);
          } else {
            useRunStore.getState().failLevel(updatedScore);
          }
        }
      } else {
        // Respin neighbor cells — build new spin map and pending grid
        const nextGrid = cloneGrid(grid);
        const newSpinningCells = new Map<string, SpinCellInfo>();
        let cellIndex = 0;
        neighbors.forEach(cellKey => {
          const [r, c] = cellKey.split(',').map(Number);
          const newSymbol = getRandomSymbol(get().levelConfig.symbolCount);
          nextGrid[r][c] = newSymbol;
          newSpinningCells.set(cellKey, {
            finalSymbol: newSymbol,
            cycles: CONFIG.SPIN_BASE_CYCLES + cellIndex,
            delay: cellIndex * CONFIG.SPIN_STAGGER_MS,
          });
          cellIndex++;
        });

        set({
          grid,
          lockedCells: locked,
          score: updatedScore,
          spinningCells: newSpinningCells,
          pendingGrid: nextGrid,
          pendingLockedCells: locked,
          pendingScore: updatedScore,
          cascadeWave: get().cascadeWave + 1,
          matchingCells: matchCells,
          scorePopups: popups,
        });
      }
    }
  },

  resetGame: (config?: LevelConfig) => set(createInitialState(config ?? generateLevelConfig(1))),
}));

// =============================================================================
// RUN STATE
// =============================================================================

export interface RunState {
  runPhase: RunPhase;
  currentLevel: number;
  levelScore: number;
  levelConfig: LevelConfig | null;
  bonusRespins: number;

  startRun: () => void;
  startLevel: () => void;
  completeLevel: (score: number, threshold: number, respinsLeft: number) => void;
  failLevel: (score: number) => void;
}

export const useRunStore = create<RunState>((set, get) => ({
  runPhase: 'title',
  currentLevel: 1,
  levelScore: 0,
  levelConfig: null,
  bonusRespins: 0,

  startRun: () => {
    const config = generateLevelConfig(1);
    set({
      runPhase: 'levelPreview',
      currentLevel: 1,
      levelScore: 0,
      levelConfig: config,
      bonusRespins: 0,
    });
  },

  startLevel: () => {
    const { levelConfig, bonusRespins } = get();
    if (!levelConfig) return;
    const config = bonusRespins > 0
      ? { ...levelConfig, respins: levelConfig.respins + bonusRespins }
      : levelConfig;
    useGameStore.getState().resetGame(config);
    set({ runPhase: 'playing' });
  },

  completeLevel: (score: number, threshold: number, _respinsLeft: number) => {
    const { currentLevel } = get();

    // Calculate bonus respins for next level based on how much score exceeds threshold
    const excessPct = (score - threshold) / threshold;
    let bonus = 0;
    if (excessPct >= 0.15) bonus = 3;
    else if (excessPct >= 0.10) bonus = 2;
    else if (excessPct >= 0.05) bonus = 1;

    if (currentLevel >= NUM_LEVELS) {
      set({ runPhase: 'gameOver', levelScore: score, bonusRespins: 0 });
      return;
    }
    const nextLevel = currentLevel + 1;
    const config = generateLevelConfig(nextLevel);
    set({
      currentLevel: nextLevel,
      levelConfig: config,
      levelScore: score,
      bonusRespins: bonus,
      runPhase: 'levelPreview',
    });
  },

  failLevel: (score: number) => {
    set({ runPhase: 'gameOver', levelScore: score });
  },
}));
