// src/music.ts
// Music engine using Web Audio API — ported from docs/stitch-designs/music-preview.html

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'slominoes_music_enabled';

let ctx: AudioContext | null = null;
let currentTrack: string | null = null;
let currentInterval: ReturnType<typeof setInterval> | null = null;
let currentOscs: OscillatorNode[] = [];
let musicEnabled = true;
let initialized = false;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

// Note frequencies
const N: Record<string, number> = {
  C2: 65, D2: 73, E2: 82, F2: 87, G2: 98, A2: 110, B2: 123,
  C3: 131, D3: 147, E3: 165, F3: 175, Fs3: 185, G3: 196, A3: 220, Bb3: 233, B3: 247,
  C4: 262, D4: 294, E4: 330, F4: 349, Fs4: 370, G4: 392, A4: 440, Bb4: 466, B4: 494,
  C5: 523, D5: 587, E5: 659, F5: 698, Fs5: 740, G5: 784, A5: 880, Bb5: 932, B5: 988,
  C6: 1047, D6: 1175, E6: 1319,
  Eb3: 156, Ab3: 208, Eb4: 311, Ab4: 415, Eb5: 622, Ab5: 831,
};

// Sustained pad tone with slow attack
function pad(freq: number, dur: number, vol = 0.04, delay = 0) {
  if (!freq) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + delay + dur * 0.15);
    gain.gain.setValueAtTime(vol, c.currentTime + delay + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + delay + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + dur);
    currentOscs.push(osc);
  } catch {}
}

// Plucky arpeggio note
function pluck(freq: number, dur: number, type: OscillatorType = 'triangle', vol = 0.06, delay = 0) {
  if (!freq) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(vol, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(vol * 0.3, c.currentTime + delay + dur * 0.5);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + delay + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + dur);
    currentOscs.push(osc);
  } catch {}
}

// Soft melody note
function mel(freq: number, dur: number, vol = 0.05, delay = 0) {
  if (!freq) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.02);
    gain.gain.setValueAtTime(vol * 0.8, c.currentTime + delay + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + delay + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + dur);
    currentOscs.push(osc);
  } catch {}
}

// Sub bass
function sub(freq: number, dur: number, vol = 0.12, delay = 0) {
  if (!freq) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(vol, c.currentTime + delay);
    gain.gain.setValueAtTime(vol * 0.8, c.currentTime + delay + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + delay + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + dur);
    currentOscs.push(osc);
  } catch {}
}

function hihat(delay = 0, vol = 0.02) {
  try {
    const c = getCtx();
    const buf = c.createBuffer(1, c.sampleRate * 0.025, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(c.currentTime + delay);
  } catch {}
}

function kick(delay = 0, vol = 0.1) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, c.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(35, c.currentTime + delay + 0.12);
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 0.2);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + 0.2);
  } catch {}
}

// ============================================================
// TRACK DEFINITIONS
// ============================================================

function titleTrack(step: number, d: number) {
  if (step % 8 === 0) {
    const chords = [
      [N.C4, N.E4, N.G4], [N.A3, N.C4, N.E4],
      [N.F3, N.A3, N.C4], [N.G3, N.B3, N.D4],
    ];
    chords[Math.floor(step / 8)].forEach(n => pad(n, d * 8, 0.04));
  }

  const arps = [
    N.C5, N.E5, N.G5, N.E5, N.A4, N.C5, N.E5, N.C5,
    N.F4, N.A4, N.C5, N.A4, N.G4, N.B4, N.D5, N.B4,
    N.C5, N.G5, N.E5, N.G5, N.A4, N.E5, N.C5, N.E5,
    N.F4, N.C5, N.A4, N.C5, N.G4, N.D5, N.B4, N.D5,
  ];
  pluck(arps[step], d * 0.9, 'triangle', 0.05);

  if (step % 8 === 0) {
    const roots = [N.C2, N.A2, N.F2, N.G2];
    sub(roots[Math.floor(step / 8) % 4], d * 7.5);
  }

  const melody = [
    N.G5, 0, 0, 0, 0, N.E5, 0, 0,
    N.C5, 0, 0, N.D5, 0, 0, 0, 0,
    N.A5, 0, 0, 0, 0, N.G5, 0, N.E5,
    0, 0, N.F5, 0, N.G5, 0, 0, 0,
  ];
  if (melody[step]) mel(melody[step], d * 1.8, 0.04);

  if (step % 4 === 0) kick(0, 0.04);
  if (step % 4 === 2) hihat(0, 0.012);
}

