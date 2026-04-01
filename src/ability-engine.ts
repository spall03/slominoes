// src/ability-engine.ts
// Evaluates symbol abilities during gameplay. Stateless — takes game state in,
// returns effects out. The caller (store or simulator) applies the effects.

import type { SymbolDef, SymbolId, Ability } from './symbols';
import { getEffectiveScoreValue, getRecipeMatches, buildFrequencyTable } from './symbols';

// =============================================================================
// TYPES
// =============================================================================

export type Grid = (SymbolId | null)[][];

export interface Match {
  cells: [number, number][];
  symbol: SymbolId;
  length: number;
  score: number;
  /** If this match was triggered by a recipe_match ability */
  isRecipe?: boolean;
  /** The symbol that defined the recipe (if isRecipe) */
  recipeDefiner?: SymbolId;
}

/** Effects produced by ability evaluation — caller applies them */
export interface AbilityEffects {
  bonusScore: number;
  freeRespins: number;
  extraTiles: number;
  cellsToUnlock: Set<string>;
  cellsToClear: Set<string>;
  /** Score multipliers: [cellKey, factor] — applied to matches intersecting that cell */
  matchMultipliers: { matchSymbol: SymbolId; scope: 'cross'; sourceRow: number; sourceCol: number; factor: number }[];
}

// =============================================================================
// MATCH FINDING (ability-aware)
// =============================================================================

/**
 * Find all matches on the grid, respecting per-symbol match lengths.
 * Also detects recipe matches.
 */
