# Working

## Current Task
Roguelike feature — Task 2 complete. Next: Task 3 (make grid setup configurable).

## Progress
- [x] Task 1: Added LevelConfig type and LEVEL_CONFIGS constant (10 levels with escalating difficulty)
- [x] Task 2: Made symbol pool and tile count configurable via parameters
- [ ] Task 3: Make grid setup configurable (obstacles + board mask + wall symbol)
- [ ] Task 4: Make entry spots and createInitialState config-driven
- [ ] Task 5-6: Add RunState store and wire game completion
- [ ] Task 7-11: Between-level screens
- [ ] Task 12: Shop screen
- [ ] Task 13: Hook relic effects into game logic
- [ ] Task 14-16: HUD, styling polish, and playtest

## Next Steps
- Task 3: Make grid setup configurable (obstacles + board mask + wall symbol)

## Recent Decisions
- LevelConfig includes boardMask (boolean[][] | null) for shaped boards
- ObstacleCell uses Symbol | 'wall' for obstacle types
- Board shapes: cross (level 6, corners cut), L-shaped (level 8, top-right quadrant cut)
- Obstacles placed away from entry spots (top: row 0 cols 3-4, bottom: row 7 cols 3-4)
- IIFEs used for boardMask arrays to keep the constant clean

## Blockers/Notes
- expo-haptics has web shim (no-ops on desktop)
- useNativeDriver: true falls back to JS animation on web (console warning only)
