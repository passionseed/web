/**
 * The web island's ground, made richer: grass that varies in tone (with
 * fewer of the tiles' repeating marks), a turf edge where the grass steps
 * down to the beach, worn footpaths from the plots to the plaza (the helper
 * paths' edges softened to match), tufts and small flower patches, a few
 * low hedges and fence pieces, rocks, and
 * pebbles, shells and driftwood on the beach. Web only: the bot's PNG and GIF
 * keep their plain tiles.
 *
 * Stable: everything is seeded by its place relative to the plaza centre
 * (which never moves as the island grows) and depends only on the island's
 * layout (its size, which plots exist and the helper paths), never on a
 * plot's stage or flags, the viewer, the festival, the hour or the day, so the
 * ground never jumps between visits.
 *
 * Kept clear: nothing stands on a plot (its tree, flags, visitor, lantern,
 * signpost in every view, name board, tag, tap target or pin), a plaza piece
 * or tap target, a lamp, the bunting, a walk the plaza's people take (with a
 * fingertip's slop round every figure), a helper path, a footpath or another
 * piece. The footpaths are ground: they lead up to their own plot's signpost
 * and may pass under a walker, never under another plot. Nothing here is text.
 *
 * Pure and client-safe: it returns ink, per pixel, in the keys of a small
 * palette blended from the island's own colours; fx.ts grades it for the
 * hour (and the lamps' light) and bakes it into the land layer once per scene
 * and light. Nothing here runs per frame. Each tuft and flower patch also
 * keeps a bent frame (its tips one px downwind, over the ground it lies on)
 * for the breeze (ambient.ts), and the patches' bloom hearts for the
 * butterflies.
 */
import { SPRITES } from "@/bot/assets/island/sprites";
import { MOTION_SIZES, MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { TILE_BY_CODE, tagRect, type IslandScene, type SceneTree } from "@/bot/src/quests/island/scene";

import { dryShore, hash3 } from "./atmosphere";
import { CROWD_LAYOUT } from "./crowd";
import { lampRects, type SceneModel } from "./draw";
import { FIGURE_H, FIGURE_W, hitSlop } from "./figures";
import { union, type Rect } from "./geometry";
import type { RGB } from "./lighting";
import { PLAZA_LAYOUT, plazaCentre } from "./plaza";
import { BOARD, signpostFor } from "./signposts";

// ------------------------------------------------------------------ ink

/**
 * The terrain's palette: a palette key, or two blended (`t` of the second),
 * so the hour's grade and the lamps' light treat them like the tiles they sit
 * on; lilac, the one colour the island lacks, is its own.
 */
export type InkSpec = { key: string; mix?: string; t?: number } | { rgb: readonly [number, number, number] };

export const TERRAIN_INK: Readonly<Record<string, InkSpec>> = {
  // Grass: its own base (painting over a tile's mark), a lighter and a darker tone.
  g: { key: "g" },
  G: { key: "g", mix: "j", t: 0.32 },
  D: { key: "g", mix: "h", t: 0.62 },
  // Blades: tufts and the turf's edge.
  T: { key: "h", mix: "m", t: 0.38 },
  U: { key: "g", mix: "j", t: 0.75 },
  // Footpaths: the helper path's own earth, a sunlit speck, the shade under the grass's lip, and trodden grass at the edge.
  P: { key: "c", mix: "e", t: 0.12 },
  Q: { key: "c", mix: "e", t: 0.55 },
  R: { key: "c", mix: "b", t: 0.4 },
  E: { key: "h", mix: "c", t: 0.36 },
  // Sand in shade (under the turf's edge, and a path's track over the beach).
  S: { key: "s", mix: "d", t: 0.62 },
  // Rocks and pebbles: lit, mid, shade.
  K: { key: "a", mix: "i", t: 0.2 },
  L: { key: "t" },
  M: { key: "z" },
  // Flowers.
  p: { key: "p" },
  f: { key: "f" },
  y: { key: "y" },
  r: { key: "r" },
  V: { rgb: [186, 164, 222] },
  // Hedges: lit, body, shade.
  I: { key: "n", mix: "j", t: 0.25 },
  H: { key: "m", mix: "n", t: 0.3 },
  J: { key: "l", mix: "m", t: 0.3 },
  // Fence wood: lit, body, shade.
  W: { key: "e", mix: "i", t: 0.15 },
  X: { key: "c" },
  Y: { key: "b" },
  // Driftwood, bleached by the sea: lit, body, shade.
  A: { key: "i", mix: "t", t: 0.3 },
  B: { key: "d", mix: "t", t: 0.45 },
  C: { key: "b", mix: "t", t: 0.45 },
};

// ------------------------------------------------------------------ pieces

export type PieceKind = "hedge" | "fence" | "driftwood" | "rock" | "flowers" | "tuft" | "pebbles" | "shell";

/** Sprites per kind ('.' is clear); flowers use 1 for the bloom, 2 for its heart, recoloured per patch. */
const PIECES: Readonly<Record<PieceKind, readonly (readonly string[])[]>> = {
  hedge: [
    ["...IIII..III...", "..IIHHIIIIHHI..", ".IHHHHHHHHHHHI.", "IHHHHHHHHHHHHHI", "HHJHHHHJHHHHJHH", ".JJJJJJJJJJJJJ."],
    ["..III.II..", ".IIHHIIHI.", "IHHHHHHHHI", "HHJHHHJHHH", ".JJJJJJJJ."],
  ],
  fence: [
    [".W....W....W.", "WXY..WXY..WXY", "WWWWWWWWWWWWW", "XXYXXXXYXXXXY", "WXYWWWXYWWWXY", "XXYXXXXYXXXXY", ".XY...XY...XY"],
    [".W....W.", "WXY..WXY", "WWWWWWWW", "XXYXXXXY", "WXYWWWXY", "XXYXXXXY", ".XY...XY"],
  ],
  driftwood: [
    ["........A..", ".AAAAAAAAB.", "ABBBBBBBBBC", ".CCCCCCCCC."],
    ["..A.....", ".AAAAAB.", "ABBBBBBC", ".CCCCCC."],
  ],
  rock: [
    [".KK.", "KLLM", ".MM."],
    ["..KK..", ".KKLL.", "KLLLLM", ".MMMM."],
    [".KKL.", "KLLLM", ".MMM."],
  ],
  flowers: [
    [".1.....", "121..1.", ".1..121", ".T...1.", ".....T."],
    ["....1..", "1..121.", "T...1..", "..1.T..", "..T...."],
    [".1...", "121.1", ".1..T", "UT..."],
  ],
  tuft: [
    ["U.U.U", "T.T.T", ".TTT."],
    ["U..U", "T.UT", ".TT."],
    [".U.", "UTU", ".T."],
  ],
  pebbles: [["L..", "..K", ".M."], [".K.L", "M..."], ["K.", ".L"]],
  shell: [[".f.", "fpf"], ["fp", "pf"]],
};

/** A flower patch's colours: [bloom, heart]. */
const BLOOMS: readonly (readonly [string, string])[] = [
  ["p", "y"],
  ["f", "y"],
  ["V", "f"],
  ["r", "y"],
  ["f", "p"],
];

/** Pieces that stand up: drawn over their own soft shadow (fx.ts), the rest lie flat on the ground. */
const STANDING: ReadonlySet<PieceKind> = new Set<PieceKind>(["hedge", "fence", "driftwood", "rock"]);

interface Plan {
  kind: PieceKind;
  /** Grass, the beach, or grass near the beach (a fence round the garden). */
  on: "grass" | "beach" | "rim";
  /** Native px between candidates, and the share of them tried. */
  grid: number;
  chance: number;
  /** Clear px kept round it. */
  gap: number;
  /** Spots tried in each cell of the grid before giving it up (big pieces need a few to find room). */
  tries: number;
  salt: number;
}

/** In placing order: the big pieces first, so the little ones fill round them. Sparse on purpose. */
const PLANS: readonly Plan[] = [
  { kind: "hedge", on: "grass", grid: 80, chance: 0.5, gap: 6, tries: 10, salt: 11 },
  { kind: "fence", on: "rim", grid: 72, chance: 0.55, gap: 6, tries: 12, salt: 12 },
  { kind: "driftwood", on: "beach", grid: 90, chance: 0.6, gap: 6, tries: 8, salt: 13 },
  { kind: "rock", on: "grass", grid: 56, chance: 0.45, gap: 4, tries: 4, salt: 14 },
  { kind: "rock", on: "beach", grid: 52, chance: 0.4, gap: 4, tries: 4, salt: 15 },
  { kind: "flowers", on: "grass", grid: 30, chance: 0.6, gap: 3, tries: 4, salt: 16 },
  { kind: "tuft", on: "grass", grid: 15, chance: 0.55, gap: 2, tries: 2, salt: 17 },
  { kind: "pebbles", on: "beach", grid: 18, chance: 0.4, gap: 2, tries: 1, salt: 18 },
  { kind: "shell", on: "beach", grid: 36, chance: 0.35, gap: 2, tries: 2, salt: 19 },
];

/** How near the beach (px) a fence stands: round the garden's rim, never in its middle. */
const RIM_REACH = 14;

export interface TerrainPiece {
  kind: PieceKind;
  /** Its sprite's box, scene px. */
  rect: Rect;
}

/**
 * A tuft or flower patch the breeze can bend (ambient.ts): its tips (a
 * tuft's light blades, a patch's blooms) lean one pixel downwind, to the
 * right, the way the gusts cross the island.
 */
export interface SwayPiece {
  kind: "tuft" | "flowers";
  /** The piece as it lies, scene px. */
  rect: Rect;
  /** The bent frame's box: the piece's, one px wider. */
  box: Rect;
  /**
   * Per pixel of `box`, the ink of the bent frame (TERRAIN_INK codes; 0: the
   * tile's own pixel), with the ground the piece lies on where its tips left.
   */
  bent: Uint8Array;
  /** A flower patch's bloom hearts, scene px (where a butterfly settles); none for a tuft. */
  hearts: { x: number; y: number }[];
}

export interface Terrain {
  width: number;
  height: number;
  /** Per pixel, an ink key's char code (TERRAIN_INK), 0 for none: lying on the ground, under every shadow. */
  ground: Uint8Array;
  /** Per pixel, the same for the pieces that stand up: over their shadows. */
  props: Uint8Array;
  /** Where each layer may have ink (null: none), so a bake only walks that. */
  groundBox: Rect | null;
  propsBox: Rect | null;
  /** Contact shadows under the standing pieces, before the sun's lean. */
  shadows: Rect[];
  pieces: TerrainPiece[];
  /** The tufts and flower patches on the grass, with their bent frames: the breeze's (ambient.ts). */
  sway: SwayPiece[];
  /** Each footpath's centre line, scene px. */
  trails: { x: number; y: number }[][];
  /** Per pixel, 1 on a footpath or its trodden edge. */
  paths: Uint8Array;
}

// ------------------------------------------------------------------ ground kinds

/** What a pixel is: open sea or foam, grass, beach, the plaza's stone, a helper path. */
const SEA = 0;
const GRASS = 1;
const SAND = 2;
const PLAZA = 3;
const PATH = 4;

const GRASS_TILES = new Set(["grass_a", "grass_b", "grass_c"]);
const SAND_TILES = new Set(["sand", "sand_b"]);
const SHORE_INDEX: Readonly<Record<string, number>> = { shore_n: 0, shore_s: 1, shore_e: 2, shore_w: 3 };

interface Kinds {
  /** Every pixel's kind as the layout makes it: a helper path's cells count as grass, so pieces are placed the same with or without one. */
  base: Uint8Array;
  /** The same with the helper paths. */
  real: Uint8Array;
  /** Per tile: 1 where no turf edge can be (no beach in the 8 tiles round it). */
  inland: Uint8Array;
  /** The box round every tile that is not open sea, px. */
  land: Rect | null;
}

function groundKinds(scene: IslandScene): Kinds {
  const { width: W, cols, rows } = scene;
  const t = scene.tile;
  const base = new Uint8Array(W * scene.height);
  const cellKind = new Uint8Array(cols * rows);
  const dry = dryShore();
  let c0 = cols;
  let r0 = rows;
  let c1 = -1;
  let r1 = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const name = TILE_BY_CODE[scene.tiles[r * cols + c]];
      let kind = SEA;
      if (GRASS_TILES.has(name)) kind = GRASS;
      else if (SAND_TILES.has(name)) kind = SAND;
      else if (name === "plaza") kind = PLAZA;
      const shore = SHORE_INDEX[name];
      cellKind[r * cols + c] = shore != null ? SAND : kind;
      if (kind !== SEA || shore != null) {
        c0 = Math.min(c0, c);
        r0 = Math.min(r0, r);
        c1 = Math.max(c1, c);
        r1 = Math.max(r1, r);
      }
      for (let py = 0; py < t; py++) {
        const row = (r * t + py) * W + c * t;
        if (shore != null) {
          const mask = dry[shore];
          for (let px = 0; px < t; px++) base[row + px] = mask[py * 16 + px] ? SAND : SEA;
        } else base.fill(kind, row, row + t);
      }
    }
  }
  const real = base.slice();
  for (const cell of scene.paths) {
    const c = cell % cols;
    const r = Math.floor(cell / cols);
    cellKind[cell] = PATH;
    for (let py = 0; py < t; py++) real.fill(PATH, (r * t + py) * W + c * t, (r * t + py) * W + c * t + t);
  }
  const inland = new Uint8Array(cols * rows);
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      let beach = false;
      for (let dr = -1; dr <= 1 && !beach; dr++) for (let dc = -1; dc <= 1 && !beach; dc++) beach = cellKind[(r + dr) * cols + c + dc] === SAND;
      inland[r * cols + c] = beach ? 0 : 1;
    }
  }
  const land = c1 < 0 ? null : { x: c0 * t, y: r0 * t, w: (c1 - c0 + 1) * t, h: (r1 - r0 + 1) * t };
  return { base, real, inland, land };
}

