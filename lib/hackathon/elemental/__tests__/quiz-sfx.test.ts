import { QUIZ_ELEMENTS } from "../quiz";
import { ALL_LAYERS, MUSIC_BARS, SONGS, barSeconds, musicBar, quizLayers, type SongId } from "../quiz-music";
import { revealCells } from "../quiz-pixels";
import {
  ANSWER_NOTES,
  BUILD_NOTES,
  PICK_NOTES,
  buildTicks,
  hz,
  pulseCoefficients,
  seededNoise,
  sfxBack,
  sfxBuild,
  sfxChime,
  sfxElement,
  sfxPick,
  sfxStart,
  sfxToggle,
  type SfxOut,
} from "../quiz-sfx";

/** Just enough of Web Audio to record what a recipe schedules. */
class Param {
  events: { kind: string; value: number; at: number }[] = [];
  value = 0;
  setValueAtTime(value: number, at: number) {
    this.events.push({ kind: "set", value, at });
  }
  linearRampToValueAtTime(value: number, at: number) {
    this.events.push({ kind: "linear", value, at });
  }
  exponentialRampToValueAtTime(value: number, at: number) {
    this.events.push({ kind: "exp", value, at });
  }
}
class FakeNode {
  outs: FakeNode[] = [];
  delayTime?: Param;
  connect<T>(next: T) {
    this.outs.push(next as unknown as FakeNode);
    return next;
  }
}

/** The longest echo delay on any path from `node` to the speakers. A loop (feedback) would never end, so it fails. */
function echoAfter(node: FakeNode, depth = 0): number {
  if (depth > 32) throw new Error("feedback loop: this sound would never end");
  return (node.delayTime?.value ?? 0) + Math.max(0, ...node.outs.map((n) => echoAfter(n, depth + 1)));
}
class Source extends FakeNode {
  frequency = new Param();
  detune = new Param();
  type = "";
  buffer: unknown = null;
  startAt = NaN;
  stopAt = NaN;
  setPeriodicWave() {}
  start(at: number) {
    this.startAt = at;
  }
  stop(at: number) {
    this.stopAt = at;
  }
}
class Gain extends FakeNode {
  gain = new Param();
}

function record(play: (o: SfxOut, t: number) => void, t = 1) {
  const sources: Source[] = [];
  const gains: Gain[] = [];
  const params: Param[] = [];
  const delays: Param[] = [];
  const keep = <T,>(list: T[], item: T) => (list.push(item), item);
  const ctx = {
    sampleRate: 48000,
    destination: new FakeNode(),
    createOscillator: () => keep(sources, new Source()),
    createBufferSource: () => keep(sources, new Source()),
    createGain: () => keep(gains, new Gain()),
    createBiquadFilter: () => Object.assign(new FakeNode(), { type: "", frequency: keep(params, new Param()), Q: keep(params, new Param()) }),
    createDelay: () => {
      const node = new FakeNode();
      node.delayTime = keep(delays, new Param());
      return node;
    },
    createPeriodicWave: () => ({}),
    createBuffer: () => ({ copyToChannel() {} }),
  } as unknown as BaseAudioContext;
  play({ ctx, dest: new FakeNode() as unknown as AudioNode }, t);
  for (const s of sources) params.push(s.frequency);
  return { sources, gains, params, delays, t };
}

const PENTATONIC = new Set([0, 2, 4, 7, 9]);
const inKey = (f: number) => PENTATONIC.has(Math.round(69 + 12 * Math.log2(f / 440)) % 12);

const SOUNDS: Record<string, (o: SfxOut, t: number) => void> = {
  start: sfxStart,
  pick: (o, t) => sfxPick(o, t, 3),
  back: sfxBack,
  toggle: sfxToggle,
  chime: sfxChime,
  ...Object.fromEntries(QUIZ_ELEMENTS.map((el) => [el, (o: SfxOut, t: number) => sfxElement(o, t, el)])),
  ...Object.fromEntries(QUIZ_ELEMENTS.map((el) => [`build-${el}`, (o: SfxOut, t: number) => sfxBuild(o, t, el, 700)])),
};

