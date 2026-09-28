import { PX, mix, sprite, type Rect } from "../pixel/pixelKit";
import {
  BIG_FISH,
  CROC,
  bubbles,
  crocPalette,
  fishPalette,
  flip,
  scaled,
  school,
  weed,
} from "./bangkokKit";

/**
 * Underwater life for the dark deck of the inner slides. Each slide places a
 * few of these in its own empty space, so the negative space has something
 * quietly going on without competing with the type. Coordinates are tile cells.
 */

const FISH_BODY = mix(PX.waterLight, PX.ink, 0.45);
const FISH_EYE = PX.ink;
const WEED = mix(PX.plant, PX.ink, 0.5);
const BUBBLE = mix(PX.foam, PX.ink, 0.55);

/** Where the weed roots: the top of the footer band. */
const FLOOR = 224;

export const deck = {
  school: (x: number, y: number, count: number, right = false) => school(x, y, count, FISH_BODY, FISH_EYE, right),

  bigFish: (x: number, y: number, scale: number, right = false): Rect[] =>
    scaled(sprite(right ? flip(BIG_FISH) : BIG_FISH, fishPalette(FISH_BODY, FISH_EYE), 0, 0), x, y, scale),

  croc: (x: number, y: number, scale: number, right = true): Rect[] =>
    scaled(sprite(right ? CROC : flip(CROC), crocPalette(PX.ink), 0, 0), x, y, scale),

  weed: (x: number, height: number) => weed(x, FLOOR, height, WEED),

  bubbles: (x: number, y: number, n: number) => bubbles(x, y, n, BUBBLE),
};

/** A certificate sinking through the deck, bright enough to read as paper. */
const CERT = [
  "PPPPPPPPPPPP",
  "PLLLLLLLLLLP",
  "PPPPPPPPPPPP",
  "PLLLLLLLPPPP",
  "PPPPPPPPPRRP",
  "PLLLLPPPPRRP",
  "PPPPPPPPPPPP",
];

export function sinkingCert(x: number, y: number, scale: number, depth = 0): Rect[] {
  const palette = {
    P: mix(PX.cream, PX.ink, depth),
    L: mix(PX.cloudShade, PX.ink, depth),
    R: mix(PX.accentDark, PX.ink, depth),
  };
  return scaled(sprite(CERT, palette, 0, 0), x, y, scale);
}
