# Second Opinion - unlock-pacing-review

**Task:** Review this revised unlock progression for a tile-matching puzzle game. Key requirement: we want this to be a LONG progression system — 100+ runs to unlock everything, 8-15 hours of gameplay. At most ...

**Provider:** consensus (consensus (gemini-3-flash-preview, gpt-5.2))
**Date:** 2026-04-03T20:41:40.391Z
**Tokens Used:** 396,548

## Files Analyzed

- src/symbols.ts
- docs/superpowers/specs/2026-04-01-symbol-abilities-design.md
- .superpowers/brainstorm/46656-1773602044/.server.pid
- .superpowers/brainstorm/46879-1773602171/.server.pid
- dist-serve/slominoes/metadata.json
- .superpowers/brainstorm/46879-1773602171/waiting.html
- .superpowers/brainstorm/46879-1773602171/.server.log
- .superpowers/brainstorm/46656-1773602044/.server.log
- WORKING.md
- dist-serve/slominoes/index.html
- .superpowers/brainstorm/46879-1773602171/layout-v2.html
- second-opinions/unlock-progression-review.consensus.review-this-unlock-progression.egress.json
- docs/superpowers/specs/2026-03-15-progressive-disclosure-ui-design.md
- .superpowers/brainstorm/46879-1773602171/layout-v3.html
- .superpowers/brainstorm/46879-1773602171/progressive-detail.html
- .superpowers/brainstorm/46879-1773602171/layout-comparison.html
- second-opinions/unlock-progression-review.consensus.review-this-unlock-progression.md
- dist-serve/slominoes/favicon.ico
- docs/superpowers/plans/2026-03-15-progressive-disclosure-ui.md
- docs/superpowers/plans/2026-03-12-mid-game-respins.md
- docs/stitch-designs/slominoes_title.jpg
- docs/stitch-designs/slominoes_symbols.jpg
- docs/stitch-designs/slominoes_gameover.jpg
- docs/stitch-designs/slominoes_v1_original.png

---

# Consensus Analysis: Review this revised unlock progression for a tile-matching puzzle game. Key requirement: we want thi

## Synthesis

*To be synthesized by Claude Code after reading both reviews.*

Produce a unified review merging both perspectives:

### Summary
Synthesize both reviewers' overall assessments. Note agreement/disagreement.

### Findings
Merge and deduplicate findings from both reviews.
Use severity labels: **[BLOCKING]**, **[IMPORTANT]**, **[NIT]**, **[SUGGESTION]**, **[PRAISE]**.
Every finding MUST include `file:line` references. For [BLOCKING], quote the code.
For each finding note which reviewer(s) flagged it (both / Gemini only / OpenAI only).
Higher confidence when both agree. When they disagree on severity, assess which is correct.
Order by severity. When a diff was provided, only include diff-related issues.

### Pre-existing Issues
(When a diff was provided) Issues flagged by either/both reviewers NOT in the diff.
Same format as Findings — severity labels, `file:line` references, quoted code for [BLOCKING].
Note which reviewer(s) flagged each.
Omit section if no diff or no pre-existing issues found.

### Questions
Unresolved questions from either review. Deduplicate, note source.

### Upstream/Downstream Opportunities
Merge architectural suggestions. Note confidence and source reviewer(s).

### What's Done Well
Merge praise with **[PRAISE]** labels.

---

## Gemini's Review

*Model: gemini-3-flash-preview*
*Tokens: 203,377*

### Summary

The revised unlock progression successfully establishes a long-term arc that transitions from **guaranteed cumulative progress** (Tier 1/2) to **feat-based mastery** (Tier 3/4). Gating the #1 power symbol (**Compass**) behind the first full run victory is an excellent design choice that marks the transition into the "expert" phase of the game.

However, there are several **critical discrepancies** between the implementation code and the design documentation, as well as two unlock conditions that rely too heavily on negative play patterns or extreme RNG.

---

### Findings

**[BLOCKING] Ability and Stat Mismatches (Code vs. Spec)**
- **Evidence**: `src/symbols.ts:126-137` (Crown), `src/symbols.ts:87-97` (Jam), `src/symbols.ts:149-159` (Bomb).
- **Why**: There are significant logic differences between the code and the design spec that will invalidate the simulation data and the intended balance:
    1. **Crown**: Spec defines a `-20% score_penalty` downside. Code only implements the `extra_slots` upside.
    2. **Jam**: Spec defines a `3x` multiplier. Code implements `factor: 2`.
    3. **Bomb**: Spec defines `Score 0`. Code defines `scoreValue: 20`.
    4. **Compass**: Spec defines `+2 entry spots`. Code defines `count: 1`.