// ------------------------------------------------------------------ keep clear

/**
 * One plot's room: what another plot's footpath passes round (`body`: what
 * stands there close up), and what a piece keeps off (`all`: that, the tap
 * target, the slop round its people, the bot's tag and the pin).
 */
export interface PlotRoom {
  slot: number;
  body: Rect[];
  all: Rect[];
  /** Where its footpath ends: just under its signpost's foot. */
  door: { x: number; y: number };
}

const grow = (r: Rect, dx: number, dy = dx): Rect => ({ x: r.x - dx, y: r.y - dy, w: r.w + 2 * dx, h: r.h + 2 * dy });

/**
 * The smallest close-up scale (CSS px per native px) the island is shown at:
 * pxPerNativeFor on any phone, or a desktop zoomed to 120%. A figure's tap
 * slop is widest there.
 */
const MIN_CLOSE_SCALE = 1.6;
/** A figure's tap slop at that scale (figures.ts), native px each way. */
export const SLOP = hitSlop(MIN_CLOSE_SCALE, false);
const PERSON = { w: FIGURE_W, h: FIGURE_H } as const;
/** A plot's tap target close up is at least 48 CSS px square (IslandViewport), native px at the smallest scale. */
const PLOT_TAP = Math.ceil(48 / MIN_CLOSE_SCALE);

/**
 * What any tree draws, at any stage (and swaying): per row of the 32 x 40
 * sprite, the inked columns of them all, as bands of rows with the same
 * span. A path may pass behind a short tree's empty rows, never under ink.
 */
const TREE_INK: readonly Rect[] = (() => {
  const names = ["stage_seed", ...Array.from({ length: 8 }, (_, k) => `stage_${k}`), ...Array.from({ length: 6 }, (_, k) => `stage_${k + 2}_b`)];
  const rows = names.map((n) => (SPRITES as Record<string, string[]>)[n] ?? (MOTION_SPRITES as Record<string, string[]>)[n]).filter((r) => r?.length);
  const h = rows[0].length;
  const spans: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    let x0 = Infinity;
    let x1 = -1;
    for (const sprite of rows) {
      const row = sprite[y] ?? "";
      for (let x = 0; x < row.length; x++) {
        if (row[x] === ".") continue;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
      }
    }
    spans.push([x0, x1]);
  }
  const out: Rect[] = [];
  for (let y = 0; y < h; y++) {
    const [x0, x1] = spans[y];
    if (x1 < 0) continue;
    const last = out[out.length - 1];
    if (last && last.y + last.h === y && last.x === x0 && last.w === x1 - x0 + 1) last.h++;
    else out.push({ x: x0, y, w: x1 - x0 + 1, h: 1 });
  }
  return out;
})();

/**
 * Everything a plot can show on the living island, whatever its stage or
 * flags: its tree, the soil's shadow at every lean, a key flag, a first
 * partner (and the story's builder and tester), a lantern, a booth flag, its
 * signpost close up (plain, and with a name's board) with its shadow, the
 * board itself, its tap target (the tree and the tag under it, at the
 * scene's `glyph`, and the 48px floor round its centre), and the pin over
 * it: no piece stands in any of it. The whole island's bigger post stands
 * over whatever lies there: that view is too small for it to matter.
 *
 * A footpath keeps off less (`body`): what any tree of any stage draws, the
 * soil's shadow, the signpost and the tag. The flags, lantern and people that
 * come and go with a plot's milestones may stand at a path's edge, so a path
 * never moves when they come.
 */
