/**
 * The SHIFT Island tree promo: 15 s at 30 fps, drawn with the app's own tree
 * close-up (lib/shift-island/tree-closeup), so every frame matches what a team
 * sees on the web and in Discord. Writes PNG frames (gridToRgba + the bot's
 * encodePng), then encodes them with ffmpeg.
 *
 *   pnpm tsx scripts/render-tree-promo.ts <outDir>                        # both formats, frames and videos
 *   pnpm tsx scripts/render-tree-promo.ts <outDir> --frames 0,225,449     # dry run: these frames as PNGs, no ffmpeg
 *   pnpm tsx scripts/render-tree-promo.ts <outDir> --format square        # vertical | square
 *
 * Writes to <outDir>: tree-promo-1080x1920.mp4 (stories and reels),
 * tree-promo-1080x1080.mp4 (a seamless loop) and tree-promo-1080x1080.gif when
 * it stays under Discord's 15 MB. Frames stay in frames-<w>x<h>/ for checking.
 * It is marketing output: keep it out of git (output/marketing/ is ignored).
 *
 * Needs ffmpeg on PATH, or FFMPEG=/path/to/ffmpeg. Thai is drawn with
 * @napi-rs/canvas (HarfBuzz shaping, see lib/shift-round/certificate/render.ts)
 * in Kodchasan Bold from lib/og/fonts, so no browser is needed. Run it from
 * the repo root.
 *
 * Storyboard (seconds): 0 empty plot and title; 1.5 seed card, a seed is
 * picked and drops into the soil; 3 stages 1 to 7, 0.5 s each, roots
 * spreading; 7 gift card, 1 of 3 looks picked; 9 four looks from the
 * wardrobe, 0.75 s each; 12 end card with /start and the guide link.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { createCanvas, GlobalFonts, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";

import { encodePng } from "@/bot/src/quests/island/render";
import {
  CLOSEUP_SIZE,
  closeupGrid,
  cropGrid,
  gridToRgba,
  previewView,
  wearItem,
  type CloseupInput,
  type PixelGrid,
} from "@/lib/shift-island/tree-closeup";
import { TREE_SEEDS, TREE_SLOTS } from "@/lib/shift-island/tree-copy";
import { DEFAULT_STYLE, SEEDS, treeItem, type SeedId, type TreeStyle } from "@/lib/shift-island/tree-style";

const FPS = 30;
const SECONDS = 15;
const FRAMES = FPS * SECONDS;
const FONT_FILE = "lib/og/fonts/Kodchasan-Bold.ttf";
const FONT = "PromoKodchasan";
const GIF_LIMIT_BYTES = 15 * 1024 * 1024;

const COLOR = {
  ink: "#10181A",
  card: "rgba(30, 40, 42, 0.96)",
  scrim: "rgba(16, 24, 26, 0.55)",
  tile: "rgba(255, 255, 255, 0.06)",
  picked: "rgba(244, 197, 106, 0.16)",
  cream: "#FFF1D6",
  dim: "#B8C7BF",
  lamp: "#F4C56A",
};

/**
 * Every on-screen line. Thai reviewed by Cursor and Codex, 2026-11-14 (agy
 * could not run headless): no line had two flags. The first four come from
 * the island guide (lib/content/shift-island-guide.ts).
 */
const COPY = {
  title: "หนึ่งโปรเจกต์ คือต้นไม้หนึ่งต้น",
  seed: "ก้าวแรกของทีม คือเลือกเมล็ด",
  grow: "สิ่งที่คุณสร้าง โตให้เห็นเหนือดิน",
  roots: "สิ่งที่คุณได้เรียนรู้ โตอยู่ใต้ดิน",
  gift: "ปิดรอบกองไฟด้วยบันทึก ทีมได้ของขวัญ",
  wardrobe: "ลุคเป็นของทั้งทีม ใครในทีมก็สลับได้",
  open: "เกาะ SHIFT เปิดแล้ว",
  /** One accent: the command. */
  start: [
    { text: "พิมพ์ ", accent: false },
    { text: "/start", accent: true },
    { text: " ใน Discord ของ SHIFT", accent: false },
  ],
  url: "passionseed.org/shift/island/guide",
};

