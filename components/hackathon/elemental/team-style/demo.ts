import { clampStyle, DEFAULT_STYLE, type TeamNameStyle, type TeamStyleCardData } from "@/lib/hackathon/elemental/team-style";

/**
 * Made-up team rows for the demo pages (dev and PR previews only): one per
 * unlock level, plus a team that hasn't set a board name, a frozen one after
 * sign-up close, and one that can't be edited any more (after Demo Day).
 * Numbers and ranks are invented.
 * - /hackathon/join/demo?style=<level>: the pay page's team line;
 * - /hackathon/join/demo/team?style=<level>: the team editor.
 */
export const DEMO_STYLE_LEVELS = ["unnamed", "locked", "colors", "fonts", "all", "final", "closed"] as const;
export type DemoStyleLevel = (typeof DEMO_STYLE_LEVELS)[number];

/** The demo board's row for ไฟป่า, so "กระดาน →" lands on it. */
export const DEMO_TEAM_KEY = "tdemo0fire";

const LEVELS: Record<DemoStyleLevel, { devices: number; paid: number; rank: number | null; named: boolean; style: TeamNameStyle }> = {
  unnamed: { devices: 6, paid: 0, rank: null, named: false, style: DEFAULT_STYLE },
  locked: { devices: 4, paid: 0, rank: 19, named: true, style: DEFAULT_STYLE },
  colors: { devices: 14, paid: 1, rank: 9, named: true, style: { ...DEFAULT_STYLE, color: "water" } },
  fonts: { devices: 31, paid: 2, rank: 5, named: true, style: { ...DEFAULT_STYLE, font: "chakra", color: "flame" } },
  all: { devices: 142, paid: 9, rank: 1, named: true, style: { font: "pattaya", color: "flame", effect: "gradient", pair: "fire" } },
  final: { devices: 142, paid: 9, rank: 1, named: true, style: { font: "pattaya", color: "flame", effect: "gradient", pair: "fire" } },
  closed: { devices: 142, paid: 9, rank: 1, named: true, style: { font: "pattaya", color: "flame", effect: "gradient", pair: "fire" } },
};

export function demoStyleCard(level: DemoStyleLevel, opts: { solo: boolean }): TeamStyleCardData {
  const l = LEVELS[level];
  return {
    key: DEMO_TEAM_KEY,
    boardName: l.named ? (opts.solo ? "หมาป่าเดียวดาย" : "ไฟป่า") : null,
    solo: opts.solo,
    style: clampStyle(l.style, l.devices),
    devices: l.devices,
    paid: l.paid,
    rank: l.rank,
    teamsOnBoard: 23,
    editable: level !== "closed",
    final: level === "final" || level === "closed",
    shareHref: "/hackathon/join/demo/share",
    editHref: `/hackathon/join/demo/team?style=${level}${opts.solo ? "&mode=solo" : ""}`,
  };
}

export const isDemoStyleLevel = (v: unknown): v is DemoStyleLevel => DEMO_STYLE_LEVELS.includes(v as DemoStyleLevel);
