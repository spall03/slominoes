#!/usr/bin/env python3
"""
Generate game music tracks using MusicGen (small model).
Outputs WAV files to assets/music/
Run from the slominoes venv: source .musicgen-venv/bin/activate && python scripts/generate-music.py
"""

import os
import torch
import soundfile as sf
from transformers import AutoProcessor, MusicgenForConditionalGeneration

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'music')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Use small model for speed on CPU/MPS
MODEL_ID = "facebook/musicgen-small"
SAMPLE_RATE = 32000
DURATION_TOKENS = 1503  # ~30 seconds at 32kHz

print("Loading MusicGen small model...")
processor = AutoProcessor.from_pretrained(MODEL_ID)
model = MusicgenForConditionalGeneration.from_pretrained(MODEL_ID)

# Use MPS (Apple Silicon) if available
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Using device: {device}")
model = model.to(device)

TRACKS = [
    ("title", "upbeat cheerful chiptune 8-bit melody, bright major key, gentle keyboard arpeggios, warm synth pads, casino lounge feel, 90 bpm"),
    ("draft", "dreamy ambient chiptune, soft synth pads, gentle pulsing arpeggios, anticipation, hopeful major key, 84 bpm"),
    ("level1", "light happy chiptune, simple melody, gentle 8-bit synth, bright and easy, major key, 88 bpm"),
    ("level2", "cheerful chiptune game music, 8-bit melody with light percussion, upbeat major key, 90 bpm"),
    ("level3", "upbeat chiptune, catchy melody, 8-bit synth with snare drum, positive energy, 92 bpm"),
    ("level4", "energetic chiptune game music, walking bass, bright arpeggios, 8-bit synth, major key, 96 bpm"),
    ("level5", "lively chiptune, rich chords, keyboard heavy, 8-bit melody with fuller arrangement, 100 bpm"),
    ("level6", "driving chiptune game music, 8-bit synth layers, counter melody, building energy, 104 bpm"),
    ("level7", "intense chiptune, fast arpeggios, full 8-bit arrangement, driving rhythm, 108 bpm"),
    ("level8", "high energy chiptune game music, dense 8-bit synth, exciting and fast, 112 bpm"),
    ("level9", "very energetic chiptune, syncopated 8-bit melody, intense keyboard runs, building to climax, 116 bpm"),
    ("level10", "triumphant epic chiptune, maximum energy 8-bit synth, victorious melody, grand finale, 120 bpm"),
    ("loss", "sad melancholic chiptune, slow minor key, lonely 8-bit melody, soft sustained pads, 66 bpm"),
]

for i, (name, prompt) in enumerate(TRACKS):
    print(f"\n[{i+1}/{len(TRACKS)}] Generating '{name}'...")
    print(f"  Prompt: {prompt[:80]}...")

    inputs = processor(text=[prompt], padding=True, return_tensors="pt").to(device)

    with torch.no_grad():
        audio_values = model.generate(
            **inputs,
            max_new_tokens=DURATION_TOKENS,
            do_sample=True,
            temperature=1.0,
        )

    audio = audio_values[0, 0].cpu().numpy()
    out_path = os.path.join(OUTPUT_DIR, f"{name}.wav")
    sf.write(out_path, audio, SAMPLE_RATE)
    print(f"  Saved: {out_path} ({len(audio)/SAMPLE_RATE:.1f}s)")

print(f"\nDone! {len(TRACKS)} tracks saved to {OUTPUT_DIR}")
