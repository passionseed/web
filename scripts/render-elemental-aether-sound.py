#!/usr/bin/env python3
"""
Sound for the Elemental Aether video (scripts/render-elemental-aether.mjs).

    python3 scripts/render-elemental-aether-sound.py <events.json> <out.wav> [--ambience <field.wav>]

It follows the picture from normal to corrupted:
- the rice field's own evening sound (insects and frogs) plays clean, then
  breaks up as the data center grows and is gone before the end;
- every block lands with its own sound, panned to where it lands: a deep
  thud and a steel clank for a hall section, a duller thud for generators,
  units and transformers, a ringing clank for steel, a tick for each fence
  post, and a muffled, quiet thud for the far halls behind the trees;
- when the new line is connected it snaps with a zap, and from then on the
  lines crackle (more as more power runs through them) and a mains hum
  rises (50 Hz with the 100 Hz buzz of transformers);
- server fans spin up once the first hall stands, the floodlights switch on
  with a clunk, and at the end only the machine drone is left.
Field recording: "Sounds of various animals in the rice fields." by
River_flowers on Freesound (sound 721222), CC0. Without --ambience there's
a quiet wind in its place. Everything else is made from numbers with a
fixed seed, so every run sounds the same.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from elemental_sound import SR, Track, break_up, clatter, crackle, fans, hum, level, load_spec, lowpass, noise_bed, pan, read_wav, thud  # noqa: E402

args = sys.argv[1:]
spec = load_spec(args[0])
out_path = args[1]
amb_path = args[args.index("--ambience") + 1] if "--ambience" in args else None

tr = Track(spec["duration"], seed=11)
b0, b1 = spec["buildStart"], spec["buildEnd"]
ease = spec.get("ease", 1.5)
lv = level(tr.t, b0, b1, ease)
t = tr.t
ramp = lambda start, length: np.clip((t - start) / length, 0, 1)  # noqa: E731

# ---------- the field, breaking up ----------
if amb_path:
    calm = read_wav(amb_path, tr.n)
    # Take out the rumble under the insects (wind on the microphone).
    calm = calm - np.stack([lowpass(calm[:, k], 60) for k in range(2)], axis=1)
    # Level it by loudness, not by its loudest croak, so it's clearly heard.
    calm = np.tanh(calm / (np.sqrt(np.mean(calm**2)) + 1e-9) * 0.09 / 0.6) * 0.6
else:
    calm = pan(0.5, noise_bed(t, tr.rng)) * 0.4
tr.bed(break_up(calm, lv, tr.rng, fade_at=b1 - 1.2))


# ---------- blocks landing ----------
def over(*sigs):
    """Mix mono signals of different lengths, all starting together."""
    out = np.zeros(max(len(x) for x in sigs))
    for x in sigs:
        out[: len(x)] += x
    return out


def clank(rng, f0=None, d=0.6):
    """Steel on steel: a few inharmonic partials that ring and die."""
    tt = np.arange(int(d * SR)) / SR
    f0 = f0 or 300 + rng.random() * 250
    sig = sum(np.sin(2 * np.pi * f0 * r * tt + rng.random() * 6) * np.exp(-tt * (9 + 6 * k)) / (k + 1) for k, r in enumerate((1, 2.76, 5.4, 8.9)))
    hit = rng.normal(0, 1, len(tt)) * np.exp(-tt * 160)
    return sig * 0.5 + hit * 0.3


def boom(rng, d=0.7):
    """The weight of a whole building section settling (high enough for a phone speaker to carry)."""
    tt = np.arange(int(d * SR)) / SR
    f = 62 + rng.random() * 14
    tone = np.sin(2 * np.pi * f * tt * (1 - 0.2 * tt)) + 0.4 * np.sin(2 * np.pi * 2.03 * f * tt)
    return tone * np.exp(-tt * 7) * (1 - np.exp(-tt * 300))


for e in spec["events"]:
    k, at, x = e["type"], e["t"], e["x"]
    r = tr.rng
    if k == "hall":
        body = over(boom(r) * 0.3, thud(r, 60) * 0.3, clank(r, 180 + r.random() * 80, 0.8) * 0.2)
        if e.get("far"):
            # Far behind the trees: muffled and quieter.
            body = lowpass(lowpass(body, 40), 40) * 0.5
        tr.add(at, pan(x, body))
    elif k in ("genset", "transformer", "roofUnit"):
        tr.add(at, pan(x, over(thud(r, 45) * 0.32, clank(r, 220 + r.random() * 120, 0.4) * 0.07)))
    elif k in ("steel", "stack", "lamp"):
        tr.add(at, pan(x, over(clank(r) * 0.12, thud(r, 20) * 0.12)))
    elif k == "post":
        tr.add(at, pan(x, over(clank(r, 900 + r.random() * 500, 0.18) * 0.06, clatter(r, "metal", 0.18) * 0.03)))
    elif k == "connect":
        # The line goes live: a snap, a burst of crackle, and a short whine.
        L = int(0.9 * SR)
        tt = np.arange(L) / SR
        burst = crackle(tt, 900 * np.exp(-tt * 6), r) * 0.22
        whine = np.sin(2 * np.pi * np.cumsum(180 + 900 * np.exp(-tt * 3)) / SR) * np.exp(-tt * 2.5) * 0.08
        snap = lowpass(r.normal(0, 1, L), 3) * np.exp(-tt * 70) * 0.25
        tr.add(at, pan(x, burst + whine + snap))
    elif k == "zap":
        L = int(0.25 * SR)
        tt = np.arange(L) / SR
        z = crackle(tt, 500 * np.exp(-tt * 18), r) * 0.16
        z += np.sin(2 * np.pi * np.cumsum(2400 - 1800 * tt / 0.25) / SR) * np.exp(-tt * 30) * 0.025
        tr.add(at, pan(x, z))
    elif k == "lights":
        # Big contactors closing: two heavy clicks and a low thump.
        for j, dt in enumerate((0, 0.13)):
            L = int(0.3 * SR)
            tt = np.arange(L) / SR
            c = r.normal(0, 1, L) * np.exp(-tt * 120) * 0.25 + np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 25) * 0.25
            tr.add(at + dt, pan(0.4 + 0.2 * j, c))

# ---------- the machine taking over ----------
con = spec.get("connect", b0 + 3)
power = ramp(con, spec["duration"] - con - 0.5) ** 1.2
# Mains hum and transformer buzz, rising once the line is live.
buzz = hum(t, 50, (0.3, 1.0, 0.6, 0.45, 0.25)) + 0.12 * np.sign(np.sin(2 * np.pi * 100 * t))
tr.bed(pan(0.62, lowpass(buzz, 4) * (0.03 + 0.1 * power) * (t > con)))
# The lines crackle more and more.
cr = crackle(t, 5 + 90 * power * (t > con), tr.rng)
cr = cr - lowpass(cr, 4)
tr.bed(np.stack([cr * 0.06, np.roll(cr, 900) * 0.06], axis=1))
# Server fans spin up after the first hall stands.
fan_on = ramp(spec.get("fans", b0 + 2.5), 3.5) ** 1.5
whir = fans(t, tr.rng, fan_on, f=118) + 0.6 * fans(t, tr.rng, fan_on, f=161)
tr.bed(np.stack([lowpass(whir, 3) * 0.1, lowpass(np.roll(whir, 2000), 3) * 0.1], axis=1))
# The drone: a deep, slightly beating machine tone under everything at the end.
drone_on = ramp(b0 + (b1 - b0) * 0.45, (b1 - b0) * 0.6) ** 1.5
drone = np.sin(2 * np.pi * 55 * t) + 0.7 * np.sin(2 * np.pi * 55.7 * t) + 0.4 * np.sin(2 * np.pi * 110.4 * t)
# A thin electronic whine on top, so the drone still reads on a phone speaker.
whine = np.sin(2 * np.pi * 440 * t + 0.6 * np.sin(2 * np.pi * 0.4 * t)) + 0.5 * np.sin(2 * np.pi * 663 * t)
rumble = noise_bed(t, tr.rng, smooth=120, wobble=0.1)
tr.bed(pan(0.5, (drone * 0.08 + rumble * 0.1 + whine * 0.012) * drone_on))
tr.write(out_path)
print(f"✅ {out_path}")
