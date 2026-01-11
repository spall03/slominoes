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
type Orientation = 'horizontal' | 'vertical';
type GameResult = 'win' | 'lose' | null;

interface GameState {
  grid: Grid;
  tileQueue: Tile[];
  currentTile: Tile | null;
  orientation: Orientation;
  respinsRemaining: number;
  placementScore: number;
  respinScore: number;
  phase: GamePhase;
  result: GameResult;

  placeTile: (row: number, col: number) => boolean;
  rotateTile: () => void;
  respinLine: (type: 'row' | 'col', index: number) => void;
  resetGame: () => void;
}

function createInitialState() {
  const queue = generateTileQueue();
  return {
    grid: createEmptyGrid(),
    tileQueue: queue.slice(1),
    currentTile: queue[0] ?? null,
    orientation: 'horizontal' as Orientation,
    respinsRemaining: RESPINS_PER_LEVEL,
    placementScore: 0,
    respinScore: 0,
    phase: 'placing' as GamePhase,
    result: null as GameResult,
  };
}

const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  placeTile: (row: number, col: number): boolean => {
    const { phase, currentTile, orientation, grid, tileQueue } = get();
    if (phase !== 'placing' || !currentTile) return false;

    // Check bounds for first cell
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
    if (grid[row][col] !== null) return false;

    // Check second cell
    const [row2, col2] = orientation === 'horizontal' ? [row, col + 1] : [row + 1, col];
    if (row2 >= BOARD_SIZE || col2 >= BOARD_SIZE) return false;
    if (grid[row2][col2] !== null) return false;

    // Place tile
    const newGrid = cloneGrid(grid);
    newGrid[row][col] = currentTile.symbolA;
    newGrid[row2][col2] = currentTile.symbolB;

    const nextTile = tileQueue[0] ?? null;
    const newQueue = tileQueue.slice(1);
    const isComplete = nextTile === null;

    if (isComplete) {
      const { score } = calculateScore(newGrid);
      set({
        grid: newGrid,
        tileQueue: [],
        currentTile: null,
        placementScore: score,
        phase: 'respinning',
      });
    } else {
      set({
        grid: newGrid,
        tileQueue: newQueue,
        currentTile: nextTile,
      });
    }
    return true;
  },

  rotateTile: () => {
    set(s => ({ orientation: s.orientation === 'horizontal' ? 'vertical' : 'horizontal' }));
  },

  respinLine: (type: 'row' | 'col', index: number) => {
    const { phase, respinsRemaining, grid, placementScore } = get();
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
    const { score } = calculateScore(newGrid);

    if (newRespins === 0) {
      const total = placementScore + score;
      set({
        grid: newGrid,
        respinsRemaining: 0,
        respinScore: score,
        phase: 'ended',
        result: total >= WIN_THRESHOLD ? 'win' : 'lose',
      });
    } else {
      set({
        grid: newGrid,
        respinsRemaining: newRespins,
        respinScore: score,
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
}: {
  symbol: Symbol | null;
  onPress: () => void;
  isEmpty: boolean;
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

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.cell,
          !isEmpty && styles.filledCell,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.cellText}>
          {symbol ? SYMBOL_DISPLAY[symbol] : ''}
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
    orientation,
    tileQueue,
    respinsRemaining,
    placementScore,
    respinScore,
    phase,
    result,
    placeTile,
    rotateTile,
    respinLine,
    resetGame,
  } = useGameStore();

  const totalScore = placementScore + respinScore;
  const tilesRemaining = tileQueue.length + (currentTile ? 1 : 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Slot Dominoes</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>Score: {totalScore}</Text>
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
                {row.map((cell, colIndex) => (
                  <AnimatedCell
                    key={`cell-${rowIndex}-${colIndex}`}
                    symbol={cell}
                    isEmpty={cell === null}
                    onPress={() => phase === 'placing' && placeTile(rowIndex, colIndex)}
                  />
                ))}
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
                  styles.previewTile,
                  orientation === 'vertical' && styles.previewTileVertical,
                ]}
              >
                <Text style={styles.previewSymbol}>
                  {SYMBOL_DISPLAY[currentTile.symbolA]}
                </Text>
                <Text style={styles.previewSymbol}>
                  {SYMBOL_DISPLAY[currentTile.symbolB]}
                </Text>
              </View>
              <Pressable style={styles.rotateButton} onPress={rotateTile}>
                <Text style={styles.buttonText}>Rotate</Text>
              </Pressable>
            </View>
            <Text style={styles.infoText}>Tiles left: {tilesRemaining}</Text>
          </>
        )}

        {phase === 'respinning' && (
          <>
            <Text style={styles.infoText}>
              Respins: {respinsRemaining} | Tap row/column arrows to respin
            </Text>
            <Text style={styles.scoreBreakdown}>
              Placement: {placementScore} + Respin: {respinScore}
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
            <Text style={styles.finalScore}>Final Score: {totalScore}</Text>
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
  cellText: {
    fontSize: 20,
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
  previewTile: {
    flexDirection: 'row',
    backgroundColor: '#4a4a70',
    borderRadius: 6,
    padding: 8,
    gap: 4,
  },
  previewTileVertical: {
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