export function plotRoom(tree: Pick<SceneTree, "slot" | "left" | "top" | "w" | "h">, glyph: number): PlotRoom {
  const { left, top, w, h } = tree;
  const cx = left + Math.floor(w / 2);
  const flag = { x: left - 6, y: top + h - 22, w: 10, h: 16 };
  const partner = { x: left + w - 2, y: top + h - 18, ...PERSON };
  const builder = { x: left + 2 - PERSON.w, y: top + h - 4 - PERSON.h, ...PERSON };
  const lantern = { x: left + w + 6, y: top + h - 20, w: 8, h: 14 };
  const booth = { x: left + 4, y: top + 22, w: 7, h: 12 };
  const tag = tagRect(tree.slot, cx, top + h, glyph);
  // The plot's tap target: the tree and its tag, and at least PLOT_TAP square round their centre.
  const tap = union({ x: left, y: top, w, h }, tag);
  const tapFloor = {
    x: Math.min(tap.x, Math.floor(tap.x + tap.w / 2 - PLOT_TAP / 2)),
    y: Math.min(tap.y, Math.floor(tap.y + tap.h / 2 - PLOT_TAP / 2)),
    w: Math.max(tap.w, PLOT_TAP),
    h: Math.max(tap.h, PLOT_TAP),
  };
  const body: Rect[] = [
    ...TREE_INK.map((r) => ({ ...r, x: left + r.x, y: top + r.y })),
    // The soil's contact shadow, leaning up to 2 px either way.
    { x: left - 2, y: top + 29, w: w + 4, h: 12 },
    booth,
    tag,
  ];
  // A fingertip's slop round the people who stand there, and the pin over the tallest tree.
  const pin = 9 * glyph + 2;
  const all: Rect[] = [
    tap,
    tapFloor,
    { x: left - 2, y: top + 29, w: w + 4, h: 12 },
    flag,
    partner,
    lantern,
    booth,
    ...[flag, partner, builder].map((r) => grow(r, SLOP.x, SLOP.y)),
    { x: cx - Math.ceil(pin / 2), y: top - pin, w: pin, h: pin },
  ];
  let door = { x: cx, y: top + h + 13 };
  for (const hung of [false, true]) {
    const post = signpostFor(tree, 1, hung);
    const standing = union(post.rect, grow(post.shadow, 2, 0));
    body.push(standing);
    all.push(standing);
    // A name's board hangs over the ground: a path may pass under it, a piece may not.
    if (post.hang) all.push({ x: Math.floor(post.hang.cx - BOARD.maxW / 2) - 1, y: post.hang.y, w: BOARD.maxW + 2, h: BOARD.h + 1 });
    if (!hung) door = { x: post.x + Math.floor(post.rect.w / 2), y: post.rect.y + post.rect.h };
  }
  return { slot: tree.slot, body, all, door };
}

/** The plaza's own room: its stone, lamps, bunting, every piece and tap target, and its people's walks. */
export function plazaRoom(model: SceneModel): { stone: Rect | null; trail: Rect[]; props: Rect[] } {
  const { scene } = model;
  const c = plazaCentre(scene);
  const at = (dx: number, dy: number, w: number, h: number): Rect => ({ x: c.x + dx, y: c.y + dy, w, h });
  const box = (r: { x: number; y: number; w: number; h: number }) => at(r.x, r.y, r.w, r.h);
  const L = PLAZA_LAYOUT;
  const plaza = plazaStone(scene);
  const banner = SPRITES.banner;
  const bw = banner[0].length;
  const bh = banner.length;
  // The bunting stands over the plaza's top edge while a season runs: always kept, so a season never moves a thing.
  const bunting = { x: c.x - bw / 2, y: (plaza?.y ?? c.y) - bh + 4, w: bw, h: bh };
  const poles = [
    { x: bunting.x - 1, y: bunting.y, w: 6, h: bh },
    { x: bunting.x + bw - 5, y: bunting.y, w: 6, h: bh },
  ];
  const size = (name: keyof typeof MOTION_SIZES, p: readonly [number, number]) => at(p[0], p[1], MOTION_SIZES[name][0], MOTION_SIZES[name][1]);
  const pieces: Rect[] = [
    box(L.noticeSpot),
    box(L.stageSpot),
    box(L.campfireSpot),
    box(L.prizeSpot),
    size("fest_count", L.countdown),
    size("fest_stage_0", L.stage),
    size("notice_board", L.noticeBoard),
    size("prize_board", L.prizeBoard),
    ...lampRects(model).map((r) => grow(r, 2)),
  ];
  // The walks: every frame of every route, with a fingertip's slop and the shadow under the feet.
  const walk = (a: readonly [number, number], b: readonly [number, number]) =>
    grow(union(at(a[0], a[1], PERSON.w, PERSON.h), at(b[0], b[1], PERSON.w, PERSON.h)), SLOP.x, SLOP.y);
  const walks: Rect[] = [
    ...CROWD_LAYOUT.routes.map(([a, b]) => walk(a, b)),
    walk(CROWD_LAYOUT.enter, CROWD_LAYOUT.home),
    ...CROWD_LAYOUT.team.map((p) => walk(p, p)),
  ];
  const stone = plaza ? [plaza] : [];
  return { stone: plaza, trail: [...stone, ...poles, ...pieces], props: [...stone, bunting, ...pieces, ...walks] };
}

/** The plaza's stone in px, from its tiles. */
function plazaStone(scene: IslandScene): Rect | null {
  let c0 = Infinity;
  let r0 = Infinity;
  let c1 = -1;
  let r1 = -1;
  for (let k = 0; k < scene.tiles.length; k++) {
    if (TILE_BY_CODE[scene.tiles[k]] !== "plaza") continue;
    const c = k % scene.cols;
    const r = Math.floor(k / scene.cols);
    c0 = Math.min(c0, c);
    r0 = Math.min(r0, r);
    c1 = Math.max(c1, c);
    r1 = Math.max(r1, r);
  }
  if (c1 < 0) return null;
  const t = scene.tile;
  return { x: c0 * t, y: r0 * t, w: (c1 - c0 + 1) * t, h: (r1 - r0 + 1) * t };
}

/** A per-pixel mask with rectangles stamped in (clipped to the scene). */
class Mask {
  readonly bits: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number
  ) {
    this.bits = new Uint8Array(w * h);
  }
  stamp(r: Rect, v = 1): void {
    const x0 = Math.max(0, Math.floor(r.x));
    const y0 = Math.max(0, Math.floor(r.y));
    const x1 = Math.min(this.w, Math.ceil(r.x + r.w));
    const y1 = Math.min(this.h, Math.ceil(r.y + r.h));
    for (let y = y0; y < y1; y++) this.bits.fill(v, y * this.w + x0, y * this.w + x1);
  }
  /** Any set pixel in the rect, or any part of it off the scene. */
  hits(r: Rect): boolean {
    if (r.x < 0 || r.y < 0 || r.x + r.w > this.w || r.y + r.h > this.h) return true;
    for (let y = r.y; y < r.y + r.h; y++) {
      const row = y * this.w;
      for (let x = r.x; x < r.x + r.w; x++) if (this.bits[row + x]) return true;
    }
    return false;
  }
}

/** Summed-area table of a mask: any set pixel in a rect, in O(1). */
class Sums {
  private readonly s: Int32Array;
  private readonly sw: number;
  constructor(
    bits: Uint8Array,
    private readonly w: number,
    private readonly h: number,
    want = 1
  ) {
    this.sw = w + 1;
    this.s = new Int32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let run = 0;
      for (let x = 0; x < w; x++) {
        run += bits[y * w + x] === want ? 1 : 0;
        this.s[(y + 1) * this.sw + x + 1] = this.s[y * this.sw + x + 1] + run;
      }
    }
  }
  /** Any set pixel in [x0, x1) x [y0, y1); a rect reaching off the scene counts as set. */
  any(x0: number, y0: number, x1: number, y1: number): boolean {
    if (x0 < 0 || y0 < 0 || x1 > this.w || y1 > this.h) return true;
    return this.count(x0, y0, x1, y1) > 0;
  }
  /** Set pixels in the rect, clipped to the scene. */
  count(x0: number, y0: number, x1: number, y1: number): number {
    const a = Math.max(0, x0);
    const b = Math.max(0, y0);
    const c = Math.min(this.w, x1);
    const d = Math.min(this.h, y1);
    if (c <= a || d <= b) return 0;
    const s = this.s;
    const sw = this.sw;
    return s[d * sw + c] - s[b * sw + c] - s[d * sw + a] + s[b * sw + a];
  }
}

