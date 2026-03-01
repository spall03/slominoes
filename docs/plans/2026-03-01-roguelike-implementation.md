# Slominoes Roguelike Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the single-level Slominoes prototype into a 10-level permadeath roguelike with relics, shops, and escalating difficulty.

**Architecture:** All code stays in `App.tsx` (single-file game). We add a `RunState` store alongside the existing `GameState` store. The run store owns level progression, coins, relics, and screen navigation. The game store is reset per level using config from the run store. New screen components render based on `runPhase`.

**Tech Stack:** React Native + Expo, Zustand, react-native-gesture-handler, expo-haptics.

**Design doc:** `docs/plans/2026-03-01-roguelike-design.md`

---

## Phase 1: Level Config System

Make the current game configurable so each level can have different parameters.

### Task 1: Add LevelConfig type and LEVEL_CONFIGS constant

**Files:**
- Modify: `App.tsx` — add after ENTRY_SPOTS section (~line 56)

**Step 1: Add the types and data**

After the `ENTRY_SPOTS` constant, add:

```typescript
// =============================================================================
// LEVEL CONFIGURATION
// =============================================================================

interface ObstacleCell {
  row: number;
  col: number;
  symbol: Symbol | 'wall'; // 'wall' = permanently filled, can't be respun
}

interface LevelConfig {
  level: number;
  threshold: number;
  respins: number;
  tilesPerLevel: number;
  symbolCount: number;        // how many of the SYMBOLS array to use (3-7)
  obstacles: ObstacleCell[];
  entrySpotCount: number;     // 1, 2, or 4
  boardMask: boolean[][] | null; // null = full 8x8, or true=playable false=blocked
}

const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1,  threshold: 2500, respins: 4, tilesPerLevel: 15, symbolCount: 5, obstacles: [], entrySpotCount: 2, boardMask: null },
  { level: 2,  threshold: 3000, respins: 4, tilesPerLevel: 15, symbolCount: 5, obstacles: [{ row: 2, col: 2, symbol: 'wall' }, { row: 5, col: 5, symbol: 'wall' }], entrySpotCount: 2, boardMask: null },
  { level: 3,  threshold: 3500, respins: 4, tilesPerLevel: 15, symbolCount: 5, obstacles: [{ row: 1, col: 1, symbol: 'wall' }, { row: 1, col: 6, symbol: 'wall' }, { row: 6, col: 1, symbol: 'wall' }, { row: 6, col: 6, symbol: 'wall' }], entrySpotCount: 2, boardMask: null },
  { level: 4,  threshold: 4000, respins: 3, tilesPerLevel: 15, symbolCount: 6, obstacles: [{ row: 0, col: 0, symbol: 'wall' }, { row: 0, col: 7, symbol: 'wall' }, { row: 3, col: 3, symbol: 'wall' }, { row: 3, col: 4, symbol: 'wall' }, { row: 4, col: 3, symbol: 'wall' }, { row: 4, col: 4, symbol: 'wall' }], entrySpotCount: 2, boardMask: null },
  { level: 5,  threshold: 4500, respins: 3, tilesPerLevel: 15, symbolCount: 6, obstacles: [{ row: 0, col: 0, symbol: 'wall' }, { row: 0, col: 7, symbol: 'wall' }, { row: 7, col: 0, symbol: 'wall' }, { row: 7, col: 7, symbol: 'wall' }, { row: 2, col: 4, symbol: 'wall' }, { row: 4, col: 2, symbol: 'wall' }, { row: 3, col: 5, symbol: 'wall' }, { row: 5, col: 3, symbol: 'wall' }], entrySpotCount: 2, boardMask: null },
  { level: 6,  threshold: 5000, respins: 3, tilesPerLevel: 15, symbolCount: 6, obstacles: [], entrySpotCount: 2, boardMask: (() => { const m = Array.from({length: 8}, () => Array(8).fill(true)); m[0][0]=false; m[0][1]=false; m[1][0]=false; m[0][6]=false; m[0][7]=false; m[1][7]=false; m[7][0]=false; m[7][1]=false; m[6][0]=false; m[7][6]=false; m[7][7]=false; m[6][7]=false; return m; })() },
  { level: 7,  threshold: 6000, respins: 2, tilesPerLevel: 15, symbolCount: 7, obstacles: [{ row: 1, col: 1, symbol: 'wall' }, { row: 1, col: 3, symbol: 'wall' }, { row: 1, col: 5, symbol: 'wall' }, { row: 3, col: 1, symbol: 'wall' }, { row: 3, col: 6, symbol: 'wall' }, { row: 5, col: 1, symbol: 'wall' }, { row: 5, col: 3, symbol: 'wall' }, { row: 5, col: 5, symbol: 'wall' }, { row: 6, col: 2, symbol: 'wall' }, { row: 6, col: 6, symbol: 'wall' }], entrySpotCount: 2, boardMask: null },
  { level: 8,  threshold: 7000, respins: 2, tilesPerLevel: 15, symbolCount: 7, obstacles: [], entrySpotCount: 1, boardMask: (() => { const m = Array.from({length: 8}, () => Array(8).fill(true)); for (let r = 0; r < 4; r++) for (let c = 4; c < 8; c++) m[r][c] = false; return m; })() },
  { level: 9,  threshold: 8000, respins: 2, tilesPerLevel: 15, symbolCount: 7, obstacles: [{ row: 2, col: 2, symbol: 'wall' }, { row: 2, col: 5, symbol: 'wall' }, { row: 5, col: 2, symbol: 'wall' }, { row: 5, col: 5, symbol: 'wall' }], entrySpotCount: 2, boardMask: null },
  { level: 10, threshold: 9500, respins: 2, tilesPerLevel: 15, symbolCount: 7, obstacles: [{ row: 0, col: 0, symbol: 'wall' }, { row: 0, col: 7, symbol: 'wall' }, { row: 7, col: 0, symbol: 'wall' }, { row: 7, col: 7, symbol: 'wall' }, { row: 3, col: 3, symbol: 'wall' }, { row: 3, col: 4, symbol: 'wall' }, { row: 4, col: 3, symbol: 'wall' }, { row: 4, col: 4, symbol: 'wall' }], entrySpotCount: 1, boardMask: null },
];
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: clean

**Step 3: Commit**

```
git add App.tsx && git commit -m "feat: add LevelConfig type and LEVEL_CONFIGS data"
```

---

### Task 2: Make symbol pool configurable

**Files:**
- Modify: `App.tsx` — `getRandomSymbol` (~line 82), `generateTileQueue` (~line 100)

**Step 1: Update getRandomSymbol to accept a pool**

Change `getRandomSymbol` to accept an optional symbol count:

```typescript
function getRandomSymbol(symbolCount: number = SYMBOLS.length): Symbol {
  const count = Math.min(symbolCount, SYMBOLS.length);
  return SYMBOLS[Math.floor(Math.random() * count)];
}
```

**Step 2: Update generateTileQueue to accept config**

```typescript
function generateTileQueue(tilesPerLevel: number = TILES_PER_LEVEL, symbolCount: number = SYMBOLS.length): Tile[] {
  return Array.from({ length: tilesPerLevel }, (_, i) =>
    generateTile(`tile-${i}`, symbolCount)
  );
}

