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
- **wild_match** allows flexible substitution; **recipe_match** requires an exact set of symbol types.

## Verbs

What an ability does when triggered:

| Verb | Params | Description |
|------|--------|-------------|
| **score_bonus** | points: number | Add flat bonus points |
| **score_multiplier** | factor: number, scope: symbol/row/col/all | Multiply score for a scope |
| **free_respin** | count: number | Add respins to the player's pool |
| **lock** | target: self/adjacent/row/col | Lock specified cells |
| **unlock** | target: self/adjacent/row/col/cross | Unlock locked cells |
| **convert** | target: adjacent/row/col, to: symbol | Change cells to a different symbol |
| **clear** | target: adjacent/self/row/col | Remove cells (become empty), including locked |
| **duplicate** | target: adjacent_empty | Copy this symbol to an adjacent empty cell |
| **frequency_modifier** | symbol: name, amount: number | Change how often a symbol appears in tile generation |
| **respin_cost_reduction** | percent: number | Reduce cost of bought respins |
| **extra_tiles** | count: number | Add tiles to the queue |
| **extra_slots** | count: number | Increase symbol selection slots |
| **extra_entry_spots** | count: number, sides: north/south/east/west | Add entry spots |
| **place_on_wall** | — | This symbol can be placed on wall cells, replacing the wall |
| **score_penalty** | percent: number, scope: all_other | Reduce score_value of other symbols |

Abilities can be positive or negative. A "downside" is a verb with negative params (e.g., score_penalty 20% on all other symbols). Symbols can have multiple abilities.

## Loadout System

- Default: pick **5 symbols** before each run
- All 5 symbols are in the tile generation pool, weighted by frequency
- Tiles are pairs of two symbols drawn from the pool
- Some symbols modify the slot count (e.g., Crown grants +2 slots)

### Selection UI

Before each run, players see:
- All unlocked symbols with their stats and abilities
- Locked symbols with unlock condition hints
- A "deck" area showing current 5 picks
- Synergy indicators (stretch goal)

## Unlock Progression

Symbols unlock through varied conditions to encourage different play styles:

### Condition types

| Type | Examples |
|------|----------|
| **Cumulative score** | "Reach 50,000 lifetime score" |
| **Per-run score** | "Score 2,000 in a single run" |
| **Per-level score** | "Score 800 in a single level" |
| **Run milestones** | "Beat level 5", "Complete a run" |
| **In-game feats** | "Match 5 in a row", "Fill an entire row", "Lock 20 cells in one level" |
| **Board shapes** | "Form an L-shaped match", "Create a cross of locked cells" |
| **Symbol-specific** | "Score 500 with cherries in one run" |
| **Combo discovery** | "Use jam and cherry together in a run" |
| **Challenge runs** | "Win without buying respins", "Win with only 3 unique symbols" |

### Design principles

- Early unlocks come from natural play (cumulative score, basic milestones)
- Mid-game unlocks require intentional play (specific feats, symbol combos)
- Late unlocks require mastery (challenge runs, rare board states)
- Hints visible on locked symbols so players know what to aim for

## Starting Roster (14 symbols)

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
| Jam | 2 | 15 | 3 | on_match: 3x score for cherry matches in same row/col |
| Apple | 3 | 25 | 2 | recipe_match: apple+cherry+lemon = score_bonus 200 |
| Magnet | 3 | 0 | 3 | passive: bell frequency +2, seven frequency +1 |
| Oil Can | 1 | 40 | 1 | on_match: unlock all locked cells in same row and column |
| Crown | 3 | 20 | 4 | passive: all other symbols score_value -20%, +2 selection slots |
| Bomb | 2 | 0 | 2 | on_match: clear all adjacent cells + self |
| Egg | 4 | 30 | 3 | on_match: +3 tiles to queue |
| Compass | 3 | 15 | 2 | passive: +2 entry spots on west and east sides |
| Vine | 3 | 35 | 2 | on_place: can replace wall cells. on_match: score_bonus 50 |

## Simulation Framework

Extend the existing `simulate.ts` to stress-test symbol loadouts:

### Goals

1. **Balance validation**: Flag loadouts that produce extreme scores (too high or too low)
2. **Degenerate detection**: Find infinite loops, softlocks, or exploits
3. **Ability interaction bugs**: Catch unexpected trigger chains
4. **Frequency sanity**: Ensure no loadout starves the board of matchable symbols

### Approach

1. Run N random games (e.g., 10,000) per loadout
2. For each game, simulate tile generation, random placements, and random respins
3. Track: final score, matches formed, abilities triggered, board fill %, turns taken
4. Compare loadout scores against a baseline (all-base-symbols run)
5. Flag outliers: >3 standard deviations from baseline mean
6. Brute-force random 5-from-14 combinations, surface the top/bottom performers

### Metrics to track per run

- Total score
- Score breakdown by symbol
- Ability trigger count per ability
- Board fill % at end
- Tiles placed vs. tiles available
- Respins used (free + bought)
- Locked cell count at end
- Number of recipe_match triggers
- Max single match score

### Output

- Ranked loadout leaderboard (avg score, median, stddev)
- Flagged "broken" combos (>3 SD above mean)
- Flagged "dead" combos (>3 SD below mean, or high softlock rate)
- Per-symbol power ranking (avg contribution to score across all loadouts containing it)

## Open Questions

- Should frequency be absolute or relative? (Currently relative to total pool weight.)
- Should match_length 1 symbols lock immediately on placement? (Currently yes — they always "match".)
- How many total symbols is the long-term target? 30? 50?
- Should there be a "reroll" mechanic in the draft? (e.g., see 8 symbols, pick 5)
- Should unlock progress persist across sessions? (Yes — needs local storage or backend.)
- How to handle symbol abilities that modify the board during animations? (Timing/ordering.)
