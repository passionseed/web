import { clean, TESTS_PER_DAY, WHO_MAX, type Round, type UserTest } from "@/lib/shift/alumniBoard";

import { countBy, db, displayNames } from "./core";

/**
 * Real-user tests: a student logs each time a real person tried their
 * project. "who" is a role like "ครูประถม", never a name.
 */

const RECENT = 5;
const TEAM_LIST = 30;
const TEST_COLUMNS = "id, who, learned, created_at";

export async function addTest(
  userId: string,
  round: Round,
  input: { who: unknown; learned: unknown },
): Promise<"ok" | "empty" | "limit"> {
  const who = clean(input.who, WHO_MAX);
  if (!who) return "empty";
  const { count, error } = await db()
    .from("shift_alumni_user_tests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if (error) throw error;
  if ((count ?? 0) >= TESTS_PER_DAY) return "limit";
  const { error: insertError } = await db()
    .from("shift_alumni_user_tests")
    .insert({ user_id: userId, round_id: round.id, who, learned: clean(input.learned) });
  if (insertError) throw insertError;
  return "ok";
}

/** Owner only. */
export async function deleteTest(userId: string, testId: string): Promise<boolean> {
  const { data, error } = await db()
    .from("shift_alumni_user_tests")
    .delete()
    .eq("id", testId)
    .eq("user_id", userId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

export interface HomeTests {
  total: number;
  thisRound: number;
  recent: UserTest[];
}

export async function homeTests(userId: string, round: Round): Promise<HomeTests> {
  const { data, error } = await db()
    .from("shift_alumni_user_tests")
    .select(`${TEST_COLUMNS}, round_id`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as (UserTest & { round_id: number })[];
  return {
    total: rows.length,
    thisRound: rows.filter((r) => r.round_id === round.id).length,
    recent: rows.slice(0, RECENT).map(({ round_id: _round, ...t }) => t),
  };
}

export interface TeamTests {
  counts: Record<string, number>;
  total: number;
  list: (UserTest & { name: string })[];
}

/** Callers check canSeeTeam first: the list holds what teammates learned. */
export async function teamTests(userIds: string[]): Promise<TeamTests> {
  if (userIds.length === 0) return { counts: {}, total: 0, list: [] };
  const { data, error } = await db()
    .from("shift_alumni_user_tests")
    .select(`${TEST_COLUMNS}, user_id`)
    .in("user_id", userIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as (UserTest & { user_id: string })[];
  const names = await displayNames(rows.slice(0, TEAM_LIST).map((r) => r.user_id));
  return {
    counts: countBy(rows),
    total: rows.length,
    list: rows.slice(0, TEAM_LIST).map((r) => ({ ...r, name: names[r.user_id] })),
  };
}

/** All-time tests per person, plus this round's total, for the mentor view. */
export async function testCounts(round: Round): Promise<{ counts: Record<string, number>; thisRound: number }> {
  const { data, error } = await db().from("shift_alumni_user_tests").select("user_id, round_id");
  if (error) throw error;
  const rows = (data ?? []) as { user_id: string; round_id: number }[];
  return { counts: countBy(rows), thisRound: rows.filter((r) => r.round_id === round.id).length };
}
