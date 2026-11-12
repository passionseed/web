import {
  careerRequestMessage,
  collectSourceRefs,
  formatClock,
  formatThaiMonthYear,
  newProgressMilestones,
} from "../guide-helpers";

test("collectSourceRefs de-duplicates across cards and ignores junk", () => {
  expect(
    collectSourceRefs([{ source_refs: [3, 1] }, { source_refs: [1, "4", "x"] }, null, { source_refs: "1" }])
  ).toEqual([3, 1, 4]);
});

test("formatThaiMonthYear uses the Buddhist year in Bangkok time", () => {
  expect(formatThaiMonthYear("2026-11-11T00:00:00Z")).toBe("พ.ย. 2569");
  // 20:00 UTC on 31 Dec is already 1 Jan in Bangkok.
  expect(formatThaiMonthYear("2026-12-31T20:00:00Z")).toBe("ม.ค. 2570");
  expect(formatThaiMonthYear("nope")).toBeNull();
  expect(formatThaiMonthYear(null)).toBeNull();
});

test("newProgressMilestones sends each of 25, 50, 75 once, in order", () => {
  expect(newProgressMilestones(0.2, new Set())).toEqual([]);
  expect(newProgressMilestones(0.25, new Set())).toEqual([25]);
  expect(newProgressMilestones(0.8, new Set([25]))).toEqual([50, 75]);
  expect(newProgressMilestones(1, new Set([25, 50, 75]))).toEqual([]);
  expect(newProgressMilestones(Number.NaN, new Set())).toEqual([]);
});

test("formatClock", () => {
  expect(formatClock(0)).toBe("0:00");
  expect(formatClock(42.9)).toBe("0:42");
  expect(formatClock(75)).toBe("1:15");
  expect(formatClock(Number.NaN)).toBe("0:00");
});

test("careerRequestMessage has copy for every result and none while idle", () => {
  expect(careerRequestMessage("idle")).toBeNull();
  expect(careerRequestMessage("submitting")).toBeNull();
  for (const state of ["ok", "rate_limited", "invalid", "failed"] as const) {
    expect(careerRequestMessage(state)).toEqual(expect.any(String));
  }
});
