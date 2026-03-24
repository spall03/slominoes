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
} from './grid';
import {
  generateLevelConfig,
  getEntrySpots,
  generateTileQueue,
  getRandomSymbol,
} from './level';
import { findMatches, calculateScore, matchKey } from './scoring';

// =============================================================================
// SHARED REF
// =============================================================================

export const respinModeRef = { current: false };

// =============================================================================
// MAGNETIC LOCK PROPAGATION
// =============================================================================

/**
 * Magnetic pull: locked matches attract same-symbol cells along their axis.
 * A matching symbol separated by non-matching cells swaps past them to join
 * the locked group. e.g. [C C C L C] → [C C C C L].
 *
 * Also absorbs any directly adjacent same-symbol cells (simple propagation).
 * Repeats until no more cells are pulled. Mutates grid in place.
 */
function magneticPull(grid: Grid, lockedCells: Set<string>): Set<string> {
  const locked = new Set(lockedCells);
  let changed = true;

  while (changed) {
    changed = false;

    // Step 1: Simple adjacency absorption (handles direct neighbors)
    let adjChanged = true;
    while (adjChanged) {
      adjChanged = false;
      for (const key of locked) {
        const [r, c] = key.split(',').map(Number);
        const symbol = grid[r][c];
        if (!symbol || symbol === 'wall') continue;
        const neighbors: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
          const nKey = `${nr},${nc}`;
          if (locked.has(nKey)) continue;
          if (grid[nr][nc] === symbol) {
            locked.add(nKey);
            adjChanged = true;
            changed = true;
          }
        }
      }
    }

    // Step 2: Pull matching symbols along match axes (swap through non-matching)
    const matches = findMatches(grid).filter(m =>
      m.cells.every(([r, c]) => locked.has(`${r},${c}`))
    );

    for (const match of matches) {
      const sym = match.symbol;
      const isHorizontal = match.cells.length > 1 && match.cells[0][0] === match.cells[1][0];

      if (isHorizontal) {
        const row = match.cells[0][0];
        const cols = match.cells.map(([, c]) => c).sort((a, b) => a - b);
        const minCol = cols[0];
        const maxCol = cols[cols.length - 1];

        // Scan right from end of match
        for (let col = maxCol + 1; col < BOARD_SIZE; col++) {
          const cell = grid[row][col];
          if (cell === null || cell === 'wall') break;
          if (locked.has(`${row},${col}`)) break;
          if (cell === sym) {
            // Shift everything between maxCol+1..col-1 one position right
            for (let c = col; c > maxCol + 1; c--) {
              grid[row][c] = grid[row][c - 1];
            }
            grid[row][maxCol + 1] = sym;
            locked.add(`${row},${maxCol + 1}`);
            changed = true;
            break;
          }
        }

        // Scan left from start of match
        for (let col = minCol - 1; col >= 0; col--) {
          const cell = grid[row][col];
          if (cell === null || cell === 'wall') break;
          if (locked.has(`${row},${col}`)) break;
          if (cell === sym) {
            // Shift everything between col+1..minCol-1 one position left
            for (let c = col; c < minCol - 1; c++) {
              grid[row][c] = grid[row][c + 1];
            }
            grid[row][minCol - 1] = sym;
            locked.add(`${row},${minCol - 1}`);
            changed = true;
            break;
          }
        }
      } else {
        // Vertical match
        const col = match.cells[0][1];
        const rows = match.cells.map(([r]) => r).sort((a, b) => a - b);
        const minRow = rows[0];
        const maxRow = rows[rows.length - 1];

        // Scan down from end of match
        for (let row = maxRow + 1; row < BOARD_SIZE; row++) {
          const cell = grid[row][col];
          if (cell === null || cell === 'wall') break;
          if (locked.has(`${row},${col}`)) break;
          if (cell === sym) {
            for (let r = row; r > maxRow + 1; r--) {
              grid[r][col] = grid[r - 1][col];
            }
            grid[maxRow + 1][col] = sym;
            locked.add(`${maxRow + 1},${col}`);
            changed = true;
            break;
          }
        }

        // Scan up from start of match
        for (let row = minRow - 1; row >= 0; row--) {
          const cell = grid[row][col];
          if (cell === null || cell === 'wall') break;
          if (locked.has(`${row},${col}`)) break;
          if (cell === sym) {
            for (let r = row; r < minRow - 1; r++) {
              grid[r][col] = grid[r + 1][col];
            }
            grid[minRow - 1][col] = sym;
            locked.add(`${minRow - 1},${col}`);
            changed = true;
            break;
          }
        }
      }
    }
  }

  return locked;
}

const SPIN_STAGGER_MS = 80;
const SPIN_BASE_CYCLES = 2;

// =============================================================================
// GAME STATE
// =============================================================================

export interface GameState {
  levelConfig: LevelConfig;
  grid: Grid;
  tileQueue: Tile[];
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
  lockedCells: Set<string>;
  spinningCells: Map<string, SpinCellInfo>;
  pendingSpinGrid: Grid | null;
  pendingSpinScore: number;
  pendingSpinAnimState: Partial<GameState> | null;

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
  clearSpinAnimation: () => void;
  resetGame: (config?: LevelConfig) => void;
}

