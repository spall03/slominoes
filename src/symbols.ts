// src/symbols.ts
// Symbol ability system — data model and roster definitions.

// =============================================================================
// TYPES
// =============================================================================

/** All possible symbol IDs (base + unlockable) */
export type SymbolId =
  | 'cherry' | 'lemon' | 'bar' | 'bell' | 'seven'
  | 'jam' | 'apple' | 'magnet' | 'oil_can' | 'crown'
  | 'bomb' | 'egg' | 'compass' | 'vine'
  | 'ghost' | 'honey'
  | 'tide' | 'coral' | 'ember' | 'banana'
  | 'wall';

/** Triggers — when an ability fires */
export type Trigger =
  | 'on_match'
  | 'on_place'
  | 'on_respin'
  | 'on_adjacent_match'
  | 'passive'
  | 'wild_match'
  | 'recipe_match';

/** Verbs — what an ability does */
export type Verb =
  | 'score_bonus'
  | 'score_multiplier'
  | 'score_penalty'
  | 'free_respin'
  | 'lock'
  | 'unlock'
  | 'convert'
  | 'clear'
  | 'duplicate'
  | 'frequency_modifier'
  | 'respin_cost_reduction'
  | 'extra_tiles'
  | 'extra_slots'
  | 'extra_entry_spots'
  | 'place_on_wall'
  | 'no_lock'
  | 'score_per_empty_cell'
  | 'score_per_unique_adjacent'
  | 'respin_match_bonus';

/** Scope for score modifiers */
export type Scope = 'self' | 'adjacent' | 'row' | 'col' | 'cross' | 'all' | 'all_other';

/** A single ability on a symbol */
export interface Ability {
  trigger: Trigger;
  verb: Verb;
  params: AbilityParams;
  /** Human-readable description for UI */
  description: string;
}

/** Parameters vary by verb */
export interface AbilityParams {
  /** Flat score bonus/penalty */
  points?: number;
  /** Multiplier factor */
  factor?: number;
  /** Target scope */
  scope?: Scope;
  /** Target symbol for convert, frequency_modifier, score_multiplier, etc. */
  targetSymbol?: SymbolId;
  /** For recipe_match: the exact set of symbols required */
  recipe?: SymbolId[];
  /** For wild_match: symbols this can substitute for */
  wildWith?: SymbolId[];
  /** For frequency_modifier */
  amount?: number;
  /** Count for respins, tiles, slots, entry spots */
  count?: number;
  /** Percentage for reductions/penalties */
  percent?: number;
  /** Sides for entry spots */
  sides?: ('north' | 'south' | 'east' | 'west')[];
}

/** Full symbol definition */
export interface SymbolDef {
  id: SymbolId;
  name: string;
  matchLength: number;
  scoreValue: number;
  frequency: number;
  abilities: Ability[];
  /** Is this a base symbol (always available) or unlockable? */
  base: boolean;
}

// =============================================================================
// ROSTER
// =============================================================================

