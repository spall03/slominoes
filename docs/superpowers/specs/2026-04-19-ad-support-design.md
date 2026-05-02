# Slominoes — Ad Support Design (v2)

**Date:** 2026-04-19
**Status:** APPROVED — moving to implementation
**Author:** Steve Palley (with Claude)
**Supersedes:** v1 (same date) — incorporates consensus second-opinion review (Gemini 2.5 Pro + GPT-5.2)

---

## Goal

Build Slominoes into a real income stream via a three-pillar monetization model on **iOS first**:

1. **Rewarded ads** (player-positive, opt-in)
2. **Interstitial ads** (forced, post-game-over, frequency-capped)
3. **Remove-Ads IAP** ($3.99) that removes interstitials only

**Distribution strategy:** ship the complete v1 (all three pillars + IAP + analytics + crashlytics) in a single App Store submission. No incremental phasing of public releases.

**Web** (current GitHub Pages deployment) stays free and ad-free as a marketing/preview surface — eCPMs there don't justify integration cost.

**Android** is a Phase-2 follow-on after iOS data lands.

**Income realism (no paid UA, organic only):** $30–100/mo at 50–200 DAU; $300–800/mo at 1,000 DAU. Real income requires ASO + paid UA — out of scope here.

---

## App identity

| Field | Value |
|---|---|
| Bundle ID | **`com.2ndstrike.slominoes`** |
| App Store name | **Slominoes** |
| Subtitle | **Tile-match puzzle roguelite** |
| Primary category | Games → Puzzle |
| Secondary category | Games → Strategy |
| Privacy policy URL | **`https://2ndstrike.co/privacy`** |
| Apple Developer account | TBD — Steve to verify whether existing account is Personal or 2nd Strike Corp Org |
| Age rating | Likely 4+ (no objectionable content). Revisit if AdMob content rating settings push higher |

---

## Platform & SDK choices

| Concern | Choice | Why |
|---|---|---|
| Ad network | **AdMob** | Highest fill / eCPM in casual mobile game segment |
| RN ad SDK | **`react-native-google-mobile-ads`** | De facto AdMob bridge; Expo config plugin |
| Consent UI | **Google UMP SDK** (bundled) | Required for EU users; ATT-aware on iOS |
| IAP | **StoreKit 2** via **`react-native-iap`** | StoreKit 2 receipt verifiable on-device |
| Analytics | **`@react-native-firebase/analytics`** | Free, GDPR-aware, Google ecosystem (integrates with AdMob) |
| Crash reporting | **`@react-native-firebase/crashlytics`** | Free, expected by reviewers, only way to see prod crashes |
| Receipt validation | **On-device trust** (StoreKit as truth, AsyncStorage as cache) | Negligible spoof risk at small scale; no backend cost |
| Build system | **EAS Build** | Expo app already; native modules via config plugins |

### Critical iOS-specific requirements
- App Tracking Transparency (ATT) prompt — must show before any ad SDK requests IDFA
- UMP consent — required for EU users
- Apple Developer enrollment (Personal or Org)
- Privacy nutrition labels — must disclose AdMob, Firebase Analytics, Crashlytics data collection
- SKAdNetwork IDs in Info.plist (added by config plugin; verify on each EAS build)

---

## Initialization state machine

**[BLOCKING for App Store approval]** All ad / analytics / SDK initialization must follow this sequence. Any out-of-order call that touches IDFA before ATT can get the app rejected and the AdMob account flagged.

```
App launch
  ↓
[1] Render minimal pre-init UI (logo, "Initializing…")
  ↓
[2] requestTrackingAuthorization()  → resolves with ATT status
      • Log analytics event: att_response{status}
      • Set user property: att_status
  ↓
[3] UMP.requestConsentInfoUpdate() then UMP.loadAndShowConsentFormIfRequired()
      • If form unavailable (network error): proceed with non-personalized ads
      • If user dismisses without consent: respect their choice
  ↓
[4] mobileAds().initialize()  with NPA flag if ATT denied OR UMP not consented
  ↓
[5] firebase.analytics().initialize() with consent flags
  ↓
[6] firebase.crashlytics().initialize()
  ↓
[7] Set adServiceReady=true in global store
  ↓
[8] Render TitleScreen — ad-using components now safe to mount
```

Components depending on ads (`HUD` rewarded affordance, `GameOverScreen` continue+interstitial, `SettingsScreen` IAP) **must** check `adServiceReady` and render no-op fallbacks until true.

