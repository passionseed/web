/**
 * The story reel's timeline. Pure: a script (and the hook to open with) in,
 * every cue in whole frames out, so the studio frame draws frame N the same
 * way on every run and `radar:story` scores the soundtrack from the same
 * numbers (scripts/shift-reel-audio.py).
 *
 * Order: the beats, then the end card. There is no hook card: frame 0 is the
 * first line, already landed (lib/radar-stories/timing.ts storyFrames). Beats
 * in a row that share a scene form a segment; a pixel wipe covers each change
 * of scene (and the cut to the end card), centred on the boundary, so it
 * never adds time. Lengths come from lib/radar-stories/timing.ts.
 */
import type { Mood, ReelCues } from "../../../shift/poster/testimonial/reelEngine";
import { beatMs, charCount, FRAME_MS, STORY_FPS, storyFrames, toFrames } from "../../../../lib/radar-stories/timing";
import type { Mood as HostMood, Scene, StoryBeat, StoryScript, Who } from "../../../../lib/radar-stories/types";
import { beatDurationWithVoiceMs } from "../../../../lib/radar-stories/voice";
import { RADAR_REEL_BEAT } from "../radarReel";

export type CastWho = Exclude<Who, "text">;
/** Left to right on stage. */
export const CAST_ORDER: readonly CastWho[] = ["student", "friend", "parent", "host"];

export const STORY_REEL_TIMING = {
  /** Typewriter: ms per character, and at most this share of the beat. */
  typeMsPerChar: 28,
  typeMaxShare: 0.45,
  /** A big line's speaker mouths it this long. */
  bigTalkMs: 900,
  /** Total pixel wipe, half closing before the boundary, half opening after. */
  wipeFrames: 10,
  /** The host's entrance (drop and sparkle). */
  enterFrames: 8,
  /** End card: when the CTA and the share line land, after the card starts. */
  endCtaMs: 300,
  endFriendMs: 1300,
  endCoinMs: 900,
} as const;

export interface StoryCastMember {
  who: CastWho;
  /** On stage from this frame (the host pops in on its first line). */
  enterF: number;
}

export interface StorySegment {
  index: number;
  scene: Scene;
  startF: number;
  endF: number;
  /** Beat indexes in this segment. */
  beats: number[];
  cast: StoryCastMember[];
}

export interface StoryBeatCue {
  index: number;
  beat: StoryBeat;
  segment: number;
  startF: number;
  endF: number;
  /** Frames the typewriter takes (0 for big lines, which slam in whole). */
  typeF: number;
  /** Frames the speaker's mouth moves. */
  talkF: number;
  /** Frames a recorded voice take plays (omitted when silent). */
  voiceF?: number;
}

export interface StoryTimelineOptions {
  /** Optional map of beat index -> processed voice duration in milliseconds. */
  voiceDurationsMs?: Readonly<Record<number, number>>;
}

export interface StoryTimeline {
  fps: number;
  totalF: number;
  seconds: number;
  /** The hook, for the caption (it is not drawn: the reel opens cold). */
  hookTh: string;
  beats: StoryBeatCue[];
  segments: StorySegment[];
  end: { startF: number; endF: number };
  /** Frames where a scene changes (a wipe is centred on each). */
  wipes: number[];
  cues: ReelCues;
}

const sec = (f: number) => Math.round((f / STORY_FPS) * 1000) / 1000;
const frames = (ms: number) => Math.round(ms / FRAME_MS);

/** Frames to type `line`: about 28 ms a character, never more than 45% of the beat. */
export function typeFrames(line: string, beatF: number): number {
  const want = frames(charCount(line) * STORY_REEL_TIMING.typeMsPerChar);
  return Math.max(1, Math.min(want, Math.floor(beatF * STORY_REEL_TIMING.typeMaxShare)));
}

/** Scenes with no ground to stand on: nobody is drawn there (their lines still show, tagged). */
export const FLOORLESS_SCENES: readonly Scene[] = ["phone-feed"];

/** What the story has shown before a segment: who stood in each scene, and who last spoke to P'Seed. */
interface CastHistory {
  seenIn: Map<Scene, Set<CastWho>>;
  lastGuest: CastWho | null;
}

