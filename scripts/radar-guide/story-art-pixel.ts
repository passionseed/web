/**
 * Hand-made pixel scenes for story reels (lib/radar-stories), drawn in code
 * like the guide art (art-pixel.ts): deterministic, re-runnable, reviewable in
 * a PR. Each scene is 108x192 cells, shown at 4x on the 432x768 filming frame
 * (10 device pixels per cell at deviceScaleFactor 2.5), so every cell lands on
 * whole pixels.
 *
 * Composition, in cells: the dialogue box covers about y 25 to 65, characters
 * stand with their feet at y 125, and Instagram's caption covers y 125 down.
 * So each scene puts its story props at the sides of y 60 to 130 and keeps
 * the middle calm for the sprites. Scenery and objects only: no people, no
 * text, no logos. Banned per skills/key-art-poster/SKILL.md: sunburst rays,
 * perspective floor grids, random glowing particles, scanlines, grain.
 */
import type { GenericScene } from "../../lib/radar-stories/types";
import { createCanvas, disc, dither, line, moon, nightSky, px, rect, renderMap, rng, skyline, type Canvas } from "./art-pixel";
import { STORY_PALETTE as C } from "../../components/radar/guide/story/pixel-art";

export const STORY_SCENE_SIZE = { w: 108, h: 192 } as const;

/** Where characters stand (feet), in cells. The renderer uses the same line. */
export const STORY_FLOOR_Y = 125;

const WOOD = "#5a3328";
const WOOD_DARK = "#3e2119";
const BOARD = "#1f3b30";
const BOARD_LINE = "#3f6b58";
const LEAF = "#24402f";
const LEAF_LIGHT = "#33573f";
const SCREEN = "#0e0a16";
const CARD = "#1c1426";
const RADAR_ACCENT = "#5cff5c";

function frameRect(c: Canvas, x: number, y: number, w: number, h: number, color: string): void {
  rect(c, x, y, w, 1, color);
  rect(c, x, y + h - 1, w, 1, color);
  rect(c, x, y, 1, h, color);
  rect(c, x + w - 1, y, 1, h, color);
}

