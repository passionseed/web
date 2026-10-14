/**
 * Certificate share-image renderer (spec 6.2).
 *
 * Engine decision (day-1 spike, 2026-10-13): `@napi-rs/canvas`, not
 * `next/og`. Satori (next/og) does not apply OpenType mark positioning for
 * Thai: with Bai Jamjuree it dropped tone marks that stack on an upper vowel
 * or sit on a tall consonant (ที่ -> ที, ญี่ปุ่น -> ญีปุน, ป่า -> ปา, ฝั่ง -> ฝัง)
 * and collided stacked marks (นี้, กิ้ง). Skia (HarfBuzz shaping) in
 * @napi-rs/canvas renders all of them correctly. Evidence:
 * __tests__/golden/spike-satori-rejected.png and spike-napi-canvas-chosen.png.
 */
import path from "node:path";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import type { CertificateContent } from "./content";
import { COLORS, LAYOUTS, fontString, type FormatLayout, type TextStyle } from "./layout";
import { qrMatrix } from "./qr";
import { graphemes, segmentThai, ZWSP } from "./thai";
import type { ImageFormat } from "./types";

const FONT_DIR = path.join(process.cwd(), "lib/shift-round/certificate/fonts");
const FONT_FILES: [file: string, family: string][] = [
  ["LibreFranklin-Medium.ttf", "SR Latin"],
  ["LibreFranklin-Bold.ttf", "SR Latin"],
  ["BaiJamjuree-Regular.ttf", "SR Thai"],
  ["BaiJamjuree-Medium.ttf", "SR Thai"],
  ["BaiJamjuree-Bold.ttf", "SR Thai"],
];

let fontsReady = false;
export function ensureFonts(): void {
  if (fontsReady) return;
  for (const [file, family] of FONT_FILES) {
    const key = GlobalFonts.registerFromPath(path.join(FONT_DIR, file), family);
    if (!key) throw new Error(`font_register_failed:${file}`);
  }
  fontsReady = true;
}

type Ctx = SKRSContext2D;

/** Break opportunities: ZWSP (Thai word boundaries) and spaces. */
function tokenize(text: string): string[] {
  const segmented = segmentThai(text);
  const tokens: string[] = [];
  for (const chunk of segmented.split(ZWSP)) {
    const parts = chunk.match(/\S+\s*|\s+/g) ?? [];
    tokens.push(...parts);
  }
  return tokens.filter((token) => token.length > 0);
}

function setFont(ctx: Ctx, style: TextStyle) {
  ctx.font = fontString(style);
  ctx.fillStyle = style.color;
}

function width(ctx: Ctx, text: string): number {
  return ctx.measureText(text).width;
}

function ellipsize(ctx: Ctx, line: string, maxWidth: number): string {
  let chars = graphemes(line.trimEnd());
  while (chars.length > 0 && width(ctx, `${chars.join("")}…`) > maxWidth) chars = chars.slice(0, -1);
  return `${chars.join("").trimEnd()}…`;
}

/** Greedy line breaking on segment boundaries; long words break at graphemes. */
export function wrapText(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = "";
  const tokens = tokenize(text);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const candidate = current + token;
    if (width(ctx, candidate.trimEnd()) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current.trim()) {
      lines.push(current.trimEnd());
      current = "";
      i -= 1; // retry this token on a fresh line
      if (lines.length === maxLines) break;
      continue;
    }
    // A single token wider than the line: split by grapheme.
    let piece = "";
    for (const g of graphemes(token)) {
      if (width(ctx, piece + g) > maxWidth && piece) {
        lines.push(piece);
        piece = "";
        if (lines.length === maxLines) break;
      }
      piece += g;
    }
    if (lines.length === maxLines) break;
    current = piece;
  }
  if (lines.length < maxLines && current.trim()) lines.push(current.trimEnd());

  const consumed = lines.join("").replace(/\s/g, "").length;
  const total = text.replace(/[\s​]/g, "").length;
  if (lines.length === maxLines && consumed < total) {
    lines[maxLines - 1] = ellipsize(ctx, lines[maxLines - 1], maxWidth);
  }
  return lines;
}

/** Draws wrapped text with its top at `y`; returns the y below the block. */
function drawBlock(
  ctx: Ctx,
  text: string,
  style: TextStyle,
  x: number,
  y: number,
  maxWidth: number,
  limitY = Number.POSITIVE_INFINITY
): number {
  setFont(ctx, style);
  const lineHeight = style.size * style.lineHeight;
  const fit = Math.min(style.maxLines, Math.floor((limitY - y) / lineHeight));
  if (fit <= 0) return y;
  const lines = wrapText(ctx, text, maxWidth, fit);
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, index) => {
    // Baseline sits ~0.8em into the line box; Thai marks above and below fit the leading.
    ctx.fillText(line, x, y + index * lineHeight + (lineHeight - style.size) / 2 + style.size * 0.8);
  });
  return y + lines.length * lineHeight;
}

