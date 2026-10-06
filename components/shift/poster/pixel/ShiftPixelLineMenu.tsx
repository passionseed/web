import { POSTER_COHORT, formatThaiDate, priceLabel } from "@/lib/content/shift-cohort";

import { ICON_PALETTE, QUESTION, TROPHY } from "./pixelIcons";
import { PIXEL_FONT, PixelIcon, Rects } from "./PixelRects";
import {
  BIRD,
  BIRD_PALETTE,
  GULL,
  PX,
  STUDENT,
  STUDENT_PALETTE,
  bands,
  boat,
  building,
  cloud,
  disc,
  glints,
  reflect,
  sprite,
  type Rect,
} from "./pixelKit";

/**
 * LINE OA compact rich menu (2500x843), three tap areas:
 * [ apply to the poster round (1250) | last round's projects (625) | ask / send slip (625) ].
 * The tap areas themselves are set in LINE OA Manager; this only draws them.
 */

export const LINE_MENU_W = 2500;
export const LINE_MENU_H = 843;
/** Tap-area widths, left to right. Mirror these in LINE OA Manager. */
export const LINE_MENU_AREAS = [1250, 625, 625] as const;

const COHORT = POSTER_COHORT;
/** 10px cells so the scene keeps the poster's chunky pixel step. */
const CELL = 10;
const SCENE_W = LINE_MENU_AREAS[0] / CELL;
const SCENE_H = LINE_MENU_H / CELL;
const WATER = 62;
const HERO = { x: 84, scale: 1.5, w: 24, gunwale: 14, keel: 18, draft: 4 };
const HERO_TOP = WATER + HERO.draft - HERO.keel * HERO.scale;

function sky(): Rect[] {
  return [
    ...bands(0, SCENE_W, [
      [0, PX.skyTop],
      [22, PX.sky],
      [46, PX.skyHaze],
      [WATER, PX.skyHaze],
    ]),
    ...disc(104, 44, 7, PX.sun),
    ...cloud(84, 20, [3, 4, 3]),
    ...sprite(GULL, { W: PX.mid }, 108, 10),
    ...sprite(GULL, { W: PX.mid }, 115, 15),
  ];
}

function city(): Rect[] {
  const mid = { body: PX.mid, window: PX.near, lit: 0.12 };
  const near = { body: PX.near, window: PX.windowDark, lit: 0.3 };
  return [
    ...building(74, 48, 9, WATER, { body: PX.far }),
    ...building(83, 40, 7, WATER, { body: PX.far, roof: "antenna" }),
    ...building(106, 44, 8, WATER, { body: PX.far }),
    ...building(78, 52, 10, WATER, mid),
    ...building(114, 34, 9, WATER, { ...near, roof: "garden" }),
  ];
}

function heroRects(): Rect[] {
  return [
    ...sprite(STUDENT, STUDENT_PALETTE, 6, HERO.gunwale - STUDENT.length),
    ...boat(0, HERO.gunwale, HERO.w),
    ...sprite(BIRD, BIRD_PALETTE, HERO.w - 6, HERO.gunwale - BIRD.length),
  ];
}

function heroWorld(): Rect[] {
  return heroRects().map(([x, y, w, h, fill]) => [
    HERO.x + x * HERO.scale,
    HERO_TOP + y * HERO.scale,
    w * HERO.scale,
    h * HERO.scale,
    fill,
  ]);
}

function water(above: Rect[]): Rect[] {
  const hullLine = WATER + HERO.draft;
  return [
    ...bands(0, SCENE_W, [
      [WATER, PX.waterLight],
      [WATER + 5, PX.water],
      [WATER + 14, PX.waterDeep],
      [SCENE_H, PX.waterDeep],
    ]),
    ...reflect(above, WATER, 10),
    ...reflect(heroWorld(), hullLine, 4, 0.6),
    ...glints(WATER + 1, SCENE_H, 10, SCENE_W),
    [HERO.x - 3, hullLine, 4, 1, PX.foam],
    [HERO.x + HERO.w * HERO.scale - 1, hullLine, 5, 1, PX.foam],
  ];
}

function Scene() {
  const above = city();
  return (
    <svg
      className="absolute inset-0"
      width={LINE_MENU_AREAS[0]}
      height={LINE_MENU_H}
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={sky()} />
      <Rects rects={above} />
      <Rects rects={water(above)} />
      <g transform={`translate(${HERO.x} ${HERO_TOP}) scale(${HERO.scale})`}>
        <Rects rects={heroRects()} />
      </g>
    </svg>
  );
}

/** Round range as "12-18 ต.ค.", both ends in the same month for every round so far. */
function shortRange(): string {
  const start = Number(COHORT.startDate.slice(8));
  return `${start}-${formatThaiDate(COHORT.endDate, false)}`;
}

function ApplyArea() {
  return (
    <div className="relative h-full overflow-hidden" style={{ width: LINE_MENU_AREAS[0] }}>
      <Scene />
      <div className="absolute left-[70px] top-[56px]">
        <p className="text-[46px] leading-none tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
          7 DAYS · ONLINE
        </p>
        <h1
          className="mt-2 text-[210px] leading-[0.9]"
          style={{ ...PIXEL_FONT, color: PX.ink, textShadow: `${CELL}px ${CELL}px 0 ${PX.cloudShade}` }}
        >
          {COHORT.name}
        </h1>
        <p className="mt-1 font-kodchasan text-[64px] font-bold leading-[1.25]" style={{ color: PX.ink }}>
          {shortRange()} · {priceLabel(COHORT)}
        </p>
      </div>
      <div
        className="absolute bottom-[56px] left-[70px] flex items-center gap-5 px-12 py-5 font-kodchasan text-[76px] font-bold leading-none"
        style={{ backgroundColor: PX.accent, color: PX.cream, boxShadow: `${CELL}px ${CELL}px 0 ${PX.ink}` }}
      >
        สมัครเลย
        <span style={PIXEL_FONT}>&gt;</span>
      </div>
    </div>
  );
}

function SideArea({
  icon,
  title,
  sub,
  dark,
}: {
  icon: string[];
  title: string;
  sub: string;
  dark?: boolean;
}) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-8 text-center"
      style={{
        width: LINE_MENU_AREAS[1],
        backgroundColor: dark ? PX.ink : PX.cream,
        color: dark ? PX.cream : PX.ink,
        borderLeft: `${CELL}px solid ${PX.ink}`,
      }}
    >
      <PixelIcon grid={icon} palette={ICON_PALETTE} scale={18} />
      <div>
        <p className="font-kodchasan text-[84px] font-bold leading-[1.15]">{title}</p>
        <p
          className="mt-3 font-kodchasan text-[46px] font-semibold leading-[1.2]"
          style={{ color: dark ? PX.accentLight : PX.accentDark }}
        >
          {sub}
        </p>
      </div>
    </div>
  );
}

export function ShiftPixelLineMenu() {
  return (
    <div
      id="shift-line-menu"
      className="relative flex shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: LINE_MENU_W, height: LINE_MENU_H, backgroundColor: PX.sky }}
    >
      <ApplyArea />
      <SideArea icon={TROPHY} title="ผลงานรุ่น 1" sub="เว็บจริง คนใช้จริง" dark />
      <SideArea icon={QUESTION} title="ถามพี่" sub="ส่งสลิป / สงสัยอะไร" />
    </div>
  );
}
