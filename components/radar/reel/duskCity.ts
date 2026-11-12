/**
 * Dusk City (company-brain/reels-style.md): palette, the lit-window dot font,
 * and a seeded skyline, so every Career Radar reel reads as a Passion Seed
 * video before anyone reads a word. Pure.
 */

export const DUSK = {
  plum: "#1a0e14",
  plumSoft: "#2a1420",
  cream: "#fff1e6",
  orange: "#ff8a4c",
  orangeDeep: "#ff7a45",
  windows: ["#ffb36b", "#ff9a52", "#ffd08a", "#f45d48"],
  violet: "#8f5bff",
  magenta: "#ff3fb4",
  cyan: "#5ee0ff",
  peak: "#5b2a7a",
  dune: "#7a2030",
} as const;

export const KANIT = "var(--font-rr-kanit), Kanit, 'Noto Sans Thai', sans-serif";
export const PLEX_MONO = "var(--font-rr-mono), 'IBM Plex Mono', ui-monospace, monospace";

/** 5x7 glyphs for the lit-window dot type: digits, money symbols and the keyword. */
const GLYPHS: Record<string, string[]> = {
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  "%": ["##...", "##..#", "...#.", "..#..", ".#...", "#..##", "...##"],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", "..#..", ".#..."],
  "$": ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "฿": ["####.", "#.#.#", "#.#.#", "####.", "#.#.#", "#.#.#", "####."],
  "/": ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  " ": ["...", "...", "...", "...", "...", "...", "..."],
};

export const GLYPH_ROWS = 7;

export function canDotType(text: string): boolean {
  return text.length > 0 && Array.from(text).every((ch) => ch in GLYPHS);
}

export interface Dot {
  col: number;
  row: number;
  lit: boolean;
}

/** Dots for `text`, one blank column between glyphs. */
export function dotGrid(text: string): { dots: Dot[]; cols: number } {
  const dots: Dot[] = [];
  let x = 0;
  for (const ch of Array.from(text)) {
    const glyph = GLYPHS[ch];
    if (!glyph) continue;
    const width = glyph[0].length;
    glyph.forEach((line, row) => {
      Array.from(line).forEach((cell, col) => dots.push({ col: x + col, row, lit: cell === "#" }));
    });
    x += width + 1;
  }
  return { dots, cols: Math.max(0, x - 1) };
}

/** Small, fast, deterministic PRNG (mulberry32), seeded from a string. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = (h ^ (h >>> 16)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  windows: Array<{ x: number; y: number; color: string | null }>;
}

/** The skyline of lit window dots, the same for a slug on every render. */
export function skyline(seed: string, width = 1080, baseY = 1520): Building[] {
  const rand = seededRandom(seed);
  const buildings: Building[] = [];
  let x = -20;
  while (x < width + 20) {
    const w = 70 + Math.floor(rand() * 90);
    const h = 160 + Math.floor(rand() * 330);
    const y = baseY - h;
    const windows: Building["windows"] = [];
    for (let wy = y + 22; wy < baseY - 20; wy += 26) {
      for (let wx = x + 14; wx < x + w - 10; wx += 22) {
        const on = rand() < 0.42;
        windows.push({ x: wx, y: wy, color: on ? DUSK.windows[Math.floor(rand() * DUSK.windows.length)] : null });
      }
    }
    buildings.push({ x, y, w, h, windows });
    x += w + 6 + Math.floor(rand() * 14);
  }
  return buildings;
}
