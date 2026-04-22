// src/components/DraftScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { colors, fonts, symbolColors } from '../theme';
import { useMetaStore, UNLOCK_CONDITIONS } from '../meta-store';
import { useRunStore } from '../store';
import { SYMBOL_ROSTER, type SymbolId, type SymbolDef } from '../symbols';
import { SymbolIcon } from '../symbols/index';
import { startMusic, stopMusic } from '../music';

/**
 * Split ability text so numeric payloads render in cyan bold while the rest
 * reads as ink body (audit Move 03). Matches "+N", "+N%", "Nx", "+50pts", etc.
 */
const NUMERIC_SPLIT = /([+-]?\d+(?:\.\d+)?(?:%|x|pts?)?)/g;
const NUMERIC_TEST = /^[+-]?\d+(?:\.\d+)?(?:%|x|pts?)?$/;
function renderAbilityText(text: string) {
  const parts = text.split(NUMERIC_SPLIT);
  return parts.map((part, i) =>
    NUMERIC_TEST.test(part) ? (
      <Text key={i} style={styles.abilityNumeric}>{part}</Text>
    ) : (
      <Text key={i}>{part}</Text>
    )
  );
}

/** Render a 5-dot frequency indicator (●●○○○ pattern for freq=2). */
function FrequencyDots({ freq }: { freq: number }) {
  const filled = Math.min(5, Math.max(0, freq));
  return (
    <Text style={styles.chipValue}>
      {'●'.repeat(filled)}
      <Text style={styles.chipValueDim}>{'○'.repeat(5 - filled)}</Text>
    </Text>
  );
}

/** Look up tier for a symbol. Base symbols are tier 0; unlockables come from UNLOCK_CONDITIONS. */
function getTierLabel(id: SymbolId): string {
  const cond = UNLOCK_CONDITIONS.find(c => c.symbolId === id);
  if (!cond) return 'CORE';
  return `TIER ${cond.tier}`;
}

