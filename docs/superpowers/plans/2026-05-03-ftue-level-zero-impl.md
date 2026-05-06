# Slominoes — FTUE Level 0 Implementation Plan (v1)

**Date:** 2026-05-03
**Status:** APPROVED — execution ready
**Spec:** `docs/superpowers/specs/2026-05-03-ftue-level-zero-design.md` (v3)
**Estimate:** ~4–5 working days, can overlap with ad-support Phases 1–4 (no file conflicts)

---

## Context summary

Replace `Tutorial.tsx` slide deck with a hand-crafted playable Level 0 that teaches Slominoes' core mechanics through soft-rails gameplay. ~60s, 4 tiles, 1 forced respin, separate analytics, completely ad-free.

Build proceeds in dependency order so the engine + state-machine pieces land first (foundation for everything downstream), then UI layer + scripted hints, then deletion of the old component.

Build order:
1. **Foundation** — engine flag + state machine + analytics events
2. **Tutorial level config + routing** — generateLevelConfig(0), startRun branching, completeLevel routing
3. **UI variants** — LevelPreview, GameOver, DraftScreen first-visit
4. **Hint system** — TutorialHints component + script + edge cases
5. **Migration + cleanup** — AsyncStorage migration, delete Tutorial.tsx
6. **Playtest + tune**

---

## Phase 1 — Engine + state foundation (~half day)

Goal: every downstream piece can rely on a clean foundation. No user-visible changes yet.

### 1.1 LevelConfig gains tutorial flags

Files touched: `src/types.ts` (LevelConfig interface)
- Add `disableAutoEnd?: boolean` (defaults to false / undefined for backward compat)
- Add `isTutorial?: boolean` (defaults to false)

### 1.2 Engine respects `disableAutoEnd`

Files touched: `src/store.ts` (`useGameStore.confirmPlacement`)

```ts
const autoEndForBonus =
  !levelConfig.disableAutoEnd
  && !isComplete
  && newTotalScore >= threshold * 1.15;
```

One-line gate. No behavior change for Levels 1–10 (where `disableAutoEnd` is undefined / falsy).

### 1.3 Centralized `isTutorialRun()` helper

File created: `src/run-helpers.ts`

```ts
import { useRunStore } from './store';
export const isTutorialRun = (): boolean =>
  useRunStore.getState().currentLevel === 0;
```

Single source of truth — every downstream consumer imports from here.

### 1.4 Tutorial analytics events

Files touched: `src/analytics-events.ts`

Add four new events at the bottom:

```ts
// Tutorial — separate event family per spec
export const tutorialStarted = () =>
  analyticsApi.logEvent('tutorial_started');

export type TutorialStep = 1 | 1.5 | 2 | 3 | 4 | 5 | 6;
export const tutorialStepAdvanced = (step: TutorialStep) =>
  analyticsApi.logEvent('tutorial_step_advanced', { step });

export const tutorialCompleted = (params: { respin_used: boolean }) =>
  analyticsApi.logEvent('tutorial_completed', params);

export const tutorialSkipped = () =>
  analyticsApi.logEvent('tutorial_skipped');
```

### 1.5 useMetaStore: hasTutorialBeenSeen + AsyncStorage migration

Files touched: `src/meta-store.ts`

- Add `hasTutorialBeenSeen: boolean` to MetaState (persisted)
- Add to PersistedMeta type with optional fallback (back-compat for old saves)
- Add `setTutorialSeen()` action
- In `loadFromStorage()`, migrate from old key:

```ts
const legacyTutorialSeen = (await AsyncStorage.getItem('slominoes_tutorial_seen')) === 'true';
const hasTutorialBeenSeen = persisted?.hasTutorialBeenSeen ?? legacyTutorialSeen;
```

Idempotent. Old key preserved for rollback safety.

### 1.6 Gate downstream state mutations on `!isTutorialRun()`

Files touched: `src/meta-store.ts`

- `useMetaStore.startRun()` — wrap body in `if (isTutorialRun()) return;`
- `useMetaStore.endRun()` — wrap body in same guard
- `useMetaStore.markFirstRunCompleted()` — same guard

These run in addition to all existing logic, so the guard short-circuits early.

### Acceptance for Phase 1
- TypeScript clean
- Existing Levels 1–10 behavior unchanged on local web export
- `useRunStore.setState({ currentLevel: 0 })` followed by checking `isTutorialRun()` returns true (manual REPL test)

**Phase 1 commit:** `feat(ftue): engine flags + state foundation for Level 0`

---

## Phase 2 — Tutorial level config + routing (~half day)

Goal: tapping "NEW RUN" with `hasTutorialBeenSeen=false` routes to Level 0 with the right config; completing or skipping resolves correctly.

