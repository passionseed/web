import {
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
import { scaled } from "./bangkokKit";
import { deck, sinkingCert } from "./deckCritters";
import { HERO, heroRects } from "./floodPanorama";
import { DECK_TOP } from "./GridSlideFrame";

/**
 * One flooded-city panorama behind all five ad cards. Each card is a 4:5
 * window into it, so the water, certificates and the croc run across the
 * seams: a half-visible thing at the right edge is the swipe cue.
 * Units are cells; one cell is CELL (6) px, so a card is 1080x1350.
 */

export const AD_W = 180;
export const AD_H = 225;
export const AD_CARDS = 5;
export const AD_PANO_W = AD_W * AD_CARDS;

/** Waterline, top of the dark deck the content sits on, and the footer. */
export const AD_WATER = 88;
export const AD_DECK = AD_WATER + 14;
export const AD_FOOT = AD_H - 14;

/** Deterministic 0..1 noise so every render is identical. */
function hash(i: number, salt: number): number {
  const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** A low, half-drowned skyline: short enough to stay under the headlines. */
function skyline(): Rect[] {
  const out: Rect[] = [];
  for (let x = 0, i = 0; x < AD_PANO_W; i++) {
    const w = 8 + Math.floor(hash(i, 1) * 9);
    const top = AD_WATER - 4 - Math.floor(hash(i, 2) * 10);
    const near = hash(i, 3) > 0.7;
    out.push(
      ...building(x, top, w, AD_WATER, near
        ? { body: PX.mid, window: PX.windowDark, lit: 0.3 }
        : { body: PX.far }),
    );
    x += w;
  }
  return out;
}

function sky(): Rect[] {
  return [
    ...bands(0, AD_PANO_W, [
      [0, PX.skyTop],
      [26, PX.sky],
      [64, PX.skyHaze],
      [AD_WATER, PX.skyHaze],
    ]),
    ...[20, 230, 410, 610, 820].flatMap((x, i) => cloud(x, 10 + (i % 2) * 6, [2, 3])),
    ...sprite(GULL, { W: PX.mid }, 150, 54),
    ...sprite(GULL, { W: PX.mid }, 700, 48),
  ];
}

function water(above: Rect[]): Rect[] {
  return [
    ...bands(0, AD_PANO_W, [
      [AD_WATER, PX.waterLight],
      [AD_WATER + 3, PX.water],
      [AD_WATER + 8, PX.waterDeep],
      [AD_DECK + 3, PX.waterDeep],
    ]),
    ...reflect(above, AD_WATER, 8),
    ...glints(AD_WATER + 1, AD_WATER + 10, 60, AD_PANO_W),
    ...waveBand(AD_DECK, DECK_TOP, 12, AD_PANO_W, AD_H),
    ...bands(0, AD_PANO_W, [
      [AD_DECK + 3, DECK_TOP],
      [AD_DECK + 70, PX.ink],
      [AD_H, PX.ink],
    ]),
  ];
}

/** The SHIFT student in the orange boat, floating on card 4. */
const BOAT_X = AD_W * 3 + 118;
function hero(): Rect[] {
  const top = AD_WATER + HERO.draft - HERO.keel * HERO.scale;
  return scaled(heroRects(), BOAT_X, top, HERO.scale);
}

/**
 * Life in the water. Card-local x is `card * AD_W + x`. The certificates
 * sink on the proof cards; the croc straddles the 1|2 seam on purpose.
 */
function critters(): Rect[] {
  const at = (card: number, x: number) => card * AD_W + x;
  return [
    ...sinkingCert(at(0, 14), AD_WATER + 4, 2),
    ...sinkingCert(at(0, 50), AD_WATER + 12, 2, 0.35),
    ...deck.bubbles(at(0, 44), AD_WATER + 14, 4),
    ...deck.croc(at(0, 150), AD_WATER + 2, 2, true),
    ...sinkingCert(at(1, 40), AD_WATER + 8, 2, 0.2),
    ...sinkingCert(at(2, 18), AD_WATER + 6, 2),
    ...sinkingCert(at(2, 58), AD_WATER + 13, 1, 0.45),
    ...deck.school(at(2, 156), AD_WATER + 6, 4, true),
    ...deck.school(at(3, 60), AD_WATER + 5, 3, true),
    ...deck.bubbles(at(3, 30), AD_WATER + 12, 3),
    ...deck.weed(at(4, 166), 10),
  ];
}

export function adSceneRects(): { scene: Rect[]; front: Rect[] } {
  const above = skyline();
  return {
    scene: [...sky(), ...above, ...water(above), ...critters()],
    front: [...hero(), ...waveBand(AD_FOOT, mix(PX.ink, "#000000", 0.35), 12, AD_PANO_W, AD_H)],
  };
}
