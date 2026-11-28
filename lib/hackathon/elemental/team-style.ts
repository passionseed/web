import type { CSSProperties } from "react";

import { isRudeTeamName } from "./team-name";

/**
 * Team name styles for Elemental (Big, 2026-11-27: "the web should show them
 * as like with discord nitro, the customizability of their name"). A style is
 * a font, a colour and an effect, each picked from a fixed list here: no
 * free-form CSS ever reaches the page. A gradient uses one of a few set
 * colour pairs, never a free second colour. The server checks every save
 * with checkStyleSave().
 *
 * Sharing unlocks the lists, like a Nitro perk: the more real devices open the
 * share links of a team's members, the more of a style the team can change.
 * A live Instagram Story proof from any member (lib/hackathon/elemental/story-proof.ts)
 * unlocks every part at once (Big, 2026-11-27). Every unlock function takes it
 * as storyProof. Sharing earns looks only, never a seat.
 * Safe to import in the browser.
 */

/** Devices (summed over every member's share link) that unlock each part. Same for teams and solo sign-ups. */
export const TEAM_STYLE_TIERS = { color: 10, font: 25, effect: 50 } as const;

export type StylePart = keyof typeof TEAM_STYLE_TIERS;
export const STYLE_PARTS: readonly StylePart[] = ["color", "font", "effect"];

// copy: placeholder — Angpao rewrites
/** What each unlock opens, in Thai (the team line, the editor and the board). */
export const STYLE_PART_TH: Record<StylePart, string> = { color: "สี", font: "ฟอนต์", effect: "เอฟเฟกต์" };

/** The team meter's length: the last unlock. */
export const TEAM_METER_GOAL = TEAM_STYLE_TIERS.effect;

/**
 * Fonts that carry Thai and Latin (next/font/google, see
 * components/hackathon/elemental/team-style/fonts.ts). Trirong, the Elemental
 * type, is the free default; its Light Italic is the "Elemental" wordmark's
 * voice. Each other font is one distinct voice: pixel (Chakra Petch), poster
 * (Chonburi), handwriting (Sriracha), sign painter (Pattaya). Type review,
 * 2026-11-27: Charm, Kodchasan and Itim were dropped (Charm's tone marks hit
 * the line above and it can't be read small; the other two repeated a voice).
 * Mitr and bold Kanit are banned.
 */
export const NAME_FONTS = [
  { id: "trirong", label: "Trirong", family: "var(--font-trirong), 'Noto Serif Thai', serif", weight: 400, style: "normal" },
  { id: "trirong-italic", label: "Trirong Italic", family: "var(--font-trirong), 'Noto Serif Thai', serif", weight: 300, style: "italic" },
  { id: "chakra", label: "Chakra Petch", family: "var(--font-ts-chakra), 'Noto Sans Thai', sans-serif", weight: 600, style: "normal" },
  { id: "chonburi", label: "Chonburi", family: "var(--font-ts-chonburi), 'Noto Serif Thai', serif", weight: 400, style: "normal" },
  { id: "sriracha", label: "Sriracha", family: "var(--font-ts-sriracha), 'Noto Sans Thai', cursive", weight: 400, style: "normal" },
  { id: "pattaya", label: "Pattaya", family: "var(--font-ts-pattaya), 'Noto Sans Thai', sans-serif", weight: 400, style: "normal" },
] as const;

/** Fonts that were on the list once: a saved choice moves to its nearest voice, never back to the default. */
const FONT_ALIASES: Record<string, (typeof NAME_FONTS)[number]["id"]> = { charm: "trirong-italic", kodchasan: "chakra", itim: "sriracha" };

/**
 * Colours from the Elemental palette (components/hackathon/poster/elemental/brand.ts).
 * hex is for the cream paper (3.5:1 or better on #f3efe6); dark is the same
 * colour for the dark ground (4.5:1 or better on #0c0d0c), where the board,
 * the editor and the share slab live. Ink (cream on the ground) is the free default.
 */