/** The seed card in the app's order (SeedPicker), and the one the team picks. */
const SEED_ORDER: readonly SeedId[] = ["oak", "sakura", "pine", "maple"];
const SEED: SeedId = "maple";
/** Three leaf colours: the choice reads at a glance (a leaf shape previews as a close look at the leaves). */
const GIFT_OPTIONS = ["leaf:gold", "leaf:sky", "leaf:dusk"];
const GIFT_PICK = "leaf:gold";
/** Looks the team switches to, one slot at a time; the gold leaves stay until the last. */
const WARDROBE = ["shape:willow", "bark:ebony", "bloom:sakura", "leaf:mint"];

/** When things happen, in seconds. */
const T = {
  seedCardIn: 1.5,
  seedPick: 2.0,
  seedCardOut: 2.3,
  dropStart: 2.35,
  dropEnd: 2.8,
  growStart: 3.0,
  stageStep: 0.5,
  giftCardIn: 7.0,
  giftPick: 7.9,
  giftCardOut: 8.3,
  giftWear: 8.45,
  wardrobeStart: 9.0,
  wardrobeStep: 0.75,
  end: 12.0,
  /** The scene dips to ink, then the end card comes up out of it (a cross-fade double-exposes two trees). */
  endOut: 0.2,
  endIn: 0.3,
  loopFade: 0.5,
  cardSlide: 0.3,
  cardFade: 0.2,
};

/** Root reflections as the tree grows: [time, count]. The newest three glow. */
const ROOT_STEPS: readonly [number, number][] = [
  [3.25, 1],
  [3.75, 2],
  [4.25, 3],
  [4.75, 4],
  [5.25, 5],
  [5.75, 7],
  [6.25, 9],
  [6.5, 10],
  [6.75, 12],
];

/** One line of text per beat. */
const BEATS: readonly { at: number; line: string }[] = [
  { at: 0, line: COPY.title },
  { at: T.seedCardIn, line: COPY.seed },
  { at: T.growStart, line: COPY.grow },
  { at: 5, line: COPY.roots },
  { at: T.giftCardIn, line: COPY.gift },
  { at: T.wardrobeStart, line: COPY.wardrobe },
];

interface Layout {
  name: "vertical" | "square";
  w: number;
  h: number;
  /** The close-up window: top left and whole-number scale. */
  win: { x: number; y: number; scale: number };
  /** The beat line: centre, starting size, widest row. */
  text: { cy: number; size: number; maxW: number };
  /** The wardrobe label: centre and sizes. */
  chip: { cx: number; cy: number; slot: number; name: number };
  /** Seed and gift cards: centre row, tile scales and label size. */
  card: { cy: number; seedScale: number; giftScale: number; label: number };
  /** End card: headline, the close-up, the call to action and the link. */
  end: { head: [y: number, size: number]; tree: [y: number, scale: number]; cta: [y: number, size: number]; url: [y: number, size: number] };
  /** Dip the last frames through ink into the first, so the video loops. */
  loop: boolean;
}

const LAYOUTS: Record<Layout["name"], Layout> = {
  vertical: {
    name: "vertical",
    w: 1080,
    h: 1920,
    win: { x: 108, y: 500, scale: 9 },
    text: { cy: 240, size: 76, maxW: 960 },
    chip: { cx: 540, cy: 420, slot: 34, name: 46 },
    card: { cy: 878, seedScale: 2, giftScale: 3, label: 40 },
    end: { head: [390, 96], tree: [480, 6], cta: [1500, 58], url: [1600, 40] },
    loop: false,
  },
  square: {
    name: "square",
    w: 1080,
    h: 1080,
    win: { x: 252, y: 168, scale: 6 },
    text: { cy: 86, size: 56, maxW: 1020 },
    chip: { cx: 126, cy: 408, slot: 30, name: 40 },
    card: { cy: 430, seedScale: 2, giftScale: 3, label: 34 },
    end: { head: [125, 64], tree: [195, 4], cta: [885, 46], url: [962, 34] },
    loop: true,
  },
};

const { h: GRID_H, ground: GROUND } = CLOSEUP_SIZE;

// ---------------------------------------------------------------- timing

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const easeInOut = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const easeIn = (p: number) => p * p;
/** 0 to 1 over [start, start + length). */
const span = (t: number, start: number, length: number) => clamp01((t - start) / length);

// ---------------------------------------------------------------- the tree over time

/** One change to the close-up: it wipes in from the ground line over `fade` seconds. */
interface Key {
  at: number;
  input: CloseupInput;
  fade: number;
  /** A wardrobe change: the label to show with it. */
  chip?: { slot: string; name: string };
}

