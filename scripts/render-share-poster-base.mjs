#!/usr/bin/env node
/**
 * Exports the Elemental key poster (blue sky) with an empty QR block, for the
 * share page's poster maker (app/api/hackathon/elemental/share/poster/[code]).
 * The maker draws each sharer's own QR code and code into that block, so a
 * change to the poster (dates, wordmark) is one re-export, not a new batch.
 *
 *   node scripts/render-share-poster-base.mjs [--base http://localhost:3010]
 *
 * Writes lib/hackathon/elemental/share/poster-base.jpg (2x, 2160x2700) and
 * poster-base.json: where the QR code goes, in poster pixels (1080 wide).
 *
 * It also writes the Instagram Story version, poster-base.story.jpg (2x,
 * 2160x3840) and poster-base.story.json: the same poster, moved down into a
 * 1080x1920 frame. Above it the sky goes on (the plate's top, mirrored and
 * softened, fading into its own blue), so the logos clear Instagram's top bar; below it the
 * poster's dark foot goes on, with a dashed box where the student puts the
 * link sticker. The poster maker writes "[แปะลิงก์ตรงนี้]" in it, and draws the
 * QR code and code as on the 4:5 poster. (The names start with poster-base so
 * next.config's file tracing ships them with the poster route.)
 *
 * --out <dir> writes somewhere else (to try a change without touching the
 * committed files). Playwright lookup as in render-poster.mjs.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib/hackathon/elemental/share");
const ID = "elemental-key-blue";
const SCALE = 2;
const argv = process.argv.slice(2);
const base = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : "http://localhost:3010";
const outDir = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : OUT;
const PLATE = join(ROOT, "public/hackathon/poster/elemental/plate-key-blue.png");

/**
 * The Story frame, in poster pixels. TOP: how far the poster moves down, so
 * its logos sit below Instagram's top bar (about 14% of the height). The
 * sticker box sits under the poster's foot, above the reply bar.
 */
const STORY = { width: 1080, height: 1920, top: 160 };
const STICKER = { width: 760, height: 120, gap: 28 };
/** The poster's dark foot carried on: #0f0f0d at 92% over the poster's #2a2b26 (ElementalKeyPoster's A4 foot). */
const FOOT = { r: 17, g: 17, b: 15 };

/** Monochrome film grain, drawn at 1x and doubled like the plate's, as a mid-grey layer for an overlay blend. */
async function grain(width, height, sigma) {
  const small = await sharp({ create: { width: Math.ceil(width / SCALE), height: Math.ceil(height / SCALE), channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma } } })
    .greyscale()
    .png()
    .toBuffer();
  // Smooth, not nearest: blocky noise makes square dark-light runs that QR readers take for finder patterns.
  return sharp(small).resize(width, height, { kernel: "cubic" }).extract({ left: 0, top: 0, width, height }).png().toBuffer();
}

