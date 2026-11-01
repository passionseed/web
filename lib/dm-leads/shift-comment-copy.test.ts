import {
  SHIFT_COHORT,
  SHIFT_COHORT_0,
  SHIFT_COHORT_2,
  SHIFT_COHORT_3,
  SHIFT_COHORTS,
  bangkokToday,
  cohortStatus,
  formatThaiDate,
  formatThaiDateRange,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import {
  buildShiftCommentDm,
  buildShiftPublicCommentReply,
  closedShiftCommentLines,
  openShiftCommentCohort,
  shiftApplyUrl,
  shiftCommentDm,
  shiftCommentPublicReply,
} from "@/lib/dm-leads/shift-comment-copy";
import { NEXT_ROUND_NAME } from "@/lib/content/shift-next";
import { INSTAGRAM_MESSAGE_MAX_BYTES, utf8Bytes } from "@/lib/meta/message-limits";

/** The full offer: round, tracked link, dates, price and deadline, in a
 *  message Instagram will accept. */
function expectApplyMessage(message: string, cohort: ShiftCohort, utmSource: string) {
  expect(message).toContain(cohort.name);
  expect(message).toContain(`round=${cohort.round}&utm_source=${utmSource}`);
  expect(message).toContain(formatThaiDateRange(cohort.startDate, cohort.endDate));
  expect(message).toContain(`฿${cohort.priceBaht.toLocaleString("en-US")}`);
  expect(message).toContain(`ปิดรับ ${formatThaiDate(cohort.applyDeadline)}`);
  expect(message).not.toMatch(/[—–]/);
  expect(utf8Bytes(message)).toBeLessThanOrEqual(INSTAGRAM_MESSAGE_MAX_BYTES);
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Days the live cohort record still accepts applications, including the deadline. */
function openCommentDays(cohort: ShiftCohort): string[] {
  return [addDays(cohort.applyDeadline, -1), cohort.applyDeadline];
}

/** The rounds as they stood before SHIFT[3] was announced, so the
 *  closed-while-running note can be checked against SHIFT[2] alone. */
const BEFORE_SHIFT_3: readonly ShiftCohort[] = [SHIFT_COHORT_0, SHIFT_COHORT, SHIFT_COHORT_2];

function expectClosedRunningNote(today: string, cohorts: readonly ShiftCohort[] = BEFORE_SHIFT_3) {
  expect(today > SHIFT_COHORT_2.applyDeadline).toBe(true);
  expect(today >= SHIFT_COHORT_2.startDate).toBe(true);
  expect(today <= SHIFT_COHORT_2.endDate).toBe(true);
  expect(cohortStatus(SHIFT_COHORT_2, today)).toBe("running");
  expect(openShiftCommentCohort(today, cohorts)).toBeUndefined();

  const dm = shiftCommentDm(today, cohorts);
  expect(dm).toBe(closedShiftCommentLines(today, cohorts).join("\n"));
  expect(dm).toBe(
    [
      `${SHIFT_COHORT_2.name} ปิดรับสมัครแล้ว ตอนนี้กำลังทำโปรเจกต์กันอยู่นะ 🌱`,
      "รอบถัดไป SHIFT[3] ยังไม่กำหนดวัน บอกช่วงที่ว่างไว้ก่อนได้ ยังไม่ต้องจ่าย: https://passionseed.org/shift/next?utm_source=ig-comment-dm",
      "สงสัยอะไร พิมพ์ถามในนี้ได้เลย",
    ].join("\n")
  );
  expect(dm).not.toContain("/shift/apply");
  expect(utf8Bytes(dm)).toBeLessThanOrEqual(INSTAGRAM_MESSAGE_MAX_BYTES);
  expect(dm).not.toContain("ส่งรายละเอียด");
  expect(dm).not.toContain("สมัคร 2 นาที");
  expect(dm).not.toContain("ต่อคน");
  expect(dm).not.toMatch(/[—–]/);

  const pub = shiftCommentPublicReply("mind.m5", today, cohorts);
  expect(pub.startsWith(`@mind.m5 ${SHIFT_COHORT_2.name} ปิดรับสมัครแล้ว`)).toBe(true);
  expect(pub).not.toContain("/shift/apply");
  expect(pub).toContain("https://passionseed.org/shift/next?utm_source=ig-comment-public");
  expect(pub).not.toContain("อยู่ในโปรไฟล์");
}

describe("SHIFT comment copy", () => {
  it.each(openCommentDays(SHIFT_COHORT_2))(
    "offers SHIFT[2] on %s, while applications are open",
    (today) => {
      expect(cohortStatus(SHIFT_COHORT_2, today)).toBe("open");
      expect(openShiftCommentCohort(today)).toBe(SHIFT_COHORT_2);

      const dm = shiftCommentDm(today);
      expectApplyMessage(dm, SHIFT_COHORT_2, "ig-comment-dm");
      expect(dm).not.toMatch(/SHIFT\[1\]|[?&]round=1(?:&|$)|฿670/);

      const pub = shiftCommentPublicReply("mind.m5", today);
      expect(pub.startsWith("@mind.m5 ")).toBe(true);
      expectApplyMessage(pub, SHIFT_COHORT_2, "ig-comment-public");
    }
  );

  it("the day after the apply deadline names the running round and sends no apply link", () => {
    expectClosedRunningNote(addDays(SHIFT_COHORT_2.applyDeadline, 1));
  });

  it("with no later round open, 19 Oct 2026 gets the closed note and no apply link", () => {
    const today = "2026-10-19";
    expect(bangkokToday(new Date(`${today}T00:30:00+07:00`))).toBe(today);
    expect(bangkokToday(new Date(`${today}T23:30:00+07:00`))).toBe(today);
    expectClosedRunningNote(today);
    const noon = bangkokToday(new Date(`${today}T12:00:00+07:00`));
    expect(shiftCommentDm(noon, BEFORE_SHIFT_3)).not.toContain("/shift/apply");
    expect(shiftCommentPublicReply("mind.m5", noon, BEFORE_SHIFT_3)).not.toContain("/shift/apply");
  });

  it.each(["2026-10-19", "2026-10-23", SHIFT_COHORT_3.applyDeadline])(
    "on %s, with SHIFT[2] running or done, the live list sends the SHIFT[3] apply link",
    (today) => {
      expect(cohortStatus(SHIFT_COHORT_2, today)).not.toBe("open");
      expect(cohortStatus(SHIFT_COHORT_3, today)).toBe("open");
      expect(openShiftCommentCohort(today)).toBe(SHIFT_COHORT_3);

      const dm = shiftCommentDm(today);
      expectApplyMessage(dm, SHIFT_COHORT_3, "ig-comment-dm");
      expect(dm).toContain("จ. 9 พ.ย. ถึง อา. 15 พ.ย. ออนไลน์ 19:00 ถึง 21:00");
      expect(dm).toContain("฿690 ต่อคน สมัครพร้อมเพื่อนอีก 1 คน เหลือคนละ ฿590");
      expect(dm).toContain("รับ 30 ที่นั่ง ปิดรับ ส. 7 พ.ย.");
      expect(dm).not.toContain(SHIFT_COHORT_2.name);
      expect(dm).not.toMatch(/[?&]round=2(?:&|$)/);

      const pub = shiftCommentPublicReply("mind.m5", today);
      expect(pub.startsWith("@mind.m5 ")).toBe(true);
      expectApplyMessage(pub, SHIFT_COHORT_3, "ig-comment-public");
      // It goes out even when the DM was refused, so it never claims one was sent.
      expect(pub).not.toContain("แล้ว");
    }
  );

  it("after the SHIFT[3] deadline the live list sends no apply link", () => {
    const beforeStart = addDays(SHIFT_COHORT_3.applyDeadline, 1);
    expect(cohortStatus(SHIFT_COHORT_3, beforeStart)).toBe("closed");
    expect(openShiftCommentCohort(beforeStart)).toBeUndefined();
    expect(shiftCommentDm(beforeStart)).toBe(closedShiftCommentLines(beforeStart).join("\n"));
    expect(shiftCommentDm(beforeStart)).not.toContain("/shift/apply");

    // Between the deadline and Day 1 the closed round is named, and the note
    // points to the pre-order for the round after SHIFT[3].
    expect(shiftCommentDm(beforeStart)).toBe(
      [
        `${SHIFT_COHORT_3.name} ปิดรับสมัครแล้วนะ 🌱`,
        `รอบถัดไป ${NEXT_ROUND_NAME} ยังไม่กำหนดวัน บอกช่วงที่ว่างไว้ก่อนได้ ยังไม่ต้องจ่าย: https://passionseed.org/shift/next?utm_source=ig-comment-dm`,
        "สงสัยอะไร พิมพ์ถามในนี้ได้เลย",
      ].join("\n")
    );

    const running = SHIFT_COHORT_3.startDate;
    expect(shiftCommentDm(running)).toBe(
      [
        `${SHIFT_COHORT_3.name} ปิดรับสมัครแล้ว ตอนนี้กำลังทำโปรเจกต์กันอยู่นะ 🌱`,
        `รอบถัดไป ${NEXT_ROUND_NAME} ยังไม่กำหนดวัน บอกช่วงที่ว่างไว้ก่อนได้ ยังไม่ต้องจ่าย: https://passionseed.org/shift/next?utm_source=ig-comment-dm`,
        "สงสัยอะไร พิมพ์ถามในนี้ได้เลย",
      ].join("\n")
    );
    expect(shiftCommentPublicReply("mind.m5", running)).toContain("/shift/next?utm_source=ig-comment-public");
  });

  it("after SHIFT[3] ends, names no round and still points to /shift/next", () => {
    const done = addDays(SHIFT_COHORT_3.endDate, 1);
    expect(cohortStatus(SHIFT_COHORT_3, done)).toBe("done");
    expect(shiftCommentDm(done)).toBe(
      [
        "ปิดรับสมัครแล้วนะ 🌱",
        `รอบถัดไป ${NEXT_ROUND_NAME} ยังไม่กำหนดวัน บอกช่วงที่ว่างไว้ก่อนได้ ยังไม่ต้องจ่าย: https://passionseed.org/shift/next?utm_source=ig-comment-dm`,
        "สงสัยอะไร พิมพ์ถามในนี้ได้เลย",
      ].join("\n")
    );
    const pub = shiftCommentPublicReply("mind.m5", addDays(SHIFT_COHORT_3.applyDeadline, 1));
    expect(pub.startsWith(`@mind.m5 ${SHIFT_COHORT_3.name} ปิดรับสมัครแล้วนะ`)).toBe(true);
    expect(pub).toContain("/shift/next?utm_source=ig-comment-public");
    expect(utf8Bytes(pub)).toBeLessThanOrEqual(INSTAGRAM_MESSAGE_MAX_BYTES);
  });

  it("describes an earlier open round from that round's own fields", () => {
    const today = "2026-10-02";
    const cohort = openShiftCommentCohort(today);
    expect(cohort).toBe(SHIFT_COHORT);
    expectApplyMessage(shiftCommentDm(today), SHIFT_COHORT, "ig-comment-dm");
  });

  it("follows a later open round instead of a round that is already running", () => {
    const next: ShiftCohort = {
      ...SHIFT_COHORT_2,
      round: 3,
      name: "SHIFT[3]",
      seats: 18,
      priceBaht: SHIFT_COHORT_2.priceBaht,
      applyDeadline: "2026-10-17",
      startDate: "2026-10-19",
      endDate: "2026-10-25",
      applyUrl: "/shift/apply?round=3",
    };
    const today = "2026-10-16";
    const cohorts = [SHIFT_COHORT_2, next];
    expect(cohortStatus(SHIFT_COHORT_2, today)).toBe("running");
    expect(openShiftCommentCohort(today, cohorts)).toBe(next);

    const dm = shiftCommentDm(today, cohorts);
    expectApplyMessage(dm, next, "ig-comment-dm");
    expect(dm).not.toContain(SHIFT_COHORT_2.name);
    expect(dm).not.toContain(`round=${SHIFT_COHORT_2.round}`);
  });

  it("keeps an existing round query when adding the channel utm", () => {
    expect(shiftApplyUrl(SHIFT_COHORT_2, "ig-comment-dm")).toBe(
      `https://passionseed.org/shift/apply?round=${SHIFT_COHORT_2.round}&utm_source=ig-comment-dm`
    );
  });

  it("builds the open-round DM from the cohort record", () => {
    expect(buildShiftCommentDm(SHIFT_COHORT_2)).toContain(
      `รับ ${SHIFT_COHORT_2.seats} ที่นั่ง ปิดรับ ${formatThaiDate(SHIFT_COHORT_2.applyDeadline)}`
    );
  });

  it.each(SHIFT_COHORTS.map((cohort) => [cohort.name, cohort] as const))(
    "%s: the DM and public reply fit Instagram's 1000-byte limit",
    (_name, cohort) => {
      expect(utf8Bytes(buildShiftCommentDm(cohort))).toBeLessThanOrEqual(INSTAGRAM_MESSAGE_MAX_BYTES);
      const longName = "a".repeat(30);
      expect(utf8Bytes(buildShiftPublicCommentReply(longName, cohort))).toBeLessThanOrEqual(
        INSTAGRAM_MESSAGE_MAX_BYTES
      );
    }
  );
});