- **Fix**: Synchronize `src/symbols.ts` with the `2026-04-01-symbol-abilities-design.md` spec or vice versa before finalizing the progression tuning.

**[IMPORTANT] Magnet Unlock Condition is High-RNG Wall**
- **Where**: Tier 3 Unlock Condition ("Match Bell 5 times in one run")
- **Why**: According to `src/symbols.ts:77`, Bell has a frequency of `2`. In a standard 16-tile run (32 symbols drawn), the statistical expectation is ~4.2 Bell symbols. Requiring **5 matches** (which requires 15 symbols at ML3) in a single run without the Magnet's frequency boost is statistically improbable and will lead to "dead zones" where players grind specifically for Bell spawns rather than playing the game.
- **Fix**: Change condition to "Match Bell 5 times **total (lifetime)**" or "Match **Seven** once in a run" (a hype moment rather than a grind).

**[IMPORTANT] Oil Can Condition Encourages Degenerate Play**
- **Where**: Tier 3 Unlock Condition ("End a level with 20+ locked cells")
- **Why**: This condition forces players to intentionally play poorly by filling the board with matches they don't clear or by avoiding efficient placement. Forcing "anti-play" to unlock a "recovery" item is often frustrating for high-skill players.
- **Fix**: Change to "Unlock 10 cells in one run using abilities" (synergy with Bomb/Vine) or "Win a level after having 15+ cells locked simultaneously" (teaches recovery without requiring the level to end in a cluttered state).

**[SUGGESTION] Tier 1 Pacing Overlap**
- **Where**: Tier 1 Unlocks (Jam vs Honey)
- **Why**: Jam (5k cumulative) and Honey (15k cumulative) are very close. A player who wins a full run early might hit both in 2-3 runs. To ensure the "1 unlock per run" feel and the "event" status, these should be spaced further apart.
- **Fix**: Increase Honey to 25,000 cumulative score.

---

### Pre-existing Issues

**[IMPORTANT] `findMatchesWithAbilities` ignores `wild_match` for scoring**
- **Evidence**: `src/ability-engine.ts:87` and `src/ability-engine.ts:113`
- **Why**: While the match-finding logic correctly identifies wild matches, the scoring logic `const baseScore = scoreValues.get(symbol) ?? 0;` only uses the score value of the *first* symbol in the line. If a high-value symbol matches using a low-value wild substitute, the player may be confused by the resulting score.
- **Fix**: In `src/ability-engine.ts`, calculate the score based on the specific symbols present in the `cells` array rather than just the lead `symbol`.

---

### Questions

1.  **Fruit Salad Tracking**: The Banana unlock requires "Trigger Fruit Salad in a run." Since Fruit Salad is a `recipe_match` (Apple + Cherry + Lemon), is there a UI element to notify the player they've achieved this? Without it, Tier 4 unlocks will feel invisible.
2.  **Cumulative Win Tracking**: For Vine ("Win 5 full runs"), does the game track "Partial Wins" (reaching level 10 but failing) vs "Full Wins"? The spec should clarify if "Win" always means beating the Level 10 threshold.

---

### Upstream/Downstream Opportunities

-   **Upstream (Simulation)**: The `simulate-loadouts.ts` bot is "greedy" (picking the highest immediate score). It likely undervalues **Ghost** and **Oil Can** because it doesn't plan for board space 5 turns ahead.
    -   **Risk Level**: Worth Investigating.
-   **Downstream (UI)**: Given the 100+ run target, adding a "Coming Soon" or "Progress Tracker" to the symbol selection screen is vital to prevent the "dead zone" feeling during the 10-run gaps between unlocks.
    -   **Risk Level**: Safe.

---

### What's Done Well

