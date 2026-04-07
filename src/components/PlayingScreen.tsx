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
import { useGameStore, useRunStore, respinModeRef } from '../store';
import { HUD } from './HUD';
import { Grid } from './Grid';
import { BottomBar } from './BottomBar';
import { HelpPanel } from './HelpPanel';
import { SettingsScreen } from './SettingsScreen';
import { startMusic, stopMusic } from '../music';
import { RespinCol } from '../symbols/RespinCol';
import { RespinRow } from '../symbols/RespinRow';
import { SymbolIcon } from '../symbols/index';
import type { Dimensions as RNDimensions } from 'react-native';

export function PlayingScreen() {
  const {
    levelConfig,
    currentTile,
    tileQueue,
    respinsRemaining,
    score,
    currentGridScore,
    phase,
    result,
    placementMode,
    selectedEntry,
    entrySpots,
    respinLine,
    buyRespin,
    getNextRespinCost,
    matchingCells,
  } = useGameStore();

  const spinningCells = useGameStore(s => s.spinningCells);
  const isSpinning = spinningCells.size > 0;

  const { currentLevel } = useRunStore();

  useEffect(() => {
    try { startMusic('level' + currentLevel); } catch {}
    return () => { try { stopMusic(); } catch {} };
  }, [currentLevel]);

  const tilesRemaining = tileQueue.length + (currentTile ? 1 : 0);

  const handleRespin = (type: 'row' | 'col', index: number) => {
    const state = useGameStore.getState();
    if (state.respinsRemaining === 0) {
      state.buyRespin();
      // Re-check after buying
      if (useGameStore.getState().respinsRemaining === 0) return;
    }
    useGameStore.getState().respinLine(type, index);
  };
  const entryKeyHint = entrySpots.length > 2 ? '1-4' : '1 or 2';
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [respinMode, setRespinMode] = useState(false);

  // Auto-exit respin mode when respins run out AND can't afford more
  const nextCost = getNextRespinCost();
  const canBuy = score >= nextCost;
  useEffect(() => {
    if (respinMode && respinsRemaining === 0 && !canBuy) {
      setRespinMode(false);
    }
  }, [respinsRemaining, respinMode, canBuy]);

  // Exit respin mode when tile gets placed
  useEffect(() => {
    if (placementMode === 'placed') {
      setRespinMode(false);
    }
  }, [placementMode]);

  // Keep module-level ref in sync for Grid gesture handler
  respinModeRef.current = respinMode;

  // Respin keyboard cursor (web only)
  const [respinCursor, setRespinCursor] = useState<{
    type: 'row' | 'col';
    index: number;
  }>({ type: 'row', index: 0 });
  const respinCursorRef = useRef(respinCursor);
  respinCursorRef.current = respinCursor;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleRespinKey = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.phase !== 'placing') return;
      if (state.respinsRemaining <= 0 && state.score < state.getNextRespinCost()) return;
      if (state.placementMode === 'placed') return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setRespinCursor((c) =>
            c.type === 'row'
              ? { type: 'row', index: (c.index - 1 + BOARD_SIZE) % BOARD_SIZE }
              : { type: 'col', index: c.index },
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setRespinCursor((c) =>
            c.type === 'row'
              ? { type: 'row', index: (c.index + 1) % BOARD_SIZE }
              : { type: 'col', index: c.index },
          );
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setRespinCursor((c) =>
            c.type === 'col'
              ? {
                  type: 'col',
                  index: (c.index - 1 + BOARD_SIZE) % BOARD_SIZE,
                }
              : { type: 'col', index: 0 },
          );
          break;
        case 'ArrowRight':
          e.preventDefault();
          setRespinCursor((c) =>
            c.type === 'col'
              ? { type: 'col', index: (c.index + 1) % BOARD_SIZE }
              : { type: 'col', index: 0 },
          );
          break;
        case 'Tab':
          e.preventDefault();
          setRespinCursor((c) =>
            c.type === 'row'
              ? {
                  type: 'col',
                  index: c.index < BOARD_SIZE ? c.index : 0,
                }
              : {
                  type: 'row',
                  index: c.index < BOARD_SIZE ? c.index : 0,
                },
          );
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          if (state.respinsRemaining === 0) state.buyRespin();
          if (useGameStore.getState().respinsRemaining > 0) {
            useGameStore.getState().respinLine(
              respinCursorRef.current.type,
              respinCursorRef.current.index,
            );
          }
          break;
      }
    };

    document.addEventListener('keydown', handleRespinKey);
    return () => document.removeEventListener('keydown', handleRespinKey);
  }, []);

  const isDesktop = Platform.OS === 'web' && !isMobile;

  return (
    <View style={styles.screenContainer}>
      {/* Compact HUD */}
      <HUD
        level={currentLevel}
        score={score}
        currentGridScore={currentGridScore}
        threshold={levelConfig.threshold}
        respinsRemaining={respinsRemaining}
        respinMode={respinMode}
        nextRespinCost={nextCost}
        onSettingsPress={() => setShowSettings(true)}
      />

      <View style={isDesktop ? styles.mainRow : styles.mobileMain}>
        {/* Left column: grid + controls */}
        <View style={isDesktop ? styles.mainColumn : styles.mobileColumn}>
          {/* Grid area */}
          <View
            style={[
              styles.gridContainer,
              respinMode && styles.gridContainerRespin,
            ]}
          >
            {/* Column respin buttons */}
            {phase === 'placing' &&
              (respinsRemaining > 0 || canBuy) &&
              (!isMobile || respinMode) && (
                <View style={styles.colButtons}>
                  {Array.from({ length: BOARD_SIZE }).map((_, col) => (
                    <Pressable
                      key={`col-${col}`}
                      style={[
                        styles.respinButton,
                        respinCursor.type === 'col' &&
                          respinCursor.index === col &&
                          styles.respinButtonSelected,
                        (placementMode === 'placed' || isSpinning) &&
                          styles.respinButtonDisabled,
                      ]}
                      onPress={() =>
                        placementMode !== 'placed' && handleRespin('col', col)
                      }
                      disabled={
                        placementMode === 'placed' ||
                        matchingCells.size > 0 ||
                        isSpinning
                      }
                    >
                      <RespinCol size={CELL_SIZE - 4} />
                    </Pressable>
                  ))}
                </View>
              )}

            <View style={styles.gridWithRows}>
              <Grid />

              {/* Row respin buttons */}
              {phase === 'placing' &&
                (respinsRemaining > 0 || canBuy) &&
                (!isMobile || respinMode) && (
                  <View style={styles.rowButtons}>
                    {Array.from({ length: BOARD_SIZE }).map((_, row) => (
                      <Pressable
                        key={`row-btn-${row}`}
                        style={[
                          styles.respinButton,
                          respinCursor.type === 'row' &&
                            respinCursor.index === row &&
                            styles.respinButtonSelected,
                          (placementMode === 'placed' || isSpinning) &&
                            styles.respinButtonDisabled,
                        ]}
                        onPress={() =>
                          placementMode !== 'placed' && handleRespin('row', row)
                        }
                        disabled={
                          placementMode === 'placed' ||
                          matchingCells.size > 0 ||
                          isSpinning
                        }
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
            {phase === 'placing' && currentTile && !respinMode && (
              <>
                {/* Bottom bar: tile preview + count + respin toggle */}
                {placementMode !== 'placed' ? (
                  <BottomBar
                    symbolA={currentTile.symbolA}
                    symbolB={currentTile.symbolB}
                    tilesRemaining={tilesRemaining}
                    respinsRemaining={respinsRemaining}
                    nextRespinCost={getNextRespinCost()}
                    canAffordRespin={score >= getNextRespinCost()}
                    onRespinToggle={() => setRespinMode(true)}
                    onBuyRespin={() => { buyRespin(); setRespinMode(true); }}
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
                {placementMode === 'idle' && selectedEntry === null && (
                  <Text style={styles.hintText}>
                    {isMobile
                      ? 'Tap an entry point arrow'
                      : `Press ${entryKeyHint} to select an entry point`}
                  </Text>
                )}
                {placementMode === 'idle' && selectedEntry !== null && (
                  <Text style={styles.hintText}>
                    {isMobile
                      ? 'Tap highlighted area to place tile'
                      : 'Click highlighted area to place tile | Esc: change entry'}
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

            {/* Respin mode controls */}
            {phase === 'placing' && respinMode && (
              <View style={styles.respinControls}>
                <Text style={styles.hintTextRespin}>
                  Tap a row or column to respin
                </Text>
                <Pressable
                  style={styles.respinDoneButton}
                  onPress={() => setRespinMode(false)}
                >
                  <Text style={styles.respinDoneText}>DONE</Text>
                </Pressable>
              </View>
            )}

            {/* Desktop respin info */}
            {isDesktop &&
              phase === 'placing' &&
              (respinsRemaining > 0 || canBuy) &&
              !respinMode && (
                <Text style={styles.infoText}>
                  {respinsRemaining > 0
                    ? `Respins: ${respinsRemaining}`
                    : `Buy respin: ${nextCost}pts`}
                  {' | Arrows: select row/col | R: respin | Tab: toggle row/col'}
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

            {/* Help icon (mobile only) */}
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
      {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}
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
  gridContainerRespin: {
    borderWidth: 1,
    borderColor: colors.respinBorder,
    borderRadius: 12,
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
  respinButtonSelected: {
    backgroundColor: colors.respinTint,
    borderWidth: 2,
    borderColor: colors.respin,
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
  hintTextRespin: {
    color: colors.respin,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  respinControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  respinDoneButton: {
    backgroundColor: colors.respin,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  respinDoneText: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 1,
  },
  infoText: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: fonts.regular,
    marginBottom: 8,
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
