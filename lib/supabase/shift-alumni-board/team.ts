import { clean, type Goal, type Round, type StuckRow } from "@/lib/shift/alumniBoard";

import { db, displayNames, nowIso, utc } from "./core";
import { roundGoals } from "./goals";

/**
 * Teams, their work meetings and standups, and help on stuck: teammates and
 * mentors reply under a stuck note in the team space; only its owner marks it
 * solved. Callers check canSeeTeam before using any of this.
 */

export interface Team {
  id: string;
  name: string;
}

export interface TeamMember {
  user_id: string;
  nickname: string;
  goal: Goal | null;
}

export interface Reply {
  id: string;
  body: string;
  created_at: string;
  name: string;
}

export interface Standup {
  id: string;
  meeting_id: string;
  user_id: string;
  name: string;
  done: string;
  next: string;
  stuck: string;
  unstuck_at: string | null;
  replies: Reply[];
}

export interface Meeting {
  id: string;
  starts_at: string;
  held: boolean;
  standups: Standup[];
}

export async function listTeams(): Promise<Team[]> {
  const { data, error } = await db().from("shift_alumni_teams").select("id, name").order("name");
  if (error) throw error;
  return (data ?? []) as Team[];
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await db().from("shift_alumni_teams").select("id, name").eq("id", teamId).maybeSingle();
  if (error) throw error;
  return (data as Team | null) ?? null;
}

/** Alumni in the team (pending included), with this round's goal. */
export async function teamMembers(teamId: string, round: Round): Promise<TeamMember[]> {
  const { data, error } = await db()
    .from("shift_alumni_members")
    .select("user_id, nickname")
    .eq("team_id", teamId)
    .neq("status", "declined")
    .order("nickname");
  if (error) throw error;
  const members = (data ?? []) as { user_id: string; nickname: string }[];
  const goals = await roundGoals(
    round,
    members.map((m) => m.user_id),
  );
  return members.map((m) => ({ ...m, goal: goals[m.user_id] ?? null }));
}

/** A meeting counts for this round if it starts in it or was logged in it. */
export async function teamMeetings(teamId: string, round: Round): Promise<Meeting[]> {
  const since = utc(round.started_at);
  const { data: meetings, error } = await db()
    .from("shift_alumni_meetings")
    .select("id, starts_at, held")
    .eq("team_id", teamId)
    .or(`starts_at.gte.${since},created_at.gte.${since}`)
    .order("starts_at");
  if (error) throw error;
  const list = (meetings ?? []) as Omit<Meeting, "standups">[];
  if (list.length === 0) return [];

  const { data: standups, error: standupError } = await db()
    .from("shift_alumni_standups")
    .select("id, meeting_id, user_id, done, next, stuck, unstuck_at")
    .in(
      "meeting_id",
      list.map((m) => m.id),
    )
    .order("updated_at");
  if (standupError) throw standupError;
  const rows = (standups ?? []) as Omit<Standup, "name" | "replies">[];

  const { data: replies, error: replyError } = rows.length
    ? await db()
        .from("shift_alumni_replies")
        .select("id, standup_id, user_id, body, created_at")
        .in(
          "standup_id",
          rows.map((s) => s.id),
        )
        .order("created_at")
    : { data: [], error: null };
  if (replyError) throw replyError;
  const replyRows = (replies ?? []) as { id: string; standup_id: string; user_id: string; body: string; created_at: string }[];

  const names = await displayNames([...rows.map((s) => s.user_id), ...replyRows.map((r) => r.user_id)]);
  const repliesByStandup: Record<string, Reply[]> = {};
  for (const r of replyRows) {
    (repliesByStandup[r.standup_id] ??= []).push({ id: r.id, body: r.body, created_at: r.created_at, name: names[r.user_id] });
  }
  return list.map((m) => ({
    ...m,
    standups: rows
      .filter((s) => s.meeting_id === m.id)
      .map((s) => ({ ...s, name: names[s.user_id], replies: repliesByStandup[s.id] ?? [] })),
  }));
}

