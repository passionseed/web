/** @jest-environment node */
import { QuestError } from "@/bot/src/quests/api";

const call = jest.fn();
const resolveIslandViewer = jest.fn();
const refresh = jest.fn();
const createAdminClient = jest.fn();

jest.mock("next/cache", () => ({ refresh: () => refresh() }));
jest.mock("@/lib/supabase/shift-quests/db", () => ({
  questApi: () => ({ call, rows: jest.fn() }),
}));
jest.mock("@/lib/supabase/shift-quests/viewer", () => ({
  resolveIslandViewer: () => resolveIslandViewer(),
}));
jest.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => createAdminClient(),
}));

import * as actions from "@/app/shift/island/actions";
import { CARD_REFLECTION_FALLBACK, questGuideSpec, type QuestCanvasContext } from "@/lib/shift-island/quest-canvas";
import { accessOf } from "@/lib/whiteboard/canvas-access";
import { summarizeElements } from "@/lib/whiteboard/summary";

import { BOARD_OWNER, canvasElements, EDITOR, noise, OUTSIDER, OWNER } from "../__fixtures__/canvas-board";
import { buildContext, buildSnapshot, canvasNotes, frameElements, liveFrame, pickNotes } from "../canvas-snapshot";
import { questErrorText } from "../errors";

const ACTOR = "123456789012345678";
const BOARD_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOARD_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const BOARD_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SIDE_TEMPLATE = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const me = { name: "Mint", avatarUrl: null, staff: false };
const viewerAs = (userId: string) => ({ state: "ready", me, actor: ACTOR, userId, session: { onboarded: true, roles: [], unread: 0 } });

type Row = Record<string, unknown>;

const NOTES = [
  { id: "n-problem", kind: "problem" as const, text: "ไม่มีเวลาอ่านหนังสือ", by: OWNER, versions: [{ v: 1, text: "ไม่มีเวลา" }] },
  { id: "n-target", kind: "target" as const, text: "นักเรียน ม.5", by: EDITOR },
  { id: "n-int", kind: "interview" as const, text: "คุยกับเพื่อน 2 คน", by: OWNER },
  { id: "n-test", kind: "test" as const, text: "ให้เพื่อนลองแอป", by: EDITOR },
];

/** Board A (owned by someone else, the student is a member): the student's canvas plus another student's. */
const boardA = (over: Parameters<typeof canvasElements>[0] = {}) => [
  ...noise(),
  ...canvasElements({ notes: NOTES, ...over }),
  ...canvasElements({ frameId: "frame-other", x: 4000, owner: OUTSIDER, editors: [], project: "proj-other", notes: [{ id: "o-1", kind: "problem", text: "งานของคนอื่น", by: OUTSIDER }] }),
];

let tables: { whiteboards: Row[]; whiteboard_members: Row[] };
let adminError: { code: string } | null;
let reads: string[];

