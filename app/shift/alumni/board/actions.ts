"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  BOARD_PATH,
  canSeeTeam,
  clean,
  GOAL_STATUSES,
  parseBangkokLocal,
  REACTIONS,
  type BoardViewer,
  type GoalStatus,
  type Round,
} from "@/lib/shift/alumniBoard";
import { alumniProfileSchema } from "@/lib/shift/alumniRsvp";
import { createAlumniMember } from "@/lib/supabase/shift-alumni-members";
import { currentRound, getBoardAccess, touch } from "@/lib/supabase/shift-alumni-board/core";
import { addPost, deletePost, toggleReaction } from "@/lib/supabase/shift-alumni-board/feed";
import { saveGoal, setGoalStatus } from "@/lib/supabase/shift-alumni-board/goals";
import { finishStart, startNow } from "@/lib/supabase/shift-alumni-board/starts";
import {
  addMeeting,
  addReply,
  findMeeting,
  findStandup,
  saveStandup,
  setMeetingHeld,
  setUnstuck,
} from "@/lib/supabase/shift-alumni-board/team";
import { addTest, deleteTest } from "@/lib/supabase/shift-alumni-board/tests";
import { createClient } from "@/utils/supabase/server";

/**
 * Every write on the alumni board. Each action checks who is calling (an
 * alumni account that isn't declined, or an admin as mentor) and what they may touch,
 * then writes with the service role.
 */

export type BoardActionResult = { ok: true } | { ok: false; error: string };

const id = z.string().uuid();
const fail = (error: string): BoardActionResult => ({ ok: false, error });
const NOT_FOUND = fail("ไม่พบรายการนี้ ลองรีเฟรชหน้า");

