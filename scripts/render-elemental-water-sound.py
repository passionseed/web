#!/usr/bin/env python3
"""
Sound for the Elemental Water video (scripts/render-elemental-water.mjs).

    python3 scripts/render-elemental-water-sound.py <events.json> <out.wav>
            [--ambience <stream.wav>] [--birds <birds.wav>]

It follows the picture from normal to corrupted:
- the river runs clean while the valley is clean, then breaks up as the
  poison spreads and is gone by the end;
- each outfall grinds out of the bank, coughs, then gushes: a thick wet
  roar with glugs in it, as loud as it pours in the picture, panned to
  where it is (the far one quieter and duller);
- the drums land with a hollow metal boom and a slosh, then trickle;
- every sludge bubble the picture pops, pops; every drip plinks;
- at the end a low, thick drone and slow, heavy bubbling are left.
Stream: "Small River 1 - Slow - Distant" by Pfannkuchn on Freesound (CC0),
found through Openverse. Birds (optional, quiet): "Birds singing in the
countryside, Oklahoma, USA" by felix.blume on Freesound (CC0). Without
--ambience there's a quiet filtered noise in the river's place.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from elemental_sound import SR, Track, break_up, clatter, level, load_spec, pan, read_wav, thud  # noqa: E402

args = sys.argv[1:]
spec = load_spec(args[0])
out_path = args[1]
opt = lambda name: args[args.index(name) + 1] if name in args else None  # noqa: E731
amb_path = opt("--ambience")
birds_path = opt("--birds")

tr = Track(spec["duration"], seed=11)
rng = tr.rng
b0, b1, ease = spec["buildStart"], spec["buildEnd"], spec.get("ease", 1.5)
lv = level(tr.t, b0, b1, ease)
fps = spec["fps"]


def ma(sig, k):
    """Moving average over k samples (fast, any k): a low-pass."""
    k = max(1, int(k))
    c = np.cumsum(np.concatenate([np.zeros(k), sig]))
    out = (c[k:] - c[:-k]) / k
    return np.roll(out, -(k // 2))


def band(sig, lo_k, hi_k):
    """Rough band-pass: what a short average keeps minus what a long one keeps."""
    return ma(sig, lo_k) - ma(sig, hi_k)


def norm(sig):
    return sig / (np.std(sig) + 1e-9)


def env_of(key):
    """A per-frame value from the picture, as an envelope at the sample rate."""
    a = np.array([p[key] for p in spec["pours"]], dtype=float)
    return np.interp(tr.t, np.arange(len(a)) / fps, a)


def bloop(f0, d=0.09, rise=1.8, decay=0.35):
    """A bubble: a short tone whose pitch rises as it reaches the surface."""
    tt = np.arange(int(d * SR)) / SR
    f = f0 * (1 + rise * tt / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.clip(tt / 0.003, 0, 1) * np.exp(-tt / (d * decay))
    return np.sin(ph) * env


def click(d=0.006):
    tt = np.arange(int(d * SR)) / SR
    n = rng.normal(0, 1, len(tt)) * np.exp(-tt * 900)
    return n - ma(n, 4)


# ---------- the calm river ----------
if amb_path:
    calm = read_wav(amb_path, tr.n) * 0.3
else:
    calm = pan(0.5, norm(band(rng.normal(0, 1, tr.n), 6, 60)) * 0.05)
if birds_path:
    calm = calm + read_wav(birds_path, tr.n) * 0.09
tr.bed(break_up(calm, lv, rng, fade_at=b1 - 0.2))

# ---------- the outfalls ----------
# Each outfall sounds where it is in the picture, as big as it is there;
# a far one (small) is quieter and duller.
for e in [e for e in spec["events"] if e["type"] == "pour"]:
    x, gain, dull = e["x"], e["size"] ** 1.2, 1 if e["size"] > 0.6 else 3
    p = env_of(e["id"])
    if p.max() <= 0:
        continue
    noise = rng.normal(0, 1, tr.n)
    # A thick, wet roar: a low body and a little splash hiss on top, lumpy,
    # because sludge comes out in surges.
    body = norm(band(noise, 14 * dull, 110))
    hiss = norm(band(noise, 3 * dull, 14))
    lump = ma(rng.normal(0, 1, tr.n), 1800)
    lump = 0.55 + 0.9 * np.clip(norm(lump) * 0.4, -0.6, 1)
    # Once the river is dead the gush sinks under the drone: duller, quieter.
    settle = 1 - 0.45 * np.clip((tr.t - b1) / 1.0, 0, 1)
    roar = (body * 0.75 + hiss * 0.22 * settle) * lump * p * 0.13 * gain * settle
    tr.bed(pan(x, roar))
    # Glugs in it: heavy bubbles bursting out of the pipe.
    for i in np.nonzero(rng.random(tr.n) < p * 6 / SR)[0]:
        g = bloop(70 + 90 * rng.random(), d=0.07 + 0.08 * rng.random(), rise=1.2 + rng.random())
        if dull > 1:
            g = ma(g, 6)
        tr.add(i / SR, pan(x + rng.normal(0, 0.03), g * 0.11 * gain * p[i]))

# ---------- the drums trickling ----------
leak = env_of("drums") / 4
if leak.max() > 0:
    tr.bed(pan(0.45, norm(band(rng.normal(0, 1, tr.n), 3, 12)) * ma(np.clip(rng.normal(0.6, 0.5, tr.n), 0, 1), 900) * leak * 0.03))

# ---------- events from the picture ----------
for e in spec["events"]:
    t, x, kind = e["t"], e["x"], e["type"]
    if kind == "appear":
        # Grinding out of the bank: a dull scrape and a rattle of grit.
        d = 0.45
        tt = np.arange(int(d * SR)) / SR
        grind = norm(band(rng.normal(0, 1, len(tt)), 20, 200)) * np.sin(np.pi * tt / d) ** 0.7
        grit = np.zeros(len(tt))
        for _ in range(3):
            c = clatter(rng, "plastic", 0.2)
            at = int(rng.random() * (len(tt) - len(c)))
            grit[at : at + len(c)] += c
        s = e["size"]
        tr.add(t, pan(x, (grind * 0.05 + grit * 0.09) * s))
    elif kind == "pour":
        # It coughs before it gushes.
        for k in range(4):
            tr.add(t + k * 0.07 + rng.random() * 0.03, pan(x, bloop(60 + 30 * rng.random(), d=0.14, rise=0.8) * 0.16 * e["size"]))
    elif kind == "drum":
        # A hollow steel drum hitting gravel: the thud, its ringing shell,
        # a rattle, and what's inside sloshing.
        tt = np.arange(int(0.9 * SR)) / SR
        f = 105 + 25 * rng.random()
        shell = sum(a * np.sin(2 * np.pi * f * m * tt + rng.random() * 6) * np.exp(-tt * dk) for m, a, dk in [(1, 1, 6), (1.59, 0.6, 9), (2.14, 0.45, 12), (2.65, 0.3, 16)])
        hit = thud(rng, 60, 0.5)
        slosh = norm(band(rng.normal(0, 1, len(tt)), 25, 160)) * np.exp(-((tt - 0.25) ** 2) / 0.02) * 0.4
        sig = np.zeros(len(tt))
        sig[: len(hit)] += hit * 0.55
        sig += shell * 0.22 + slosh * 0.12
        c = clatter(rng, "metal", 0.25)
        sig[: len(c)] += c * 0.08
        tr.add(t, pan(x, sig * 0.5))
    elif kind == "pop":
        # A sludge bubble: thick, low, ends in a wet click.
        size = e["size"]
        g = bloop((140 if size > 1 else 210) + 80 * rng.random(), d=0.06 + 0.04 * size, rise=1.4)
        g = np.concatenate([g, np.zeros(300)])
        c = click()
        g[-len(c) - 200 : -200] += c * 0.25
        tr.add(t - len(g) / SR * 0.8, pan(x, g * (0.05 + 0.03 * size)))
    elif kind == "drip":
        # A plink: a drop hitting the surface.
        g = bloop(700 + 500 * rng.random(), d=0.05, rise=1.1, decay=0.3)
        tr.add(t, pan(x, g * 0.05 * min(1, e["size"] + 0.3)))

# ---------- what's left at the end ----------
# A low, thick drone: two detuned lows and a fifth, warmed up and slowly
# beating, with a dark rumble under it. It comes in as the river dies.
drone_on = np.clip((lv - 0.45) / 0.55, 0, 1) ** 1.5
tt = tr.t
drone = (np.sin(2 * np.pi * 43 * tt) + np.sin(2 * np.pi * 43.6 * tt + 1) + 0.5 * np.sin(2 * np.pi * 64.7 * tt) + 0.35 * np.sin(2 * np.pi * 86.3 * tt + 2)) / 2.5
drone = np.tanh(drone * 1.8) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.23 * tt))
rumble = norm(ma(rng.normal(0, 1, tr.n), 220))
tr.bed(pan(0.5, (drone * 0.11 + rumble * 0.05) * drone_on))
# Slow, heavy bubbling in the dead river.
for i in np.nonzero(rng.random(tr.n) < drone_on * 2.2 / SR)[0]:
    g = bloop(55 + 50 * rng.random(), d=0.16 + 0.12 * rng.random(), rise=1.0, decay=0.4)
    tr.add(i / SR, pan(0.2 + 0.6 * rng.random(), g * 0.1 * drone_on[i]))

# Soft-limit the peaks (thuds, glugs), so the calm river at the start
# stays audible after the mix is normalised.
mix = tr.out / (np.max(np.abs(tr.out)) + 1e-9)
tr.out = np.tanh(mix * 2.2) / np.tanh(2.2)
tr.write(out_path, peak=0.8)  # headroom: the AAC encode overshoots
print(f"✅ {out_path}")
