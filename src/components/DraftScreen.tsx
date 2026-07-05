// src/components/DraftScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  type GestureResponderEvent,
} from 'react-native';
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
    <View style={styles.freqDots} accessibilityLabel={`Frequency ${filled} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.freqDot,
            i < filled ? styles.freqDotFilled : styles.freqDotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

/** Look up tier for a symbol. Base symbols are tier 0; unlockables come from UNLOCK_CONDITIONS. */
function getTierLabel(id: SymbolId): string {
  const cond = UNLOCK_CONDITIONS.find(c => c.symbolId === id);
  if (!cond) return 'CORE';
  return `TIER ${cond.tier}`;
}

function SymbolDetailModal({
  symbol,
  onClose,
}: {
  symbol: SymbolDef | null;
  onClose: () => void;
}) {
  if (!symbol) return null;
  const abilityText = symbol.abilities.length > 0
    ? symbol.abilities.map(a => a.description)
    : ['No special ability.'];

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleRow}>
              <View
                style={[
                  styles.detailIcon,
                  Platform.OS === 'web' ? ({
                    filter: `drop-shadow(0 0 5px ${symbolColors[symbol.id] ?? colors.cyan})`,
                  } as any) : undefined,
                ]}
              >
                <SymbolIcon symbol={symbol.id} size={44} />
              </View>
              <View style={styles.detailHeading}>
                <Text style={styles.detailEyebrow}>{getTierLabel(symbol.id)}</Text>
                <Text style={styles.detailTitle}>{symbol.name}</Text>
              </View>
            </View>
            <Pressable
              style={styles.modalCloseButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close symbol details"
            >
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.detailStats}>
            <View style={styles.detailStat}>
              <Text style={styles.detailStatValue}>{symbol.matchLength}</Text>
              <Text style={styles.detailStatLabel}>MATCH</Text>
            </View>
            <View style={styles.detailStat}>
              <Text style={styles.detailStatValue}>{symbol.scoreValue}</Text>
              <Text style={styles.detailStatLabel}>PTS</Text>
            </View>
            <View style={styles.detailStat}>
              <FrequencyDots freq={symbol.frequency} />
              <Text style={styles.detailStatLabel}>FREQ</Text>
            </View>
          </View>

          <View style={styles.detailAbilityList}>
            {abilityText.map((text, index) => (
              <Text key={index} style={styles.detailAbility}>
                {renderAbilityText(text)}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SymbolCard({
  def,
  isSelected,
  isLocked,
  hint,
  onPress,
  onInfoPress,
}: {
  def: SymbolDef;
  isSelected: boolean;
  isLocked: boolean;
  hint?: string;
  onPress: () => void;
  onInfoPress: () => void;
}) {
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
        <View style={styles.lockedContent}>
          <Text style={styles.lockedIcon}>?</Text>
          <Text style={styles.lockedLabel}>LOCKED</Text>
          {hint && <Text style={styles.hint}>{hint}</Text>}
        </View>
      ) : (
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.iconBlock,
                Platform.OS === 'web' ? ({
                  filter: `drop-shadow(0 0 4px ${symbolColors[def.id] ?? colors.cyan})`,
                } as any) : undefined,
              ]}
            >
              <SymbolIcon symbol={def.id} size={30} />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.headerLeft}>
                <Text style={styles.eyebrow}>{getTierLabel(def.id)}</Text>
                <Text style={[
                  styles.name,
                  isSelected && { color: colors.gold },
                ]} numberOfLines={1}>{def.name}</Text>
              </View>
            </View>
            <Pressable
              style={styles.infoButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${def.name} details`}
              onPress={(event: GestureResponderEvent) => {
                event.stopPropagation();
                onInfoPress();
              }}
            >
              <Text style={styles.infoButtonText}>i</Text>
            </Pressable>
          </View>

          <View style={styles.cardStatsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>PTS</Text>
              <Text style={styles.statChipValue}>{def.scoreValue}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>MATCH</Text>
              <Text style={styles.statChipValue}>{def.matchLength}</Text>
            </View>
            <View style={[styles.statChip, styles.freqChip]}>
              <Text style={styles.statChipLabel}>FREQ</Text>
              <FrequencyDots freq={def.frequency} />
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function DraftScreen() {
  const [detailSymbol, setDetailSymbol] = useState<SymbolDef | null>(null);

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
            onInfoPress={() => setDetailSymbol(def)}
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
            onInfoPress={() => {}}
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
      <SymbolDetailModal
        symbol={detailSymbol}
        onClose={() => setDetailSymbol(null)}
      />
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
    borderRadius: 8,
    padding: 10,
    height: 118,
  },
  cardContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
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
  lockedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
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
    lineHeight: 13,
  },
  iconBlock: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  headerLeft: {
    gap: 1,
  },
  eyebrow: {
    fontSize: 8,
    fontFamily: fonts.semiBold,
    color: colors.inkMute,
    letterSpacing: 1.5,
  },
  name: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.ink,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  infoButtonText: {
    color: colors.inkDim,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 15,
  },
  cardStatsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 5,
    minHeight: 40,
    paddingHorizontal: 3,
    paddingVertical: 4,
  },
  freqChip: {
    flex: 1.25,
  },
  statChipLabel: {
    fontSize: 7,
    fontFamily: fonts.semiBold,
    color: colors.inkMute,
    letterSpacing: 1.1,
  },
  statChipValue: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  freqDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 8,
  },
  freqDot: {
    width: 4,
    height: 4,
    borderRadius: 3,
  },
  freqDotFilled: {
    backgroundColor: colors.cyan,
  },
  freqDotEmpty: {
    borderWidth: 1,
    borderColor: colors.inkMute,
  },
  abilityNumeric: {
    color: colors.cyan,
    fontFamily: fonts.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6,6,20,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  detailModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 12,
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  detailIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
  },
  detailHeading: {
    flex: 1,
  },
  detailEyebrow: {
    color: colors.inkMute,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 2,
  },
  detailTitle: {
    color: colors.ink,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modalCloseText: {
    color: colors.inkDim,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 26,
  },
  detailStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  detailStat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    minHeight: 58,
    padding: 8,
  },
  detailStatValue: {
    color: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  detailStatLabel: {
    color: colors.inkMute,
    fontFamily: fonts.semiBold,
    fontSize: 9,
    letterSpacing: 2,
  },
  detailAbilityList: {
    gap: 8,
  },
  detailAbility: {
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
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
