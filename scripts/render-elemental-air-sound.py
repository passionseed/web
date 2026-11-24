#!/usr/bin/env python3
"""
Sound for the Elemental Air video (scripts/render-elemental-air.mjs).

    python3 scripts/render-elemental-air-sound.py <events.json> <out.wav>
        [--ambience <wind.wav>] [--birds <birds.wav>]

It follows the picture from clear to choked:
- open country plays clean while the valley is clear: wind over grass and
  birds. As the smog thickens it breaks up (the shared break_up), loses its
  top end (more and more low-passed, as if heard through the smog) and
  fades out before the end;
- each stack that goes up lands with a low knock, and when it lights it
  starts a low roar, panned to where it stands;
- under it, a factory drone and the hiss of far-off traffic rise with the
  number of working stacks, and they get muffled too, so at the end only a
  thick, low drone is left.

Recordings (both CC0, from Freesound via Openverse):
- wind: "Wind blowing in the countryside during spring, Tall Grass
  Prairie" by felix.blume, https://freesound.org/s/215414/
- birds: "Birds singing in the countryside, Oklahoma, USA" by felix.blume,
  the same clip the Earth video uses;
- factory: "industrial factory noise ext close or distant far rumble" by
  kyles, https://freesound.org/s/453452/ (passed as --factory <wav>).
Without them, filtered noise stands in for the wind and the factory, and
there are no birds.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from elemental_sound import SR, Track, break_up, hum, level, load_spec, lowpass, noise_bed, pan, read_wav, thud  # noqa: E402

args = sys.argv[1:]
spec = load_spec(args[0])
out_path = args[1]
opt = lambda name: args[args.index(name) + 1] if name in args else None  # noqa: E731
wind_path, birds_path, factory_path = opt("--ambience"), opt("--birds"), opt("--factory")

tr = Track(spec["duration"])
t = tr.t
b0, b1 = spec["buildStart"], spec["buildEnd"]
lv = level(t, b0, b1, spec.get("ease", 1.5))


def muffle(sig, amount):
    """Low-pass a stereo signal more and more as `amount` (0..1, per sample)
    rises: a crossfade between copies through ever darker filters."""
    ks = [1, 6, 16, 40, 90]
    copies = [sig] + [np.stack([lowpass(sig[:, c], k) for c in range(2)], axis=1) for k in ks[1:]]
    pos = np.clip(amount, 0, 1) * (len(ks) - 1)
    out = np.zeros_like(sig)
    for i, cp in enumerate(copies):
        w = np.clip(1 - np.abs(pos - i), 0, 1)
        out += cp * w[:, None]
    return out


# ---------- the clear valley ----------
wind = read_wav(wind_path, tr.n) if wind_path else pan(0.5, noise_bed(t, tr.rng, smooth=30)) * 0.5
calm = wind * 0.55
if birds_path:
    calm = calm + read_wav(birds_path, tr.n) * 0.75
calm /= np.max(np.abs(calm)) + 1e-9
# Broken by the smog, then muffled behind it, then gone before the end.
calm = break_up(calm, lv * 0.85, tr.rng, fade_at=b1 - 1.0)
calm = muffle(calm, lv ** 0.8)
tr.bed(calm * 0.65)

# ---------- the industry ----------
events = spec["events"]
smoke_times = sorted(e["t"] for e in events if e["type"] == "smoke")
# How many stacks are working at each moment, eased in as each one lights.
working = np.zeros(tr.n)
for ts in smoke_times:
    working += np.clip((t - ts) / 0.8, 0, 1)
working /= max(1, len(smoke_times))

if factory_path:
    factory = read_wav(factory_path, tr.n)
else:
    factory = pan(0.5, noise_bed(t, tr.rng, smooth=12, wobble=0.1))
# Far away: a low rumble, not the clatter of the floor.
factory = np.stack([lowpass(lowpass(factory[:, c], 30), 30) for c in range(2)], axis=1)
factory /= np.max(np.abs(factory)) + 1e-9
drone = hum(t, f=43, harmonics=(1, 0.6, 0.35, 0.2)) + 0.5 * hum(t, f=43 * 1.5 + 0.3, harmonics=(1, 0.3))
drone = drone / np.max(np.abs(drone)) * (1 + 0.15 * np.sin(2 * np.pi * 0.23 * t))
rumble = noise_bed(t, tr.rng, smooth=160, wobble=0.25)
traffic = noise_bed(t, tr.rng, smooth=10, wobble=0.3)
traffic = lowpass(traffic, 4) - lowpass(traffic, 60)  # a band of hiss, like a far road
traffic /= np.max(np.abs(traffic)) + 1e-9
industry = (
    factory * (0.55 * working)[:, None]
    + pan(0.5, drone * 0.22 * (0.3 * working + 0.7 * lv))
    + pan(0.45, rumble * 0.35 * lv)
    + np.stack([traffic * 0.1, np.roll(traffic, 900) * 0.1], axis=1) * (working * (1 - 0.6 * lv))[:, None]
)
# The thicker the air, the more it's all muffled: at the end only the low
# drone gets through.
industry = muffle(industry, 0.15 + 0.85 * lv ** 1.3)
tr.bed(industry * 0.8)

# ---------- each stack ----------
for e in events:
    x = e["x"]
    if e["type"] == "build":
        # A far-off knock as it goes up.
        sig = thud(tr.rng, e["size"] * 1.2, d=0.4) * 0.22
        tr.add(e["t"] + 0.05, pan(x, lowpass(sig, 3)))
    else:
        # It lights: a low roar swelling up from nothing.
        d = 1.6
        tt = np.arange(int(d * SR)) / SR
        roar = lowpass(lowpass(tr.rng.normal(0, 1, len(tt)), 50), 20)
        roar /= np.max(np.abs(roar)) + 1e-9
        env = np.clip(tt / 0.5, 0, 1) * np.exp(-np.clip(tt - 0.5, 0, None) * 2.2)
        tr.add(e["t"], pan(x, roar * env * 0.18 * min(1.6, e["size"] / 30)))

tr.write(out_path)
print(f"✅ {out_path}")