/**
 * Who is on stage in a segment: everyone who speaks in it; anyone who stood
 * in this same scene earlier in the story (they did not leave); and, when the
 * segment opens with P'Seed, whoever last spoke other than P'Seed (P'Seed is
 * answering them, so they never vanish mid-answer). Nobody on a floorless
 * scene.
 */
function castFor(beats: StoryBeatCue[], segStartF: number, scene: Scene, history: CastHistory): StoryCastMember[] {
  if (FLOORLESS_SCENES.includes(scene)) return [];
  const firstLine = new Map<CastWho, number>();
  beats.forEach((b, i) => {
    if (b.beat.who !== "text" && !firstLine.has(b.beat.who)) firstLine.set(b.beat.who, i);
  });
  const stays = new Set<CastWho>(history.seenIn.get(scene) ?? []);
  const opener = beats.find((b) => b.beat.who !== "text")?.beat.who;
  if (opener === "host" && history.lastGuest) stays.add(history.lastGuest);
  stays.delete("host");
  return CAST_ORDER.filter((who) => firstLine.has(who) || stays.has(who)).map((who) => {
    const i = firstLine.get(who);
    // The host appears on its first line; everyone else is already there.
    const enterF = who === "host" && i !== undefined && i > 0 ? beats[i].startF : segStartF;
    return { who, enterF };
  });
}

function castSegments(segments: StorySegment[], beats: StoryBeatCue[]): void {
  const history: CastHistory = { seenIn: new Map(), lastGuest: null };
  for (const s of segments) {
    const own = s.beats.map((i) => beats[i]);
    s.cast = castFor(own, s.startF, s.scene, history);
    const seen = history.seenIn.get(s.scene) ?? new Set<CastWho>();
    s.cast.forEach((c) => seen.add(c.who));
    history.seenIn.set(s.scene, seen);
    const guests = own.filter((b) => b.beat.who !== "text" && b.beat.who !== "host");
    if (guests.length) history.lastGuest = guests[guests.length - 1].beat.who as CastWho;
  }
}

export function buildStoryTimeline(
  script: Pick<StoryScript, "hookTh" | "beats">,
  hookTh: string = script.hookTh,
  options?: StoryTimelineOptions,
): StoryTimeline {
  const lengths = storyFrames(script);
  const voiceMap = options?.voiceDurationsMs;
  let cursor = 0;
  const beats: StoryBeatCue[] = script.beats.map((beat, index) => {
    const startF = cursor;
    const voiceMs = voiceMap?.[index];
    const hasVoice = typeof voiceMs === "number" && Number.isFinite(voiceMs) && voiceMs > 0;
    const len = hasVoice ? toFrames(beatDurationWithVoiceMs(beatMs(beat), voiceMs)) : lengths.beats[index];
    cursor += len;
    const typeF = beat.big ? 0 : typeFrames(beat.lineTh, len);
    const baseTalkF = beat.big ? Math.min(len, frames(STORY_REEL_TIMING.bigTalkMs)) : typeF;
    if (hasVoice) {
      const voiceF = Math.min(len, toFrames(voiceMs));
      const talkF = Math.max(baseTalkF, voiceF);
      return { index, beat, segment: 0, startF, endF: cursor, typeF, talkF, voiceF };
    }
    return { index, beat, segment: 0, startF, endF: cursor, typeF, talkF: baseTalkF };
  });
  const end = { startF: cursor, endF: cursor + lengths.end };
  const totalF = end.endF;

  // Segments: runs of beats sharing a scene.
  const segments: StorySegment[] = [];
  for (const b of beats) {
    const last = segments[segments.length - 1];
    if (last && last.scene === b.beat.scene) {
      last.beats.push(b.index);
      last.endF = b.endF;
    } else {
      segments.push({ index: segments.length, scene: b.beat.scene, startF: segments.length ? b.startF : 0, endF: b.endF, beats: [b.index], cast: [] });
    }
    b.segment = segments.length - 1;
  }
  castSegments(segments, beats);

  const wipes = [...segments.slice(1).map((s) => s.startF), end.startF];
  return { fps: STORY_FPS, totalF, seconds: sec(totalF), hookTh, beats, segments, end, wipes, cues: buildCues(beats, segments, end, totalF) };
}

