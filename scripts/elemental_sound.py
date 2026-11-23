"""
Shared sound for the Elemental element videos. Each element's sound script
(scripts/render-elemental-<element>-sound.py) imports this:

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from elemental_sound import *

The sound follows the picture from normal to corrupted, like the picture:
a real recording of the calm place (birds, water, wind, crickets) plays
clean, then breaks up as the element spreads (fewer bits, a lower sample
rate, stutters) and fades out; the element's own sounds come in on top,
timed to the picture; and something unnatural (a hum, flies, a drone) is
left at the end. Everything except the recordings is made from numbers
with a fixed seed, so every run is the same.

Recordings come from Openverse (CC0 only), passed in by path.
"""
import json
import wave

import numpy as np

SR = 44100


class Track:
    """A stereo mix of `dur` seconds, built up with add()."""

    def __init__(self, dur, seed=7):
        self.n = int(dur * SR)
        self.t = np.arange(self.n) / SR
        self.out = np.zeros((self.n, 2))
        self.rng = np.random.default_rng(seed)

    def add(self, at, stereo):
        """Mix a stereo signal (k x 2) in at `at` seconds."""
        i = int(at * SR)
        if i >= self.n or i < 0:
            return
        m = min(len(stereo), self.n - i)
        self.out[i : i + m] += stereo[:m]

    def bed(self, stereo):
        """Mix a full-length stereo signal (n x 2) in."""
        self.out += stereo[: self.n]

    def write(self, path, peak=0.89):
        """Fade in and out, normalise and write a 16-bit WAV."""
        out = self.out.copy()
        a, b = int(0.3 * SR), int(0.4 * SR)
        out[:a] *= np.linspace(0, 1, a)[:, None]
        out[-b:] *= np.linspace(1, 0, b)[:, None]
        out /= (np.max(np.abs(out)) + 1e-9) / peak
        with wave.open(path, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((out * 32767).astype(np.int16).tobytes())


def load_spec(path):
    """The events file an element script writes: duration, buildStart,
    buildEnd, ease and its events (each at least {t, x})."""
    return json.load(open(path))


def level(t, b0, b1, ease=1.5):
    """How far the element has got at time t, 0..1, matching the picture."""
    return np.clip((t - b0) / (b1 - b0), 0, 1) ** ease


def read_wav(path, n=None):
    """A WAV as float stereo at SR, looped or cut to n samples, peak 1."""
    with wave.open(path) as w:
        ch, sw, sr = w.getnchannels(), w.getsampwidth(), w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16 if sw == 2 else np.int32).astype(np.float64)
    a = a.reshape(-1, ch) / (2 ** (8 * sw - 1))
    if ch == 1:
        a = np.repeat(a, 2, axis=1)
    a = a[:, :2]
    if sr != SR:
        idx = np.arange(int(len(a) * SR / sr)) * sr / SR
        a = np.stack([np.interp(idx, np.arange(len(a)), a[:, k]) for k in range(2)], axis=1)
    if n is not None:
        a = np.resize(a, (n, 2))
    return a / (np.max(np.abs(a)) + 1e-9)


def break_up(clean, lv, rng, fade_at=None, block=2048):
    """The calm recording breaking as the element spreads: blends into a
    bit-crushed, down-sampled copy as lv rises, stutters past lv 0.6, and
    fades out from `fade_at` seconds (default: never)."""
    n = len(clean)
    broken = np.empty_like(clean)
    for i in range(0, n, block):
        s = lv[i]
        seg = clean[i : i + block].copy()
        hold = int(1 + 14 * s**1.2)
        if hold > 1:
            seg = np.repeat(seg[::hold], hold, axis=0)[: len(seg)]
        q = 2 ** (16 - 12 * s - 1)
        broken[i : i + block] = np.round(seg * q) / q
    gate = np.ones(n)
    step = int(0.06 * SR)
    for i in range(0, n, step):
        if lv[i] > 0.6 and rng.random() < (lv[i] - 0.6) * 1.8:
            gate[i : i + step] = 0
    gate = np.convolve(gate, np.ones(200) / 200, mode="same")
    t = np.arange(n) / SR
    fade = np.ones(n) if fade_at is None else np.clip(1 - (t - fade_at) / 1.2, 0, 1)
    w = lv[:, None]
    return (clean * (1 - w) ** 2 + broken * (1 - (1 - w) ** 2)) * (fade * gate)[:, None]


