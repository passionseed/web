import path from "node:path";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";

import type { ElementKey } from "@/components/hackathon/elemental/media";
import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENT_ICON_COLOR, iconCells } from "@/components/hackathon/poster/elemental/element-icons";
import { QUIZ_PALETTE, QUIZ_RESULTS, pixelBandCells } from "@/lib/hackathon/elemental/quiz";
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

function drawPixels(ctx: Ctx, key: ElementKey, width: number, rows: number, cell: number) {
  for (const [c, r, color] of pixelBandCells(key, Math.ceil(width / cell), rows)) {
    ctx.fillStyle = color;
    ctx.fillRect(c * cell, r * cell, cell, cell);
  }
}

/**
 * One element's 9x9 icon from slide 2 at (x, y), `cell` px per pixel. Aether
 * gets its glow: a violet blur behind lilac and violet cells at uneven strengths.
 */
function drawIcon(ctx: Ctx, key: ElementKey, x: number, y: number, cell: number) {
  const cells = iconCells(key);
  ctx.save();
  if (key === "aether") {
    ctx.shadowColor = EL.aetherViolet;
    ctx.shadowBlur = cell * 2.5;
    cells.forEach(([cx, cy], i) => {
      ctx.globalAlpha = [1, 0.55, 0.8, 0.4][i % 4];
      ctx.fillStyle = i % 3 === 0 ? EL.aetherLilac : EL.aetherViolet;
      ctx.fillRect(x + cx * cell, y + cy * cell, cell, cell);
    });
  } else {
    ctx.fillStyle = ELEMENT_ICON_COLOR[key];
    for (const [cx, cy] of cells) ctx.fillRect(x + cx * cell, y + cy * cell, cell, cell);
  }
  ctx.restore();
}

/** Draws text lines with the first baseline at `y`; returns the last baseline. */
function lines(ctx: Ctx, text: string, font: string, color: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3): number {
  ctx.font = font;
  ctx.fillStyle = color;
  const out = wrapText(ctx, text, maxWidth, maxLines);
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
  drawPixels(ctx, key, W, 9, 40);

  // IG covers about the top 250 px and the bottom 340 px with its own buttons.
  const x = 80;
  const maxW = W - x * 2;
  let y = 440;
  ctx.font = `30px "${MONO}"`;
  ctx.fillStyle = p.soft;
  ctx.fillText(`[ELEMENTAL QUIZ] / ${r.en.toUpperCase()}`, x, y);

  y += 100;
  ctx.font = `60px "${REGULAR}"`;
  ctx.fillStyle = p.ink;
  ctx.fillText("ฉันคือ", x, y);
  // The element's icon, big, top right: the first thing a friend sees in the Story.
  drawIcon(ctx, key, W - x - 9 * 26, 330, 26);

  const size = nameFont(ctx, r.th, 340, maxW);
  ctx.fillStyle = p.ink;
  y = drawName(ctx, r.th, x, y + 50, size);

  y += 130;
  // Long roasts drop a size so they wrap into two even lines, not one word on its own.
  const roastSize = [...r.roastTh].length > 24 ? 54 : 64;
  y = lines(ctx, `“${r.roastTh}”`, `${roastSize}px "${REGULAR}"`, p.ink, x, y, maxW, roastSize * 1.45);
  y += 74;
  y = lines(ctx, r.roleTh, `40px "${REGULAR}"`, p.soft, x, y, maxW, 58, 2);

  // The tag box: an empty space to drop an IG mention sticker into.
  const boxTop = Math.max(y + 80, 1180);
  const boxH = 300;
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, boxTop, maxW, boxH);
  ctx.font = `56px "${REGULAR}"`;
  ctx.fillStyle = p.ink;
  ctx.fillText(`${r.th}ต้องการ${need.th}`, x + 44, boxTop + 96);
  ctx.font = `40px "${REGULAR}"`;
  ctx.fillStyle = p.soft;
  ctx.fillText(`แท็ก${need.th}ของคุณตรงนี้`, x + 44, boxTop + 170);
  drawIcon(ctx, r.needs, x + maxW - 44 - 9 * 12, boxTop + 40, 12);

  const footY = boxTop + boxH + 70;
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
  drawPixels(ctx, key, W, 4, 30);

  const x = 64;
  ctx.font = `24px "${MONO}"`;
  ctx.fillStyle = p.soft;
  ctx.fillText("[ELEMENTAL QUIZ]", x, 186);
  ctx.font = `26px "${REGULAR}"`;
  ctx.fillText("คุณคือธาตุอะไร?", x + 270, 186);

  drawIcon(ctx, key, W - x - 9 * 30, 190, 30);
  const size = nameFont(ctx, r.th, 200, W - x * 2 - 9 * 30 - 40);
  ctx.fillStyle = p.ink;
  const baseline = drawName(ctx, r.th, x, 216, size);
  lines(ctx, `“${r.roastTh}”`, `40px "${REGULAR}"`, p.ink, x, baseline + 80, W - x * 2 - 9 * 30 - 40, 54, 2);

  ctx.font = `24px "${REGULAR}"`;
  ctx.fillStyle = p.soft;
  ctx.fillText("8 ข้อ 1 นาที", x, H - 44);
  ctx.font = `22px "${MONO}"`;
  ctx.textAlign = "right";
  ctx.fillText(QUIZ_SHORT_URL, W - x, H - 44);

  return canvas.toBuffer("image/png");
}
