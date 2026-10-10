import {
  SHIFT_COHORT,
  SHIFT_COHORT_2,
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

describe("SHIFT comment copy", () => {
  it.each(["2026-10-10", "2026-10-11", "2026-10-12"])(
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

  it("on 13 Oct names the running round and does not send an apply link", () => {
    const today = "2026-10-13";
    expect(cohortStatus(SHIFT_COHORT_2, today)).toBe("running");
    expect(openShiftCommentCohort(today)).toBeUndefined();

    const dm = shiftCommentDm(today);
    expect(dm).toBe(closedShiftCommentLines(today).join("\n"));
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

    const pub = shiftCommentPublicReply("mind.m5", today);
    expect(pub.startsWith(`@mind.m5 ${SHIFT_COHORT_2.name} ปิดรับสมัครไปแล้วน้า`)).toBe(true);
    expect(pub).not.toContain("/shift/apply");
    expect(pub).not.toContain("ส่งลิงก์สมัคร");
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
