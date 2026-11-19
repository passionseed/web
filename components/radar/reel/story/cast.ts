/**
 * Who is who on the story stage: name tags, colours, sprite sizes and where
 * each stands. Pure. Layout numbers are CSS px on the 432x768 filming frame
 * (deviceScaleFactor 2.5 makes it 1080x1920); sprite cells are chosen so a
 * cell is a whole number of device pixels.
 *
 * The student is the profile card's avatar (AVATAR_GRIDS) in a violet hoodie.
 * The friend wears headphones and a teal hoodie; the parent is taller, with
 * dark hair down to the chin and a rust top. The host is P'Seed (GuideNPC).
 */
import { GUIDE_HOST } from "../../../../lib/radar-guide/story";
import { AVATAR_GRID, HOST_GRID, STORY_PALETTE, avatarPalette, type PixelPalette } from "../../guide/story/pixel-art";
import type { CastWho } from "./storyTimeline";

export const STORY_FRAME = { width: 432, height: 768, scale: 2.5 } as const;

/**
 * Instagram's own UI covers the top 12%, the bottom 35% and, below 45% of
 * the height, the right 15% (PageFrame's SafeZones). Readable copy stays out.
 */
export const SAFE = {
  top: Math.round(STORY_FRAME.height * 0.12),
  bottom: Math.round(STORY_FRAME.height * 0.65),
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
  /** Avatar palette (not for the host, which uses its own sprite). */
  palette: PixelPalette | null;
}

export const CAST_LOOK: Readonly<Record<CastWho, CastLook>> = {
  student: {
    nameTh: "ฉัน",
    color: STORY_PALETTE.violet,
    ink: STORY_PALETTE.cream,
    cell: 6,
    palette: avatarPalette(STORY_PALETTE.violet, STORY_PALETTE.violetDeep),
  },
  friend: {
    nameTh: "เพื่อน",
    color: "#2fb59a",
    ink: STORY_PALETTE.ink,
    cell: 6,
    palette: { ...avatarPalette("#2fb59a", "#1d7a68"), H: "#1f1426", O: STORY_PALETTE.magenta },
  },
  parent: {
    nameTh: "แม่",
    color: "#e0663f",
    ink: STORY_PALETTE.ink,
    cell: 6.8,
    palette: { ...avatarPalette("#b4482f", "#7e2f1f"), H: "#241418", O: "#241418" },
  },
  host: {
    nameTh: GUIDE_HOST.nameTh,
    color: STORY_PALETTE.orange,
    ink: STORY_PALETTE.ink,
    cell: 5.2,
    palette: null,
  },
};

export function spriteSize(who: CastWho): { w: number; h: number } {
  const { cell } = CAST_LOOK[who];
  const grid = who === "host" ? HOST_GRID : AVATAR_GRID;
  return { w: grid.w * cell, h: grid.h * cell };
}

/** Centre x of each stage slot for a cast of 1, 2 or 3 or more. */
export function slotXs(n: number): number[] {
  if (n <= 1) return [STORY_FRAME.width / 2];
  if (n === 2) return [124, 308];
  if (n === 3) return [86, 216, 346];
  const step = (STORY_FRAME.width - 2 * 70) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round(70 + i * step));
}
