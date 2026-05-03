import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, SafeAreaView, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useRunStore } from './src/store';
import { useMetaStore } from './src/meta-store';
import { useSettingsStore } from './src/settings-store';
import { TitleScreen } from './src/components/TitleScreen';
import { DraftScreen } from './src/components/DraftScreen';
import { LevelPreviewScreen } from './src/components/LevelPreviewScreen';
import { PlayingScreen } from './src/components/PlayingScreen';
import { GameOverScreen } from './src/components/GameOverScreen';
import { UnlockReveal } from './src/components/UnlockReveal';
import { initializeAdServices } from './src/ad-init';
import { colors, fonts } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const runPhase = useRunStore(s => s.runPhase);
  const metaLoaded = useMetaStore(s => s.loaded);
  const loadFromStorage = useMetaStore(s => s.loadFromStorage);
  const pendingUnlock = useMetaStore(s => s.pendingUnlock);
  const settingsLoaded = useSettingsStore(s => s.loaded);
  const loadSettings = useSettingsStore(s => s.loadSettings);

  const adServiceReady = useMetaStore(s => s.adServiceReady);
  const adServiceFailed = useMetaStore(s => s.adServiceFailed);
  const setAdServiceReady = useMetaStore(s => s.setAdServiceReady);
  const setAdServiceFailed = useMetaStore(s => s.setAdServiceFailed);

  // Step 1: load persisted stores
  useEffect(() => {
    loadFromStorage();
    loadSettings();
  }, [loadFromStorage, loadSettings]);

  // Step 2: after meta loads, run the ad init state machine.
  // On web this is an immediate no-op that resolves ready=true.
  // On native: ATT → UMP → AdMob → Analytics → Crashlytics → IAP cold-start.
  const [initStarted, setInitStarted] = useState(false);
  useEffect(() => {
    if (!metaLoaded || initStarted) return;
    setInitStarted(true);
    (async () => {
      const result = await initializeAdServices();
      if (result.ready) {
        setAdServiceReady({
          attStatus: result.attStatus,
          removeAdsEntitled: result.removeAdsEntitled,
        });
      } else {
        setAdServiceFailed(result.error ?? 'unknown');
      }
    })();
  }, [metaLoaded, initStarted, setAdServiceReady, setAdServiceFailed]);

  // Boot states. Render order:
  //   1. fonts loading → spinner
  //   2. meta/settings loading → spinner
  //   3. ad init in progress → "Initializing…" (only on native, instant on web)
  //   4. ready → game
  //
  // Note: ad init failure is not fatal — game still renders, ad-using
  // components see adServiceFailed=true and gracefully hide their CTAs.

  if (!fontsLoaded || !metaLoaded || !settingsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.cyan} size="large" />
      </View>
    );
  }

  const adInitInFlight = Platform.OS !== 'web' && !adServiceReady && !adServiceFailed;
  if (adInitInFlight) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.cyan} size="large" />
        <Text style={styles.bootLabel}>INITIALIZING</Text>
      </View>
    );
  }

  let screen;
  if (runPhase === 'title') screen = <TitleScreen />;
  else if (runPhase === 'draft') screen = <DraftScreen />;
  else if (runPhase === 'levelPreview') screen = <LevelPreviewScreen />;
  else if (runPhase === 'gameOver') screen = <GameOverScreen />;
  else screen = <PlayingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />
        {screen}
        {pendingUnlock && <UnlockReveal />}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bootLabel: {
    color: colors.inkMute,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 4,
  },
});
