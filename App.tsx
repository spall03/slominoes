import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useRunStore } from './src/store';
import { useMetaStore } from './src/meta-store';
import { TitleScreen } from './src/components/TitleScreen';
import { DraftScreen } from './src/components/DraftScreen';
import { LevelPreviewScreen } from './src/components/LevelPreviewScreen';
import { PlayingScreen } from './src/components/PlayingScreen';
import { GameOverScreen } from './src/components/GameOverScreen';
import { UnlockReveal } from './src/components/UnlockReveal';
import { Tutorial, hasTutorialBeenSeen } from './src/components/Tutorial';
import { colors } from './src/theme';

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

  const [showTutorial, setShowTutorial] = useState<boolean | null>(null);

  useEffect(() => {
    loadFromStorage();
    hasTutorialBeenSeen().then(seen => setShowTutorial(!seen));
  }, [loadFromStorage]);

  if (!fontsLoaded || !metaLoaded || showTutorial === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.cyan} size="large" />
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
        {showTutorial && <Tutorial onComplete={() => setShowTutorial(false)} />}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
