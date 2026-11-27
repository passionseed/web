import { PER_NETWORK_CAP } from "../link-views-shared";
import { shareCode, shareSource } from "../share";
import {
  boardKey,
  buildBoard,
  countsAsPaid,
  offBoardReason,
  rankBoard,
  teamSchools,
  tidySchool,
  type BoardEntry,
  type BoardRegistrationRow,
  type BoardView,
} from "../team-style-board";
import { DEFAULT_STYLE, TEAM_STYLE_TIERS } from "../team-style";

const END = new Date("2026-12-04T23:59:59+07:00");
const BEFORE = "2026-11-30T10:00:00+07:00";
const AFTER = "2026-12-05T09:00:00+07:00";

/** A slip's storage path as the upload route names it: <registration>/<upload time in ms>-<random>.jpg. */
const slip = (iso: string) => `reg/${new Date(iso).getTime()}-ab12.jpg`;
const id = (n: number) => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const src = (n: number) => shareSource(shareCode(id(n)));

function reg(n: number, over: Partial<BoardRegistrationRow> = {}): BoardRegistrationRow {
  return {
    id: id(n),
    teamId: null,
    boardName: null,
    status: "pending",
    memberCount: 1,
    source: null,
    createdAt: BEFORE,
    slipPath: null,
    style: null,
    hidden: false,
    schools: [],
    ...over,
  };
}

/** n devices on one link, each on its own network so none are capped. */
const views = (source: string, n: number, createdAt = BEFORE): BoardView[] =>
  Array.from({ length: n }, (_, i) => ({ source, ipHash: `${source}-${createdAt}-${i}`, createdAt }));

function entry(over: Partial<BoardEntry>): BoardEntry {
  return { key: "x", id: "x", solo: false, name: "x", style: DEFAULT_STYLE, schools: [], devices: 1, paid: 0, hidden: false, ...over };
}