export function createInitialState(config: LevelConfig = generateLevelConfig(1)) {
  const queue = generateTileQueue(config.tilesPerLevel, config.symbolCount);
  const spots = getEntrySpots(config.entrySpotCount);
  return {
    levelConfig: config,
    grid: createGridFromConfig(config),
    tileQueue: queue.slice(1),
    currentTile: queue[0] ?? null,
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
    lockedCells: new Set<string>(),
    spinningCells: new Map<string, SpinCellInfo>(),
    pendingSpinGrid: null as Grid | null,
    pendingSpinScore: 0,
    pendingSpinAnimState: null as Partial<GameState> | null,
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

    const { matches } = calculateScore(newGrid);

    // Lock cells that are part of matches, then propagate magnetically
    const baseLocked = new Set(get().lockedCells);
    matches.forEach(match => {
      match.cells.forEach(([r, c]) => baseLocked.add(`${r},${c}`));
    });
    const newLocked = magneticPull(newGrid, baseLocked);

    // Recalculate score after magnetic propagation may have extended matches
    const { score: newTotalScore } = calculateScore(newGrid);

    const nextTile = tileQueue[0] ?? null;
    const newQueue = tileQueue.slice(1);
    const isComplete = nextTile === null;

    if (isComplete) {
      const result = newTotalScore >= get().levelConfig.threshold ? 'win' : 'lose';
      set({
        grid: newGrid,
        tileQueue: [],
        currentTile: null,
        score: newTotalScore,
        lockedCells: newLocked,
        phase: 'ended',
        result,
        placementMode: 'idle',
        placedPosition: null,
        holdReady: false,
        selectedEntry: null,
        reachableCells: null,
      });
      if (result === 'win') {
        useRunStore.getState().completeLevel(newTotalScore, get().levelConfig.threshold, get().respinsRemaining);
      } else {
        useRunStore.getState().failLevel(newTotalScore);
      }
    } else {
      // Check if any entry has valid placements on the new grid
      const stuck = !anyEntryHasValidPlacement(newGrid, get().entrySpots);
      if (stuck) {
        // No valid placements remaining — end the game
        const result = newTotalScore >= get().levelConfig.threshold ? 'win' : 'lose';
        set({
          grid: newGrid,
          tileQueue: newQueue,
          currentTile: nextTile,
          score: newTotalScore,
          lockedCells: newLocked,
          phase: 'ended',
          result,
          placementMode: 'idle',
          placedPosition: null,
          holdReady: false,
          selectedEntry: null,
          reachableCells: null,
        });
        if (result === 'win') {
          useRunStore.getState().completeLevel(newTotalScore, get().levelConfig.threshold, get().respinsRemaining);
        } else {
          useRunStore.getState().failLevel(newTotalScore);
        }
      } else {
        set({
          grid: newGrid,
          tileQueue: newQueue,
          currentTile: nextTile,
          score: newTotalScore,
          lockedCells: newLocked,
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
    const { phase, respinsRemaining, grid, score, matchingCells, spinningCells, lockedCells } = get();
    if (phase !== 'placing' || respinsRemaining <= 0) return;
    if (index < 0 || index >= BOARD_SIZE) return;
    if (matchingCells.size > 0) return; // Block respins during animation
    if (spinningCells.size > 0) return; // Block respins during active spin

    const matchesBefore = findMatches(grid);

    const newGrid = cloneGrid(grid);
    const newSpinningCells = new Map<string, SpinCellInfo>();

    if (type === 'row') {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (lockedCells.has(`${index},${col}`)) continue; // Skip locked cells
        if (newGrid[index][col] !== null && newGrid[index][col] !== 'wall') {
          const newSymbol = getRandomSymbol(get().levelConfig.symbolCount);
          newGrid[index][col] = newSymbol;
          newSpinningCells.set(`${index},${col}`, {
            finalSymbol: newSymbol,
            cycles: SPIN_BASE_CYCLES + col,
            delay: col * SPIN_STAGGER_MS,
          });
        }
      }
    } else {
      for (let row = 0; row < BOARD_SIZE; row++) {
        if (lockedCells.has(`${row},${index}`)) continue; // Skip locked cells
        if (newGrid[row][index] !== null && newGrid[row][index] !== 'wall') {
          const newSymbol = getRandomSymbol(get().levelConfig.symbolCount);
          newGrid[row][index] = newSymbol;
          newSpinningCells.set(`${row},${index}`, {
            finalSymbol: newSymbol,
            cycles: SPIN_BASE_CYCLES + row,
            delay: row * SPIN_STAGGER_MS,
          });
        }
      }
    }

    const newRespins = respinsRemaining - 1;
    const matchesAfter = findMatches(newGrid);
    const gridScore = matchesAfter.reduce((sum, m) => sum + m.score, 0);
    const newScore = gridScore;

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

    // Store pending results — grid/score/anim deferred until spin animation completes
    set({
      respinsRemaining: newRespins,
      spinningCells: newSpinningCells,
      pendingSpinGrid: newGrid,
      pendingSpinScore: newScore,
      pendingSpinAnimState: animState,
    });
  },

  clearSpinAnimation: () => {
    const { pendingSpinGrid, pendingSpinScore, pendingSpinAnimState, lockedCells } = get();
    if (!pendingSpinGrid) return;

    // Lock any new matches formed by the respin, then propagate magnetically
    const matches = findMatches(pendingSpinGrid);
    const baseLocked = new Set(lockedCells);
    matches.forEach(match => {
      match.cells.forEach(([r, c]) => baseLocked.add(`${r},${c}`));
    });
    const newLocked = magneticPull(pendingSpinGrid, baseLocked);

    // Recalculate score after magnetic propagation
    const finalScore = calculateScore(pendingSpinGrid).score;

    set({
      grid: pendingSpinGrid,
      score: finalScore,
      lockedCells: newLocked,
      spinningCells: new Map(),
      pendingSpinGrid: null,
      pendingSpinScore: 0,
      pendingSpinAnimState: null,
      ...(pendingSpinAnimState ?? {}),
    });
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
