# Respin Spin Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a slot-machine-style vertical scroll animation when respinning a row or column, with cascading stop from the button edge.

**Architecture:** Split `respinLine` into two phases: (1) compute final symbols and start spin animation, (2) apply grid changes and trigger match animation after all cells finish spinning. A new `SpinCell` component renders the reel effect. The store gains `spinningCells` state and a `clearSpinAnimation` action.

**Tech Stack:** React Native Animated API, react-native-svg (SymbolIcon), Zustand

---

### Task 1: Add Spin State to Store

**Files:**
- Modify: `src/types.ts`
- Modify: `src/store.ts`

- [ ] **Step 1: Add SpinCellInfo type to types.ts**

Add at the end of `src/types.ts`:

```typescript
export interface SpinCellInfo {
  finalSymbol: Symbol;
  cycles: number;
  delay: number;
}
```

- [ ] **Step 2: Add spin state fields to GameState interface in store.ts**

In the `GameState` interface (around line 48), add these fields:

```typescript
  spinningCells: Map<string, SpinCellInfo>;
  pendingSpinGrid: Grid | null;
  pendingSpinScore: number;
  pendingSpinAnimState: Partial<GameState> | null;

  clearSpinAnimation: () => void;
```

- [ ] **Step 3: Add spin defaults to createInitialState**

In `createInitialState()`, add:

```typescript
    spinningCells: new Map<string, SpinCellInfo>(),
    pendingSpinGrid: null as Grid | null,
    pendingSpinScore: 0,
    pendingSpinAnimState: null as Partial<GameState> | null,
```

- [ ] **Step 4: Add spin animation constants**

At the top of `src/store.ts`, after the imports, add:

```typescript
const SPIN_MS_PER_SYMBOL = 40;
const SPIN_STAGGER_MS = 80;
const SPIN_BASE_CYCLES = 2;
```

- [ ] **Step 5: Modify respinLine to start spin instead of instant swap**

Replace the current `respinLine` action body. The new version:
1. Computes the new grid (same logic).
2. Computes match diff and animation state (same logic).
3. Instead of applying immediately, stores results in `pendingSpinGrid`, `pendingSpinScore`, `pendingSpinAnimState`.
4. Builds `spinningCells` map with per-cell delay and cycles.
5. Decrements respins and sets the spin state.

```typescript
  respinLine: (type: 'row' | 'col', index: number) => {
    const { phase, respinsRemaining, grid, matchingCells, spinningCells } = get();
    if (phase !== 'placing' || respinsRemaining <= 0) return;
    if (index < 0 || index >= BOARD_SIZE) return;
    if (matchingCells.size > 0) return;
    if (spinningCells.size > 0) return; // Block during spin

    const matchesBefore = findMatches(grid);
    const newGrid = cloneGrid(grid);

    // Build list of cells that will spin (filled, non-wall)
    const cellPositions: { row: number; col: number; pos: number }[] = [];

    if (type === 'row') {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (newGrid[index][col] !== null && newGrid[index][col] !== 'wall') {
          newGrid[index][col] = getRandomSymbol(get().levelConfig.symbolCount);
          cellPositions.push({ row: index, col, pos: col });
        }
      }
    } else {
      for (let row = 0; row < BOARD_SIZE; row++) {
        if (newGrid[row][index] !== null && newGrid[row][index] !== 'wall') {
          newGrid[row][index] = getRandomSymbol(get().levelConfig.symbolCount);
          cellPositions.push({ row, col: index, pos: row });
        }
      }
    }

    // Row: cascade left→right (button on right). Col: cascade top→bottom (button on top).
    // pos is already in the right order (col for rows, row for cols).

    const newSpinningCells = new Map<string, SpinCellInfo>();
    cellPositions.forEach(({ row, col, pos }) => {
      const key = `${row},${col}`;
      newSpinningCells.set(key, {
        finalSymbol: newGrid[row][col]!,
        cycles: SPIN_BASE_CYCLES + pos,
        delay: pos * SPIN_STAGGER_MS,
      });
    });

    // Compute score and match animation state (deferred until spin completes)
    const matchesAfter = findMatches(newGrid);
    const newScore = matchesAfter.reduce((sum, m) => sum + m.score, 0);

    const beforeKeys = new Set(matchesBefore.map(matchKey));
    const afterKeys = new Set(matchesAfter.map(matchKey));
    const brokenMatches = matchesBefore.filter(m => !afterKeys.has(matchKey(m)));
    const newMatches = matchesAfter.filter(m => !beforeKeys.has(matchKey(m)));

    let animState: Partial<GameState> = {};
    if (brokenMatches.length > 0 || newMatches.length > 0) {
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
        animState = { matchingCells: phase2Cells, highlightColor: 'blue', scorePopups: phase2Popups, pendingPhase2: null };
      } else {
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

    set({
      respinsRemaining: respinsRemaining - 1,
      spinningCells: newSpinningCells,
      pendingSpinGrid: newGrid,
      pendingSpinScore: newScore,
      pendingSpinAnimState: animState,
    });
  },
```