export const NAME_COLORS = [
  { id: "ink", th: "หมึก", hex: "#1d211f", dark: "#f3efe6" },
  { id: "ember", th: "ถ่านแดง", hex: "#b8301a", dark: "#f2674a" },
  { id: "flame", th: "ไฟ", hex: "#c94f17", dark: "#f99a3a" },
  { id: "amber", th: "อำพัน", hex: "#946208", dark: "#dcae4e" },
  { id: "earth", th: "ดิน", hex: "#6b4423", dark: "#c79a6b" },
  { id: "leaf", th: "ใบไม้", hex: "#4f6f16", dark: "#9cc23a" },
  { id: "water", th: "น้ำ", hex: "#0e7470", dark: "#38c9c2" },
  { id: "air", th: "ลม", hex: "#56616b", dark: "#aab4bd" },
  { id: "aether", th: "อีเธอร์", hex: "#5b3fc4", dark: "#9d7bff" },
  { id: "rose", th: "กุหลาบ", hex: "#b02a5b", dark: "#f2789f" },
] as const;

export type ColorId = (typeof NAME_COLORS)[number]["id"];

// copy: placeholder — Angpao rewrites
/** Names that change with the surface: ink is drawn cream on the dark ground, so it's called cream there. */
const DARK_LABELS: Partial<Record<ColorId, string>> = { ink: "ครีม" };

/** Where a name is drawn: the dark ground (board, editor, share slab) or the cream paper. */
export type NameSurface = "ground" | "paper";

/**
 * The only gradients, from the type review (2026-11-27): each pair's two ends
 * differ enough to read as a gradient on a short Thai name, never a rainbow.
 */
// copy: placeholder — Angpao rewrites (th)
export const NAME_PAIRS = [
  { id: "fire", th: "ไฟป่า", from: "ember", to: "amber" },
  { id: "river", th: "สายน้ำ", from: "water", to: "leaf" },
  { id: "dusk", th: "ฟ้าค่ำ", from: "aether", to: "rose" },
  { id: "soil", th: "ผืนดิน", from: "earth", to: "flame" },
] as const satisfies readonly { id: string; th: string; from: ColorId; to: ColorId }[];

/**
 * Effects. Gradient uses a set pair (NAME_PAIRS); the others use the colour.
 * Solid is the free default. Offset is a hard shadow with no blur, like a
 * misregistered print (it replaced the soft "pop"); outline was dropped
 * because Thai letters overlap inside and the seams show.
 */
export const NAME_EFFECTS = [
  { id: "solid", th: "สีเดียว" },
  { id: "marker", th: "ปากกาเน้น" },
  { id: "offset", th: "เงาเหลื่อม" },
  { id: "gradient", th: "ไล่สี" },
] as const;

const EFFECT_ALIASES: Record<string, (typeof NAME_EFFECTS)[number]["id"]> = { pop: "offset", outline: "solid" };

export type FontId = (typeof NAME_FONTS)[number]["id"];
export type PairId = (typeof NAME_PAIRS)[number]["id"];
export type EffectId = (typeof NAME_EFFECTS)[number]["id"];

export type TeamNameStyle = { font: FontId; color: ColorId; effect: EffectId; pair: PairId };

export const DEFAULT_STYLE: TeamNameStyle = { font: "trirong", color: "ink", effect: "solid", pair: "fire" };

const FONT_IDS = new Set<string>(NAME_FONTS.map((f) => f.id));
const COLOR_IDS = new Set<string>(NAME_COLORS.map((c) => c.id));
const PAIR_IDS = new Set<string>(NAME_PAIRS.map((p) => p.id));
const EFFECT_IDS = new Set<string>(NAME_EFFECTS.map((e) => e.id));

const isFont = (v: unknown): v is FontId => typeof v === "string" && FONT_IDS.has(v);
const isColor = (v: unknown): v is ColorId => typeof v === "string" && COLOR_IDS.has(v);
const isPair = (v: unknown): v is PairId => typeof v === "string" && PAIR_IDS.has(v);
const isEffect = (v: unknown): v is EffectId => typeof v === "string" && EFFECT_IDS.has(v);

export const fontOf = (id: FontId) => NAME_FONTS.find((f) => f.id === id) ?? NAME_FONTS[0];
export const colorOf = (id: ColorId) => NAME_COLORS.find((c) => c.id === id) ?? NAME_COLORS[0];
export const pairOf = (id: PairId) => NAME_PAIRS.find((p) => p.id === id) ?? NAME_PAIRS[0];

/**
 * A style read back from the database: a font or effect that has left the
 * lists moves to its nearest replacement (FONT_ALIASES, EFFECT_ALIASES), and
 * anything else unknown falls back to the default, so an old or hand-edited
 * row can never break a page.
 */