def pan(x, sig):
    """Mono to stereo, x 0 (left) .. 1 (right)."""
    a = np.clip(x, 0, 1) * np.pi / 2
    return np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1)


def lowpass(sig, k):
    """A cheap low-pass: moving average over k samples."""
    return np.convolve(sig, np.ones(k) / k, mode="same")


# ---------- made sounds ----------
def thud(rng, size=40, d=0.35):
    tt = np.arange(int(d * SR)) / SR
    f = 55 + rng.random() * 30
    body = np.sin(2 * np.pi * f * tt * (1 - 0.3 * tt)) * np.exp(-tt * 14)
    hit = lowpass(rng.normal(0, 1, len(tt)) * np.exp(-tt * 90), 12)
    return (body * 0.9 + hit * 0.6) * min(1, size / 40)


def clatter(rng, kind="plastic", d=0.25):
    out = np.zeros(int(d * SR))
    for _ in range(rng.integers(2, 6)):
        at = int(rng.random() * 0.12 * SR)
        L = int(0.03 * SR)
        tt = np.arange(L) / SR
        if kind == "metal":
            sig = np.sin(2 * np.pi * (1200 + rng.random() * 2400) * tt) * np.exp(-tt * 60)
        else:
            sig = rng.normal(0, 1, L) * np.exp(-tt * 140)
            sig = sig - lowpass(sig, 6)
        out[at : at + L] += sig[: len(out) - at] * (0.3 + 0.5 * rng.random())
    return out


def crackle(t, rate, rng):
    """Fire crackle: random pops whose rate (per second, array over t) can rise."""
    n = len(t)
    out = np.zeros(n)
    p = np.clip(rate / SR, 0, 1)
    idx = np.nonzero(rng.random(n) < p)[0]
    for i in idx:
        L = int(SR * (0.002 + 0.01 * rng.random()))
        tt = np.arange(L) / SR
        pop = rng.normal(0, 1, L) * np.exp(-tt * (300 + 500 * rng.random()))
        out[i : i + L] += pop[: n - i] * (0.2 + rng.random())
    return out - lowpass(out, 8) * 0.5


def noise_bed(t, rng, smooth=40, wobble=0.15):
    """Filtered noise with a slow swell: wind, a roar, a rumble (bigger smooth = darker)."""
    sig = lowpass(rng.normal(0, 1, len(t)), smooth)
    sig /= np.max(np.abs(sig)) + 1e-9
    swell = 1 + wobble * np.sin(2 * np.pi * 0.13 * t) + wobble * np.sin(2 * np.pi * 0.31 * t + 1)
    return sig * swell


def hum(t, f=50, harmonics=(1, 0.5, 0.25)):
    """Mains / machine hum."""
    return sum(a * np.sin(2 * np.pi * f * (k + 1) * t) for k, a in enumerate(harmonics))


def flies(t, on, count=3, gain=0.14):
    """Buzzing flies circling, stereo; `on` (array 0..1) brings them in."""
    out = np.zeros((len(t), 2))
    for k in range(count):
        f0 = 190 + 45 * k
        vib = np.sin(2 * np.pi * (5 + k) * t + k) * 14 + np.sin(2 * np.pi * 0.7 * t + k * 2) * 25
        ph = 2 * np.pi * np.cumsum(f0 + vib) / SR
        saw = lowpass(2 * ((ph / (2 * np.pi)) % 1) - 1, 5)
        amp = (0.5 + 0.5 * np.sin(2 * np.pi * (0.3 + 0.17 * k) * t + k)) * on
        p = 0.5 + 0.4 * np.sin(2 * np.pi * (0.21 + 0.1 * k) * t + k * 1.7)
        out += np.stack([saw * amp * np.cos(p * np.pi / 2), saw * amp * np.sin(p * np.pi / 2)], axis=1) * gain
    return out


def fans(t, rng, on, f=118):
    """Server-room fans: a whir with blade tone and air noise."""
    tone = np.sin(2 * np.pi * f * t) * 0.3 + np.sin(2 * np.pi * f * 2.02 * t) * 0.15
    air = lowpass(rng.normal(0, 1, len(t)), 6) * 0.6
    return (tone + air) * on