-   **[PRAISE] The Fruit Deck Arc**: The progression from Cherry/Lemon (Base) -> Apple (Tier 3) -> Banana (Tier 4) creates a clear aspirational synergy that rewards players for recognizing patterns early.
-   **[PRAISE] Compass Gating**: Placing the most powerful utility symbol (Rank #1) behind the first Level 10 win is a perfect "Mastery Unlock." It changes the game's fundamental constraints exactly when the player has proven they've mastered the basic ones.
-   **[PRAISE] Tier 4 Challenge**: Tide's "No bought respins" condition is a great high-skill capstone that doesn't rely on RNG. `src/symbols.ts:182` correctly identifies Tide as a niche but rewarding symbol for this playstyle.

---

## OpenAI's Review

*Model: gpt-5.2*
*Tokens: 193,171*

### Summary

The revised 4-tier unlock plan is directionally good for a **long** progression (100+ runs) because it mixes: (a) slow-burn lifetime counters, (b) occasional “spike” achievements, and (c) a few major gates (“win a full run”). The biggest pacing risk is **dead zones caused by per-run conditions that are too swingy** (especially in Tier 3/4), plus a potential “power spike” when **Compass** unlocks (#1 power) that can compress the remaining progression if it makes subsequent goals much easier.

Below I’ll answer your 6 questions, and I’ll call out a few conditions that are likely to feel unfair unless you add **in-run tracking** and/or adjust thresholds.

---

## 1) Does the pacing work for 100+ run progression? Too fast? Too slow? Dead zones?

**Overall pacing: plausible**, but you’ll likely need to tune the *numerical thresholds* after telemetry.

- **Tier 1 (runs 1–15, 4 unlocks)**: This looks fine. The conditions are mostly “happens naturally” (cumulative score, win levels) with one skill spike (5+ match).
- **Tier 2 (runs 15–40, 4 unlocks)**: Also fine. “Reach level 7” and “win a full run” are strong gates that will naturally spread out unlocks.
- **Tier 3 (runs 40–80, 4 unlocks)**: This is where dead zones can appear:
  - “Win 5 full runs” for Vine is a **long** gate (good), but it can also become a **plateau** if players aren’t yet consistent at full-run wins.
  - “Match bell 5 times in one run” for Magnet is **high variance** (see #5).
  - “End a level with 20+ locked cells” for Oil Can could be either trivial (if locking is common) or miserable (if locking prevents reaching that state).
- **Tier 4 (runs 80–150+, 3 unlocks)**: This is *thin*. With only 3 unlocks, you risk players hitting a long stretch where they feel like “nothing is happening” unless you have **non-symbol rewards** in parallel (cosmetics, titles, difficulty modifiers, etc.). Also, Tier 4 conditions are mostly *meta* or *challenge*—good for endgame, but they need strong UX support.

**Recommendation:** keep the tier structure, but add **1–2 more endgame unlocks** (even if they’re “variant symbols” or “mutations” of existing ones) or add a parallel reward track so Tier 4 doesn’t feel empty.

---

## 2) Are cumulative vs per-run conditions well balanced?

Mostly yes, but the per-run ones are the danger points.

- **Cumulative conditions** (score totals, buy respins lifetime, win levels total, use X symbols across runs) are great for long progression because they’re **predictable** and reduce frustration.
- **Per-run conditions** are good as “event unlocks,” but only if they’re:
  - **observable** (players can see progress in-run), and
  - **not too RNG-dependent**, especially given the “pick 5 symbols per run” constraint.

Right now, Tier 3 has two per-run gates that are likely to be RNG-sensitive:
- Apple: “Score 500 from cherry in one run” (depends on cherry frequency + match opportunities)
- Magnet: “Match bell 5 times in one run” (depends on bell frequency and board flow)

**Recommendation:** keep per-run unlocks, but bias them toward:
- “Do X at least once” (spike moment) rather than “do X 5 times,” or
- “Do X across multiple runs” if it’s inherently rare.

---

## 3) Is requiring “win a full run” for Compass (#1 power) the right gate?

**Yes, it’s the right *type* of gate** for the #1 power symbol, but it depends on *how hard a full-run win is pre-Compass*.

Why it works:
- Compass changes a core constraint (entry spots / reachability). That’s run-shaping power, so gating it behind a full-run win makes it feel earned and prevents early progression from being trivialized.

Risks:
- If full-run wins are **too rare** before Compass, this becomes a frustration wall that blocks Tier 2 completion.
- If full-run wins become **common** once players learn the game, Compass might unlock “all at once” for many players around the same time—which is fine, but it’s a big power spike.

**Recommendation:** keep “win a full run” as the gate, but consider:
- “Win a full run **without buying any respins**” (harder, but then you’d need to move it later), or
- “Win a full run **twice**” if wins are too common by run ~20–30.

---

## 4) Do later unlock conditions feel achievable but aspirational?

Tier 3/4 are aspirational, but a couple are likely to feel *unfair* rather than aspirational:

- **Vine: Win 5 full runs** — aspirational and clear. Good long-term gate.
- **Crown: Use 12 different symbols across all runs** — achievable, encourages experimentation, and naturally long. Good.
- **Tide: Win a full run without buying any respins** — good endgame challenge if the economy makes respin-buying tempting.
- **Banana: Trigger Fruit Salad in a run** — good “combo discovery” gate, but it’s dependent on already having Apple and also on recipe occurrence. That’s okay for endgame, but make sure Fruit Salad is not *too* rare.

**Oil Can: End a level with 20+ locked cells** is the one I’d watch most. It’s a “play badly / stall” style condition unless your locking mechanic naturally creates that state during normal play. If it requires intentionally avoiding clears/unlocks, players may resent it.

---

## 5) Any conditions that are frustrating, unclear, or that players would hate?

### Likely frustration points

1) **Magnet: “Match bell 5 times in one run”**
- Bell is base frequency 2 (per your roster), and you only bring 5 symbols. Without Magnet itself (which increases bell/seven frequency), this can become a “did RNG give me enough bells?” condition.
- This is the classic “unlock the tool by doing the thing the tool would make easier” trap.

**Suggested fix:** change to one of:
- “Match Bell **3** times in one run” (same fantasy, less RNG)
- “Match Bell **5 times across runs**” (still long, less swingy)
- “Match Bell **or** Seven **3** times in one run” (keeps hype, reduces rarity pain)

2) **Oil Can: “End a level with 20+ locked cells”**
- If locking reduces mobility/reachability, this can feel like “I must almost lose to unlock Oil Can.”
- Also, it’s not obvious to players how close they are unless you show a “locked cells: 17/20” counter.

**Suggested fix:** make it either:
- “Have 20+ locked cells **at any point** in a level” (less punishing than “end a level”), or
- “Lock 20 cells **in a run**” (cumulative within run), or
- “End a level with 12–15+ locked cells” if 20 is too extreme.

3) **Apple: “Score 500 from cherry in one run”**
- This is fine if you show progress. Without tracking, it’s invisible grind.
- Also, it incentivizes running cherry-heavy builds, which is good (ties to fruit archetype).

