#!/usr/bin/env python3
"""
Sound for the Elemental Fire video (scripts/render-elemental-fire.mjs).

    python3 scripts/render-elemental-fire-sound.py <fire-events.json> <out.wav>
        [--ambience <wind.wav>] [--birds <birds.wav>] [--fire <crackle.wav>] [--fire2 <body.wav>]

It follows the picture, using the fire's size on screen frame by frame
(fire-events.json "intensity", 0..1) and where it is ("centroid", for panning):
- clean: wind in the grass (and birds, only if --birds is given);
- the spark: a tiny tick and a fizz, then a small crackle as it catches;
- the build: the crackle grows into a roar, sap pops, and each fire that
  lights along the front goes up with a whoosh, panned to where it stands
  (any birds break up and are gone);
- the hold: the roar, the wind the fire makes, and a low drone.

Recordings (all CC0, passed in by path; each one is optional):
- --ambience: "birds,wind,grassland, Shangrila in Yunnan, China" by
  ocean.in.a.drop (Freesound 644915): wind in the grass;
- --birds: "Birds singing in the countryside, Oklahoma, USA" by felix.blume
  (Freesound): birdsong;
- --fire: "Bonfire HQ.wav" by tosha73 (Freesound 513280): the crackle;
- --fire2: "fire crackles" by florianreichelt (Freesound 563766): the body.
Without them, made-up stand-ins play (filtered noise and clicks).
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from elemental_sound import SR, Track, break_up, crackle, load_spec, lowpass, noise_bed, pan, read_wav  # noqa: E402

args = sys.argv[1:]
spec = load_spec(args[0])
out_path = args[1]
opt = lambda k: args[args.index(k) + 1] if k in args else None  # noqa: E731

tr = Track(spec["duration"], seed=11)
t = tr.t
rng = tr.rng
b0, b1 = spec["buildStart"], spec["buildEnd"]
fps = spec["fps"]


def db(x):
    return 10 ** (x / 20)


def at_rms(sig, target_db):
    """Scale a signal so its RMS sits at target_db (dBFS)."""
    r = np.sqrt(np.mean(sig**2)) + 1e-9
    return sig * db(target_db) / r


def highpass(sig, k):
    """Take out the rumble below about SR / k Hz (wind on the microphone)."""
    out = sig.copy()
    for c in range(sig.shape[1]):
        out[:, c] = sig[:, c] - lowpass(lowpass(sig[:, c], k), k)
    return out


def per_frame(values):
    """A per-frame curve from the picture, as a smooth curve over the track."""
    v = np.asarray(values, dtype=float)
    ft = np.arange(len(v)) / fps
    curve = np.interp(t, ft, v)
    return lowpass(curve, int(0.15 * SR))


# How big the fire is, from the picture, and where (0 left .. 1 right).
size = np.clip(per_frame(spec["intensity"]), 0, 1)
# How much is burning overall (it keeps growing as the fire spreads, even
# when the flames move far away and look small).
burning = np.clip(per_frame(spec.get("smoke", spec["intensity"])), 0, 1)
where = np.clip(per_frame(spec["centroid"]), 0, 1)
spark = next(e for e in spec["events"] if e["type"] == "spark")
spark_t = spark["t"]
# The fire as you hear it: the spark's small fizz first, then its size,
# with a floor so the burning never drops out once it's going.
caught = np.clip((t - spark_t - 0.5) / 1.5, 0, 1)
fire = np.maximum(np.maximum(size**0.6, burning**0.7), 0.18 * caught)
fire = np.maximum.accumulate(fire) * 0.6 + fire * 0.4  # a big fire doesn't go quiet at once


def stereo_follow(sig):
    """Pan a mono signal along with the fire."""
    a = where * np.pi / 2
    return np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1) * 1.3


# ---------- the calm place ----------
if opt("--ambience"):
    wind = highpass(read_wav(opt("--ambience"), tr.n), 160)
else:
    wind = pan(0.5, noise_bed(t, rng, smooth=30)) * 0.6
wind = at_rms(wind, -24)
# The wind stays, and later swells: the fire makes its own wind.
wind_swell = 1 + 1.2 * np.clip((t - b0 - 3) / 4, 0, 1)
tr.bed(wind * wind_swell[:, None])

if opt("--birds"):
    birds = at_rms(read_wav(opt("--birds"), tr.n), -27)
    # The birds break up as the fire spreads, and are gone before it peaks.
    lv = np.clip((t - spark_t - 1.0) / (b1 - spark_t - 2.0), 0, 1)
    tr.bed(break_up(birds, lv, rng, fade_at=b0 + (b1 - b0) * 0.6))

# ---------- the fire ----------
# The spark: a tick and a soft fizz.
tick = rng.normal(0, 1, int(0.012 * SR)) * np.exp(-np.arange(int(0.012 * SR)) / SR * 400)
tr.add(spark_t, pan(spark["x"], tick * db(-20)))
fz = np.arange(int(0.9 * SR)) / SR
fizz = lowpass(rng.normal(0, 1, len(fz)), 3) - lowpass(rng.normal(0, 1, len(fz)), 12)
tr.add(spark_t + 0.05, pan(spark["x"], fizz * np.exp(-fz * 2.5) * np.clip(fz * 20, 0, 1) * db(-34)))

# Crackle: a real fire recording, louder as the fire grows.
if opt("--fire"):
    crack = at_rms(read_wav(opt("--fire"), tr.n), -22)
    crack = crack.mean(axis=1)
else:
    crack = crackle(t, 40 + 0 * t, rng) * 0.2
tr.bed(stereo_follow(crack * fire))
# Its body: a second recording, lower and fuller, in with the bigger fire.
if opt("--fire2"):
    body = at_rms(read_wav(opt("--fire2"), tr.n), -22).mean(axis=1)
else:
    body = noise_bed(t, rng, smooth=12) * 0.05
tr.bed(stereo_follow(body * np.clip(fire - 0.15, 0, 1) ** 1.2 * 1.2))
# Extra pops, sparse when small and busy when it's big.
# (Scaled by their loudest pop: they're sparse, so scaling by their average
# would make each pop a spike.)
pops = crackle(t, 2 + 45 * fire**1.5, rng)
tr.bed(stereo_follow(pops / (np.abs(pops).max() + 1e-9) * db(-16) * (0.4 + fire)))
# The roar: dark noise that grows with the fire, plus a rumble under it.
roar = noise_bed(t, rng, smooth=45, wobble=0.25)
rumble = noise_bed(t, rng, smooth=220, wobble=0.3)
tr.bed(stereo_follow(at_rms(roar, -24) * np.clip(fire - 0.2, 0, 1) ** 1.4 * 1.4))
tr.bed(pan(0.5, at_rms(rumble, -24) * np.clip(fire - 0.3, 0, 1) ** 1.5 * 1.6))

# Each tree going up: a whoosh, a breath of air pulled in and lit.
for e in spec["events"]:
    if e["type"] not in ("torch", "treeline"):
        continue
    big = e["type"] == "torch"
    d = 1.6 if big else 1.1
    tt = np.arange(int(d * SR)) / SR
    env = np.clip(tt / 0.25, 0, 1) ** 2 * np.exp(-np.clip(tt - 0.25, 0, None) * 3)
    n = rng.normal(0, 1, len(tt))
    # Brighter as it peaks: a low-pass that opens.
    wh = lowpass(n, 30) * (1 - np.clip(tt / 0.3, 0, 1)) + lowpass(n, 6) * np.clip(tt / 0.3, 0, 1)
    wh = at_rms(wh * env, -20 if big else -27)
    tr.add(e["t"] - 0.15, pan(e["x"], wh))

# ---------- the end ----------
# A low drone under the roar: two close tones that beat slowly.
drone_on = np.clip((t - (b1 - 1.5)) / 2.0, 0, 1)
drone = np.sin(2 * np.pi * 41 * t) + 0.8 * np.sin(2 * np.pi * 41.7 * t) + 0.35 * np.sin(2 * np.pi * 82.3 * t)
tr.bed(pan(0.5, at_rms(drone, -27) * drone_on))

# Keep the loudest pops from setting the level: a limiter that turns the
# whole mix down smoothly around a peak (rather than flattening the wave,
# which the AAC encoder would turn back into overshoot), then Track.write
# normalises the mix below full scale.
lim = np.percentile(np.abs(tr.out), 99.5)
peak = np.abs(tr.out).max(axis=1)
w = int(0.004 * SR)
env = np.maximum.reduce([np.roll(peak, k) for k in range(-w, w + 1, max(1, w // 8))])
gain = np.minimum(1, lim / (env + 1e-9))
gain = np.minimum(gain, np.convolve(gain, np.ones(2 * w) / (2 * w), mode="same"))
tr.out *= gain[:, None]
# Take off the top octave (above about 12 kHz): crackle up there makes the
# MP4's AAC encoder throw out bursts that clip.
try:
    from scipy.signal import butter, sosfilt

    tr.out = sosfilt(butter(4, 12000, fs=SR, output="sos"), tr.out, axis=0)
except ImportError:
    for c in range(2):
        tr.out[:, c] = lowpass(tr.out[:, c], 2)
tr.write(out_path, peak=0.6)
print(f"✅ {out_path}")
