# Neon UI Redesign — Design Spec

**Date:** 2026-03-22
**Goal:** Replace the current emoji/purple-grey visual language with a neon cyberpunk aesthetic using custom SVGs, a new color palette, Space Grotesk typography, and refactored file structure.

## Approach

- **Big-bang**: swap everything at once for visual cohesion
- **SVGs via `react-native-svg`**: future-proofs for native; glow filters work on web, degrade gracefully on native
- **Refactor**: break ~2900-line `App.tsx` into focused modules
- **Font**: Space Grotesk via `@expo-google-fonts/space-grotesk`
- **Target**: GitHub Pages (web primary), with native compatibility

## File Structure

```
src/
  constants.ts          — BOARD_SIZE, tuning knobs, symbol values/weights
  types.ts              — Symbol, EntrySpot, LevelConfig, GameState, etc.
  theme.ts              — color palette, spacing, typography
  store.ts              — Zustand store (game state + actions)
  level.ts              — generateLevelConfig, getEntrySpots, scoring logic
  symbols/
    Cherry.tsx
    Lemon.tsx
    Bar.tsx
    Bell.tsx
    Seven.tsx
    Wall.tsx
    Arrow.tsx           — parameterized by direction
    RespinRow.tsx
    RespinCol.tsx
    Help.tsx
    Star.tsx
    Domino.tsx
    Logo.tsx
    index.ts            — SymbolIcon component (maps Symbol → SVG)
  components/
    Cell.tsx             — grid cell with state-based styling
    Grid.tsx             — 8x8 board + entry spots
    HUD.tsx              — score, level, respins, progress bar
    BottomBar.tsx        — tile preview, tiles left, respin toggle
    TitleScreen.tsx
    GameOverScreen.tsx
    HelpPanel.tsx
    ScorePopup.tsx
  App.tsx                — root: GestureHandler, SafeArea, screen router
```

## Theme

### Color Palette

| Token       | Hex         | Use                        |
|-------------|-------------|----------------------------|
| bg          | `#060614`   | App background             |
| surface     | `#111127`   | Cards, panels              |
| cell        | `#161630`   | Grid cell background       |
| gridBg      | `#0a0a1e`   | Grid container background  |
| border      | `#1e1e3a`   | Default borders            |
| hudBg       | `#0d0d20`   | HUD, bottom bar background |
| cyan        | `#00E5FF`   | Primary accent             |
| pink        | `#FF3B82`   | Danger, game over          |
| gold        | `#ffd700`   | Score, level, highlights   |
| lime        | `#BFFF00`   | Lemon symbol               |
| orange      | `#FF8C00`   | Bell symbol                |
| red         | `#FF4444`   | BAR symbol                 |
| indigo      | `#5c6bc0`   | Subtle/secondary           |
| respin      | `#e74c6f`   | Respin UI accent           |
| textPrimary | `#ffffff`   | Primary text               |
| textMuted   | `#888888`   | Secondary text             |
| textDim     | `#555555`   | Tertiary text              |
| textSubtle  | `#444444`   | Labels, hints              |

### Typography

- **Font family**: Space Grotesk (via `@expo-google-fonts/space-grotesk`)
- **Weights**: 400 (body), 600 (semi-bold), 700 (bold/headings)
- **Uppercase + letter-spacing** for labels and section headers

### Cell States

| State          | Background                     | Border                          | Extra                             |
|----------------|--------------------------------|---------------------------------|-----------------------------------|
| Empty          | `#161630`                      | 1px solid `#1e1e3a`            |                                   |
| Filled         | `#1a1a36`                      | 1px solid `#2a2a50`            |                                   |
| Wall           | `#0e0e1e`                      | 1px solid `#141428`            | 50% opacity                       |
| Preview        | transparent                    | 2px dashed `#ffd700`           | gold shadow `rgba(255,215,0,0.2)` |
| Placed         | `rgba(0,229,255,0.08)`         | 1px solid `rgba(0,229,255,0.4)`| cyan shadow                       |
| Match/Highlight| `rgba(255,215,0,0.15)`         | 1px solid `rgba(255,215,0,0.5)`| gold shadow/glow                  |
| Entry          | `rgba(92,107,192,0.1)`         | 1px dashed `rgba(92,107,192,0.4)` |                               |
| Respin Target  | `rgba(231,76,111,0.1)`         | 1px solid `rgba(231,76,111,0.5)` | pink shadow                    |

