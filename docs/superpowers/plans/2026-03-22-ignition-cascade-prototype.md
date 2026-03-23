# Ignition Cascade Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prototype the ignition cascade game loop — place tiles in batches, ignite a row/column, matches lock, propagation cascades to neighbors until chain dies, repeat.

**Architecture:** Create a playtest config module, rewrite the Zustand game store for the new batched placement → ignition → propagation loop, add locked cell state to the grid, and update UI components (Cell, HUD, PlayingScreen) for the new phases. Reuses existing SpinCell animation for both ignition and propagation. Runs on a prototype branch with GitHub Pages pointed at it.

**Tech Stack:** React Native + Expo, Zustand, react-native-svg, existing neon UI

---

### Task 1: Create Prototype Branch + Config Module

**Files:**
- Create: `src/config.ts`
- Modify: `src/constants.ts`

- [ ] **Step 1: Create prototype branch**

```bash
cd /Users/spall03/slominoes
git checkout -b prototype
```

- [ ] **Step 2: Create `src/config.ts`**

Centralizes all playtest-tunable parameters:

```typescript
// src/config.ts
// Playtest config — tweak these values to tune the game feel

export const CONFIG = {
  BOARD_SIZE: 10,
  TILES_PER_BATCH: 6,
  NUM_BATCHES: 4,
  SYMBOL_COUNT: 5,
  SYMBOL_WEIGHTS: [5, 4, 3, 2, 1],
  MIN_MATCH_LENGTH: 3,
  THRESHOLD: 2000,
  ENTRY_SPOT_COUNT: 2,
  WALL_COUNT: 0,

  // Animation timing
  SPIN_MS_PER_SYMBOL: 40,
  SPIN_STAGGER_MS: 80,
  SPIN_BASE_CYCLES: 2,
  PROPAGATION_PAUSE_MS: 400,  // pause between cascade waves
};
```

- [ ] **Step 3: Update `src/constants.ts` to read from config**

Replace hardcoded values with config imports. The key change is `BOARD_SIZE` becoming dynamic and `CELL_SIZE` adapting:

```typescript
// src/constants.ts
import { Dimensions, Platform } from 'react-native';
import type { Symbol } from './types';
import { CONFIG } from './config';

export const BOARD_SIZE = CONFIG.BOARD_SIZE;
export const TILES_PER_LEVEL = CONFIG.TILES_PER_BATCH * CONFIG.NUM_BATCHES;
export const RESPINS_PER_LEVEL = 0; // Not used in prototype
export const WIN_THRESHOLD = CONFIG.THRESHOLD;
export const MIN_MATCH_LENGTH = CONFIG.MIN_MATCH_LENGTH;

export const WALL_SCALAR = 0;
export const SCORE_COEFFICIENT = 30;
export const LEVEL_SCALAR_MAX = 2.2;
export const NUM_LEVELS = 1; // Single level for prototype

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
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/constants.ts
git commit -m "feat: add playtest config module, make board size configurable"
```

---

### Task 2: Add Locked Cells + Propagation Helpers

**Files:**
- Modify: `src/types.ts`
- Modify: `src/grid.ts`
- Modify: `src/scoring.ts`

- [ ] **Step 1: Add game phase types to `src/types.ts`**

Replace the existing `GamePhase` type and add new types:

```typescript
// Replace existing GamePhase
export type GamePhase = 'placing' | 'igniting' | 'cascading' | 'ended';

// Add:
export type CascadeWave = {
  cells: Set<string>;       // cells being respun in this wave
  waveNumber: number;
};
```

- [ ] **Step 2: Add grid helpers to `src/grid.ts`**

Add these functions at the end of the file:

