// src/components/SymbolPoolStrip.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, symbolColors } from '../theme';
import { useGameStore } from '../store';
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

  const pool = useMemo(() => {
    if (!loadoutFreqs || loadoutFreqs.size === 0) return [];
    let total = 0;
    for (const v of loadoutFreqs.values()) total += v;
    if (total === 0) return [];
    return Array.from(loadoutFreqs.entries())
      .map(([id, freq]) => ({ id: id as SymbolId, freq, pct: (freq / total) * 100 }))
      .sort((a, b) => b.freq - a.freq);
  }, [loadoutFreqs]);

  if (pool.length === 0) return null;

  const isCompact = variant === 'compact';
  const shouldShowLabel = showLabel ?? !isCompact;
  const iconSize = isCompact ? 14 : 18;

  return (
    <View style={[styles.section, isCompact && styles.sectionCompact]}>
      {shouldShowLabel && <Text style={styles.label}>SYMBOL POOL</Text>}
      <View style={[styles.row, isCompact && styles.rowCompact]}>
        {pool.map(({ id, pct }) => (
          <View
            key={id}
            style={[styles.pill, isCompact && styles.pillCompact]}
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
