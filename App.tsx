import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { create } from 'zustand';

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

const ROTATION_LABELS: Record<Rotation, string> = {
  0: '→',
  1: '↓',
  2: '←',
  3: '↑',
};

// Get the offset for the second cell based on rotation
function getSecondCellOffset(rotation: Rotation): [number, number] {
  switch (rotation) {
    case 0: return [0, 1];   // right
    case 1: return [1, 0];   // down
    case 2: return [0, -1];  // left
    case 3: return [-1, 0];  // up
  }
}

// For rotations 2 and 3, we swap which symbol goes first
function getSymbolsForRotation(tile: Tile, rotation: Rotation): [Symbol, Symbol] {
  // For left (2) and up (3), swap the symbols so the tile appears correctly
  if (rotation === 2 || rotation === 3) {
    return [tile.symbolB, tile.symbolA];
  }
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

interface PreviewPosition {
  row: number;
  col: number;
}

interface GameState {
  grid: Grid;
  tileQueue: Tile[];
  currentTile: Tile | null;
  rotation: Rotation;
  respinsRemaining: number;
  score: number;  // Running total score
  scoreBeforeRespins: number;  // Score when entering respin phase
  phase: GamePhase;
  result: GameResult;
  previewPosition: PreviewPosition | null;  // For two-tap placement

  handleCellTap: (row: number, col: number) => void;
  rotateTile: () => void;
  respinLine: (type: 'row' | 'col', index: number) => void;
  resetGame: () => void;
  clearPreview: () => void;
}

function canPlaceTile(
  grid: Grid,
  row: number,
  col: number,
  rotation: Rotation
): boolean {
  // Check bounds for first cell
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
  if (grid[row][col] !== null) return false;

  // Check second cell
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
    previewPosition: null as PreviewPosition | null,
  };
}

const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  handleCellTap: (row: number, col: number) => {
    const { phase, currentTile, rotation, grid, tileQueue, previewPosition, score } = get();
    if (phase !== 'placing' || !currentTile) return;

    // Check if placement is valid at this position
    if (!canPlaceTile(grid, row, col, rotation)) return;

    // Check if this is a confirmation tap (same position as preview)
    const isConfirmation = previewPosition?.row === row && previewPosition?.col === col;

    if (!isConfirmation) {
      // First tap or new position - just set preview
      set({ previewPosition: { row, col } });
      return;
    }

    // Second tap on same position - confirm and place tile
    const [rowOffset, colOffset] = getSecondCellOffset(rotation);
    const row2 = row + rowOffset;
    const col2 = col + colOffset;

    const [symbolFirst, symbolSecond] = getSymbolsForRotation(currentTile, rotation);

    const newGrid = cloneGrid(grid);
    newGrid[row][col] = symbolFirst;
    newGrid[row2][col2] = symbolSecond;

    // Calculate new score immediately after placement
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
        previewPosition: null,
      });
    } else {
      set({
        grid: newGrid,
        tileQueue: newQueue,
        currentTile: nextTile,
        score: newTotalScore,
        previewPosition: null,
      });
    }
  },

  rotateTile: () => {
    set(s => ({
      rotation: ((s.rotation + 1) % 4) as Rotation,
      previewPosition: null,  // Clear preview when rotating
    }));
  },

  clearPreview: () => {
    set({ previewPosition: null });
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

    // Only add points, never subtract (take max of current score and new calculated score)
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
  onPress,
  isEmpty,
  isPreview,
  previewSymbol,
}: {
  symbol: Symbol | null;
  onPress: () => void;
  isEmpty: boolean;
  isPreview?: boolean;
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
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.cell,
          !isEmpty && !isPreview && styles.filledCell,
          isPreview && styles.previewCell,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={[styles.cellText, isPreview && styles.previewCellText]}>
          {displaySymbol ? SYMBOL_DISPLAY[displaySymbol] : ''}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

export default function App() {
  const {
    grid,
    currentTile,
    rotation,
    tileQueue,
    respinsRemaining,
    score,
    scoreBeforeRespins,
    phase,
    result,
    previewPosition,
    handleCellTap,
    rotateTile,
    respinLine,
    resetGame,
  } = useGameStore();

  const tilesRemaining = tileQueue.length + (currentTile ? 1 : 0);
  const bonusScore = score - scoreBeforeRespins;

  // Calculate preview cells
  const getPreviewInfo = (row: number, col: number): { isPreview: boolean; previewSymbol?: Symbol } => {
    if (!previewPosition || !currentTile || phase !== 'placing') {
      return { isPreview: false };
    }

    const [rowOffset, colOffset] = getSecondCellOffset(rotation);
    const [symbolFirst, symbolSecond] = getSymbolsForRotation(currentTile, rotation);

    if (row === previewPosition.row && col === previewPosition.col) {
      return { isPreview: true, previewSymbol: symbolFirst };
    }

    const row2 = previewPosition.row + rowOffset;
    const col2 = previewPosition.col + colOffset;

    if (row === row2 && col === col2) {
      return { isPreview: true, previewSymbol: symbolSecond };
    }

    return { isPreview: false };
  };

  return (
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
          <View style={styles.grid}>
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
                      previewSymbol={previewSymbol}
                      onPress={() => phase === 'placing' && handleCellTap(rowIndex, colIndex)}
                    />
                  );
                })}
              </View>
            ))}
          </View>

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
              <Pressable style={styles.rotateButton} onPress={rotateTile}>
                <Text style={styles.buttonText}>Rotate {ROTATION_LABELS[rotation]}</Text>
              </Pressable>
            </View>
            <Text style={styles.infoText}>Tiles left: {tilesRemaining}</Text>
            {previewPosition && (
              <Text style={styles.hintText}>Tap again to confirm placement</Text>
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
    padding: 4,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 40,
    height: 40,
    backgroundColor: '#3d3d5c',
    margin: 1,
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
    height: 40,
    backgroundColor: '#ff6b6b',
    margin: 1,
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
  rotateButton: {
    backgroundColor: '#5c6bc0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
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
