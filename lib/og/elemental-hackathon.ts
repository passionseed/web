import { readFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas, GlobalFonts, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";

import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal, thaiDateLine } from "@/components/hackathon/poster/elemental/facts";

/**
 * The Elemental Hackathon link preview (LINE, Facebook, X): the key art at
 * 1200x630 with the title on the sky and one strip of details at the
 * bottom. The details come from facts.ts, so the preview changes with them.
 *
 * Drawn with @napi-rs/canvas, not next/og: Satori drops Thai tone marks that
 * stack on an upper vowel (see lib/og/elemental-quiz.ts).
 *
 * It redraws the hand-made preview from PR #361 and #366: the photo plate
 * is the key art as it was then (lib/og/elemental/hackathon-plate.jpg, the
 * 1080x1350 plate scaled to 1200 wide, from 251 px down), and the sizes and
 * positions below are measured from that image.
 */

export const ELEMENTAL_OG_SIZE = { width: 1200, height: 630 };

/** The page's line (TeaserTheater), in its two halves: plain, then italic gold. */
export const ELEMENTAL_OG_LINE = ["หาทางออกให้ธรรมชาติ", "ก่อนมันจะให้เราออก"] as const;

/** The strip under the line: dates, where, prize, the group price. */
export function elementalOgDetails(): string[] {
  return [
    thaiDateLine(),
    ELEMENTAL.formatShortTh,
    `รางวัลรวม ${prizeTotal()} บาท`,
    `มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht}`,
  ];
}

/** What the image says, for its alt text. */
export function elementalOgAlt(): string {
  return `${ELEMENTAL.edition} Hackathon: ${ELEMENTAL_OG_LINE.join(" ")}, ${elementalOgDetails().join(", ")}`;
}

const TITLE = "Trirong ExtraLight (Elemental OG)";
const TITLE_ITALIC = "Trirong Light Italic (Elemental OG)";
const SANS = "IBM Plex Sans Thai (Elemental OG)";
const WORDMARK = "Libre Franklin (Elemental OG)";
const MONO = "Space Mono (Elemental OG)";

const FONTS: readonly (readonly [string, string])[] = [
  ["Trirong-ExtraLight.ttf", TITLE],
  ["Trirong-LightItalic.ttf", TITLE_ITALIC],
  ["IBMPlexSansThai-Regular.ttf", SANS],
  ["LibreFranklin-Regular.ttf", WORDMARK],
  ["SpaceMono-Regular.ttf", MONO],
];

let fontsReady = false;
function ensureFonts(): void {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), "lib/og/fonts");
  for (const [file, family] of FONTS) {
    if (!GlobalFonts.registerFromPath(path.join(dir, file), family)) throw new Error(`font_register_failed:${file}`);
  }
  fontsReady = true;
}

/**
 * The photo plate and both logos. Each path is written out in full: the
 * bundler traces literal paths, and a path built from a variable makes it
 * trace (and deploy) the whole project.
 */
async function loadArt(): Promise<{ plate: Image; seriesLogo: Image; seedLogo: Image }> {
  const [plate, seriesLogo, seedLogo] = await Promise.all([
    readFile(path.join(process.cwd(), "lib/og/elemental/hackathon-plate.jpg")),
    readFile(path.join(process.cwd(), "public/hackathon/HackLogo.png")),
    readFile(path.join(process.cwd(), "public/passion-seed-logo.png")),
  ]);
  return { plate: await loadImage(plate), seriesLogo: await loadImage(seriesLogo), seedLogo: await loadImage(seedLogo) };
}

/** The strip's near-black, under the details. */
const STRIP = "12,12,10";
/** Left edge of the type. */
const X = 62;
/** Browsers fake an italic for fonts without one by slanting a quarter. */
const FAKE_ITALIC = -0.25;

/**
 * Fills text with a hairline stroke of the same colour on it. The original
 * was drawn on a Mac, whose font smoothing thickens thin type; without
 * this, Trirong ExtraLight reads paler than it did.
 */
function fillText(ctx: SKRSContext2D, text: string, x: number, y: number, weight: number) {
  ctx.fillText(text, x, y);
  if (weight <= 0) return;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = weight;
  ctx.lineJoin = "round";
  ctx.strokeText(text, x, y);
}

