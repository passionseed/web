#!/usr/bin/env node
/**
 * Marketing Studio exporter. Screenshots every slide of every studio set at
 * its real size, checks the size, writes the caption next to the PNGs,
 * bundles LinkedIn sets into a PDF document, and makes a contact sheet per
 * set for quick review.
 *
 *   node scripts/render-marketing.mjs [--base http://localhost:3010]
 *        [--out output/marketing/YYYY-MM-DD] [--set slug ...] [--poster]
 *
 * --set limits the run to the named sets (repeatable). --poster also exports
 * the SHIFT[2] new-date posters from /shift/poster/2/moved.
 *
 * Needs the render server (scripts/studio-server.sh, :3010). Playwright is resolved from the project, then
 * SHIFT_PLAYWRIGHT_MODULE, then the gstack skill's copy, so no dependency
 * has to be added to the app.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

function parseArgs(argv) {
  const args = { base: "http://localhost:3010", out: null, sets: [], poster: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") args.base = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--set") args.sets.push(argv[++i]);
    else if (a === "--poster") args.poster = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  return args;
}

const bangkokToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

async function loadChromium() {
  const candidates = [
    "playwright",
    process.env.SHIFT_PLAYWRIGHT_MODULE,
    join(homedir(), ".claude/skills/gstack/node_modules/playwright/index.mjs"),
  ].filter(Boolean);
  for (const spec of candidates) {
    try {
      const mod = await import(spec.startsWith("/") ? pathToFileURL(spec).href : spec);
      return mod.chromium ?? mod.default?.chromium;
    } catch {
      // try the next one
    }
  }
  console.error("❌ Playwright not found. Set SHIFT_PLAYWRIGHT_MODULE to a playwright/index.mjs path.");
  process.exit(1);
}

/** Wait for fonts and every image, so no slide is captured half-loaded. */
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (const img of document.images) {
      img.loading = "eager";
      try {
        await img.decode();
      } catch {
        // a broken image shows up in the review, not as a crash here
      }
    }
  });
}

async function shoot(page, id, file, expected) {
  const shot = await page.locator(`#${id}`).screenshot({ animations: "disabled" });
  await sharp(shot).png({ compressionLevel: 9 }).toFile(file);
  const { width, height } = await sharp(file).metadata();
  if (expected && (width !== expected.width || height !== expected.height)) {
    throw new Error(`${id}: ${width}x${height}, expected ${expected.width}x${expected.height}`);
  }
  console.log(`✅ ${file}`);
}

/** All slides of a set side by side at quarter size, for one-glance review. */
async function contactSheet(files, size, out) {
  const w = Math.round(size.width / 4);
  const h = Math.round(size.height / 4);
  const gap = 12;
  const tiles = await Promise.all(files.map((f) => sharp(f).resize(w, h).toBuffer()));
  await sharp({
    create: { width: tiles.length * (w + gap) + gap, height: h + gap * 2, channels: 3, background: "#111111" },
  })
    .composite(tiles.map((input, i) => ({ input, left: gap + i * (w + gap), top: gap })))
    .png()
    .toFile(out);
}

/** LinkedIn takes carousels as a PDF document, one slide per page. */
async function linkedinPdf(browser, files, size, out) {
  const page = await browser.newPage();
  const imgs = files
    .map((f) => `<img src="data:image/png;base64,${readFileSync(f).toString("base64")}">`)
    .join("");
  await page.setContent(
    `<style>@page{size:${size.width}px ${size.height}px;margin:0}body{margin:0}img{display:block;width:${size.width}px;height:${size.height}px;break-after:page}</style>${imgs}`,
  );
  await page.pdf({ path: out, width: `${size.width}px`, height: `${size.height}px`, printBackground: true });
  await page.close();
  console.log(`📄 ${out}`);
}

async function exportSet(browser, base, set, outDir) {
  const dir = join(outDir, set.slug);
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 2200 } });
  await page.goto(`${base}/studio/${set.slug}`, { waitUntil: "load", timeout: 180000 });
  await page.waitForSelector(`#studio-${set.slug}-1`, { timeout: 60000 });
  await settle(page);
  const files = [];
  for (let n = 1; n <= set.slides; n++) {
    // Name files by their place in the posted carousel, after any hand-made slides.
    const file = join(dir, `${String(n + (set.pageOffset ?? 0)).padStart(2, "0")}.png`);
    await shoot(page, `studio-${set.slug}-${n}`, file, set.size);
    files.push(file);
  }
  await page.close();
  await contactSheet(files, set.size, join(dir, "contact.png"));
  const tags = set.hashtags.length ? `\n\n${set.hashtags.map((h) => `#${h}`).join(" ")}` : "";
  writeFileSync(join(dir, "caption.txt"), `${set.caption}${tags}\n`);
  if (set.channel === "linkedin") await linkedinPdf(browser, files, set.size, join(dir, `${set.slug}.pdf`));
}

