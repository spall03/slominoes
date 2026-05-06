// src/run-helpers.ts
//
// Single source of truth for tutorial-run gating. Every consumer that needs
// to know "is this Level 0 (FTUE)?" reads from here.
//
// Per spec v3 (docs/superpowers/specs/2026-05-03-ftue-level-zero-design.md):
// stat tracking, ads, unlock checks, and run-level analytics events all gate
// on !isTutorialRun() to avoid Level 0 polluting real-run state.

import { useRunStore } from './store';

export function isTutorialRun(): boolean {
  return useRunStore.getState().currentLevel === 0;
}