- [ ] **Step 6: Add clearSpinAnimation action**

Add to the store actions:

```typescript
  clearSpinAnimation: () => {
    const { pendingSpinGrid, pendingSpinScore, pendingSpinAnimState } = get();
    if (!pendingSpinGrid) return;
    set({
      grid: pendingSpinGrid,
      score: pendingSpinScore,
      spinningCells: new Map(),
      pendingSpinGrid: null,
      pendingSpinScore: 0,
      pendingSpinAnimState: null,
      ...(pendingSpinAnimState ?? {}),
    });
  },
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/store.ts
git commit -m "feat: add spin animation state to store, split respinLine into compute + animate phases"
```

---

### Task 2: Create SpinCell Component

**Files:**
- Create: `src/components/SpinCell.tsx`

- [ ] **Step 1: Create SpinCell.tsx**

```tsx
// src/components/SpinCell.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { CELL_SIZE, CELL_MARGIN } from '../constants';
import { SYMBOLS } from '../constants';
import { SymbolIcon } from '../symbols/index';
import { colors } from '../theme';
import type { Symbol } from '../types';

interface SpinCellProps {
  finalSymbol: Symbol;
  cycles: number;
  delay: number;
  onComplete: () => void;
}

export function SpinCell({ finalSymbol, cycles, delay, onComplete }: SpinCellProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Build the symbol strip: SYMBOLS repeated `cycles` times, then finalSymbol at the end
  const strip: Symbol[] = [];
  for (let i = 0; i < cycles; i++) {
    for (const s of SYMBOLS) {
      strip.push(s);
    }
  }
  strip.push(finalSymbol);

  const iconSize = CELL_SIZE - 4;
  const totalHeight = strip.length * CELL_SIZE;
  // We want to end with finalSymbol visible, which is the last item.
  // Start showing index 0 at top. Animate translateY from 0 to -(totalHeight - CELL_SIZE).
  const targetY = -(totalHeight - CELL_SIZE);

  useEffect(() => {
    const duration = strip.length * 40; // SPIN_MS_PER_SYMBOL = 40
    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: targetY,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        onCompleteRef.current();
      });
    }, delay);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.strip, { transform: [{ translateY }] }]}>
        {strip.map((sym, i) => (
          <View key={i} style={styles.symbolSlot}>
            <SymbolIcon symbol={sym} size={iconSize} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_MARGIN,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.cellFilled,
    borderWidth: 1,
    borderColor: colors.cellFilledBorder,
  },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  symbolSlot: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/SpinCell.tsx
git commit -m "feat: add SpinCell component with vertical reel scroll animation"
```

---

### Task 3: Integrate SpinCell into Grid

**Files:**
- Modify: `src/components/Grid.tsx`

- [ ] **Step 1: Import SpinCell and spin state from store**

At the top of Grid.tsx, add imports:

```typescript
import { SpinCell } from './SpinCell';
```

