import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useGameState } from './hooks/useGameState';
import { SYMBOL_DISPLAY } from './utils/symbols';
import { WIN_THRESHOLD, BOARD_SIZE } from './constants/gameConfig';

export default function App() {
  const {
    grid,
    currentTile,
    currentOrientation,
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
  } = useGameState();

  const totalScore = placementScore + respinScore;
  const tilesRemaining = tileQueue.length + (currentTile ? 1 : 0);

  const handleCellPress = (row: number, col: number) => {
    if (phase === 'placing') {
      placeTile(row, col);
    }
  };

  const handleRowRespin = (rowIndex: number) => {
    if (phase === 'respinning' && respinsRemaining > 0) {
      respinLine('row', rowIndex);
    }
  };

  const handleColRespin = (colIndex: number) => {
    if (phase === 'respinning' && respinsRemaining > 0) {
      respinLine('col', colIndex);
    }
  };

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
                onPress={() => handleColRespin(col)}
              >
                <Text style={styles.respinButtonText}>v</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.gridWithRows}>
          {/* Grid */}
          <View style={styles.grid}>
            {grid.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.row}>
                {row.map((cell, colIndex) => (
                  <Pressable
                    key={`cell-${rowIndex}-${colIndex}`}
                    style={[
                      styles.cell,
                      cell !== null && styles.filledCell,
                    ]}
                    onPress={() => handleCellPress(rowIndex, colIndex)}
                  >
                    <Text style={styles.cellText}>
                      {cell !== null ? SYMBOL_DISPLAY[cell] : ''}
                    </Text>
                  </Pressable>
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
                  onPress={() => handleRowRespin(row)}
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
              <View style={[
                styles.previewTile,
                currentOrientation === 'vertical' && styles.previewTileVertical
              ]}>
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
              Respins: {respinsRemaining} | Tap row/column to respin
            </Text>
            <Text style={styles.scoreBreakdown}>
              Placement: {placementScore} + Respin: {respinScore}
            </Text>
          </>
        )}

        {phase === 'ended' && (
          <View style={styles.endScreen}>
            <Text style={[
              styles.resultText,
              result === 'win' ? styles.winText : styles.loseText
            ]}>
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
