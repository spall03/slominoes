// src/components/TutorialHints.tsx
//
// Logic-only orchestrator for the FTUE Level 0 hint sequence. Subscribes to
// gameStore state changes and drives useTutorialHints (the small dedicated
// hint store). Renders the banner + centered overlay; component-side
// affordances (entry button + respin badge pulses) read tutorialFocus from
// the store.
//
// Mounted only when currentLevel === 0 (PlayingScreen does the gating).
// On unmount, resets the hint store.

import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { isMobile } from '../constants';
import { colors, fonts } from '../theme';
import { useGameStore } from '../store';
import { useTutorialHints } from '../tutorial-hints-store';
import { tutorialStepAdvanced } from '../analytics-events';

const ROTATE_HINT = isMobile
  ? 'Drag to move · Tap to rotate · Hold to confirm'
  : 'Arrows: move · R: rotate · Enter: confirm';

export function TutorialHints() {
  // Note: banner copy is rendered inline by PlayingScreen (so it sits below
  // the grid in the controls area, not overlapping the top entry button).
  // This component just runs the orchestration + renders the centered "wow"
  // overlay.
  const overlayCopy = useTutorialHints(s => s.overlayCopy);

  const advancedSteps = useRef<Set<number>>(new Set());
  const seenPlacedMode = useRef(false);

  // Animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // ------------------------------------------------------------------
  // Step orchestration
  // ------------------------------------------------------------------
  useEffect(() => {
    // Step 1: mount → "Tap an entry arrow"
    if (!advancedSteps.current.has(1)) {
      advancedSteps.current.add(1);
      useTutorialHints.getState().show({
        step: 1,
        bannerCopy: 'Tap an entry arrow on the top or bottom to place your first tile.',
        focus: 'entry',
      });
      tutorialStepAdvanced(1);
    }

    // Subscribe to gameStore for step advancement triggers
    const unsub = useGameStore.subscribe((state, prev) => {
      const hints = useTutorialHints.getState();

      // Step 1.5: first time placementMode === 'placed' → teach rotate/confirm
      if (
        !seenPlacedMode.current
        && state.placementMode === 'placed'
        && prev.placementMode !== 'placed'
      ) {
        seenPlacedMode.current = true;
        if (!advancedSteps.current.has(1.5)) {
          advancedSteps.current.add(1.5);
          hints.show({
            step: 1.5,
            bannerCopy: ROTATE_HINT,
            focus: null,
          });
          tutorialStepAdvanced(1.5);
        }
      }

      // Step 2: first match resolves (locked cells size goes from 0 → ≥3)
      if (
        !advancedSteps.current.has(2)
        && state.lockedCells.size >= 3
        && prev.lockedCells.size === 0
      ) {
        advancedSteps.current.add(2);
        hints.show({
          step: 2,
          bannerCopy: null,
          overlayCopy: 'Three cherries match.\nMatched cells lock — safe from respins.',
          focus: null,
        });
        tutorialStepAdvanced(2);
      }

      // Tile-queue countdown drives steps 3 / 4
      // queue starts at length 3 (after currentTile pulled). Tile 1 placed → length 2
      // (no banner change, step 2 overlay handles it). Tile 2 placed → length 1 → step 3.
      // Tile 3 placed → length 0 → step 4 (respin prompt).
      const queueLen = state.tileQueue.length;
      const prevQueueLen = prev.tileQueue.length;

      if (
        !advancedSteps.current.has(3)
        && queueLen === 1
        && prevQueueLen === 2
      ) {
        advancedSteps.current.add(3);
        hints.show({
          step: 3,
          bannerCopy: 'Not every move is a match. Set up future combos.',
          overlayCopy: null,
          focus: null,
        });
        tutorialStepAdvanced(3);
      }

      if (
        !advancedSteps.current.has(4)
        && queueLen === 0
        && prevQueueLen === 1
      ) {
        advancedSteps.current.add(4);
        hints.show({
          step: 4,
          bannerCopy: 'You have 2 bars in row 3. Tap RESPIN to try for a third.',
          focus: 'respin-badge',
        });
        tutorialStepAdvanced(4);
      }

      // Step 5: respinTarget set (player tapped a row/col respin button)
      if (
        !advancedSteps.current.has(5)
        && state.respinTarget !== null
        && prev.respinTarget === null
      ) {
        advancedSteps.current.add(5);
        hints.show({
          step: 5,
          bannerCopy: 'Tap the same row again to fire the respin.',
          focus: null,
        });
        tutorialStepAdvanced(5);
      }

      // Step 6: respin completed → spinningCells went from > 0 back to 0
      if (
        !advancedSteps.current.has(6)
        && state.spinningCells.size === 0
        && prev.spinningCells.size > 0
      ) {
        advancedSteps.current.add(6);
        hints.markRespinUsed();
        hints.show({
          step: 6,
          bannerCopy: null,
          overlayCopy: "That's a respin.\nNow finish strong.",
          focus: null,
        });
        tutorialStepAdvanced(6);
      }
    });

    return () => {
      unsub();
      useTutorialHints.getState().reset();
    };
  }, []);

  // ------------------------------------------------------------------
  // Overlay fade — fades in, lingers ~2.4s, fades out
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!overlayCopy) {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.sequence([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => {
      // Auto-clear after fade-out so subsequent overlays can fire fresh
      useTutorialHints.getState().clearOverlay();
    });
  }, [overlayCopy, overlayOpacity]);

  return (
    <>
      {overlayCopy && (
        <Animated.View
          style={[styles.overlayContainer, { opacity: overlayOpacity }]}
          pointerEvents="none"
        >
          <Text style={styles.overlayText}>{overlayCopy}</Text>
        </Animated.View>
      )}
    </>
  );
}

/**
 * Inline banner — rendered by PlayingScreen in the controls area below the
 * grid, where the regular Level 1+ idle hint also lives. Keeps the tutorial
 * hint visually consistent with the rest of the in-level UI and avoids
 * overlapping the top entry button.
 */
export function TutorialBanner() {
  const bannerCopy = useTutorialHints(s => s.bannerCopy);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: bannerCopy ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [bannerCopy, opacity]);

  if (!bannerCopy) return null;

  return (
    <Animated.View style={[styles.bannerInline, { opacity }]}>
      <Text style={styles.bannerInlineText}>{bannerCopy}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerInline: {
    marginTop: 8,
    marginHorizontal: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cyanBorder,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  bannerInlineText: {
    color: colors.ink,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  overlayText: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 30,
    backgroundColor: 'rgba(6,6,20,0.9)',
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 0 32px rgba(255,215,0,0.4), 0 0 64px rgba(255,215,0,0.2)',
    } as any) : {}),
  },
});
