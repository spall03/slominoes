// src/components/Grid.tsx
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme';
import { BOARD_SIZE, CELL_SIZE, CELL_TOTAL, CELL_MARGIN, GRID_PADDING, isMobile } from '../constants';
import { canPlaceTileWithEntry, computeReachableCells, getSecondCellOffset, getSymbolsForRotation } from '../grid';
import { useGameStore, respinModeRef } from '../store';
import { Cell } from './Cell';
import { EntrySpotButton } from './EntrySpotButton';
import { ScorePopup } from './ScorePopup';
import type { Grid as GridType, Rotation, Symbol } from '../types';

export function Grid() {
  const {
    grid,
    currentTile,
    rotation,
    phase,
    placementMode,
    placedPosition,
    holdReady,
    matchingCells,
    highlightColor,
    scorePopups,
    selectedEntry,
    reachableCells,
    entrySpots,
    selectEntry,
    deselectEntry,
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

    const findFirstValidCell = (grid: GridType, reachable: Set<string> | null, entryIndex: number | null): { row: number; col: number } | null => {
      if (!reachable || entryIndex === null) return null;
      const state = useGameStore.getState();
      const entry = state.entrySpots[entryIndex];
      if (!entry) return null;
      const [startRow, startCol] = entry.cells[0];
      for (let dist = 0; dist < BOARD_SIZE; dist++) {
        for (let row = startRow - dist; row <= startRow + dist; row++) {
          for (let col = startCol - dist; col <= startCol + dist; col++) {
            if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) continue;
            for (let rot = 0; rot < 4; rot++) {
              if (canPlaceTileWithEntry(grid, row, col, rot as Rotation, reachable)) return { row, col };
            }
          }
        }
      }
      return null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.phase !== 'placing' || !state.currentTile) return;

      // No entry selected: 1-4 keys select entry, all other keys ignored
      if (state.selectedEntry === null) {
        const entryKeyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
        const entryId = entryKeyMap[e.key];
        if (entryId !== undefined && state.entrySpots.some(s => s.id === entryId)) {
          e.preventDefault();
          state.selectEntry(entryId);
        }
        return;
      }

      // Entry selected, idle mode
      if (state.placementMode === 'idle') {
        const entryKeyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
        const entryId = entryKeyMap[e.key];
        if (entryId !== undefined && state.entrySpots.some(s => s.id === entryId)) {
          e.preventDefault();
          state.selectEntry(entryId);
          return;
        }
        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            {
              const cell = findFirstValidCell(state.grid, state.reachableCells, state.selectedEntry);
              if (cell) state.startPlacement(cell.row, cell.col);
            }
            break;
          case 'Escape':
            e.preventDefault();
            state.deselectEntry();
            break;
        }
        return;
      }

      // Placed mode
      if (!state.placedPosition) return;
      const { row, col } = state.placedPosition;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (canPlaceTileWithEntry(state.grid, row - 1, col, state.rotation, state.reachableCells)) {
            state.movePlacement(row - 1, col);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (canPlaceTileWithEntry(state.grid, row + 1, col, state.rotation, state.reachableCells)) {
            state.movePlacement(row + 1, col);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (canPlaceTileWithEntry(state.grid, row, col - 1, state.rotation, state.reachableCells)) {
            state.movePlacement(row, col - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (canPlaceTileWithEntry(state.grid, row, col + 1, state.rotation, state.reachableCells)) {
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
      if (selectedEntry === null) return;

      const cell = getCellFromPosition(event.x, event.y);
      if (!cell) return;

      if (placementMode === 'idle') {
        const anyRotFits = [0, 1, 2, 3].some(r =>
          canPlaceTileWithEntry(grid, cell.row, cell.col, r as Rotation, reachableCells)
        );
        if (anyRotFits) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          startPlacement(cell.row, cell.col);
        }
      } else if (placementMode === 'placed') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        rotatePlacedTile();
      }
    });

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      if (phase !== 'placing' || placementMode !== 'placed') return;

      const cell = getCellFromPosition(event.x, event.y);
      if (cell && canPlaceTileWithEntry(grid, cell.row, cell.col, rotation, reachableCells)) {
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

  // Build entry cell lookup: "row,col" -> arrowDirection
  const entryCellMap = new Map<string, 'down' | 'up' | 'left' | 'right'>();
  for (const entry of entrySpots) {
    for (const [r, c] of entry.cells) {
      entryCellMap.set(`${r},${c}`, entry.arrowDirection);
    }
  }

  // Check which entries are blocked (for button state)
  const entryBlocked = useMemo(() => entrySpots.map(entry => {
    const reachable = computeReachableCells(grid, entry);
    if (reachable.size < 2) return true;
    for (const cellKey of reachable) {
      const [r, c] = cellKey.split(',').map(Number);
      for (let rot = 0; rot < 4; rot++) {
        if (canPlaceTileWithEntry(grid, r, c, rot as Rotation, reachable)) return false;
      }
    }
    return true;
  }), [grid, entrySpots]);

  const leftEntries = entrySpots.filter(e => e.arrowDirection === 'right');
  const rightEntries = entrySpots.filter(e => e.arrowDirection === 'left');
  const hasSideEntries = phase === 'placing' && currentTile && (leftEntries.length > 0 || rightEntries.length > 0);
  const hideEntries = isMobile && respinModeRef.current;

  return (
    <View>
      {/* Top entry spot buttons */}
      {!hideEntries && phase === 'placing' && currentTile && (
        <View style={styles.entrySpotRow}>
          {entrySpots
            .filter(e => e.arrowDirection === 'down')
            .map(entry => (
              <EntrySpotButton
                key={entry.id}
                entry={entry}
                isSelected={selectedEntry === entry.id}
                isBlocked={entryBlocked[entry.id]}
                onPress={() => selectEntry(entry.id)}
              />
            ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Left entry spot buttons */}
        {!hideEntries && hasSideEntries && (
          <View style={styles.entrySpotCol}>
            {leftEntries.map(entry => (
              <EntrySpotButton
                key={entry.id}
                entry={entry}
                isSelected={selectedEntry === entry.id}
                isBlocked={entryBlocked[entry.id]}
                onPress={() => selectEntry(entry.id)}
              />
            ))}
          </View>
        )}
        <GestureDetector gesture={composedGesture}>
          <View style={styles.grid}>
            {grid.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.row}>
                {row.map((cell, colIndex) => {
                  const { isPreview, previewSymbol } = getPreviewInfo(rowIndex, colIndex);
                  const cellKey = `${rowIndex},${colIndex}`;
                  const isMatching = matchingCells.has(cellKey);
                  const isReachable = reachableCells?.has(cellKey) ?? false;
                  const entryCellDir = entryCellMap.get(cellKey) ?? null;
                  return (
                    <Cell
                      key={`cell-${rowIndex}-${colIndex}-${animationKey}`}
                      symbol={cell}
                      isEmpty={cell === null}
                      isPreview={isPreview}
                      isPlaced={placementMode === 'placed'}
                      isHoldReady={holdReady}
                      isMatching={isMatching}
                      isReachable={isReachable}
                      isEntryCell={entryCellDir}
                      highlightColor={isMatching ? highlightColor : undefined}
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
                color={highlightColor === 'gold' ? colors.gold : undefined}
                onComplete={() => removeScorePopup(popup.id)}
              />
            ))}
          </View>
        </GestureDetector>
        {/* Right entry spot buttons */}
        {!hideEntries && hasSideEntries && (
          <View style={styles.entrySpotCol}>
            {rightEntries.map(entry => (
              <EntrySpotButton
                key={entry.id}
                entry={entry}
                isSelected={selectedEntry === entry.id}
                isBlocked={entryBlocked[entry.id]}
                onPress={() => selectEntry(entry.id)}
              />
            ))}
          </View>
        )}
      </View>
      {/* Bottom entry spot buttons */}
      {!hideEntries && phase === 'placing' && currentTile && (
        <View style={styles.entrySpotRow}>
          {entrySpots
            .filter(e => e.arrowDirection === 'up')
            .map(entry => (
              <EntrySpotButton
                key={entry.id}
                entry={entry}
                isSelected={selectedEntry === entry.id}
                isBlocked={entryBlocked[entry.id]}
                onPress={() => selectEntry(entry.id)}
              />
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    backgroundColor: colors.gridBg,
    borderWidth: 1,
    borderColor: colors.cellGridBorder,
    borderRadius: 10,
    padding: GRID_PADDING,
  },
  row: {
    flexDirection: 'row',
  },
  entrySpotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  entrySpotCol: {
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
});
