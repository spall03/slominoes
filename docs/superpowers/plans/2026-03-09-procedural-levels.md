# Procedural Level Generator Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded LEVEL_CONFIGS with a procedural board generator and make dormant all roguelike features beyond basic level progression.

**Architecture:** Add a `generateLevelConfig(level)` function that creates random wall placements and derives threshold from playable cell count. Simplify RunState to only handle title/levelPreview/playing/gameOver phases. Remove relic effect hooks from scoring. Keep all dormant code in the file but disconnected.

**Tech Stack:** React Native + Expo, Zustand, TypeScript. Single-file game (App.tsx).

**Design doc:** `docs/superpowers/specs/2026-03-09-procedural-levels-design.md`

---

## Task 1: Add procedural level generator and tuning constants

**Files:**
- Modify: `App.tsx:26-30` (constants section), `App.tsx:92-273` (replace LEVEL_CONFIGS usage)

- [ ] **Step 1: Add tuning constants after existing constants**

After line 30 (`const MIN_MATCH_LENGTH = 3;`), add:

```typescript
// =============================================================================
// PROCEDURAL LEVEL TUNING
// =============================================================================

const WALL_SCALAR = 1.5;          // walls per level (level * WALL_SCALAR)
const SCORE_COEFFICIENT = 55;     // base points per playable cell
const LEVEL_SCALAR_MAX = 1.5;     // level 10 threshold multiplier vs level 1
const NUM_LEVELS = 10;
```

- [ ] **Step 2: Add generateLevelConfig function**

After the tuning constants, add:

```typescript
function generateLevelConfig(level: number): LevelConfig {
  const wallCount = Math.floor(level * WALL_SCALAR);

  // Place walls randomly, avoiding entry spot cells
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
    level,
    threshold,
    respins: RESPINS_PER_LEVEL,
    tilesPerLevel: TILES_PER_LEVEL,
    symbolCount: 5,
    obstacles,
    entrySpotCount: 2,
    boardMask: null,
  };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/spall03/slominoes && npx tsc --noEmit`
Expected: clean (LEVEL_CONFIGS still exists, just not used by generator yet)

- [ ] **Step 4: Commit**

```bash
git add App.tsx && git commit -m "feat: add procedural level generator with tuning constants"
```

---

## Task 2: Simplify RunState — remove dormant features

**Files:**
- Modify: `App.tsx:1018-1275` (RunState store)

- [ ] **Step 1: Change RunPhase type**

Replace line 1018:
```typescript
type RunPhase = 'title' | 'levelPreview' | 'playing' | 'reward' | 'shop' | 'victory' | 'gameOver';
```
with:
```typescript
type RunPhase = 'title' | 'levelPreview' | 'playing' | 'gameOver';
```

- [ ] **Step 2: Simplify RunState interface**

Replace the RunState interface (lines 1115-1137) with:

```typescript
interface RunState {
  runPhase: RunPhase;
  currentLevel: number;
  levelScore: number;
  levelConfig: LevelConfig | null;

  startRun: () => void;
  startLevel: () => void;
  completeLevel: (score: number, threshold: number, respinsLeft: number) => void;
  failLevel: (score: number) => void;
}
```

- [ ] **Step 3: Simplify useRunStore implementation**

Replace the useRunStore create block (lines 1139-1275) with:

```typescript
const useRunStore = create<RunState>((set, get) => ({
  runPhase: 'title',
  currentLevel: 1,
  levelScore: 0,
  levelConfig: null,

  startRun: () => {
    const config = generateLevelConfig(1);
    set({
      runPhase: 'levelPreview',
      currentLevel: 1,
      levelScore: 0,
      levelConfig: config,
    });
  },

  startLevel: () => {
    const { levelConfig } = get();
    if (!levelConfig) return;
    useGameStore.getState().resetGame(levelConfig);
    set({ runPhase: 'playing' });
  },

  completeLevel: (score: number, _threshold: number, _respinsLeft: number) => {
    const { currentLevel } = get();
    if (currentLevel >= NUM_LEVELS) {
      // Final level beaten — show game over with success
      set({ runPhase: 'gameOver', levelScore: score });
      return;
    }
    const nextLevel = currentLevel + 1;
    const config = generateLevelConfig(nextLevel);
    set({
      currentLevel: nextLevel,
      levelConfig: config,
      levelScore: score,
      runPhase: 'levelPreview',
    });
  },

  failLevel: (score: number) => {
    set({ runPhase: 'gameOver', levelScore: score });
  },
}));
```