function roundRect(ctx: Ctx, l: number, t: number, r: number, b: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(l, t, r - l, b - t, radius);
}

function drawCheck(ctx: Ctx, cx: number, cy: number, radius: number, done: boolean) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = done ? COLORS.violet50 : COLORS.surface;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = done ? COLORS.violet100 : COLORS.line;
  ctx.stroke();
  if (!done) return;
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.42, cy + radius * 0.02);
  ctx.lineTo(cx - radius * 0.1, cy + radius * 0.34);
  ctx.lineTo(cx + radius * 0.45, cy - radius * 0.32);
  ctx.lineWidth = Math.max(3, radius * 0.18);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = COLORS.violet700;
  ctx.stroke();
}

function drawQr(ctx: Ctx, text: string, x: number, y: number, size: number) {
  const qr = qrMatrix(text);
  const cell = Math.floor(size / qr.size);
  const offset = Math.floor((size - cell * qr.size) / 2);
  ctx.fillStyle = COLORS.ink;
  for (let row = 0; row < qr.size; row += 1) {
    for (let col = 0; col < qr.size; col += 1) {
      if (qr.isDark(row, col)) ctx.fillRect(x + offset + col * cell, y + offset + row * cell, cell, cell);
    }
  }
}

function drawBackground(ctx: Ctx, layout: FormatLayout) {
  ctx.fillStyle = COLORS.canvas;
  ctx.fillRect(0, 0, layout.width, layout.height);
  const wash = ctx.createRadialGradient(layout.width, 0, 0, layout.width, 0, layout.width * 0.95);
  wash.addColorStop(0, COLORS.wash);
  wash.addColorStop(1, "rgba(236, 230, 255, 0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, layout.width, layout.height);

  const { card } = layout;
  ctx.save();
  ctx.shadowColor = "rgba(91, 47, 214, 0.10)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, card.left, card.top, card.right, card.bottom, card.radius);
  ctx.fillStyle = COLORS.surface;
  ctx.fill();
  ctx.restore();
}

function drawTag(ctx: Ctx, text: string, style: TextStyle, x: number, y: number): { right: number; bottom: number } {
  setFont(ctx, style);
  const padX = style.size * 0.6;
  const height = style.size * 1.7;
  const w = width(ctx, text) + padX * 2;
  roundRect(ctx, x, y, x + w, y + height, 10);
  ctx.fillStyle = COLORS.violet50;
  ctx.fill();
  ctx.fillStyle = style.color;
  ctx.fillText(text, x + padX, y + height / 2 + style.size * 0.36);
  return { right: x + w, bottom: y + height };
}

/** Columns, rows and row height for `count` missions within `room` px (statement room already kept). */
export function missionGrid(
  layout: FormatLayout,
  count: number,
  room: number
): { columns: number; rows: number; rowHeight: number; scale: number } {
  const columns = count > layout.missionDenseAfter ? layout.missionColumnsDense : layout.missionColumns;
  const rows = Math.max(1, Math.ceil(count / columns));
  const fit = Math.floor((room - layout.statementReserve) / rows);
  const rowHeight = Math.max(layout.missionRowMin, Math.min(layout.missionRow, fit));
  return { columns, rows, rowHeight, scale: rowHeight / layout.missionRow };
}

function scaleStyle(style: TextStyle, scale: number): TextStyle {
  return scale >= 1 ? style : { ...style, size: Math.round(style.size * scale) };
}

/** One line: the text if it fits, else cut at a (Thai) word boundary with an ellipsis. */
function fitLine(ctx: Ctx, text: string, maxWidth: number): string {
  return width(ctx, text) <= maxWidth ? text : (wrapText(ctx, text, maxWidth, 1)[0] ?? "");
}

/** Thai title then the English one on the same line; English shortens (or drops) to fit. */
function drawInlineLabel(
  ctx: Ctx,
  label: { th: string; en: string },
  x: number,
  cy: number,
  maxWidth: number,
  thStyle: TextStyle,
  enStyle: TextStyle
) {
  setFont(ctx, thStyle);
  const th = fitLine(ctx, label.th, maxWidth);
  ctx.fillText(th, x, cy + thStyle.size * 0.36);
  if (label.en === label.th) return;
  const gap = Math.round(thStyle.size * 0.5);
  const used = width(ctx, th) + gap;
  const rest = maxWidth - used;
  if (rest < enStyle.size * 3) return;
  setFont(ctx, enStyle);
  ctx.fillText(fitLine(ctx, label.en, rest), x + used, cy + enStyle.size * 0.36);
}

function drawRule(ctx: Ctx, x1: number, x2: number, y: number) {
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(x1, Math.round(y), x2 - x1, 2);
}

export function drawCertificate(ctx: Ctx, content: CertificateContent, format: ImageFormat): void {
  const layout = LAYOUTS[format];
  const { safe, text, gaps } = layout;
  const maxWidth = safe.right - safe.left;
  drawBackground(ctx, layout);

  let y = safe.top;
  // Issuer and round tag on one row.
  setFont(ctx, text.issuer);
  const issuerLine = text.issuer.size * 1.7;
  ctx.fillText(content.issuer, safe.left, y + issuerLine / 2 + text.issuer.size * 0.36);
  const tagText =
    content.roundTag.th === content.roundTag.en
      ? content.roundTag.th
      : `${content.roundTag.th}  ·  ${content.roundTag.en.replace("SHIFT · ", "")}`;
  setFont(ctx, text.tag);
  const tagWidth = width(ctx, tagText) + text.tag.size * 1.2;
  drawTag(ctx, tagText, text.tag, safe.right - tagWidth, y + (issuerLine - text.tag.size * 1.7) / 2);
  y += issuerLine + gaps.section;

  y = drawBlock(ctx, content.title.th, text.titleTh, safe.left, y, maxWidth);
  y = drawBlock(ctx, content.title.en, text.titleEn, safe.left, y + gaps.small / 2, maxWidth);
  y += gaps.section;
  drawRule(ctx, safe.left, safe.right, y);
  y += gaps.section;

  y = drawBlock(ctx, "ผู้ถือ · Holder", text.label, safe.left, y, maxWidth);
  y = drawBlock(ctx, content.holder, text.holder, safe.left, y + gaps.small, maxWidth);
  y += gaps.small;
  y = drawBlock(ctx, `${content.dates.th}  ·  ${content.track.th}`, text.meta, safe.left, y, maxWidth);
  y = drawBlock(ctx, `${content.dates.en}  ·  ${content.track.en}`, text.meta, safe.left, y, maxWidth);
  y += gaps.section;

  // Verify block pinned to the bottom of the safe area: QR + short URL.
  // Neither the missions nor the statement may run into it.
  const qrTop = safe.bottom - layout.qrSize;
  const limit = qrTop - gaps.section;

  // Missions with checks, any count (per-round config). Rows shrink, text with
  // them, so the statement keeps its room; the square goes to 3 columns when long.
  const count = content.missions.length;
  if (count > 0) {
    const grid = missionGrid(layout, count, limit - y - gaps.section);
    const colWidth = maxWidth / grid.columns;
    const thStyle = scaleStyle(text.missionTh, grid.scale);
    const enStyle = scaleStyle(text.missionEn, grid.scale);
    const radius = Math.round(layout.checkRadius * grid.scale);
    content.missions.forEach((mission, index) => {
      const col = grid.columns === 1 ? 0 : Math.floor(index / grid.rows);
      const row = grid.columns === 1 ? index : index % grid.rows;
      const x = safe.left + col * colWidth;
      const cy = y + row * grid.rowHeight + grid.rowHeight / 2;
      drawCheck(ctx, x + radius, cy, radius, mission.done);
      const labelX = x + radius * 2 + Math.round(16 * grid.scale);
      const labelWidth = colWidth - (labelX - x) - 12;
      if (grid.columns === 1) {
        drawInlineLabel(ctx, mission.label, labelX, cy, labelWidth, thStyle, enStyle);
      } else {
        setFont(ctx, thStyle);
        ctx.fillText(fitLine(ctx, mission.label.th, labelWidth), labelX, cy - 2 * grid.scale);
        if (mission.label.en !== mission.label.th) {
          setFont(ctx, enStyle);
          ctx.fillText(fitLine(ctx, mission.label.en, labelWidth), labelX, cy + enStyle.size + 2 * grid.scale);
        }
      }
    });
    y += grid.rows * grid.rowHeight + gaps.section;
  }

  y = drawBlock(ctx, content.statement.th, text.statementTh, safe.left, y, maxWidth, limit);
  drawBlock(ctx, content.statement.en, text.statementEn, safe.left, y + gaps.small, maxWidth, limit);

  drawQr(ctx, content.verifyUrl, safe.left, qrTop, layout.qrSize);
  const vx = safe.left + layout.qrSize + 28;
  const vWidth = safe.right - vx;
  let vy = qrTop + (layout.qrSize - (text.verifyLabel.size * 1.45 * 2 + text.verifyUrl.size * 1.35 * 2)) / 2;
  vy = drawBlock(ctx, "ตรวจสอบได้ที่", text.verifyLabel, vx, vy, vWidth);
  vy = drawBlock(ctx, "Verify at", text.verifyLabel, vx, vy, vWidth);
  drawBlock(ctx, content.verifyUrlText, text.verifyUrl, vx, vy, vWidth);
}

export async function renderCertificatePng(content: CertificateContent, format: ImageFormat): Promise<Buffer> {
  ensureFonts();
  const layout = LAYOUTS[format];
  const canvas = createCanvas(layout.width, layout.height);
  const ctx = canvas.getContext("2d");
  drawCertificate(ctx, content, format);
  return canvas.encode("png");
}
