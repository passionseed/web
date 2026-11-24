/**
 * Pure and filesystem helpers shared by `pnpm radar:voice` and `pnpm radar:story`:
 * ffmpeg voice-processing filter chain, two-pass loudnorm parsing, local voice
 * file discovery, manifest I/O, and 44.1 kHz timeline voice-track assembly.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { StoryTimeline } from "../../../components/radar/reel/story/storyTimeline";
import type { StoryScript } from "../../../lib/radar-stories/types";
import { encodeVoiceTrackWav, parseWav, SCORER_SAMPLE_RATE, type VoiceTrackClip } from "../../../lib/radar-stories/wav";

export const VOICE_MOVIES_DIR = join(homedir(), "Movies/radar-guide/voice");

/**
 * Spoken-word voice processing chain before EBU R128 loudness normalization:
 * 1. High-pass at 80 Hz (2nd-order) to remove rumble and phone handling noise.
 * 2. Gentle FFT denoise (max 10 dB reduction with noise tracking).
 * 3. Light de-esser to tame harsh sibilance on phone mics.
 * 4. Light vocal compression (2.5:1) to smooth dynamics without pumping.
 */
export const VOICE_PRE_FILTER_CHAIN = [
  "highpass=f=80:poles=2",
  "afftdn=nr=10:nf=-35:tn=1",
  "deesser=i=0.35:m=0.4:f=0.5:s=o",
  "acompressor=threshold=-20dB:ratio=2.5:attack=10:release=120:makeup=2dB",
].join(",");

export const VOICE_LOUDNORM_TARGET = "I=-16:TP=-1.5:LRA=9";

export interface LoudnormStats {
  inputI: number;
  inputTp: number;
  inputLra: number;
  inputThresh: number;
  targetOffset: number;
}

/** Pass-1 ffmpeg args to measure EBU R128 loudness after the voice filter chain. */
export function voiceAnalyzeArgs(inputPath: string): string[] {
  return [
    "-hide_banner",
    "-nostats",
    "-i",
    inputPath,
    "-af",
    `${VOICE_PRE_FILTER_CHAIN},loudnorm=${VOICE_LOUDNORM_TARGET}:print_format=json`,
    "-f",
    "null",
    "-",
  ];
}

/** Parses the JSON stats block printed by ffmpeg's `loudnorm=print_format=json`. */
export function parseLoudnormStats(stderr: string): LoudnormStats | null {
  const start = stderr.lastIndexOf("{");
  const end = stderr.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const raw = JSON.parse(stderr.slice(start, end + 1)) as Record<string, unknown>;
    const inputI = Number(raw.input_i);
    const inputTp = Number(raw.input_tp);
    const inputLra = Number(raw.input_lra);
    const inputThresh = Number(raw.input_thresh);
    const targetOffset = Number(raw.target_offset);
    if (
      !Number.isFinite(inputI) ||
      !Number.isFinite(inputTp) ||
      !Number.isFinite(inputLra) ||
      !Number.isFinite(inputThresh) ||
      !Number.isFinite(targetOffset) ||
      inputI <= -70
    ) {
      return null;
    }
    return { inputI, inputTp, inputLra, inputThresh, targetOffset };
  } catch {
    return null;
  }
}

/**
 * Pass-2 (or single-pass fallback) ffmpeg args producing a processed
 * 44.1 kHz 16-bit mono WAV ready for `scripts/shift-reel-audio.py`.
 */
export function voiceProcessArgs(
  inputPath: string,
  outputPath: string,
  stats?: LoudnormStats | null,
): string[] {
  const loudnorm = stats
    ? `loudnorm=${VOICE_LOUDNORM_TARGET}:measured_I=${stats.inputI}:measured_LRA=${stats.inputLra}:measured_TP=${stats.inputTp}:measured_thresh=${stats.inputThresh}:offset=${stats.targetOffset}:linear=true`
    : `loudnorm=${VOICE_LOUDNORM_TARGET}`;

  return [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-vn",
    "-af",
    `${VOICE_PRE_FILTER_CHAIN},${loudnorm}`,
    "-ac",
    "1",
    "-ar",
    String(SCORER_SAMPLE_RATE),
    "-c:a",
    "pcm_s16le",
    outputPath,
  ];
}

