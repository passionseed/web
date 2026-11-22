/**
 * Filming plumbing shared by `radar:reel` and `radar:story`: Playwright,
 * the studio server check, Chrome virtual time, piping PNG frames into
 * ffmpeg, and the soundtrack (scripts/shift-reel-audio.py, loudnorm,
 * faststart).
 */
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { CliError, fail, REPO_ROOT, requireBinary, run } from "./cli";

export const FPS = 30;
export const AUDIO_SCRIPT = join(REPO_ROOT, "scripts/shift-reel-audio.py");
export const FRAME_TIMEOUT_MS = 15_000;
export const ENCODE_ARGS = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow"];

/* eslint-disable @typescript-eslint/no-explicit-any -- Playwright is not a project dependency, so its types are not available. */
export type Browser = any;
export type Page = any;
export type CdpSession = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Playwright's chromium. Not a project dependency: same resolution chain as
 * scripts/render-poster.mjs. With PLAYWRIGHT_WS_ENDPOINT set, `launch()`
 * connects to a running Playwright browser server instead (for a machine
 * whose own Chromium cannot start; see docs/radar-guide/README.md).
 */
export async function loadChromium(): Promise<{ launch(): Promise<Browser> }> {
  const candidates = [
    "playwright",
    process.env.SHIFT_PLAYWRIGHT_MODULE,
    join(homedir(), ".claude/skills/gstack/node_modules/playwright/index.mjs"),
  ].filter((c): c is string => Boolean(c));
  for (const spec of candidates) {
    try {
      const mod = await import(spec.startsWith("/") ? pathToFileURL(spec).href : spec);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (!chromium) continue;
      const ws = process.env.PLAYWRIGHT_WS_ENDPOINT?.trim();
      return ws ? { launch: () => chromium.connect(ws) } : chromium;
    } catch {
      // try the next one
    }
  }
  fail("Playwright not found. Set SHIFT_PLAYWRIGHT_MODULE to a playwright/index.mjs path, or `npm i playwright` in a scratch dir.");
}

export async function requireStudio(url: string, base: string): Promise<void> {
  let status = 0;
  try {
    status = (await fetch(url, { signal: AbortSignal.timeout(300_000) })).status;
  } catch {
    fail(`The studio server is not reachable at ${base}. Start it with scripts/studio-server.sh (port 3010), or pass --base.`);
  }
  if (status !== 200) fail(`${url} answered ${status}. Is this branch synced into the studio server? scripts/studio-server.sh --sync`);
}

export function requireEncoders(noAudio: boolean): void {
  requireBinary("ffmpeg", "encoding the reel");
  if (!noAudio) {
    requireBinary("python3", "scoring the soundtrack (scripts/shift-reel-audio.py, needs numpy)");
    if (!existsSync(AUDIO_SCRIPT)) fail(`${AUDIO_SCRIPT} is missing.`);
  }
}

/** Scores the soundtrack from a cue sheet into `work`/audio.wav (with optional 44.1 kHz voice ducking). */
export async function scoreSoundtrack(cues: unknown, work: string, voiceWav?: string | null): Promise<string> {
  const cuesPath = join(work, "cues.json");
  writeFileSync(cuesPath, JSON.stringify(cues));
  const audio = join(work, "audio.wav");
  const args = [AUDIO_SCRIPT, cuesPath, audio];
  if (voiceWav) args.push(voiceWav);
  await run("python3", args);
  return audio;
}

/** Video plus soundtrack (loudnorm), or video alone; faststart either way. */
export async function muxVideo(video: string, audio: string | null, out: string): Promise<void> {
  if (!audio) {
    await run("ffmpeg", ["-y", "-i", video, "-c:v", "copy", "-an", "-movflags", "+faststart", out]);
    return;
  }
  await run("ffmpeg", [
    "-y", "-i", video, "-i", audio,
    "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
    "-shortest", "-movflags", "+faststart", out,
  ]);
}

export async function muxAudio(video: string, cues: unknown, work: string, out: string, noAudio: boolean): Promise<void> {
  await muxVideo(video, noAudio ? null : await scoreSoundtrack(cues, work), out);
}

export async function pipeFrames(video: string, total: number, label: string, seconds: number, frame: (f: number) => Promise<Buffer>): Promise<void> {
  await run("ffmpeg", ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", ...ENCODE_ARGS, video], {
    stdin: async (stdin) => {
      for (let f = 0; f < total; f++) {
        const png = await frame(f);
        if (!stdin.write(png)) await new Promise((r) => stdin.once("drain", r));
        if (f % FPS === 0) process.stdout.write(`\r${label}: ${f / FPS}s / ${seconds.toFixed(1)}s`);
      }
      stdin.end();
    },
  });
}

/** An ffmpeg encoder fed PNG frames one at a time (for filming two masters in one pass). */
export interface FrameEncoder {
  write(png: Buffer): Promise<void>;
  /** Ends the stream and resolves when ffmpeg has written the file. */
  close(): Promise<void>;
  /** Stops ffmpeg without waiting (after a failure). */
  abort(): void;
}

export function openEncoder(video: string): FrameEncoder {
  const child = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", ...ENCODE_ARGS, video], {
    stdio: ["pipe", "ignore", "inherit"],
  });
  const done = new Promise<void>((ok, reject) => {
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? ok() : reject(new CliError(`ffmpeg exited with code ${code} writing ${video}.`))));
  });
  // A failed encoder must not leave a write waiting for "drain" forever.
  const failed = done.then(
    () => undefined,
    (err: unknown) => err
  );
  return {
    async write(png) {
      if (child.stdin.write(png)) return;
      const outcome = await Promise.race([new Promise<"drain">((r) => child.stdin.once("drain", () => r("drain"))), failed]);
      if (outcome !== "drain") throw outcome ?? new CliError(`ffmpeg stopped early writing ${video}.`);
    },
    async close() {
      child.stdin.end();
      await done;
    },
    abort() {
      child.stdin.destroy();
      child.kill("SIGKILL");
      done.catch(() => undefined);
    },
  };
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Lets `budget` ms of Chrome virtual time pass, then resolves. */
export function advance(cdp: CdpSession, budget: number): Promise<void> {
  return new Promise((ok, reject) => {
    cdp.once("Emulation.virtualTimeBudgetExpired", () => ok());
    cdp.send("Emulation.setVirtualTimePolicy", { policy: "advance", budget }).catch(reject);
  });
}
