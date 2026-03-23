// src/components/PlayingScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import {
  BOARD_SIZE,
  CELL_SIZE,
  CELL_TOTAL,
  CELL_MARGIN,
  GRID_PADDING,
  isMobile,
} from '../constants';
import { CONFIG } from '../config';
import { useGameStore, useRunStore } from '../store';
import { HUD } from './HUD';
import { Grid } from './Grid';
import { BottomBar } from './BottomBar';
import { HelpPanel } from './HelpPanel';
import { RespinCol } from '../symbols/RespinCol';
import { RespinRow } from '../symbols/RespinRow';
import type { Dimensions as RNDimensions } from 'react-native';

export function PlayingScreen() {
  const {
    levelConfig,
    currentTile,
    batchQueue,
    currentBatch,
    tileBatches,
    cascadeWave,
    lockedCells,
    score,
    phase,
    result,
    placementMode,
    selectedEntry,
    entrySpots,
    ignite,
    matchingCells,
  } = useGameStore();

  const spinningCells = useGameStore(s => s.spinningCells);
  const isSpinning = spinningCells.size > 0;

  const { currentLevel } = useRunStore();

  const entryKeyHint = entrySpots.length > 2 ? '1-4' : '1 or 2';
  const [showHelp, setShowHelp] = useState(false);

  const isDesktop = Platform.OS === 'web' && !isMobile;

  return (
    <View style={styles.screenContainer}>
      {/* Compact HUD */}
      <HUD
        level={currentLevel}
        score={score}
        threshold={levelConfig.threshold}
        batch={currentBatch + 1}
        totalBatches={tileBatches.length}
        cascadeWave={cascadeWave}
        phase={phase}
      />

      <View style={isDesktop ? styles.mainRow : styles.mobileMain}>
        {/* Left column: grid + controls */}
        <View style={isDesktop ? styles.mainColumn : styles.mobileColumn}>
          {/* Grid area */}
          <View style={styles.gridContainer}>
            {/* Column ignite buttons — visible during igniting phase */}
            {phase === 'igniting' && (
              <View style={styles.colButtons}>
                {Array.from({ length: BOARD_SIZE }).map((_, col) => (
                  <Pressable
                    key={`col-${col}`}
                    style={[
                      styles.respinButton,
                      isSpinning && styles.respinButtonDisabled,
                    ]}
                    onPress={() => ignite('col', col)}
                    disabled={isSpinning}
                  >
                    <RespinCol size={CELL_SIZE - 4} />
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.gridWithRows}>
              <Grid />

              {/* Row ignite buttons — visible during igniting phase */}
              {phase === 'igniting' && (
                <View style={styles.rowButtons}>
                  {Array.from({ length: BOARD_SIZE }).map((_, row) => (
                    <Pressable
                      key={`row-btn-${row}`}
                      style={[
                        styles.respinButton,
                        isSpinning && styles.respinButtonDisabled,
                      ]}
                      onPress={() => ignite('row', row)}
                      disabled={isSpinning}
                    >
                      <RespinRow size={CELL_SIZE - 4} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Controls area */}
          <View style={styles.controls}>
            {/* Placing phase controls */}
            {phase === 'placing' && currentTile && (
              <>
                {/* Bottom bar: tile preview + batch progress */}
                {placementMode !== 'placed' ? (
                  <BottomBar
                    symbolA={currentTile.symbolA}
                    symbolB={currentTile.symbolB}
                    tilesLeft={batchQueue.length + 1}
                    totalInBatch={CONFIG.TILES_PER_BATCH}
                  />
                ) : (
                  <View style={styles.placementButtons}>
                    <Pressable
                      style={({ pressed }) => [styles.confirmButton, pressed && styles.buttonPressed]}
                      onPress={useGameStore.getState().confirmPlacement}
                    >
                      <Text style={styles.confirmText}>CONFIRM</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
                      onPress={useGameStore.getState().cancelPlacement}
                    >
                      <Text style={styles.cancelText}>CANCEL</Text>
                    </Pressable>
                  </View>
                )}

                {/* Hint text */}
                {placementMode === 'idle' && (
                  <Text style={styles.hintText}>
                    {isMobile
                      ? 'Tap any empty cell to place tile'
                      : 'Click any empty cell to place tile'}
                  </Text>
                )}
                {placementMode === 'placed' && (
                  <Text style={styles.hintText}>
                    {isMobile
                      ? 'Drag to move \u00b7 Tap to rotate \u00b7 Hold to confirm'
                      : 'Arrows: move | R: rotate | Enter: confirm | Esc: cancel'}
                  </Text>
                )}
              </>
            )}

            {/* Igniting phase hint */}
            {phase === 'igniting' && (
              <Text style={styles.hintTextIgnite}>
                CHOOSE A ROW OR COLUMN
              </Text>
            )}

            {/* End-of-level overlay */}
            {phase === 'ended' && (
              <View style={styles.endOverlay}>
                <Text
                  style={[
                    styles.resultText,
                    result === 'win'
                      ? {
                          color: colors.cyan,
                          textShadowColor: colors.cyan,
                          textShadowRadius: 16,
                        }
                      : {
                          color: colors.pink,
                          textShadowColor: colors.pink,
                          textShadowRadius: 16,
                        },
                  ]}
                >
                  {result === 'win' ? 'YOU WIN!' : 'GAME OVER'}
                </Text>
                <Text style={styles.finalScore}>Final Score: {score}</Text>
                <Pressable
                  style={({ pressed }) => [styles.restartButton, pressed && styles.buttonPressed]}
                  onPress={() => useRunStore.getState().startRun()}
                >
                  <Text style={styles.restartText}>PLAY AGAIN</Text>
                </Pressable>
              </View>
            )}

            {/* Help: icon on mobile, panel on desktop */}
            {isMobile && (
              <Pressable
                onPress={() => setShowHelp((h) => !h)}
                style={styles.helpIcon}
              >
                <Text style={styles.helpIconText}>
                  {showHelp ? '\u2715' : '\u24d8'}
                </Text>
              </Pressable>
            )}
            {isMobile && showHelp && <HelpPanel />}
          </View>
        </View>

        {/* Right column: rules panel (web desktop only) */}
        {isDesktop && <HelpPanel />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.bg,
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
  mobileMain: {
    flex: 1,
  },
  mobileColumn: {
    flex: 1,
    alignItems: 'center',
  },
  gridContainer: {
    alignItems: 'center',
    padding: 8,
  },
  colButtons: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: GRID_PADDING,
    width: GRID_PADDING * 2 + BOARD_SIZE * CELL_TOTAL,
    alignSelf: 'flex-start',
  },
  gridWithRows: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowButtons: {
    marginLeft: 4,
    paddingVertical: GRID_PADDING,
  },
  respinButton: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.respin,
    margin: CELL_MARGIN,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  respinButtonDisabled: {
    opacity: 0.3,
  },
  controls: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  placementButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  confirmButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.cyan,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmText: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.textMuted,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelText: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  hintText: {
    fontSize: 13,
    color: colors.gold,
    fontFamily: fonts.regular,
    marginTop: 6,
    textAlign: 'center',
  },
  hintTextIgnite: {
    fontSize: 15,
    color: colors.gold,
    fontFamily: fonts.bold,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 2,
  },
  endOverlay: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  resultText: {
    fontFamily: fonts.bold,
    fontSize: 32,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textShadowOffset: { width: 0, height: 0 },
  },
  finalScore: {
    fontSize: 20,
    color: colors.textPrimary,
    fontFamily: fonts.semiBold,
  },
  restartButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.indigo,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  restartText: {
    color: colors.indigo,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  helpIcon: {
    position: 'absolute',
    top: 0,
    right: 8,
    padding: 4,
  },
  helpIconText: {
    fontSize: 18,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
