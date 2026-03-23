// src/config.ts
// Playtest config — tweak these values to tune the game feel

export const CONFIG = {
  BOARD_SIZE: 10,
  TILES_PER_BATCH: 6,
  NUM_BATCHES: 4,
  SYMBOL_COUNT: 5,
  SYMBOL_WEIGHTS: [5, 4, 3, 2, 1],
  MIN_MATCH_LENGTH: 3,
  THRESHOLD: 2000,
  ENTRY_SPOT_COUNT: 2,
  WALL_COUNT: 0,

  // Animation timing
  SPIN_MS_PER_SYMBOL: 40,
  SPIN_STAGGER_MS: 80,
  SPIN_BASE_CYCLES: 2,
  PROPAGATION_PAUSE_MS: 400,
};
