/** SHIFT Island tree styles: the item catalog shared by the web, the bot and
 * the video renderer. Pure data and functions: no DOM, Node or Discord imports.
 */
export type TreeSlot = "shape" | "leaf" | "bark" | "bloom";
export type SeedId = "oak" | "sakura" | "pine" | "maple";

/** Full item ids, one per slot. */
export interface TreeStyle {
  shape: string;
  leaf: string;
  bark: string;
  bloom: string;
}

export interface TreeItem {
  id: string;
  slot: TreeSlot;
  name: string;
  /** Leaf and bark: dark to light. Bloom: [highlight, centre, petal]. */
  colors?: [string, string, string];
  /** Shape only: the leaf stamp rows, "#" is leaf. The canopy's outline per shape lives in tree-closeup.ts (inCanopy). */
  stamp?: string[];
  /**
   * The evening guest who brings this look (shift_quest_tree_items.guest):
   * only that guest's drop at the campfire gives it, never a round or quest
   * gift. Undefined for the common catalog.
   */
  guest?: "boat" | "gull" | "fireflies" | "turtle";
}

export const TREE_ITEMS: readonly TreeItem[] = [
  { id: "shape:round", slot: "shape", name: "กลม", stamp: [".##.", "####", "####", ".##."] },
  { id: "shape:maple", slot: "shape", name: "เมเปิล", stamp: ["..#..", "#.#.#", "#####", ".###.", "..#.."] },
  { id: "shape:heart", slot: "shape", name: "หัวใจ", stamp: ["##.##", "#####", ".###.", "..#.."] },
  { id: "shape:pine", slot: "shape", name: "สน", stamp: ["#...#", ".#.#.", "..#.."] },
  { id: "shape:willow", slot: "shape", name: "หลิว", stamp: ["#", "#", "#"] },
  { id: "shape:star", slot: "shape", name: "ดาว", stamp: [".#.", "###", ".#."] },

  { id: "leaf:forest", slot: "leaf", name: "ป่าเขียว", colors: ["#3B6A48", "#55894F", "#8AB65E"] },
  { id: "leaf:autumn", slot: "leaf", name: "ใบไม้แดง", colors: ["#8E3B2E", "#C9603A", "#EFA052"] },
  { id: "leaf:mint", slot: "leaf", name: "มิ้นต์", colors: ["#2F6F73", "#3F9C96", "#86D1C0"] },
  { id: "leaf:gold", slot: "leaf", name: "ทอง", colors: ["#9C7A22", "#C9A23A", "#F0D36A"] },
  { id: "leaf:dusk", slot: "leaf", name: "ม่วงค่ำ", colors: ["#4A3F73", "#6E5FA6", "#A596D9"] },
  { id: "leaf:sky", slot: "leaf", name: "ฟ้า", colors: ["#2F5E8C", "#4A86C0", "#8EC2EA"] },

  { id: "bark:oak", slot: "bark", name: "โอ๊ก", colors: ["#79583F", "#A97950", "#C89561"] },
  { id: "bark:birch", slot: "bark", name: "เบิร์ช", colors: ["#5E5A52", "#CFC8B8", "#F2EEE3"] },
  { id: "bark:ebony", slot: "bark", name: "ไม้ดำ", colors: ["#2B211C", "#4A3A32", "#6E5747"] },
  { id: "bark:cedar", slot: "bark", name: "ซีดาร์แดง", colors: ["#6A2E22", "#9A4A32", "#C26A48"] },
  { id: "bark:ash", slot: "bark", name: "เทา", colors: ["#55595C", "#80878A", "#AEB5B7"] },

  { id: "bloom:cream", slot: "bloom", name: "ครีม", colors: ["#FFF1D6", "#F4C56A", "#ECA6B2"] },
  { id: "bloom:sakura", slot: "bloom", name: "ซากุระ", colors: ["#FFF0F4", "#F7D27A", "#F48FB1"] },
  { id: "bloom:lantern", slot: "bloom", name: "โคมไฟ", colors: ["#FFF4C4", "#E9782F", "#F4C56A"] },
  { id: "bloom:frost", slot: "bloom", name: "น้ำแข็ง", colors: ["#FFFFFF", "#7FB7E8", "#CFE8FF"] },
  { id: "bloom:peach", slot: "bloom", name: "พีช", colors: ["#FFE3D0", "#F5A35C", "#F7B98E"] },

  // The evening guests' looks (20261118150000_shift_quest_campfire_call, sort 23 to 30): colours only,
  // two per guest, given only by that guest's drop at the campfire. Names DRAFT for the Thai review.
  { id: "leaf:seaglass", slot: "leaf", name: "แก้วทะเล", colors: ["#2E6B66", "#4FA39A", "#A8E0D2"], guest: "boat" },
  { id: "bark:driftwood", slot: "bark", name: "ไม้ลอยน้ำ", colors: ["#6B6258", "#A39A8C", "#D9D1C3"], guest: "boat" },
  { id: "bloom:shell", slot: "bloom", name: "เปลือกหอย", colors: ["#FFF6EE", "#F2C9A0", "#F6D5DA"], guest: "gull" },
  { id: "leaf:seafoam", slot: "leaf", name: "ฟองคลื่น", colors: ["#3E7C86", "#76B8BF", "#D3F1EF"], guest: "gull" },
  { id: "bloom:firefly", slot: "bloom", name: "หิ่งห้อย", colors: ["#FFFBD6", "#C9E04A", "#F3F08A"], guest: "fireflies" },
  { id: "bark:moonlit", slot: "bark", name: "แสงจันทร์", colors: ["#2E3550", "#59618A", "#9CA6CF"], guest: "fireflies" },
  { id: "bloom:pearl", slot: "bloom", name: "มุก", colors: ["#FFFFFF", "#E6DCEB", "#F4EEF2"], guest: "turtle" },
  { id: "leaf:kelp", slot: "leaf", name: "สาหร่าย", colors: ["#3A4A22", "#5C7330", "#8FA552"], guest: "turtle" },
];

