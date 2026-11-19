/**
 * pnpm radar:reel <slug> [--page key] [--format motion|demo] [--platform ig|tt]
 *                 [--compare other-slug] [--base url] [--out dir] [--cover]
 *                 [--no-audio] [--realtime] [--dry-run]
 *
 * Films Career Radar reels (docs/features/radar-guides-in-code.md section 3).
 *
 * motion (default): the Dusk City scene reel ("อาชีพนี้ใน 30 วินาที"). The
 *   payload comes from the code guide (fact-backed lines only) with the radar
 *   dump as a fallback; Playwright opens /studio/radar-reel/<slug>?render=1,
 *   injects window.__RADAR_REEL__, seeks every frame and pipes it to ffmpeg.
 *   --page makes a one-level reel, --compare a "เทียบ 2 อาชีพ" reel.
 *
 * demo: films a guide level in demo mode. Playwright opens
 *   /studio/radar-guide/<slug>/<page>?render=1 at 432x768, deviceScaleFactor
 *   2.5 (1080x1920), pauses Chrome's virtual time, starts the frame's clock,
 *   and advances 33.33ms per frame, so the level's timers and animations are
 *   deterministic. --realtime records in real time instead (Playwright video)
 *   when virtual time misbehaves. The default format for --page is the page's
 *   reel.format when it is "demo".
 *
 * Both: soundtrack scored from the cue sheet (scripts/shift-reel-audio.py),
 * loudnorm, faststart. IG and TikTok masters differ only in the end card.
 * Output: ~/Movies/radar-guide/<slug>/. --dry-run writes the payload or plan
 * and prints the timeline: no browser, no ffmpeg. Nothing is uploaded.
 *
 * Story reels (lib/radar-stories) are filmed by `pnpm radar:story <id>`.
 *
 * Needs: the studio server (scripts/studio-server.sh, :3010) or --base, ffmpeg,
 * python3 with numpy (unless --no-audio), and Playwright resolvable (set
 * SHIFT_PLAYWRIGHT_MODULE to a playwright/index.mjs if it is not installed, or
 * PLAYWRIGHT_WS_ENDPOINT to a running Playwright browser server).
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { buildDemoReelPlan, demoReelProblems, DEMO_FRAME, type DemoReelPlan } from "../../components/radar/reel/demoReel";
import { buildRadarReelPayload, type RadarReelPlatform } from "../../components/radar/reel/payload";
import { buildRadarReelTimeline } from "../../components/radar/reel/radarReel";
import type { CareerGuide } from "../../lib/radar-guide/guide-types";
import { assertSlug, fail, flagString, parseArgs, paths, run, runMain } from "./lib/cli";
import { readDump, type RadarDump } from "./lib/dump";
import {
  advance,
  ENCODE_ARGS,
  FPS,
  FRAME_TIMEOUT_MS,
  loadChromium,
  muxAudio,
  pipeFrames,
  requireEncoders,
  requireStudio,
  withTimeout,
  type Browser,
  type CdpSession,
  type Page,
} from "./lib/film";
import { guideFacts, loadGuide } from "./lib/guides";

const USAGE =
  "pnpm radar:reel <slug> [--page key] [--format motion|demo] [--platform ig|tt] [--compare other-slug] [--base url] [--out dir] [--cover] [--no-audio] [--realtime] [--dry-run]";
const MOTION_ELEMENT = "#radar-reel";

function dumpIfAny(slug: string, guide: CareerGuide | null): RadarDump | null {
  if (existsSync(paths.dump(slug))) return readDump(slug);
  if (!guide) return readDump(slug); // fails with "Run: pnpm radar:dump <slug>"
  console.warn(`note: no dump for ${slug}; card-only scenes (AI score, day, reality) are left out. pnpm radar:dump ${slug} adds them.`);
  return null;
}

// ---------------------------------------------------------------------------
// motion
// ---------------------------------------------------------------------------

async function filmMotion(opts: {
  slug: string;
  guide: CareerGuide | null;
  page: string | null;
  platform: RadarReelPlatform;
  compareSlug: string | null;
  base: string;
  outDir: string;
  cover: boolean;
  noAudio: boolean;
  dryRun: boolean;
}): Promise<void> {
  const { slug, guide, page, platform, compareSlug } = opts;
  const otherGuide = compareSlug ? loadGuide(compareSlug) : null;
  const payload = buildRadarReelPayload({
    dump: dumpIfAny(slug, guide),
    guide,
    facts: guide ? guideFacts(guide) : undefined,
    platform,
    page,
    compareWith: compareSlug
      ? { dump: dumpIfAny(compareSlug, otherGuide), guide: otherGuide, facts: otherGuide ? guideFacts(otherGuide) : undefined }
      : null,
  });
  for (const note of payload.notes) console.warn(`warning: ${note}`);
  const timeline = buildRadarReelTimeline(payload);
  console.log(
    `Motion reel ${slug} (${payload.mode}${page ? ` ${page}` : ""}${compareSlug ? ` vs ${compareSlug}` : ""}, ${platform}): ${timeline.seconds.toFixed(1)}s\n` +
      timeline.scenes.map((s) => `  ${s.id.padEnd(8)} ${s.start.toFixed(2)}s to ${s.end.toFixed(2)}s`).join("\n")
  );

  const name = `${slug}-${compareSlug ? `vs-${compareSlug}` : page ?? "30s"}-motion-${platform}`;
  const payloadPath = join(opts.outDir, `${name}.payload.json`);
  writeFileSync(payloadPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${payloadPath}`);
  if (opts.dryRun) {
    console.log("Dry run: no browser, no ffmpeg.");
    return;
  }

  requireEncoders(opts.noAudio);
  const pageUrl = `${opts.base}/studio/radar-reel/${slug}`;
  await requireStudio(pageUrl, opts.base);

  const chromium = await loadChromium();
  const browser = await chromium.launch();
  const work = mkdtempSync(join(tmpdir(), "radar-reel-"));
  try {
    const tab: Page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
    await tab.addInitScript((p: unknown) => {
      (window as unknown as { __RADAR_REEL__: unknown }).__RADAR_REEL__ = p;
    }, payload);

    if (opts.cover) {
      await tab.goto(`${pageUrl}?cover=1`, { waitUntil: "networkidle" });
      await tab.waitForFunction(() => (window as unknown as { __reelReady?: boolean }).__reelReady === true, null, { timeout: 60_000 });
      const coverPath = join(opts.outDir, `${name}.cover.png`);
      await tab.locator(MOTION_ELEMENT).screenshot({ path: coverPath, type: "png" });
      console.log(`Wrote ${coverPath}`);
      await tab.evaluate(() => {
        (window as unknown as { __reelReady?: boolean }).__reelReady = false;
      });
    }

    await tab.goto(`${pageUrl}?render=1`, { waitUntil: "networkidle" });
    await tab.waitForFunction(() => (window as unknown as { __reelReady?: boolean }).__reelReady === true, null, { timeout: 60_000 });
    const cues = await tab.evaluate(() => (window as unknown as { __reelCues: unknown }).__reelCues);

    const video = join(work, "video.mp4");
    const reel = tab.locator(MOTION_ELEMENT);
    await pipeFrames(video, Math.round(timeline.seconds * FPS), name, timeline.seconds, async (f) => {
      await tab.evaluate((t: number) => (window as unknown as { __seekReel: (s: number) => void }).__seekReel(t), f / FPS);
      return (await reel.screenshot({ type: "png" })) as Buffer;
    });
    await browser.close();

    const out = join(opts.outDir, `${name}.mp4`);
    await muxAudio(video, cues, work, out, opts.noAudio);
    console.log(`\nWrote ${out}`);
  } finally {
    await browser.close().catch(() => undefined);
    rmSync(work, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// demo
// ---------------------------------------------------------------------------

async function openDemoFrame(browser: Browser, url: string, video?: { dir: string }): Promise<{ context: Browser; tab: Page; openedAt: number }> {
  const context = await browser.newContext({
    viewport: { width: DEMO_FRAME.width, height: DEMO_FRAME.height },
    deviceScaleFactor: DEMO_FRAME.scale,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
    ...(video ? { recordVideo: { dir: video.dir, size: { width: DEMO_FRAME.width * DEMO_FRAME.scale, height: DEMO_FRAME.height * DEMO_FRAME.scale } } } : {}),
  });
  const openedAt = Date.now();
  const tab: Page = await context.newPage();
  await tab.goto(url, { waitUntil: "networkidle" });
  await tab.waitForFunction(() => (window as unknown as { __radarDemo?: { ready: boolean } }).__radarDemo?.ready === true, null, {
    timeout: 60_000,
  });
  // Engines load on idle; give them real time before the clock starts.
  await tab.waitForTimeout(1500);
  return { context, tab, openedAt };
}

async function filmDemo(opts: {
  slug: string;
  plan: DemoReelPlan;
  base: string;
  outDir: string;
  noAudio: boolean;
  realtime: boolean;
}): Promise<void> {
  const { slug, plan } = opts;
  const name = `${slug}-${plan.pageKey}-demo-${plan.platform}`;
  requireEncoders(opts.noAudio);
  const url = `${opts.base}/studio/radar-guide/${slug}/${plan.pageKey}?render=1${plan.platform === "tt" ? "&platform=tt" : ""}`;
  await requireStudio(url, opts.base);

  const chromium = await loadChromium();
  const browser = await chromium.launch();
  const work = mkdtempSync(join(tmpdir(), "radar-demo-"));
  const video = join(work, "video.mp4");
  try {
    if (opts.realtime) {
      console.log("Capture: real time (Playwright video). Frames can stutter; prefer virtual time when it works.");
      const { context, tab, openedAt } = await openDemoFrame(browser, url, { dir: work });
      const startOffset = (Date.now() - openedAt) / 1000;
      await tab.evaluate(() => (window as unknown as { __radarDemo: { start(): void } }).__radarDemo.start());
      await tab.waitForTimeout(plan.totalMs + 400);
      const misses: string[] = await tab.evaluate(() => (window as unknown as { __radarDemo?: { misses: string[] } }).__radarDemo?.misses ?? []);
      misses.forEach((m) => console.warn(`warning: demo step missed: ${m}`));
      const webm: string = await tab.video().path();
      await context.close();
      await run("ffmpeg", ["-y", "-ss", startOffset.toFixed(2), "-i", webm, "-t", plan.seconds.toFixed(2), "-r", String(FPS), ...ENCODE_ARGS, video]);
    } else {
      console.log("Capture: Chrome virtual time, one frame per 33.33ms.");
      const { context, tab } = await openDemoFrame(browser, url);
      const cdp: CdpSession = await context.newCDPSession(tab);
      await cdp.send("Emulation.setVirtualTimePolicy", { policy: "pause" });
      await tab.evaluate(() => (window as unknown as { __radarDemo: { start(): void } }).__radarDemo.start());
      const hint = "Chrome stopped producing frames under virtual time. Re-run with --realtime.";
      await pipeFrames(video, Math.round(plan.seconds * FPS), name, plan.seconds, async (f) => {
        if (f > 0) await withTimeout(advance(cdp, 1000 / FPS), FRAME_TIMEOUT_MS, hint);
        const shot = await withTimeout<{ data: string }>(
          cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }),
          FRAME_TIMEOUT_MS,
          hint
        );
        return Buffer.from(shot.data, "base64");
      });
      const misses: string[] = await tab.evaluate(() => (window as unknown as { __radarDemo?: { misses: string[] } }).__radarDemo?.misses ?? []);
      misses.forEach((m) => console.warn(`warning: demo step missed: ${m}`));
      await context.close();
    }
    await browser.close();

    const out = join(opts.outDir, `${name}.mp4`);
    await muxAudio(video, plan.cues, work, out, opts.noAudio);
    console.log(`\nWrote ${out}`);
  } finally {
    await browser.close().catch(() => undefined);
    rmSync(work, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    bool: ["cover", "no-audio", "dry-run", "realtime"],
    value: ["page", "format", "platform", "compare", "base", "out", "chapter"],
  });
  if (args.flags.chapter) fail("--chapter is gone: reels map to guide pages now. Use --page <key>.");
  if (args.flags.format === "story") fail("Story reels have their own command: pnpm radar:story <id> (or --all).");
  const slug = assertSlug(args.positional[0], USAGE);
  const page = flagString(args, "page") ?? null;
  const platform = (flagString(args, "platform") ?? "ig") as RadarReelPlatform;
  if (platform !== "ig" && platform !== "tt") fail("--platform must be ig or tt.");
  const compareSlug = flagString(args, "compare") ?? null;
  if (compareSlug) assertSlug(compareSlug, USAGE);
  if (compareSlug && page) fail("Use --page or --compare, not both.");
  const base = (flagString(args, "base") ?? "http://localhost:3010").replace(/\/+$/, "");
  const dryRun = Boolean(args.flags["dry-run"]);
  const noAudio = Boolean(args.flags["no-audio"]);

  const guide = loadGuide(slug);
  const guidePage = page ? guide?.pages.find((p) => p.key === page) ?? null : null;
  if (page && !guide) fail(`"${slug}" has no code guide, so it has no pages. Drop --page for the career reel.`);
  if (page && !guidePage) fail(`The ${slug} guide has no page "${page}". Pages: ${guide!.pages.map((p) => p.key).join(", ")}.`);

  const formatFlag = flagString(args, "format");
  if (formatFlag && formatFlag !== "motion" && formatFlag !== "demo") fail("--format must be motion or demo.");
  const format = formatFlag ?? (guidePage?.reel?.format === "demo" ? "demo" : "motion");

  const outDir = resolve(flagString(args, "out") ?? paths.movies(slug));
  mkdirSync(outDir, { recursive: true });

  if (format === "motion") {
    if (args.flags.realtime) fail("--realtime is for --format demo.");
    await filmMotion({ slug, guide, page, platform, compareSlug, base, outDir, cover: Boolean(args.flags.cover), noAudio, dryRun });
    return;
  }

  if (!guide || !guidePage) fail("--format demo films a guide level: pass --page <key>.");
  if (compareSlug || args.flags.cover) fail("--compare and --cover are for motion reels.");
  const plan = buildDemoReelPlan({ slug, alias: guide.meta.alias, platform, page: guidePage });
  console.log(
    `Demo reel ${slug}/${plan.pageKey} (${platform}): ${plan.seconds.toFixed(1)}s\n` +
      `  hook     0.00s  "${plan.hookTh}"\n` +
      plan.steps.map((s) => `  ${s.action.padEnd(8)} ${((plan.pageStartMs + s.at) / 1000).toFixed(2)}s  ${"target" in s ? s.target : ""}`).join("\n") +
      `\n  end      ${(plan.endStartMs / 1000).toFixed(2)}s  "${plan.end.headline}"`
  );
  const problems = demoReelProblems(plan);
  problems.forEach((p) => console.warn(`warning: ${p}`));
  const planPath = join(outDir, `${slug}-${plan.pageKey}-demo-${platform}.plan.json`);
  writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`Wrote ${planPath}`);
  if (dryRun) {
    console.log("Dry run: no browser, no ffmpeg.");
    return;
  }
  if (!plan.steps.length) fail(`Page "${plan.pageKey}" has no demoScript to film. Add one to a game block first.`);
  await filmDemo({ slug, plan, base, outDir, noAudio, realtime: Boolean(args.flags.realtime) });
}

runMain(main);
