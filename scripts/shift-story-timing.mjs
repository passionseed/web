#!/usr/bin/env node
/**
 * Measures where each voiceover line starts, so the story Reel cuts to the
 * voice. Reads the pauses with ffmpeg's silencedetect and writes the starts to
 * components/shift/poster/testimonial/storyVoice.json.
 *
 *   node scripts/shift-story-timing.mjs voice.m4a [noiseDb] [minPause]
 *
 * Record one line per breath with a clear pause (about 1-2s) between lines.
 * It expects exactly as many spoken segments as LINES in storyReel.ts; if the
 * count is off, tweak noiseDb (default -35) or minPause (default 0.6).
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const [file, noise = "-35", pause = "0.6"] = process.argv.slice(2);
const EXPECTED = 19;
if (!file) {
  console.error("usage: shift-story-timing.mjs voice.m4a [noiseDb] [minPause]");
  process.exit(1);
}

const { stderr } = spawnSync(
  "ffmpeg",
  ["-hide_banner", "-i", file, "-af", `silencedetect=noise=${noise}dB:d=${pause}`, "-f", "null", "-"],
  { encoding: "utf8" },
);
const silenceEnds = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
const firstSilenceStart = stderr.match(/silence_start: ([\d.]+)/);
// Speech starts at 0 unless the file opens with silence.
const opensSilent = firstSilenceStart && Number(firstSilenceStart[1]) < 0.05;
const starts = (opensSilent ? silenceEnds : [0, ...silenceEnds]).map((s) => Math.max(0, +(s - 0.08).toFixed(2)));
// A trailing silence_end at the very end of the file is not a line.
const duration = Number(stderr.match(/Duration: (\d+):(\d+):([\d.]+)/)?.slice(1).reduce((a, v) => a * 60 + Number(v), 0));
const lines = starts.filter((s) => s < duration - 0.3);

console.log(`found ${lines.length} lines (expected ${EXPECTED}):`, lines.join(", "));
if (lines.length !== EXPECTED) {
  console.error("Line count is off. Adjust noiseDb / minPause and rerun.");
  process.exit(2);
}
writeFileSync(
  new URL("../components/shift/poster/testimonial/storyVoice.json", import.meta.url),
  `${JSON.stringify({ starts: lines })}\n`,
);
console.log("Wrote storyVoice.json");
