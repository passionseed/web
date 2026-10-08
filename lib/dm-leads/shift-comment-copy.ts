/**
 * Copy for the SHIFT Instagram comment flow.
 *
 * The round is whichever cohort is open for applications today (Bangkok).
 * When none is open, it falls back the same way the apply form does:
 * the poster cohort, then SHIFT[1]. A new round is a data change in
 * `lib/content/shift-cohort.ts`, not a rewrite of these messages.
 */

import {
  POSTER_COHORT,
  SHIFT_COHORT,
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
 * The cohort a SHIFT comment should be sent to.
 *
 * `cohorts` and `fallback` are injectable so a later round can be tested
 * without editing the live list.
 */
export function openCohortForComments(
  cohorts: readonly ShiftCohort[] = SHIFT_COHORTS,
  today: string = bangkokToday(),
  fallback: ShiftCohort = POSTER_COHORT ?? SHIFT_COHORT
): ShiftCohort {
  return cohorts.find((cohort) => cohortStatus(cohort, today) === "open") ?? fallback;
}

export function currentShiftCommentCohort(today: string = bangkokToday()): ShiftCohort {
  return openCohortForComments(SHIFT_COHORTS, today);
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

/** Private reply (DM) for someone who commented SHIFT. */
export function buildShiftCommentDm(cohort: ShiftCohort = currentShiftCommentCohort()): string {
  return [
    `ส่งลิงก์สมัคร ${cohort.name} ให้แล้วน้า 🌱`,
    shiftApplyUrl(cohort, SHIFT_COMMENT_DM_UTM),
    deadlineLine(cohort),
    "สงสัยอะไรพิมพ์ถามในนี้ได้เลย",
  ].join("\n");
}

/**
 * Public reply under the comment. Same facts as the DM, with the commenter
 * tagged and a different utm so the two channels stay distinct.
 */
export function buildShiftPublicCommentReply(
  username?: string | null,
  cohort: ShiftCohort = currentShiftCommentCohort()
): string {
  const mention = username ? `@${username} ` : "";
  return [
    `${mention}ส่งลิงก์สมัคร ${cohort.name} ให้แล้วน้า 🌱`,
    shiftApplyUrl(cohort, SHIFT_COMMENT_PUBLIC_UTM),
    deadlineLine(cohort),
    "สงสัยอะไรพิมพ์ถามในนี้ได้เลย",
  ].join("\n");
}
