# Slominoes — FTUE Level 0 Design

**Date:** 2026-05-03
**Status:** DRAFT — pending second-opinion review and plan grooming
**Author:** Steve Palley (with Claude)
**Replaces:** Existing slide-deck `Tutorial.tsx` overlay flow

---

## Goal

Replace the current text-overlay tutorial with a **playable Level 0** that teaches Slominoes' core mechanics through forced/guided gameplay. Players learn by doing, not reading.

**The bet:** a 60-second playable demo that walks the player through their first match, first respin, and first locked-cell observation will produce dramatically better Day-1 retention than any explainer slide deck. *Threes*, *Slay the Spire*, *Into the Breach* all use this pattern for the same reason: puzzle mechanics can't be taught from a slide — the player needs to feel them.

**Triggered:** the first time a player taps "NEW RUN" with `hasTutorialBeenSeen() === false`. After completing Level 0, flag is set, subsequent runs skip directly to Draft.

---

## Why this replaces the existing Tutorial

The current `Tutorial.tsx` was written when the UI was simpler. The 2026-04 design audit (Move 01–03) collapsed the palette, rebuilt the HUD, restructured the draft card, and changed entry-spot affordances. The slide-deck tutorial now teaches against UI that doesn't exist anymore.

More fundamentally: a 5-slide overlay loaded with screenshots and arrow-pointing-at-thing illustrations is the *wrong shape* for teaching tile-puzzle mechanics. The Player needs to:
- *Touch* an entry spot
- *See* a tile slide in
- *Watch* a match resolve and lock
- *Tap* the respin button and see the SpinCell animation cycle

None of these can be communicated by text + still images.

---

## Core flow

```
TitleScreen
  ↓ tap "NEW RUN"
  ↓
[if !hasTutorialBeenSeen]
  Level 0 (playable demo, ~60s)
  ↓ complete
  Set hasTutorialBeenSeen = true
  ↓
Draft (with first-time-only one-line overlay: "Pick your symbols")
  ↓ confirm
LevelPreview (Level 1)
  ↓ start
Playing (Level 1, real run)
```

**On subsequent runs:** skip Level 0 and the draft overlay. Direct to Draft → Playing.

