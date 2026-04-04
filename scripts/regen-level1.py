#!/usr/bin/env python3
"""Regenerate level1 track with stronger prompt."""

import os
import requests

API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
if not API_KEY:
    raise SystemExit("Set ELEVENLABS_API_KEY env var")

OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'music', 'level1.mp3')

URL = "https://api.elevenlabs.io/v1/music/generate"
HEADERS = {"xi-api-key": API_KEY, "Content-Type": "application/json"}

# Stronger level 1 — still minimal but with more presence
PROMPT = (
    "Minimal chiptune game level music. Catchy 8-bit lead melody with a steady soft kick and hi-hat. "
    "Simple bass line underneath. Warm major key. Confident and engaging but not busy. "
    "Retro game soundtrack vibe. 30 seconds. Seamlessly loopable."
)

data = {
    "prompt": PROMPT,
    "duration_seconds": 30,
    "respect_sections_durations": True,
    "instrumental": True,
    "tags": ["chiptune", "minimal", "catchy", "loopable", "game-music"],
}

print("Generating level1 (stronger version)...")
print(f"Prompt: {PROMPT[:80]}...")

response = requests.post(URL, headers=HEADERS, json=data, timeout=180)
if response.status_code == 200:
    with open(OUTPUT, "wb") as f:
        f.write(response.content)
    print(f"Saved: {OUTPUT} ({len(response.content)/1024:.0f} KB)")
else:
    print(f"ERROR {response.status_code}: {response.text[:200]}")
