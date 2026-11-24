/**
 * Pixel data for the game-story layer: the host NPC (idle, talk, wink, cheer),
 * the player avatar on the profile card, and the badge glyphs. Pure data plus a
 * run-length helper, shared by:
 * - the React components (inline SVG fallback when a webp fails, badge icons),
 * - scripts/radar-guide/art.ts, which rasterises the same grids into
 *   public/radar/guides/host/*.webp so the image and the fallback match.
 *
 * The host is the PassionSeed flame, our own logo, holding a mic. The player
 * avatar is a generic pixel character (hoodie), never a likeness of a real
 * person. No text and no other logos in any grid.
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

/** Native host grid size; the webp is this grid scaled 2x (GUIDE_HOST.spriteSize 64x64). */
export const HOST_GRID = { w: 32, h: 32 } as const;

/** Native avatar grid size (the profile card's player and the story reels' cast). */
export const AVATAR_GRID = { w: 24, h: 32 } as const;

/** Replace the rows of `grid` starting at `at` (a frame that changes only the eyes or the mouth). */
export function withRows(grid: PixelGrid, at: number, rows: PixelGrid): PixelGrid {
  return [...grid.slice(0, at), ...rows, ...grid.slice(at + rows.length)];
}

/*
 * The player avatar: a Thai high-schooler in a hoodie over the school shirt
 * (its collar points show), about 2.3 heads tall and slim (a 12-cell head, a 14-cell body with 1-cell arms), lit from the upper right like
 * P'Seed. Hair, skin, hoodie and trousers each have their own ramp; K is the
 * outer outline and lines inside the figure use the material's own shade.
 * Generic and gender-neutral, so any player can be it. The hoodie takes the
 * career accent (J, j, i).
 * Legend: K outline, H hair, h hair shade, L hair sheen, S skin, s skin shade,
 * d mouth line, R blush, W cream (eye lights, collar, drawstrings, cuffs,
 * socks), f trainers, J hoodie, j hoodie shade, i hoodie light, T trousers,
 * t trousers shade, u trousers light, M open mouth, m tongue.
 */
const AVATAR_IDLE: PixelGrid = [
  "........................",
  "........................",
  "..............K.........",
  ".........KKKKKK.........",
  "........KKhHHLHK........",
  ".......KHhHHHHLHK.......",
  "......KHhHHHHhHLHK......",
  "......KHHssHHssHHK......",
  "......KHSKWSSKWSHK......",
  "......KhSKKSSKKSHK......",
  "......KhSRSSSSRSHK......",
  ".......KSSSddSSSK.......",
  "........KsSSSSSK........",
  ".........KSSSSK.........",
  ".......KKKssssKKK.......",
  ".......KJjWssWjJK.......",
  "......KJJjjWWjjJiK......",
  ".....KjJJJWJJWJJJjK.....",
  ".....KjJJJWJJWJJJjK.....",
  ".....KjjJJWJJJJJJjK.....",
  ".....KjjJJJJJJJJJjK.....",
  ".....KjKJjjjjjjJKjK.....",
  ".....KjKjJJJJJJjKjK.....",
  ".....KSKtttttttTKSK.....",
  ".....KsKTTTTTTTTKsK.....",
  ".....KKKTTtKKtTTKKK.....",
  ".......KTtK..KtuK.......",
  ".......KTtK..KtuK.......",
  ".......KTtK..KtTK.......",
  ".......KWWK..KWWK.......",
  "......KfffK..KfffK......",
  ".......KKK....KKK.......",
];

