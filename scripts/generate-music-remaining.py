#!/usr/bin/env python3
"""Generate remaining ElevenLabs music tracks: levels 7-10 + loss."""

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

TRACKS = [
    ("level7",
     "Intense chiptune game music. Fast 8-bit arpeggios with driving bass. Exciting and urgent major key melody. Full retro game soundtrack energy. Seamlessly loopable. 115 BPM.",
     ["chiptune", "intense", "loopable", "game-music"]),
    ("level8",
     "High energy chiptune game music. Dense 8-bit synth layers, fast tempo. Thrilling major key melody with syncopation. Maximum retro game energy. Seamlessly loopable. 120 BPM.",
     ["chiptune", "high-energy", "loopable", "game-music"]),
    ("level9",
     "Very fast exciting chiptune game boss level music. Urgent 8-bit melody with intense arpeggios. Major key but tense and exciting. Building to climax. Seamlessly loopable. 125 BPM.",
     ["chiptune", "exciting", "loopable", "game-music"]),
    ("level10",
     "Epic triumphant chiptune final level music. Grand 8-bit melody, victorious major key. Maximum energy with full retro synth arrangement. Celebratory and powerful. Seamlessly loopable. 130 BPM.",
     ["chiptune", "triumphant", "loopable", "game-music"]),
    ("loss",
     "Sad melancholic chiptune game over music. Slow minor key melody on soft 8-bit synth. Lonely and reflective. Sustained pads with minimal percussion. Gentle and bittersweet. Seamlessly loopable. 66 BPM.",
     ["chiptune", "sad", "loopable", "game-music"]),
]

for i, (name, prompt, tags) in enumerate(TRACKS):
    out_path = os.path.join(OUTPUT_DIR, f"{name}.mp3")
    print(f"\n[{i+1}/{len(TRACKS)}] Generating '{name}'...")

    data = {
        "prompt": prompt,
        "duration_seconds": 30,
        "instrumental": True,
        "tags": tags,
    }

    try:
        response = requests.post(URL, headers=HEADERS, json=data, timeout=180)
        if response.status_code == 200:
            with open(out_path, "wb") as f:
                f.write(response.content)
            print(f"  Saved: {out_path} ({len(response.content)/1024:.0f} KB)")
        else:
            print(f"  ERROR {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"  ERROR: {e}")

    if i < len(TRACKS) - 1:
        time.sleep(5)

print("\nDone!")
