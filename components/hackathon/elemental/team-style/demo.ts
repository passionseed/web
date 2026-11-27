import { clampStyle, DEFAULT_STYLE, type TeamNameStyle, type TeamStyleCardData } from "@/lib/hackathon/elemental/team-style";

/**
 * Made-up name style cards for /hackathon/join/demo?style=… (dev and PR
 * previews only): one per unlock level. Numbers and ranks are invented.
 */
export const DEMO_STYLE_LEVELS = ["locked", "colors", "fonts", "all"] as const;
export type DemoStyleLevel = (typeof DEMO_STYLE_LEVELS)[number];

/** The demo board's row for ไฟป่า, so "ดูกระดาน" lands on it. */
export const DEMO_TEAM_KEY = "tdemo0fire";

const LEVELS: Record<DemoStyleLevel, { devices: number; paid: number; rank: number | null; style: TeamNameStyle }> = {
  locked: { devices: 4, paid: 0, rank: 19, style: DEFAULT_STYLE },
  colors: { devices: 14, paid: 1, rank: 9, style: { ...DEFAULT_STYLE, color: "water" } },
  fonts: { devices: 31, paid: 2, rank: 5, style: { ...DEFAULT_STYLE, font: "chakra", color: "flame" } },
  all: { devices: 64, paid: 4, rank: 2, style: { font: "pattaya", color: "flame", effect: "gradient", color2: "aether" } },
};

export function demoStyleCard(level: DemoStyleLevel, opts: { solo: boolean; teamName: string | null }): TeamStyleCardData {
  const l = LEVELS[level];
  return {
    key: DEMO_TEAM_KEY,
    name: opts.solo ? (level === "locked" ? null : "หมาป่าเดียวดาย") : opts.teamName,
    canName: opts.solo,
    style: clampStyle(l.style, l.devices),
    devices: l.devices,
    paid: l.paid,
    rank: l.rank,
    teamsOnBoard: 23,
    shareHref: "/hackathon/join/demo/share",
  };
}
