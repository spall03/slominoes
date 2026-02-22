# Working

## Current Task
Two-phase diff animation for respins — shipped.

## Progress
- [x] Added matchKey utility for diffing matches by cell coords
- [x] Added highlightColor and pendingPhase2 state fields
- [x] Respin now diffs before/after matches, shows red blink (broken) then blue blink (new)
- [x] ScorePopup supports negative scores (red, drift down) and positive (green, drift up)
- [x] AnimatedCell accepts highlightColor prop (red/blue/gold)
- [x] Removed text-based match breakdown panel (superseded by visual diff)
- [x] Fixed keyboard handler that called respinLine inside setState updater
- [x] Consolidated set() calls in respinLine for atomic state updates
- [x] Deployed to GitHub Pages

## Next Steps
- None pending

## Recent Decisions
- Animation state set atomically with grid mutation in single set() call (avoids React batching issues)
- Keyboard respin uses ref for cursor value instead of setState updater (avoids "Cannot update during render" error)
- Placement-phase gold animation unchanged; respin uses red (broken) → blue (new) sequence

## Blockers/Notes
- expo-haptics has web shim (no-ops on desktop)
- useNativeDriver: true falls back to JS animation on web (console warning only)
