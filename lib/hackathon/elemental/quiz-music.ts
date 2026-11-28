import type { ElementKey } from "@/components/hackathon/elemental/media";

import { SILENT, arp, hiss, hz, oscillator, type SfxOut, type Wave } from "./quiz-sfx";

/**
 * The quiz's music: a small songbook of chill lo-fi chiptune loops, played
 * live with Web Audio like the sounds in ./quiz-sfx.ts, no files.
 *
 * - `title`: the intro, slow and sparse.
 * - `quiz`: under the questions. It builds as you go, like game music adding
 *   layers: pad and keys first, then the bass, then the drums.
 * - one theme per element, on its result page: fire upbeat, water dreamy,
 *   earth steady, air light, aether floating.
 *
 * Every chord is voiced only in C major pentatonic (C D E G A), so the
 * answer notes and the element sounds land in tune on top of any of them.
 * Each loop is 8 bars; nothing random, the same every time. `musicBar`
 * schedules one bar, so the player (components/hackathon/elemental/quiz/
 * sound.ts) keeps a bar ahead and can change songs or layers between bars,
 * and a script can render any song offline.
 */

export type SongId = "title" | "quiz" | ElementKey;
/** The parts a bar can play. The quiz adds them one by one; the other songs play all of theirs. */
export type Layer = "pad" | "keys" | "bass" | "drums";
export const ALL_LAYERS: readonly Layer[] = ["pad", "keys", "bass", "drums"];

type Chord = { bass: number; pad: readonly number[]; keys: readonly number[] };
const chord = (bass: string, pad: string[], keys: string[]): Chord => ({ bass: hz(bass), pad: pad.map(hz), keys: keys.map(hz) });

/** The four chords every song draws on (two bars each): C6/9, Am7, D7sus4, G6sus4. */
const C69 = chord("C3", ["G3", "E4", "A4"], ["C4", "E4", "G4", "A4", "D5"]);
const AM7 = chord("A2", ["G3", "C4", "E4"], ["A3", "C4", "E4", "G4", "C5"]);
const D7S = chord("D3", ["A3", "C4", "G4"], ["D4", "G4", "A4", "C5", "D5"]);
const G6S = chord("G2", ["A3", "D4", "G4"], ["G3", "A3", "D4", "G4", "A4"]);

/** Which chord tone the keys play on each eighth of a bar (null rests), for the first and second bar of a chord. */
type KeysPattern = readonly [readonly (number | null)[], readonly (number | null)[]];

type Song = {
  bpm: number;
  /** Where off-beat eighths land in the beat: 0.5 straight, 0.58 lazy lo-fi swing. */
  swing: number;
  /** Four chords, two bars each: an 8-bar loop. */
  chords: readonly [Chord, Chord, Chord, Chord];
  /** The whole song's level, set so every song's loudest moment sits about 6 dB under a pick. */
  level: number;
  pad?: { peak: number; cutoff: number };
  /** `octave` 1 plays the chord tones as written, 2 an octave up. */
  keys?: { wave: Wave; peak: number; lowpass: number; octave: number; pattern: KeysPattern; echo: number };
  /** The bass: [eighth, an octave up?, length in beats] per note, each bar. */
  bass?: { peak: number; notes: readonly (readonly [number, boolean, number])[] };
  /** The drums: which eighths get a kick, a snare (brushed, or a woody rim), a hat. */
  drums?: { kick: readonly number[]; snare: readonly number[]; rim?: boolean; hats: readonly number[]; level: number };
};

const LAZY: KeysPattern = [
  [0, null, 2, null, 1, null, 3, null],
  [4, null, null, 3, null, 2, null, null],
];