// ------------------------------------------------------------------ noise

/** Smooth value noise on a lattice `cell` px apart, keyed to the plaza centre: precomputed per column and row, so a pixel is a few multiplies. */
class Noise {
  private readonly vals: Float32Array;
  private readonly nx: number;
  private readonly ix: Int32Array;
  private readonly tx: Float32Array;
  private readonly iy: Int32Array;
  private readonly ty: Float32Array;
  constructor(w: number, h: number, origin: { x: number; y: number }, cell: number, salt: number) {
    const lo = (v: number) => Math.floor(v / cell);
    const x0 = lo(-origin.x);
    const y0 = lo(-origin.y);
    this.nx = lo(w - origin.x) - x0 + 2;
    const ny = lo(h - origin.y) - y0 + 2;
    this.vals = new Float32Array(this.nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < this.nx; i++) this.vals[j * this.nx + i] = hash3(x0 + i, y0 + j, salt);
    const smooth = (f: number) => f * f * (3 - 2 * f);
    this.ix = new Int32Array(w);
    this.tx = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      const f = (x - origin.x) / cell;
      this.ix[x] = Math.floor(f) - x0;
      this.tx[x] = smooth(f - Math.floor(f));
    }
    this.iy = new Int32Array(h);
    this.ty = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      const f = (y - origin.y) / cell;
      this.iy[y] = Math.floor(f) - y0;
      this.ty[y] = smooth(f - Math.floor(f));
    }
  }
  at(x: number, y: number): number {
    const i = this.iy[y] * this.nx + this.ix[x];
    const v = this.vals;
    const a = v[i];
    const b = v[i + 1];
    const c = v[i + this.nx];
    const d = v[i + this.nx + 1];
    const tx = this.tx[x];
    const ty = this.ty[y];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }
}

// ------------------------------------------------------------------ the build

const code = (ch: string) => ch.charCodeAt(0);
const INK_CODE = Object.fromEntries(Object.keys(TERRAIN_INK).map((k) => [k, code(k)])) as Record<string, number>;

/** The grass tiles' marks, grouped: per tile, per pixel, which mark it belongs to (0 none). */
const MARKS: ReadonlyMap<string, Uint8Array> = (() => {
  const out = new Map<string, Uint8Array>();
  for (const name of GRASS_TILES) {
    const rows = SPRITES[name];
    const label = new Uint8Array(256);
    let next = 0;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (rows[y][x] === "g" || label[y * 16 + x]) continue;
        next++;
        const stack = [[x, y]];
        label[y * 16 + x] = next;
        while (stack.length) {
          const [px, py] = stack.pop()!;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = px + dx;
              const ny = py + dy;
              if (nx < 0 || ny < 0 || nx > 15 || ny > 15 || rows[ny][nx] === "g" || label[ny * 16 + nx]) continue;
              label[ny * 16 + nx] = next;
              stack.push([nx, ny]);
            }
          }
        }
      }
    }
    out.set(name, label);
  }
  return out;
})();

/** Thresholds of the grass's tone field: below LIGHT a lighter green, above DARK a deeper one, speckled a few px at the edge. */
const TONE_LIGHT = 0.37;
const TONE_DARK = 0.63;
const TONE_SOFT = 0.07;

/** White noise fixed in world space, 64 px square: an edge that frays like grass, never an ordered (screen-door) dither. */
const SPECKLE = (() => {
  const out = new Float32Array(64 * 64);
  for (let i = 0; i < out.length; i++) out[i] = hash3(i & 63, i >> 6, 23);
  return out;
})();
const speckle = (x: number, y: number) => SPECKLE[((y & 63) << 6) | (x & 63)];
/** Share of the tiles' little marks left in place: the rest are painted over, so the grass stops repeating every tile. */
const MARKS_KEPT = 0.45;

type Rnd = (x: number, y: number, salt: number) => number;

/** The last few islands' terrain, by layout: the viewport and the story's panels share one. */
const built = new Map<string, Terrain>();

/** What the terrain depends on: the island's size and tiles, the helper paths and where each plot stands. */
function layoutKey(scene: IslandScene): string {
  return JSON.stringify([
    scene.width,
    scene.height,
    scene.tile,
    scene.glyph,
    scene.well,
    scene.tiles,
    scene.paths,
    scene.trees.map((t) => [t.slot, t.left, t.top, t.w, t.h]),
  ]);
}

/**
 * The island's terrain: ground ink, standing pieces with their shadows, and
 * the footpaths. Deterministic for a scene's layout; built once per layout.
 */
export function terrainFor(model: SceneModel): Terrain {
  const steps = terrainSteps(model);
  for (;;) {
    const step = steps.next();
    if (step.done) return step.value;
  }
}

/**
 * The same, a slice at a time: each next() does one part of the work (the
 * ground's kinds, the grass, its edges, the routing grid, a dozen plots'
 * routes, the paths' shape, their ink, the pieces), so a caller can spread a
 * new layout's build over a few frames. A layout built before comes back at
 * once.
 */
export function* terrainSteps(model: SceneModel): Generator<void, Terrain, void> {
  const key = layoutKey(model.scene);
  const cached = built.get(key);
  if (cached) return cached;
  const terrain = yield* buildTerrain(model);
  if (built.size >= 2) built.delete(built.keys().next().value as string);
  built.set(key, terrain);
  return terrain;
}

function* buildTerrain(model: SceneModel): Generator<void, Terrain, void> {
  const { scene } = model;
  const W = scene.width;
  const H = scene.height;
  const c = plazaCentre(scene);
  const kinds = groundKinds(scene);
  const { base, real } = kinds;
  const ground = new Uint8Array(W * H);
  const props = new Uint8Array(W * H);
  const rooms = scene.trees.map((tree) => plotRoom(tree, scene.glyph));
  const plaza = plazaRoom(model);
  const rnd: Rnd = (x, y, salt) => hash3(x - c.x, y - c.y, salt);
  yield;
  const tones = new Tones(W, H, c);
  paintGrass(scene, real, ground, tones, c);
  yield;
  paintEdges(scene, kinds, ground, rnd);
  yield;
  const routed = plaza.stone && rooms.length ? yield* route(scene, base, rooms, plaza.stone, plaza.trail, c) : null;
  yield;
  // Pieces keep off every plot, the plaza's room, the paths (and a pixel round them) and each other.
  const taken = new Mask(W, H);
  const trails = yield* paintTrails(scene, real, ground, taken, routed, c, rnd);
  // So far `taken` holds just the footpaths and the room round them: a helper path meets them without a seam.
  softenHelperPaths(scene, real, ground, taken.bits, tones, c, rnd);
  yield;
  for (const room of rooms) for (const r of room.all) taken.stamp(grow(r, 1));
  for (const r of plaza.props) taken.stamp(grow(r, 1));
  const pieces: TerrainPiece[] = [];
  const sand = new Sums(base, W, H, SAND);
  for (const plan of PLANS) placePieces(plan, scene, base, sand, taken, c, rnd, pieces);
  // A helper path takes the ground under it: pieces there are left out (placement never depends on them).
  const onPath = (r: Rect) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (real[y * W + x] === PATH) return true;
    return false;
  };
  const kept = pieces.filter((p) => !onPath(p.rect));
  const shadows: Rect[] = [];
  const sway: SwayPiece[] = [];
  let propsBox: Rect | null = null;
  for (const p of kept) {
    const standing = STANDING.has(p.kind);
    const layer = standing ? props : ground;
    const rows = pieceRows(p, rnd);
    // A tuft or a flower patch keeps a bent frame, over the ground it is about to cover (pieces never share that ground).
    if (p.kind === "tuft" || p.kind === "flowers") sway.push(swayPiece(p.kind, p.rect, rows, pieceVariant(p, rnd), ground, W));
    for (let j = 0; j < rows.length; j++) {
      for (let i = 0; i < rows[j].length; i++) {
        const ch = rows[j][i];
        if (ch === ".") continue;
        layer[(p.rect.y + j) * W + p.rect.x + i] = INK_CODE[ch];
      }
    }
    if (!standing) continue;
    shadows.push(shadowUnder(p.rect));
    propsBox = propsBox ? union(propsBox, p.rect) : p.rect;
  }
  return {
    width: W,
    height: H,
    ground,
    props,
    // Ground ink lies on the land and the turf's edge just past it.
    groundBox: kinds.land,
    propsBox,
    shadows,
    pieces: kept,
    sway,
    trails: trails.lines,
    paths: trails.mask,
  };
}