const roots = (count: number) => ({ count, recent: Math.min(count, 3) });

const EMPTY: CloseupInput = { style: DEFAULT_STYLE, stage: 0, seeded: false, roots: roots(0) };

function wear(style: TreeStyle, id: string): TreeStyle {
  const item = treeItem(id);
  if (!item) throw new Error(`render-tree-promo: no tree item ${id}`);
  return { ...style, [item.slot]: item.id };
}

/** The seed lands, the tree grows with its roots, wears the gift, then the wardrobe looks. */
function buildKeys(): Key[] {
  let style = SEEDS[SEED].style;
  let stage = 0;
  let count = 0;
  const keys: Key[] = [{ at: T.dropEnd, input: { style, stage, seeded: true, roots: roots(0) }, fade: 0.2 }];
  const growth = [
    ...Array.from({ length: 7 }, (_, i) => ({ at: T.growStart + i * T.stageStep, stage: i + 1, count: -1 })),
    ...ROOT_STEPS.map(([at, n]) => ({ at, stage: -1, count: n })),
  ].sort((a, b) => a.at - b.at);
  for (const step of growth) {
    if (step.stage >= 0) stage = step.stage;
    if (step.count >= 0) count = step.count;
    keys.push({ at: step.at, input: { style, stage, seeded: true, roots: roots(count) }, fade: step.stage >= 0 ? 0.3 : 0.25 });
  }
  style = wear(style, GIFT_PICK);
  keys.push({ at: T.giftWear, input: { style, stage, seeded: true, roots: roots(count) }, fade: 0.35 });
  WARDROBE.forEach((id, i) => {
    style = wear(style, id);
    const item = treeItem(id)!;
    keys.push({
      at: T.wardrobeStart + i * T.wardrobeStep,
      input: { style, stage, seeded: true, roots: roots(count) },
      fade: 0.3,
      chip: { slot: TREE_SLOTS[item.slot], name: item.name },
    });
  });
  return keys;
}

const KEYS = buildKeys();
const LAST = KEYS[KEYS.length - 1].input;

const grids = new Map<string, PixelGrid>();
/** closeupGrid, once per distinct input. */
function gridOf(input: CloseupInput): PixelGrid {
  const key = JSON.stringify(input);
  let grid = grids.get(key);
  if (!grid) grids.set(key, (grid = closeupGrid(input)));
  return grid;
}

/** The seed's own pixels: what a seeded empty plot has that an unseeded one does not. */
const SEED_PIXELS: [x: number, y: number, color: string][] = (() => {
  const seeded = gridOf({ ...EMPTY, seeded: true });
  const empty = gridOf(EMPTY);
  return seeded.flatMap((row, y) => row.flatMap((c, x) => (c && c !== empty[y][x] ? [[x, y, c] as [number, number, string]] : [])));
})();
/** The seed starts this many rows above where it lands. */
const DROP_ROWS = 70;

/** The empty plot with the seed `offset` rows above its place in the soil. */
function withSeed(offset: number): PixelGrid {
  const grid = gridOf(EMPTY).map((row) => [...row]);
  for (const [x, y, c] of SEED_PIXELS) {
    const r = y + Math.round(offset);
    if (r >= 0 && r < GRID_H) grid[r][x] = c;
  }
  return grid;
}

/** Ordered dither, so a wipe's edge breaks up into pixels instead of a ruled line. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

/** `from` turning into `to`: above ground it grows up from the grass, below it reaches down. */
function wipe(from: PixelGrid, to: PixelGrid, p: number): PixelGrid {
  const jitter = 0.2;
  const edge = p * (1 + jitter);
  return to.map((row, y) =>
    row.map((c, x) => {
      const dist = y < GROUND ? (GROUND - 1 - y) / GROUND : (y - GROUND) / (GRID_H - GROUND);
      return dist <= edge - jitter * BAYER[y % 4][x % 4] ? c : from[y][x];
    }),
  );
}

function gridAt(t: number): PixelGrid {
  if (t < T.dropStart) return gridOf(EMPTY);
  if (t < T.dropEnd) return withSeed(-DROP_ROWS * (1 - easeIn(span(t, T.dropStart, T.dropEnd - T.dropStart))));
  let i = KEYS.length - 1;
  while (KEYS[i].at > t) i--;
  const key = KEYS[i];
  const p = span(t, key.at, key.fade);
  if (p >= 1) return gridOf(key.input);
  const from = i > 0 ? gridOf(KEYS[i - 1].input) : withSeed(0);
  return wipe(from, gridOf(key.input), easeInOut(p));
}

