import {
  SHIFT_COHORT,
  SHIFT_COHORTS,
  cohortDayCount,
  cohortPath,
  cohortStatus,
  getShiftCohort,
  pairPriceBaht,
  priceLabel,
  formatThaiDate,
  formatThaiDateRange,
  teamSizeLabel,
  getEffectiveCohort,
  getOpenCohorts,
  getAvailableCohorts,
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

  it("labels a free round as free", () => {
    expect(priceLabel(getShiftCohort(0)!)).toBe("ฟรี");
    expect(priceLabel(SHIFT_COHORT)).toBe("฿670");
  });

  it("takes 100 off each person in a pair, and never on a free round", () => {
    expect(pairPriceBaht(SHIFT_COHORT)).toBe(570);
    expect(pairPriceBaht(getShiftCohort(2)!)).toBe(890);
    expect(pairPriceBaht(getShiftCohort(0)!)).toBeNull();
  });

  it("prices below its anchor", () => {
    expect(SHIFT_COHORT.priceBaht).toBeGreaterThan(0);
    expect(SHIFT_COHORT.anchorPriceBaht!).toBeGreaterThan(SHIFT_COHORT.priceBaht);
  });

  it("takes solo builders and teams up to three", () => {
    expect(SHIFT_COHORT.teamSize).toEqual({ min: 1, max: 3 });
    expect(teamSizeLabel()).toBe("1-3 คน");
  });

  it("formats Thai dates without a year", () => {
    expect(formatThaiDate("2026-09-28")).toBe("จ. 28 ก.ย.");
    expect(formatThaiDate("2026-10-04", false)).toBe("4 ต.ค.");
    expect(formatThaiDateRange("2026-09-28", "2026-10-04")).toBe("จ. 28 ก.ย. ถึง อา. 4 ต.ค.");
  });

  it("gives every round a unique number, path and apply link", () => {
    const rounds = SHIFT_COHORTS.map((c) => c.round);
    expect(new Set(rounds).size).toBe(rounds.length);
    for (const cohort of SHIFT_COHORTS) {
      expect(getShiftCohort(cohort.round)).toBe(cohort);
      expect(cohortPath(cohort)).toBe(`/shift/${cohort.round}`);
      expect(cohort.applyUrl).toBe(`/shift/apply?round=${cohort.round}`);
      expect(cohort.name).toBe(`SHIFT[${cohort.round}]`);
      expect(cohort.teamSize.min).toBeGreaterThanOrEqual(1);
      expect(cohort.teamSize.max).toBeGreaterThanOrEqual(cohort.teamSize.min);
      expect(cohort.applyDeadline < cohort.startDate).toBe(true);
    }
    expect(getShiftCohort(99)).toBeUndefined();
    expect(getShiftCohort(0)?.name).toBe("SHIFT[0]");
  });

  it("moves a round from open to done on Bangkok dates", () => {
    // SHIFT[1]: apply by 3 Oct, runs 5-11 Oct.
    expect(cohortStatus(SHIFT_COHORT, "2026-10-03")).toBe("open");
    expect(cohortStatus(SHIFT_COHORT, "2026-10-04")).toBe("closed");
    expect(cohortStatus(SHIFT_COHORT, "2026-10-05")).toBe("running");
    expect(cohortStatus(SHIFT_COHORT, "2026-10-11")).toBe("running");
    expect(cohortStatus(SHIFT_COHORT, "2026-10-12")).toBe("done");
    // A round marked completed is done whatever the calendar says.
    expect(cohortStatus(getShiftCohort(0)!, "2026-09-01")).toBe("done");
  });

  it("resolves the effective cohort fallback gracefully", () => {
    // When an explicit round is given, returns that cohort
    expect(getEffectiveCohort(2).round).toBe(2);
    expect(getEffectiveCohort("2").round).toBe(2);
    expect(getEffectiveCohort(1).round).toBe(1);

    // When round is invalid or omitted, returns an effective cohort (never undefined)
    const effective = getEffectiveCohort();
    expect(effective).toBeDefined();
    expect([1, 2]).toContain(effective.round);

    const effectiveInvalid = getEffectiveCohort("invalid");
    expect(effectiveInvalid).toBeDefined();
  });

  it("filters available and open cohorts", () => {
    const available = getAvailableCohorts();
    expect(available.every((c) => !c.completed)).toBe(true);

    const open = getOpenCohorts();
    expect(Array.isArray(open)).toBe(true);
  });
});
