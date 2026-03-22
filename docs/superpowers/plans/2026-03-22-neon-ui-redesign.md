# Neon UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace emoji/purple-grey visual language with neon cyberpunk aesthetic using SVG symbols, refactored file structure, Space Grotesk font, and new color palette.

**Architecture:** Extract ~2900-line App.tsx into focused modules under `src/`. Replace emoji text rendering with `react-native-svg` components. Apply neon color palette from design system in `assets/symbols/preview.html`. All game logic extracted unchanged — this is a pure visual/structural refactor.

**Tech Stack:** React Native + Expo, Zustand, react-native-svg, @expo-google-fonts/space-grotesk, TypeScript

---

### Task 1: Install Dependencies & Create File Scaffolding

**Files:**
- Modify: `package.json`
- Create: `src/types.ts`
- Create: `src/constants.ts`
- Create: `src/theme.ts`

- [ ] **Step 1: Install new dependencies**

Run:
```bash
cd /Users/spall03/slominoes
npx expo install react-native-svg @expo-google-fonts/space-grotesk expo-font expo-linear-gradient
```

- [ ] **Step 2: Create `src/types.ts`**

Extract all type definitions from App.tsx:

```typescript
// src/types.ts

export type Symbol = 'cherry' | 'lemon' | 'bar' | 'bell' | 'seven' | 'wall';

export interface EntrySpot {
  id: number;
  label: string;
  cells: [number, number][];
  arrowDirection: 'down' | 'up' | 'left' | 'right';
}

export interface ObstacleCell {
  row: number;
  col: number;
  symbol: Symbol | 'wall';
}

export interface LevelConfig {
  level: number;
  threshold: number;
  respins: number;
  tilesPerLevel: number;
  symbolCount: number;
  obstacles: ObstacleCell[];
  entrySpotCount: number;
  boardMask: boolean[][] | null;
}

export interface Tile {
  id: string;
  symbolA: Symbol;
  symbolB: Symbol;
}

export type Grid = (Symbol | null)[][];

export type Rotation = 0 | 1 | 2 | 3;

export interface Match {
  cells: [number, number][];
  symbol: Symbol;
  length: number;
  score: number;
}

export interface ScorePopup {
  id: string;
  score: number;
  row: number;
  col: number;
}

export type GamePhase = 'placing' | 'ended';
export type GameResult = 'win' | 'lose' | null;
export type PlacementMode = 'idle' | 'placed';
export type RunPhase = 'title' | 'levelPreview' | 'playing' | 'gameOver';
```

- [ ] **Step 3: Create `src/constants.ts`**

Extract all constants from App.tsx:

```typescript
// src/constants.ts
import { Dimensions, Platform } from 'react-native';

export const BOARD_SIZE = 8;
export const TILES_PER_LEVEL = 16;
export const RESPINS_PER_LEVEL = 5;
export const WIN_THRESHOLD = 3000;
export const MIN_MATCH_LENGTH = 3;

export const WALL_SCALAR = 1.5;
export const SCORE_COEFFICIENT = 30;
export const LEVEL_SCALAR_MAX = 2.2;
export const NUM_LEVELS = 10;

export const LENGTH_MULTIPLIERS: Record<number, number> = { 3: 1, 4: 2, 5: 3 };
export const MAX_LENGTH_MULTIPLIER = 4;

export const CELL_MARGIN = 1;
export const GRID_PADDING = 4;

const _screenWidth = Dimensions.get('window').width;
// Total width = GRID_PADDING*2 + 9*(CELL_SIZE + CELL_MARGIN*2) + 4(gap) + 16(outer margin)
export const CELL_SIZE = _screenWidth < 500
  ? Math.floor((_screenWidth - GRID_PADDING * 2 - 4 - 16) / 9 - CELL_MARGIN * 2)
  : 40;
export const CELL_TOTAL = CELL_SIZE + CELL_MARGIN * 2;

export const isMobile = Platform.OS !== 'web' || _screenWidth < 700;

import type { Symbol } from './types';

export const SYMBOLS: Symbol[] = ['cherry', 'lemon', 'bar', 'bell', 'seven'];

export const SYMBOL_VALUES: Record<Symbol, number> = {
  cherry: 10,
  lemon: 20,
  bar: 40,
  bell: 80,
  seven: 150,
  wall: 0,
};

export const SYMBOL_WEIGHTS: number[] = [5, 4, 3, 2, 1];
```

- [ ] **Step 4: Create `src/theme.ts`**

