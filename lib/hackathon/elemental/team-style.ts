import type { CSSProperties } from "react";

/**
 * Team name styles for Elemental (Big, 2026-11-27: "the web should show them
 * as like with discord nitro, the customizability of their name"). A style is
 * a font, a colour and an effect, each picked from a fixed list here: no
 * free-form CSS ever reaches the page. The server checks every save with
 * checkStyleSave().
 *
 * Sharing unlocks the lists, like a Nitro perk: the more real devices open the
 * share links of a team's members, the more of a style the team can change.
 * Safe to import in the browser.
 */

/** Devices (summed over every member's share link) that unlock each part. Claude's pick; tune it here only. */
export const TEAM_STYLE_TIERS = { color: 10, font: 25, effect: 50 } as const;

export type StylePart = keyof typeof TEAM_STYLE_TIERS;
export const STYLE_PARTS: readonly StylePart[] = ["color", "font", "effect"];

/**
 * Fonts that carry Thai and Latin (next/font/google, see
 * components/hackathon/elemental/team-style/fonts.ts). Trirong, the Elemental
 * type, is the free default. Mitr and bold Kanit are banned.
 */
export const NAME_FONTS = [
  { id: "trirong", label: "Trirong", family: "var(--font-trirong), 'Noto Serif Thai', serif", weight: 400 },
  { id: "chakra", label: "Chakra Petch", family: "var(--font-ts-chakra), 'Noto Sans Thai', sans-serif", weight: 600 },
  { id: "kodchasan", label: "Kodchasan", family: "var(--font-ts-kodchasan), 'Noto Sans Thai', sans-serif", weight: 600 },
  { id: "itim", label: "Itim", family: "var(--font-ts-itim), 'Noto Sans Thai', sans-serif", weight: 400 },
  { id: "sriracha", label: "Sriracha", family: "var(--font-ts-sriracha), 'Noto Sans Thai', cursive", weight: 400 },
  { id: "pattaya", label: "Pattaya", family: "var(--font-ts-pattaya), 'Noto Sans Thai', sans-serif", weight: 400 },
  { id: "chonburi", label: "Chonburi", family: "var(--font-ts-chonburi), 'Noto Serif Thai', serif", weight: 400 },
  { id: "charm", label: "Charm", family: "var(--font-ts-charm), 'Noto Serif Thai', cursive", weight: 700 },
] as const;

/**
 * Colours from the Elemental palette (components/hackathon/poster/elemental/brand.ts),
 * darkened where needed so each reads at 3.5:1 or better on the cream page.
 * Ink is the free default.
 */
export const NAME_COLORS = [
  { id: "ink", th: "หมึก", hex: "#1d211f" },
  { id: "ember", th: "ถ่านแดง", hex: "#b8301a" },
  { id: "flame", th: "ไฟ", hex: "#c94f17" },
  { id: "amber", th: "อำพัน", hex: "#946208" },
  { id: "earth", th: "ดิน", hex: "#6b4423" },
  { id: "leaf", th: "ใบไม้", hex: "#4f6f16" },
  { id: "water", th: "น้ำ", hex: "#0e7470" },
  { id: "air", th: "ลม", hex: "#56616b" },
  { id: "aether", th: "อีเธอร์", hex: "#5b3fc4" },
  { id: "rose", th: "กุหลาบ", hex: "#b02a5b" },
] as const;

/** Effects. Gradient and pop also use a second colour. Solid is the free default. */
export const NAME_EFFECTS = [
  { id: "solid", th: "สีเดียว", twoColors: false },
  { id: "gradient", th: "ไล่สี", twoColors: true },
  { id: "pop", th: "เงาเด้ง", twoColors: true },
  { id: "outline", th: "ตัวกลวง", twoColors: false },
  { id: "marker", th: "ปากกาเน้น", twoColors: false },
] as const;

export type FontId = (typeof NAME_FONTS)[number]["id"];
export type ColorId = (typeof NAME_COLORS)[number]["id"];
export type EffectId = (typeof NAME_EFFECTS)[number]["id"];

export type TeamNameStyle = { font: FontId; color: ColorId; effect: EffectId; color2: ColorId };

export const DEFAULT_STYLE: TeamNameStyle = { font: "trirong", color: "ink", effect: "solid", color2: "flame" };

const FONT_IDS = new Set<string>(NAME_FONTS.map((f) => f.id));
const COLOR_IDS = new Set<string>(NAME_COLORS.map((c) => c.id));
const EFFECT_IDS = new Set<string>(NAME_EFFECTS.map((e) => e.id));

const isFont = (v: unknown): v is FontId => typeof v === "string" && FONT_IDS.has(v);
const isColor = (v: unknown): v is ColorId => typeof v === "string" && COLOR_IDS.has(v);
const isEffect = (v: unknown): v is EffectId => typeof v === "string" && EFFECT_IDS.has(v);

export const fontOf = (id: FontId) => NAME_FONTS.find((f) => f.id === id) ?? NAME_FONTS[0];
export const colorOf = (id: ColorId) => NAME_COLORS.find((c) => c.id === id) ?? NAME_COLORS[0];
export const effectOf = (id: EffectId) => NAME_EFFECTS.find((e) => e.id === id) ?? NAME_EFFECTS[0];

/**
 * A style read back from the database: anything unknown falls back to the
 * default, so an old or hand-edited row can never break a page.
 */
export function readStyle(raw: unknown): TeamNameStyle {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_STYLE };
  const r = raw as Record<string, unknown>;
  return {
    font: isFont(r.font) ? r.font : DEFAULT_STYLE.font,
    color: isColor(r.color) ? r.color : DEFAULT_STYLE.color,
    effect: isEffect(r.effect) ? r.effect : DEFAULT_STYLE.effect,
    color2: isColor(r.color2) ? r.color2 : DEFAULT_STYLE.color2,
  };
}

