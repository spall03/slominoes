# Slominoes — Ad Support Implementation Plan (v1)

**Date:** 2026-04-19
**Status:** APPROVED — execution starts on Phase 0
**Spec:** `docs/superpowers/specs/2026-04-19-ad-support-design.md` (v2)
**Estimate:** ~10–12 working days from green-light to App Store live

---

## Context summary

Implementing the three-pillar ad-support spec (rewarded + interstitial + IAP) for iOS-first ship. Build proceeds in dependency order so unknowns surface early; **all features ship together** in a single App Store submission.

Build order rationale:
1. **Foundation** — nothing works without SDKs + init state machine + native build pipeline
2. **IAP** — riskiest mechanically (StoreKit edges); also gates interstitial entitlement check
3. **Interstitials** — depends on IAP entitlement; trivial mechanically, fiddly behaviorally
4. **Rewarded** — simplest mechanically; least risky; ships last
5. **Analytics + Crashlytics + polish** — instrument throughout, but cleanup pass at the end
6. **Submission**

---

## Phase 0 — Foundation (~3 days)

Goal: produce a TestFlight build that boots, shows AdMob test ads, and has the full init state machine working — but no game-feature ad integration yet.

### 0.1 Steve's setup tasks (paint-by-numbers)

**[Steve] Apple Developer app record**
- Verify existing Apple Developer account is Personal or 2nd Strike Corp Org → record decision
- Apple Developer portal → Certificates, Identifiers & Profiles → Identifiers → register `com.2ndstrike.slominoes`
- Enable App ID capabilities: ATT, In-App Purchase
- App Store Connect → Apps → New App
  - Bundle ID: `com.2ndstrike.slominoes`
  - Name: "Slominoes"
  - Subtitle: "Tile-match puzzle roguelite"
  - Primary category: Games → Puzzle
  - Secondary: Games → Strategy
  - SKU: `slominoes-ios-v1`

**[Steve] AdMob console setup**
- Create AdMob app: name "Slominoes iOS", platform iOS, link to App Store record
- Note the **AdMob app ID** (looks like `ca-app-pub-XXXXX~YYYY`)
- Create three ad units, note each unit ID:
  - `slominoes-ios-respin-rescue-rewarded` (Rewarded)
  - `slominoes-ios-continue-rewarded` (Rewarded)
  - `slominoes-ios-game-over-interstitial` (Interstitial)

**[Steve] App Store Connect IAP product**
- Apps → Slominoes → Features → In-App Purchases → +
- Type: Non-Consumable
- Reference Name: "Remove Ads"
- Product ID: `com.2ndstrike.slominoes.removeads`
- Pricing: $3.99 (USD tier 4)
- Localized display name: "Remove Ads"
- Localized description: "Remove all interstitial ads forever. Rewarded ads stay available."
- Submit for review (will be reviewed alongside the binary)

**[Steve] Privacy policy page**
- Host static HTML at `https://2ndstrike.co/privacy`
- Claude will draft the content; Steve uploads to wherever `2ndstrike.co` is hosted

**[Steve] Apple Developer Account verification**
- Confirm enrollment type (Personal vs Organization)
- If switching to Org for 2nd Strike Corp, this adds 4–6 weeks for DUNS verification — flag if needed

### 0.2 Repo setup tasks (Claude)

**0.2.1 Add native module dependencies**
```
react-native-google-mobile-ads
react-native-iap
@react-native-firebase/app
@react-native-firebase/analytics
@react-native-firebase/crashlytics
```
Files touched: `package.json`
Acceptance: `npm install` succeeds; types resolve

**0.2.2 Configure Expo config plugins**
Files touched: `app.json`
- `react-native-google-mobile-ads` plugin entry with iOS app ID
- `@react-native-firebase/app` plugin
- `@react-native-firebase/analytics` plugin
- `@react-native-firebase/crashlytics` plugin
- `react-native-iap` (no plugin needed; uses native dependencies via autolinking)
- ATT usage description: "We use this to show you ads relevant to your interests."
- Bundle ID: `com.2ndstrike.slominoes`
- Add `GoogleService-Info.plist` reference (Steve downloads from Firebase console)

Acceptance: EAS preview build runs `expo prebuild` without error

