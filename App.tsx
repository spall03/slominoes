import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { create } from 'zustand';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// =============================================================================
// CONSTANTS
// =============================================================================

const BOARD_SIZE = 8;
const TILES_PER_LEVEL = 15;
const RESPINS_PER_LEVEL = 5;
const WIN_THRESHOLD = 3000;
const MIN_MATCH_LENGTH = 3;

const LENGTH_MULTIPLIERS: Record<number, number> = { 3: 1, 4: 2, 5: 3 };
const MAX_LENGTH_MULTIPLIER = 4;

function getLengthMultiplier(length: number): number {
  if (length < MIN_MATCH_LENGTH) return 0;
  if (length >= 6) return MAX_LENGTH_MULTIPLIER;
  return LENGTH_MULTIPLIERS[length] ?? MAX_LENGTH_MULTIPLIER;
}

// =============================================================================
// SYMBOLS
// =============================================================================

type Symbol = 'cherry' | 'lemon' | 'bar' | 'bell' | 'seven';

const SYMBOLS: Symbol[] = ['cherry', 'lemon', 'bar', 'bell', 'seven'];

const SYMBOL_VALUES: Record<Symbol, number> = {
  cherry: 10,
  lemon: 20,
  bar: 40,
  bell: 80,
  seven: 150,
};

const SYMBOL_DISPLAY: Record<Symbol, string> = {
  cherry: '🍒',
  lemon: '🍋',
  bar: '🎰',
  bell: '🔔',
  seven: '7️⃣',
};

function getRandomSymbol(): Symbol {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

// =============================================================================
// TILES
// =============================================================================

interface Tile {
  id: string;
  symbolA: Symbol;
  symbolB: Symbol;
}

function generateTile(id: string): Tile {
  return { id, symbolA: getRandomSymbol(), symbolB: getRandomSymbol() };
}

function generateTileQueue(): Tile[] {
  return Array.from({ length: TILES_PER_LEVEL }, (_, i) => generateTile(`tile-${i}`));
}

// =============================================================================
// GRID UTILITIES
// =============================================================================

type Grid = (Symbol | null)[][];

function createEmptyGrid(): Grid {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

// =============================================================================
// ROTATION UTILITIES
// =============================================================================

// Rotation: 0 = right (→), 1 = down (↓), 2 = left (←), 3 = up (↑)
type Rotation = 0 | 1 | 2 | 3;

// Get the offset for the second cell based on rotation
function getSecondCellOffset(rotation: Rotation): [number, number] {
  switch (rotation) {
    case 0: return [0, 1];   // right
    case 1: return [1, 0];   // down
    case 2: return [0, -1];  // left
    case 3: return [-1, 0];  // up
  }
}

// Get symbols for placement - always returns [A, B], direction handled by offset
function getSymbolsForRotation(tile: Tile): [Symbol, Symbol] {
  return [tile.symbolA, tile.symbolB];
}

// =============================================================================
// SCORING
// =============================================================================

interface Match {
  cells: [number, number][];
  symbol: Symbol;
  length: number;
  score: number;
}

function findMatches(grid: Grid): Match[] {
  const matches: Match[] = [];

  // Horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    let col = 0;
    while (col < BOARD_SIZE) {
      const symbol = grid[row][col];
      if (symbol === null) { col++; continue; }

      let length = 1;
      while (col + length < BOARD_SIZE && grid[row][col + length] === symbol) {
        length++;
      }

      if (length >= MIN_MATCH_LENGTH) {
        const cells: [number, number][] = [];
        for (let i = 0; i < length; i++) cells.push([row, col + i]);
        const score = SYMBOL_VALUES[symbol] * length * getLengthMultiplier(length);
        matches.push({ cells, symbol, length, score });
      }
      col += length;
    }
  }

  // Vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    let row = 0;
    while (row < BOARD_SIZE) {
      const symbol = grid[row][col];
      if (symbol === null) { row++; continue; }

      let length = 1;
      while (row + length < BOARD_SIZE && grid[row + length][col] === symbol) {
        length++;
      }

      if (length >= MIN_MATCH_LENGTH) {
        const cells: [number, number][] = [];
        for (let i = 0; i < length; i++) cells.push([row + i, col]);
        const score = SYMBOL_VALUES[symbol] * length * getLengthMultiplier(length);
        matches.push({ cells, symbol, length, score });
      }
      row += length;
    }
  }

  return matches;
}

