import { DEFAULT_STYLE } from "../team-style";
import type { BoardEntry } from "../team-style-board";
import { arrivals, countdownParts, lobbyPaidOnly, lobbyState, lobbyTeams, openingAt, parseDelayMinutes } from "../lobby";

function entry(over: Partial<BoardEntry>): BoardEntry {
  return { key: "x", id: "x", solo: false, name: "x", style: DEFAULT_STYLE, schools: ["สตรีวิทยา"], devices: 0, paid: 0, hidden: false, people: 2, paidPeople: 0, nameSetAt: null, ...over };
}

describe("the waiting room's teams", () => {
  const room = lobbyTeams([
    entry({ key: "tA", name: "ไฟป่า", nameSetAt: "2026-11-30T10:00:00+07:00", people: 3, paidPeople: 2 }),
    entry({ key: "tB", name: "Deep Blue", nameSetAt: "2026-12-01T09:00:00+07:00", devices: 40, paid: 5 }),
    // Never set a board name (signed up as "ทีม<nickname>"): never in the room.
    entry({ key: "tC", name: null, people: 4 }),
    // Hidden by staff: stays hidden.
    entry({ key: "tD", name: "rude", hidden: true }),
    // A name from before the time column: last, in key order.
    entry({ key: "sE", name: "หมาป่าเดียวดาย", solo: true, people: 1 }),
  ]);

  it("lists every named, visible team whatever its devices, newest first", () => {
    expect(room.teams.map((t) => t.key)).toEqual(["tB", "tA", "sE"]);
  });

  it("counts the people in the listed teams only", () => {
    expect(room.people).toBe(2 + 3 + 1);
  });

  it("shows names and styles only: no schools, devices, paid seats or ids", () => {
    for (const t of room.teams) expect(Object.keys(t).sort()).toEqual(["key", "name", "solo", "style"]);
  });

  it("pops only the teams this page hasn't seen, newest first", () => {
    expect(arrivals(new Set(["tA"]), room.teams)).toEqual(["tB", "sE"]);
    expect(arrivals(new Set(["tA", "tB", "sE"]), room.teams)).toEqual([]);
  });
});

const env = (vars: Record<string, string> = {}) => vars as unknown as NodeJS.ProcessEnv;

describe("the countdown and the room's states", () => {
  it("counts down to the opening slot in facts.ts, Bangkok time", () => {
    expect(openingAt().toISOString()).toBe("2026-12-04T12:00:00.000Z");
    const now = new Date(openingAt().getTime() - ((6 * 24 + 4) * 3600 + 12 * 60 + 33) * 1000);
    expect(countdownParts(openingAt(), now)).toEqual({ days: 6, hours: 4, minutes: 12, seconds: 33, done: false });
    expect(countdownParts(openingAt(), new Date(openingAt().getTime() + 5000))).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
  });

  it("is coming soon until sharing opens, counts down, runs through Demo Day, then is over", () => {
    const before = new Date("2026-11-30T12:00:00+07:00");
    expect(lobbyState(env(), before)).toBe("soon");
    expect(lobbyState(env({ ELEMENTAL_SHARE_OPEN: "1" }), before)).toBe("waiting");
    expect(lobbyState(env(), new Date("2026-12-04T19:30:00+07:00"))).toBe("started");
    // After sign-up close it stays up, whatever the flag says.
    expect(lobbyState(env(), new Date("2026-12-08T12:00:00+07:00"))).toBe("started");
    expect(lobbyState(env({ ELEMENTAL_SHARE_OPEN: "1" }), new Date("2026-12-13T10:00:00+07:00"))).toBe("over");
  });
});

describe("the room's two settings", () => {
  const entries = [
    entry({ key: "tA", name: "ไฟป่า", nameSetAt: "2026-12-04T18:00:00+07:00", people: 3, paidPeople: 2 }),
    entry({ key: "tB", name: "Deep Blue", nameSetAt: "2026-12-04T19:20:00+07:00", people: 2, paidPeople: 0 }),
    entry({ key: "sE", name: "หมาป่าเดียวดาย", solo: true, people: 1, paidPeople: 1 }),
  ];

  it("paid only: teams with a paid member, and paid people only", () => {
    const room = lobbyTeams(entries, { paidOnly: true });
    expect(room.teams.map((t) => t.key)).toEqual(["tA", "sE"]);
    expect(room.people).toBe(3);
  });

  it("is off by default, and only ever applies after sign-up close", () => {
    expect(lobbyPaidOnly(new Date("2026-12-06T10:00:00+07:00"))).toBe(false);
    expect(lobbyPaidOnly(new Date("2026-12-04T20:00:00+07:00"), true)).toBe(false);
    expect(lobbyPaidOnly(new Date("2026-12-05T00:00:01+07:00"), true)).toBe(true);
  });

  it("the projector's delay holds back names set in the last N minutes (old names without a time stay)", () => {
    const now = new Date("2026-12-04T19:25:00+07:00");
    expect(lobbyTeams(entries, { delayMinutes: 10, now }).teams.map((t) => t.key)).toEqual(["tA", "sE"]);
    expect(lobbyTeams(entries, { delayMinutes: 0, now }).teams.map((t) => t.key)).toEqual(["tB", "tA", "sE"]);
  });

  it("reads ?delay= as whole minutes from 0 to 120, anything else as 0", () => {
    expect(parseDelayMinutes("5")).toBe(5);
    expect(parseDelayMinutes("999")).toBe(120);
    for (const bad of [null, undefined, "", "-3", "2.5", "five", "1e3"]) expect(parseDelayMinutes(bad)).toBe(0);
  });
});