export const SONGS: Record<SongId, Song> = {
  title: {
    bpm: 72,
    swing: 0.56,
    chords: [AM7, C69, G6S, D7S],
    level: 0.5,
    pad: { peak: 0.06, cutoff: 1400 },
    keys: {
      wave: "triangle",
      peak: 0.11,
      lowpass: 3000,
      octave: 2,
      pattern: [
        [0, null, null, null, 2, null, null, null],
        [3, null, null, null, null, null, 1, null],
      ],
      echo: 0.4,
    },
    bass: { peak: 0.12, notes: [[0, false, 3]] },
  },
  quiz: {
    bpm: 78,
    swing: 0.58,
    chords: [C69, AM7, D7S, G6S],
    level: 0.4,
    pad: { peak: 0.06, cutoff: 1600 },
    keys: { wave: 0.125, peak: 0.09, lowpass: 2400, octave: 1, pattern: LAZY, echo: 0.35 },
    bass: {
      peak: 0.14,
      notes: [
        [0, false, 1.2],
        [3, true, 0.3],
      ],
    },
    drums: { kick: [0, 3], snare: [2, 6], hats: [0, 1, 2, 3, 4, 5, 6, 7], level: 1 },
  },
  fire: {
    bpm: 96,
    swing: 0.5,
    chords: [G6S, C69, D7S, AM7],
    level: 0.45,
    pad: { peak: 0.04, cutoff: 1800 },
    keys: {
      wave: 0.25,
      peak: 0.07,
      lowpass: 2600,
      octave: 1,
      pattern: [
        [0, 1, 2, 3, 4, 3, 2, 1],
        [0, 2, 1, 3, 2, 4, 3, 2],
      ],
      echo: 0.2,
    },
    bass: { peak: 0.13, notes: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i, i % 4 === 2, 0.4] as const) },
    drums: { kick: [0, 4], snare: [2, 6], hats: [0, 1, 2, 3, 4, 5, 6, 7], level: 1.1 },
  },
  water: {
    bpm: 70,
    swing: 0.6,
    chords: [AM7, D7S, C69, G6S],
    level: 0.35,
    pad: { peak: 0.08, cutoff: 1200 },
    keys: {
      wave: "sine",
      peak: 0.12,
      lowpass: 3200,
      octave: 2,
      pattern: [
        [4, null, null, 2, null, null, 3, null],
        [null, null, 1, null, null, 0, null, null],
      ],
      echo: 0.5,
    },
    bass: { peak: 0.12, notes: [[0, false, 3.5]] },
    drums: { kick: [], snare: [], hats: [1, 3, 5, 7], level: 0.6 },
  },
  earth: {
    bpm: 84,
    swing: 0.54,
    chords: [C69, G6S, AM7, D7S],
    level: 0.4,
    pad: { peak: 0.05, cutoff: 1300 },
    keys: {
      wave: 0.5,
      peak: 0.07,
      lowpass: 1500,
      octave: 1,
      pattern: [
        [0, null, 1, null, 2, null, 1, null],
        [0, null, 2, null, 3, null, 2, null],
      ],
      echo: 0.15,
    },
    bass: {
      peak: 0.16,
      notes: [
        [0, false, 0.9],
        [2, false, 0.9],
        [4, false, 0.9],
        [6, true, 0.9],
      ],
    },
    drums: { kick: [0, 4], snare: [2, 6], rim: true, hats: [0, 2, 4, 6], level: 1 },
  },
  air: {
    bpm: 90,
    swing: 0.58,
    chords: [D7S, G6S, C69, AM7],
    level: 0.66,
    pad: { peak: 0.04, cutoff: 2200 },
    keys: {
      wave: "triangle",
      peak: 0.09,
      lowpass: 4000,
      octave: 2,
      pattern: [
        [0, 1, 2, 3, 4, null, 3, null],
        [4, 3, 2, null, 1, null, 0, null],
      ],
      echo: 0.3,
    },
    bass: {
      peak: 0.09,
      notes: [
        [0, false, 1.5],
        [5, true, 0.4],
      ],
    },
    drums: { kick: [], snare: [4], hats: [0, 1, 2, 3, 4, 5, 6, 7], level: 0.8 },
  },
  aether: {
    bpm: 64,
    swing: 0.5,
    chords: [C69, AM7, G6S, D7S],
    level: 0.43,
    pad: { peak: 0.08, cutoff: 1000 },
    keys: {
      wave: "sine",
      peak: 0.11,
      lowpass: 5000,
      octave: 3,
      pattern: [
        [4, null, null, null, null, 2, null, null],
        [null, null, 3, null, null, null, 1, null],
      ],
      echo: 0.55,
    },
  },
};

export const MUSIC_BARS = 8;
/** One bar of `song`, in seconds. */
export const barSeconds = (song: SongId) => (4 * 60) / SONGS[song].bpm;

/** A pad note: slow in (0.35 s), held, slow out (0.7 s), two triangles 5 cents apart, through a soft lowpass. */
function pad(o: SfxOut, t: number, f: number, hold: number, peak: number, cutoff: number, dest: AudioNode) {
  const { ctx } = o;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.35);
  g.gain.setValueAtTime(peak, t + hold);
  g.gain.exponentialRampToValueAtTime(SILENT, t + hold + 0.7);
  g.gain.setValueAtTime(0, t + hold + 0.7);
  const soft = ctx.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = cutoff;
  soft.connect(g).connect(dest);
  for (const detune of [-5, 5]) {
    const osc = oscillator(ctx, "triangle");
    osc.frequency.value = f;
    osc.detune.value = detune;
    osc.connect(soft);
    osc.start(t);
    osc.stop(t + hold + 0.72);
  }
}