async function exportPosters(browser, base, outDir) {
  const dir = join(outDir, "shift2-new-date");
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 3600, height: 2200 } });
  await page.goto(`${base}/shift/poster/2/moved`, { waitUntil: "load", timeout: 180000 });
  await page.waitForSelector("#shift-moved-feed", { timeout: 60000 });
  await settle(page);
  await shoot(page, "shift-moved-feed", join(dir, "shift2-new-date-feed.png"), { width: 1080, height: 1350 });
  await shoot(page, "shift-moved-story", join(dir, "shift2-new-date-story.png"), { width: 1080, height: 1920 });
  await shoot(page, "shift2-poster-1", join(dir, "shift2-cover-new-date.png"), { width: 1080, height: 1350 });
  await page.close();
  // The feed poster is slide 1 of the shift2-new-date carousel.
  copyFileSync(join(dir, "shift2-new-date-feed.png"), join(dir, "01.png"));
}

function writeIndex(outDir, manifest, sets) {
  const lines = [`# Marketing Studio export, ${bangkokToday()}`, "", "Drafts only. Nothing here was posted.", ""];
  for (const set of sets) {
    lines.push(`## ${set.title}`, "", `- ${set.channel} · ${set.format} · ${set.audience} · ${set.slides} slides`);
    lines.push(`- Angle: ${set.angle}`, `- Files: [${set.slug}/](${set.slug}/)`, `- Sources: ${set.sources.join("; ")}`, "");
  }
  writeFileSync(join(outDir, "README.md"), lines.join("\n"));
  const posts = manifest.posts.flatMap((p) => [
    `## ${p.title}`,
    "",
    `_${p.voice} · ${p.created}${p.attach ? ` · attach ${p.attach}/` : ""}_`,
    "",
    p.body,
    "",
    `Sources: ${p.sources.join("; ")}`,
    "",
    "---",
    "",
  ]);
  writeFileSync(join(outDir, "linkedin-posts.md"), [`# LinkedIn posts, ${bangkokToday()}`, "", ...posts].join("\n"));
}

const args = parseArgs(process.argv.slice(2));
const outDir = resolve(args.out ?? join("output", "marketing", bangkokToday()));
mkdirSync(outDir, { recursive: true });

const res = await fetch(`${args.base}/studio/manifest`);
if (!res.ok) {
  console.error(`❌ ${args.base}/studio/manifest returned ${res.status}. Start it: scripts/studio-server.sh`);
  process.exit(1);
}
const manifest = await res.json();
const sets = args.sets.length ? manifest.sets.filter((s) => args.sets.includes(s.slug)) : manifest.sets;
const missing = args.sets.filter((slug) => !manifest.sets.some((s) => s.slug === slug));
if (missing.length) console.warn(`⚠️  Unknown sets: ${missing.join(", ")}`);

const chromium = await loadChromium();
const browser = await chromium.launch(
  process.env.SHIFT_CHROMIUM_PATH ? { executablePath: process.env.SHIFT_CHROMIUM_PATH } : {},
);
/** One retry per set: a busy dev server can stall a cold compile. */
async function withRetry(label, fn) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`⚠️  ${label} attempt ${attempt} failed: ${err.message.split("\n")[0]}`);
    }
  }
  failed.push(label);
}

const failed = [];
try {
  for (const set of sets) await withRetry(set.slug, () => exportSet(browser, args.base, set, outDir));
  if (args.poster) await withRetry("posters", () => exportPosters(browser, args.base, outDir));
  if (!args.sets.length) writeIndex(outDir, manifest, sets);
} finally {
  await browser.close();
}
console.log(`\n${sets.length} sets -> ${outDir}${existsSync(join(outDir, "README.md")) ? " (README.md)" : ""}`);
if (failed.length) {
  console.error(`❌ Failed: ${failed.join(", ")}. Re-run with --set for each.`);
  process.exit(1);
}
