# Second Opinion - unlock-progression-review

**Task:** Review this unlock progression system design for a tile-matching puzzle game with 20 symbols (5 base, 15 unlockable). Players pick 5 symbols per run. The game has levels 1-10 with increasing difficult...

**Provider:** consensus (consensus (gemini-3-flash-preview, gpt-5.2))
**Date:** 2026-04-03T20:24:09.848Z
**Tokens Used:** 384,927

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
- docs/superpowers/specs/2026-03-15-progressive-disclosure-ui-design.md
- .superpowers/brainstorm/46879-1773602171/layout-v3.html
- .superpowers/brainstorm/46879-1773602171/progressive-detail.html
- .superpowers/brainstorm/46879-1773602171/layout-comparison.html
- dist-serve/slominoes/favicon.ico
- docs/superpowers/plans/2026-03-15-progressive-disclosure-ui.md
- docs/superpowers/plans/2026-03-12-mid-game-respins.md
- docs/stitch-designs/slominoes_title.jpg
- docs/stitch-designs/slominoes_symbols.jpg
- docs/stitch-designs/slominoes_gameover.jpg
- docs/stitch-designs/slominoes_v1_original.png

---

# Consensus Analysis: Review this unlock progression system design for a tile-matching puzzle game with 20 symbols (5 base

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
*Tokens: 196,525*

### Summary

The unlock progression system is logically structured into tiers that introduce complexity gradually. However, there is a significant **misalignment between symbol power levels and their unlock timing**. The most powerful symbol (Compass) is awarded very early (Tier 2), while the weakest symbol (Crown) is positioned as an endgame reward (Tier 4). Additionally, there are discrepancies between the provided code and the design documentation regarding symbol abilities.

---

### Findings

**[BLOCKING] Crown Ability Mismatch & Inverted Progression**
- **Evidence**: `src/symbols.ts:126-137` vs `docs/superpowers/specs/2026-04-01-symbol-abilities-design.md:126`


---

## OpenAI's Review

*Model: gpt-5.2*
*Tokens: 188,402*

### Summary

The 4-tier unlock ordering mostly makes sense as a *teaching → experimentation → goal-driven builds → mastery* arc, and it lines up reasonably well with the simulated power ranking (stronger/utility-heavy symbols tending later). The biggest risks I see are:

- A few unlock conditions that are likely **too swingy / grindy** given the current mechanics (locking, respins, walls, and the fact you only bring 5 symbols).
- Some tier placements that don’t match the *actual* “power/impact per unlock” suggested by your own sim (e.g., **Compass** and **Oil Can** are extremely high-impact).
- Tier 4 has only 3 symbols and one of them (Tide) is low-ranked; pacing may feel like “the game ends before the endgame unlocks matter.”

Below are concrete recommendations per question.

---

## 1) Is the unlock ordering good? Should strong symbols unlock earlier or later?

**General rule I’d use:** unlock *high-agency* symbols earlier (they create new decisions), and unlock *high-power / high-consistency* symbols later (they raise win rate broadly).

Using your sim ranking:

