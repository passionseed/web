import {
  SHIFT_COHORT,
  cohortDayCount,
  formatThaiDate,
  formatThaiDateRange,
  squadCount,
} from "../shift-cohort";

describe("shift cohort", () => {
  it("runs a seven day sprint in date order", () => {
    expect(cohortDayCount()).toBe(7);
    expect(SHIFT_COHORT.schedule[0].date).toBe(SHIFT_COHORT.startDate);
    expect(SHIFT_COHORT.schedule.at(-1)!.date).toBe(SHIFT_COHORT.endDate);

    const dates = SHIFT_COHORT.schedule.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
    expect(SHIFT_COHORT.schedule.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("closes applications before the round starts", () => {
    expect(SHIFT_COHORT.applyDeadline < SHIFT_COHORT.startDate).toBe(true);
  });

  it("prices below its anchor", () => {
    expect(SHIFT_COHORT.priceBaht).toBeGreaterThan(0);
    expect(SHIFT_COHORT.anchorPriceBaht!).toBeGreaterThan(SHIFT_COHORT.priceBaht);
  });

  it("splits every seat into a squad", () => {
    expect(squadCount()).toBe(3);
    expect(SHIFT_COHORT.seats % SHIFT_COHORT.squadSize).toBe(0);
  });

  it("formats Thai dates without a year", () => {
    expect(formatThaiDate("2026-09-28")).toBe("จ. 28 ก.ย.");
    expect(formatThaiDate("2026-10-04", false)).toBe("4 ต.ค.");
    expect(formatThaiDateRange("2026-09-28", "2026-10-04")).toBe("จ. 28 ก.ย. ถึง อา. 4 ต.ค.");
  });
});