export function findMatchesWithAbilities(
  grid: Grid,
  loadout: SymbolDef[],
  boardSize: number,
): Match[] {
  const matches: Match[] = [];

  // Build match length lookup
  const matchLengths = new Map<SymbolId, number>();
  for (const sym of loadout) {
    matchLengths.set(sym.id, sym.matchLength);
  }

  // Build effective score values
  const scoreValues = new Map<SymbolId, number>();
  for (const sym of loadout) {
    scoreValues.set(sym.id, getEffectiveScoreValue(sym.id, loadout));
  }

  // Build wild_match compatibility: for each symbol, which other symbols can it match with?
  // If apple has wild_match with [cherry, lemon], then apple is compatible with cherry and lemon,
  // AND cherry is compatible with apple, AND lemon is compatible with apple.
  const compatible = new Map<SymbolId, Set<SymbolId>>();
  for (const sym of loadout) {
    if (!compatible.has(sym.id)) compatible.set(sym.id, new Set([sym.id]));
    else compatible.get(sym.id)!.add(sym.id);

    for (const ability of sym.abilities) {
      if (ability.trigger === 'wild_match' && ability.params.wildWith) {
        for (const target of ability.params.wildWith) {
          compatible.get(sym.id)!.add(target);
          if (!compatible.has(target)) compatible.set(target, new Set([target]));
          compatible.get(target)!.add(sym.id);
        }
      }
    }
  }

  /** Check if two symbols are compatible (same symbol or wild_match linked) */
  const areCompatible = (a: SymbolId, b: SymbolId): boolean => {
    return compatible.get(a)?.has(b) ?? (a === b);
  };

  const lengthMultiplier = (len: number): number => {
    if (len <= 2) return 1;
    const table: Record<number, number> = { 3: 1, 4: 2, 5: 3 };
    return table[len] ?? 4;
  };

  // Standard matches (horizontal) — with wild_match support
  for (let row = 0; row < boardSize; row++) {
    let col = 0;
    while (col < boardSize) {
      const symbol = grid[row][col];
      if (symbol === null || symbol === 'wall') { col++; continue; }
      let length = 1;
      while (col + length < boardSize) {
        const next = grid[row][col + length];
        if (next === null || next === 'wall' || !areCompatible(symbol, next)) break;
        length++;
      }

      const minLen = matchLengths.get(symbol) ?? 3;
      if (length >= minLen) {
        const cells: [number, number][] = [];
        for (let i = 0; i < length; i++) cells.push([row, col + i]);
        const baseScore = scoreValues.get(symbol) ?? 0;
        const score = baseScore * length * lengthMultiplier(length);
        matches.push({ cells, symbol, length, score });
      }
      col += length;
    }
  }

  // Standard matches (vertical) — with wild_match support
  for (let col = 0; col < boardSize; col++) {
    let row = 0;
    while (row < boardSize) {
      const symbol = grid[row][col];
      if (symbol === null || symbol === 'wall') { row++; continue; }
      let length = 1;
      while (row + length < boardSize) {
        const next = grid[row + length][col];
        if (next === null || next === 'wall' || !areCompatible(symbol, next)) break;
        length++;
      }

      const minLen = matchLengths.get(symbol) ?? 3;
      if (length >= minLen) {
        const cells: [number, number][] = [];
        for (let i = 0; i < length; i++) cells.push([row + i, col]);
        const baseScore = scoreValues.get(symbol) ?? 0;
        const score = baseScore * length * lengthMultiplier(length);
        matches.push({ cells, symbol, length, score });
      }
      row += length;
    }
  }

  // Recipe matches
  const recipes = getRecipeMatches(loadout);
  for (const { definer, recipe } of recipes) {
    const recipeLen = recipe.length;
    const definerDef = loadout.find(s => s.id === definer);
    if (!definerDef) continue;

    // Scan horizontal
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col <= boardSize - recipeLen; col++) {
        const window: (SymbolId | null)[] = [];
        for (let i = 0; i < recipeLen; i++) window.push(grid[row][col + i]);
        if (isRecipeMatch(window, recipe)) {
          const cells: [number, number][] = [];
          for (let i = 0; i < recipeLen; i++) cells.push([row, col + i]);
          // Find the on_match score_bonus for this recipe
          const bonus = getRecipeBonus(definerDef, recipe);
          const baseScore = (scoreValues.get(definer) ?? 0) * recipeLen * lengthMultiplier(recipeLen);
          matches.push({
            cells, symbol: definer, length: recipeLen,
            score: baseScore + bonus,
            isRecipe: true, recipeDefiner: definer,
          });
        }
      }
    }

    // Scan vertical
    for (let col = 0; col < boardSize; col++) {
      for (let row = 0; row <= boardSize - recipeLen; row++) {
        const window: (SymbolId | null)[] = [];
        for (let i = 0; i < recipeLen; i++) window.push(grid[row + i][col]);
        if (isRecipeMatch(window, recipe)) {
          const cells: [number, number][] = [];
          for (let i = 0; i < recipeLen; i++) cells.push([row + i, col]);
          const bonus = getRecipeBonus(definerDef, recipe);
          const baseScore = (scoreValues.get(definer) ?? 0) * recipeLen * lengthMultiplier(recipeLen);
          matches.push({
            cells, symbol: definer, length: recipeLen,
            score: baseScore + bonus,
            isRecipe: true, recipeDefiner: definer,
          });
        }
      }
    }
  }

  return matches;
}

/** Check if a window of symbols matches a recipe (any order) */
function isRecipeMatch(window: (SymbolId | null)[], recipe: SymbolId[]): boolean {
  if (window.length !== recipe.length) return false;
  if (window.some(s => s === null || s === 'wall')) return false;

  const sorted = [...window].sort();
  const recipeSorted = [...recipe].sort();
  return sorted.every((s, i) => s === recipeSorted[i]);
}

/** Get the score_bonus from a recipe_match ability */
function getRecipeBonus(def: SymbolDef, recipe: SymbolId[]): number {
  for (const ability of def.abilities) {
    if (ability.trigger === 'recipe_match' && ability.verb === 'score_bonus') {
      const abilityRecipe = ability.params.recipe;
      if (abilityRecipe && [...abilityRecipe].sort().join() === [...recipe].sort().join()) {
        return ability.params.points ?? 0;
      }
    }
  }
  return 0;
}

// =============================================================================
// ABILITY EVALUATION
// =============================================================================

function emptyEffects(): AbilityEffects {
  return {
    bonusScore: 0,
    freeRespins: 0,
    extraTiles: 0,
    cellsToUnlock: new Set(),
    cellsToClear: new Set(),
    matchMultipliers: [],
  };
}

/**
 * Evaluate on_match abilities for all matches found.
 */