### Buttons

Outlined neon style (not filled backgrounds):
- **Primary** (cyan): `#00E5FF` border + text, cyan box-shadow glow
- **Danger** (pink): `#FF3B82` border + text, pink box-shadow glow
- **Subtle** (indigo): `#5c6bc0` border + text, subtle glow
- **Respin**: `#e74c6f` border + text, pink glow, icon + text layout

### Progress Bar

- Track: `#1a1a2e`, 6px tall, rounded
- Fill: `linear-gradient(90deg, #FF3B82, #00E5FF)`
- Glow shadow on fill

## SVG Symbols

Each symbol is a `react-native-svg` component with neon glow filter (`feGaussianBlur` + `feColorMatrix`). Source SVGs are in `assets/symbols/`.

| Symbol  | Stroke Color | Filter Color Matrix                    |
|---------|-------------|----------------------------------------|
| Cherry  | `#FF3B82`   | Pink glow                              |
| Lemon   | `#BFFF00`   | Yellow-green glow                      |
| Bar     | `#FF4444`   | Red glow                               |
| Bell    | `#FF8C00`   | Orange-gold glow                       |
| Seven   | `#00E5FF`   | Cyan glow                              |
| Wall    | `#333355`   | Subtle dark glow                       |

SVGs are stroke-only (no fill), stroke-width 2.5, with `stroke-linecap: round` and `stroke-linejoin: round`.

Neon glow is achieved via SVG filter: `feGaussianBlur(stdDeviation=2.5)` → `feColorMatrix` → `feMerge(glow + glow + source)`.

Note: `react-native-svg` supports `Defs` and basic filters on web. On native, filters may not render — the symbols will still display correctly as colored strokes without the glow halo. This is acceptable degradation.

## Screen Layouts

### Title Screen

- Full-screen centered column on `#060614` background
- Logo SVG (240px wide) at top
- Domino SVG (decorative) below
- "NEW GAME" button (cyan outline, full width)
- "HOW TO PLAY" button (indigo outline, full width)
- No HUD

### Gameplay Screen

- **HUD** (top bar): `#0d0d20` background, `#1a1a2e` border, rounded
  - Left: Level number (gold)
  - Center: Score / Threshold (white / grey)
  - Right: Respins badge (respin pink when active, default `#4a4a70`)
- **Progress bar**: below HUD
- **Grid**: 8x8 on `#0a0a1e` background, `#141430` border, 10px border-radius
  - Column respin buttons above grid (visible in respin mode on mobile)
  - Row respin buttons to right of grid (visible in respin mode on mobile)
  - On desktop: respin buttons always visible but dimmed when not in respin mode
- **Bottom bar**: `#0d0d20` background, rounded
  - Left: tile preview box (two SVG icons in `#161630` rounded box) + "X left" text
  - Right: respin toggle button

### Game Over Screen

- "GAME OVER" heading: `#FF3B82`, bold, neon text-shadow, letter-spacing
- Stats card (`#0d0d20` background, `#1e1e3a` border, rounded):
  - Score (gold), Level (cyan) in a row
  - Best Match (pink) below
  - Progress bar showing % to next milestone
  - Milestone hint text below
- "TRY AGAIN" button (pink outline, full width)
- "MAIN MENU" button (indigo outline, full width)

### Help Panel

- Dark card style (`#0d0d20` or `#111127`)
- Gold headings
- Light grey body text
- Symbol values shown with inline SVG icons (not emoji)

## Dependencies

New:
- `react-native-svg` — SVG rendering
- `@expo-google-fonts/space-grotesk` — typography
- `expo-font` — font loading (may already be implicit via expo)

## Migration Notes

- `SYMBOL_DISPLAY` emoji map replaced by `SymbolIcon` component
- All `<Text>{SYMBOL_DISPLAY[symbol]}</Text>` calls become `<SymbolIcon symbol={symbol} size={cellSize} />`
- All inline styles and the `StyleSheet.create` block at bottom of `App.tsx` move to `theme.ts` + component-local styles
- Dormant roguelike code (relics, coins, shop, reward/victory screens) is NOT ported — stays deleted in the refactor
- Game logic (store, level generation, scoring) is extracted unchanged — no gameplay changes in this redesign
