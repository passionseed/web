import { boardPhase, demoDayEndsAt, teamStyleEditable } from "../team-style-phase";
import { elementalCountingEndsAt } from "../link-views-shared";

const ON = { ELEMENTAL_SHARE_OPEN: "1" } as unknown as NodeJS.ProcessEnv;
const OFF = {} as unknown as NodeJS.ProcessEnv;
const at = (iso: string) => new Date(iso);

describe("team board phases", () => {
  it("is coming soon until sharing opens, live while it's open", () => {
    expect(boardPhase(OFF, at("2026-11-28T12:00:00+07:00"))).toBe("soon");
    expect(boardPhase(ON, at("2026-11-28T12:00:00+07:00"))).toBe("live");
    expect(boardPhase(ON, at("2026-12-04T23:59:00+07:00"))).toBe("live");
  });

  it("turns final at sign-up close and never goes back to coming soon", () => {
    const justAfter = new Date(elementalCountingEndsAt().getTime() + 1000);
    expect(boardPhase(ON, justAfter)).toBe("final");
    expect(boardPhase(OFF, justAfter)).toBe("final");
    expect(boardPhase(OFF, at("2027-01-15T12:00:00+07:00"))).toBe("final");
  });

  it("keeps names and styles editable until the end of Demo Day, not after", () => {
    expect(teamStyleEditable(OFF, at("2026-11-28T12:00:00+07:00"))).toBe(false);
    expect(teamStyleEditable(ON, at("2026-11-28T12:00:00+07:00"))).toBe(true);
    expect(teamStyleEditable(OFF, at("2026-12-08T12:00:00+07:00"))).toBe(true);
    expect(teamStyleEditable(OFF, demoDayEndsAt())).toBe(true);
    expect(teamStyleEditable(ON, new Date(demoDayEndsAt().getTime() + 1000))).toBe(false);
  });
});
