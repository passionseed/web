/**
 * @jest-environment node
 */
import { PNG } from "pngjs";

import { QuestDbError, QuestError } from "@/bot/src/quests/api";
import { SPOTS } from "@/bot/src/quests/island/render";
import type { IslandMapData, IslandViewer } from "@/lib/supabase/shift-quests/types";

const mockViewer = jest.fn<Promise<IslandViewer>, []>();
const mockMap = jest.fn<Promise<IslandMapData>, [string]>();

jest.mock("@/lib/supabase/shift-quests/viewer", () => ({ resolveIslandViewer: () => mockViewer() }));
jest.mock("@/lib/supabase/shift-quests/page", () => ({ getIslandMap: (actor: string) => mockMap(actor) }));

import { GET, dynamic } from "../route";

const ME = { name: "นักเรียน", avatarUrl: null, staff: false };
const ACTOR = "123456789012345678";
const SECRET = "ชื่อโปรเจกต์ลับ";
const USER_ID = "99999999-9999-4999-8999-000000000001";

const READY: IslandViewer = {
  state: "ready",
  me: ME,
  actor: ACTOR,
  userId: USER_ID,
  session: { member_id: "m1", onboarded: true } as Extract<IslandViewer, { state: "ready" }>["session"],
};

function islandMap(slots: number[]): IslandMapData {
  return {
    plots: slots.map((slot, k) => ({
      slot,
      stage: k % 8,
      visitor: false,
      key: false,
      helper: false,
      lantern: false,
      name: SECRET,
      mine: k === 0,
      plain: false,
    })),
    goal: null,
    season: { name: "Season 1", demo_day: "2027-05-15", days_to_demo: 30 },
  };
}

let errorLog: jest.SpyInstance;
beforeEach(() => {
  mockViewer.mockReset();
  mockMap.mockReset();
  errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorLog.mockRestore());

function expectPrivate(res: Response) {
  expect(res.headers.get("cache-control")).toBe("private, no-store");
  expect(res.headers.get("x-content-type-options")).toBe("nosniff");
}

async function expectRefused(res: Response, status: number) {
  expect(res.status).toBe(status);
  expectPrivate(res);
  expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
  const body = await res.text();
  expect(body.length).toBeLessThan(40);
  expect(body).not.toContain(SECRET);
}

describe("GET /api/shift/island/map", () => {
  it("is always rendered at request time", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("draws the signed-in student's island as a private PNG", async () => {
    mockViewer.mockResolvedValue(READY);
    mockMap.mockResolvedValue(islandMap([1, 2, 3, 4, 5]));
    const res = await GET();
    expect(res.status).toBe(200);
    expectPrivate(res);
    expect(res.headers.get("content-type")).toBe("image/png");
    const png = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
    expect(png.width).toBeGreaterThan(0);
    expect(png.height).toBeGreaterThan(0);
    // The actor comes from the session alone.
    expect(mockMap).toHaveBeenCalledTimes(1);
    expect(mockMap).toHaveBeenCalledWith(ACTOR);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it.each<[string, number, IslandViewer]>([
    ["signed out", 401, { state: "signed_out" }],
    ["no Discord", 401, { state: "no_discord", accountLabel: "Google" }],
    ["no role", 403, { state: "not_eligible", me: ME, reason: "no_role" }],
    ["Discord down", 403, { state: "not_eligible", me: ME, reason: "discord_unavailable" }],
    ["not started", 403, { state: "not_started", me: ME, actor: ACTOR, userId: USER_ID }],
    ["database down", 503, { state: "unavailable", reason: "db_error" }],
    ["schema outdated", 503, { state: "unavailable", reason: "schema_outdated" }],
  ])("turns away a viewer (%s) with %i and never reads the map", async (_label, status, viewer) => {
    mockViewer.mockResolvedValue(viewer);
    await expectRefused(await GET(), status);
    expect(mockMap).not.toHaveBeenCalled();
  });

  it("refuses a viewer state it does not know", async () => {
    mockViewer.mockResolvedValue({ state: "something_new" } as unknown as IslandViewer);
    await expectRefused(await GET(), 403);
    expect(mockMap).not.toHaveBeenCalled();
  });

  it.each<[string, unknown, string]>([
    ["a refusal", new QuestError("not_started", SECRET, "shift_quest_island_map"), "shift_quest_island_map:sq:not_started"],
    ["a database failure", new QuestDbError("shift_quest_island_map", "57014"), "shift_quest_island_map:sqlstate=57014"],
    ["a missing database", new Error("shift_quest_db_not_configured"), "shift_quest_db_not_configured"],
  ])("answers 503 on %s, logging only a code", async (_label, error, logged) => {
    mockViewer.mockResolvedValue(READY);
    mockMap.mockRejectedValue(error);
    await expectRefused(await GET(), 503);
    expect(errorLog).toHaveBeenCalledTimes(1);
    const line = String(errorLog.mock.calls[0][0]);
    expect(line).toContain(logged);
    expect(line).not.toContain(SECRET);
  });

  it("answers 500 when the island cannot be drawn, logging the code and slot only", async () => {
    mockViewer.mockResolvedValue(READY);
    mockMap.mockResolvedValue(islandMap([1, SPOTS.length + 1]));
    await expectRefused(await GET(), 500);
    expect(errorLog).toHaveBeenCalledTimes(1);
    const line = String(errorLog.mock.calls[0][0]);
    expect(line).toContain("too_large");
    expect(line).toContain(`slot ${SPOTS.length + 1}`);
    expect(line).not.toContain(SECRET);
  });

  it("answers 500 on anything unexpected, logging only its kind", async () => {
    mockViewer.mockResolvedValue(READY);
    mockMap.mockRejectedValue(new TypeError(SECRET));
    await expectRefused(await GET(), 500);
    expect(String(errorLog.mock.calls[0][0])).toBe("[shift-island] map route failed: unexpected:TypeError");
  });
});