- [ ] **Step 4: Comment out dormant Relic/ShopItem types, ALL_RELICS, and generateShopItems**

These reference RunState properties that no longer exist, so they can't just stay as live code. Wrap lines 1020-1113 in block comments (`/* ... */`) with a `DORMANT: relics and shop system` label. Keep `hasRelic` for now — it's removed in Task 3 alongside its call sites.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /Users/spall03/slominoes && npx tsc --noEmit`
Expected: errors only from `hasRelic` calls (fixed in Task 3) and dormant screen components (fixed in Task 5). The RunState and store should compile clean.

- [ ] **Step 6: Commit**

```bash
git add App.tsx && git commit -m "feat: simplify RunState to title/preview/playing/gameOver only"
```

---

## Task 3: Remove relic effects from scoring and game logic

**Files:**
- Modify: `App.tsx` — `findMatches` (horizontal + vertical scoring), `hasRelic` helper, `createInitialState`, `resetGame`, PlayingScreen crystal ball preview

- [ ] **Step 1: Delete hasRelic helper function**

Delete the `hasRelic` function (around line 1054-1057). All its call sites are fixed in the following steps.

- [ ] **Step 2: Remove relic checks from findMatches**

In the horizontal match scoring (around line 505), replace:
```typescript
        let multiplier = getLengthMultiplier(length);
        if (length >= 4 && hasRelic('comboKing')) multiplier += 1;
        let score = SYMBOL_VALUES[symbol] * length * multiplier;
        if (symbol === 'seven' && hasRelic('lucky7s')) score *= 2;
```
with:
```typescript
        const multiplier = getLengthMultiplier(length);
        const score = SYMBOL_VALUES[symbol] * length * multiplier;
```

Do the same for the vertical match scoring (around line 530).

- [ ] **Step 3: Simplify resetGame default**

Replace line 1011:
```typescript
  resetGame: (config?: LevelConfig, wideEntry?: boolean) => set(createInitialState(config ?? LEVEL_CONFIGS[0], wideEntry ?? false)),
```
with:
```typescript
  resetGame: (config?: LevelConfig) => set(createInitialState(config ?? generateLevelConfig(1))),
