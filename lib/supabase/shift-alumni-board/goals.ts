import {
  buildHistory,
  HISTORY_ROUNDS,
  type Goal,
  type GoalFields,
  type GoalStatus,
  type History,
  type Round,
} from "@/lib/shift/alumniBoard";

import { db, nowIso } from "./core";

const GOAL_COLUMNS = "id, user_id, round_id, long_term, month_goal, week_goal, done_when, first_step, status, updated_at";

/** This round's goal and the latest earlier one (for carry-over and last week's check-in). */
export async function homeGoals(userId: string, round: Round): Promise<{ goal: Goal | null; lastGoal: Goal | null }> {
  const [current, last] = await Promise.all([
    db().from("shift_alumni_goals").select(GOAL_COLUMNS).eq("user_id", userId).eq("round_id", round.id).maybeSingle(),
    db()
      .from("shift_alumni_goals")
      .select(GOAL_COLUMNS)
      .eq("user_id", userId)
      .lt("round_id", round.id)
      .order("round_id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (current.error) throw current.error;
  if (last.error) throw last.error;
  return { goal: (current.data as Goal | null) ?? null, lastGoal: (last.data as Goal | null) ?? null };
}

/** This round's goals for these people, by user id. */
export async function roundGoals(round: Round, userIds?: string[]): Promise<Record<string, Goal>> {
  if (userIds && userIds.length === 0) return {};
  let query = db().from("shift_alumni_goals").select(GOAL_COLUMNS).eq("round_id", round.id);
  if (userIds) query = query.in("user_id", userIds);
  const { data, error } = await query;
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as Goal[]).map((g) => [g.user_id, g]));
}

/** Saving the card leaves its status alone. */
export async function saveGoal(userId: string, round: Round, fields: GoalFields): Promise<void> {
  const { error } = await db()
    .from("shift_alumni_goals")
    .upsert({ user_id: userId, round_id: round.id, ...fields, updated_at: nowIso() }, { onConflict: "user_id,round_id" });
  if (error) throw error;
}

/** False when the goal isn't this person's (or doesn't exist). */
export async function setGoalStatus(userId: string, goalId: string, status: GoalStatus): Promise<boolean> {
  const { data, error } = await db()
    .from("shift_alumni_goals")
    .update({ status, updated_at: nowIso() })
    .eq("id", goalId)
    .eq("user_id", userId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** The last finished rounds, newest first, as each person's ✅/❌/⚪ history and streak. */
export async function pastRounds(round: Round, userIds?: string[]): Promise<(userId: string) => History> {
  const { data: rounds, error } = await db()
    .from("shift_alumni_rounds")
    .select("id, started_at")
    .lt("id", round.id)
    .order("id", { ascending: false })
    .limit(HISTORY_ROUNDS);
  if (error) throw error;
  const past = (rounds ?? []) as Round[];

  const byUser = new Map<string, Map<number, Goal>>();
  if (past.length && (!userIds || userIds.length)) {
    let query = db()
      .from("shift_alumni_goals")
      .select("user_id, round_id, week_goal, status")
      .in(
        "round_id",
        past.map((r) => r.id),
      );
    if (userIds) query = query.in("user_id", userIds);
    const { data: goals, error: goalsError } = await query;
    if (goalsError) throw goalsError;
    for (const g of (goals ?? []) as Goal[]) {
      if (!byUser.has(g.user_id)) byUser.set(g.user_id, new Map());
      byUser.get(g.user_id)!.set(g.round_id, g);
    }
  }
  return (userId) => buildHistory(past, byUser.get(userId) ?? new Map());
}