**Replay:** Settings → "Replay Tutorial" entry runs Level 0 standalone (doesn't affect any run state).

---

## Level 0 design

### Board state (initial)

8×8 grid with:
- **Pre-seeded:** 2 cherries at `(5, 3)` and `(5, 4)` — adjacent, same row
- **Pre-seeded:** 1 bar at `(3, 1)` — isolated, sets up later respin lesson
- **Walls:** none (avoid teaching obstacles in v1 of FTUE)
- **Entry spots:** **one** single entry on top edge at columns 3–4 (no side or bottom entries — fewer choices, simpler decision)

### Tile queue (4 tiles total)

| # | Tile | Designed for |
|---|---|---|
| 1 | cherry + lemon | Player places at row 5 col 5 → 3-cherry match → lock |
| 2 | bell + lemon | Mostly free placement; teaches that not every move is a match |
| 3 | bar + lemon | Player places near the (3,1) bar; 1-of-3 cherries match still possible |
| 4 | bar + bar | After placing, the bar row has 2–3 bars near a match — respin trigger |

### Configuration

```ts
TUTORIAL_LEVEL_CONFIG = {
  level: 0,
  threshold: 30,             // very low — completable with 1 match (cherries = 30 base)
  respins: 1,                // exactly one respin available
  tilesPerLevel: 4,
  symbolCount: 5,            // base symbols only
  obstacles: [               // pre-seeded board
    { row: 5, col: 3, symbol: 'cherry' },
    { row: 5, col: 4, symbol: 'cherry' },
    { row: 3, col: 1, symbol: 'bar' },
  ],
  entrySpotCount: 1,         // single entry, top of board
  boardMask: null,
};
```

### Forced loadout

Level 0 uses the 5 base symbols only (no abilities, no draft). The player has not yet been to the draft screen — first draft happens *after* Level 0 completes.

### Hint sequence

The Level 0 hint flow uses the existing hint-decay system from Move 02 but with a custom script that fires per-placement-step (not on idle):

| Step | Trigger | Hint text | Position |
|---|---|---|---|
| 1 | Mount | "Tap the blue arrow to place your first tile" | Above grid |
| 2 | Tile placed at (5,5), 3-cherry match resolves | "✨ Three cherries match! Locked cells stay safe from respins." | Centered, fades after 2s |
| 3 | Tile #2 placed (any cell) | "Not every move is a match. Place tiles to set up future combos." | Above grid |
| 4 | Tile #3 placed | "Tap RESPIN to shuffle a row or column." | Pulses on respin badge |
| 5 | Respin button tapped | "Pick the row with your bars to try for a match." | Pulses on a row button |
| 6 | Respin completes (whether or not match formed) | "That's a respin! Now finish strong." | Centered |
| 7 | Level threshold met or queue empty | "VICTORY — now pick your loadout!" | GameOverScreen |

### Why threshold = 30

Score 30 = a single base-cherry match (10 pts × 3 length). A successful step 1 placement IS the win condition. Player gets a quick dopamine hit. Subsequent placements accumulate score for the "BANKED" feel but the level is already won.

### Edge cases

- **Player takes a non-suggested action** (e.g., tries to respin before step 4): allow it — never block. Hints are guidance, not rails.
- **Player runs out of tiles before respinning**: still complete the level. Step-4-6 hints don't fire. Player learns respin organically in Level 1.
- **Player matches faster than scripted** (e.g., gets a 3-cherry on tile 1 then a 3-bar on tile 2): the level ends early via auto-end logic. That's fine — lesson absorbed.
- **Player hits respin first thing**: not blocked. The hint at step 5 ("pick the row with your bars") may fire pre-emptively, which is fine.

---

## State machine integration

### `useRunStore` additions

```ts
// existing
runPhase: 'title' | 'draft' | 'levelPreview' | 'playing' | 'gameOver'
// proposed: introduce 'tutorial' phase, OR overload existing with currentLevel === 0

// preferred: currentLevel === 0 + a hasTutorialBeenSeen flag in useMetaStore
```

**Recommendation:** treat Level 0 as a special-cased Level 1, gated by `useMetaStore.hasTutorialBeenSeen`. No new runPhase — keeps the state machine minimal. The `Tutorial`-specific UI behavior (forced loadout, scripted hints, threshold = 30) is selected by the level config returned from `generateLevelConfig(0)`.

### `useMetaStore` additions

```ts
hasTutorialBeenSeen: boolean;  // persisted; defaults to false on fresh install
```

Set true after `completeLevel(...)` fires for level 0. Persisted via existing AsyncStorage layer.

### `level.ts` additions

```ts
export function generateLevelConfig(level: number): LevelConfig {
  if (level === 0) return TUTORIAL_LEVEL_CONFIG;  // hardcoded, no procedural gen
  // existing logic for level >= 1
}
```

### `useRunStore.startRun()` modifications

```ts
startRun: () => {
  const tutorialSeen = useMetaStore.getState().hasTutorialBeenSeen;
  if (tutorialSeen) {
    // existing path: go to draft
    set({ runPhase: 'draft', currentLevel: 1, ... });
  } else {
    // tutorial path: skip draft, force level 0 with base loadout
    const tutorialLoadout = SYMBOL_ROSTER.filter(s => s.base);
    const freqs = buildFrequencyTable(tutorialLoadout);
    const config = generateLevelConfig(0);  // returns TUTORIAL_LEVEL_CONFIG
    set({
      runPhase: 'levelPreview',
      currentLevel: 0,
      levelConfig: config,
      bonusRespins: 0,
    });
    useGameStore.setState({ loadoutFreqs: freqs, loadoutDefs: tutorialLoadout });
  }
},
```

### `useRunStore.completeLevel()` modifications

```ts
completeLevel: (score, threshold, respinsLeft) => {
  if (get().currentLevel === 0) {
    // Tutorial complete
    useMetaStore.getState().setTutorialSeen();
    set({ runPhase: 'draft', currentLevel: 1, levelScore: 0, ... });
    return;
  }
  // existing logic
},
```

### Component changes

- `LevelPreviewScreen.tsx` — when `currentLevel === 0`, show a different UI: "TUTORIAL" header, simpler stat row, "START TUTORIAL" CTA copy
- `Grid.tsx` — no behavioral change; just renders the pre-seeded board
- New: `TutorialHints.tsx` — manages the scripted hint sequence, listens to game-store state changes
- `PlayingScreen.tsx` — when `currentLevel === 0`, render `<TutorialHints>` instead of the normal hint-decay flow
- `GameOverScreen.tsx` — when `currentLevel === 0`, show different copy: "TUTORIAL COMPLETE — pick your symbols!" → "CONTINUE" CTA → routes to Draft

### Settings replay

- `SettingsScreen.tsx` — add new row "Replay Tutorial" → calls `useMetaStore.replayTutorial()` which sets `hasTutorialBeenSeen = false` AND triggers a `startRun()`. Routes through Level 0 again. After completion, `hasTutorialBeenSeen` is set true again.

### Removed

- `Tutorial.tsx` — deleted
- `hasTutorialBeenSeen` AsyncStorage key in Tutorial.tsx — replaced by useMetaStore's persisted flag (migration: read old key on first load, set new flag, delete old key)
- Tutorial slide deck assets in `docs/stitch-designs/ftue-tutorial-mockup.html` — keep for reference but no longer rendered

---

## What this spec does NOT cover

- **Drafting tutorial** — handled by a single-overlay tooltip on first Draft screen visit, scoped separately. Out of FTUE Level 0.
- **Symbol ability tutorial** — encountered organically when player drafts ability symbols. Not taught explicitly. (Future: ability-introduction overlays on first-draft-of-each-ability could be a v1.1 polish slice.)
- **Ad CTA tutorial** — rewarded "EARN" buttons and Continue CTAs explain themselves with their own copy. Not in Level 0.
- **Buy-respin economy** — discoverable from in-game UX. Not in Level 0.
- **Bonus respin banking** — discoverable from the "+X BANKED" indicator on level preview. Not in Level 0.
- **Auto-end at +15%** — discovered organically when a player overperforms. Not in Level 0.
- **Wall obstacles** — Level 0 has no walls. Walls are a Level 2+ concept (procedurally introduced).

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Player skips reading hints, doesn't learn | Hints are inline + persistent, not modal. Fresh-restart on level fail (which can't happen at threshold=30 on a 4-tile demo unless player tries hard) |
| Pre-seeded board feels like cheating | Frame it as "we set up a starter board for you" via the LevelPreview screen copy |
| Tutorial too long for impatient players | 4 tiles + 1 forced respin = ~60s. Skip option is "abandon run" → settings (clunky on purpose). Replay always available |
| Player learns wrong (e.g., thinks respin is free always) | Level 1 introduces real economy organically with `bonusRespins=5` seed; no broken expectation |
| Tutorial state interacts with ad init | Level 0 is hardcoded to skip all ad CTAs (no rewarded affordance, no continue, no interstitials). `firstRunCompleted` flag in `useMetaStore` only sets `true` after Level 1 completes, not Level 0 |
| Replay path breaks unlock progression | Replay sets `hasTutorialBeenSeen=false` then back to true. Doesn't touch unlock state |

