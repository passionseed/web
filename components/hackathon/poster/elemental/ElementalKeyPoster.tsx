import type { CSSProperties, ReactNode } from "react";

import { type Cell, type Spine, aetherCluster, blob, charMass, fireGlyphs, flameColumn, tongue } from "./art";
import { EL, EL_FONT } from "./brand";
import { ELEMENTAL, bigDateRange, thaiDateLine } from "./facts";

/**
 * The Next Decade: Elemental key visual, 1080x1350.
 *
 * One scene: a fire on dry open ground under a hazy sky. The flame is real
 * at the base and breaks into a pixel mosaic as it rises. Five thin frames
 * mark the five elements inside that one fire: the flame (Fire), the char
 * and soil at its base (Earth), a blue glitch in the flame (Water), the
 * checkered smoke (Air) and the translucent blocks in the sky (Aether).
 * Identity rules live in ./brand.ts.
 */

export const W = 1080;
export const H = 1350;
const ID = "el-key";
const HORIZON = 858;
const FIRE_X = 560;
const FIRE_Y = 996;

const SPINE: Spine = { baseX: 574, baseY: 910, topY: 318, lean: 92 };

const COLUMN = flameColumn(SPINE);
const RED_BLOB = blob(606, 700, 28, 52, 12, EL.pixelRed, 21);
const BLUE_BLOB = blob(690, 742, 24, 50, 10, EL.waterLight, 22);
const BLUE_CORE = blob(688, 754, 12, 28, 10, EL.water, 23);
const ORANGE_BLOB = blob(618, 620, 20, 24, 12, EL.pixelOrange, 24);
const CHAR = charMass(630, 968, 132, 72, 14, 31);
const ASH = charMass(436, 980, 120, 44, 12, 32, true);
const GLYPHS = fireGlyphs(SPINE);

const AETHER: Cell[] = [
  ...aetherCluster(770, 236, 34, 15, [EL.aetherPale, EL.aetherGrey, EL.aetherOrange], 41),
  ...aetherCluster(52, 318, 30, 10, [EL.aetherPale, EL.aetherGrey], 42),
  ...aetherCluster(846, 560, 32, 9, [EL.aetherOrange, EL.aetherPale], 43),
  ...aetherCluster(150, 706, 28, 8, [EL.aetherOrange, EL.aetherGrey], 44),
  ...aetherCluster(430, 118, 26, 6, [EL.aetherPale, EL.aetherGrey], 45),
];

const TONGUES: [number, number, number, number, number][] = [
  // cx, baseY, width, height, lean
  [FIRE_X, FIRE_Y, 300, 430, 26],
  [FIRE_X - 86, FIRE_Y, 150, 270, -34],
  [FIRE_X + 92, FIRE_Y, 160, 320, 40],
  [FIRE_X + 22, FIRE_Y, 120, 520, 48],
  [FIRE_X - 30, FIRE_Y, 90, 380, -10],
];
const FLAME_LAYERS: [string, number][] = [
  [EL.ember, 1],
  [EL.flame, 0.8],
  [EL.flameLight, 0.6],
  [EL.flameCore, 0.42],
  [EL.flameWhite, 0.24],
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

/** A thin detection frame with the element's label pair inside its top-left corner. */
function Frame({ x, y, w, h, en, th }: { x: number; y: number; w: number; h: number; en: string; th: string }) {
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h, border: `2px solid ${EL.frame}` }}>
      <div className="absolute left-[8px] top-[6px] flex flex-col" style={{ color: EL.text, textShadow: "0 1px 6px rgba(20,12,6,0.55)" }}>
        <span style={{ fontFamily: EL_FONT.mono, fontSize: 15, letterSpacing: "0.12em", lineHeight: "18px" }}>{en.toUpperCase()}</span>
        <span style={{ fontFamily: EL_FONT.display, fontWeight: 500, fontSize: 30, lineHeight: "40px" }}>{th}</span>
      </div>
    </div>
  );
}

/** One line of the credit block: a [Thai tag] or // marker, then the value. */
function Line({ tag, children, style }: { tag: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="flex items-baseline gap-3" style={style}>
      <span style={{ fontFamily: EL_FONT.mono, fontSize: 19, color: EL.textSoft, whiteSpace: "nowrap" }}>{tag}</span>
      <span style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.text }}>{children}</span>
    </div>
  );
}

