/**
 * Who is who on the story stage: name tags, colours, sprite sizes and where
 * each stands. Pure. Layout numbers are CSS px on the 432x768 filming frame
 * (deviceScaleFactor 2.5 makes it 1080x1920); sprite cells are chosen so a
 * cell is a whole number of device pixels.
 *
 * The student is the profile card's avatar (AVATAR_GRIDS) in a violet hoodie.
 * The friend wears headphones and a teal hoodie; the mother is her own sprite
 * (sprites.ts: long hair, an apron). The host is P'Seed (GuideNPC).
 */
import { GUIDE_HOST } from "../../../../lib/radar-guide/story";
import { AVATAR_GRID, HOST_GRID, HOST_GRIDS, STORY_PALETTE, avatarPalette, type PixelPalette } from "../../guide/story/pixel-art";
import { AVATAR_FRAMES, MOTHER_FRAMES, MOTHER_PALETTE, topRow, type AvatarFrames } from "./sprites";
import type { CastWho } from "./storyTimeline";

export const STORY_FRAME = { width: 432, height: 768, scale: 2.5 } as const;

/**
 * Where the platforms' own UI sits (Instagram Reels and TikTok): the top 14%
 * (header), the right 12% (the like, comment and share rail), the bottom 20%
 * (caption and buttons), and readable copy stays above 65% of the height.
 * Nothing is drawn right of `right` or below `floor`; nothing starts above `top`.
 */
export const SAFE = {
  top: Math.round(STORY_FRAME.height * 0.14),
  bottom: Math.round(STORY_FRAME.height * 0.65),
  right: Math.round(STORY_FRAME.width * 0.88),
  floor: Math.round(STORY_FRAME.height * 0.8),
  side: 24,
} as const;

/** Feet line (scene cell 125 at 4x: scripts/radar-guide/story-art-pixel.ts STORY_FLOOR_Y). */
export const STAGE_FLOOR = 500;
/** The scene art is 108x192 cells drawn at 4 CSS px. */
export const SCENE_CELL = 4;
export interface CastLook {
  /** Name tag text. */
  nameTh: string;
  /** Name tag and box border colour. */
  color: string;
  /** Tag text colour. */
  ink: string;
  /** CSS px per sprite cell. */
  cell: number;
  /** Avatar palette and frames (not for the host, which uses its own sprite). */
  palette: PixelPalette | null;
  frames: AvatarFrames | null;
}

export const CAST_LOOK: Readonly<Record<CastWho, CastLook>> = {
  student: {
    nameTh: "ฉัน",
    color: STORY_PALETTE.violet,
    ink: STORY_PALETTE.cream,
    cell: 6,
    palette: avatarPalette(STORY_PALETTE.violet, STORY_PALETTE.violetDeep),
    frames: AVATAR_FRAMES,
  },
  friend: {
    nameTh: "เพื่อน",
    color: "#2fb59a",
    ink: STORY_PALETTE.ink,
    cell: 6,
    palette: { ...avatarPalette("#2fb59a", "#1d7a68"), H: "#1f1426", O: STORY_PALETTE.magenta },
    frames: AVATAR_FRAMES,
  },
  parent: {
    nameTh: "แม่",
    color: "#e0663f",
    ink: STORY_PALETTE.ink,
    cell: 6.4,
    palette: MOTHER_PALETTE,
    frames: MOTHER_FRAMES,
  },
  host: {
    nameTh: GUIDE_HOST.nameTh,
    color: STORY_PALETTE.orange,
    ink: STORY_PALETTE.ink,
    cell: 4.8,
    palette: null,
    frames: null,
  },
};

export function spriteSize(who: CastWho): { w: number; h: number } {
  const { cell } = CAST_LOOK[who];
  const grid = who === "host" ? HOST_GRID : AVATAR_GRID;
  // Rounded so 24 x 6.4 is 153.6, not 153.60000000000002.
  const px = (cells: number) => Math.round(cells * cell * 1000) / 1000;
  return { w: px(grid.w), h: px(grid.h) };
}

/** Where a character's head starts (its top drawn row) standing on the stage floor. */
export function headTop(who: CastWho, floor: number = STAGE_FLOOR): number {
  const look = CAST_LOOK[who];
  const first = who === "host" ? topRow(HOST_GRIDS.idle) : topRow(look.frames!.idle);
  return floor - spriteSize(who).h + first * look.cell;
}

/** The stage runs from here (the left edge has no platform UI) to just left of the right rail (P'Seed's glow included). */
export const STAGE_SPAN = { left: 4, right: SAFE.right - 6 } as const;

/** Centre x of each slot before the rail is taken into account. */
function idealXs(n: number): number[] {
  if (n <= 1) return [STORY_FRAME.width / 2];
  if (n === 2) return [124, 308];
  if (n === 3) return [86, 216, 346];
  const step = (STORY_FRAME.width - 2 * 70) / (n - 1);
  return Array.from({ length: n }, (_, i) => 70 + i * step);
}

/**
 * Centre x of each character on stage, left to right. The usual slots, slid
 * left until the rightmost sprite clears the right rail, then squeezed if the
 * cast is too wide for the stage.
 */
export function stageXs(cast: readonly CastWho[]): number[] {
  const n = cast.length;
  if (!n) return [];
  const half = cast.map((w) => spriteSize(w).w / 2);
  let xs = idealXs(n);
  const over = Math.max(...xs.map((x, i) => x + half[i] - STAGE_SPAN.right));
  if (over > 0) {
    const room = Math.max(0, xs[0] - half[0] - STAGE_SPAN.left);
    const slide = Math.min(over, room);
    xs = xs.map((x) => x - slide);
    if (over > slide && n > 1) {
      const first = STAGE_SPAN.left + half[0];
      const last = STAGE_SPAN.right - half[n - 1];
      const a = xs[0];
      const b = xs[n - 1];
      xs = xs.map((x) => first + ((x - a) / (b - a)) * (last - first));
    }
  }
  return xs.map((x) => Math.round(x));
}

/** P'Seed on the end card: centred, below the text, never past SAFE.floor. */
export const END_HOST = {
  x: STORY_FRAME.width / 2,
  /** Top of the sprite when the text leaves room (the card's resting look). */
  top: 409,
  /** Space between the share line and P'Seed. */
  gap: 14,
  /** Cell sizes to try, largest first (whole device pixels at 2.5x). */
  cells: [3.6, 3.2, 2.8, 2.4, 2] as const,
} as const;

/**
 * Where P'Seed stands on the end card, given the bottom of the share line:
 * below it, as big as fits above SAFE.floor, or null when even the smallest
 * size would not fit (P'Seed sits that card out rather than cover the text).
 */
export function endHostSpot(textBottom: number): { top: number; cell: number; floor: number } | null {
  const top = Math.max(END_HOST.top, Math.ceil(textBottom + END_HOST.gap));
  for (const cell of END_HOST.cells) {
    const floor = top + HOST_GRID.h * cell;
    if (floor <= SAFE.floor) return { top, cell, floor };
  }
  return null;
}
