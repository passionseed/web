#!/usr/bin/env python3
"""
Sound for the Elemental Earth video (scripts/render-elemental-earth.mjs).

    python3 scripts/render-elemental-earth-sound.py <events.json> <out.wav> [--ambience <calm.wav>]

It follows the picture from normal to corrupted:
- the calm place plays clean (light rain on the terraces), then breaks up
  as the pile grows and is gone by the end;
- the trash lands with its own sounds: a deep thud for big pieces, a
  clatter of plastic or a ring of metal for small ones, panned to where it
  lands (only some of the thousands of pieces, or it turns to noise);
- flies and a low hum take over at the end.
Calm sound: "Light rain in a field of bananas trees" by felix.blume on
Freesound (512334, CC0); see scripts/elemental-audio/README.md. --birds is
kept as another name for --ambience. Without either there's a quiet wind.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from elemental_sound import Track, break_up, clatter, flies, hum, level, load_spec, noise_bed, pan, read_wav, thud  # noqa: E402

args = sys.argv[1:]
spec = load_spec(args[0])
out_path = args[1]
flag = "--ambience" if "--ambience" in args else "--birds"
calm_path = args[args.index(flag) + 1] if flag in args else None

tr = Track(spec["duration"])
b0, b1 = spec["buildStart"], spec["buildEnd"]
lv = level(tr.t, b0, b1, spec.get("ease", 1.5))

calm = read_wav(calm_path, tr.n) if calm_path else pan(0.5, noise_bed(tr.t, tr.rng)) * 0.4
tr.bed(break_up(calm, lv, tr.rng, fade_at=b1 - 0.4))

for e in spec["events"]:
    if e["type"] == "dirt" or (e["size"] < 22 and tr.rng.random() < 0.6):
        continue
    big = e["size"] >= 22 or e["type"] in ("tyre", "monitor", "box")
    kind = "metal" if e["type"] in ("can", "pcb", "phone") else "plastic"
    sig = thud(tr.rng, e["size"]) * 0.35 if big else clatter(tr.rng, kind) * 0.14
    tr.add(e["t"] + tr.rng.random() * 0.01, pan(e["x"], sig))

start = b0 + (b1 - b0) * 0.75 ** (1 / spec.get("ease", 1.5))
tr.bed(flies(tr.t, (tr.t - start).clip(0, 1.5) / 1.5))
tr.bed(pan(0.5, hum(tr.t) * 0.12 * lv))
tr.write(out_path)
print(f"✅ {out_path}")
