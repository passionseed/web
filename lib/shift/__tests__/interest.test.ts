import {
  coversWindow,
  distinctWindows,
  mergeRanges,
  pickBounds,
  shiftInterestSchema,
  windowDemand,
} from "../interest";

const TODAY = "2026-10-17";

const valid = {
  freeRanges: [{ start: "2026-11-02", end: "2026-11-12" }],
  nickname: "มิว",
  stage: "m5",
  igHandle: "@Mew.Builds",
  email: "",
  problem: "",
  committed: true,
  consent: true,
};

describe("mergeRanges", () => {
  it("joins overlapping and touching ranges, and fixes reversed ones", () => {
    expect(
      mergeRanges([
        { start: "2026-11-10", end: "2026-11-05" },
        { start: "2026-11-11", end: "2026-11-13" },
        { start: "2026-12-01", end: "2026-12-03" },
      ]),
    ).toEqual([
      { start: "2026-11-05", end: "2026-11-13" },
      { start: "2026-12-01", end: "2026-12-03" },
    ]);
  });
});

describe("coversWindow", () => {
  it("needs all 7 days inside one range", () => {
    const ranges = [{ start: "2026-11-01", end: "2026-11-07" }];
    expect(coversWindow(ranges, "2026-11-01")).toBe(true);
    expect(coversWindow(ranges, "2026-11-02")).toBe(false);
  });
});

describe("shiftInterestSchema", () => {
  const schema = shiftInterestSchema(TODAY);

  it("accepts a complete answer and cleans the IG handle", () => {
    const parsed = schema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.igHandle).toBe("mew.builds");
      expect(parsed.data.email).toBeNull();
    }
  });

  it("needs at least one 7-day run", () => {
    const parsed = schema.safeParse({
      ...valid,
      freeRanges: [{ start: "2026-11-02", end: "2026-11-07" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("counts two touching ranges as one run", () => {
    const parsed = schema.safeParse({
      ...valid,
      freeRanges: [
        { start: "2026-11-02", end: "2026-11-04" },
        { start: "2026-11-05", end: "2026-11-08" },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects days before the lead time or past the horizon", () => {
    const { start, end } = pickBounds(TODAY);
    const tooSoon = { start: "2026-10-18", end: "2026-10-30" };
    const tooLate = { start: end, end: "2027-12-01" };
    expect(start).toBe("2026-10-24");
    expect(schema.safeParse({ ...valid, freeRanges: [tooSoon] }).success).toBe(false);
    expect(schema.safeParse({ ...valid, freeRanges: [tooLate] }).success).toBe(false);
  });

  it("lets the server accept a form opened the day before", () => {
    const yesterdaysForm = { ...valid, freeRanges: [{ start: "2026-10-23", end: "2026-10-30" }] };
    expect(shiftInterestSchema(TODAY).safeParse(yesterdaysForm).success).toBe(false);
    expect(shiftInterestSchema(TODAY, 1).safeParse(yesterdaysForm).success).toBe(true);
  });

  it("rejects impossible dates and missing ticks", () => {
    expect(
      schema.safeParse({ ...valid, freeRanges: [{ start: "2026-11-31", end: "2026-12-09" }] })
        .success,
    ).toBe(false);
    expect(schema.safeParse({ ...valid, committed: false }).success).toBe(false);
    expect(schema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });
});

describe("windowDemand", () => {
  const bounds = { start: "2026-11-01", end: "2026-11-20" };
  const people = [
    [{ start: "2026-11-01", end: "2026-11-14" }],
    [{ start: "2026-11-03", end: "2026-11-12" }],
    [{ start: "2026-11-10", end: "2026-11-20" }],
  ];

  it("ranks the windows most people can make", () => {
    const demand = windowDemand(people, bounds);
    expect(demand[0]).toEqual({ start: "2026-11-03", end: "2026-11-09", count: 2 });
    expect(demand.every((w) => w.count >= 1)).toBe(true);
  });

  it("picks options that do not overlap", () => {
    const picked = distinctWindows(windowDemand(people, bounds));
    for (const a of picked) {
      for (const b of picked) {
        if (a !== b) expect(a.start > b.end || a.end < b.start).toBe(true);
      }
    }
  });
});
