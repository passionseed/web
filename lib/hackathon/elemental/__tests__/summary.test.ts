import { dailySummary, type SummaryInput } from "../summary";

const base: SummaryInput = {
  today: "2026-11-21",
  seats: { paid: 12, target: 350, paidToday: 4, need: { perDay: 10, seats: 50, by: "2026-11-26" } },
  money: { cashSigned: 5000, prizePool: 20000, sponsorsSigned: 1, sponsorsTalking: 2 },
  voices: { covered: 2, target: 5, missing: ["fire", "aether", "air"] },
  overdue: { tasks: 3, followUps: 2 },
};

describe("dailySummary", () => {
  it("writes the whole day in one line", () => {
    expect(dailySummary(base)).toBe(
      "21 Nov: 12/350 paid (+4 today, need 10/day for 50 by 26 Nov). Cash 5,000/20,000, 1 signed, 2 talking. Voices 2/5, missing fire, aether, air. Overdue: 3 tasks, 2 follow-ups.",
    );
  });

  it("drops the need once the checkpoint is reached or passed", () => {
    expect(dailySummary({ ...base, seats: { ...base.seats!, need: { perDay: 0, seats: 50, by: "2026-11-26" } } })).toMatch(
      /^21 Nov: 12\/350 paid \(\+4 today\)\./,
    );
    expect(dailySummary({ ...base, seats: { ...base.seats!, need: null } })).toMatch(/\(\+4 today\)/);
  });

  it("leaves out what did not load instead of writing a zero", () => {
    const line = dailySummary({ ...base, seats: null, money: null, voices: null, overdue: { tasks: null, followUps: 1 } });
    expect(line).toBe("21 Nov: Overdue: 1 follow-up.");
  });

  it("says nothing is missing when every element has a voice", () => {
    expect(dailySummary({ ...base, voices: { covered: 5, target: 5, missing: [] } })).toContain("Voices 5/5.");
  });

  it("uses singular words for one", () => {
    expect(dailySummary({ ...base, overdue: { tasks: 1, followUps: 0 } })).toContain("Overdue: 1 task, 0 follow-ups.");
  });

  it("holds totals only: no names, no emails", () => {
    expect(dailySummary(base)).not.toMatch(/@/);
  });
});
