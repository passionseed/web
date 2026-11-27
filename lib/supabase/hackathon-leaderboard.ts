import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { elementalCountingEndsAt } from "@/lib/hackathon/elemental/link-views-shared";
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
import type { BoardPhase } from "@/lib/hackathon/elemental/team-style-phase";

/**
 * The Elemental team board's numbers (service role; rules in
 * lib/hackathon/elemental/team-style-board.ts). Reads every share-link view
 * and every sign-up of the event up to sign-up close, so the result is kept
 * for MEMO_MS per server instance; the API adds a short CDN cache on top.
 *
 * Before the 20261127110000 migration is applied there are no board names,
 * so nothing is listed; the page still works.
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

/** A column the query asked for isn't there yet (a migration not applied). */
export function isMissingColumn(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === "42703" || e?.code === "PGRST204" || /column .* does not exist|could not find .* column/i.test(e?.message ?? "");
}

/** Run with the newer columns; if they don't exist yet, run again without them. */
async function withColumnFallback<T>(run: (full: boolean) => Promise<T>): Promise<T> {
  try {
    return await run(true);
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    return run(false);
  }
}

type TeamDbRow = { id: string; board_name?: string | null; name_style?: unknown; leaderboard_hidden?: boolean | null };
type RegDbRow = {
  id: string;
  team_id: string | null;
  status: string;
  member_count: number | null;
  source: string | null;
  created_at: string;
  free_seat?: boolean | null;
  board_name?: string | null;
  name_style?: unknown;
  leaderboard_hidden?: boolean | null;
  hackathon_event_registration_members: { school: string | null }[] | null;
};

async function loadTeams(eventSlug: string): Promise<BoardTeamRow[]> {
  const db = createAdminClient();
  const rows = await withColumnFallback((full) =>
    allRows<TeamDbRow>((from, to) =>
      db
        .from("hackathon_event_teams")
        .select(full ? "id, board_name, name_style, leaderboard_hidden" : "id")
        .eq("event_slug", eventSlug)
        .order("id")
        .range(from, to) as unknown as Page<TeamDbRow>,
    ),
  );
  return rows.map((t) => ({ id: t.id, boardName: t.board_name ?? null, style: t.name_style ?? null, hidden: Boolean(t.leaderboard_hidden) }));
}

async function loadRegistrations(eventSlug: string, endsAt: string): Promise<BoardRegistrationRow[]> {
  const db = createAdminClient();
  const base = "id, team_id, status, member_count, source, created_at, hackathon_event_registration_members(school)";
  const rows = await withColumnFallback((full) =>
    allRows<RegDbRow>((from, to) =>
      db
        .from("hackathon_event_registrations")
        .select(full ? `${base}, free_seat, board_name, name_style, leaderboard_hidden` : base)
        .eq("event_slug", eventSlug)
        .neq("status", "cancelled")
        .lte("created_at", endsAt)
        .order("id")
        .range(from, to) as unknown as Page<RegDbRow>,
    ),
  );
  return rows.map((r) => ({
    id: r.id,
    teamId: r.team_id,
    boardName: r.board_name ?? null,
    status: r.status,
    memberCount: r.member_count ?? 1,
    source: r.source,
    freeSeat: Boolean(r.free_seat),
    createdAt: r.created_at,
    style: r.name_style ?? null,
    hidden: Boolean(r.leaderboard_hidden),
    schools: (r.hackathon_event_registration_members ?? []).map((m) => m.school ?? "").filter(Boolean),
  }));
}

async function loadViews(eventSlug: string, endsAt: string): Promise<BoardView[]> {
  const db = createAdminClient();
  const rows = await allRows<{ source: string; ip_hash: string }>((from, to) =>
    db
      .from("hackathon_link_views")
      .select("source, ip_hash")
      .eq("event_slug", eventSlug)
      .like("source", "share-%")
      .lte("created_at", endsAt)
      .order("id")
      .range(from, to) as unknown as Page<{ source: string; ip_hash: string }>,
  );
  return rows.map((v) => ({ source: v.source, ipHash: v.ip_hash }));
}

const memo = new Map<string, { at: number; entries: Promise<BoardEntry[]> }>();

/** Every team's numbers, hidden and unnamed ones included, counted up to sign-up close. Kept for MEMO_MS. */
export async function loadBoardEntries(eventSlug: string): Promise<BoardEntry[]> {
  const hit = memo.get(eventSlug);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.entries;
  const endsAt = elementalCountingEndsAt();
  const iso = endsAt.toISOString();
  const entries = Promise.all([loadTeams(eventSlug), loadRegistrations(eventSlug, iso), loadViews(eventSlug, iso)]).then(
    ([teams, registrations, views]) => buildBoard({ teams, registrations, views, endsAt }),
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

/** The board page's and API's answer for a phase (team-style-phase.ts). Never throws: a failed load is "unavailable". */
export async function leaderboardPayload(eventSlug: string, phase: BoardPhase): Promise<LeaderboardPayload> {
  const updatedAt = new Date().toISOString();
  const countedUntil = elementalCountingEndsAt().toISOString();
  if (phase === "soon") return { state: "soon", teams: [], updatedAt, countedUntil };
  try {
    return { state: phase, teams: await loadLeaderboard(eventSlug), updatedAt, countedUntil };
  } catch (error) {
    console.error("[elemental leaderboard] failed to load", error);
    return { state: "unavailable", teams: [], updatedAt, countedUntil };
  }
}
