# Respin Spin Animation — Design Spec

**Date:** 2026-03-22
**Goal:** Add a slot-machine-style vertical scroll animation when respinning a row or column, with cascading stop from the button edge.

## Behavior

When a player taps a row or column respin button:

1. The store computes the final symbols for all affected cells immediately (same logic as current `respinLine`).
2. Instead of instantly swapping symbols, each filled (non-wall, non-empty) cell in the row/column plays a vertical scroll animation — symbols slide through the cell like a slot machine reel.
3. Cells stop one at a time in a staggered cascade, starting from the respin button side:
   - **Row respins** (button on the right): cells stop left-to-right (col 0 lands first, col 7 last).
   - **Column respins** (button on top): cells stop top-to-bottom (row 0 lands first, row 7 last).
4. Variable cycle count reinforces the cascade: the first cell to stop does ~2 full cycles through the symbol set, the last cell does 2 + N cycles (where N is its distance from the button). This makes early cells barely spin while later cells really churn.
5. After all cells have landed, match animation fires (broken/new match highlights + score popups).

## Symbol Strip

Each spinning cell renders a vertical strip containing the full `SYMBOLS` array (currently `['cherry', 'lemon', 'bar', 'bell', 'seven']`), repeated for the assigned number of cycles, with the final symbol appended at the end. The strip scrolls downward via `Animated.timing` on `translateY`, landing precisely on the final symbol.

The strip uses `<SymbolIcon>` components for each symbol, so any symbols added in the future are automatically included in the spin.

## Timing

- **Speed per symbol:** ~40ms (tunable constant `SPIN_MS_PER_SYMBOL`)
- **Stagger delay between cells starting:** ~80ms (tunable constant `SPIN_STAGGER_MS`)
- **Cycles:** Cell at position 0 (nearest button) = 2 cycles. Cell at position N = 2 + N cycles.
- **Example for a full 8-cell row:** First cell = 2 cycles × 5 symbols = 10 steps × 40ms = 400ms. Last cell = 9 cycles × 5 symbols = 45 steps × 40ms = 1800ms, starting 560ms late (7 × 80ms). Total animation wall time ≈ 2.4s.
- Easing: `Easing.out(Easing.cubic)` for a natural deceleration as each reel lands.

## Interaction Blocking

During the spin animation:
- Respin buttons are disabled
- Tile placement is disabled
- Match animation is suppressed until all cells have landed

This uses the same blocking mechanism as the current match animation (`matchingCells.size > 0`). A new store field `spinningCells: Map<string, SpinCellInfo>` tracks active spins. Both `spinningCells.size > 0` and `matchingCells.size > 0` block interaction.

## Store Changes

### New types

```typescript
interface SpinCellInfo {
  finalSymbol: Symbol;
  cycles: number;    // how many full symbol-set cycles before landing
  delay: number;     // ms delay before this cell starts spinning
}
```

### Modified `respinLine` action

Instead of directly setting the new grid, `respinLine` will:
1. Compute the new grid (same logic as now).
2. Build the `spinningCells` map with per-cell delay and cycle count.
3. Set `spinningCells` in state (grid is NOT yet updated — old symbols remain visible under the spin overlay).
4. The grid update + score recalculation + match animation happen when `clearSpinAnimation()` is called after all cells finish.

### New actions

- `clearSpinAnimation()` — called when all SpinCells report completion. Applies the pre-computed new grid, updates score, triggers match animation.

## New Component: `SpinCell.tsx`

A cell-sized component that renders the vertical symbol strip and animates it.

**Props:**
- `finalSymbol: Symbol` — the symbol to land on
- `cycles: number` — how many full cycles to spin
- `delay: number` — ms before starting the animation
- `cellSize: number` — cell dimensions
- `onComplete: () => void` — callback when animation finishes

**Rendering:**
- The component renders a column of `<SymbolIcon>` elements (SYMBOLS × cycles + finalSymbol) inside a clipped container (overflow: hidden, sized to one cell).
- `Animated.timing` animates `translateY` from 0 to the target offset.
- On animation complete, calls `onComplete`.

## Grid.tsx Changes

- Import `SpinCell` and `spinningCells` from store.
- When rendering each cell, check if `spinningCells` has an entry for that cell's position.
- If spinning: render `<SpinCell>` overlay on top of (or instead of) the normal `<Cell>`.
- Track completion count; when all spinning cells have completed, call `clearSpinAnimation()`.

## Files

- Create: `src/components/SpinCell.tsx`
- Modify: `src/store.ts` (SpinCellInfo type, spinningCells state, modified respinLine, new clearSpinAnimation)
- Modify: `src/components/Grid.tsx` (render SpinCell overlays, track completion)
- Modify: `src/types.ts` (SpinCellInfo type if needed)
