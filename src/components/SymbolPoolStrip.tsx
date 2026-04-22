// src/components/SymbolPoolStrip.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, symbolColors } from '../theme';
import { useGameStore, computeBiasedRespinFreqs } from '../store';
import { SymbolIcon } from '../symbols/index';
import type { SymbolId } from '../symbols';

interface Props {
  /** 'compact' for in-game strip, 'full' for level preview */
  variant?: 'compact' | 'full';
  /** Show "SYMBOL POOL" label above the pills (full variant only by default) */
  showLabel?: boolean;
}

export function SymbolPoolStrip({ variant = 'full', showLabel }: Props) {
  const loadoutFreqs = useGameStore(s => s.loadoutFreqs);
  const respinTarget = useGameStore(s => s.respinTarget);
  const grid = useGameStore(s => s.grid);
  const lockedCells = useGameStore(s => s.lockedCells);

  // If the player has armed a respin, show the biased pool that would actually
  // roll for that line (locked cells pull their own symbol). Otherwise show
  // the base pool.
  const effectiveFreqs = useMemo(() => {
    if (!loadoutFreqs) return null;
    if (!respinTarget) return loadoutFreqs;
    return computeBiasedRespinFreqs(loadoutFreqs, grid, lockedCells, respinTarget);
  }, [loadoutFreqs, respinTarget, grid, lockedCells]);

  const pool = useMemo(() => {
    if (!effectiveFreqs || effectiveFreqs.size === 0) return [];
    let total = 0;
    for (const v of effectiveFreqs.values()) total += v;
    if (total === 0) return [];
    return Array.from(effectiveFreqs.entries())
      .map(([id, freq]) => ({ id: id as SymbolId, freq, pct: (freq / total) * 100 }))
      .sort((a, b) => b.freq - a.freq);
  }, [effectiveFreqs]);

  const biased = respinTarget !== null;

  if (pool.length === 0) return null;

  const isCompact = variant === 'compact';
  // Compact strip normally stays label-less to save room, but surfaces the
  // "RESPIN → ROW N" label when armed so the player sees the bias origin.
  const shouldShowLabel = showLabel ?? (!isCompact || biased);
  const iconSize = isCompact ? 14 : 18;

  const labelText = biased && respinTarget
    ? `RESPIN → ${respinTarget.type === 'row' ? 'ROW' : 'COL'} ${respinTarget.index + 1}`
    : 'SYMBOL POOL';

  return (
    <View style={[styles.section, isCompact && styles.sectionCompact]}>
      {shouldShowLabel && (
        <Text style={[styles.label, biased && styles.labelBiased]}>{labelText}</Text>
      )}
      <View style={[styles.row, isCompact && styles.rowCompact]}>
        {pool.map(({ id, pct }) => (
          <View
            key={id}
            style={[
              styles.pill,
              isCompact && styles.pillCompact,
              biased && styles.pillBiased,
            ]}
          >
            <SymbolIcon symbol={id} size={iconSize} />
            <Text
              style={[
                styles.pct,
                isCompact && styles.pctCompact,
                { color: symbolColors[id] ?? colors.textPrimary },
              ]}
            >
              {Math.round(pct)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionCompact: {
    marginBottom: 6,
    marginTop: 2,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  labelBiased: {
    color: colors.pink,
  },
  pillBiased: {
    borderColor: colors.pinkBorder,
    backgroundColor: colors.pinkTint,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    maxWidth: 360,
  },
  rowCompact: {
    gap: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.hudBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillCompact: {
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pct: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  pctCompact: {
    fontSize: 10,
  },
});
