/**
 * pnpm radar:story <id> | --all [--platform ig|tt|both] [--variant 1|2]
 *                  [--base url] [--out dir] [--voice-dir dir] [--no-voice]
 *                  [--no-audio] [--allow-lint-errors] [--dry-run]
 *
 * Films story reels (lib/radar-stories; docs/radar-guide/README.md, "Story
 * reels"). For each script: lint (errors stop it), then Playwright opens
 * /studio/radar-story/<id>?render=1 at 432x768, deviceScaleFactor 2.5
 * (1080x1920) and, for every frame, seeks the reel to that frame and
 * screenshots it. Every frame is a pure function of its number (P'Seed too,
 * through GuideNPC's clock), so the film is frame exact without Chrome's
 * virtual time (whose paused screenshots stall in headless Chromium on
 * Linux). The Instagram and TikTok masters differ only in the end card, so
 * both are filmed in one pass:
 * frames before the end card go to both encoders, end card frames are taken
 * once per platform. Soundtrack scored from the timeline's cue sheet
 * (scripts/shift-reel-audio.py), loudnorm, faststart.
 *
 * Output (~/Movies/radar-guide/stories/ or --out): <id>.ig.mp4, <id>.tt.mp4,
 * <id>.cover.webp (frame 0, the hook) and <id>.caption.txt (both captions,
 * the pinned comment, the Trial Reels hooks, the sources). --variant N films
 * the Nth hook variant as <id>.vN.*. --dry-run lints and prints the timeline
 * and the caption file: no browser, no ffmpeg, nothing written.
 *
 * Needs: the studio server (scripts/studio-server.sh, :3010) or --base, ffmpeg,
 * python3 with numpy (unless --no-audio), and Playwright (SHIFT_PLAYWRIGHT_MODULE,
 * or PLAYWRIGHT_WS_ENDPOINT for a Playwright browser server).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import sharp from "sharp";

import { STORY_FRAME } from "../../components/radar/reel/story/cast";
import { STORY_PLATFORMS, type StoryPlatform } from "../../components/radar/reel/story/endCard";
import { buildStoryTimeline, type StoryTimeline } from "../../components/radar/reel/story/storyTimeline";
import { STORY_SCRIPTS, storyById } from "../../lib/radar-stories";
import { formatProblem, lintStories } from "../../lib/radar-stories/lint";
import type { StoryScript } from "../../lib/radar-stories/types";
import { encodeVoiceDurationsParam } from "../../lib/radar-stories/voice";
import { fail, flagString, parseArgs, runMain } from "./lib/cli";
import {
  FRAME_TIMEOUT_MS,
  loadChromium,
  muxVideo,
  openEncoder,
  requireEncoders,
  requireStudio,
  scoreSoundtrack,
  withTimeout,
  type Browser,
  type CdpSession,
  type FrameEncoder,
  type Page,
} from "./lib/film";
import { formatStoryTimeline, publicFileExists, STORY_MOVIES_DIR, storyCaptionText, storyOutputs } from "./lib/story";
import {
  buildStoryVoiceWav,
  loadStoryVoiceClips,
  VOICE_MOVIES_DIR,
  voiceDurationsFromClips,
  type StoryVoiceClip,
} from "./lib/voice";

/** Generous: a shared machine under load can take a while per 1080x1920 screenshot. */
const SHOT_TIMEOUT_MS = 4 * FRAME_TIMEOUT_MS;

/** The whole frame at 2.5x: 1080x1920. */
const CLIP = { x: 0, y: 0, width: STORY_FRAME.width, height: STORY_FRAME.height, scale: STORY_FRAME.scale };

const USAGE =
  "pnpm radar:story <id> | --all [--platform ig|tt|both] [--variant 1|2] [--base url] [--out dir] [--voice-dir dir] [--no-voice] [--no-audio] [--allow-lint-errors] [--dry-run]";

interface Options {
  platforms: StoryPlatform[];
  variant: 1 | 2 | null;
  base: string;
  outDir: string;
  voiceDir: string;
  noVoice: boolean;
  noAudio: boolean;
  dryRun: boolean;
}

function hookFor(script: StoryScript, variant: 1 | 2 | null): string {
  return variant ? script.hookVariantsTh[variant - 1] : script.hookTh;
}

