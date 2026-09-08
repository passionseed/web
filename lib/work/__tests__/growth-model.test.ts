import {
  COST_DRIVERS,
  MARKETING_LANES,
  MODEL_OPTIONS,
  NORTH_STAR,
  REGULATION_LADDER,
  TWO_KEY_RULES,
  breakEvenConversionRate,
  projectCampCapacity,
  projectMentorLoop,
  seatsNeededForRevenue,
} from "../growth-model";

describe("regulation ladder", () => {
  it("marks exactly one entry point and one target rung", () => {
    expect(REGULATION_LADDER.filter((rung) => rung.entryPoint)).toHaveLength(1);
    expect(REGULATION_LADDER.filter((rung) => rung.target)).toHaveLength(1);
  });

  it("puts the target above the entry point", () => {
    const entry = REGULATION_LADDER.findIndex((rung) => rung.entryPoint);
    const target = REGULATION_LADDER.findIndex((rung) => rung.target);

    expect(target).toBeGreaterThan(entry);
  });
});

describe("camp capacity", () => {
  it("shows the ceiling of a mentor-bound camp business", () => {
    const capacity = projectCampCapacity({
      seats: 20,
      pricePerSeat: 2000,
      cohortsPerYear: 12,
      mentorCostShare: 0.45,
    });

    expect(capacity.seatsPerYear).toBe(240);
    expect(capacity.revenue).toBe(480_000);
    expect(capacity.contribution).toBe(264_000);
  });

  it("counts the seats a revenue target would demand", () => {
    expect(seatsNeededForRevenue(10_000_000, 2000)).toBe(5000);
  });
});

describe("mentor loop", () => {
  it("sustains itself at one over the mentee load", () => {
    const rate = breakEvenConversionRate(6);
    const loop = projectMentorLoop(rate, 6);

    expect(rate).toBeCloseTo(0.1667, 4);
    expect(loop.growthFactor).toBeCloseTo(1, 5);
    expect(loop.verdict).toBe("flat");
  });

  it("doubles a cohort at twice the break-even rate", () => {
    expect(projectMentorLoop(0.33, 6).verdict).toBe("growing");
    expect(projectMentorLoop(0.33, 6).growthFactor).toBeCloseTo(1.98, 2);
  });

  it("shrinks below break-even, which means mentors must be bought", () => {
    expect(projectMentorLoop(0.1, 6).verdict).toBe("shrinking");
  });
});

describe("model doctrine", () => {
  it("rejects the model whose cost per outcome never falls", () => {
    const consulting = MODEL_OPTIONS.find((option) => option.id === "consulting");
    const consultingDriver = COST_DRIVERS.find((driver) => driver.id === "consulting");

    expect(consulting?.verdict).toBe("rejected");
    expect(consultingDriver?.falls).toBe(false);
  });

  it("keeps at least one falling cost driver behind every core model", () => {
    expect(COST_DRIVERS.filter((driver) => driver.falls).length).toBeGreaterThanOrEqual(3);
    expect(MODEL_OPTIONS.filter((option) => option.verdict === "core")).toHaveLength(3);
  });

  it("makes the student the one who decides and the parent the one who pays", () => {
    const student = TWO_KEY_RULES.filter((rule) => rule.actor === "student");
    const lanes = MARKETING_LANES.map((lane) => lane.id);

    expect(student).toHaveLength(1);
    expect(lanes).toEqual(["student", "parent"]);
    expect(TWO_KEY_RULES.some((rule) => rule.id === "refusal")).toBe(true);
  });

  it("sets a north star floor below its compounding threshold", () => {
    expect(NORTH_STAR.floor).toBeLessThan(NORTH_STAR.compounding);
  });
});
