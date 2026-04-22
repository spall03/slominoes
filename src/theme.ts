// src/theme.ts

export const colors = {
  // ============================================================
  // ACCENT — used sparingly, always carries meaning
  // ============================================================
  cyan:    '#00E5FF',  // action / selection / primary / WIN-adjacent actions
  gold:    '#FFD700',  // value / score / locked / VICTORY
  // ============================================================
  // SEMANTIC — reserve for single meaning only
  // ============================================================
  pink:    '#FF3B82',  // loss / danger in UI chrome only
  //                      (cherry symbol keeps its own pink fill on the glyph)

  // ============================================================
  // NEUTRALS (workhorses — the new default for UI chrome)
  // ============================================================
  bg:      '#060614',
  surface: '#0d0d20',  // chrome surface (was hudBg)
  surface2:'#111127',  // raised surface for cards / pills (was surface)
  line:    '#1e1e3a',  // default border / divider (was border)
  line2:   '#2a2a50',  // stronger divider / filled-cell border
  ink:     '#e8e8f2',  // primary text
  inkDim:  '#9a9ab0',  // secondary text / muted content
  inkMute: '#60607a',  // tertiary text / disabled / flavor

  // ============================================================
  // LEGACY ALIASES (pre-audit tokens that still appear in code)
  // Values aligned to the new palette so behavior is preserved
  // without requiring every component to migrate at once.
  // ============================================================
  border:       '#1e1e3a',  // = line
  hudBg:        '#0d0d20',  // = surface
  textPrimary:  '#e8e8f2',  // = ink
  textMuted:    '#9a9ab0',  // = inkDim
  textDim:      '#60607a',  // = inkMute
  textSubtle:   '#60607a',  // = inkMute

  // ============================================================
  // TRANSPARENT OVERLAYS
  // ============================================================
  cyanTint:   'rgba(0,229,255,0.08)',
  cyanWash:   'rgba(0,229,255,0.15)',  // for reachable-cell overlay (audit Move 01)
  cyanBorder: 'rgba(0,229,255,0.4)',
  goldTint:   'rgba(255,215,0,0.15)',
  goldBorder: 'rgba(255,215,0,0.5)',
  pinkTint:   'rgba(255,59,130,0.1)',   // for danger / respin-armed wash
  pinkBorder: 'rgba(255,59,130,0.5)',   // for respin-armed outline (state, not hue)

  // ============================================================
  // CELL STATES
  // ============================================================
  cell:              '#161630',
  gridBg:            '#0a0a1e',
  cellFilled:        '#1a1a36',
  cellFilledBorder:  '#2a2a50',
  cellWall:          '#0e0e1e',
  cellWallBorder:    '#141428',
  cellGridBorder:    '#141430',
  cellLocked:        '#1a1a2e',
  cellLockedBorder:  'rgba(255,215,0,0.35)',  // locked stays gold — matches "value" hue

  // ============================================================
  // SYMBOL GLYPH COLORS (referenced by symbolColors below; safe
  // on the glyphs themselves, not UI chrome)
  // ============================================================
  lime:   '#BFFF00',  // lemon
  orange: '#FF8C00',  // bell
  red:    '#FF4444',  // bar
};

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  semiBold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
};

export const symbolColors: Record<string, string> = {
  cherry: colors.pink,
  lemon: colors.lime,
  bar: colors.red,
  bell: colors.orange,
  seven: colors.cyan,
  wall: '#333355',
  jam: '#E040A0',
  apple: '#44CC44',
  magnet: '#8888FF',
  oil_can: '#FFB020',
  crown: '#FFD700',
  bomb: '#FF4444',
  egg: '#FFFACD',
  compass: '#40E0D0',
  vine: '#22BB44',
  ghost: '#BBBBFF',
  honey: '#FFAA00',
  tide: '#4488FF',
  coral: '#FF7766',
  ember: '#FF6600',
  banana: '#FFE135',
};
