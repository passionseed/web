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
import {
  BIG_FISH,
  CROC,
  CROC_PEEK,
  STOOL,
  STOOL_PALETTE,
  TUKTUK,
  TUKTUK_PALETTE,
  bubbles,
  crocPalette,
  fishPalette,
  flip,
  mahanakhon,
  powerLines,
  prang,
  scaled,
  school,
  skytrain,
  skytrainTrack,
  templeHall,
  weed,
} from "./bangkokKit";

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
export const CERT = [
  "PPPPPPPPPPPP",
  "PLLLLLLLLLLP",
  "PPPPPPPPPPPP",
  "PLLLLLLLPPPP",
  "PPPPPPPPPRRP",
  "PLLLLPPPPRRP",
  "PPPPPPPPPPPP",
];
export const CERT_PALETTE = { P: PX.cream, L: PX.cloudShade, R: PX.accentDark };

/** A tester on the rooftop: head, body, legs. Kept cool so the student stays the only orange. */
export const PERSON = [".HH.", ".SS.", "BBBB", "BBBB", ".DD.", ".D.D"];

export function personPalette(body: string) {
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
  // Tile A keeps one plain tall tower; B and C get Bangkok's own landmarks.
  out.push(...building(92, 88, 10, WATER, { body: PX.far, roof: "antenna" }));
  return out;
}

/** Row colour of the sky gradient, for anything that cuts holes in a building. */
function skyAt(y: number): string {
  if (y < 48) return PX.skyTop;
  if (y < 108) return PX.sky;
  return PX.skyHaze;
}

/**
 * Bangkok landmarks, one per tile: a temple hall in the rain (A), MahaNakhon
 * over the student (B), and Wat Arun, the Temple of Dawn, at sunrise (C).
 */
function landmarks(): Rect[] {
  const prangFill = mix(PX.mid, PX.skyHaze, 0.2);
  return [
    ...scaled(templeHall(0, 22, 0, mix(PX.cream, PX.mid, 0.35), mix(PX.accentDark, PX.mid, 0.45), PX.windowLit), 50, WATER, 2),
    ...mahanakhon(320, 90, 12, WATER, mix(PX.far, PX.mid, 0.4), skyAt),
    ...prang(456, WATER, 36, 6, prangFill),
    ...prang(500, WATER, 36, 6, prangFill),
    ...prang(478, WATER, 64, 12, prangFill),
  ];
}

/** BTS viaduct across all three tiles, with a train crossing tile A. */
const BEAM = 118;
function skytrainLine(): Rect[] {
  const fill = mix(PX.mid, PX.near, 0.45);
  return [
    ...skytrainTrack(0, PANO_W, BEAM, WATER, [30, 96, 150, 214, 336, 392, 530], fill),
    ...skytrain(34, BEAM),
  ];
}

/** Street things caught in the flood: power-line tangle, a tuk-tuk, a stool. */
function street(): Rect[] {
  return [
    ...powerLines([[140, 98], [228, 104]], WATER),
    ...scaled(sprite(TUKTUK, TUKTUK_PALETTE, 0, 0), 104, WATER - 12, 2),
  ];
}

function midCity(): Rect[] {
  const blocks: [number, number, number][] = [
    [30, 122, 14],
    [70, 116, 12],
    [128, 124, 16],
    [206, 118, 14],
    [292, 114, 12],
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
    [40, WATER + 20],
    [100, WATER + 14],
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
    ...sprite(STOOL, STOOL_PALETTE, 372, WATER + 5),
    ...underwater(),
  ];
}

/**
 * Life under the flood. Everything is pulled toward the water colour so it
 * reads as submerged; only the croc's eyes keep their light.
 */
function underwater(): Rect[] {
  const fishBody = mix(PX.waterLight, PX.foam, 0.25);
  const deepFish = mix(PX.waterLight, PX.waterDeep, 0.35);
  const weedFill = mix(PX.plant, PX.waterDeep, 0.45);
  return [
    // Tile A: a croc eyeing the certificates.
    ...scaled(sprite(CROC_PEEK, crocPalette(PX.water), 0, 0), 64, WATER + 3, 2),
    [60, WATER + 7, 4, 1, PX.foam],
    [88, WATER + 7, 4, 1, PX.foam],
    ...weed(8, BAND + 3, 10, weedFill),
    // Tile B: a school under the boat and a big pla buek below.
    ...school(196, WATER + 24, 6, fishBody, PX.waterDeep, true),
    ...sprite(BIG_FISH, fishPalette(deepFish, PX.waterDeep), 312, WATER + 32),
    ...bubbles(308, WATER + 30, 4, fishBody),
    ...weed(236, BAND + 3, 12, weedFill),
    // Tile C: a full croc cruising under the Demo Day roof.
    ...scaled(sprite(flip(CROC), crocPalette(PX.waterDeep), 0, 0), 404, WATER + 26, 2),
    ...school(486, WATER + 12, 4, fishBody, PX.waterDeep),
    ...bubbles(470, WATER + 26, 3, fishBody),
    ...weed(520, BAND + 3, 11, weedFill),
  ];
}

/** Everything behind the hero, bottom band included, in panorama cells. */
export function panoramaRects(): { back: Rect[]; front: Rect[] } {
  const above = [
    ...farCity(),
    ...landmarks(),
    ...midCity(),
    ...skytrainLine(),
    ...nearCity(),
    ...street(),
    ...demoRoof(),
  ];
  return {
    back: [...sky(), ...above, ...water(above)],
    front: waveBand(BAND, PX.ink, 12, PANO_W, TILE_H),
  };
}