```typescript
/**
 * Find all unlocked, filled neighbors of the given locked cells.
 * Returns a Set of "row,col" keys for cells that should respin.
 */
export function findUnlockedNeighbors(
  grid: Grid,
  newlyLockedCells: Set<string>,
  allLockedCells: Set<string>,
  boardSize: number = BOARD_SIZE,
): Set<string> {
  const neighbors = new Set<string>();
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const cellKey of newlyLockedCells) {
    const [r, c] = cellKey.split(',').map(Number);
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) continue;
      const key = `${nr},${nc}`;
      if (allLockedCells.has(key)) continue;  // already locked
      const cell = grid[nr][nc];
      if (cell !== null && cell !== 'wall') {
        neighbors.add(key);
      }
    }
  }

  return neighbors;
}

/**
 * Create an empty grid with configurable size.
 */
export function createEmptyGridSized(size: number): Grid {
  return Array.from({ length: size }, () => Array(size).fill(null));
}
```

- [ ] **Step 3: Add locked-aware match finding to `src/scoring.ts`**

Add a new function that finds matches only among non-locked cells (or extends existing locked matches):

```typescript
/**
 * Find matches on the grid, returning only matches that include
 * at least one unlocked cell (new matches or extensions of locked ones).
 */
export function findNewMatches(grid: Grid, lockedCells: Set<string>): Match[] {
  const allMatches = findMatches(grid);
  // Return matches that include at least one unlocked cell
  return allMatches.filter(match =>
    match.cells.some(([r, c]) => !lockedCells.has(`${r},${c}`))
  );
}

/**
 * Calculate total score from all matches involving locked cells.
 */
export function calculateLockedScore(grid: Grid, lockedCells: Set<string>): number {
  const allMatches = findMatches(grid);
  // Score matches where ALL cells are locked
  let score = 0;
  for (const match of allMatches) {
    if (match.cells.every(([r, c]) => lockedCells.has(`${r},${c}`))) {
      score += match.score;
    }
  }
  return score;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Note: there may be errors in store.ts due to GamePhase change — that's OK, we'll fix it in Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/grid.ts src/scoring.ts
git commit -m "feat: add locked cells, propagation helpers, and locked-aware scoring"
```

---

### Task 3: Rewrite Game Store for Ignition Cascade

**Files:**
- Modify: `src/store.ts`

This is the largest task — rewriting the game loop. Read the current `src/store.ts` fully before starting.

- [ ] **Step 1: Rewrite the GameState interface**

Replace the current `GameState` interface with:

```typescript
export interface GameState {
  // Grid state
  grid: Grid;
  lockedCells: Set<string>;

  // Tile state
  tileBatches: Tile[][];       // all batches for the level
  currentBatch: number;        // which batch we're on (0-indexed)
  batchQueue: Tile[];          // tiles remaining in current batch
  currentTile: Tile | null;
  rotation: Rotation;

  // Scoring
  score: number;

  // Phase
  phase: GamePhase;            // 'placing' | 'igniting' | 'cascading' | 'ended'
  result: GameResult;

  // Placement
  placementMode: PlacementMode;
  placedPosition: { row: number; col: number } | null;
  holdReady: boolean;

  // Entry points
  entrySpots: EntrySpot[];
  selectedEntry: number | null;
  reachableCells: Set<string> | null;

  // Animation
  matchingCells: Set<string>;
  highlightColor: 'gold' | 'red' | 'blue';
  scorePopups: ScorePopup[];
  pendingPhase2: { cells: Set<string>; popups: ScorePopup[] } | null;
  spinningCells: Map<string, SpinCellInfo>;
  cascadeWave: number;         // current wave number for UI display

  // Pending cascade data
  pendingGrid: Grid | null;
  pendingLockedCells: Set<string> | null;
  pendingScore: number;

  // Level config (kept for compatibility)
  levelConfig: LevelConfig;
  respinsRemaining: number;    // kept for UI compat, always 0 in prototype

  // Actions
  selectEntry: (index: number) => void;
  deselectEntry: () => void;
  startPlacement: (row: number, col: number) => void;
  movePlacement: (row: number, col: number) => void;
  rotatePlacedTile: () => void;
  confirmPlacement: () => void;
  cancelPlacement: () => void;
  setHoldReady: (ready: boolean) => void;
  ignite: (type: 'row' | 'col', index: number) => void;
  clearSpinAnimation: () => void;
  triggerMatchAnimation: (matches: Match[], newCells: [number, number][]) => void;
  clearMatchAnimation: () => void;
  removeScorePopup: (id: string) => void;
  resetGame: (config?: LevelConfig) => void;
}
```