### 2.1 TUTORIAL_LEVEL_CONFIG constant

Files touched: `src/level.ts`

```ts
export const TUTORIAL_LEVEL_CONFIG: LevelConfig = {
  level: 0,
  threshold: 30,
  respins: 1,
  tilesPerLevel: 4,
  symbolCount: 5,
  obstacles: [
    { row: 5, col: 3, symbol: 'cherry' },
    { row: 5, col: 4, symbol: 'cherry' },
    { row: 3, col: 1, symbol: 'bar' },
  ],
  entrySpotCount: 2,
  boardMask: null,
  disableAutoEnd: true,
  isTutorial: true,
};

export function generateLevelConfig(level: number): LevelConfig {
  if (level === 0) return TUTORIAL_LEVEL_CONFIG;
  // existing logic
}
```

### 2.2 Tutorial tile queue generator

Files touched: `src/level.ts`

The tile queue isn't randomly generated for Level 0 — it's hand-crafted:

```ts
export function generateTutorialTileQueue(): Tile[] {
  return [
    { id: 't0-1', symbolA: 'cherry', symbolB: 'lemon' },
    { id: 't0-2', symbolA: 'bell',   symbolB: 'seven' },
    { id: 't0-3', symbolA: 'bar',    symbolB: 'bell'  },
    { id: 't0-4', symbolA: 'seven',  symbolB: 'lemon' },
  ];
}
```

`useGameStore.resetGame()` checks for `levelConfig.isTutorial` and uses this queue instead of the random generator.

### 2.3 useRunStore.startRun() branches on hasTutorialBeenSeen

Files touched: `src/store.ts` (`useRunStore.startRun`)

```ts
startRun: () => {
  const { hasTutorialBeenSeen } = useMetaStore.getState();
  if (hasTutorialBeenSeen) {
    set({
      runPhase: 'draft', currentLevel: 1, levelScore: 0,
      levelConfig: null, bonusRespins: 5,
    });
    return;
  }
  // Tutorial path
  const tutorialLoadout = SYMBOL_ROSTER.filter(s => s.base);
  const freqs = buildFrequencyTable(tutorialLoadout);
  const config = generateLevelConfig(0);
  set({
    runPhase: 'levelPreview', currentLevel: 0,
    levelConfig: config, bonusRespins: 0,
  });
  useGameStore.setState({ loadoutFreqs: freqs, loadoutDefs: tutorialLoadout });
  events.tutorialStarted();
},
```

### 2.4 useRunStore.completeLevel() routes Level 0 to Draft

Files touched: `src/store.ts` (`useRunStore.completeLevel`)

```ts
completeLevel: (score, threshold, respinsLeft) => {
  if (isTutorialRun()) {
    useMetaStore.getState().setTutorialSeen();
    events.tutorialCompleted({ respin_used: ... });
    set({
      runPhase: 'draft', currentLevel: 1, levelScore: 0,
      levelConfig: null,
    });
    return;
  }
  // existing Levels 1–10 logic
},
```

(Track `respin_used` via a flag set when respin fires during Level 0.)

### Acceptance for Phase 2
- Fresh install (`hasTutorialBeenSeen=false`): NEW RUN → LevelPreview with Level 0 config
- Existing player (`hasTutorialBeenSeen=true`): NEW RUN → Draft, unchanged behavior
- Completing Level 0: routes to Draft (not Level 1), sets the flag
- TypeScript + existing manual gameplay still works

**Phase 2 commit:** `feat(ftue): Level 0 routing and config`

---

## Phase 3 — UI variants (~1 day)

Goal: the screens render correctly for `currentLevel === 0`.

### 3.1 LevelPreviewScreen Level 0 variant

Files touched: `src/components/LevelPreviewScreen.tsx`

When `currentLevel === 0`:
- Header: "TUTORIAL" in cyan
- Body line: "Playable 60-second tutorial."
- Primary CTA: "START" — calls `useRunStore.startLevel()`
- Secondary text button: "SKIP — I've played before" — calls `handleSkip()`

```ts
const handleSkip = () => {
  useMetaStore.getState().setTutorialSeen();
  events.tutorialSkipped();
  useRunStore.setState({
    runPhase: 'draft', currentLevel: 1, levelScore: 0,
    levelConfig: null, bonusRespins: 5,
  });
};
```

### 3.2 GameOverScreen Level 0 variant

Files touched: `src/components/GameOverScreen.tsx`

When `currentLevel === 0`:
- Heading: "TUTORIAL COMPLETE" (cyan, not gold)
- Subtitle: "Now pick your symbols!"
- Single primary CTA: "CONTINUE" → calls `useRunStore.startRun()` equivalent that goes to Draft (since flag is now set, this naturally routes to draft)
- **Critically:** does NOT call `useMetaStore.endRun()` — guarded via `isTutorialRun()`. Skip the existing endRun useEffect.

