# Working

## Current Task
Procedural level generator — simplify roguelike, focus on board generation.

## Status
Plan written, reviewed, and committed. **Not yet executed.** Ready to start Task 1.

## Plan Location
`docs/superpowers/plans/2026-03-09-procedural-levels.md` (6 tasks)

## Design Spec
`docs/superpowers/specs/2026-03-09-procedural-levels-design.md`

## What We're Doing
Replacing hardcoded LEVEL_CONFIGS with a `generateLevelConfig(level)` function that randomly places walls and derives threshold from playable cell count. Making dormant all roguelike features (relics, coins, shop, reward/victory screens) so we can focus on getting board generation and difficulty scaling right through playtesting.

## Key Design Decisions
- Full 8x8 board always, no board masks — walls/carveouts only
- Threshold = `(64 - wallCount) * SCORE_COEFFICIENT * levelScalar`
- Tuning knobs: WALL_SCALAR (~1.5), SCORE_COEFFICIENT (55), LEVEL_SCALAR_MAX (~1.5)
- Wall placement: random, skip entry spot cells, no other constraints initially
- Symbol count fixed at 5, respins fixed at RESPINS_PER_LEVEL, entries fixed at 2
- Symbol weighting stays active
- Run flow simplified to: title → levelPreview → playing → gameOver
- GameOverScreen handles both victory (level 10 beaten) and failure
- Dormant code commented out (not deleted) for easy re-enablement

## Plan Tasks (all pending)
1. Add procedural level generator and tuning constants
2. Simplify RunState — remove dormant features
3. Remove relic effects from scoring and game logic
4. Simplify screens and App routing
5. Comment out dormant code, verify game runs
6. Update WORKING.md

## Future (after board gen feels right)
- Symbol count variation
- Respin count variation
- Entry spot variation
- Relics and coin economy
- Shop

## Blockers/Notes
- Code review flagged: threshold range with current coefficient is narrow (3465-4043) vs old hardcoded (2500-9500) — will need tuning
- RESPINS_PER_LEVEL is 5 in code, spec said 4 — using existing constant
- Dormant screens must be commented out (not just marked) because they reference removed RunState properties
