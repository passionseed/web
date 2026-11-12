/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { QuestDbError, QuestError } from "@/bot/src/quests/api";
import type { IslandViewer } from "@/lib/supabase/shift-quests/types";

const mockViewer = jest.fn<Promise<IslandViewer>, []>();
const call = jest.fn();

jest.mock("@/lib/supabase/shift-quests/viewer", () => ({ resolveIslandViewer: () => mockViewer() }));
jest.mock("@/lib/supabase/shift-quests/db", () => ({ questApi: () => ({ call, rows: jest.fn() }) }));

import { dynamic, GET } from "../canvas/route";

const ORIGIN = "http://localhost:3000";
const ACTOR = "123456789012345678";
const BOARD = "9d1f2c3b-4a5e-4f60-8a7b-1c2d3e4f5a6b";
const ME = { name: "นักเรียน", avatarUrl: null, staff: false };

const READY: IslandViewer = {
  state: "ready",
  me: ME,
  actor: ACTOR,
  userId: "99999999-9999-4999-8999-000000000001",
  session: { member_id: "m1", onboarded: true } as Extract<IslandViewer, { state: "ready" }>["session"],
};

const LINK = { board_id: BOARD, frame_id: "frame-1", canvas_project: "proj-1", linked_at: "2026-11-11T08:00:00Z" };

const request = (query = "") => new NextRequest(`${ORIGIN}/shift/island/canvas${query}`);

let errorLog: jest.SpyInstance;
beforeEach(() => {
  mockViewer.mockReset().mockResolvedValue(READY);
  call.mockReset().mockResolvedValue(LINK);
  errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorLog.mockRestore());

/** A same-origin 307 to `path` (relative Location) that no cache may keep. */
function expectRedirect(res: Response, path: string) {
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toBe(path);
  expect(res.headers.get("cache-control")).toBe("no-store");
}

describe("GET /shift/island/canvas", () => {
  it("is always dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it.each<[string, IslandViewer]>([
    ["signed out", { state: "signed_out" }],
    ["no Discord", { state: "no_discord", accountLabel: null }],
    ["unavailable", { state: "unavailable", reason: "db_error" }],
    ["not eligible", { state: "not_eligible", me: ME, reason: "no_role" }],
    ["not started", { state: "not_started", me: ME, actor: ACTOR, userId: "u" }],
  ])("sends a viewer who is %s back to the island, without reading the link", async (_label, viewer) => {
    mockViewer.mockResolvedValue(viewer);
    expectRedirect(await GET(request("?note=n-1")), "/shift/island");
    expect(call).not.toHaveBeenCalled();
  });

  it("sends an unlinked project back to the island", async () => {
    call.mockResolvedValue(null);
    expectRedirect(await GET(request()), "/shift/island");
    expect(call).toHaveBeenCalledWith("shift_quest_canvas_get", ACTOR);
  });

  it("opens the board focused on the canvas frame", async () => {
    expectRedirect(await GET(request()), `/whiteboard/${BOARD}?focus=frame-1`);
  });

  it("never sends the browser to the dev server's bind address", async () => {
    const res = await GET(new NextRequest("http://0.0.0.0:3000/shift/island/canvas"));
    expectRedirect(res, `/whiteboard/${BOARD}?focus=frame-1`);
    expect(res.headers.get("location")).not.toContain("0.0.0.0");
  });

  it("focuses a valid note instead of the frame", async () => {
    expectRedirect(await GET(request("?note=n-problem_2")), `/whiteboard/${BOARD}?focus=n-problem_2`);
  });

  it.each(["x%3Fy", "..%2Fadmin", "a%26focus%3Devil", "a".repeat(101), ""])("drops the invalid note %p and focuses the frame", async (note) => {
    expectRedirect(await GET(request(`?note=${note}`)), `/whiteboard/${BOARD}?focus=frame-1`);
  });

  it("opens the board alone when the stored frame id does not look valid", async () => {
    call.mockResolvedValue({ ...LINK, frame_id: "x?y" });
    expectRedirect(await GET(request()), `/whiteboard/${BOARD}`);
  });

  it("sends a link with a board id that is not a uuid back to the island", async () => {
    call.mockResolvedValue({ ...LINK, board_id: "../admin" });
    expectRedirect(await GET(request()), "/shift/island");
    expect(errorLog.mock.calls.flat().join("\n")).toContain("bad_link");
  });

  it.each([
    ["a refusal", new QuestError("not_started"), "sq:not_started"],
    ["a database failure", new QuestDbError("shift_quest_canvas_get", "42501"), "SQLSTATE 42501"],
    ["an unexpected error", new TypeError("student text in a message"), "TypeError"],
  ])("sends %s back to the island and logs only a code", async (_label, error, code) => {
    call.mockRejectedValue(error);
    expectRedirect(await GET(request()), "/shift/island");
    const logged = errorLog.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain(code);
    expect(logged).not.toContain("student text");
  });

  it("never puts the canvas project id in the redirect", async () => {
    const res = await GET(request("?note=n-1"));
    expect(res.headers.get("location")).not.toContain("proj-1");
  });
});
