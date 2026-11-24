/**
 * pnpm radar:voice [<storyId>] [--out dir] [--force] [--dry-run]
 *
 * Downloads the picked voice take for every voiced beat from Supabase Storage
 * (`radar-voice` private bucket), processes each with ffmpeg (80 Hz high-pass,
 * gentle FFT denoise, de-ess, light compression, two-pass -16 LUFS loudnorm,
 * 44.1 kHz 16-bit mono WAV) into ~/Movies/radar-guide/voice/<storyId>/<beat>.wav,
 * and reports missing, unpicked, or stale lines.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { STORY_SCRIPTS, storyById } from "../../lib/radar-stories";
import { summarizeStoryVoice } from "../../lib/radar-stories/voice";
import { parseWav } from "../../lib/radar-stories/wav";
import { downloadVoiceTakeBuffer, listVoiceTakes } from "../../lib/supabase/radar-voice";
import { fail, flagString, parseArgs, requireBinary, run, runMain } from "./lib/cli";
import { serviceClient } from "./lib/supabase";
import {
  parseLoudnormStats,
  readVoiceManifest,
  VOICE_MOVIES_DIR,
  voiceAnalyzeArgs,
  voiceProcessArgs,
  writeVoiceManifest,
  type VoiceStoryManifest,
} from "./lib/voice";

const USAGE = "pnpm radar:voice [<storyId>] [--out dir] [--force] [--dry-run]";

async function processWithFfmpeg(rawWavPath: string, outWavPath: string): Promise<void> {
  // Pass 1: measure true EBU R128 stats after high-pass, denoise, de-ess, and compression.
  const analysis = spawnSync("ffmpeg", voiceAnalyzeArgs(rawWavPath), {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const stats = analysis.status === 0 ? parseLoudnormStats(analysis.stderr ?? "") : null;

  // Pass 2: apply linear loudness normalization and write 44.1 kHz 16-bit mono WAV.
  await run("ffmpeg", voiceProcessArgs(rawWavPath, outWavPath, stats));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2), {
    bool: ["force", "dry-run"],
    value: ["out"],
  });

  const storyId = args.positional[0];
  if (args.positional.length > 1) {
    fail(`Too many arguments.\nUsage: ${USAGE}`);
  }

  const scripts = storyId
    ? [storyById(storyId) ?? fail(`No story "${storyId}". Stories: ${STORY_SCRIPTS.map((s) => s.id).join(", ")}`)]
    : [...STORY_SCRIPTS];

  const outDir = resolve(flagString(args, "out") ?? VOICE_MOVIES_DIR);
  const force = Boolean(args.flags.force);
  const dryRun = Boolean(args.flags["dry-run"]);

  if (!dryRun) {
    requireBinary("ffmpeg", "processing voice takes to 44.1 kHz -16 LUFS mono WAV");
  }

  const client = serviceClient("downloading picked Radar voice takes");
  const takes = await listVoiceTakes(client, storyId);

  let totalLines = 0;
  let downloaded = 0;
  let cached = 0;
  let missing = 0;
  let unpicked = 0;
  let stale = 0;

  const issues: string[] = [];
  const work = dryRun ? null : mkdtempSync(join(tmpdir(), "radar-voice-"));

  try {
    for (const script of scripts) {
      const summary = summarizeStoryVoice(script, takes);
      totalLines += summary.totalLines;

      const storyDir = join(outDir, script.id);
      const prevManifest = readVoiceManifest(storyDir);
      const nextManifest: VoiceStoryManifest = {
        storyId: script.id,
        updatedAt: new Date().toISOString(),
        beats: {},
      };

      const lineNotes: string[] = [];

      for (const item of summary.lines) {
        const beatFile = `${item.line.beatIndex}.wav`;
        const outWavPath = join(storyDir, beatFile);

        if (item.pickedCurrent) {
          const take = item.pickedCurrent;
          const prev = prevManifest?.beats[String(item.line.beatIndex)];
          const isUpToDate =
            !force &&
            prev?.takeId === take.id &&
            prev?.lineHash === item.line.lineHash &&
            existsSync(outWavPath);

          if (isUpToDate) {
            cached++;
            nextManifest.beats[String(item.line.beatIndex)] = prev;
            lineNotes.push(`beat ${item.line.beatIndex}: cached (${(prev.durationMs / 1000).toFixed(2)}s)`);
          } else if (dryRun) {
            downloaded++;
            lineNotes.push(`beat ${item.line.beatIndex}: would download + process (${(take.duration_ms / 1000).toFixed(2)}s)`);
          } else {
            mkdirSync(storyDir, { recursive: true });
            const rawBuf = await downloadVoiceTakeBuffer(client, take.storage_path);
            const rawPath = join(work!, `${script.id}-${item.line.beatIndex}.raw.wav`);
            writeFileSync(rawPath, rawBuf);
            await processWithFfmpeg(rawPath, outWavPath);

            const parsedOut = parseWav(new Uint8Array(readFileSync(outWavPath)));
            const durationMs = parsedOut.ok ? parsedOut.wav.durationMs : take.duration_ms;

            downloaded++;
            nextManifest.beats[String(item.line.beatIndex)] = {
              takeId: take.id,
              lineHash: item.line.lineHash,
              durationMs,
              file: beatFile,
            };
            lineNotes.push(`beat ${item.line.beatIndex}: processed (${(durationMs / 1000).toFixed(2)}s)`);
          }
          continue;
        }

        // Not ready for filming: clean up any leftover processed WAV from an older take.
        if (!dryRun && existsSync(outWavPath)) {
          unlinkSync(outWavPath);
        }

        const preview = item.line.lineTh.length > 42 ? `${item.line.lineTh.slice(0, 42)}...` : item.line.lineTh;
        if (item.status === "recorded") {
          unpicked++;
          lineNotes.push(`beat ${item.line.beatIndex}: UNPICKED (${item.currentTakes.length} take(s), star one in studio)`);
          issues.push(`  [unpicked] ${script.id} beat ${item.line.beatIndex}: "${preview}"`);
        } else if (item.status === "stale") {
          stale++;
          lineNotes.push(`beat ${item.line.beatIndex}: STALE (script changed, re-record)`);
          issues.push(`  [stale]    ${script.id} beat ${item.line.beatIndex}: "${preview}"`);
        } else {
          missing++;
          lineNotes.push(`beat ${item.line.beatIndex}: MISSING`);
          issues.push(`  [missing]  ${script.id} beat ${item.line.beatIndex}: "${preview}"`);
        }
      }

      if (!dryRun && (Object.keys(nextManifest.beats).length > 0 || prevManifest)) {
        mkdirSync(storyDir, { recursive: true });
        writeVoiceManifest(storyDir, nextManifest);
      }

      const ready = summary.pickedCount;
      console.log(`${script.id} (${ready}/${summary.totalLines} picked): ${lineNotes.join(" | ")}`);
    }
  } finally {
    if (work) rmSync(work, { recursive: true, force: true });
  }

  console.log("");
  console.log(
    `Summary (${dryRun ? "dry-run" : outDir}): ${downloaded} ${dryRun ? "to download" : "processed"}, ${cached} cached, ${unpicked} unpicked, ${stale} stale, ${missing} missing (of ${totalLines} voiced lines).`,
  );

  if (issues.length > 0) {
    console.log("\nLines needing attention:");
    for (const line of issues) console.log(line);
  }
}

runMain(main);