```

- [ ] **Step 4: Remove wideEntry parameter from createInitialState and resetGame**

Update `createInitialState` (line 624) to remove the `wideEntry` parameter:
```typescript
function createInitialState(config: LevelConfig = generateLevelConfig(1)) {
```

Remove the `wideEntry` parameter from `getEntrySpots` call inside:
```typescript
  const spots = getEntrySpots(config.entrySpotCount);
```

Update `resetGame` in GameState interface (line 602) to remove `wideEntry`:
```typescript
  resetGame: (config?: LevelConfig) => void;
```

- [ ] **Step 5: Remove Crystal Ball preview from PlayingScreen**

Delete the crystal ball tile preview block (around lines 2467-2479):
```typescript
                  {placementMode === 'placed' && hasRelic('crystalBall') && tileQueue.length > 1 && (
                    ...
                  )}
```

- [ ] **Step 6: Remove `wide` parameter from `getEntrySpots`**

The `wide` parameter (line 59) was only used by the Wide Entry relic. Remove it — default to non-wide behavior:
```typescript
function getEntrySpots(count: number): EntrySpot[] {
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd /Users/spall03/slominoes && npx tsc --noEmit`
Expected: errors only from dormant screen components (RewardScreen, ShopScreen, VictoryScreen) — fixed in Task 5.

- [ ] **Step 8: Commit**

```bash
git add App.tsx && git commit -m "feat: remove relic effects from scoring and game logic"
```

---

## Task 4: Simplify screens and App routing

**Files:**
- Modify: `App.tsx:1949-1963` (TitleScreen), `App.tsx:1970-2052` (LevelPreviewScreen), `App.tsx:2181-2213` (GameOverScreen), `App.tsx:2256-2269` (App component), `App.tsx:2271-2558` (PlayingScreen)

- [ ] **Step 1: Update TitleScreen**

Change subtitle from "A Roguelike Puzzle" to "A Puzzle Game" (line 1958).

- [ ] **Step 2: Simplify LevelPreviewScreen**

Replace the LevelPreviewScreen function to use `levelConfig` from RunState instead of `LEVEL_CONFIGS`:

```typescript
function LevelPreviewScreen() {
  const { currentLevel, levelConfig } = useRunStore();
  if (!levelConfig) return null;
  const config = levelConfig;
  const entrySpots = getEntrySpots(config.entrySpotCount);

  const entryCellSet = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entrySpots) {
      for (const [r, c] of entry.cells) {
        set.add(`${r},${c}`);
      }
    }
    return set;
  }, [entrySpots]);

  const wallSet = useMemo(() => {
    const set = new Set<string>();
    for (const obs of config.obstacles) {
      if (obs.symbol === 'wall') set.add(`${obs.row},${obs.col}`);
    }
    return set;
  }, [config.obstacles]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.screenContainer}>
          <Text style={styles.screenTitle}>Level {currentLevel}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statText}>Threshold: {config.threshold}</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statText}>Respins: {config.respins}</Text>
            </View>
          </View>

          {/* Mini board preview */}
          <View style={styles.miniGrid}>
            {Array.from({ length: BOARD_SIZE }).map((_, row) => (
              <View key={row} style={styles.miniRow}>
                {Array.from({ length: BOARD_SIZE }).map((_, col) => {
                  const key = `${row},${col}`;
                  const isWall = wallSet.has(key);
                  const isEntry = entryCellSet.has(key);

                  let cellStyle = styles.miniCellOpen;
                  if (isWall) cellStyle = styles.miniCellWall;
                  else if (isEntry) cellStyle = styles.miniCellEntry;

                  return <View key={col} style={[styles.miniCell, cellStyle]} />;
                })}
              </View>
            ))}
          </View>

          <Pressable style={styles.startButton} onPress={() => useRunStore.getState().startLevel()}>
            <Text style={styles.startButtonText}>Start Level</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Simplify GameOverScreen**

Replace the GameOverScreen to show level reached and whether the run was won:

```typescript
function GameOverScreen() {
  const { currentLevel, levelScore } = useRunStore();
  const won = currentLevel >= NUM_LEVELS && levelScore >= 0;

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.screenContainer}>
          <Text style={[styles.screenTitle, { color: won ? '#4caf50' : '#f44336' }]}>
            {won ? 'Victory!' : 'Run Over'}
          </Text>
          <Text style={styles.screenSubtitle}>
            {won ? `All ${NUM_LEVELS} levels complete!` : `Reached Level ${currentLevel} / ${NUM_LEVELS}`}
          </Text>
          <Text style={[styles.statText, { fontSize: 18, marginBottom: 12 }]}>
            Score: {levelScore}
          </Text>
          <Pressable style={[styles.startButton, { marginTop: 16 }]} onPress={() => useRunStore.getState().startRun()}>
            <Text style={styles.startButtonText}>Play Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 4: Update App routing**

Replace the App component (lines 2256-2269):

```typescript
export default function App() {
  const runPhase = useRunStore(s => s.runPhase);

  if (runPhase === 'title') return <TitleScreen />;
  if (runPhase === 'levelPreview') return <LevelPreviewScreen />;
  if (runPhase === 'gameOver') return <GameOverScreen />;

  // runPhase === 'playing'
  return <PlayingScreen />;
}
```

- [ ] **Step 5: Simplify PlayingScreen header — remove coins/relics HUD**

In PlayingScreen, remove the `useRunStore` destructuring of `coins` and `relics` (line 2287). Replace with just `currentLevel`:

```typescript
  const { currentLevel } = useRunStore();
```

Replace the HUD section (lines 2365-2375) with just the level indicator:

```typescript
          <View style={styles.hudRow}>
            <Text style={styles.hudText}>Level {currentLevel} / {NUM_LEVELS}</Text>
          </View>
