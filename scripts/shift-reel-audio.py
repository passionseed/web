#!/usr/bin/env python3
"""
Soundtrack for the SHIFT[1] testimonial Reels, scored from the Reel's own cue
sheet (window.__reelCues), so cuts, words and the price land on a sound.

    python3 scripts/shift-reel-audio.py cues.json out.wav [voice.wav]

With a voice track (mono or stereo 44.1 kHz wav, starting at 0s) the music
ducks under the voice. With `moods` in the cues, the arrangement follows the
story: light, dark, silent, build, full, offer.

Everything is synthesised here, so there is no licence to clear. It is meant
to sit under people reading Thai captions: soft lofi-chiptune in A minor
(Am7 Fmaj7 Cmaj7 G6) at the Reel's BPM. Sine and triangle voices only, the
whole bus low-passed, no noise crashes, and sound effects kept quieter than
the music. Harsh square waves and saturation read as noise on phone speakers.
"""

import json
import sys
import wave

import numpy as np

SR = 44100
A4 = 440.0

# Am7 Fmaj7 Cmaj7 G6 as semitones from A4, one bar each.
CHORDS = [[0, 3, 7, 10], [-4, 0, 3, 7], [3, 7, 10, 14], [-2, 2, 5, 9]]
# Melody for the offer, semitones from A5, one note per beat (None rests).
LEAD = [7, None, 3, 5, 7, None, 10, 7, 12, None, 10, 7, 5, None, 3, 0]


def hz(semis_from_a4: float) -> float:
    return A4 * 2 ** (semis_from_a4 / 12)


def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def env(dur: float, attack: float = 0.01, decay: float = 0.2) -> np.ndarray:
    t = t_axis(dur)
    return np.clip(t / attack, 0, 1) * np.exp(-t / decay)


def sine(freq: float, dur: float) -> np.ndarray:
    return np.sin(2 * np.pi * freq * t_axis(dur))


def soft_tri(freq: float, dur: float) -> np.ndarray:
    """Triangle with its upper harmonics rolled off: warm, still 8-bit-ish."""
    t = t_axis(dur)
    return sum(((-1) ** k) * np.sin(2 * np.pi * freq * (2 * k + 1) * t) / (2 * k + 1) ** 2 for k in range(3)) * 0.8