**0.2.3 Web-isolated wrapper modules**
Files created:
- `src/ads.ts` — platform router
- `src/ads.native.ts` — real AdMob bindings (load + show + status)
- `src/ads.web.ts` — no-op stubs returning `Promise.resolve()`
- `src/iap.ts` + `iap.native.ts` + `iap.web.ts`
- `src/analytics.ts` + `.native.ts` + `.web.ts`
- `src/crashlytics.ts` + `.native.ts` + `.web.ts`

Pattern (per spec):
```ts
// ads.ts
import { Platform } from 'react-native';
export const adsApi = Platform.OS === 'web'
  ? require('./ads.web').adsApi
  : require('./ads.native').adsApi;
```

Acceptance: web build still compiles and runs without referencing native modules

**0.2.4 Init state machine**
Files created: `src/ad-init.ts`
Steps per spec section "Initialization state machine":
1. ATT prompt
2. UMP consent
3. AdMob initialize
4. Firebase Analytics initialize
5. Crashlytics initialize
6. Set `adServiceReady=true`

Files touched: `App.tsx` — gate render on init complete; show pre-init UI ("Initializing…") until ready

New store: `useAdInitStore` (or fold into `useMetaStore`)
- `adServiceReady: boolean`
- `adServiceFailed: boolean`
- `attStatus: string`

Acceptance: app boots on iOS device, sequentially shows ATT prompt → UMP form → main menu. Sequence visible in logs. No race conditions.

**0.2.5 First EAS native iOS build**
- `eas build --platform ios --profile preview`
- Install on Steve's iPhone via TestFlight
- Verify: ATT prompt fires, UMP form fires (use UMP debug geography to force EU), AdMob test ad shows when manually triggered

Acceptance: Steve sees an AdMob test ad on a real iPhone running an EAS build of Slominoes

### Phase 0 done = TestFlight build #1 with foundation working, no game integration yet

---

## Phase 1 — IAP (~2 days)

Goal: "Remove Ads" purchase + restore + cold-start auto-restore working end-to-end.

### 1.1 IAP wrapper module (`src/iap.native.ts`)
- `getProducts()` — fetch product info from StoreKit
- `purchaseRemoveAds()` — initiate purchase
- `restorePurchases()` — manual restore
- `getActiveEntitlements()` — query StoreKit at cold start

### 1.2 Entitlement state
Files touched: `src/meta-store.ts`
- Add `removeAdsEntitled: boolean`
- Persist via existing AsyncStorage layer
- Add cold-start hook: on app load, query StoreKit, silently set if entitled

### 1.3 Settings UI
Files touched: `src/components/SettingsScreen.tsx`
- Add `RemoveAdsRow` component
  - If not entitled: shows price + "Remove Ads" button
  - If entitled: shows "✓ Ad-free" + "Restore Purchases" button (still required)
- Add "Manage Privacy Choices" row that re-presents UMP form

### 1.4 Sandbox testing
- Create sandbox tester account in App Store Connect
- Test purchase flow on real device
- Test restore flow (delete app, reinstall, verify auto-restore)
- Test cancellation
- Test offline (purchase should queue, AsyncStorage should be cache only)

Acceptance: TestFlight build #2 — Steve can purchase, restore, and the entitlement persists across reinstall.

---

## Phase 2 — Interstitials (~2 days)

Goal: post-game-over interstitials with first-run-skip + 120s cooldown, gated by IAP entitlement.

### 2.1 InterstitialGate component
File created: `src/components/InterstitialGate.tsx`
- Pre-loads on mount
- On `show()` call: shows ad if loaded + entitled-check-passes + cooldown-clear; else immediate `onComplete`
- Tracks `lastInterstitialAt` in `useMetaStore`

### 2.2 First-run + cooldown logic
Files touched: `src/meta-store.ts`
- Add `firstRunCompleted: boolean` (persisted)
- Add `lastInterstitialAt: number` (persisted timestamp)

Decision logic:
```
shouldShowInterstitial =
  !removeAdsEntitled
  && firstRunCompleted
  && (Date.now() - lastInterstitialAt) >= 120_000
  && interstitialAdLoaded
```

### 2.3 GameOver flow integration
Files touched: `src/components/GameOverScreen.tsx`
- After "Main Menu" / "Play Again" tap, show interstitial via `InterstitialGate`
- On dismissal, transition as before
- Set `firstRunCompleted=true` after first run regardless of whether interstitial fires