- **Very strong / consistency boosters:** Compass (rank #1), Oil Can (#2), Bell/Seven (base), Ember (#5), Apple (#6), Vine (#7)
- **Weak / niche:** Crown (last), Bomb (19), Honey (18), Tide/Egg/Cherry low

### Specific ordering feedback

**Compass (Tier 2) feels too early for its power.**
- It’s #1 in your ranking and it changes the fundamental constraint of the game (reachability / placement options). That’s a “run-shaping” unlock.
- Suggestion: move **Compass to Tier 3** (or keep Tier 2 but make the condition harder than “Beat level 3”).

**Oil Can (Tier 3) is appropriately late, maybe even “Tier 3.5”.**
- It’s #2 in power and matchLength 1 is inherently abusable/degenerate if not carefully constrained.
- Keeping it Tier 3 is fine, but the condition should be *reliable and skill-based* (see section 2).

**Ember (Tier 2) is fine.**
- It teaches “respins matter” and encourages using the shop mechanic. Power #5 but conditional.

**Apple (Tier 3) + Banana (Tier 4) is a great arc.**
- It creates a clear “fruit deck” aspirational build and your archetype data supports it.

**Crown (Tier 4) is fine as a “meta” unlock, but it’s currently weak.**
- Since it’s last in power, it risks feeling anticlimactic unless it’s intentionally a “challenge / downside” symbol or it has additional upside (more on this below).

---

## 2) Are the unlock conditions fun and fair? Any too easy, too hard, or too grindy?

I’ll call out the ones most likely to be problematic given your mechanics (8x8, locking matched cells, respins, walls, score-as-currency).

### Tier 1
- **Jam: cumulative score 500** — good, fast, teaches “abilities exist.”
- **Bomb: create a 4+ match** — good, skill moment.
- **Honey: cumulative score 2000** — fine.
- **Coral: match 3 different symbol types in one level** — *potentially unclear*. Players may not know what “different symbol types in one level” means (3 separate matches? a single match?).

**Suggestion:** make Coral condition explicit: “In one level, score matches with 3 different symbols.”

### Tier 2
- **Egg: place all 16 tiles in a single level** — this can be *frustratingly binary* because “place all tiles” depends on board not getting stuck. It’s also not clearly tied to Egg’s identity (ML4 + extra tiles).
  - Better: “Make a 4-length match” (teaches ML4) or “Make a 4-length match twice in one level.”
- **Ghost: lock 20 cells in one level** — likely grindy/swingy. Locking depends on match frequency and board flow; also Ghost’s identity is “doesn’t lock,” so the condition is thematically inverted.
  - Better: “Respin a line containing a locked cell 5 times” or “Finish a level with 10+ locked cells still on the board” (teaches persistence/lock management).
- **Ember: buy 3 respins in a single level** — good, but ensure score economy makes this achievable early. If buying respins is often a trap early, this becomes grindy.
- **Compass: beat level 3** — straightforward, but see power concern above.

### Tier 3
- **Apple: score 300 from cherry matches in one run** — good *if you can track it in UI*. Without tracking, it’s invisible grind.
  - Strongly recommend adding a per-run tracker UI for the active unlock goal.
- **Magnet: match bell or seven 5 times in one run** — could be grindy because bell/seven are low frequency (2 and 1). Magnet *increases* their frequency, but you don’t have Magnet yet when trying to unlock it.
  - Better: “Match Bell 3 times in one run” (only bell), or “Match Seven once” (a hype moment), or “Score X with Bell/Seven” where X scales with their rarity.
- **Vine: place tile adjacent to 3+ walls** — good and thematic. Might be too dependent on wall generation randomness; consider “adjacent to 2+ walls” or “replace a wall 5 times across runs.”
- **Oil Can: have 25+ locked cells at once** — very swingy. Also, Oil Can’s whole point is unlocking; requiring a huge lock pile-up before you get the unlock tool can feel backwards.
  - Better: “Unlock 10 locked cells in one action” (but you need Oil Can for that), so instead: “End a level with 20+ locked cells” (teaches lock pressure) or “Create a match that locks 8+ cells at once” (skill-based).

### Tier 4
- **Crown: use 10 different symbols across runs** — good meta goal, low friction, encourages experimentation.
- **Banana: trigger Fruit Salad 3 times in one run** — likely too hard unless Fruit Salad is already common with Apple. Also it’s a “requires Apple” gate, which is fine, but 3 times in one run might be a lot.
  - Consider “Trigger Fruit Salad once” (unlock Banana), and “Trigger Fruit Salad 3 times” as a cosmetic/title/extra reward.
- **Tide: win a level with 15+ empty cells remaining** — this is *very dependent on level state and wall count*. Also it incentivizes not placing tiles / getting stuck, which is weird.
  - Better: “Win a level with 10+ empty cells” or “Score X bonus from empty cells in one level” (more aligned with Tide’s ability).

---

## 3) Does the progression create good “aha moments” and discovery?

Yes, the structure supports several “aha” beats:

- **Jam** teaches “symbols can affect other symbols’ scoring.”
- **Bomb/Honey** teach adjacency/board effects.
- **Ember** teaches “respins can be a build axis.”
- **Apple → Banana** is a strong recipe/wild synergy discovery path.

Where it’s weaker:
- **Ghost** and **Oil Can** unlock conditions don’t naturally teach the *thing the symbol does* (they teach the opposite pressure).
- **Magnet** unlock condition relies on rare events without the tool that increases their frequency.

**Recommendation:** For each symbol, make the unlock condition demonstrate the symbol’s *core fantasy*:
- Ghost: “Keep a cell respinnable” / “respin a cell that was part of a match” (conceptually).
- Oil Can: “Break out of lock pressure” (e.g., “Win a level after having 10+ locked cells”).

---

## 4) Any issues with the tier structure or pacing?

**Tier sizes are uneven** (4 / 4 / 4 / 3). That’s okay, but Tier 4 may feel short.

**Tier 2 currently contains a top-1 power symbol (Compass)** which can compress the midgame: once players get Compass, many other placement/softlock challenges reduce, and later unlocks feel less necessary.

**Tier 4 contains the weakest symbol (Crown) and a low-ranked symbol (Tide).**
- If Tier 4 is “mastery/endgame,” players expect either (a) power, or (b) weird build-defining mechanics. Crown currently reads like mild utility; Tide reads like low power.

---

## 5) Suggestions for improvement (concrete)

### A) Rebalance tier placement (minimal changes)
- Move **Compass** to Tier 3 (or make its condition harder).
- Move **Ghost** earlier (Tier 1/2) but change its unlock condition to something less grindy.
- Keep **Apple Tier 3**, **Banana Tier 4** (good arc).
- Consider adding **one more Tier 4 symbol** (or promote one from Tier 3) so Tier 4 doesn’t feel thin.

### B) Make unlock conditions observable in-game
UNVERIFIED: I can’t see your UI/store code for unlock tracking in this context.  
But regardless: conditions like “score 300 from cherry matches” or “use 10 different symbols across runs” need an in-run / meta progress indicator, or they become hidden grind.

### C) Replace the most swingy/grindy conditions
- **Magnet:** change to “Match Seven once” *or* “Match Bell 3 times in one run.”
- **Oil Can:** change to “End a level with 20+ locked cells” (pressure) or “Lock 15+ cells in one level” (still pressure but less extreme).
- **Tide:** change to “Score 150+ bonus from empty cells in one level” (directly tied to its ability), or reduce empty-cell requirement.

### D) Make Crown feel like a real Tier 4 unlock
Given it’s last in your power ranking, consider one of:
- Give Crown an additional upside (e.g., +1 entry spot, or small passive multiplier), **or**
- Reframe it explicitly as a “challenge symbol” with a downside but big upside (e.g., your spec mentions score_penalty; Crown in the doc table had a penalty concept, but your current `src/symbols.ts` Crown only has extra slots).

(Verified in current code: `src/symbols.ts` Crown only has `extra_slots +2`.)

---

### Questions (to validate before finalizing tuning)

- How often do players *actually* buy respins early (score economy)? If buying respins is rare, Ember’s unlock becomes grindy.
- Do you plan to show unlock progress in the HUD/meta screen? Several conditions need visibility.
- Are unlock conditions evaluated per-level, per-run, or lifetime? Some of your tier text mixes these—clarifying will help pacing.

---

### Upstream/Downstream Opportunities

- **Downstream (game feel):** Add “active unlock goal” tracking and post-level breakdown (“You progressed 2/5 Bell matches”).  
  - **Risk level:** Safe.
- **Upstream (design):** Align each unlock condition with the symbol’s “fantasy” (Ghost shouldn’t unlock via locking a lot; Oil Can shouldn’t require extreme lock pileups).  
  - **Risk level:** Worth Investigating.

---

### What’s Done Well

- The Apple → Banana “fruit deck” arc is a strong aspirational build path and matches your simulated top archetype.
- Early tiers introduce *different categories* of mechanics (scoring multiplier, board clear, adjacency scoring, respin economy), which is exactly what you want in the first few runs.


---
*Generated by second-opinion MCP server*