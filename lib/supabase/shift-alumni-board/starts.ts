import {
  clean,
  isJustFinished,
  isOpenStart,
  openStartCutoff,
  STARTS_PER_HOUR,
  type Round,
  type Start,
} from "@/lib/shift/alumniBoard";

import { countBy, db, nowIso } from "./core";

/**
 * "Start 10 minutes" on the first step. One open timer at a time, and an
 * hourly cap so a stuck button can't loop.
 */

const START_COLUMNS = "id, started_at, finished_at, note";

export async function startNow(userId: string, round: Round): Promise<"started" | "open" | "limit"> {
  const now = Date.now();
  const [open, lastHour] = await Promise.all([
    db()
      .from("shift_alumni_starts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("finished_at", null)
      .gt("started_at", openStartCutoff(now)),
    db()
      .from("shift_alumni_starts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gt("started_at", new Date(now - 3_600_000).toISOString()),
  ]);
  if (open.error) throw open.error;
  if (lastHour.error) throw lastHour.error;
  if (open.count) return "open";
  if ((lastHour.count ?? 0) >= STARTS_PER_HOUR) return "limit";
  const { error } = await db().from("shift_alumni_starts").insert({ user_id: userId, round_id: round.id });
  if (error) throw error;
  return "started";
}

/** Owner only: false when it isn't theirs. "more" rolls straight into another 10 minutes. */
export async function finishStart(
  userId: string,
  round: Round,
  startId: string,
  input: { note: unknown; more: boolean },
): Promise<boolean> {
  const { data: start, error } = await db()
    .from("shift_alumni_starts")
    .select(START_COLUMNS)
    .eq("id", startId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!start) return false;
  const { error: updateError } = await db()
    .from("shift_alumni_starts")
    .update({ finished_at: start.finished_at ?? nowIso(), note: clean(input.note) })
    .eq("id", startId);
  if (updateError) throw updateError;
  if (input.more) await startNow(userId, round);
  return true;
}

export interface HomeStarts {
  open: Start | null;
  cheer: Start | null;
  count: number;
}

/** The open timer (any round, so a new round can't hide it), a recent finish to cheer, and this round's count. */
export async function homeStarts(userId: string, round: Round): Promise<HomeStarts> {
  const [latest, count] = await Promise.all([
    db()
      .from("shift_alumni_starts")
      .select(START_COLUMNS)
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(2),
    db()
      .from("shift_alumni_starts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("round_id", round.id),
  ]);
  if (latest.error) throw latest.error;
  if (count.error) throw count.error;
  const [last, before] = (latest.data ?? []) as Start[];
  const open = isOpenStart(last) ? last : null;
  // After "ทำต่อ" the newest start is open, so the one just finished is the one before it.
  const finished = open ? before : last;
  return { open, cheer: isJustFinished(finished) ? finished : null, count: count.count ?? 0 };
}

/** Starts per person this round. */
export async function startCounts(round: Round): Promise<Record<string, number>> {
  const { data, error } = await db().from("shift_alumni_starts").select("user_id").eq("round_id", round.id);
  if (error) throw error;
  return countBy((data ?? []) as { user_id: string }[]);
}
