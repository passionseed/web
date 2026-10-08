import { SHIFT_COHORT, SHIFT_COHORT_2, type ShiftCohort } from "@/lib/content/shift-cohort";
import {
  buildShiftCommentDm,
  buildShiftPublicCommentReply,
  currentShiftCommentCohort,
  openCohortForComments,
  shiftApplyUrl,
} from "@/lib/dm-leads/shift-comment-copy";

describe("SHIFT comment copy", () => {
  it("points the open week of 8 Oct 2026 at SHIFT[2]", () => {
    const cohort = currentShiftCommentCohort("2026-10-08");
    expect(cohort.round).toBe(2);
    expect(cohort.name).toBe("SHIFT[2]");
    expect(cohort.priceBaht).toBe(990);
    expect(cohort.seats).toBe(21);

    const dm = buildShiftCommentDm(cohort);
    expect(dm).toBe(
      [
        "ส่งลิงก์สมัคร SHIFT[2] ให้แล้วน้า 🌱",
        "https://passionseed.org/shift/apply?round=2&utm_source=ig-comment-dm",
        "กรอก 2 นาที ปิดรับ ส. 10 ต.ค. รับแค่ 21 คน",
        "สงสัยอะไรพิมพ์ถามในนี้ได้เลย",
      ].join("\n")
    );
    expect(dm).not.toMatch(/SHIFT\[1\]|round=1|฿670|(?:^|\s)670(?:\s|$)|5–11|5-11/);
    expect(dm).not.toMatch(/[—–]/);

    const pub = buildShiftPublicCommentReply("mind.m5", cohort);
    expect(pub).toContain("@mind.m5 ส่งลิงก์สมัคร SHIFT[2]");
    expect(pub).toContain(
      "https://passionseed.org/shift/apply?round=2&utm_source=ig-comment-public"
    );
    expect(pub).toContain("ปิดรับ ส. 10 ต.ค. รับแค่ 21 คน");
    expect(pub).not.toMatch(/[—–]/);
  });

  it("still describes SHIFT[1] on a day that round was the open one", () => {
    const cohort = currentShiftCommentCohort("2026-10-02");
    expect(cohort).toBe(SHIFT_COHORT);
    expect(buildShiftCommentDm(cohort)).toContain("utm_source=ig-comment-dm");
    expect(buildShiftCommentDm(cohort)).toContain("round=1");
    expect(buildShiftCommentDm(cohort)).toContain("ปิดรับ ส. 3 ต.ค. รับแค่ 15 คน");
  });

  it("falls back to the poster cohort once applications have closed", () => {
    expect(currentShiftCommentCohort("2026-10-11").round).toBe(SHIFT_COHORT_2.round);
    expect(currentShiftCommentCohort("2026-10-20").round).toBe(SHIFT_COHORT_2.round);
  });

  it("follows a later open round instead of staying on the previous one", () => {
    const next: ShiftCohort = {
      ...SHIFT_COHORT_2,
      round: 3,
      name: "SHIFT[3]",
      seats: 18,
      priceBaht: 990,
      applyDeadline: "2026-10-17",
      startDate: "2026-10-19",
      endDate: "2026-10-25",
      applyUrl: "/shift/apply?round=3",
    };
    const picked = openCohortForComments([SHIFT_COHORT_2, next], "2026-10-16", SHIFT_COHORT);
    expect(picked.name).toBe("SHIFT[3]");

    const dm = buildShiftCommentDm(picked);
    expect(dm).toContain("ส่งลิงก์สมัคร SHIFT[3]");
    expect(dm).toContain("round=3&utm_source=ig-comment-dm");
    expect(dm).toContain("รับแค่ 18 คน");
    expect(dm).not.toContain("SHIFT[1]");
    expect(dm).not.toContain("SHIFT[2]");
    expect(dm).not.toContain("round=1");
    expect(dm).not.toContain("round=2");
  });

  it("keeps an existing round query when adding the channel utm", () => {
    expect(shiftApplyUrl(SHIFT_COHORT_2, "ig-comment-dm")).toBe(
      "https://passionseed.org/shift/apply?round=2&utm_source=ig-comment-dm"
    );
  });
});
