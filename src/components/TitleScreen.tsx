// src/components/TitleScreen.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { useRunStore } from '../store';
import { Logo } from '../symbols/Logo';
import { Domino } from '../symbols/Domino';

export function TitleScreen() {
  return (
    <View style={styles.container}>
      <Logo width={240} />
      <View style={styles.dominoWrap}>
        <Domino size={60} />
      </View>
      <Pressable
        style={({ pressed }) => [styles.newGameButton, pressed && styles.buttonPressed]}
        onPress={() => useRunStore.getState().startRun()}
      >
        <Text style={styles.newGameText}>NEW GAME</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.howToPlayButton, pressed && styles.buttonPressed]}
      >
        <Text style={styles.howToPlayText}>HOW TO PLAY</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dominoWrap: {
    marginTop: 16,
    marginBottom: 40,
  },
  newGameButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  newGameText: {
    color: colors.cyan,
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  howToPlayButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.indigo,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  howToPlayText: {
    color: colors.indigo,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
