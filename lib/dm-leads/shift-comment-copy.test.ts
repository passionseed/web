import {
  SHIFT_COHORT,
  SHIFT_COHORT_0,
  SHIFT_COHORT_2,
  SHIFT_COHORT_3,
  bangkokToday,
  cohortStatus,
  formatThaiDate,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";
import {
  buildShiftCommentDm,
  closedShiftCommentLines,
  openShiftCommentCohort,
  shiftApplyUrl,
  shiftCommentDm,
  shiftCommentPublicReply,
} from "@/lib/dm-leads/shift-comment-copy";

function expectApplyMessage(message: string, cohort: ShiftCohort, utmSource: string) {
  expect(message).toContain(`ส่งลิงก์สมัคร ${cohort.name}`);
  expect(message).toContain(`round=${cohort.round}&utm_source=${utmSource}`);
  expect(message).toContain(
    `ปิดรับ ${formatThaiDate(cohort.applyDeadline)} รับแค่ ${cohort.seats} คน`
  );
  expect(message).not.toMatch(/[—–]/);
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
    [`${SHIFT_COHORT_2.name} ปิดรับสมัครไปแล้วน้า 🌱`, "รุ่นนี้เริ่มไปแล้ว สงสัยอะไรพิมพ์ถามในนี้ได้เลย"].join(
      "\n"
    )
  );
  expect(dm).not.toContain("/shift/apply");
  expect(dm).not.toContain("utm_source");
  expect(dm).not.toContain("ส่งลิงก์สมัคร");
  expect(dm).not.toContain("กรอก 2 นาที");
  expect(dm).not.toMatch(/[—–]/);

  const pub = shiftCommentPublicReply("mind.m5", today, cohorts);
  expect(pub.startsWith(`@mind.m5 ${SHIFT_COHORT_2.name} ปิดรับสมัครไปแล้วน้า`)).toBe(true);
  expect(pub).not.toContain("/shift/apply");
  expect(pub).not.toContain("ส่งลิงก์สมัคร");
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
      expect(dm).toContain("ปิดรับ ส. 7 พ.ย. รับแค่ 30 คน");
      expect(dm).not.toContain(SHIFT_COHORT_2.name);
      expect(dm).not.toMatch(/[?&]round=2(?:&|$)/);

      const pub = shiftCommentPublicReply("mind.m5", today);
      expect(pub.startsWith("@mind.m5 ")).toBe(true);
      expectApplyMessage(pub, SHIFT_COHORT_3, "ig-comment-public");
    }
  );

  it("after the SHIFT[3] deadline the live list sends no apply link", () => {
    const beforeStart = addDays(SHIFT_COHORT_3.applyDeadline, 1);
    expect(cohortStatus(SHIFT_COHORT_3, beforeStart)).toBe("closed");
    expect(openShiftCommentCohort(beforeStart)).toBeUndefined();
    expect(shiftCommentDm(beforeStart)).toBe(closedShiftCommentLines(beforeStart).join("\n"));
    expect(shiftCommentDm(beforeStart)).not.toContain("/shift/apply");

    const running = SHIFT_COHORT_3.startDate;
    expect(shiftCommentDm(running)).toBe(
      [`${SHIFT_COHORT_3.name} ปิดรับสมัครไปแล้วน้า 🌱`, "รุ่นนี้เริ่มไปแล้ว สงสัยอะไรพิมพ์ถามในนี้ได้เลย"].join("\n")
    );
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
      `ปิดรับ ${formatThaiDate(SHIFT_COHORT_2.applyDeadline)} รับแค่ ${SHIFT_COHORT_2.seats} คน`
    );
  });
});