def pluck(freq: float, dur: float) -> np.ndarray:
    """Sine with a touch of octave, like a muted music box."""
    return (sine(freq, dur) + 0.25 * sine(freq * 2, dur)) * env(dur, 0.005, dur / 3)


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    """Gentle 4th-order-ish roll-off in the frequency domain."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(spec / (1 + (f / cutoff) ** 4), len(x))


def highpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    return x - lowpass(x, cutoff)


class Track:
    def __init__(self, seconds: float):
        self.buf = np.zeros(int((seconds + 2) * SR))

    def add(self, at: float, sound: np.ndarray, gain: float = 1.0) -> None:
        i = int(at * SR)
        if i < 0:
            sound, i = sound[-i:], 0
        end = min(len(self.buf), i + len(sound))
        self.buf[i:end] += gain * sound[: end - i]


# ---------- Instruments ----------

def kick() -> np.ndarray:
    t = t_axis(0.25)
    freq = 48 + 60 * np.exp(-t / 0.025)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t / 0.09)


def rim(seed: int) -> np.ndarray:
    """Soft snap instead of a noise snare."""
    n = np.random.default_rng(seed).uniform(-1, 1, int(0.06 * SR))
    body = sine(330, 0.06) * env(0.06, 0.001, 0.02)
    return lowpass(0.4 * n * env(0.06, 0.001, 0.012), 3500) + 0.6 * body


def shaker(seed: int) -> np.ndarray:
    n = np.random.default_rng(seed).uniform(-1, 1, int(0.04 * SR))
    return lowpass(highpass(n, 5000), 9000) * env(0.04, 0.003, 0.01)


def thump() -> np.ndarray:
    """Slam: a round sub thump, felt more than heard."""
    t = t_axis(0.5)
    return np.sin(2 * np.pi * (42 + 30 * np.exp(-t / 0.04)) * t) * np.exp(-t / 0.18)


def swell(dur: float, seed: int) -> np.ndarray:
    """Into a cut: filtered air rising, not a jet engine."""
    n = np.random.default_rng(seed).uniform(-1, 1, int(dur * SR))
    ramp = np.linspace(0, 1, len(n))
    return lowpass(n, 1800) * ramp**2


def pop(i: int) -> np.ndarray:
    notes = [12, 15, 19, 22]
    return sine(hz(notes[i % len(notes)] + 12), 0.08) * env(0.08, 0.002, 0.018)


def chime() -> np.ndarray:
    """Price: two soft bell notes."""
    a = pluck(hz(19), 0.25)
    b = pluck(hz(24), 0.9) * np.exp(-t_axis(0.9) / 0.4)
    out = np.zeros(int(1.0 * SR))
    out[: len(a)] += a
    out[int(0.09 * SR) : int(0.09 * SR) + len(b)] += b
    return out


# ---------- Score ----------

def read_wav(path: str) -> np.ndarray:
    with wave.open(path) as w:
        if w.getframerate() != SR or w.getsampwidth() != 2:
            sys.exit("voice must be 16-bit 44.1 kHz wav")
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
        return x.reshape(-1, w.getnchannels()).mean(axis=1)


def envelope(x: np.ndarray, window: float = 0.15) -> np.ndarray:
    """Smoothed loudness of the voice, 0..1, for ducking."""
    n = int(window * SR)
    power = np.convolve(x**2, np.ones(n) / n, mode="same")
    level = np.sqrt(power)
    return np.clip(level / (np.percentile(level, 95) + 1e-9), 0, 1)


def score(cues: dict, voice: np.ndarray | None = None) -> np.ndarray:
    beat = cues["beat"]
    seconds = cues["seconds"]
    beats = int(round(seconds / beat))
    cta_beat = int(round(cues["cuts"][-1] / beat))
    music = Track(seconds)
    sfx = Track(seconds)

    moods = cues.get("moods")

    def mood_at(t: float) -> str:
        current = "full"
        for start, mood in moods or []:
            if start <= t + 1e-6:
                current = mood
        return current

    for b in range(beats):
        t = b * beat
        chord = CHORDS[(b // 4) % len(CHORDS)]
        if moods:
            mood = mood_at(t)
            if mood == "silent":
                continue
            if mood == "dark":
                # Only the pad and a heartbeat kick: the story is in the voice.
                if b % 4 == 0:
                    bar = 4 * beat
                    pad = sum(soft_tri(hz(n - 24), bar) for n in chord) / len(chord)
                    music.add(t, pad * env(bar, 0.4, 2.0), 0.14)
                    music.add(t, kick(), 0.3)
                continue
            offer = mood == "offer"
            quotes = mood in ("light", "build")
        else:
            offer = b >= cta_beat
            quotes = 10 <= b < cta_beat

        # Pad: the whole chord, swelling once per bar.
        if b % 4 == 0:
            bar = 4 * beat
            pad = sum(soft_tri(hz(n - 12), bar) for n in chord) / len(chord)
            music.add(t, pad * env(bar, 0.25, 1.6), 0.16)

        music.add(t, kick(), 0.5 if b % 2 == 0 else 0.3)
        if b % 2 == 1:
            music.add(t, rim(b), 0.16)
        if not quotes or offer:
            music.add(t + beat / 2, shaker(b), 0.05)

        # Round bass on the root.
        music.add(t, soft_tri(hz(chord[0] - 24), beat) * env(beat, 0.01, 0.3), 0.32)

        # Music-box arpeggio in 8ths.
        for k in range(2):
            note = chord[(b * 2 + k) % len(chord)] + 12
            music.add(t + k * beat / 2, pluck(hz(note), beat / 2), 0.07)

        if offer:
            note = LEAD[(b - cta_beat) % len(LEAD)]
            if note is not None:
                music.add(t, pluck(hz(note + 12), beat) * 1.0, 0.09)

    # Last chord rings out.
    end = beats * beat
    for n in CHORDS[0]:
        music.add(end - beat, pluck(hz(n), 2.0), 0.08)

    for i, c in enumerate(cues["cuts"]):
        if c > 0:
            sfx.add(c - 0.35, swell(0.35, 500 + i), 0.12)
    for s in cues["slams"]:
        sfx.add(s, thump(), 0.45)
    for i, p in enumerate(cues["pops"]):
        sfx.add(p, pop(i), 0.06)
    if cues.get("count"):
        start, stop = cues["count"]
        n = 10
        for k in range(n):
            u = 1 - (1 - k / n) ** 2
            sfx.add(start + u * (stop - start), pop(k) * 0.8, 0.05)
    sfx.add(cues["coin"], chime(), 0.14)

    # Dip the music a little under each slam so the thump reads.
    duck = np.ones_like(music.buf)
    for s in cues["slams"]:
        i = int(s * SR)
        n = min(int(0.4 * SR), len(duck) - i)
        duck[i : i + n] = np.minimum(duck[i : i + n], 1 - 0.3 * np.exp(-np.arange(n) / (0.15 * SR)))

    music_bus = lowpass(music.buf * duck, 3200)
    sfx_bus = lowpass(sfx.buf, 6000)
    if voice is not None:
        v = np.zeros_like(music_bus)
        v[: min(len(v), len(voice))] = voice[: len(v)]
        # Music sits well under speech, sound effects a little under it.
        ducked = 1 - 0.65 * envelope(v)
        mix = music_bus * ducked * 0.6 + sfx_bus * 0.6 + v * 2.2
    else:
        mix = music_bus + sfx_bus
    mix = highpass(mix, 30)[: int((seconds + 0.2) * SR)]
    fade = int(0.4 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)
    return mix / np.max(np.abs(mix)) * 0.7


def write_wav(path: str, x: np.ndarray) -> None:
    pcm = (x * 32767).astype(np.int16)
    stereo = np.repeat(pcm[:, None], 2, axis=1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        sys.exit("usage: shift-reel-audio.py cues.json out.wav [voice.wav]")
    with open(sys.argv[1]) as f:
        cues = json.load(f)
    voice = read_wav(sys.argv[3]) if len(sys.argv) == 4 else None
    write_wav(sys.argv[2], score(cues, voice))
