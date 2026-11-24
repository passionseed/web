import { KIT_TITLE_TH } from "@/components/hackathon/elemental/kit";
import type { ElementKey } from "@/components/hackathon/elemental/media";
import { EL } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENT_ICON_COLOR, iconCells } from "@/components/hackathon/poster/elemental/element-icons";
import { QUIZ_PALETTE, pixelBandCells } from "@/lib/hackathon/elemental/quiz";

/**
 * The 9:16 story card for a finished question, drawn in the browser. The
 * question is the person's own words, so it never goes to our server: it is
 * drawn here and handed straight to the share sheet or a download.
 */

const W = 1080;
const H = 1920;
const PAD = 96;

/** Break Thai (no spaces between words) into lines that fit, using the browser's word segmenter. */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const words =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? Array.from(new Intl.Segmenter("th", { granularity: "word" }).segment(text), (s) => s.segment)
      : text.split(/(\s+)/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line + w;
    if (line && measure(next) > maxWidth) {
      lines.push(line.trim());
      line = w.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

export async function drawStoryCard({
  element,
  elementTh,
  question,
  fontFamily,
  url,
}: {
  element: ElementKey;
  elementTh: string;
  question: string;
  fontFamily: string;
  url: string;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const p = QUIZ_PALETTE[element];
  const mono = "'Space Mono', ui-monospace, monospace";

  try {
    // Pass the text: without it only the Latin subset loads, and Thai falls back to a system font.
    await Promise.all([document.fonts.load(`300 72px ${fontFamily}`, question), document.fonts.load(`200 120px ${fontFamily}`, KIT_TITLE_TH)]);
  } catch {
    // Falls back to the system serif; the card still works.
  }

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  // The pixel band eating in from the top, like the quiz cards.
  const cols = 27;
  const rows = 6;
  const cell = W / cols;
  for (const [c, r, color] of pixelBandCells(element, cols, rows)) {
    ctx.fillStyle = color;
    ctx.fillRect(c * cell, r * cell, Math.ceil(cell), Math.ceil(cell));
  }

  let y = rows * cell + 110;
  ctx.fillStyle = p.soft;
  ctx.font = `400 30px ${mono}`;
  ctx.fillText(`[คำถามของฉัน · ${elementTh}]`, PAD, y);

  // The element's icon, top right.
  const icon = 18;
  ctx.fillStyle = ELEMENT_ICON_COLOR[element];
  for (const [x, yy] of iconCells(element)) ctx.fillRect(W - PAD - 9 * icon + x * icon, y - 120 + yy * icon, icon, icon);

  // The question, as big as it can be and still fit.
  y += 90;
  let size = 84;
  let lines: string[] = [];
  for (; size >= 48; size -= 4) {
    ctx.font = `300 ${size}px ${fontFamily}`;
    lines = wrapLines(question, W - PAD * 2, (s) => ctx.measureText(s).width);
    if (lines.length * size * 1.45 < H - y - 520) break;
  }
  ctx.fillStyle = p.ink;
  ctx.font = `300 ${size}px ${fontFamily}`;
  for (const l of lines) {
    y += size * 1.45;
    ctx.fillText(l, PAD, y);
  }

  // Footer: the line that says what this is, and where to make your own.
  const footY = H - 300;
  ctx.fillStyle = "rgba(243,239,230,0.16)";
  ctx.fillRect(PAD, footY, W - PAD * 2, 2);
  ctx.fillStyle = p.ink;
  ctx.font = `200 64px ${fontFamily}`;
  ctx.fillText(KIT_TITLE_TH, PAD, footY + 100);
  ctx.fillStyle = p.soft;
  ctx.font = `400 30px ${mono}`;
  ctx.fillText(url, PAD, footY + 170);
  ctx.fillStyle = EL.flame;
  ctx.fillRect(PAD, footY + 205, 64, 8);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}
