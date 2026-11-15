/**
 * The pictures next to every hint on a quest page, so no hint is text only.
 * Keyed like the copy they sit beside: checklist items by their id
 * (lib/shift-island/quest-canvas.ts MAIN_GUIDES), examples by the route they
 * name, the pitfall rows by role. A small set of meaningful pixel icons
 * (sprites.ts), never decoration.
 */
import type { IconKey } from "./sprites";

/** "เสร็จเมื่อ" items on the main quests, by checklist id. */
const CHECK_ICONS: Readonly<Record<string, IconKey>> = {
  "m1-who": "visitor",
  "m1-talked": "bubble",
  "m1-new": "note",
  "m2-three": "bubble",
  "m2-story": "scroll",
  "m2-belief": "compass",
  "m3-agreed": "handshake",
  "m3-date": "calendar",
  "m3-gain": "heart",
  "m4-idea": "bulb",
  "m4-ship": "hammer",
  "m4-tried": "eye",
  "m5-rounds": "loop",
  "m5-fixed": "hammer",
  "m5-compare": "scroll",
  "m6-believed": "book",
  "m6-found": "eye",
  "m6-next": "signpost",
  "m7-outside": "visitor",
  "m7-stuck": "sos",
  "m7-return": "loop",
};

/** The icon for a "เสร็จเมื่อ" item; the evidence line and unknown ids get a check. */
export function checkIcon(id: string): IconKey {
  return Object.hasOwn(CHECK_ICONS, id) ? CHECK_ICONS[id] : "check";
}

/** Examples that start with a route name ("ซอฟต์แวร์: ...") wear that route's icon. */
const ROUTE_PREFIXES: readonly [string, IconKey][] = [
  ["ซอฟต์แวร์", "gear"],
  ["งานสร้างสรรค์", "paint"],
  ["บริการ", "megaphone"],
];

/** An example line's icon and its text without the route prefix (the icon says it). */
export function exampleArt(line: string): { icon: IconKey; route: string | null; text: string } {
  const trimmed = line.trim();
  for (const [route, icon] of ROUTE_PREFIXES) {
    const prefix = `${route}:`;
    if (trimmed.startsWith(prefix)) return { icon, route, text: trimmed.slice(prefix.length).trim() };
  }
  return { icon: "bulb", route: null, text: trimmed };
}

/** The หลุมพราง block's own rows. */
export const PITFALL_ICONS = { heading: "warn", sign: "eye", avoid: "signpost" } as const satisfies Record<string, IconKey>;

/** ตัวช่วย rows: the safety line, and the canvas reference row. */
export const HELPER_ICONS = { safety: "home", canvas: "note", link: "link", whoChecks: "eye" } as const satisfies Record<string, IconKey>;