New neon color palette, typography, and shared style helpers:

```typescript
// src/theme.ts
import { StyleSheet } from 'react-native';

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
};

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  semiBold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
};

// Symbol color mapping for use in SVG components
export const symbolColors: Record<string, string> = {
  cherry: colors.pink,
  lemon: colors.lime,
  bar: colors.red,
  bell: colors.orange,
  seven: colors.cyan,
  wall: '#333355',
};
```

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/constants.ts src/theme.ts package.json package-lock.json
git commit -m "feat: add dependencies and create foundational modules (types, constants, theme)"
```

---

### Task 2: Create SVG Symbol Components

**Files:**
- Create: `src/symbols/Cherry.tsx`
- Create: `src/symbols/Lemon.tsx`
- Create: `src/symbols/Bar.tsx`
- Create: `src/symbols/Bell.tsx`
- Create: `src/symbols/Seven.tsx`
- Create: `src/symbols/Wall.tsx`
- Create: `src/symbols/Arrow.tsx`
- Create: `src/symbols/RespinRow.tsx`
- Create: `src/symbols/RespinCol.tsx`
- Create: `src/symbols/Help.tsx`
- Create: `src/symbols/Star.tsx`
- Create: `src/symbols/Logo.tsx`
- Create: `src/symbols/Domino.tsx`
- Create: `src/symbols/index.ts`

Port each SVG to `react-native-svg` components. Reference the SVG source files in `assets/symbols/*.svg` for exact paths and coordinates — these files already exist in the repo. Each component takes a `size` prop.

- [ ] **Step 1: Create Cherry.tsx**

```tsx
// src/symbols/Cherry.tsx
import React from 'react';
import Svg, { Defs, Filter, FeGaussianBlur, FeColorMatrix, FeMerge, FeMergeNode, G, Path, Circle } from 'react-native-svg';

interface Props { size?: number; }

export function Cherry({ size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G fill="none" stroke="#FF3B82" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M28 24 Q30 14 36 10" />
        <Path d="M36 24 Q34 14 36 10" />
        <Path d="M36 10 Q42 8 40 14" />
        <Circle cx={24} cy={38} r={10} />
        <Circle cx={40} cy={38} r={10} />
        <Path d="M28 24 C26 28 24 30 24 32" />
        <Path d="M36 24 C38 28 40 30 40 32" />
      </G>
    </Svg>
  );
}
```

Note: SVG filters (`feGaussianBlur`, `feColorMatrix`) are not supported in `react-native-svg`. The glow effect will only render when viewing the raw `.svg` files in a browser. The React Native SVG components render the crisp stroked shapes — which still look good on the dark background. If we want glow on web, we can add CSS `filter: drop-shadow()` via a wrapper View style. This is acceptable.

- [ ] **Step 2: Create remaining symbol components**

Follow the same pattern for each. Port the exact SVG paths from `assets/symbols/`:

- `Lemon.tsx` — stroke `#BFFF00`, ellipse body + nub + segment lines
- `Bar.tsx` — stroke `#FF4444`, double rect frame + B/A/R letter paths
- `Bell.tsx` — stroke `#FF8C00`, bell body + knob + clapper + detail arc
- `Seven.tsx` — stroke `#00E5FF`, top bar + diagonal + cross bar + serif
- `Wall.tsx` — stroke `#333355`, brick pattern (3 rows of offset rectangles)

Each takes `{ size?: number }` prop, defaults to 64.

- [ ] **Step 3: Create Arrow.tsx**

Parameterized by direction:

```tsx
// src/symbols/Arrow.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

interface Props { direction: 'down' | 'up' | 'left' | 'right'; size?: number; }

const PATHS: Record<string, string> = {
  down: 'M16 20 L32 44 L48 20',
  up: 'M16 44 L32 20 L48 44',
  left: 'M44 16 L20 32 L44 48',
  right: 'M20 16 L44 32 L20 48',
};

export function Arrow({ direction, size = 64 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d={PATHS[direction]} fill="none" stroke={colors.indigo} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
```

- [ ] **Step 4: Create RespinRow.tsx and RespinCol.tsx**

Port from `assets/symbols/respin-row.svg` and `respin-col.svg`.

- [ ] **Step 5: Create Help.tsx and Star.tsx**

Port from `assets/symbols/help.svg` and `assets/symbols/star.svg`.

- [ ] **Step 6: Create Logo.tsx and Domino.tsx**

Port from `assets/symbols/logo.svg` and `assets/symbols/domino.svg`. Logo uses SVG `<Text>` element — in react-native-svg this is `SvgText` from `react-native-svg`.

- [ ] **Step 7: Create `src/symbols/index.ts` — SymbolIcon mapper**

```tsx
// src/symbols/index.ts
import React from 'react';
import { Cherry } from './Cherry';
import { Lemon } from './Lemon';
import { Bar } from './Bar';
import { Bell } from './Bell';
import { Seven } from './Seven';
import { Wall } from './Wall';
import type { Symbol } from '../types';

const SYMBOL_COMPONENTS: Record<Symbol, React.ComponentType<{ size?: number }>> = {
  cherry: Cherry,
  lemon: Lemon,
  bar: Bar,
  bell: Bell,
  seven: Seven,
  wall: Wall,
};

interface Props {
  symbol: Symbol;
  size?: number;
}

export function SymbolIcon({ symbol, size }: Props) {
  const Component = SYMBOL_COMPONENTS[symbol];
  if (!Component) return null;
  return <Component size={size} />;
}

export { Cherry, Lemon, Bar, Bell, Seven, Wall };
export { Arrow } from './Arrow';
export { RespinRow } from './RespinRow';
export { RespinCol } from './RespinCol';
export { Help } from './Help';
export { Star } from './Star';
export { Logo } from './Logo';
export { Domino } from './Domino';
```

- [ ] **Step 8: Verify SVGs render**

Run: `npx expo start --web`
Create a temporary test: import SymbolIcon in App.tsx and render all 5 symbols. Visually verify they display correctly.

- [ ] **Step 9: Commit**

```bash
git add src/symbols/
git commit -m "feat: add SVG symbol components (cherry, lemon, bar, bell, seven, wall, arrows, logo)"
```

---

### Task 3: Extract Game Logic (Store, Level, Grid Utilities)

**Files:**
- Create: `src/grid.ts`
- Create: `src/level.ts`
- Create: `src/scoring.ts`
- Create: `src/store.ts`

Extract all game logic verbatim from App.tsx. No changes to logic — just move code.

- [ ] **Step 1: Create `src/grid.ts`**

Extract grid utilities:

```typescript
// src/grid.ts
import { BOARD_SIZE } from './constants';
import type { Grid, LevelConfig, Symbol, Rotation, EntrySpot } from './types';

// Copy each function verbatim from App.tsx — search by function name
export function createEmptyGrid(): Grid { /* copy from App.tsx */ }
export function cloneGrid(grid: Grid): Grid { /* copy from App.tsx */ }
export function createGridFromConfig(config: LevelConfig): Grid { /* copy from App.tsx */ }
export function getSecondCellOffset(rotation: Rotation): [number, number] { /* copy from App.tsx */ }
export function getSymbolsForRotation(tile: Tile): [Symbol, Symbol] { /* copy from App.tsx */ }
export function canPlaceTile(grid: Grid, row: number, col: number, rotation: Rotation): boolean { /* copy from App.tsx */ }
export function computeReachableCells(grid: Grid, entrySpot: EntrySpot): Set<string> { /* copy from App.tsx */ }
export function isTilePlacementReachable(reachableSet: Set<string>, row: number, col: number, rotation: Rotation): boolean { /* copy from App.tsx */ }
export function canPlaceTileWithEntry(grid: Grid, row: number, col: number, rotation: Rotation, reachableCells: Set<string> | null): boolean { /* copy from App.tsx */ }
export function anyEntryHasValidPlacement(grid: Grid, entrySpots: EntrySpot[]): boolean { /* copy from App.tsx */ }
```

- [ ] **Step 2: Create `src/level.ts`**

Extract level generation and symbol/tile functions:

```typescript
// src/level.ts
import { BOARD_SIZE, WALL_SCALAR, SCORE_COEFFICIENT, LEVEL_SCALAR_MAX, NUM_LEVELS, RESPINS_PER_LEVEL, TILES_PER_LEVEL, SYMBOLS, SYMBOL_WEIGHTS } from './constants';
import type { LevelConfig, EntrySpot, Symbol, Tile } from './types';

