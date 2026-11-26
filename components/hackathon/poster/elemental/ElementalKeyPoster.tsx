import { Trirong } from "next/font/google";
import QRCode from "qrcode";
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
  weight: ["200", "300", "400", "500", "600", "700"],
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
/**
 * The same trophy drawn in thin lines, for beside the big light "20,000": the
 * solid one looked too bold next to that number (Angpao, 2026-11-23). 19 x 16
 * cells, one-cell strokes about as thick as the number's strokes.
 */
const TROPHY_LINE = [
  "....###########....",
  ".####.........####.",
  ".#..#.h.......#..#.",
  ".#..#.h.......#..#.",
  ".#..#.........#..#.",
  ".##.#.........#.##.",
  "..####.......####..",
  ".....#.......#.....",
  "......#.....#......",
  ".......#####.......",
  ".........#.........",
  ".........#.........",
  "........###........",
  "......#######......",
  "......#.....#......",
  "......#######......",
];
/**
 * Trophy designs for beside the prize (Angpao, 2026-11-23: "redesign trophy
 * vector"). All are thin-line pixel art; "line" is the first one.
 */
const TROPHIES = {
  // The first, solid trophy. Angpao came back to it after seeing the others (2026-11-23).
  solid: TROPHY,
  line: TROPHY_LINE,
  // A rounded cup with round handles and an outlined plinth.
  cup: [
    "...#############...",
    ".####.........####.",
    "##..#.........#..##",
    "##..#.........#..##",
    ".#..#.........#..#.",
    "..###.........###..",
    "....##.......##....",
    ".....#.......#.....",
    "......##...##......",
    ".......#####.......",
    ".........#.........",
    ".........#.........",
    ".......#####.......",
    ".....#########.....",
    ".....#.......#.....",
    ".....#########.....",
  ],
  // A cup with a star in it, no handles.
  star: [
    ".#############.",
    ".#...........#.",
    ".#.....#.....#.",
    ".#...#####...#.",
    ".#....###....#.",
    ".#....#.#....#.",
    "..#.........#..",
    "..##.......##..",
    "...##.....##...",
    ".....#####.....",
    ".......#.......",
    ".......#.......",
    ".....#####.....",
    "...#########...",
    "...#.......#...",
    "...#########...",
  ],
  // A tall V-shaped goblet with square handles.
  goblet: [
    "...###########...",
    "####.........####",
    "#..#.........#..#",
    "#..##.......##..#",
    "#####.......#####",
    ".....#.....#.....",
    ".....##...##.....",
    "......##.##......",
    ".......###.......",
    "........#........",
    "........#........",
    "........#........",
    "........#........",
    "........#........",
    "......#####......",
    "....#########....",
  ],
  // The rounded cup on a grid twice as fine, so its curves are smoother.
  fine: [
    ".........####################.........",
    ".....############################.....",
    "...#######..................#######...",
    "..###...##..................##...###..",
    ".###....##..................##....###.",
    ".##.....##..................##.....##.",
    ".##.....##..................##.....##.",
    ".##.....##..................##.....##.",
    ".###....##..................##....###.",
    "..###...##..................##...###..",
    "...#######..................#######...",
    ".....#####..................#####.....",
    ".........##................##.........",
    ".........##................##.........",
    "..........##..............##..........",
    "..........###............##...........",
    "...........###..........###...........",
    "............####......####............",
    "..............##########..............",
    "................######................",
    "..................##..................",
    "..................##..................",
    "..................##..................",
    "..................##..................",
    "..............##########..............",
    "..............##########..............",
    "......................................",
    "...........################...........",
    "..........##################..........",
    "..........##..............##..........",
    "..........##################..........",
    "...........################...........",
  ],
} as const;
export type TrophyDesign = keyof typeof TROPHIES;
const TROPHY_FILL: Record<string, string> = { "#": EL.ink, h: "#ffffff", b: EL.ink };

/**
 * The title plays on its own word: four letters of "Elemental" are
 * corrupted into pixel glyphs of the elements, the e into toxic water, the
 * m into e-waste (Earth), the a into a gust of smoke (Air) and the last l
 * into fire. Each still reads as its letter. The GIF glitches them in one by
 * one as each element arrives (scripts/render-elemental-gif.mjs --story).
 */
