/**
 * The Next Decade: Elemental, brand identity tokens.
 *
 * The idea (Angpao, 2026-11-19): the photo is a normal, peaceful, healthy
 * place. All the pollution comes from the pixels, which corrupt that calm
 * scene into something toxic. The damage isn't part of nature; someone
 * added it.
 *
 * Rules for every Elemental piece:
 * - Background: one real, grainy, faded-film photo of a calm, healthy place,
 *   with a big quiet sky. Never a photo that already shows damage, people,
 *   signs or a place someone could name.
 * - The four elements are pixels, each corrupting its healthy part of the
 *   photo: Fire bursts out of the land (the hero), Air is the pixel smoke
 *   staining the sky, Water is a toxic spill down the river, Earth is
 *   scorched, cracked ground. Aether is a few faint blocks in the sky.
 * - Only the pixels are loud: hazard orange and red, toxic cyan, rust and
 *   oil. The photo stays natural and muted.
 * - No frames or labels on the image. The picture carries the idea.
 * - Type: Trirong ExtraLight for the Thai title, Trirong Light Italic for
 *   "Elemental", Space Mono for small [tags]. Ink on the pale sky, cream on
 *   the dark ground.
 * - Layout: one title at the top, one quiet strip of details at the bottom.
 * - Film grain over everything (an exception to the key-art-poster rule for
 *   this campaign only, told by Angpao, 2026-11-19).
 *
 * Background photo: Joana Abreu on Unsplash (Unsplash License),
 * https://unsplash.com/photos/2i7x7OZ73gc
 */

export const EL = {
  // Fire, outside in.
  ember: "#b8301a",
  flame: "#ec6424",
  flameLight: "#f99a3a",
  flameCore: "#ffd57a",
  flameWhite: "#fff4dc",
  // Smoke (Air).
  smokeDark: "#2a2826",
  smoke: "#6b6761",
  ash: "#c9c4bb",
  toxicYellow: "#c9b452",
  // Spill (Water).
  toxicRust: "#c35a22",
  toxicCyan: "#38c9c2",
  toxicGreen: "#9cc23a",
  oil: "#1b1d1f",
  // Scorch (Earth).
  char: "#1e1c1a",
  burnt: "#5b3a22",
  // Aether.
  aetherGrey: "#7f8b94",
  aetherOrange: "#d98a55",
  /** Aether as a faint glow (Angpao, 2026-11-20: "purple, ethereal"). */
  aetherViolet: "#9d7bff",
  aetherLilac: "#e4d8ff",
  // Type.
  ink: "#1d211f",
  inkSoft: "rgba(29,33,31,0.72)",
  cream: "#f3efe6",
  creamSoft: "rgba(243,239,230,0.72)",
} as const;

export const EL_FONT = {
  display: "var(--font-trirong), 'Noto Serif Thai', serif",
  /**
   * Space Mono has no Thai, so Thai inside a [tag] falls back to the body
   * font (Bai Jamjuree), not to the system's monospace.
   */
  mono: "var(--font-space-mono), var(--font-bai-jamjuree), monospace",
  /** Body and UI text on the Elemental pages (the root layout loads Bai Jamjuree). */
  body: "var(--font-bai-jamjuree), sans-serif",
} as const;

/**
 * The dark ground of the landing page, for the pages that live in it (share,
 * teacher, team editor, board) and for the dark slabs on the cream pay page.
 * Merged design direction, 2026-11-27. Never put light text on EL.flame
 * (about 3:1); the action colour is flameCore with ground-coloured text.
 */
export const EL_GROUND = {
  bg: "#0c0d0c",
  inputFill: "#1a1b19",
  text: EL.cream,
  number: "#faf8f4",
  secondary: "#d6d0c4",
  fine: "rgba(243,239,230,0.55)",
  rule: "rgba(243,239,230,0.18)",
  ruleSoft: "rgba(243,239,230,0.10)",
  cell: "rgba(243,239,230,0.10)",
  outline: "rgba(243,239,230,0.55)",
  inputBorder: "rgba(243,239,230,0.28)",
  action: EL.flameCore,
  actionInk: "#0c0d0c",
  actionPressed: EL.flameLight,
  focus: EL.flameCore,
  error: EL.flameLight,
  /** The ink title on the sky band. */
  skyInk: EL.ink,
  /** The sticky bottom bar. */
  bar: "rgba(12,13,12,0.94)",
} as const;

export type SurfaceTokens = Record<keyof typeof EL_GROUND, string>;

/**
 * The cream pay page, in the same roles. The action is flame with ink text
 * (about 5:1); cream text on flame is only about 3:1.
 */
export const EL_PAPER: SurfaceTokens = {
  bg: EL.cream,
  inputFill: "rgba(255,255,255,0.6)",
  text: EL.ink,
  number: EL.ink,
  secondary: EL.inkSoft,
  fine: "rgba(29,33,31,0.6)",
  rule: "rgba(29,33,31,0.2)",
  ruleSoft: "rgba(29,33,31,0.08)",
  cell: "rgba(29,33,31,0.09)",
  outline: EL.ink,
  inputBorder: "rgba(29,33,31,0.28)",
  action: EL.flame,
  actionInk: EL.ink,
  actionPressed: EL.flameLight,
  focus: EL.ink,
  error: EL.ember,
  skyInk: EL.ink,
  bar: "rgba(243,239,230,0.96)",
};

/** Corruption pixels, newest (hottest) to oldest. */
export const EL_FIRE = [EL.flameWhite, EL.flameCore, EL.flameLight, EL.flame, EL.ember] as const;

export const BACKGROUND = {
  src: "/hackathon/poster/elemental/bg/river-joana-abreu-unsplash.jpg",
  credit: "Joana Abreu on Unsplash",
  url: "https://unsplash.com/photos/2i7x7OZ73gc",
} as const;
