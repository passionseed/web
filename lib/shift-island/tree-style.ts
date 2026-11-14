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
  /** Shape only: canopy stamp rows, "#" is canopy. */
  stamp?: string[];
}

export const TREE_ITEMS: readonly TreeItem[] = [
  { id: "shape:round", slot: "shape", name: "กลม", stamp: [".##.", "####", "####", ".##."] },
  { id: "shape:maple", slot: "shape", name: "เมเปิล", stamp: ["..#..", "#.#.#", "#####", ".###.", "..#.."] },
  { id: "shape:heart", slot: "shape", name: "หัวใจ", stamp: ["##.##", "#####", ".###.", "..#.."] },
  { id: "shape:pine", slot: "shape", name: "สน", stamp: ["#...#", ".#.#.", "..#.."] },
  { id: "shape:willow", slot: "shape", name: "หลิว", stamp: ["#", "#", "#"] },
  { id: "shape:star", slot: "shape", name: "ดาว", stamp: [".#.", "###", ".#."] },

  { id: "leaf:forest", slot: "leaf", name: "ป่าเขียว", colors: ["#39775D", "#50976B", "#78B880"] },
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
