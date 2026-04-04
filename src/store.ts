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
  generateTileQueueFromFreqs,
  getRandomSymbol,
  getRandomSymbolFromFreqs,
} from './level';
import { findMatches, calculateScore, matchKey } from './scoring';
import { buildFrequencyTable, SYMBOL_ROSTER, hasNoLock, getRespinMatchBonus, getEntrySpotCount, type SymbolDef, type SymbolId } from './symbols';
import * as Sound from './sound';
import {
  calculateScoreWithAbilities,
  evaluateOnPlace,
  canPlaceOnWall as canSymbolPlaceOnWall,
  type AbilityEffects,
  type Match as AbilityMatch,
} from './ability-engine';

/** Get the set of symbols that can place on walls (vine) from the loadout */
function getVineSymbols(loadoutDefs: SymbolDef[] | null): Set<string> | undefined {
  if (!loadoutDefs) return undefined;
  const vines = new Set<string>();
  for (const def of loadoutDefs) {
    if (def.abilities.some(a => a.trigger === 'on_place' && a.verb === 'place_on_wall')) {
      vines.add(def.id);
    }
  }
  return vines.size > 0 ? vines : undefined;
}

// Lazy import to avoid circular dependency — meta store imports are deferred
let _metaStore: any = null;
function getMetaStore() {
  if (!_metaStore) _metaStore = require('./meta-store').useMetaStore;
  return _metaStore;
}

// =============================================================================
// SHARED REF
// =============================================================================

export const respinModeRef = { current: false };

const SPIN_STAGGER_MS = 80;
const SPIN_BASE_CYCLES = 2;
const BASE_RESPIN_COST = 100;
const RESPIN_COST_STEP = 50;

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
  respinsBought: number;
  spinningCells: Map<string, SpinCellInfo>;
  pendingSpinGrid: Grid | null;
  pendingSpinScore: number;
  pendingSpinAnimState: Partial<GameState> | null;
  loadoutFreqs: Map<string, number> | null;
  loadoutDefs: SymbolDef[] | null;
  vineSymbols: Set<string> | undefined;

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
  buyRespin: () => void;
  getNextRespinCost: () => number;
  clearSpinAnimation: () => void;
  resetGame: (config?: LevelConfig, loadoutFreqs?: Map<string, number>, loadoutDefs?: SymbolDef[]) => void;
}

