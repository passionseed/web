import type { ElementKey } from "@/components/hackathon/elemental/media";

import { revealCells, type FxPixel } from "./quiz-pixels";

/**
 * The Elemental quiz's sounds, played live with Web Audio from the recipes
 * below: no sound files. They follow the pixel art's rules (see
 * docs/hackathon/elemental-quiz-pixel-art.md, "Sound"):
 * - Whole steps. A voice jumps from note to note like an 8-bit pulse
 *   channel, and never glides, except where the thing itself glides (a drop
 *   of water, a gust of wind).
 * - Nothing random. The noise is the same seeded noise every time, so a sound
 *   plays the same on every phone.
 * - Brand notes. Everything is in C major pentatonic, so any two sounds that
 *   overlap still agree.
 *
 * Each recipe schedules its notes on `o.ctx` from time `t` (seconds), so the
 * page can play it live and a script can render it offline to listen.
 */

export type SfxOut = { ctx: BaseAudioContext; dest: AudioNode };

/** A note's pitch in Hz, from its name: "C5" is the C above middle C. */
export function hz(name: string): number {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  if (!m) throw new Error(`Not a note: ${name}`);
  const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as "C"] + (m[2] ? 1 : 0);
  const midi = 12 * (Number(m[3]) + 1) + semis;
  return 440 * 2 ** ((midi - 69) / 12);
}

/** One note per question: the eight picks climb C major pentatonic, so you hear yourself getting closer. */
export const PICK_NOTES = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6"].map(hz);
/** Each pick answers its note two steps up the scale: a third or a fourth, light enough to hear eight times. */
export const ANSWER_NOTES = ["E5", "G5", "A5", "C6", "D6", "E6", "G6", "A6"].map(hz);

/** The reveal ticks once per row the icon builds, climbing from C4. */
export const BUILD_NOTES = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5"].map(hz);

/** Overall level. No sound peaks above -8 dBFS, so nothing startles on a phone at full volume. */
export const MASTER_GAIN = 0.42;

/** 4 ms: quick enough to sound instant, slow enough not to click. */
const ATTACK = 0.004;
/** What an exponential fade aims for before the voice is cut: -80 dB, inaudible. */
const SILENT = 0.0001;

type Wave = "triangle" | "sine" | 0.125 | 0.25 | 0.5;

const waves = new WeakMap<BaseAudioContext, Map<number, PeriodicWave>>();

/** A pulse wave at `duty` (0.125, 0.25 or 0.5), the 8-bit sound: its Fourier series up to the 64th harmonic. */
export function pulseCoefficients(duty: number): { real: Float32Array<ArrayBuffer>; imag: Float32Array<ArrayBuffer> } {
  const n = 64;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
    imag[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
  }
  return { real, imag };
}

function oscillator(ctx: BaseAudioContext, wave: Wave): OscillatorNode {
  const osc = ctx.createOscillator();
  if (typeof wave === "string") {
    osc.type = wave;
    return osc;
  }
  let byDuty = waves.get(ctx);
  if (!byDuty) waves.set(ctx, (byDuty = new Map()));
  let periodic = byDuty.get(wave);
  if (!periodic) {
    const { real, imag } = pulseCoefficients(wave);
    periodic = ctx.createPeriodicWave(real, imag);
    byDuty.set(wave, periodic);
  }
  osc.setPeriodicWave(periodic);
  return osc;
}

/** In at once, held to `hold`, then an exponential fade over `tail`. Returns the gain node and when it falls silent. */
function envelope(ctx: BaseAudioContext, t: number, peak: number, hold: number, tail: number) {
  const g = ctx.createGain();
  const top = Math.max(t + ATTACK, hold);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + ATTACK);
  g.gain.setValueAtTime(peak, top);
  g.gain.exponentialRampToValueAtTime(SILENT, top + tail);
  g.gain.setValueAtTime(0, top + tail);
  return { g, end: top + tail };
}

/** A seeded noise generator (an LCG): the same hiss every time. */
export function seededNoise(length: number, seed = 0x2f6b1d): Float32Array<ArrayBuffer> {
  const out = new Float32Array(length);
  let s = seed >>> 0;
  for (let i = 0; i < length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out[i] = s / 2 ** 31 - 1;
  }
  return out;
}

const noises = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noises.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    buf.copyToChannel(seededNoise(ctx.sampleRate), 0);
    noises.set(ctx, buf);
  }
  return buf;
}

type ArpOptions = { wave: Wave; notes: readonly number[]; step: number; peak: number; tail: number; lowpass?: number; detune?: number };

