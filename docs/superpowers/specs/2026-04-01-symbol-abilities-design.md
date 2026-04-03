# Symbol Abilities & Loadout System

## Overview

Transform Slominoes into a deckbuilder-style puzzle game where players unlock a large roster of symbols with unique stats and abilities, then choose 5 (default) to bring into each run. The meta-game is discovering synergies between symbol loadouts.

## Symbol Definition

Every symbol has base stats and zero or more abilities:

```
Symbol:
  name: string
  icon: visual asset
  match_length: 1-6          # minimum cells in a line to count as a match (default 3)
  score_value: number         # base points per match (scaled by length multiplier)
  frequency: number           # weight in tile generation pool (higher = more common)
  abilities: [                # zero or more
    { trigger, verb, params }
  ]
```

### Base Stats

- **match_length** (1-6): How many cells in a row/column to form a match. Lower is easier to trigger, higher requires more setup.
- **score_value**: Points awarded when this symbol matches. Scaled by the existing length multiplier (3-match = 1x, 4-match = 2x, 5-match = 3x, etc.).
- **frequency**: Weight when generating tiles. A symbol with frequency 5 appears 5x as often as one with frequency 1, relative to the total weight of all symbols in the loadout.

## Triggers

When an ability activates:

| Trigger | Fires when... |
|---------|---------------|
| **on_match** | This symbol forms a match of match_length or more |
| **on_place** | A tile containing this symbol is placed on the board |
| **on_respin** | A respin hits a row/column containing this symbol |
| **on_adjacent_match** | A different symbol matches in a cell adjacent to this one |
| **passive** | Always active by being in the loadout (no trigger needed) |
| **wild_match** | This symbol can substitute for specified other symbols in matches |
| **recipe_match** | A specific set of different symbols in a line counts as a match |

### Trigger rules

- **recipe_match** belongs to the symbol that defines the recipe. A recipe containing cherry and lemon does NOT trigger cherry's or lemon's on_match.
- **on_match** fires once per match formed, not once per cell.
- **passive** abilities apply for the entire run.
- **wild_match** allows flexible substitution and is bidirectional (if apple wild_matches cherry, cherry also extends apple runs).
- **recipe_match** requires an exact set of symbol types in any order.

## Verbs

What an ability does when triggered:

| Verb | Params | Description |
|------|--------|-------------|
| **score_bonus** | points: number | Add flat bonus points |
| **score_multiplier** | factor: number, scope: symbol/row/col/cross | Multiply score for a scope |
| **score_penalty** | percent: number, scope: all_other | Reduce score_value of other symbols |
| **free_respin** | count: number | Add respins to the player's pool |
| **lock** | target: self/adjacent/row/col | Lock specified cells |
| **unlock** | target: self/adjacent/row/col/cross | Unlock locked cells |
| **clear** | target: adjacent/self/row/col | Remove unlocked cells (become empty) |
| **frequency_modifier** | symbol: name, amount: number | Change how often a symbol appears in tile generation |
| **extra_tiles** | count: number | Add tiles to the queue |
| **extra_slots** | count: number | Increase symbol selection slots |
| **extra_entry_spots** | count: number, sides | Add entry spots |
| **place_on_wall** | — | This symbol can be placed on wall cells, replacing the wall |
| **no_lock** | — | This symbol doesn't lock when matched |
| **score_per_empty_cell** | points: number | Bonus per empty cell on the board when matched |
| **score_per_unique_adjacent** | points: number | Bonus per unique symbol type adjacent to match |
| **respin_match_bonus** | points: number | Bonus whenever a respin creates a new match |

Abilities can be positive or negative. Symbols can have multiple abilities.

## Loadout System

- Default: pick **5 symbols** before each run
- All symbols in the loadout are in the tile generation pool, weighted by frequency
- Tiles are pairs of two symbols drawn from the pool
- Crown grants +2 slots (pick 7 instead of 5)

### Selection UI

