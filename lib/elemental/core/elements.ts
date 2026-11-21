/**
 * The five Elemental elements, in their fixed order.
 *
 * Copied from ELEMENTAL.elements in components/hackathon/poster/elemental/facts.ts
 * (that file imports '@/...', so the bot cannot load it). A jest parity test
 * (lib/elemental/__tests__/core.test.ts) keeps the two equal: change a fact in
 * facts.ts first, then here.
 *
 * The order matters: island sectors, the picker buttons and per-element totals
 * all follow it.
 */
export const ELEMENT_KEYS = ["water", "earth", "air", "fire", "aether"] as const;

export type ElementKey = (typeof ELEMENT_KEYS)[number];

/** Display names, copied from facts.ts with the keys. */
export const ELEMENT_LABELS: Readonly<Record<ElementKey, { readonly en: string; readonly th: string }>> = {
  water: { en: "Water", th: "น้ำ" },
  earth: { en: "Earth", th: "ดิน" },
  air: { en: "Air", th: "ลม" },
  fire: { en: "Fire", th: "ไฟ" },
  aether: { en: "Aether", th: "ธาตุที่ 5" },
};

export function isElementKey(value: unknown): value is ElementKey {
  return typeof value === "string" && (ELEMENT_KEYS as readonly string[]).includes(value);
}

/** 0-based position in the fixed order, or -1 for anything that is not an element key. */
export function elementIndex(value: unknown): number {
  return isElementKey(value) ? ELEMENT_KEYS.indexOf(value) : -1;
}