// Copy each function verbatim from App.tsx — search by function name
export function generateLevelConfig(level: number): LevelConfig { /* copy from App.tsx */ }
export function getEntrySpots(count: number): EntrySpot[] { /* copy from App.tsx */ }
export function getLengthMultiplier(length: number): number { /* copy from App.tsx */ }
export function getRandomSymbol(symbolCount?: number): Symbol { /* copy from App.tsx */ }
export function generateTile(id: string, symbolCount?: number): Tile { /* copy from App.tsx */ }
export function generateTileQueue(tilesPerLevel?: number, symbolCount?: number): Tile[] { /* copy from App.tsx */ }
```

- [ ] **Step 3: Create `src/scoring.ts`**

```typescript
// src/scoring.ts
import { BOARD_SIZE, MIN_MATCH_LENGTH, SYMBOL_VALUES } from './constants';
import { getLengthMultiplier } from './level';
import type { Grid, Match } from './types';

// Copy each function verbatim from App.tsx — search by function name
export function findMatches(grid: Grid): Match[] { /* copy from App.tsx */ }
export function calculateScore(grid: Grid): { score: number; matches: Match[] } { /* copy from App.tsx */ }
export function matchKey(m: Match): string { /* copy from App.tsx */ }
```

- [ ] **Step 4: Create `src/store.ts`**

Extract both `useGameStore` and `useRunStore`. **Important:** Do NOT port any dormant roguelike code (relics, coins, shop, `Relic`, `ShopItem`, `ALL_RELICS`, `generateShopItems`, `hasRelic`). The active `RunState` interface and `useRunStore` only include: `runPhase`, `currentLevel`, `levelScore`, `levelConfig`, `bonusRespins`, and their actions (`startRun`, `startLevel`, `completeLevel`, `failLevel`).

```typescript
// src/store.ts
import { create } from 'zustand';
import type { GameState, RunState, ... } from './types';
// ... import all needed functions from grid.ts, level.ts, scoring.ts

