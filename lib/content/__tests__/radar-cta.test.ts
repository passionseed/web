import { openShiftRound, radarProgramLine } from "../radar-cta";
import { SHIFT_COHORTS, cohortStatus } from "../shift-cohort";
import { findDashes } from "@/lib/radar-guide/thai-copy";

/** The last day of applications for the newest round: that round is open then. */
const newest = SHIFT_COHORTS[SHIFT_COHORTS.length - 1];
const openDay: string | null = newest.completed ? null : newest.applyDeadline;

describe("radarProgramLine", () => {
  it("names the open SHIFT round with no price and no dashes", () => {
    expect(openDay).not.toBeNull();
    const round = openShiftRound(openDay!);
    expect(round).not.toBeNull();
    expect(cohortStatus(round!, openDay!)).toBe("open");

    const line = radarProgramLine("cybersecurity", openDay!);
    expect(line).not.toBeNull();
    const text = `${line!.title} ${line!.body} ${line!.cta}`;
    expect(text).toContain(round!.name);
    expect(text).not.toMatch(/TechSeed/);
    expect(text).not.toMatch(/฿|บาท|\d+\s*THB/);
    expect(findDashes(text)).toEqual([]);
    expect(line!.href).toBe(`/shift/${round!.round}?from=radar-cybersecurity`);
  });

  it("is null once every round has closed", () => {
    expect(radarProgramLine("cybersecurity", "2999-01-01")).toBeNull();
  });
});
