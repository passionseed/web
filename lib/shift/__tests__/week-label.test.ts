import { getShiftWeekLabel } from "../week-label";

// SHIFT_COHORT.startDate is "2026-10-05"; weeks flip at midnight Asia/Bangkok.
describe("getShiftWeekLabel", () => {
  it("returns Week 1 before the cohort starts", () => {
    expect(getShiftWeekLabel(new Date("2026-09-28T12:00:00+07:00"))).toBe("Week 1");
  });

  it("returns Week 1 on the cohort start date", () => {
    expect(getShiftWeekLabel(new Date("2026-10-05T09:00:00+07:00"))).toBe("Week 1");
  });

  it("returns Week 1 one second before the week 2 boundary (midnight Bangkok)", () => {
    expect(getShiftWeekLabel(new Date("2026-10-11T23:59:59+07:00"))).toBe("Week 1");
  });

  it("returns Week 2 exactly at midnight Bangkok on the boundary day", () => {
    expect(getShiftWeekLabel(new Date("2026-10-12T00:00:00+07:00"))).toBe("Week 2");
  });

  it("counts later weeks", () => {
    expect(getShiftWeekLabel(new Date("2026-10-26T10:00:00+07:00"))).toBe("Week 4");
  });

  it("returns Week 1 for an invalid date", () => {
    expect(getShiftWeekLabel(new Date("not-a-date"))).toBe("Week 1");
  });
});
