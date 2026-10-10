/**
 * Copy for the SHIFT Instagram comment flow.
 *
 * An open round (applications still accepted in Bangkok) gets the apply link.
 * When nothing is open, the message says so and does not include an apply
 * link, so a running or finished round is never offered as if people can
 * still sign up. A new round is a data change in `lib/content/shift-cohort.ts`.
 */

import {
  SHIFT_COHORTS,
  bangkokToday,
  cohortStatus,
  formatThaiDate,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

const APPLY_ORIGIN = "https://passionseed.org";

export const SHIFT_COMMENT_DM_UTM = "ig-comment-dm";
export const SHIFT_COMMENT_PUBLIC_UTM = "ig-comment-public";

/**
 * The cohort a SHIFT comment should be sent to, or undefined when no round
 * is accepting applications. `cohorts` is injectable so a later round can be
 * tested without editing the live list.
 */
export function openShiftCommentCohort(
  today: string = bangkokToday(),
  cohorts: readonly ShiftCohort[] = SHIFT_COHORTS
): ShiftCohort | undefined {
  return cohorts.find((cohort) => cohortStatus(cohort, today) === "open");
}

/** Absolute apply URL with a channel utm, preserving the cohort's round. */
export function shiftApplyUrl(cohort: ShiftCohort, utmSource: string): string {
  const url = new URL(cohort.applyUrl, APPLY_ORIGIN);
  url.searchParams.set("utm_source", utmSource);
  return url.toString();
}

function deadlineLine(cohort: ShiftCohort): string {
  return `กรอก 2 นาที ปิดรับ ${formatThaiDate(cohort.applyDeadline)} รับแค่ ${cohort.seats} คน`;
}

/** Private reply (DM) for an open round. Callers must pass that open cohort. */
export function buildShiftCommentDm(cohort: ShiftCohort): string {
  return [
    `ส่งลิงก์สมัคร ${cohort.name} ให้แล้วน้า 🌱`,
    shiftApplyUrl(cohort, SHIFT_COMMENT_DM_UTM),
    deadlineLine(cohort),
    "สงสัยอะไรพิมพ์ถามในนี้ได้เลย",
  ].join("\n");
}

/**
 * Public reply under the comment for an open round. Same facts as the DM,
 * with the commenter tagged and a different utm.
 */
export function buildShiftPublicCommentReply(username: string | null | undefined, cohort: ShiftCohort): string {
  const mention = username ? `@${username} ` : "";
  return [
    `${mention}ส่งลิงก์สมัคร ${cohort.name} ให้แล้วน้า 🌱`,
    shiftApplyUrl(cohort, SHIFT_COMMENT_PUBLIC_UTM),
    deadlineLine(cohort),
    "สงสัยอะไรพิมพ์ถามในนี้ได้เลย",
  ].join("\n");
}

function runningCohort(today: string, cohorts: readonly ShiftCohort[]): ShiftCohort | undefined {
  return cohorts.find((cohort) => cohortStatus(cohort, today) === "running");
}

/** No apply link. A running round is named so the note is specific. */
export function closedShiftCommentLines(
  today: string = bangkokToday(),
  cohorts: readonly ShiftCohort[] = SHIFT_COHORTS
): string[] {
  const running = runningCohort(today, cohorts);
  if (running) {
    return [
      `${running.name} ปิดรับสมัครไปแล้วน้า 🌱`,
      "รุ่นนี้เริ่มไปแล้ว สงสัยอะไรพิมพ์ถามในนี้ได้เลย",
    ];
  }
  return ["ปิดรับสมัครไปแล้วน้า 🌱", "สงสัยอะไรพิมพ์ถามในนี้ได้เลย"];
}

/** What a SHIFT comment DM should say on `today`. */
export function shiftCommentDm(
  today: string = bangkokToday(),
  cohorts: readonly ShiftCohort[] = SHIFT_COHORTS
): string {
  const open = openShiftCommentCohort(today, cohorts);
  if (!open) return closedShiftCommentLines(today, cohorts).join("\n");
  return buildShiftCommentDm(open);
}

/** What a SHIFT public reply should say on `today`. */
export function shiftCommentPublicReply(
  username?: string | null,
  today: string = bangkokToday(),
  cohorts: readonly ShiftCohort[] = SHIFT_COHORTS
): string {
  const open = openShiftCommentCohort(today, cohorts);
  if (!open) {
    const [lead, ...rest] = closedShiftCommentLines(today, cohorts);
    const mention = username ? `@${username} ` : "";
    return [`${mention}${lead}`, ...rest].join("\n");
  }
  return buildShiftPublicCommentReply(username, open);
}
