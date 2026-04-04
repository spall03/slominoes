// src/components/UnlockReveal.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Platform } from 'react-native';
import { colors, fonts, symbolColors } from '../theme';
import { useMetaStore, UNLOCK_CONDITIONS } from '../meta-store';
import { SYMBOL_ROSTER, type SymbolId } from '../symbols';
import { SymbolIcon } from '../symbols/index';

export function UnlockReveal() {
  const { pendingUnlock, dismissUnlock } = useMetaStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (pendingUnlock) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [pendingUnlock, fadeAnim, scaleAnim]);

  if (!pendingUnlock) return null;

  const def = SYMBOL_ROSTER.find(s => s.id === pendingUnlock);
  if (!def) return null;

  const condition = UNLOCK_CONDITIONS.find(c => c.symbolId === pendingUnlock);
  const symbolColor = symbolColors[def.id] ?? colors.cyan;
  const abilityText = def.abilities.map(a => a.description).join('. ');

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.title}>New Symbol Unlocked</Text>

        <View style={[styles.iconContainer, {
          borderColor: `${symbolColor}44`,
          ...(Platform.OS === 'web' ? {
            boxShadow: `0 0 30px ${symbolColor}44, 0 0 60px ${symbolColor}22`,
          } as any : {}),
        }]}>
          <View style={Platform.OS === 'web' ? ({
            filter: `drop-shadow(0 0 6px ${symbolColor})`,
          } as any) : undefined}>
            <SymbolIcon symbol={def.id} size={64} />
          </View>
        </View>

        <Text style={[styles.symbolName, { color: symbolColor }]}>{def.name}</Text>
        <Text style={styles.stats}>
          Match {def.matchLength} · {def.scoreValue}pts · freq {def.frequency}
        </Text>

        {abilityText && (
          <Text style={styles.ability}>{abilityText}</Text>
        )}

        <View style={styles.divider} />

        {condition && (
          <Text style={styles.flavor}>"{condition.hint}"</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.7 }]}
          onPress={dismissUnlock}
        >
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,6,20,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#0a0a1e',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    maxWidth: 340,
    width: '85%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 40px rgba(255,215,0,0.2), 0 0 80px rgba(255,215,0,0.1)',
    } as any : {}),
  },
  title: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.gold,
    letterSpacing: 5,
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  symbolName: {
    fontSize: 28,
    fontFamily: fonts.bold,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  stats: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textDim,
    letterSpacing: 2,
  },
  ability: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.cyan,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  flavor: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: '#444',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 10,
    paddingHorizontal: 48,
    paddingVertical: 12,
    marginTop: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 16px rgba(0,229,255,0.3)',
    } as any : {}),
  },
  continueText: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