describe("Elemental quiz sounds", () => {
  it("names notes in equal temperament from A4 = 440 Hz", () => {
    expect(hz("A4")).toBe(440);
    expect(hz("C5")).toBeCloseTo(523.25, 2);
    expect(hz("G7")).toBeCloseTo(3135.96, 2);
    expect(() => hz("H2")).toThrow();
  });

  it("climbs one note of C major pentatonic per question, and per row of the build", () => {
    for (const notes of [PICK_NOTES, ANSWER_NOTES, BUILD_NOTES]) {
      notes.forEach((f, i) => {
        expect(inKey(f)).toBe(true);
        if (i > 0) expect(f).toBeGreaterThan(notes[i - 1]);
      });
    }
    expect(PICK_NOTES).toHaveLength(8);
    expect(ANSWER_NOTES).toHaveLength(8);
    PICK_NOTES.forEach((f, i) => expect(ANSWER_NOTES[i]).toBeGreaterThan(f));
  });

  it.each(Object.keys({ start: 1, back: 1, chime: 1, fire: 1, earth: 1, water: 1, air: 1, aether: 1 }))(
    "keeps every stepped note of %s in C major pentatonic (only the water drop glides off the scale)",
    (name) => {
      const { sources } = record(SOUNDS[name]);
      for (const s of sources) {
        if (s.frequency.events.some((e) => e.kind === "exp")) continue; // a glide, not a note
        for (const e of s.frequency.events) expect(inKey(e.value)).toBe(true);
      }
    },
  );

  it("makes the same noise every time, all of it between -1 and 1", () => {
    const a = seededNoise(4096);
    expect(Array.from(a)).toEqual(Array.from(seededNoise(4096)));
    expect(Math.max(...a)).toBeLessThanOrEqual(1);
    expect(Math.min(...a)).toBeGreaterThanOrEqual(-1);
    expect(Math.abs(a.reduce((s, v) => s + v, 0) / a.length)).toBeLessThan(0.05);
  });

  it("builds a square wave from odd harmonics only", () => {
    const { real, imag } = pulseCoefficients(0.5);
    for (let k = 1; k < real.length; k++) {
      expect(Math.abs(real[k])).toBeLessThan(1e-6);
      if (k % 2 === 0) expect(Math.abs(imag[k])).toBeLessThan(1e-6);
      else expect(imag[k]).toBeCloseTo(2 / (Math.PI * k), 6);
    }
  });

  it.each(QUIZ_ELEMENTS)("ticks %s once per row of its build, at the moment that row's first pixel appears", (el) => {
    const ticks = buildTicks(el, 700);
    const cells = revealCells(el);
    expect(ticks[0].at).toBe(0);
    ticks.forEach((tick, i) => {
      expect(tick.at).toBeLessThan(0.7);
      if (i > 0) {
        expect(tick.at).toBeGreaterThan(ticks[i - 1].at);
        expect(tick.note).toBeGreaterThan(ticks[i - 1].note);
      }
      // IconAssemble's delay for pixel i is round(i / n * duration): a tick must land on one of those.
      const delays = cells.map((_, j) => Math.round((j / cells.length) * 700) / 1000);
      expect(delays).toContain(tick.at);
    });
    expect(ticks.length).toBeLessThanOrEqual(BUILD_NOTES.length);
  });

  it.each(Object.keys(SOUNDS))("schedules %s cleanly: nothing before it starts, every voice faded to silence before it stops", (name) => {
    const { sources, gains, params, t } = record(SOUNDS[name]);
    expect(sources.length).toBeGreaterThan(0);
    for (const s of sources) {
      expect(s.startAt).toBeGreaterThanOrEqual(t);
      expect(s.stopAt).toBeGreaterThan(s.startAt);
    }
    for (const p of [...params, ...gains.map((g) => g.gain)]) {
      for (const e of p.events) {
        expect(Number.isFinite(e.value) && Number.isFinite(e.at)).toBe(true);
        expect(e.at).toBeGreaterThanOrEqual(t);
        if (e.kind === "exp") expect(e.value).toBeGreaterThan(0);
      }
    }
    // Every enveloped voice ends at exactly 0, and no later than its source stops: no clicks at the cut.
    const lastStop = Math.max(...sources.map((s) => s.stopAt));
    for (const g of gains.filter((g) => g.gain.events.length > 0)) {
      const last = g.gain.events.at(-1)!;
      expect(last).toMatchObject({ kind: "set", value: 0 });
      expect(last.at).toBeLessThanOrEqual(lastStop);
    }
  });

  it.each(QUIZ_ELEMENTS)("finishes the %s sound, echoes included, within the 0.8 s the reveal holds before the result opens", (el) => {
    const { sources, t } = record((o, t0) => sfxElement(o, t0, el));
    // Each voice ends when it stops plus the longest echo behind it (aether's taps are feed-forward, so it ends).
    expect(Math.max(...sources.map((s) => s.stopAt + echoAfter(s))) - t).toBeLessThanOrEqual(0.8);
  });
});

