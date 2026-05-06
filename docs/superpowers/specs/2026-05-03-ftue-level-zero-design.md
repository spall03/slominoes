# Slominoes — FTUE Level 0 Design (v3)

**Date:** 2026-05-03
**Status:** APPROVED — moving to plan grooming
**Author:** Steve Palley (with Claude)
**Replaces:** Existing slide-deck `Tutorial.tsx` overlay flow
**Supersedes:** v2 (same date) — incorporates GPT-5.2 second-opinion findings (Gemini 2.5 Pro errored)

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

### Tile queue (4 tiles total) — soft rails

The queue is engineered so that **tile 2 is structurally non-matching** given the post-tile-1 board state, and **tile 3 sets up a near-match that makes respin obviously useful**.

| # | Tile | Why this composition |
|---|---|---|
| 1 | cherry + lemon | Player places at row 5 col 5–6 → 3-cherry match at (5, 3-5) → locks. Lemon at (5, 6) unlocked. Score = 30. |
| 2 | bell + seven | **Both symbols absent from current board** — no possible 3-match regardless of placement. Player learns "not every move scores" by structural guarantee, not luck. |
| 3 | bar + bell | Player places bar adjacent to the pre-seeded bar at (3, 1) → 2 bars in row 3, near-match obvious. The bell is a distractor. |
| 4 | seven + lemon | Cleanup tile. Lands after the respin lesson. May or may not match — doesn't matter; level ends on queue empty regardless. |

### Configuration

```ts
TUTORIAL_LEVEL_CONFIG = {
  level: 0,
  threshold: 30,             // single 3-cherry match wins (instant dopamine)
  respins: 1,                // exactly one respin available
  tilesPerLevel: 4,
  symbolCount: 5,            // base symbols only — no abilities
  obstacles: [               // pre-seeded board
    { row: 5, col: 3, symbol: 'cherry' },
    { row: 5, col: 4, symbol: 'cherry' },
    { row: 3, col: 1, symbol: 'bar' },
  ],
  entrySpotCount: 2,         // top + bottom (matches Level 1+ shape)
  boardMask: null,
  // Tutorial-only flags (new in v3 per GPT consensus review):
  disableAutoEnd: true,      // CRITICAL — see "Auto-end interaction" below
  isTutorial: true,          // single source of truth for downstream gating
};
```

### Auto-end interaction — why `disableAutoEnd` is required

The existing engine in `src/store.ts` `confirmPlacement` triggers auto-end when `score >= threshold * 1.15`. With `threshold = 30`, that fires at **score ≥ 34.5**. A single 3-cherry match is exactly 30, but any incidental adjacent-symbol pickup pushes the player past 34.5 and ends Level 0 **before tile 3 (the respin lesson)**.

To prevent the tutorial from ending randomly mid-script, `LevelConfig` gains a `disableAutoEnd: boolean` field. The auto-end check in `confirmPlacement` becomes:

```ts
const autoEndForBonus = !levelConfig.disableAutoEnd
  && !isComplete
  && newTotalScore >= threshold * 1.15;
```

Pure level-0 fix, no behavior change for Levels 1–10.

### Two entries instead of one

The spec went through one revision on this. Initial design used a single top entry to minimize choice surface. Updated to **top + bottom (both at cols 3–4)** because:

- Matches the entry configuration of real Level 1+ runs — player learns against the right shape from turn 1
- The choice between entries is the lesson — neither is "wrong," both reach the cherry pair at row 5
- Tutorial hint copy can point this out inline: *"Tap an entry arrow on the top or bottom"*

### Forced loadout

Level 0 uses the 5 base symbols only (no abilities, no draft). The player has not yet been to the draft screen — first draft happens *after* Level 0 completes.

### Hint visual styles

Two styles. No tooltip-with-arrow visual — words do the pointing.

| Style | When | Renders as |
|---|---|---|
| **Banner** | Default for all instructional hints | Text in the hint-area above the grid (reuses Move-02 `styles.hintText` region — same place Level 1+ idle hints appear) |
| **Centered overlay** | "Wow moment" beats only — match celebrations, respin completion | Semi-transparent ink-tinted backdrop over the grid, large gold text, 2s linger then fade |

For the respin-badge pulse: the badge itself pulses (subtle scale + cyan glow) while the banner hint copy points at it in plain language ("Tap the RESPIN button — top right"). No separate tooltip rendering.

