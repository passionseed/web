import { clampStyle, DEFAULT_STYLE, type TeamNameStyle, type TeamStyleCardData } from "@/lib/hackathon/elemental/team-style";

/**
 * Made-up team rows for /hackathon/join/demo?style=… (dev and PR previews
 * only): one per unlock level, plus a team that hasn't set a board name and a
 * frozen one after sign-up close. Numbers and ranks are invented.
 */
export const DEMO_STYLE_LEVELS = ["unnamed", "locked", "colors", "fonts", "all", "final"] as const;
export type DemoStyleLevel = (typeof DEMO_STYLE_LEVELS)[number];

/** The demo board's row for ไฟป่า, so "ดูกระดาน" lands on it. */
export const DEMO_TEAM_KEY = "tdemo0fire";

const LEVELS: Record<DemoStyleLevel, { devices: number; paid: number; rank: number | null; named: boolean; style: TeamNameStyle }> = {
  unnamed: { devices: 6, paid: 0, rank: null, named: false, style: DEFAULT_STYLE },
  locked: { devices: 4, paid: 0, rank: 19, named: true, style: DEFAULT_STYLE },
  colors: { devices: 14, paid: 1, rank: 9, named: true, style: { ...DEFAULT_STYLE, color: "water" } },
  fonts: { devices: 31, paid: 2, rank: 5, named: true, style: { ...DEFAULT_STYLE, font: "chakra", color: "flame" } },
  all: { devices: 64, paid: 4, rank: 1, named: true, style: { font: "pattaya", color: "flame", effect: "gradient", pair: "fire" } },
  final: { devices: 64, paid: 4, rank: 1, named: true, style: { font: "pattaya", color: "flame", effect: "gradient", pair: "fire" } },
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
    editable: true,
    final: level === "final",
    shareHref: "/hackathon/join/demo/share",
  };
}