/** A standing piece's soft shadow: a flat ellipse under its foot, a little wider than it. */
function shadowUnder(r: Rect): Rect {
  const w = Math.max(6, r.w + 2);
  const h = w >= 12 ? 4 : 3;
  return { x: r.x + Math.floor((r.w - w) / 2), y: r.y + r.h - h + 2, w, h };
}

/** A piece's variant of its kind's sprites (a flower patch's still in 1 and 2). */
function pieceVariant(p: TerrainPiece, rnd: Rnd): readonly string[] {
  const variants = PIECES[p.kind];
  return variants[Math.floor(rnd(p.rect.x, p.rect.y, 101) * variants.length) % variants.length];
}

/** The rows a piece is drawn with: its variant, a flower patch in its colours. */
function pieceRows(p: TerrainPiece, rnd: Rnd): readonly string[] {
  const rows = pieceVariant(p, rnd);
  if (p.kind !== "flowers") return rows;
  const [bloom, heart] = BLOOMS[Math.floor(rnd(p.rect.x, p.rect.y, 103) * BLOOMS.length) % BLOOMS.length];
  return rows.map((row) => row.replace(/1/g, bloom).replace(/2/g, heart));
}

/**
 * A piece's rows bent downwind, one column wider than the piece: a tuft's
 * top row (its blades' tips) and a flower patch's blooms move one px to the
 * right, over whatever they meet; the rest (the blades' feet, the stems)
 * stays, so the piece leans rather than slides.
 */
export function bentRows(kind: SwayPiece["kind"], rows: readonly string[]): string[] {
  const tip = (ch: string, j: number) => ch !== "." && (kind === "tuft" ? j === 0 : ch !== "T" && ch !== "U");
  return rows.map((row, j) => {
    const out = [...row, "."];
    for (let i = 0; i < row.length; i++) if (tip(row[i], j)) out[i] = ".";
    for (let i = 0; i < row.length; i++) if (tip(row[i], j)) out[i + 1] = row[i];
    return out.join("");
  });
}

/** A tuft's or a flower patch's bent frame, over the ground under it (read before the piece is laid on it). */
function swayPiece(kind: SwayPiece["kind"], rect: Rect, rows: readonly string[], variant: readonly string[], ground: Uint8Array, W: number): SwayPiece {
  const box = { x: rect.x, y: rect.y, w: rect.w + 1, h: rect.h };
  const bent = new Uint8Array(box.w * box.h);
  for (let j = 0; j < box.h; j++) bent.set(ground.subarray((box.y + j) * W + box.x, (box.y + j) * W + box.x + box.w), j * box.w);
  bentRows(kind, rows).forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== ".") bent[j * box.w + i] = INK_CODE[row[i]];
  });
  const hearts: { x: number; y: number }[] = [];
  if (kind === "flowers") variant.forEach((row, j) => [...row].forEach((ch, i) => ch === "2" && hearts.push({ x: rect.x + i, y: rect.y + j })));
  return { kind, rect, box, bent, hearts };
}

// ------------------------------------------------------------------ grass

/** The grass's tone at a pixel: a lighter or a darker green's ink, or 0 for the tile's own. */
class Tones {
  private readonly broad: Noise;
  private readonly fine: Noise;
  constructor(w: number, h: number, c: { x: number; y: number }) {
    this.broad = new Noise(w, h, c, 46, 21);
    this.fine = new Noise(w, h, c, 17, 22);
  }
  at(x: number, y: number): number {
    const v = this.broad.at(x, y) * 0.64 + this.fine.at(x, y) * 0.36 + (speckle(x, y) - 0.5) * TONE_SOFT;
    return v < TONE_LIGHT ? INK_CODE.G : v > TONE_DARK ? INK_CODE.D : 0;
  }
}

/** Tones over the grass, and most of the tiles' repeating marks painted over. */
function paintGrass(scene: IslandScene, real: Uint8Array, ground: Uint8Array, tones: Tones, c: { x: number; y: number }): void {
  const W = scene.width;
  const t = scene.tile;
  const g = INK_CODE.g;
  for (let r = 0; r < scene.rows; r++) {
    for (let col = 0; col < scene.cols; col++) {
      const name = TILE_BY_CODE[scene.tiles[r * scene.cols + col]];
      if (!GRASS_TILES.has(name) || real[r * t * W + col * t] === PATH) continue;
      const rows = SPRITES[name];
      const marks = MARKS.get(name)!;
      // grass_c's flowers stay: only the plain tiles' marks thin out.
      const thin = name !== "grass_c";
      for (let py = 0; py < t; py++) {
        const y = r * t + py;
        for (let px = 0; px < t; px++) {
          const x = col * t + px;
          const tone = tones.at(x, y);
          if (rows[py][px] === "g") {
            if (tone) ground[y * W + x] = tone;
            continue;
          }
          const mark = marks[py * 16 + px];
          if (thin && hash3(col - (c.x >> 4), r - (c.y >> 4), mark) >= MARKS_KEPT) ground[y * W + x] = tone || g;
        }
      }
    }
  }
}

/**
 * Where the grass meets the beach: a lit lip and a dark, ragged face where
 * the turf steps down to the sand, with a band of shade under it (a sense of
 * height), and blades poking up and out at the other edges. Only the tiles at
 * an edge are walked.
 */
function paintEdges(scene: IslandScene, kinds: Kinds, ground: Uint8Array, rnd: Rnd): void {
  const W = scene.width;
  const H = scene.height;
  const t = scene.tile;
  const { real, inland } = kinds;
  const kind = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? SEA : real[y * W + x]);
  const ink = (x: number, y: number, ch: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H) ground[y * W + x] = ch;
  };
  const { G, T, S, U, D } = INK_CODE;
  for (let r = 0; r < scene.rows; r++) {
    for (let col = 0; col < scene.cols; col++) {
      if (inland[r * scene.cols + col]) continue;
      for (let y = r * t; y < (r + 1) * t; y++) {
        // Inside a tile the grass only meets grass: just its border pixels can face the beach.
        const rim = y === r * t || y === (r + 1) * t - 1;
        for (let x = col * t; x < (col + 1) * t; x += rim || x === (col + 1) * t - 1 ? 1 : t - 1) {
          if (real[y * W + x] !== GRASS) continue;
          const below = kind(x, y + 1);
          const above = kind(x, y - 1);
          // The turf steps down to the beach: a lit lip, a ragged dark face, and shade on the sand.
          if (below === SAND) {
            ink(x, y, G);
            const face = 1 + (rnd(x, y, 31) < 0.45 ? 1 : 0) + (rnd(x, y, 32) < 0.1 ? 1 : 0);
            let d = 1;
            for (; d <= face && kind(x, y + d) === SAND; d++) ink(x, y + d, T);
            if (kind(x, y + d) === SAND) ink(x, y + d, S);
            if (kind(x, y + d + 1) === SAND && speckle(x, y + d + 1) < 0.5) ink(x, y + d + 1, S);
          }
          // Blades poking up into the sand.
          if (above === SAND && rnd(x, y, 34) < 0.32) {
            ink(x, y - 1, U);
            if (rnd(x, y, 35) < 0.15 && kind(x, y - 2) === SAND) ink(x, y - 2, U);
          }
          // And out at the sides.
          for (let dx = -1; dx <= 1; dx += 2) {
            if (kind(x + dx, y) === SAND && rnd(x, y, 36 + dx) < 0.36) ink(x + dx, y, D);
          }
        }
      }
    }
  }
}

// ------------------------------------------------------------------ helper paths

/**
 * The grass grows over a helper path's pixel where more than this share of
 * the 9 x 9 px round it is open grass (its outer pixel along a straight edge,
 * two or three at a corner, which rounds it), give or take the wander.
 */
const OVERGROWN = 0.42;
const OVERGROWN_WANDER = 0.08;
const OVERGROWN_REACH = 4;

/**
 * A helper path's tiles, softened to match the footpaths: the grass grows
 * over its outer pixel or two on a wandering line (so its corners round
 * off), the grass's lip shades its upper edge, and trodden grass frays along
 * it. Never where it meets the plaza, the beach or a footpath (`near`).
 */