/** The Next Decade × PassionSeed, top left, in ink on the sky. */
function drawLockup(ctx: SKRSContext2D, seriesLogo: Image, seedLogo: Image) {
  // The Next Decade in ink (the posters' brightness(0) at 0.85, a little darker for the Mac smoothing).
  const logo = createCanvas(86, 35);
  const lctx = logo.getContext("2d");
  lctx.imageSmoothingQuality = "high";
  lctx.drawImage(seriesLogo, 0, 0, 86, 35);
  lctx.globalCompositeOperation = "source-in";
  lctx.fillStyle = EL.ink;
  lctx.fillRect(0, 0, 86, 35);
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.drawImage(logo, 62, 48);
  ctx.restore();

  ctx.font = `15px "${MONO}"`;
  ctx.fillStyle = EL.inkSoft;
  ctx.textAlign = "center";
  ctx.fillText("×", 170, 71);
  ctx.textAlign = "left";

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(seedLogo, 190, 48, 35, 35);
  ctx.font = `23.9px "${WORDMARK}"`;
  ctx.fillStyle = EL.ink;
  fillText(ctx, "PassionSeed", 233, 74, 0.3);
}

/** "Elemental" upright, "Hackathon" in italic, on the sky. */
function drawTitle(ctx: SKRSContext2D) {
  ctx.fillStyle = EL.ink;
  ctx.font = `116.5px "${TITLE}"`;
  fillText(ctx, "Elemental", 62, 190, 0.7);
  ctx.font = `115px "${TITLE_ITALIC}"`;
  fillText(ctx, "Hackathon", 69, 304, 0.5);
}

/** The scene darkens into the strip, so the details read over the fire. */
function drawStripShade(ctx: SKRSContext2D) {
  const { width, height } = ELEMENTAL_OG_SIZE;
  const shade = ctx.createLinearGradient(0, 330, 0, height);
  shade.addColorStop(0, `rgba(${STRIP},0)`);
  shade.addColorStop((500 - 330) / (height - 330), `rgba(${STRIP},0.925)`);
  shade.addColorStop(1, `rgba(${STRIP},1)`);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 330, width, height - 330);
}

/** The line: the first half plain, the second in italic gold. */
function drawLine(ctx: SKRSContext2D) {
  const [plain, hot] = ELEMENTAL_OG_LINE;
  const baseline = 521;
  ctx.font = `36px "${SANS}"`;
  ctx.fillStyle = "#fbf9f4";
  fillText(ctx, plain, X, baseline, 0.3);
  const x = X + ctx.measureText(plain).width + 8;
  ctx.save();
  ctx.translate(x, baseline);
  ctx.transform(1, 0, FAKE_ITALIC, 1, 0, 0);
  ctx.fillStyle = EL.flameCore;
  fillText(ctx, hot, 0, 0, 0.3);
  ctx.restore();
}

/** The details, one line, split by soft dots. Shrinks to fit if a fact grows. */
function drawDetails(ctx: SKRSContext2D, details: readonly string[]) {
  const baseline = 584;
  const gap = 12;
  const maxWidth = ELEMENTAL_OG_SIZE.width - X * 2;
  let size = 22;
  const widthAt = () => {
    ctx.font = `${size}px "${SANS}"`;
    const dot = ctx.measureText("·").width;
    return details.reduce((sum, d) => sum + ctx.measureText(d).width, 0) + (details.length - 1) * (gap * 2 + dot);
  };
  while (widthAt() > maxWidth && size > 16) size -= 0.5;
  let x = X;
  details.forEach((detail, i) => {
    if (i > 0) {
      x += gap;
      ctx.fillStyle = `rgba(243,239,230,0.45)`;
      ctx.fillText("·", x, baseline);
      x += ctx.measureText("·").width + gap;
    }
    // Cream at 95% on the strip, as a solid colour so the hairline doesn't double up.
    ctx.fillStyle = "#e9e5dd";
    fillText(ctx, detail, x, baseline, 0.25);
    x += ctx.measureText(detail).width;
  });
}

/** The preview as a JPEG (a photo: a PNG would be five times the size). */
export async function renderElementalOg(details: readonly string[] = elementalOgDetails()): Promise<Buffer> {
  ensureFonts();
  const { plate, seriesLogo, seedLogo } = await loadArt();
  const { width, height } = ELEMENTAL_OG_SIZE;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";
  ctx.drawImage(plate, 0, 0, width, height);
  drawLockup(ctx, seriesLogo, seedLogo);
  drawTitle(ctx);
  drawStripShade(ctx);
  drawLine(ctx);
  drawDetails(ctx, details);
  return canvas.encode("jpeg", 88);
}

/**
 * The body of an `opengraph-image.ts` handler. Each Elemental segment whose
 * page sets its own `openGraph` needs one: a page's `openGraph` replaces the
 * image it would inherit from a parent segment.
 */
export async function elementalOgResponse(): Promise<Response> {
  const jpeg = await renderElementalOg();
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg" } });
}
