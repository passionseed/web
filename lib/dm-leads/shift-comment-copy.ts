/**
 * Copy for the SHIFT Instagram comment flow.
 *
 * An open round (applications still accepted in Bangkok) gets the apply link.
 * When nothing is open, the message says so and does not include an apply
 * link, so a running or finished round is never offered as if people can
 * still sign up; it links the /shift/next pre-order instead. A new round is
 * a data change in `lib/content/shift-cohort.ts`.
 */

import {
  SHIFT_COHORTS,
  bangkokToday,
  cohortStatus,
  formatThaiDate,
  formatThaiDateRange,
  pairPriceBaht,
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

const baht = (amount: number) => `฿${amount.toLocaleString("en-US")}`;

/** "19:00 ถึง 21:00" from "19:00–21:00": the range dash can't go in the copy. */
function sessionHours(cohort: ShiftCohort): string {
  return cohort.sessionTime
    .split(/[–-]/)
    .map((part) => part.trim())
    .join(" ถึง ");
}

/** Price, and the pair price when two friends apply together. */
function priceLine(cohort: ShiftCohort): string {
  const pair = pairPriceBaht(cohort);
  if (pair === null) return "ฟรี";
  return `${baht(cohort.priceBaht)} ต่อคน สมัครพร้อมเพื่อนอีก 1 คน เหลือคนละ ${baht(pair)}`;
}

/**
 * Private reply (DM) for an open round: the full offer. In SHIFT[2], comment
 * DMs sold seats only once the dates, price and a tracked link reached the
 * commenter, and Instagram allows one private reply per comment, so the first
 * DM has to carry all of it. "เราพาทำ" says we guide the work, not that every
 * student finishes. Callers must pass that open cohort.
 */
export function buildShiftCommentDm(cohort: ShiftCohort): string {
  return [
    `ส่งรายละเอียด ${cohort.name} ให้แล้วนะ 🌱`,
    "7 วัน เราพาทำโปรเจกต์และทดสอบกับคนจริง ไว้เล่าในพอร์ต TCAS 1",
    `${formatThaiDateRange(cohort.startDate, cohort.endDate)} ออนไลน์ ${sessionHours(cohort)}`,
    priceLine(cohort),
    `รับ ${cohort.seats} ที่นั่ง ปิดรับ ${formatThaiDate(cohort.applyDeadline)}`,
    `สมัคร 2 นาที: ${shiftApplyUrl(cohort, SHIFT_COMMENT_DM_UTM)}`,
    "อายุต่ำกว่า 20 ปี ผู้ปกครองต้องกดยินยอมผ่านลิงก์ในอีเมลก่อนยืนยันที่นั่ง",
    "สงสัยอะไร พิมพ์ถามในนี้ได้เลย",
  ].join("\n");
}

/**
 * Public reply under the comment for an open round. It goes out whether or
 * not the DM was delivered (about half of commenters block DMs), so it
 * never says a DM was sent. It carries the dates, price and deadline, with
 * the commenter tagged and a different utm. Links in comments usually can't
 * be tapped, so it also points to the profile link, which has to be this
 * round's apply link.
 */
export function buildShiftPublicCommentReply(username: string | null | undefined, cohort: ShiftCohort): string {
  const mention = username ? `@${username} ` : "";
  return [
    `${mention}รายละเอียดและลิงก์สมัคร ${cohort.name} อยู่ที่ลิงก์ในไบโอนะ 🌱 สงสัยอะไร ทัก DM มาได้เลย`,
    shiftApplyUrl(cohort, SHIFT_COMMENT_PUBLIC_UTM),
    `${formatThaiDateRange(cohort.startDate, cohort.endDate)} ค่าสมัคร ${baht(cohort.priceBaht)} ปิดรับ ${formatThaiDate(cohort.applyDeadline)}`,
  ].join("\n");
}

function runningCohort(today: string, cohorts: readonly ShiftCohort[]): ShiftCohort | undefined {
  return cohorts.find((cohort) => cohortStatus(cohort, today) === "running");
}

/** /shift/next with a channel utm: the pre-order for the round after the newest one. */
export function shiftNextUrl(utmSource: string): string {
  const url = new URL("/shift/next", APPLY_ORIGIN);
  url.searchParams.set("utm_source", utmSource);
  return url.toString();
}

/** Same rule as NEXT_ROUND in lib/content/shift-next.ts, over the cohorts passed in. */
function nextRoundName(cohorts: readonly ShiftCohort[]): string {
  return `SHIFT[${cohorts.reduce((max, cohort) => Math.max(max, cohort.round), 0) + 1}]`;
}

/**
 * No apply link: nothing is open. It points to /shift/next instead, so a
 * comment after the deadline still leaves the person a next step rather than
 * a dead end. A running round is named so the note is specific.
 */
export function closedShiftCommentLines(
  today: string = bangkokToday(),
  cohorts: readonly ShiftCohort[] = SHIFT_COHORTS,
  utmSource: string = SHIFT_COMMENT_DM_UTM
): string[] {
  const running = runningCohort(today, cohorts);
  const closed = cohorts.find((cohort) => cohortStatus(cohort, today) === "closed");
  const lead = running
    ? `${running.name} ปิดรับสมัครแล้ว ตอนนี้กำลังทำโปรเจกต์กันอยู่นะ 🌱`
    : closed
      ? `${closed.name} ปิดรับสมัครแล้วนะ 🌱`
      : "ปิดรับสมัครแล้วนะ 🌱";
  return [
    lead,
    // "ยังไม่ต้องจ่าย": signing up on /shift/next is free, the round is not.
    `รอบถัดไป ${nextRoundName(cohorts)} ยังไม่กำหนดวัน บอกช่วงที่ว่างไว้ก่อนได้ ยังไม่ต้องจ่าย: ${shiftNextUrl(utmSource)}`,
    "สงสัยอะไร พิมพ์ถามในนี้ได้เลย",
  ];
}

/** What a SHIFT comment DM should say on `today`. */
export function shiftCommentDm(
  today: string = bangkokToday(),
  cohorts: readonly ShiftCohort[] = SHIFT_COHORTS
): string {
  const open = openShiftCommentCohort(today, cohorts);
  if (!open) return closedShiftCommentLines(today, cohorts, SHIFT_COMMENT_DM_UTM).join("\n");
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
    const [lead, ...rest] = closedShiftCommentLines(today, cohorts, SHIFT_COMMENT_PUBLIC_UTM);
    const mention = username ? `@${username} ` : "";
    return [`${mention}${lead}`, ...rest].join("\n");
  }
  return buildShiftPublicCommentReply(username, open);
}