function generateTile(id: string, symbolCount: number = SYMBOLS.length): Tile {
  return { id, symbolA: getRandomSymbol(symbolCount), symbolB: getRandomSymbol(symbolCount) };
}
```

**Step 3: Verify no TypeScript errors, test in browser**

Run: `npx tsc --noEmit`
Then: `npx expo start --web` — confirm game still works with defaults.

**Step 4: Commit**

```
git add App.tsx && git commit -m "feat: make symbol pool and tile count configurable"
```

---

### Task 3: Make grid setup configurable (obstacles + board mask)

**Files:**
- Modify: `App.tsx` — `createEmptyGrid` (~line 110), `AnimatedCell` (~line 732)

**Step 1: Update createEmptyGrid to accept LevelConfig**

```typescript
function createGridFromConfig(config: LevelConfig): Grid {
  const grid = createEmptyGrid();

  // Apply board mask — mark non-playable cells with a sentinel
  // We use 'wall' obstacles for masked cells
  if (config.boardMask) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!config.boardMask[r][c]) {
          grid[r][c] = 'wall' as Symbol; // sentinel — treated as filled, never matched
        }
      }
    }
  }

  // Place obstacle cells
  for (const obs of config.obstacles) {
    if (obs.symbol === 'wall') {
      grid[obs.row][obs.col] = 'wall' as Symbol;
    } else {
      grid[obs.row][obs.col] = obs.symbol;
    }
  }

  return grid;
}
```

**Step 2: Add 'wall' to Symbol display and scoring**

Add to `SYMBOL_DISPLAY`: `wall: '🧱'` (or a block character).
Add to `SYMBOL_VALUES`: `wall: 0`.
Add `'wall'` to the `Symbol` type union.

Update `findMatches` to skip `'wall'` cells (treat as null for matching purposes — walls don't form matches).

**Step 3: Update AnimatedCell to render wall cells distinctly**

Wall cells should look like filled/blocked cells with a dark stone-like appearance — not empty, not matchable.

**Step 4: Make respinLine skip wall cells**

In `respinLine` (~line 455), when re-randomizing cells, skip cells that are `'wall'`:

```typescript
if (newGrid[index][col] !== null && newGrid[index][col] !== 'wall') {
  newGrid[index][col] = getRandomSymbol(/* symbolCount from config */);
}
```

**Step 5: Verify — place game with obstacles, confirm walls render, can't be placed on, can't be respun**

Run: `npx expo start --web`

**Step 6: Commit**

```
git add App.tsx && git commit -m "feat: configurable grid with obstacles and board masks"
```

---

### Task 4: Make entry spot count configurable

**Files:**
- Modify: `App.tsx` — `ENTRY_SPOTS` usage, `createInitialState`

**Step 1: Add function to get entry spots for a config**

```typescript
function getEntrySpots(count: number): EntrySpot[] {
  const all: EntrySpot[] = [
    { id: 0, label: 'Top', cells: [[0, 3], [0, 4]], arrowDirection: 'down' },
    { id: 1, label: 'Bottom', cells: [[7, 3], [7, 4]], arrowDirection: 'up' },
    { id: 2, label: 'Left', cells: [[3, 0], [4, 0]], arrowDirection: 'right' },
    { id: 3, label: 'Right', cells: [[3, 7], [4, 7]], arrowDirection: 'left' },
  ];
  if (count === 1) return [all[0]];
  if (count === 2) return [all[0], all[1]];
  return all;
}
```

**Step 2: Update createInitialState to accept LevelConfig**

```typescript
function createInitialState(config?: LevelConfig) {
  const cfg = config ?? LEVEL_CONFIGS[0];
  const queue = generateTileQueue(cfg.tilesPerLevel, cfg.symbolCount);
  const spots = getEntrySpots(cfg.entrySpotCount);
  return {
    grid: createGridFromConfig(cfg),
    tileQueue: queue.slice(1),
    currentTile: queue[0] ?? null,
    rotation: 0 as Rotation,
    respinsRemaining: cfg.respins,
    // ... rest unchanged, but use cfg.threshold for WIN_THRESHOLD references
    entrySpots: spots,
    // ... rest of existing fields
  };
}
```

**Step 3: Store the current level config in GameState**

Add `levelConfig: LevelConfig` to the `GameState` interface and to `createInitialState` return.

**Step 4: Replace all `WIN_THRESHOLD` references with `state.levelConfig.threshold`**

Search for `WIN_THRESHOLD` in the file and replace with `levelConfig.threshold` where applicable (game over check, display text).

**Step 5: Replace hardcoded `TILES_PER_LEVEL` and `RESPINS_PER_LEVEL` references similarly**

Use `levelConfig.tilesPerLevel` and `levelConfig.respins` respectively.

**Step 6: Update `resetGame` to accept optional LevelConfig**

```typescript
resetGame: (config?: LevelConfig) => set(createInitialState(config)),
```

**Step 7: Verify — test game with different LEVEL_CONFIGS entries**

Temporarily change the default config index to test a harder level. Confirm obstacles render, threshold displays correctly, respin count is right.

**Step 8: Commit**

```
git add App.tsx && git commit -m "feat: game state driven by LevelConfig — threshold, respins, symbols, entries all configurable"
```

---

## Phase 2: Run State & Level Progression

### Task 5: Add RunState store

**Files:**
- Modify: `App.tsx` — add new Zustand store after GameState store (~line 710)

**Step 1: Define run types and store**

```typescript
// =============================================================================
// RUN STATE (ZUSTAND)
// =============================================================================