- [ ] **Step 2: Rewrite createInitialState**

```typescript
export function createInitialState(config: LevelConfig = generateLevelConfig(1)) {
  // Generate all tile batches upfront
  const totalTiles = CONFIG.TILES_PER_BATCH * CONFIG.NUM_BATCHES;
  const allTiles = generateTileQueue(totalTiles, config.symbolCount);
  const batches: Tile[][] = [];
  for (let i = 0; i < CONFIG.NUM_BATCHES; i++) {
    batches.push(allTiles.slice(i * CONFIG.TILES_PER_BATCH, (i + 1) * CONFIG.TILES_PER_BATCH));
  }

  const firstBatch = batches[0] ?? [];
  const spots = getEntrySpots(config.entrySpotCount);

  return {
    grid: createGridFromConfig(config),
    lockedCells: new Set<string>(),
    tileBatches: batches,
    currentBatch: 0,
    batchQueue: firstBatch.slice(1),
    currentTile: firstBatch[0] ?? null,
    rotation: 0 as Rotation,
    score: 0,
    phase: 'placing' as GamePhase,
    result: null as GameResult,
    placementMode: 'idle' as PlacementMode,
    placedPosition: null as { row: number; col: number } | null,
    holdReady: false,
    entrySpots: spots,
    selectedEntry: null as number | null,
    reachableCells: null as Set<string> | null,
    matchingCells: new Set<string>(),
    highlightColor: 'gold' as 'gold' | 'red' | 'blue',
    scorePopups: [] as ScorePopup[],
    pendingPhase2: null as { cells: Set<string>; popups: ScorePopup[] } | null,
    spinningCells: new Map<string, SpinCellInfo>(),
    cascadeWave: 0,
    pendingGrid: null as Grid | null,
    pendingLockedCells: null as Set<string> | null,
    pendingScore: 0,
    levelConfig: config,
    respinsRemaining: 0,
  };
}
```

Import `CONFIG` from `./config` at the top of store.ts.

- [ ] **Step 3: Rewrite confirmPlacement for batched flow**

The key change: when the last tile in a batch is placed, transition to `'igniting'` phase instead of ending. No scoring during placement.

```typescript
  confirmPlacement: () => {
    const { phase, currentTile, rotation, grid, batchQueue, placementMode, placedPosition, reachableCells, currentBatch } = get();
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
    const batchComplete = nextTile === null;

    if (batchComplete) {
      // Batch done — transition to igniting phase
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
      // More tiles in batch
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
```

- [ ] **Step 4: Add ignite action**

This replaces `respinLine`. It respins all filled, unlocked cells in a row/column, then checks for matches to lock.