And destructure `spinningCells` and `clearSpinAnimation` from `useGameStore()`:

```typescript
  const {
    // ... existing destructured fields ...
    spinningCells,
    clearSpinAnimation,
  } = useGameStore();
```

- [ ] **Step 2: Add spin completion tracking**

Add a ref and callback to track when all spinning cells have completed, similar to the match animation tracking:

```typescript
  const spinCompletedRef = useRef(new Set<string>());
  const totalSpinCellsRef = useRef(0);

  // Reset tracking when spinningCells changes
  useEffect(() => {
    if (spinningCells.size > 0) {
      spinCompletedRef.current = new Set();
      totalSpinCellsRef.current = spinningCells.size;
    }
  }, [spinningCells]);

  const handleSpinCellComplete = useCallback((cellKey: string) => {
    spinCompletedRef.current.add(cellKey);
    if (spinCompletedRef.current.size >= totalSpinCellsRef.current) {
      clearSpinAnimation();
    }
  }, [clearSpinAnimation]);
```

- [ ] **Step 3: Block interactions during spin**

In the gesture handlers and keyboard handlers, add a check for `spinningCells.size > 0` alongside the existing `matchingCells.size > 0` check. The simplest way: in the tap gesture `onEnd`, pan gesture `onUpdate`, and keyboard handler, add early returns when spinning.

Also in the respin button press handlers (in PlayingScreen.tsx), the store's `respinLine` already checks `spinningCells.size > 0`, so buttons will be no-ops during spin. But visually disable them by passing a disabled prop.

- [ ] **Step 4: Render SpinCell overlays in the grid**

In the grid cell rendering loop, check if the cell is in `spinningCells`. If so, render a `<SpinCell>` instead of a `<Cell>`:

```tsx
{row.map((cell, colIndex) => {
  const cellKey = `${rowIndex},${colIndex}`;
  const spinInfo = spinningCells.get(cellKey);

  if (spinInfo) {
    return (
      <SpinCell
        key={`spin-${rowIndex}-${colIndex}`}
        finalSymbol={spinInfo.finalSymbol}
        cycles={spinInfo.cycles}
        delay={spinInfo.delay}
        onComplete={() => handleSpinCellComplete(cellKey)}
      />
    );
  }

  // ... existing Cell rendering ...
})}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Test in browser**

Run: `npx expo start --web`

Play a game, place some tiles, then respin a row. Verify:
- Cells scroll through symbols vertically
- Cascade stops left-to-right for rows
- First cell stops quickly, last cell spins longer
- Match animation fires after all cells land
- Can't interact during spin

- [ ] **Step 7: Commit**

```bash
git add src/components/Grid.tsx
git commit -m "feat: integrate SpinCell into Grid for slot-machine respin animation"
```

---

### Task 4: Block Respin Buttons During Spin + Polish

**Files:**
- Modify: `src/components/PlayingScreen.tsx`

- [ ] **Step 1: Disable respin buttons during spin**

In PlayingScreen.tsx, destructure `spinningCells` from `useGameStore()`. Add a `isSpinning` check:

```typescript
const spinningCells = useGameStore(s => s.spinningCells);
const isSpinning = spinningCells.size > 0;
```

Pass `isSpinning` to disable respin buttons (same pattern as `placementMode === 'placed'` disabling):

```tsx
<Pressable
  // ... existing props ...
  disabled={placementMode === 'placed' || isSpinning}
  style={[
    // ... existing styles ...
    (placementMode === 'placed' || isSpinning) && styles.respinButtonDisabled,
  ]}
>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Full playthrough test**

Run: `npx expo start --web`
Play through multiple levels. Verify:
- Spin animation looks good
- Respin buttons disabled during spin
- Score updates correctly after spin completes
- Match highlights appear after spin
- No interaction during spin
- Multiple respins in a row work correctly
- Game over / level complete still works after respin

- [ ] **Step 4: Production build**

Run: `npx expo export --platform web`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/PlayingScreen.tsx
git commit -m "feat: disable respin buttons during spin animation, final polish"
```