/** Arms up, happy closed eyes and a grin: the profile card's hero pose. */
const AVATAR_CHEER: PixelGrid = [
  "........................",
  "........................",
  "..............K.........",
  ".........KKKKKK.........",
  "........KKhHHLHK........",
  ".......KHhHHHHLHK.......",
  "..KK..KHhHHHHhHLHK..KK..",
  ".KSSK.KHHSSHHSSHHK.KSSK.",
  ".KSsK.KHSKKSSKKKHK.KsSK.",
  ".KWWK.KhSSKSSKSSHK.KWWK.",
  ".KJjK.KhSRSSSSRSHK.KjJK.",
  ".KJjK..KSSMWWMSSK..KjJK.",
  ".KJJjK..KsSMMSSK..KjJJK.",
  ".KJJJjK..KSSSSK..KjJJJK.",
  "..KJJJjKKKssssKKKjJJJK..",
  "...KKJJJJjWssWjJiiJKK...",
  "......KJJjjWWjjJiK......",
  ".......KJJWJJWJJK.......",
  ".......KJJWJJWJJK.......",
  ".......KjJWJJJJJK.......",
  ".......KjJJJJJJJK.......",
  ".......KjjjjjjjJK.......",
  ".......KjJJJJJJJK.......",
  "........KttttttK........",
  "........KTTTTTTK........",
  "........KTtKKtTK........",
  ".......KTtK..KtuK.......",
  ".......KTtK..KtuK.......",
  ".......KTtK..KtTK.......",
  ".......KWWK..KWWK.......",
  "......KfffK..KfffK......",
  ".......KKK....KKK.......",
];

export const AVATAR_GRIDS = {
  idle: AVATAR_IDLE,
  /** Open mouth: rows 11 and 12 only. */
  talk: withRows(AVATAR_IDLE, 11, [".......KSSSMMSSSK.......", "........KsSmmSSK........"]),
  /** Eyes shut: row 8 only (the lid drops onto the dark lower row). */
  blink: withRows(AVATAR_IDLE, 8, ["......KHSSSSSSSSHK......"]),
  cheer: AVATAR_CHEER,
} as const satisfies Record<string, PixelGrid>;

const AVATAR_BASE_PALETTE: PixelPalette = {
  K: STORY_PALETTE.ink,
  H: "#3a3452",
  h: "#272238",
  L: "#5e5a86",
  S: "#dca27b",
  s: "#b8705c",
  d: "#8a4a48",
  R: "#d9846a",
  W: STORY_PALETTE.cream,
  f: "#d9c8c4",
  T: "#46466e",
  t: "#302f4c",
  u: "#6a6a9a",
  M: "#5c1f2c",
  m: "#b84a58",
};

const HEX6 = /^#[0-9a-f]{6}$/i;