### Hint sequence

The Level 0 hint flow uses the existing hint-decay infrastructure from Move 02 but with a custom script that fires per-placement-step (not on idle):

| Step | Trigger | Style | Copy |
|---|---|---|---|
| 1 | Mount | Banner | "Tap an entry arrow on the top or bottom to place your first tile." |
| 1.5 | First entry to `placementMode === 'placed'` (tile in placed-state) | Banner | Mobile: "Tap to rotate · Hold to confirm" — Desktop: "Press R to rotate · Enter to confirm" |
| 2 | Tile placed, 3-cherry match resolves | Centered overlay (2s) | "Three cherries match. Matched cells lock — safe from respins." |
| 3 | Tile #2 placed | Banner | "Not every move is a match. Set up future combos." |
| 4 | Tile #3 placed | Banner + respin-badge pulse | "Tap the RESPIN button (top right) to shuffle a row or column." |
| 5 | Respin mode entered | Banner | "Pick the row with your bars to try for a third." |
| 6 | Respin completes (regardless of outcome) | Centered overlay (2s) | "That's a respin. Now finish strong." |
| 7 | Queue empty, level ends | GameOverScreen text | "TUTORIAL COMPLETE — pick your loadout!" |

**Step 1.5 is new in v3.** The current game requires a two-step placement (tap a cell → enter placed-state → tap to rotate / hold to confirm) and the prior Tutorial.tsx Step 3 explicitly taught it. Without this hint, a first-time player who can't figure out how to commit a placement never reaches the match beat.

**Tone tweaks (v3):** dropped the ✨ emoji and rewrote the celebration overlays in a more austere voice that matches the post-audit ink/cyan/gold palette discipline. Cute exclamation marks read as out-of-place against the rest of the UI.

### Out-of-order tolerance

Hints advance on **state events**, not strict step counters. If the player taps respin before placing tile 3, the script jumps to step 5 with substituted copy: "Respins shuffle a row or column. Locked cells won't move (you'll see this once you've matched something)." Edge cases summary:

- **Tap respin before any placement:** advance to step 5 with substituted copy; resume normal flow on next tile.
- **Player matches incidentally on tile 2:** rare given symbol choice; if it happens, suppress the "not every move scores" hint and skip to step 4.
- **Background / force-quit mid-tutorial:** don't persist step-by-step progress. On resume, restart Level 0 cleanly. `hasTutorialBeenSeen` is only set on completion or skip.
- **Stuck (no valid placements in 4 moves):** practically impossible with this layout, but tutorial-only safety valve — if `anyEntryHasValidPlacement` returns false in Level 0, show "No moves — restarting tutorial" and reset.

### Why threshold = 30

Score 30 = a single base-cherry match (10 pts × 3 length). A successful step 1 placement IS the win condition. Player gets a quick dopamine hit. Subsequent placements accumulate score for the "BANKED" feel but the level is already won.

---

## State machine integration

### Approach: `currentLevel === 0` sentinel + centralized gating

No new `runPhase` — keeps the state machine minimal. Tutorial-specific UI behavior is selected by the level config returned from `generateLevelConfig(0)`.

To avoid scattered `currentLevel === 0` checks across many files, introduce a **single source of truth** helper:

```ts
// src/run-helpers.ts
import { useRunStore } from './store';

export const isTutorialRun = (): boolean =>
  useRunStore.getState().currentLevel === 0;
```

All downstream consumers (analytics emits, ad CTAs, unlock checks, stat tracking, `endRun()`, `markFirstRunCompleted()`) gate on `!isTutorialRun()`. This was a [BLOCKING] finding from the consensus review — without centralized gating, missed branches will pollute stats / fire ads / count tutorial as a real run.

### `useMetaStore` additions

```ts
hasTutorialBeenSeen: boolean;  // persisted; defaults to false on fresh install
setTutorialSeen: () => void;
```

### Persistence migration from old key

The existing `Tutorial.tsx` stores its flag at AsyncStorage key `slominoes_tutorial_seen`. To avoid forcing existing players (who already saw the slide-deck tutorial) into Level 0 on app update, migrate on first load:

```ts
// In useMetaStore.loadFromStorage(), before deciding routing:
async function migrateTutorialFlag(): Promise<boolean> {
  try {
    const oldVal = await AsyncStorage.getItem('slominoes_tutorial_seen');
    return oldVal === 'true';
  } catch {
    return false;
  }
}

// loadFromStorage:
const old = await migrateTutorialFlag();
const ads = data.ads ?? defaults();
if (old && !ads.hasTutorialBeenSeen) {
  ads.hasTutorialBeenSeen = true;
  // intentionally don't delete the old key — keep for safe rollback
}
```

Idempotent. Old key preserved for rollback safety.

### `level.ts` additions

```ts
export function generateLevelConfig(level: number): LevelConfig {
  if (level === 0) return TUTORIAL_LEVEL_CONFIG;
  // existing logic for level >= 1
}
```

### `useRunStore.startRun()` modifications

```ts
startRun: () => {
  const { hasTutorialBeenSeen } = useMetaStore.getState();
  if (hasTutorialBeenSeen) {
    set({ runPhase: 'draft', currentLevel: 1, ... });
    return;
  }
  // Tutorial path
  const tutorialLoadout = SYMBOL_ROSTER.filter(s => s.base);
  const freqs = buildFrequencyTable(tutorialLoadout);
  const config = generateLevelConfig(0);
  set({
    runPhase: 'levelPreview',
    currentLevel: 0,
    levelConfig: config,
    bonusRespins: 0,
  });
  useGameStore.setState({ loadoutFreqs: freqs, loadoutDefs: tutorialLoadout });
  events.tutorialStarted();   // analytics — separate event, not run_started
},
```

### `useRunStore.completeLevel()` modifications

```ts
completeLevel: (score, threshold, respinsLeft) => {
  if (isTutorialRun()) {
    // Tutorial complete — DO NOT call useMetaStore.endRun().
    useMetaStore.getState().setTutorialSeen();
    events.tutorialCompleted();
    set({ runPhase: 'draft', currentLevel: 1, levelScore: 0, ... });
    return;
  }
  // existing logic for Levels 1–10
},
```

### Skip flow (`LevelPreviewScreen` for `currentLevel === 0`)

```ts
const handleSkip = () => {
  useMetaStore.getState().setTutorialSeen();
  events.tutorialSkipped();
  useRunStore.setState({ runPhase: 'draft', currentLevel: 1 });
};
```

### Sites that must check `isTutorialRun()` and behave differently

| Site | Behavior in tutorial |
|---|---|
| `useMetaStore.startRun()` | Skip — don't reset `currentRunStats` |
| `useMetaStore.endRun()` | Skip — don't increment `totalRuns`, `cumulativeScore`, etc. |
| `useMetaStore.markFirstRunCompleted()` | Skip — Level 0 doesn't trip the ad-support first-run-completed flag |
| Unlock condition checks in `endRun()` | Skip |
| Ad CTAs (HUD respin-rescue, GameOver continue) | Hide entirely on Level 0 |
| Interstitial firing post-game-over | Skip |
| Analytics: `run_started` / `run_ended` / `level_ended` | Don't fire — emit `tutorial_*` events instead |
| Bonus respin economy | Not active — Level 0 starts with `bonusRespins: 0` |

### Component changes

