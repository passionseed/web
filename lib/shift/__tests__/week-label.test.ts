import { getShiftWeekLabel } from "../week-label";

// SHIFT_COHORT.startDate is "2026-09-28"
describe("getShiftWeekLabel", () => {
  it("returns Week 1 before the cohort starts", () => {
    expect(getShiftWeekLabel(new Date("2026-09-21T12:00:00"))).toBe("Week 1");
  });

  it("returns Week 1 on the cohort start date", () => {
    expect(getShiftWeekLabel(new Date("2026-09-28T09:00:00"))).toBe("Week 1");
  });

  it("returns Week 1 six days in", () => {
    expect(getShiftWeekLabel(new Date("2026-10-04T23:59:59"))).toBe("Week 1");
  });

  it("returns Week 2 on the exact 7-day boundary", () => {
    expect(getShiftWeekLabel(new Date("2026-10-05T00:00:00"))).toBe("Week 2");
  });

  it("counts later weeks", () => {
    expect(getShiftWeekLabel(new Date("2026-10-19T10:00:00"))).toBe("Week 4");
  });
});