export function evaluateOnMatch(
  matches: Match[],
  grid: Grid,
  loadout: SymbolDef[],
  boardSize: number,
): AbilityEffects {
  const effects = emptyEffects();
  const loadoutMap = new Map(loadout.map(s => [s.id, s]));

  for (const match of matches) {
    // Recipe matches only trigger the definer's on_match (already scored in findMatches)
    const symbolId = match.isRecipe ? match.recipeDefiner! : match.symbol;
    const def = loadoutMap.get(symbolId);
    if (!def) continue;

    for (const ability of def.abilities) {
      if (ability.trigger !== 'on_match') continue;

      switch (ability.verb) {
        case 'score_bonus':
          effects.bonusScore += ability.params.points ?? 0;
          break;

        case 'score_multiplier': {
          // e.g., Jam: 3x cherry matches in same row/col
          const factor = ability.params.factor ?? 1;
          const target = ability.params.targetSymbol;
          if (target && ability.params.scope === 'cross') {
            // Apply to all matches of targetSymbol in same row or column as this match
            for (const [r, c] of match.cells) {
              effects.matchMultipliers.push({
                matchSymbol: target, scope: 'cross',
                sourceRow: r, sourceCol: c, factor,
              });
            }
          }
          break;
        }

        case 'free_respin':
          effects.freeRespins += ability.params.count ?? 1;
          break;

        case 'unlock': {
          if (ability.params.scope === 'cross') {
            // Unlock all cells in same row and column as each cell of the match
            for (const [r, c] of match.cells) {
              for (let i = 0; i < boardSize; i++) {
                effects.cellsToUnlock.add(`${r},${i}`);
                effects.cellsToUnlock.add(`${i},${c}`);
              }
            }
          }
          break;
        }

        case 'clear': {
          if (ability.params.scope === 'adjacent') {
            const dirs: [number, number][] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            for (const [r, c] of match.cells) {
              for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
                  effects.cellsToClear.add(`${nr},${nc}`);
                }
              }
              // Clear self too
              effects.cellsToClear.add(`${r},${c}`);
            }
          }
          break;
        }

        case 'extra_tiles':
          effects.extraTiles += ability.params.count ?? 0;
          break;
      }
    }
  }

  return effects;
}

/**
 * Evaluate on_place abilities when a tile is placed.
 */
export function evaluateOnPlace(
  symbolId: SymbolId,
  row: number,
  col: number,
  grid: Grid,
  loadout: SymbolDef[],
): AbilityEffects {
  const effects = emptyEffects();
  const def = loadout.find(s => s.id === symbolId);
  if (!def) return effects;

  for (const ability of def.abilities) {
    if (ability.trigger !== 'on_place') continue;

    switch (ability.verb) {
      case 'score_bonus':
        effects.bonusScore += ability.params.points ?? 0;
        break;
      case 'place_on_wall':
        // Handled by placement logic — this just flags the capability
        break;
    }
  }

  return effects;
}

/**
 * Evaluate on_adjacent_match abilities.
 * For each match, check cells adjacent to the match for symbols with on_adjacent_match.
 */
export function evaluateOnAdjacentMatch(
  matches: Match[],
  grid: Grid,
  loadout: SymbolDef[],
  boardSize: number,
): AbilityEffects {
  const effects = emptyEffects();
  const loadoutMap = new Map(loadout.map(s => [s.id, s]));

  // Collect all cells that are part of any match
  const matchCells = new Set<string>();
  for (const match of matches) {
    for (const [r, c] of match.cells) matchCells.add(`${r},${c}`);
  }

  // For each match, find adjacent non-match cells and check for on_adjacent_match
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const processed = new Set<string>(); // avoid double-triggering

  for (const match of matches) {
    for (const [r, c] of match.cells) {
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) continue;
        const key = `${nr},${nc}`;
        if (matchCells.has(key) || processed.has(key)) continue;

        const adjSymbol = grid[nr][nc];
        if (!adjSymbol || adjSymbol === 'wall') continue;

        const adjDef = loadoutMap.get(adjSymbol);
        if (!adjDef) continue;

        for (const ability of adjDef.abilities) {
          if (ability.trigger !== 'on_adjacent_match') continue;

          processed.add(key);
          switch (ability.verb) {
            case 'score_bonus':
              effects.bonusScore += ability.params.points ?? 0;
              break;
            case 'score_multiplier': {
              const factor = ability.params.factor ?? 1;
              const target = ability.params.targetSymbol;
              if (target && match.symbol === target) {
                effects.bonusScore += match.score * (factor - 1); // additive bonus
              }
              break;
            }
            case 'free_respin':
              effects.freeRespins += ability.params.count ?? 1;
              break;
          }
        }
      }
    }
  }

  return effects;
}

