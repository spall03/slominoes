// src/settings-store.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setMusicEnabled } from './music';

const STORAGE_KEY = 'slominoes_settings';

interface SettingsData {
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

export interface SettingsState {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  toggleMusic: () => void;
  toggleSfx: () => void;
}

async function persist(data: SettingsData) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  musicEnabled: true,
  sfxEnabled: true,
  loaded: false,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Partial<SettingsData>;
        const music = data.musicEnabled !== false;
        const sfx = data.sfxEnabled !== false;
        setMusicEnabled(music);
        set({ musicEnabled: music, sfxEnabled: sfx, loaded: true });
      } else {
        setMusicEnabled(true);
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  toggleMusic: () => {
    const next = !get().musicEnabled;
    setMusicEnabled(next);
    set({ musicEnabled: next });
    persist({ musicEnabled: next, sfxEnabled: get().sfxEnabled });
  },

  toggleSfx: () => {
    const next = !get().sfxEnabled;
    set({ sfxEnabled: next });
    persist({ musicEnabled: get().musicEnabled, sfxEnabled: next });
  },
}));