Before each run, players see:
- All unlocked symbols with their stats and abilities
- Locked symbols with silhouetted icon and cryptic one-line hint
- A "deck" area showing current picks
- Full stats revealed on unlock

## Full Roster (20 symbols)

### Base symbols (unlocked from start)

| Symbol | ML | Score | Freq | Abilities |
|--------|----|-------|------|-----------|
| Cherry | 3 | 10 | 5 | — |
| Lemon | 3 | 20 | 4 | — |
| Bar | 3 | 40 | 3 | — |
| Bell | 3 | 80 | 2 | — |
| Seven | 3 | 150 | 1 | — |

### Unlockable symbols

| Symbol | ML | Score | Freq | Abilities |
|--------|----|-------|------|-----------|
| Jam | 3 | 25 | 3 | on_match: 2x score for cherry matches in same row/col |
| Apple | 3 | 25 | 2 | wild_match: cherry, lemon. recipe_match: apple+cherry+lemon = +200 (Fruit Salad) |
| Magnet | 3 | 0 | 3 | passive: bell frequency +2, seven frequency +1 |
| Oil Can | 1 | 40 | 1 | on_match: unlock all locked cells in same row and column |
| Crown | 3 | 20 | 4 | passive: +2 selection slots |
| Bomb | 2 | 20 | 2 | on_match: clear all unlocked adjacent cells + self |
| Egg | 4 | 30 | 3 | on_match: +3 tiles to queue |
| Compass | 3 | 5 | 2 | passive: +1 entry spot on east or west side |
| Vine | 3 | 35 | 2 | on_place: can replace wall cells. on_match: +50 score bonus |
| Ghost | 3 | 30 | 2 | passive: ghost cells don't lock when matched |
| Honey | 2 | 15 | 3 | on_adjacent_match: +30 score bonus |
| Tide | 3 | 10 | 2 | on_match: +5 per empty cell on the board |
| Coral | 2 | 15 | 3 | on_match: +20 per unique symbol type adjacent to match |
| Ember | 2 | 20 | 2 | passive: +40 whenever a respin creates a new match |
| Banana | 3 | 20 | 3 | wild_match: cherry, lemon, apple. recipe_match: banana+apple+cherry+lemon = +400 (Grand Salad) |

## Power Rankings (from exhaustive 15,504 loadout simulation)

| Rank | Symbol | Avg Score | Tier |
|------|--------|-----------|------|
| 1 | Compass | 1341 | S |
| 2 | Oil Can | 1234 | A |
| 3 | Bell | 1192 | A |
| 4 | Seven | 1150 | A |
| 5 | Ember | 1106 | B+ |
| 6 | Apple | 1079 | B+ |
| 7 | Vine | 1029 | B |
| 8 | Magnet | 1002 | B |
| 9 | Bar | 1000 | B |
| 10 | Banana | 998 | B |
| 11 | Coral | 993 | B |
| 12 | Jam | 984 | B |
| 13 | Lemon | 976 | B- |
| 14 | Ghost | 975 | B- |
| 15 | Tide | 961 | B- |
| 16 | Egg | 960 | B- |
| 17 | Cherry | 957 | B- |
| 18 | Honey | 900 | C |
| 19 | Bomb | 888 | C |
| 20 | Crown | 872 | C |

Power spread: 1.54x (top to bottom). Middle 12 symbols within 7% of each other.

### Top Archetypes

1. **Fruit deck**: cherry + lemon + apple + banana + compass — 3646 mean, 58.7% win
2. **High-value**: bell + seven + magnet + compass + ghost — 3497 mean, 52.7% win

## Unlock Progression

### Design principles

- **Long progression**: 100+ runs to unlock everything (8-15 hours)
- **At most 1 unlock per run**: if multiple conditions are met in one run, only the earliest-eligible triggers; others queue for next run
- **Each unlock is an event**: not routine, should feel significant
- **Score acceleration**: as players unlock better symbols, their scores increase, which helps them reach higher cumulative thresholds
- **Mix of condition types**: cumulative (steady progress), per-run feats (spike moments), milestone gates (level progression)
- **Locked symbols visible**: show silhouetted icon + cryptic hint in draft screen so players have goals to chase
- **Progress tracking UI**: in-run counters for active goals, post-run recap showing progress