/**
 * Evaluate on_respin abilities when a respin hits a row or column.
 */
export function evaluateOnRespin(
  type: 'row' | 'col',
  index: number,
  grid: Grid,
  loadout: SymbolDef[],
  boardSize: number,
): AbilityEffects {
  const effects = emptyEffects();
  const loadoutMap = new Map(loadout.map(s => [s.id, s]));

  // Check each cell in the respun line
  for (let i = 0; i < boardSize; i++) {
    const r = type === 'row' ? index : i;
    const c = type === 'row' ? i : index;
    const symbol = grid[r][c];
    if (!symbol || symbol === 'wall') continue;

    const def = loadoutMap.get(symbol);
    if (!def) continue;

    for (const ability of def.abilities) {
      if (ability.trigger !== 'on_respin') continue;

      switch (ability.verb) {
        case 'score_bonus':
          effects.bonusScore += ability.params.points ?? 0;
          break;
        case 'free_respin':
          effects.freeRespins += ability.params.count ?? 1;
          break;
      }
    }
  }

  return effects;
}

/**
 * Apply score multipliers from match abilities (e.g., Jam's 3x cherry in same row/col).
 * Returns the total additional score from multipliers.
 */
export function applyMatchMultipliers(
  matches: Match[],
  multipliers: AbilityEffects['matchMultipliers'],
): number {
  let bonus = 0;

  for (const mult of multipliers) {
    for (const match of matches) {
      if (match.symbol !== mult.matchSymbol) continue;

      // Check if the match is in the same row or column as the multiplier source
      const inSameRow = match.cells.some(([r]) => r === mult.sourceRow);
      const inSameCol = match.cells.some(([, c]) => c === mult.sourceCol);

      if (inSameRow || inSameCol) {
        // Multiplier applies: add (factor - 1) * score as bonus
        // (the base 1x is already in match.score)
        bonus += match.score * (mult.factor - 1);
      }
    }
  }

  return bonus;
}

/**
 * Calculate total score for a grid with full ability evaluation.
 */
export function calculateScoreWithAbilities(
  grid: Grid,
  loadout: SymbolDef[],
  boardSize: number,
): { score: number; matches: Match[]; effects: AbilityEffects } {
  const matches = findMatchesWithAbilities(grid, loadout, boardSize);
  const baseScore = matches.reduce((sum, m) => sum + m.score, 0);

  const onMatchEffects = evaluateOnMatch(matches, grid, loadout, boardSize);
  const adjEffects = evaluateOnAdjacentMatch(matches, grid, loadout, boardSize);

  const multiplierBonus = applyMatchMultipliers(matches, onMatchEffects.matchMultipliers);

  // Merge effects
  const effects: AbilityEffects = {
    bonusScore: onMatchEffects.bonusScore + adjEffects.bonusScore + multiplierBonus,
    freeRespins: onMatchEffects.freeRespins + adjEffects.freeRespins,
    extraTiles: onMatchEffects.extraTiles + adjEffects.extraTiles,
    cellsToUnlock: new Set([...onMatchEffects.cellsToUnlock, ...adjEffects.cellsToUnlock]),
    cellsToClear: new Set([...onMatchEffects.cellsToClear, ...adjEffects.cellsToClear]),
    matchMultipliers: onMatchEffects.matchMultipliers,
  };

  return {
    score: baseScore + effects.bonusScore,
    matches,
    effects,
  };
}

/**
 * Check if a symbol has the place_on_wall ability.
 */
export function canPlaceOnWall(symbolId: SymbolId, loadout: SymbolDef[]): boolean {
  const def = loadout.find(s => s.id === symbolId);
  if (!def) return false;
  return def.abilities.some(a => a.trigger === 'on_place' && a.verb === 'place_on_wall');
}
