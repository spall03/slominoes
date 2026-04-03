# Second Opinion - final-unlock-review

**Task:** Review this final unlock progression for a tile-matching puzzle game called Slominoes. 

GAME CONTEXT:
- 8x8 grid, players place domino-like tiles (2 symbols each) through entry points on board edges
...

**Provider:** consensus (consensus (gemini-3-flash-preview, gpt-5.2))
**Date:** 2026-04-03T20:49:18.914Z
**Tokens Used:** 431,627

## Files Analyzed

- src/symbols.ts
- simulate-loadouts.ts
- src/ability-engine.ts
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
- second-opinions/unlock-pacing-review.consensus.review-this-revised-unlock.egress.json
- docs/superpowers/specs/2026-03-15-progressive-disclosure-ui-design.md
- .superpowers/brainstorm/46879-1773602171/layout-v3.html
- .superpowers/brainstorm/46879-1773602171/progressive-detail.html
- .superpowers/brainstorm/46879-1773602171/layout-comparison.html
- second-opinions/unlock-progression-review.consensus.review-this-unlock-progression.md
- dist-serve/slominoes/favicon.ico
- docs/superpowers/plans/2026-03-15-progressive-disclosure-ui.md
- docs/superpowers/plans/2026-03-12-mid-game-respins.md
- second-opinions/unlock-pacing-review.consensus.review-this-revised-unlock.md
- docs/stitch-designs/slominoes_title.jpg
- docs/stitch-designs/slominoes_symbols.jpg
- docs/stitch-designs/slominoes_gameover.jpg
- docs/stitch-designs/slominoes_v1_original.png

---

# Consensus Analysis: Review this final unlock progression for a tile-matching puzzle game called Slominoes. 

GAME CONTEX

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
*Tokens: 222,384*

This review evaluates the final unlock progression for **Slominoes** against the requirement of a 100+ run progression (8-15 hours) with a "significant event" feel for each unlock.

### Summary

The 4-tier structure provides a solid foundation for long-term engagement, successfully moving from "natural play" to "feat-based mastery." However, there are several **mathematical misalignments** where specific thresholds (notably Egg and Magnet) are significantly harder than their tier suggests, potentially creating "dead zones" where no progress is felt for dozens of runs. Additionally, there are critical discrepancies between the implementation code and the design documentation that will affect balance.

---

### Findings

**[BLOCKING] Symbol Stat & Ability Mismatches (Code vs. Spec)**
- **Evidence**: `src/symbols.ts:93` (Jam), `src/symbols.ts:121-126` (Crown), `src/symbols.ts:143` (Compass).
- **Why**: The implementation code does not match the provided design specification (`docs/superpowers/specs/2026-04-01-symbol-abilities-design.md`). This invalidates the power rankings and simulation data:
    - **Jam**: Spec says `3x` multiplier; Code implements `factor: 2`.
    - **Crown**: Spec says `-20% score_penalty` to all other symbols; Code has no penalty.
    - **Compass**: Spec says `+2 entry spots`; Code implements `count: 1`.
- **Fix**: Synchronize `src/symbols.ts` with the design spec before finalizing the progression.