async function withViewer(
  run: (viewer: BoardViewer, round: Round) => Promise<BoardActionResult | void>,
): Promise<BoardActionResult> {
  try {
    const access = await getBoardAccess();
    if (access.kind !== "ok") return fail("ใช้ได้เฉพาะศิษย์เก่า SHIFT");
    const result = await run(access.viewer, await currentRound());
    if (result && !result.ok) return result;
    await touch(access.viewer.userId);
    revalidatePath(BOARD_PATH, "layout");
    return { ok: true };
  } catch (error) {
    console.error("Alumni board action failed:", error);
    return fail("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
}

/**
 * First visit from an account with no alumni record: same record the RSVP
 * makes (confirmed when a paid application is linked, pending otherwise).
 */
export async function joinBoardAction(input: { nickname: string; cohort: string }): Promise<BoardActionResult> {
  const parsed = alumniProfileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "ใส่ชื่อเล่นกับรุ่นก่อนนะ");
  try {
    const access = await getBoardAccess();
    if (access.kind === "signedOut") return fail("เข้าสู่ระบบก่อนนะ");
    if (access.kind === "declined") return fail("บัญชีนี้ยังยืนยันไม่ได้ว่าเคยลง SHIFT ทักทีมในกลุ่ม LINE ได้เลย");
    if (access.kind === "notMember") {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return fail("เข้าสู่ระบบก่อนนะ");
      await createAlumniMember(user.id, parsed.data);
    }
    revalidatePath(BOARD_PATH, "layout");
    return { ok: true };
  } catch (error) {
    console.error("Alumni board join failed:", error);
    return fail("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
}

export async function saveGoalAction(input: Record<string, unknown>) {
  return withViewer((viewer, round) =>
    saveGoal(viewer.userId, round, {
      long_term: clean(input.long_term),
      month_goal: clean(input.month_goal),
      week_goal: clean(input.week_goal),
      done_when: clean(input.done_when),
      first_step: clean(input.first_step),
    }),
  );
}

export async function setGoalStatusAction(goalId: string, status: GoalStatus) {
  return withViewer(async (viewer) => {
    if (!id.safeParse(goalId).success || !GOAL_STATUSES.includes(status)) return NOT_FOUND;
    if (!(await setGoalStatus(viewer.userId, goalId, status))) return NOT_FOUND;
  });
}

export async function startTimerAction() {
  return withViewer(async (viewer, round) => {
    const result = await startNow(viewer.userId, round);
    if (result === "limit") return fail("เริ่มได้ชั่วโมงละ 30 ครั้ง พักก่อนนะ");
  });
}

export async function finishTimerAction(startId: string, note: string, more: boolean) {
  return withViewer(async (viewer, round) => {
    if (!id.safeParse(startId).success) return NOT_FOUND;
    if (!(await finishStart(viewer.userId, round, startId, { note, more: Boolean(more) }))) return NOT_FOUND;
  });
}

export async function addTestAction(who: string, learned: string) {
  return withViewer(async (viewer, round) => {
    const result = await addTest(viewer.userId, round, { who, learned });
    if (result === "empty") return fail("ใครลองใช้? ใส่บทบาท เช่น ครูประถม");
    if (result === "limit") return fail("บันทึกได้วันละ 30 คน พรุ่งนี้มาต่อนะ");
  });
}

export async function deleteTestAction(testId: string) {
  return withViewer(async (viewer) => {
    if (!id.safeParse(testId).success || !(await deleteTest(viewer.userId, testId))) return NOT_FOUND;
  });
}

export async function addMeetingAction(teamId: string, startsAtLocal: string) {
  return withViewer(async (viewer) => {
    if (!id.safeParse(teamId).success || !canSeeTeam(viewer, teamId)) return NOT_FOUND;
    const startsAt = parseBangkokLocal(startsAtLocal);
    if (!startsAt) return fail("เลือกวันและเวลาก่อน");
    await addMeeting(teamId, startsAt, viewer.userId);
  });
}

/** Students run these meetings themselves, so anyone in the team can mark one held. */
export async function setMeetingHeldAction(meetingId: string, held: boolean) {
  return withViewer(async (viewer) => {
    if (!id.safeParse(meetingId).success) return NOT_FOUND;
    const meeting = await findMeeting(meetingId);
    if (!meeting || !canSeeTeam(viewer, meeting.team_id)) return NOT_FOUND;
    await setMeetingHeld(meetingId, Boolean(held));
  });
}

export async function saveStandupAction(meetingId: string, input: { done: string; next: string; stuck: string }) {
  return withViewer(async (viewer) => {
    if (!id.safeParse(meetingId).success) return NOT_FOUND;
    const meeting = await findMeeting(meetingId);
    if (!meeting || !canSeeTeam(viewer, meeting.team_id)) return NOT_FOUND;
    if (viewer.teamId !== meeting.team_id) return fail("เฉพาะคนในทีมเขียน standup ได้");
    await saveStandup(viewer.userId, meetingId, input);
  });
}

export async function replyAction(standupId: string, input: { prompt?: string; body?: string }) {
  return withViewer(async (viewer) => {
    if (!id.safeParse(standupId).success) return NOT_FOUND;
    const standup = await findStandup(standupId);
    if (!standup || !canSeeTeam(viewer, standup.team_id)) return NOT_FOUND;
    if (!standup.stuck) return fail("ตอบได้เฉพาะเรื่องที่ติดอยู่");
    if (!(await addReply(viewer.userId, standupId, { prompt: input.prompt, body: input.body }))) {
      return fail("เขียนคำตอบก่อนส่ง");
    }
  });
}

/** Only the student who was stuck marks it solved. */
export async function setUnstuckAction(standupId: string, solved: boolean) {
  return withViewer(async (viewer) => {
    if (!id.safeParse(standupId).success) return NOT_FOUND;
    const standup = await findStandup(standupId);
    if (!standup || !canSeeTeam(viewer, standup.team_id)) return NOT_FOUND;
    if (standup.user_id !== viewer.userId) return fail("เจ้าของเรื่องเท่านั้นที่กดแก้ได้แล้ว");
    if (!standup.stuck) return NOT_FOUND;
    await setUnstuck(standupId, Boolean(solved));
  });
}

export async function addPostAction(body: string, link: string) {
  return withViewer(async (viewer) => {
    const result = await addPost(viewer.userId, { body, link });
    if (!result.ok) return fail(result.error);
  });
}

export async function reactAction(postId: string, emoji: string) {
  return withViewer(async (viewer) => {
    const reaction = REACTIONS.find((r) => r === emoji);
    if (!id.safeParse(postId).success || !reaction) return NOT_FOUND;
    await toggleReaction(viewer.userId, postId, reaction);
  });
}

export async function deletePostAction(postId: string) {
  return withViewer(async (viewer) => {
    if (!id.safeParse(postId).success || !(await deletePost(viewer, postId))) return NOT_FOUND;
  });
}
