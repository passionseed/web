import type { ReactNode } from "react";

import { PassionSeedMark } from "../riso";
import { PIXEL_FONT, Rects } from "../pixel/PixelRects";
import {
  CELL,
  GULL,
  PX,
  bands,
  building,
  cloud,
  glints,
  mix,
  reflect,
  sprite,
  waveBand,
  type Rect,
} from "../pixel/pixelKit";
import { TILE_H, TILE_W } from "./panoramaScene";

/**
 * Inner carousel slide for the SHIFT[1] grid posts: the same flooded city
 * seen as a thin strip, then a dark deck the content sits on. Every slide
 * shares this frame so a swipe feels like one sheet, not twelve.
 */

const WATER = 38;
const DECK = WATER + 10;
const FOOT = TILE_H - 16;

/** Notched corners, the pixel-art way to round a box. */
export const notch = (n: number) =>
  `polygon(0 ${n}px, ${n}px ${n}px, ${n}px 0, calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n}px, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, ${n}px calc(100% - ${n}px), 0 calc(100% - ${n}px))`;

function skyline(): Rect[] {
  const tops = [24, 29, 21, 31, 26, 27, 30, 28, 27, 32, 24, 28];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, WATER, { body: PX.far }));
    x += w;
  });
  // Landmarks stay in the outer edges so the header owns the middle.
  out.push(
    ...building(166, 17, 12, WATER, { body: PX.mid, window: PX.windowDark, lit: 0.25, roof: "antenna" }),
    ...building(2, 20, 12, WATER, { body: PX.mid, window: PX.windowDark, lit: 0.2, roof: "tank" }),
  );
  return out;
}

function StripScene() {
  const above = skyline();
  const scene: Rect[] = [
    ...bands(0, TILE_W, [
      [0, PX.skyTop],
      [12, PX.sky],
      [28, PX.skyHaze],
      [WATER, PX.skyHaze],
    ]),
    ...cloud(124, 14, [2, 3]),
    ...sprite(GULL, { W: PX.mid }, 36, 6),
    ...above,
    ...bands(0, TILE_W, [
      [WATER, PX.waterLight],
      [WATER + 4, PX.water],
      [WATER + 9, PX.waterDeep],
      [DECK + 3, PX.waterDeep],
    ]),
    ...reflect(above, WATER, 9),
    ...glints(WATER + 1, WATER + 10, 16),
  ];
  return (
    <svg
      className="absolute inset-0"
      width={TILE_W * CELL}
      height={TILE_H * CELL}
      viewBox={`0 0 ${TILE_W} ${TILE_H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={scene} />
      <Rects rects={waveBand(DECK, PX.ink, 12, TILE_W, TILE_H)} />
      <Rects rects={waveBand(FOOT, mix(PX.ink, "#000000", 0.35), 12, TILE_W, TILE_H)} />
    </svg>
  );
}

export function GridSlideFrame({
  id,
  tag,
  title,
  page,
  children,
}: {
  id: string;
  /** Short English pixel label above the Thai title. */
  tag: string;
  title: string;
  /** e.g. "2/4" */
  page: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: TILE_W * CELL, height: TILE_H * CELL, backgroundColor: PX.sky }}
    >
      <StripScene />
      <div className="absolute inset-x-0 top-[44px] flex flex-col items-center text-center">
        <p className="text-[26px] leading-none tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
          {tag}
        </p>
        <h2
          className="mt-2 font-kodchasan text-[56px] font-bold leading-[1.15]"
          style={{ color: PX.ink, textShadow: `${CELL / 2}px ${CELL / 2}px 0 ${PX.cloudShade}` }}
        >
          {title}
        </h2>
      </div>
      <div
        className="absolute inset-x-0 flex flex-col justify-center gap-14 px-[64px]"
        style={{ top: (DECK + 8) * CELL, height: (FOOT - DECK - 12) * CELL }}
      >
        {children}
      </div>
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-between px-[64px]"
        style={{ top: (FOOT + 4) * CELL }}
      >
        <PassionSeedMark size={30} />
        <p className="text-[24px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}>
          {page}
        </p>
      </div>
    </div>
  );
}

/** Section label: orange pixel square, Thai text, cream on the deck. */
export function DeckLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-[14px] w-[14px] shrink-0" style={{ backgroundColor: PX.accent }} />
      <p className="font-kodchasan text-[34px] font-bold leading-none" style={{ color: PX.cream }}>
        {children}
      </p>
    </div>
  );
}

/** Notched panel on the deck; `hot` swaps to the orange accent for the one thing to notice. */
export function DeckCard({ children, hot, className = "" }: { children: ReactNode; hot?: boolean; className?: string }) {
  return (
    <div
      className={`px-8 py-6 ${className}`}
      style={{
        clipPath: notch(CELL * 2),
        backgroundColor: hot ? PX.accent : mix(PX.ink, PX.near, 0.45),
        color: hot ? PX.ink : PX.cream,
      }}
    >
      {children}
    </div>
  );
}

/** Pixel number plate for steps and days. */
export function Plate({ label, size = 56, hot }: { label: string; size?: number; hot?: boolean }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center leading-none"
      style={{
        ...PIXEL_FONT,
        width: size,
        height: size,
        fontSize: size * 0.55,
        clipPath: notch(CELL),
        backgroundColor: hot ? PX.accent : PX.cream,
        color: PX.ink,
      }}
    >
      {label}
    </span>
  );
}

/** Dim small line under a list item. */
export const MUTED = `${PX.cream}bf`;