### 3.3 DraftScreen first-visit overlay

Files touched: `src/components/DraftScreen.tsx`, `src/meta-store.ts`

- Add `hasSeenDraftIntro: boolean` to useMetaStore (persisted)
- Add `setDraftIntroSeen()` action
- In DraftScreen, on mount, if `!hasSeenDraftIntro`, render an inline banner above the symbol grid:
  - Copy: "Pick 5 symbols for your run. You'll draw these tiles on the grid."
  - Style: ink body, slight gold underline accent
  - Auto-fade after 4 seconds OR on first symbol tap
  - Sets `hasSeenDraftIntro=true` after fade
- No second appearance ever after first dismissal

### 3.4 PlayingScreen Level 0 mode

Files touched: `src/components/PlayingScreen.tsx`

When `currentLevel === 0`:
- Render `<TutorialHints />` (Phase 4) instead of the existing idle-decay hint flow
- Hide all ad CTAs (HUD respin-rescue affordance, Continue affordance)
- The HUD respin badge should still render normally since it shows the respin count

### Acceptance for Phase 3
- Visual review: each screen looks right in Level 0 mode
- Skip flow works end-to-end: tap → Draft visible → first-draft banner appears
- TypeScript clean

**Phase 3 commit:** `feat(ftue): UI variants for Level 0 + first-draft overlay`

---

## Phase 4 — TutorialHints component (~1 day)

Goal: scripted hint sequence with state-event triggers + out-of-order tolerance.

### 4.1 TutorialHints component

File created: `src/components/TutorialHints.tsx`

Tracks current step (local React state), advances on game-store state changes:

```ts
type TutorialStep = 1 | 1.5 | 2 | 3 | 4 | 5 | 6;

interface HintState {
  step: TutorialStep;
  copy: string;
  style: 'banner' | 'overlay';
  pulseRespin: boolean;
}
```

Event-driven advancement listeners (subscribe to useGameStore):
- Mount → step 1, banner: "Tap an entry arrow on the top or bottom..."
- `placementMode === 'placed'` first time → step 1.5, banner: "Tap to rotate · Hold to confirm" (mobile) / "Press R to rotate · Enter to confirm" (desktop)
- `lockedCells.size` increases (first match) → step 2, overlay: "Three cherries match. Matched cells lock — safe from respins."
- `tileQueue.length` decreases (placement count = 2) → step 3, banner: "Not every move is a match. Set up future combos."
- placement count = 3 → step 4, banner: "Tap the RESPIN button (top right)..." + pulseRespin=true
- `respinTarget !== null` (respin mode entered) → step 5, banner: "Pick the row with your bars to try for a third."
- `spinningCells.size` returns to 0 from > 0 (respin completed) → step 6, overlay: "That's a respin. Now finish strong."

### 4.2 Out-of-order tolerance

If respin tap happens before placement count = 3:
- Step 5 fires with substituted copy: "Respins shuffle a row or column. Locked cells won't move (you'll see this once you've matched something)."
- Subsequent steps still fire on their normal triggers.

If incidental match on tile 2:
- Step 3 ("not every move scores") suppresses; advance directly to step 4 on next placement.

### 4.3 HUD respin badge pulse

Files touched: `src/components/HUD.tsx`

Add a `pulseHint?: boolean` prop. When true, badge gets a subtle scale + cyan glow animation. PlayingScreen passes `pulseHint={tutorialPulseRespin}` when Level 0 step 4 is active.

### 4.4 Stuck-recovery safety valve

Files touched: `src/store.ts` (the placement handler that calls `anyEntryHasValidPlacement`)

If `currentLevel === 0` and `anyEntryHasValidPlacement` returns false:
- Show "No moves — restarting tutorial" briefly
- Reset Level 0 to its initial state (re-call `resetGame` with the tutorial config)

### Acceptance for Phase 4
- Manual playtest: each hint fires at the right moment with the right copy
- Skip respin entirely: levels 4/5/6 hints don't fire, level still completes
- Tap respin first thing: substituted copy fires, normal flow resumes
- Stuck-recovery: confirmed via manual setup (place tiles to fill all reachable cells before queue empty — though probably impossible with 4 tiles in this layout)

**Phase 4 commit:** `feat(ftue): TutorialHints + scripted Level 0 sequence`

---

## Phase 5 — Migration + cleanup (~half day)

Goal: existing players don't get force-tutorialed; old code removed.

### 5.1 Verify migration works

