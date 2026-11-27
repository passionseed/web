import path from "node:path";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";

import type { ElementKey } from "@/components/hackathon/elemental/media";
import { EL } from "@/components/hackathon/poster/elemental/brand";
import { QUIZ_PALETTE, QUIZ_RESULTS } from "@/lib/hackathon/elemental/quiz";
import { CREST_COLS, FX_OFFSET, ICON_SIZE, QUIZ_CRESTS, fxFrame, fxRuns, iconPixels, pixelRuns } from "@/lib/hackathon/elemental/quiz-pixels";
import { wrapText } from "@/lib/shift-round/certificate/render";

/**
 * The Elemental quiz result cards: a 9:16 card to post in an IG Story and a
 * 1200x630 link preview. Drawn with @napi-rs/canvas, not next/og: Satori drops
 * Thai tone marks that stack on an upper vowel (ที่ became ที), and Skia shapes
 * them correctly (see lib/shift-round/certificate/render.ts).
 *
 * Brand rules: components/hackathon/poster/elemental/brand.ts (Trirong for
 * Thai, Space Mono for small [tags], only the pixels are loud).
 */

const STORY_SIZE = { width: 1080, height: 1920 };
export const QUIZ_OG_SIZE = { width: 1200, height: 630 };
export const QUIZ_SHORT_URL = "passionseed.org/hackathon/elemental/quiz";

const LIGHT = "QZ Trirong Light";
const REGULAR = "QZ Trirong";
const MONO = "QZ Mono";

let fontsReady = false;
function ensureFonts(): void {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), "lib/og/fonts");
  for (const [file, family] of [
    ["Trirong-ExtraLight.ttf", LIGHT],
    ["Trirong-Regular.ttf", REGULAR],
    ["SpaceMono-Regular.ttf", MONO],
  ] as const) {
    if (!GlobalFonts.registerFromPath(path.join(dir, file), family)) throw new Error(`font_register_failed:${file}`);
  }
  fontsReady = true;
}

type Ctx = SKRSContext2D;

/** The crest tiled across the top edge, `cell` px per art pixel, drawn as runs so no seams show between pixels. */
function drawCrest(ctx: Ctx, key: ElementKey, width: number, cell: number) {
  const runs = pixelRuns(QUIZ_CRESTS[key]);
  for (let x = 0; x < width; x += CREST_COLS * cell) {
    for (const [rx, ry, length, color] of runs) {
      ctx.fillStyle = color;
      ctx.fillRect(x + rx * cell, ry * cell, length * cell, cell);
    }
  }
}

/**
 * One element's 9x9 icon from slide 2 with its box at (x, y), `cell` px per
 * pixel, and with `fx` the still of its effect round it. Aether glows: a
 * violet blur behind lilac and violet cells at uneven strengths. Returns the
 * edges of everything drawn, effect included.
 */
function drawIcon(ctx: Ctx, key: ElementKey, x: number, y: number, cell: number, fx: boolean) {
  const pixels = fx ? fxFrame(key, 0) : iconPixels(key);
  const ox = x - FX_OFFSET * cell;
  const oy = y - FX_OFFSET * cell;
  ctx.save();
  if (key === "aether") {
    ctx.shadowColor = EL.aetherViolet;
    ctx.shadowBlur = cell * 2.5;
  }
  for (const [px, py, length, color, alpha] of fxRuns(pixels)) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(ox + px * cell, oy + py * cell, length * cell, cell);
  }
  ctx.restore();
  const xs = pixels.map(([px]) => px);
  const ys = pixels.map(([, py]) => py);
  return { left: ox + Math.min(...xs) * cell, bottom: oy + (Math.max(...ys) + 1) * cell };
}

/** A box with its corners notched one pixel step in, like a pixel window: the space for an IG mention sticker. */
function pixelBox(ctx: Ctx, x: number, y: number, w: number, h: number, step: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x + step, y, w - step * 2, step);
  ctx.fillRect(x + step, y + h - step, w - step * 2, step);
  ctx.fillRect(x, y + step, step, h - step * 2);
  ctx.fillRect(x + w - step, y + step, step, h - step * 2);
}