function buildCues(beats: StoryBeatCue[], segments: StorySegment[], end: StoryTimeline["end"], totalF: number): ReelCues {
  const seconds = sec(totalF);
  const T = STORY_REEL_TIMING;
  const endAt = (ms: number) => sec(end.startF + frames(ms));
  const slams = [0.05, ...beats.filter((b) => b.beat.big).map((b) => sec(b.startF)), endAt(T.endCoinMs)];
  const pops = [
    ...beats.filter((b) => !b.beat.big).map((b) => sec(b.startF)),
    ...segments.flatMap((s) => s.cast.filter((c) => c.enterF > s.startF).map((c) => sec(c.enterF))),
    endAt(T.endCtaMs),
    endAt(T.endFriendMs),
  ];
  const sorted = (xs: number[]) => Array.from(new Set(xs.filter((t) => t >= 0 && t < seconds))).sort((a, b) => a - b);

  const firstHost = beats.find((b) => b.beat.who === "host");
  const twist = beats.find((b) => b.beat.big && (!firstHost || b.index > firstHost.index)) ?? beats[beats.length - 1];
  // A cold open: the score starts in the story's mood on frame 0 (no build-up under a title card).
  const moods: [number, Mood][] = [[0, firstHost && firstHost.index > 0 ? "dark" : "light"]];
  if (firstHost && firstHost.index > 0) moods.push([sec(firstHost.startF), "light"]);
  if (twist && (!firstHost || twist.index > firstHost.index)) moods.push([sec(twist.startF), "full"]);
  moods.push([sec(end.startF), "offer"]);

  return {
    seconds,
    beat: RADAR_REEL_BEAT,
    // The last cut must be the end card: the score starts its offer melody there.
    cuts: [0, ...segments.slice(1).map((s) => sec(s.startF)), sec(end.startF)],
    slams: sorted(slams),
    pops: sorted(pops),
    count: null,
    coin: endAt(T.endCoinMs),
    moods: moods.filter((m, i) => i === moods.length - 1 || m[0] < moods[i + 1][0]),
  };
}

// ---------------------------------------------------------------- lookups for a frame
export type StoryPhase = { kind: "beat"; cue: StoryBeatCue } | { kind: "end" };

export function phaseAt(t: StoryTimeline, f: number): StoryPhase {
  if (f >= t.end.startF) return { kind: "end" };
  const cue = t.beats.find((b) => f >= b.startF && f < b.endF) ?? t.beats[t.beats.length - 1];
  return { kind: "beat", cue };
}

/** The segment on screen at frame `f` (the end card keeps the last one). */
export function segmentAt(t: StoryTimeline, f: number): StorySegment {
  return t.segments.find((s) => f >= s.startF && f < s.endF) ?? t.segments[t.segments.length - 1];
}

/**
 * The pixel wipe at frame `f`: 0 is clear, 1 fully covered. Closes over the
 * half before a scene change and opens over the half after.
 */
export function wipeAt(t: StoryTimeline, f: number): { progress: number; closing: boolean } | null {
  const half = STORY_REEL_TIMING.wipeFrames / 2;
  for (const w of t.wipes) {
    if (f >= w - half && f < w) return { progress: (f - (w - half) + 1) / half, closing: true };
    if (f >= w && f < w + half) return { progress: 1 - (f - w + 1) / half, closing: false };
  }
  return null;
}

/** Characters of the current line shown at frame `f`. */
export function typedAt(cue: StoryBeatCue, f: number, total: number): number {
  if (cue.typeF <= 0) return total;
  const k = f - cue.startF + 1;
  return Math.max(0, Math.min(total, Math.ceil((k / cue.typeF) * total)));
}

/**
 * P'Seed's mood at frame `f`: stays in `"talk"` while a recorded voice take
 * plays (so held moods like `"wink"` or `"wow"` do not freeze the mouth), then
 * settles into the beat's scripted mood during the tail. Without voice files,
 * matches the silent behaviour identically.
 */
export function hostMoodAt(phase: StoryPhase, f: number): HostMood {
  if (phase.kind === "end") return "wink";
  if (phase.kind !== "beat" || phase.cue.beat.who !== "host") return "idle";
  const { cue } = phase;
  if (cue.voiceF && f >= cue.startF && f < cue.startF + cue.voiceF) {
    return "talk";
  }
  return cue.beat.mood ?? "talk";
}
