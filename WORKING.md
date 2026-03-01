# Working

## Current Task
Roguelike feature — All 16 tasks complete.

## Progress
- [x] Task 1: Added LevelConfig type and LEVEL_CONFIGS constant (10 levels with escalating difficulty)
- [x] Task 2: Made symbol pool and tile count configurable via parameters
- [x] Task 3: Added wall symbol, createGridFromConfig, updated matching/respins for obstacles
- [x] Task 4: Made entry spots and createInitialState config-driven
- [x] Task 5-6: Added RunState store (useRunStore) with roguelike meta-layer; wired game completion
- [x] Task 7-11: Between-level screens (title, levelPreview, reward, shop, victory, gameOver)
- [x] Task 12: Shop screen with item purchasing and bonuses
- [x] Task 13: Hook relic effects into game logic
- [x] Task 14: Run info HUD (level, coins, relics) shown during gameplay
- [x] Task 15: Consistent styling (borderRadius 10, gold headings, HUD styles)
- [x] Task 16: TypeScript compiles cleanly, title is "Slominoes" everywhere

## Next Steps
- Playtesting and polish
- Implement remaining complex relic effects (Wildcard, Rotate Free, Pathfinder)

## Recent Decisions
- LevelConfig includes boardMask (boolean[][] | null) for shaped boards
- ObstacleCell uses Symbol | 'wall' for obstacle types
- Board shapes: cross (level 6, corners cut), L-shaped (level 8, top-right quadrant cut)
- Obstacles placed away from entry spots (top: row 0 cols 3-4, bottom: row 7 cols 3-4)
- IIFEs used for boardMask arrays to keep the constant clean
- RunState store (useRunStore) manages 10-level roguelike progression
- 11 relics defined in ALL_RELICS with 4 categories: scoring, resource, placement, defensive
- Coins: base 50 + surplus over threshold + (unused respins * 200); Greed relic = 1.5x
- Relic rewards after every level (pick 1 of 3); shop after levels 3, 6, 9
- Safety Net relic consumed on failure to retry the level
- "Play Again" button now calls useRunStore.getState().startRun() instead of resetGame()
- Shop generates items via generateShopItems(shopVisit, ownedRelicIds)
- Shop price scaling: 1x/1.5x/2x for visits 1/2/3
- Shop items: respins (+2), relic (random unowned), tile reroll, entry unlock (4 entries)
- RunState has bonusRespins, hasTileReroll, hasEntryUnlock — reset after startLevel consumes them
- buyShopItem handles all item types (relic, respins, tileReroll, entryUnlock)

## Blockers/Notes
- expo-haptics has web shim (no-ops on desktop)
- useNativeDriver: true falls back to JS animation on web (console warning only)
- hasTileReroll flag is stored but not yet consumed in game logic (needs follow-up)
- Wildcard, Rotate Free, Pathfinder relics: defined in ALL_RELICS but effects not yet implemented (complex logic)