function softenHelperPaths(scene: IslandScene, real: Uint8Array, ground: Uint8Array, near: Uint8Array, tones: Tones, c: { x: number; y: number }, rnd: Rnd): void {
  if (scene.paths.length === 0) return;
  const W = scene.width;
  const H = scene.height;
  const t = scene.tile;
  const wander = new Noise(W, H, c, 7, 44);
  const cells = scene.paths.map((cell) => ({ x: (cell % scene.cols) * t, y: Math.floor(cell / scene.cols) * t }));
  // The open grass round the paths (not a footpath's edge), summed over their box, so each pixel's share is a few reads.
  const k = OVERGROWN_REACH;
  let box: Rect = { x: cells[0].x, y: cells[0].y, w: t, h: t };
  for (const cell of cells) box = union(box, { x: cell.x, y: cell.y, w: t, h: t });
  const bx = box.x - k;
  const by = box.y - k;
  const bw = box.w + 2 * k;
  const bh = box.h + 2 * k;
  const open = new Uint8Array(bw * bh);
  for (let y = Math.max(0, by); y < Math.min(H, by + bh); y++) {
    for (let x = Math.max(0, bx); x < Math.min(W, bx + bw); x++) {
      const i = y * W + x;
      if (real[i] === GRASS && !near[i]) open[(y - by) * bw + (x - bx)] = 1;
    }
  }
  const sums = new Sums(open, bw, bh);
  const area = (2 * k + 1) * (2 * k + 1);
  // Per pixel of the box: 2 for a path pixel the grass grows over, 1 for one left bare.
  const state = new Uint8Array(bw * bh);
  for (const cell of cells) {
    for (let y = cell.y; y < cell.y + t; y++) {
      for (let x = cell.x; x < cell.x + t; x++) {
        const b = (y - by) * bw + (x - bx);
        const share = sums.count(x - bx - k, y - by - k, x - bx + k + 1, y - by + k + 1) / area;
        if (share <= OVERGROWN + (wander.at(x, y) - 0.5) * 2 * OVERGROWN_WANDER) {
          state[b] = 1;
          continue;
        }
        state[b] = 2;
        ground[y * W + x] = tones.at(x, y) || INK_CODE.g;
      }
    }
  }
  for (const cell of cells) {
    for (let y = cell.y; y < cell.y + t; y++) {
      for (let x = cell.x; x < cell.x + t; x++) {
        const b = (y - by) * bw + (x - bx);
        if (state[b] === 2) {
          // Trodden grass along the new edge.
          const edge = state[b - 1] === 1 || state[b + 1] === 1 || state[b - bw] === 1 || state[b + bw] === 1;
          if (edge && rnd(x, y, 45) < FRINGE_NEAR) ground[y * W + x] = INK_CODE.E;
        } else if (state[b - bw] === 2 || open[b - bw]) {
          // The path lies a little lower than the turf: shade under its lip.
          ground[y * W + x] = INK_CODE.R;
        }
      }
    }
  }
}

// ------------------------------------------------------------------ footpaths

/** The routing grid: native px per cell. */
const CELL = 4;
/** Clear px a routing cell keeps round it: a path's edge may just reach a sprite's box, never what is drawn in it. */
const TRAIL_CLEAR = 1;
/** How far (px) from its signpost a path may cross the beach: it steps off the sand, never runs along it. */
const BEACH_STEP = 28;
/** What it costs (in cells walked) to meet the plaza away from its gates and the paths already laid. */
const EDGE_JOIN = 10;
/** Half widths: where a path leaves its signpost, one plot's own path, a path two share, and a lane for three or more. */
const DOOR = 1.3;
const TRACK = 1.9;
const PATH_WIDTH = 2.4;
const LANE = 2.9;
const LANE_FROM = 3;
/** How far (px) the edge of a path wanders either way, on smooth noise. */
const WANDER = 0.55;
/** The trodden grass at a path's edge: px past it, and how much of it is trodden near and far. */
const FRINGE = 1.4;
const FRINGE_NEAR = 0.5;
const FRINGE_FAR = 0.18;
/** Px between the discs a path is drawn with: its edge strays under a fifth of a pixel from round. */
const STROKE_STEP = 1.25;

/** A point on a path's centre line, and its half width. */
interface TrailPoint {
  x: number;
  y: number;
  r: number;
}
/** A path may be at most this much longer than the straight line to where it joins (plus a few cells), or it is left out. */
const DETOUR = 1.35;
const DETOUR_SLACK = 5;
/** The most cells one search may open before it gives up (a plot boxed in by others gets no path). */
const SEARCH_CAP = 30_000;
/** Plots routed per step of a sliced build (terrainSteps). */
const SEARCH_SLICE = 12;

interface TrailResult {
  /** Per pixel, 1 on a path or its trodden edge. */
  mask: Uint8Array;
  lines: { x: number; y: number }[][];
}

/**
 * The footpaths along their routes (route): smoothed into bends, a path
 * several plots share trodden wider. Drawn on the grass as worn earth (the
 * helper path's own) with shade under the grass's lip and a trodden edge,
 * and as a darker track over the beach. Marks `taken` where no piece may
 * stand: the paths and a pixel round them.
 */
function* paintTrails(scene: IslandScene, real: Uint8Array, ground: Uint8Array, taken: Mask, routed: Routed | null, c: { x: number; y: number }, rnd: Rnd): Generator<void, TrailResult, void> {
  const W = scene.width;
  const H = scene.height;
  const mask = new Uint8Array(W * H);
  const lines: { x: number; y: number }[][] = [];
  if (!routed) return { mask, lines };
  const { routes, usage, edgeOf, centre } = routed;

  // How trodden a cell is: one plot's own path, a path two share, a lane for three or more.
  const at = (k: number): TrailPoint => {
    const u = usage[k];
    return { ...centre(k), r: u >= LANE_FROM ? LANE : u >= 2 ? PATH_WIDTH : TRACK };
  };
  const strokes: TrailPoint[][] = [];
  for (const r of routes) {
    const last = r.cells[r.cells.length - 1];
    // A plot whose helper path runs from its signpost needs no path of its own: only the part others share is drawn.
    const served = real[r.door.y * W + r.door.x] === PATH;
    const shared = served ? r.cells.findIndex((k) => usage[k] > 1) : 0;
    if (shared < 0) continue;
    const pts: TrailPoint[] = [
      ...(served
        ? []
        : [
            { x: r.door.x, y: r.door.y - 1, r: DOOR },
            { x: r.start.x, y: r.start.y, r: TRACK },
          ]),
      ...r.cells.slice(shared).map(at),
    ];
    const gate = edgeOf.get(last);
    // On to the plaza's stone (2 px under its edge: the stone itself never takes ink).
    if (gate) pts.push({ ...at(last), x: gate.at.x - gate.step[0] * 2, y: gate.at.y - gate.step[1] * 2 });
    const line = smooth(pts);
    lines.push(line.map(({ x, y }) => ({ x, y })));
    strokes.push(line);
  }
  if (strokes.length === 0) return { mask, lines };

  // One field over the paths' box: per pixel, how far inside the nearest path it is (negative outside).
  const reach = LANE + WANDER + FRINGE + 2;
  let x0 = W;
  let y0 = H;
  let x1 = 0;
  let y1 = 0;
  for (const line of strokes) {
    for (const p of line) {
      x0 = Math.min(x0, Math.floor(p.x - reach));
      y0 = Math.min(y0, Math.floor(p.y - reach));
      x1 = Math.max(x1, Math.ceil(p.x + reach));
      y1 = Math.max(y1, Math.ceil(p.y + reach));
    }
  }
  x0 = Math.max(0, x0);
  y0 = Math.max(0, y0);
  x1 = Math.min(W, x1);
  y1 = Math.min(H, y1);
  const bw = x1 - x0;
  const bh = y1 - y0;
  if (bw <= 0 || bh <= 0) return { mask, lines };
  const field = new Float32Array(bw * bh).fill(-Infinity);
  const disc = (px: number, py: number, r: number) => {
    const out = Math.ceil(r + WANDER + FRINGE + 1);
    for (let y = Math.max(y0, Math.floor(py - out)); y <= Math.min(y1 - 1, Math.ceil(py + out)); y++) {
      for (let x = Math.max(x0, Math.floor(px - out)); x <= Math.min(x1 - 1, Math.ceil(px + out)); x++) {
        const ex = x + 0.5 - px;
        const ey = y + 0.5 - py;
        const v = r - Math.sqrt(ex * ex + ey * ey);
        const i = (y - y0) * bw + (x - x0);
        if (v > field[i]) field[i] = v;
      }
    }
  };
  // Discs every STROKE_STEP px along each line (the smoothed lines' points are much closer than that).
  for (const line of strokes) {
    let carry = 0;
    for (let n = 0; n < line.length - 1; n++) {
      const a = line[n];
      const b = line[n + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let s = carry; s < len; s += STROKE_STEP) {
        const f = s / len;
        disc(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.r + (b.r - a.r) * f);
      }
      carry = len > carry ? STROKE_STEP - ((len - carry) % STROKE_STEP) : carry - len;
      if (carry >= STROKE_STEP) carry -= STROKE_STEP;
    }
    const end = line[line.length - 1];
    disc(end.x, end.y, end.r);
  }
  // The ink in a slice of its own.
  yield;

  // Ink: worn earth with a few lighter specks, the grass's shade along its upper edge and trodden
  // grass round it; over the beach, a darker track in the sand. The edges wander on smooth noise.
  const wander = new Noise(W, H, c, 7, 41);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const f = (y - y0) * bw + (x - x0);
      if (field[f] > -(FRINGE + WANDER)) field[f] += (wander.at(x, y) - 0.5) * 2 * WANDER;
    }
  }
  const { P, Q, R, E, S } = INK_CODE;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const v = field[(y - y0) * bw + (x - x0)];
      if (v < -FRINGE) continue;
      const i = y * W + x;
      const k = real[i];
      if (k !== GRASS && k !== SAND) continue;
      if (k === SAND) {
        if (v >= 0.4) {
          ground[i] = S;
          mask[i] = 1;
        }
        continue;
      }
      if (v >= 0) {
        const speck = rnd(x, y, 42);
        // The pixel under the grass's lip is in its shade: the path lies a little lower than the turf.
        const lip = y === y0 || field[(y - 1 - y0) * bw + (x - x0)] < 0;
        ground[i] = lip && real[i - W] === GRASS ? R : speck < 0.05 ? Q : P;
        mask[i] = 1;
      } else if (rnd(x, y, 43) < (v >= -FRINGE / 2 ? FRINGE_NEAR : FRINGE_FAR)) {
        ground[i] = E;
        mask[i] = 1;
      }
    }
  }
  // No piece on a path or its edge, nor a pixel from it.
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (field[(y - y0) * bw + (x - x0)] >= -(FRINGE + 2 * WANDER + 1)) taken.bits[y * W + x] = 1;
    }
  }
  return { mask, lines };
}

