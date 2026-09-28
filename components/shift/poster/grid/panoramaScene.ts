import {
  BIRD,
  BIRD_PALETTE,
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
} from "../pixel/pixelKit";

/**
 * SHIFT[1] IG grid panorama: one flooded city, three posts wide.
 *
 * Read left to right it is the week's story. Tile A is still raining and the
 * certificates everyone collected are floating away. Tile B is the student
 * already out on the water, building. Tile C is the sun breaking through over
 * a rooftop where a few real people are waiting to try the thing: Demo Day.
 *
 * Same kit and palette as the SHIFT[1] pixel cover, on a 3:4 tile
 * (1080x1440, 180x240 cells), so the IG profile grid shows each tile uncropped.
 */

export const TILE_W = 180;
export const TILE_H = 240;
export const TILES = 3;
export const PANO_W = TILE_W * TILES;

/** Waterline and top of the dark footer band, in grid rows. */
export const WATER = 152;
export const BAND = 198;
const REFLECT_DEPTH = 28;

/** The boat is drawn at 2x so the student stays the focal point of tile B. */
export const HERO = { x: 250, scale: 2, w: 24, gunwale: 14, keel: 18, draft: 10 };
const HERO_TOP = WATER + HERO.draft - HERO.keel * HERO.scale;

/** Demo Day rooftop in tile C, flat roof just above the flood. */
const ROOF = { x: 402, top: 136, w: 56 };

/** Deterministic 0..1 noise, same recipe as the kit, so renders are stable. */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** A certificate: cream sheet, text lines, a red seal. The thing we sink. */
const CERT = [
  "PPPPPPPPPPPP",
  "PLLLLLLLLLLP",
  "PPPPPPPPPPPP",
  "PLLLLLLLPPPP",
  "PPPPPPPPPRRP",
  "PLLLLPPPPRRP",
  "PPPPPPPPPPPP",
];
const CERT_PALETTE = { P: PX.cream, L: PX.cloudShade, R: PX.accentDark };

/** A tester on the rooftop: head, body, legs. Kept cool so the student stays the only orange. */
const PERSON = [".HH.", ".SS.", "BBBB", "BBBB", ".DD.", ".D.D"];

function personPalette(body: string) {
  return { H: PX.ink, S: PX.skin, B: body, D: PX.ink };
}

const PENNANT = ["IAAAA.", "IAAAAA", "IAAAA.", "I.....", "I.....", "I.....", "I....."];

function sky(): Rect[] {
  const stormCloud = mix(PX.cloudShade, PX.mid, 0.35);
  return [
    ...bands(0, PANO_W, [
      [0, PX.skyTop],
      [48, PX.sky],
      [108, PX.skyHaze],
      [WATER, PX.skyHaze],
    ]),
    // Tile C: the sun breaking through behind the skyline.
    ...disc(470, 122, 15, PX.sun),
    ...cloud(420, 112, [3, 5, 4]),
    ...cloud(506, 60, [2, 3]),
    // Tile B: fair-weather clouds, thinning out of the storm.
    ...cloud(300, 72, [3, 4, 3]),
    ...sprite(GULL, { W: PX.mid }, 330, 40),
    ...sprite(GULL, { W: PX.mid }, 338, 46),
    ...sprite(GULL, { W: PX.mid }, 486, 30),
    // Tile A: low heavy clouds still dumping rain.
    ...stormBank(stormCloud),
    ...rain(),
  ];
}

/** A long flat storm bank across tile A, bleeding into tile B. */
function stormBank(fill: string): Rect[] {
  const out: Rect[] = [];
  const domes: [number, number, number[]][] = [
    [-6, 30, [4, 6, 5, 7, 4]],
    [60, 24, [5, 7, 6]],
    [118, 34, [4, 6, 4, 3]],
    [168, 22, [3, 4]],
  ];
  for (const [x, baseY, ds] of domes) {
    out.push(...cloud(x, baseY, ds).map(([cx, cy, w, h, c]): Rect => [cx, cy, w, h, c === PX.cloud ? fill : PX.mid]));
  }
  return out;
}

/** Diagonal rain streaks, dense on the left and dying out before tile B's middle. */
function rain(): Rect[] {
  const out: Rect[] = [];
  const streak = mix(PX.mid, PX.sky, 0.3);
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(hash(i, 17) * 230);
    const fade = x < 150 ? 1 : 1 - (x - 150) / 80;
    if (hash(i, 29) > fade) continue;
    // Below the tile A headline, so the rain never crosses the type.
    const y = 92 + Math.floor(hash(i, 23) * (WATER - 96));
    out.push([x, y, 1, 2, streak], [x - 1, y + 2, 1, 2, streak]);
  }
  return out;
}

function farCity(): Rect[] {
  const tops = [110, 116, 106, 120, 112, 104, 118, 108, 114, 122, 110, 116];
  const out: Rect[] = [];
  let x = 0;
  let i = 0;
  while (x < PANO_W) {
    const top = tops[i % tops.length];
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, WATER, { body: PX.far }));
    x += w;
    i++;
  }
  // One stepped landmark tower per tile, so each post has its own skyline.
  out.push(
    ...building(92, 88, 10, WATER, { body: PX.far, roof: "antenna" }),
    ...building(214, 92, 10, WATER, { body: PX.far, roof: "antenna" }),
    ...building(520, 86, 10, WATER, { body: PX.far, roof: "antenna" }),
  );
  return out;
}

