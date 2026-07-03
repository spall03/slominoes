// Native sound effect player. The web implementation lives in sound.ts.

import { Audio } from 'expo-av';
import { useSettingsStore } from './settings-store';

const SFX_FILES = {
  tilePlace: require('../assets/sfx/tile-place.wav'),
  match: require('../assets/sfx/match.wav'),
  bigMatch: require('../assets/sfx/big-match.wav'),
  lock: require('../assets/sfx/lock.wav'),
  respin: require('../assets/sfx/respin.wav'),
  buyRespin: require('../assets/sfx/buy-respin.wav'),
  rotate: require('../assets/sfx/rotate.wav'),
  buttonTap: require('../assets/sfx/button-tap.wav'),
  levelWin: require('../assets/sfx/level-win.wav'),
  levelLose: require('../assets/sfx/level-lose.wav'),
  unlock: require('../assets/sfx/unlock.wav'),
};

const MAX_ACTIVE_SOUNDS = 8;

const activeSounds = new Set<Audio.Sound>();
let audioModeReady = false;

async function ensureAudioMode() {
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}

function unload(sound: Audio.Sound) {
  if (!activeSounds.has(sound)) return;
  activeSounds.delete(sound);
  sound.unloadAsync().catch(() => {});
}

function trimActiveSounds() {
  while (activeSounds.size >= MAX_ACTIVE_SOUNDS) {
    const oldest = activeSounds.values().next().value;
    if (!oldest) return;
    unload(oldest);
  }
}

function play(asset: any, volume = 0.55) {
  if (!useSettingsStore.getState().sfxEnabled) return;
  playAsync(asset, volume).catch(() => {});
}

async function playAsync(asset: any, volume: number) {
  await ensureAudioMode();
  trimActiveSounds();

  const { sound } = await Audio.Sound.createAsync(
    asset,
    { shouldPlay: true, volume, progressUpdateIntervalMillis: 80 },
  );

  activeSounds.add(sound);
  sound.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded) {
      activeSounds.delete(sound);
      return;
    }
    if (status.didJustFinish) {
      unload(sound);
    }
  });

  setTimeout(() => unload(sound), 2500);
}

export function playTilePlace() {
  play(SFX_FILES.tilePlace, 0.5);
}

export function playMatch() {
  play(SFX_FILES.match, 0.6);
}

export function playBigMatch() {
  play(SFX_FILES.bigMatch, 0.62);
}

export function playLock() {
  play(SFX_FILES.lock, 0.48);
}

export function playRespin() {
  play(SFX_FILES.respin, 0.55);
}

export function playBuyRespin() {
  play(SFX_FILES.buyRespin, 0.55);
}

export function playRotate() {
  play(SFX_FILES.rotate, 0.45);
}

export function playButtonTap() {
  play(SFX_FILES.buttonTap, 0.42);
}

export function playLevelWin() {
  play(SFX_FILES.levelWin, 0.65);
}

export function playLevelLose() {
  play(SFX_FILES.levelLose, 0.6);
}

export function playUnlock() {
  play(SFX_FILES.unlock, 0.62);
}