function SymbolCard({
  def,
  isSelected,
  isLocked,
  hint,
  onPress,
}: {
  def: SymbolDef;
  isSelected: boolean;
  isLocked: boolean;
  hint?: string;
  onPress: () => void;
}) {
  const abilityText = def.abilities.length > 0
    ? def.abilities.map(a => a.description).join('. ')
    : undefined;

  return (
    <Pressable
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        isLocked && styles.cardLocked,
      ]}
      onPress={isLocked ? undefined : onPress}
      disabled={isLocked}
    >
      {isLocked ? (
        <>
          <Text style={styles.lockedIcon}>?</Text>
          <Text style={styles.lockedLabel}>LOCKED</Text>
          {hint && <Text style={styles.hint}>{hint}</Text>}
        </>
      ) : (
        <View style={styles.cardContent}>
          <View
            style={[
              styles.iconBlock,
              Platform.OS === 'web' ? ({
                filter: `drop-shadow(0 0 4px ${symbolColors[def.id] ?? colors.cyan})`,
              } as any) : undefined,
            ]}
          >
            <SymbolIcon symbol={def.id} size={36} />
          </View>
          <View style={styles.cardInfo}>
            {/* Eyebrow + title row with right-aligned points */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.eyebrow}>{getTierLabel(def.id)}</Text>
                <Text style={[
                  styles.name,
                  isSelected && { color: colors.gold },
                ]}>{def.name}</Text>
              </View>
              <View style={styles.pointsBlock}>
                <Text style={styles.points}>{def.scoreValue}</Text>
                <Text style={styles.pointsEyebrow}>PTS</Text>
              </View>
            </View>

            {/* Meta chips: MATCH / FREQ */}
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>MATCH</Text>
                <Text style={styles.chipValue}>·{def.matchLength}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>FREQ</Text>
                <FrequencyDots freq={def.frequency} />
              </View>
            </View>

            {/* Ability sentence — ink body with inline cyan numeric highlights */}
            {abilityText && (
              <Text
                style={styles.ability}
                numberOfLines={isSelected ? undefined : 2}
              >
                {renderAbilityText(abilityText)}
              </Text>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function DraftScreen() {
  useEffect(() => {
    try { startMusic('draft'); } catch {}
    return () => { try { stopMusic(); } catch {} };
  }, []);

  const selectedLoadout = useMetaStore(s => s.selectedLoadout);
  const unlockedSymbols = useMetaStore(s => s.unlockedSymbols);
  const selectSymbol = useMetaStore(s => s.selectSymbol);
  const deselectSymbol = useMetaStore(s => s.deselectSymbol);
  const metaStartRun = useMetaStore(s => s.startRun);

  const { confirmDraft } = useRunStore();

  // Derive available and locked from reactive state
  const available = SYMBOL_ROSTER.filter(s =>
    s.id !== 'wall' && (s.base || unlockedSymbols.has(s.id))
  );
  const locked = UNLOCK_CONDITIONS
    .filter(c => !unlockedSymbols.has(c.symbolId))
    .map(c => ({
      def: SYMBOL_ROSTER.find(s => s.id === c.symbolId)!,
      hint: c.hint,
    }))
    .filter(x => x.def && !x.def.base);

  // Check if crown is selected for +2 slots
  const hasCrown = selectedLoadout.includes('crown');
  const maxSlots = hasCrown ? 7 : 5;
  const isFull = selectedLoadout.length >= maxSlots;

  const handlePress = (id: SymbolId) => {
    if (selectedLoadout.includes(id)) {
      deselectSymbol(id);
    } else if (!isFull) {
      selectSymbol(id);
    }
  };

  const handleStartRun = () => {
    if (selectedLoadout.length < 1) return;
    metaStartRun();
    // Build loadout defs from selected IDs
    const loadoutDefs = selectedLoadout
      .map(id => SYMBOL_ROSTER.find(s => s.id === id))
      .filter(Boolean) as import('../symbols').SymbolDef[];
    confirmDraft(loadoutDefs);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Symbols</Text>
        <Text style={styles.counter}>{selectedLoadout.length} / {maxSlots}</Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.grid}>
        {available.map(def => (
          <SymbolCard
            key={def.id}
            def={def}
            isSelected={selectedLoadout.includes(def.id)}
            isLocked={false}
            onPress={() => handlePress(def.id)}
          />
        ))}
        {locked.map(({ def, hint }) => (
          <SymbolCard
            key={def.id}
            def={def}
            isSelected={false}
            isLocked={true}
            hint={hint}
            onPress={() => {}}
          />
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.selectedRow}>
          {selectedLoadout.map(id => (
            <View key={id} style={styles.selectedSlot}>
              <SymbolIcon symbol={id} size={24} />
            </View>
          ))}
          {Array.from({ length: maxSlots - selectedLoadout.length }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.emptySlot} />
          ))}
        </View>
        <Pressable
          style={[
            styles.startButton,
            selectedLoadout.length < 1 && styles.startButtonDisabled,
          ]}
          onPress={handleStartRun}
          disabled={selectedLoadout.length < 1}
        >
          <Text style={[
            styles.startButtonText,
            selectedLoadout.length < 1 && styles.startButtonTextDisabled,
          ]}>Start Run</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.cyan,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  counter: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.gold,
  },
  scrollArea: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    paddingBottom: 120,
    justifyContent: 'flex-start',
    gap: 8,
  },
  card: {
    width: '47%',
    backgroundColor: '#0a0a1e',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardSelected: {
    borderColor: colors.gold,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 12px rgba(255,215,0,0.3)',
    } as any : {}),
  },
  cardLocked: {
    opacity: 0.75,
  },
  lockedIcon: {
    fontSize: 28,
    color: colors.textMuted,
    fontFamily: fonts.bold,
    height: 36,
    lineHeight: 36,
  },
  lockedLabel: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 2,
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  hint: {
    fontSize: 10,
    color: '#aaaaaa',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  iconBlock: {
    alignSelf: 'flex-start',
    paddingTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  headerLeft: {
    flex: 1,
    gap: 1,
  },
  eyebrow: {
    fontSize: 9,
    fontFamily: fonts.semiBold,
    color: colors.inkMute,
    letterSpacing: 2,
  },
  name: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.ink,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pointsBlock: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.gold,
    fontVariant: ['tabular-nums'],
  },
  pointsEyebrow: {
    fontSize: 8,
    fontFamily: fonts.semiBold,
    color: colors.inkMute,
    letterSpacing: 2,
    marginTop: -2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surface2,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  chipLabel: {
    fontSize: 9,
    fontFamily: fonts.semiBold,
    color: colors.inkMute,
    letterSpacing: 1,
  },
  chipValue: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  chipValueDim: {
    color: colors.inkMute,
  },
  stats: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  ability: {
    // Move 01/03: body copy uses ink, not cyan. Numeric payload gets inline
    // cyan (see abilityNumeric style) — rendered via splitAbilityText helper.
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.ink,
    lineHeight: 15,
  },
  abilityNumeric: {
    color: colors.cyan,
    fontFamily: fonts.semiBold,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
    paddingBottom: 20,
    gap: 10,
  },
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  selectedSlot: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  startButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  startButtonDisabled: {
    borderColor: colors.textDim,
    opacity: 0.4,
  },
  startButtonText: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  startButtonTextDisabled: {
    color: colors.textDim,
  },
});
