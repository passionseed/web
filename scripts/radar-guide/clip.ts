/**
 * pnpm radar:clip <slug> <page> <input.mov> [--dry-run] [--no-whisper] [--out dir] [--allow-lint-errors]
 *
 * Turns one founder take of a level's cutscene into what the page needs
 * (docs/features/radar-guides-in-code.md section 3). The script is the page's
 * ClipSlot in lib/radar-guides/<slug>/pages/, read through the guide registry.
 *   1. ffprobe; HDR (HLG, iPhone) is tone-mapped to SDR BT.709
 *   2. the clean 1080x1920 master (loudnorm, no burned captions) for the Dusk City edit
 *   3. the web clip: 540x960, about 1.2 Mbps H.264, faststart; webp poster under 60KB
 *   4. caption timing: whisper-cli (Thai) for times, clip.scriptLinesTh for text
 *      (alignScriptToCues). Without whisper-cli the lines are spread over the
 *      clip by spoken length, and the command says so.
 *   5. B2 upload with immutable caching: radar/guide/<slug>/<page>.<sha8>.mp4 and .webp
 *   6. lib/radar-guides/<slug>/clips/<page>.vtt and clips.json (sorted, 2-space JSON)
 *   7. the master, VTT and <page>.cuts.json in ~/Movies/radar-guide/<slug>/ (or --out)
 * No database: a clip goes live when the PR with clips.json and the VTT merges.
 *
 *   --dry-run            steps 1-4 and 7 locally; nothing is uploaded and the repo is not
 *                        touched: clips.json and the VTT are written to <out>/dry-run/
 *   --no-whisper         skip whisper-cli even when installed
 *   --allow-lint-errors  record even when the clip script fails guide-lint
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

import { alignScriptToCuesDetailed, buildVtt, toCaptionCues, type TimedText } from "../../lib/radar-guide/caption-align";
import { formatIssues, lintErrors, lintGuide } from "../../lib/radar-guide/guide-lint";
import type { IsoDate } from "../../lib/radar-guide/guide-types";
import { parseVtt } from "../../lib/radar-guide/vtt";
import { putImmutable, requireB2Env } from "./lib/b2";
import {
  assertSlug,
  capture,
  fail,
  flagString,
  hasBinary,
  parseArgs,
  paths,
  REPO_ROOT,
  requireBinary,
  run,
  runMain,
  todayBangkok,
} from "./lib/cli";
import { buildClipMedia, requireClipPage, writeClipFiles } from "./lib/clip-manifest";
import { buildCutList, spokenLines } from "./lib/cuts";
import { GLOBAL_BANNED, guideDir, requireGuide, SHARED_FACTS } from "./lib/guides";
import {
  masterArgs,
  parseProbe,
  POSTER_MAX_BYTES,
  POSTER_QUALITIES,
  posterArgs,
  posterTime,
  PROBE_ARGS,
  sha8,
  webClipArgs,
  whisperArgs,
  whisperWavArgs,
} from "./lib/media";

const USAGE = "pnpm radar:clip <slug> <page> <input.mov> [--dry-run] [--no-whisper] [--out dir] [--allow-lint-errors]";
const MAX_SECONDS = 180;

async function makePoster(master: string, output: string, duration: number): Promise<number> {
  for (const quality of POSTER_QUALITIES) {
    await run("ffmpeg", posterArgs(master, output, posterTime(duration), quality));
    if (statSync(output).size < POSTER_MAX_BYTES) return quality;
  }
  fail(`Could not get the poster under ${POSTER_MAX_BYTES / 1024}KB even at quality ${POSTER_QUALITIES.at(-1)}.`);
}

async function whisperCues(master: string, work: string, skipReason: string | null): Promise<TimedText[] | null> {
  if (skipReason) {
    console.log(`Captions: ${skipReason}, so lines are spread over the clip by spoken length.`);
    return null;
  }
  if (!hasBinary("whisper-cli")) {
    console.warn(
      "Captions: whisper-cli is not installed (brew install whisper-cpp), so caption timing falls back to spreading\n" +
        "the script lines over the clip by spoken length. Check the timing by eye before opening the PR."
    );
    return null;
  }
  if (!existsSync(paths.whisperModel)) {
    console.warn(`Captions: whisper model missing at ${paths.whisperModel}; falling back to spreading lines by spoken length.`);
    return null;
  }
  const wav = join(work, "audio.wav");
  await run("ffmpeg", whisperWavArgs(master, wav));
  const base = join(work, "whisper");
  console.log("Captions: running whisper-cli (Thai) for timings...");
  await run("whisper-cli", whisperArgs(paths.whisperModel, wav, base), { quiet: true });
  const vtt = existsSync(`${base}.vtt`) ? readFileSync(`${base}.vtt`, "utf8") : "";
  const cues = parseVtt(vtt);
  if (!cues.length) console.warn("Captions: whisper produced no cues; falling back to spreading lines by spoken length.");
  return cues.length ? cues : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    bool: ["dry-run", "no-whisper", "allow-lint-errors"],
    value: ["out"],
  });
  const slug = assertSlug(args.positional[0], USAGE);
  const pageKey = args.positional[1];
  if (!pageKey) fail(`Missing <page>.\nUsage: ${USAGE}`);
  const inputArg = args.positional[2];
  if (!inputArg) fail(`Missing <input.mov>.\nUsage: ${USAGE}`);
  const input = resolve(inputArg);
  if (!existsSync(input)) fail(`Input ${input} does not exist.`);
  const dryRun = Boolean(args.flags["dry-run"]);

  // Fail before any encoding when something is missing.
  requireBinary("ffmpeg", "encoding the master, web clip and poster");
  requireBinary("ffprobe", "reading the input's colour and length");
  if (!dryRun) requireB2Env();

  const guide = requireGuide(slug);
  const { page, slot } = requireClipPage(guide, pageKey);
  const lines = spokenLines(slot);
  if (!lines.length) fail(`The ${pageKey} clip slot has no script lines.`);

  const issues = lintGuide(guide, { sharedFacts: SHARED_FACTS, globalBanned: GLOBAL_BANNED }).filter(
    (i) => i.pageKey === pageKey && i.path.startsWith("clip")
  );
  const errors = lintErrors(issues);
  for (const w of issues.filter((i) => i.level === "warn")) console.warn(`lint warning ${w.path}: ${w.message}`);
  if (errors.length) {
    console.error(formatIssues(errors));
    if (!args.flags["allow-lint-errors"]) fail("The clip script fails guide-lint; fix the page before recording (or --allow-lint-errors).");
  }

  const probe = parseProbe(capture("ffprobe", [...PROBE_ARGS, input]));
  if (probe.duration < 1 || probe.duration > MAX_SECONDS) fail(`The take is ${probe.duration.toFixed(1)}s; clips must be 1 to ${MAX_SECONDS}s.`);
  if (probe.duration > slot.seconds * 1.5 + 5) {
    console.warn(`warning: the take is ${probe.duration.toFixed(1)}s; the slot plans ${slot.seconds}s. Long cutscenes get skipped.`);
  }
  console.log(
    `${slug}/${pageKey} (Lv${page.order} ${page.titleTh}): ${probe.width}x${probe.height}, ${probe.duration.toFixed(1)}s, ` +
      `transfer ${probe.colorTransfer ?? "unknown"}${probe.colorTransfer === "arib-std-b67" ? " (HLG: tone-mapping to SDR)" : ""}` +
      `${probe.hasAudio ? "" : ", NO AUDIO"}.`
  );

  const outDir = resolve(flagString(args, "out") ?? paths.movies(slug));
  mkdirSync(outDir, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), "radar-clip-"));
  try {
    const master = join(outDir, `${pageKey}.master.mp4`);
    console.log(`Encoding master -> ${master}`);
    await run("ffmpeg", masterArgs(input, master, probe));

    const web = join(work, "web.mp4");
    console.log("Encoding web clip (540x960, ~1.2 Mbps, faststart)...");
    await run("ffmpeg", webClipArgs(master, web, probe.hasAudio));
    const poster = join(work, "poster.webp");
    const quality = await makePoster(master, poster, probe.duration);

    const masterProbe = parseProbe(capture("ffprobe", [...PROBE_ARGS, master]));
    const duration = Math.round(masterProbe.duration * 10) / 10;

    const skip = args.flags["no-whisper"] ? "--no-whisper" : probe.hasAudio ? null : "the take has no audio";
    const cues = await whisperCues(master, work, skip);
    const aligned = alignScriptToCuesDetailed(lines, cues ?? [], { duration });
    const method = cues && aligned.method === "aligned" ? "whisper" : "proportional";
    if (cues && aligned.method !== "aligned") {
      console.warn(`Captions: whisper's text matched the script poorly (similarity ${aligned.similarity}); spread lines by spoken length instead.`);
    } else if (cues) {
      console.log(`Captions: aligned to whisper (similarity ${aligned.similarity}).`);
    }
    const subtitles = toCaptionCues(aligned.lines);
    const vtt = buildVtt(subtitles);

    const webBytes = readFileSync(web);
    const posterBytes = readFileSync(poster);
    const media = buildClipMedia({
      slug,
      pageKey,
      sha8: sha8(webBytes),
      durationS: duration,
      recordedAt: todayBangkok() as IsoDate,
      scriptLinesTh: slot.scriptLinesTh,
    });
    const videoKey = new URL(media.videoUrl).pathname.slice(1);
    const posterKey = new URL(media.posterUrl).pathname.slice(1);
    console.log(
      `Web clip ${(webBytes.length / 1024 / 1024).toFixed(2)}MB -> ${videoKey}\n` +
        `Poster ${(posterBytes.length / 1024).toFixed(0)}KB (webp q${quality}) -> ${posterKey}`
    );

    // Edit files on the founder's machine.
    const vttCopy = join(outDir, `${pageKey}.vtt`);
    writeFileSync(vttCopy, vtt);
    const cutsPath = join(outDir, `${pageKey}.cuts.json`);
    const cuts = buildCutList({ slug, page, slot, durationS: duration, timed: aligned.lines, subtitles, method, masterPath: master, vttPath: vttCopy });
    writeFileSync(cutsPath, `${JSON.stringify(cuts, null, 2)}\n`);
    console.log(`Wrote ${vttCopy} and ${cutsPath}`);

    if (dryRun) {
      writeFileSync(join(outDir, `${pageKey}.web.mp4`), webBytes);
      writeFileSync(join(outDir, `${pageKey}.poster.webp`), posterBytes);
      // A scratch copy of the guide's clip files, so the repo only changes after a real upload.
      const scratch = join(outDir, "dry-run");
      mkdirSync(scratch, { recursive: true });
      const realManifest = join(guideDir(slug), "clips.json");
      if (existsSync(realManifest)) cpSync(realManifest, join(scratch, "clips.json"));
      const written = writeClipFiles(scratch, pageKey, media, vtt);
      console.log(
        `\nDry run: nothing uploaded, the repo is unchanged.\n` +
          `Local copies: ${pageKey}.web.mp4 and ${pageKey}.poster.webp in ${outDir}.\n` +
          `Would write ${written.manifestPath} and ${written.vttPath} into lib/radar-guides/${slug}/.\n` +
          `Caption timing: ${method}. Check ${written.vttPath} against the take before the real run.`
      );
      return;
    }

    const putVideo = await putImmutable(videoKey, webBytes, "video/mp4");
    const putPoster = await putImmutable(posterKey, posterBytes, "image/webp");
    console.log(`B2: video ${putVideo.skipped ? "already there" : "uploaded"}, poster ${putPoster.skipped ? "already there" : "uploaded"}.`);

    const written = writeClipFiles(guideDir(slug), pageKey, media, vtt);
    console.log(
      `\nWrote ${relative(REPO_ROOT, written.manifestPath)} and ${relative(REPO_ROOT, written.vttPath)}.\n` +
        `Commit lib/radar-guides/${slug}/clips.json and clips/${pageKey}.vtt in a PR. The cutscene shows once it merges;\n` +
        `until then the level plays the host's dialogue fallback.`
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

runMain(main);