function calculateScore(grid: Grid): { score: number; matches: Match[] } {
  const matches = findMatches(grid);
  const score = matches.reduce((sum, m) => sum + m.score, 0);
  return { score, matches };
}

// =============================================================================
// GAME STATE (ZUSTAND)
// =============================================================================

type GamePhase = 'placing' | 'respinning' | 'ended';
type GameResult = 'win' | 'lose' | null;
type PlacementMode = 'idle' | 'placed';

interface ScorePopup {
  id: string;
  score: number;
  row: number;
  col: number;
}

interface GameState {
  grid: Grid;
  tileQueue: Tile[];
  currentTile: Tile | null;
  rotation: Rotation;
  respinsRemaining: number;
  score: number;
  scoreBeforeRespins: number;
  phase: GamePhase;
  result: GameResult;
  placementMode: PlacementMode;
  placedPosition: { row: number; col: number } | null;
  holdReady: boolean;
  matchingCells: Set<string>;
  scorePopups: ScorePopup[];

  startPlacement: (row: number, col: number) => void;
  movePlacement: (row: number, col: number) => void;
  rotatePlacedTile: () => void;
  confirmPlacement: () => void;
  cancelPlacement: () => void;
  setHoldReady: (ready: boolean) => void;
  triggerMatchAnimation: (matches: Match[], newCells: [number, number][]) => void;
  clearMatchAnimation: () => void;
  removeScorePopup: (id: string) => void;
  respinLine: (type: 'row' | 'col', index: number) => void;
  resetGame: () => void;
}

function canPlaceTile(
  grid: Grid,
  row: number,
  col: number,
  rotation: Rotation
): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
  if (grid[row][col] !== null) return false;

  const [rowOffset, colOffset] = getSecondCellOffset(rotation);
  const row2 = row + rowOffset;
  const col2 = col + colOffset;

  if (row2 < 0 || row2 >= BOARD_SIZE || col2 < 0 || col2 >= BOARD_SIZE) return false;
  if (grid[row2][col2] !== null) return false;

  return true;
}

function createInitialState() {
  const queue = generateTileQueue();
  return {
    grid: createEmptyGrid(),
    tileQueue: queue.slice(1),
    currentTile: queue[0] ?? null,
    rotation: 0 as Rotation,
    respinsRemaining: RESPINS_PER_LEVEL,
    score: 0,
    scoreBeforeRespins: 0,
    phase: 'placing' as GamePhase,
    result: null as GameResult,
    placementMode: 'idle' as PlacementMode,
    placedPosition: null as { row: number; col: number } | null,
    holdReady: false,
    matchingCells: new Set<string>(),
    scorePopups: [] as ScorePopup[],
  };
}

