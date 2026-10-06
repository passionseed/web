import { CERT, CERT_PALETTE, PERSON, personPalette } from "../grid/floodPanorama";
import { PX, building, mix, sprite, type Rect } from "../pixel/pixelKit";

/**
 * Props for the SHIFT[1] story Reel, in grid cells, drawn with the same kit
 * and palette as the flooded city so they sit in the world, not on top of it.
 */

export { CERT, CERT_PALETTE };
export const CERT_W = CERT[0].length;
export const CERT_H = CERT.length;

export function certRects(): Rect[] {
  return sprite(CERT, CERT_PALETTE, 0, 0);
}

/**
 * The hammer from the story: a nod to a famous ad about breaking conformity,
 * drawn as our own pixel sledgehammer, no logos.
 */
const HAMMER = [
  "IIIIIIIIII",
  "IGGGGGGGGI",
  "IGLLLLLLGI",
  "IGGGGGGGGI",
  "IIIIWWIIII",
  "....WW....",
  "....WW....",
  "....WW....",
  "....WW....",
  "....WW....",
  "....WW....",
  "....WW....",
  "....KK....",
  "....KK....",
];
export const HAMMER_W = HAMMER[0].length;
export const HAMMER_H = HAMMER.length;

export function hammerRects(): Rect[] {
  return sprite(HAMMER, { I: PX.ink, G: PX.mid, L: PX.far, W: PX.accentDark, K: PX.ink }, 0, 0);
}

/** The "safe" faculty: a big grey block, every window dark, one door. */
export const FACULTY = { w: 64, h: 52, door: { x: 28, w: 8, h: 12 } } as const;

export function facultyRects(): Rect[] {
  const grey = mix(PX.mid, PX.far, 0.3);
  const { w, h, door } = FACULTY;
  return [
    ...building(0, 6, w, h, { body: grey, window: PX.windowDark, lit: 0, roof: "none" }),
    // Pediment and steps: a building that looks like it knows best.
    [-2, 2, w + 4, 4, PX.near],
    [2, 0, w - 4, 2, PX.near],
    [door.x, h - door.h, door.w, door.h, PX.ink],
    [door.x - 4, h - 1, door.w + 8, 1, PX.near],
  ];
}

export const WALKER_W = PERSON[0].length;
export const WALKER_H = PERSON.length;

/** Friends walking in, in muted school-uniform tones. */
export function walkerRects(i: number): Rect[] {
  const shirts = [PX.cream, PX.far, PX.cloudShade, PX.cream, PX.far];
  return sprite(PERSON, personPalette(shirts[i % shirts.length]), 0, 0);
}

/** Exam books piling up, bottom first. */
export const BOOK = { w: 22, h: 4 } as const;
export const BOOK_COUNT = 9;

export function bookRects(i: number): Rect[] {
  const covers = [PX.accentDark, PX.denim, PX.plant, PX.near, PX.waterDeep];
  const cover = covers[i % covers.length];
  const shift = (i * 7) % 5 - 2;
  return [
    [shift, 0, BOOK.w, BOOK.h, cover],
    [shift + 1, 1, BOOK.w - 3, BOOK.h - 2, PX.cream],
    [shift + BOOK.w - 2, 0, 2, BOOK.h, mix(cover, PX.ink, 0.3)],
  ];
}