type RunPhase = 'title' | 'levelPreview' | 'playing' | 'reward' | 'shop' | 'victory' | 'gameOver';

interface Relic {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'scoring' | 'resource' | 'placement' | 'defensive';
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  cost: number;
  type: 'relic' | 'respins' | 'intel' | 'tileReroll' | 'entryUnlock';
  relic?: Relic;
}

interface RunState {
  runPhase: RunPhase;
  currentLevel: number;
  coins: number;
  relics: Relic[];
  levelScore: number;        // score from just-completed level
  levelRespinsLeft: number;  // respins remaining when level ended
  rewardChoices: Relic[];    // 3 relics to pick from
  shopItems: ShopItem[];

  startRun: () => void;
  startLevel: () => void;
  completeLevel: (score: number, respinsLeft: number) => void;
  failLevel: (score: number) => void;
  pickRelic: (relic: Relic) => void;
  buyShopItem: (itemId: string) => void;
  skipShop: () => void;
  advanceFromReward: () => void;
}
```

**Step 2: Implement the store**

Key logic:
- `startRun`: reset to level 1, 0 coins, no relics, phase='levelPreview'
- `startLevel`: set phase='playing', call `useGameStore.getState().resetGame(LEVEL_CONFIGS[currentLevel - 1])`
- `completeLevel(score, respinsLeft)`: calculate coins = `50 + Math.max(0, score - threshold) + respinsLeft * 200`. Set phase='reward', generate 3 random relic choices.
- `failLevel`: check for Safety Net relic. If has it, consume it and retry. Otherwise phase='gameOver'.
- `pickRelic`: add to inventory, call `advanceFromReward`
- `advanceFromReward`: if levels 3/6/9, go to shop. Otherwise go to levelPreview for next level. If level 10, go to victory.
- `buyShopItem`: deduct coins, apply item
- `skipShop`: advance to levelPreview

**Step 3: Commit**

```
git add App.tsx && git commit -m "feat: add RunState store with level progression and coin economy"
```

---

### Task 6: Wire game completion into run state

**Files:**
- Modify: `App.tsx` — `respinLine` action (~line 526), `confirmPlacement` (~line 446), App component

**Step 1: Update game end conditions to notify run store**

When `phase` transitions to `'ended'`:
- If `result === 'win'`: call `useRunStore.getState().completeLevel(score, respinsRemaining)`
- If `result === 'lose'`: call `useRunStore.getState().failLevel(score)`

This happens in two places:
1. `respinLine` — when `newRespins === 0`
2. The existing win/lose check

**Step 2: Remove the old "Play Again" button from the ended phase**

The run store now controls what happens after a level ends.

**Step 3: Verify — win a level, confirm it transitions to reward screen state**

**Step 4: Commit**

```
git add App.tsx && git commit -m "feat: wire game end into run state for level progression"
```

---

## Phase 3: Between-Level Screens

### Task 7: Title screen component

**Files:**
- Modify: `App.tsx` — new component, update App render

**Step 1: Create TitleScreen component**

Simple screen: game title, "New Run" button that calls `useRunStore.getState().startRun()`.

**Step 2: Update App to render based on runPhase**

```typescript
export default function App() {
  const { runPhase } = useRunStore();
  // ... existing code ...

  // Top-level screen switch
  if (runPhase === 'title') return <TitleScreen />;
  if (runPhase === 'levelPreview') return <LevelPreviewScreen />;
  if (runPhase === 'reward') return <RewardScreen />;
  if (runPhase === 'shop') return <ShopScreen />;
  if (runPhase === 'victory') return <VictoryScreen />;
  if (runPhase === 'gameOver') return <GameOverScreen />;

  // runPhase === 'playing' — existing game UI
  return (/* existing game render */);
}
```

Wrap each screen in `<GestureHandlerRootView>` and `<SafeAreaView>` for consistent chrome.

**Step 3: Commit**

```
git add App.tsx && git commit -m "feat: add title screen and runPhase-based screen routing"
```

---

### Task 8: Level preview screen

**Files:**
- Modify: `App.tsx` — new component

**Step 1: Create LevelPreviewScreen**

Shows:
- "Level N" heading
- Threshold to beat
- Number of respins
- Number of symbols
- Entry spot count
- Mini grid preview showing obstacle layout (small static render, no interaction)
- "Start Level" button → `useRunStore.getState().startLevel()`
- Current coins and relic count displayed

**Step 2: Commit**

```
git add App.tsx && git commit -m "feat: add level preview screen with board layout"
```

---

### Task 9: Reward screen (relic pick)

**Files:**
- Modify: `App.tsx` — new component

**Step 1: Define ALL_RELICS constant**

```typescript
const ALL_RELICS: Relic[] = [
  { id: 'lucky7s', name: 'Lucky 7s', description: 'Seven symbols score 2x', emoji: '7️⃣', category: 'scoring' },
  { id: 'comboKing', name: 'Combo King', description: '4+ matches get extra multiplier', emoji: '👑', category: 'scoring' },
  { id: 'greed', name: 'Greed', description: 'Surplus coins x1.5', emoji: '💰', category: 'scoring' },
  { id: 'extraSpin', name: 'Extra Spin', description: '+1 respin per level', emoji: '🔄', category: 'resource' },
  { id: 'crystalBall', name: 'Crystal Ball', description: 'See 2 tiles ahead', emoji: '🔮', category: 'resource' },
  { id: 'wideEntry', name: 'Wide Entry', description: 'Entry spots span 3 columns', emoji: '🚪', category: 'resource' },
  { id: 'wildcard', name: 'Wildcard', description: 'Every 5th tile has a wild symbol', emoji: '🃏', category: 'placement' },
  { id: 'rotateFree', name: 'Rotate Free', description: 'Auto-rotate to best fit', emoji: '🔃', category: 'placement' },
  { id: 'pathfinder', name: 'Pathfinder', description: 'BFS passes through 1 filled cell', emoji: '🧭', category: 'placement' },
  { id: 'safetyNet', name: 'Safety Net', description: 'Survive one failed level', emoji: '🛡️', category: 'defensive' },
  { id: 'overflow', name: 'Overflow', description: 'Excess score = bonus coins', emoji: '📈', category: 'defensive' },
];
```

**Step 2: Create RewardScreen component**

Shows:
- "Level N Complete!" heading
- Score breakdown: score, threshold, surplus coins, respin bonus coins
- Total coins earned
- 3 relic cards to pick from (name, emoji, description)
- Tapping a card calls `useRunStore.getState().pickRelic(relic)`

**Step 3: Generate relic choices in completeLevel**

Pick 3 random relics the player doesn't already own. If fewer than 3 available, show what's left.

**Step 4: Commit**

```
git add App.tsx && git commit -m "feat: add reward screen with relic selection"
```

---

### Task 10: Game over screen

**Files:**
- Modify: `App.tsx` — new component

**Step 1: Create GameOverScreen**

Shows:
- "Run Over" heading
- Level reached: N / 10
- Final score from the failed level
- Relics collected (emoji row)
- Coins earned that run (total across all levels)
- "Run Again" button → `useRunStore.getState().startRun()`

**Step 2: Commit**

```
git add App.tsx && git commit -m "feat: add game over screen with run summary"
```

---

### Task 11: Victory screen

**Files:**
- Modify: `App.tsx` — new component

**Step 1: Create VictoryScreen**

Shows:
- "Victory!" heading with celebration styling
- All 10 levels beaten
- Total coins earned across the run
- All relics collected
- "Play Again" button → `useRunStore.getState().startRun()`

**Step 2: Commit**

```
git add App.tsx && git commit -m "feat: add victory screen"
```

---

### Task 12: Shop screen

**Files:**
- Modify: `App.tsx` — new component

**Step 1: Create ShopScreen**

Shows:
- "Shop" heading with coin balance
- 3-4 item cards, each showing: emoji, name, description, price
- Items grayed out if player can't afford
- Tap to buy → `useRunStore.getState().buyShopItem(id)`
- "Continue" button → `useRunStore.getState().skipShop()`

**Step 2: Generate shop items in advanceFromReward**

When transitioning to shop phase, generate 3-4 random items from the pool. Prices scale: shop 1 (after level 3) = base prices, shop 2 = 1.5x, shop 3 = 2x.

**Step 3: Implement buyShopItem**

Deduct coins, apply effect:
- Relic: add to relics array
- Respins: set a `bonusRespins` field that gets added in `startLevel`
- Intel: set a flag that shows next level's preview details
- Tile reroll: set a `tileRerolls` counter used during gameplay
- Entry unlock: set a flag that adds 2 extra entry spots for next level

**Step 4: Commit**

```
git add App.tsx && git commit -m "feat: add shop screen with item purchasing"
```

---

## Phase 4: Relic Effects

### Task 13: Hook relic effects into game logic

**Files:**
- Modify: `App.tsx` — scoring, placement, respins, BFS, tile generation

Implement relic effects one at a time. Each relic checks `useRunStore.getState().relics` for whether the player has it.

**Step 1: Lucky 7s**

In `calculateScore` / `findMatches`, when computing match score: if player has `lucky7s` and symbol is `seven`, multiply the match score by 2.

**Step 2: Combo King**

In `getLengthMultiplier`: if player has `comboKing` and length >= 4, add 1 to the multiplier.

**Step 3: Greed**

In `completeLevel` coin calculation: if player has `greed`, multiply surplus coins by 1.5.

**Step 4: Extra Spin**

In `createInitialState`: add `extraSpinCount` from relics. `respinsRemaining = cfg.respins + extraSpinCount`.

**Step 5: Crystal Ball**

In the tile preview section of the App component: if player has `crystalBall`, show the next 2 tiles instead of 1.

**Step 6: Wide Entry**

In `getEntrySpots`: if player has `wideEntry`, expand entry cells to span 3 columns (e.g., cols 2-4 instead of 3-4).

**Step 7: Safety Net**

In `failLevel`: if player has `safetyNet` and hasn't used it yet, consume it (remove from relics array) and retry the level instead of game over.

**Step 8: Overflow**

In `completeLevel`: excess score above threshold also adds to coins (this is the default behavior — Overflow doubles it or adds a flat bonus). Adjust formula.

**Step 9: Wildcard**

In `generateTileQueue`: if player has `wildcard`, every 5th tile gets `symbolA` or `symbolB` set to `'wild'`. Add `'wild'` to Symbol type. Wild matches any adjacent symbol in `findMatches`.

**Step 10: Rotate Free**

Already partially built — `startPlacement` auto-rotates. With this relic, it picks the rotation that creates the highest-scoring placement (preview all 4 rotations, pick best).

**Step 11: Pathfinder**

In `computeReachableCells`: if player has `pathfinder`, BFS can pass through exactly 1 non-null cell (track a `passedThrough` counter per path).

**Step 12: Commit after each relic, or batch 2-3**

```
git add App.tsx && git commit -m "feat: implement relic effects — scoring, resource, placement, defensive"
```

---

## Phase 5: Polish & HUD

### Task 14: In-game HUD updates

**Files:**
- Modify: `App.tsx` — header section of game UI

**Step 1: Show run info during gameplay**

Add to the header during `playing` phase:
- Level number (e.g., "Level 4 / 10")
- Coins (small coin icon + number)
- Active relics (emoji row)
- Threshold for current level

**Step 2: Update help panel**

Add roguelike-specific rules: relics, coins from surplus, shops, permadeath.

**Step 3: Commit**

```
git add App.tsx && git commit -m "feat: add run info HUD and update help panel"
```

---

### Task 15: Consistent screen styling

**Files:**
- Modify: `App.tsx` — styles section

**Step 1: Add shared styles for between-level screens**

All screens should share the dark `#1a1a2e` background, gold `#ffd700` headings, consistent button styles. Add styles for:
- Screen containers
- Relic cards
- Shop item cards
- Coin display
- Section headings

**Step 2: Commit**

```
git add App.tsx && git commit -m "feat: consistent styling for all roguelike screens"
```

---

### Task 16: End-to-end playtest and tune

**Step 1: Play through a full 10-level run on web**

Verify:
- Title → level preview → play → reward → (shop) → repeat
- Coins accumulate correctly
- Relics apply their effects
- Difficulty escalates — obstacles render, symbols increase, respins decrease
- Game over screen on failure
- Victory screen on level 10 win
- All keyboard controls work throughout

**Step 2: Adjust any obviously broken numbers**

Thresholds, prices, relic strengths — tweak based on feel.

**Step 3: Final commit**

```
git add App.tsx && git commit -m "chore: playtest tuning pass"
```

---

## Implementation Order Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Level Config | 1-4 | Game is configurable but still single-level |
| 2: Run State | 5-6 | Level progression loop works |
| 3: Screens | 7-12 | Full roguelike flow with all UI screens |
| 4: Relics | 13 | All 11 relic effects wired in |
| 5: Polish | 14-16 | HUD, styling, playtesting |

Each phase is independently testable. Phase 1 alone makes the prototype better (configurable difficulty). Phase 2 adds the core loop. Phases 3-5 flesh it out.
