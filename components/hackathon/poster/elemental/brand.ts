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
  // Type.
  ink: "#1d211f",
  inkSoft: "rgba(29,33,31,0.72)",
  cream: "#f3efe6",
  creamSoft: "rgba(243,239,230,0.72)",
} as const;

export const EL_FONT = {
  display: "var(--font-trirong), 'Noto Serif Thai', serif",
  mono: "var(--font-space-mono), ui-monospace, monospace",
} as const;

export const BACKGROUND = {
  src: "/hackathon/poster/elemental/bg/river-joana-abreu-unsplash.jpg",
  credit: "Joana Abreu on Unsplash",
  url: "https://unsplash.com/photos/2i7x7OZ73gc",
} as const;
