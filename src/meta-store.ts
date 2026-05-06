// src/meta-store.ts
// Persistent meta-progression: unlocked symbols, cumulative stats, unlock conditions.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SYMBOL_ROSTER,
  type SymbolDef,
  type SymbolId,
} from './symbols';

// =============================================================================
// UNLOCK CONDITIONS
// =============================================================================

export interface UnlockCondition {
  symbolId: SymbolId;
  tier: 1 | 2 | 3 | 4;
  hint: string;
  check: (stats: CumulativeStats, runStats: RunStats) => boolean;
}

export const UNLOCK_CONDITIONS: UnlockCondition[] = [
  // Tier 1
  { symbolId: 'jam', tier: 1, hint: 'Prove your worth',
    check: (s) => s.cumulativeScore >= 10_000 },
  { symbolId: 'bomb', tier: 1, hint: 'Win and win again',
    check: (s) => s.levelsWon >= 15 },
  { symbolId: 'honey', tier: 1, hint: 'Keep scoring',
    check: (s) => s.cumulativeScore >= 40_000 },
  { symbolId: 'ghost', tier: 1, hint: 'Fill the line',
    check: (_s, r) => r.maxMatchLength >= 8 },

  // Tier 2
  { symbolId: 'coral', tier: 2, hint: 'A seasoned champion',
    check: (s) => s.levelsWon >= 50 },
  { symbolId: 'egg', tier: 2, hint: 'Dedicated scorer',
    check: (s) => s.cumulativeScore >= 100_000 },
  { symbolId: 'ember', tier: 2, hint: 'Spin to win',
    check: (s) => s.respinsBought >= 30 },
  { symbolId: 'compass', tier: 2, hint: 'Conquer all ten',
    check: (s) => s.fullRunsWon >= 1 },

  // Tier 3
  { symbolId: 'apple', tier: 3, hint: 'Cherry devotee',
    check: (_s, r) => r.cherryScoreThisRun >= 1500 },
  { symbolId: 'magnet', tier: 3, hint: 'Ring the bell',
    check: (_s, r) => r.bellMatchesThisLevel >= 3 },
  { symbolId: 'vine', tier: 3, hint: 'Veteran champion',
    check: (s) => s.fullRunsWon >= 10 },
  { symbolId: 'oil_can', tier: 3, hint: 'Under pressure',
    check: (_s, r) => r.maxLockedCellsThisLevel >= 30 },

  // Tier 4
  { symbolId: 'crown', tier: 4, hint: 'Symbol collector',
    check: (s) => s.uniqueSymbolsUsed.size >= 12 },
  { symbolId: 'banana', tier: 4, hint: 'Fruit salad chef',
    check: (_s, r) => r.fruitSaladsThisRun >= 1 },
  { symbolId: 'tide', tier: 4, hint: 'Pure skill',
    check: (_s, r) => r.wonFullRunWithoutBuyingRespins },
];

// =============================================================================
// STATS
// =============================================================================

export interface CumulativeStats {
  cumulativeScore: number;
  levelsWon: number;
  fullRunsWon: number;
  respinsBought: number;
  uniqueSymbolsUsed: Set<string>;
  totalRuns: number;
  /** Deepest level reached across all runs (1-based, 1..NUM_LEVELS). */
  furthestLevel: number;
  /** Highest single-run final score. */
  bestRunScore: number;
}

/** Per-run/per-level stats for unlock condition checking */
export interface RunStats {
  maxMatchLength: number;
  cherryScoreThisRun: number;
  bellMatchesThisLevel: number;
  maxLockedCellsThisLevel: number;
  fruitSaladsThisRun: number;
  wonFullRunWithoutBuyingRespins: boolean;
  respinsBoughtThisRun: number;
  scoreThisRun: number;
}

function emptyRunStats(): RunStats {
  return {
    maxMatchLength: 0,
    cherryScoreThisRun: 0,
    bellMatchesThisLevel: 0,
    maxLockedCellsThisLevel: 0,
    fruitSaladsThisRun: 0,
    wonFullRunWithoutBuyingRespins: false,
    respinsBoughtThisRun: 0,
    scoreThisRun: 0,
  };
}

