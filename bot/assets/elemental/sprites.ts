/**
 * Elemental island pixel art: a flag per element and a badge pip. Drawn by
 * lib/elemental/island over SHIFT's island sprites (bot/assets/island, used
 * read-only). Same format as SHIFT's sprites: dot is transparent, each row is
 * one row of native pixels, each character a key into ELEMENTAL_PALETTE.
 *
 * Each flag carries its own mark as well as its colour (wave, mound, streaks,
 * flame, diamond), so the elements stay apart for colour-blind viewers and in
 * greyscale. No text, no fonts. No imports: the bot and the web both load it.
 */

/** The element keys, in the fixed element order (lib/elemental/island/sectors SECTOR_ORDER; a jest test holds them equal). */
export const FLAG_ELEMENTS = ["water", "earth", "air", "fire", "aether"] as const;
export type FlagElement = (typeof FLAG_ELEMENTS)[number];

/**
 * Each element's flag cloth and mark colours, after the Elemental brand
 * tokens (components/hackathon/poster/elemental/brand.ts). Water, fire and
 * aether cloths are the tokens toxicCyan, flame and aetherViolet; the marks
 * for earth, fire and aether are burnt, flameCore and aetherLilac. Earth's and
 * air's cloths are lighter than burnt and ash, so they read on the grass.
 */
export const ELEMENT_COLOURS: Readonly<Record<FlagElement, { readonly cloth: string; readonly mark: string }>> = {
  water: { cloth: "#38C9C2", mark: "#1E6F7A" },
  earth: { cloth: "#9A6434", mark: "#5B3A22" },
  air: { cloth: "#DAD6CC", mark: "#8C8780" },
  fire: { cloth: "#EC6424", mark: "#FFD57A" },
  aether: { cloth: "#9D7BFF", mark: "#E4D8FF" },
};

export const ELEMENTAL_PALETTE: Readonly<Record<string, string>> = {
  // Outline and wood: SHIFT's own values ('o', 'e', 'b', 'c' in bot/assets/island/sprites.ts).
  o: "#344447",
  e: "#C89561",
  b: "#79583F",
  c: "#A97950",
  // Badge pip: SHIFT's gold and cream.
  y: "#F4C56A",
  f: "#FFF1D6",
  // Flag cloth and mark, a letter pair per element.
  W: ELEMENT_COLOURS.water.cloth,
  X: ELEMENT_COLOURS.water.mark,
  E: ELEMENT_COLOURS.earth.cloth,
  F: ELEMENT_COLOURS.earth.mark,
  A: ELEMENT_COLOURS.air.cloth,
  B: ELEMENT_COLOURS.air.mark,
  R: ELEMENT_COLOURS.fire.cloth,
  S: ELEMENT_COLOURS.fire.mark,
  V: ELEMENT_COLOURS.aether.cloth,
  U: ELEMENT_COLOURS.aether.mark,
};

/** A 9 x 16 flag on a wooden pole, its 5 x 4 cloth filled from `cloth` rows (C = cloth, M = mark). */
function flag(cloth: readonly string[], c: string, m: string): string[] {
  const body = cloth.map((row) => `.oe${row.replace(/C/g, c).replace(/M/g, m)}o`);
  return [
    ".oo......",
    ".oeoooooo",
    ...body,
    ".oeoooooo",
    ...Array.from({ length: 7 }, () => ".oeo....."),
    "obbbo....",
    "ooooo....",
  ];
}

export const ELEMENTAL_SPRITES: Readonly<Record<string, readonly string[]>> = {
  // Water: a wave.
  flag_water: flag(["CCCCC", "MCCMC", "CMMCM", "CCCCC"], "W", "X"),
  // Earth: a mound.
  flag_earth: flag(["CCCCC", "CCMCC", "CMMMC", "CCCCC"], "E", "F"),
  // Air: two streaks.
  flag_air: flag(["MMMCC", "CCCCC", "CCMMM", "CCCCC"], "A", "B"),
  // Fire: a flame.
  flag_fire: flag(["CCMCC", "CMMCC", "CMMMC", "CCCCC"], "R", "S"),
  // Aether: a hollow diamond.
  flag_aether: flag(["CCMCC", "CMCMC", "CCMCC", "CCCCC"], "V", "U"),
  // One earned badge.
  pip: [
    ".ooo.",
    "oyyyo",
    "oyfyo",
    "oyyyo",
    ".ooo.",
  ],
};

/** The flag sprite key for an element. */
export function flagSprite(element: FlagElement): `flag_${FlagElement}` {
  return `flag_${element}`;
}
