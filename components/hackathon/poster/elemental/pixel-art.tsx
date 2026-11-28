import { EL } from "./brand";

/**
 * Elemental pixel art, shared by the posters and the pages: the corrupted
 * title letters, the Pixels renderer, the 9x9 icons and the pixel edge.
 * Pure markup with no hooks, so it renders in server and client components.
 */

/** The font size the title glyphs were drawn for (the key poster's title). */
const GLYPH_DRAWN_AT = 124;

/**
 * The title plays on its own word: four letters of "Elemental" are
 * corrupted into pixel glyphs of the elements, the e into toxic water, the
 * m into e-waste (Earth), the a into a gust of smoke (Air) and the last l
 * into fire. Each still reads as its letter. The GIF glitches them in one by
 * one as each element arrives (scripts/render-elemental-gif.mjs --story).
 */
export type GlyphElement = "water" | "earth" | "air" | "fire";
export const GLYPHS: Record<GlyphElement, { rows: string[]; fill: Record<string, string>; up?: number; cell?: number }> = {
  water: {
    // The finer "e" from the poster image Angpao shared on 2026-11-23 ("make e
    // the same one as this"): 13 x 13 cells, read off that image cell by cell.
    rows: [
      "...GLLGGB....",
      "..GLDG.BLGL..",
      ".GLD..B.BDL..",
      ".DGD.....BDL.",
      "DGD......BGB.",
      "DDGGDGGDBDDB.",
      "DDDGGGDDDGDL.",
      "LDD..........",
      "DDD..........",
      ".DDL.........",
      ".LLD.........",
      "..LGG.....DL.",
      "....GLGDLL...",
    ],
    fill: { D: "#1c4e13", G: "#2e6425", L: "#45852a", B: "#84c22e" },
    cell: 5.2,
  },
  earth: {
    rows: [
      "PP.PPPP...PPPP..",
      "PTPP.TPP.PT.TPP.",
      "PP....PgPP....Pg",
      "Pg.....PP.....PP",
      "PP.....TP.....TP",
      "PT.....PP.....PP",
      "PP.....Pg.....PP",
      "cP.....PP.....Pc",
      "PP.....PT.....PP",
      "KKc...cKKc...cKK",
    ],
    fill: { P: "#33603e", T: "#7aa266", g: "#d2a63a", K: "#141414", c: "#c9c4b8" },
  },
  air: {
    rows: ["..sSSSs..", ".S.....S.", ".......S.", "..sSSSSS.", ".S..w..S.", "S..w.w.S.", "S...w.SS.", ".S...S.S.", "..SSS..SS", "........."],
    fill: { S: "#3a3733", s: "#6b6761", w: "#8f8a80" },
    up: -1,
  },
  fire: {
    rows: ["..W..", ".WY..", ".YY..", "..YO.", ".OY..", ".OO..", "..OR.", ".RO..", ".RR..", "..RR.", ".RR..", ".RD..", ".RR..", ".DR..", "DDDD."],
    fill: { W: "#fff4dc", Y: "#ffd57a", O: "#ec6424", R: "#e2461b", D: "#8e2410" },
  },
};
/** Which letters of the edition name turn into which element. */
export const TITLE_GLYPHS: Record<number, GlyphElement> = { 2: "water", 3: "earth", 7: "air", 8: "fire" };

/**
 * One letter that the pixels have taken over. The real letter stays in the
 * line, see-through, so spacing and the baseline don't move, and the glyph
 * sits on it. data-glyph lets the GIF script switch each one on and off.
 */
