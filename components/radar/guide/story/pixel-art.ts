/**
 * Pixel data for the game-story layer: the host NPC (idle, talk, cheer), the
 * player avatar on the profile card, and the badge glyphs. Pure data plus a
 * run-length helper, shared by:
 * - the React components (inline SVG fallback when a webp fails, badge icons),
 * - scripts/radar-guide/art.ts, which rasterises the same grids into
 *   public/radar/guides/host/*.webp so the image and the fallback match.
 *
 * The host is a generic pixel character (hoodie, headset), never a likeness of
 * a real person. No text and no logos in any grid.
 */
import type { BadgeIcon } from "@/lib/radar-guide/story";

/** Dusk City night palette (company-brain/reels-style.md) plus sprite colours. */
export const STORY_PALETTE = {
  ink: "#1a0e14",
  night: "#120a14",
  plum: "#2a1630",
  plumMid: "#3d1f45",
  violet: "#8f5bff",
  violetDeep: "#5b3aa8",
  cream: "#fff1e6",
  orange: "#ff8a4c",
  orangeDeep: "#ff7a45",
  lit: "#ffb36b",
  litWarm: "#ff9a52",
  litGold: "#ffd08a",
  red: "#f45d48",
  magenta: "#ff3fb4",
  hair: "#3a2233",
  skin: "#e0b491",
  skinShade: "#c48e6b",
  blush: "#f09a7e",
  mouth: "#9c3b2a",
  pants: "#2a1630",
} as const;

export type PixelGrid = readonly string[];
/** Grid character -> CSS colour. Characters missing from the map (and ".") are transparent. */
export type PixelPalette = Readonly<Record<string, string>>;

/** Native host grid size; the webp is this grid scaled 2x (GUIDE_HOST.spriteSize 48x64). */
export const HOST_GRID = { w: 24, h: 32 } as const;

/*
 * Legend: K outline, H hair, S skin, s skin shade, R blush, W eye light,
 * M mouth, O headset cups, m mic boom (drawn over the face), J hoodie,
 * j hoodie shade, P trousers.
 */
const HOST_HEAD_TOP: PixelGrid = [
  "........................",
  "........KKKKKKKK........",
  "......KKHHHHHHHHKK......",
  ".....KHHHHHHHHHHHHK.....",
  "....KHHHHHHHHHHHHHHK....",
  "....KHHHHHHHHHHHHHHK....",
  "...OKHHSSSSSSSSSSHHKO...",
  "...OKHSSSSSSSSSSSSHKO...",
];

const HOST_EYES_OPEN: PixelGrid = [
  "...OKSSKKSSSSSSKKSSKO...",
  "...OKSSKWSSSSSSKWSSKO...",
];

/** Happy closed eyes (^ ^) for the cheer frame. */
const HOST_EYES_HAPPY: PixelGrid = [
  "...OKSSKKSSSSSSKKSSKO...",
  "...OKSKSSKSSSSKSSKSKO...",
];

const HOST_BODY: PixelGrid = [
  "......KKSSSSSSSSKK......",
  "........KKSSSSKK........",
  "......KKJJKSSKJJKK......",
  "....KKJJJJJKKJJJJJKK....",
  "...KJJJJJJJJJJJJJJJJK...",
  "..KJJjJJJJJJJJJJJJjJJK..",
  "..KJJjJJJJJJJJJJJJjJJK..",
  "..KJJjKJJJJJJJJJJKjJJK..",
  "..KSSKKJJJJJJJJJJKKSSK..",
  "..KSSK.KJJJJJJJJK.KSSK..",
  "...KK..KJJJJJJJJK..KK...",
  ".......KjjjjjjjjK.......",
  ".......KPPPPPPPPK.......",
  ".......KPPPKKPPPK.......",
  ".......KPPK..KPPK.......",
  ".......KPPK..KPPK.......",
  "......KKKKK..KKKKK......",
  "......KKKKK..KKKKK......",
];

const HOST_BODY_CHEER: PixelGrid = [
  ".KSK..KKSSSSSSSSKK..KSK.",
  ".KSK....KKSSSSKK....KSK.",
  "..KJK.KKJJKSSKJJKK.KJK..",
  "..KJJKKJJJJKKJJJJKKJJK..",
  "...KJJJJJJJJJJJJJJJJK...",
  "....KJJJJJJJJJJJJJJK....",
  "....KJjJJJJJJJJJJjJK....",
  "....KJjJJJJJJJJJJjJK....",
  ".....KJJJJJJJJJJJJK.....",
  ".....KJJJJJJJJJJJJK.....",
  "......KJJJJJJJJJJK......",
  ".......KjjjjjjjjK.......",
  ".......KPPPPPPPPK.......",
  ".......KPPPKKPPPK.......",
  ".......KPPK..KPPK.......",
  ".......KPPK..KPPK.......",
  "......KKKKK..KKKKK......",
  "......KKKKK..KKKKK......",
];

function hostGrid(eyes: PixelGrid, mouthRows: PixelGrid, body: PixelGrid): PixelGrid {
  return [...HOST_HEAD_TOP, ...eyes, "...OKSSSSSSSSSSSSSSKO...", ...mouthRows, ...body];
}