// GameState interface + useGameStore: extract from App.tsx function createInitialState()
// and the create<GameState>() block. These are fully active code — copy verbatim.

export const useGameStore = create<GameState>((set, get) => ({
  /* copy active code only — no dormant relic/shop references */
}));

// RunState: only the active fields (runPhase, currentLevel, levelScore, levelConfig, bonusRespins)
// and active actions (startRun, startLevel, completeLevel, failLevel)
export const useRunStore = create<RunState>((set, get) => ({
  /* copy active code only */
}));

// Shared ref for respin mode
export const respinModeRef = { current: false };
```

- [ ] **Step 5: Verify the app still runs**

Run: `npx expo start --web`
The app should compile and function identically. Play one level to verify.

- [ ] **Step 6: Commit**

```bash
git add src/grid.ts src/level.ts src/scoring.ts src/store.ts
git commit -m "feat: extract game logic into src/ modules (grid, level, scoring, store)"
```

---

### Task 4: Create UI Components with Neon Styling

**Files:**
- Create: `src/components/Cell.tsx`
- Create: `src/components/Grid.tsx`
- Create: `src/components/HUD.tsx`
- Create: `src/components/BottomBar.tsx`
- Create: `src/components/ScorePopup.tsx`
- Create: `src/components/HelpPanel.tsx`
- Create: `src/components/EntrySpotButton.tsx`

Each component is extracted from App.tsx and restyled with the neon theme.

- [ ] **Step 1: Create `src/components/Cell.tsx`**

Port the `AnimatedCell` function from App.tsx. Key changes:
- Replace `SYMBOL_DISPLAY[symbol]` text rendering with `<SymbolIcon symbol={symbol} size={cellSize} />`
- Replace `Text` arrow rendering with `<Arrow direction={dir} size={arrowSize} />`
- Apply neon cell state colors from `theme.ts`:
  - Empty: `colors.cell` bg, `colors.border` border
  - Filled: `colors.cellFilled` bg, `colors.cellFilledBorder` border
  - Wall: `colors.cellWall` bg, 0.5 opacity
  - Preview: transparent bg, dashed `colors.gold` border
  - Placed: `colors.cyanTint` bg, `colors.cyanBorder` border
  - Match highlight: `colors.goldTint` bg, `colors.goldBorder` border
  - Reachable: `colors.indigoTint` bg, dashed `colors.indigoBorder` border
- Highlight overlay colors: gold → `colors.gold`, red → `colors.red`, blue → `colors.cyan`

- [ ] **Step 2: Create `src/components/ScorePopup.tsx`**

Port the `ScorePopup` function from App.tsx. Same animation logic, update colors:
- Negative: `colors.red`
- Positive: `'#44ff44'`
- Default: `colors.gold`

- [ ] **Step 3: Create `src/components/EntrySpotButton.tsx`**

Port the `EntrySpotButton` function from App.tsx. Replace text arrows with `<Arrow>` SVG component. Style with neon theme:
- Default: `colors.indigo` bg
- Selected: `colors.gold` bg
- Blocked: `colors.cell` bg, 0.4 opacity

- [ ] **Step 4: Create `src/components/Grid.tsx`**

Port the `GestureGrid` function from App.tsx. This is the largest component — includes:
- Gesture handlers (tap, pan, long press)
- Keyboard controls
- Grid rendering with Cell components
- Entry spot buttons around grid
- Score popups
Apply neon grid styling:
- Grid background: `colors.gridBg`
- Grid border: `colors.cellGridBorder`
- Respin mode border: `colors.respinBorder` at 0.27 opacity

- [ ] **Step 5: Create `src/components/HUD.tsx`**

Port the compact HUD section from `PlayingScreen` in App.tsx. Apply neon styling:
- Background: `colors.hudBg`, border `colors.border`, rounded
- Level: `colors.gold`, font bold
- Score: `colors.textPrimary`
- Goal: `colors.textDim`
- Respins badge: `colors.respin` when active
- Progress bar below: pink-to-cyan gradient fill via `LinearGradient` or two-tone View

- [ ] **Step 6: Create `src/components/BottomBar.tsx`**

Port the bottom bar section from `PlayingScreen` in App.tsx. Apply neon styling:
- Background: `colors.hudBg`, border `colors.border`, rounded
- Tile preview box: `colors.cell` bg, `colors.cellFilledBorder` border
- Show SVG symbols instead of emoji text
- Respin toggle: outlined in `colors.respin`
- "X left" text: `colors.textMuted`

- [ ] **Step 7: Create `src/components/HelpPanel.tsx`**

Port the `HelpPanel` function from App.tsx. Apply neon styling:
- Background: `colors.surface`
- Headings: `colors.gold`
- Body text: `#ccc`
- Replace emoji symbol values with inline `<SymbolIcon>` components