interface Routed {
  routes: { door: { x: number; y: number }; start: { x: number; y: number }; cells: number[] }[];
  /** Per routing cell, how many plots' paths pass through it. */
  usage: Uint16Array;
  /** The cells where a path meets the plaza: the point on its edge, and the way on to the stone. */
  edgeOf: Map<number, { at: { x: number; y: number }; step: readonly [number, number] }>;
  centre: (k: number) => { x: number; y: number };
}

/**
 * Each plot's way from its signpost to the plaza on the routing grid: the
 * plots nearest the plaza first, each joining the closest point of the paths
 * already laid (or one of the plaza's four gates), round every other plot and
 * plaza piece. A plot with no short way gets none.
 */
function* route(
  scene: IslandScene,
  base: Uint8Array,
  rooms: readonly PlotRoom[],
  plaza: Rect,
  plazaKeep: readonly Rect[],
  c: { x: number; y: number }
): Generator<void, Routed | null, void> {
  const W = scene.width;
  const H = scene.height;
  const gw = Math.ceil(W / CELL);
  const gh = Math.ceil(H / CELL);
  // What a path's cell must keep clear of: the sea, the plaza, every plot's body and the plaza's pieces.
  const bad = new Mask(W, H);
  for (let i = 0; i < W * H; i++) if (base[i] !== GRASS && base[i] !== SAND) bad.bits[i] = 1;
  for (const room of rooms) for (const r of room.body) bad.stamp(r);
  for (const r of plazaKeep) bad.stamp(r);
  const sums = new Sums(bad.bits, W, H);
  const open = new Uint8Array(gw * gh);
  const cost = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const x0 = i * CELL;
      const y0 = j * CELL;
      if (sums.any(x0 - TRAIL_CLEAR, y0 - TRAIL_CLEAR, x0 + CELL + TRAIL_CLEAR, y0 + CELL + TRAIL_CLEAR)) continue;
      const sand = base[(y0 + 2) * W + x0 + 2] === SAND;
      open[j * gw + i] = sand ? 2 : 1;
      // Room to breathe: a cell close to something costs more, so a path keeps a little off the trees.
      const tight = sums.any(x0 - TRAIL_CLEAR - 4, y0 - TRAIL_CLEAR - 4, x0 + CELL + TRAIL_CLEAR + 4, y0 + CELL + TRAIL_CLEAR + 4);
      cost[j * gw + i] = (sand ? 2.4 : 1) * (tight ? 1.5 : 1);
    }
  }
  const cellOf = (x: number, y: number) => Math.floor(y / CELL) * gw + Math.floor(x / CELL);
  const centre = (k: number) => ({ x: (k % gw) * CELL + CELL / 2, y: Math.floor(k / gw) * CELL + CELL / 2 });

  /**
   * The network a path joins: per cell, -2 off it, -1 where it meets the
   * plaza, else the next cell toward the plaza. A path may meet the plaza
   * anywhere along its edge, but its gates (the middle of each side, the
   * bottom one where the viewer walks in) and the paths already laid cost
   * nothing to join, and the rest of the edge a little, so paths gather
   * into a few ways in.
   */
  const next = new Int32Array(gw * gh).fill(-2);
  const joinCost = new Float32Array(gw * gh);
  const usage = new Uint16Array(gw * gh);
  const edgeOf = new Map<number, { at: { x: number; y: number }; step: readonly [number, number] }>();
  const reach = TRAIL_CLEAR + CELL;
  for (let k = 0; k < gw * gh; k++) {
    if (!open[k]) continue;
    const { x, y } = centre(k);
    const dx = x < plaza.x ? plaza.x - x : x > plaza.x + plaza.w ? x - plaza.x - plaza.w : 0;
    const dy = y < plaza.y ? plaza.y - y : y > plaza.y + plaza.h ? y - plaza.y - plaza.h : 0;
    if (Math.max(dx, dy) > reach + CELL / 2 || (dx && dy)) continue;
    const step: readonly [number, number] = dx ? [x < plaza.x ? -1 : 1, 0] : [0, y < plaza.y ? -1 : 1];
    const at = { x: Math.min(plaza.x + plaza.w, Math.max(plaza.x, x)), y: Math.min(plaza.y + plaza.h, Math.max(plaza.y, y)) };
    next[k] = -1;
    joinCost[k] = EDGE_JOIN;
    edgeOf.set(k, { at, step });
  }
  for (const gate of [
    { x: c.x + CROWD_LAYOUT.home[0] + 5, y: plaza.y + plaza.h + reach },
    { x: c.x, y: plaza.y - reach },
    { x: plaza.x - reach, y: c.y + 6 },
    { x: plaza.x + plaza.w + reach, y: c.y + 6 },
  ]) {
    const k = cellOf(gate.x, gate.y);
    if (gate.x >= 0 && gate.y >= 0 && gate.x < W && gate.y < H && next[k] === -1) joinCost[k] = 0;
  }
  if (edgeOf.size === 0) return null;
  yield;

  const order = [...rooms].sort((a, b) => Math.hypot(a.door.x - c.x, a.door.y - c.y) - Math.hypot(b.door.x - c.x, b.door.y - c.y) || a.slot - b.slot);
  const routes: Routed["routes"] = [];
  // Per search, a cell's cost and the way it came, valid only where `seen` holds this search's number.
  const dist = new Float32Array(gw * gh);
  const from = new Int32Array(gw * gh);
  const seen = new Int32Array(gw * gh);
  let search = 0;
  const heap = new Heap(gw * gh);
  for (const room of order) {
    // A slice of searches at a time.
    if (search > 0 && search % SEARCH_SLICE === 0) yield;
    search++;
    const reached = (k: number) => (seen[k] === search ? dist[k] : Infinity);
    const mark = (k: number, d: number, prev: number) => {
      seen[k] = search;
      dist[k] = d;
      from[k] = prev;
    };
    // Where the path can start: straight under the signpost (past its biggest view and its board) first, then beside it.
    const under = room.body.filter((r) => r.x <= room.door.x && room.door.x < r.x + r.w && r.y < room.door.y + 40).reduce((y, r) => Math.max(y, r.y + r.h), room.door.y);
    // Each with what it costs to begin there: straight down is best, a step aside a little more.
    const starts: { x: number; y: number; cost: number }[] = [];
    for (let k = 0; k <= 5; k++) starts.push({ x: room.door.x, y: under + TRAIL_CLEAR + 2 + k * CELL, cost: k * 0.5 });
    for (let k = 0; k <= 6; k++) {
      const off = 10 + TRAIL_CLEAR + k * CELL;
      for (const y of [room.door.y - 5, under + TRAIL_CLEAR + 2]) starts.push({ x: room.door.x - off, y, cost: 2 + k * 0.5 }, { x: room.door.x + off, y, cost: 2 + k * 0.5 });
    }
    // The beach only near this plot's own signpost: a path steps off the sand, never runs along it.
    const walk = (n: number) =>
      open[n] === 1 ||
      (open[n] === 2 && Math.abs((n % gw) * CELL + CELL / 2 - room.door.x) < BEACH_STEP && Math.abs(Math.floor(n / gw) * CELL + CELL / 2 - room.door.y) < BEACH_STEP);
    heap.clear();
    const startAt = new Map<number, { x: number; y: number }>();
    for (const p of starts) {
      if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) continue;
      const k = cellOf(p.x, p.y);
      if (!walk(k) || p.cost >= reached(k)) continue;
      mark(k, p.cost, -1);
      startAt.set(k, p);
      heap.push(k, p.cost);
    }
    if (startAt.size === 0) continue;
    let found = -1;
    let best = Infinity;
    let opened = 0;
    while (heap.size > 0 && opened < SEARCH_CAP) {
      const k = heap.pop();
      // A stale entry: the cell was reached cheaper since.
      if (heap.popped > dist[k]) continue;
      if (dist[k] >= best) break;
      opened++;
      // On the network: a way to join it, at what it costs to join there; the search goes on while a cheaper one could be found.
      if (next[k] !== -2) {
        if (dist[k] + joinCost[k] < best) {
          best = dist[k] + joinCost[k];
          found = k;
        }
        continue;
      }
      const i = k % gw;
      const j = Math.floor(k / gw);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
          const n = nj * gw + ni;
          if (!walk(n)) continue;
          // No corner cutting past a closed cell.
          if (di && dj && (!walk(j * gw + ni) || !walk(nj * gw + i))) continue;
          // A network cell is cheap to step onto: paths join rather than run side by side.
          const step = (di && dj ? Math.SQRT2 : 1) * (next[n] !== -2 ? 0.3 : cost[n]);
          const nd = dist[k] + step;
          if (nd < reached(n)) {
            mark(n, nd, k);
            heap.push(n, nd);
          }
        }
      }
    }
    if (found < 0) continue;
    const cells: number[] = [];
    for (let k = found; k >= 0; k = from[k]) cells.push(k);
    cells.reverse();
    const start = startAt.get(cells[0])!;
    // A path that would wind far round other plots is left out: that corner stays quiet.
    const joined = centre(found);
    let walked = 0;
    for (let n = 1; n < cells.length; n++) {
      const d = Math.abs(cells[n] - cells[n - 1]);
      walked += d === 1 || d === gw ? 1 : Math.SQRT2;
    }
    if (walked > DETOUR * (Math.hypot(joined.x - start.x, joined.y - start.y) / CELL) + DETOUR_SLACK) continue;
    // Lay it: each new cell leads to the next, toward where it joined.
    for (let n = 0; n < cells.length - 1; n++) if (next[cells[n]] === -2) next[cells[n]] = cells[n + 1];
    // Where it met the plaza is a way in now, free for the next path too.
    joinCost[found] = 0;
    for (let k = cells[0], guard = 0; k >= 0 && guard < gw * gh; guard++) {
      usage[k]++;
      const to = next[k];
      if (to < 0) break;
      k = to;
    }
    routes.push({ door: room.door, start, cells });
  }
  return { routes, usage, edgeOf, centre };
}

