/**
 * Story-only sprite frames on top of the guide's avatar (pixel-art.ts): a
 * blink for the student and the friend, and the mother, her own 24x32 sprite
 * (shoulder-length hair, a blouse under a cream apron, a skirt, lines under
 * the eyes) so she never reads as a palette swap of the student. Pure data.
 */
import { AVATAR_GRIDS, STORY_PALETTE, type PixelGrid, type PixelPalette } from "../../guide/story/pixel-art";

export interface AvatarFrames {
  idle: PixelGrid;
  talk: PixelGrid;
  blink: PixelGrid;
}

/** The avatar's eye rows (8 and 9) closed: lids on the lower row. */
const AVATAR_EYES_SHUT: PixelGrid = ["...OKSSSSSSSSSSSSSSKO...", "...OKSSKKSSSSSSKKSSKO..."];

function withRows(grid: PixelGrid, at: number, rows: PixelGrid): PixelGrid {
  return [...grid.slice(0, at), ...rows, ...grid.slice(at + rows.length)];
}

export const AVATAR_FRAMES: AvatarFrames = {
  idle: AVATAR_GRIDS.idle,
  talk: AVATAR_GRIDS.talk,
  blink: withRows(AVATAR_GRIDS.idle, 8, AVATAR_EYES_SHUT),
};

/*
 * The mother. Legend: K outline, H hair, h hair shine, S skin, s skin shade
 * (the lines under her eyes), R blush, W eye light, M mouth, J blouse,
 * j blouse shade, A apron, a apron hem, P skirt.
 */
const MOTHER_HEAD: PixelGrid = [
  "........................",
  "........KKKKKKKK........",
  "......KKHHHHHHHHKK......",
  ".....KHHHhhHHHHHHHK.....",
  "....KHHHhHHHHHHHHHHK....",
  "...KHHHHHHHHHHHHHHHHK...",
  "...KHHHSSSSSSSSSSHHHK...",
  "...KHHSSSSSSSSSSSSHHK...",
];
const MOTHER_EYES_OPEN: PixelGrid = ["...KHHSKKSSSSSSKKSHHK...", "...KHHSKWSSSSSSKWSHHK..."];
const MOTHER_EYES_SHUT: PixelGrid = ["...KHHSSSSSSSSSSSSHHK...", "...KHHSKKSSSSSSKKSHHK..."];
const MOTHER_CHEEKS: PixelGrid = ["...KHHSSsSSSSSSsSSHHK...", "...KHHRSSSSSSSSSSRHHK..."];
const MOTHER_MOUTH_IDLE: PixelGrid = ["...KHHSSSSKKKKSSSSHHK...", "...KHHHSSSSSSSSSSHHHK..."];
const MOTHER_MOUTH_TALK: PixelGrid = ["...KHHSSSSKMMKSSSSHHK...", "...KHHHSSSSKKSSSSHHHK..."];
const MOTHER_BODY: PixelGrid = [
  "...KHHHHKSSSSSSKHHHHK...",
  "...KHHHHHKKSSKKHHHHHK...",
  "..KHHHHKJJJSSJJJKHHHHK..",
  "..KHHHKJJJJJJJJJJKHHHK..",
  "...KJJJJJKAAAAKJJJJJK...",
  "..KJJjJJJKAAAAKJJJjJJK..",
  "..KJJjJJKAAAAAAKJJjJJK..",
  "..KJJjKAAAAAAAAAAKjJJK..",
  "..KSSKKAAAAAAAAAAKKSSK..",
  "..KSSK.KAAAAAAAAK.KSSK..",
  "...KK..KAAAAAAAAK..KK...",
  ".......KaaaaaaaaK.......",
  "......KPPPPPPPPPPK......",
  "......KPPPPPPPPPPK......",
  ".....KPPPPPPPPPPPPK.....",
  ".....KKKKKKKKKKKKKK.....",
  ".......KSSK..KSSK.......",
  "......KKKKK..KKKKK......",
];

function mother(eyes: PixelGrid, mouth: PixelGrid): PixelGrid {
  return [...MOTHER_HEAD, ...eyes, ...MOTHER_CHEEKS, ...mouth, ...MOTHER_BODY];
}

export const MOTHER_FRAMES: AvatarFrames = {
  idle: mother(MOTHER_EYES_OPEN, MOTHER_MOUTH_IDLE),
  talk: mother(MOTHER_EYES_OPEN, MOTHER_MOUTH_TALK),
  blink: mother(MOTHER_EYES_SHUT, MOTHER_MOUTH_IDLE),
};

export const MOTHER_PALETTE: PixelPalette = {
  K: STORY_PALETTE.ink,
  H: "#2b1820",
  h: "#4a2c38",
  S: STORY_PALETTE.skin,
  s: STORY_PALETTE.skinShade,
  R: STORY_PALETTE.blush,
  W: STORY_PALETTE.cream,
  M: STORY_PALETTE.mouth,
  J: "#c2553a",
  j: "#8a3423",
  A: STORY_PALETTE.cream,
  a: "#e3c9b3",
  P: "#4a2a3a",
};

/** First row with a drawn cell: where the head starts, for keeping text off it. */
export function topRow(grid: PixelGrid): number {
  const i = grid.findIndex((row) => /[^.]/.test(row));
  return i < 0 ? grid.length : i;
}
