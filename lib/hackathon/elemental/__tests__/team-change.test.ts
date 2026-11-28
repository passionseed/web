import {
  amountAfterTeamChange,
  createTeamError,
  formatTeamCode,
  joinTeamError,
  leaveTeamError,
  parseTeamCode,
  switchTeamError,
  teamChangeOpen,
  type TeamChanger,
} from "../team-change";

const solo: TeamChanger = { status: "pending", memberCount: 1, amountBaht: 199, teamId: null, onBuddyPass: false };
const room = { id: "t1", spotsLeft: 3 };

describe("parseTeamCode", () => {
  it("reads the 8-character team code as typed, with spaces, dashes or capitals", () => {
    expect(parseTeamCode("0123abcd")).toBe("0123abcd");
    expect(parseTeamCode(" 0123 ABCD ")).toBe("0123abcd");
    expect(parseTeamCode("0123-abcd")).toBe("0123abcd");
  });

  it("still reads a whole invite code", () => {
    expect(parseTeamCode("0123456789ab")).toBe("0123456789ab");
    expect(parseTeamCode(" 0123 4567 89AB ")).toBe("0123456789ab");
  });

  it("reads the code out of a pasted invite link", () => {
    expect(parseTeamCode("https://passionseed.org/hackathon/join?team=0123456789ab&src=team")).toBe("0123456789ab");
    expect(parseTeamCode("มาเข้าทีม สมัครที่ลิงก์นี้: https://passionseed.org/hackathon/join?src=team&team=0123456789AB")).toBe("0123456789ab");
  });

  it("refuses anything that isn't a team code", () => {
    expect(parseTeamCode("")).toBeNull();
    expect(parseTeamCode("0123456")).toBeNull();
    expect(parseTeamCode("0123456789a")).toBeNull();
    expect(parseTeamCode("0123456789abc")).toBeNull();
    expect(parseTeamCode("zzzzzzzz")).toBeNull();
    expect(parseTeamCode("https://passionseed.org/hackathon/join?team=0123456789abcd")).toBeNull();
  });
});

describe("formatTeamCode", () => {
  it("shows the first 8 characters of the invite code in two groups that parse back", () => {
    expect(formatTeamCode("0123456789ab")).toBe("0123 4567");
    expect(parseTeamCode(formatTeamCode("0123456789ab"))).toBe("01234567");
  });
});

describe("teamChangeOpen", () => {
  it("is open until Sat 5 Dec 2026 at 10:00 in Bangkok, then closed", () => {
    expect(teamChangeOpen(new Date("2026-11-28T12:00:00+07:00"))).toBe(true);
    expect(teamChangeOpen(new Date("2026-12-05T10:00:00+07:00"))).toBe(true);
    expect(teamChangeOpen(new Date("2026-12-05T03:00:01Z"))).toBe(false);
    expect(teamChangeOpen(new Date("2026-12-06T00:00:00+07:00"))).toBe(false);
  });
});

describe("joinTeamError", () => {
  it("lets a sign-up without a team join a team with room", () => {
    expect(joinTeamError(solo, room)).toBeNull();
    expect(joinTeamError({ ...solo, status: "paid" }, room)).toBeNull();
    expect(joinTeamError({ ...solo, status: "review" }, room)).toBeNull();
  });

  it("refuses a cancelled sign-up, one already in a team, an unknown code and a full team", () => {
    expect(joinTeamError({ ...solo, status: "cancelled" }, room)).toBe("cancelled");
    expect(joinTeamError({ ...solo, teamId: "t0" }, room)).toBe("in_team");
    expect(joinTeamError(solo, null)).toBe("team_not_found");
    expect(joinTeamError(solo, { id: "t1", spotsLeft: 0 })).toBe("team_full");
  });

  it("needs a seat for every person on the sign-up", () => {
    expect(joinTeamError({ ...solo, memberCount: 3 }, { id: "t1", spotsLeft: 2 })).toBe("team_full");
    expect(joinTeamError({ ...solo, memberCount: 3 }, { id: "t1", spotsLeft: 3 })).toBeNull();
  });
});

describe("switchTeamError", () => {
  const inTeam: TeamChanger = { ...solo, amountBaht: 149, teamId: "t0" };

  it("moves a sign-up from its team to another team with room", () => {
    expect(switchTeamError(inTeam, room)).toBeNull();
    expect(switchTeamError({ ...inTeam, status: "paid" }, room)).toBeNull();
  });

  it("refuses a cancelled sign-up, one with no team, an unknown code, its own team and a full team", () => {
    expect(switchTeamError({ ...inTeam, status: "cancelled" }, room)).toBe("cancelled");
    expect(switchTeamError(solo, room)).toBe("not_in_team");
    expect(switchTeamError(inTeam, null)).toBe("team_not_found");
    expect(switchTeamError(inTeam, { id: "t0", spotsLeft: 3 })).toBe("same_team");
    expect(switchTeamError(inTeam, { id: "t1", spotsLeft: 0 })).toBe("team_full");
  });
});

describe("createTeamError and leaveTeamError", () => {
  it("starts a team only without one, and leaves only with one", () => {
    expect(createTeamError(solo)).toBeNull();
    expect(createTeamError({ ...solo, teamId: "t1" })).toBe("in_team");
    expect(leaveTeamError({ ...solo, teamId: "t1" })).toBeNull();
    expect(leaveTeamError(solo)).toBe("not_in_team");
  });

  it("refuses a cancelled sign-up", () => {
    expect(createTeamError({ ...solo, status: "cancelled" })).toBe("cancelled");
    expect(leaveTeamError({ ...solo, status: "cancelled", teamId: "t1" })).toBe("cancelled");
  });
});

describe("amountAfterTeamChange", () => {
  it("gives an unpaid sign-up the price of where it now stands", () => {
    expect(amountAfterTeamChange(solo, true)).toBe(149);
    expect(amountAfterTeamChange({ ...solo, amountBaht: 149, teamId: "t1" }, false)).toBe(199);
    expect(amountAfterTeamChange({ ...solo, memberCount: 2, amountBaht: 298 }, true)).toBe(298);
  });

  it("never changes money already sent", () => {
    expect(amountAfterTeamChange({ ...solo, status: "paid" }, true)).toBe(199);
    expect(amountAfterTeamChange({ ...solo, status: "review" }, true)).toBe(199);
    expect(amountAfterTeamChange({ ...solo, status: "paid", amountBaht: 149, teamId: "t1" }, false)).toBe(149);
  });

  it("keeps a buddy pass price", () => {
    expect(amountAfterTeamChange({ ...solo, amountBaht: 99, onBuddyPass: true }, true)).toBe(99);
    expect(amountAfterTeamChange({ ...solo, amountBaht: 99, onBuddyPass: true, teamId: "t1" }, false)).toBe(99);
  });
});
