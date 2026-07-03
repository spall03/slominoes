// src/music.native.ts
// Native music player for iOS/Android. The web implementation lives in music.ts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

const TRACK_FILES: Record<string, any> = {
  title: require('../assets/music/title.mp3'),
  draft: require('../assets/music/draft.mp3'),
  loss: require('../assets/music/loss.mp3'),
  level1: require('../assets/music/level1.mp3'),
  level2: require('../assets/music/level2.mp3'),
  level3: require('../assets/music/level3.mp3'),
  level4: require('../assets/music/level4.mp3'),
  level5: require('../assets/music/level5.mp3'),
  level6: require('../assets/music/level6.mp3'),
  level7: require('../assets/music/level7.mp3'),
  level8: require('../assets/music/level8.mp3'),
  level9: require('../assets/music/level9.mp3'),
  level10: require('../assets/music/level10.mp3'),
};

const STORAGE_KEY = 'slominoes_music_enabled';
const VOLUME = 0.2;
const FADE_MS = 400;
const FADE_STEPS = 12;

let currentSound: Audio.Sound | null = null;
let currentTrack: string | null = null;
let musicEnabled = true;
let operationId = 0;
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

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fadeVolume(sound: Audio.Sound, from: number, to: number, durationMs: number) {
  const stepMs = durationMs / FADE_STEPS;
  for (let i = 1; i <= FADE_STEPS; i++) {
    const volume = from + (to - from) * (i / FADE_STEPS);
    try {
      await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    } catch {
      return;
    }
    await wait(stepMs);
  }
}

async function unloadSound(sound: Audio.Sound) {
  try {
    await sound.stopAsync();
  } catch {}
  try {
    await sound.unloadAsync();
  } catch {}
}

export function stopMusic() {
  const sound = currentSound;
  operationId++;
  currentSound = null;
  currentTrack = null;
  if (!sound) return;

  fadeVolume(sound, VOLUME, 0, FADE_MS)
    .then(() => unloadSound(sound))
    .catch(() => {});
}

export function startMusic(trackName: string) {
  const id = ++operationId;
  startMusicAsync(trackName, id).catch(() => {});
}

async function startMusicAsync(trackName: string, id: number) {
  if (!musicEnabled) {
    currentTrack = trackName;
    return;
  }
  if (currentTrack === trackName && currentSound) return;

  const asset = TRACK_FILES[trackName];
  if (!asset) return;

  const oldSound = currentSound;
  currentSound = null;

  if (oldSound) {
    fadeVolume(oldSound, VOLUME, 0, FADE_MS)
      .then(() => unloadSound(oldSound))
      .catch(() => {});
  }

  await ensureAudioMode();
  if (id !== operationId) return;

  const { sound } = await Audio.Sound.createAsync(
    asset,
    { isLooping: true, shouldPlay: true, volume: 0 },
  );

  if (id !== operationId || !musicEnabled) {
    await unloadSound(sound);
    return;
  }

  currentSound = sound;
  currentTrack = trackName;
  await fadeVolume(sound, 0, VOLUME, FADE_MS);
}

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled;
  AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false').catch(() => {});

  if (!enabled) {
    stopMusic();
    return;
  }

  if (currentTrack) {
    const track = currentTrack;
    currentTrack = null;
    startMusic(track);
  }
}

export function isMusicEnabled(): boolean {
  return musicEnabled;
}

export async function loadMusicPreference(): Promise<void> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    if (val !== null) musicEnabled = val === 'true';
  } catch {
    // ignore
  }
}