describe("building the team board", () => {
  const T1 = "aaaaaaaa-1111-4111-8111-111111111111";
  const T2 = "bbbbbbbb-2222-4222-8222-222222222222";
  const T3 = "cccccccc-3333-4333-8333-333333333333";
  const teams = [
    { id: T1, boardName: "ไฟป่า", style: { font: "chakra", color: "flame", effect: "solid" }, hidden: false },
    { id: T2, boardName: "Team Mekong", style: null, hidden: true },
    // Signed up as "ทีมมิว" by default, never set a board name.
    { id: T3, boardName: null, style: null, hidden: false },
  ];
  const registrations = [
    reg(1, { teamId: T1, schools: ["โรงเรียนสตรีวิทยา"] }),
    reg(2, { teamId: T1, schools: ["สตรีวิทยา"], status: "paid" }),
    reg(3, { teamId: T2, schools: ["เตรียมอุดมศึกษา"] }),
    reg(4, { boardName: "หมาป่าเดียวดาย", schools: ["บดินทรเดชา"] }),
    reg(5, { teamId: T1, status: "cancelled" }),
    reg(6, { teamId: T3, schools: ["สามเสนวิทยาลัย"] }),
    // Friends who signed up through members' links.
    reg(10, { status: "paid", source: src(1) }),
    reg(11, { status: "paid", source: src(2), memberCount: 2 }),
    reg(12, { status: "pending", source: src(1) }),
    reg(13, { status: "paid", source: src(4) }),
    reg(14, { status: "paid", source: src(5) }),
    // A sign-up after close: doesn't count as paid.
    reg(16, { status: "paid", source: src(1), createdAt: AFTER }),
    // Signed up before close but sent the slip after it: not paid by close.
    reg(17, { status: "paid", source: src(1), slipPath: slip(AFTER) }),
    // Slip in before close, approved by staff later: counts.
    reg(18, { status: "paid", source: src(2), slipPath: slip("2026-12-04T22:00:00+07:00") }),
  ];
  const board = buildBoard({
    teams,
    registrations,
    views: [...views(src(1), 8), ...views(src(1), 30, AFTER), ...views(src(2), 6), ...views(src(4), 3), ...views(src(5), 40), ...views(src(6), 12)],
    endsAt: END,
  });
  const byKey = new Map(board.map((e) => [e.key, e]));
  const t1 = byKey.get(boardKey({ teamId: T1, registrationId: id(1) }))!;

  it("sums every member's link into the team", () => {
    expect(t1.devices).toBe(14);
    expect(t1.schools).toEqual(["สตรีวิทยา"]);
    expect(t1.solo).toBe(false);
    expect(t1.name).toBe("ไฟป่า");
  });

  it("counts only paid seats whose slip came in by close", () => {
    // reg 10 (1) + reg 11 (2) + reg 18 (1). Not the late sign-up (16),
    // the late slip (17) or the pending one (12).
    expect(t1.paid).toBe(4);
    expect(countsAsPaid({ status: "paid", createdAt: AFTER, slipPath: null }, END)).toBe(false);
    expect(countsAsPaid({ status: "paid", createdAt: BEFORE, slipPath: null }, END)).toBe(true);
    expect(countsAsPaid({ status: "review", createdAt: BEFORE, slipPath: null }, END)).toBe(false);
  });

  it("keeps the final board final: a slip sent after close never adds a seat", () => {
    const late = { status: "paid", createdAt: BEFORE, slipPath: slip(AFTER) };
    expect(countsAsPaid(late, END)).toBe(false);
    expect(countsAsPaid({ ...late, slipPath: slip("2026-12-04T23:59:00+07:00") }, END)).toBe(true);
    const before = buildBoard({ teams: [], registrations: [reg(30, { boardName: "x" })], views: views(src(30), 2), endsAt: END });
    const after = buildBoard({
      teams: [],
      registrations: [reg(30, { boardName: "x" }), reg(31, { status: "paid", source: src(30), slipPath: slip(AFTER) })],
      views: [...views(src(30), 2), ...views(src(30), 9, AFTER)],
      endsAt: END,
    });
    expect(after.find((e) => e.key === before[0].key)).toMatchObject({ devices: before[0].devices, paid: 0 });
  });

  it("stops counting devices at close", () => {
    // The 30 views after close on reg 1's link don't count.
    expect(t1.devices).toBe(14);
  });

  it("leaves out cancelled members", () => {
    // reg 5's 40 devices don't count.
    expect(t1.devices).toBeLessThan(40);
  });

  it("counts a sign-up without a team as a one-person team", () => {
    const solo = byKey.get(boardKey({ teamId: null, registrationId: id(4) }))!;
    expect(solo).toMatchObject({ solo: true, name: "หมาป่าเดียวดาย", devices: 3, paid: 1, schools: ["บดินทรเดชา"] });
  });

  it("shows only the part of a style the devices unlock", () => {
    expect(t1.devices).toBeGreaterThanOrEqual(TEAM_STYLE_TIERS.color);
    expect(t1.devices).toBeLessThan(TEAM_STYLE_TIERS.font);
    expect(t1.style).toEqual({ ...DEFAULT_STYLE, color: "flame" });
  });

  it("caps devices per network, the same way a single link is counted", () => {
    const capped = buildBoard({
      teams: [],
      registrations: [reg(20, { boardName: "x" })],
      views: Array.from({ length: 30 }, () => ({ source: src(20), ipHash: "school-wifi" })),
      endsAt: END,
    });
    expect(capped[0].devices).toBe(PER_NETWORK_CAP);
  });

  it("never lists a team that hasn't set a board name, whatever its numbers", () => {
    const t3 = byKey.get(boardKey({ teamId: T3, registrationId: id(6) }))!;
    expect(t3.devices).toBe(12);
    expect(t3.name).toBeNull();
    expect(offBoardReason(t3)).toBe("name");
    expect(rankBoard(board).some((e) => e.key === t3.key)).toBe(false);
  });

  it("keeps hidden teams in the numbers but off the public board", () => {
    const t2 = byKey.get(boardKey({ teamId: T2, registrationId: id(3) }))!;
    expect(offBoardReason(t2)).toBe("hidden");
    expect(rankBoard(board).some((e) => e.key === t2.key)).toBe(false);
  });

  it("never puts an id or a person's name on a public row", () => {
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

  it("shows only named teams with at least one device that aren't hidden", () => {
    const ranked = rankBoard([
      entry({ key: "a", devices: 0, paid: 0 }),
      entry({ key: "b", devices: 1 }),
      entry({ key: "c", devices: 50, paid: 4, hidden: true }),
      entry({ key: "d", devices: 80, paid: 9, name: null }),
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