export const DEFAULT_STYLE: TreeStyle = {
  shape: "shape:round",
  leaf: "leaf:forest",
  bark: "bark:oak",
  bloom: "bloom:cream",
};

export const SEEDS: Record<SeedId, { name: string; style: TreeStyle }> = {
  oak: { name: "ต้นโอ๊ก", style: { ...DEFAULT_STYLE } },
  sakura: {
    name: "ซากุระ",
    style: { shape: "shape:heart", leaf: "leaf:forest", bark: "bark:cedar", bloom: "bloom:sakura" },
  },
  pine: {
    name: "สน",
    style: { shape: "shape:pine", leaf: "leaf:mint", bark: "bark:ebony", bloom: "bloom:frost" },
  },
  maple: {
    name: "เมเปิล",
    style: { shape: "shape:maple", leaf: "leaf:autumn", bark: "bark:birch", bloom: "bloom:lantern" },
  },
};

const BY_ID = new Map(TREE_ITEMS.map((i) => [i.id, i]));
const SLOTS: TreeSlot[] = ["shape", "leaf", "bark", "bloom"];

export function treeItem(id: string): TreeItem | null {
  return BY_ID.get(id) ?? null;
}

/** One option a gift can still give: the item, and its index in the gift as stored (the bot's pick buttons carry it). */
export interface OpenOption {
  index: number;
  item: TreeItem;
}

/**
 * A gift's options the team can still take, in the gift's order: catalog
 * items the team does not own. The database keeps a gift's options as they
 * were when it was made, so an item the team came to own since (a teammate
 * took it from another gift) is left out here; defaults are always owned.
 */
export function openOptions(owned: readonly string[], options: readonly string[]): OpenOption[] {
  const have = new Set(owned);
  return options.flatMap((id, index) => {
    const item = BY_ID.get(id);
    return item && DEFAULT_STYLE[item.slot] !== id && !have.has(id) ? [{ index, item }] : [];
  });
}

/** The waiting gifts that still offer something, oldest first: a gift whose every option the team owns is skipped. */
export function openGifts<G extends { options: readonly string[] }>(owned: readonly string[], gifts: readonly G[]): G[] {
  return gifts.filter((gift) => openOptions(owned, gift.options).length > 0);
}

/** Coerce stored or user data into a valid style: unknown or missing slots get the default. */
export function resolveStyle(raw: unknown): TreeStyle {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_STYLE };
  for (const slot of SLOTS) {
    const v = src[slot];
    if (typeof v === "string" && BY_ID.get(v)?.slot === slot) out[slot] = v;
  }
  return out;
}

const LEAF_KEYS: Record<string, number> = { l: 0, m: 1, n: 2 };
const BLOOM_KEYS: Record<string, number> = { f: 0, y: 1, p: 2 };
const BARK_KEYS: Record<string, number> = { b: 0, c: 1, e: 2 };
/** Tree sprites are 32x40; rows 30+ are soil and keep their palette colours. */
const SOIL_ROW = 30;

/** Override hex for a tree sprite pixel, or null to use the sprite PALETTE. */
export function mapTreeColor(style: TreeStyle, ch: string, row: number): string | null {
  if (ch in LEAF_KEYS) return treeItem(style.leaf)?.colors?.[LEAF_KEYS[ch]] ?? null;
  if (ch in BLOOM_KEYS) return treeItem(style.bloom)?.colors?.[BLOOM_KEYS[ch]] ?? null;
  if (ch in BARK_KEYS && row < SOIL_ROW) return treeItem(style.bark)?.colors?.[BARK_KEYS[ch]] ?? null;
  return null;
}