describe("Elemental quiz music", () => {
  const SONG_IDS = Object.keys(SONGS) as SongId[];
  const cases = SONG_IDS.flatMap((song) => Array.from({ length: MUSIC_BARS }, (_, bar) => [song, bar] as const));

  it.each(cases)("keeps every note of %s, bar %i, in C major pentatonic", (song, bar) => {
    const { sources } = record((o, t) => musicBar(o, t, bar, song));
    expect(sources.length).toBeGreaterThan(0);
    for (const s of sources) {
      if (s.frequency.events.some((e) => e.kind === "exp")) continue; // the kick's drop is a glide, not a note
      const notes = s.frequency.events.length ? s.frequency.events.map((e) => e.value) : [s.frequency.value];
      for (const f of notes) if (f > 0) expect(inKey(f)).toBe(true);
    }
  });

  it.each(cases)("schedules %s, bar %i, cleanly: nothing early, every voice faded to silence, echoes that end", (song, bar) => {
    const { sources, gains, t } = record((o, t0) => musicBar(o, t0, bar, song));
    for (const s of sources) expect(s.startAt).toBeGreaterThanOrEqual(t);
    for (const g of gains.filter((g) => g.gain.events.length > 0)) expect(g.gain.events.at(-1)).toMatchObject({ kind: "set", value: 0 });
    // A pad holds its chord for two bars, then fades: nothing outlives that plus its echoes.
    expect(Math.max(...sources.map((s) => s.stopAt + echoAfter(s))) - t).toBeLessThanOrEqual(2 * barSeconds(song) + 1.5);
  });

  it.each(SONG_IDS)("loops %s: bar 8 is bar 0 again", (song) => {
    const a = record((o, t) => musicBar(o, t, 0, song));
    const b = record((o, t) => musicBar(o, t, MUSIC_BARS, song));
    expect(b.sources.map((s) => [s.startAt, s.stopAt])).toEqual(a.sources.map((s) => [s.startAt, s.stopAt]));
  });

  it("builds the quiz loop as you go: pad and keys, then the bass, then the drums", () => {
    expect(quizLayers(0)).toEqual(["pad", "keys"]);
    expect(quizLayers(2)).toContain("bass");
    expect(quizLayers(2)).not.toContain("drums");
    expect(quizLayers(7)).toEqual(ALL_LAYERS);
    const quiet = record((o, t) => musicBar(o, t, 0, "quiz", quizLayers(0))).sources.length;
    const full = record((o, t) => musicBar(o, t, 0, "quiz", quizLayers(7))).sources.length;
    expect(full).toBeGreaterThan(quiet);
  });
});