### Tier 1 — Early game (runs 3-15)

| Symbol | Unlock Condition | Type |
|--------|-----------------|------|
| Jam | Cumulative score 10,000 | Cumulative |
| Bomb | Win 15 levels total | Cumulative |
| Honey | Cumulative score 40,000 | Cumulative |
| Ghost | Create an 8-length match | Feat |

### Tier 2 — Mid game (runs 15-40)

| Symbol | Unlock Condition | Type |
|--------|-----------------|------|
| Coral | Win 50 levels total | Cumulative |
| Egg | Cumulative score 100,000 | Cumulative |
| Ember | Buy 30 respins total (lifetime) | Cumulative |
| Compass | Win a full run (beat level 10) | Milestone |

### Tier 3 — Late game (runs 40-80)

| Symbol | Unlock Condition | Type |
|--------|-----------------|------|
| Apple | Score 1500 from cherry matches in a single run | Per-run feat |
| Magnet | Match bell 3 times in a single level | Per-level feat |
| Vine | Win 10 full runs | Cumulative |
| Oil Can | Have 30+ locked cells at any point in a level | Per-level feat |

### Tier 4 — Endgame (runs 80-150+)

| Symbol | Unlock Condition | Type |
|--------|-----------------|------|
| Crown | Use 12 different symbols across all runs | Cumulative |
| Banana | Trigger Fruit Salad in a run | Per-run feat (requires Apple) |
| Tide | Win a full run without buying any respins | Challenge |

### Unlock condition hints (shown on locked symbols)

- Jam: "Prove your worth"
- Bomb: "Win and win again"
- Honey: "Keep scoring"
- Ghost: "Fill the line"
- Coral: "A seasoned champion"
- Egg: "Dedicated scorer"
- Ember: "Spin to win"
- Compass: "Conquer all ten"
- Apple: "Cherry devotee"
- Magnet: "Ring the bell"
- Vine: "Veteran champion"
- Oil Can: "Under pressure"
- Crown: "Symbol collector"
- Banana: "Fruit salad chef"
- Tide: "Pure skill"

### Threshold tuning note

All numeric thresholds (scores, level counts, etc.) are initial estimates. As players unlock better symbols, their scores accelerate — a 40,000 cumulative threshold that seems distant at 500/run becomes reachable at 2000+/run with better loadouts. Final tuning requires playtesting; thresholds are easy to adjust as they're just constants.

## Simulation Framework

### Implementation

- `simulate-loadouts.ts` — tests all 15,504 possible 5-symbol loadouts
- Greedy bot (70% best move, 30% random) with adjacency heuristics
- Weighted levels: L1×25, L5×50, L10×75 games per loadout
- Tracks: score, win rate, ability triggers, locked cells, tiles placed, matches by symbol

### What the simulator validates

- Relative symbol balance (power rankings)
- Broken combos (>2 SD above baseline)
- Dead combos (>2 SD below baseline)
- Per-symbol contribution across all loadouts

### What the simulator cannot validate

- Human learning curves and progression pacing
- "Fun factor" of abilities and unlock conditions
- Score acceleration as players unlock better symbols
- Optimal threshold values for unlock conditions

These require playtesting.

## Persistence

Store in AsyncStorage (React Native) / localStorage (web):
- Unlocked symbols set
- Cumulative stats: total score, levels won, full runs won, respins bought, symbols used
- Per-run tracking: cherry score, bell matches, locked cell high water mark, etc.
- Unlock queue (for the 1-per-run policy)

## Open Questions

- How many total symbols long-term? 30? 50? (Currently 20)
- Post-unlock endgame loop: ascension modes, daily challenges, cosmetics?
- Should there be a "reroll" mechanic in the draft?
- How to handle Crown's +2 slots in the selection UI layout?