const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  startPlacement: (row: number, col: number) => {
    const { phase, currentTile, rotation, grid } = get();
    if (phase !== 'placing' || !currentTile) return;
    if (!canPlaceTile(grid, row, col, rotation)) return;

    set({
      placementMode: 'placed',
      placedPosition: { row, col },
    });
  },

  movePlacement: (row: number, col: number) => {
    const { phase, currentTile, rotation, grid, placementMode } = get();
    if (phase !== 'placing' || !currentTile || placementMode !== 'placed') return;
    if (!canPlaceTile(grid, row, col, rotation)) return;

    set({ placedPosition: { row, col } });
  },

  rotatePlacedTile: () => {
    const { placementMode, placedPosition, rotation, grid } = get();
    if (placementMode !== 'placed' || !placedPosition) return;

    // Try each rotation until we find a valid one
    for (let i = 1; i <= 4; i++) {
      const newRotation = ((rotation + i) % 4) as Rotation;
      if (canPlaceTile(grid, placedPosition.row, placedPosition.col, newRotation)) {
        set({ rotation: newRotation });
        return;
      }
    }
  },

  confirmPlacement: () => {
    const { phase, currentTile, rotation, grid, tileQueue, placementMode, placedPosition } = get();
    if (phase !== 'placing' || !currentTile || placementMode !== 'placed' || !placedPosition) return;

    const { row, col } = placedPosition;
    if (!canPlaceTile(grid, row, col, rotation)) return;

    const [rowOffset, colOffset] = getSecondCellOffset(rotation);
    const row2 = row + rowOffset;
    const col2 = col + colOffset;

    const [symbolFirst, symbolSecond] = getSymbolsForRotation(currentTile);

    const newGrid = cloneGrid(grid);
    newGrid[row][col] = symbolFirst;
    newGrid[row2][col2] = symbolSecond;

    const { score: newTotalScore, matches } = calculateScore(newGrid);

    const nextTile = tileQueue[0] ?? null;
    const newQueue = tileQueue.slice(1);
    const isComplete = nextTile === null;

    if (isComplete) {
      set({
        grid: newGrid,
        tileQueue: [],
        currentTile: null,
        score: newTotalScore,
        scoreBeforeRespins: newTotalScore,
        phase: 'respinning',
        placementMode: 'idle',
        placedPosition: null,
        holdReady: false,
      });
    } else {
      set({
        grid: newGrid,
        tileQueue: newQueue,
        currentTile: nextTile,
        score: newTotalScore,
        placementMode: 'idle',
        placedPosition: null,
        holdReady: false,
      });
    }

    // Trigger match animation for matches involving newly placed cells
    if (matches.length > 0) {
      const newCells: [number, number][] = [[row, col], [row2, col2]];
      get().triggerMatchAnimation(matches, newCells);
    }
  },

  cancelPlacement: () => {
    set({
      placementMode: 'idle',
      placedPosition: null,
      holdReady: false,
    });
  },

  setHoldReady: (ready: boolean) => {
    set({ holdReady: ready });
  },

  triggerMatchAnimation: (matches: Match[], newCells: [number, number][]) => {
    const matchingCells = new Set<string>();
    const scorePopups: ScorePopup[] = [];
    const newCellKeys = new Set(newCells.map(([r, c]) => `${r},${c}`));

    // Only animate matches that include at least one new cell
    const relevantMatches = matches.filter(match =>
      match.cells.some(([r, c]) => newCellKeys.has(`${r},${c}`))
    );

    relevantMatches.forEach((match, index) => {
      // Add all cells in matching combos to highlight set
      match.cells.forEach(([row, col]) => {
        matchingCells.add(`${row},${col}`);
      });

      // Create score popup at center of match
      const centerIndex = Math.floor(match.cells.length / 2);
      const [centerRow, centerCol] = match.cells[centerIndex];
      scorePopups.push({
        id: `popup-${Date.now()}-${index}`,
        score: match.score,
        row: centerRow,
        col: centerCol,
      });
    });

    if (matchingCells.size > 0) {
      set({ matchingCells, scorePopups });
    }
  },

  clearMatchAnimation: () => {
    set({ matchingCells: new Set<string>() });
  },

  removeScorePopup: (id: string) => {
    set(state => ({
      scorePopups: state.scorePopups.filter(p => p.id !== id),
    }));
  },

  respinLine: (type: 'row' | 'col', index: number) => {
    const { phase, respinsRemaining, grid, score } = get();
    if (phase !== 'respinning' || respinsRemaining <= 0) return;
    if (index < 0 || index >= BOARD_SIZE) return;

    const newGrid = cloneGrid(grid);
    const changedCells: [number, number][] = [];

    if (type === 'row') {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (newGrid[index][col] !== null) {
          newGrid[index][col] = getRandomSymbol();
          changedCells.push([index, col]);
        }
      }
    } else {
      for (let row = 0; row < BOARD_SIZE; row++) {
        if (newGrid[row][index] !== null) {
          newGrid[row][index] = getRandomSymbol();
          changedCells.push([row, index]);
        }
      }
    }

    const newRespins = respinsRemaining - 1;
    const { score: gridScore, matches } = calculateScore(newGrid);
    const newScore = Math.max(score, gridScore);

    if (newRespins === 0) {
      set({
        grid: newGrid,
        respinsRemaining: 0,
        score: newScore,
        phase: 'ended',
        result: newScore >= WIN_THRESHOLD ? 'win' : 'lose',
      });
    } else {
      set({
        grid: newGrid,
        respinsRemaining: newRespins,
        score: newScore,
      });
    }

    // Trigger match animation if score improved
    if (gridScore > score && matches.length > 0) {
      get().triggerMatchAnimation(matches, changedCells);
    }
  },

  resetGame: () => set(createInitialState()),
}));

// =============================================================================
// ANIMATED CELL COMPONENT
// =============================================================================