```typescript
  ignite: (type: 'row' | 'col', index: number) => {
    const { phase, grid, lockedCells, spinningCells } = get();
    if (phase !== 'igniting') return;
    if (spinningCells.size > 0) return;

    const newGrid = cloneGrid(grid);
    const cellPositions: { row: number; col: number; pos: number }[] = [];

    if (type === 'row') {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const key = `${index},${col}`;
        if (newGrid[index][col] !== null && newGrid[index][col] !== 'wall' && !lockedCells.has(key)) {
          newGrid[index][col] = getRandomSymbol(CONFIG.SYMBOL_COUNT);
          cellPositions.push({ row: index, col, pos: col });
        }
      }
    } else {
      for (let row = 0; row < BOARD_SIZE; row++) {
        const key = `${row},${index}`;
        if (newGrid[row][index] !== null && newGrid[row][index] !== 'wall' && !lockedCells.has(key)) {
          newGrid[row][index] = getRandomSymbol(CONFIG.SYMBOL_COUNT);
          cellPositions.push({ row, col: index, pos: row });
        }
      }
    }

    if (cellPositions.length === 0) return; // nothing to spin

    const newSpinningCells = new Map<string, SpinCellInfo>();
    cellPositions.forEach(({ row, col, pos }) => {
      newSpinningCells.set(`${row},${col}`, {
        finalSymbol: newGrid[row][col]!,
        cycles: CONFIG.SPIN_BASE_CYCLES + pos,
        delay: pos * CONFIG.SPIN_STAGGER_MS,
      });
    });

    set({
      phase: 'cascading',
      spinningCells: newSpinningCells,
      pendingGrid: newGrid,
      cascadeWave: 1,
    });
  },
```

- [ ] **Step 5: Rewrite clearSpinAnimation for cascade propagation**

This is the heart of the cascade. After spin animation completes, check for matches, lock them, find neighbors, and start the next propagation wave — or end the cascade.

```typescript
  clearSpinAnimation: () => {
    const { pendingGrid, lockedCells, currentBatch, tileBatches } = get();
    if (!pendingGrid) return;

    // Apply the pending grid
    const grid = pendingGrid;

    // Find new matches (matches with at least one unlocked cell)
    const newMatches = findNewMatches(grid, lockedCells);

    if (newMatches.length === 0) {
      // No new matches — cascade ends
      // Calculate total score from all locked matches
      const totalScore = calculateLockedScore(grid, lockedCells);

      // Check if there are more batches
      const nextBatchIndex = currentBatch + 1;
      if (nextBatchIndex >= tileBatches.length) {
        // Level complete
        set({
          grid,
          spinningCells: new Map(),
          pendingGrid: null,
          score: totalScore,
          phase: 'ended',
          result: totalScore >= get().levelConfig.threshold ? 'win' : 'lose',
          cascadeWave: 0,
        });
      } else {
        // Start next batch
        const nextBatch = tileBatches[nextBatchIndex];
        set({
          grid,
          spinningCells: new Map(),
          pendingGrid: null,
          score: totalScore,
          phase: 'placing',
          currentBatch: nextBatchIndex,
          batchQueue: nextBatch.slice(1),
          currentTile: nextBatch[0] ?? null,
          rotation: 0 as Rotation,
          cascadeWave: 0,
          selectedEntry: null,
          reachableCells: null,
        });
      }
      return;
    }

    // Lock the matched cells
    const newLockedCells = new Set(lockedCells);
    const justLocked = new Set<string>();
    for (const match of newMatches) {
      for (const [r, c] of match.cells) {
        const key = `${r},${c}`;
        if (!newLockedCells.has(key)) {
          justLocked.add(key);
        }
        newLockedCells.add(key);
      }
    }

    // Calculate updated score
    const newScore = calculateLockedScore(grid, newLockedCells);

    // Find unlocked neighbors of newly locked cells for next propagation wave
    const neighborsToSpin = findUnlockedNeighbors(grid, justLocked, newLockedCells, BOARD_SIZE);

    if (neighborsToSpin.size === 0) {
      // No neighbors to propagate — cascade ends
      const nextBatchIndex = currentBatch + 1;
      if (nextBatchIndex >= tileBatches.length) {
        set({
          grid,
          lockedCells: newLockedCells,
          spinningCells: new Map(),
          pendingGrid: null,
          score: newScore,
          phase: 'ended',
          result: newScore >= get().levelConfig.threshold ? 'win' : 'lose',
          cascadeWave: 0,
          matchingCells: justLocked,
          highlightColor: 'gold',
        });
      } else {
        const nextBatch = tileBatches[nextBatchIndex];
        set({
          grid,
          lockedCells: newLockedCells,
          spinningCells: new Map(),
          pendingGrid: null,
          score: newScore,
          phase: 'placing',
          currentBatch: nextBatchIndex,
          batchQueue: nextBatch.slice(1),
          currentTile: nextBatch[0] ?? null,
          rotation: 0 as Rotation,
          cascadeWave: 0,
          selectedEntry: null,
          reachableCells: null,
          matchingCells: justLocked,
          highlightColor: 'gold',
        });
      }
      return;
    }

    // Propagate: respin neighbors
    const nextGrid = cloneGrid(grid);
    const newSpinningCells = new Map<string, SpinCellInfo>();
    let pos = 0;
    for (const key of neighborsToSpin) {
      const [r, c] = key.split(',').map(Number);
      nextGrid[r][c] = getRandomSymbol(CONFIG.SYMBOL_COUNT);
      newSpinningCells.set(key, {
        finalSymbol: nextGrid[r][c]!,
        cycles: CONFIG.SPIN_BASE_CYCLES + Math.floor(pos / 2),
        delay: pos * CONFIG.SPIN_STAGGER_MS,
      });
      pos++;
    }

    set({
      grid,
      lockedCells: newLockedCells,
      spinningCells: newSpinningCells,
      pendingGrid: nextGrid,
      score: newScore,
      cascadeWave: get().cascadeWave + 1,
      matchingCells: justLocked,
      highlightColor: 'gold',
    });
  },
```