// ---------------------------------------------------------------------------
// Manifest per story (`~/Movies/radar-guide/voice/<storyId>/manifest.json`)
// ---------------------------------------------------------------------------

export interface VoiceManifestEntry {
  takeId: string;
  lineHash: string;
  durationMs: number;
  file: string;
}

export interface VoiceStoryManifest {
  storyId: string;
  updatedAt: string;
  beats: Record<string, VoiceManifestEntry>;
}

export function readVoiceManifest(storyDir: string): VoiceStoryManifest | null {
  const file = join(storyDir, "manifest.json");
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as VoiceStoryManifest;
    if (typeof parsed?.storyId === "string" && parsed.beats && typeof parsed.beats === "object") {
      return parsed;
    }
  } catch {
    // ignore corrupt cache file
  }
  return null;
}

export function writeVoiceManifest(storyDir: string, manifest: VoiceStoryManifest): void {
  writeFileSync(join(storyDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

// ---------------------------------------------------------------------------
// Local processed voice discovery + timeline track assembly for `radar:story`
// ---------------------------------------------------------------------------

export interface StoryVoiceClip {
  beatIndex: number;
  path: string;
  durationMs: number;
  sampleRate: number;
  samples: Float32Array;
}

/**
 * Loads processed `<beat>.wav` files from `<voiceDir>/<storyId>/`.
 * Returns an empty array when the directory or files do not exist.
 */
export function loadStoryVoiceClips(
  voiceDir: string,
  script: Pick<StoryScript, "id" | "beats">,
): StoryVoiceClip[] {
  const storyDir = join(voiceDir, script.id);
  if (!existsSync(storyDir)) return [];

  const entries = readdirSync(storyDir)
    .map((name) => {
      const match = /^(\d+)\.wav$/.exec(name);
      return match ? { name, beatIndex: Number(match[1]) } : null;
    })
    .filter((entry): entry is { name: string; beatIndex: number } =>
      Boolean(entry && entry.beatIndex >= 0 && entry.beatIndex < script.beats.length),
    )
    .sort((a, b) => a.beatIndex - b.beatIndex);

  const clips: StoryVoiceClip[] = [];
  for (const { name, beatIndex } of entries) {
    const filePath = join(storyDir, name);
    const bytes = new Uint8Array(readFileSync(filePath));
    const parsed = parseWav(bytes);
    if (!parsed.ok) {
      throw new Error(`Invalid voice WAV ${filePath}: ${parsed.error}`);
    }
    clips.push({
      beatIndex,
      path: filePath,
      durationMs: parsed.wav.durationMs,
      sampleRate: parsed.wav.sampleRate,
      samples: parsed.wav.samples,
    });
  }

  return clips;
}

/** Maps loaded voice clips to `{ [beatIndex]: durationMs }` for `buildStoryTimeline`. */
export function voiceDurationsFromClips(
  clips: readonly Pick<StoryVoiceClip, "beatIndex" | "durationMs">[],
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const clip of clips) {
    out[clip.beatIndex] = clip.durationMs;
  }
  return out;
}

/**
 * Places each processed beat WAV at its beat's exact start time on the reel
 * timeline and encodes a 44.1 kHz 16-bit mono WAV for `shift-reel-audio.py`.
 */
export function buildStoryVoiceWav(
  timeline: Pick<StoryTimeline, "fps" | "seconds" | "beats">,
  clips: readonly Pick<StoryVoiceClip, "beatIndex" | "samples" | "sampleRate">[],
): Uint8Array {
  const placements: VoiceTrackClip[] = [];
  for (const clip of clips) {
    const cue = timeline.beats[clip.beatIndex];
    if (!cue) continue;
    placements.push({
      startSeconds: cue.startF / timeline.fps,
      samples: clip.samples,
      sampleRate: clip.sampleRate,
    });
  }
  return encodeVoiceTrackWav(timeline.seconds, placements, SCORER_SAMPLE_RATE);
}
