# Working

## Current Task
Neon UI redesign — Task 4 of 8 complete, created neon-styled UI components.

## Progress
- [x] Task 1: Install dependencies & create file scaffolding (types.ts, constants.ts, theme.ts)
- [x] Task 2: Create SVG symbol components (src/symbols/)
- [x] Task 3: Extract game logic into src/ modules (grid.ts, level.ts, scoring.ts, store.ts)
- [x] Task 4: Create UI components with neon styling (src/components/)
- [ ] Task 5: Create screen components
- [ ] Task 6: Rewrite App.tsx as thin root
- [ ] Task 7: Add web glow effects & polish
- [ ] Task 8: Clean up & delete old code

## Next Steps
- Task 5: Create screen components (TitleScreen, LevelPreview, PlayingScreen, GameOverScreen)
- Task 6: Rewrite App.tsx to import from new modules
- Task 7: Add web glow effects & polish

## Recent Decisions
- Replaced emoji SYMBOL_DISPLAY with SVG SymbolIcon components in Cell, BottomBar, HelpPanel
- Replaced text arrows with Arrow SVG component in Cell and EntrySpotButton
- Applied neon theme colors from theme.ts to all cell states (empty, filled, wall, preview, placed, holdReady, reachable)
- Highlight overlay colors: gold -> colors.gold, red -> colors.red, blue -> colors.cyan
- Added fontFamily (fonts.regular/semiBold/bold) to all Text elements
- HUD/BottomBar/HelpPanel have neon surface bg with border styling
- Each component uses local StyleSheet.create()
- Grid.tsx is the largest component — preserves exact gesture/keyboard logic from App.tsx

## Blockers/Notes
- App.tsx not modified yet — still has all original code, new modules are additive
- Dormant code in App.tsx will be cleaned up in Task 8
- TypeScript passes clean with no errors
