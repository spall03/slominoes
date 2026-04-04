// src/sound.ts
// Synthesized sound effects with 3 subtle variations per sound.
// Uses Web Audio API — no audio files needed.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3, delay = 0) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + delay);
  gain.gain.setValueAtTime(volume, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration);
}

function playNoise(duration: number, volume = 0.1, delay = 0) {
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(4000, c.currentTime + delay);
  gain.gain.setValueAtTime(volume, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  source.start(c.currentTime + delay);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Variation helper: slight random offset to a frequency
function v(base: number, range = 15): number {
  return base + (Math.random() - 0.5) * range;
}

// =============================================================================
// SOUND EFFECTS
// =============================================================================

export function playTilePlace() {
  const variant = pick([0, 1, 2]);
  if (variant === 0) {
    playTone(800, 0.06, 'square', 0.15);
    playTone(1200, 0.04, 'sine', 0.1, 0.02);
  } else if (variant === 1) {
    playTone(850, 0.05, 'square', 0.13);
    playTone(1100, 0.05, 'sine', 0.1, 0.025);
  } else {
    playTone(760, 0.07, 'square', 0.14);
    playTone(1250, 0.035, 'sine', 0.09, 0.015);
  }
}

export function playMatch() {
  const variant = pick([0, 1, 2]);
  if (variant === 0) {
    // C-E-G
    playTone(523, 0.12, 'sine', 0.2);
    playTone(659, 0.12, 'sine', 0.2, 0.08);
    playTone(784, 0.18, 'sine', 0.25, 0.16);
  } else if (variant === 1) {
    // D-F#-A
    playTone(587, 0.11, 'sine', 0.2);
    playTone(740, 0.11, 'sine', 0.2, 0.08);
    playTone(880, 0.17, 'sine', 0.25, 0.16);
  } else {
    // E-G#-B
    playTone(659, 0.12, 'sine', 0.18);
    playTone(831, 0.12, 'sine', 0.2, 0.07);
    playTone(988, 0.18, 'sine', 0.22, 0.15);
  }
}

export function playBigMatch() {
  const variant = pick([0, 1, 2]);
  if (variant === 0) {
    playTone(523, 0.1, 'sine', 0.2);
    playTone(659, 0.1, 'sine', 0.2, 0.07);
    playTone(784, 0.1, 'sine', 0.2, 0.14);
    playTone(1047, 0.1, 'sine', 0.25, 0.21);
    playTone(1319, 0.3, 'sine', 0.2, 0.28);
    playNoise(0.15, 0.04, 0.28);
  } else if (variant === 1) {
    playTone(587, 0.1, 'sine', 0.2);
    playTone(740, 0.1, 'sine', 0.2, 0.07);
    playTone(880, 0.1, 'sine', 0.2, 0.14);
    playTone(1175, 0.1, 'sine', 0.25, 0.21);
    playTone(1480, 0.3, 'sine', 0.2, 0.28);
    playNoise(0.15, 0.04, 0.28);
  } else {
    playTone(494, 0.1, 'sine', 0.2);
    playTone(622, 0.1, 'sine', 0.2, 0.07);
    playTone(740, 0.1, 'sine', 0.2, 0.14);
    playTone(988, 0.1, 'sine', 0.25, 0.21);
    playTone(1245, 0.3, 'sine', 0.2, 0.28);
    playNoise(0.12, 0.04, 0.28);
  }
}

export function playLock() {
  const variant = pick([0, 1, 2]);
  if (variant === 0) {
    playTone(2000, 0.03, 'square', 0.1);
    playTone(1500, 0.05, 'triangle', 0.08, 0.02);
  } else if (variant === 1) {
    playTone(2200, 0.025, 'square', 0.09);
    playTone(1600, 0.045, 'triangle', 0.07, 0.02);
  } else {
    playTone(1900, 0.035, 'square', 0.1);
    playTone(1400, 0.05, 'triangle', 0.08, 0.018);
  }
}

export function playRespin() {
  const variant = pick([0, 1, 2]);
  const baseFreq = variant === 0 ? 1200 : variant === 1 ? 1300 : 1100;
  const step = variant === 0 ? 80 : variant === 1 ? 90 : 70;
  const speed = variant === 0 ? 0.035 : variant === 1 ? 0.03 : 0.04;
  for (let i = 0; i < 8; i++) {
    playTone(baseFreq - i * step, 0.04, 'sawtooth', 0.06, i * speed);
  }
  playNoise(0.25, 0.03);
}

export function playBuyRespin() {
  const variant = pick([0, 1, 2]);
  if (variant === 0) {
    playTone(880, 0.08, 'sine', 0.15);
    playTone(660, 0.08, 'sine', 0.15, 0.06);
    playTone(440, 0.12, 'triangle', 0.1, 0.12);
  } else if (variant === 1) {
    playTone(830, 0.08, 'sine', 0.14);
    playTone(620, 0.08, 'sine', 0.14, 0.065);
    playTone(415, 0.12, 'triangle', 0.1, 0.13);
  } else {
    playTone(930, 0.07, 'sine', 0.15);
    playTone(700, 0.08, 'sine', 0.15, 0.055);
    playTone(465, 0.13, 'triangle', 0.1, 0.115);
  }
}

export function playRotate() {
  const variant = pick([0, 1, 2]);
  const freq = variant === 0 ? 1400 : variant === 1 ? 1500 : 1300;
  playTone(freq, 0.03, 'triangle', 0.08);
}

export function playButtonTap() {
  const variant = pick([0, 1, 2]);
  if (variant === 0) {
    playTone(600, 0.04, 'sine', 0.1);
    playTone(900, 0.03, 'sine', 0.06, 0.02);
  } else if (variant === 1) {
    playTone(650, 0.035, 'sine', 0.1);
    playTone(950, 0.03, 'sine', 0.06, 0.018);
  } else {
    playTone(570, 0.045, 'sine', 0.09);
    playTone(860, 0.03, 'sine', 0.06, 0.022);
  }
}

export function playLevelWin() {
  const variant = pick([0, 1, 2]);
  if (variant === 0) {
    // C major
    playTone(523, 0.15, 'sine', 0.2);
    playTone(659, 0.15, 'sine', 0.2, 0.12);
    playTone(784, 0.15, 'sine', 0.2, 0.24);
    playTone(1047, 0.4, 'sine', 0.3, 0.36);
    playTone(1047, 0.4, 'triangle', 0.1, 0.36);
    playNoise(0.2, 0.03, 0.36);
  } else if (variant === 1) {
    // D major
    playTone(587, 0.15, 'sine', 0.2);
    playTone(740, 0.15, 'sine', 0.2, 0.12);
    playTone(880, 0.15, 'sine', 0.2, 0.24);
    playTone(1175, 0.4, 'sine', 0.3, 0.36);
    playTone(1175, 0.4, 'triangle', 0.1, 0.36);
    playNoise(0.2, 0.03, 0.36);
  } else {
    // G major
    playTone(392, 0.15, 'sine', 0.2);
    playTone(494, 0.15, 'sine', 0.2, 0.12);
    playTone(587, 0.15, 'sine', 0.2, 0.24);
    playTone(784, 0.4, 'sine', 0.3, 0.36);
    playTone(784, 0.4, 'triangle', 0.1, 0.36);
    playNoise(0.2, 0.03, 0.36);
  }
}

export function playLevelLose() {
  const variant = pick([0, 1, 2]);
  if (variant === 0) {
    playTone(440, 0.2, 'sine', 0.2);
    playTone(392, 0.2, 'sine', 0.18, 0.15);
    playTone(330, 0.2, 'sine', 0.15, 0.3);
    playTone(262, 0.5, 'sine', 0.12, 0.45);
  } else if (variant === 1) {
    playTone(415, 0.2, 'sine', 0.2);
    playTone(370, 0.2, 'sine', 0.18, 0.15);
    playTone(311, 0.2, 'sine', 0.15, 0.3);
    playTone(247, 0.5, 'sine', 0.12, 0.45);
  } else {
    playTone(466, 0.2, 'sine', 0.2);
    playTone(415, 0.2, 'sine', 0.18, 0.15);
    playTone(349, 0.2, 'sine', 0.15, 0.3);
    playTone(277, 0.5, 'sine', 0.12, 0.45);
  }
}

export function playUnlock() {
  const variant = pick([0, 1, 2]);
  const bases = [
    [400, 784, 988, 1175],   // G major
    [420, 831, 1047, 1245],  // Ab major
    [380, 740, 932, 1109],   // F# major
  ];
  const [base, c1, c2, c3] = bases[variant];

  for (let i = 0; i < 6; i++) {
    playTone(base + i * 150, 0.15, 'sine', 0.1, i * 0.08);
  }
  playTone(c1, 0.5, 'sine', 0.2, 0.5);
  playTone(c2, 0.5, 'sine', 0.15, 0.5);
  playTone(c3, 0.5, 'sine', 0.15, 0.5);
  playNoise(0.3, 0.05, 0.5);
}
