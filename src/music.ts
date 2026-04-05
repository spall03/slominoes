// src/music.ts
// Music player — plays ElevenLabs-generated MP3 tracks on loop.
// Web-only implementation using HTMLAudioElement.

import AsyncStorage from '@react-native-async-storage/async-storage';

// Track URLs — resolved via require() so Metro bundles them.
// On web, these become URLs; on native they'd need expo-av to play.
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

let currentAudio: HTMLAudioElement | null = null;
let currentTrack: string | null = null;
let musicEnabled = true;

function resolveUrl(asset: any): string {
  // Metro for web returns a string URL directly, or an object with `uri`.
  if (typeof asset === 'string') return asset;
  if (asset && typeof asset === 'object' && asset.uri) return asset.uri;
  // For native, asset is a number — we don't support that here (web-only).
  return '';
}

function fadeOut(audio: HTMLAudioElement, durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    const startVolume = audio.volume;
    const steps = 20;
    const stepDuration = durationMs / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVolume * (1 - step / steps));
      if (step >= steps) {
        clearInterval(interval);
        audio.pause();
        audio.currentTime = 0;
        resolve();
      }
    }, stepDuration);
  });
}

function fadeIn(audio: HTMLAudioElement, targetVolume: number, durationMs: number) {
  audio.volume = 0;
  const steps = 20;
  const stepDuration = durationMs / steps;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    audio.volume = Math.min(targetVolume, targetVolume * (step / steps));
    if (step >= steps) clearInterval(interval);
  }, stepDuration);
}

export function stopMusic() {
  if (!currentAudio) {
    currentTrack = null;
    return;
  }
  const audio = currentAudio;
  currentAudio = null;
  currentTrack = null;
  // Fade out, then pause
  fadeOut(audio, FADE_MS).catch(() => {});
}

export function startMusic(trackName: string) {
  if (typeof window === 'undefined') return; // SSR / native guard
  if (!musicEnabled) {
    currentTrack = trackName; // remember what should be playing
    return;
  }
  if (currentTrack === trackName && currentAudio && !currentAudio.paused) {
    return; // already playing
  }

  // Stop previous track
  if (currentAudio) {
    const old = currentAudio;
    fadeOut(old, FADE_MS).catch(() => {});
  }

  const asset = TRACK_FILES[trackName];
  if (!asset) {
    console.warn(`No music track found: ${trackName}`);
    return;
  }
  const url = resolveUrl(asset);
  if (!url) return;

  try {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    currentAudio = audio;
    currentTrack = trackName;
    audio.play()
      .then(() => fadeIn(audio, VOLUME, FADE_MS))
      .catch((err) => {
        // Autoplay blocked — will start on user interaction
        console.warn('Music autoplay blocked:', err);
      });
  } catch (err) {
    console.warn('Failed to start music:', err);
  }
}

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled;
  AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false').catch(() => {});
  if (!enabled) {
    if (currentAudio) {
      const old = currentAudio;
      currentAudio = null;
      fadeOut(old, FADE_MS).catch(() => {});
    }
  } else if (currentTrack) {
    // Resume the track that was supposed to be playing
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
