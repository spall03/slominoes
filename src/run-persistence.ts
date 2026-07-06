import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import {
  useGameStore,
  useRunStore,
  type GameState,
  type RunState,
} from './store';
import {
  SYMBOL_ROSTER,
  buildFrequencyTable,
  type SymbolDef,
  type SymbolId,
} from './symbols';
import {
  useMetaStore,
  type CumulativeStats,
  type RunStats,
} from './meta-store';
import type {
  EntrySpot,
  GamePhase,
  GameResult,
  Grid,
  LevelConfig,
  PlacementMode,
  Rotation,
  RunPhase,
  ScorePopup,
  SpinCellInfo,
  Tile,
} from './types';

const STORAGE_KEY = 'slominoes_active_run_v1';
const SNAPSHOT_VERSION = 1;

interface PersistedGame {
  levelConfig: LevelConfig;
  grid: Grid;
  tileQueue: Tile[];
  currentTile: Tile | null;
  rotation: Rotation;
  respinsRemaining: number;
  score: number;
  scoreBank?: number;
  currentGridScore: number;
  phase: GamePhase;
  result: GameResult;
  placementMode: PlacementMode;
  placedPosition: { row: number; col: number } | null;
  holdReady: boolean;
  entrySpots: EntrySpot[];
  selectedEntry: number | null;
  reachableCells: string[] | null;
  lockedCells: string[];
  respinsBought: number;
  respinsUsed: number;
  spinningCells: Array<[string, SpinCellInfo]>;
  pendingSpinGrid: Grid | null;
  pendingSpinScore: number;
  pendingSpinAnimState: PersistedSpinAnimState | null;
  pendingSpinNewMatchMaxLength: number;
  pendingSpinTriggeredMatchKeys: string[];
}

interface PersistedSpinAnimState {
  matchingCells?: string[];
  highlightColor?: 'gold' | 'red' | 'blue';
  scorePopups?: ScorePopup[];
}

interface PersistedRun {
  runPhase: RunPhase;
  currentLevel: number;
  levelScore: number;
  levelConfig: LevelConfig | null;
  bonusRespins: number;
  respinAdUsedThisRun: boolean;
  continuesUsedThisRun: number;
  sawInterstitialThisRun: boolean;
  runStartTime: number;
  totalRespinsUsed: number;
  runEndReason: 'won' | 'lost' | 'abandoned' | null;
  runFinalized: boolean;
  runAnalyticsLogged: boolean;
  skipInterstitialThisRun: boolean;
  interstitialEligibleThisRun: boolean;
}

interface PersistedCumulativeStats extends Omit<CumulativeStats, 'uniqueSymbolsUsed'> {
  uniqueSymbolsUsed: string[];
}

interface PersistedMetaRun {
  currentRunStats: RunStats;
  cumulativeStats: PersistedCumulativeStats;
}

interface PersistedRunSnapshot {
  version: number;
  savedAt: number;
  selectedLoadout: SymbolId[];
  loadoutIds: SymbolId[];
  meta: PersistedMetaRun;
  run: PersistedRun;
  game: PersistedGame | null;
}