function fakeAdmin() {
  return {
    from(table: "whiteboards" | "whiteboard_members") {
      reads.push(table);
      const filters: { op: "eq" | "in"; col: string; val: unknown }[] = [];
      const run = () =>
        tables[table].filter((r) =>
          filters.every((f) => (f.op === "eq" ? r[f.col] === f.val : (f.val as unknown[]).includes(r[f.col])))
        );
      const builder = {
        select: () => builder,
        eq(col: string, val: unknown) {
          filters.push({ op: "eq", col, val });
          return builder;
        },
        in(col: string, val: unknown[]) {
          filters.push({ op: "in", col, val });
          return builder;
        },
        maybeSingle: () => Promise.resolve(adminError ? { data: null, error: adminError } : { data: run()[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(adminError ? { data: null, error: adminError } : { data: run(), error: null }).then(resolve, reject),
      };
      return builder;
    },
  };
}

/** The quest database: the link and the board, as shift_quest_* answers. */
let link: Row | null;
let board: Row;
function questDb() {
  call.mockImplementation(async (fn: string) => {
    switch (fn) {
      case "shift_quest_canvas_get":
        return link;
      case "shift_quest_board":
        return board;
      case "shift_quest_canvas_link":
      case "shift_quest_canvas_unlink":
        return {};
      case "shift_quest_milestone_submit":
        return { instance_id: "i-main", submission_id: "s", revision: 1, version: 2, created: true };
      case "shift_quest_side_submit":
        return { instance_id: "i-side", submission_id: "s", revision: 2, version: 3, created: false };
      default:
        throw new Error(`unexpected ${fn}`);
    }
  });
}

beforeEach(() => {
  tables = {
    whiteboards: [
      { id: BOARD_A, title: "ห้อง 5/1", owner_id: BOARD_OWNER, updated_at: "2026-11-10T00:00:00Z", elements: boardA() },
      { id: BOARD_B, title: "บอร์ดของฉัน", owner_id: OWNER, updated_at: "2026-11-09T00:00:00Z", elements: canvasElements({ frameId: "frame-b", project: "proj-b", editors: [], notes: [] }) },
      { id: BOARD_C, title: "ไม่เกี่ยว", owner_id: OUTSIDER, updated_at: "2026-11-09T00:00:00Z", elements: canvasElements({ frameId: "frame-c", owner: OUTSIDER, editors: [OWNER], project: "proj-c" }) },
    ],
    whiteboard_members: [
      { whiteboard_id: BOARD_A, user_id: OWNER, role: "editor" },
      { whiteboard_id: BOARD_A, user_id: EDITOR, role: "editor" },
      { whiteboard_id: BOARD_A, user_id: OUTSIDER, role: "editor" },
    ],
  };
  adminError = null;
  reads = [];
  link = { board_id: BOARD_A, frame_id: "frame-1", canvas_project: "proj-1", linked_at: "2026-11-11T01:00:00Z" };
  board = { project: { id: "p1" }, main: [], side: [{ template_id: SIDE_TEMPLATE, slug: "side-outside-circle" }], proposed: [], help_open: [] };
  call.mockReset();
  questDb();
  createAdminClient.mockReset().mockImplementation(fakeAdmin);
  resolveIslandViewer.mockReset().mockResolvedValue(viewerAs(OWNER));
  refresh.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

const logged = () => (console.error as jest.Mock).mock.calls.flat().map(String).join("\n");
const fnCalls = () => call.mock.calls.map(([fn]) => fn);
const noIds = (value: unknown) => {
  const json = JSON.stringify(value);
  for (const id of [OWNER, EDITOR, OUTSIDER, BOARD_OWNER, ACTOR]) expect(json).not.toContain(id);
};

/** The notes and hashes the composer would send for these ids. */
function picked(ids: string[], elements = boardA()) {
  const cut = frameElements(elements, "frame-1");
  const notes = canvasNotes(summarizeElements(cut), cut, "frame-1", accessOf(liveFrame(cut, "frame-1")!));
  return pickNotes(notes, ids);
}

describe("validation", () => {
  const ref = { kind: "main" as const, milestone: 1 };
  const note = { id: "n-problem", hash: "abc" };
  it.each([
    ["linkCanvas: board id not a uuid", () => actions.linkCanvas({ boardId: "x", frameId: "f" })],
    ["linkCanvas: empty frame id", () => actions.linkCanvas({ boardId: BOARD_A, frameId: "" })],
    ["linkCanvas: frame id over 100", () => actions.linkCanvas({ boardId: BOARD_A, frameId: "f".repeat(101) })],
    ["loadQuestCanvas: milestone 8", () => actions.loadQuestCanvas({ ref: { kind: "main", milestone: 8 }, slug: null })],
    ["loadQuestCanvas: unknown kind", () => actions.loadQuestCanvas({ ref: { kind: "squad" } as never, slug: null })],
    ["loadQuestCanvas: bad slug", () => actions.loadQuestCanvas({ ref, slug: "Not A Slug" })],
    ["submit: no notes", () => actions.submitQuestCard({ ref, slug: null, notes: [] })],
    ["submit: nine notes", () => actions.submitQuestCard({ ref, slug: null, notes: Array.from({ length: 9 }, (_, i) => ({ id: `n${i}`, hash: "a" })) })],
    ["submit: the same note twice", () => actions.submitQuestCard({ ref, slug: null, notes: [note, note] })],
    ["submit: a hash that is not hex", () => actions.submitQuestCard({ ref, slug: null, notes: [{ id: "n", hash: "xyz" }] })],
    ["submit: a hash over 16", () => actions.submitQuestCard({ ref, slug: null, notes: [{ id: "n", hash: "a".repeat(17) }] })],
    ["submit: a note id over 100", () => actions.submitQuestCard({ ref, slug: null, notes: [{ id: "n".repeat(101), hash: "a" }] })],
    ["submit: an http link", () => actions.submitQuestCard({ ref, slug: null, notes: [note], link: "http://example.com" })],
    ["submit: a link over 500", () => actions.submitQuestCard({ ref, slug: null, notes: [note], link: `https://e.com/${"a".repeat(500)}` })],
    ["submit: a line over 2000", () => actions.submitQuestCard({ ref, slug: null, notes: [note], line: "ก".repeat(2001) })],
    ["submit: a side template not a uuid", () => actions.submitQuestCard({ ref: { kind: "side", templateId: "x" }, slug: null, notes: [note] })],
  ])("%s is invalid_input with no read and no refresh", async (_label, run) => {
    await expect(run()).resolves.toEqual({ ok: false, code: "invalid_input", error: questErrorText("invalid_input") });
    expect(call).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("listMyCanvases", () => {
  it("lists only canvases the student owns or is on the team of, on boards they are on, marking the linked one", async () => {
    const result = await actions.listMyCanvases();
    expect(result.ok).toBe(true);
    const choices = result.ok ? result.data : [];
    expect(choices.map((c) => [c.boardId, c.frameId, c.role, c.linked])).toEqual([
      [BOARD_A, "frame-1", "owner", true],
      [BOARD_B, "frame-b", "owner", false],
    ]);
    expect(choices[0]).toMatchObject({ title: "Lamp project", boardTitle: "ห้อง 5/1", notes: 4, versions: 1 });
    noIds(choices);
    expect(refresh).not.toHaveBeenCalled();
    // Board C is not one of theirs (not a member), even though its canvas lists them.
    expect(choices.some((c) => c.boardId === BOARD_C)).toBe(false);
  });

  it("shows a teammate the canvas as team", async () => {
    resolveIslandViewer.mockResolvedValue(viewerAs(EDITOR));
    const result = await actions.listMyCanvases();
    expect(result.ok && result.data.map((c) => [c.frameId, c.role])).toEqual([["frame-1", "team"]]);
  });

  it("never lists a canvas to the board owner who only moderates it", async () => {
    resolveIslandViewer.mockResolvedValue(viewerAs(BOARD_OWNER));
    await expect(actions.listMyCanvases()).resolves.toEqual({ ok: true, data: [] });
  });

  it("is a quiet failure when the whiteboard cannot be read, logging a code only", async () => {
    adminError = { code: "PGRST301" };
    await expect(actions.listMyCanvases()).resolves.toEqual({
      ok: false,
      code: "canvas_unavailable",
      error: questErrorText("canvas_unavailable"),
    });
    expect(logged()).toContain("PGRST301");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("linkCanvas", () => {
  it("re-reads the canvas and links it with its current project tag, then refreshes", async () => {
    link = null;
    await expect(actions.linkCanvas({ boardId: BOARD_A, frameId: "frame-1" })).resolves.toEqual({ ok: true, data: null });
    expect(call).toHaveBeenCalledWith("shift_quest_canvas_link", ACTOR, BOARD_A, "frame-1", "proj-1");
    expect(refresh).toHaveBeenCalledTimes(1);
    // Never the side-effecting whiteboard helpers: only reads of these two tables.
    expect(new Set(reads)).toEqual(new Set(["whiteboards", "whiteboard_members"]));
  });

  it.each([
    ["another student's canvas", BOARD_A, "frame-other", "canvas_not_yours"],
    ["a board they are not on", BOARD_C, "frame-c", "canvas_not_yours"],
    ["a frame that does not exist", BOARD_A, "nope", "canvas_gone"],
    ["a board that does not exist", "dddddddd-dddd-4ddd-8ddd-dddddddddddd", "frame-1", "canvas_gone"],
  ])("refuses %s (%s) without linking", async (_label, boardId, frameId, code) => {
    const result = await actions.linkCanvas({ boardId, frameId });
    expect(result).toEqual({ ok: false, code, error: questErrorText(code) });
    expect(fnCalls()).not.toContain("shift_quest_canvas_link");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses the board owner who only moderates the canvas", async () => {
    resolveIslandViewer.mockResolvedValue(viewerAs(BOARD_OWNER));
    await expect(actions.linkCanvas({ boardId: BOARD_A, frameId: "frame-1" })).resolves.toMatchObject({ code: "canvas_not_yours" });
  });

  it("maps a whiteboard outage to canvas_unavailable", async () => {
    adminError = { code: "57014" };
    await expect(actions.linkCanvas({ boardId: BOARD_A, frameId: "frame-1" })).resolves.toMatchObject({ code: "canvas_unavailable" });
    expect(fnCalls()).not.toContain("shift_quest_canvas_link");
  });
});

describe("unlinkCanvas", () => {
  it("unlinks the current project and refreshes", async () => {
    await expect(actions.unlinkCanvas()).resolves.toEqual({ ok: true, data: null });
    expect(call).toHaveBeenCalledWith("shift_quest_canvas_unlink", ACTOR);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("loadQuestCanvas", () => {
  const load = (ref: Parameters<typeof actions.loadQuestCanvas>[0]["ref"], slug: string | null) =>
    actions.loadQuestCanvas({ ref, slug });
  const data = async (p: ReturnType<typeof load>): Promise<QuestCanvasContext> => {
    const result = await p;
    if (!result.ok) throw new Error(result.code);
    return result.data;
  };

  it("needs no read for a quest without zones", async () => {
    await expect(data(load({ kind: "main", milestone: 5 }, "take-the-keys"))).resolves.toEqual({ state: "no_zones" });
    await expect(data(load({ kind: "proposed", instanceId: SIDE_TEMPLATE }, null))).resolves.toEqual({ state: "no_zones" });
    expect(call).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("is unlinked without a link, before touching the whiteboard", async () => {
    link = null;
    await expect(data(load({ kind: "main", milestone: 1 }, "find-something-worth-fixing"))).resolves.toEqual({ state: "unlinked" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("reads the linked canvas: context rows, hints and the quest's notes, with no ids", async () => {
    const context = await data(load({ kind: "main", milestone: 1 }, "find-something-worth-fixing"));
    const elements = frameElements(boardA(), "frame-1");
    const expected = buildContext(
      questGuideSpec({ kind: "main", slug: "find-something-worth-fixing" }),
      summarizeElements(elements),
      elements,
      "frame-1",
      accessOf(liveFrame(elements, "frame-1")!)
    );
    expect(context).toEqual({
      state: "ready",
      canvas: { title: "Lamp project", boardTitle: "ห้อง 5/1", lastEdited: expect.any(Number) },
      ...expected,
    });
    if (context.state === "ready") expect(context.notes.map((n) => n.id)).toEqual(["n-problem", "n-target", "n-int"]);
    noIds(context);
    expect(JSON.stringify(context)).not.toContain("งานของคนอื่น");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("is not_yours once the student is off the canvas team", async () => {
    tables.whiteboards[0].elements = boardA({ owner: EDITOR, editors: [] });
    await expect(data(load({ kind: "main", milestone: 3 }, "let-reality-surprise-you"))).resolves.toEqual({ state: "not_yours" });
  });

  it("is gone with candidates of the same project when the linked canvas moved, never re-pointing it", async () => {
    tables.whiteboards[0].elements = boardA({ deleted: true });
    tables.whiteboards[1].elements = canvasElements({ frameId: "frame-moved", project: "proj-1", editors: [], notes: [] });
    const context = await data(load({ kind: "main", milestone: 3 }, "let-reality-surprise-you"));
    expect(context).toEqual({
      state: "gone",
      candidates: [expect.objectContaining({ boardId: BOARD_B, frameId: "frame-moved", role: "owner", linked: false })],
    });
    expect(fnCalls()).not.toContain("shift_quest_canvas_link");
  });

  it("treats a re-tagged canvas as gone", async () => {
    tables.whiteboards[0].elements = boardA({ project: "proj-new" });
    await expect(data(load({ kind: "main", milestone: 3 }, "let-reality-surprise-you"))).resolves.toMatchObject({ state: "gone" });
  });

  it("is an error state (not a failure) when the whiteboard cannot be read, logging a code only", async () => {
    adminError = { code: "PGRST000" };
    await expect(data(load({ kind: "main", milestone: 1 }, "find-something-worth-fixing"))).resolves.toEqual({ state: "error" });
    expect(logged()).toContain("PGRST000");
    expect(logged()).not.toContain("ไม่มีเวลา");
  });

  it("never refreshes, even when the viewer is refused", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "signed_out" });
    await expect(load({ kind: "main", milestone: 1 }, null)).resolves.toMatchObject({ ok: false, code: "signed_out" });
    resolveIslandViewer.mockResolvedValue({ state: "not_started", me, actor: ACTOR, userId: OWNER });
    await expect(actions.listMyCanvases()).resolves.toMatchObject({ ok: false, code: "not_started" });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("submitQuestCard", () => {
  const main1 = { kind: "main" as const, milestone: 1 };

  it("snapshots the chosen notes into the main quest submit, with the reflection fallback", async () => {
    const notes = picked(["n-int", "n-problem"]);
    const result = await actions.submitQuestCard({
      ref: main1,
      slug: "anything",
      notes: notes.map((n) => ({ id: n.id, hash: n.hash })),
    });
    expect(result).toEqual({ ok: true, data: { instanceId: "i-main", revision: 1, created: true } });
    const evidence = buildSnapshot("Lamp project", notes).text;
    expect(call).toHaveBeenCalledWith("shift_quest_milestone_submit", ACTOR, 1, evidence, CARD_REFLECTION_FALLBACK, null);
    expect(evidence).toContain("ไม่มีเวลาอ่านหนังสือ");
    noIds(evidence);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("sends a side quest through the side submit, with the line and link, its slug from the board", async () => {
    const notes = picked(["n-test"]);
    const result = await actions.submitQuestCard({
      ref: { kind: "side", templateId: SIDE_TEMPLATE },
      slug: "side-five-voices",
      notes: notes.map((n) => ({ id: n.id, hash: n.hash })),
      line: "  เพื่อนกดผิดปุ่มบ่อย  ",
      link: "https://example.com/app",
    });
    expect(result).toEqual({ ok: true, data: { instanceId: "i-side", revision: 2, created: false } });
    expect(call).toHaveBeenCalledWith(
      "shift_quest_side_submit",
      ACTOR,
      SIDE_TEMPLATE,
      buildSnapshot("Lamp project", notes).text,
      "เพื่อนกดผิดปุ่มบ่อย",
      "https://example.com/app"
    );
  });

  it("ignores the client's slug: a side quest's zones come from the server's board", async () => {
    const notes = picked(["n-problem"]);
    // side-outside-circle reads only test notes, whatever slug the client claims.
    await expect(
      actions.submitQuestCard({ ref: { kind: "side", templateId: SIDE_TEMPLATE }, slug: "side-demo-three-minutes", notes: notes.map((n) => ({ id: n.id, hash: n.hash })) })
    ).resolves.toMatchObject({ ok: false, code: "note_not_allowed" });
  });

  it.each([
    ["a proposed quest", { kind: "proposed" as const, instanceId: SIDE_TEMPLATE }, "note_not_allowed"],
    ["a main quest without zones", { kind: "main" as const, milestone: 5 }, "note_not_allowed"],
    ["a side quest not on the board", { kind: "side" as const, templateId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" }, "template_unavailable"],
  ])("refuses %s", async (_label, ref, code) => {
    const result = await actions.submitQuestCard({ ref, slug: null, notes: [{ id: "n-test", hash: "a" }] });
    expect(result).toMatchObject({ ok: false, code, error: questErrorText(code) });
    expect(fnCalls().some((f) => String(f).endsWith("_submit"))).toBe(false);
  });

  it("refuses canvas_unlinked and refreshes the stale page", async () => {
    link = null;
    const result = await actions.submitQuestCard({ ref: main1, slug: null, notes: [{ id: "n-problem", hash: "a" }] });
    expect(result).toEqual({ ok: false, code: "canvas_unlinked", error: questErrorText("canvas_unlinked") });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refuses canvas_not_yours and canvas_gone without a page refresh", async () => {
    const notes = picked(["n-problem"]).map((n) => ({ id: n.id, hash: n.hash }));
    tables.whiteboards[0].elements = boardA({ owner: EDITOR, editors: [] });
    await expect(actions.submitQuestCard({ ref: main1, slug: null, notes })).resolves.toMatchObject({ code: "canvas_not_yours" });
    tables.whiteboards[0].elements = boardA({ project: "proj-new" });
    await expect(actions.submitQuestCard({ ref: main1, slug: null, notes })).resolves.toMatchObject({ code: "canvas_gone" });
    tables.whiteboard_members = tables.whiteboard_members.filter((m) => m.user_id !== OWNER);
    tables.whiteboards[0].elements = boardA();
    await expect(actions.submitQuestCard({ ref: main1, slug: null, notes })).resolves.toMatchObject({ code: "canvas_not_yours" });
    expect(refresh).not.toHaveBeenCalled();
    expect(fnCalls()).not.toContain("shift_quest_milestone_submit");
  });

  it("refuses a note from a zone the quest does not use (note_not_allowed)", async () => {
    const notes = picked(["n-problem", "n-test"]).map((n) => ({ id: n.id, hash: n.hash }));
    await expect(actions.submitQuestCard({ ref: main1, slug: null, notes })).resolves.toEqual({
      ok: false,
      code: "note_not_allowed",
      error: questErrorText("note_not_allowed"),
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses notes_changed when a note was edited since the card was built, without a page refresh", async () => {
    const notes = picked(["n-problem"]).map((n) => ({ id: n.id, hash: n.hash }));
    const edited = NOTES.map((n) => (n.id === "n-problem" ? { ...n, text: "ไม่มีเวลาอ่านหนังสือเลย" } : n));
    tables.whiteboards[0].elements = boardA({ notes: edited });
    await expect(actions.submitQuestCard({ ref: main1, slug: null, notes })).resolves.toEqual({
      ok: false,
      code: "notes_changed",
      error: questErrorText("notes_changed"),
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(fnCalls()).not.toContain("shift_quest_milestone_submit");
  });

  it("refuses notes_changed for a note that is gone, or one from another canvas", async () => {
    await expect(actions.submitQuestCard({ ref: main1, slug: null, notes: [{ id: "n-deleted", hash: "a" }] })).resolves.toMatchObject({ code: "notes_changed" });
    await expect(actions.submitQuestCard({ ref: main1, slug: null, notes: [{ id: "o-1", hash: "a" }] })).resolves.toMatchObject({ code: "notes_changed" });
    await expect(actions.submitQuestCard({ ref: main1, slug: null, notes: [{ id: "on-top", hash: "a" }] })).resolves.toMatchObject({ code: "notes_changed" });
  });

  it("passes the quest database's own refusals through", async () => {
    call.mockImplementation(async (fn: string) => {
      if (fn === "shift_quest_canvas_get") return link;
      if (fn === "shift_quest_milestone_submit") throw new QuestError("milestone_open", undefined, fn);
      throw new Error(`unexpected ${fn}`);
    });
    const notes = picked(["n-problem"]).map((n) => ({ id: n.id, hash: n.hash }));
    await expect(actions.submitQuestCard({ ref: main1, slug: null, notes })).resolves.toMatchObject({ ok: false, code: "milestone_open" });
  });

  it("maps a whiteboard outage to canvas_unavailable and logs no student text", async () => {
    adminError = { code: "PGRST000" };
    await expect(actions.submitQuestCard({ ref: main1, slug: null, notes: [{ id: "n-problem", hash: "a" }] })).resolves.toMatchObject({
      ok: false,
      code: "canvas_unavailable",
    });
    expect(logged()).toContain("PGRST000");
  });
});