---

## Open questions

1. **Single entry spot in Level 0 or two?** Two entries teach the entry-choice mechanic; one is simpler. Lean: **one** (simpler is better for first-touch).
2. **Should the hint text use Slominoes' neon palette colors, or stick to ink for legibility?** Lean: **ink + occasional cyan accent on action verbs ("tap RESPIN")**.
3. **Tutorial replay: should it count toward unlock progress / stats?** Lean: **no** — replays don't bump `totalRuns`, `cumulativeScore`, etc. Pure tutorial.
4. **What does the LevelPreviewScreen show for Level 0?** Pre-built layout? Threshold (30) and respin (1) badges? Recommend a stripped-down preview labeled "TUTORIAL" that just says "Tap START to begin."
5. **Skip option?** Lean: **no skip in v1**. Tutorial is short. Replay path means it's never permanently inflicted.

---

## Phased rollout

### Phase 1 — Spec + plan
- This spec → second opinion → plan
- ~1 day total

### Phase 2 — Core implementation (~2 days)
- `TUTORIAL_LEVEL_CONFIG` constant + `generateLevelConfig(0)` branch
- `hasTutorialBeenSeen` flag in useMetaStore + persistence
- `startRun` branch logic
- `completeLevel` branch logic
- `LevelPreviewScreen` Level 0 variant
- `GameOverScreen` Level 0 completion variant
- Replay entry in SettingsScreen

### Phase 3 — Hint system (~1 day)
- New `TutorialHints` component
- Per-step trigger logic (placement number, respin tap, etc.)
- Hint copy + positioning
- Animation in/out

### Phase 4 — Removal of old Tutorial (~half day)
- Delete `Tutorial.tsx`
- Delete its imports
- Remove old AsyncStorage key
- Update tests if any

### Phase 5 — Playtest + tune
- Self-playtest by Steve
- Adjust hint copy / timing based on feel
- Lock for ad-support submission

**Total estimate: ~4 working days** — overlaps with ad-support Phase 1–2 (no file conflicts).

---

## Next steps

1. Steve reviews this spec
2. Optional: second-opinion consensus review (recommended for the hint script + state machine integration)
3. Groom into `docs/superpowers/plans/2026-05-03-ftue-level-zero-impl.md`
4. Execute Phases 2–5 in parallel with ad-support Phases 1–4
