# Slominoes Roguelike Design

## Run Structure

10 linear levels, permadeath. Fail any level = run over.

**Level flow:**
1. Level preview screen (board layout, threshold, modifiers)
2. Play the level (place tiles, respin, score)
3. Win → reward screen (pick 1-of-3 relics, earn coins)
4. Shop (after levels 3, 6, 9)
5. Level 10 win = run complete, show victory screen

**Game over screen:** Shows level reached, final score, relics collected, coins earned. "Run again" button to restart.

## Coins

- **Surplus scoring:** `coins = 50 + max(0, score - threshold)`
- **Unspent respins:** each unused respin = 200 bonus coins
- **Within-run only** — wiped on death, no cross-run persistence
- Creates bank-or-gamble tension: stop respinning to pocket coins, or push for more surplus

## Relics

Pick 1-of-3 after each level win. Passive bonuses that stack for the rest of the run. ~12 relics at launch.

### Scoring
- **Lucky 7s** — seven symbols score 2x
- **Combo King** — 4+ length matches get an extra multiplier tier
- **Greed** — surplus coins x1.5

### Resource
- **Extra Spin** — +1 respin per level
- **Crystal Ball** — see 2 tiles ahead instead of 1
- **Wide Entry** — entry spots span 3 columns instead of 2

### Placement
- **Wildcard** — every 5th tile has one wild symbol (matches anything)
- **Rotate Free** — tile auto-rotates to best fit on placement
- **Pathfinder** — BFS can pass through 1 filled cell (ignores first obstacle)

### Defensive
- **Safety Net** — first failed level doesn't end the run (one-time save, consumed on use)
- **Overflow** — excess score above threshold carries as bonus coins (stacks with Greed)

## Shop

Appears after levels 3, 6, 9. 3-4 randomized items per visit. Prices scale per visit.

**Item types:**
- **Relics** — buy ones not offered as rewards (~800-1200 coins)
- **Extra respins** — +2 respins for next level (~300 coins)
- **Intel** — preview next level's board layout and threshold (~200 coins)
- **Tile reroll** — once per level, discard current tile and draw new (~400 coins)
- **Entry unlock** — add left/right entry spots for next level (~500 coins)

All prices are playtesting placeholders.

## Difficulty Curve

| Level | Threshold | Respins | Symbols | Board | Entry Spots |
|-------|-----------|---------|---------|-------|-------------|
| 1 | 2500 | 4 | 5 | 8x8 clean | 2 |
| 2 | 3000 | 4 | 5 | 2 obstacles | 2 |
| 3 | 3500 | 4 | 5 | 4 obstacles | 2 |
| 4 | 4000 | 3 | 6 | 6 obstacles | 2 |
| 5 | 4500 | 3 | 6 | 8 obstacles | 2 |
| 6 | 5000 | 3 | 6 | Cross-shaped | 2 |
| 7 | 6000 | 2 | 7 | 10 obstacles | 2 |
| 8 | 7000 | 2 | 7 | L-shaped | 1 |
| 9 | 8000 | 2 | 7 | Nasty layout | 2 |
| 10 | 9500 | 2 | 7 | Boss layout | 1 |

**Escalation pattern:**
- Respins: 4 → 3 (level 4) → 2 (level 7)
- Symbols: 5 → 6 (level 4) → 7 (level 7)
- Obstacles from level 2, board shapes from level 6
- Entry spots reduced to 1 on levels 8 and 10
- All numbers are playtesting placeholders

## Screens (new)

1. **Run start** — "New Run" button, maybe show best past run
2. **Level preview** — board shape, threshold, modifier badges
3. **Playing** — existing game screen (with relic effects active)
4. **Level win / reward** — relic pick (1-of-3), coin summary
5. **Shop** — item grid with prices, coin balance
6. **Run complete (victory)** — final stats, celebration
7. **Game over** — level reached, score, relics collected, coins earned, "Run again"

## What Changes from Current Prototype

**New systems:**
- Run state (level number, coins, relics inventory)
- Level config (threshold, respins, symbol pool, obstacles, board shape, entry count)
- Relic effect hooks into game logic (scoring, placement, respins)
- Between-level screens (relic pick, shop, level preview)

**Modified:**
- Game loop: single-shot → level sequence with meta state
- Board setup: clean grid → configurable obstacles/shapes
- Symbol pool: fixed 5 → configurable per level
- Entry spots: fixed 2 → configurable per level
- Scoring: fire-and-forget → feeds into coin economy
