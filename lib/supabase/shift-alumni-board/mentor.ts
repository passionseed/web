import { clean, isQuiet, summarizeStuck, TEAM_NAME_MAX, type GoalStatus, type Round } from "@/lib/shift/alumniBoard";

import { db, utc } from "./core";
import { pastRounds, roundGoals } from "./goals";
import { postStats } from "./feed";
import { startCounts } from "./starts";
import { listTeams, stuckRows, type Team } from "./team";
import { testCounts } from "./tests";

/** The admin's view of the board: everyone at a glance, and teams and rounds to run it. */

export interface MentorRow {
  user_id: string;
  nickname: string;
  cohort: string;
  team_id: string | null;
  weekGoal: string;
  status: GoalStatus | null;
  stuck: string | null;
  replies: number;
  quiet: boolean;
  starts: number;
  tests: number;
  streak: number;
}

export interface MentorStats {
  students: number;
  goalsSet: number;
  done: number;
  planned: number;
  held: number;
  stuck: number;
  solved: number;
  quiet: number;
  started: number;
  posts: number;
  posters: number;
  testsThisRound: number;
  testers: number;
}

export interface MentorOverview {
  round: Round;
  stats: MentorStats;
  rows: MentorRow[];
  teams: Team[];
}

export async function mentorOverview(round: Round): Promise<MentorOverview> {
  const { data, error } = await db()
    .from("shift_alumni_members")
    .select("user_id, nickname, cohort, team_id, last_active_at")
    .neq("status", "declined")
    .order("nickname");
  if (error) throw error;
  const members = (data ?? []) as {
    user_id: string;
    nickname: string;
    cohort: string;
    team_id: string | null;
    last_active_at: string | null;
  }[];
  const ids = members.map((m) => m.user_id);
  const since = utc(round.started_at);

  const [teams, goals, history, stuck, starts, tests, posts, meetings] = await Promise.all([
    listTeams(),
    roundGoals(round, ids),
    pastRounds(round, ids),
    stuckRows(round),
    startCounts(round),
    testCounts(round),
    postStats(round, new Set(ids)),
    db().from("shift_alumni_meetings").select("held").or(`starts_at.gte.${since},created_at.gte.${since}`),
  ]);
  if (meetings.error) throw meetings.error;
  const { stuck: stuckBy, replies, solved } = summarizeStuck(stuck);
  const teamOrder = new Map(teams.map((t, i) => [t.id, i]));

  const rows: MentorRow[] = members
    .map((m) => ({
      user_id: m.user_id,
      nickname: m.nickname,
      cohort: m.cohort,
      team_id: m.team_id,
      weekGoal: goals[m.user_id]?.week_goal ?? "",
      status: goals[m.user_id]?.status ?? null,
      stuck: stuckBy[m.user_id] ?? null,
      replies: replies[m.user_id] ?? 0,
      quiet: isQuiet(m.last_active_at),
      starts: starts[m.user_id] ?? 0,
      tests: tests.counts[m.user_id] ?? 0,
      streak: history(m.user_id).streak,
    }))
    .sort((a, b) => (teamOrder.get(a.team_id ?? "") ?? 1e9) - (teamOrder.get(b.team_id ?? "") ?? 1e9));

  const meetingRows = (meetings.data ?? []) as { held: boolean }[];
  const stats: MentorStats = {
    students: rows.length,
    goalsSet: rows.filter((r) => r.weekGoal).length,
    done: rows.filter((r) => r.status === "done").length,
    planned: meetingRows.length,
    held: meetingRows.filter((m) => m.held).length,
    stuck: rows.filter((r) => r.stuck).length,
    solved,
    quiet: rows.filter((r) => r.quiet).length,
    started: rows.filter((r) => r.starts).length,
    posts: posts.posts,
    posters: posts.posters,
    testsThisRound: tests.thisRound,
    testers: rows.filter((r) => r.tests).length,
  };
  return { round, stats, rows, teams };
}

export async function createTeam(name: unknown): Promise<boolean> {
  const value = clean(name, TEAM_NAME_MAX);
  if (!value) return false;
  const { error } = await db().from("shift_alumni_teams").insert({ name: value });
  if (error) throw error;
  return true;
}

export async function setMemberTeam(userId: string, teamId: string | null): Promise<void> {
  const { error } = await db().from("shift_alumni_members").update({ team_id: teamId }).eq("user_id", userId);
  if (error) throw error;
}

/** Run at each alumni session. Last round's long-term and 1-month goals carry over on the card. */
export async function startRound(adminId: string): Promise<void> {
  const { error } = await db().from("shift_alumni_rounds").insert({ started_by: adminId });
  if (error) throw error;
}