**Offline / consent-form-unavailable behavior:**
- If consent form fails to load, treat as "non-personalized only" and proceed
- If AdMob initialize fails (network), set `adServiceFailed=true` and hide all ad affordances entirely (no broken UI)
- "Manage Privacy Choices" link in Settings re-presents UMP form on demand

---

## Pillar 1 — Rewarded ads (lean v1: 2 slots)

Two rewarded slots. Both player-initiated, both capped per-run. **No daily reward, no draft reroll in v1** (deferred to v1.1).

### 1a. "Watch for +3 Respins"

| Aspect | Detail |
|---|---|
| Trigger | Player taps the HUD respin badge while broke (no respins, can't afford buy) — affordance shows "🎁 EARN" CTA inline |
| Reward | `bonusRespins += 3` |
| Cap | **1 use per run** |
| Pre-load | Begin loading rewarded ad as soon as `respinsRemaining===0 && respinAdUsedThisRun===false` |
| Visibility | Affordance dimmed when used or when ad load fails consistently (3 consecutive failures → hide for the session) |
| Fallback | If ad fails to load, restore affordance and show "Try again" — no grant |

### 1b. "Watch to Continue"

| Aspect | Detail |
|---|---|
| Trigger | Game-over screen, on any game over (no level restriction) |
| Cap | **2 uses per run total**, single counter (no per-block math) — UI shows "X/2 continues remaining" |
| Reward (locked) | Restart the failed level: `levelScore=0`, fresh tile queue, `respinsRemaining = bonusRespins + 5`. Run state preserved (currentLevel, bonusRespins, totals, unlocks) |
| Pre-load | Begin loading when `level_ended.outcome=lost` fires |
| Fresh-restart semantics | Locked combos cleared, grid wiped, entry spots reseeded |
| Why fresh restart not mid-state resume | Cleaner state, fewer bugs, prevents degenerate continue loops; tradeoff is slightly lower perceived value (we accept this) |

### Why "+3 respins" not "+1"
A single respin doesn't move the strategic needle for a 30s ad watch. +3 meaningfully changes a level outcome.

### Why "1 per run" not "1 per level" (respin slot)
1 per run preserves the strategic decision (when do I burn this?). 1 per level trains players to expect ad-watching as routine; lower satisfaction, higher fatigue.

### Why "2 continues per run flat" not 3-per-block
Both reviewers flagged 3-per-block as state-heavy and easy to abuse. 2/run flat is simpler code, simpler UI ("X/2 remaining"), and still preserves the retention benefit of having a save valve in long runs. Fresh-restart semantics prevent trivializing difficulty.

---

## Pillar 2 — Interstitial ads (lean + guardrails)

| Aspect | Detail |
|---|---|
| Placement | After GameOver screen dismisses, before returning to title or starting next run |
| Cadence | Every game over (run end), with two guardrails: |
| **Guardrail 1:** | No interstitial on the very first run after install. Trains "this is a game, not an ad delivery system." |
| **Guardrail 2:** | Minimum 120s between interstitials. Prevents rapid-failure runs from triggering rapid-fire ads. |
| Skip behavior | Standard ~5s grace period (AdMob default), then user can dismiss |
| Hidden by IAP | Yes — `removeAdsEntitled` flag bypasses entirely |
| Pre-load | Begin loading when `level_ended` fires (whether win or loss) for the current level |
| Fallback | If no ad available, transition immediately to title (no "loading" state — feels broken) |

### Why post-GameOver, not pre-level
Mid-run interstitials would shred the puzzle flow. GameOver→Title is the only natural seam — player has already shifted attention from the puzzle.

### Why every game over (with guardrails)
Steve's design call. Aggressive but defensible: highest-leverage moment, players who hate it have a $3.99 escape, guardrails prevent the abusive pattern (rapid-fire after early failures).

---

## Pillar 3 — Remove-Ads IAP

| Aspect | Detail |
|---|---|
| Price | **$3.99 USD** (or local-equivalent tier; copy must say "(or local equivalent)" not hardcode the dollar amount) |
| Type | Non-consumable |
| Product ID | `com.2ndstrike.slominoes.removeads` |
| What it removes | **Interstitials only** |
| What it preserves | **Rewarded ads remain available** — they're player-positive, gating them out of paid users would be punitive |
| Storefront copy | "Remove all interstitial ads forever. Rewarded ads (for free respins, continues) stay available — watch them whenever you want." |
| Restore flow | "Restore Purchases" button in Settings (App Store guideline requirement) |
| **Cold-start auto-restore** | On every cold launch, query StoreKit for active non-consumable entitlements. If "Remove Ads" is found, silently set `removeAdsEntitled=true` in AsyncStorage. No button press required for the common case. |
| Source-of-truth model | StoreKit is the truth; AsyncStorage is a cache. App boots optimistic from cache, then validates against StoreKit. If validation fails, treat as not-entitled. |
| Offline first launch | Use cached entitlement if previously validated; revalidate when online next |

### Why $3.99
$2.99 reads as disposable, undervalues the product. $4.99 hits a hesitation threshold. $3.99 is the casual-puzzle sweet spot.

### Why preserve rewarded ads on IAP buy
Buyers paid to remove *forced* friction. Removing the *opt-in* ads they actively want would be punitive, not a reward.

---

## Analytics design (Firebase Analytics)

### SDK
`@react-native-firebase/analytics`. Initialize after ATT/UMP per the state machine above. Web build gated behind `Platform.OS` check.

### Wrapper module
`src/analytics.ts` — typed event emitters. Call sites do not import Firebase directly.

### Events (17 total)

**Session-level**
| Event | Parameters |
|---|---|
| `app_open` | — |
| `att_response` | `status` |

**Run lifecycle**
| Event | Parameters |
|---|---|
| `run_started` | `loadout` (comma-separated, sorted), `loadout_size`, `has_crown`, `unlocks_count` |
| `run_ended` | `outcome` (won\|lost\|abandoned), `final_level`, `final_score`, `total_respins_used`, `continues_used`, `saw_interstitial`, `duration_ms` |

**Level lifecycle**
| Event | Parameters |
|---|---|
| `level_ended` | `level`, `outcome` (won\|lost\|auto_end), `score`, `threshold`, `respins_used`, `respins_bought_in_level` |

**Rewarded ads**
| Event | Parameters |
|---|---|
| `rewarded_offered` | `placement` (respin_rescue\|continue), `level` |
| `rewarded_started` | `placement` |
| `rewarded_completed` | `placement` |
| `rewarded_dismissed` | `placement` |
| `rewarded_failed` | `placement`, `reason` |
| `continue_used` | `level`, `remaining_after` (0\|1) |

**Interstitials**
| Event | Parameters |
|---|---|
| `interstitial_shown` | `run_count` |
| `interstitial_failed` | `reason` |

**IAP**
| Event | Parameters |
|---|---|
| `iap_settings_viewed` | — |
| `iap_started` | `trigger` (settings\|other) |
| `iap_completed` | `price_tier` |
| `iap_failed` | `reason` (cancelled\|error\|pending) |
| `iap_restored` | `trigger` (button\|auto_cold_start) |

**Meta**
| Event | Parameters |
|---|---|
| `unlock_triggered` | `symbol_id` |

### User properties

| Property | Why |
|---|---|
| `iap_remove_ads_owned` | Slice all metrics by paying vs free |
| `att_status` | Slice eCPM/revenue by ATT cohort |
| `furthest_level_reached` | Cohort by progression depth |
| `total_runs_played` | Distinguish day-1 churners from real users |
| `unlocks_owned_count` | Progression-tier cohort |

### Privacy disclosure impact
Adds "Usage Data — App Functionality" disclosure. Functionally no change to nutrition label complexity (already disclosed by AdMob).

---

## Crashlytics design

### SDK
`@react-native-firebase/crashlytics`. Initialize after Analytics in the state machine.

### What it does
Automatic crash and ANR (app-not-responding) reporting. Stack traces, breadcrumbs, custom keys.

### Custom keys to set
- `currentLevel` (from useRunStore)
- `runPhase` (from useRunStore)
- `placementMode` (from useGameStore)
- `removeAdsEntitled` (from useMetaStore)

### Privacy disclosure impact
Adds "Diagnostics — App Functionality." Already covered by AdMob's existing disclosures, so no functional change.

---

## Ad pre-loading strategy

**[IMPORTANT]** Naïve "load on tap" produces 2–5s waits and tanks rewarded ad conversion. All ads must be pre-loaded.

| Ad slot | Pre-load trigger |
|---|---|
| Respin-rescue rewarded | When `respinsRemaining===0 && respinAdUsedThisRun===false` AND `score < nextRespinCost` (i.e., player about to need it) |
| Continue rewarded | When `level_ended.outcome=lost` AND `continuesUsedThisRun < 2` |
| Interstitial | When `level_ended` fires (any outcome) on the *final* level played in a run — i.e., when player either wins level 10 or loses any level. Heuristic: load on every `level_ended` and discard if not used |

Rewarded ads have a stable "ready" state in the SDK. Use it to prevent UI flicker — affordance is visible only when load complete OR explicit "loading…" while the user has indicated intent.

---

## Web build isolation

**[IMPORTANT]** Just `Platform.OS !== 'web'` checks aren't enough. Even conditionally-imported native modules can crash web bundlers.

### Pattern
```typescript
// src/ads.ts — platform-safe wrapper
import { Platform } from 'react-native';

export const adsApi = Platform.OS === 'web'
  ? require('./ads.web').adsApi   // no-op stubs
  : require('./ads.native').adsApi; // real AdMob bindings
```

`ads.web.ts` exports the same TypeScript interface but all methods are no-ops returning `Promise.resolve()`. Web build never imports the native ad SDK.

Same pattern for `iap.ts`, `analytics.ts`, `crashlytics.ts`.

---

## Game integration map

### New state

```ts
// useRunStore additions
respinAdUsedThisRun: boolean;
continuesUsedThisRun: number;  // 0, 1, or 2
sawInterstitialThisRun: boolean;
runStartTime: number;  // for duration_ms analytics

// useMetaStore additions
removeAdsEntitled: boolean;
firstRunCompleted: boolean;  // for "no interstitial on first run" guardrail
lastInterstitialAt: number;  // timestamp; for 120s cooldown

// new: useAdServiceStore (or part of an existing store)
adServiceReady: boolean;
adServiceFailed: boolean;
attStatus: 'granted' | 'denied' | 'restricted' | 'not_determined';
```

### New components
- `AdRewardButton.tsx` — reusable rewarded-ad CTA with loading/cooldown/disabled states
- `RemoveAdsRow.tsx` — IAP row in `SettingsScreen`
- `InterstitialGate.tsx` — invisible component that shows interstitial when mounted and entitlement check passes; calls `onComplete`

### New modules
- `src/ads.ts` + `src/ads.native.ts` + `src/ads.web.ts`
- `src/iap.ts` + `src/iap.native.ts` + `src/iap.web.ts`
- `src/analytics.ts` + `src/analytics.native.ts` + `src/analytics.web.ts`
- `src/crashlytics.ts` + `.native.ts` + `.web.ts`
- `src/ad-init.ts` — orchestrates the init state machine

### Touched components
- `App.tsx` (root) — runs init state machine, gates render on `adServiceReady`
- `HUD.tsx` — respin badge gains rewarded-ad CTA
- `GameOverScreen.tsx` — Continue CTA + InterstitialGate post-dismissal
- `SettingsScreen.tsx` — Remove-Ads row + Manage Privacy Choices link
- `app.json` — config plugin entries for all native modules; bundle ID; AdMob app IDs

### Visual / palette discipline
The Move-01 palette (cyan accent, gold value, pink danger, ink neutral ladder) extends to ad UI. No new hues:
- Rewarded "EARN" CTAs: cyan
- "Remove Ads" pill: gold (value)
- Interstitial close button: ink neutral
- Continue CTA on GameOver: cyan

---

## Phased rollout

Single ship — but the build proceeds in dependency order so unknowns surface early.

### Phase 0 — Foundation (~3 days)
- Apple Developer account + create app record (Steve)
- AdMob console + ad unit IDs (Steve)
- App Store Connect + IAP product registration (Steve)
- Privacy policy hosted at `2ndstrike.co/privacy` (Steve)
- Add native module dependencies to `package.json`
- Configure Expo config plugins in `app.json`
- ATT + UMP + AdMob + Firebase init state machine (`src/ad-init.ts`)
- Web-isolated wrapper modules (`ads.ts`, `iap.ts`, `analytics.ts`, `crashlytics.ts`)
- First EAS native iOS build that boots and shows AdMob test ads
- TestFlight build #1: foundation only, no game ad integrations yet

### Phase 1 — IAP (~2 days)
- StoreKit product fetch + purchase flow
- Cold-start auto-restore
- AsyncStorage entitlement cache
- "Restore Purchases" button + flow
- Settings UI integration
- Sandbox testing (real iOS device)
- TestFlight build #2: IAP testable

### Phase 2 — Interstitials (~2 days)
- `InterstitialGate` component
- Pre-loading on `level_ended`
- First-run-skip + 120s cooldown logic
- GameOver flow integration
- Failure fallback (silent transition)
- Entitlement check (skips if `removeAdsEntitled`)
- TestFlight build #3: interstitials live, IAP working as escape

### Phase 3 — Rewarded ads (~2 days)
- `AdRewardButton` component
- Respin-rescue affordance on HUD
- Continue affordance on GameOver
- Run state tracking (caps, used flags)
- Pre-loading
- Cap dimming + retry UX
- TestFlight build #4: full feature set

### Phase 4 — Analytics, Crashlytics, polish (~1 day, can overlap)
- Wire all 17 analytics events
- User property setters at appropriate touchpoints
- Crashlytics custom keys
- Manage Privacy Choices link in Settings
- TestFlight build #5: full instrumentation

### Phase 5 — App Store submission (~1–2 days)
- Privacy nutrition labels filled out (per AdMob + Firebase docs)
- App Store screenshots (iPhone 6.7", 6.1", iPad if supporting)
- App Store description, keywords, support URL
- Submit for review
- Address review feedback (1–3 review cycles is typical)

**Total estimate: ~10–12 working days** from green-light to App Store live.

### Phase 6 — Android (deferred)
After iOS data lands. Same patterns, Play Console + Android-specific entitlements.

### Phase 7 — ASO + paid UA (deferred, separate spec)
The actual revenue lever.

---

## Open questions

1. **Apple Developer account type** — Steve to verify whether existing account is Personal or 2nd Strike Corp Org. Affects publisher name on App Store listing.
2. **App Store metadata art** — icon, screenshots, description copy, keywords. Separate workstream; needs design pass before submission.
3. **Cloud save / accounts** — currently AsyncStorage local. Defer.
4. **Leaderboard** — Steve flagged "later." Defer; no v1 hooks.
5. **Refund handling** — StoreKit revocation hooks not wired in v1. If user refunds, interstitials don't re-enable until cold start. Acceptable v1 limitation.
6. **Kid-targeting flags** — game art is neutral but not kid-explicitly-marketed. Set AdMob "tag for child-directed treatment" to **false**. Age rating 4+ means no COPPA designation. Revisit if any specific feature changes child-relevance.

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Real income requires real DAU; ads alone won't generate it | High | This spec = foundation. ASO + UA is the actual lever, separate doc |
| iOS App Store review rejection (ads / consent / privacy) | High | UMP SDK (Apple-blessed); strict init state machine; full privacy nutrition labels; test with real iOS build before submit |
| Adding native modules breaks web build | Medium | Web-isolated wrapper modules with `.native.ts` / `.web.ts` split |
| ATT decline rate ~70% on iOS | Medium | Plan for non-personalized eCPMs as baseline; don't model the ceiling |
| New Architecture (`newArchEnabled: true`) compatibility with `react-native-google-mobile-ads` + UMP | Medium | Validate on real device early in Phase 0; can disable new arch for iOS if flaky |
| StoreKit edge cases (offline, family sharing, refunds) | Medium | StoreKit as truth, AsyncStorage as cache; cold-start auto-restore; deterministic offline rule (use last-known if can't validate) |
| Privacy manifest / SKAdNetwork drift over time | Low–Medium | Track Apple's evolving requirements; budget time for native config regeneration on each Xcode update |
| User backlash to interstitials | Low–Medium | $3.99 IAP escape valve; rewarded opt-in; first-run-skip + 120s cooldown guardrails |
| AdMob policy violation | Low (no banners) | No banner ads in v1; only rewarded + interstitial, both well-trodden |
| User loses entitlement on reinstall | Low (with auto-restore) | Cold-start auto-restore via StoreKit; manual restore as fallback |

---

## What this spec does NOT cover

- Banner ads (deliberately excluded)
- Offerwall / playable ads
- Daily reward (deferred to v1.1)
- Draft reroll rewarded slot (deferred to v1.1)
- Cosmetic IAP (defer; separate spec)
- Hard currency / virtual currency systems (not aligned with puzzle-first design)
- Cloud saves, accounts, backend
- ASO + paid UA strategy
- Leaderboards
- Android (Phase 6)

---

## Next steps

1. ✅ Spec v2 approved — implementation begins
2. Plan v1 written at `docs/superpowers/plans/2026-04-19-ad-support-impl.md`
3. Steve completes Phase-0 manual setup (Apple Dev, AdMob, App Store Connect, privacy policy page)
4. Claude executes Phase 0–4 in dependency order
5. Phase 5 submission cycle
6. Live → instrument data → tune cadence + caps based on retention/revenue signals
