import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Animated,
  LayoutChangeEvent,
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

  startPlacement: (row: number, col: number) => void;
  movePlacement: (row: number, col: number) => void;
  rotatePlacedTile: () => void;
  confirmPlacement: () => void;
  cancelPlacement: () => void;
  setHoldReady: (ready: boolean) => void;
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

    const { score: newTotalScore } = calculateScore(newGrid);

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

  respinLine: (type: 'row' | 'col', index: number) => {
    const { phase, respinsRemaining, grid, score } = get();
    if (phase !== 'respinning' || respinsRemaining <= 0) return;
    if (index < 0 || index >= BOARD_SIZE) return;

    const newGrid = cloneGrid(grid);

    if (type === 'row') {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (newGrid[index][col] !== null) newGrid[index][col] = getRandomSymbol();
      }
    } else {
      for (let row = 0; row < BOARD_SIZE; row++) {
        if (newGrid[row][index] !== null) newGrid[row][index] = getRandomSymbol();
      }
    }

    const newRespins = respinsRemaining - 1;
    const { score: gridScore } = calculateScore(newGrid);
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
  previewSymbol,
}: {
  symbol: Symbol | null;
  isEmpty: boolean;
  isPreview?: boolean;
  isPlaced?: boolean;
  isHoldReady?: boolean;
  previewSymbol?: Symbol;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevSymbol = useRef(symbol);

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

  const displaySymbol = isPreview ? previewSymbol : symbol;

  return (
    <Animated.View
      style={[
        styles.cell,
        !isEmpty && !isPreview && styles.filledCell,
        isPreview && !isPlaced && styles.previewCell,
        isPreview && isPlaced && !isHoldReady && styles.placedCell,
        isPreview && isPlaced && isHoldReady && styles.holdReadyCell,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Text style={[styles.cellText, isPreview && !isPlaced && styles.previewCellText]}>
        {displaySymbol ? SYMBOL_DISPLAY[displaySymbol] : ''}
      </Text>
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
    startPlacement,
    movePlacement,
    rotatePlacedTile,
    confirmPlacement,
    setHoldReady,
  } = useGameStore();

  const gridOriginRef = useRef({ x: 0, y: 0 });

  const handleGridLayout = useCallback((event: LayoutChangeEvent) => {
    event.target.measure((x, y, width, height, pageX, pageY) => {
      gridOriginRef.current = { x: pageX, y: pageY };
    });
  }, []);

  const getCellFromPosition = useCallback((absoluteX: number, absoluteY: number) => {
    const relativeX = absoluteX - gridOriginRef.current.x - GRID_PADDING;
    const relativeY = absoluteY - gridOriginRef.current.y - GRID_PADDING;

    const col = Math.floor(relativeX / CELL_TOTAL);
    const row = Math.floor(relativeY / CELL_TOTAL);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      return { row, col };
    }
    return null;
  }, []);

  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      if (phase !== 'placing' || !currentTile) return;

      const cell = getCellFromPosition(event.absoluteX, event.absoluteY);
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

      const cell = getCellFromPosition(event.absoluteX, event.absoluteY);
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
      <View style={styles.grid} onLayout={handleGridLayout}>
        {grid.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((cell, colIndex) => {
              const { isPreview, previewSymbol } = getPreviewInfo(rowIndex, colIndex);
              return (
                <AnimatedCell
                  key={`cell-${rowIndex}-${colIndex}`}
                  symbol={cell}
                  isEmpty={cell === null}
                  isPreview={isPreview}
                  isPlaced={placementMode === 'placed'}
                  isHoldReady={holdReady}
                  previewSymbol={previewSymbol}
                />
              );
            })}
          </View>
        ))}
      </View>
    </GestureDetector>
  );
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

export default function App() {
  const {
    currentTile,
    rotation,
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

        {/* Grid */}
        <View style={styles.gridContainer}>
          {/* Column respin buttons */}
          {phase === 'respinning' && (
            <View style={styles.colButtons}>
              {Array.from({ length: BOARD_SIZE }).map((_, col) => (
                <Pressable
                  key={`col-${col}`}
                  style={styles.respinButton}
                  onPress={() => respinLine('col', col)}
                >
                  <Text style={styles.respinButtonText}>v</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.gridWithRows}>
            <GestureGrid />

            {/* Row respin buttons */}
            {phase === 'respinning' && (
              <View style={styles.rowButtons}>
                {Array.from({ length: BOARD_SIZE }).map((_, row) => (
                  <Pressable
                    key={`row-btn-${row}`}
                    style={styles.respinButton}
                    onPress={() => respinLine('row', row)}
                  >
                    <Text style={styles.respinButtonText}>{'>'}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {phase === 'placing' && currentTile && (
            <>
              <View style={styles.tilePreview}>
                <Text style={styles.previewLabel}>Next tile:</Text>
                <View
                  style={[
                    styles.tilePreviewBox,
                    (rotation === 1 || rotation === 3) && styles.tilePreviewBoxVertical,
                  ]}
                >
                  <Text style={styles.previewSymbol}>
                    {SYMBOL_DISPLAY[rotation >= 2 ? currentTile.symbolB : currentTile.symbolA]}
                  </Text>
                  <Text style={styles.previewSymbol}>
                    {SYMBOL_DISPLAY[rotation >= 2 ? currentTile.symbolA : currentTile.symbolB]}
                  </Text>
                </View>
              </View>
              <Text style={styles.infoText}>Tiles left: {tilesRemaining}</Text>
              {placementMode === 'idle' && (
                <Text style={styles.hintText}>Tap grid to place tile</Text>
              )}
              {placementMode === 'placed' && (
                <Text style={styles.hintText}>Tap to rotate | Drag to move | Hold to confirm</Text>
              )}
            </>
          )}

          {phase === 'respinning' && (
            <>
              <Text style={styles.infoText}>
                Respins: {respinsRemaining} | Tap row/column arrows to respin
              </Text>
              <Text style={styles.scoreBreakdown}>
                Base: {scoreBeforeRespins} + Bonus: {bonusScore}
              </Text>
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
  cellText: {
    fontSize: 20,
  },
  previewCellText: {
    opacity: 0.6,
  },
  rowButtons: {
    marginLeft: 4,
  },
  respinButton: {
    width: 36,
    height: CELL_SIZE,
    backgroundColor: '#ff6b6b',
    margin: CELL_MARGIN,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
});