/** A voice that steps through `notes`, `step` seconds each, as one held note: an 8-bit arpeggio. */
function arp(o: SfxOut, t: number, { wave, notes, step, peak, tail, lowpass, detune = 0 }: ArpOptions, dest: AudioNode = o.dest) {
  const { ctx } = o;
  const osc = oscillator(ctx, wave);
  osc.detune.value = detune;
  notes.forEach((f, i) => osc.frequency.setValueAtTime(f, t + i * step));
  const { g, end } = envelope(ctx, t, peak, t + notes.length * step, tail);
  if (lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = lowpass;
    osc.connect(f).connect(g);
  } else osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(end + 0.01);
}

/** A voice that glides from `from` to `to` Hz: only for things that really glide, a drop and the wind. */
function chirp(o: SfxOut, t: number, wave: Wave, from: number, to: number, dur: number, peak: number, tail: number, dest: AudioNode = o.dest) {
  const { ctx } = o;
  const osc = oscillator(ctx, wave);
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const { g, end } = envelope(ctx, t, peak, t + dur, tail);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(end + 0.01);
}

type HissOptions = { filter: BiquadFilterType; freq: number; q?: number; hold: number; tail: number; peak: number; offset: number };

/** A burst of the seeded noise through one filter. `offset` picks which stretch of the noise, so bursts differ but never change. */
function hiss(o: SfxOut, t: number, { filter, freq, q = 1, hold, tail, peak, offset }: HissOptions) {
  const { ctx } = o;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const { g, end } = envelope(ctx, t, peak, t + hold, tail);
  src.connect(f).connect(g).connect(o.dest);
  src.start(t, offset);
  src.stop(end + 0.01);
}

/** The master chain every sound goes through: a level, then a gentle lowpass so the pulse waves don't bite on phone speakers. */
export function connectMaster(ctx: BaseAudioContext): AudioNode {
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 7500;
  master.connect(soften).connect(ctx.destination);
  return master;
}

// ---------------------------------------------------------------- the quiz's sounds

/** "เริ่มเลย": a C major arpeggio, up. */
export function sfxStart(o: SfxOut, t: number) {
  arp(o, t, { wave: 0.25, notes: ["C5", "E5", "G5", "C6"].map(hz), step: 0.05, peak: 0.3, tail: 0.16 });
}

/** An answer picked: its question's note, then two steps up, quick and softened, like a menu select. */
export function sfxPick(o: SfxOut, t: number, question: number) {
  const q = Math.min(Math.max(question, 0), PICK_NOTES.length - 1);
  arp(o, t, { wave: 0.25, notes: [PICK_NOTES[q], ANSWER_NOTES[q]], step: 0.022, peak: 0.3, tail: 0.04, lowpass: 3600 });
}

/** Back: two notes down, softer and hollower than a pick. */
export function sfxBack(o: SfxOut, t: number) {
  arp(o, t, { wave: 0.5, notes: ["G5", "C5"].map(hz), step: 0.04, peak: 0.16, tail: 0.06 });
}

/** Sound turned on: one short note, so you know it works. */
export function sfxToggle(o: SfxOut, t: number) {
  arp(o, t, { wave: 0.25, notes: [hz("A5")], step: 0.03, peak: 0.32, tail: 0.05 });
}

/** Shared or copied: the two-note coin, a fourth up. */
export function sfxChime(o: SfxOut, t: number) {
  arp(o, t, { wave: 0.25, notes: ["G5", "C6"].map(hz), step: 0.06, peak: 0.26, tail: 0.22 });
}

const buildGroup: Record<ElementKey, (p: FxPixel) => number> = {
  fire: (p) => p[1],
  water: (p) => p[1],
  earth: (p) => p[1],
  air: (p) => p[0],
  aether: (p) => p[3],
};

/**
 * When the reveal ticks, and on which note: once for each row the icon
 * builds (each column for air, each strength for aether), at the moment its
 * first pixel appears. Same timing as IconAssemble, so sound and pixels land together.
 */
export function buildTicks(element: ElementKey, durationMs: number): { at: number; note: number }[] {
  const cells = revealCells(element);
  const group = buildGroup[element];
  const ticks: { at: number; note: number }[] = [];
  cells.forEach((p, i) => {
    if (i > 0 && group(p) === group(cells[i - 1])) return;
    ticks.push({ at: Math.round((i / cells.length) * durationMs) / 1000, note: BUILD_NOTES[Math.min(ticks.length, BUILD_NOTES.length - 1)] });
  });
  return ticks;
}

/** The icon building: a thin 12.5% pulse tick per row, climbing. */
export function sfxBuild(o: SfxOut, t: number, element: ElementKey, durationMs: number) {
  for (const { at, note } of buildTicks(element, durationMs)) arp(o, t + at, { wave: 0.125, notes: [note], step: 0.018, peak: 0.2, tail: 0.03 });
}

