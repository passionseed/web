import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import {
  buildBoard,
  rankBoard,
  type BoardEntry,
  type BoardRegistrationRow,
  type BoardTeamRow,
  type BoardView,
  type LeaderboardPayload,
  type PublicBoardEntry,
} from "@/lib/hackathon/elemental/team-style-board";

/**
 * The Elemental team board's numbers (service role; rules in
 * lib/hackathon/elemental/team-style-board.ts). Reads every share-link view
 * and every sign-up of the event, so the result is kept for MEMO_MS per
 * server instance; the API adds a short CDN cache on top.
 *
 * Works before the 20261127110000 migration is applied: without the style
 * columns, names show plain and nothing is hidden.
 */

const PAGE = 1000;
const MEMO_MS = 15_000;

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/** Every row of a query, PAGE at a time (Supabase returns at most 1000 per request). */
async function allRows<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

/** The style columns aren't there yet (migration not applied). */
export function isMissingColumn(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === "42703" || e?.code === "PGRST204" || /column .* does not exist|could not find .* column/i.test(e?.message ?? "");
}

/** Run with the style columns; if they don't exist yet, run again without them. */
async function withStyleFallback<T>(run: (styled: boolean) => Promise<T>): Promise<T> {
  try {
    return await run(true);
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    return run(false);
  }
}

type TeamDbRow = { id: string; name: string; name_style?: unknown; leaderboard_hidden?: boolean | null };
type RegDbRow = {
  id: string;
  team_id: string | null;
  team_name: string | null;
  status: string;
  member_count: number | null;
  source: string | null;
  name_style?: unknown;
  leaderboard_name?: string | null;
  leaderboard_hidden?: boolean | null;
  hackathon_event_registration_members: { school: string | null }[] | null;
};

async function loadTeams(eventSlug: string): Promise<BoardTeamRow[]> {
  const db = createAdminClient();
  const rows = await withStyleFallback((styled) =>
    allRows<TeamDbRow>((from, to) =>
      db
        .from("hackathon_event_teams")
        .select(styled ? "id, name, name_style, leaderboard_hidden" : "id, name")
        .eq("event_slug", eventSlug)
        .order("id")
        .range(from, to) as unknown as Page<TeamDbRow>,
    ),
  );
  return rows.map((t) => ({ id: t.id, name: t.name, style: t.name_style ?? null, hidden: Boolean(t.leaderboard_hidden) }));
}

async function loadRegistrations(eventSlug: string): Promise<BoardRegistrationRow[]> {
  const db = createAdminClient();
  const base = "id, team_id, team_name, status, member_count, source, hackathon_event_registration_members(school)";
  const rows = await withStyleFallback((styled) =>
    allRows<RegDbRow>((from, to) =>
      db
        .from("hackathon_event_registrations")
        .select(styled ? `${base}, name_style, leaderboard_name, leaderboard_hidden` : base)
        .eq("event_slug", eventSlug)
        .neq("status", "cancelled")
        .order("id")
        .range(from, to) as unknown as Page<RegDbRow>,
    ),
  );
  return rows.map((r) => ({
    id: r.id,
    teamId: r.team_id,
    name: r.leaderboard_name || r.team_name || null,
    status: r.status,
    memberCount: r.member_count ?? 1,
    source: r.source,
    style: r.name_style ?? null,
    hidden: Boolean(r.leaderboard_hidden),
    schools: (r.hackathon_event_registration_members ?? []).map((m) => m.school ?? "").filter(Boolean),
  }));
}

async function loadViews(eventSlug: string): Promise<BoardView[]> {
  const db = createAdminClient();
  const rows = await allRows<{ source: string; ip_hash: string }>((from, to) =>
    db
      .from("hackathon_link_views")
      .select("source, ip_hash")
      .eq("event_slug", eventSlug)
      .like("source", "share-%")
      .order("id")
      .range(from, to) as unknown as Page<{ source: string; ip_hash: string }>,
  );
  return rows.map((v) => ({ source: v.source, ipHash: v.ip_hash }));
}

const memo = new Map<string, { at: number; entries: Promise<BoardEntry[]> }>();

/** Every team's numbers, hidden ones included. Kept for MEMO_MS. */
export async function loadBoardEntries(eventSlug: string): Promise<BoardEntry[]> {
  const hit = memo.get(eventSlug);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.entries;
  const entries = Promise.all([loadTeams(eventSlug), loadRegistrations(eventSlug), loadViews(eventSlug)]).then(
    ([teams, registrations, views]) => buildBoard({ teams, registrations, views }),
  );
  memo.set(eventSlug, { at: Date.now(), entries });
  entries.catch(() => memo.delete(eventSlug));
  return entries;
}

/** Forget the kept numbers, after a save or a hide on this instance. */
export function forgetBoard(eventSlug: string): void {
  memo.delete(eventSlug);
}

/** The public board, ranked. */
export async function loadLeaderboard(eventSlug: string): Promise<PublicBoardEntry[]> {
  return rankBoard(await loadBoardEntries(eventSlug));
}

/** The board page's and API's answer. Never throws: a failed load is "unavailable". */
export async function leaderboardPayload(eventSlug: string, open: boolean): Promise<LeaderboardPayload> {
  const updatedAt = new Date().toISOString();
  if (!open) return { state: "closed", teams: [], updatedAt };
  try {
    return { state: "live", teams: await loadLeaderboard(eventSlug), updatedAt };
  } catch (error) {
    console.error("[elemental leaderboard] failed to load", error);
    return { state: "unavailable", teams: [], updatedAt };
  }
}