let installed = false;
let appStateSubscription: { remove: () => void } | null = null;
let storeSubscriptions: Array<() => void> = [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized: string | null = null;
let hydrating = false;

function defsFromIds(ids: string[]): SymbolDef[] {
  return ids
    .map(id => SYMBOL_ROSTER.find(s => s.id === id))
    .filter(Boolean) as SymbolDef[];
}

function getVineSymbols(loadoutDefs: SymbolDef[] | null): Set<string> | undefined {
  if (!loadoutDefs) return undefined;
  const vines = new Set<string>();
  for (const def of loadoutDefs) {
    if (def.abilities.some(a => a.trigger === 'on_place' && a.verb === 'place_on_wall')) {
      vines.add(def.id);
    }
  }
  return vines.size > 0 ? vines : undefined;
}

function serializeRun(run: RunState): PersistedRun {
  return {
    runPhase: run.runPhase,
    currentLevel: run.currentLevel,
    levelScore: run.levelScore,
    levelConfig: run.levelConfig,
    bonusRespins: run.bonusRespins,
    respinAdUsedThisRun: run.respinAdUsedThisRun,
    continuesUsedThisRun: run.continuesUsedThisRun,
    sawInterstitialThisRun: run.sawInterstitialThisRun,
    runStartTime: run.runStartTime,
    totalRespinsUsed: run.totalRespinsUsed,
    runEndReason: run.runEndReason,
    runFinalized: run.runFinalized,
    runAnalyticsLogged: run.runAnalyticsLogged,
    skipInterstitialThisRun: run.skipInterstitialThisRun,
    interstitialEligibleThisRun: run.interstitialEligibleThisRun,
  };
}

function serializeCumulativeStats(stats: CumulativeStats): PersistedCumulativeStats {
  return {
    ...stats,
    uniqueSymbolsUsed: [...stats.uniqueSymbolsUsed],
  };
}

function deserializeCumulativeStats(
  stats: PersistedCumulativeStats | undefined,
  fallback: CumulativeStats,
): CumulativeStats {
  if (!stats) return fallback;
  return {
    ...stats,
    uniqueSymbolsUsed: new Set(stats.uniqueSymbolsUsed),
  };
}

function serializeSpinAnimState(state: Partial<GameState> | null): PersistedSpinAnimState | null {
  if (!state) return null;
  return {
    matchingCells: state.matchingCells ? [...state.matchingCells] : undefined,
    highlightColor: state.highlightColor,
    scorePopups: state.scorePopups,
  };
}

function deserializeSpinAnimState(state: PersistedSpinAnimState | null): Partial<GameState> | null {
  if (!state) return null;
  return {
    ...(state.matchingCells ? { matchingCells: new Set(state.matchingCells) } : {}),
    ...(state.highlightColor ? { highlightColor: state.highlightColor } : {}),
    ...(state.scorePopups ? { scorePopups: state.scorePopups } : {}),
  };
}

function serializeGame(game: GameState): PersistedGame {
  return {
    levelConfig: game.levelConfig,
    grid: game.grid,
    tileQueue: game.tileQueue,
    currentTile: game.currentTile,
    rotation: game.rotation,
    respinsRemaining: game.respinsRemaining,
    score: game.score,
    scoreBank: game.scoreBank,
    currentGridScore: game.currentGridScore,
    phase: game.phase,
    result: game.result,
    placementMode: game.placementMode,
    placedPosition: game.placedPosition,
    holdReady: game.holdReady,
    entrySpots: game.entrySpots,
    selectedEntry: game.selectedEntry,
    reachableCells: game.reachableCells ? [...game.reachableCells] : null,
    lockedCells: [...game.lockedCells],
    respinsBought: game.respinsBought,
    respinsUsed: game.respinsUsed,
    spinningCells: [...game.spinningCells],
    pendingSpinGrid: game.pendingSpinGrid,
    pendingSpinScore: game.pendingSpinScore,
    pendingSpinAnimState: serializeSpinAnimState(game.pendingSpinAnimState),
    pendingSpinNewMatchMaxLength: game.pendingSpinNewMatchMaxLength,
    pendingSpinTriggeredMatchKeys: game.pendingSpinTriggeredMatchKeys,
  };
}

function createSnapshot(): PersistedRunSnapshot | null {
  const run = useRunStore.getState();
  if (run.runPhase === 'title') return null;

  const game = useGameStore.getState();
  const meta = useMetaStore.getState();
  const loadoutIds = (game.loadoutDefs?.map(s => s.id) ?? meta.selectedLoadout) as SymbolId[];

  return {
    version: SNAPSHOT_VERSION,
    savedAt: Date.now(),
    selectedLoadout: meta.selectedLoadout,
    loadoutIds,
    meta: {
      currentRunStats: meta.currentRunStats,
      cumulativeStats: serializeCumulativeStats(meta.cumulativeStats),
    },
    run: serializeRun(run),
    game: run.runPhase === 'draft' ? null : serializeGame(game),
  };
}

async function writeSnapshot(snapshot: PersistedRunSnapshot | null) {
  if (!snapshot) {
    lastSerialized = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  const serialized = JSON.stringify(snapshot);
  if (serialized === lastSerialized) return;
  lastSerialized = serialized;
  await AsyncStorage.setItem(STORAGE_KEY, serialized);
}

export async function persistRunSnapshotNow() {
  if (hydrating) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await writeSnapshot(createSnapshot());
}

function schedulePersist() {
  if (hydrating) return;
  if (useRunStore.getState().runPhase === 'title') {
    persistRunSnapshotNow().catch(() => {});
    return;
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistRunSnapshotNow().catch(() => {});
  }, 250);
}

export async function restoreRunSnapshot(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  let snapshot: PersistedRunSnapshot;
  try {
    snapshot = JSON.parse(raw) as PersistedRunSnapshot;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return false;
  }

  if (snapshot.version !== SNAPSHOT_VERSION || !snapshot.run) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return false;
  }

  hydrating = true;
  try {
    if (snapshot.selectedLoadout?.length) {
      useMetaStore.getState().setLoadout(snapshot.selectedLoadout);
    }
    if (snapshot.meta) {
      const currentMeta = useMetaStore.getState();
      useMetaStore.setState({
        currentRunStats: snapshot.meta.currentRunStats ?? currentMeta.currentRunStats,
        cumulativeStats: deserializeCumulativeStats(
          snapshot.meta.cumulativeStats,
          currentMeta.cumulativeStats,
        ),
      });
    }

    const loadoutDefs = defsFromIds(snapshot.loadoutIds ?? snapshot.selectedLoadout ?? []);
    const loadoutFreqs = loadoutDefs.length > 0 ? buildFrequencyTable(loadoutDefs) : null;

    if (snapshot.game) {
      useGameStore.setState({
        ...snapshot.game,
        reachableCells: snapshot.game.reachableCells
          ? new Set(snapshot.game.reachableCells)
          : null,
        lockedCells: new Set(snapshot.game.lockedCells),
        matchingCells: new Set(),
        highlightColor: 'gold',
        scorePopups: [],
        spinningCells: new Map(snapshot.game.spinningCells ?? []),
        scoreBank: snapshot.game.scoreBank ?? snapshot.game.score ?? 0,
        pendingSpinGrid: snapshot.game.pendingSpinGrid ?? null,
        pendingSpinScore: snapshot.game.pendingSpinScore ?? 0,
        pendingSpinAnimState: deserializeSpinAnimState(snapshot.game.pendingSpinAnimState ?? null),
        pendingSpinNewMatchMaxLength: snapshot.game.pendingSpinNewMatchMaxLength ?? 0,
        pendingSpinTriggeredMatchKeys: snapshot.game.pendingSpinTriggeredMatchKeys ?? [],
        loadoutFreqs,
        loadoutDefs,
        vineSymbols: getVineSymbols(loadoutDefs),
        respinTarget: null,
      });
    } else if (loadoutDefs.length > 0) {
      useGameStore.setState({
        loadoutFreqs,
        loadoutDefs,
        vineSymbols: getVineSymbols(loadoutDefs),
      });
    }

    useRunStore.setState(snapshot.run);
    lastSerialized = JSON.stringify(snapshot);
    return true;
  } finally {
    hydrating = false;
  }
}

function handleAppStateChange(nextState: AppStateStatus) {
  if (nextState === 'inactive' || nextState === 'background') {
    persistRunSnapshotNow().catch(() => {});
  }
}

export function installRunPersistence() {
  if (installed) return;
  installed = true;
  storeSubscriptions = [
    useRunStore.subscribe(schedulePersist),
    useGameStore.subscribe(schedulePersist),
    useMetaStore.subscribe(schedulePersist),
  ];
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  schedulePersist();
}

export function uninstallRunPersistenceForTests() {
  for (const unsubscribe of storeSubscriptions) unsubscribe();
  storeSubscriptions = [];
  appStateSubscription?.remove();
  appStateSubscription = null;
  installed = false;
}
