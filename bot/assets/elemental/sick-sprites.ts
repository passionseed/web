/**
 * The sick island's art: how an element sector looks before its teams heal it
 * (lib/elemental/island/healing.ts paints it over SHIFT's island art).
 *
 * - SICK_COLOURS: each SHIFT island colour (bot/assets/island/sprites.ts
 *   PALETTE, read-only) at step 0. Grass and sand go dry and grey, water goes
 *   dark, leaves turn dead brown. healing mixes from the healthy colour to the
 *   sick one by how sick the sector is, so each healing step brings colour back.
 * - SICK_HAZE: the dust colour dithered over a sick sector.
 * - BARE_BRANCHES: a leafless crown, shown where a sick tree's leaves have
 *   dropped. 32 x 21, the size of a tree sprite above its trunk; the bottom row
 *   meets the trunk top, columns line up with the tree sprite's.
 *
 * Same format as SHIFT's sprites: dot is transparent, each character a key
 * into BARE_PALETTE. No text, no fonts. No imports: the bot and the web both
 * load it.
 */

/** Healthy colour (SHIFT PALETTE hex, upper case) to its colour at step 0. */
export const SICK_COLOURS: Readonly<Record<string, string>> = {
  // Outline and stone.
  "#344447": "#343A3B",
  "#87989A": "#7E8486",
  "#B8C7BF": "#A9ADA9",
  "#626F73": "#5E6466",
  // Water: deep, shallow, foam.
  "#438EAC": "#2F4A55",
  "#59A9BE": "#3D5D68",
  "#8ACBD0": "#6A8086",
  // Sand.
  "#E7CD92": "#BDB29A",
  "#C9AA72": "#A39783",
  "#F6E4B5": "#CFC7B3",
  // Grass.
  "#91B76B": "#8E8B70",
  "#7FA45E": "#7D7A62",
  "#B2CC7E": "#A6A283",
  // Leaves: dark, mid, light.
  "#3B6A48": "#54473A",
  "#55894F": "#7A6646",
  "#8AB65E": "#9C8558",
  // Wood and soil.
  "#79583F": "#5E4C40",
  "#A97950": "#86705E",
  "#C89561": "#A08A72",
  "#E3AB80": "#B09C8A",
  // Blossoms and fruit.
  "#DE796C": "#A88078",
  "#ECA6B2": "#B59C98",
  "#FFF1D6": "#D8CFC0",
  "#F4C56A": "#BCA77E",
};

/** Dust dithered over a sick sector, and how strongly each dithered pixel takes it (0..1). */
export const SICK_HAZE = { colour: "#8A8274", strength: 0.35 } as const;

/** Dead wood for the bare crown. Kept as they are by the sick mix (already sick). */
export const BARE_PALETTE: Readonly<Record<string, string>> = {
  b: "#5A4636",
  c: "#7A6450",
};

/** A leafless crown, 32 x 21: drawn only inside a sick tree's own leaf shape, where its leaves have dropped. */
export const BARE_BRANCHES: readonly string[] = [
  "................................",
  "...................b............",
  "............b......b...b........",
  "........b....b....b....b........",
  "........b....b....b....b..b.....",
  ".....b..b.....bb.b....b.bb......",
  "......b.b......b.b...bbb........",
  ".......b.b.....bb....bb.........",
  "........bbb....bb....b..........",
  ".........bb....bb...b......b....",
  "....b.....bb...bc..bb......b....",
  "....b......b...bc.b.......bbb...",
  "...bbb......b..bcb.......bb.....",
  ".....bb......b.bc......bb.......",
  ".......bb.....bbc....bb.........",
  ".........bb....bc..bb...........",
  "...........bb..bcbb.............",
  ".............bbbc...............",
  "...............bc...............",
  "...............bc...............",
  "...............bc...............",
];
