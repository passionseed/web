/**
 * Pixel art for the shop's live catalog items that have no product photo
 * (MerchArtwork shows the merch's own photos): one small picture of what the
 * item is, in the island's palette and outline ink, on the crate's paper
 * tag. Keyed by the item's name, as merchArtwork() is, since the catalog
 * lives in the database (shift_quest_admin_catalog). An item none of them
 * fits gets a plain wooden crate with its lid on.
 */

export type ShopIcon = "sticker" | "matcha" | "tee" | "crate";

/** 16 x 14, island palette keys (bot/assets/island/sprites.ts PALETTE), "." clear. */
export const SHOP_ICONS: Readonly<Record<ShopIcon, readonly string[]>> = {
  // A sticker sheet: a round sticker with the sprout, a star and a leaf on a pale backing, its corner peeled up.
  sticker: [
    "................",
    ".ooooooooooooo..",
    ".oiffffiiiifio..",
    ".offrrffiifyfo..",
    ".ofrrnrfifyyyf..",
    ".ofrnnrfiifyfo..",
    ".offrrffiififo..",
    ".oiffffiiiiiio..",
    ".oiiiiiiiiiiio..",
    ".oiiffiiiioooo..",
    ".oiffnfiiofsso..",
    ".oifmnfiiofso...",
    ".oiiffiiiooo....",
    ".ooooooooo......",
  ],
  // A bowl of matcha, frothy on top, the bamboo whisk resting in it.
  matcha: [
    "................",
    "............oo..",
    "...........oeco.",
    "..........oeco..",
    ".........oeco...",
    ".oooooooeeeeooo.",
    ".ojjnjjnjjnjjno.",
    ".onnnnnnnnnnmmo.",
    "..oeeeeeeeeecco.",
    "..oecccccccccbo.",
    "...occcccccccbo.",
    "....occcccccbo..",
    ".....oooooooo...",
    "......obbbbo....",
  ],
  // A tee laid flat: cream, the island's coral band and its sprout.
  tee: [
    "................",
    "....oo....oo....",
    "..ooffooooffoo..",
    ".offffiiiiffffo.",
    "offffffffffffffo",
    "offffffnnfffffff",
    "oooffffmmffffooo",
    "..offffffffffo..",
    "..orrrrrrrrrro..",
    "..offffffffffo..",
    "..offffffffffo..",
    "..oiiiiiiiiiio..",
    "..oooooooooooo..",
    "................",
  ],
  // A wooden crate with its lid on: planks across and a brace, never a barrel's staves.
  crate: [
    "................",
    ".oooooooooooooo.",
    ".oeeeeeeeeeeeeo.",
    "oooooooooooooooo",
    ".oeccccccccccbo.",
    ".oebbbbbbbbbbbo.",
    ".oecccccccceebo.",
    ".oecccccceecbbo.",
    ".oebbbbeebbbbbo.",
    ".oecceeccccccbo.",
    ".oeeeccccccccbo.",
    ".oebbbbbbbbbbbo.",
    ".oooooooooooooo.",
    "................",
  ],
};

const MATCHES: readonly [ShopIcon, RegExp][] = [
  ["sticker", /สติกเกอร์|สติ๊กเกอร์|sticker/i],
  ["matcha", /มัทฉะ|มัจฉะ|matcha/i],
  ["tee", /เสื้อ|\btee\b|t-?shirt|\bshirt\b/i],
];

/** The picture for a catalog item without a photo of its own, by its name; the crate when none fits. */
export function shopIcon(name: string): ShopIcon {
  return MATCHES.find(([, pattern]) => pattern.test(name))?.[0] ?? "crate";
}
