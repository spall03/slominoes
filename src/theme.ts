// src/theme.ts

export const colors = {
  bg: '#060614',
  surface: '#111127',
  cell: '#161630',
  gridBg: '#0a0a1e',
  border: '#1e1e3a',
  hudBg: '#0d0d20',
  cyan: '#00E5FF',
  pink: '#FF3B82',
  gold: '#ffd700',
  lime: '#BFFF00',
  orange: '#FF8C00',
  red: '#FF4444',
  indigo: '#5c6bc0',
  respin: '#e74c6f',
  textPrimary: '#ffffff',
  textMuted: '#888888',
  textDim: '#555555',
  textSubtle: '#444444',

  // Cell state colors
  cellFilled: '#1a1a36',
  cellFilledBorder: '#2a2a50',
  cellWall: '#0e0e1e',
  cellWallBorder: '#141428',
  cellGridBorder: '#141430',

  // Transparent overlays
  cyanTint: 'rgba(0,229,255,0.08)',
  cyanBorder: 'rgba(0,229,255,0.4)',
  goldTint: 'rgba(255,215,0,0.15)',
  goldBorder: 'rgba(255,215,0,0.5)',
  indigoTint: 'rgba(92,107,192,0.1)',
  indigoBorder: 'rgba(92,107,192,0.4)',
  respinTint: 'rgba(231,76,111,0.1)',
  respinBorder: 'rgba(231,76,111,0.5)',

  // Locked cell colors
  cellLocked: '#1a1a2e',
  cellLockedBorder: 'rgba(255,215,0,0.35)',
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