export const SYMBOL_ROSTER: SymbolDef[] = [
  // --- Base symbols (no abilities) ---
  {
    id: 'cherry', name: 'Cherry', matchLength: 3, scoreValue: 10, frequency: 5,
    abilities: [], base: true,
  },
  {
    id: 'lemon', name: 'Lemon', matchLength: 3, scoreValue: 20, frequency: 4,
    abilities: [], base: true,
  },
  {
    id: 'bar', name: 'Bar', matchLength: 3, scoreValue: 40, frequency: 3,
    abilities: [], base: true,
  },
  {
    id: 'bell', name: 'Bell', matchLength: 3, scoreValue: 80, frequency: 2,
    abilities: [], base: true,
  },
  {
    id: 'seven', name: 'Seven', matchLength: 3, scoreValue: 150, frequency: 1,
    abilities: [], base: true,
  },

  // --- Unlockable symbols ---
  {
    id: 'jam', name: 'Jam', matchLength: 3, scoreValue: 25, frequency: 3,
    abilities: [
      {
        trigger: 'on_match',
        verb: 'score_multiplier',
        params: { factor: 2, targetSymbol: 'cherry', scope: 'cross' },
        description: '2x score for cherry matches in the same row or column',
      },
    ],
    base: false,
  },
  {
    id: 'apple', name: 'Apple', matchLength: 3, scoreValue: 10, frequency: 2,
    abilities: [
      {
        trigger: 'wild_match',
        verb: 'score_bonus',
        params: { wildWith: ['cherry', 'lemon'], points: 0 },
        description: 'Can match with cherries and lemons',
      },
      {
        trigger: 'recipe_match',
        verb: 'score_bonus',
        params: { recipe: ['apple', 'cherry', 'lemon'], points: 200 },
        description: 'Apple + Cherry + Lemon in a line = Fruit Salad (+200)',
      },
    ],
    base: false,
  },
  {
    id: 'magnet', name: 'Magnet', matchLength: 3, scoreValue: 0, frequency: 3,
    abilities: [
      {
        trigger: 'passive',
        verb: 'frequency_modifier',
        params: { targetSymbol: 'bell', amount: 2 },
        description: 'Bell frequency +2',
      },
      {
        trigger: 'passive',
        verb: 'frequency_modifier',
        params: { targetSymbol: 'seven', amount: 1 },
        description: 'Seven frequency +1',
      },
    ],
    base: false,
  },
  {
    id: 'oil_can', name: 'Oil Can', matchLength: 1, scoreValue: 40, frequency: 1,
    abilities: [
      {
        trigger: 'on_match',
        verb: 'unlock',
        params: { scope: 'cross' },
        description: 'Unlock all locked cells in the same row and column',
      },
    ],
    base: false,
  },
  {
    id: 'crown', name: 'Crown', matchLength: 3, scoreValue: 20, frequency: 4,
    abilities: [
      {
        trigger: 'passive',
        verb: 'extra_slots',
        params: { count: 2 },
        description: '+2 symbol selection slots',
      },
    ],
    base: false,
  },
  {
    id: 'bomb', name: 'Bomb', matchLength: 2, scoreValue: 20, frequency: 2,
    abilities: [
      {
        trigger: 'on_match',
        verb: 'clear',
        params: { scope: 'adjacent' },
        description: 'Clear all unlocked adjacent cells and self on match',
      },
    ],
    base: false,
  },
  {
    id: 'egg', name: 'Egg', matchLength: 4, scoreValue: 30, frequency: 3,
    abilities: [
      {
        trigger: 'on_match',
        verb: 'extra_tiles',
        params: { count: 3 },
        description: '+3 tiles added to queue on match',
      },
    ],
    base: false,
  },
  {
    id: 'compass', name: 'Compass', matchLength: 3, scoreValue: 5, frequency: 2,
    abilities: [
      {
        trigger: 'passive',
        verb: 'extra_entry_spots',
        params: { count: 1, sides: ['east', 'west'] },
        description: '+1 entry spot on west or east side',
      },
    ],
    base: false,
  },
  {
    id: 'vine', name: 'Vine', matchLength: 3, scoreValue: 35, frequency: 2,
    abilities: [
      {
        trigger: 'on_place',
        verb: 'place_on_wall',
        params: {},
        description: 'Can be placed on wall cells, replacing the wall',
      },
      {
        trigger: 'on_match',
        verb: 'score_bonus',
        params: { points: 50 },
        description: '+50 bonus on match',
      },
    ],
    base: false,
  },
  {
    id: 'ghost', name: 'Ghost', matchLength: 3, scoreValue: 30, frequency: 2,
    abilities: [
      {
        trigger: 'passive',
        verb: 'no_lock',
        params: {},
        description: 'Ghost cells don\'t lock when matched — stays respinnable',
      },
    ],
    base: false,
  },
  {
    id: 'honey', name: 'Honey', matchLength: 2, scoreValue: 15, frequency: 3,
    abilities: [
      {
        trigger: 'on_adjacent_match',
        verb: 'score_bonus',
        params: { points: 30 },
        description: '+30 when any adjacent match forms',
      },
    ],
    base: false,
  },
  {
    id: 'tide', name: 'Tide', matchLength: 3, scoreValue: 10, frequency: 2,
    abilities: [
      {
        trigger: 'on_match',
        verb: 'score_per_empty_cell',
        params: { points: 5 },
        description: '+5 bonus per empty cell on the board when matched',
      },
    ],
    base: false,
  },
  {
    id: 'coral', name: 'Coral', matchLength: 2, scoreValue: 15, frequency: 3,
    abilities: [
      {
        trigger: 'on_match',
        verb: 'score_per_unique_adjacent',
        params: { points: 20 },
        description: '+20 for each unique symbol type adjacent to the match',
      },
    ],
    base: false,
  },
  {
    id: 'ember', name: 'Ember', matchLength: 2, scoreValue: 20, frequency: 2,
    abilities: [
      {
        trigger: 'passive',
        verb: 'respin_match_bonus',
        params: { points: 40 },
        description: '+40 whenever a respin creates a new match',
      },
    ],
    base: false,
  },
  {
    id: 'banana', name: 'Banana', matchLength: 3, scoreValue: 20, frequency: 3,
    abilities: [
      {
        trigger: 'wild_match',
        verb: 'score_bonus',
        params: { wildWith: ['cherry', 'lemon', 'apple'], points: 0 },
        description: 'Can match with cherries, lemons, and apples',
      },
      {
        trigger: 'recipe_match',
        verb: 'score_bonus',
        params: { recipe: ['banana', 'apple', 'cherry', 'lemon'], points: 400 },
        description: 'Banana + Apple + Cherry + Lemon = Grand Salad (+400)',
      },
    ],
    base: false,
  },
];