/**
 * Sparks: the first pop lands on the beat with a low catch rising under it,
 * the pops get quieter as they cool, then a quick rising arpeggio.
 */
function fire(o: SfxOut, t: number) {
  arp(o, t, { wave: "triangle", notes: ["G3", "D4", "G4"].map(hz), step: 0.035, peak: 0.5, tail: 0.08 });
  [0, 0.075, 0.15, 0.24, 0.36].forEach((at, i) =>
    hiss(o, t + at, { filter: "highpass", freq: 2200, hold: 0.008, tail: 0.02, peak: [0.4, 0.28, 0.34, 0.22, 0.15][i], offset: 0.1 * i }),
  );
  arp(o, t + 0.1, { wave: 0.25, notes: ["G5", "A5", "D6", "G6"].map(hz), step: 0.04, peak: 0.2, tail: 0.14 });
}

/**
 * A pebble: a crunch and a thud stepping down, pitched high enough for a
 * phone speaker to carry, then two bounces as the dust lands (frames 2 and
 * 3 of the effect, at 205 ms a frame), the second smaller.
 */
function earth(o: SfxOut, t: number) {
  hiss(o, t, { filter: "lowpass", freq: 900, hold: 0.06, tail: 0.1, peak: 0.42, offset: 0.5 });
  arp(o, t, { wave: 0.5, notes: ["G4", "E4", "C4"].map(hz), step: 0.032, peak: 0.26, tail: 0.12, lowpass: 1400 });
  arp(o, t + 0.41, { wave: 0.125, notes: [hz("G5")], step: 0.012, peak: 0.17, tail: 0.02 });
  arp(o, t + 0.615, { wave: 0.125, notes: [hz("E5")], step: 0.01, peak: 0.09, tail: 0.015 });
}

/** A drip: the drop (a rising plink), its splash on the frame the splash shows (210 ms), then the ripple stepping down. */
function water(o: SfxOut, t: number) {
  chirp(o, t, "sine", 420, 1260, 0.07, 0.42, 0.05);
  hiss(o, t + 0.21, { filter: "bandpass", freq: 3000, q: 0.8, hold: 0.02, tail: 0.09, peak: 0.4, offset: 0.7 });
  arp(o, t + 0.42, { wave: "triangle", notes: ["C6", "A5", "E5"].map(hz), step: 0.06, peak: 0.18, tail: 0.18 });
}

/** A gust that hits at once (full by 70 ms) and blows itself out, swept up and back down, with a fifth riding on it. */
function air(o: SfxOut, t: number) {
  const { ctx } = o;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(700, t);
  band.frequency.exponentialRampToValueAtTime(2600, t + 0.22);
  band.frequency.exponentialRampToValueAtTime(900, t + 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1.35, t + 0.07);
  g.gain.linearRampToValueAtTime(0.45, t + 0.32);
  g.gain.exponentialRampToValueAtTime(SILENT, t + 0.6);
  g.gain.setValueAtTime(0, t + 0.6);
  src.connect(band).connect(g).connect(o.dest);
  src.start(t, 0.25);
  src.stop(t + 0.61);
  arp(o, t + 0.07, { wave: "triangle", notes: ["D5", "A5"].map(hz), step: 0.045, peak: 0.16, tail: 0.2 });
}

/**
 * A shimmer: two triangles a hair apart climb E, A, E, with two echoes
 * behind them (130 and 260 ms, no feedback, so it always ends), then the
 * star glints on the frame its lilac pixel appears (490 ms).
 */
function aether(o: SfxOut, t: number) {
  const { ctx } = o;
  const send = ctx.createGain();
  send.connect(o.dest);
  for (const [delay, level] of [
    [0.13, 0.55],
    [0.26, 0.21],
  ]) {
    const echo = ctx.createDelay(0.5);
    echo.delayTime.value = delay;
    const wet = ctx.createGain();
    wet.gain.value = level;
    send.connect(echo).connect(wet).connect(o.dest);
  }
  const notes = ["E6", "A6", "E7"].map(hz);
  for (const detune of [-7, 7]) arp(o, t, { wave: "triangle", notes, step: 0.07, peak: 0.26, tail: 0.3, detune }, send);
  chirp(o, t + 0.49, "sine", hz("G6"), hz("G6"), 0.025, 0.24, 0.12);
}

const SIGNATURES: Record<ElementKey, (o: SfxOut, t: number) => void> = { fire, earth, water, air, aether };

/** Each element's own sound, played as its effect starts: the same story the pixels tell. */
export function sfxElement(o: SfxOut, t: number, element: ElementKey) {
  SIGNATURES[element](o, t);
}