**[IMPORTANT] Tier 2 "Egg" Threshold is a Tier 4 Gate**
- **Where**: Tier 2 Unlock Condition ("Cumulative score 100,000")
- **Why**: Given the estimated average score of 500–1500 per run, a 100,000 cumulative score requires **66 to 200 runs**. This places a Tier 2 symbol (ranked #16 in power) behind the longest grind in the game, far exceeding the Tier 4 "Crown" requirement (12 different symbols, achievable in ~15-20 runs).
- **Fix**: Reduce Egg's cumulative requirement to **25,000** to fit the Tier 2 window (runs 15-40).

**[IMPORTANT] Magnet Unlock Condition is Statistically Improbable**
- **Where**: Tier 3 Unlock Condition ("Match bell 3 times in a single level")
- **Why**: According to `src/symbols.ts:77`, Bell has a frequency of `2`. A standard level has 16 tiles (32 symbols). To match Bell 3 times (ML3), a player needs 9 Bells. In 32 draws, the probability of drawing 9+ Bells when the individual probability is ~10-13% is extremely low. This creates a "frustration wall" dependent entirely on RNG.
- **Fix**: Change to "Match Bell 10 times **total (lifetime)**" or "Match **Seven** once in a run."

**[SUGGESTION] Ghost (8-length match) is too difficult for Tier 1**
- **Where**: Tier 1 Unlock Condition
- **Why**: An 8-length match (full row/column) is estimated at 1 in 20+ runs. Tier 1 is intended for runs 3-15. A player could easily go 50 runs without seeing a natural 8-length match opportunity, especially with early-game symbols.
- **Fix**: Move the 8-length match requirement to **Tier 3 (Oil Can)** and give Ghost a more achievable Tier 1 feat, such as "Respin a row/column 3 times in one level."

**[SUGGESTION] Oil Can "30+ Locked Cells" encourages anti-play**
- **Where**: Tier 3 Unlock Condition
- **Why**: 30 cells is nearly 50% of the 8x8 board. Since locking cells reduces placement options and reachability, forcing a player to reach 30 locked cells usually requires them to intentionally play poorly or "stall" the level. 
- **Fix**: Change to "Win a level with 20+ locked cells" (teaches recovery from pressure) or "Unlock 5 cells in one action" (thematic).

---

### Pre-existing Issues

**[IMPORTANT] `findMatchesWithAbilities` ignores `wild_match` for scoring**
- **Evidence**: `src/ability-engine.ts:87` — `const baseScore = scoreValues.get(symbol) ?? 0;`
- **Why**: The match-finding logic correctly identifies wild matches, but the scoring logic only uses the `scoreValue` of the *first* symbol in the line. If a high-value symbol (Seven, 150 pts) completes a match using a low-value wild (Apple, 25 pts), the player is essentially "cheating" the score system, or vice versa.
- **Fix**: Calculate the match score by summing the `getEffectiveScoreValue` of every individual cell in the match rather than multiplying the lead symbol's value.

---

### Questions

1. **Selection Slot Tracking**: The Crown (+2 selection slots) is Tier 4. Does the UI currently support choosing more than 5 symbols, or will this require a layout change in the symbol picker?
2. **Fruit Salad Visibility**: For the Banana unlock ("Trigger Fruit Salad"), is there an in-game notification or "Recipe Book" UI? Without it, players may not know they are making progress toward a Tier 4 unlock.
3. **Cumulative Win Definition**: Does "Win 50 levels total" (Coral) count the same level multiple times across different runs? (Assumed yes, but should be clarified in UI strings).

---

### Upstream/Downstream Opportunities

- **Downstream (UX)**: Add a "Goal Tracker" to the Level Preview screen. If I'm hunting for the "Apple" unlock (1500 cherry score), seeing my current run total (e.g., "850/1500") is vital for the "event" feel. (**Risk Level: Safe**)
- **Upstream (Design)**: Re-evaluate **Crown**. It is ranked #20 (last) in power but is a Tier 4 unlock. To make it feel like an "Endgame Event," consider adding a secondary passive, like "All base symbols gain +5 score value." (**Risk Level: Worth Investigating**)

---

### What's Done Well

- **[PRAISE] Compass Gating**: Gating the #1 power symbol behind a full run victory (Level 10) is excellent. It ensures the player has mastered the base constraints before you give them the tool that bypasses them.
- **[PRAISE] The Fruit Deck Arc**: The progression from Cherry/Lemon (Base) -> Apple (Tier 3) -> Banana (Tier 4) is a textbook example of synergistic discovery.
- **[PRAISE] SVG Assets**: The neon-style SVGs in the branch diff (e.g., `assets/symbols/ghost.svg`) are high quality and consistent with the game's aesthetic.

---

## OpenAI's Review

*Model: gpt-5.2*
*Tokens: 209,243*

### Summary

You’ve got a solid *shape* for a long progression: early tiers are mostly cumulative (predictable), mid tiers introduce “skill gates” (full run win), and late/endgame are mostly aspirational. With your stated goal (“usually 0 unlocks/run, at most 1”), the biggest risk isn’t the tier ordering—it’s **a couple of per-level/per-run conditions that are likely to be either RNG-gated or so rare they create dead zones** (notably **Ghost 8-length** and **Magnet bell 3× in one level**), plus **score thresholds that may be too high given your own “500–1500 avg/run” estimate**.

Below is a design review (not a code review). I’m grounding the pacing math in the stats you provided.

---

## 1) Do these thresholds produce the pacing we want?

### Cumulative score gates look too high *given your stated averages*
You estimate **500–1500 score/run**.

- **Jam @ 10,000 cumulative**  
  That’s ~7–20 runs (depending on skill/luck). That’s *already* pushing toward “runs 3–15” but plausible.

- **Honey @ 40,000 cumulative**  
  That’s ~27–80 runs. That does **not** fit “Tier 1 runs 3–15”; it’s more like Tier 2/3 pacing.

- **Egg @ 100,000 cumulative**  
  That’s ~67–200 runs. That’s basically Tier 4 pacing under your estimate.

So either:
1) your “500–1500 avg/run” is **understated** relative to the actual scoring system, or  
2) these cumulative thresholds will push unlocks **much later** than the tier labels suggest.

