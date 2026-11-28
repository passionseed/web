import type { OwnerElement } from "@/lib/hackathon/elemental/owner-link";

/**
 * Text colours for the owner kit. The page sits on the key plate under a
 * veil and grain, and its readers are busy, often older, adults on phones,
 * sometimes outdoors. The brand pixel colours (brand.ts) are made for fills
 * and marks; on the plate they fall to 2 to 4:1 as text. These lighter shades
 * keep each hue and stay at 4.5:1 or better over the lightest plate pixels
 * (measured from screenshots, 2026-11-28). Keep the brand colours for pixel
 * marks, badge fills and borders; use these only where a colour carries text.
 * Local to the owner kit so the posters keep their colours.
 */
export const KIT = {
  /** Body copy: cream, slightly softer than headings. Replaces creamSoft (0.72) for text. */
  body: "rgba(243,239,230,0.9)",
  /** Secondary lines (hints, sizes). Still above 7:1 on the darkened veil. */
  soft: "rgba(243,239,230,0.84)",
  /** Warnings and errors: a light flame. EL.flame stays for fills and outlines. */
  warn: "#ffb38a",
  /** Success and the ✓ captions: a light toxic cyan. EL.toxicCyan stays for the badge fill. */
  ok: "#8fe5de",
  /** A solid-ish dark panel for text that must read on any part of the plate. */
  panel: "rgba(30,28,26,0.88)",
  /** Input and drop-zone edges: 3:1 or better against the page. */
  edge: "rgba(243,239,230,0.65)",
} as const;

/** The element accent when it colours text: same hue as ELEMENT_MARKS, light enough to read. */
export const ACCENT_TEXT: Record<OwnerElement, string> = {
  earth: "#f5b48e",
  water: KIT.ok,
  air: "#e8cf72",
  fire: "#ffc07a",
  aether: "#cdbeff",
};

/** The all-elements gold already reads at 5.8:1 or better. */
export const PUBLIC_ACCENT = "#ffd067";

/** Thai never renders in Space Mono (it has no Thai glyphs): brackets and digits stay mono, Thai falls to Trirong. */
export const MONO_THAI = "var(--font-space-mono), var(--font-trirong), 'Noto Serif Thai', serif";