function el(key: (typeof ELEMENTAL.elements)[number]["key"]) {
  const e = ELEMENTAL.elements.find((x) => x.key === key);
  if (!e) throw new Error(`Unknown element ${key}`);
  return e;
}

export function ElementalKeyPoster({ id = "elemental-key" }: { id?: string }) {
  const thaiList = ELEMENTAL.elements.map((e) => (e.key === "aether" ? e.en : e.th)).join(" · ");
  return (
    <div id={id} className="relative overflow-hidden" style={{ width: W, height: H, backgroundColor: EL.groundNear }}>
      <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={EL.skyTop} />
            <stop offset="0.62" stopColor={EL.skyMid} />
            <stop offset="1" stopColor={EL.skyHaze} />
          </linearGradient>
          <linearGradient id={`${ID}-ground`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={EL.groundFar} />
            <stop offset="0.28" stopColor={EL.groundMid} />
            <stop offset="1" stopColor={EL.groundNear} />
          </linearGradient>
          <linearGradient id={`${ID}-haze`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={EL.skyHaze} stopOpacity="0" />
            <stop offset="0.6" stopColor={EL.skyHaze} stopOpacity="0.55" />
            <stop offset="1" stopColor={EL.skyHaze} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${ID}-foot`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#140d08" stopOpacity="0" />
            <stop offset="1" stopColor="#140d08" stopOpacity="0.62" />
          </linearGradient>
          <radialGradient id={`${ID}-glow`}>
            <stop offset="0" stopColor={EL.flameLight} stopOpacity="0.5" />
            <stop offset="0.45" stopColor={EL.flame} stopOpacity="0.18" />
            <stop offset="1" stopColor={EL.flame} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${ID}-vignette`} cx="0.5" cy="0.46" r="0.75">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.32" />
          </radialGradient>
          <filter id={`${ID}-soil`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.024 0.06" numOctaves="4" seed="8" />
            <feColorMatrix values="0 0 0 0 0.13  0 0 0 0 0.09  0 0 0 0 0.06  1.6 0 0 0 -0.58" />
          </filter>
          <filter id={`${ID}-grass`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.45 0.7" numOctaves="2" seed="13" />
            <feColorMatrix values="0 0 0 0 0.62  0 0 0 0 0.5  0 0 0 0 0.36  1.3 0 0 0 -0.7" />
          </filter>
          <filter id={`${ID}-flame`} x="-60%" y="-60%" width="220%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.021 0.052" numOctaves="2" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="66" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
          <filter id={`${ID}-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.3" />
          </filter>
          <filter id={`${ID}-blur`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id={`${ID}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" seed="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>

        {/* Sky, ground, haze on the horizon */}
        <rect width={W} height={HORIZON} fill={`url(#${ID}-sky)`} />
        <rect y={HORIZON} width={W} height={H - HORIZON} fill={`url(#${ID}-ground)`} />
        <rect y={HORIZON} width={W} height={H - HORIZON} filter={`url(#${ID}-soil)`} />
        <rect y={HORIZON + 6} width={W} height={H - HORIZON} filter={`url(#${ID}-grass)`} opacity="0.3" />
        <rect y={HORIZON - 70} width={W} height={96} fill={`url(#${ID}-haze)`} opacity="0.7" />

        {/* Aether: translucent blocks in the sky */}
        <g filter={`url(#${ID}-soft)`}>
          <Cells cells={AETHER} />
        </g>

        {/* Firelight on the air and the ground */}
        <circle cx={FIRE_X + 10} cy={FIRE_Y - 170} r={420} fill={`url(#${ID}-glow)`} />
        <ellipse cx={FIRE_X} cy={FIRE_Y + 4} rx={270} ry={44} fill={EL.flameLight} opacity="0.38" filter={`url(#${ID}-blur)`} />

        {/* The real flame: a soft blurred copy for heat, then the sharp one */}
        <g filter={`url(#${ID}-blur)`} opacity="0.55">
          {TONGUES.map(([cx, by, w, h, lean]) => (
            <path key={`halo-${cx}-${h}`} d={tongue(cx, by, w * 1.15, h * 1.05, lean)} fill={EL.flame} />
          ))}
        </g>
        <g filter={`url(#${ID}-flame)`}>
          {FLAME_LAYERS.map(([fill, k]) => (
            <g key={fill} opacity={k === 1 ? 0.92 : 1}>
              {TONGUES.map(([cx, by, w, h, lean]) => (
                <path key={`${cx}-${h}`} d={tongue(cx, by + 4, w * k, h * (0.55 + k * 0.45), lean * k)} fill={fill} />
              ))}
            </g>
          ))}
        </g>

        {/* The flame breaking into pixels as it rises */}
        <g shapeRendering="crispEdges">
          <Cells cells={COLUMN} />
          <Cells cells={RED_BLOB} />
          <Cells cells={ORANGE_BLOB} />
          <Cells cells={BLUE_BLOB} />
          <Cells cells={BLUE_CORE} />
          <Cells cells={ASH} />
          <Cells cells={CHAR} />
        </g>
        {GLYPHS.map((g, i) => (
          <text
            key={i}
            x={g.x}
            y={g.y}
            fill={g.fill}
            fontFamily={EL_FONT.mono}
            fontWeight={700}
            fontSize={g.size}
            opacity={0.9}
            transform={`rotate(${g.rotate} ${g.x} ${g.y})`}
          >
            {g.ch}
          </text>
        ))}

        {/* Foot shade for the credit block, vignette, then grain over all */}
        <rect y={1010} width={W} height={H - 1010} fill={`url(#${ID}-foot)`} />
        <rect width={W} height={H} fill={`url(#${ID}-vignette)`} />
        <rect width={W} height={H} filter={`url(#${ID}-grain)`} opacity="0.2" style={{ mixBlendMode: "overlay" }} />
      </svg>

      {/* Five elements in one fire */}
      <Frame x={414} y={640} w={250} h={356} en={el("fire").en} th={el("fire").th} />
      <Frame x={652} y={690} w={96} h={150} en={el("water").en} th={el("water").th} />
      <Frame x={572} y={330} w={160} h={210} en={el("air").en} th={el("air").th} />
      <Frame x={622} y={958} w={150} h={92} en={el("earth").en} th={el("earth").th} />
      <Frame x={752} y={214} w={262} h={184} en={el("aether").en} th={el("aether").th} />

      {/* Series mark, top left */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hackathon/HackLogo.png"
        alt={ELEMENTAL.series}
        width={210}
        height={84}
        className="absolute left-[60px] top-[52px]"
        style={{ filter: "brightness(0) invert(1)", opacity: 0.92 }}
      />

      {/* Title: the four elements every Thai student knows */}
      <h1
        className="absolute left-[56px] top-[168px] m-0"
        style={{ fontFamily: EL_FONT.display, fontWeight: 200, fontSize: 172, lineHeight: 1.18, color: EL.text, letterSpacing: "-0.01em" }}
      >
        {el("earth").th} {el("water").th}
        <br />
        {el("air").th} {el("fire").th}
      </h1>

      {/* Edition, top right */}
      <div className="absolute right-[64px] top-[58px] text-right" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.text }}>
        <div style={{ fontSize: 30, lineHeight: "40px", color: EL.textSoft }}>= {ELEMENTAL.series}</div>
        <div style={{ fontSize: 54, lineHeight: "64px" }}>{ELEMENTAL.edition} //</div>
      </div>

      {/* Credit block on the ground */}
      <div className="absolute left-[64px] top-[1080px] flex flex-col gap-[10px]">
        <Line tag="[วันที่]">
          <span style={{ fontSize: 96, fontWeight: 200, lineHeight: "96px" }}>{bigDateRange()}</span>
        </Line>
        <Line tag="//" style={{ fontSize: 26 }}>
          {thaiDateLine()} · {ELEMENTAL.days} วัน
        </Line>
        <Line tag="[ค่าสมัคร]" style={{ fontSize: 30 }}>
          ฿{ELEMENTAL.priceBaht} / คน
        </Line>
        <Line tag="//" style={{ fontSize: 26 }}>
          มากับเพื่อน ฿{ELEMENTAL.groupPriceBaht} / คน
        </Line>
      </div>
      <div className="absolute left-[620px] top-[1112px] flex flex-col gap-[12px]" style={{ width: 400 }}>
        <Line tag="[ธีม]" style={{ fontSize: 26 }}>
          {ELEMENTAL.theme}
        </Line>
        <Line tag="[ธาตุ]" style={{ fontSize: 26 }}>
          {thaiList}
        </Line>
        <Line tag="[สมัคร]" style={{ fontSize: 26 }}>
          {ELEMENTAL.url}
        </Line>
        <Line tag="[จัดโดย]" style={{ fontSize: 26 }}>
          PassionSeed
        </Line>
      </div>
    </div>
  );
}