**Actionable recommendation:** before locking, run a quick telemetry/sim pass to estimate *median cumulative score per run* for early/mid players. If you can’t, assume your provided estimate is correct and **scale down cumulative thresholds by ~3–5×** to hit the intended run bands.

### “Win X levels total” gates are good pacing levers
- **Bomb: win 15 levels total**  
  If early players win ~3–5 levels/run, that’s ~3–5 runs. That’s *very fast* for “unlock as an event” unless you expect many early losses. If you truly want “usually 0 unlocks/run”, this one likely fires too early.

- **Coral: win 50 levels total**  
  At 3–5 levels/run early, that’s ~10–17 runs. That’s a good mid-tier cumulative gate.

**Actionable recommendation:** consider raising Bomb to something like **30–40 total level wins** if you want it to land in the “runs 5–15” window and avoid stacking multiple unlocks in a single run.

### Lifetime respin purchase gate is good and controllable
- **Ember: buy 30 respins lifetime**  
  At 1–3 bought respins/run average, that’s ~10–30 runs. Great mid-tier pacing, and it’s player-agency-driven.

### Full-run win gate is a strong “event” unlock
- **Compass: win a full run**  
  This is exactly the kind of gate that makes an unlock feel meaningful, and it’s appropriate for your #1 power symbol.

---

## 2) Any conditions too easy or too hard for their tier?

### Too hard / high variance
- **Ghost: create an 8-length match (full row/col)**  
  You estimate “1 in 20+ runs”. That’s not Tier 1 pacing; it’s Tier 3-ish. Also it’s *high variance* and can feel like “I’m waiting for the board to allow it.”

- **Magnet: match bell 3 times in a single level**  
  With bell frequency 2 (base), and only 32 placements per level, this is likely **RNG-gated** and can be *mathematically tight* depending on how often bells appear and whether you can convert appearances into matches given locking. Also it’s the “unlock the tool by doing the thing the tool would help with” trap (Magnet increases bell frequency, but you don’t have it yet).

- **Oil Can: have 30+ locked cells at any point in a level**  
  You estimate average locked cells per level 8–15. Hitting 30 implies either very high match density or a specific play pattern. This is likely **very late** and may encourage anti-play (intentionally creating locks).

- **Apple: score 1500 from cherry matches in a single run**  
  Given your avg run score 500–1500 total, requiring 1500 *from cherry alone* is likely extremely late unless the fruit deck is already online (but Apple is what enables it). This is probably a Tier 4 gate as written.

- **Vine: win 10 full runs**  
  If full-run win rate is ~20–30% once skilled, that’s ~33–50 runs after reaching that skill level. That’s fine for Tier 3/4, but it’s a long plateau gate.

### Too easy
- **Bomb: win 15 levels total** (as above) likely triggers quickly once a player can clear a few levels per run.

---

## 3) Ghost requiring an 8-length match — right difficulty for Tier 1?

Given your own estimate (“**1 in 20+ runs**”), it’s **not** Tier 1. It will either:
- delay Ghost far beyond the rest of Tier 1, creating a weird “Tier 1 is done except Ghost” feeling, or
- force players into grindy/degenerate play to chase a full-line match.