/** Draws text lines with the first baseline at `y`; returns the last baseline. */
function lines(ctx: Ctx, text: string, font: string, color: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3): number {
  ctx.font = font;
  ctx.fillStyle = color;
  const out = wrapText(ctx, text, maxWidth, maxLines);
  // A closing quote never sits alone on a line: it hangs off the end of the line before.
  while (out.length > 1 && /^[”"’.,!?]+$/.test(out[out.length - 1])) out[out.length - 2] += out.pop();
  out.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + (out.length - 1) * lineHeight;
}

/** The one-syllable names go huge; "ธาตุที่มองไม่เห็น" has to fit one line. */
function nameFont(ctx: Ctx, th: string, max: number, maxWidth: number): number {
  let size = max;
  ctx.font = `${size}px "${LIGHT}"`;
  while (ctx.measureText(th).width > maxWidth && size > 40) {
    size -= 4;
    ctx.font = `${size}px "${LIGHT}"`;
  }
  return size;
}

/** Draws the big name with the top of its tallest mark at `top`; returns its baseline. */
function drawName(ctx: Ctx, th: string, x: number, top: number, size: number): number {
  const baseline = top + ctx.measureText(th).actualBoundingBoxAscent;
  ctx.fillText(th, x - size * 0.03, baseline);
  return baseline;
}


export function renderQuizStory(key: ElementKey): Buffer {
  ensureFonts();
  const { width: W, height: H } = STORY_SIZE;
  const r = QUIZ_RESULTS[key];
  const p = QUIZ_PALETTE[key];
  const need = QUIZ_RESULTS[r.needs];
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  // IG covers about the top 250 px and the bottom 340 px with its own buttons:
  // the crest can sit under them, the words can't.
  drawCrest(ctx, key, W, 36);
  const x = 80;
  const right = W - x;
  const maxW = right - x;
  // The icon, 26 px a pixel, on the right margin with its effect caught mid-air:
  // the first thing a friend sees.
  const cell = 26;
  const icon = drawIcon(ctx, key, right - ICON_SIZE * cell, 360, cell, true);

  ctx.font = `30px "${MONO}"`;
  ctx.fillStyle = p.soft;
  ctx.fillText(`[ELEMENTAL QUIZ] / ${r.en.toUpperCase()}`, x, 420);
  ctx.font = `60px "${REGULAR}"`;
  ctx.fillStyle = p.ink;
  ctx.fillText("ฉันคือ", x, 520);

  // The one-syllable names sit beside the icon; a name too wide for that
  // ("ธาตุที่มองไม่เห็น") drops under the icon and its effect.
  const size = nameFont(ctx, r.th, 340, maxW);
  const top = ctx.measureText(r.th).width > icon.left - 48 - x ? Math.max(570, icon.bottom + 40) : 570;
  ctx.fillStyle = p.ink;
  let y = drawName(ctx, r.th, x, top, size);
  y = Math.max(y, icon.bottom);

  y += 120;
  // Long roasts drop a size so they wrap into two even lines, not one word on its own.
  const roastSize = [...r.roastTh].length > 24 ? 54 : 64;
  y = lines(ctx, `“${r.roastTh}”`, `${roastSize}px "${REGULAR}"`, p.ink, x, y, maxW, roastSize * 1.45);
  y += 74;
  y = lines(ctx, r.roleTh, `40px "${REGULAR}"`, p.soft, x, y, maxW, 58, 2);

  // The tag box: room to drop an IG mention sticker for the friend this element needs. It sits
  // at the same height on all five cards, so a row of them in a feed reads as one set.
  const boxTop = Math.max(y + 80, 1230);
  const boxH = 300;
  pixelBox(ctx, x, boxTop, maxW, boxH, 6, p.accent);
  ctx.font = `56px "${REGULAR}"`;
  ctx.fillStyle = p.ink;
  ctx.fillText(`${r.th}ต้องการ${need.th}`, x + 48, boxTop + 100);
  ctx.font = `40px "${REGULAR}"`;
  ctx.fillStyle = p.soft;
  ctx.fillText(`แท็ก${need.th}ของคุณตรงนี้`, x + 48, boxTop + 172);
  drawIcon(ctx, r.needs, right - 48 - ICON_SIZE * 12, boxTop + 48, 12, false);

  const footY = boxTop + boxH + 76;
  ctx.font = `34px "${REGULAR}"`;
  ctx.fillStyle = p.ink;
  ctx.fillText("คุณคือธาตุอะไร?", x, footY);
  ctx.font = `28px "${MONO}"`;
  ctx.fillStyle = p.soft;
  ctx.fillText(QUIZ_SHORT_URL, x, footY + 48);

  return canvas.toBuffer("image/png");
}

export function renderQuizOg(key: ElementKey): Buffer {
  ensureFonts();
  const { width: W, height: H } = QUIZ_OG_SIZE;
  const r = QUIZ_RESULTS[key];
  const p = QUIZ_PALETTE[key];
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  drawCrest(ctx, key, W, 16);

  const x = 64;
  const right = W - x;
  const cell = 26;
  const iconX = right - ICON_SIZE * cell;
  drawIcon(ctx, key, iconX, 210, cell, true);
  // The text column ends a fixed gap before the icon itself; the effect may drift into that gap.
  const textW = iconX - 56 - x;

  ctx.font = `24px "${MONO}"`;
  ctx.fillStyle = p.soft;
  ctx.fillText("[ELEMENTAL QUIZ]", x, 212);
  ctx.font = `26px "${REGULAR}"`;
  ctx.fillText("คุณคือธาตุอะไร?", x + 270, 212);

  const size = nameFont(ctx, r.th, 200, textW);
  ctx.fillStyle = p.ink;
  const baseline = drawName(ctx, r.th, x, 244, size);
  lines(ctx, `“${r.roastTh}”`, `40px "${REGULAR}"`, p.ink, x, baseline + 80, textW, 54, 2);

  ctx.font = `24px "${REGULAR}"`;
  ctx.fillStyle = p.soft;
  ctx.fillText("8 ข้อ 1 นาที", x, H - 44);
  ctx.font = `22px "${MONO}"`;
  ctx.textAlign = "right";
  ctx.fillText(QUIZ_SHORT_URL, right, H - 44);

  return canvas.toBuffer("image/png");
}
