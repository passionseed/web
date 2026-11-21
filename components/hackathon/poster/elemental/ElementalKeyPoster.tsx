import { Trirong } from "next/font/google";
import { EL, EL_FONT } from "./brand";
import { ELEMENTAL, prizeTotal, thaiDayRange } from "./facts";

/**
 * Elemental Hackathon key visual, 1080x1350.
 *
 * The image is a plate built by scripts/render-elemental-plate.mjs: a calm
 * river valley poisoned by four pixel elements, spread across the frame.
 * Fire on the right bank (the hero), toxic green water on the left bank,
 * a smog over the hill, and dumped waste on the mound. This component adds
 * the letters breaking out of the fire and the type. Rules: ./brand.ts.
 */

const trirong = Trirong({
  weight: ["200", "300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

export const W = 1080;
export const H = 1350;
const PLATES = {
  grey: "/hackathon/poster/elemental/plate-key.png",
  blue: "/hackathon/poster/elemental/plate-key-blue.png",
} as const;

/** Serif capitals breaking out of the fire, as if it were made of text. */
function fireLetters() {
  let a = 1234567;
  const r = () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
  const word = "ELEMENTALFIRE";
  const colours = ["#f08a3c", "#f6e6c4", "#8a3a1c", "#8ecbe6", "#e2461b"];
  return Array.from({ length: 24 }, (_, i) => ({
    ch: word[i % word.length],
    x: 712 + r() * 190,
    y: 700 + r() * 200,
    size: 22 + Math.round(r() * 22),
    fill: colours[Math.floor(r() * colours.length)],
    rotate: (r() - 0.5) * 16,
  }));
}
const LETTERS = fireLetters();

/** A pixel trophy in black and white: ink cup and base, a white glint (Angpao, 2026-11-20). */
const TROPHY = [
  "###########",
  "#.#h#####.#",
  "#.#h#####.#",
  ".#.h####.#.",
  "...#####...",
  "....###....",
  ".....#.....",
  ".....#.....",
  "...bbbbb...",
  "..bbbbbbb..",
];
const TROPHY_FILL: Record<string, string> = { "#": EL.ink, h: "#ffffff", b: EL.ink };

/**
 * The title plays on its own word: four letters of "Elemental" are
 * corrupted into pixel glyphs of the elements, the e into toxic water, the
 * m into e-waste (Earth), the a into a gust of smoke (Air) and the last l
 * into fire. Each still reads as its letter. The GIF glitches them in one by
 * one as each element arrives (scripts/render-elemental-gif.mjs --story).
 */
type GlyphElement = "water" | "earth" | "air" | "fire";
const GLYPHS: Record<GlyphElement, { rows: string[]; fill: Record<string, string>; up?: number }> = {
  water: {
    rows: ["...GGG...", "..GLLLG..", ".GL...LG.", "GL.....DG", "GAAAAAAAG", "GL.......", "GL.......", ".GL....G.", "..GGGGGD.", "...DDD..."],
    fill: { G: "#4a7d1a", L: "#8dbd3c", A: "#84c424", D: "#244710" },
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
const TITLE_GLYPHS: Record<number, GlyphElement> = { 2: "water", 3: "earth", 7: "air", 8: "fire" };

/**
 * One letter that the pixels have taken over. The real letter stays in the
 * line, see-through, so spacing and the baseline don't move, and the glyph
 * sits on it. data-glyph lets the GIF script switch each one on and off.
 */
function GlyphLetter({ ch, el, on }: { ch: string; el: GlyphElement; on: boolean }) {
  const g = GLYPHS[el];
  const cell = 6;
  const w = g.rows[0].length;
  const h = g.rows.length;
  return (
    <span data-glyph={el} data-on={on ? "1" : "0"} style={{ position: "relative", display: "inline-block" }}>
      <span data-glyph-letter style={{ color: on ? "transparent" : undefined }}>{ch}</span>
      <svg
        data-glyph-pixels
        width={w * cell}
        height={h * cell}
        viewBox={`0 0 ${w} ${h}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
        style={{ position: "absolute", left: "50%", bottom: `calc(0.215em + ${(g.up ?? 0) * cell}px)`, transform: "translateX(-50%)", visibility: on ? "visible" : "hidden" }}
      >
        {g.rows.flatMap((row, y) => Array.from(row).map((c, x) => (g.fill[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={g.fill[c]} /> : null)))}
      </svg>
    </span>
  );
}

/** Pixel art from rows of characters, one cell per character. */
function Pixels({ rows, fill, cell }: { rows: readonly string[]; fill: Record<string, string>; cell: number }) {
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg width={w * cell} height={h * cell} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block", flex: "none" }}>
      {rows.flatMap((row, y) => Array.from(row).map((c, x) => (fill[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[c]} /> : null)))}
    </svg>
  );
}

/** The small icons in the facts row, 9x9. */
const ICON = {
  date: ["#.......#", "#########", "#########", "#.......#", "#.#.#.#.#", "#.......#", "#.#.#.#.#", "#.......#", "#########"],
  online: ["..#####..", ".#.....#.", "#..###..#", "..#...#..", ".#..#..#.", "...#.#...", "....#....", ".........", "....#...."],
  prize: ["#########", "#.#####.#", ".#.###.#.", "...###...", "....#....", "....#....", "..#####..", ".#######.", "........."],
  friends: [".##...##.", "####.####", ".##...##.", ".........", "###...###", "####.####", "####.####", ".........", "........."],
} as const;

/** One fact in the bottom row: an icon and a few words, all the same size. */
function Fact({ icon, children }: { icon: keyof typeof ICON; children: string }) {
  return (
    <span className="flex items-center gap-[10px] whitespace-nowrap">
      <Pixels rows={ICON[icon]} fill={{ "#": EL.cream }} cell={3} />
      <span>{children}</span>
    </span>
  );
}

export function ElementalKeyPoster({ id = "elemental-key", sky = "grey", glyphs = true }: { id?: string; sky?: keyof typeof PLATES; glyphs?: boolean }) {
  return (
    <div id={id} className={`${trirong.variable} relative overflow-hidden`} style={{ width: W, height: H, backgroundColor: "#2a2b26" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PLATES[sky]} alt="" width={W} height={H} className="absolute inset-0 h-full w-full" />

      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id="el-key-foot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f0f0d" stopOpacity="0" />
            <stop offset="0.45" stopColor="#0f0f0d" stopOpacity="0.6" />
            <stop offset="1" stopColor="#0f0f0d" stopOpacity="0.88" />
          </linearGradient>
          <filter id="el-key-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        {LETTERS.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            fill={l.fill}
            fontFamily={EL_FONT.display}
            fontWeight={600}
            fontSize={l.size}
            opacity={0.95}
            transform={`rotate(${l.rotate} ${l.x} ${l.y})`}
          >
            {l.ch}
          </text>
        ))}
        <rect y={H - 360} width={W} height={360} fill="url(#el-key-foot)" />
      </svg>

      {/* Title lockup: series above, English title, the Thai elements as its second half */}
      <div className="absolute left-[56px] top-[46px]" style={{ color: EL.ink }}>
        {/* Co-brand lockup: The Next Decade × PassionSeed */}
        <div className="flex items-center gap-[18px]" style={{ marginLeft: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={125} height={50} style={{ filter: "brightness(0)", opacity: 0.85 }} />
          <span style={{ fontFamily: EL_FONT.mono, fontSize: 20, color: EL.inkSoft }}>×</span>
          <span className="flex items-center gap-[10px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/passion-seed-logo.png" alt="" width={50} height={50} />
            <span style={{ fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 28, color: EL.ink }}>PassionSeed</span>
          </span>
        </div>
        {/* Says it's a competition, for students who don't know the word "hackathon". */}
        <div className="mt-[22px] flex items-center gap-[14px]" style={{ fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 40, lineHeight: "50px", marginLeft: 4 }}>
          <span>งานแข่ง</span>
          <Pixels rows={TROPHY} fill={TROPHY_FILL} cell={4} />
        </div>
        <h1 className="m-0" style={{ fontFamily: EL_FONT.display, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
          <span className="block" style={{ fontWeight: 200, fontSize: 124 }}>
            {Array.from(ELEMENTAL.edition).map((ch, i) =>
              TITLE_GLYPHS[i] ? <GlyphLetter key={i} ch={ch} el={TITLE_GLYPHS[i]} on={glyphs} /> : ch,
            )}
          </span>
          <span className="block" style={{ fontWeight: 300, fontStyle: "italic", fontSize: 124 }}>
            Hackathon
          </span>
        </h1>
      </div>

      {/*
        The line on the dark ground at the bottom, in cream (Bunyasit,
        2026-11-20), then one quiet row of facts: when, online, the prize and
        the friend price.
      */}
      <div className="absolute inset-x-[56px] bottom-[52px]" style={{ fontFamily: EL_FONT.display, color: EL.cream }}>
        <div style={{ fontWeight: 500, fontSize: 50, lineHeight: "64px", marginBottom: 30 }}>สิ่งแวดล้อมไม่ควรถูกทิ้งเพราะเงิน</div>
        <div className="flex items-center justify-between" style={{ fontWeight: 400, fontSize: 30 }}>
          <Fact icon="date">{thaiDayRange()}</Fact>
          <Fact icon="online">ออนไลน์</Fact>
          <Fact icon="prize">{`รางวัลรวม ${prizeTotal()} บาท`}</Fact>
          <Fact icon="friends">{`มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht}`}</Fact>
        </div>
      </div>

      {/* Grain over the type too, so it sits in the same film */}
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
        <rect width={W} height={H} filter="url(#el-key-grain)" opacity="0.1" style={{ mixBlendMode: "overlay" }} />
      </svg>
    </div>
  );
}