/** A night window: sky, a moon and a lit skyline, with a frame and a cross bar. */
function nightWindow(c: Canvas, x: number, y: number, w: number, h: number, seed: number): void {
  const sky = createCanvas(w, h);
  nightSky(sky, h, seed, 8);
  moon(sky, w - 8, 7, 4);
  skyline(sky, h, seed + 1, { color: C.ink, minH: 4, maxH: Math.floor(h * 0.55), lit: 0.4 });
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      px(c, x + i, y + j, `#${[sky.data[k], sky.data[k + 1], sky.data[k + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
    }
  rect(c, x - 2, y - 2, w + 4, 2, C.ink);
  rect(c, x - 2, y + h, w + 4, 3, C.ink);
  rect(c, x - 2, y, 2, h, C.ink);
  rect(c, x + w, y, 2, h, C.ink);
  rect(c, x + Math.floor(w / 2) - 1, y, 2, h, C.ink);
}

/** Wood floor boards from `y` down. */
function woodFloor(c: Canvas, y: number): void {
  rect(c, 0, y, c.w, c.h - y, WOOD_DARK);
  for (let row = y + 1; row < c.h; row += 5) {
    rect(c, 0, row, c.w, 3, WOOD);
    const off = ((row - y) / 5) % 2 ? 7 : 19;
    for (let x = off; x < c.w; x += 26) rect(c, x, row, 1, 3, WOOD_DARK);
  }
  rect(c, 0, y, c.w, 1, C.ink);
}

/** Two-tone tiles from `y` down. */
function tileFloor(c: Canvas, y: number, a: string, b: string): void {
  for (let j = y; j < c.h; j += 6)
    for (let i = 0; i < c.w; i += 6) rect(c, i, j, 6, 6, ((i + j - y) / 6) % 2 ? a : b);
  rect(c, 0, y, c.w, 1, C.ink);
}

// ---------------------------------------------------------------- scenes
export type StorySceneFn = (c: Canvas) => void;

/** Late at night: fairy lights, a window on the sleeping city, the bed with a glowing phone, a lamp. */
const bedroomNight: StorySceneFn = (c) => {
  rect(c, 0, 0, c.w, 124, C.plum);
  dither(c, 0, 0, c.w, 44, C.night, C.ink, 0.5);
  dither(c, 0, 44, c.w, 8, C.ink, C.plum, 0.5);
  for (let x = 3; x < c.w; x += 9) dither(c, x, 52, 1, 72, C.plum, C.plumMid, 0.25);
  // fairy lights sagging across the top of the wall
  for (let x = 0; x < c.w; x++) {
    const y = 58 + Math.round(4 * Math.sin((x / c.w) * Math.PI * 2) ** 2);
    px(c, x, y, C.ink);
    if (x % 6 === 3) {
      px(c, x, y + 1, [C.litGold, C.magenta, C.lit, C.violet][(x / 6) % 4 | 0]);
      px(c, x, y + 2, C.litGold);
    }
  }
  nightWindow(c, 6, 68, 32, 30, 401);
  // curtains
  rect(c, 2, 66, 4, 40, C.violetDeep);
  dither(c, 2, 66, 4, 40, C.violetDeep, C.plumMid, 0.25);
  rect(c, 38, 66, 4, 40, C.violetDeep);
  dither(c, 38, 66, 4, 40, C.violetDeep, C.plumMid, 0.25);
  // a blank poster: colour blocks and a star, no words
  rect(c, 80, 68, 20, 26, C.ink);
  rect(c, 81, 69, 18, 24, C.orangeDeep);
  dither(c, 81, 81, 18, 12, C.orangeDeep, C.magenta, 0.5);
  blitStar(c, 86, 72);
  // nightstand and lamp
  rect(c, 92, 104, 16, 20, WOOD);
  rect(c, 92, 104, 16, 2, WOOD_DARK);
  rect(c, 98, 92, 2, 12, C.ink);
  rect(c, 94, 88, 10, 5, C.orange);
  dither(c, 88, 93, 20, 10, C.plum, C.litWarm, 0.25);
  rect(c, 95, 101, 4, 3, C.red); // alarm clock, no numbers
  // the bed: headboard, pillow, blanket
  rect(c, 0, 100, 34, 24, WOOD_DARK);
  rect(c, 0, 108, 92, 16, C.cream);
  rect(c, 4, 103, 22, 7, C.cream);
  rect(c, 4, 109, 22, 1, C.skinShade);
  rect(c, 26, 110, 66, 14, C.violetDeep);
  dither(c, 26, 110, 66, 3, C.violetDeep, C.violet, 0.5);
  for (let x = 30; x < 92; x += 12) rect(c, x, 116, 6, 1, C.violet);
  // the phone face down on the blanket, still glowing
  rect(c, 60, 113, 7, 3, C.ink);
  dither(c, 57, 111, 13, 2, C.violetDeep, RADAR_ACCENT, 0.25);
  woodFloor(c, 124);
  // a rug
  rect(c, 14, 150, 80, 22, C.plumMid);
  dither(c, 14, 150, 80, 22, C.plumMid, C.violetDeep, 0.25);
  frameRect(c, 16, 152, 76, 18, C.orange);
};

const STAR = ["...Y...", "...Y...", "..YYY..", "YYYYYYY", "..YYY..", ".Y...Y.", "Y.....Y"];

function blitStar(c: Canvas, x: number, y: number): void {
  STAR.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === "Y") rect(c, x + i, y + j, 1, 1, C.litGold);
  });
}

/** Afternoon class: a chalkboard with scribbles (no letters), windows of daylight, the teacher's desk, two student desks. */
const classroom: StorySceneFn = (c) => {
  rect(c, 0, 0, c.w, 124, "#4a2c4e");
  dither(c, 0, 0, c.w, 40, C.plumMid, "#4a2c4e", 0.5);
  // daylight windows on the left wall
  for (const y of [62, 90]) {
    rect(c, 0, y, 12, 22, C.ink);
    rect(c, 0, y + 1, 11, 20, C.litGold);
    dither(c, 0, y + 11, 11, 10, C.litGold, C.lit, 0.5);
    rect(c, 5, y + 1, 1, 20, C.ink);
  }
  // the board
  rect(c, 16, 60, 86, 44, WOOD_DARK);
  rect(c, 18, 62, 82, 40, BOARD);
  dither(c, 18, 62, 82, 40, BOARD, "#244537", 0.25);
  // chalk scribbles: wavy strokes and boxes, never letters
  const r = rng(503);
  for (let y = 66; y < 96; y += 7) {
    let x = 22 + Math.floor(r() * 4);
    while (x < 94) {
      const len = 4 + Math.floor(r() * 10);
      for (let i = 0; i < len && x + i < 96; i++) px(c, x + i, y + ((i >> 1) % 2), BOARD_LINE);
      x += len + 3 + Math.floor(r() * 4);
    }
  }
  frameRect(c, 70, 76, 18, 12, C.cream);
  line(c, 72, 86, 86, 78, C.cream);
  rect(c, 16, 104, 86, 2, WOOD);
  rect(c, 30, 103, 6, 1, C.cream); // chalk
  // teacher's desk
  rect(c, 36, 108, 36, 16, WOOD);
  rect(c, 36, 108, 36, 2, WOOD_DARK);
  rect(c, 40, 104, 8, 4, C.cream); // papers
  rect(c, 60, 103, 5, 5, C.orange); // mug
  // wall clock (no numbers) above the board
  disc(c, 54, 50, 5, C.cream);
  rect(c, 54, 47, 1, 3, C.ink);
  rect(c, 54, 50, 3, 1, C.ink);
  tileFloor(c, 124, "#3a2440", "#33203a");
  // two student desks in front
  for (const x of [2, 74]) {
    rect(c, x, 138, 32, 4, WOOD);
    rect(c, x, 142, 32, 1, WOOD_DARK);
    rect(c, x + 2, 143, 2, 20, C.ink);
    rect(c, x + 28, 143, 2, 20, C.ink);
    rect(c, x + 6, 134, 12, 4, C.cream); // an open notebook
    rect(c, x + 12, 134, 1, 4, C.skinShade);
  }
};

/** Family dinner: a warm hanging lamp, a window, a shelf of bowls, the table laid with rice and dishes. */
const dinnerTable: StorySceneFn = (c) => {
  rect(c, 0, 0, c.w, 124, "#4a2430");
  dither(c, 0, 0, c.w, 50, C.plum, "#4a2430", 0.5);
  // the lamp's warm pool on the wall
  for (let y = 50; y < 124; y++) {
    const half = Math.floor(10 + (y - 50) * 0.5);
    dither(c, 54 - half, y, half * 2, 1, "#4a2430", "#6a3434", 0.5);
  }
  rect(c, 53, 0, 2, 52, C.ink);
  rect(c, 44, 52, 20, 6, C.orange);
  rect(c, 46, 58, 16, 2, C.litGold);
  nightWindow(c, 4, 68, 24, 26, 611);
  // shelf with bowls and a pot
  rect(c, 80, 74, 26, 2, WOOD);
  rect(c, 80, 92, 26, 2, WOOD);
  for (const x of [82, 90, 98]) rect(c, x, 70, 6, 4, C.cream);
  rect(c, 84, 84, 12, 8, C.red);
  rect(c, 83, 83, 14, 2, C.ink);
  // a plant in the corner
  rect(c, 92, 112, 10, 12, C.orangeDeep);
  for (let i = 0; i < 6; i++) disc(c, 94 + (i % 3) * 3, 104 - Math.floor(i / 3) * 4, 3, i % 2 ? LEAF : LEAF_LIGHT);
  // the table: cloth, rice bowls, dishes, a jug of water
  rect(c, 6, 108, 96, 4, C.cream);
  rect(c, 6, 112, 96, 10, "#e8d3c4");
  dither(c, 6, 118, 96, 4, "#e8d3c4", C.skinShade, 0.25);
  rect(c, 10, 122, 3, 12, WOOD_DARK);
  rect(c, 95, 122, 3, 12, WOOD_DARK);
  for (const x of [14, 34, 66, 86]) {
    rect(c, x, 104, 8, 4, C.cream);
    rect(c, x + 1, 103, 6, 1, "#ffffff");
    rect(c, x, 104, 8, 1, C.skinShade);
  }
  rect(c, 44, 103, 20, 5, C.cream);
  rect(c, 46, 101, 16, 3, C.orange);
  rect(c, 48, 100, 4, 1, C.red);
  rect(c, 55, 100, 4, 1, LEAF_LIGHT);
  rect(c, 26, 99, 4, 9, C.violet);
  rect(c, 26, 99, 4, 1, C.cream);
  tileFloor(c, 124, "#3d2228", "#35202a");
};

/** After school at dusk: gate pillars, a blank sign plate, the fence, trees and the school's lit windows. */
const schoolGate: StorySceneFn = (c) => {
  const bands = ["#2a1232", "#4a1a44", "#7a2a55", "#b23f5a", C.orangeDeep, C.lit];
  bands.forEach((col, i) => {
    rect(c, 0, i * 16, c.w, 16, col);
    if (i) dither(c, 0, i * 16, c.w, 3, bands[i - 1], col, 0.5);
  });
  rect(c, 0, 96, c.w, 30, C.litGold);
  dither(c, 0, 96, c.w, 4, C.lit, C.litGold, 0.5);
  disc(c, 78, 92, 9, "#ffe6b0");
  // school buildings, lit windows
  skyline(c, 112, 707, { color: C.plum, minH: 18, maxH: 34, lit: 0.45 });
  // trees
  for (const [x, y, r] of [
    [20, 98, 10],
    [36, 102, 8],
    [74, 100, 9],
    [92, 98, 11],
  ] as const) {
    disc(c, x, y, r + 1, C.ink);
    disc(c, x, y, r, LEAF);
    dither(c, x - r, y - r, r * 2, r, LEAF, LEAF_LIGHT, 0.25);
  }
  // fence
  rect(c, 0, 108, c.w, 2, C.ink);
  for (let x = 1; x < c.w; x += 4) rect(c, x, 108, 1, 17, C.ink);
  rect(c, 0, 116, c.w, 1, C.ink);
  // gate pillars and the beam with a blank plate
  for (const x of [0, 94]) {
    rect(c, x, 58, 14, 67, C.ink);
    rect(c, x + 1, 60, 12, 65, C.cream);
    dither(c, x + 1, 60, 3, 65, C.cream, "#e8d3c4", 0.5);
    rect(c, x, 56, 14, 4, C.orange);
    rect(c, x + 3, 70, 8, 6, C.orangeDeep);
  }
  rect(c, 12, 30, 84, 6, C.ink);
  rect(c, 12, 31, 84, 4, C.orange);
  rect(c, 34, 22, 40, 10, C.ink);
  rect(c, 35, 23, 38, 8, C.cream);
  // pavement and the road
  rect(c, 0, 125, c.w, 22, "#5a3a50");
  for (let x = 0; x < c.w; x += 12) rect(c, x, 125, 1, 22, "#4a2e42");
  rect(c, 0, 125, c.w, 1, C.ink);
  rect(c, 0, 147, c.w, 3, C.cream);
  rect(c, 0, 150, c.w, 42, "#2e2232");
  for (let x = 4; x < c.w; x += 20) rect(c, x, 170, 10, 2, C.litGold);
};

const HEART = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];
const BUBBLE = ["#####", "#...#", "#...#", "#####", ".#..."];
const SHARE = ["...#.", "..##.", "#####", "..##.", "...#."];

function icon(c: Canvas, grid: readonly string[], x: number, y: number, color: string): void {
  grid.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === "#") px(c, x + i, y + j, color);
  });
}

/** One feed post: avatar, name bar, a picture, actions and caption bars. 96 cells tall. */
function post(c: Canvas, y: number, kind: "sunset" | "campus"): void {
  rect(c, 2, y, c.w - 4, 92, CARD);
  disc(c, 9, y + 7, 4, kind === "sunset" ? C.orange : C.violet);
  rect(c, 16, y + 4, 26, 2, C.cream);
  rect(c, 16, y + 8, 16, 2, C.plumMid);
  rect(c, 94, y + 6, 2, 2, C.plumMid);
  rect(c, 98, y + 6, 2, 2, C.plumMid);
  const iy = y + 14;
  if (kind === "sunset") {
    const bands = [C.violetDeep, C.magenta, C.orangeDeep, C.lit, C.litGold];
    bands.forEach((col, i) => rect(c, 2, iy + i * 9, c.w - 4, 9, col));
    disc(c, 54, iy + 40, 10, "#ffe6b0");
    rect(c, 2, iy + 44, c.w - 4, 12, C.plum);
    dither(c, 2, iy + 44, c.w - 4, 2, C.plum, C.orangeDeep, 0.5);
  } else {
    rect(c, 2, iy, c.w - 4, 56, "#2e3a6a");
    dither(c, 2, iy + 30, c.w - 4, 26, "#2e3a6a", C.violetDeep, 0.5);
    rect(c, 20, iy + 18, 68, 38, C.cream);
    rect(c, 46, iy + 8, 16, 10, C.orange);
    for (let wx = 24; wx < 84; wx += 8) for (let wy = iy + 22; wy < iy + 52; wy += 8) rect(c, wx, wy, 4, 5, (wx + wy) % 3 ? C.violet : C.litGold);
  }
  icon(c, HEART, 5, y + 73, C.magenta);
  icon(c, BUBBLE, 15, y + 73, C.cream);
  icon(c, SHARE, 24, y + 73, C.cream);
  rect(c, 5, y + 82, 60, 2, C.cream);
  rect(c, 5, y + 86, 40, 2, C.plumMid);
}

/** A phone screen full of feed posts; tiles vertically (the renderer scrolls it). */
const phoneFeed: StorySceneFn = (c) => {
  rect(c, 0, 0, c.w, c.h, SCREEN);
  post(c, 2, "sunset");
  post(c, 98, "campus");
};

/** Career Radar's world: the level map (islands in a night sea), a lit route, the next level flagged. */
const radar: StorySceneFn = (c) => {
  const map = renderMap(C.orange);
  c.data.set(map.data);
  const stops = [
    [20, 22],
    [84, 54],
    [26, 96],
    [82, 138],
    [34, 176],
  ] as const;
  for (let s = 0; s < stops.length - 1; s++) {
    const [x0, y0] = stops[s];
    const [x1, y1] = stops[s + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i += 4) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const y = Math.round(y0 + ((y1 - y0) * i) / n);
      rect(c, x, y, 2, 2, s < 2 ? C.litGold : C.plumMid);
    }
  }
  // cleared levels: lit nodes; the next one: a flag in the radar green
  for (const [i, [x, y]] of stops.entries()) {
    rect(c, x - 3, y - 3, 7, 7, C.ink);
    rect(c, x - 2, y - 2, 5, 5, i < 2 ? C.litGold : i === 2 ? RADAR_ACCENT : C.plumMid);
  }
  rect(c, 27, 82, 1, 11, C.cream);
  rect(c, 28, 82, 7, 5, RADAR_ACCENT);
  dither(c, 18, 90, 18, 10, C.plum, "#1f5a2a", 0.25);
};

export const STORY_SCENES: Readonly<Record<GenericScene, StorySceneFn>> = {
  "bedroom-night": bedroomNight,
  classroom,
  "dinner-table": dinnerTable,
  "school-gate": schoolGate,
  "phone-feed": phoneFeed,
  radar,
};

export function renderStoryScene(scene: GenericScene): Canvas {
  const fn = STORY_SCENES[scene];
  if (!fn) throw new Error(`no story scene "${scene}"`);
  const c = createCanvas(STORY_SCENE_SIZE.w, STORY_SCENE_SIZE.h);
  rect(c, 0, 0, c.w, c.h, C.ink);
  fn(c);
  return c;
}