### 2.4 Pre-loading
Files touched: `src/store.ts` `level_ended` handler
- Trigger `adsApi.preloadInterstitial()` when level ends

### 2.5 Failure fallback
- If interstitial not loaded by GameOver, transition immediately (no "loading…" UI)

Acceptance: TestFlight build #3 — interstitials fire after game over, but not on first run, and not within 120s of the previous one. IAP buyers see no interstitials.

---

## Phase 3 — Rewarded ads (~2 days)

Goal: "+3 respins" and "Continue" rewarded slots with caps + pre-loading + analytics.

### 3.1 AdRewardButton component
File created: `src/components/AdRewardButton.tsx`
- Props: `placement`, `onReward`, `disabled`, `disabledReason`
- States: idle, loading, ready, watching, rewarded, failed
- Pre-loads ad on mount when not disabled
- Hides itself if 3 consecutive failures (don't waste UI on broken SDK)

### 3.2 Run state additions
Files touched: `src/store.ts` (useRunStore)
- `respinAdUsedThisRun: boolean`
- `continuesUsedThisRun: number` (0, 1, 2)
- `sawInterstitialThisRun: boolean`
- `runStartTime: number`
- Reset all to defaults on `startRun()`

### 3.3 Respin-rescue affordance
Files touched: `src/components/HUD.tsx`
- When `respinsRemaining===0 && !respinAdUsedThisRun && score < nextRespinCost`:
  - Replace the buy-respin button with `AdRewardButton placement="respin_rescue" reward="+3"`
- On reward: `bonusRespins += 3`, `respinAdUsedThisRun = true`

### 3.4 Continue affordance
Files touched: `src/components/GameOverScreen.tsx`
- When `continuesUsedThisRun < 2 && outcome === 'lost'`:
  - Show `AdRewardButton placement="continue"` with copy "Watch to Continue (X/2 remaining)"
- On reward: trigger Continue action in `useRunStore`:
  - Reset failed level (`levelScore=0`, fresh tile queue, `respinsRemaining = bonusRespins + 5`, locked combos cleared, grid wiped)
  - `continuesUsedThisRun += 1`
  - Transition back to `runPhase: 'playing'`
- Emit `continue_used` event

### 3.5 Continue action in store
File touched: `src/store.ts`
- New action `useRunStore.continueLevel()` — implements the fresh-restart semantics
- Preserves: `currentLevel`, `bonusRespins`, all `useMetaStore` data, totals
- Resets: failed level state in `useGameStore`

Acceptance: TestFlight build #4 — both rewarded slots work, caps enforced, continue restarts the level cleanly.

---

## Phase 4 — Analytics + Crashlytics integration (~1 day)

Goal: all 17 analytics events + Crashlytics custom keys wired throughout the codebase.

### 4.1 Analytics event wiring

| Event | Where to emit |
|---|---|
| `app_open` | `App.tsx` on mount (after init) |
| `att_response` | `ad-init.ts` after ATT prompt resolves |
| `run_started` | `useRunStore.confirmDraft()` |
| `run_ended` | `useRunStore.completeLevel()` (when victory) and `failLevel()` and `abandonRun()` |
| `level_ended` | `useGameStore` placement-handler end-of-level paths |
| `rewarded_offered` | `AdRewardButton` mount when ad loads |
| `rewarded_started` | `AdRewardButton` user-tap |
| `rewarded_completed` | `AdRewardButton` `onReward` callback |
| `rewarded_dismissed` | `AdRewardButton` close-without-reward |
| `rewarded_failed` | `AdRewardButton` load/show error |
| `continue_used` | `useRunStore.continueLevel()` |
| `interstitial_shown` | `InterstitialGate` show callback |
| `interstitial_failed` | `InterstitialGate` failure path |
| `iap_settings_viewed` | `SettingsScreen` mount |
| `iap_started` | `RemoveAdsRow` purchase tap |
| `iap_completed` | `iap.native.ts` purchase resolve |
| `iap_failed` | `iap.native.ts` purchase reject |
| `iap_restored` | `iap.native.ts` restore success (button or auto) |
| `unlock_triggered` | `useMetaStore.endRun()` when `pendingUnlock` set |

### 4.2 User properties

Set on app load + on relevant changes:
- `iap_remove_ads_owned` — set on entitlement change
- `att_status` — set after ATT prompt resolves
- `furthest_level_reached` — set on `endRun` based on `cumulativeStats.furthestLevel`
- `total_runs_played` — set on `endRun` based on `cumulativeStats.totalRuns`
- `unlocks_owned_count` — set on `endRun` based on `unlockedSymbols.size`

### 4.3 Crashlytics custom keys
Files touched: where state changes
- `currentLevel` — set on level transitions
- `runPhase` — set on phase transitions
- `placementMode` — set on placement transitions
- `removeAdsEntitled` — set on entitlement change

Acceptance: TestFlight build #5 — verify in Firebase Console that events fire, user properties populate, and a synthetic crash shows up in Crashlytics dashboard.

---

## Phase 5 — App Store submission (~1–2 days)

### 5.1 Privacy nutrition labels
Use Apple's privacy questionnaire. Disclose per Google's official documentation:
- AdMob: Identifiers, Usage Data, Diagnostics, Precise Location (if enabled — disable if not needed)
- Firebase Analytics: Usage Data
- Firebase Crashlytics: Diagnostics

### 5.2 Privacy policy text (Claude drafts, Steve hosts)
File created: `docs/legal/privacy-policy.md`
~200 words: ad SDK disclosure, IAP disclosure, analytics disclosure, contact email, opt-out instructions, "we don't sell data."
Steve uploads to `2ndstrike.co/privacy`.

### 5.3 App Store Connect listing assets
- Icon (1024×1024 PNG)
- Screenshots (iPhone 6.7", 6.1"; iPad if supporting)
- App Store description (Steve writes; Claude can draft)
- Keywords (under 100 chars total, comma-separated)
- Support URL (`2ndstrike.co/support` or similar)
- Marketing URL (optional)

### 5.4 Submit
- Build #5 archived
- Submit for review
- Address feedback (1–3 cycles typical)

Acceptance: live on App Store.

---

## Risk register (from spec, with implementation-level mitigations)

| Risk | Mitigation in this plan |
|---|---|
| New Architecture breaks AdMob | Phase 0.2.5 validates on real device; can disable new arch if needed |
| ATT init race condition | State machine (Phase 0.2.4) gates everything on `adServiceReady` |
| StoreKit edge cases | Phase 1.4 sandbox testing covers offline, refund, restore |
| User loses entitlement on reinstall | Phase 1.2 cold-start auto-restore |
| Privacy nutrition labels rejected | Phase 5.1 follows Google's official disclosure docs |
| Web build broken by native imports | Phase 0.2.3 wrapper modules with `.web.ts` no-op stubs |
| Interstitials too aggressive, kill retention | Phase 2.2 guardrails (first-run skip, 120s cooldown) |
| User backlash → bad reviews | All ads ship with IAP escape valve in same submission |

---

## What "done" looks like

- App live on US App Store
- Crashlytics dashboard quiet (no flood of crashes)
- Firebase Analytics receiving events from real users
- IAP transactions visible in App Store Connect
- AdMob revenue ticking up
- TestFlight beta + production cohorts both functional

After ship: collect 7–14 days of data, then revisit:
- Is interstitial cadence killing Day-7 retention? (Tune cooldown / skip-first-N rule)
- Are rewarded ads converting? (Tune affordance prominence or cap)
- IAP conversion rate? (Tune storefront copy or trigger placement)
- What % of users grant ATT? (Affects revenue model assumptions)

These tuning decisions feed v1.1 (and possibly daily reward / draft reroll add-ons).

---

## Steve's checklist for Phase 0 (paint-by-numbers)

- [ ] Verify Apple Developer account type (Personal vs Org)
- [ ] Register `com.2ndstrike.slominoes` bundle ID
- [ ] Create App Store Connect app record (name, subtitle, categories)
- [ ] Create AdMob app + 3 ad units; share IDs with Claude
- [ ] Register IAP product in App Store Connect
- [ ] Create sandbox tester account
- [ ] Download `GoogleService-Info.plist` from Firebase Console (after creating Firebase project)
- [ ] Host privacy policy text at `2ndstrike.co/privacy` (Claude drafts text)
- [ ] Provide TestFlight tester email(s)

Once all checkboxes done, Phase 0.2 (Claude's repo work) can ship the first build.
