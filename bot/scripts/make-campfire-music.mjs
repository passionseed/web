#!/usr/bin/env node
/**
 * Writes the campfire's rest music (bot/assets/sounds/rest-{short,long}.ogg):
 * a slow warm pad, a soft plucked melody, a low bass and a little fire
 * crackle, all synthesised here, so there is no licence to track.
 *
 * Each file fades in over its first 60 s (the bot starts it a minute before
 * the rest), plays through the rest and fades out over its last 12 s, ending
 * as the next focus starts. Needs ffmpeg with libopus.
 *
 *   node bot/scripts/make-campfire-music.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const RATE = 48_000;
const LEAD = 60;
const FADE_OUT = 12;
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "assets", "sounds");

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
// Fmaj7, Em7, Dm7, Cmaj7: 8 s each.
const CHORDS = [
  [53, 57, 60, 64],
  [52, 55, 59, 62],
  [50, 53, 57, 60],
  [48, 52, 55, 59],
];
const BAR = 8;

/** Deterministic noise, so the files are the same on every run. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0) / 0x100000000);
}

function render(seconds) {
  const n = seconds * RATE;
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const rand = rng(7);

  // Pad: four detuned voices per chord tone with a slow swell between chords.
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const bar = Math.floor(t / BAR);
    const inBar = t - bar * BAR;
    const chord = CHORDS[bar % CHORDS.length];
    const next = CHORDS[(bar + 1) % CHORDS.length];
    const xf = Math.max(0, (inBar - (BAR - 1.5)) / 1.5); // last 1.5 s blends into the next chord
    let l = 0;
    let r = 0;
    for (let k = 0; k < 4; k++) {
      for (const [notes, w] of [[chord, 1 - xf], [next, xf]]) {
        if (w <= 0) continue;
        const f = hz(notes[k]);
        const a = Math.sin(2 * Math.PI * f * 0.998 * t) + 0.4 * Math.sin(2 * Math.PI * f * 2 * t);
        const b = Math.sin(2 * Math.PI * f * 1.002 * t) + 0.3 * Math.sin(2 * Math.PI * f * 3 * t + 1);
        l += w * a;
        r += w * b;
      }
    }
    const breathe = 0.75 + 0.25 * Math.sin(2 * Math.PI * t / 16);
    left[i] += 0.022 * l * breathe;
    right[i] += 0.022 * r * breathe;
    // Bass: the chord's root an octave down, soft.
    const root = hz((xf > 0.5 ? next : chord)[0] - 12);
    const bass = 0.06 * Math.sin(2 * Math.PI * root * t) * (0.8 + 0.2 * Math.sin(2 * Math.PI * t / 4));
    left[i] += bass;
    right[i] += bass;
  }

  // Plucks: a slow pentatonic line, two notes a bar, decaying bells.
  const scale = [72, 74, 76, 79, 81, 84];
  for (let at = 2; at < seconds - 1; at += BAR / 2) {
    if (rand() < 0.25) continue;
    const f = hz(scale[Math.floor(rand() * scale.length)]);
    const pan = 0.3 + rand() * 0.4;
    const start = Math.floor((at + rand() * 0.3) * RATE);
    const len = Math.min(3 * RATE, n - start);
    for (let j = 0; j < len; j++) {
      const tt = j / RATE;
      const v = 0.08 * Math.exp(-2.2 * tt) * (Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(2 * Math.PI * f * 2.01 * tt));
      left[start + j] += v * (1 - pan);
      right[start + j] += v * pan;
    }
  }

  // Crackle: sparse short pops of filtered noise.
  let lp = 0;
  for (let i = 0; i < n; i++) {
    if (rand() < 3 / RATE) {
      const len = Math.floor(RATE * (0.004 + rand() * 0.02));
      const amp = 0.008 + rand() * 0.025;
      const pan = rand();
      for (let j = 0; j < len && i + j < n; j++) {
        lp += 0.35 * ((rand() * 2 - 1) - lp);
        const v = amp * lp * Math.exp(-j / (len / 3));
        left[i + j] += v * (1 - pan);
        right[i + j] += v * pan;
      }
    }
  }

  // Room: three feedback delays per side.
  for (const [buf, delays] of [[left, [0.031, 0.047, 0.071]], [right, [0.037, 0.053, 0.067]]]) {
    for (const d of delays) {
      const k = Math.floor(d * RATE);
      for (let i = k; i < n; i++) buf[i] += 0.28 * buf[i - k];
    }
  }

  // Envelope: fade in over LEAD, fade out over the last FADE_OUT, normalise.
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const pcm = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const fadeIn = Math.min(1, t / LEAD) ** 2;
    const fadeOut = Math.min(1, (seconds - t) / FADE_OUT);
    const g = (0.5 / peak) * fadeIn * fadeOut;
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] * g)) * 32767), i * 4);
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] * g)) * 32767), i * 4 + 2);
  }
  return pcm;
}

const dir = mkdtempSync(path.join(tmpdir(), "campfire-music-"));
try {
  for (const [name, restMinutes] of [["rest-short", 5], ["rest-long", 10]]) {
    const raw = path.join(dir, `${name}.raw`);
    writeFileSync(raw, render(LEAD + restMinutes * 60));
    execFileSync("ffmpeg", [
      "-loglevel", "error", "-y",
      "-f", "s16le", "-ar", String(RATE), "-ac", "2", "-i", raw,
      "-c:a", "libopus", "-b:a", "40k", "-ar", String(RATE), "-ac", "2",
      path.join(OUT, `${name}.ogg`),
    ]);
    console.log(`wrote ${name}.ogg (${LEAD + restMinutes * 60} s)`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
