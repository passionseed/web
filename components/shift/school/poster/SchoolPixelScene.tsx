import { Rects } from "@/components/shift/poster/pixel/PixelRects";
import {
  BIRD,
  BIRD_PALETTE,
  CELL,
  GRID_H,
  GRID_W,
  GULL,
  PX,
  RING,
  STUDENT,
  STUDENT_PALETTE,
  bands,
  boat,
  building,
  cloud,
  disc,
  glints,
  mix,
  reflect,
  sprite,
  waveBand,
  type Rect,
} from "@/components/shift/poster/pixel/pixelKit";

/**
 * Pixel scenes for the school poster set, built from the SHIFT[1] flooded
 * city kit. The cover keeps the full city and puts a whole class on the
 * water: three boats, one per builder, the middle one drawn larger. Inner
 * pages drop the water to a skyline strip so the content owns the sheet.
 */

/** Cover rows, in grid cells. */
export const COVER = { water: 140, band: 172 };
/** Inner page rows: skyline waterline, top of the content deck, footer band. */
export const STRIP = { water: 34, deck: 45, band: 210 };

interface Boat {
  x: number;
  scale: number;
  /** Bird on the stern, only on the lead boat. */
  bird?: boolean;
}

const BOAT_W = 24;
const GUNWALE = 14;
const KEEL = 18;
const DRAFT = 5;

const FLOTILLA: Boat[] = [
  { x: 24, scale: 1 },
  { x: 76, scale: 2, bird: true },
  { x: 136, scale: 1 },
];

function boatTop(b: Boat) {
  return COVER.water + DRAFT * b.scale - KEEL * b.scale;
}

/** One builder in a boat, in local cells. */
function boatRects(b: Boat): Rect[] {
  return [
    ...sprite(STUDENT, STUDENT_PALETTE, 6, GUNWALE - STUDENT.length),
    ...boat(0, GUNWALE, BOAT_W),
    ...(b.bird ? sprite(BIRD, BIRD_PALETTE, BOAT_W - 6, GUNWALE - BIRD.length) : []),
  ];
}

function boatWorld(b: Boat): Rect[] {
  const top = boatTop(b);
  return boatRects(b).map(([x, y, w, h, fill]) => [b.x + x * b.scale, top + y * b.scale, w * b.scale, h * b.scale, fill]);
}

function coverSky(): Rect[] {
  return [
    ...bands(0, GRID_W, [
      [0, PX.skyTop],
      [44, PX.sky],
      [100, PX.skyHaze],
      [COVER.water, PX.skyHaze],
    ]),
    ...disc(124, 118, 12, PX.sun),
    ...cloud(100, 106, [3, 5, 4]),
    ...cloud(34, 98, [3, 4]),
    ...sprite(GULL, { W: PX.mid }, 36, 46),
    ...sprite(GULL, { W: PX.mid }, 44, 52),
    ...sprite(GULL, { W: PX.mid }, 150, 38),
  ];
}

function coverCity(): Rect[] {
  const tops = [108, 114, 104, 118, 110, 102, 116, 106, 112, 120, 108, 114];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, COVER.water, { body: PX.far }));
    x += w;
  });
  const midOpts = { body: PX.mid, window: mix(PX.mid, PX.near, 0.5), lit: 0.12 };
  const nearOpts = { body: PX.near, window: PX.windowDark, lit: 0.3 };
  out.push(
    ...building(62, 88, 10, COVER.water, { body: PX.far, roof: "antenna" }),
    ...building(30, 118, 14, COVER.water, midOpts),
    ...building(110, 116, 14, COVER.water, midOpts),
    ...building(132, 110, 12, COVER.water, midOpts),
    ...building(0, 66, 24, COVER.water, { ...nearOpts, roof: "tank" }),
    ...building(156, 58, 24, COVER.water, { ...nearOpts, roof: "antenna" }),
  );
  return out;
}

function coverWater(above: Rect[]): Rect[] {
  const out: Rect[] = [
    ...bands(0, GRID_W, [
      [COVER.water, PX.waterLight],
      [COVER.water + 8, PX.water],
      [COVER.water + 20, PX.waterDeep],
      [COVER.band + 3, PX.waterDeep],
    ]),
    ...reflect(above, COVER.water, 26),
    ...glints(COVER.water + 1, COVER.band, 34),
    ...sprite(RING, { A: PX.accent, W: PX.cream }, 60, COVER.water + 14),
  ];
  for (const b of FLOTILLA) {
    const hull = COVER.water + DRAFT * b.scale;
    out.push(
      ...reflect(boatWorld(b), hull, 5, 0.6),
      [b.x - 3, hull, 4, 1, PX.foam],
      [b.x + BOAT_W * b.scale - 1, hull, 5, 1, PX.foam],
    );
  }
  return out;
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="absolute inset-0"
      width={GRID_W * CELL}
      height={GRID_H * CELL}
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SchoolCoverScene() {
  const above = coverCity();
  return (
    <Sheet>
      <Rects rects={coverSky()} />
      <Rects rects={above} />
      <Rects rects={coverWater(above)} />
      {FLOTILLA.map((b) => (
        <g key={b.x} transform={`translate(${b.x} ${boatTop(b)}) scale(${b.scale})`}>
          <Rects rects={boatRects(b)} />
        </g>
      ))}
      <Rects rects={waveBand(COVER.band, PX.ink)} />
    </Sheet>
  );
}

function stripSky(): Rect[] {
  return [
    ...bands(0, GRID_W, [
      [0, PX.skyTop],
      [12, PX.sky],
      [26, PX.skyHaze],
      [STRIP.water, PX.skyHaze],
    ]),
    ...cloud(120, 20, [2, 3]),
    ...cloud(24, 16, [2, 3]),
    ...sprite(GULL, { W: PX.mid }, 34, 5),
    ...sprite(GULL, { W: PX.mid }, 160, 4),
  ];
}

/** Low skyline; landmarks hug the edges, clear of the long centred Thai headings. */
function stripCity(): Rect[] {
  const tops = [22, 27, 19, 29, 24, 25, 28, 26, 25, 30, 22, 26];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, STRIP.water, { body: PX.far }));
    x += w;
  });
  out.push(
    ...building(162, 13, 12, STRIP.water, { body: PX.mid, window: PX.windowDark, lit: 0.25, roof: "antenna" }),
    ...building(148, 21, 12, STRIP.water, { body: PX.mid, window: PX.windowDark, lit: 0.2 }),
    ...building(4, 18, 12, STRIP.water, { body: PX.mid, window: PX.windowDark, lit: 0.2, roof: "tank" }),
  );
  return out;
}

export function SchoolStripScene() {
  const above = stripCity();
  return (
    <Sheet>
      <Rects rects={stripSky()} />
      <Rects rects={above} />
      <Rects
        rects={[
          ...bands(0, GRID_W, [
            [STRIP.water, PX.waterLight],
            [STRIP.water + 4, PX.water],
            [STRIP.water + 9, PX.waterDeep],
            [STRIP.deck + 3, PX.waterDeep],
          ]),
          ...reflect(above, STRIP.water, 9),
          ...glints(STRIP.water + 1, STRIP.water + 12, 16),
        ]}
      />
      <Rects rects={waveBand(STRIP.deck, PX.ink)} />
      <Rects rects={waveBand(STRIP.band, mix(PX.ink, "#000000", 0.35))} />
    </Sheet>
  );
}
