#!/usr/bin/env node
/**
 * Films /shift/poster/testimonial frame by frame, scores a chiptune track from
 * the Reel's cue sheet, and encodes an IG Reel MP4 with sound.
 *
 *   node scripts/render-shift-testimonial.mjs [kid] [baseUrl] [out.mp4]
 *
 * kid is a slug from components/shift/poster/testimonial/testimonialReel.ts
 * (default: lens), or `story` for the MOFU story Reel. For the story, set
 * REEL_VOICE to the voiceover file to mix it in. Needs a running dev server, ffmpeg and python3 with numpy
 * on PATH, and `playwright` resolvable (it is not a project dependency:
 * `npm i playwright` in a scratch dir and run a copy of this script there).
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const KID = process.argv[2] ?? "lens";
const BASE = process.argv[3] ?? "http://localhost:3000";
const OUT = resolve(process.argv[4] ?? `output/shift-testimonial/shift1-${KID === "story" ? "story" : `testimonial-${KID}`}.mp4`);
const PAGE = KID === "story" ? "/shift/poster/story?render=1" : `/shift/poster/testimonial?render=1&kid=${KID}`;
const VOICE = process.env.REEL_VOICE;
const AUDIO_SCRIPT = process.env.REEL_AUDIO_SCRIPT ?? join(dirname(fileURLToPath(import.meta.url)), "shift-reel-audio.py");
const FPS = 30;

function run(cmd, args, stdin) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: [stdin ? "pipe" : "ignore", "ignore", "inherit"] });
    p.on("close", (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}`))));
    if (stdin) stdin(p.stdin);
  });
}

mkdirSync(dirname(OUT), { recursive: true });
const work = mkdtempSync(join(tmpdir(), "shift-reel-"));
const video = join(work, "video.mp4");
const cuesPath = join(work, "cues.json");
const audio = join(work, "audio.wav");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
await page.goto(`${BASE}${PAGE}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__reelReady === true, null, { timeout: 60_000 });
const cues = await page.evaluate(() => window.__reelCues);
writeFileSync(cuesPath, JSON.stringify(cues));
const reel = page.locator("#shift-testimonial-reel");

const total = Math.round(cues.seconds * FPS);
await run(
  "ffmpeg",
  ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
   "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", video],
  async (stdin) => {
    for (let f = 0; f < total; f++) {
      await page.evaluate((t) => window.__seekReel(t), f / FPS);
      stdin.write(await reel.screenshot({ type: "png" }));
      if (f % FPS === 0) process.stdout.write(`\r${KID}: ${f / FPS}s / ${cues.seconds}s`);
    }
    stdin.end();
  },
);
await browser.close();

const voiceArgs = [];
if (VOICE) {
  const voiceWav = join(work, "voice.wav");
  await run("ffmpeg", ["-y", "-i", resolve(VOICE), "-ac", "1", "-ar", "44100", "-sample_fmt", "s16", voiceWav]);
  voiceArgs.push(voiceWav);
}
await run("python3", [AUDIO_SCRIPT, cuesPath, audio, ...voiceArgs]);
await run("ffmpeg", [
  "-y", "-i", video, "-i", audio,
  "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-2:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT,
]);
console.log(`\nWrote ${OUT}`);