- `LevelPreviewScreen.tsx` — when `currentLevel === 0`, show a tutorial-specific layout:
  - Header: **TUTORIAL** in cyan
  - Body: "Playable 60-second tutorial." *(emphasizes "playable" — this isn't a slideshow)*
  - Primary CTA: **START** (cyan outline button)
  - Secondary text button: **SKIP — I've played before** (inkDim, no outline)
- `Grid.tsx` — no behavioral change; just renders the pre-seeded board
- New: `TutorialHints.tsx` — manages the scripted hint sequence, listens to game-store state changes for advancement triggers (placement, placed-state-entered, respin tap, respin completion)
- `PlayingScreen.tsx` — when `currentLevel === 0`, render `<TutorialHints>` instead of the normal hint-decay flow; HUD respin badge gets pulse animation when tutorial step 4 fires
- `GameOverScreen.tsx` — when `currentLevel === 0`, show different copy: "TUTORIAL COMPLETE — pick your symbols!" → "CONTINUE" CTA → routes to Draft. Does **not** call `useMetaStore.endRun()`.
- `DraftScreen.tsx` — first-visit overlay (separate flag `hasSeenDraftIntro` in useMetaStore): single line above the symbol grid, ink body, fades after 4s or first symbol tap: **"Pick 5 symbols for your run. You'll draw these tiles on the grid."** *(Motivates the connection draft → gameplay rather than just instructing.)*

---

## Analytics

Per the consensus review and your decision: **Level 0 has its own event family.** It does not fire `run_started`, `run_ended`, `level_ended` — those are reserved for real runs.

New events in `src/analytics-events.ts`:

| Event | Parameters | Fires when |
|---|---|---|
| `tutorial_started` | — | `useRunStore.startRun()` routes to Level 0 |
| `tutorial_step_advanced` | `step: 1 \| 1.5 \| 2 \| 3 \| 4 \| 5 \| 6` | `TutorialHints` advances |
| `tutorial_completed` | `respin_used: boolean` | Queue-empty win on Level 0 |
| `tutorial_skipped` | — | LevelPreview SKIP tap |

User properties — no new ones; `hasTutorialBeenSeen` is captured in `total_runs_played` cohort splits naturally.

This lets us answer:
- What % of new installs complete the tutorial vs skip vs abandon?
- Where in the script do players drop off (which step is the last one fired before they background the app)?
- Does the respin lesson actually fire? (`respin_used: true` on completion vs false)

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

| Risk | Severity | Mitigation |
|---|---|---|
| Auto-end fires mid-tutorial, ends Level 0 before respin lesson | High (was [BLOCKING] in review) | `disableAutoEnd: true` in TUTORIAL_LEVEL_CONFIG; engine gates auto-end on this flag |
| Tutorial pollutes stats / fires ads / counts as a real run | High (was [BLOCKING]) | Centralized `isTutorialRun()` helper; all stat/ad/analytics paths gate on it |
| Player can't figure out rotate/confirm and never reaches match beat | Medium ([IMPORTANT]) | Step 1.5 added: reactive hint on first entry to `placementMode === 'placed'` |
| Tile #2 accidentally creates a match, inverting the lesson | Medium ([IMPORTANT]) | Symbols changed to bell+seven (both absent from current board); structural non-match guarantee |
| Existing players force-tutorialed on app update | Medium ([IMPORTANT]) | One-time AsyncStorage migration from old `slominoes_tutorial_seen` key |
| Player skips reading hints, doesn't learn | Low | Hints are inline + persistent, never modal; out-of-order tolerance |
| Pre-seeded board feels like cheating | Low | LevelPreview copy frames it as "a starter board" implicitly |
| Tutorial too long for impatient players | Low | Skip on LevelPreview ("I've played before"); 60s total if they don't skip |
| Player learns wrong (e.g., thinks respin is free always) | Low | Level 1 introduces real economy organically; no broken expectation |
| Background / force-quit mid-tutorial | Low | No step-by-step persistence; restart Level 0 on resume |
| Stuck (no valid placements in 4 moves) | Low | Tutorial-only safety valve: detect stuck and reset Level 0 with copy "No moves — restarting tutorial" |

---

## Open questions

All major design questions resolved through the v2 walkthrough + v3 second-opinion review. One remaining:

1. **Tutorial replay: should it count toward stats?** Lean: **no** — replays don't bump `totalRuns`, `cumulativeScore`, etc. Pure tutorial. Locked unless playtest reveals a reason to revisit.

Resolved decisions (recorded for future reference):
- ✓ Two entries (top + bottom at cols 3-4) — matches Level 1+ shape
- ✓ Hint colors: ink body + cyan action-verb accents; gold celebration overlays on ink backdrop
- ✓ LevelPreview shows TUTORIAL header / "Playable 60-second tutorial" body / START primary / SKIP secondary
- ✓ Skip on LevelPreview only ("SKIP — I've played before"), not during Level 0
- ✓ Auto-end disabled in Level 0 via `disableAutoEnd: true` config flag (v3 — was a real bug)
- ✓ Stats / unlocks / ad CTAs / interstitials gated on `!isTutorialRun()` (v3)
- ✓ Tile #2 changed from `bell+lemon` to `bell+seven` — structural non-match guarantee (v3)
- ✓ Analytics: separate `tutorial_*` event family, NOT `run_*` for Level 0 (v3)
- ✓ Step 1.5 added: rotation/confirm hint when player first hits placed-state (v3)
- ✓ AsyncStorage migration from `slominoes_tutorial_seen` to new flag, idempotent, old key preserved (v3)
- ✓ ✨ emoji dropped from match celebration copy — palette discipline (v3)

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
