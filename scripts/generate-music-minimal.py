#!/usr/bin/env python3
"""
Regenerate ElevenLabs music tracks with minimal, 30-second loops.
Keeps: draft.mp3, level6.mp3 (user approved).
Regenerates: title, level1-5, level7-10, loss.
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

# Minimal prompts — fewer elements, more space, gentle
TRACKS = [
    ("title",
     "Minimal gentle chiptune. Just a soft 8-bit synth pad and a simple 4-note arpeggio. Warm major key. Sparse and dreamy. Lots of space between notes. No drums. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "ambient", "loopable"]),

    ("level1",
     "Minimal chiptune. Soft pulsing pad and a simple slow melody. Gentle major key. Very sparse. No drums. Calm and easy. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "calm", "loopable"]),

    ("level2",
     "Minimal gentle chiptune. Soft 8-bit arpeggio over a single pad chord. Warm major key. Sparse rhythm. Light hi-hat only. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "gentle", "loopable"]),

    ("level3",
     "Minimal chiptune game music. Simple melody on one lead synth, quiet pad underneath. Major key. Gentle kick pulse. Lots of space. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "simple", "loopable"]),

    ("level4",
     "Minimal chiptune. Soft arpeggio pattern on 8-bit synth with a single bass note per bar. Major key. Light percussion. Sparse and melodic. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "melodic", "loopable"]),

    ("level5",
     "Minimal chiptune puzzle game music. Simple repeating motif on square wave synth, gentle pad. Major key. Soft hi-hat only. Sparse and focused. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "focused", "loopable"]),

    ("level7",
     "Minimal chiptune. Slightly more active arpeggio on 8-bit synth. Soft kick and hi-hat. Major key, calm but present. Still sparse, lots of space. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "loopable"]),

    ("level8",
     "Minimal chiptune game music. Steady arpeggio with a simple bass line. Soft kick drum. Major key. Focused and calm. Not busy. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "steady", "loopable"]),

    ("level9",
     "Minimal chiptune. Quietly intense. Simple melody with a gentle underlying pulse. Major key. Soft drums. Focused and determined but still sparse. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "determined", "loopable"]),

    ("level10",
     "Minimal chiptune final level music. Simple triumphant melody on lead synth, warm pad underneath. Major key. Gentle drums. Hopeful and focused. Still minimal. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "hopeful", "loopable"]),

    ("loss",
     "Minimal melancholic chiptune. Single soft 8-bit melody note at a time over a slow sustained pad. Minor key. No drums. Sad and spacious. 30 seconds. Seamlessly loopable.",
     ["chiptune", "minimal", "sad", "loopable"]),
]

for i, (name, prompt, tags) in enumerate(TRACKS):
    out_path = os.path.join(OUTPUT_DIR, f"{name}.mp3")
    print(f"\n[{i+1}/{len(TRACKS)}] Generating '{name}'...")
    print(f"  Prompt: {prompt[:80]}...")

    data = {
        "prompt": prompt,
        "duration_seconds": 30,
        "respect_sections_durations": True,
        "instrumental": True,
        "tags": tags,
    }

    try:
        response = requests.post(URL, headers=HEADERS, json=data, timeout=180)
        if response.status_code == 200:
            with open(out_path, "wb") as f:
                f.write(response.content)
            size_kb = len(response.content) / 1024
            print(f"  Saved: {out_path} ({size_kb:.0f} KB)")
        else:
            print(f"  ERROR {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"  ERROR: {e}")

    # Brief pause between requests
    if i < len(TRACKS) - 1:
        time.sleep(3)

print(f"\nDone! Tracks saved to {OUTPUT_DIR}")
print("Note: draft.mp3 and level6.mp3 were kept as-is.")