export function createInitialState(config: LevelConfig = generateLevelConfig(1), loadoutFreqs?: Map<string, number>, loadoutDefs?: SymbolDef[]) {
  const queue = loadoutFreqs
    ? generateTileQueueFromFreqs(config.tilesPerLevel, loadoutFreqs)
    : generateTileQueue(config.tilesPerLevel, config.symbolCount);
  const entryCount = loadoutDefs ? getEntrySpotCount(loadoutDefs) : config.entrySpotCount;
  const spots = getEntrySpots(entryCount);
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
    respinsBought: 0,
    spinningCells: new Map<string, SpinCellInfo>(),
    pendingSpinGrid: null as Grid | null,
    pendingSpinScore: 0,
    pendingSpinAnimState: null as Partial<GameState> | null,
    loadoutFreqs: loadoutFreqs ?? null,
    loadoutDefs: loadoutDefs ?? null,
    vineSymbols: getVineSymbols(loadoutDefs ?? null),
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
    const { phase, currentTile, rotation, grid, reachableCells, loadoutDefs } = get();
    if (phase !== 'placing' || !currentTile) return;
    const vines = getVineSymbols(loadoutDefs);

    // Try current rotation first, then others
    let useRotation: Rotation | null = null;
    if (canPlaceTileWithEntry(grid, row, col, rotation, reachableCells, vines)) {
      useRotation = rotation;
    } else {
      for (let i = 1; i <= 3; i++) {
        const tryRot = ((rotation + i) % 4) as Rotation;
        if (canPlaceTileWithEntry(grid, row, col, tryRot, reachableCells, vines)) {
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
    const { phase, currentTile, rotation, grid, placementMode, reachableCells, loadoutDefs } = get();
    if (phase !== 'placing' || !currentTile || placementMode !== 'placed') return;
    if (!canPlaceTileWithEntry(grid, row, col, rotation, reachableCells, getVineSymbols(loadoutDefs))) return;

    set({ placedPosition: { row, col } });
  },

  rotatePlacedTile: () => {
    const { placementMode, placedPosition, rotation, grid, reachableCells, loadoutDefs } = get();
    if (placementMode !== 'placed' || !placedPosition) return;
    const vines = getVineSymbols(loadoutDefs);

    // Try each rotation until we find a valid one
    for (let i = 1; i <= 4; i++) {
      const newRotation = ((rotation + i) % 4) as Rotation;
      if (canPlaceTileWithEntry(grid, placedPosition.row, placedPosition.col, newRotation, reachableCells, vines)) {
        set({ rotation: newRotation });
        try { Sound.playRotate(); } catch {}
        return;
      }
    }
  },

  confirmPlacement: () => {
    const { phase, currentTile, rotation, grid, tileQueue, placementMode, placedPosition, reachableCells, loadoutDefs } = get();
    if (phase !== 'placing' || !currentTile || placementMode !== 'placed' || !placedPosition) return;

    const { row, col } = placedPosition;
    if (!canPlaceTileWithEntry(grid, row, col, rotation, reachableCells, getVineSymbols(loadoutDefs))) return;

    const [rowOffset, colOffset] = getSecondCellOffset(rotation);
    const row2 = row + rowOffset;
    const col2 = col + colOffset;

    const [symbolFirst, symbolSecond] = getSymbolsForRotation(currentTile);

    const newGrid = cloneGrid(grid);
    newGrid[row][col] = symbolFirst;
    newGrid[row2][col2] = symbolSecond;

    // Use ability-aware scoring if loadout available, otherwise fall back
    const loadout = get().loadoutDefs;
    let newTotalScore: number;
    let matches: { cells: [number, number][]; symbol: string; length: number; score: number }[];
    let effects: AbilityEffects | null = null;

    if (loadout) {
      const result = calculateScoreWithAbilities(newGrid, loadout, BOARD_SIZE);
      newTotalScore = result.score;
      matches = result.matches;
      effects = result.effects;
    } else {
      const result = calculateScore(newGrid);
      newTotalScore = result.score;
      matches = result.matches;
    }

    // Apply ability effects
    let extraTiles = 0;
    let extraRespins = 0;
    if (effects) {
      extraTiles = effects.extraTiles;
      extraRespins = effects.freeRespins;

      // Clear cells (bomb)
      for (const key of effects.cellsToClear) {
        const [cr, cc] = key.split(',').map(Number);
        if (cr >= 0 && cr < BOARD_SIZE && cc >= 0 && cc < BOARD_SIZE) {
          newGrid[cr][cc] = null;
        }
      }

      // Unlock cells (oil can)
      // Applied to lockedCells below
    }

    // Record stats for unlock tracking
    try {
      const meta = getMetaStore()?.getState();
      if (meta) {
        for (const m of matches) {
          meta.recordMatchLength(m.length);
          if (m.symbol === 'cherry') meta.recordCherryScore(m.score);
          if (m.symbol === 'bell') meta.recordBellMatch();
          // Check for fruit salad recipe matches
          if ((m as any).isRecipe && (m as any).recipeDefiner === 'apple') {
            meta.recordFruitSalad();
          }
        }
        meta.recordLockedCellCount(get().lockedCells.size + matches.reduce((n, m) => n + m.cells.length, 0));
      }
    } catch {}

    // Lock cells that are part of matches (skip no-lock symbols like ghost)
    const newLocked = new Set(get().lockedCells);
    if (loadout) {
      matches.forEach(match => {
        match.cells.forEach(([r, c]) => {
          const sym = newGrid[r][c];
          if (sym && !hasNoLock(sym as SymbolId, loadout)) {
            newLocked.add(`${r},${c}`);
          }
        });
      });
      // Apply unlock effects (oil can)
      if (effects) {
        for (const key of effects.cellsToUnlock) {
          newLocked.delete(key);
        }
      }
    } else {
      matches.forEach(match => {
        match.cells.forEach(([r, c]) => newLocked.add(`${r},${c}`));
      });
    }

    // Recalculate score after clears/unlocks if effects were applied
    if (effects && (effects.cellsToClear.size > 0 || effects.cellsToUnlock.size > 0)) {
      if (loadout) {
        newTotalScore = calculateScoreWithAbilities(newGrid, loadout, BOARD_SIZE).score;
      } else {
        newTotalScore = calculateScore(newGrid).score;
      }
    }

    // Generate extra tiles from abilities (egg)
    let newQueue = tileQueue.slice(1);
    if (extraTiles > 0) {
      const getSymbol = get().loadoutFreqs
        ? () => getRandomSymbolFromFreqs(get().loadoutFreqs!)
        : () => getRandomSymbol(get().levelConfig.symbolCount);
      for (let i = 0; i < extraTiles; i++) {
        newQueue.push({ id: `extra-${Date.now()}-${i}`, symbolA: getSymbol(), symbolB: getSymbol() });
      }
    }

    const nextTile = tileQueue[0] ?? null;
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
      const stuck = !anyEntryHasValidPlacement(newGrid, get().entrySpots, getVineSymbols(loadoutDefs));
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

    // Apply extra respins from abilities
    if (extraRespins > 0) {
      set({ respinsRemaining: get().respinsRemaining + extraRespins });
    }

    // Sound effects
    try {
      Sound.playTilePlace();
      if (matches.length > 0) {
        const maxLen = Math.max(...matches.map(m => m.length));
        setTimeout(() => {
          if (maxLen >= 5) Sound.playBigMatch();
          else Sound.playMatch();
        }, 50);
        setTimeout(() => Sound.playLock(), 200);
      }
    } catch {}

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
    const { phase, respinsRemaining, grid, score, matchingCells, spinningCells, lockedCells, loadoutFreqs } = get();
    if (phase !== 'placing' || respinsRemaining <= 0) return;
    if (index < 0 || index >= BOARD_SIZE) return;
    if (matchingCells.size > 0) return; // Block respins during animation
    if (spinningCells.size > 0) return; // Block respins during active spin

    const getSymbol = () => loadoutFreqs
      ? getRandomSymbolFromFreqs(loadoutFreqs)
      : getRandomSymbol(get().levelConfig.symbolCount);

    const matchesBefore = findMatches(grid);

    const newGrid = cloneGrid(grid);
    const newSpinningCells = new Map<string, SpinCellInfo>();

    if (type === 'row') {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (lockedCells.has(`${index},${col}`)) continue;
        if (newGrid[index][col] !== null && newGrid[index][col] !== 'wall') {
          const newSymbol = getSymbol();
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
        if (lockedCells.has(`${row},${index}`)) continue;
        if (newGrid[row][index] !== null && newGrid[row][index] !== 'wall') {
          const newSymbol = getSymbol();
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
    try { Sound.playRespin(); } catch {}
    set({
      respinsRemaining: newRespins,
      spinningCells: newSpinningCells,
      pendingSpinGrid: newGrid,
      pendingSpinScore: newScore,
      pendingSpinAnimState: animState,
    });
  },

  getNextRespinCost: () => {
    return BASE_RESPIN_COST + get().respinsBought * RESPIN_COST_STEP;
  },

  buyRespin: () => {
    const { phase, score, respinsBought, spinningCells, matchingCells } = get();
    if (phase !== 'placing') return;
    if (spinningCells.size > 0 || matchingCells.size > 0) return;
    const cost = BASE_RESPIN_COST + respinsBought * RESPIN_COST_STEP;
    if (score < cost) return;
    set({
      score: score - cost,
      respinsRemaining: get().respinsRemaining + 1,
      respinsBought: respinsBought + 1,
    });
    try { getMetaStore()?.getState()?.recordRespinBought(); } catch {}
    try { Sound.playBuyRespin(); } catch {}
  },

  clearSpinAnimation: () => {
    const { pendingSpinGrid, pendingSpinScore, pendingSpinAnimState, lockedCells, loadoutDefs } = get();
    if (!pendingSpinGrid) return;

    let finalScore = pendingSpinScore;
    const newLocked = new Set(lockedCells);

    if (loadoutDefs) {
      // Ability-aware: score, lock (respecting ghost), apply effects
      const { score, matches, effects } = calculateScoreWithAbilities(pendingSpinGrid, loadoutDefs, BOARD_SIZE);
      finalScore = score;

      // Lock matches (skip no-lock symbols like ghost)
      matches.forEach(match => {
        match.cells.forEach(([r, c]) => {
          const sym = pendingSpinGrid[r][c];
          if (sym && !hasNoLock(sym as SymbolId, loadoutDefs)) {
            newLocked.add(`${r},${c}`);
          }
        });
      });

      // Apply effects
      if (effects.cellsToClear.size > 0) {
        for (const key of effects.cellsToClear) {
          const [cr, cc] = key.split(',').map(Number);
          if (cr >= 0 && cr < BOARD_SIZE && cc >= 0 && cc < BOARD_SIZE) {
            pendingSpinGrid[cr][cc] = null;
          }
          newLocked.delete(key);
        }
        finalScore = calculateScoreWithAbilities(pendingSpinGrid, loadoutDefs, BOARD_SIZE).score;
      }
      for (const key of effects.cellsToUnlock) {
        newLocked.delete(key);
      }
      if (effects.freeRespins > 0) {
        set({ respinsRemaining: get().respinsRemaining + effects.freeRespins });
      }
      if (effects.extraTiles > 0) {
        const freqs = get().loadoutFreqs;
        const currentQueue = get().tileQueue;
        const extras = [];
        for (let i = 0; i < effects.extraTiles; i++) {
          const sym = freqs ? getRandomSymbolFromFreqs(freqs) : getRandomSymbol(get().levelConfig.symbolCount);
          const sym2 = freqs ? getRandomSymbolFromFreqs(freqs) : getRandomSymbol(get().levelConfig.symbolCount);
          extras.push({ id: `extra-spin-${Date.now()}-${i}`, symbolA: sym, symbolB: sym2 });
        }
        set({ tileQueue: [...currentQueue, ...extras] });
      }

      // Ember: bonus for respin creating new matches
      const respinBonus = getRespinMatchBonus(loadoutDefs);
      if (respinBonus > 0) {
        const newMatchCount = matches.filter(m =>
          m.cells.some(([r, c]) => !lockedCells.has(`${r},${c}`))
        ).length;
        if (newMatchCount > 0) {
          finalScore += respinBonus * newMatchCount;
        }
      }

      // Record stats
      try {
        const meta = getMetaStore()?.getState();
        if (meta) {
          for (const m of matches) {
            meta.recordMatchLength(m.length);
            if (m.symbol === 'cherry') meta.recordCherryScore(m.score);
            if (m.symbol === 'bell') meta.recordBellMatch();
          }
          meta.recordLockedCellCount(newLocked.size);
        }
      } catch {}
    } else {
      // Fallback: original behavior
      const matches = findMatches(pendingSpinGrid);
      matches.forEach(match => {
        match.cells.forEach(([r, c]) => newLocked.add(`${r},${c}`));
      });
    }

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

  resetGame: (config?: LevelConfig, loadoutFreqs?: Map<string, number>, loadoutDefs?: SymbolDef[]) =>
    set(createInitialState(
      config ?? generateLevelConfig(1),
      loadoutFreqs ?? get().loadoutFreqs ?? undefined,
      loadoutDefs ?? get().loadoutDefs ?? undefined,
    )),
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
  confirmDraft: (loadout: SymbolDef[]) => void;
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
    set({
      runPhase: 'draft',
      currentLevel: 1,
      levelScore: 0,
      levelConfig: null,
      bonusRespins: 0,
    });
  },

  confirmDraft: (loadout: SymbolDef[]) => {
    const freqs = buildFrequencyTable(loadout);
    const config = generateLevelConfig(1);
    set({ runPhase: 'levelPreview', levelConfig: config });
    useGameStore.setState({ loadoutFreqs: freqs, loadoutDefs: loadout });
  },

  startLevel: () => {
    const { levelConfig, bonusRespins } = get();
    if (!levelConfig) return;
    const config = bonusRespins > 0
      ? { ...levelConfig, respins: levelConfig.respins + bonusRespins }
      : levelConfig;
    // Preserve loadout from previous level
    const { loadoutFreqs: freqs, loadoutDefs: defs } = useGameStore.getState();
    useGameStore.getState().resetGame(config, freqs ?? undefined, defs ?? undefined);
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
      try { Sound.playLevelWin(); } catch {}
      set({ runPhase: 'gameOver', levelScore: score, bonusRespins: 0 });
      return;
    }
    try { Sound.playLevelWin(); } catch {}
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
    try { Sound.playLevelLose(); } catch {}
    set({ runPhase: 'gameOver', levelScore: score });
  },
}));