function draftTrack(step: number, d: number) {
  if (step % 8 === 0) {
    const chords = [
      [N.G3, N.B3, N.D4], [N.D4, N.Fs4, N.A4],
      [N.E4, N.G4, N.B4], [N.C4, N.E4, N.G4],
    ];
    chords[Math.floor(step / 8)].forEach(n => pad(n, d * 8, 0.035));
  }

  const arps = [
    N.G4, 0, N.B4, 0, N.D5, 0, N.B4, 0,
    N.E4, 0, N.G4, 0, N.C5, 0, N.G4, 0,
    N.G4, 0, N.D5, 0, N.Fs4, 0, N.A4, 0,
    N.E4, 0, N.B4, 0, N.C4, 0, N.E4, 0,
  ];
  if (arps[step]) pluck(arps[step], d * 0.7, 'triangle', 0.04);

  if (step % 8 === 0) {
    const roots = [N.G2, N.D2, N.E2, N.C2];
    sub(roots[Math.floor(step / 8) % 4], d * 7.5, 0.08);
  }

  if (step % 8 === 0) kick(0, 0.03);
}

function lossTrack(step: number, d: number) {
  if (step % 8 === 0) {
    const chords = [
      [N.A3, N.C4, N.E4], [N.D4, N.F4, N.A4],
      [N.F3, N.A3, N.C4], [N.E3, N.Ab3, N.B3],
    ];
    chords[Math.floor(step / 8)].forEach(n => pad(n, d * 8, 0.045));
  }

  if (step % 8 === 0) {
    const roots = [N.A2, N.D2, N.F2, N.E2];
    sub(roots[Math.floor(step / 8) % 4], d * 8, 0.08);
  }

  const melody = [
    N.E5, 0, 0, 0, 0, 0, N.C5, 0,
    0, 0, 0, 0, N.D5, 0, 0, 0,
    N.C5, 0, 0, 0, 0, 0, N.A4, 0,
    0, 0, 0, 0, N.Ab4, 0, 0, 0,
  ];
  if (melody[step]) mel(melody[step], d * 2.5, 0.04);
}

