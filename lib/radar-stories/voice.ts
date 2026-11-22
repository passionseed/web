/**
 * Voice plan for Career Radar story reels. Pure: runs identically in the
 * browser studio, Next.js route handlers, CLI scripts, and Jest.
 *
 * Default rule: every P'Seed line (`who === "host"`) is voiced by the founder.
 * Edit `defaultBeatNeedsVoice` to widen or narrow the rule globally, or add a
 * per-script entry to `VOICE_OVERRIDES`.
 *
 * Each voiced line gets a stable `lineKey = "${storyId}:${beatIndex}:${lineHash}"`
 * where `lineHash` is the first 8 hex characters of SHA-256(lineTh.trim()).
 * Editing `lineTh` changes the hash so existing takes immediately show as stale.
 */
import { beatMs } from "./timing";
import type { Mood, Scene, StoryBeat, StoryScript, Who } from "./types";

/** Breathing room added after a spoken voice take before cutting to the next beat. */
export const VOICE_BEAT_TAIL_MS = 400;

export interface ScriptVoiceOverride {
  /** Beat indices (0-based) to force-include even if the default rule excludes them. */
  includeBeats?: readonly number[];
  /** Beat indices (0-based) to exclude even if the default rule includes them. */
  excludeBeats?: readonly number[];
  /** Optional custom predicate for this script, replacing `defaultBeatNeedsVoice`. */
  rule?: (beat: StoryBeat, beatIndex: number) => boolean;
}

/**
 * Per-script overrides keyed by `StoryScript.id`.
 * Example: `{ "lost-01-dinner": { excludeBeats: [5] } }`.
 */
export const VOICE_OVERRIDES: Readonly<Record<string, ScriptVoiceOverride>> = {};

/**
 * Single easy-to-edit global voicing rule: every P'Seed line (`who === "host"`)
 * is voiced by the founder.
 */
export function defaultBeatNeedsVoice(beat: Pick<StoryBeat, "who" | "lineTh" | "big">): boolean {
  return beat.who === "host";
}

/** Whether `script.beats[beatIndex]` should have a human voice recording. */
export function beatNeedsVoice(
  script: Pick<StoryScript, "id" | "beats">,
  beatIndex: number,
  overrides: Readonly<Record<string, ScriptVoiceOverride>> = VOICE_OVERRIDES,
): boolean {
  const beat = script.beats[beatIndex];
  if (!beat) return false;
  const override = overrides[script.id];
  if (override?.excludeBeats?.includes(beatIndex)) return false;
  if (override?.includeBeats?.includes(beatIndex)) return true;
  if (override?.rule) return override.rule(beat, beatIndex);
  return defaultBeatNeedsVoice(beat);
}

