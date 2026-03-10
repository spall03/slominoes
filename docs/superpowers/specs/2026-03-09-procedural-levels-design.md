# Procedural Level Generator — Design

## Goal

Replace hardcoded `LEVEL_CONFIGS` with a procedural generator. Make dormant all roguelike features beyond basic level progression so we can focus on getting board generation and difficulty scaling right through playtesting.

## Generator

### `generateLevelConfig(level: number): LevelConfig`

- **Board:** Always 8x8, no board mask
- **Walls:** `wallCount = floor(level * WALL_SCALAR)` — `WALL_SCALAR` starts at ~1.5 (level 1 = 1 wall, level 10 = 15 walls)
- **Wall placement:** Random positions, skip entry spot cells (row 0 cols 3-4, row 7 cols 3-4). No other constraints initially.
- **Threshold:** `(64 - wallCount) * SCORE_COEFFICIENT * levelScalar` — `SCORE_COEFFICIENT` is a base tuning knob, `levelScalar` ramps linearly from 1.0 to `LEVEL_SCALAR_MAX` (~1.5)
- **Symbol count:** 5 (fixed)
- **Respins:** 4 (fixed)
- **Entry spots:** 2 (fixed)
- **Tiles per level:** 15 (fixed)

### Tuning Knobs (constants at top of file)

- `WALL_SCALAR` — walls per level multiplier
- `SCORE_COEFFICIENT` — base points-per-playable-cell
- `LEVEL_SCALAR_MAX` — how much harder level 10 is vs level 1

## Run Flow (simplified)

`title → levelPreview → playing → gameOver`

No reward screen, no shop, no victory screen. Game over shows level reached and "Play Again."

## What Goes Dormant

Code stays in the file but is disconnected from the active flow:

- **Hardcoded `LEVEL_CONFIGS` array** — replaced by generator
- **`boardMask`** field on `LevelConfig` and cross/L-shaped board logic
- **All relics:** `ALL_RELICS`, relic effect hooks in scoring/placement/respins, relic UI in HUD
- **Coin economy:** coin calculation in `completeLevel`, coin display
- **Shop system:** `ShopItem`, shop screen, `generateShopItems`, `buyShopItem`
- **Reward screen** (relic pick)
- **Victory screen**
- **RunState bonus fields:** `bonusRespins`, `hasTileReroll`, `hasEntryUnlock`

## What Stays Active

- **`RunState`** with simplified phases: `title`, `levelPreview`, `playing`, `gameOver`
- **Level preview screen** — shows generated wall layout + threshold
- **Game over screen** — level reached + play again
- **`LevelConfig` type** (simplified — walls only, no mask)
- **`createGridFromConfig`**, wall rendering, wall-aware matching/respins
- **Title screen**
- **Skip respins button**
- **Symbol weighting** (value-based appearance frequency)

## Future Expansion

Once board generation and threshold tuning feel good through playtesting, re-enable features one at a time via the difficulty budget system:

1. Symbol count variation (5 → 6 → 7 across levels)
2. Respin count variation
3. Entry spot variation
4. Relics and coin economy
5. Shop
