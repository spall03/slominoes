// src/components/HelpPanel.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { SymbolIcon } from '../symbols/index';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </>
  );
}

function Body({ children }: { children: string }) {
  return <Text style={styles.body}>{children}</Text>;
}

function SymbolRow({ symbol, label }: { symbol: string; label: string }) {
  return (
    <View style={styles.symbolRow}>
      <SymbolIcon symbol={symbol} size={16} />
      <Text style={styles.symbolLabel}>{label}</Text>
    </View>
  );
}

export function HelpPanel() {
  return (
    <ScrollView style={styles.helpPanel} contentContainerStyle={styles.content}>
      <Text style={styles.title}>How to Play</Text>

      <Section title="Goal">
        <Body>Place domino tiles on the grid to create matches. Score enough points to beat the level threshold and advance. Complete all 10 levels to win a run.</Body>
      </Section>

      <Section title="Matching">
        <Body>Line up 3 or more identical symbols in a row or column. Longer matches score more:</Body>
        <View style={styles.table}>
          <Text style={styles.tableRow}>3 in a row  ×1</Text>
          <Text style={styles.tableRow}>4 in a row  ×2</Text>
          <Text style={styles.tableRow}>5 in a row  ×3</Text>
          <Text style={styles.tableRow}>6+ in a row ×4</Text>
        </View>
        <Body>Some symbols have different match lengths — check their stats in the draft screen.</Body>
      </Section>

      <Section title="Entry Points">
        <Body>Before placing a tile, choose an entry point (arrow buttons on the edges). You can only place tiles in empty cells reachable from that entry. Walls and filled cells block paths.</Body>
      </Section>

      <Section title="Placement">
        <Body>Tap a highlighted cell to place your tile. Tap again to rotate. Hold to confirm. On desktop: arrow keys to move, R to rotate, Enter to confirm.</Body>
      </Section>

      <Section title="Locking">
        <Body>When symbols form a match, those cells lock (gold border). Locked cells are protected — respins can't change them. Build matches strategically to preserve your best scoring combos.</Body>
      </Section>

      <Section title="Respins">
        <Body>Tap the Respin button to enter respin mode. Then tap a row or column button to shuffle all unlocked symbols in that line. Locked cells stay put.</Body>
        <Body>You start each level with free respins. When they run out, you can buy more by spending score. The cost escalates: 100, 150, 200, 250...</Body>
      </Section>

      <Section title="Score">
        <Body>Your score equals the total of all matches currently on the grid. It's recalculated after every placement and respin — not additive. Breaking a match with a respin reduces your score.</Body>
        <Body>Formula: symbol value × length × multiplier</Body>
      </Section>

      <Section title="Symbol Loadout">
        <Body>Before each run, choose 5 symbols for your loadout. Only your chosen symbols appear on tiles. Each symbol has unique stats:</Body>
        <View style={styles.statExplainer}>
          <Text style={styles.statLine}>Match — how many in a row to match (default 3)</Text>
          <Text style={styles.statLine}>Score — base points per match</Text>
          <Text style={styles.statLine}>Freq — how often it appears on tiles (higher = more common)</Text>
        </View>
      </Section>

      <Section title="Symbol Abilities">
        <Body>Many symbols have special powers that trigger during play:</Body>
        <View style={styles.abilityList}>
          <SymbolRow symbol="jam" label="2x cherry matches in same row/column" />
          <SymbolRow symbol="apple" label="Matches with cherry & lemon (Fruit Salad +200)" />
          <SymbolRow symbol="ghost" label="Doesn't lock when matched — stays respinnable" />
          <SymbolRow symbol="bomb" label="Clears unlocked adjacent cells on match" />
          <SymbolRow symbol="oil_can" label="Unlocks entire row & column on match (ML1)" />
          <SymbolRow symbol="egg" label="Adds 3 extra tiles on match (needs 4 in a row)" />
          <SymbolRow symbol="magnet" label="Increases bell & seven frequency" />
          <SymbolRow symbol="compass" label="Adds an extra entry point" />
          <SymbolRow symbol="vine" label="Can replace wall cells (+50 on match)" />
          <SymbolRow symbol="ember" label="+40 when a respin creates a new match" />
          <SymbolRow symbol="honey" label="+30 when an adjacent match forms" />
          <SymbolRow symbol="coral" label="+20 per unique symbol type adjacent to match" />
          <SymbolRow symbol="tide" label="+5 per empty cell on the board when matched" />
          <SymbolRow symbol="banana" label="Matches with all fruits (Grand Salad +400)" />
          <SymbolRow symbol="crown" label="+2 symbol selection slots (pick 7)" />
        </View>
      </Section>

      <Section title="Unlocking Symbols">
        <Body>You start with 5 base symbols. 15 more are hidden — unlock them by playing! Each locked symbol shows a cryptic hint about its unlock condition. Some unlock from cumulative progress, others from specific feats.</Body>
        <Body>At most 1 symbol unlocks per run. Keep playing to discover them all.</Body>
      </Section>

      <Section title="Bonus Respins">
        <Body>Beat a level's threshold by a wide margin and earn bonus respins for the next level:</Body>
        <View style={styles.table}>
          <Text style={styles.tableRow}>+5% over threshold   +1 respin</Text>
          <Text style={styles.tableRow}>+10% over threshold  +2 respins</Text>
          <Text style={styles.tableRow}>+15% over threshold  +3 respins</Text>
        </View>
      </Section>

      <Section title="Tips">
        <Body>• Place tiles near existing symbols to set up matches before they lock.</Body>
        <Body>• Save respins for rows/columns with near-matches (2 in a row).</Body>
        <Body>• Locked cells protect your score — build matches early.</Body>
        <Body>• Buying respins is a gamble — only worth it if you can see a likely match.</Body>
        <Body>• Try different symbol loadouts — combos like cherry + jam or bell + magnet change the game.</Body>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  helpPanel: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    width: 280,
    maxHeight: 500,
  },
  content: {
    padding: 14,
    paddingBottom: 20,
  },
  title: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  heading: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 13,
    marginTop: 12,
    marginBottom: 4,
  },
  body: {
    color: '#ccc',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  table: {
    backgroundColor: '#0a0a1e',
    borderRadius: 6,
    padding: 8,
    marginVertical: 4,
  },
  tableRow: {
    color: '#aaa',
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 18,
  },
  statExplainer: {
    marginVertical: 4,
  },
  statLine: {
    color: '#aaa',
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 18,
  },
  abilityList: {
    marginVertical: 4,
    gap: 6,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbolLabel: {
    color: '#bbb',
    fontFamily: fonts.regular,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});