function defaultCumulativeStats(): CumulativeStats {
  return {
    cumulativeScore: 0,
    levelsWon: 0,
    fullRunsWon: 0,
    respinsBought: 0,
    uniqueSymbolsUsed: new Set(),
    totalRuns: 0,
    furthestLevel: 0,
    bestRunScore: 0,
  };
}

// =============================================================================
// PERSISTENCE
// =============================================================================

const STORAGE_KEY = 'slominoes_meta';

interface PersistedMeta {
  unlockedSymbols: string[];
  cumulativeScore: number;
  levelsWon: number;
  fullRunsWon: number;
  respinsBought: number;
  uniqueSymbolsUsed: string[];
  totalRuns: number;
  furthestLevel?: number;        // added in v2; absent on old saves
  bestRunScore?: number;         // added in v2; absent on old saves
  removeAdsEntitled?: boolean;   // ad-support: persisted entitlement cache
  firstRunCompleted?: boolean;   // ad-support: gate for first-run-no-interstitial guardrail
  hasTutorialBeenSeen?: boolean; // FTUE: gate for routing NEW RUN to Level 0
  hasSeenDraftIntro?: boolean;   // FTUE: gate for first-draft-visit overlay
}

interface PersistedAds {
  removeAdsEntitled: boolean;
  firstRunCompleted: boolean;
}

interface PersistedFtue {
  hasTutorialBeenSeen: boolean;
  hasSeenDraftIntro: boolean;
}

/**
 * One-time migration from the old Tutorial.tsx AsyncStorage key
 * (`slominoes_tutorial_seen`) to the new useMetaStore flag.
 *
 * Idempotent. Old key is preserved (not deleted) for rollback safety —
 * v1.1 can clean it up once we're confident migration succeeded for all
 * users.
 */
async function readLegacyTutorialFlag(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('slominoes_tutorial_seen');
    return raw === 'true';
  } catch {
    return false;
  }
}

async function loadMeta(): Promise<{
  unlocked: Set<string>;
  stats: CumulativeStats;
  ads: PersistedAds;
  ftue: PersistedFtue;
}> {
  // Legacy migration runs even when the new persisted blob is fresh — captures
  // existing players who saw the old slide-deck Tutorial.tsx.
  const legacyTutorialSeen = await readLegacyTutorialFlag();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        unlocked: new Set(),
        stats: defaultCumulativeStats(),
        ads: { removeAdsEntitled: false, firstRunCompleted: false },
        ftue: {
          hasTutorialBeenSeen: legacyTutorialSeen,
          hasSeenDraftIntro: false,
        },
      };
    }
    const data: PersistedMeta = JSON.parse(raw);
    return {
      unlocked: new Set(data.unlockedSymbols),
      stats: {
        cumulativeScore: data.cumulativeScore,
        levelsWon: data.levelsWon,
        fullRunsWon: data.fullRunsWon,
        respinsBought: data.respinsBought,
        uniqueSymbolsUsed: new Set(data.uniqueSymbolsUsed),
        totalRuns: data.totalRuns,
        furthestLevel: data.furthestLevel ?? 0,
        bestRunScore: data.bestRunScore ?? 0,
      },
      ads: {
        removeAdsEntitled: data.removeAdsEntitled ?? false,
        firstRunCompleted: data.firstRunCompleted ?? false,
      },
      ftue: {
        // OR-merge legacy and new — covers (a) fresh installs with legacy key,
        // (b) updated installs with new flag set, (c) edge case of both
        hasTutorialBeenSeen: data.hasTutorialBeenSeen ?? legacyTutorialSeen,
        hasSeenDraftIntro: data.hasSeenDraftIntro ?? false,
      },
    };
  } catch {
    return {
      unlocked: new Set(),
      stats: defaultCumulativeStats(),
      ads: { removeAdsEntitled: false, firstRunCompleted: false },
      ftue: {
        hasTutorialBeenSeen: legacyTutorialSeen,
        hasSeenDraftIntro: false,
      },
    };
  }
}