type GlyphElement = "water" | "earth" | "air" | "fire";
const GLYPHS: Record<GlyphElement, { rows: string[]; fill: Record<string, string>; up?: number; cell?: number }> = {
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
const TITLE_GLYPHS: Record<number, GlyphElement> = { 2: "water", 3: "earth", 7: "air", 8: "fire" };

/**
 * One letter that the pixels have taken over. The real letter stays in the
 * line, see-through, so spacing and the baseline don't move, and the glyph
 * sits on it. data-glyph lets the GIF script switch each one on and off.
 */
function GlyphLetter({ ch, el, on }: { ch: string; el: GlyphElement; on: boolean }) {
  const g = GLYPHS[el];
  const cell = g.cell ?? 6;
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
  workshop: ["#########", "#.......#", "#.##....#", "#....##.#", "#.###...#", "#.......#", "#########", "...#.#...", "..#...#.."],
  /** A graduation cap with its tassel: who the hackathon is for. */
  /** A map pin: the Demo Day's place. */
  pin: ["..#####..", ".##...##.", ".#.....#.", ".##...##.", "..#####..", "...###...", "....#....", ".........", "#########"],
  school: ["....#....", "...###...", ".#######.", "#########", ".#######.", "#..###...", "#.#...#..", "#..###...", "........."],
} as const;

/** One fact in the bottom row: an icon and a few words, all the same size. */
/** The prize's colour: flame yellow, so it leads the bottom block. */
const HIGHLIGHT = "#ffd067";

/** One fact in the bottom row: an icon and a few words, all the same size. */
function Fact({ icon, children, color = EL.cream }: { icon: keyof typeof ICON; children: string; color?: string }) {
  return (
    <span className="flex items-center gap-[9px] whitespace-nowrap">
      <Pixels rows={ICON[icon]} fill={{ "#": color }} cell={3} />
      <span>{children}</span>
    </span>
  );
}

/**
 * Where the posters' QR code goes: the hackathon page first, not straight to
 * the sign-up form (Angpao, 2026-11-23). The page passes ?src= on to the
 * form, so sign-ups from the posters can still be counted (the tag is
 * Claude's choice, 2026-11-23).
 */
export const REGISTER_URL = `https://www.${ELEMENTAL.url}?src=poster`;

/** The sign-up QR code as ink pixels, drawn from the link above. */
export function RegisterQr({ size, fill = EL.ink }: { size: number; fill?: string }) {
  const { modules } = QRCode.create(REGISTER_URL, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label="QR code: sign up" style={{ display: "block" }}>
      <path d={d} fill={fill} />
    </svg>
  );
}

/** The three corner "eyes" of the QR code, one per element: fire, toxic water, ash. [ring, centre]. */
const QR_EYES = [
  ["#c93a16", "#8e2410"],
  ["#2e6425", "#1c4e13"],
  [EL.ink, EL.ink],
] as const;
/** A pixel flame for the middle of the QR code. */
const QR_FLAME = ["...R...", "..RR...", "..ROR..", ".ROOR..", ".ROYOR.", ".ROYOR.", "..RRR.."];
const QR_FLAME_FILL: Record<string, string> = { R: "#e2461b", O: "#f38a36", Y: "#ffd067" };
/** Loose cells breaking off the QR block into the smoke: [left, top, size, colour], in px from the block's corner. */
const QR_SCATTER: [number, number, number, string][] = [
  [-20, 30, 10, EL.cream], [-40, 60, 10, EL.cream], [-20, 100, 10, "#8ecbe6"], [-50, 120, 10, EL.cream], [-20, 160, 10, EL.cream],
  [-30, 200, 10, "#f6b26b"], [-60, 180, 10, EL.cream], [-20, 240, 10, EL.cream], [20, 270, 10, EL.cream], [50, 290, 10, EL.cream],
  [80, 270, 10, "#f6b26b"], [140, 270, 10, EL.cream], [-40, 262, 10, EL.cream], [110, 300, 10, "#8ecbe6"],
];

/**
 * The sign-up QR code in the poster's own language (Angpao, 2026-11-23: "put
 * some design into qr"): a cream pixel block with stepped corners that breaks
 * up into loose cells at its edge, the three corner eyes in the elements'
 * colours, a pixel flame in the middle and an ink label strip. It still has
 * to scan: the data cells stay ink on cream, and the error correction level
 * (Q) covers the cells the flame hides.
 */
function RegisterQrArt({ cell, fire = false, label = true }: { cell: number; fire?: boolean; label?: boolean }) {
  const { modules } = QRCode.create(REGISTER_URL, { errorCorrectionLevel: "Q" });
  const n = modules.size;
  const quiet = 3;
  const eyes: [number, number][] = [[0, 0], [n - 7, 0], [0, n - 7]];
  const mid = (n - 7) / 2;
  const inEye = (x: number, y: number) => eyes.some(([ex, ey]) => x >= ex && x < ex + 7 && y >= ey && y < ey + 7);
  const inMid = (x: number, y: number) => x >= mid && x < mid + 7 && y >= mid && y < mid + 7;
  let data = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(y, x) && !inEye(x, y) && !inMid(x, y)) data += `M${x} ${y}h1v1h-1z`;
  const side = (n + quiet * 2) * cell;
  // Only the bottom-right corner is stepped: the other three hold the code's eyes, which must stay whole to scan.
  const step = "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 10px) calc(100% - 20px), calc(100% - 10px) calc(100% - 10px), calc(100% - 20px) calc(100% - 10px), calc(100% - 20px) 100%, 0 100%)";
  return (
    <div className="relative" style={{ width: side }}>
      {QR_SCATTER.filter(([, top]) => label || top < side - 10).map(([left, top, size, fill], i) => (
        <span key={i} className="absolute" style={{ left, top, width: size, height: size, background: fill }} />
      ))}
      <div style={{ background: EL.cream, clipPath: step }}>
        <svg width={side} height={side} viewBox={`${-quiet} ${-quiet} ${n + quiet * 2} ${n + quiet * 2}`} shapeRendering="crispEdges" role="img" aria-label="QR code: sign up" style={{ display: "block" }}>
          {/* "fire": every cell takes a flame's colours, ink at the top burning down to red. All dark enough to scan. */}
          <defs>
            <linearGradient id="el-qr-fire" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={n}>
              <stop offset="0" stopColor={EL.ink} />
              <stop offset="0.5" stopColor="#6b1c0c" />
              <stop offset="1" stopColor="#c93a16" />
            </linearGradient>
          </defs>
          <path d={data} fill={fire ? "url(#el-qr-fire)" : EL.ink} />
          {eyes.map(([ex, ey], i) => (
            <g key={i}>
              <path fillRule="evenodd" d={`M${ex} ${ey}h7v7h-7zM${ex + 1} ${ey + 1}v5h5v-5z`} fill={fire ? "url(#el-qr-fire)" : QR_EYES[i][0]} />
              <rect x={ex + 2} y={ey + 2} width={3} height={3} fill={fire ? "url(#el-qr-fire)" : QR_EYES[i][1]} />
            </g>
          ))}
          {QR_FLAME.flatMap((row, y) => Array.from(row).map((c, x) => (QR_FLAME_FILL[c] ? <rect key={`${x}-${y}`} x={mid + x} y={mid + y} width={1} height={1} fill={QR_FLAME_FILL[c]} /> : null)))}
        </svg>
        {label ? (
          <div className="flex items-center justify-center gap-[10px] whitespace-nowrap" style={{ background: EL.ink, color: EL.cream, fontFamily: EL_FONT.display, fontWeight: 500, fontSize: 24, lineHeight: "44px" }}>
            <span>สแกนเพื่อสมัคร</span>
            <Pixels rows={["..#..", "...#.", "#####", "...#.", "..#.."]} fill={{ "#": "#ffd067" }} cell={4} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The line (Angpao, 2026-11-23, replacing the wording of 2026-11-21), in two halves for layouts that break it. */
const LINE = ELEMENTAL.taglineTh;
/** A question, then its answer (Angpao, 2026-11-23: "add ? to มือใหม่ไม่เคยแข่ง"). */
const BEGINNER = ["มือใหม่ไม่เคยแข่ง?", "มี workshop สอน"] as const;
/** Who it is for, as a tag in the facts row (Angpao, 2026-11-24: "add tag for มัธยมเท่านั้น", then "m3-m6 เท่านั้น"). */
const WHO = `${ELEMENTAL.gradesTh} เท่านั้น`;

export type BottomDesign = "stack" | "badge" | "number" | "scan" | "table";

/** A small tag in mono brackets, like [ COMING SOON ]. */
function Tag({ children }: { children: string }) {
  return (
    <span className="whitespace-nowrap">
      <span style={{ fontFamily: EL_FONT.mono, opacity: 0.7 }}>[ </span>
      {children}
      <span style={{ fontFamily: EL_FONT.mono, opacity: 0.7 }}> ]</span>
    </span>
  );
}

/**
 * Options for the bottom block (Angpao, 2026-11-23: "2 text lines and tags at
 * the bottom is boring, show me 4 designs"). Same facts in each; only the
 * arrangement changes.
 */
/** How the prize label is kept readable in the "number" design. */
export type PrizeLabel = "tag" | "shadow" | "outline" | "beside";

function BottomBlock({ design, label = "tag", rule = true, side = "facts", trophy = "line", prizeWeight = 200 }: { design: Exclude<BottomDesign, "stack">; label?: PrizeLabel; rule?: boolean; side?: "facts" | "qr"; trophy?: TrophyDesign; prizeWeight?: number }) {
  const date = thaiDayRange();
  const prize = prizeTotal();
  const friends = `฿${ELEMENTAL.groupPriceBaht}`;
  const base = { fontFamily: EL_FONT.display, color: EL.cream } as const;

  // A. The prize as a flat yellow pixel badge beside a two-line slogan; facts as mono tags.
  if (design === "badge") {
    const step = "polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 12px) calc(100% - 24px), calc(100% - 12px) calc(100% - 12px), calc(100% - 24px) calc(100% - 12px), calc(100% - 24px) 100%, 0 100%, 0 24px, 12px 24px, 12px 12px, 24px 12px)";
    return (
      <div className="absolute inset-x-[56px] bottom-[52px]" style={base}>
        <div className="flex items-end justify-between gap-[24px]">
          <div className="whitespace-nowrap" style={{ fontWeight: 500, fontSize: 50, lineHeight: "62px" }}>
            {LINE[0]}
            <br />
            {LINE[1]}
          </div>
          <div style={{ background: HIGHLIGHT, color: EL.ink, padding: "16px 30px 18px 26px", clipPath: step, textAlign: "right", flex: "none" }}>
            <div style={{ fontWeight: 500, fontSize: 25, lineHeight: "32px" }}>รางวัลรวมมูลค่า</div>
            <div className="whitespace-nowrap" style={{ fontWeight: 600, fontSize: 68, lineHeight: "70px", letterSpacing: "-0.01em" }}>
              {prize} <span style={{ fontSize: 34 }}>บาท</span>
            </div>
          </div>
        </div>
        <div className="mt-[28px] flex items-center justify-between" style={{ fontWeight: 400, fontSize: 24 }}>
          <Tag>{date}</Tag>
          <Tag>ออนไลน์</Tag>
          <Tag>{`${BEGINNER[0]} ${BEGINNER[1]}`}</Tag>
          <Tag>{`มากับเพื่อน ${friends}`}</Tag>
        </div>
      </div>
    );
  }

  // B. The number itself is the hero, as light and large as the title; facts stack beside it.
  if (design === "number") {
    return (
      <div className="absolute inset-x-[56px] bottom-[48px]" style={base}>
        <div className="flex items-end justify-between gap-[14px]">
          <div>
            {label === "tag" ? (
              // A solid tag, so the label reads on any part of the photo (Angpao, 2026-11-23: it blended with the background).
              <span className="inline-block whitespace-nowrap" style={{ background: HIGHLIGHT, color: EL.ink, fontWeight: 600, fontSize: 28, lineHeight: "42px", padding: "0 16px" }}>
                รางวัลรวมมูลค่า
              </span>
            ) : label === "shadow" ? (
              // No block: bold yellow type with a soft dark glow behind it.
              <div className="whitespace-nowrap" style={{ fontWeight: 600, fontSize: 34, lineHeight: "44px", color: HIGHLIGHT, textShadow: "0 0 10px rgba(10,10,8,0.95), 0 0 24px rgba(10,10,8,0.85), 0 0 44px rgba(10,10,8,0.6)" }}>
                รางวัลรวมมูลค่า
              </div>
            ) : label === "outline" ? (
              // No block: cream type with a dark outline, like a subtitle.
              <div className="whitespace-nowrap" style={{ fontWeight: 600, fontSize: 34, lineHeight: "44px", color: EL.cream, WebkitTextStroke: "6px rgba(15,15,13,0.9)", paintOrder: "stroke fill" }}>
                รางวัลรวมมูลค่า
              </div>
            ) : null}
            <div className="flex items-end whitespace-nowrap" style={{ color: HIGHLIGHT }}>
              {/* The pixel trophy leads the prize (Angpao, 2026-11-23). */}
              {/* As tall as the digits and standing on their baseline (Angpao, 2026-11-23). */}
              <span style={{ marginRight: 18, paddingBottom: 18 }}>
                <Pixels rows={TROPHIES[trophy]} fill={{ "#": HIGHLIGHT, h: "#ffffff", b: HIGHLIGHT }} cell={((side === "qr" ? 7 : 6) * 16) / TROPHIES[trophy].length} />
              </span>
              {/* `prizeWeight` 700 was the bold try; Angpao kept the light number (2026-11-23: "I like the old normal text more"). Bold digits are wider, so they are set a little smaller. */}
              <span style={{ fontWeight: prizeWeight, fontSize: side === "qr" ? (prizeWeight >= 600 ? 138 : 156) : label === "beside" ? 140 : 160, lineHeight: "176px", letterSpacing: prizeWeight >= 600 ? "-0.02em" : "-0.03em", marginTop: -6, marginBottom: -18 }}>{prize}</span>
              {/* "beside": the label moves down next to the number, where the ground is already dark. */}
              <span className="flex flex-col" style={{ marginLeft: 14, paddingBottom: 12 }}>
                {label === "beside" ? <span style={{ fontWeight: 500, fontSize: 23, lineHeight: "30px", color: EL.cream }}>รางวัลรวมมูลค่า</span> : null}
                <span style={{ fontWeight: 400, fontSize: 50, lineHeight: "54px" }}>บาท</span>
              </span>
            </div>
          </div>
          {side === "qr" ? (
            // The sign-up QR code takes the facts' place; the facts are a row under the title (review note, 2026-11-23).
            <div style={{ background: EL.cream, padding: 9, flex: "none", marginBottom: 0 }}>
              <RegisterQr size={150} />
            </div>
          ) : (
            <div className="flex flex-col gap-[10px] pb-[8px]" style={{ fontWeight: 400, fontSize: 23, lineHeight: "30px", flex: "none" }}>
              <Fact icon="date">{date}</Fact>
              <Fact icon="online">ออนไลน์</Fact>
              <Fact icon="friends">{`มากับเพื่อน ${friends} ต่อคน`}</Fact>
              <span className="flex items-start gap-[9px]">
                <span className="pt-[2px]">
                  <Pixels rows={ICON.workshop} fill={{ "#": EL.cream }} cell={3} />
                </span>
                <span>
                  {BEGINNER[0]}
                  <br />
                  {BEGINNER[1]}
                </span>
              </span>
            </div>
          )}
        </div>
        {/* Light weight (Angpao, 2026-11-23: first "not bold", then "still too bold"). `rule` is the thin line above it. */}
        <div className={rule ? "mt-[16px] border-t pt-[14px]" : "mt-[20px]"} style={{ borderColor: "rgba(243,239,230,0.45)", fontWeight: 300, fontSize: 42, lineHeight: "52px" }}>
          {LINE[0]} {LINE[1]}
        </div>
      </div>
    );
  }

  // C. A scan box that has locked on to the prize, like the teaser video's boxes; facts as solid chips.
  if (design === "scan") {
    const corner = { position: "absolute", width: 12, height: 12, background: EL.cream } as const;
    return (
      <div className="absolute inset-x-[56px] bottom-[52px]" style={base}>
        <div className="relative" style={{ border: `2px solid ${EL.cream}`, padding: "30px 30px 24px" }}>
          <span className="absolute whitespace-nowrap" style={{ top: -19, left: 22, background: EL.cream, color: EL.ink, fontWeight: 500, fontSize: 24, lineHeight: "34px", padding: "0 14px" }}>
            รางวัลรวมมูลค่า
          </span>
          <span style={{ ...corner, right: -7, bottom: -7 }} />
          <span style={{ ...corner, right: -7, top: -7 }} />
          <div className="flex items-center justify-between gap-[20px]">
            <div className="whitespace-nowrap" style={{ fontWeight: 600, fontSize: 88, lineHeight: "92px", letterSpacing: "-0.01em", color: HIGHLIGHT }}>
              {prize} <span style={{ fontSize: 44 }}>บาท</span>
            </div>
            <div style={{ fontWeight: 500, fontSize: 34, lineHeight: "44px", textAlign: "right" }}>
              {LINE[0]}
              <br />
              {LINE[1]}
            </div>
          </div>
        </div>
        <div className="mt-[22px] flex items-center justify-between" style={{ fontWeight: 500, fontSize: 22, lineHeight: "36px", color: EL.ink }}>
          {[date, "ออนไลน์", `${BEGINNER[0]} ${BEGINNER[1]}`, `มากับเพื่อน ${friends}`].map((t) => (
            <span key={t} className="whitespace-nowrap" style={{ background: EL.cream, padding: "0 12px" }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // D. Editorial: the slogan in the title's italic, then a ruled table of labelled facts.
  const cols: [string, string, boolean][] = [
    ["ออนไลน์", date, false],
    ["รางวัลรวมมูลค่า", `${prize} บาท`, true],
    [BEGINNER[0], BEGINNER[1], false],
    ["มากับเพื่อน", `${friends} / คน`, false],
  ];
  return (
    <div className="absolute inset-x-[56px] bottom-[50px]" style={base}>
      <div style={{ fontWeight: 300, fontStyle: "italic", fontSize: 62, lineHeight: "72px", letterSpacing: "-0.01em" }}>
        {LINE[0]}
        <br />
        {LINE[1]}
      </div>
      <div className="mt-[24px] grid" style={{ gridTemplateColumns: "0.72fr 1.22fr 1.3fr 0.9fr", borderTop: "1.5px solid rgba(243,239,230,0.6)" }}>
        {cols.map(([label, value, hot], i) => (
          <div key={label} style={{ padding: `12px 0 0 ${i ? 18 : 0}px`, borderLeft: i ? "1.5px solid rgba(243,239,230,0.3)" : undefined }}>
            <div className="whitespace-nowrap" style={{ fontWeight: 400, fontSize: 22, lineHeight: "30px", color: EL.creamSoft }}>{label}</div>
            <div className="whitespace-nowrap" style={{ fontWeight: hot ? 600 : 500, fontSize: hot ? 44 : 30, lineHeight: "48px", color: hot ? HIGHLIGHT : undefined }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * With no options this is the poster Angpao chose on 2026-11-23: the facts in
 * a row under the title, the prize as one big light number with the solid
 * trophy, a plain sign-up QR code at the bottom right, and the line under
 * them. The other values are the layouts tried on the way there.
 */
export function ElementalKeyPoster({ id = "elemental-key", sky = "grey", glyphs = true, bottom = "number", label = "beside", rule = false, qr = "bottom", facts = "top", qrStyle = "art", trophy = "solid", prizeWeight = 200, who = WHO }: { id?: string; who?: string; sky?: keyof typeof PLATES; glyphs?: boolean; bottom?: BottomDesign; label?: PrizeLabel; rule?: boolean; qr?: false | "left" | "right" | "bottom"; facts?: "bottom" | "top"; trophy?: TrophyDesign; prizeWeight?: number; qrStyle?: "art" | "plain" | "glass" | "scan" | "fire" }) {
  return (
    <div id={id} className={`${trirong.variable} relative overflow-hidden`} style={{ width: W, height: H, backgroundColor: "#2a2b26" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PLATES[sky]} alt="" width={W} height={H} className="absolute inset-0 h-full w-full" />

      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id="el-key-foot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f0f0d" stopOpacity="0" />
            <stop offset="0.32" stopColor="#0f0f0d" stopOpacity="0.58" />
            <stop offset="0.6" stopColor="#0f0f0d" stopOpacity="0.8" />
            <stop offset="1" stopColor="#0f0f0d" stopOpacity="0.92" />
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
        {/* The dark foot starts 150px lower than at first (Angpao, 2026-11-23: "move it a bit down", three times). */}
        <rect y={H - 300} width={W} height={300} fill="url(#el-key-foot)" />
      </svg>

      {/* The sign-up QR code in the top-right corner, over the top of the smoke (Angpao, 2026-11-23: "try top right instead"). */}
      {qr === "right" ? (
        <div className={qrStyle === "plain" ? "absolute right-[56px] top-[100px]" : "absolute right-[52px] top-[44px]"}>
          {qrStyle === "plain" ? (
            // The plain code on a cream block, no text (Angpao, 2026-11-23: "remove text").
            // It stands beside the title, as tall as "Elemental Hackathon", and
            // 32px higher than the title's top (Angpao, same day: "move up a bit").
            <div style={{ background: EL.cream, padding: 10 }}>
              <RegisterQr size={194} />
            </div>
          ) : qrStyle === "glass" ? (
            // Plain code on blurred glass, no text (Angpao, 2026-11-23). Only the
            // panel is see-through: the code's cells are solid black.
            <div style={{ padding: 14, background: "rgba(243,239,230,0.62)", backdropFilter: "blur(9px)", WebkitBackdropFilter: "blur(9px)", border: "1.5px solid rgba(243,239,230,0.75)" }}>
              <RegisterQr size={165} fill="#000000" />
            </div>
          ) : qrStyle === "scan" ? (
            // A scan box that has locked on to the code, like the teaser video's boxes.
            <div className="relative" style={{ padding: 12 }}>
              <div className="absolute inset-0" style={{ border: `2px solid ${EL.cream}` }} />
              {[["-7px", "-7px", "auto", "auto"], ["auto", "-7px", "-7px", "auto"], ["-7px", "auto", "auto", "-7px"], ["auto", "auto", "-7px", "-7px"]].map(([left, top, right, bottom], i) => (
                <span key={i} className="absolute" style={{ left, top, right, bottom, width: 12, height: 12, background: EL.cream }} />
              ))}
              <span className="absolute whitespace-nowrap" style={{ top: -19, left: 18, background: EL.cream, color: EL.ink, fontFamily: EL_FONT.display, fontWeight: 500, fontSize: 22, lineHeight: "32px", padding: "0 12px" }}>
                สแกนเพื่อสมัคร
              </span>
              <div style={{ background: EL.cream, padding: 12 }}>
                <RegisterQr size={165} />
              </div>
            </div>
          ) : (
            <RegisterQrArt cell={5} fire={qrStyle === "fire"} label={qrStyle !== "fire"} />
          )}
        </div>
      ) : null}

      {/* Title lockup: series above, English title, the Thai elements as its second half */}
      <div className={`absolute left-[56px] ${qr === "left" ? "top-[40px]" : "top-[46px]"}`} style={{ color: EL.ink }}>
        {/* Co-brand lockup: The Next Decade × PassionSeed. With `qr`, the sign-up QR code leads it (Angpao, 2026-11-23: at the top left). */}
        {qr === "left" ? (
          <div className="flex items-center gap-[22px]" style={{ marginLeft: 4 }}>
            <div style={{ background: EL.cream, padding: 8, flex: "none" }}>
              <RegisterQr size={132} />
            </div>
            <div>
              <div className="flex items-center gap-[18px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={125} height={50} style={{ filter: "brightness(0)", opacity: 0.85 }} />
                <span style={{ fontFamily: EL_FONT.mono, fontSize: 20, color: EL.inkSoft }}>×</span>
                <span className="flex items-center gap-[10px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/passion-seed-logo.png" alt="" width={50} height={50} />
                  {/* The site's font for the name, Libre Franklin, in regular weight (Angpao, 2026-11-23: Libre Franklin, not bold). */}
              <span style={{ fontFamily: "var(--font-libre-franklin), sans-serif", fontWeight: 400, fontSize: 26, letterSpacing: "-0.01em", color: EL.ink }}>PassionSeed</span>
                </span>
              </div>
              <div className="mt-[14px]" style={{ fontFamily: EL_FONT.display, fontWeight: 500, fontSize: 30, lineHeight: "36px" }}>สแกนเพื่อสมัคร</div>
              <div style={{ fontFamily: EL_FONT.mono, fontSize: 17, lineHeight: "24px", color: EL.inkSoft }}>{ELEMENTAL.url}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-[18px]" style={{ marginLeft: 4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={125} height={50} style={{ filter: "brightness(0)", opacity: 0.85 }} />
            <span style={{ fontFamily: EL_FONT.mono, fontSize: 20, color: EL.inkSoft }}>×</span>
            <span className="flex items-center gap-[10px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/passion-seed-logo.png" alt="" width={50} height={50} />
              {/* The site's font for the name, Libre Franklin, in regular weight (Angpao, 2026-11-23: Libre Franklin, not bold). */}
              <span style={{ fontFamily: "var(--font-libre-franklin), sans-serif", fontWeight: 400, fontSize: 26, letterSpacing: "-0.01em", color: EL.ink }}>PassionSeed</span>
            </span>
          </div>
        )}
        {/* "งานแข่ง" is gone from here (Angpao, 2026-11-23): the line at the bottom now starts with "แข่ง". */}
        <h1 className={qr === "left" ? "m-0 mt-[6px]" : "m-0 mt-[20px]"} style={{ fontFamily: EL_FONT.display, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
          <span className="block" style={{ fontWeight: 200, fontSize: 124 }}>
            {Array.from(ELEMENTAL.edition).map((ch, i) =>
              TITLE_GLYPHS[i] ? <GlyphLetter key={i} ch={ch} el={TITLE_GLYPHS[i]} on={glyphs} /> : ch,
            )}
          </span>
          <span className="block" style={{ fontWeight: 300, fontStyle: "italic", fontSize: 124 }}>
            Hackathon
          </span>
        </h1>
        {/* The facts as a row under the title, in ink on the sky (review note, 2026-11-23: "move the info under here, as a row"). The longest one takes its own line. */}
        {facts === "top" ? (
          <div className="flex flex-wrap items-center gap-x-[24px] gap-y-[6px]" style={{ width: 660, marginLeft: 4, marginTop: 4, fontFamily: EL_FONT.display, fontWeight: 400, fontSize: 23, lineHeight: "32px" }}>
            <Fact icon="date" color={EL.ink}>{thaiDayRange()}</Fact>
            <Fact icon="online" color={EL.ink}>ออนไลน์</Fact>
            <Fact icon="pin" color={EL.ink}>{`Demo Day ที่ ${ELEMENTAL.demoDay.placeTh}`}</Fact>
            <Fact icon="friends" color={EL.ink}>{`มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht} ต่อคน`}</Fact>
            <Fact icon="school" color={EL.ink}>{who}</Fact>
            {/* Last, so the longest fact takes the third line alone (three lines since the Demo Day joined, 2026-11-26). */}
            <Fact icon="workshop" color={EL.ink}>{`${BEGINNER[0]} ${BEGINNER[1]}`}</Fact>
          </div>
        ) : null}
      </div>

      {/*
        The bottom block on the dark ground (Angpao, 2026-11-23): the prize
        first and biggest, in flame yellow; then Angpao's line (2026-11-21; "แข่ง" added in front 2026-11-23);
        then one quiet row of facts: when, online, beginners welcome with
        workshops, and the friend price.
      */}
      {bottom === "stack" ? (
        <div className="absolute inset-x-[56px] bottom-[52px]" style={{ fontFamily: EL_FONT.display, color: EL.cream }}>
          <div className="flex items-center gap-[18px] whitespace-nowrap" style={{ fontWeight: 600, fontSize: 68, lineHeight: "80px", letterSpacing: "-0.01em", color: HIGHLIGHT, marginBottom: 4 }}>
            <Pixels rows={ICON.prize} fill={{ "#": HIGHLIGHT }} cell={6} />
            <span>{`รางวัลรวมมูลค่า ${prizeTotal()} บาท`}</span>
          </div>
          <div style={{ fontWeight: 500, fontSize: 50, lineHeight: "64px", marginBottom: 28 }}>{LINE[0]} {LINE[1]}</div>
          <div className="flex items-center justify-between" style={{ fontWeight: 400, fontSize: 26 }}>
            <Fact icon="date">{thaiDayRange()}</Fact>
            <Fact icon="online">ออนไลน์</Fact>
            <Fact icon="workshop">{`${BEGINNER[0]} ${BEGINNER[1]}`}</Fact>
            <Fact icon="friends">{`มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht}`}</Fact>
          </div>
        </div>
      ) : (
        <BottomBlock design={bottom} label={label} rule={rule} side={qr === "bottom" ? "qr" : "facts"} trophy={trophy} prizeWeight={prizeWeight} />
      )}

      {/* Grain over the type too, so it sits in the same film */}
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
        <rect width={W} height={H} filter="url(#el-key-grain)" opacity="0.1" style={{ mixBlendMode: "overlay" }} />
      </svg>
    </div>
  );
}