- [ ] **Step 6: Remove old respinLine action**

Delete the `respinLine` action from the store. Replace with a stub that calls `ignite` for backward compatibility, or just remove it entirely and fix any references later.

```typescript
  // Remove respinLine entirely — replaced by ignite
```

- [ ] **Step 7: Keep remaining actions mostly unchanged**

The following actions stay the same or need minor tweaks:
- `selectEntry`, `deselectEntry`, `startPlacement`, `movePlacement`, `rotatePlacedTile`, `cancelPlacement`, `setHoldReady` — keep as-is
- `triggerMatchAnimation`, `clearMatchAnimation`, `removeScorePopup` — keep as-is
- `resetGame` — keep as-is (uses createInitialState)

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Fix any type errors from the interface changes.

- [ ] **Step 9: Commit**

```bash
git add src/store.ts
git commit -m "feat: rewrite game store for ignition cascade loop (batched placement, ignite, propagate, lock)"
```

---

### Task 4: Add Locked Cell Visual State

**Files:**
- Modify: `src/components/Cell.tsx`

- [ ] **Step 1: Add `isLocked` prop to Cell**

Add to the `CellProps` interface:

```typescript
  isLocked?: boolean;
```

- [ ] **Step 2: Add locked cell styling**

In the Cell component, apply a locked style when `isLocked` is true:

```typescript
// In the style array for the cell container:
isLocked && styles.lockedCell,
```

Add to the StyleSheet:

```typescript
  lockedCell: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.6)',
  },
```

The locked cell should have a persistent gold tint — subtle but clearly distinct from normal filled cells.

- [ ] **Step 3: Locked cells should not show the web glow filter**

Locked cells already have their own visual treatment. The drop-shadow glow from Task 7 of the UI redesign should still apply (it looks good on locked cells too).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/components/Cell.tsx
git commit -m "feat: add locked cell visual state with gold tint"
```

---

### Task 5: Update Grid to Pass Locked State + Use Ignite

**Files:**
- Modify: `src/components/Grid.tsx`

- [ ] **Step 1: Read lockedCells from store**

Add `lockedCells` to the destructured store values:

```typescript
  const {
    // ... existing ...
    lockedCells,
  } = useGameStore();
```

- [ ] **Step 2: Pass isLocked to Cell components**

In the cell rendering loop, check if the cell is locked:

```tsx
<Cell
  // ... existing props ...
  isLocked={lockedCells.has(cellKey)}