function levelTrack(level: number) {
  return function (step: number, d: number) {
    const energy = 0.55 + level * 0.045;

    if (step % 8 === 0) {
      const ci = Math.floor(step / 8);
      const simple = [
        [N.C4, N.E4, N.G4], [N.G3, N.B3, N.D4],
        [N.A3, N.C4, N.E4], [N.F3, N.A3, N.C4],
      ];
      const rich = [
        [N.C4, N.E4, N.G4, N.B4], [N.G3, N.B3, N.D4, N.Fs4],
        [N.A3, N.C4, N.E4, N.G4], [N.F3, N.A3, N.C4, N.E4],
      ];
      const ch = level >= 5 ? rich[ci] : simple[ci];
      ch.forEach(n => pad(n, d * 8, 0.035 * energy));
    }

    if (step % 8 === 0) {
      const roots = [N.C2, N.G2, N.A2, N.F2];
      sub(roots[Math.floor(step / 8) % 4], d * 7.5, 0.1 * energy);
    }

    const arpPatterns = [
      [N.C5, 0, 0, 0, N.G4, 0, 0, 0, N.A4, 0, 0, 0, N.F4, 0, 0, 0,
        N.E5, 0, 0, 0, N.D5, 0, 0, 0, N.C5, 0, 0, 0, N.A4, 0, 0, 0],
      [N.C5, 0, N.E5, 0, N.G4, 0, N.B4, 0, N.A4, 0, N.C5, 0, N.F4, 0, N.A4, 0,
        N.E5, 0, N.G5, 0, N.D5, 0, N.B4, 0, N.C5, 0, N.E5, 0, N.A4, 0, N.C5, 0],
      [N.C5, N.E5, N.G5, N.E5, N.G4, N.B4, N.D5, N.B4, N.A4, N.C5, N.E5, N.C5, N.F4, N.A4, N.C5, N.A4,
        N.E5, N.G5, N.C6, N.G5, N.D5, N.G5, N.B5, N.G5, N.C5, N.E5, N.A5, N.E5, N.A4, N.C5, N.F5, N.C5],
    ];
    const ai = level <= 3 ? 0 : level <= 6 ? 1 : 2;
    const arp = arpPatterns[ai];
    if (arp[step]) pluck(arp[step], d * 0.8, 'triangle', 0.04 * energy);

    const melodies = [
      [N.G5, 0, 0, 0, 0, 0, N.E5, 0, 0, 0, 0, 0, N.D5, 0, 0, 0,
        N.E5, 0, 0, 0, 0, 0, N.C5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [N.G5, 0, 0, N.A5, 0, 0, N.G5, 0, N.E5, 0, 0, 0, N.D5, 0, N.C5, 0,
        N.E5, 0, N.G5, 0, 0, N.A5, 0, N.G5, N.E5, 0, 0, 0, N.D5, 0, 0, 0],
      [N.G5, 0, N.A5, N.G5, N.E5, 0, N.D5, 0, N.C5, 0, N.D5, N.E5, 0, N.G5, 0, 0,
        N.A5, 0, N.G5, N.E5, N.D5, 0, N.C5, 0, N.E5, 0, N.G5, 0, N.A5, N.G5, N.E5, 0],
      [0, N.E5, 0, N.G5, N.A5, 0, 0, N.G5, 0, N.E5, N.D5, 0, N.C5, 0, 0, 0,
        0, N.G5, 0, N.A5, N.B5, 0, 0, N.A5, 0, N.G5, N.E5, 0, N.D5, 0, N.C5, 0],
      [N.C5, N.D5, N.E5, 0, N.G5, 0, 0, N.A5, N.G5, 0, N.E5, 0, 0, 0, N.D5, 0,
        N.E5, N.G5, N.A5, 0, N.B5, 0, 0, N.C6, N.B5, 0, N.A5, N.G5, N.E5, 0, 0, 0],
    ];
    const mi = Math.floor((level - 1) / 2) % melodies.length;
    const m = melodies[mi];
    if (m[step]) mel(m[step], d * 1.2, 0.04 * energy);

    if (level >= 6 && step % 4 === 0) {
      const bassNotes = [N.C3, N.G3, N.A3, N.F3];
      const bi = Math.floor(step / 8) % 4;
      pluck(bassNotes[bi], d * 1.5, 'triangle', 0.04 * energy);
    }

    if (step % 8 === 0) kick(0, 0.05 * energy);
    if (level >= 3 && step % 4 === 0) kick(0, 0.04 * energy);
    if (level >= 2 && step % 4 === 2) hihat(0, 0.015 * energy);
    if (level >= 5 && step % 2 === 0) hihat(0, 0.01 * energy);
    if (level >= 7 && step % 2 === 1) hihat(0, 0.006 * energy);
    if (level >= 8 && step % 8 === 6) kick(0, 0.03 * energy);
  };
}

// ============================================================
// TRACK REGISTRY
// ============================================================

interface TrackDef {
  bpm: number;
  fn: (step: number, d: number) => void;
  steps: number;
}

const tracks: Record<string, TrackDef> = {
  title: { bpm: 90, fn: titleTrack, steps: 32 },
  draft: { bpm: 84, fn: draftTrack, steps: 32 },
  loss: { bpm: 66, fn: lossTrack, steps: 32 },
  level1: { bpm: 88, fn: levelTrack(1), steps: 32 },
  level2: { bpm: 90, fn: levelTrack(2), steps: 32 },
  level3: { bpm: 92, fn: levelTrack(3), steps: 32 },
  level4: { bpm: 96, fn: levelTrack(4), steps: 32 },
  level5: { bpm: 100, fn: levelTrack(5), steps: 32 },
  level6: { bpm: 104, fn: levelTrack(6), steps: 32 },
  level7: { bpm: 108, fn: levelTrack(7), steps: 32 },
  level8: { bpm: 112, fn: levelTrack(8), steps: 32 },
  level9: { bpm: 116, fn: levelTrack(9), steps: 32 },
  level10: { bpm: 120, fn: levelTrack(10), steps: 32 },
};

// ============================================================
// PUBLIC API
// ============================================================

export function stopMusic() {
  try {
    if (currentInterval) {
      clearInterval(currentInterval);
      currentInterval = null;
    }
    currentOscs.forEach(o => { try { o.stop(); } catch {} });
    currentOscs = [];
    currentTrack = null;
  } catch {}
}

export function startMusic(trackName: string) {
  try {
    if (!musicEnabled) return;
    const track = tracks[trackName];
    if (!track) return;

    // Don't restart the same track
    if (currentTrack === trackName) return;

    stopMusic();
    currentTrack = trackName;

    const stepDur = 60 / track.bpm / 2;
    let step = 0;

    function tick() {
      if (!musicEnabled) {
        stopMusic();
        return;
      }
      track.fn(step % track.steps, stepDur);
      step++;
    }

    tick();
    currentInterval = setInterval(tick, stepDur * 1000);
  } catch {}
}

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled;
  if (!enabled) {
    stopMusic();
  }
  try {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
  } catch {}
}

export function isMusicEnabled(): boolean {
  return musicEnabled;
}

/** Load music preference from storage. Call once on app init. */
export async function loadMusicPreference(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      musicEnabled = JSON.parse(raw) === true;
    }
  } catch {}
}
