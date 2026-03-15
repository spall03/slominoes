# Working

## Current Task
Mid-game respins — completed implementation.

## Progress
- [x] Added generateLevelConfig() with WALL_SCALAR, SCORE_COEFFICIENT, LEVEL_SCALAR_MAX tuning knobs
- [x] Simplified RunState to title/levelPreview/playing/gameOver only
- [x] Removed relic effects from scoring
- [x] Simplified all screens (no coins, relics, shop, reward)
- [x] Marked dormant code with DORMANT comments for easy re-enablement
- [x] Mid-game respins: removed respinning phase, respins available during placement
- [x] Live scoring (no ratcheting) — respins are genuine risk/reward
- [x] Removed skipRespins action and UI
- [x] Respin keyboard controls work during placing phase (R key to fire)

## Next Steps
- Playtest mid-game respins for balance
- Tune WALL_SCALAR, SCORE_COEFFICIENT, LEVEL_SCALAR_MAX
- Consider smarter wall placement (clustering, avoid isolating regions)
- Consider adding symbol count variation to difficulty budget
- Re-enable features one at a time once board generation feels right

## Recent Decisions
- Full 8x8 board always, no board masks — walls/carveouts only
- Threshold derived from playable cell count (heuristic, not simulation)
- All roguelike features (relics, coins, shop, reward) dormant but code preserved
- Symbol weighting stays active
- Respins usable during tile placement (not after)
- Score recalculated live after every respin — can go down
- Running out of respins doesn't end game — placing last tile does
- Stuck (no valid placements) ends game immediately

## Blockers/Notes
- Dormant code: LEVEL_CONFIGS, ALL_RELICS, Relic/ShopItem types, RewardScreen, ShopScreen, VictoryScreen
- hasTileReroll was never consumed in game logic (noted before, still dormant)
- Wildcard, Rotate Free, Pathfinder relics were never implemented (still dormant)
