#!/usr/bin/env node
/**
 * Films /shift/poster/testimonial frame by frame and encodes an IG Reel MP4.
 *
 *   node scripts/render-shift-testimonial.mjs <kid> [baseUrl] [out.mp4]
 *
 * <kid> is a slug from components/shift/poster/testimonial/testimonialReel.ts.
 *
 * Needs a running dev server, ffmpeg on PATH, and `playwright` resolvable
 * (it is not a project dependency: `npm i playwright` in a scratch dir and
 * run with NODE_PATH, or copy this script there).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright";

const KID = process.argv[2] ?? "lens";
const BASE = process.argv[3] ?? "http://localhost:3000";
const OUT = process.argv[4] ?? `output/shift-testimonial/shift1-testimonial-${KID}.mp4`;
const FPS = 30;
const SECONDS = Number(process.env.REEL_SECONDS ?? 33);

mkdirSync(dirname(OUT), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
await page.goto(`${BASE}/shift/poster/testimonial?render=1&kid=${KID}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__reelReady === true, null, { timeout: 60_000 });
const reel = page.locator("#shift-testimonial-reel");

const ffmpeg = spawn(
  "ffmpeg",
  ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
   "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow",
   "-movflags", "+faststart", OUT],
  { stdio: ["pipe", "inherit", "inherit"] },
);

const total = Math.round(SECONDS * FPS);
for (let f = 0; f < total; f++) {
  await page.evaluate((t) => window.__seekReel(t), f / FPS);
  ffmpeg.stdin.write(await reel.screenshot({ type: "png" }));
  if (f % FPS === 0) process.stdout.write(`\r${f / FPS}s / ${SECONDS}s`);
}
ffmpeg.stdin.end();
await new Promise((resolve) => ffmpeg.on("close", resolve));
await browser.close();
console.log(`\nWrote ${OUT}`);