export function readStyle(raw: unknown): TeamNameStyle {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_STYLE };
  const r = raw as Record<string, unknown>;
  const font = typeof r.font === "string" ? (FONT_ALIASES[r.font] ?? r.font) : r.font;
  const effect = typeof r.effect === "string" ? (EFFECT_ALIASES[r.effect] ?? r.effect) : r.effect;
  return {
    font: isFont(font) ? font : DEFAULT_STYLE.font,
    color: isColor(r.color) ? r.color : DEFAULT_STYLE.color,
    effect: isEffect(effect) ? effect : DEFAULT_STYLE.effect,
    pair: isPair(r.pair) ? r.pair : DEFAULT_STYLE.pair,
  };
}

/** A style sent by a browser: every field must be on the current lists (no old ids), nothing else allowed. Null when it isn't. */
export function parseStyle(raw: unknown): TeamNameStyle | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (Object.keys(r).some((k) => !["font", "color", "effect", "pair"].includes(k))) return null;
  if (!isFont(r.font) || !isColor(r.color) || !isEffect(r.effect)) return null;
  if (r.pair !== undefined && !isPair(r.pair)) return null;
  return { font: r.font, color: r.color, effect: r.effect, pair: isPair(r.pair) ? r.pair : DEFAULT_STYLE.pair };
}

/** What a team can change: by its devices, or everything once a member has a live Story proof. */
export function unlockedParts(devices: number, storyProof = false): Record<StylePart, boolean> {
  if (storyProof) return { color: true, font: true, effect: true };
  return {
    color: devices >= TEAM_STYLE_TIERS.color,
    font: devices >= TEAM_STYLE_TIERS.font,
    effect: devices >= TEAM_STYLE_TIERS.effect,
  };
}

/** The next part to unlock and how many more devices it needs, or null when everything is open (a Story proof opens it all). */
export function nextUnlock(devices: number, storyProof = false): { part: StylePart; at: number; left: number } | null {
  if (storyProof) return null;
  for (const part of STYLE_PARTS) {
    const at = TEAM_STYLE_TIERS[part];
    if (devices < at) return { part, at, left: at - devices };
  }
  return null;
}

/** The parts of a style that differ from the default but aren't unlocked yet. */
export function lockedChoices(style: TeamNameStyle, devices: number, storyProof = false): StylePart[] {
  const open = unlockedParts(devices, storyProof);
  const out: StylePart[] = [];
  if (style.color !== DEFAULT_STYLE.color && !open.color) out.push("color");
  if (style.font !== DEFAULT_STYLE.font && !open.font) out.push("font");
  if (style.effect !== DEFAULT_STYLE.effect && !open.effect) out.push("effect");
  return out;
}

/** The style as it may show: any part the team hasn't unlocked goes back to the default. */
export function clampStyle(style: TeamNameStyle, devices: number, storyProof = false): TeamNameStyle {
  const open = unlockedParts(devices, storyProof);
  return {
    font: open.font ? style.font : DEFAULT_STYLE.font,
    color: open.color ? style.color : DEFAULT_STYLE.color,
    effect: open.effect ? style.effect : DEFAULT_STYLE.effect,
    pair: open.effect ? style.pair : DEFAULT_STYLE.pair,
  };
}

export type StyleSaveCheck =
  | { ok: true; style: TeamNameStyle }
  | { ok: false; error: "invalid" }
  | { ok: false; error: "locked"; parts: StylePart[] };

/** The server's check on a save: on the lists, and nothing the team hasn't unlocked (by devices or a live Story proof). */
export function checkStyleSave(raw: unknown, devices: number, storyProof = false): StyleSaveCheck {
  const style = parseStyle(raw);
  if (!style) return { ok: false, error: "invalid" };
  const parts = lockedChoices(style, devices, storyProof);
  if (parts.length > 0) return { ok: false, error: "locked", parts };
  return { ok: true, style: clampStyle(style, devices, storyProof) };
}

/** Longest board name. */
export const BOARD_NAME_MAX = 40;

/**
 * A name for the public board. Students are mostly minors, so a team shows
 * only under a name a member typed for the board (never the sign-up's
 * "ทีม<nickname>" default), checked for rude words.
 */