Manual test cases:
- Fresh install, no AsyncStorage data: routes to Level 0 ✓
- Player who completed old slide-deck (key `slominoes_tutorial_seen=true`): bypasses Level 0 ✓
- Player with `hasTutorialBeenSeen=true` in new persisted blob: bypasses Level 0 ✓
- Player who skipped via SKIP button: bypasses Level 0 ✓
- Replay tutorial path (Settings → Replay Tutorial): re-enters Level 0 ✓

### 5.2 Add Replay Tutorial entry to Settings

Files touched: `src/components/SettingsScreen.tsx`

Add a row above "Abandon Run":
- Label: "Replay Tutorial"
- onTap: `useMetaStore.getState().resetTutorialSeen()` then `useRunStore.getState().startRun()`
- Cosmetically: ink text, no border, like a text button

Replays don't bump `totalRuns` or any cumulative stats (already enforced by Phase 1.6 guards).

### 5.3 Delete Tutorial.tsx

Files removed: `src/components/Tutorial.tsx`

Files touched:
- `src/components/TitleScreen.tsx` — remove Tutorial import + showTutorial state + render
- Any other importer of `Tutorial` or `hasTutorialBeenSeen` from this module

### 5.4 Stale Tutorial AsyncStorage key

The migration in Phase 1.5 reads the old key but doesn't delete it. Leave it — preserves rollback safety. Real cleanup can happen in v1.1 once we're confident migration succeeded for all users.

### Acceptance for Phase 5
- TypeScript clean
- Manual tests above all pass
- App boots normally, no Tutorial-related warnings or errors

**Phase 5 commit:** `chore(ftue): delete Tutorial.tsx, add Settings replay entry`

---

## Phase 6 — Playtest + tune (~half day)

Self-playtest by Steve. Adjustments to:
- Hint copy timing (linger duration, fade speeds)
- Pulse intensity on respin badge
- Match celebration overlay position / size
- Anything else surfaced in playtest

No code-architecture changes — pure tuning.

**Phase 6 commit:** `polish(ftue): playtest tuning round 1`

---

## Risk register (with implementation-level mitigations)

| Risk | Phase | Mitigation |
|---|---|---|
| Auto-end fires mid-tutorial | 1.2 | `disableAutoEnd: true` in TUTORIAL_LEVEL_CONFIG; engine gates auto-end check |
| Tutorial pollutes stats / fires ads | 1.6 | Centralized `isTutorialRun()` gate on every mutation site |
| Player can't figure out rotate/confirm | 4.1 | Step 1.5 reactive hint on first placed-state entry |
| Tile #2 accidentally creates match | 2.2 | Tile composition forces non-match (bell+seven both absent from board) |
| Existing players force-tutorialed | 1.5 | One-time AsyncStorage migration; old key preserved |
| `hasTutorialBeenSeen` race condition (player taps NEW RUN before async load) | 1.5 | App.tsx already gates render on `metaLoaded` |
| Hint script confuses out-of-order players | 4.2 | Out-of-order tolerance: substituted copy, suppressed steps |
| Stuck (no valid placements) | 4.4 | Safety valve resets Level 0 |

---

## Steve's playtest checklist (Phase 6)

- [ ] Fresh install path: NEW RUN → LevelPreview shows TUTORIAL → START → 4 tiles → CONTINUE → Draft
- [ ] Skip path: NEW RUN → LevelPreview → SKIP → Draft (with "Pick 5 symbols" overlay)
- [ ] Hint copy: each hint reads naturally, none feel cute or condescending
- [ ] Respin badge pulse: visible but not distracting
- [ ] Match celebration overlay: lingers long enough to register but not so long that the player feels stuck
- [ ] Out-of-order: tap respin first thing, see substituted hint copy
- [ ] Replay path: Settings → Replay Tutorial → Level 0 again, no stats touched
- [ ] Two entries (top + bottom): both work, neither is broken
- [ ] No ads anywhere (no rewarded affordance in HUD, no Continue CTA on GameOver, no interstitial after Level 0 GameOver)

---

## What "done" looks like

- A first-time player taps NEW RUN, sees TUTORIAL screen, taps START, completes 4-tile Level 0 with one forced respin in ~60 seconds, then enters the Draft screen feeling oriented
- An existing player who already saw the slide-deck tutorial sees no change in their experience (migration silently bypasses)
- Analytics shows tutorial_completed with respin_used=true at high rates (≥80% — meaning the script actually fires)
- Tutorial.tsx is gone from the codebase

After ship: monitor Firebase Analytics for:
- `tutorial_skipped` rate (target: <10% on fresh installs, higher on returning web players is fine)
- `tutorial_completed` with `respin_used=false` rate (if high, Step 4–6 isn't firing reliably — investigate)
- `tutorial_step_advanced` distribution (last step before churn = where players drop off)

These signals feed v1.1 tuning.