export async function addMeeting(teamId: string, startsAt: string, userId: string): Promise<void> {
  const { error } = await db()
    .from("shift_alumni_meetings")
    .insert({ team_id: teamId, starts_at: startsAt, created_by: userId });
  if (error) throw error;
}

export async function findMeeting(meetingId: string): Promise<{ id: string; team_id: string; held: boolean } | null> {
  const { data, error } = await db()
    .from("shift_alumni_meetings")
    .select("id, team_id, held")
    .eq("id", meetingId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function setMeetingHeld(meetingId: string, held: boolean): Promise<void> {
  const { error } = await db().from("shift_alumni_meetings").update({ held }).eq("id", meetingId);
  if (error) throw error;
}

/** A changed stuck note starts unsolved again. */
export async function saveStandup(
  userId: string,
  meetingId: string,
  input: { done: unknown; next: unknown; stuck: unknown },
): Promise<void> {
  const stuck = clean(input.stuck);
  const { data: existing, error } = await db()
    .from("shift_alumni_standups")
    .select("stuck, unstuck_at")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const { error: upsertError } = await db()
    .from("shift_alumni_standups")
    .upsert(
      {
        meeting_id: meetingId,
        user_id: userId,
        done: clean(input.done),
        next: clean(input.next),
        stuck,
        unstuck_at: existing && existing.stuck === stuck ? existing.unstuck_at : null,
        updated_at: nowIso(),
      },
      { onConflict: "meeting_id,user_id" },
    );
  if (upsertError) throw upsertError;
}

export interface StandupRef {
  id: string;
  user_id: string;
  stuck: string;
  unstuck_at: string | null;
  team_id: string;
}

export async function findStandup(standupId: string): Promise<StandupRef | null> {
  const { data, error } = await db()
    .from("shift_alumni_standups")
    .select("id, user_id, stuck, unstuck_at, shift_alumni_meetings!inner(team_id)")
    .eq("id", standupId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const meeting = data.shift_alumni_meetings as unknown as { team_id: string };
  return { id: data.id, user_id: data.user_id, stuck: data.stuck, unstuck_at: data.unstuck_at, team_id: meeting.team_id };
}

/** A tapped reflection prompt goes first, then anything typed. */
export async function addReply(userId: string, standupId: string, input: { prompt: unknown; body: unknown }) {
  const body = clean([clean(input.prompt), clean(input.body)].filter(Boolean).join("\n"));
  if (!body) return false;
  const { error } = await db().from("shift_alumni_replies").insert({ standup_id: standupId, user_id: userId, body });
  if (error) throw error;
  return true;
}

export async function setUnstuck(standupId: string, solved: boolean): Promise<void> {
  const { error } = await db()
    .from("shift_alumni_standups")
    .update({ unstuck_at: solved ? nowIso() : null })
    .eq("id", standupId);
  if (error) throw error;
}

/** This round's standups, oldest first, for summarizeStuck(). */
export async function stuckRows(round: Round): Promise<StuckRow[]> {
  const { data, error } = await db()
    .from("shift_alumni_standups")
    .select("user_id, stuck, unstuck_at, shift_alumni_replies(count)")
    .gte("updated_at", utc(round.started_at))
    .order("updated_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    user_id: row.user_id as string,
    stuck: row.stuck as string,
    unstuck_at: row.unstuck_at as string | null,
    replies: (row.shift_alumni_replies as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

/** Replies from others on the student's latest standup this round, if it is stuck and not solved. */
export async function helpReplyCount(userId: string, round: Round): Promise<number> {
  const { data, error } = await db()
    .from("shift_alumni_standups")
    .select("id, stuck, unstuck_at")
    .eq("user_id", userId)
    .gte("updated_at", utc(round.started_at))
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.stuck || data.unstuck_at) return 0;
  const { count, error: countError } = await db()
    .from("shift_alumni_replies")
    .select("id", { count: "exact", head: true })
    .eq("standup_id", data.id)
    .neq("user_id", userId);
  if (countError) throw countError;
  return count ?? 0;
}