/** A style sent by a browser: every field must be on the lists, nothing else allowed. Null when it isn't. */
export function parseStyle(raw: unknown): TeamNameStyle | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const keys = Object.keys(r);
  if (keys.some((k) => !["font", "color", "effect", "color2"].includes(k))) return null;
  if (!isFont(r.font) || !isColor(r.color) || !isEffect(r.effect)) return null;
  if (r.color2 !== undefined && !isColor(r.color2)) return null;
  return { font: r.font, color: r.color, effect: r.effect, color2: isColor(r.color2) ? r.color2 : DEFAULT_STYLE.color2 };
}

export function unlockedParts(devices: number): Record<StylePart, boolean> {
  return {
    color: devices >= TEAM_STYLE_TIERS.color,
    font: devices >= TEAM_STYLE_TIERS.font,
    effect: devices >= TEAM_STYLE_TIERS.effect,
  };
}

/** The next part to unlock and how many more devices it needs, or null when everything is open. */
export function nextUnlock(devices: number): { part: StylePart; at: number; left: number } | null {
  for (const part of STYLE_PARTS) {
    const at = TEAM_STYLE_TIERS[part];
    if (devices < at) return { part, at, left: at - devices };
  }
  return null;
}

/** The parts of a style that differ from the default but aren't unlocked yet. */
export function lockedChoices(style: TeamNameStyle, devices: number): StylePart[] {
  const open = unlockedParts(devices);
  const out: StylePart[] = [];
  if (style.color !== DEFAULT_STYLE.color && !open.color) out.push("color");
  if (style.font !== DEFAULT_STYLE.font && !open.font) out.push("font");
  if (style.effect !== DEFAULT_STYLE.effect && !open.effect) out.push("effect");
  return out;
}

/** The style as it may show: any part the team hasn't unlocked goes back to the default. */
export function clampStyle(style: TeamNameStyle, devices: number): TeamNameStyle {
  const open = unlockedParts(devices);
  return {
    font: open.font ? style.font : DEFAULT_STYLE.font,
    color: open.color ? style.color : DEFAULT_STYLE.color,
    effect: open.effect ? style.effect : DEFAULT_STYLE.effect,
    // The second colour only shows with an effect, which needs the colour tier too.
    color2: open.effect ? style.color2 : DEFAULT_STYLE.color2,
  };
}

export type StyleSaveCheck =
  | { ok: true; style: TeamNameStyle }
  | { ok: false; error: "invalid" }
  | { ok: false; error: "locked"; parts: StylePart[] };

/** The server's check on a save: on the lists, and nothing the team hasn't unlocked. */
export function checkStyleSave(raw: unknown, devices: number): StyleSaveCheck {
  const style = parseStyle(raw);
  if (!style) return { ok: false, error: "invalid" };
  const parts = lockedChoices(style, devices);
  if (parts.length > 0) return { ok: false, error: "locked", parts };
  return { ok: true, style: clampStyle(style, devices) };
}

/** A second colour that differs from the first, so a gradient or a shadow always shows. */
export function partnerColor(color: ColorId): ColorId {
  return color === "flame" ? "amber" : "flame";
}

/** The style with its second colour moved off the first one when they match. */
export function withDistinctColors(style: TeamNameStyle): TeamNameStyle {
  return style.color2 === style.color ? { ...style, color2: partnerColor(style.color) } : style;
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/**
 * The inline style for a name. Room is padded above and below for Thai tone
 * marks, so a gradient clipped to the text never cuts them off.
 */
export function nameStyleCss(style: TeamNameStyle): CSSProperties {
  const font = fontOf(style.font);
  const c1 = colorOf(style.color).hex;
  const c2 = colorOf(style.color2).hex;
  const base: CSSProperties = { fontFamily: font.family, fontWeight: font.weight, color: c1 };
  switch (style.effect) {
    case "gradient":
      return {
        ...base,
        backgroundImage: `linear-gradient(90deg, ${c1}, ${c2})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
        padding: "0.2em 0.08em",
        margin: "0 -0.08em",
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
      };
    case "pop":
      return { ...base, textShadow: `0.06em 0.06em 0 ${c2}` };
    case "outline":
      return {
        ...base,
        color: "transparent",
        WebkitTextFillColor: "transparent",
        WebkitTextStroke: `max(1px, 0.035em) ${c1}`,
      };
    case "marker":
      return {
        ...base,
        backgroundImage: `linear-gradient(transparent 55%, ${rgba(c1, 0.22)} 55%, ${rgba(c1, 0.22)} 92%, transparent 92%)`,
        padding: "0 0.12em",
        margin: "0 -0.12em",
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
      };
    default:
      return base;
  }
}

/** Longest name a sign-up without a team can pick for the board. */
export const SOLO_NAME_MAX = 40;

/** What the pay page's name style card needs. */
export type TeamStyleCardData = {
  /** This team's row key on the board (lib/hackathon/elemental/team-style-board.ts). */
  key: string;
  /** The team's name, or for a sign-up without a team the name it picked (null until it picks one). */
  name: string | null;
  /** A sign-up without a team picks its own board name here. Teams rename on the team card. */
  canName: boolean;
  style: TeamNameStyle;
  devices: number;
  paid: number;
  /** Null when the team isn't on the board (no devices yet, or hidden). */
  rank: number | null;
  teamsOnBoard: number;
  /** Where this person gets their own share link. */
  shareHref: string | null;
};