async function writeStory(posterJpg, meta) {
  const S = SCALE;
  const W = STORY.width * S;
  const top = STORY.top * S;
  const posterH = Math.round(meta.height * S);
  const bottomH = STORY.height * S - top - posterH;

  // The sky above: the plate's top rows, mirrored so the seam with the poster is continuous, then softened. Only a thin band by the seam stays sharp:
  // mirrored pixel blocks make symmetric dark-light-dark runs that QR readers take for finder patterns (jsQR then misses the real code at some sizes),
  // and blurred they read as the smoke thinning into haze. Then it fades into the sky's own blue.
  const plate = await sharp(PLATE).resize(W, Math.round(meta.height * S)).png().toBuffer();
  const mirror = await sharp(plate).extract({ left: 0, top: 0, width: W, height: top }).flip().png().toBuffer();
  const soft = await sharp(mirror).blur(9 * S).png().toBuffer();
  const band = 14 * S; // the sharp band by the seam, in output pixels
  const mask = Buffer.alloc(W * top);
  for (let y = 0; y < top; y++) mask.fill(Math.round(255 * Math.min(1, Math.max(0, (y - (top - band)) / band + 0.5))), y * W, (y + 1) * W);
  const sharpBand = await sharp(mirror).removeAlpha().joinChannel(mask, { raw: { width: W, height: top, channels: 1 } }).png().toBuffer();
  const above = await sharp(soft).composite([{ input: sharpBand, left: 0, top: 0 }]).png().toBuffer();
  const skyStats = await sharp(plate).extract({ left: 0, top: 0, width: Math.round(W * 0.5), height: 40 * S }).stats();
  const [r, g, b] = skyStats.channels.slice(0, 3).map((c) => Math.round(c.mean));
  const fade = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${top}"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(${r},${g},${b})" stop-opacity="0.94"/><stop offset="1" stop-color="rgb(${r},${g},${b})" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`,
  );

  // Below: the poster's last rows (under its tagline, no type there), mirrored and fading out, so the foot runs on without a line.
  const tail = 50 * S;
  const tailMask = Buffer.alloc(W * tail);
  for (let y = 0; y < tail; y++) tailMask.fill(Math.round(255 * (1 - y / tail)), y * W, (y + 1) * W);
  const foot = await sharp(posterJpg)
    .extract({ left: 0, top: posterH - tail, width: W, height: tail })
    .flip()
    .removeAlpha()
    .joinChannel(tailMask, { raw: { width: W, height: tail, channels: 1 } })
    .png()
    .toBuffer();

  // The box for the link sticker: a quiet dashed line in cream.
  const sticker = {
    x: Math.round((STORY.width - STICKER.width) / 2),
    y: STORY.top + meta.height + STICKER.gap,
    width: STICKER.width,
    height: STICKER.height,
  };
  const sw = 2 * S;
  const box = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sticker.width * S}" height="${sticker.height * S}"><rect x="${sw / 2}" y="${sw / 2}" width="${sticker.width * S - sw}" height="${sticker.height * S - sw}" fill="none" stroke="#f3efe6" stroke-opacity="0.5" stroke-width="${sw}" stroke-dasharray="${12 * S} ${9 * S}"/></svg>`,
  );

  const jpg = await sharp({ create: { width: W, height: STORY.height * S, channels: 3, background: FOOT } })
    .composite([
      { input: above, left: 0, top: 0 },
      { input: fade, left: 0, top: 0 },
      { input: await grain(W, top, 10), left: 0, top: 0, blend: "overlay" },
      { input: posterJpg, left: 0, top },
      { input: await grain(W, bottomH, 10), left: 0, top: top + posterH, blend: "overlay" },
      { input: foot, left: 0, top: top + posterH },
      { input: box, left: sticker.x * S, top: sticker.y * S },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  writeFileSync(join(outDir, "poster-base.story.jpg"), jpg);
  const story = {
    version: createHash("sha1").update(jpg).digest("hex").slice(0, 8),
    scale: S,
    top: STORY.top,
    qr: { ...meta.qr, y: meta.qr.y + STORY.top },
    block: { ...meta.block, y: meta.block.y + STORY.top },
    sticker,
    width: STORY.width,
    height: STORY.height,
  };
  writeFileSync(join(outDir, "poster-base.story.json"), JSON.stringify(story, null, 2) + "\n");
  console.log("Wrote", join(outDir, "poster-base.story.jpg"), story);
}

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
  console.error("Playwright not found. Set SHIFT_PLAYWRIGHT_MODULE to a playwright/index.mjs path.");
  process.exit(1);
}

const chromium = await loadChromium();
const browser = await chromium.launch(process.env.SHIFT_CHROMIUM_PATH ? { executablePath: process.env.SHIFT_CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: SCALE });
  await page.routeWebSocket(/hmr|turbopack/, () => {});
  await page.goto(`${base}/hackathon/poster/elemental?render=1`, { waitUntil: "load", timeout: 180000 });
  await page.waitForSelector(`#${ID}`, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (const img of document.images) {
      img.loading = "eager";
      try {
        await img.decode();
      } catch {
        // shows up in the review
      }
    }
  });

  // CSII hasn't approved its logo on the share posters yet (Big, 2026-11-28): drop the "× CSII" end of the lockup, here only.
  // The public poster keeps it. Remove this line once CSII says yes.
  await page.evaluate((id) => {
    for (const el of document.querySelectorAll(`#${id} [data-poster-partner="csii"]`)) el.style.display = "none";
  }, ID);

  // The plain QR code sits in a cream block; measure it, then hide the code and keep the block.
  const box = await page.evaluate((id) => {
    const poster = document.getElementById(id);
    const qr = poster?.querySelector('svg[aria-label="QR code: sign up"]');
    if (!poster || !qr) return null;
    const p = poster.getBoundingClientRect();
    const q = qr.getBoundingClientRect();
    const block = qr.parentElement.getBoundingClientRect();
    qr.style.visibility = "hidden";
    return {
      qr: { x: q.left - p.left, y: q.top - p.top, size: q.width },
      block: { x: block.left - p.left, y: block.top - p.top, width: block.width, height: block.height },
      width: p.width,
      height: p.height,
    };
  }, ID);
  if (!box) throw new Error(`No plain QR code found in #${ID}`);

  const shot = await page.locator(`#${ID}`).screenshot({ animations: "disabled" });
  mkdirSync(outDir, { recursive: true });
  const jpg = await sharp(shot).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  writeFileSync(join(outDir, "poster-base.jpg"), jpg);
  const meta = {
    // Changes whenever the image does, so poster links (and caches) move on.
    version: createHash("sha1").update(jpg).digest("hex").slice(0, 8),
    scale: SCALE,
    ...box,
  };
  writeFileSync(join(outDir, "poster-base.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log("Wrote", join(outDir, "poster-base.jpg"), meta);
  // From the lossless shot, not the JPEG, so the Story isn't compressed twice.
  await writeStory(shot, meta);
} finally {
  await browser.close();
}
