import type { CSSProperties } from "react";

/**
 * Theme tokens for the SHIFT round pages. Every round has its own print
 * style (SHIFT[0] holographic, SHIFT[1] pixel flood, SHIFT[2] riso dawn), so
 * the page reads colours through CSS variables set once on the page root.
 * Each variable falls back to the riso ink, so anything rendered outside a
 * themed root (the home page, the gallery) looks exactly as before.
 */

export interface ShiftPalette {
  /** Page background. */
  bg: string;
  /** Body text; tints are mixed from it. */
  text: string;
  /** Primary accent: eyebrows, icons, numerals. Riso orange. */
  accent1: string;
  /** Second accent. Riso pink. */
  accent2: string;
  /** Third accent: highlights, deadlines. Riso yellow. */
  accent3: string;
  /** Cool accent for plates and offsets. Riso blue. */
  accent4: string;
  /** Hairline colour. */
  hair: string;
  /** text-shadow for display headings (riso uses a misregistered pink plate). */
  headingShadow: string;
  /** Translucent bar behind the sticky CTA. */
  bar: string;
  button: { bg: string; fg: string; shadow: string; shadowHover: string };
}

const RISO_FALLBACK = {
  bg: "#17151c",
  text: "#f2ead9",
  accent1: "#ff6c2f",
  accent2: "#ff48b0",
  accent3: "#ffe800",
  accent4: "#0078bf",
  hair: "rgba(242,234,217,0.12)",
  headingShadow: "-1.5px 1px 1.5px rgba(255,72,176,0.6)",
  bar: "rgba(23,21,28,0.88)",
};

const v = (name: string, fallback: string) => `var(--shift-${name}, ${fallback})`;

/** Colour references to use in inline styles on a themed page. */
export const T = {
  bg: v("bg", RISO_FALLBACK.bg),
  text: v("text", RISO_FALLBACK.text),
  accent1: v("accent1", RISO_FALLBACK.accent1),
  accent2: v("accent2", RISO_FALLBACK.accent2),
  accent3: v("accent3", RISO_FALLBACK.accent3),
  accent4: v("accent4", RISO_FALLBACK.accent4),
  hair: v("hair", RISO_FALLBACK.hair),
  headingShadow: v("heading-shadow", RISO_FALLBACK.headingShadow),
  bar: v("bar", RISO_FALLBACK.bar),
} as const;

/** Body text at a hex alpha ("99" = 60%), mixed so it follows the theme. */
export function tint(alpha: string): string {
  const pct = Math.round((parseInt(alpha, 16) / 255) * 100);
  return `color-mix(in srgb, ${T.text} ${pct}%, transparent)`;
}

/** Display heading colour + plate, the themed MISREG_TEXT. */
export const HEADING: CSSProperties = { color: T.text, textShadow: T.headingShadow };

/** Accents in the order numerals and columns cycle through them. */
export const ACCENT_CYCLE = [T.accent1, T.accent2, T.accent3] as const;

export function accentFor(index: number): string {
  return ACCENT_CYCLE[index % ACCENT_CYCLE.length];
}

/** Hairline border + divider classes that follow the theme. */
export const THEME_HAIR = "border-[color:var(--shift-hair,rgba(242,234,217,0.12))] divide-[color:var(--shift-hair,rgba(242,234,217,0.12))]";

/** Inline CSS variables that set a palette on a page root. */
export function paletteVars(p: ShiftPalette): CSSProperties {
  return {
    "--shift-bg": p.bg,
    "--shift-text": p.text,
    "--shift-accent1": p.accent1,
    "--shift-accent2": p.accent2,
    "--shift-accent3": p.accent3,
    "--shift-accent4": p.accent4,
    "--shift-hair": p.hair,
    "--shift-heading-shadow": p.headingShadow,
    "--shift-bar": p.bar,
    "--shift-button-bg": p.button.bg,
    "--shift-button-fg": p.button.fg,
    "--shift-button-shadow": p.button.shadow,
    "--shift-button-shadow-hover": p.button.shadowHover,
    backgroundColor: p.bg,
    color: p.text,
  } as CSSProperties;
}

export const RISO_PALETTE: ShiftPalette = {
  ...RISO_FALLBACK,
  button: {
    bg: "#f2ead9",
    fg: "#17151c",
    shadow: "3px 3px 2px 0 rgba(255, 72, 176, 0.75), -2px -1px 2px 0 rgba(0, 120, 191, 0.45)",
    shadowHover: "6px 6px 3px 0 rgba(255, 72, 176, 0.85), -3px -2px 3px 0 rgba(0, 120, 191, 0.55)",
  },
};