// =============================================================================
// HELPERS
// =============================================================================

/** Get a symbol definition by ID */
export function getSymbolDef(id: SymbolId): SymbolDef | undefined {
  return SYMBOL_ROSTER.find(s => s.id === id);
}

/** Get all base symbols */
export function getBaseSymbols(): SymbolDef[] {
  return SYMBOL_ROSTER.filter(s => s.base);
}

/** Get all unlockable symbols */
export function getUnlockableSymbols(): SymbolDef[] {
  return SYMBOL_ROSTER.filter(s => !s.base);
}

/**
 * Build the effective frequency table for a loadout, applying passive
 * frequency_modifier abilities.
 */
export function buildFrequencyTable(loadout: SymbolDef[]): Map<SymbolId, number> {
  const freqs = new Map<SymbolId, number>();

  // Start with base frequencies
  for (const sym of loadout) {
    freqs.set(sym.id, sym.frequency);
  }

  // Apply passive frequency modifiers
  for (const sym of loadout) {
    for (const ability of sym.abilities) {
      if (ability.trigger === 'passive' && ability.verb === 'frequency_modifier') {
        const target = ability.params.targetSymbol;
        const amount = ability.params.amount ?? 0;
        if (target && freqs.has(target)) {
          freqs.set(target, Math.max(0, (freqs.get(target) ?? 0) + amount));
        }
      }
    }
  }

  return freqs;
}

/**
 * Get the effective score value for a symbol, applying passive score_penalty
 * from other symbols in the loadout.
 */
export function getEffectiveScoreValue(symbolId: string, loadout: SymbolDef[]): number {
  const def = loadout.find(s => s.id === symbolId);
  if (!def) return 0;

  let value = def.scoreValue;

  // Apply score_penalty from other symbols
  for (const other of loadout) {
    if (other.id === symbolId) continue;
    for (const ability of other.abilities) {
      if (ability.trigger === 'passive' && ability.verb === 'score_penalty' && ability.params.scope === 'all_other') {
        const pct = ability.params.percent ?? 0;
        value *= (1 - pct / 100);
      }
    }
  }

  return Math.round(value);
}

/**
 * Get the match length for a symbol (from its definition).
 */
export function getMatchLength(symbolId: string, loadout: SymbolDef[]): number {
  const def = loadout.find(s => s.id === symbolId);
  return def?.matchLength ?? 3;
}

/**
 * Get the number of selection slots for a loadout (default 5, modified by passives).
 */
export function getSelectionSlots(loadout: SymbolDef[]): number {
  let slots = 5;
  for (const sym of loadout) {
    for (const ability of sym.abilities) {
      if (ability.trigger === 'passive' && ability.verb === 'extra_slots') {
        slots += ability.params.count ?? 0;
      }
    }
  }
  return slots;
}

/**
 * Get the number of entry spots for a loadout (default 2, modified by passives).
 */
export function getEntrySpotCount(loadout: SymbolDef[]): number {
  let count = 2;
  for (const sym of loadout) {
    for (const ability of sym.abilities) {
      if (ability.trigger === 'passive' && ability.verb === 'extra_entry_spots') {
        count += ability.params.count ?? 0;
      }
    }
  }
  return count;
}

/**
 * Check if a loadout contains recipe_match definitions, and return them.
 */
export function getRecipeMatches(loadout: SymbolDef[]): { definer: SymbolId; recipe: SymbolId[] }[] {
  const recipes: { definer: SymbolId; recipe: SymbolId[] }[] = [];
  for (const sym of loadout) {
    for (const ability of sym.abilities) {
      if (ability.trigger === 'recipe_match' && ability.params.recipe) {
        recipes.push({ definer: sym.id, recipe: ability.params.recipe });
      }
    }
  }
  return recipes;
}

/**
 * Get the respin match bonus for a loadout (from passive respin_match_bonus abilities).
 */
export function getRespinMatchBonus(loadout: SymbolDef[]): number {
  let bonus = 0;
  for (const sym of loadout) {
    for (const ability of sym.abilities) {
      if (ability.trigger === 'passive' && ability.verb === 'respin_match_bonus') {
        bonus += ability.params.points ?? 0;
      }
    }
  }
  return bonus;
}

/**
 * Check if a symbol has the no_lock passive (e.g., ghost).
 */
export function hasNoLock(symbolId: string, loadout: SymbolDef[]): boolean {
  const def = loadout.find(s => s.id === symbolId);
  if (!def) return false;
  return def.abilities.some(a => a.trigger === 'passive' && a.verb === 'no_lock');
}
