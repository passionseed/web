import { SlideC2, SlideC3, SlideC4 } from "./slidesJoin";
import { SlideB2, SlideB3, SlideB4 } from "./slidesWhat";
import { SlideA2, SlideA3, SlideA4 } from "./slidesWhy";

/**
 * Inner slides for the three SHIFT[1] grid posts, slides 2-4 of each.
 *   A: why (certificates vs live work, SHIFT[0] proof, why it works)
 *   B: what (the 7 days, how the room runs, what you walk away with)
 *   C: how to join (price, for parents, apply steps + QR)
 */
export const GRID_SLIDES = {
  a: [SlideA2, SlideA3, SlideA4],
  b: [SlideB2, SlideB3, SlideB4],
  c: [SlideC2, SlideC3, SlideC4],
} as const;

export { GRID_APPLY_URL } from "./slidesJoin";