```

Remove the relics display block (lines 2369-2375).

- [ ] **Step 6: Update skip respins button text**

In PlayingScreen, the skip respins button (around line 2517) currently shows coin value. Change to:

```typescript
                    <Text style={styles.buttonText}>
                      Skip Respins
                    </Text>
```

- [ ] **Step 7: Update "Play Again" in ended phase**

The ended phase "Play Again" button (around line 2534) already calls `startRun()` — that's fine.

- [ ] **Step 8: Verify TypeScript compiles**

Run: `cd /Users/spall03/slominoes && npx tsc --noEmit`
Expected: clean

- [ ] **Step 9: Commit**

```bash
git add App.tsx && git commit -m "feat: simplify screens for procedural level focus"
```

---

## Task 5: Clean up — mark dormant code and verify game runs

**Files:**
- Modify: `App.tsx` — various sections

- [ ] **Step 1: Comment out dormant code blocks**

These sections reference types/properties that no longer exist on the simplified RunState, so they must be commented out (not just marked). Use `/* --- DORMANT: <reason> --- ... --- END DORMANT --- */` block comments:

1. `LEVEL_CONFIGS` array — `DORMANT: hardcoded level configs replaced by generateLevelConfig`
2. `RewardScreen` component — `DORMANT: reward/relic pick screen`
3. `ShopScreen` component — `DORMANT: shop system`
4. `VictoryScreen` component — `DORMANT: separate victory screen (merged into GameOverScreen)`

Note: Relic/ShopItem types and ALL_RELICS were already commented out in Task 2 Step 4.

- [ ] **Step 2: Remove unused imports/variables that cause warnings**

Check for any unused variables like `coins`, `relics`, `shopItems`, `rewardChoices` that are no longer referenced. Remove them from destructuring if present.

- [ ] **Step 3: Verify TypeScript compiles clean**

Run: `cd /Users/spall03/slominoes && npx tsc --noEmit`
Expected: clean, no errors

- [ ] **Step 4: Test the game runs**

Run: `cd /Users/spall03/slominoes && npx expo start --web`
Verify:
- Title screen shows "Slominoes — A Puzzle Game"
- "New Run" goes to level preview with random wall layout
- Level preview shows threshold and wall positions on mini grid
- Playing works — can place tiles, respin, score
- Winning advances to next level preview with new random walls
- Losing shows game over with level reached
- Beating level 10 shows victory game over
- No coin/relic UI anywhere

- [ ] **Step 5: Commit**

```bash
git add App.tsx && git commit -m "chore: mark dormant roguelike features, clean up unused references"
```

---

## Task 6: Update WORKING.md

**Files:**
- Modify: `WORKING.md`

- [ ] **Step 1: Update WORKING.md with new state**

```markdown
# Working

## Current Task
Procedural level generator — simplify roguelike, focus on board generation.

## Progress
- [x] Added generateLevelConfig() with WALL_SCALAR, SCORE_COEFFICIENT, LEVEL_SCALAR_MAX tuning knobs
- [x] Simplified RunState to title/levelPreview/playing/gameOver only
- [x] Removed relic effects from scoring
- [x] Simplified all screens (no coins, relics, shop, reward)
- [x] Marked dormant code with DORMANT comments for easy re-enablement

## Next Steps
- Playtest and tune WALL_SCALAR, SCORE_COEFFICIENT, LEVEL_SCALAR_MAX
- Consider smarter wall placement (clustering, avoid isolating regions)
- Consider adding symbol count variation to difficulty budget
- Re-enable features one at a time once board generation feels right

## Recent Decisions
- Full 8x8 board always, no board masks — walls/carveouts only
- Threshold derived from playable cell count (heuristic, not simulation)
- All roguelike features (relics, coins, shop, reward) dormant but code preserved
- Symbol weighting stays active
- Game over screen handles both victory (level 10 beaten) and failure

## Blockers/Notes
- Dormant code: LEVEL_CONFIGS, ALL_RELICS, Relic/ShopItem types, RewardScreen, ShopScreen, VictoryScreen
- hasTileReroll was never consumed in game logic (noted before, still dormant)
- Wildcard, Rotate Free, Pathfinder relics were never implemented (still dormant)
```

- [ ] **Step 2: Commit**

```bash
git add WORKING.md && git commit -m "docs: update WORKING.md for procedural level focus"
```
