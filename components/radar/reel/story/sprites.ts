/**
 * Story-only sprites on top of the guide's avatar (pixel-art.ts): the
 * student's frames for the stage, and the friend and the mother as their own
 * 24x32 sprites, so neither reads as a palette swap of the student. All three
 * share the same slim build and light from the upper right, like P'Seed.
 * Pure data.
 */
import { AVATAR_GRIDS, STORY_PALETTE, withRows, type PixelGrid, type PixelPalette } from "../../guide/story/pixel-art";

export interface AvatarFrames {
  idle: PixelGrid;
  talk: PixelGrid;
  blink: PixelGrid;
}

export const AVATAR_FRAMES: AvatarFrames = {
  idle: AVATAR_GRIDS.idle,
  talk: AVATAR_GRIDS.talk,
  blink: AVATAR_GRIDS.blink,
};

/*
 * The friend: a side ponytail with a teal tie, tan skin, an open grin when
 * talking, a teal tee, a hand on the hip, a watch, charcoal shorts, white socks
 * and dark school shoes. One row shorter than the student.
 * Legend: K outline, H hair, h hair shade, L hair sheen, S skin, s skin shade,
 * d mouth line, R blush, W cream, J tee, j tee shade, i tee light (and the
 * hair tie and watch), P shorts, p shorts shade, M open mouth, m tongue.
 */
const FRIEND_IDLE: PixelGrid = [
  "........................",
  "........................",
  "........................",
  "........................",
  ".........KKKKKK.........",
  "........KKHhHHKK........",
  ".......KHHhHHHLHKKK.....",
  ".......KHsSSSSShKJiKK...",
  "......KsSKWSSKWSSKhHLK..",
  "......KsSKKSSKKSSKhHLK..",
  ".......KSRSSSSRSKhHHLK..",
  ".......KSSdSSdSSKhHHK...",
  "........KsSddSSK.KhHK...",
  ".........KSSSSK...KK....",
  ".......KKKssssKKK.......",
  ".......KJissssiJK.......",
  "......KJJJiiiiJJiK......",
  ".....KjJJJJJJJJiJJK.....",
  "....KJKjjJJJJJJijjK.....",
  "...KjK.KjJJJJJJJKsK.....",
  "...KSK.KjJJJJJJJKsK.....",
  "....KSKKjJJJJJJJKsK.....",
  ".....KSKjjjjjjjJKiK.....",
  ".....KKKpppppppPKSSK....",
  "........KPPPPPPPKsK.....",
  ".......KPPpKKpPPKKK.....",
  ".......KPpK..KpPK.......",
  "........KsK..KsK........",
  "........KsK..KsK........",
  "........KWK..KWK........",
  ".......KHLK..KHLK.......",
  "........KK....KK........",
];

export const FRIEND_FRAMES: AvatarFrames = {
  idle: FRIEND_IDLE,
  /** Open mouth: rows 11 to 12. */
  talk: withRows(FRIEND_IDLE, 11, [
    ".......KSSdMMdSSKhHHK...",
    "........KsSmmSSK.KhHK...",
  ]),
  /** Eyes shut: rows 8 to 8. */
  blink: withRows(FRIEND_IDLE, 8, [
    "......KsSSSSSSSSSKhHLK..",
  ]),
};

export const FRIEND_PALETTE: PixelPalette = {
  K: STORY_PALETTE.ink,
  H: "#4a2e34",
  h: "#33202a",
  L: "#7a5250",
  S: "#c68a63",
  s: "#9e5e4c",
  d: "#723c3c",
  R: "#c0705c",
  W: STORY_PALETTE.cream,
  J: "#2fb59a",
  j: "#1f7f78",
  i: "#7fe0c0",
  P: "#4a4560",
  p: "#34303f",
  M: "#5c1f2c",
  m: "#b84a58",
};

/*
 * The mother: dark-brown hair in a bun, gold ear studs, an orange blouse with
 * arms crossed and hands clasped, a long plum pha sin and cream flats. The
 * tallest of the three (the bun reaches row 0).
 * Legend: K outline, H hair, h hair shade, L hair sheen and brows, S skin,
 * s skin shade, d mouth line, R blush, Y ear studs, O blouse, o blouse shade,
 * Q blouse light, P skirt, p skirt shade, q skirt light, F flats, M open
 * mouth, m tongue.
 */
const MOTHER_IDLE: PixelGrid = [
  "..........KKKK..........",
  ".........KhHHLK.........",
  "........KKhhhhKK........",
  ".......KHHHsHHLHK.......",
  "......KhHSSSSSSHLK......",
  "......KhHSLSSLSHLK......",
  "......KhHSSSSSSHLK......",
  "......KhHSKSSKSHHK......",
  ".......KhSKSSKSHK.......",
  ".......KYRSSSSRYK.......",
  "........KSSddSSK........",
  ".........KSSSSK.........",
  ".........KSSSSK.........",
  ".........KKssKK.........",
  "........KKossoKK........",
  "......KKOOOooOOQKK......",
  "......KOOOOOOOOOQK......",
  "......KOoOOOOOOoQK......",
  "......KOoOOOOOOoOK......",
  "......KOoOOOOOOoOK......",
  "......KOOQsSSSQOOK......",
  ".......KoosSSsoOK.......",
  ".......KoOOOOOOQK.......",
  "........KoOOOOQK........",
  "........KPPPPPPK........",
  "........KPpPPPPK........",
  ".......KpPpPPPpPK.......",
  ".......KpPpPPPpPK.......",
  ".......KPpPPPPpPK.......",
  ".......KqqqqqqqqK.......",
  ".......KFFKKKKFFK.......",
  "........KK....KK........",
];

export const MOTHER_FRAMES: AvatarFrames = {
  idle: MOTHER_IDLE,
  /** Open mouth: rows 10 to 11. */
  talk: withRows(MOTHER_IDLE, 10, [
    "........KSSMMSSK........",
    ".........KSmmSK.........",
  ]),
  /** Eyes shut: rows 7 to 8. */
  blink: withRows(MOTHER_IDLE, 7, [
    "......KhHSSSSSSHHK......",
    ".......KhKKSSKKHK.......",
  ]),
};

export const MOTHER_PALETTE: PixelPalette = {
  K: STORY_PALETTE.ink,
  H: "#3d2a30",
  h: "#261820",
  L: "#6a4048",
  S: "#e8b893",
  s: "#c88a72",
  d: "#9a5a54",
  R: "#dd8f78",
  Y: "#f2b33d",
  O: "#e0663f",
  o: "#a8443a",
  Q: "#f59a6a",
  P: "#58324e",
  p: "#3e2238",
  q: "#7e4a6c",
  F: "#e6d2c0",
  M: "#5c1f2c",
  m: "#b84a58",
};

/** First row with a drawn cell: where the head starts, for keeping text off it. */
export function topRow(grid: PixelGrid): number {
  const i = grid.findIndex((row) => /[^.]/.test(row));
  return i < 0 ? grid.length : i;
}
