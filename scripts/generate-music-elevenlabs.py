#!/usr/bin/env python3
"""
Generate game music tracks using ElevenLabs Music API.
Outputs MP3 files to assets/music/
"""

import os
import time
import requests

API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
if not API_KEY:
    raise SystemExit("Set ELEVENLABS_API_KEY env var")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'music')
os.makedirs(OUTPUT_DIR, exist_ok=True)

URL = "https://api.elevenlabs.io/v1/music/generate"
HEADERS = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json",
}

# Each track: (filename, prompt, duration, tags)
TRACKS = [
    ("title",
     "Bright upbeat chiptune title screen music. Warm major key keyboard arpeggios over sustained synth pads. Simple catchy 4-bar melody that loops seamlessly. Dreamy and inviting casino lounge feel. 8-bit retro game aesthetic.",
     30, ["chiptune", "upbeat", "loopable", "game-music"]),

    ("draft",
     "Gentle anticipation chiptune music. Soft pulsing keyboard arpeggios in a major key. Airy and hopeful, like choosing your team before a game. Simple repeating pattern that loops seamlessly. Minimal percussion.",
     30, ["chiptune", "ambient", "loopable", "game-music"]),

    ("level1",
     "Easy relaxed chiptune game level music. Simple cheerful melody over gentle 8-bit synth pads. Light and breezy major key. Minimal percussion. Seamlessly loopable 4-bar pattern. Slow tempo around 88 BPM.",
     30, ["chiptune", "relaxed", "loopable", "game-music"]),

    ("level2",
     "Light cheerful chiptune puzzle game music. Catchy simple 8-bit melody with soft hi-hats. Bright major key, warm synth pads. Seamlessly loopable. Gentle energy, 90 BPM.",
     30, ["chiptune", "cheerful", "loopable", "game-music"]),

    ("level3",
     "Upbeat chiptune puzzle game music. Catchy repeating melody with snare drum joining in. 8-bit synth arpeggios over warm pads. Major key, positive energy. Seamlessly loopable. 95 BPM.",
     30, ["chiptune", "upbeat", "loopable", "game-music"]),

    ("level4",
     "Energetic chiptune game music with walking bass line. Bright keyboard arpeggios and catchy melody. 8-bit retro feel, major key. Fuller arrangement than easy levels. Seamlessly loopable. 100 BPM.",
     30, ["chiptune", "energetic", "loopable", "game-music"]),

    ("level5",
     "Lively chiptune game music. Rich major key chords with 8-bit keyboard runs. Catchy melody with counter-melody. Building excitement. Seamlessly loopable pattern. 105 BPM.",
     30, ["chiptune", "lively", "loopable", "game-music"]),

    ("level6",
     "Driving chiptune game music. Layered 8-bit synths with strong rhythm. Exciting major key melody over fast arpeggios. Full arrangement with bass, chords, lead. Seamlessly loopable. 110 BPM.",
     30, ["chiptune", "driving", "loopable", "game-music"]),

    ("level7",
     "Intense chiptune game music. Fast 8-bit arpeggios with driving bass. Exciting and urgent major key melody. Full retro game soundtrack energy. Seamlessly loopable. 115 BPM.",
     30, ["chiptune", "intense", "loopable", "game-music"]),

    ("level8",
     "High energy chiptune game music. Dense 8-bit synth layers, fast tempo. Thrilling major key melody with syncopation. Maximum retro game energy. Seamlessly loopable. 120 BPM.",
     30, ["chiptune", "high-energy", "loopable", "game-music"]),

    ("level9",
     "Very fast exciting chiptune game boss level music. Urgent 8-bit melody with intense arpeggios. Major key but tense and exciting. Building to climax. Seamlessly loopable. 125 BPM.",
     30, ["chiptune", "exciting", "loopable", "game-music"]),

    ("level10",
     "Epic triumphant chiptune final level music. Grand 8-bit melody, victorious major key. Maximum energy with full retro synth arrangement. Celebratory and powerful. Seamlessly loopable. 130 BPM.",
     30, ["chiptune", "triumphant", "loopable", "game-music"]),

    ("loss",
     "Sad melancholic chiptune game over music. Slow minor key melody on soft 8-bit synth. Lonely and reflective. Sustained pads with minimal percussion. Gentle and bittersweet. Seamlessly loopable. 66 BPM.",
     30, ["chiptune", "sad", "loopable", "game-music"]),
]

for i, (name, prompt, duration, tags) in enumerate(TRACKS):
    out_path = os.path.join(OUTPUT_DIR, f"{name}.mp3")
    print(f"\n[{i+1}/{len(TRACKS)}] Generating '{name}'...")
    print(f"  Prompt: {prompt[:80]}...")

    data = {
        "prompt": prompt,
        "duration_seconds": duration,
        "instrumental": True,
        "tags": tags,
    }

    try:
        response = requests.post(URL, headers=HEADERS, json=data, timeout=120)
        if response.status_code == 200:
            with open(out_path, "wb") as f:
                f.write(response.content)
            size_kb = len(response.content) / 1024
            print(f"  Saved: {out_path} ({size_kb:.0f} KB)")
        else:
            print(f"  ERROR {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"  ERROR: {e}")

    # Rate limit buffer
    if i < len(TRACKS) - 1:
        time.sleep(3)

print(f"\nDone! Tracks saved to {OUTPUT_DIR}")