function AnimatedCell({
  symbol,
  isEmpty,
  isPreview,
  isPlaced,
  isHoldReady,
  isMatching,
  previewSymbol,
  onMatchAnimationComplete,
}: {
  symbol: Symbol | null;
  isEmpty: boolean;
  isPreview?: boolean;
  isPlaced?: boolean;
  isHoldReady?: boolean;
  isMatching?: boolean;
  previewSymbol?: Symbol;
  onMatchAnimationComplete?: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const prevSymbol = useRef(symbol);
  const onCompleteRef = useRef(onMatchAnimationComplete);
  onCompleteRef.current = onMatchAnimationComplete;

  useEffect(() => {
    if (symbol !== prevSymbol.current) {
      prevSymbol.current = symbol;
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [symbol, scaleAnim]);

  // Blink animation when matching - runs once on mount if isMatching is true
  useEffect(() => {
    if (isMatching) {
      // Blink 3 times using opacity
      Animated.sequence([
        Animated.timing(highlightOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(highlightOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start(() => {
        onCompleteRef.current?.();
      });
    }
    // Only run on mount - component is re-keyed for each animation trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displaySymbol = isPreview ? previewSymbol : symbol;

  return (
    <Animated.View
      style={[
        styles.cell,
        !isEmpty && !isPreview && styles.filledCell,
        isPreview && !isPlaced && styles.previewCell,
        isPreview && isPlaced && !isHoldReady && styles.placedCell,
        isPreview && isPlaced && isHoldReady && styles.holdReadyCell,
        { transform: [{ scale: scaleAnim }], overflow: 'hidden' },
      ]}
    >
      {/* Yellow highlight overlay */}
      <Animated.View
        style={[
          styles.highlightOverlay,
          { opacity: highlightOpacity },
        ]}
        pointerEvents="none"
      />
      <Text style={[styles.cellText, styles.cellTextAbove, isPreview && !isPlaced && styles.previewCellText]}>
        {displaySymbol ? SYMBOL_DISPLAY[displaySymbol] : ''}
      </Text>
    </Animated.View>
  );
}

// =============================================================================
// SCORE POPUP COMPONENT
// =============================================================================

function ScorePopup({
  score,
  row,
  col,
  onComplete,
}: {
  score: number;
  row: number;
  col: number;
  onComplete: () => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onCompleteRef.current();
    });
  }, [translateY, opacity]);

  // Position based on cell location (constants defined below)
  const cellTotal = 40 + 1 * 2; // CELL_SIZE + CELL_MARGIN * 2
  const gridPadding = 4;
  const left = gridPadding + col * cellTotal + 20;
  const top = gridPadding + row * cellTotal;

  return (
    <Animated.View
      style={[
        styles.scorePopup,
        {
          left,
          top,
          transform: [{ translateY }, { translateX: -20 }],
          opacity,
        },
      ]}
    >
      <Text style={styles.scorePopupText}>+{score}</Text>
    </Animated.View>
  );
}

// =============================================================================
// GESTURE GRID COMPONENT
// =============================================================================

const CELL_SIZE = 40;
const CELL_MARGIN = 1;
const CELL_TOTAL = CELL_SIZE + CELL_MARGIN * 2;
const GRID_PADDING = 4;

function GestureGrid() {
  const {
    grid,
    currentTile,
    rotation,
    phase,
    placementMode,
    placedPosition,
    holdReady,
    matchingCells,
    scorePopups,
    startPlacement,
    movePlacement,
    rotatePlacedTile,
    confirmPlacement,
    cancelPlacement,
    setHoldReady,
    clearMatchAnimation,
    removeScorePopup,
  } = useGameStore();

  const [animationKey, setAnimationKey] = useState(0);

  // Keyboard controls (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const findFirstValidCell = (grid: Grid, rotation: Rotation): { row: number; col: number } | null => {
      // Start from center, spiral outward
      const center = Math.floor(BOARD_SIZE / 2);
      for (let dist = 0; dist < BOARD_SIZE; dist++) {
        for (let row = center - dist; row <= center + dist; row++) {
          for (let col = center - dist; col <= center + dist; col++) {
            if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) continue;
            if (canPlaceTile(grid, row, col, rotation)) return { row, col };
          }
        }
      }
      return null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.phase !== 'placing' || !state.currentTile) return;

      // Idle mode: Enter/Space places tile at first valid cell
      if (state.placementMode === 'idle') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const cell = findFirstValidCell(state.grid, state.rotation);
          if (cell) state.startPlacement(cell.row, cell.col);
        }
        return;
      }

      // Placed mode
      if (!state.placedPosition) return;
      const { row, col } = state.placedPosition;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (canPlaceTile(state.grid, row - 1, col, state.rotation)) {
            state.movePlacement(row - 1, col);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (canPlaceTile(state.grid, row + 1, col, state.rotation)) {
            state.movePlacement(row + 1, col);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (canPlaceTile(state.grid, row, col - 1, state.rotation)) {
            state.movePlacement(row, col - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (canPlaceTile(state.grid, row, col + 1, state.rotation)) {
            state.movePlacement(row, col + 1);
          }
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          state.rotatePlacedTile();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          state.confirmPlacement();
          break;
        case 'Escape':
          e.preventDefault();
          state.cancelPlacement();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  const animatingCellsRef = useRef(new Set<string>());

  const handleMatchAnimationComplete = useCallback((cellKey: string) => {
    animatingCellsRef.current.delete(cellKey);
    if (animatingCellsRef.current.size === 0) {
      clearMatchAnimation();
    }
  }, [clearMatchAnimation]);

  // Track animating cells when matchingCells changes
  useEffect(() => {
    if (matchingCells.size > 0) {
      animatingCellsRef.current = new Set(matchingCells);
      setAnimationKey(k => k + 1);
    }
  }, [matchingCells]);

  const getCellFromPosition = useCallback((x: number, y: number) => {
    const col = Math.floor((x - GRID_PADDING) / CELL_TOTAL);
    const row = Math.floor((y - GRID_PADDING) / CELL_TOTAL);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      return { row, col };
    }
    return null;
  }, []);

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      if (phase !== 'placing' || !currentTile) return;

      const cell = getCellFromPosition(event.x, event.y);
      if (!cell) return;

      if (placementMode === 'idle') {
        // First tap - place tile
        if (canPlaceTile(grid, cell.row, cell.col, rotation)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          startPlacement(cell.row, cell.col);
        }
      } else if (placementMode === 'placed') {
        // Tap while placed - rotate
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        rotatePlacedTile();
      }
    });

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      if (phase !== 'placing' || placementMode !== 'placed') return;

      const cell = getCellFromPosition(event.x, event.y);
      if (cell && canPlaceTile(grid, cell.row, cell.col, rotation)) {
        if (!placedPosition || placedPosition.row !== cell.row || placedPosition.col !== cell.col) {
          Haptics.selectionAsync();
          movePlacement(cell.row, cell.col);
        }
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      if (phase === 'placing' && placementMode === 'placed') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setHoldReady(true);
      }
    })
    .onEnd((event, success) => {
      if (success && phase === 'placing' && placementMode === 'placed') {
        confirmPlacement();
      }
      setHoldReady(false);
    })
    .onFinalize(() => {
      setHoldReady(false);
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, panGesture, tapGesture);

  const getPreviewInfo = (row: number, col: number): { isPreview: boolean; previewSymbol?: Symbol } => {
    if (!placedPosition || !currentTile || phase !== 'placing' || placementMode !== 'placed') {
      return { isPreview: false };
    }

    const [rowOffset, colOffset] = getSecondCellOffset(rotation);
    const [symbolFirst, symbolSecond] = getSymbolsForRotation(currentTile);

    if (row === placedPosition.row && col === placedPosition.col) {
      return { isPreview: true, previewSymbol: symbolFirst };
    }

    const row2 = placedPosition.row + rowOffset;
    const col2 = placedPosition.col + colOffset;

    if (row === row2 && col === col2) {
      return { isPreview: true, previewSymbol: symbolSecond };
    }

    return { isPreview: false };
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={styles.grid}>
        {grid.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((cell, colIndex) => {
              const { isPreview, previewSymbol } = getPreviewInfo(rowIndex, colIndex);
              const cellKey = `${rowIndex},${colIndex}`;
              const isMatching = matchingCells.has(cellKey);
              return (
                <AnimatedCell
                  key={`cell-${rowIndex}-${colIndex}-${animationKey}`}
                  symbol={cell}
                  isEmpty={cell === null}
                  isPreview={isPreview}
                  isPlaced={placementMode === 'placed'}
                  isHoldReady={holdReady}
                  isMatching={isMatching}
                  previewSymbol={previewSymbol}
                  onMatchAnimationComplete={() => handleMatchAnimationComplete(cellKey)}
                />
              );
            })}
          </View>
        ))}
        {/* Score popups */}
        {scorePopups.map(popup => (
          <ScorePopup
            key={popup.id}
            score={popup.score}
            row={popup.row}
            col={popup.col}
            onComplete={() => removeScorePopup(popup.id)}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

// =============================================================================
// HELP PANEL COMPONENT
// =============================================================================

function HelpPanel() {
  return (
    <View style={styles.helpPanel}>
      <Text style={styles.helpHeading}>Goal</Text>
      <Text style={styles.helpBody}>
        Score {WIN_THRESHOLD}+ points by placing {TILES_PER_LEVEL} domino tiles on an 8x8 grid, then using {RESPINS_PER_LEVEL} respins to improve your matches.
      </Text>

      <Text style={styles.helpHeading}>Matching</Text>
      <Text style={styles.helpBody}>
        Line up 3+ identical symbols in a row or column. Longer matches score more:
      </Text>
      <Text style={styles.helpBody}>
        {'  '}3-in-a-row: x1 | 4: x2 | 5: x3 | 6+: x4
      </Text>

      <Text style={styles.helpHeading}>Symbol values</Text>
      <Text style={styles.helpBody}>
        🍒 10  🍋 20  🎰 40  🔔 80  7️⃣ 150
      </Text>

      <Text style={styles.helpHeading}>Scoring formula</Text>
      <Text style={styles.helpBody}>
        value x length x multiplier{'\n'}
        e.g. 4 bells = 80 x 4 x 2 = 640
      </Text>

      <Text style={styles.helpHeading}>Scoring</Text>
      <Text style={styles.helpBody}>
        Your score equals the total of all matches currently on the grid. It's recalculated after every move — not additive.
      </Text>

      <Text style={styles.helpHeading}>Respins</Text>
      <Text style={styles.helpBody}>
        After all tiles are placed, you get {RESPINS_PER_LEVEL} respins. Each respin re-randomizes every filled cell in a row or column. Respins can create new matches but also break existing ones. Your score is locked to the best total seen — it can never go down.
      </Text>
    </View>
  );
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

export default function App() {
  const {
    grid,
    currentTile,
    tileQueue,
    respinsRemaining,
    score,
    scoreBeforeRespins,
    phase,
    result,
    placementMode,
    respinLine,
    resetGame,
  } = useGameStore();

  const tilesRemaining = tileQueue.length + (currentTile ? 1 : 0);
  const bonusScore = score - scoreBeforeRespins;
  const currentMatches = (phase === 'respinning' || phase === 'ended') ? findMatches(grid) : [];
  const gridTotal = currentMatches.reduce((sum, m) => sum + m.score, 0);
  const [showHelp, setShowHelp] = useState(false);

  // Respin keyboard cursor (web only)
  const [respinCursor, setRespinCursor] = useState<{ type: 'row' | 'col'; index: number }>({ type: 'row', index: 0 });

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleRespinKey = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.phase !== 'respinning') return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setRespinCursor(c => c.type === 'row'
            ? { type: 'row', index: (c.index - 1 + BOARD_SIZE) % BOARD_SIZE }
            : { type: 'col', index: c.index });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setRespinCursor(c => c.type === 'row'
            ? { type: 'row', index: (c.index + 1) % BOARD_SIZE }
            : { type: 'col', index: c.index });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setRespinCursor(c => c.type === 'col'
            ? { type: 'col', index: (c.index - 1 + BOARD_SIZE) % BOARD_SIZE }
            : { type: 'col', index: 0 });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setRespinCursor(c => c.type === 'col'
            ? { type: 'col', index: (c.index + 1) % BOARD_SIZE }
            : { type: 'col', index: 0 });
          break;
        case 'Tab':
          e.preventDefault();
          setRespinCursor(c => c.type === 'row'
            ? { type: 'col', index: c.index < BOARD_SIZE ? c.index : 0 }
            : { type: 'row', index: c.index < BOARD_SIZE ? c.index : 0 });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          setRespinCursor(c => {
            state.respinLine(c.type, c.index);
            return c;
          });
          break;
      }
    };

    document.addEventListener('keydown', handleRespinKey);
    return () => document.removeEventListener('keydown', handleRespinKey);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Slot Dominoes</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>Score: {score}</Text>
            <Text style={styles.goalText}>Goal: {WIN_THRESHOLD}</Text>
          </View>
        </View>

        <View style={Platform.OS === 'web' ? styles.mainRow : undefined}>
          {/* Left column: grid + controls */}
          <View style={Platform.OS === 'web' ? styles.mainColumn : undefined}>
            {/* Grid */}
            <View style={styles.gridContainer}>
              <View style={styles.gridWithRows}>
                <View>
                  {/* Column respin buttons */}
                  {phase === 'respinning' && (
                    <View style={styles.colButtons}>
                      {Array.from({ length: BOARD_SIZE }).map((_, col) => (
                        <Pressable
                          key={`col-${col}`}
                          style={[
                            styles.respinButton,
                            respinCursor.type === 'col' && respinCursor.index === col && styles.respinButtonSelected,
                          ]}
                          onPress={() => respinLine('col', col)}
                        >
                          <Text style={styles.respinButtonText}>v</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <GestureGrid />
                </View>

                {/* Row respin buttons */}
                {phase === 'respinning' && (
                  <View style={styles.rowButtons}>
                    {Array.from({ length: BOARD_SIZE }).map((_, row) => (
                      <Pressable
                        key={`row-btn-${row}`}
                        style={[
                          styles.respinButton,
                          respinCursor.type === 'row' && respinCursor.index === row && styles.respinButtonSelected,
                        ]}
                        onPress={() => respinLine('row', row)}
                      >
                        <Text style={styles.respinButtonText}>{'>'}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Confirm / Cancel buttons when tile is placed */}
              {phase === 'placing' && placementMode === 'placed' && (
                <View style={styles.placementButtons}>
                  <Pressable style={styles.confirmButton} onPress={useGameStore.getState().confirmPlacement}>
                    <Text style={styles.buttonText}>Confirm</Text>
                  </Pressable>
                  <Pressable style={styles.cancelButton} onPress={useGameStore.getState().cancelPlacement}>
                    <Text style={styles.buttonText}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              {phase === 'placing' && currentTile && (
                <>
                  {placementMode === 'idle' && (
                    <View style={styles.tilePreview}>
                      <Text style={styles.previewLabel}>Current tile:</Text>
                      <View style={styles.tilePreviewBox}>
                        <Text style={styles.previewSymbol}>
                          {SYMBOL_DISPLAY[currentTile.symbolA]}
                        </Text>
                        <Text style={styles.previewSymbol}>
                          {SYMBOL_DISPLAY[currentTile.symbolB]}
                        </Text>
                      </View>
                    </View>
                  )}
                  {placementMode === 'placed' && tileQueue.length > 0 && (
                    <View style={styles.tilePreview}>
                      <Text style={styles.previewLabel}>Next tile:</Text>
                      <View style={styles.tilePreviewBox}>
                        <Text style={styles.previewSymbol}>
                          {SYMBOL_DISPLAY[tileQueue[0].symbolA]}
                        </Text>
                        <Text style={styles.previewSymbol}>
                          {SYMBOL_DISPLAY[tileQueue[0].symbolB]}
                        </Text>
                      </View>
                    </View>
                  )}
                  <Text style={styles.infoText}>Tiles left: {tilesRemaining}</Text>
                  {placementMode === 'idle' && (
                    <Text style={styles.hintText}>
                      {Platform.OS === 'web'
                        ? 'Click or press Enter to place tile'
                        : 'Tap grid to place tile'}
                    </Text>
                  )}
                  {placementMode === 'placed' && (
                    <Text style={styles.hintText}>
                      {Platform.OS === 'web'
                        ? 'Arrows: move | R: rotate | Enter: confirm | Esc: cancel'
                        : 'Tap to rotate | Drag to move | Hold to confirm'}
                    </Text>
                  )}
                </>
              )}

              {phase === 'respinning' && (
                <>
                  <Text style={styles.infoText}>
                    {Platform.OS === 'web'
                      ? `Respins: ${respinsRemaining} | Arrows: select | Tab: row/col | Enter: pull`
                      : `Respins: ${respinsRemaining} | Tap row/column arrows to respin`}
                  </Text>
                  <View style={styles.matchBreakdown}>
                    <Text style={styles.matchBreakdownTitle}>
                      Grid total: {gridTotal}{gridTotal < score ? ` (best: ${score})` : ''}
                    </Text>
                    {currentMatches.length > 0 ? currentMatches.map((m, i) => (
                      <Text key={i} style={styles.matchBreakdownRow}>
                        {m.cells.length > 0 && (m.cells[0][0] === m.cells[m.cells.length - 1][0] ? 'Row' : 'Col')}{' '}
                        {SYMBOL_DISPLAY[m.symbol]} x{m.length} = {m.score}
                      </Text>
                    )) : (
                      <Text style={styles.matchBreakdownEmpty}>No matches on grid</Text>
                    )}
                  </View>
                </>
              )}

              {phase === 'ended' && (
                <View style={styles.endScreen}>
                  <Text
                    style={[
                      styles.resultText,
                      result === 'win' ? styles.winText : styles.loseText,
                    ]}
                  >
                    {result === 'win' ? 'You Win!' : 'Game Over'}
                  </Text>
                  <Text style={styles.finalScore}>Final Score: {score}</Text>
                  <Pressable style={styles.restartButton} onPress={resetGame}>
                    <Text style={styles.buttonText}>Play Again</Text>
                  </Pressable>
                </View>
              )}

              {/* Help toggle (mobile only — on web the panel is always visible to the right) */}
              {Platform.OS !== 'web' && (
                <>
                  <Pressable onPress={() => setShowHelp(h => !h)} style={styles.helpToggle}>
                    <Text style={styles.helpToggleText}>{showHelp ? 'Hide rules' : 'How to play'}</Text>
                  </Pressable>
                  {showHelp && <HelpPanel />}
                </>
              )}
            </View>
          </View>

          {/* Right column: rules panel (web only, always visible) */}
          {Platform.OS === 'web' && <HelpPanel />}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
    gap: 24,
  },
  mainColumn: {
    alignItems: 'center',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 24,
  },
  scoreText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  goalText: {
    fontSize: 18,
    color: '#888',
  },
  gridContainer: {
    alignItems: 'center',
    padding: 8,
  },
  colButtons: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: GRID_PADDING,
  },
  gridWithRows: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: GRID_PADDING,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#3d3d5c',
    margin: CELL_MARGIN,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledCell: {
    backgroundColor: '#4a4a70',
  },
  previewCell: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffd700',
    borderStyle: 'dashed',
  },
  placedCell: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  holdReadyCell: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffd700',
    borderRadius: 4,
    zIndex: 1,
  },
  scorePopup: {
    position: 'absolute',
    zIndex: 100,
  },
  scorePopupText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffd700',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cellText: {
    fontSize: 20,
  },
  cellTextAbove: {
    zIndex: 2,
  },
  previewCellText: {
    opacity: 0.6,
  },
  rowButtons: {
    marginLeft: 4,
    alignSelf: 'flex-end',
  },
  respinButton: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#ff6b6b',
    margin: CELL_MARGIN,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  respinButtonSelected: {
    backgroundColor: '#ff3b3b',
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  respinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controls: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  tilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 16,
    color: '#888',
  },
  tilePreviewBox: {
    flexDirection: 'row',
    backgroundColor: '#4a4a70',
    borderRadius: 6,
    padding: 8,
    gap: 4,
  },
  tilePreviewBoxVertical: {
    flexDirection: 'column',
  },
  previewSymbol: {
    fontSize: 28,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#ffd700',
    marginTop: 4,
  },
  scoreBreakdown: {
    fontSize: 14,
    color: '#888',
  },
  matchBreakdown: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#2d2d44',
    borderRadius: 6,
    minWidth: 180,
  },
  matchBreakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffd700',
    marginBottom: 4,
  },
  matchBreakdownRow: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 18,
  },
  matchBreakdownEmpty: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  endScreen: {
    alignItems: 'center',
    gap: 16,
  },
  resultText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  winText: {
    color: '#4caf50',
  },
  loseText: {
    color: '#f44336',
  },
  finalScore: {
    fontSize: 24,
    color: '#fff',
  },
  restartButton: {
    backgroundColor: '#5c6bc0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  placementButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  confirmButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#666',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  helpToggle: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#555',
  },
  helpToggleText: {
    color: '#aaa',
    fontSize: 13,
  },
  helpPanel: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    width: 260,
  },
  helpHeading: {
    color: '#ffd700',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 2,
  },
  helpBody: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
  },
});
