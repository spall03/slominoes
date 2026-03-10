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
