# Mid-Game Respins — Design

## Goal

Remove the dedicated respin phase. Respins become a resource available during tile placement, making them a genuine risk/reward decision.

## Game Flow

1. Player selects entry, places tiles, and can respin rows/cols between placements
2. Respin buttons (row + column) visible during `placing` phase when `respinsRemaining > 0`
3. Last tile placed = game ends immediately (win/lose based on score vs threshold)
4. No more separate `respinning` phase

## Scoring

- Score = live `calculateScore(grid)` at all times
- Recalculated after every placement and every respin
- Score can go up or down — no ratcheting (`Math.max` removed)
- Respins are genuine risk/reward: breaking a chain hurts

## UI

- Row respin buttons: visible to the right of grid during placement when respins > 0
- Column respin buttons: visible above grid during placement when respins > 0
- Respin counter shown in controls
- Skip Respins button removed

## Keyboard Controls

- **Placed mode** (tile on board): arrow keys move tile, R rotates, Enter confirms, Esc cancels
- **Idle mode** (entry selected, no tile placed): arrow keys + Tab + Enter control respin cursor, number keys select entry
- No mode toggle needed — placement state naturally separates the two

## Code Changes

**Removed:**
- `'respinning'` from `GamePhase` — becomes `'placing' | 'ended'`
- `scoreBeforeRespins` field on GameState
- `skipRespins` action
- Respinning-specific UI block and keyboard handler
- Score ratcheting in `respinLine` (`Math.max(score, gridScore)`)

**Modified:**
- `respinLine`: callable during `placing` phase, uses live score
- `confirmPlacement`: when last tile placed, go straight to `ended` (no `respinning` transition)
- PlayingScreen: respin buttons shown during `placing`, merged keyboard handler
- `respinLine` end condition: no longer checks `newRespins === 0` to end game (running out of respins doesn't end the game — placing the last tile does)

**Kept:**
- `respinLine` action mechanics (re-randomize row/col, skip walls)
- Row/col respin button components
- Match animation on respin (broken/new highlights)
