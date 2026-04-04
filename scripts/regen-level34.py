#!/usr/bin/env python3
"""Regenerate level 3 and 4 to match the minimal style of 1, 2, 5."""

import os
import time
import requests

API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
if not API_KEY:
    raise SystemExit("Set ELEVENLABS_API_KEY env var")

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'music')

URL = "https://api.elevenlabs.io/v1/music/generate"
HEADERS = {"xi-api-key": API_KEY, "Content-Type": "application/json"}

# Both prompts echo the style of levels 1, 2, 5:
# - Very sparse, gentle pads, simple motifs
# - Minimal or no percussion
# - Warm major key, focused feel
TRACKS = [
    ("level3",
     "Minimal chiptune. Gentle 8-bit lead melody with a soft sustained pad underneath. Warm major key. Very sparse — lots of space between notes. Light hi-hat only, no kick. Focused and calm. 30 seconds. Seamlessly loopable."),
    ("level4",
     "Minimal gentle chiptune. Soft repeating arpeggio on square wave synth with a quiet pad. Warm major key. Sparse and spacious. Single light hi-hat pulse. No busy drums. 30 seconds. Seamlessly loopable."),
]

for name, prompt in TRACKS:
    out_path = os.path.join(OUTPUT_DIR, f"{name}.mp3")
    print(f"\nGenerating '{name}'...")
    print(f"  Prompt: {prompt[:80]}...")

    data = {
        "prompt": prompt,
        "duration_seconds": 30,
        "respect_sections_durations": True,
        "instrumental": True,
        "tags": ["chiptune", "minimal", "gentle", "loopable"],
    }

    response = requests.post(URL, headers=HEADERS, json=data, timeout=180)
    if response.status_code == 200:
        with open(out_path, "wb") as f:
            f.write(response.content)
        print(f"  Saved: {out_path} ({len(response.content)/1024:.0f} KB)")
    else:
        print(f"  ERROR {response.status_code}: {response.text[:200]}")

    time.sleep(3)

print("\nDone.")