/** Three rounds of corner cutting (Chaikin), the ends kept: a path that bends instead of stepping. */
function smooth(points: TrailPoint[]): TrailPoint[] {
  let pts = points;
  for (let round = 0; round < 3; round++) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let n = 0; n < pts.length - 1; n++) {
      const a = pts[n];
      const b = pts[n + 1];
      out.push(
        { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25, r: a.r * 0.75 + b.r * 0.25 },
        { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75, r: a.r * 0.25 + b.r * 0.75 }
      );
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

/** A binary min-heap of grid cells by cost. */
class Heap {
  private readonly keys: Int32Array;
  private readonly prio: Float32Array;
  size = 0;
  /** The cost the last pop came with. */
  popped = 0;
  constructor(capacity: number) {
    // A cell is pushed again each time it is reached cheaper: up to 8 times, from its neighbours.
    this.keys = new Int32Array(capacity * 8 + 16);
    this.prio = new Float32Array(capacity * 8 + 16);
  }
  clear(): void {
    this.size = 0;
  }
  push(k: number, p: number): void {
    if (this.size >= this.keys.length) return;
    let i = this.size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent] <= p) break;
      this.keys[i] = this.keys[parent];
      this.prio[i] = this.prio[parent];
      i = parent;
    }
    this.keys[i] = k;
    this.prio[i] = p;
  }
  pop(): number {
    const top = this.keys[0];
    this.popped = this.prio[0];
    const k = this.keys[--this.size];
    const p = this.prio[this.size];
    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= this.size) break;
      if (child + 1 < this.size && this.prio[child + 1] < this.prio[child]) child++;
      if (this.prio[child] >= p) break;
      this.keys[i] = this.keys[child];
      this.prio[i] = this.prio[child];
      i = child;
    }
    this.keys[i] = k;
    this.prio[i] = p;
    return top;
  }
}

// ------------------------------------------------------------------ placing

/** All of the rect on its own ground. */
function fitsGround(base: Uint8Array, W: number, rect: Rect, want: number): boolean {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) if (base[y * W + x] !== want) return false;
  }
  return true;
}

function placePieces(plan: Plan, scene: IslandScene, base: Uint8Array, sand: Sums, taken: Mask, c: { x: number; y: number }, rnd: Rnd, out: TerrainPiece[]): void {
  const W = scene.width;
  const H = scene.height;
  const step = plan.grid;
  const i0 = Math.floor(-c.x / step) - 1;
  const i1 = Math.ceil((W - c.x) / step) + 1;
  const j0 = Math.floor(-c.y / step) - 1;
  const j1 = Math.ceil((H - c.y) / step) + 1;
  const want = plan.on === "beach" ? SAND : GRASS;
  const variants = PIECES[plan.kind];
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      if (hash3(i, j, plan.salt) >= plan.chance) continue;
      // A few spots in this cell of the grid, in a fixed order: the first that fits.
      for (let n = 0; n < plan.tries; n++) {
        const x = Math.floor(c.x + i * step + (hash3(i, j, plan.salt + 50 + n * 7) - 0.5) * step * 0.9);
        const y = Math.floor(c.y + j * step + (hash3(i, j, plan.salt + 70 + n * 7) - 0.5) * step * 0.9);
        const rows = variants[Math.floor(rnd(x, y, 101) * variants.length) % variants.length];
        const rect = { x, y, w: rows[0].length, h: rows.length };
        if (rect.x < 1 || rect.y < 1 || rect.x + rect.w >= W - 1 || rect.y + rect.h >= H - 1) continue;
        if (!fitsGround(base, W, rect, want)) continue;
        // A fence stands on the garden's rim: the beach within reach of its middle.
        if (plan.on === "rim") {
          const mx = rect.x + (rect.w >> 1);
          const my = rect.y + (rect.h >> 1);
          if (sand.count(mx - RIM_REACH, my - RIM_REACH, mx + RIM_REACH, my + RIM_REACH) === 0) continue;
        }
        // A beach piece keeps off the turf's edge and its shade.
        if (plan.on === "beach" && touches(base, W, H, grow(rect, 4), GRASS)) continue;
        const room = grow(rect, plan.gap);
        if (taken.hits(room)) continue;
        taken.stamp(room);
        out.push({ kind: plan.kind, rect });
        break;
      }
    }
  }
}

/** Any pixel of this kind in the rect (clipped to the scene). */
function touches(base: Uint8Array, W: number, H: number, r: Rect, kind: number): boolean {
  for (let y = Math.max(0, r.y); y < Math.min(H, r.y + r.h); y++) {
    for (let x = Math.max(0, r.x); x < Math.min(W, r.x + r.w); x++) if (base[y * W + x] === kind) return true;
  }
  return false;
}

// ------------------------------------------------------------------ colour

/**
 * Every ink's colour, by char code: `key` colours a palette key (the hour's
 * grade, or a lamp's light), `other` any other colour; a blend mixes its two
 * keys after, so it sits between them in every light.
 */
export function inkColours(key: (k: string) => RGB, other: (rgb: RGB) => RGB): Map<number, RGB> {
  const out = new Map<number, RGB>();
  for (const [ch, spec] of Object.entries(TERRAIN_INK)) {
    if ("rgb" in spec) {
      out.set(code(ch), other([spec.rgb[0], spec.rgb[1], spec.rgb[2]]));
      continue;
    }
    const a = key(spec.key);
    if (!spec.mix) {
      out.set(code(ch), a);
      continue;
    }
    const b = key(spec.mix);
    const t = spec.t ?? 0.5;
    out.set(code(ch), [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB);
  }
  return out;
}
