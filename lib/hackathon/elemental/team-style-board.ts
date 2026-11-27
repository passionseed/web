import { countDevices } from "./link-views";
import { shareCode, shareSource } from "./share";
import { clampStyle, readStyle, type TeamNameStyle } from "./team-style";

/**
 * The public team board (/hackathon/elemental/leaderboard): teams ranked by
 * the paid seats their members' share links brought in, then by the real
 * devices that opened those links. Pure; the database side is
 * lib/supabase/hackathon-leaderboard.ts.
 *
 * A team's numbers are the sums over every member's own link
 * (?src=share-<shareCode(registration id)>). A sign-up without a team is a
 * one-person team. Public rows carry team and school names only: never a
 * person's name, nickname or contact (students are mostly minors).
 */

export type BoardTeamRow = { id: string; name: string; style: unknown; hidden: boolean };

export type BoardRegistrationRow = {
  id: string;
  teamId: string | null;
  /** Without a team: the name it picked for the board, else its own team_name. Null when it has neither. */
  name: string | null;
  status: string;
  memberCount: number;
  /** The link this sign-up came through. */
  source: string | null;
  style: unknown;
  hidden: boolean;
  schools: string[];
};

export type BoardView = { source: string; ipHash: string };

/** One team's numbers, before hiding and ranking. */
export type BoardEntry = {
  /** Public and stable: "t" + the team id's first 10 hex, or "s" + the solo sign-up's share code. */
  key: string;
  /** The team id, or the registration id of a sign-up without a team. Server only. */
  id: string;
  solo: boolean;
  name: string | null;
  /** Clamped to what the team's devices unlock. */
  style: TeamNameStyle;
  schools: string[];
  devices: number;
  paid: number;
  hidden: boolean;
};

/** A row as the public page and API show it. */
export type PublicBoardEntry = Pick<BoardEntry, "key" | "solo" | "name" | "style" | "schools" | "devices" | "paid"> & {
  rank: number;
};

export function boardKey(r: { teamId: string | null; registrationId: string }): string {
  return r.teamId ? `t${r.teamId.replace(/-/g, "").slice(0, 10).toLowerCase()}` : `s${shareCode(r.registrationId)}`;
}

/** "โรงเรียนเตรียมอุดมศึกษา " → "เตรียมอุดมศึกษา". Free text from the sign-up form, so it is trimmed and capped. */
export function tidySchool(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(โรงเรียน|รร\.?)\s*/, "")
    .slice(0, 60)
    .trim();
}

/** Distinct schools, most members first, then in the order they were seen. */
export function teamSchools(raw: string[]): string[] {
  const counts = new Map<string, { name: string; n: number; first: number }>();
  raw.forEach((s, i) => {
    const name = tidySchool(s);
    if (!name) return;
    const key = name.toLowerCase().replace(/[\s.]/g, "");
    const seen = counts.get(key);
    if (seen) seen.n += 1;
    else counts.set(key, { name, n: 1, first: i });
  });
  return [...counts.values()].sort((a, b) => b.n - a.n || a.first - b.first).map((c) => c.name);
}

/** Every team's numbers, hidden ones and ones without devices included (the pay page needs them too). */
export function buildBoard(input: {
  teams: BoardTeamRow[];
  registrations: BoardRegistrationRow[];
  views: BoardView[];
}): BoardEntry[] {
  const viewsBySource = new Map<string, { ipHash: string }[]>();
  for (const v of input.views) {
    const list = viewsBySource.get(v.source) ?? [];
    list.push({ ipHash: v.ipHash });
    viewsBySource.set(v.source, list);
  }
  const paidBySource = new Map<string, number>();
  for (const r of input.registrations) {
    if (r.status !== "paid" || !r.source) continue;
    paidBySource.set(r.source, (paidBySource.get(r.source) ?? 0) + Math.max(1, r.memberCount));
  }
  const linkNumbers = (registrationId: string) => {
    const source = shareSource(shareCode(registrationId));
    const views = viewsBySource.get(source);
    return { devices: views ? countDevices(views) : 0, paid: paidBySource.get(source) ?? 0 };
  };

  const teams = new Map(input.teams.map((t) => [t.id, t]));
  const grouped = new Map<string, { team: BoardTeamRow; regs: BoardRegistrationRow[] }>();
  const out: BoardEntry[] = [];

  for (const r of input.registrations) {
    if (r.status === "cancelled") continue;
    const team = r.teamId ? teams.get(r.teamId) : undefined;
    if (team) {
      const g = grouped.get(team.id) ?? { team, regs: [] };
      g.regs.push(r);
      grouped.set(team.id, g);
      continue;
    }
    const { devices, paid } = linkNumbers(r.id);
    out.push({
      key: boardKey({ teamId: null, registrationId: r.id }),
      id: r.id,
      solo: true,
      name: r.name?.trim() || null,
      style: clampStyle(readStyle(r.style), devices),
      schools: teamSchools(r.schools),
      devices,
      paid,
      hidden: r.hidden,
    });
  }

  for (const { team, regs } of grouped.values()) {
    let devices = 0;
    let paid = 0;
    for (const r of regs) {
      const n = linkNumbers(r.id);
      devices += n.devices;
      paid += n.paid;
    }
    out.push({
      key: boardKey({ teamId: team.id, registrationId: regs[0].id }),
      id: team.id,
      solo: false,
      name: team.name.trim() || null,
      style: clampStyle(readStyle(team.style), devices),
      schools: teamSchools(regs.flatMap((r) => r.schools)),
      devices,
      paid,
      hidden: team.hidden,
    });
  }
  return out;
}

/**
 * The public board: not hidden, at least one device, most paid seats first,
 * then most devices. Teams level on both share a rank (1, 2, 2, 4) and are
 * listed by name.
 */
export function rankBoard(entries: BoardEntry[]): PublicBoardEntry[] {
  const shown = entries
    .filter((e) => !e.hidden && e.devices >= 1)
    .sort(
      (a, b) =>
        b.paid - a.paid ||
        b.devices - a.devices ||
        (a.name ?? "￿").localeCompare(b.name ?? "￿", "th") ||
        a.key.localeCompare(b.key),
    );
  let rank = 0;
  return shown.map((e, i) => {
    const prev = shown[i - 1];
    if (!prev || prev.paid !== e.paid || prev.devices !== e.devices) rank = i + 1;
    return { key: e.key, solo: e.solo, name: e.name, style: e.style, schools: e.schools, devices: e.devices, paid: e.paid, rank };
  });
}

/** What the board page renders and GET /api/hackathon/elemental/leaderboard returns. */
export type LeaderboardPayload = {
  /** live: open and loaded. closed: sharing isn't open (shareOpen()). unavailable: the numbers failed to load. */
  state: "live" | "closed" | "unavailable";
  teams: PublicBoardEntry[];
  updatedAt: string;
};

/** How often an open board page asks for new numbers. */
export const BOARD_POLL_MS = 20_000;