/** Closed smile, mic boom on the right cheek. */
const MOUTH_IDLE: PixelGrid = [
  "....KSRSSSSSSSSSSRSKm...",
  "....KSSSSSKKKKSmmmSK....",
  ".....KSSSSSSSSSSSSK.....",
];
/** Open mouth (second talking frame). */
const MOUTH_TALK: PixelGrid = [
  "....KSRSSSSSSSSSSRSKm...",
  "....KSSSSSKMMKSmmmSK....",
  ".....KSSSSSKKSSSSSK.....",
];
/** Wide open grin. */
const MOUTH_CHEER: PixelGrid = [
  "....KSRSSKKKKKKSSRSKm...",
  "....KSSSSKMMMMKmmmSK....",
  ".....KSSSSKKKKSSSSK.....",
];

export const HOST_GRIDS = {
  idle: hostGrid(HOST_EYES_OPEN, MOUTH_IDLE, HOST_BODY),
  talk: hostGrid(HOST_EYES_OPEN, MOUTH_TALK, HOST_BODY),
  cheer: hostGrid(HOST_EYES_HAPPY, MOUTH_CHEER, HOST_BODY_CHEER),
} as const satisfies Record<string, PixelGrid>;
export type HostFrame = keyof typeof HOST_GRIDS;

export const HOST_PALETTE: PixelPalette = {
  K: STORY_PALETTE.ink,
  H: STORY_PALETTE.hair,
  S: STORY_PALETTE.skin,
  s: STORY_PALETTE.skinShade,
  R: STORY_PALETTE.blush,
  W: STORY_PALETTE.cream,
  M: STORY_PALETTE.mouth,
  O: STORY_PALETTE.orange,
  m: STORY_PALETTE.orange,
  J: STORY_PALETTE.violet,
  j: STORY_PALETTE.violetDeep,
  P: STORY_PALETTE.pants,
};

/**
 * Player avatar for the profile card: the same body without the headset,
 * a different hair colour, and the hoodie in the career accent. Generic, no
 * name, no face details beyond eyes and smile.
 */
export function avatarPalette(accent: string, shade?: string): PixelPalette {
  return {
    ...HOST_PALETTE,
    H: "#6b3a2a",
    O: "transparent",
    m: STORY_PALETTE.skin,
    J: accent,
    j: shade ?? STORY_PALETTE.violetDeep,
  };
}

// ---------------------------------------------------------------- badge glyphs (8x8)
/** `#` main colour, `o` second colour. */
export const BADGE_GLYPHS: Readonly<Record<BadgeIcon, PixelGrid>> = {
  bug: [".#....#.", "..#..#..", ".######.", "#.#oo#.#", ".######.", "#.####.#", ".######.", "#..##..#"],
  key: ["..ooo...", ".o...o..", ".o...o..", "..ooo...", "...#....", "...##...", "...#....", "...##..."],
  shield: [".######.", "#oooooo#", "#oooooo#", "#oo##oo#", ".#oooo#.", ".#oooo#.", "..#oo#..", "...##..."],
  radar: ["..####..", ".#....#.", "#..##..#", "#.#oo#.#", "#.#o##.#", "#..##..#", ".#....#.", "..####.."],
  chat: ["########", "#oooooo#", "#o####o#", "#oooooo#", "#o##ooo#", "########", ".##.....", ".#......"],
  ladder: [".#....#.", ".######.", ".#....#.", ".#....#.", ".######.", ".#....#.", ".#....#.", ".######."],
  coin: ["..####..", ".#oooo#.", "#oo#ooo#", "#oo#ooo#", "#oo#ooo#", "#oo#ooo#", ".#oooo#.", "..####.."],
  compass: ["..####..", ".#.oo.#.", "#..oo..#", "#..oo..#", "#..##..#", "#..##..#", ".#.##.#.", "..####.."],
  map: ["...##...", "..#oo#..", "..#oo#..", "...##...", "...#....", "########", "#.#.#.##", "########"],
  terminal: ["########", "#......#", "#.#....#", "#..#...#", "#.#.oo.#", "#......#", "########", "...##..."],
  flag: ["#ooooo..", "#oooooo.", "#ooooo..", "#.......", "#.......", "#.......", "#.......", "##......"],
  star: ["...##...", "...##...", "########", ".######.", "..####..", ".##..##.", ".#....#.", "........"],
  heart: [".##..##.", "#oo##oo#", "#oooooo#", "#oooooo#", ".#oooo#.", "..#oo#..", "...##...", "........"],
  eye: ["........", "..####..", ".#oooo#.", "#oo##oo#", "#oo##oo#", ".#oooo#.", "..####..", "........"],
};

// ---------------------------------------------------------------- run-length rects
export interface PixelRect {
  x: number;
  y: number;
  w: number;
  color: string;
}

/**
 * Merges each row into horizontal runs of one colour, so an SVG draws a 24x32
 * sprite with ~150 rects instead of ~500. Transparent cells are skipped.
 */
export function gridRuns(grid: PixelGrid, palette: PixelPalette): PixelRect[] {
  const rects: PixelRect[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const color = palette[ch];
      if (ch === "." || !color || color === "transparent") {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end += 1;
      rects.push({ x, y, w: end - x, color });
      x = end;
    }
  });
  return rects;
}

/** Width and height of a grid; throws on ragged rows (caught by tests, never at runtime). */
export function gridSize(grid: PixelGrid): { w: number; h: number } {
  const w = grid[0]?.length ?? 0;
  for (const row of grid) {
    if (row.length !== w) throw new Error(`ragged pixel grid row: "${row}" (${row.length} != ${w})`);
  }
  return { w, h: grid.length };
}
