// src/components/DraftScreen.tsx
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { colors, fonts, symbolColors } from '../theme';
import { useMetaStore } from '../meta-store';
import { useRunStore } from '../store';
import { SYMBOL_ROSTER, type SymbolId, type SymbolDef } from '../symbols';
import { SymbolIcon } from '../symbols/index';

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
        <>
          <View style={Platform.OS === 'web' ? ({
            filter: `drop-shadow(0 0 4px ${symbolColors[def.id] ?? colors.cyan})`,
          } as any) : undefined}>
            <SymbolIcon symbol={def.id} size={40} />
          </View>
          <Text style={[
            styles.name,
            isSelected && { color: colors.gold },
          ]}>{def.name}</Text>
          <Text style={styles.stats}>
            Match {def.matchLength} | {def.scoreValue}pts | freq {def.frequency}
          </Text>
          {abilityText && (
            <Text style={styles.ability} numberOfLines={2}>{abilityText}</Text>
          )}
        </>
      )}
    </Pressable>
  );
}

export function DraftScreen() {
  const {
    selectedLoadout,
    selectSymbol,
    deselectSymbol,
    getAvailableSymbols,
    getLockedSymbols,
    getMaxSlots,
    startRun: metaStartRun,
  } = useMetaStore();

  const { confirmDraft } = useRunStore();

  const available = getAvailableSymbols();
  const locked = getLockedSymbols();
  const maxSlots = getMaxSlots();
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
    confirmDraft();
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
    width: '31%',
    backgroundColor: '#0a0a1e',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  cardSelected: {
    borderColor: colors.gold,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 12px rgba(255,215,0,0.3)',
    } as any : {}),
  },
  cardLocked: {
    opacity: 0.4,
  },
  lockedIcon: {
    fontSize: 24,
    color: '#333',
    fontFamily: fonts.bold,
    height: 40,
    lineHeight: 40,
  },
  lockedLabel: {
    fontSize: 8,
    color: '#333',
    letterSpacing: 2,
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 8,
    color: '#444',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  name: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stats: {
    fontSize: 8,
    fontFamily: fonts.regular,
    color: colors.textDim,
  },
  ability: {
    fontSize: 7,
    fontFamily: fonts.regular,
    color: colors.cyan,
    textAlign: 'center',
    opacity: 0.7,
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