**Suggested fix:** ensure the UI shows “Cherry score this run: 320/500” during the run and in post-run summary.

### Clarity issues

- “Win 3 levels total / Win 10 levels total” — clarify whether this is **lifetime across runs** (it sounds like it is). Make sure the UI says “lifetime.”

---

## 6) Does the system create enough reason to keep playing after unlocking everything?

**Not by itself.** A long unlock track gets you to 8–15 hours, but once everything is unlocked, you’ll need a *post-progression loop*.

Good candidates (design-level, not code):
- **Ascension / difficulty modifiers** (walls+, higher thresholds, fewer respins) with badges
- **Daily/weekly challenges** with fixed loadouts (“Fruit-only”, “No respins”, “ML4+ only”)
- **Meta goals**: win streaks, “perfect run” (no losses), “high score per run”
- **Cosmetic unlocks**: symbol skins, board themes, trails, titles
- **Collection / codex**: “discover X synergies” or “trigger recipe Y 10 times”

If you want “each unlock is an event,” the post-game loop should also have **event moments** (e.g., “new challenge tier unlocked”, “new cosmetic set”, “new modifier”).

---

## Practical tuning suggestions (to hit “100+ runs, ≤1 unlock/run”)

- Add **cooldowns / spacing**: e.g., after an unlock, require at least 1 full run before the next symbol unlock can trigger (or a “choose your next goal” system).
- Make Tier 1 cumulative scores slightly higher if players are unlocking too fast (5k/15k might be reached quickly depending on scoring).
- Ensure every condition has:
  - **in-run tracker** (for per-run goals),
  - **meta tracker** (for lifetime goals),
  - and a **post-run recap** (“+2/10 respins bought”, “Bell matches: 2/5 this run”).

---

### Questions

- UNVERIFIED (design/telemetry): What is the typical **cumulative score per run** and **win rate** pre-Compass? This determines whether Tier 1/2 thresholds are too fast or too slow.
- UNVERIFIED (UX): Will you show **unlock progress** in-run and in the meta screen? Several per-run/lifetime goals will feel bad without it.
- UNVERIFIED (mechanics): How often do players end up with **20+ locked cells** naturally? If rare, Oil Can’s gate needs adjustment.

---

### Upstream/Downstream Opportunities

- **Downstream (UX / progression screen)**: Add a “Tracked Goals” panel (1–3 active goals) with live counters and post-run deltas.  
  - **Risk Level:** Safe
- **Upstream (goal design)**: Reframe the most RNG-sensitive per-run goals into “across runs” goals, or reduce counts.  
  - **Risk Level:** Worth Investigating
- **Bold**: Add a parallel “Mastery Track” (cosmetics/modifiers) so Tier 4 doesn’t feel empty and players keep playing after all symbols.  
  - **Risk Level:** Bold

---

If you share rough telemetry targets (avg score/run, % of runs reaching level 7, % full-run win rate before Compass), I can propose concrete numeric thresholds that better guarantee “100+ runs, usually 0 unlocks/run.”


---
*Generated by second-opinion MCP server*