/** Mix two #rrggbb colours (t = 0 is `a`, 1 is `b`). Anything else returns `a` unchanged. */
export function mixHex(a: string, b: string, t: number): string {
  if (!HEX6.test(a) || !HEX6.test(b)) return a;
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const mixed = [0, 1, 2].map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t));
  return `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The avatar in a career's colours: the hoodie in the accent, its shade mixed
 * toward the night plum and its light toward cream, so any accent keeps the
 * same shading. Hair, skin and trousers never change.
 */
export function avatarPalette(accent: string, shade?: string, light?: string): PixelPalette {
  return {
    ...AVATAR_BASE_PALETTE,
    J: accent,
    j: shade ?? mixHex(accent, STORY_PALETTE.plum, 0.45),
    i: light ?? mixHex(accent, STORY_PALETTE.cream, 0.4),
  };
}

// ---------------------------------------------------------------- host (32x32)
/**
 * The host: the PassionSeed flame (our own logo) holding a mic, drawn from
 * the founder's 32x32 pixel logo with the plum disc taken off. 32x32 cells.
 * Legend: K outline, Y flame, B flame light, F flame orange (and feet),
 * N face, E eyes and brows, M mouth, G mic head, g mic shade, h mic handle.
 */
const HOST_IDLE: PixelGrid = [
  "..................K...K.....K...",
  ".................KFK.KYK...KYK..",
  "...............KKKFYKYYK...KYYK.",
  "..............KYYKKKYYYKKKK.KYYK",
  "..........K...KYYYYYYYYYYBYKKYYK",
  ".........KFK.KYYYBYYYYYBBFYKKYYK",
  "........KFFK.KYYYBBYYYBBYYYYYYYK",
  "........KFFYKYYYYYBBYYBBYYYYYYYK",
  ".......KKFFYKYYYYYBBYYBBYYYYYYK.",
  "......KYYFFYYYYYYYBBYYBBYBYYYK..",
  "......KYYKFFYYYYYYBBYYYBBBYYK...",
  ".....KYYKKKFYYYYYBBYYYYYYYKK....",
  ".....KYYYYYYYYYYYYFYYYYYYYK.....",
  ".....KYYYEYYYYYNNFYYYYYYYYK.KK..",
  "..KKKKYYYYEEYNNNNNNYYYYYYYKKYYK.",
  ".KgGGKYYYYYYENNNNNNEEYYYYYKKYYK.",
  ".KGGgKYYYEEENNNNNNNNYEYYYKKYYK..",
  ".KgGGKKYEENNENNNNNEEEYYYYKYYK...",
  "..KhK.KYEENNENNNNEENNEYYKYYK....",
  "..KhKKKYEEEEENNNNEENNEYYYYK.....",
  "..KhYYYYYEEENNNNNEEEEEYKKK......",
  "..KhYYYYYYYYNNNNNNEEEYYK........",
  "..KhKKKKKYYYNNNNNNNYYYK.........",
  "..KhK...KYYYYNNNNNYYYK..........",
  "...K.....KYYYYYYYYYYK...........",
  "..........KYYYYYYYYK............",
  "...........KKYYYYKK.............",
  "............KFKKKKFK............",
  "............KFK..KFK............",
  "...........KFFK..KFFK...........",
  "............KK....KK............",
  "................................",
];
const HOST_TALK: PixelGrid = [
  "..................K...K.....K...",
  ".................KFK.KYK...KYK..",
  "...............KKKFYKYYK...KYYK.",
  "..............KYYKKKYYYKKKK.KYYK",
  "..........K...KYYYYYYYYYYBYKKYYK",
  ".........KFK.KYYYBYYYYYBBFYKKYYK",
  "........KFFK.KYYYBBYYYBBYYYYYYYK",
  "........KFFYKYYYYYBBYYBBYYYYYYYK",
  ".......KKFFYKYYYYYBBYYBBYYYYYYK.",
  "......KYYFFYYYYYYYBBYYBBYBYYYK..",
  "......KYYKFFYYYYYYBBYYYBBBYYK...",
  ".....KYYKKKFYYYYYBBYYYYYYYKK....",
  ".....KYYYYYYYYYYYYFYYYYYYYK.....",
  ".....KYYYEYYYYYNNFYYYYYYYYK.KK..",
  "..KKKKYYYYEEYNNNNNNYYYYYYYKKYYK.",
  ".KgGGKYYYYYYENNNNNNEEYYYYYKKYYK.",
  ".KGGgKYYYEEENNNNNNNNYEYYYKKYYK..",
  ".KgGGKKYEENNENNNNNEEEYYYYKYYK...",
  "..KhK.KYEENNENNNNEENNEYYKYYK....",
  "..KhKKKYEEEEENNNNEENNEYYYYK.....",
  "..KhYYYYYEEENNNNNEEEEEYKKK......",
  "..KhYYYYYYYYNNNNNNEEEYYK........",
  "..KhKKKKKYYYNNMMMNNYYYK.........",
  "..KhK...KYYYYNNMNNYYYK..........",
  "...K.....KYYYYYYYYYYK...........",
  "..........KYYYYYYYYK............",
  "...........KKYYYYKK.............",
  "............KFKKKKFK............",
  "............KFK..KFK............",
  "...........KFFK..KFFK...........",
  "............KK....KK............",
  "................................",
];
const HOST_WINK: PixelGrid = [
  "..................K...K.....K...",
  ".................KFK.KYK...KYK..",
  "...............KKKFYKYYK...KYYK.",
  "..............KYYKKKYYYKKKK.KYYK",
  "..........K...KYYYYYYYYYYBYKKYYK",
  ".........KFK.KYYYBYYYYYBBFYKKYYK",
  "........KFFK.KYYYBBYYYBBYYYYYYYK",
  "........KFFYKYYYYYBBYYBBYYYYYYYK",
  ".......KKFFYKYYYYYBBYYBBYYYYYYK.",
  "......KYYFFYYYYYYYBBYYBBYBYYYK..",
  "......KYYKFFYYYYYYBBYYYBBBYYK...",
  ".....KYYKKKFYYYYYBBYYYYYYYKK....",
  ".....KYYYYYYYYYYYYFYYYYYYYK.....",
  ".....KYYYEYYYYYNNFYYYYYYYYK.KK..",
  "..KKKKYYYYEEYNNNNNNYYYYYYYKKYYK.",
  ".KgGGKYYYYYYENNNNNNEEYYYYYKKYYK.",
  ".KGGgKYYYEEENNNNNNNNYEYYYKKYYK..",
  ".KgGGKKYEENNENNNNNNNNYYYYKYYK...",
  "..KhK.KYEENNENNNNNEEENYYKYYK....",
  "..KhKKKYEEEEENNNNENNNEYYYYK.....",
  "..KhYYYYYEEENNNNNENNNEYKKK......",
  "..KhYYYYYYYYNNNNNNNNNYYK........",
  "..KhKKKKKYYYNNNNNNNYYYK.........",
  "..KhK...KYYYYNNNNNYYYK..........",
  "...K.....KYYYYYYYYYYK...........",
  "..........KYYYYYYYYK............",
  "...........KKYYYYKK.............",
  "............KFKKKKFK............",
  "............KFK..KFK............",
  "...........KFFK..KFFK...........",
  "............KK....KK............",
  "................................",
];
const HOST_CHEER: PixelGrid = [
  "..................K...K.....K...",
  ".................KFK.KYK...KYK..",
  "...............KKKFYKYYK...KYYK.",
  "..............KYYKKKYYYKKKK.KYYK",
  "..........K...KYYYYYYYYYYBYKKYYK",
  ".........KFK.KYYYBYYYYYBBFYKKYYK",
  "........KFFK.KYYYBBYYYBBYYYYYYYK",
  "........KFFYKYYYYYBBYYBBYYYYYYYK",
  ".......KKFFYKYYYYYBBYYBBYYYYYYK.",
  "......KYYFFYYYYYYYBBYYBBYBYYYK..",
  "......KYYKFFYYYYYYBBYYYBBBYYK...",
  ".....KYYKKKFYYYYYBBYYYYYYYKK....",
  ".....KYYYYYYYYYYYYFYYYYYYYK.....",
  ".....KYYYEYYYYYNNFYYYYYYYYK.KK..",
  "..KKKKYYYYEEYNNNNNNYYYYYYYKKYYK.",
  ".KgGGKYYYYYYENNNNNNEEYYYYYKKYYK.",
  ".KGGgKYYYNNNNNNNNNNNYEYYYKKYYK..",
  ".KgGGKKYNEEENNNNNNNNNYYYYKYYK...",
  "..KhK.KYENNNENNNNNEEENYYKYYK....",
  "..KhKKKYENNNENNNNENNNEYYYYK.....",
  "..KhYYYYYNNNNNNNNENNNEYKKK......",
  "..KhYYYYYYYYNNNNNNNNNYYK........",
  "..KhKKKKKYYYNMMMMMNYYYK.........",
  "..KhK...KYYYYNMMMNYYYK..........",
  "...K.....KYYYYYYYYYYK...........",
  "..........KYYYYYYYYK............",
  "...........KKYYYYKK.............",
  "............KFKKKKFK............",
  "............KFK..KFK............",
  "...........KFFK..KFFK...........",
  "............KK....KK............",
  "................................",
];

/** Eyes shut for a blink, between idle frames. */
const HOST_BLINK: PixelGrid = [
  "..................K...K.....K...",
  ".................KFK.KYK...KYK..",
  "...............KKKFYKYYK...KYYK.",
  "..............KYYKKKYYYKKKK.KYYK",
  "..........K...KYYYYYYYYYYBYKKYYK",
  ".........KFK.KYYYBYYYYYBBFYKKYYK",
  "........KFFK.KYYYBBYYYBBYYYYYYYK",
  "........KFFYKYYYYYBBYYBBYYYYYYYK",
  ".......KKFFYKYYYYYBBYYBBYYYYYYK.",
  "......KYYFFYYYYYYYBBYYBBYBYYYK..",
  "......KYYKFFYYYYYYBBYYYBBBYYK...",
  ".....KYYKKKFYYYYYBBYYYYYYYKK....",
  ".....KYYYYYYYYYYYYFYYYYYYYK.....",
  ".....KYYYEYYYYYNNFYYYYYYYYK.KK..",
  "..KKKKYYYYEEYNNNNNNYYYYYYYKKYYK.",
  ".KgGGKYYYYYYENNNNNNEEYYYYYKKYYK.",
  ".KGGgKYYYYYYNNNNNNNNYEYYYKKYYK..",
  ".KgGGKKYYNNNNNNNNNNNNYYYYKYYK...",
  "..KhK.KYEEEEENNNNNNNNNYYKYYK....",
  "..KhKKKYYNNNNNNNNEEEEEYYYYK.....",
  "..KhYYYYYYYYNNNNNNNNNNYKKK......",
  "..KhYYYYYYYYNNNNNNNNNYYK........",
  "..KhKKKKKYYYNNNNNNNYYYK.........",
  "..KhK...KYYYYNNNNNYYYK..........",
  "...K.....KYYYYYYYYYYK...........",
  "..........KYYYYYYYYK............",
  "...........KKYYYYKK.............",
  "............KFKKKKFK............",
  "............KFK..KFK............",
  "...........KFFK..KFFK...........",
  "............KK....KK............",
  "................................",
];
/** The flame tips sway a cell: idle alternates with this so the flame burns. */
const HOST_FLICK: PixelGrid = [
  "...................K...K.....K..",
  "..................KFK.KYK...KYK.",
  "...............KKKFYKYYK...KYYK.",
  "..............KYYKKKYYYKKKK.KYYK",
  ".........K....KYYYYYYYYYYBYKKYYK",
  "........KFK..KYYYBYYYYYBBFYKKYYK",
  "........KFFK.KYYYBBYYYBBYYYYYYYK",
  "........KFFYKYYYYYBBYYBBYYYYYYYK",
  ".......KKFFYKYYYYYBBYYBBYYYYYYK.",
  "......KYYFFYYYYYYYBBYYBBYBYYYK..",
  "......KYYKFFYYYYYYBBYYYBBBYYK...",
  ".....KYYKKKFYYYYYBBYYYYYYYKK....",
  ".....KYYYYYYYYYYYYFYYYYYYYK.....",
  ".....KYYYEYYYYYNNFYYYYYYYYK.KK..",
  "..KKKKYYYYEEYNNNNNNYYYYYYYKKYYK.",
  ".KgGGKYYYYYYENNNNNNEEYYYYYKKYYK.",
  ".KGGgKYYYEEENNNNNNNNYEYYYKKYYK..",
  ".KgGGKKYEENNENNNNNEEEYYYYKYYK...",
  "..KhK.KYEENNENNNNEENNEYYKYYK....",
  "..KhKKKYEEEEENNNNEENNEYYYYK.....",
  "..KhYYYYYEEENNNNNEEEEEYKKK......",
  "..KhYYYYYYYYNNNNNNEEEYYK........",
  "..KhKKKKKYYYNNNNNNNYYYK.........",
  "..KhK...KYYYYNNNNNYYYK..........",
  "...K.....KYYYYYYYYYYK...........",
  "..........KYYYYYYYYK............",
  "...........KKYYYYKK.............",
  "............KFKKKKFK............",
  "............KFK..KFK............",
  "...........KFFK..KFFK...........",
  "............KK....KK............",
  "................................",
];

/**
 * Frames: idle and talk flap while the host speaks; wink and cheer are moods;
 * flick and blink animate the idle host (HOST_IDLE_LOOP in story-logic.ts).
 */
export const HOST_GRIDS = {
  idle: HOST_IDLE,
  talk: HOST_TALK,
  wink: HOST_WINK,
  cheer: HOST_CHEER,
  flick: HOST_FLICK,
  blink: HOST_BLINK,
} as const satisfies Record<string, PixelGrid>;
export type HostFrame = keyof typeof HOST_GRIDS;

/** The logo's own colours, plus a mic. */
export const HOST_PALETTE: PixelPalette = {
  K: "#2a0d18",
  Y: "#ffc33e",
  B: "#ffe31e",
  F: "#ff8f19",
  N: "#000000",
  E: "#ffffff",
  M: "#ff6a3d",
  G: "#ece6ee",
  g: "#9a8fa0",
  h: "#5a4a60",
};

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