// ---------------------------------------------------------------------------
// Deterministic pure-TS SHA-256 (sync, identical in browser and Node)
// ---------------------------------------------------------------------------

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function utf8Bytes(input: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i++;
      }
    }
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Hex(input: string): string {
  const msg = utf8Bytes(input);
  const bitLen = msg.length * 8;
  const paddedLen = Math.ceil((msg.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(msg);
  padded[msg.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map((n) => n.toString(16).padStart(8, "0")).join("");
}

/** First 8 lowercase hex chars of SHA-256(lineTh.trim()). */
export function lineHash(lineTh: string): string {
  return sha256Hex(lineTh.trim()).slice(0, 8);
}

/** Stable identifier tying a recording to a specific story, beat index, and script text. */
export function makeLineKey(storyId: string, beatIndex: number, hash: string): string {
  return `${storyId}:${beatIndex}:${hash}`;
}

export const LINE_HASH_PATTERN = /^[0-9a-f]{8}$/;

// ---------------------------------------------------------------------------
// Voiced line plans & direction context
// ---------------------------------------------------------------------------

export interface BeatPreview {
  beatIndex: number;
  who: Who;
  lineTh: string;
  scene: Scene;
}

export interface VoicedLine {
  storyId: string;
  beatIndex: number;
  /** 0-based order among voiced lines in this story. */
  lineIndex: number;
  totalLines: number;
  lineHash: string;
  lineKey: string;
  who: Who;
  /** Who the speaker is addressing (inferred from surrounding beats). */
  speakingTo: Exclude<Who, "host" | "text"> | "viewer";
  lineTh: string;
  mood: Mood;
  scene: Scene;
  big: boolean;
  /** Target beat length in milliseconds (derived from `beatMs`). */
  targetMs: number;
  targetSeconds: number;
  prevBeat: BeatPreview | null;
  nextBeat: BeatPreview | null;
}

function inferSpeakingTo(beats: readonly StoryBeat[], beatIndex: number): VoicedLine["speakingTo"] {
  const self = beats[beatIndex]?.who;
  for (let i = beatIndex - 1; i >= 0; i--) {
    const w = beats[i].who;
    if (w !== "text" && w !== "host" && w !== self) return w;
  }
  for (let i = beatIndex + 1; i < beats.length; i++) {
    const w = beats[i].who;
    if (w !== "text" && w !== "host" && w !== self) return w;
  }
  return "viewer";
}

/** Builds the ordered list of voiced lines for a story script. */
export function buildStoryVoicePlan(
  script: Pick<StoryScript, "id" | "beats">,
  overrides: Readonly<Record<string, ScriptVoiceOverride>> = VOICE_OVERRIDES,
): VoicedLine[] {
  const indices: number[] = [];
  for (let i = 0; i < script.beats.length; i++) {
    if (beatNeedsVoice(script, i, overrides)) indices.push(i);
  }

  return indices.map((beatIndex, lineIndex) => {
    const beat = script.beats[beatIndex];
    const hash = lineHash(beat.lineTh);
    const targetMs = Math.round(beatMs(beat));
    const prev = beatIndex > 0 ? script.beats[beatIndex - 1] : null;
    const next = beatIndex + 1 < script.beats.length ? script.beats[beatIndex + 1] : null;
    return {
      storyId: script.id,
      beatIndex,
      lineIndex,
      totalLines: indices.length,
      lineHash: hash,
      lineKey: makeLineKey(script.id, beatIndex, hash),
      who: beat.who,
      speakingTo: inferSpeakingTo(script.beats, beatIndex),
      lineTh: beat.lineTh,
      mood: beat.mood ?? (beat.who === "host" ? "talk" : "idle"),
      scene: beat.scene,
      big: Boolean(beat.big),
      targetMs,
      targetSeconds: Math.round((targetMs / 1000) * 10) / 10,
      prevBeat: prev ? { beatIndex: beatIndex - 1, who: prev.who, lineTh: prev.lineTh, scene: prev.scene } : null,
      nextBeat: next ? { beatIndex: beatIndex + 1, who: next.who, lineTh: next.lineTh, scene: next.scene } : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Take classification & story progress
// ---------------------------------------------------------------------------

export interface VoiceTakeRef {
  id: string;
  story_id: string;
  beat_index: number;
  line_hash: string;
  picked: boolean;
}

export type VoiceLineStatus = "picked" | "recorded" | "stale" | "missing";

export interface ClassifiedLineTakes<T extends VoiceTakeRef = VoiceTakeRef> {
  line: VoicedLine;
  status: VoiceLineStatus;
  currentTakes: T[];
  staleTakes: T[];
  pickedCurrent: T | null;
  pickedStale: T | null;
}

export function isTakeStale(take: Pick<VoiceTakeRef, "line_hash">, line: Pick<VoicedLine, "lineHash">): boolean {
  return take.line_hash !== line.lineHash;
}

export function classifyLineTakes<T extends VoiceTakeRef>(
  line: VoicedLine,
  takes: readonly T[],
): ClassifiedLineTakes<T> {
  const forLine = takes.filter((t) => t.story_id === line.storyId && t.beat_index === line.beatIndex);
  const currentTakes: T[] = [];
  const staleTakes: T[] = [];

  for (const take of forLine) {
    if (isTakeStale(take, line)) staleTakes.push(take);
    else currentTakes.push(take);
  }

  const pickedCurrent = currentTakes.find((t) => t.picked) ?? null;
  const pickedStale = staleTakes.find((t) => t.picked) ?? null;

  let status: VoiceLineStatus;
  if (pickedCurrent) status = "picked";
  else if (currentTakes.length > 0) status = "recorded";
  else if (staleTakes.length > 0) status = "stale";
  else status = "missing";

  return { line, status, currentTakes, staleTakes, pickedCurrent, pickedStale };
}

export interface StoryVoiceSummary<T extends VoiceTakeRef = VoiceTakeRef> {
  storyId: string;
  totalLines: number;
  /** Lines with a picked take matching the current script text. */
  pickedCount: number;
  /** Lines with at least one current take (including picked lines). */
  recordedCount: number;
  /** Lines with current takes but none starred yet. */
  unpickedCount: number;
  /** Lines whose only takes (or picked take without a current replacement) are from older text. */
  staleCount: number;
  /** Lines with no takes at all. */
  missingCount: number;
  /** Index of the first line needing work (missing -> stale -> unpicked), or 0 when complete. */
  nextLineIndex: number;
  lines: ClassifiedLineTakes<T>[];
}

export function summarizeStoryVoice<T extends VoiceTakeRef>(
  script: Pick<StoryScript, "id" | "beats">,
  takes: readonly T[],
  overrides: Readonly<Record<string, ScriptVoiceOverride>> = VOICE_OVERRIDES,
): StoryVoiceSummary<T> {
  const plan = buildStoryVoicePlan(script, overrides);
  const lines = plan.map((line) => classifyLineTakes(line, takes));

  let pickedCount = 0;
  let recordedCount = 0;
  let unpickedCount = 0;
  let staleCount = 0;
  let missingCount = 0;

  for (const item of lines) {
    if (item.status === "picked") {
      pickedCount++;
      recordedCount++;
    } else if (item.status === "recorded") {
      recordedCount++;
      unpickedCount++;
    } else if (item.status === "stale") {
      staleCount++;
    } else {
      missingCount++;
    }
  }

  const firstUnfinished = lines.findIndex((item) => item.status !== "picked");

  return {
    storyId: script.id,
    totalLines: plan.length,
    pickedCount,
    recordedCount,
    unpickedCount,
    staleCount,
    missingCount,
    nextLineIndex: firstUnfinished >= 0 ? firstUnfinished : 0,
    lines,
  };
}

// ---------------------------------------------------------------------------
// Filming timeline integration helpers
// ---------------------------------------------------------------------------

/**
 * Computes the on-screen beat duration when a processed voice file exists:
 * at least as long as the voice duration plus `tailMs` (~0.4 s), never shorter
 * than the beat's base duration.
 */
export function beatDurationWithVoiceMs(
  baseMs: number,
  voiceDurationMs: number | undefined,
  tailMs = VOICE_BEAT_TAIL_MS,
): number {
  if (typeof voiceDurationMs !== "number" || !Number.isFinite(voiceDurationMs) || voiceDurationMs <= 0) {
    return baseMs;
  }
  return Math.max(baseMs, Math.round(voiceDurationMs) + tailMs);
}

/** Serializes `{ [beatIndex]: durationMs }` into a compact URL query value, e.g. `"4:4820,5:3150"`. */
export function encodeVoiceDurationsParam(durations: Readonly<Record<number, number>>): string {
  return Object.entries(durations)
    .map(([k, v]) => [Number(k), Math.round(v)] as const)
    .filter(([k, v]) => Number.isInteger(k) && k >= 0 && Number.isFinite(v) && v > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
}

/** Parses `?voice=4:4820,5:3150` back into `{ [beatIndex]: durationMs }`, or undefined when empty/invalid. */
export function parseVoiceDurationsParam(
  raw: string | string[] | undefined,
): Record<number, number> | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.trim()) return undefined;
  const out: Record<number, number> = {};
  let count = 0;
  for (const part of value.split(",")) {
    const match = /^(\d{1,3}):(\d{1,6})$/.exec(part.trim());
    if (!match) continue;
    const beatIndex = Number(match[1]);
    const ms = Number(match[2]);
    if (beatIndex >= 0 && beatIndex <= 200 && ms > 0 && ms <= 120_000) {
      out[beatIndex] = ms;
      count++;
    }
  }
  return count > 0 ? out : undefined;
}

// ---------------------------------------------------------------------------
// Thai UI labels for voice direction
// ---------------------------------------------------------------------------

export const WHO_LABEL_TH: Readonly<Record<Who | "viewer", string>> = {
  host: "P'Seed",
  student: "นักเรียน",
  friend: "เพื่อน",
  parent: "แม่",
  text: "ข้อความบรรยาย",
  viewer: "คนดู",
};

export const MOOD_DIRECTION_TH: Readonly<Record<Mood, { label: string; cue: string }>> = {
  talk: { label: "talk", cue: "เล่าเป็นกันเอง สบายๆ" },
  wow: { label: "wow", cue: "ตื่นเต้น ยกน้ำเสียง ว้าว" },
  serious: { label: "serious", cue: "จริงจัง อบอุ่น ตั้งใจบอก" },
  wink: { label: "wink", cue: "ขี้เล่น ยิ้มมุมปาก เบาๆ" },
  idle: { label: "idle", cue: "นิ่งๆ สบายๆ" },
};

export const SCENE_LABEL_TH: Readonly<Record<string, string>> = {
  "bedroom-night": "ห้องนอนตอนดึก",
  classroom: "ห้องเรียน",
  "dinner-table": "โต๊ะกินข้าวกับที่บ้าน",
  "school-gate": "หน้าโรงเรียนหลังเลิกเรียน",
  "phone-feed": "หน้าจอมือถือไถฟีด",
  radar: "โลก Career Radar",
};

export function sceneLabelTh(scene: Scene): string {
  if (scene in SCENE_LABEL_TH) return SCENE_LABEL_TH[scene];
  if (scene.startsWith("career:")) {
    return `ฉากอาชีพ ${scene.slice("career:".length)}`;
  }
  return scene;
}
