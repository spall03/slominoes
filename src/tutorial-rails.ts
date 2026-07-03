import type { Rotation, Tile } from './types';

export type TutorialPlacementTarget = {
  tileId: string;
  entryId: number;
  row: number;
  col: number;
  rotation: Rotation;
};

export const TUTORIAL_RESPIN_TARGET = { type: 'row', index: 2 } as const;

const TUTORIAL_PLACEMENTS: TutorialPlacementTarget[] = [
  // Complete the seeded cherry pair.
  { tileId: 't0-1', entryId: 1, row: 5, col: 2, rotation: 2 },
  // A safe non-match beat.
  { tileId: 't0-2', entryId: 1, row: 6, col: 3, rotation: 0 },
  // Put a second bar into human row 3 for the respin lesson.
  { tileId: 't0-3', entryId: 0, row: 2, col: 2, rotation: 0 },
  // Finish the scripted level after the respin.
  { tileId: 't0-4', entryId: 0, row: 1, col: 3, rotation: 0 },
];

export function getTutorialPlacementTarget(tile: Tile | null): TutorialPlacementTarget | null {
  if (!tile) return null;
  return TUTORIAL_PLACEMENTS.find(target => target.tileId === tile.id) ?? null;
}

export function isTutorialPlacementCell(
  target: TutorialPlacementTarget | null,
  row: number,
  col: number,
): boolean {
  return !target || (target.row === row && target.col === col);
}

export function isTutorialPlacementSatisfied(
  target: TutorialPlacementTarget | null,
  row: number,
  col: number,
  rotation: Rotation,
): boolean {
  return !target || (
    target.row === row &&
    target.col === col &&
    target.rotation === rotation
  );
}