/** A soft kick: a sine dropping from 110 to 48 Hz. */
function kick(o: SfxOut, t: number, peak: number, dest: AudioNode) {
  const { ctx } = o;
  const osc = oscillator(ctx, "sine");
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(SILENT, t + 0.22);
  g.gain.setValueAtTime(0, t + 0.22);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + 0.23);
}

/** Two feed-forward echoes (a dotted eighth and twice that) at `level` and 40% of it: no feedback, so they always end. */
function echoes(o: SfxOut, beat: number, level: number, dest: AudioNode): AudioNode {
  const { ctx } = o;
  const send = ctx.createGain();
  send.connect(dest);
  for (const [delay, wet] of [
    [0.75 * beat, level],
    [1.5 * beat, level * 0.4],
  ]) {
    const d = ctx.createDelay(3);
    d.delayTime.value = delay;
    const g = ctx.createGain();
    g.gain.value = wet;
    send.connect(d).connect(g).connect(dest);
  }
  return send;
}

/** Schedules bar `bar` of `song` (any whole number; it wraps) to start at `t`, playing only `layers`. */
export function musicBar(o: SfxOut, t: number, bar: number, song: SongId = "quiz", layers: readonly Layer[] = ALL_LAYERS) {
  const s = SONGS[song];
  const beat = 60 / s.bpm;
  const eighth = (i: number) => Math.floor(i / 2) * beat + (i % 2 ? s.swing * beat : 0);
  const n = ((bar % MUSIC_BARS) + MUSIC_BARS) % MUSIC_BARS;
  const c = s.chords[Math.floor(n / 2)];
  const second = n % 2 === 1;
  const on = (layer: Layer) => layers.includes(layer);

  const dest = o.ctx.createGain();
  dest.gain.value = s.level;
  dest.connect(o.dest);

  // Pad: a new chord on the first of its two bars, held through both.
  if (s.pad && on("pad") && !second) for (const f of c.pad) pad(o, t, f, 8 * beat - 0.25, s.pad.peak, s.pad.cutoff, dest);

  // Keys: one chord tone an eighth (rests between), into the echoes.
  if (s.keys && on("keys")) {
    const k = s.keys;
    const send = echoes(o, beat, k.echo, dest);
    k.pattern[second ? 1 : 0].forEach((tone, i) => {
      if (tone === null) return;
      arp(o, t + eighth(i), { wave: k.wave, notes: [c.keys[tone] * 2 ** (k.octave - 1)], step: 0.05, peak: k.peak, tail: 0.28, lowpass: k.lowpass }, send);
    });
  }

  // Bass: a round sine on the root, or its octave.
  if (s.bass && on("bass"))
    for (const [i, up, beats] of s.bass.notes)
      arp(o, t + eighth(i), { wave: "sine", notes: [c.bass * (up ? 2 : 1)], step: beats * beat, peak: s.bass.peak * (up ? 0.6 : 1), tail: 0.2 }, dest);

  // Drums: a soft kick, a brushed snare (or a woody rim), hats on the eighths.
  if (s.drums && on("drums")) {
    const d = s.drums;
    d.kick.forEach((i, k) => kick(o, t + eighth(i), (k === 0 ? 0.16 : 0.1) * d.level, dest));
    for (const i of d.snare)
      hiss(
        o,
        t + eighth(i),
        { filter: "bandpass", freq: d.rim ? 900 : 1800, q: d.rim ? 4 : 1.4, hold: 0.012, tail: d.rim ? 0.05 : 0.11, peak: 0.13 * d.level, offset: 0.31 + i * 0.035 },
        dest,
      );
    for (const i of d.hats)
      hiss(o, t + eighth(i), { filter: "highpass", freq: 7000, hold: 0.004, tail: 0.03, peak: (i % 2 ? 0.035 : 0.055) * d.level, offset: 0.6 + i * 0.013 }, dest);
  }
}

/** The quiz's layers by question (0-based): pad and keys from the first, the bass from the third, the drums from the fifth. */
export function quizLayers(question: number): readonly Layer[] {
  if (question >= 4) return ALL_LAYERS;
  if (question >= 2) return ["pad", "keys", "bass"];
  return ["pad", "keys"];
}
