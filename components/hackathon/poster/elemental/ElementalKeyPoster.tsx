import { Trirong } from "next/font/google";
import type { ReactNode } from "react";

import { type Band, type Cell, type Tongue, aetherCluster, pixelFire, reflection, scorch, smokePlume, toxicSpill } from "./art";
import { BACKGROUND, EL, EL_FONT } from "./brand";
import { ELEMENTAL, thaiDateLine } from "./facts";

/**
 * The Next Decade: Elemental key visual, 1080x1350.
 *
 * A calm river valley on faded film: green hill, quiet water, a pale sky.
 * Nothing in the photo is damaged. The damage is all pixels: a fire bursts
 * out of the bank (Fire), its smoke stains the sky (Air), a toxic spill runs
 * down the river (Water), and the ground around it is scorched and cracked
 * (Earth). A few faint blocks in the sky are Aether. Rules: ./brand.ts.
 * Coordinates below are tied to the background photo's crop.
 */

const trirong = Trirong({
  weight: ["200", "300", "400"],
  style: ["normal", "italic"],
  subsets: ["thai", "latin"],
  variable: "--font-trirong",
});

export const W = 1080;
export const H = 1350;
const ID = "el-key";

const FIRE_X = 522;
const FIRE_Y = 900;

const TONGUES: Tongue[] = [
  { cx: FIRE_X, base: FIRE_Y, w: 230, h: 400, lean: -60 },
  { cx: FIRE_X - 70, base: FIRE_Y, w: 130, h: 250, lean: -40 },
  { cx: FIRE_X + 78, base: FIRE_Y, w: 140, h: 300, lean: -30 },
  { cx: FIRE_X + 16, base: FIRE_Y, w: 110, h: 470, lean: -90 },
  { cx: FIRE_X + 140, base: FIRE_Y + 6, w: 80, h: 150, lean: -10 },
];

/** River bands in the photo, in poster pixels. */
const RIVER: Band[] = [
  { y0: 1010, y1: 1044, x0: 0, x1: W },
  { y0: 1092, y1: 1236, x0: 0, x1: W },
  { y0: 952, y1: 994, x0: 640, x1: W },
];

const FIRE = pixelFire(TONGUES);
const SMOKE = smokePlume(FIRE_X - 56, 476, -620, -110);
const SPILL = toxicSpill(RIVER, FIRE_X);
const REFLECTION = reflection(FIRE_X - 56, 1010, 120, 120);
const EARTH: Cell[] = [
  ...scorch(FIRE_X - 20, 914, 250, 34, 31, 6),
  ...scorch(830, 842, 190, 16, 33, 1),
];
const AETHER: Cell[] = [
  ...aetherCluster(760, 360, 34, 11, [EL.aetherGrey, EL.aetherOrange], 41),
  ...aetherCluster(880, 560, 28, 7, [EL.aetherGrey], 42),
  ...aetherCluster(120, 120, 26, 5, [EL.aetherGrey, EL.aetherOrange], 43),
];

function Cells({ cells }: { cells: Cell[] }) {
  return (
    <>
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={c.s} height={c.s} fill={c.fill} opacity={c.o} />
      ))}
    </>
  );
}

/** One item of the bottom strip: a small [Thai tag] over the value. */
function Detail({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span style={{ fontFamily: EL_FONT.mono, fontSize: 15, letterSpacing: "0.04em", color: EL.creamSoft }}>{tag}</span>
      <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontSize: 27, lineHeight: "36px", color: EL.cream }}>{children}</span>
    </div>
  );
}

function name(key: (typeof ELEMENTAL.elements)[number]["key"]) {
  const e = ELEMENTAL.elements.find((x) => x.key === key);
  if (!e) throw new Error(`Unknown element ${key}`);
  return e.th;
}

export function ElementalKeyPoster({ id = "elemental-key" }: { id?: string }) {
  return (
    <div id={id} className={`${trirong.variable} relative overflow-hidden`} style={{ width: W, height: H, backgroundColor: "#2a2b26" }}>
      {/* The healthy place: a real photo, slightly faded */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BACKGROUND.src}
        alt=""
        width={W}
        height={H}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "saturate(0.88) contrast(1.04)" }}
      />

      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <radialGradient id={`${ID}-glow`}>
            <stop offset="0" stopColor={EL.flameLight} stopOpacity="0.62" />
            <stop offset="0.4" stopColor={EL.flame} stopOpacity="0.22" />
            <stop offset="1" stopColor={EL.flame} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${ID}-foot`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f0f0d" stopOpacity="0" />
            <stop offset="1" stopColor="#0f0f0d" stopOpacity="0.72" />
          </linearGradient>
          <filter id={`${ID}-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
          <filter id={`${ID}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>

        {/* Aether: faint blocks in the clean sky */}
        <g filter={`url(#${ID}-soft)`}>
          <Cells cells={AETHER} />
        </g>

        {/* Firelight thrown on the valley */}
        <ellipse cx={FIRE_X} cy={FIRE_Y - 90} rx={380} ry={300} fill={`url(#${ID}-glow)`} style={{ mixBlendMode: "screen" }} />

        <g shapeRendering="crispEdges">
          {/* Air: smoke staining the sky */}
          <Cells cells={SMOKE} />
          {/* Water: the spill down the river, and the fire on the water */}
          <Cells cells={SPILL} />
          <Cells cells={REFLECTION} />
          {/* Earth: scorched, cracked ground */}
          <Cells cells={EARTH} />
          {/* Fire: the hero */}
          <Cells cells={FIRE} />
        </g>

        <rect y={1150} width={W} height={H - 1150} fill={`url(#${ID}-foot)`} />
        <rect width={W} height={H} filter={`url(#${ID}-grain)`} opacity="0.16" style={{ mixBlendMode: "overlay" }} />
      </svg>

      {/* Top line */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hackathon/HackLogo.png"
        alt={ELEMENTAL.series}
        width={140}
        height={56}
        className="absolute left-[52px] top-[44px]"
        style={{ filter: "brightness(0)", opacity: 0.78 }}
      />
      <div
        className="absolute right-[56px] top-[58px]"
        style={{ fontFamily: EL_FONT.mono, fontSize: 15, letterSpacing: "0.16em", color: EL.inkSoft }}
      >
        HACKATHON · {ELEMENTAL.days} DAYS
      </div>

      {/* Title */}
      <div className="absolute inset-x-0 top-[112px] flex flex-col items-center text-center" style={{ color: EL.ink }}>
        <h1 className="m-0" style={{ fontFamily: EL_FONT.display, fontWeight: 200, fontSize: 124, lineHeight: 1.28, letterSpacing: "0.01em" }}>
          {name("earth")} {name("water")} {name("air")} {name("fire")}
        </h1>
        <div style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontStyle: "italic", fontSize: 40, lineHeight: "48px", color: EL.inkSoft }}>
          {ELEMENTAL.series} : {ELEMENTAL.edition}
        </div>
      </div>

      {/* Details */}
      <div className="absolute inset-x-[52px] top-[1252px] flex justify-between border-t pt-[14px]" style={{ borderColor: "rgba(243,239,230,0.35)" }}>
        <Detail tag="[วันที่]">{thaiDateLine()}</Detail>
        <Detail tag="[ค่าสมัคร]">
          ฿{ELEMENTAL.priceBaht} / คน · มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht}
        </Detail>
        <Detail tag="[สมัคร]">{ELEMENTAL.url}</Detail>
      </div>
    </div>
  );
}