// ---------------------------------------------------------------- drawing

type Ctx = SKRSContext2D;

const font = (size: number) => `700 ${size}px ${FONT}`;

/** A pixel grid as a canvas at a whole-number scale. */
function pixelCanvas(grid: PixelGrid, scale: number): Canvas {
  const { width, height, data } = gridToRgba(grid, scale);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(width, height);
  image.data.set(data);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** A rectangle with 2-step pixel corners, like the island's --notch. */
function plate(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, n = 8): void {
  ctx.beginPath();
  ctx.moveTo(x + n, y);
  ctx.lineTo(x + w - n, y);
  ctx.lineTo(x + w - n, y + n / 2);
  ctx.lineTo(x + w - n / 2, y + n / 2);
  ctx.lineTo(x + w - n / 2, y + n);
  ctx.lineTo(x + w, y + n);
  ctx.lineTo(x + w, y + h - n);
  ctx.lineTo(x + w - n / 2, y + h - n);
  ctx.lineTo(x + w - n / 2, y + h - n / 2);
  ctx.lineTo(x + w - n, y + h - n / 2);
  ctx.lineTo(x + w - n, y + h);
  ctx.lineTo(x + n, y + h);
  ctx.lineTo(x + n, y + h - n / 2);
  ctx.lineTo(x + n / 2, y + h - n / 2);
  ctx.lineTo(x + n / 2, y + h - n);
  ctx.lineTo(x, y + h - n);
  ctx.lineTo(x, y + n);
  ctx.lineTo(x + n / 2, y + n);
  ctx.lineTo(x + n / 2, y + n / 2);
  ctx.lineTo(x + n, y + n / 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** One row, or two split at the space nearest the middle, shrunk until every row fits. */
function fitRows(ctx: Ctx, text: string, size: number, maxW: number): { rows: string[]; size: number } {
  ctx.font = font(size);
  if (ctx.measureText(text).width <= maxW) return { rows: [text], size };
  const spaces = [...text].flatMap((ch, i) => (ch === " " ? [i] : []));
  const mid = spaces.sort((a, b) => Math.abs(a - text.length / 2) - Math.abs(b - text.length / 2))[0];
  const rows = mid === undefined ? [text] : [text.slice(0, mid), text.slice(mid + 1)];
  let s = size;
  for (; s > 20; s -= 2) {
    ctx.font = font(s);
    if (rows.every((row) => ctx.measureText(row).width <= maxW)) break;
  }
  return { rows, size: s };
}

function centredText(ctx: Ctx, text: string, cx: number, cy: number, size: number, maxW: number, color: string): void {
  const fit = fitRows(ctx, text, size, maxW);
  const lead = fit.size * 1.4;
  ctx.font = font(fit.size);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fit.rows.forEach((row, i) => ctx.fillText(row, cx, cy + (i - (fit.rows.length - 1) / 2) * lead));
}

/** A line in parts, the accented ones in lamp, centred and shrunk to fit. */
function richText(ctx: Ctx, parts: typeof COPY.start, cx: number, cy: number, size: number, maxW: number): void {
  let s = size;
  const widthAt = (px: number) => {
    ctx.font = font(px);
    return parts.reduce((sum, part) => sum + ctx.measureText(part.text).width, 0);
  };
  while (s > 20 && widthAt(s) > maxW) s -= 2;
  let x = cx - widthAt(s) / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (const part of parts) {
    ctx.fillStyle = part.accent ? COLOR.lamp : COLOR.cream;
    ctx.fillText(part.text, x, cy);
    x += ctx.measureText(part.text).width;
  }
}

interface Tile {
  image: Canvas;
  label: string;
}

const tileCache = new Map<string, Tile[]>();

/** The four seeds, each grown up in its look, as SeedPicker draws them. */
function seedTiles(L: Layout): Tile[] {
  const key = `seed-${L.name}`;
  let tiles = tileCache.get(key);
  if (!tiles) {
    tiles = SEED_ORDER.map((id) => ({
      image: pixelCanvas(cropGrid(gridOf({ style: SEEDS[id].style, stage: 7, seeded: true, roots: roots(0) }), "tree"), L.card.seedScale),
      label: TREE_SEEDS[id].name,
    }));
    tileCache.set(key, tiles);
  }
  return tiles;
}

/** The gift's three looks, each on the team's own tree, as GiftPicker draws them. */
function giftTiles(L: Layout): Tile[] {
  const key = `gift-${L.name}`;
  let tiles = tileCache.get(key);
  if (!tiles) {
    const base = KEYS.filter((k) => k.at < T.giftWear).at(-1)!.input;
    tiles = GIFT_OPTIONS.map((id) => {
      const item = treeItem(id)!;
      const { view, scale } = previewView(item.slot);
      return {
        image: pixelCanvas(cropGrid(gridOf(wearItem(base, id)!), view), scale * L.card.giftScale),
        label: `${TREE_SLOTS[item.slot]} ${item.name}`,
      };
    });
    tileCache.set(key, tiles);
  }
  return tiles;
}

/** A card of tiles over the sky: slides up in, the picked tile lifts with a lamp outline, then it fades. */
function drawCard(ctx: Ctx, L: Layout, tiles: Tile[], picked: number, t: number, at: { in: number; pick: number; out: number }): void {
  const shown = easeOut(span(t, at.in, T.cardSlide));
  const gone = span(t, at.out, T.cardFade);
  if (shown <= 0 || gone >= 1) return;
  const pad = 24;
  const gap = 16;
  const inner = 10;
  const labelH = Math.round(L.card.label * 1.6);
  const tileW = tiles[0].image.width + inner * 2;
  const tileH = inner + tiles[0].image.height + labelH + inner;
  const w = tiles.length * tileW + (tiles.length - 1) * gap + pad * 2;
  const h = tileH + pad * 2;
  const x = Math.round((L.w - w) / 2);
  const y = Math.round(L.card.cy - h / 2 + (1 - shown) * 60);
  ctx.save();
  ctx.globalAlpha = shown * (1 - gone);
  // Dim the tree behind, so the card is the one thing to read.
  ctx.fillStyle = COLOR.scrim;
  ctx.fillRect(L.win.x, L.win.y, CLOSEUP_SIZE.w * L.win.scale, GRID_H * L.win.scale);
  plate(ctx, x, y, w, h, COLOR.card, 12);
  const lift = easeOut(span(t, at.pick, 0.15));
  tiles.forEach((tile, i) => {
    const isPicked = i === picked && lift > 0;
    const tx = x + pad + i * (tileW + gap);
    const ty = y + pad - (isPicked ? Math.round(lift * 8) : 0);
    plate(ctx, tx, ty, tileW, tileH, isPicked ? COLOR.picked : COLOR.tile, 8);
    if (isPicked) {
      ctx.strokeStyle = COLOR.lamp;
      ctx.lineWidth = 4;
      ctx.strokeRect(tx + 2, ty + 2, tileW - 4, tileH - 4);
    }
    ctx.drawImage(tile.image, tx + inner, ty + inner);
    ctx.font = font(L.card.label);
    ctx.fillStyle = COLOR.cream;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tile.label, tx + tileW / 2, ty + inner + tile.image.height + labelH / 2 + 2);
  });
  ctx.restore();
}

/** The wardrobe label: which part changed, small, over its new look's name. */
function drawChip(ctx: Ctx, L: Layout, t: number): void {
  if (t < T.wardrobeStart || t >= T.end) return;
  const key = KEYS.filter((k) => k.chip && k.at <= t).at(-1);
  if (!key?.chip) return;
  const { slot, name } = key.chip;
  ctx.font = font(L.chip.slot);
  const slotW = ctx.measureText(slot).width;
  ctx.font = font(L.chip.name);
  const nameW = ctx.measureText(name).width;
  const w = Math.round(Math.max(slotW, nameW) + 48);
  const h = Math.round(L.chip.slot * 1.35 + L.chip.name * 1.35 + 20);
  const x = Math.round(L.chip.cx - w / 2);
  const y = Math.round(L.chip.cy - h / 2);
  ctx.save();
  ctx.globalAlpha = easeOut(span(t, key.at, 0.15));
  plate(ctx, x, y, w, h, COLOR.card, 8);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font(L.chip.slot);
  ctx.fillStyle = COLOR.dim;
  ctx.fillText(slot, L.chip.cx, y + 10 + (L.chip.slot * 1.35) / 2);
  ctx.font = font(L.chip.name);
  ctx.fillStyle = COLOR.lamp;
  ctx.fillText(name, L.chip.cx, y + 10 + L.chip.slot * 1.35 + (L.chip.name * 1.35) / 2);
  ctx.restore();
}

/** The beat's line: fades in over 0.2 s, out over the 0.15 s before the next beat. */
function drawLine(ctx: Ctx, L: Layout, t: number): void {
  let i = BEATS.length - 1;
  while (BEATS[i].at > t) i--;
  const beat = BEATS[i];
  const next = BEATS[i + 1]?.at ?? T.end;
  const alpha = (i === 0 ? 1 : span(t, beat.at, 0.2)) * clamp01((next - t) / 0.15);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  centredText(ctx, beat.line, L.w / 2, L.text.cy, L.text.size, L.text.maxW, COLOR.cream);
  ctx.restore();
}

function drawScene(ctx: Ctx, L: Layout, t: number): void {
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(0, 0, L.w, L.h);
  ctx.drawImage(pixelCanvas(gridAt(t), L.win.scale), L.win.x, L.win.y);
  drawCard(ctx, L, seedTiles(L), SEED_ORDER.indexOf(SEED), t, { in: T.seedCardIn, pick: T.seedPick, out: T.seedCardOut });
  drawCard(ctx, L, giftTiles(L), GIFT_OPTIONS.indexOf(GIFT_PICK), t, { in: T.giftCardIn, pick: T.giftPick, out: T.giftCardOut });
  drawChip(ctx, L, t);
  drawLine(ctx, L, t);
}

/** The last card: the grown tree with its roots, where to start, and the guide. */
function endCard(L: Layout): Canvas {
  const canvas = createCanvas(L.w, L.h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(0, 0, L.w, L.h);
  centredText(ctx, COPY.open, L.w / 2, L.end.head[0], L.end.head[1], L.w - 120, COLOR.cream);
  const tree = pixelCanvas(gridOf(LAST), L.end.tree[1]);
  ctx.drawImage(tree, Math.round((L.w - tree.width) / 2), L.end.tree[0]);
  richText(ctx, COPY.start, L.w / 2, L.end.cta[0], L.end.cta[1], L.w - 120);
  centredText(ctx, COPY.url, L.w / 2, L.end.url[0], L.end.url[1], L.w - 120, COLOR.dim);
  return canvas;
}

const ends = new Map<string, Canvas>();
const firsts = new Map<string, Canvas>();

function cached(store: Map<string, Canvas>, L: Layout, make: () => Canvas): Canvas {
  let canvas = store.get(L.name);
  if (!canvas) store.set(L.name, (canvas = make()));
  return canvas;
}

/** With an image: ink, then the image at `alpha`. Without: ink at `alpha` over what is there. */
function cover(ctx: Ctx, L: Layout, alpha: number, image: Canvas | null): void {
  if (image) {
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(0, 0, L.w, L.h);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  if (image) {
    ctx.drawImage(image, 0, 0);
  } else {
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(0, 0, L.w, L.h);
  }
  ctx.restore();
}

/** Frame n of a layout as PNG bytes. */
function renderFrame(L: Layout, n: number): Buffer {
  const t = n / FPS;
  const canvas = createCanvas(L.w, L.h);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const end = cached(ends, L, () => endCard(L));
  if (t < T.end + T.endOut) {
    drawScene(ctx, L, t);
    if (t >= T.end) cover(ctx, L, easeInOut(span(t, T.end, T.endOut)), null);
  } else {
    cover(ctx, L, easeInOut(span(t, T.end + T.endOut, T.endIn)), end);
  }
  // The loop: the end card dips to ink and the first frame comes back up, so frame 0 follows the last.
  const tail = SECONDS - T.loopFade;
  if (L.loop && t >= tail) {
    const half = T.loopFade / 2;
    const first = cached(firsts, L, () => {
      const c = createCanvas(L.w, L.h);
      drawScene(c.getContext("2d"), L, 0);
      return c;
    });
    if (t < tail + half) cover(ctx, L, easeInOut(span(t, tail, half)), null);
    else cover(ctx, L, easeInOut(span(t, tail + half, half)), first);
  }
  const { data } = ctx.getImageData(0, 0, L.w, L.h);
  return encodePng(new Uint32Array(data.buffer, data.byteOffset, L.w * L.h), L.w, L.h);
}

// ---------------------------------------------------------------- command line

function usage(problem: string): never {
  console.error(`render-tree-promo: ${problem}`);
  console.error("usage: pnpm tsx scripts/render-tree-promo.ts <outDir> [--frames 0,225,449] [--format vertical|square]");
  process.exit(2);
}

function parseArgs(argv: string[]): { outDir: string; frames: number[] | null; layouts: Layout[] } {
  let outDir: string | null = null;
  let frames: number[] | null = null;
  let layouts = Object.values(LAYOUTS);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--frames") {
      const list = (argv[++i] ?? "").split(",").map((v) => Number(v.trim()));
      if (!list.length || list.some((n) => !Number.isInteger(n) || n < 0 || n >= FRAMES)) usage(`--frames takes frame numbers 0 to ${FRAMES - 1}, comma separated`);
      frames = list;
    } else if (arg === "--format") {
      const name = argv[++i];
      if (name !== "vertical" && name !== "square") usage("--format is vertical or square");
      layouts = [LAYOUTS[name]];
    } else if (arg.startsWith("--")) {
      usage(`unknown option ${arg}`);
    } else if (outDir) {
      usage(`one output folder only (got ${outDir} and ${arg})`);
    } else {
      outDir = arg;
    }
  }
  if (!outDir) usage("missing <outDir>");
  return { outDir: resolve(outDir), frames, layouts };
}

/** ffmpeg from FFMPEG or PATH; exits with a clear message when there is none. */
function findFfmpeg(): string {
  const bin = process.env.FFMPEG || "ffmpeg";
  const probe = spawnSync(bin, ["-version"], { stdio: "ignore" });
  if (probe.error || probe.status !== 0) {
    console.error(`render-tree-promo: ffmpeg not found (tried "${bin}"). Install ffmpeg or set FFMPEG=/path/to/ffmpeg.`);
    console.error("A dry run (--frames) needs no ffmpeg.");
    process.exit(1);
  }
  return bin;
}

function ffmpeg(bin: string, args: string[]): void {
  const run = spawnSync(bin, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (run.error || run.status !== 0) {
    console.error(`render-tree-promo: ffmpeg failed: ${bin} ${args.join(" ")}`);
    process.exit(1);
  }
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function main(): void {
  const { outDir, frames, layouts } = parseArgs(process.argv.slice(2));
  const fontPath = resolve(FONT_FILE);
  if (!existsSync(fontPath)) {
    console.error(`render-tree-promo: ${FONT_FILE} not found. Run from the repo root.`);
    process.exit(1);
  }
  if (!GlobalFonts.registerFromPath(fontPath, FONT)) {
    console.error(`render-tree-promo: could not load ${FONT_FILE}.`);
    process.exit(1);
  }
  const bin = frames ? null : findFfmpeg();
  mkdirSync(outDir, { recursive: true });

  for (const L of layouts) {
    const size = `${L.w}x${L.h}`;
    if (frames) {
      const dir = join(outDir, "dry-run");
      mkdirSync(dir, { recursive: true });
      for (const n of frames) {
        const file = join(dir, `${L.name}-${String(n).padStart(4, "0")}.png`);
        writeFileSync(file, renderFrame(L, n));
        console.log(file);
      }
      continue;
    }

    const dir = join(outDir, `frames-${size}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (let n = 0; n < FRAMES; n++) {
      writeFileSync(join(dir, `${String(n).padStart(4, "0")}.png`), renderFrame(L, n));
      if (n % 90 === 0) console.log(`${L.name}: frame ${n}/${FRAMES}`);
    }

    const pattern = join(dir, "%04d.png");
    const mp4 = join(outDir, `tree-promo-${size}.mp4`);
    ffmpeg(bin!, ["-framerate", String(FPS), "-i", pattern, "-c:v", "libx264", "-preset", "slow", "-tune", "animation", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
    console.log(`${mp4} (${mb(statSync(mp4).size)})`);

    if (L.loop) {
      const gif = join(outDir, `tree-promo-${size}.gif`);
      const palette = "fps=20,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle";
      ffmpeg(bin!, ["-framerate", String(FPS), "-i", pattern, "-vf", palette, "-loop", "0", gif]);
      const bytes = statSync(gif).size;
      if (bytes > GIF_LIMIT_BYTES) {
        rmSync(gif);
        console.log(`GIF was ${mb(bytes)}, over Discord's 15 MB: removed, post ${mp4} instead.`);
      } else {
        console.log(`${gif} (${mb(bytes)})`);
      }
    }
  }
}

main();
