import type { ImageFormat } from "./types";

/**
 * Layout for the share images (spec 6.2, DS9, DS11). Pure numbers so the
 * golden tests pin it down. All text sits inside a 120px safe margin; the
 * story keeps the top 250px and bottom 340px clear for Instagram UI.
 */

export const COLORS = {
  canvas: "#F4F2FB",
  wash: "#ECE6FF",
  surface: "#FFFFFF",
  ink: "#14112A",
  ink2: "#45405E",
  ink3: "#625C7D",
  violet50: "#F1ECFF",
  violet100: "#E4DEF7",
  violet700: "#5B2FD6",
  line: "#E7E2F4",
} as const;

export const FONT_FAMILY = '"SR Latin", "SR Thai"';

export interface TextStyle {
  size: number;
  weight: 400 | 500 | 700;
  color: string;
  lineHeight: number; // multiplier
  maxLines: number;
}

export interface FormatLayout {
  width: number;
  height: number;
  /** Text and QR area. */
  safe: { left: number; top: number; right: number; bottom: number };
  /** White credential card behind the safe area. */
  card: { left: number; top: number; right: number; bottom: number; radius: number };
  missionColumns: 1 | 2;
  missionRow: number;
  checkRadius: number;
  qrSize: number;
  gaps: { section: number; small: number };
  text: {
    issuer: TextStyle;
    tag: TextStyle;
    titleTh: TextStyle;
    titleEn: TextStyle;
    label: TextStyle;
    holder: TextStyle;
    meta: TextStyle;
    missionTh: TextStyle;
    missionEn: TextStyle;
    statementTh: TextStyle;
    statementEn: TextStyle;
    verifyLabel: TextStyle;
    verifyUrl: TextStyle;
  };
}

const ts = (size: number, weight: TextStyle["weight"], color: string, maxLines = 1, lineHeight = 1.45): TextStyle => ({
  size,
  weight,
  color,
  maxLines,
  lineHeight,
});

export const LAYOUTS: Record<ImageFormat, FormatLayout> = {
  story: {
    width: 1080,
    height: 1920,
    safe: { left: 120, top: 270, right: 960, bottom: 1580 },
    card: { left: 72, top: 214, right: 1008, bottom: 1626, radius: 44 },
    missionColumns: 1,
    missionRow: 56,
    checkRadius: 19,
    qrSize: 160,
    gaps: { section: 28, small: 8 },
    text: {
      issuer: ts(30, 700, COLORS.violet700),
      tag: ts(24, 700, COLORS.violet700),
      titleTh: ts(46, 700, COLORS.ink, 2, 1.4),
      titleEn: ts(30, 500, COLORS.ink2, 2, 1.35),
      label: ts(22, 500, COLORS.ink3),
      holder: ts(64, 700, COLORS.ink, 2, 1.5),
      meta: ts(26, 500, COLORS.ink2, 1),
      missionTh: ts(30, 500, COLORS.ink),
      missionEn: ts(22, 500, COLORS.ink3),
      statementTh: ts(27, 400, COLORS.ink, 3, 1.55),
      statementEn: ts(23, 500, COLORS.ink2, 3, 1.45),
      verifyLabel: ts(22, 500, COLORS.ink3),
      verifyUrl: ts(24, 700, COLORS.violet700, 2, 1.35),
    },
  },
  square: {
    width: 1080,
    height: 1080,
    safe: { left: 120, top: 120, right: 960, bottom: 960 },
    card: { left: 64, top: 64, right: 1016, bottom: 1016, radius: 40 },
    missionColumns: 2,
    missionRow: 54,
    checkRadius: 15,
    qrSize: 120,
    gaps: { section: 20, small: 6 },
    text: {
      issuer: ts(26, 700, COLORS.violet700),
      tag: ts(20, 700, COLORS.violet700),
      titleTh: ts(36, 700, COLORS.ink, 1, 1.4),
      titleEn: ts(23, 500, COLORS.ink2, 1, 1.35),
      label: ts(19, 500, COLORS.ink3),
      holder: ts(52, 700, COLORS.ink, 1, 1.5),
      meta: ts(21, 500, COLORS.ink2, 1),
      missionTh: ts(23, 500, COLORS.ink),
      missionEn: ts(17, 500, COLORS.ink3),
      statementTh: ts(21, 400, COLORS.ink, 2, 1.5),
      statementEn: ts(18, 500, COLORS.ink2, 2, 1.4),
      verifyLabel: ts(18, 500, COLORS.ink3),
      verifyUrl: ts(20, 700, COLORS.violet700, 2, 1.3),
    },
  },
};

export function fontString(style: Pick<TextStyle, "size" | "weight">): string {
  return `${style.weight} ${style.size}px ${FONT_FAMILY}`;
}
