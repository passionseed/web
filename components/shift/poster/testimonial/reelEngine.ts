/**
 * Shared motion engine for the SHIFT[1] Reels. Camera, pan, flash and colour
 * grade are plain functions of time, sampled into CSS keyframes, so a paused
 * page can be seeked to any frame and filmed. The same cue sheet feeds the
 * soundtrack (scripts/shift-reel-audio.py), so picture and sound agree.
 */

/** Mood of the score from a given second on. Absent means one steady track. */
export type Mood = "light" | "dark" | "silent" | "build" | "full" | "offer";

export interface ReelCues {
  seconds: number;
  beat: number;
  /** Hard cuts: soft swell into, punch-in and flash on. */
  cuts: number[];
  /** Big text or objects landing: thump plus screen shake. */
  slams: number[];
  /** Words and small elements popping in. */
  pops: number[];
  /** A counter running: ticks between these two times. */
  count: [number, number] | null;
  /** The price landing. */
  coin: number;
  moods?: [number, Mood][];
}

export interface CameraShot {
  start: number;
  end: number;
  /** translateX over the panorama, drifting from the first value to the second. */
  pan: [number, number];
}

/** A colour grade stop. Between stops values blend linearly; equal times cut. */
export interface GradeStop {
  t: number;
  saturate: number;
  brightness: number;
  /** 0..1 opacity of the rain, night and sun overlays. */
  rain: number;
  night: number;
  sun: number;
}

/** The offer (reelParts Offer) lands one line per beat; these feed the cue sheet. */
export const OFFER_BEATS = { pops: [1, 2, 4, 6, 7], price: 5 } as const;

const SAMPLES_PER_SECOND = 30;

/** Builds `@keyframes name` by sampling `css(t)` across `seconds`. */
export function sampled(name: string, seconds: number, css: (t: number) => string): string {
  const n = Math.round(seconds * SAMPLES_PER_SECOND);
  const frames: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * seconds;
    frames.push(`${((i / n) * 100).toFixed(3)}%{${css(t)}}`);
  }
  return `@keyframes ${name}{${frames.join("")}}`;
}

const decay = (d: number, length: number) => (d >= 0 && d < length ? 1 - d / length : 0);

/** Punch-in on every cut, shake on every slam. */
export function cameraKeyframes(cues: ReelCues): string {
  return sampled("reel-cam", cues.seconds, (t) => {
    const punch = cues.cuts.reduce((sum, c) => sum + 0.1 * decay(t - c, 0.35) ** 2, 0);
    let x = 0;
    let y = 0;
    for (const s of cues.slams) {
      const amp = 16 * decay(t - s, 0.25);
      x += amp * Math.sin((t - s) * 95);
      y += amp * Math.cos((t - s) * 70);
    }
    return `transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(1 + punch).toFixed(4)})`;
  });
}

/** Drift inside a shot, hard cut between shots. */
export function panKeyframes(shots: CameraShot[], seconds: number): string {
  return sampled("reel-pan", seconds, (t) => {
    const s = [...shots].reverse().find((sh) => sh.start <= t) ?? shots[0];
    const [from, to] = s.pan;
    const p = Math.min(1, Math.max(0, (t - s.start) / (s.end - s.start)));
    return `transform:translateX(${(from + (to - from) * p).toFixed(1)}px)`;
  });
}

export function flashKeyframes(cues: ReelCues): string {
  return sampled("reel-flash", cues.seconds, (t) => {
    const o = cues.cuts.reduce((max, c) => Math.max(max, (c === 0 ? 0 : 0.55) * decay(t - c, 0.16)), 0);
    return `opacity:${o.toFixed(3)}`;
  });
}

function gradeAt(stops: GradeStop[], t: number): GradeStop {
  let prev = stops[0];
  for (const next of stops) {
    if (next.t > t) {
      if (next.t === prev.t) return prev;
      const p = (t - prev.t) / (next.t - prev.t);
      const lerp = (k: keyof GradeStop) => prev[k] + (next[k] - prev[k]) * p;
      return {
        t,
        saturate: lerp("saturate"),
        brightness: lerp("brightness"),
        rain: lerp("rain"),
        night: lerp("night"),
        sun: lerp("sun"),
      };
    }
    prev = next;
  }
  return prev;
}

/** Keyframes for the world filter and the three weather overlays. */
export function gradeKeyframes(stops: GradeStop[], seconds: number): string {
  const g = (t: number) => gradeAt(stops, t);
  return [
    sampled("reel-grade", seconds, (t) => {
      const s = g(t);
      return `filter:saturate(${s.saturate.toFixed(3)}) brightness(${s.brightness.toFixed(3)})`;
    }),
    sampled("reel-rain", seconds, (t) => `opacity:${g(t).rain.toFixed(3)}`),
    sampled("reel-night", seconds, (t) => `opacity:${g(t).night.toFixed(3)}`),
    sampled("reel-sun", seconds, (t) => `opacity:${g(t).sun.toFixed(3)}`),
  ].join("");
}
