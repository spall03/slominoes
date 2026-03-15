# Simulation Tool — Design

## Goal

Standalone Node.js script that simulates thousands of Slominoes games to report win rates and score distributions per level, enabling data-driven tuning of difficulty constants.

## Architecture

Single file `simulate.ts` in project root. Extracts pure game logic functions from App.tsx (no React/Expo dependencies). Run with `npx tsx simulate.ts`.

## Extracted Logic

From App.tsx, copy these pure functions:
- Symbol generation: `SYMBOLS`, `SYMBOL_VALUES`, `SYMBOL_WEIGHTS`, `getRandomSymbol`
- Level generation: `generateLevelConfig` with tuning constants (`WALL_SCALAR`, `SCORE_COEFFICIENT`, `LEVEL_SCALAR_MAX`, `NUM_LEVELS`)
- Grid: `createGridFromConfig`, `cloneGrid`
- Scoring: `findMatches`, `calculateScore`, `SYMBOL_VALUES`, `getLengthMultiplier`
- Placement: `canPlaceTile`, `canPlaceTileWithEntry`, `getEntrySpots`, `getSecondCellOffset`, reachability (BFS)
- Tile generation: `generateTile`, `generateTileQueue`

## Simulation Strategies

1. **Random** — random valid cell placement, random respin timing/target
2. **Greedy** — place tile at position maximizing immediate score, respin row/col with most improvement potential
3. **No respins** — greedy placement, never respin (isolates respin value)

## Mid-Game Respin Modeling

Respins distributed across placement phase (not batched at end). Random strategy: fire at random points between placements. Greedy: fire when current score is below threshold pace.

## Output

Console summary per level (10K games each strategy):
- Win rate (%)
- Score: mean, median, max
- Score as % of threshold
- Average respin contribution (score delta from respins)

## Usage

`npx tsx simulate.ts` — runs all strategies against current tuning constants. Results interpreted in conversation for tuning discussion.