async function saveMeta(
  unlocked: Set<string>,
  stats: CumulativeStats,
  ads: PersistedAds,
  ftue: PersistedFtue,
) {
  const data: PersistedMeta = {
    unlockedSymbols: [...unlocked],
    cumulativeScore: stats.cumulativeScore,
    levelsWon: stats.levelsWon,
    fullRunsWon: stats.fullRunsWon,
    respinsBought: stats.respinsBought,
    uniqueSymbolsUsed: [...stats.uniqueSymbolsUsed],
    totalRuns: stats.totalRuns,
    furthestLevel: stats.furthestLevel,
    bestRunScore: stats.bestRunScore,
    removeAdsEntitled: ads.removeAdsEntitled,
    firstRunCompleted: ads.firstRunCompleted,
    hasTutorialBeenSeen: ftue.hasTutorialBeenSeen,
    hasSeenDraftIntro: ftue.hasSeenDraftIntro,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// =============================================================================
// META STORE
// =============================================================================

const BASE_SYMBOL_IDS: SymbolId[] = ['cherry', 'lemon', 'bar', 'bell', 'seven'];

export type ATTStatus = 'granted' | 'denied' | 'restricted' | 'not_determined' | 'unsupported';

export interface MetaState {
  loaded: boolean;
  unlockedSymbols: Set<string>;
  selectedLoadout: SymbolId[];
  cumulativeStats: CumulativeStats;
  currentRunStats: RunStats;
  pendingUnlock: SymbolId | null;
  unlockQueue: SymbolId[];

  // Ad-support state
  // Persisted:
  removeAdsEntitled: boolean;
  firstRunCompleted: boolean;
  // In-memory only (reset on cold start):
  adServiceReady: boolean;
  adServiceFailed: boolean;
  adServiceError: string | null;
  attStatus: ATTStatus;
  /** Timestamp of last interstitial show. Used for the 120s cooldown guardrail. */
  lastInterstitialAt: number;

  // FTUE state (persisted)
  hasTutorialBeenSeen: boolean;
  hasSeenDraftIntro: boolean;

  // Actions
  loadFromStorage: () => Promise<void>;
  selectSymbol: (id: SymbolId) => void;
  deselectSymbol: (id: SymbolId) => void;
  setLoadout: (ids: SymbolId[]) => void;
  getAvailableSymbols: () => SymbolDef[];
  getLockedSymbols: () => { def: SymbolDef; hint: string }[];
  getMaxSlots: () => number;

  // Run lifecycle
  startRun: () => void;
  startLevel: () => void;

  // Stat tracking (called during gameplay)
  recordMatchLength: (length: number) => void;
  recordCherryScore: (points: number) => void;
  recordBellMatch: () => void;
  recordLockedCellCount: (count: number) => void;
  recordFruitSalad: () => void;
  recordRespinBought: () => void;

  // End of run
  endRun: (finalScore: number, levelsWon: number, wonFullRun: boolean) => void;
  dismissUnlock: () => void;

  // Ad-support actions
  setAdServiceReady: (params: {
    attStatus: ATTStatus;
    removeAdsEntitled: boolean;
  }) => void;
  setAdServiceFailed: (error: string) => void;
  setRemoveAdsEntitled: (entitled: boolean) => void;
  markInterstitialShown: () => void;
  markFirstRunCompleted: () => void;

  // FTUE actions
  setTutorialSeen: () => void;
  resetTutorialSeen: () => void;       // for Settings → Replay Tutorial
  setDraftIntroSeen: () => void;
}

export const useMetaStore = create<MetaState>((set, get) => ({
  loaded: false,
  unlockedSymbols: new Set<string>(),
  selectedLoadout: [...BASE_SYMBOL_IDS],
  cumulativeStats: defaultCumulativeStats(),
  currentRunStats: emptyRunStats(),
  pendingUnlock: null,
  unlockQueue: [],

  // Ad-support — persisted (overwritten by loadFromStorage)
  removeAdsEntitled: false,
  firstRunCompleted: false,
  // Ad-support — in-memory
  adServiceReady: false,
  adServiceFailed: false,
  adServiceError: null,
  attStatus: 'not_determined' as ATTStatus,
  lastInterstitialAt: 0,

  // FTUE — persisted (overwritten by loadFromStorage)
  hasTutorialBeenSeen: false,
  hasSeenDraftIntro: false,

  loadFromStorage: async () => {
    const { unlocked, stats, ads, ftue } = await loadMeta();
    set({
      loaded: true,
      unlockedSymbols: unlocked,
      cumulativeStats: stats,
      removeAdsEntitled: ads.removeAdsEntitled,
      firstRunCompleted: ads.firstRunCompleted,
      hasTutorialBeenSeen: ftue.hasTutorialBeenSeen,
      hasSeenDraftIntro: ftue.hasSeenDraftIntro,
    });
  },

  selectSymbol: (id: SymbolId) => {
    const { selectedLoadout } = get();
    const maxSlots = get().getMaxSlots();
    if (selectedLoadout.length >= maxSlots) return;
    if (selectedLoadout.includes(id)) return;
    set({ selectedLoadout: [...selectedLoadout, id] });
  },

  deselectSymbol: (id: SymbolId) => {
    const { selectedLoadout } = get();
    set({ selectedLoadout: selectedLoadout.filter(s => s !== id) });
  },

  setLoadout: (ids: SymbolId[]) => {
    set({ selectedLoadout: ids });
  },

  getAvailableSymbols: () => {
    const { unlockedSymbols } = get();
    return SYMBOL_ROSTER.filter(s =>
      s.id !== 'wall' && (s.base || unlockedSymbols.has(s.id))
    );
  },

  getLockedSymbols: () => {
    const { unlockedSymbols } = get();
    return UNLOCK_CONDITIONS
      .filter(c => !c.symbolId.startsWith('wall') && !unlockedSymbols.has(c.symbolId))
      .map(c => {
        const def = SYMBOL_ROSTER.find(s => s.id === c.symbolId)!;
        return { def, hint: c.hint };
      })
      .filter(x => x.def && !x.def.base);
  },

  getMaxSlots: () => {
    const { selectedLoadout, unlockedSymbols } = get();
    // Check if crown is in the loadout (not just unlocked)
    const hasCrown = selectedLoadout.includes('crown');
    return hasCrown ? 7 : 5;
  },

  startRun: () => {
    // Tutorial runs (Level 0) don't reset per-run stats or record symbols
    // used — they're meta-progression-neutral.
    try {
      const runStore = require('./store').useRunStore;
      if (runStore?.getState?.().currentLevel === 0) return;
    } catch { /* fail open */ }

    const { selectedLoadout, cumulativeStats } = get();
    // Record symbols used
    const newUsed = new Set(cumulativeStats.uniqueSymbolsUsed);
    selectedLoadout.forEach(id => newUsed.add(id));
    set({
      currentRunStats: emptyRunStats(),
      cumulativeStats: { ...cumulativeStats, uniqueSymbolsUsed: newUsed },
    });
  },

  startLevel: () => {
    // Reset per-level stats
    const { currentRunStats } = get();
    set({
      currentRunStats: {
        ...currentRunStats,
        bellMatchesThisLevel: 0,
        maxLockedCellsThisLevel: 0,
      },
    });
  },

  recordMatchLength: (length: number) => {
    const { currentRunStats } = get();
    if (length > currentRunStats.maxMatchLength) {
      set({ currentRunStats: { ...currentRunStats, maxMatchLength: length } });
    }
  },

  recordCherryScore: (points: number) => {
    const { currentRunStats } = get();
    set({
      currentRunStats: {
        ...currentRunStats,
        cherryScoreThisRun: currentRunStats.cherryScoreThisRun + points,
      },
    });
  },

  recordBellMatch: () => {
    const { currentRunStats } = get();
    set({
      currentRunStats: {
        ...currentRunStats,
        bellMatchesThisLevel: currentRunStats.bellMatchesThisLevel + 1,
      },
    });
  },

  recordLockedCellCount: (count: number) => {
    const { currentRunStats } = get();
    if (count > currentRunStats.maxLockedCellsThisLevel) {
      set({
        currentRunStats: {
          ...currentRunStats,
          maxLockedCellsThisLevel: count,
        },
      });
    }
  },

  recordFruitSalad: () => {
    const { currentRunStats } = get();
    set({
      currentRunStats: {
        ...currentRunStats,
        fruitSaladsThisRun: currentRunStats.fruitSaladsThisRun + 1,
      },
    });
  },

  recordRespinBought: () => {
    const { currentRunStats } = get();
    set({
      currentRunStats: {
        ...currentRunStats,
        respinsBoughtThisRun: currentRunStats.respinsBoughtThisRun + 1,
      },
    });
  },

  endRun: (finalScore: number, levelsWon: number, wonFullRun: boolean) => {
    // Tutorial completion does NOT bump cumulative stats or trigger unlock
    // checks — Level 0 is meta-progression-neutral. Caller (typically
    // GameOverScreen) is also gated, but defending here for safety.
    try {
      const runStore = require('./store').useRunStore;
      if (runStore?.getState?.().currentLevel === 0) return;
    } catch { /* fail open */ }

    const { cumulativeStats, currentRunStats, unlockedSymbols } = get();

    // Update run stats for final checks
    const runStats: RunStats = {
      ...currentRunStats,
      scoreThisRun: finalScore,
      wonFullRunWithoutBuyingRespins: wonFullRun && currentRunStats.respinsBoughtThisRun === 0,
    };

    // Update cumulative stats.
    // Note: `levelsWon` param from the caller is actually "currentLevel at end
    // of run" (level reached), not number-of-levels-won-this-run. Kept the
    // param name for back-compat.
    const newStats: CumulativeStats = {
      cumulativeScore: cumulativeStats.cumulativeScore + finalScore,
      levelsWon: cumulativeStats.levelsWon + levelsWon,
      fullRunsWon: cumulativeStats.fullRunsWon + (wonFullRun ? 1 : 0),
      respinsBought: cumulativeStats.respinsBought + currentRunStats.respinsBoughtThisRun,
      uniqueSymbolsUsed: cumulativeStats.uniqueSymbolsUsed,
      totalRuns: cumulativeStats.totalRuns + 1,
      furthestLevel: Math.max(cumulativeStats.furthestLevel, levelsWon),
      bestRunScore: Math.max(cumulativeStats.bestRunScore, finalScore),
    };

    // Check unlock conditions (max 1 per run)
    const newUnlocked = new Set(unlockedSymbols);
    const queue: SymbolId[] = [];

    for (const condition of UNLOCK_CONDITIONS) {
      if (newUnlocked.has(condition.symbolId)) continue;
      // Check with base symbols (always available)
      const def = SYMBOL_ROSTER.find(s => s.id === condition.symbolId);
      if (!def || def.base) continue;

      if (condition.check(newStats, runStats)) {
        queue.push(condition.symbolId);
      }
    }

    // Only unlock the first eligible (1 per run policy)
    const pendingUnlock = queue.length > 0 ? queue[0] : null;
    if (pendingUnlock) {
      newUnlocked.add(pendingUnlock);
    }

    set({
      cumulativeStats: newStats,
      unlockedSymbols: newUnlocked,
      pendingUnlock,
      unlockQueue: queue.slice(1), // remaining queue for future runs
    });

    // Persist
    saveMeta(
      newUnlocked,
      newStats,
      {
        removeAdsEntitled: get().removeAdsEntitled,
        firstRunCompleted: get().firstRunCompleted,
      },
      {
        hasTutorialBeenSeen: get().hasTutorialBeenSeen,
        hasSeenDraftIntro: get().hasSeenDraftIntro,
      },
    );
  },

  dismissUnlock: () => {
    set({ pendingUnlock: null });
  },

  // ==========================================================================
  // Ad-support actions
  // ==========================================================================

  setAdServiceReady: ({ attStatus, removeAdsEntitled }) => {
    set({
      adServiceReady: true,
      adServiceFailed: false,
      adServiceError: null,
      attStatus,
      removeAdsEntitled,
    });
    // Persist the entitlement value the cold-start auto-restore returned
    const { unlockedSymbols, cumulativeStats, firstRunCompleted, hasTutorialBeenSeen, hasSeenDraftIntro } = get();
    saveMeta(
      unlockedSymbols,
      cumulativeStats,
      { removeAdsEntitled, firstRunCompleted },
      { hasTutorialBeenSeen, hasSeenDraftIntro },
    );
  },

  setAdServiceFailed: (error: string) => {
    set({
      adServiceReady: false,
      adServiceFailed: true,
      adServiceError: error,
    });
  },

  setRemoveAdsEntitled: (entitled: boolean) => {
    set({ removeAdsEntitled: entitled });
    const { unlockedSymbols, cumulativeStats, firstRunCompleted, hasTutorialBeenSeen, hasSeenDraftIntro } = get();
    saveMeta(
      unlockedSymbols,
      cumulativeStats,
      { removeAdsEntitled: entitled, firstRunCompleted },
      { hasTutorialBeenSeen, hasSeenDraftIntro },
    );
  },

  markInterstitialShown: () => {
    set({ lastInterstitialAt: Date.now() });
  },

  markFirstRunCompleted: () => {
    // Tutorial completion does NOT trip first-run-completed — Level 0 isn't
    // a real run for the interstitial first-run guardrail. Lazy-require the
    // run store to avoid a circular import (store.ts already lazy-requires
    // this module).
    try {
      const runStore = require('./store').useRunStore;
      if (runStore?.getState?.().currentLevel === 0) return;
    } catch {
      // If the lazy require fails, treat as non-tutorial (fail open).
    }
    if (get().firstRunCompleted) return; // idempotent
    set({ firstRunCompleted: true });
    const { unlockedSymbols, cumulativeStats, removeAdsEntitled, hasTutorialBeenSeen, hasSeenDraftIntro } = get();
    saveMeta(
      unlockedSymbols,
      cumulativeStats,
      { removeAdsEntitled, firstRunCompleted: true },
      { hasTutorialBeenSeen, hasSeenDraftIntro },
    );
  },

  // ==========================================================================
  // FTUE actions
  // ==========================================================================

  setTutorialSeen: () => {
    if (get().hasTutorialBeenSeen) return; // idempotent
    set({ hasTutorialBeenSeen: true });
    const { unlockedSymbols, cumulativeStats, removeAdsEntitled, firstRunCompleted, hasSeenDraftIntro } = get();
    saveMeta(
      unlockedSymbols,
      cumulativeStats,
      { removeAdsEntitled, firstRunCompleted },
      { hasTutorialBeenSeen: true, hasSeenDraftIntro },
    );
  },

  resetTutorialSeen: () => {
    // Settings → Replay Tutorial path. Allows the player to redo Level 0
    // without nuking other progress. Tutorial replays do NOT bump totalRuns
    // or any cumulative stats — that gating happens via isTutorialRun() in
    // the run lifecycle paths.
    set({ hasTutorialBeenSeen: false });
    const { unlockedSymbols, cumulativeStats, removeAdsEntitled, firstRunCompleted, hasSeenDraftIntro } = get();
    saveMeta(
      unlockedSymbols,
      cumulativeStats,
      { removeAdsEntitled, firstRunCompleted },
      { hasTutorialBeenSeen: false, hasSeenDraftIntro },
    );
  },

  setDraftIntroSeen: () => {
    if (get().hasSeenDraftIntro) return; // idempotent
    set({ hasSeenDraftIntro: true });
    const { unlockedSymbols, cumulativeStats, removeAdsEntitled, firstRunCompleted, hasTutorialBeenSeen } = get();
    saveMeta(
      unlockedSymbols,
      cumulativeStats,
      { removeAdsEntitled, firstRunCompleted },
      { hasTutorialBeenSeen, hasSeenDraftIntro: true },
    );
  },
}));