export function checkBoardName(raw: unknown): { ok: true; name: string } | { ok: false; error: "empty" | "long" | "rude" } {
  const name = typeof raw === "string" ? raw.normalize("NFC").replace(/\s+/g, " ").trim() : "";
  if (!name) return { ok: false, error: "empty" };
  if ([...name].length > BOARD_NAME_MAX) return { ok: false, error: "long" };
  if (isRudeTeamName(name)) return { ok: false, error: "rude" };
  return { ok: true, name };
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** A colour's Thai name as it looks on a surface ("ครีม" for ink on the dark ground). */
export function colorLabel(id: ColorId, surface: NameSurface = "ground"): string {
  return (surface === "ground" ? DARK_LABELS[id] : undefined) ?? colorOf(id).th;
}

/** A colour as it is drawn on a surface. */
export function nameColor(id: ColorId, surface: NameSurface = "ground"): string {
  const c = colorOf(id);
  return surface === "ground" ? c.dark : c.hex;
}

/** The two colours of a set gradient pair, on a surface. */
export function pairColors(id: PairId, surface: NameSurface = "ground"): [string, string] {
  const p = pairOf(id);
  return [nameColor(p.from, surface), nameColor(p.to, surface)];
}

const COOL = new Set<ColorId>(["leaf", "water", "air", "aether"]);

/**
 * The offset effect's shadow: water under warm colours, ember under cool
 * ones. On the dark ground they are the paper colours, so the shadow sits
 * back instead of glowing.
 */
export function offsetShadowColor(id: ColorId, surface: NameSurface = "ground"): string {
  if (surface === "ground") return COOL.has(id) ? colorOf("ember").hex : colorOf("water").hex;
  return COOL.has(id) ? colorOf("ember").hex : "#38c9c2";
}

/**
 * The inline style for a name on a surface (default: the dark ground). Room
 * is padded above and below for Thai tone marks, so a gradient clipped to the
 * text never cuts them off.
 */
export function nameStyleCss(style: TeamNameStyle, surface: NameSurface = "ground"): CSSProperties {
  const font = fontOf(style.font);
  const c1 = nameColor(style.color, surface);
  const base: CSSProperties = { fontFamily: font.family, fontWeight: font.weight, fontStyle: font.style, color: c1 };
  switch (style.effect) {
    case "gradient": {
      const [from, to] = pairColors(style.pair, surface);
      return {
        ...base,
        color: from,
        backgroundImage: `linear-gradient(90deg, ${from}, ${to})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        padding: "0.2em 0.08em",
        margin: "0 -0.08em",
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
      };
    }
    case "offset":
      return { ...base, textShadow: `0.05em 0.05em 0 ${offsetShadowColor(style.color, surface)}` };
    case "marker": {
      const band = rgba(c1, surface === "ground" ? 0.26 : 0.22);
      return {
        ...base,
        backgroundImage: `linear-gradient(transparent 55%, ${band} 55%, ${band} 92%, transparent 92%)`,
        padding: "0 0.12em",
        margin: "0 -0.12em",
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
      };
    }
    default:
      return base;
  }
}

/** WCAG contrast ratio of two #rrggbb colours (tests and the dark-variant check). */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** What the pay page's team row needs (components/hackathon/elemental/team-style/TeamStyleRow.tsx). */
export type TeamStyleCardData = {
  /** This team's row key on the board (lib/hackathon/elemental/team-style-board.ts). */
  key: string;
  /** The name a member set for the board. Null until someone sets one: the team isn't listed until then. */
  boardName: string | null;
  /** A sign-up without a team: a one-person team. */
  solo: boolean;
  style: TeamNameStyle;
  /** Devices over every member's share link, counted up to sign-up close. */
  devices: number;
  /** A member has a live Instagram Story proof: every style is open, whatever the devices. */
  storyUnlocked?: boolean;
  /** This person hasn't paid yet (no slip): the lobby links them back to the pay page. */
  payPending?: boolean;
  paid: number;
  /** Null when the team isn't on the board (no board name, no devices, or hidden). */
  rank: number | null;
  teamsOnBoard: number;
  /** Style and name can still be changed (until the end of Demo Day). */
  editable: boolean;
  /** The board shows final results: counting stopped at sign-up close. */
  final: boolean;
  /** This person's share page, for the board's "share my link" button. */
  shareHref: string | null;
  /** The team editor; without it /hackathon/join/<token>/team. The demo pages set their own. */
  editHref?: string;
};
