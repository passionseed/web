/**
 * Per-board settings: what the board looks like for the person looking at it.
 *
 * They live in localStorage for now (`whiteboard-settings:<boardId>`). Everything goes through
 * `loadBoardSettings` and `saveBoardSettings`, and nothing else knows where they are kept, so
 * moving them to the database means swapping those two for a fetch and a PATCH.
 *
 * A new setting is one field here (type, default, a line in `parseBoardSettings`) and one row in
 * `components/whiteboard/settings/rows.tsx`.
 */

export type BoardTheme = "light" | "dark";

export type BoardSettings = {
  /**
   * The canvas colour as #rrggbb, or null for the theme's own paper. Like every colour on an
   * Excalidraw board it is the light theme's colour: the dark theme shows its dark counterpart
   * (`darkCounterpart`), the way it shows everything drawn on the board.
   */
  background: string | null;
  /** FigJam's dot grid behind the board. */
  dots: boolean;
};

export const DEFAULT_BOARD_SETTINGS: BoardSettings = { background: null, dots: true };

/** The paper under a board whose colour was never chosen. Dark is Excalidraw's own dark canvas. */
export const DEFAULT_BACKGROUND: Record<BoardTheme, string> = { light: "#f5f5f3", dark: "#121212" };

/** In the dark theme each of these is its ink counterpart, so every one suits both themes. */
export const BACKGROUND_SWATCHES: readonly { name: string; value: string | null }[] = [
  { name: "กระดาษ · Paper", value: null },
  { name: "ขาว · White", value: "#ffffff" },
  { name: "ครีม · Warm cream", value: "#fbf3e4" },
  { name: "ม่วงคราม · Pale periwinkle", value: "#e9ecfb" },
  { name: "มินต์ · Pale mint", value: "#e6f4ec" },
  { name: "พีช · Pale peach", value: "#fde9df" },
  { name: "เทาอ่อน · Pale grey", value: "#ececec" },
];

/** Scene units between dots at 100%, and the dot's diameter in pixels. */
export const DOT_SPACING = 24;
export const DOT_SIZE = 1.5;
/** Dots never sit closer than this on screen: zoomed out, every 2nd, 4th, 8th... one is drawn. */
const MIN_DOT_GAP = 14;

const HEX = /^#[0-9a-f]{6}$/;

export const boardSettingsKey = (boardId: string) => `whiteboard-settings:${boardId}`;

/** Anything (stored JSON, a database row later) into valid settings; unknown or broken fields fall back to the defaults. */
export function parseBoardSettings(raw: unknown): BoardSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_BOARD_SETTINGS;
  const { background, dots } = raw as Record<string, unknown>;
  const color = typeof background === "string" ? background.toLowerCase() : null;
  return {
    background: color && HEX.test(color) ? color : DEFAULT_BOARD_SETTINGS.background,
    dots: typeof dots === "boolean" ? dots : DEFAULT_BOARD_SETTINGS.dots,
  };
}

export function loadBoardSettings(boardId: string): BoardSettings {
  try {
    const stored = typeof localStorage === "undefined" ? null : localStorage.getItem(boardSettingsKey(boardId));
    return stored ? parseBoardSettings(JSON.parse(stored)) : DEFAULT_BOARD_SETTINGS;
  } catch {
    return DEFAULT_BOARD_SETTINGS;
  }
}

export function saveBoardSettings(boardId: string, settings: BoardSettings): void {
  try {
    localStorage.setItem(boardSettingsKey(boardId), JSON.stringify(settings));
  } catch {
    // Private mode or a full disk: the setting still holds for this visit.
  }
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb: number[]): string =>
  `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;

/** CSS hue-rotate(180deg) as a matrix. Applying it twice is a full turn, so it undoes itself. */
const HUE_180 = [
  [-0.574, 1.43, 0.144],
  [0.426, 0.43, 0.144],
  [0.426, 1.43, -0.856],
];
const hueTurn = (rgb: number[]): number[] => HUE_180.map((row) => row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]);

/**
 * A colour as Excalidraw's dark theme shows it. The dark theme is a CSS filter over the light
 * drawing, `invert(93%) hue-rotate(180deg)`; this is the same sum, so the paper under the
 * canvas turns dark exactly the way the things drawn on it do.
 */
export function darkCounterpart(hex: string): string {
  return toHex(hueTurn(channels(hex).map((c) => 0.93 * 255 - 0.86 * c)));
}

/** The other way: the light colour whose dark counterpart is `hex` (as near as the filter allows). */
export function lightCounterpart(hex: string): string {
  return toHex(hueTurn(channels(hex)).map((c) => (0.93 * 255 - c) / 0.86));
}

/** The colour on screen. */
export function backgroundFor(settings: BoardSettings, theme: BoardTheme): string {
  if (!settings.background) return DEFAULT_BACKGROUND[theme];
  return theme === "dark" ? darkCounterpart(settings.background) : settings.background;
}

/**
 * The colour behind an exported image or a thumbnail: the light one. Excalidraw darkens it
 * itself when "Dark mode" is ticked in the export dialog.
 */
export const exportBackgroundFor = (settings: BoardSettings): string => settings.background ?? DEFAULT_BACKGROUND.light;

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Grey dots that read on any paper: a step darker on light colours, a step lighter on dark ones. */
export function dotColorFor(background: string): string {
  const dark = luminance(background) < 0.2;
  const toward = dark ? 255 : 0;
  const amount = dark ? 0.2 : 0.17;
  return toHex(channels(background).map((c) => c + (toward - c) * amount));
}

/**
 * Where the dot lattice sits for a viewport: `step` is the distance between dots on screen,
 * `x` and `y` are where the tile that holds scene point (0, 0) starts, `size` is the dot.
 */
export function dotLattice(view: { scrollX: number; scrollY: number; zoom: number }): { step: number; x: number; y: number; size: number } {
  let every = 1;
  while (DOT_SPACING * view.zoom * every < MIN_DOT_GAP) every *= 2;
  const step = DOT_SPACING * view.zoom * every;
  const wrap = (v: number) => ((v % step) + step) % step;
  return {
    step,
    // Each tile has its dot in the middle, so the tile starts half a step before the dot.
    x: wrap(view.scrollX * view.zoom - step / 2),
    y: wrap(view.scrollY * view.zoom - step / 2),
    size: Math.min(3, Math.max(1.25, DOT_SIZE * Math.sqrt(view.zoom))),
  };
}
