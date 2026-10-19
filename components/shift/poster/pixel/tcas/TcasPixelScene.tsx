import type { ReactNode } from "react";

import { Rects } from "../PixelRects";
import {
  CELL,
  GRID_W,
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
} from "../pixelKit";

/**
 * Shared backdrop for the TCAS infographic sheets: the SHIFT[1] flooded city
 * as a low strip, then deep water the content sits on. Sheets are A4 portrait
 * (1080x1524) so they export straight to a PDF page.
 */

export const SHEET_H = 254;
export const SHEET_WATER = 34;
export const SHEET_DECK = SHEET_WATER + 11;

/** Notched corners, the pixel-art way to round a box. */
export const notch = (n: number) =>
  `polygon(0 ${n}px, ${n}px ${n}px, ${n}px 0, calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n}px, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, ${n}px calc(100% - ${n}px), 0 calc(100% - ${n}px))`;

function sky(): Rect[] {
  return [
    ...bands(0, GRID_W, [
      [0, PX.skyTop],
      [12, PX.sky],
      [26, PX.skyHaze],
      [SHEET_WATER, PX.skyHaze],
    ]),
    ...cloud(118, 20, [2, 3]),
    ...cloud(22, 15, [2, 3]),
    ...sprite(GULL, { W: PX.mid }, 36, 5),
    ...sprite(GULL, { W: PX.mid }, 158, 4),
  ];
}

/** Low skyline with landmarks kept to the edges, clear of the title. */
function skyline(): Rect[] {
  const tops = [24, 28, 21, 29, 25, 26, 28, 27, 25, 30, 23, 26];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 5) % 8);
    out.push(...building(x, top, w, SHEET_WATER, { body: PX.far }));
    x += w;
  });
  out.push(
    ...building(152, 14, 12, SHEET_WATER, { body: PX.mid, window: PX.windowDark, lit: 0.25, roof: "antenna" }),
    ...building(8, 17, 13, SHEET_WATER, { body: PX.mid, window: PX.windowDark, lit: 0.2, roof: "garden" }),
  );
  return out;
}

function water(above: Rect[]): Rect[] {
  return [
    ...bands(0, GRID_W, [
      [SHEET_WATER, PX.waterLight],
      [SHEET_WATER + 4, PX.water],
      [SHEET_WATER + 9, PX.waterDeep],
      [SHEET_DECK + 3, PX.waterDeep],
    ]),
    ...reflect(above, SHEET_WATER, 9),
    ...glints(SHEET_WATER + 1, SHEET_WATER + 12, 16),
  ];
}

/** `band` is the grid row where the darker footer water starts. */
export function TcasPixelScene({ band }: { band: number }) {
  const above = skyline();
  return (
    <svg
      className="absolute inset-0"
      width={GRID_W * CELL}
      height={SHEET_H * CELL}
      viewBox={`0 0 ${GRID_W} ${SHEET_H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={sky()} />
      <Rects rects={above} />
      <Rects rects={water(above)} />
      <Rects rects={waveBand(SHEET_DECK, PX.ink, 12, GRID_W, SHEET_H)} />
      <Rects rects={waveBand(band, mix(PX.ink, "#000000", 0.35), 12, GRID_W, SHEET_H)} />
    </svg>
  );
}

/** Sheet frame: fixed A4-ratio box with the scene behind its children. */
export function TcasSheet({ id, band, children }: { id: string; band: number; children: ReactNode }) {
  return (
    <div
      id={id}
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: GRID_W * CELL, height: SHEET_H * CELL, backgroundColor: PX.sky }}
    >
      <TcasPixelScene band={band} />
      {children}
    </div>
  );
}
