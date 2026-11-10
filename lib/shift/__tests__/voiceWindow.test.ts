import { SHIFT_COHORT_3 } from "@/lib/content/shift-cohort";
import {
  cohortDays,
  defaultVoiceDay,
  parseSessionTime,
  roundsInSession,
  voiceWindow,
} from "@/lib/shift/voiceWindow";

describe("roundsInSession", () => {
  it("includes a round on Day 1 even while its applications are still open", () => {
    expect(roundsInSession(SHIFT_COHORT_3.startDate).has("SHIFT[3]")).toBe(true);
  });

  it("covers the last day and stops after it", () => {
    expect(roundsInSession(SHIFT_COHORT_3.endDate).has("SHIFT[3]")).toBe(true);
    expect(roundsInSession("2026-11-16").has("SHIFT[3]")).toBe(false);
  });
});

describe("parseSessionTime", () => {
  it("reads an en dash range and falls back to the usual slot", () => {
    expect(parseSessionTime("19:00–21:00")).toEqual({ start: "19:00", end: "21:00" });
    expect(parseSessionTime("9:30-11:00")).toEqual({ start: "09:30", end: "11:00" });
    expect(parseSessionTime("evenings")).toEqual({ start: "19:00", end: "21:00" });
  });
});

describe("voiceWindow", () => {
  it("uses Bangkok time for the session, the day and the round", () => {
    const iso = (w: { from: Date; to: Date }) => [w.from.toISOString(), w.to.toISOString()];
    expect(iso(voiceWindow(SHIFT_COHORT_3, "2026-11-10", "session"))).toEqual([
      "2026-11-10T12:00:00.000Z",
      "2026-11-10T14:00:00.000Z",
    ]);
    expect(iso(voiceWindow(SHIFT_COHORT_3, "2026-11-10", "day"))).toEqual([
      "2026-11-09T17:00:00.000Z",
      "2026-11-10T17:00:00.000Z",
    ]);
    expect(iso(voiceWindow(SHIFT_COHORT_3, "2026-11-10", "round"))).toEqual([
      "2026-11-08T17:00:00.000Z",
      "2026-11-15T17:00:00.000Z",
    ]);
  });
});

describe("defaultVoiceDay", () => {
  it("picks today in a running round, else the last day so far, else Day 1", () => {
    const days = cohortDays(SHIFT_COHORT_3);
    expect(days[0]).toBe("2026-11-09");
    expect(defaultVoiceDay(SHIFT_COHORT_3, "2026-11-11")).toBe("2026-11-11");
    expect(defaultVoiceDay(SHIFT_COHORT_3, "2026-12-01")).toBe(days.at(-1));
    expect(defaultVoiceDay(SHIFT_COHORT_3, "2026-11-01")).toBe("2026-11-09");
  });
});