function midCity(): Rect[] {
  const blocks: [number, number, number][] = [
    [30, 122, 14],
    [70, 116, 12],
    [128, 124, 16],
    [206, 118, 14],
    [292, 114, 12],
    [318, 124, 14],
    [380, 120, 12],
    [496, 116, 14],
  ];
  return blocks.flatMap(([x, top, w]) =>
    building(x, top, w, WATER, { body: PX.mid, window: mix(PX.mid, PX.near, 0.5), lit: 0.12 }),
  );
}

/**
 * Near towers sit on the two seams on purpose: in the profile grid they read
 * as whole buildings, which is what ties three posts into one picture.
 */
function nearCity(): Rect[] {
  const opts = { body: PX.near, window: PX.windowDark, lit: 0.3 };
  return [
    ...building(0, 74, 24, WATER, { ...opts, roof: "tank" }),
    ...building(166, 98, 28, WATER, { ...opts, roof: "antenna" }),
    ...building(348, 102, 26, WATER, { ...opts, roof: "garden" }),
    ...building(518, 70, 22, WATER, { ...opts, roof: "tank", lit: 0.5 }),
  ];
}

/** Tile C rooftop: flat roof above the flood, a pennant and three testers. */
function demoRoof(): Rect[] {
  const { x, top, w } = ROOF;
  const shirts = [PX.denim, PX.plant, PX.waterDeep];
  return [
    ...building(x, top, w, WATER, { body: PX.near, window: PX.windowDark, lit: 0.6 }),
    [x - 1, top - 1, w + 2, 1, PX.ink],
    ...sprite(PENNANT, { I: PX.ink, A: PX.accent }, x + 4, top - 8),
    ...shirts.flatMap((shirt, i) => sprite(PERSON, personPalette(shirt), x + 18 + i * 8, top - 7)),
  ];
}

/** Boat, student and bird in local cells, drawn inside a scaled group. */
export function heroRects(): Rect[] {
  return [
    ...sprite(STUDENT, STUDENT_PALETTE, 6, HERO.gunwale - STUDENT.length),
    ...boat(0, HERO.gunwale, HERO.w),
    ...sprite(BIRD, BIRD_PALETTE, HERO.w - 6, HERO.gunwale - BIRD.length),
  ];
}

export const HERO_TRANSFORM = `translate(${HERO.x} ${HERO_TOP}) scale(${HERO.scale})`;

function heroWorld(): Rect[] {
  return heroRects().map(([x, y, w, h, fill]) => [
    HERO.x + x * HERO.scale,
    HERO_TOP + y * HERO.scale,
    w * HERO.scale,
    h * HERO.scale,
    fill,
  ]);
}

/** Certificates drifting in tile A: some flat, one going under. */
function certs(): Rect[] {
  const spots: [number, number][] = [
    [16, WATER + 8],
    [58, WATER + 20],
    [104, WATER + 11],
    [138, WATER + 28],
    [34, WATER + 34],
  ];
  const out = spots.flatMap(([x, y]) => sprite(CERT, CERT_PALETTE, x, y));
  // Half-sunk: only the top rows show, the rest pulled toward deep water.
  sprite(CERT, CERT_PALETTE, 84, WATER + 36).forEach(([x, y, w, h, fill], i) => {
    out.push([x, y, w, h, i < 6 ? fill : mix(fill, PX.waterDeep, 0.7)]);
  });
  return out;
}

/** The boat's wake runs back over the seam into tile A: the student came from the storm. */
function wake(hullLine: number): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < 16; i++) {
    const x = HERO.x - 8 - i * 7;
    const spread = Math.floor(i / 3);
    const tone = i < 6 ? PX.foam : mix(PX.foam, PX.water, 0.4 + i * 0.03);
    out.push([x, hullLine - spread, 4, 1, tone], [x + 2, hullLine + 1 + spread, 4, 1, tone]);
  }
  return out;
}

function water(above: Rect[]): Rect[] {
  const hullLine = WATER + HERO.draft;
  return [
    ...bands(0, PANO_W, [
      [WATER, PX.waterLight],
      [WATER + 8, PX.water],
      [WATER + 22, PX.waterDeep],
      [BAND + 3, PX.waterDeep],
    ]),
    ...reflect(above, WATER, REFLECT_DEPTH),
    ...reflect(heroWorld(), hullLine, 5, 0.6),
    ...glints(WATER + 1, BAND, 90, PANO_W),
    ...wake(hullLine),
    [HERO.x + HERO.w * HERO.scale - 1, hullLine, 5, 1, PX.foam],
    ...certs(),
    ...sprite(RING, { A: PX.accent, W: PX.cream }, 330, WATER + 16),
  ];
}

/** Everything behind the hero, bottom band included, in panorama cells. */
export function panoramaRects(): { back: Rect[]; front: Rect[] } {
  const above = [...farCity(), ...midCity(), ...nearCity(), ...demoRoof()];
  return {
    back: [...sky(), ...above, ...water(above)],
    front: waveBand(BAND, PX.ink, 12, PANO_W, TILE_H),
  };
}
