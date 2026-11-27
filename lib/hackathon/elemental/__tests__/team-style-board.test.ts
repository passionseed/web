import { PER_NETWORK_CAP } from "../link-views-shared";
import { shareCode, shareSource } from "../share";
import {
  boardKey,
  buildBoard,
  rankBoard,
  teamSchools,
  tidySchool,
  type BoardEntry,
  type BoardRegistrationRow,
  type BoardView,
} from "../team-style-board";
import { DEFAULT_STYLE, TEAM_STYLE_TIERS } from "../team-style";

const id = (n: number) => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const src = (n: number) => shareSource(shareCode(id(n)));

function reg(n: number, over: Partial<BoardRegistrationRow> = {}): BoardRegistrationRow {
  return { id: id(n), teamId: null, name: null, status: "pending", memberCount: 1, source: null, style: null, hidden: false, schools: [], ...over };
}

/** n devices on one link, each on its own network so none are capped. */
const views = (source: string, n: number, network = source): BoardView[] =>
  Array.from({ length: n }, (_, i) => ({ source, ipHash: `${network}-${i}` }));

function entry(over: Partial<BoardEntry>): BoardEntry {
  return { key: "x", id: "x", solo: false, name: "x", style: DEFAULT_STYLE, schools: [], devices: 0, paid: 0, hidden: false, ...over };
}

describe("building the team board", () => {
  const T1 = "aaaaaaaa-1111-4111-8111-111111111111";
  const T2 = "bbbbbbbb-2222-4222-8222-222222222222";
  const teams = [
    { id: T1, name: "ไฟป่า", style: { font: "chakra", color: "flame", effect: "solid", color2: "flame" }, hidden: false },
    { id: T2, name: "Team Mekong", style: null, hidden: true },
  ];
  const registrations = [
    reg(1, { teamId: T1, schools: ["โรงเรียนสตรีวิทยา"] }),
    reg(2, { teamId: T1, schools: ["สตรีวิทยา"], status: "paid" }),
    reg(3, { teamId: T2, schools: ["เตรียมอุดมศึกษา"] }),
    reg(4, { name: "หมาป่าเดียวดาย", schools: ["บดินทรเดชา"] }),
    reg(5, { teamId: T1, status: "cancelled" }),
    // Friends who signed up through members' links.
    reg(10, { status: "paid", source: src(1) }),
    reg(11, { status: "paid", source: src(2), memberCount: 2 }),
    reg(12, { status: "pending", source: src(1) }),
    reg(13, { status: "paid", source: src(4) }),
    reg(14, { status: "paid", source: src(5) }),
  ];
  const board = buildBoard({
    teams,
    registrations,
    views: [...views(src(1), 8), ...views(src(2), 6), ...views(src(4), 3), ...views(src(5), 40)],
  });
  const byKey = new Map(board.map((e) => [e.key, e]));

  it("sums every member's link into the team", () => {
    const t1 = byKey.get(boardKey({ teamId: T1, registrationId: id(1) }))!;
    expect(t1.devices).toBe(14);
    expect(t1.paid).toBe(3);
    expect(t1.schools).toEqual(["สตรีวิทยา"]);
    expect(t1.solo).toBe(false);
  });

  it("leaves out cancelled members", () => {
    const t1 = byKey.get(boardKey({ teamId: T1, registrationId: id(1) }))!;
    // reg 5's 40 devices and 1 paid seat don't count.
    expect(t1.devices).toBeLessThan(40);
  });

  it("counts a sign-up without a team as a one-person team", () => {
    const solo = byKey.get(boardKey({ teamId: null, registrationId: id(4) }))!;
    expect(solo).toMatchObject({ solo: true, name: "หมาป่าเดียวดาย", devices: 3, paid: 1, schools: ["บดินทรเดชา"] });
  });

  it("shows only the part of a style the devices unlock", () => {
    const t1 = byKey.get(boardKey({ teamId: T1, registrationId: id(1) }))!;
    expect(t1.devices).toBeGreaterThanOrEqual(TEAM_STYLE_TIERS.color);
    expect(t1.devices).toBeLessThan(TEAM_STYLE_TIERS.font);
    expect(t1.style).toEqual({ ...DEFAULT_STYLE, color: "flame" });
  });

  it("caps devices per network, the same way a single link is counted", () => {
    const capped = buildBoard({ teams: [], registrations: [reg(20)], views: views(src(20), 30, "school-wifi").map((v) => ({ ...v, ipHash: "school-wifi" })) });
    expect(capped[0].devices).toBe(PER_NETWORK_CAP);
  });

  it("keeps hidden teams in the numbers but off the public board", () => {
    const t2 = byKey.get(boardKey({ teamId: T2, registrationId: id(3) }))!;
    expect(t2.hidden).toBe(true);
    expect(rankBoard(board).some((e) => e.key === t2.key)).toBe(false);
  });

  it("never puts a person's name on a public row", () => {
    const json = JSON.stringify(rankBoard(board));
    expect(json).not.toContain(id(1));
    expect(json).not.toMatch(/"id":/);
  });
});

describe("ranking the team board", () => {
  it("ranks by paid seats, then devices", () => {
    const ranked = rankBoard([
      entry({ key: "a", name: "A", paid: 1, devices: 90 }),
      entry({ key: "b", name: "B", paid: 3, devices: 5 }),
      entry({ key: "c", name: "C", paid: 1, devices: 120 }),
    ]);
    expect(ranked.map((e) => [e.key, e.rank])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });

  it("gives teams level on both the same rank, listed by name", () => {
    const ranked = rankBoard([
      entry({ key: "z", name: "ไฟ", paid: 2, devices: 10 }),
      entry({ key: "y", name: "ดิน", paid: 2, devices: 10 }),
      entry({ key: "x", name: "น้ำ", paid: 5, devices: 1 }),
      entry({ key: "w", name: "ลม", paid: 0, devices: 3 }),
    ]);
    expect(ranked.map((e) => [e.name, e.rank])).toEqual([
      ["น้ำ", 1],
      ["ดิน", 2],
      ["ไฟ", 2],
      ["ลม", 4],
    ]);
  });

  it("shows only teams with at least one device that aren't hidden", () => {
    const ranked = rankBoard([
      entry({ key: "a", devices: 0, paid: 0 }),
      entry({ key: "b", devices: 1 }),
      entry({ key: "c", devices: 50, paid: 4, hidden: true }),
    ]);
    expect(ranked.map((e) => e.key)).toEqual(["b"]);
    expect(ranked[0].rank).toBe(1);
  });
});

describe("school names on the board", () => {
  it("drops the โรงเรียน prefix and extra spaces", () => {
    expect(tidySchool("  โรงเรียน  เตรียมอุดมศึกษา ")).toBe("เตรียมอุดมศึกษา");
    expect(tidySchool("รร.สามเสนวิทยาลัย")).toBe("สามเสนวิทยาลัย");
    expect(tidySchool("x".repeat(100))).toHaveLength(60);
  });

  it("lists each school once, most members first", () => {
    expect(teamSchools(["สวนกุหลาบ", "โรงเรียนเตรียมฯ", "เตรียมฯ", " "])).toEqual(["เตรียมฯ", "สวนกุหลาบ"]);
  });
});
