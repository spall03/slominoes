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
}

async function loadMeta(): Promise<{ unlocked: Set<string>; stats: CumulativeStats }> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: new Set(), stats: defaultCumulativeStats() };
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
      },
    };
  } catch {
    return { unlocked: new Set(), stats: defaultCumulativeStats() };
  }
}

async function saveMeta(unlocked: Set<string>, stats: CumulativeStats) {
  const data: PersistedMeta = {
    unlockedSymbols: [...unlocked],
    cumulativeScore: stats.cumulativeScore,
    levelsWon: stats.levelsWon,
    fullRunsWon: stats.fullRunsWon,
    respinsBought: stats.respinsBought,
    uniqueSymbolsUsed: [...stats.uniqueSymbolsUsed],
    totalRuns: stats.totalRuns,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// =============================================================================
// META STORE
// =============================================================================

const BASE_SYMBOL_IDS: SymbolId[] = ['cherry', 'lemon', 'bar', 'bell', 'seven'];

export interface MetaState {
  loaded: boolean;
  unlockedSymbols: Set<string>;
  selectedLoadout: SymbolId[];
  cumulativeStats: CumulativeStats;
  currentRunStats: RunStats;
  pendingUnlock: SymbolId | null;
  unlockQueue: SymbolId[];

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
}

export const useMetaStore = create<MetaState>((set, get) => ({
  loaded: false,
  unlockedSymbols: new Set<string>(),
  selectedLoadout: [...BASE_SYMBOL_IDS],
  cumulativeStats: defaultCumulativeStats(),
  currentRunStats: emptyRunStats(),
  pendingUnlock: null,
  unlockQueue: [],

  loadFromStorage: async () => {
    const { unlocked, stats } = await loadMeta();
    set({ loaded: true, unlockedSymbols: unlocked, cumulativeStats: stats });
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
    const { cumulativeStats, currentRunStats, unlockedSymbols } = get();

    // Update run stats for final checks
    const runStats: RunStats = {
      ...currentRunStats,
      scoreThisRun: finalScore,
      wonFullRunWithoutBuyingRespins: wonFullRun && currentRunStats.respinsBoughtThisRun === 0,
    };

    // Update cumulative stats
    const newStats: CumulativeStats = {
      cumulativeScore: cumulativeStats.cumulativeScore + finalScore,
      levelsWon: cumulativeStats.levelsWon + levelsWon,
      fullRunsWon: cumulativeStats.fullRunsWon + (wonFullRun ? 1 : 0),
      respinsBought: cumulativeStats.respinsBought + currentRunStats.respinsBoughtThisRun,
      uniqueSymbolsUsed: cumulativeStats.uniqueSymbolsUsed,
      totalRuns: cumulativeStats.totalRuns + 1,
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
    saveMeta(newUnlocked, newStats);
  },

  dismissUnlock: () => {
    set({ pendingUnlock: null });
  },
}));