/>
```

- [ ] **Step 3: Don't render SpinCell for locked cells**

In the SpinCell check, ensure locked cells are never spun (the store should already prevent this, but belt-and-suspenders):

```tsx
if (spinInfo && !lockedCells.has(cellKey)) {
  return <SpinCell ... />;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/components/Grid.tsx
git commit -m "feat: pass locked state to cells, guard SpinCell against locked cells"
```

---

### Task 6: Update PlayingScreen for Ignition Phases

**Files:**
- Modify: `src/components/PlayingScreen.tsx`
- Modify: `src/components/HUD.tsx`
- Modify: `src/components/BottomBar.tsx`

- [ ] **Step 1: Update HUD props**

Modify `src/components/HUD.tsx` to accept batch info instead of respin info:

```typescript
interface HUDProps {
  level: number;
  score: number;
  threshold: number;
  batch: number;         // current batch (1-indexed for display)
  totalBatches: number;
  cascadeWave: number;   // 0 when not cascading
  phase: string;
}
```

Update the HUD rendering:
- Replace respin badge with batch counter: "Batch 2/4"
- During cascade, show wave counter: "CHAIN x3"
- Progress bar still shows score/threshold

- [ ] **Step 2: Update PlayingScreen for phase-based UI**

Key changes to `src/components/PlayingScreen.tsx`:

**During `placing` phase:**
- Show tile preview in BottomBar
- Show "Place tiles (3/6)" counter
- Hide respin/ignite buttons
- Entry point buttons visible

**During `igniting` phase:**
- Hide tile preview
- Show "CHOOSE A ROW OR COLUMN TO IGNITE" hint
- Show respin buttons (now ignite buttons) — call `ignite()` instead of `respinLine()`
- Entry point buttons hidden

**During `cascading` phase:**
- Everything disabled
- Show "CHAIN x{wave}" in HUD
- Score counter animating up

**During `ended` phase:**
- Same as current game over overlay

Replace references to `respinLine` with `ignite`:

```typescript
const { ignite } = useGameStore();
// ...
onPress={() => ignite('col', col)}
// ...
onPress={() => ignite('row', row)}
```

Remove `respinMode` state and related logic — there's no toggle anymore. Ignite buttons show only during `igniting` phase.

- [ ] **Step 3: Update BottomBar for batch placement**

Modify `src/components/BottomBar.tsx` to show batch progress:
- "3/6 placed" or "3 left" for the current batch
- Hide respin toggle (not applicable)

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/components/PlayingScreen.tsx src/components/HUD.tsx src/components/BottomBar.tsx
git commit -m "feat: update PlayingScreen, HUD, BottomBar for ignition cascade phases"
```

---

### Task 7: Update Level Generation + Run Store

**Files:**
- Modify: `src/level.ts`
- Modify: `src/store.ts` (RunState section)

- [ ] **Step 1: Update generateLevelConfig for prototype**

Modify `src/level.ts` `generateLevelConfig` to use CONFIG values:

```typescript
import { CONFIG } from './config';

export function generateLevelConfig(level: number): LevelConfig {
  const boardSize = CONFIG.BOARD_SIZE;
  const wallCount = CONFIG.WALL_COUNT;

  const entryCells = new Set<string>();
  // Entry cells need to adapt to board size — center of top/bottom edges
  const mid = Math.floor(boardSize / 2);
  entryCells.add(`0,${mid - 1}`);
  entryCells.add(`0,${mid}`);
  entryCells.add(`${boardSize - 1},${mid - 1}`);
  entryCells.add(`${boardSize - 1},${mid}`);

  const obstacles: ObstacleCell[] = [];
  const usedPositions = new Set<string>();
  while (obstacles.length < wallCount) {
    const row = Math.floor(Math.random() * boardSize);
    const col = Math.floor(Math.random() * boardSize);
    const key = `${row},${col}`;
    if (entryCells.has(key) || usedPositions.has(key)) continue;
    usedPositions.add(key);
    obstacles.push({ row, col, symbol: 'wall' });
  }

  const playableCells = boardSize * boardSize - wallCount;
  const threshold = CONFIG.THRESHOLD;

  return {
    level,
    threshold,
    respins: 0,
    tilesPerLevel: CONFIG.TILES_PER_BATCH * CONFIG.NUM_BATCHES,
    symbolCount: CONFIG.SYMBOL_COUNT,
    obstacles,
    entrySpotCount: CONFIG.ENTRY_SPOT_COUNT,
    boardMask: null,
  };
}
```

- [ ] **Step 2: Update getEntrySpots for dynamic board size**

The entry spot positions need to use `CONFIG.BOARD_SIZE` instead of hardcoded 8:

```typescript
export function getEntrySpots(count: number): EntrySpot[] {
  const size = CONFIG.BOARD_SIZE;
  const mid = Math.floor(size / 2);
  const all: EntrySpot[] = [
    { id: 0, label: 'Top', cells: [[0, mid - 1], [0, mid]], arrowDirection: 'down' },
    { id: 1, label: 'Bottom', cells: [[size - 1, mid - 1], [size - 1, mid]], arrowDirection: 'up' },
    { id: 2, label: 'Left', cells: [[mid - 1, 0], [mid, 0]], arrowDirection: 'right' },
    { id: 3, label: 'Right', cells: [[mid - 1, size - 1], [mid, size - 1]], arrowDirection: 'left' },
  ];
  if (count <= 1) return [all[0]];
  if (count === 2) return [all[0], all[1]];
  return all;
}
```

- [ ] **Step 3: Simplify RunState for prototype**

The prototype only has one level. Simplify `useRunStore` so `startRun` goes straight to `playing` (skip `levelPreview`):

```typescript
  startRun: () => {
    const config = generateLevelConfig(1);
    useGameStore.getState().resetGame(config);
    set({
      runPhase: 'playing',
      currentLevel: 1,
      levelScore: 0,
      levelConfig: config,
      bonusRespins: 0,
    });
  },
```

- [ ] **Step 4: Wire up level completion**

In store.ts, when the cascade ends and all batches are done (the `'ended'` transitions in `clearSpinAnimation`), call `useRunStore.getState().failLevel()` or a new `completeLevel` that goes to `gameOver`:

The existing `completeLevel` and `failLevel` on RunState should work — they set `runPhase: 'gameOver'`. Just make sure the `ended` phase in GameState triggers the RunState transition. This can be done by calling the run store from the `clearSpinAnimation` action when transitioning to `ended`.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/level.ts src/store.ts
git commit -m "feat: update level generation and run store for prototype (dynamic board, single level)"
```

---

### Task 8: Test, Fix, Deploy

**Files:**
- Various fixes as needed

- [ ] **Step 1: Run the app**

```bash
cd /Users/spall03/slominoes
npx expo start --web
```

Play through the full loop:
1. Title screen → "New Game"
2. Place 6 tiles (batch 1)
3. Choose a row/column to ignite
4. Watch cascade: spins → matches lock (gold tint) → neighbors spin → repeat
5. After cascade ends, place next batch
6. Repeat for all 4 batches
7. Game over screen with final score

- [ ] **Step 2: Fix any issues found during playtest**

Common issues to watch for:
- TypeScript errors from interface changes
- Cells not rendering at correct size for 10x10 grid
- Ignite buttons not appearing during igniting phase
- Cascade not propagating (check `findUnlockedNeighbors` logic)
- Score not updating
- Locked cells not displaying correctly
- Batch transition not working (stuck in igniting phase)
- Entry points positioned wrong for 10x10 grid

- [ ] **Step 3: Production build**

```bash
npx expo export --platform web
```

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: ignition cascade prototype — playable"
git push origin prototype
```

- [ ] **Step 5: Switch GitHub Pages to prototype branch**

Go to GitHub repo Settings → Pages → Source → change branch from `main` to `prototype`. Save. Wait for deploy.

Note: this is a manual step in the GitHub UI — inform the user to do this.