- [ ] **Step 8: Commit**

```bash
git add src/components/
git commit -m "feat: create neon-styled UI components (Cell, Grid, HUD, BottomBar, HelpPanel, ScorePopup)"
```

---

### Task 5: Create Screen Components

**Files:**
- Create: `src/components/TitleScreen.tsx`
- Create: `src/components/LevelPreviewScreen.tsx`
- Create: `src/components/GameOverScreen.tsx`
- Create: `src/components/PlayingScreen.tsx`

- [ ] **Step 1: Create `src/components/TitleScreen.tsx`**

Port the `TitleScreen` function from App.tsx. Redesign per mockup:
- Background: `colors.bg`
- Centered column layout
- `<Logo />` SVG component (240px wide)
- `<Domino />` SVG below
- "NEW GAME" button: cyan outlined style (`colors.cyan` border + text, transparent bg)
- "HOW TO PLAY" button: indigo outlined style
- Load and apply Space Grotesk font

- [ ] **Step 2: Create `src/components/LevelPreviewScreen.tsx`**

Port the `LevelPreviewScreen` function from App.tsx. Apply neon theme:
- Title: `colors.gold`, Space Grotesk bold
- Stat badges: `colors.hudBg` bg, `colors.border` border
- Mini grid: neon cell colors
- "START LEVEL" button: cyan outlined

- [ ] **Step 3: Create `src/components/GameOverScreen.tsx`**

Port the `GameOverScreen` function from App.tsx. Redesign per mockup:
- "GAME OVER" text: `colors.pink`, neon text-shadow (via `textShadowColor`/`textShadowRadius`), letter-spacing
- Stats card: `colors.hudBg` bg, `colors.border` border
  - Score in `colors.gold`
  - Level in `colors.cyan`
  - Best match in `colors.pink` (compute from final grid matches)
- Progress bar: pink-to-cyan gradient
- "TRY AGAIN" button: pink outlined
- "MAIN MENU" button: indigo outlined

- [ ] **Step 4: Create `src/components/PlayingScreen.tsx`**

Port the `PlayingScreen` function from App.tsx. Compose the new components:
- `<HUD>` at top
- Progress bar
- `<Grid>` with respin buttons
- `<BottomBar>` or placement confirm/cancel buttons
- Hint text with neon colors
- Respin mode controls
- Desktop help panel
- End-of-level overlay within playing screen

- [ ] **Step 5: Commit**

```bash
git add src/components/TitleScreen.tsx src/components/LevelPreviewScreen.tsx src/components/GameOverScreen.tsx src/components/PlayingScreen.tsx
git commit -m "feat: create neon-styled screen components (Title, LevelPreview, GameOver, Playing)"
```