export function GlyphLetter({ ch, el, on, relative = false }: { ch: string; el: GlyphElement; on: boolean; relative?: boolean }) {
  const g = GLYPHS[el];
  const cell = g.cell ?? 6;
  const w = g.rows[0].length;
  const h = g.rows.length;
  // The cells were drawn for the poster's 124px title. relative sizes them in em, so the glyph fits any font size.
  const unit = (px: number) => (relative ? `${px / GLYPH_DRAWN_AT}em` : `${px}px`);
  return (
    <span data-glyph={el} data-on={on ? "1" : "0"} style={{ position: "relative", display: "inline-block" }}>
      <span data-glyph-letter style={{ color: on ? "transparent" : undefined }}>{ch}</span>
      <svg
        data-glyph-pixels
        width={relative ? undefined : w * cell}
        height={relative ? undefined : h * cell}
        viewBox={`0 0 ${w} ${h}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          width: relative ? unit(w * cell) : undefined,
          height: relative ? unit(h * cell) : undefined,
          bottom: `calc(0.215em + ${unit((g.up ?? 0) * cell)})`,
          transform: "translateX(-50%)",
          visibility: on ? "visible" : "hidden",
        }}
      >
        {g.rows.flatMap((row, y) => Array.from(row).map((c, x) => (g.fill[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={g.fill[c]} /> : null)))}
      </svg>
    </span>
  );
}

/** Pixel art from rows of characters, one cell per character. */
export function Pixels({ rows, fill, cell }: { rows: readonly string[]; fill: Record<string, string>; cell: number }) {
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg width={w * cell} height={h * cell} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block", flex: "none" }}>
      {rows.flatMap((row, y) => Array.from(row).map((c, x) => (fill[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[c]} /> : null)))}
    </svg>
  );
}

/** The small icons in the facts row, 9x9. */
export const ICON = {
  date: ["#.......#", "#########", "#########", "#.......#", "#.#.#.#.#", "#.......#", "#.#.#.#.#", "#.......#", "#########"],
  online: ["..#####..", ".#.....#.", "#..###..#", "..#...#..", ".#..#..#.", "...#.#...", "....#....", ".........", "....#...."],
  prize: ["#########", "#.#####.#", ".#.###.#.", "...###...", "....#....", "....#....", "..#####..", ".#######.", "........."],
  friends: [".##...##.", "####.####", ".##...##.", ".........", "###...###", "####.####", "####.####", ".........", "........."],
  workshop: ["#########", "#.......#", "#.##....#", "#....##.#", "#.###...#", "#.......#", "#########", "...#.#...", "..#...#.."],
  /** A graduation cap with its tassel: who the hackathon is for. */
  school: ["....#....", "...###...", ".#######.", "#########", ".#######.", "#..###...", "#.#...#..", "#..###...", "........."],
  /** A map pin: the Demo Day's place. */
  pin: ["..#####..", ".##...##.", ".#.....#.", ".##...##.", "..#####..", "...###...", "....#....", ".........", "#########"],
} as const;

/**
 * Icons for buttons and controls on the Elemental pages, 9x9 like ICON, so
 * they sit with the poster's own. "#" is the ink.
 */
export const UI_ICON = {
  /** Send in LINE (a chat bubble). */
  chat: [".........", ".#######.", "#########", "##.#.#.##", "#########", ".#######.", "..##.....", "..#......", "........."],
  download: ["....#....", "....#....", "....#....", ".#..#..#.", "..#.#.#..", "...###...", "....#....", "#.......#", "#########"],
  copy: ["..#######", "..#.....#", "#######.#", "#.....#.#", "#.....#.#", "#.....#.#", "#.....###", "#.....#..", "#######.."],
  check: [".........", "........#", ".......##", "......##.", "#....##..", "##..##...", ".####....", "..##.....", "........."],
  arrow: [".........", ".....#...", "......#..", ".......#.", "########.", ".......#.", "......#..", ".....#...", "........."],
  back: [".........", "...#.....", "..#......", ".#.......", ".########", ".#.......", "..#......", "...#.....", "........."],
  /** Share (an arrow leaving a box). */
  share: ["....#....", "...###...", "..#.#.#..", "....#....", "....#....", "##..#..##", "#.......#", "#.......#", "#########"],
  search: [".####....", "#....#...", "#....#...", "#....#...", "#....#...", ".####....", ".....##..", "......##.", ".......##"],
  ticket: [".........", "#########", "#...#...#", "....#....", "#...#...#", "....#....", "#...#...#", "#########", "........."],
  /** One person, drawn like one of the two in ICON.friends ("มาคนเดียว" on the sign-up). */
  solo: ["...###...", "..#####..", "...###...", ".........", "..#####..", ".#######.", ".#######.", ".........", "........."],
} as const;

export type PixelIconName = keyof typeof ICON | keyof typeof UI_ICON;

const ICON_ROWS: Record<PixelIconName, readonly string[]> = { ...ICON, ...UI_ICON };

/**
 * One 9x9 pixel icon. size is a multiple of 9 so every cell is whole pixels
 * (18 = 2px cells). color defaults to the text colour around it.
 */
export function PixelIcon({ name, size = 18, color = "currentColor", label }: { name: PixelIconName; size?: 9 | 18 | 27 | 36; color?: string; label?: string }) {
  const icon = <Pixels rows={ICON_ROWS[name]} fill={{ "#": color }} cell={size / 9} />;
  if (!label) return icon;
  return (
    <span role="img" aria-label={label} className="inline-flex">
      {icon}
    </span>
  );
}

/** A short row of pixels "corrupting" the edge of a card, in the fire palette (BuddyPass, the dark slabs). */
const EDGE_PIXELS = [EL.ember, EL.flame, null, EL.flameLight, EL.flame, null, null, EL.flameCore, EL.ember, null, EL.aetherViolet, null];

export function PixelEdge() {
  return (
    <div aria-hidden className="flex h-2" style={{ backgroundColor: "transparent" }}>
      {Array.from({ length: 36 }, (_, i) => EDGE_PIXELS[(i * 7) % EDGE_PIXELS.length]).map((c, i) => (
        <span key={i} className="h-2 flex-1" style={{ backgroundColor: c ?? "transparent", opacity: c ? 0.9 - (i % 3) * 0.2 : 0 }} />
      ))}
    </div>
  );
}