**Recommendation:** keep the *fantasy* of “big match” as a gate, but reduce variance:
- Option A (safe): **“Create a 6-length match”** (still exciting, much more achievable)
- Option B (safe): **“Create a 5-length match twice across your lifetime”** (still a milestone, less RNG)
- Option C (worth investigating): **“Create a match that locks 8+ cells at once”** (big moment, but not necessarily full row/col)

If you really want Ghost to be a long chase goal, move it to **Tier 2/3** explicitly.

---

## 4) Mix of cumulative vs per-run vs per-level conditions: does it feel right?

Directionally yes:
- **Cumulative** (score, total wins, lifetime respins, “use 12 symbols”) = good for long progression and low frustration.
- **Per-run/per-level** = good for “event unlocks,” but only if they’re **observable** and **not too RNG-dependent**.

Right now, your per-run/per-level gates skew toward **rare/RNG** (8-length, bell 3× in one level, 30 locks, 1500 cherry score). That increases the chance of long dead zones.

**Recommendation:** keep the mix, but convert the most RNG-heavy ones into:
- lifetime counters (still long), or
- lower-count spike achievements.

---

## 5) Is there a dead zone where players go too long without an unlock?

Yes, likely two:

### Dead zone A: after Bomb (too early) before Jam/Honey
If Bomb triggers in ~3–5 runs, but Jam is ~7–20 runs and Honey is ~27–80 runs (per your score estimate), you’ll get a **long gap** unless other gates fire.

### Dead zone B: late game RNG walls
If Apple/Magnet/Oil Can are all hard RNG gates, a player can go **many runs** without progress even while playing well.

**Recommendation:** ensure each tier has at least one “steady progress” unlock (cumulative) that is reachable in the intended band, and reserve only 1 “spike” unlock per tier.

---

## 6) Final concerns before locking this in

### A) Your tier labels don’t match your numeric gates (based on your own stats)
If you lock this in as-is, be prepared that:
- Honey/Egg/Apple may land **much later** than their tiers imply.
- Ghost may land **much later** than Tier 1.
- Magnet/Oil Can may frustrate due to variance.

### B) Add progress visibility (otherwise per-run/per-level goals feel invisible)
UNVERIFIED (UI not in context): I can’t see your unlock tracking UI. But goals like:
- “1500 cherry score in a run”
- “bell matched 3 times in a level”
- “30+ locked cells at any point”
need **live counters** or post-level summaries, or players will feel like they’re grinding blindly.

### C) “At most 1 unlock per run” needs a policy, not just thresholds
Even with perfect thresholds, players can cross multiple cumulative gates in one strong run. If you truly want “at most 1 unlock/run,” you likely need an explicit rule like:
- “Only the earliest-eligible unlock triggers; others queue for later runs,” or
- “After an unlock, additional unlocks are deferred until next run.”

---

## Concrete tuning suggestions (minimal changes, keeps your structure)

If I were to adjust only numbers/conditions to better match your stated pacing:

- **Bomb**: raise from **15 total level wins → 30–40** (avoid early multi-unlock feeling)
- **Honey**: lower from **40,000 cumulative → 20,000–25,000** (so it’s not Tier 3 by your estimate)
- **Egg**: lower from **100,000 cumulative → 50,000–70,000** (or keep 100k but move to Tier 4 explicitly)
- **Ghost**: change **8-length → 6-length** (or move to Tier 2)
- **Apple**: change **1500 cherry score in a run → 600–900** (or make it lifetime “5,000 cherry score total”)
- **Magnet**: change **bell 3 matches in one level → bell 3 matches across a run** (or lifetime 10 bell matches)
- **Oil Can**: change **30 locked at any point → 20–24 locked at any point** (or “have 20 locked and still win the level”)
- **Vine**: consider **win 10 full runs → win 5 full runs** if you want it before run ~100 for most players
- **Tide**: “win full run without buying respins” is a great endgame challenge gate; keep it.

If you want, share (even rough) telemetry from 20–50 real runs (median score/run, median levels won/run, full-run win rate), and I can propose thresholds that more reliably hit “runs 3–15 / 15–40 / 40–80 / 80–150+” with low multi-unlock probability.


---
*Generated by second-opinion MCP server*