---

### Task 6: Rewrite App.tsx as Thin Root + Font Loading

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

Replace the entire file with a thin root that loads fonts and routes screens:

```tsx
// App.tsx
import React from 'react';
import { View, ActivityIndicator, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useRunStore } from './src/store';
import { TitleScreen } from './src/components/TitleScreen';
import { LevelPreviewScreen } from './src/components/LevelPreviewScreen';
import { PlayingScreen } from './src/components/PlayingScreen';
import { GameOverScreen } from './src/components/GameOverScreen';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const runPhase = useRunStore(s => s.runPhase);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.cyan} size="large" />
      </View>
    );
  }

  let screen;
  if (runPhase === 'title') screen = <TitleScreen />;
  else if (runPhase === 'levelPreview') screen = <LevelPreviewScreen />;
  else if (runPhase === 'gameOver') screen = <GameOverScreen />;
  else screen = <PlayingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />
        {screen}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
```

Note: With the root-level `GestureHandlerRootView` and `SafeAreaView` here, individual screen components do NOT need to wrap themselves in these — they can be simple View-based layouts.

Also note: `expo-haptics` is used in Grid.tsx for touch feedback. When extracting Grid.tsx in Task 4, ensure it imports `* as Haptics from 'expo-haptics'`.

- [ ] **Step 2: Verify the app runs end-to-end**

Run: `npx expo start --web`
Play through: title → level preview → gameplay → game over → play again. Verify:
- Space Grotesk font loads and renders
- SVG symbols display in grid cells
- Neon colors applied throughout
- All interactions work (tap to place, rotate, confirm, respins)
- Keyboard controls work on desktop
- Mobile layout works (responsive cell size, respin mode toggle)

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: rewrite App.tsx as thin root with font loading and screen routing"
```

---

### Task 7: Add Web Glow Effects + Polish

**Files:**
- Create: `src/components/GlowWrapper.tsx` (optional)
- Modify: `src/components/Cell.tsx`
- Modify: `src/theme.ts`

- [ ] **Step 1: Add CSS drop-shadow glow for web**

On web, add `filter: drop-shadow(0 0 4px <color>)` via a wrapper View style around SymbolIcon in Cell.tsx. Use Platform.OS check:

```typescript
// In Cell.tsx, wrap SymbolIcon:
const glowStyle = Platform.OS === 'web' ? {
  filter: `drop-shadow(0 0 4px ${symbolColors[symbol]})`,
} : {};
```

This gives the neon glow halo on web while gracefully degrading on native.

- [ ] **Step 2: Add neon text-shadow for headings**

For "GAME OVER", "SLOMINOES" title, and other headings, apply:
```typescript
textShadowColor: colors.pink, // or colors.cyan
textShadowOffset: { width: 0, height: 0 },
textShadowRadius: 20,
```

- [ ] **Step 3: Style progress bar gradient**

Since React Native doesn't have CSS `linear-gradient`, use `expo-linear-gradient` (already installed in Task 1):

```tsx
import { LinearGradient } from 'expo-linear-gradient';
// <LinearGradient colors={[colors.pink, colors.cyan]} start={{x:0,y:0}} end={{x:1,y:0}} style={fillStyle} />
```

- [ ] **Step 4: Final visual polish pass**

- Verify button hover/press states look good
- Check spacing, padding, border-radius consistency
- Verify help panel with SVG symbol values
- Test on narrow (375px) and wide (1200px) viewports

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: add web glow effects, gradient progress bar, and visual polish"
```

---

### Task 8: Clean Up & Delete Old Code

**Files:**
- Modify: `App.tsx` (verify dormant code is not in new files)

- [ ] **Step 1: Verify no dormant code was ported**

Grep for "DORMANT" in `src/`:
```bash
grep -r "DORMANT" src/
```
Expected: no matches. The dormant roguelike code (relics, coins, shop, reward/victory screens) should NOT exist in any new file.

- [ ] **Step 2: Verify old App.tsx is fully replaced**

The old App.tsx should now only contain the thin root from Task 6. Confirm the old ~2900 lines are gone.

- [ ] **Step 3: Run the app one final time**

Run: `npx expo start --web`
Full playthrough: title → preview → play → win/lose → game over → play again.

- [ ] **Step 4: Build for production**

Run: `npx expo export --platform web`
Verify the build succeeds with no errors.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "chore: remove old monolithic App.tsx, finalize neon UI redesign"
git push
```