async function filmStory(
  browser: Browser,
  script: StoryScript,
  timeline: StoryTimeline,
  voiceClips: readonly StoryVoiceClip[],
  opts: Options,
): Promise<void> {
  const out = storyOutputs(opts.outDir, script.id, opts.variant);
  const query = new URLSearchParams({ render: "1" });
  if (opts.variant) query.set("hook", String(opts.variant));
  if (voiceClips.length > 0) {
    query.set("voice", encodeVoiceDurationsParam(voiceDurationsFromClips(voiceClips)));
  }
  const url = `${opts.base}/studio/radar-story/${script.id}?${query.toString()}`;
  const work = mkdtempSync(join(tmpdir(), "radar-story-"));
  let encoders = new Map<StoryPlatform, FrameEncoder>();
  const context = await browser.newContext({
    viewport: { width: STORY_FRAME.width, height: STORY_FRAME.height },
    deviceScaleFactor: STORY_FRAME.scale,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  try {
    const tab: Page = await context.newPage();
    await tab.goto(url, { waitUntil: "networkidle", timeout: 300_000 });
    await tab.waitForFunction((id: string) => window.__radarStory?.ready === true && window.__radarStory.id === id, script.id, { timeout: 120_000 });
    const pageFrames: number = await tab.evaluate(() => window.__radarStory!.totalFrames);
    if (pageFrames !== timeline.totalF) {
      fail(`The studio page has ${pageFrames} frames, this checkout ${timeline.totalF}. Sync the studio server: scripts/studio-server.sh --sync`);
    }
    // Fonts and images settle before the first frame.
    await tab.waitForTimeout(1500);

    const cdp: CdpSession = await context.newCDPSession(tab);
    await tab.evaluate(() => window.__radarStory!.start());

    encoders = new Map<StoryPlatform, FrameEncoder>(opts.platforms.map((p) => [p, openEncoder(join(work, `${p}.mp4`))]));
    const hint = "Chrome stopped answering. Restart the studio server and try again.";
    const capture = (f: number) =>
      withTimeout<{ data: string }>(
        cdp.send("Page.captureScreenshot", { format: "png", clip: CLIP, captureBeyondViewport: false }),
        SHOT_TIMEOUT_MS,
        `${hint} (screenshot of frame ${f})`
      );
    // The dev server can reload the page mid-film (a recompile); wait for the reel to come back and carry on.
    const ensureReel = async () => {
      if (await tab.evaluate((id: string) => window.__radarStory?.ready === true && window.__radarStory.id === id, script.id)) return;
      console.log("\nThe studio page reloaded; waiting for the reel.");
      await tab.waitForFunction((id: string) => window.__radarStory?.ready === true && window.__radarStory.id === id, script.id, { timeout: 120_000 });
      await tab.waitForTimeout(1500);
      await tab.evaluate(() => window.__radarStory!.start());
    };
    const shoot = async (f: number, platform: StoryPlatform): Promise<Buffer> => {
      await ensureReel();
      await tab.evaluate(([frame, p]: [number, StoryPlatform]) => window.__radarStory!.seek(frame, p), [f, platform]);
      // A busy machine can drop one screenshot; the frame is a pure function of f, so asking again is safe.
      const shot = await capture(f).catch(() => capture(f));
      return Buffer.from(shot.data, "base64");
    };

    const started = Date.now();
    for (let f = 0; f < timeline.totalF; f++) {
      if (f < timeline.end.startF) {
        const png = await shoot(f, opts.platforms[0]);
        if (f === 0) await sharp(png).webp({ quality: 88 }).toFile(out.cover);
        for (const enc of encoders.values()) await enc.write(png);
      } else {
        for (const p of opts.platforms) await encoders.get(p)!.write(await shoot(f, p));
      }
      if (f % 30 === 0) process.stdout.write(`\r${script.id}: ${(f / 30).toFixed(0)}s / ${timeline.seconds.toFixed(1)}s`);
    }
    for (const enc of encoders.values()) await enc.close();
    encoders = new Map();
    process.stdout.write(`\r${script.id}: ${timeline.seconds.toFixed(1)}s filmed in ${((Date.now() - started) / 1000).toFixed(0)}s\n`);
    console.log(`Wrote ${out.cover}`);

    let voiceWav: string | null = null;
    if (!opts.noAudio && voiceClips.length > 0) {
      voiceWav = join(work, "voice.wav");
      writeFileSync(voiceWav, buildStoryVoiceWav(timeline, voiceClips));
    }

    const audio = opts.noAudio ? null : await scoreSoundtrack(timeline.cues, work, voiceWav);
    for (const p of opts.platforms) {
      await muxVideo(join(work, `${p}.mp4`), audio, out.video(p));
      console.log(`Wrote ${out.video(p)}`);
    }
  } finally {
    for (const enc of encoders.values()) enc.abort();
    await context.close().catch(() => undefined);
    rmSync(work, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2), {
    bool: ["all", "no-audio", "no-voice", "dry-run", "allow-lint-errors"],
    value: ["platform", "variant", "base", "out", "voice-dir"],
  });
  const all = Boolean(args.flags.all);
  const id = args.positional[0];
  if (all === Boolean(id)) fail(`Give one story id, or --all.\nUsage: ${USAGE}\nStories: ${STORY_SCRIPTS.map((s) => s.id).join(", ")}`);
  const scripts = all ? [...STORY_SCRIPTS] : [storyById(id!) ?? fail(`No story "${id}". Stories: ${STORY_SCRIPTS.map((s) => s.id).join(", ")}`)];

  const platformFlag = flagString(args, "platform") ?? "both";
  if (platformFlag !== "ig" && platformFlag !== "tt" && platformFlag !== "both") fail("--platform must be ig, tt or both.");
  const variantFlag = flagString(args, "variant");
  if (variantFlag !== undefined && variantFlag !== "1" && variantFlag !== "2") fail("--variant must be 1 or 2.");
  const opts: Options = {
    platforms: platformFlag === "both" ? [...STORY_PLATFORMS] : [platformFlag],
    variant: variantFlag ? (Number(variantFlag) as 1 | 2) : null,
    base: (flagString(args, "base") ?? "http://localhost:3010").replace(/\/+$/, ""),
    outDir: resolve(flagString(args, "out") ?? STORY_MOVIES_DIR),
    voiceDir: resolve(flagString(args, "voice-dir") ?? VOICE_MOVIES_DIR),
    noVoice: Boolean(args.flags["no-voice"]),
    noAudio: Boolean(args.flags["no-audio"]),
    dryRun: Boolean(args.flags["dry-run"]),
  };

  // Lint every script being filmed (and ids across all of them).
  const problems = lintStories(STORY_SCRIPTS, { sceneExists: publicFileExists }).filter((p) => scripts.some((s) => s.id === p.id));
  problems.forEach((p) => (p.level === "error" ? console.error : console.warn)(formatProblem(p)));
  const errors = problems.filter((p) => p.level === "error");
  if (errors.length && !args.flags["allow-lint-errors"]) fail(`${errors.length} lint error(s). Fix the script, or pass --allow-lint-errors for a draft.`);

  const plans = scripts.map((script) => {
    const voiceClips = opts.noVoice ? [] : loadStoryVoiceClips(opts.voiceDir, script);
    const timeline = buildStoryTimeline(
      script,
      hookFor(script, opts.variant),
      voiceClips.length > 0 ? { voiceDurationsMs: voiceDurationsFromClips(voiceClips) } : undefined,
    );
    return { script, timeline, voiceClips };
  });
  for (const { script, timeline, voiceClips } of plans) {
    const voiceTag = voiceClips.length > 0 ? `, voice: ${voiceClips.map((c) => `beat ${c.beatIndex}`).join(", ")}` : "";
    console.log(`\nStory ${script.id} (${script.series}${opts.variant ? `, hook v${opts.variant}` : ""}${voiceTag}): ${timeline.seconds.toFixed(1)}s\n${formatStoryTimeline(timeline)}`);
  }
  if (opts.dryRun) {
    for (const { script } of plans) console.log(`\n--- ${storyOutputs(opts.outDir, script.id, null).caption}\n${storyCaptionText(script)}`);
    console.log("Dry run: no browser, no ffmpeg, nothing written.");
    return;
  }

  requireEncoders(opts.noAudio);
  await requireStudio(`${opts.base}/studio/radar-story/${plans[0].script.id}`, opts.base);
  mkdirSync(opts.outDir, { recursive: true });
  const chromium = await loadChromium();
  const browser: Browser = await chromium.launch();
  try {
    for (const { script, timeline, voiceClips } of plans) {
      writeFileSync(storyOutputs(opts.outDir, script.id, opts.variant).caption, storyCaptionText(script));
      await filmStory(browser, script, timeline, voiceClips, opts);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

runMain(main);
