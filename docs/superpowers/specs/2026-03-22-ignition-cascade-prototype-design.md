# Ignition Cascade Prototype — Design Spec

**Date:** 2026-03-22
**Goal:** Prototype a new core game loop based on "joyful chaos" — place tiles to build connected clusters, then ignite a row/column to trigger cascading respins where matches lock in place and propagation spreads to neighbors.

## Core Fantasy

The player carefully arranges tiles on the board, building dense clusters of symbols. Then they "pull the lever" — igniting a row or column. Matches form and lock, their neighbors respin, new matches lock, the chain spreads outward. The board erupts in cascading activity. The player watches their setup pay off (or fizzle), then places more tiles and ignites again.

**Skill = placement.** Build connected clusters with few symbol types to maximize cascade odds.
**Luck = respins.** What symbols land during propagation is random — but a well-built board has better odds.
**Strategy = ignition choice.** Which row/column to ignite, reading the board for highest chain potential.

## Game Loop

### Phase 1: Place Tiles (Setup)

- Player receives a batch of domino tiles (batch size configurable, default ~6)
- Each tile has two random symbols (same generation as current)
- Player places tiles one at a time using entry points + BFS reachability (same system as current)
- No scoring during placement — the board is just potential energy
- "Near-miss" highlighting is desirable (two adjacent same symbols) but not required for prototype
- Once all tiles in the batch are placed, move to Phase 2

### Phase 2: Ignition

- Player chooses a row or column to ignite (same respin buttons as current)
- All filled, non-wall, non-locked cells in that row/column respin (slot machine animation)
- After respin lands, check for matches (3+ identical symbols in a row/column)
- Any matches found → those cells **lock** (score banks, cells freeze, visually distinct)
- Proceed to Phase 3

### Phase 3: Propagation

- For each newly locked cell, find all adjacent (up/down/left/right) filled cells that are NOT locked and NOT walls
- Those neighbor cells respin (with staggered slot animation, propagating outward)
- After all neighbor respins land, check for new matches
- New matches → lock → find new unlocked neighbors → respin → repeat
- Chain terminates when a propagation wave produces no new matches
- Return to Phase 1 (place next batch of tiles)

### Level End

- Level ends when all tile batches have been placed and all ignitions resolved
- Final score = sum of all locked match scores
- Number of ignitions per level = number of batches (one ignition per batch)
- Threshold system: meet score target to advance (same concept as current)

## Locking Mechanic

- When 3+ identical symbols align in a row or column, ALL cells in that match lock
- Locked cells:
  - Do NOT respin during propagation
  - Are visually distinct (persistent glow, dimmed border, or "frozen" indicator)
  - Contribute to score permanently
  - Can still be part of LONGER matches (e.g., a locked 3-match can extend to 4 if an adjacent cell respins into the same symbol — the whole group re-locks as a 4-match with updated score)
- Locked cells DO count as filled for BFS reachability purposes (they block paths like any filled cell)

## Propagation Rules

1. Ignition respins all filled, unlocked cells in the chosen row/column
2. After respin: scan entire board for matches (not just the respun cells)
3. Lock all new matches
4. Collect all unlocked neighbors of newly locked cells (not previously locked cells — only the NEW locks from this wave trigger propagation)
5. If no unlocked neighbors → chain ends
6. Respin those neighbor cells (with cascade animation)
7. Go to step 2

This ensures:
- The chain spreads outward from the ignition point
- Already-locked regions don't re-trigger (no infinite loops)
- Isolated symbols (no locked neighbors) are never touched by propagation
- The chain naturally terminates

## Scoring

- Same formula as current: `symbolValue × matchLength × lengthMultiplier`
- Score only counts locked matches (no score during placement)
- When a locked match extends (3→4, 4→5), score updates to the longer match value
- Running total displayed during cascade so player sees score climbing

## Configurable Parameters (for playtesting)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `BOARD_SIZE` | 10 | Grid dimensions (square) |
| `TILES_PER_BATCH` | 6 | Dominos placed before each ignition |
| `NUM_BATCHES` | 4 | Number of place→ignite cycles per level |
| `SYMBOL_COUNT` | 5 | Number of distinct symbols in play |
| `SYMBOL_WEIGHTS` | [5,4,3,2,1] | Generation weights |
| `MIN_MATCH_LENGTH` | 3 | Minimum match length |
| `THRESHOLD` | TBD | Score target (needs playtesting) |

Total tiles = `TILES_PER_BATCH × NUM_BATCHES` = 24 dominos = 48 symbols on a 100-cell board (48% fill).

These should be easy to tweak from a config object so we can rapidly iterate.

## UI Changes

### What stays the same
- Neon theme, SVG symbols, all visual styling
- Cell component (add "locked" state)
- Entry point system + BFS reachability
- Respin buttons (now "ignite" buttons)
- Spin animation (SpinCell component — reused for both ignition and propagation)
- HUD (score, level)

### What changes
- **No scoring during placement** — score only appears/updates during cascade
- **Locked cell visual state** — new cell style: locked glow (e.g., gold border + slight gold tint, persistent, not animated)
- **Batch counter** — HUD shows "Batch 2/4" or "Tiles: 4/6 placed" instead of just "tiles left"
- **Propagation animation** — after ignition spin lands, a brief pause, then neighbor cells spin, then pause, then next wave. The cascade should be readable, not instant.
- **Chain wave indicator** — optional: subtle pulse/ripple showing which cells are about to respin
- **No respins during placement** — respin buttons only active between batches (during ignition phase). During placement, they're hidden or disabled.
- **Progress bar** — tracks score vs threshold, only moves during cascade

### Phase indicator
- During placement: "PLACE TILES" or similar, show batch progress
- Ready to ignite: "CHOOSE A ROW OR COLUMN TO IGNITE" — respin buttons glow/activate
- During cascade: "CHAIN x3" counter showing propagation depth, score climbing

## Board Size / Responsive Layout

The current layout computes `CELL_SIZE` from screen width. For 10x10+ grids, cells will be smaller. The formula needs to account for configurable `BOARD_SIZE`:

```typescript
const CELL_SIZE = _screenWidth < 500
  ? Math.floor((_screenWidth - GRID_PADDING * 2 - 4 - 16) / (BOARD_SIZE + 1) - CELL_MARGIN * 2)
  : Math.floor(360 / BOARD_SIZE);
```

## Files

### New
- `src/config.ts` — playtesting config object (board size, batch size, etc.)

### Modified
- `src/constants.ts` — BOARD_SIZE and CELL_SIZE become dynamic from config
- `src/types.ts` — add `locked` concept (either per-cell state or a `lockedCells: Set<string>` in game state)
- `src/store.ts` — major rewrite of game loop:
  - Replace single `tileQueue` with batched system
  - Add `lockedCells: Set<string>` to GameState
  - Add ignition + propagation logic
  - Remove old `respinLine` (replaced by ignition system)
  - Add `ignite(type, index)` action
  - Add `propagate()` internal action
  - Score only computed from locked matches
- `src/grid.ts` — add helpers for finding unlocked neighbors of locked cells
- `src/components/Cell.tsx` — add locked visual state
- `src/components/Grid.tsx` — render locked state, propagation spin overlays
- `src/components/PlayingScreen.tsx` — phase indicator, batch progress, ignition mode
- `src/components/HUD.tsx` — batch counter, chain depth display
- `src/components/BottomBar.tsx` — adapt for batched placement

## What's NOT in this prototype

- Near-miss highlighting during placement
- Chain wave ripple indicator
- Sound effects
- Level progression / multiple levels (just one playtest level)
- Difficulty scaling
- Tutorial / how-to-play updates
